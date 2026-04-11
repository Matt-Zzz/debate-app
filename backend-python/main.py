"""
Debate Training Simulator — FastAPI Backend
Run: uvicorn main:app --reload --port 3001
"""

import hashlib
import hmac
import json
import os
import random
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, AsyncIterator, Optional
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from google.auth.transport import requests as google_requests
from google.genai import types
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel

from progression import (
    MINI_GAMES,
    baseline_xp_for_level,
    calculate_training_xp,
    level_name,
    pvp_xp_for_outcome,
    progression_config,
    progression_snapshot,
    allowed_difficulties_for_level,
    allowed_levels_for_difficulty,
    level_from_xp,
)
from tutorials import score_tutorial, tutorial_question_bundle
from skill_trees import (
    SKILL_TREES,
    MINI_GAME_REGISTRY,
    calculate_mini_game_xp,
    skill_tree_snapshot,
    tree_level_from_xp,
)
from practice_seed_extractor import extract_practice_seeds
from recommendations import recommend_next_actions

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(title="Debate Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA     = Path(__file__).parent / "data"
DB_PATH  = Path(__file__).parent / "app.db"

GEMINI_API_KEY   = os.environ.get("GEMINI_API_KEY",   "").strip()
GEMINI_MODEL     = os.environ.get("GEMINI_MODEL",     "gemini-2.5-flash-lite").strip()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()

TOKEN_TTL_DAYS    = 30
PBKDF2_ITERATIONS = 210_000

client: Optional[genai.Client] = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# ── Load data files ───────────────────────────────────────────────────────────

TOPICS:        list[dict] = json.loads((DATA / "topics.json").read_text())
CHARACTERS:    list[dict] = json.loads((DATA / "characters.json").read_text())
DRILLS:        list[dict] = json.loads((DATA / "drills.json").read_text())
CLASH_TOPICS:  list[dict] = json.loads((DATA / "clash_topics.json").read_text())
FALLACIES:     list[dict] = json.loads((DATA / "fallacies.json").read_text())
SPEECH_POLISH: dict       = json.loads((DATA / "speech_polish.json").read_text())

CLASH_TOPIC_LOOKUP   = {item["id"]: item      for item in CLASH_TOPICS}
FALLACY_LOOKUP       = {str(item["id"]): item for item in FALLACIES}
SPEECH_LEVEL1_LOOKUP = {item["id"]: item      for item in SPEECH_POLISH["level1"]}

# ── Database ──────────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def table_columns(conn: sqlite3.Connection, table_name: str) -> set[str]:
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {str(row["name"]) for row in rows}


def ensure_column(conn: sqlite3.Connection, table: str, col: str, defn: str) -> None:
    if col not in table_columns(conn, table):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {defn}")


def init_db() -> None:
    with db_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                password_hash TEXT,
                google_sub TEXT UNIQUE,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS training_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_id TEXT,
                topic_id TEXT NOT NULL,
                topic_title TEXT NOT NULL,
                topic_tag TEXT,
                topic_difficulty TEXT,
                character_id TEXT NOT NULL,
                character_name TEXT NOT NULL,
                side TEXT NOT NULL,
                rubric_json TEXT NOT NULL,
                feedback_json TEXT NOT NULL,
                transcript_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS drill_completions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                drill_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                user_id INTEGER,
                answers_json TEXT NOT NULL,
                score INTEGER NOT NULL,
                completed_at TEXT NOT NULL,
                UNIQUE(drill_id, session_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS tutorial_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                question_ids_json TEXT NOT NULL,
                questions_json TEXT NOT NULL,
                answers_json TEXT,
                scores_json TEXT,
                total_score INTEGER,
                assigned_level INTEGER,
                status TEXT NOT NULL DEFAULT 'started',
                completed_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS training_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                earned_xp INTEGER NOT NULL,
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS pvp_sessions (
                id TEXT PRIMARY KEY,
                player1_id INTEGER NOT NULL,
                player2_id INTEGER,
                topic_id TEXT,
                topic_title TEXT,
                topic_difficulty TEXT,
                player1_side TEXT,
                player2_side TEXT,
                status TEXT NOT NULL,
                scores_json TEXT,
                result_json TEXT,
                winner_id INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(player1_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(player2_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY(winner_id)  REFERENCES users(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS skill_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                tree_id TEXT NOT NULL,
                xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, tree_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS practice_seeds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                source_type TEXT NOT NULL,
                source_session_id TEXT,
                source_excerpt TEXT NOT NULL,
                skill_tree_id TEXT NOT NULL,
                weakness_label TEXT NOT NULL,
                coach_note TEXT NOT NULL,
                confidence REAL NOT NULL DEFAULT 0.5,
                status TEXT NOT NULL DEFAULT 'new',
                mini_game_id TEXT NOT NULL DEFAULT '',
                prompt TEXT NOT NULL DEFAULT '',
                difficulty TEXT NOT NULL DEFAULT 'medium',
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS mini_game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                mini_game_id TEXT NOT NULL,
                skill_tree_id TEXT NOT NULL,
                practice_seed_id INTEGER,
                score INTEGER NOT NULL,
                max_score INTEGER NOT NULL,
                tree_xp_earned INTEGER NOT NULL DEFAULT 0,
                global_xp_earned INTEGER NOT NULL DEFAULT 0,
                duration_ms INTEGER NOT NULL DEFAULT 0,
                metadata_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_auth_tokens_user
                ON auth_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_training_history_user_created
                ON training_history(user_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_tutorial_sessions_user_created
                ON tutorial_sessions(user_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_training_sessions_user_created
                ON training_sessions(user_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_pvp_sessions_status_updated
                ON pvp_sessions(status, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_skill_progress_user
                ON skill_progress(user_id);
            CREATE INDEX IF NOT EXISTS idx_practice_seeds_user_status
                ON practice_seeds(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_mini_game_sessions_user
                ON mini_game_sessions(user_id, created_at DESC);
        """)
        ensure_column(conn, "users", "current_level",      "INTEGER NOT NULL DEFAULT 1")
        ensure_column(conn, "users", "total_xp",           "INTEGER NOT NULL DEFAULT 0")
        ensure_column(conn, "users", "tutorial_completed", "INTEGER NOT NULL DEFAULT 0")
        ensure_column(conn, "users", "placement_score",    "INTEGER NOT NULL DEFAULT 0")
        ensure_column(conn, "users", "profile_image_url",  "TEXT")
        ensure_column(conn, "users", "location",           "TEXT")
        ensure_column(conn, "users", "headline",           "TEXT")
        ensure_column(conn, "users", "bio",                "TEXT")
        ensure_column(conn, "training_history", "session_id", "TEXT")
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_training_history_user_session "
            "ON training_history(user_id, session_id)"
        )


init_db()
print(f"✓ {len(TOPICS)} topics · {len(CHARACTERS)} characters · {len(DRILLS)} drills · "
      f"{len(CLASH_TOPICS)} clash topics · {len(FALLACIES)} fallacies · Coach Mode ready")

# ── Auth helpers ──────────────────────────────────────────────────────────────

def api_error(code: int, msg: str) -> None:
    raise HTTPException(status_code=code, detail={"message": msg})


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_optional_text(value: str, field: str, max_len: int) -> str | None:
    v = value.strip()
    if not v:
        return None
    if len(v) > max_len:
        api_error(400, f"{field} must be {max_len} characters or fewer")
    return v


def normalize_optional_url(value: str, field: str, max_len: int = 500) -> str | None:
    v = value.strip()
    if not v:
        return None
    if len(v) > max_len:
        api_error(400, f"{field} must be {max_len} characters or fewer")
    p = urlparse(v)
    if p.scheme not in {"http", "https"} or not p.netloc:
        api_error(400, f"{field} must be a valid http or https URL")
    return v


def normalize_profile_image(value: str) -> str | None:
    v = value.strip()
    if not v:
        return None
    if v.startswith("data:image/"):
        if len(v) > 2_000_000:
            api_error(400, "Profile image is too large")
        if not re.fullmatch(r"data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+", v):
            api_error(400, "Profile image must be PNG, JPEG, WEBP, or GIF")
        return v
    return normalize_optional_url(v, "Profile image URL")


def hash_password(password: str, salt: str | None = None) -> str:
    use_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), use_salt.encode(), PBKDF2_ITERATIONS
    ).hex()
    return f"{use_salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt).split("$", 1)[1], digest)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_token(conn: sqlite3.Connection, user_id: int) -> str:
    raw = secrets.token_urlsafe(32)
    conn.execute(
        "INSERT INTO auth_tokens(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)",
        (hash_token(raw), user_id, now_iso(),
         (datetime.now(timezone.utc) + timedelta(days=TOKEN_TTL_DAYS)).isoformat()),
    )
    return raw


def parse_bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def public_user(row: sqlite3.Row | dict) -> dict:
    level = int(row["current_level"] or 1)
    xp    = int(row["total_xp"] or 0)
    snap  = progression_snapshot(level, xp)
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "profileImageUrl": row["profile_image_url"],
        "location": row["location"],
        "headline": row["headline"],
        "bio": row["bio"],
        "currentLevel": snap["currentLevel"],
        "levelName": snap["levelName"],
        "totalXP": snap["totalXP"],
        "tutorialCompleted": bool(row["tutorial_completed"]),
        "placementScore": int(row["placement_score"] or 0),
        "unlockedDifficulties": snap["unlockedDifficulties"],
        "nextLevel": snap["nextLevel"],
        "nextLevelName": snap["nextLevelName"],
        "nextLevelXP": snap["nextLevelXP"],
        "xpToNextLevel": snap["xpToNextLevel"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def fetch_user_row(conn: sqlite3.Connection, user_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if row is None:
        api_error(404, "User not found")
    return row


def require_tutorial_completed(user: dict) -> None:
    if not user.get("tutorialCompleted"):
        api_error(403, "Complete tutorial placement before starting training sessions")


def award_user_xp(conn: sqlite3.Connection, user_id: int, xp: int) -> tuple[sqlite3.Row, bool]:
    row   = fetch_user_row(conn, user_id)
    prev  = int(row["current_level"] or 1)
    total = max(0, int(row["total_xp"] or 0) + max(0, xp))
    next_ = max(prev, level_from_xp(total))
    conn.execute(
        "UPDATE users SET total_xp=?,current_level=?,updated_at=? WHERE id=?",
        (total, next_, now_iso(), user_id),
    )
    return fetch_user_row(conn, user_id), next_ > prev


def save_training_session(conn, user_id, stype, xp, result):
    now = now_iso()
    cur = conn.execute(
        "INSERT INTO training_sessions(user_id,type,earned_xp,result_json,created_at) VALUES(?,?,?,?,?)",
        (user_id, stype, xp, json.dumps(result), now),
    )
    return {"id": int(cur.lastrowid), "userId": user_id, "type": stype,
            "earnedXP": xp, "result": result, "createdAt": now}


def topic_payload(topic: dict, user: dict | None = None) -> dict:
    p = dict(topic)
    p["allowedLevels"] = allowed_levels_for_difficulty(topic["difficulty"])
    if user is not None:
        p["unlocked"] = topic["difficulty"] in set(user.get("unlockedDifficulties") or [])
    return p


def serialize_pvp(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "player1Id": row["player1_id"],
        "player1Name": row["player1_name"],
        "player2Id": row["player2_id"],
        "player2Name": row["player2_name"],
        "topicId": row["topic_id"],
        "topicTitle": row["topic_title"],
        "topicDifficulty": row["topic_difficulty"],
        "player1Side": row["player1_side"],
        "player2Side": row["player2_side"],
        "status": row["status"],
        "scores": json.loads(row["scores_json"]) if row["scores_json"] else None,
        "result": json.loads(row["result_json"]) if row["result_json"] else None,
        "winnerId": row["winner_id"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def get_optional_user(authorization: str | None = Header(default=None)) -> dict | None:
    token = parse_bearer(authorization)
    if not token:
        return None
    th = hash_token(token)
    with db_conn() as conn:
        row = conn.execute(
            "SELECT u.*,t.expires_at FROM auth_tokens t JOIN users u ON u.id=t.user_id "
            "WHERE t.token_hash=?",
            (th,),
        ).fetchone()
        if row is None:
            return None
        try:
            exp = datetime.fromisoformat(row["expires_at"])
        except ValueError:
            conn.execute("DELETE FROM auth_tokens WHERE token_hash=?", (th,))
            return None
        if exp <= datetime.now(timezone.utc):
            conn.execute("DELETE FROM auth_tokens WHERE token_hash=?", (th,))
            return None
        return public_user(row)


def get_current_user(user: dict | None = Depends(get_optional_user)) -> dict:
    if user is None:
        api_error(401, "Unauthorized")
    return user


def get_gemini_client() -> genai.Client | None:
    return client


# ── Safety ────────────────────────────────────────────────────────────────────

_BLOCKED = [
    re.compile(
        r"\b(race|racial|ethnicity|ethnic group|jews?|muslims?|christians?|"
        r"black people|white people|immigrants?|refugees?)\b"
        r".*\b(inferior|superior|dangerous|threat|problem|should be|deserve)\b",
        re.I | re.S,
    ),
    re.compile(r"\b(genocide|ethnic cleansing|holocaust denial|white suprema|nazi|neo-nazi)\b", re.I),
    re.compile(
        r"\b(women are (naturally|inherently|biologically)"
        r" (inferior|weaker|less intelligent|less capable))\b",
        re.I,
    ),
    re.compile(
        r"\b(lgbtq?|gay|lesbian|transgender|queer)\b"
        r".*\b(diseased?|mentally ill|deviant|should be banned|should not exist)\b",
        re.I | re.S,
    ),
]


def safety_check(text: str) -> dict:
    for pat in _BLOCKED:
        if pat.search(text or ""):
            return {
                "safe": False,
                "message": (
                    "This content targets a protected group in a way that isn't permitted here. "
                    "I can reframe it as a policy or philosophical question — want me to suggest one?"
                ),
            }
    return {"safe": True}


# ── Rubric (deterministic — no AI involved) ───────────────────────────────────

def compute_rubric(transcript: list[dict]) -> dict:
    user_turns = [t for t in transcript if t["role"] == "user"]
    opp_turns  = [t for t in transcript if t["role"] == "opponent"]
    if not user_turns:
        return {"total": 0, "breakdown": {}}

    text = " ".join(t["text"] for t in user_turns)
    wc   = len(text.split())

    def has(*pats: str) -> bool:
        return any(re.search(p, text, re.I) for p in pats)

    s = 0
    if has(r"\b(define|definition|mean(?:s|ing)|by .{1,20} I mean)\b"):      s += 5
    if has(r"\b(framework|value|criterion|principle|I argue|I contend)\b"):   s += 5
    if has(r"\b(first|second|contention|argument|because)\b"):                s += 5
    if has(r"\b(therefore|thus|in conclusion|for these reasons)\b"):          s += 3
    if wc > 150:                                                               s += 2
    s = min(s, 20)

    a = 0
    if has(r"\b(because|since|evidence|studies|research|data)\b"):            a += 7
    if has(r"\b(for example|for instance|such as)\b"):                        a += 4
    if has(r"\b(therefore|this means that|it follows that)\b"):               a += 5
    if has(r"\b(however|although|I concede|granted)\b"):                      a += 4
    a = min(a, 20)

    c = 10  # partial credit when opponent hasn't spoken yet
    if opp_turns:
        c = 0
        if has(r"\b(my opponent|they claim|the other side|disagree)\b"):      c += 8
        if len(user_turns) >= 2:                                               c += 5
        if has(r"\b(my position stands|still holds|despite this)\b"):         c += 4
        if has(r"\b(counter|in response|the real issue is)\b"):               c += 3
    c = min(c, 20)

    i = 0
    if has(r"\b(impact|harm|benefit|cost|consequence|lives|people|society)\b"): i += 6
    if has(r"\b(more important|outweigh|greater|more likely|magnitude)\b"):     i += 7
    if has(r"\b(this matters because|the stakes)\b"):                            i += 4
    if has(r"\b(alternative|compared to|versus|rather than|status quo)\b"):     i += 3
    i = min(i, 20)

    p = 0
    if has(r"\b(I (?:claim|argue|contend|maintain) that)\b"):                 p += 6
    if has(r"\b(specifically|precisely|exactly|to be clear)\b"):              p += 4
    if not has(r"\b(maybe|kind of|sort of|perhaps maybe)\b"):                 p += 5
    if has(r"\b(always|never|necessarily|must|cannot)\b"):                    p += 5
    p = min(p, 20)

    total = s + a + c + i + p
    return {
        "total": total,
        "breakdown": {
            "structure":  {"score": s, "max": 20, "label": "Structure & Organization"},
            "argQuality": {"score": a, "max": 20, "label": "Argument Quality"},
            "clash":      {"score": c, "max": 20, "label": "Clash & Responsiveness"},
            "impact":     {"score": i, "max": 20, "label": "Impact & Weighing"},
            "precision":  {"score": p, "max": 20, "label": "Precision & Commitment"},
        },
    }


# ── Core helpers ──────────────────────────────────────────────────────────────

def get_or_404(collection: list[dict], item_id: str, label: str) -> dict:
    obj = next((x for x in collection if x["id"] == item_id), None)
    if not obj:
        raise HTTPException(404, f"{label} '{item_id}' not found")
    return obj


def build_opponent_system(character: dict, topic: dict, side: str) -> str:
    """Builds the AI system prompt for the opponent character.
    Fixed: removed character['settings'] KeyError; added convincedBy + crossExamQuestions.
    """
    opp = topic["sideB"] if side == "A" else topic["sideA"]
    nl  = "\n"
    return (
        f"You are {character['name']} in a competitive debate.\n\n"
        f"PROFILE: {character['description']}\n\n"
        f"YOU ALWAYS DO:\n{nl.join('- ' + d for d in character['alwaysDoes'])}\n\n"
        f"WHAT CONVINCES YOU:\n{nl.join('- ' + c for c in character.get('convincedBy', []))}\n\n"
        f"CROSS EXAMINATION QUESTIONS YOU USE:\n"
        f"{nl.join('- ' + q for q in character.get('crossExamQuestions', []))}\n\n"
        f"SIGNATURE STRUCTURE: {character['signatureStructure']}\n\n"
        f"EXAMPLE PHRASES:\n{nl.join(chr(34) + p + chr(34) for p in character['examplePhrases'])}\n\n"
        f"FALLACIES YOU FLAG: {', '.join(character['fallaciesDetected'])}\n\n"
        f"TOPIC: \"{topic['title']}\"\n"
        f"YOUR POSITION: {opp['position']}\n"
        f"YOUR ARGUMENTS: {' | '.join(opp['args'])}\n\n"
        "RULES: Stay in character. 3-5 sentences. Natural prose — no bullets. "
        "End with a pointed question or sharp crystallization. "
        "Never produce hateful or dehumanizing content."
    )


def persist_training_history(
    user_id: int,
    session_id: str | None,
    topic: dict,
    character: dict,
    side: str,
    transcript: list[dict],
    rubric: dict,
    feedback: dict[str, Any],
) -> bool:
    with db_conn() as conn:
        if session_id:
            if conn.execute(
                "SELECT id FROM training_history WHERE user_id=? AND session_id=?",
                (user_id, session_id),
            ).fetchone():
                return False
        conn.execute(
            """INSERT INTO training_history(
                user_id, session_id, topic_id, topic_title, topic_tag, topic_difficulty,
                character_id, character_name, side,
                rubric_json, feedback_json, transcript_json, created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                user_id, session_id, topic["id"], topic["title"],
                topic.get("tag"), topic.get("difficulty"),
                character["id"], character["name"], side,
                json.dumps(rubric), json.dumps(feedback), json.dumps(transcript), now_iso(),
            ),
        )
    return True


def select_pvp_topic(p1: dict, p2: dict) -> dict:
    shared = set(allowed_difficulties_for_level(p1["currentLevel"])) & set(
        allowed_difficulties_for_level(p2["currentLevel"])
    )
    if not shared:
        shared = set(allowed_difficulties_for_level(p1["currentLevel"]))
    candidates = [t for t in TOPICS if t["difficulty"] in shared]
    return random.choice(candidates or TOPICS)


# ── Coach Mode helpers ────────────────────────────────────────────────────────

def get_skill_tree_progress(conn, user_id: int) -> dict[str, dict]:
    """Return {tree_id: snapshot} for all skill trees, defaulting missing ones to 0 XP."""
    rows   = conn.execute("SELECT tree_id,xp FROM skill_progress WHERE user_id=?", (user_id,)).fetchall()
    xp_map = {r["tree_id"]: int(r["xp"]) for r in rows}
    return {tid: skill_tree_snapshot(tid, xp_map.get(tid, 0)) for tid in SKILL_TREES}


def award_tree_xp(conn, user_id: int, tree_id: str, xp: int) -> dict:
    """Upsert skill_progress row and return updated snapshot."""
    row = conn.execute(
        "SELECT xp FROM skill_progress WHERE user_id=? AND tree_id=?", (user_id, tree_id)
    ).fetchone()
    now    = now_iso()
    new_xp = (int(row["xp"]) if row else 0) + xp
    level  = tree_level_from_xp(new_xp)
    if row:
        conn.execute(
            "UPDATE skill_progress SET xp=?,level=?,updated_at=? WHERE user_id=? AND tree_id=?",
            (new_xp, level, now, user_id, tree_id),
        )
    else:
        conn.execute(
            "INSERT INTO skill_progress(user_id,tree_id,xp,level,updated_at) VALUES(?,?,?,?,?)",
            (user_id, tree_id, new_xp, level, now),
        )
    return skill_tree_snapshot(tree_id, new_xp)


def persist_practice_seeds(
    conn, user_id: int, seeds: list[dict], session_id: str | None
) -> list[dict]:
    """Insert extracted seeds into practice_seeds table; return seeds with DB ids."""
    now   = now_iso()
    saved = []
    for seed in seeds:
        cur = conn.execute(
            """INSERT INTO practice_seeds(
                user_id, source_type, source_session_id, source_excerpt,
                skill_tree_id, weakness_label, coach_note, confidence,
                status, mini_game_id, prompt, difficulty, created_at
            ) VALUES(?,?,?,?,?,?,?,?,'new',?,?,?,?)""",
            (
                user_id, "debate_transcript", session_id or "",
                seed["sourceExcerpt"], seed["skillTreeId"], seed["weaknessLabel"],
                seed["coachNote"], seed["confidence"],
                seed["miniGameId"], seed["prompt"], seed.get("difficulty", "medium"), now,
            ),
        )
        saved.append({**seed, "id": int(cur.lastrowid), "status": "new"})
    return saved


def build_coach_extras(
    user,
    topic: dict,
    character: dict,
    side: str,
    transcript: list[dict],
    rubric: dict,
    feedback: dict,
    session_id: str | None,
) -> dict:
    """Extract practice seeds and weak trees from the debate; persist if user is logged in."""
    seeds      = extract_practice_seeds(transcript, rubric, feedback, max_seeds=2)
    weak_trees = list({s["skillTreeId"] for s in seeds})

    # Fall back to rubric-based weak trees when no seeds were extracted
    if not weak_trees:
        bd      = rubric.get("breakdown", {})
        mapping = {
            "structure":  "clash",
            "argQuality": "logic",
            "clash":      "rebuttal",
            "impact":     "weighing",
            "precision":  "expression",
        }
        weak_trees = [
            mapping[k]
            for k, _ in sorted(bd.items(), key=lambda x: x[1]["score"] / max(x[1]["max"], 1))[:2]
            if k in mapping
        ]

    recommended = [
        {
            "miniGameId":  s["miniGameId"],
            "skillTreeId": s["skillTreeId"],
            "reason":      s["coachNote"][:120],
            "seedExcerpt": s["sourceExcerpt"][:180],
            "isPersonalized": True,
        }
        for s in seeds
    ]

    saved_seeds = []
    if user is not None:
        with db_conn() as conn:
            saved_seeds = persist_practice_seeds(conn, user["id"], seeds, session_id)

    return {
        "weakTrees":            weak_trees,
        "practiceSeeds":        saved_seeds if saved_seeds else seeds,
        "recommendedMiniGames": recommended,
    }


# ── Request models ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleLoginRequest(BaseModel):
    idToken: str


class AccountUpdateRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    profileImageUrl: str | None = None
    location: str | None = None
    headline: str | None = None
    bio: str | None = None
    currentPassword: str | None = None
    newPassword: str | None = None


class AccountDeleteRequest(BaseModel):
    password: str = ""


class OpponentRequest(BaseModel):
    characterId: str
    topicId: str
    side: str
    stageName: str
    userSpeech: str = ""


class ReportRequest(BaseModel):
    topicId: str
    characterId: str
    side: str
    sessionId: str | None = None
    transcript: list[dict]


class SafetyRequest(BaseModel):
    text: str


class DrillCompleteRequest(BaseModel):
    sessionId: str
    answers: dict
    score: int


class TutorialAnswerRequest(BaseModel):
    miniGame: str
    questionId: str
    selectedOption: str | None = None
    selectedOptions: list[str] = []
    selectedIndex: int | None = None
    explanation: str = ""


class TutorialCompleteRequest(BaseModel):
    sessionId: int
    answers: list[TutorialAnswerRequest]


class TrainingSessionRequest(BaseModel):
    type: str
    score: float | None = None
    maxScore: float | None = None
    completedQuestions: int | None = None
    result: dict[str, Any] = {}


class PvPResultRequest(BaseModel):
    player1Score: int
    player2Score: int
    notes: str = ""


class MiniGameCompleteRequest(BaseModel):
    miniGameId: str
    skillTreeId: str
    score: int
    maxScore: int
    durationMs: int = 0
    difficulty: str = "medium"
    streak: int = 0
    practiceSeedId: int | None = None
    metadata: dict[str, Any] = {}


# ── Auth routes ───────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    name  = req.name.strip()
    email = normalize_email(req.email)
    if not name:
        api_error(400, "Name is required")
    if "@" not in email:
        api_error(400, "Valid email is required")
    if len(req.password) < 8:
        api_error(400, "Password must be at least 8 characters")
    with db_conn() as conn:
        if conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
            api_error(409, "Email already registered")
        now = now_iso()
        cur = conn.execute(
            "INSERT INTO users(email,name,password_hash,google_sub,created_at,updated_at) "
            "VALUES(?,?,?,NULL,?,?)",
            (email, name, hash_password(req.password), now, now),
        )
        uid   = int(cur.lastrowid)
        token = issue_token(conn, uid)
        row   = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    return {"token": token, "user": public_user(row)}


@app.post("/api/auth/login")
def login(req: LoginRequest):
    email = normalize_email(req.email)
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        if row is None:
            api_error(401, "Invalid email or password")
        ph = row["password_hash"] or ""
        if not ph:
            api_error(400, "This account uses Google sign-in. Use Google login.")
        if not verify_password(req.password, ph):
            api_error(401, "Invalid email or password")
        token = issue_token(conn, int(row["id"]))
    return {"token": token, "user": public_user(row)}


@app.post("/api/auth/google")
def google_login(req: GoogleLoginRequest):
    if not GOOGLE_CLIENT_ID:
        api_error(400, "GOOGLE_CLIENT_ID is not configured on the server")
    try:
        payload = google_id_token.verify_oauth2_token(
            req.idToken, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception:
        api_error(401, "Invalid Google token")
    email = normalize_email(str(payload.get("email", "")))
    name  = str(payload.get("name", "")).strip() or (email.split("@")[0] if email else "Google User")
    sub   = str(payload.get("sub", "")).strip()
    if not email:
        api_error(400, "Google account did not provide an email")
    if not sub:
        api_error(400, "Google account did not provide a subject id")
    if not bool(payload.get("email_verified")):
        api_error(403, "Google email is not verified")
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE google_sub=?", (sub,)).fetchone()
        if row is None:
            row = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
            if row is None:
                now = now_iso()
                cur = conn.execute(
                    "INSERT INTO users(email,name,password_hash,google_sub,created_at,updated_at) "
                    "VALUES(?,?,NULL,?,?,?)",
                    (email, name, sub, now, now),
                )
                row = conn.execute("SELECT * FROM users WHERE id=?", (int(cur.lastrowid),)).fetchone()
            else:
                if row["google_sub"] and row["google_sub"] != sub:
                    api_error(409, "Email already linked to another Google account")
                conn.execute(
                    "UPDATE users SET google_sub=?,name=?,updated_at=? WHERE id=?",
                    (sub, name, now_iso(), int(row["id"])),
                )
                row = conn.execute("SELECT * FROM users WHERE id=?", (int(row["id"]),)).fetchone()
        token = issue_token(conn, int(row["id"]))
    return {"token": token, "user": public_user(row)}


@app.post("/api/auth/logout")
def logout(
    authorization: str | None = Header(default=None),
    _user: dict = Depends(get_current_user),
):
    token = parse_bearer(authorization)
    if token:
        with db_conn() as conn:
            conn.execute("DELETE FROM auth_tokens WHERE token_hash=?", (hash_token(token),))
    return {"success": True}


@app.get("/api/auth/me")
def me(user: dict = Depends(get_current_user)):
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
    if row is None:
        api_error(404, "User not found")
    return {"user": public_user(row)}


@app.put("/api/auth/me")
def update_me(req: AccountUpdateRequest, user: dict = Depends(get_current_user)):
    updates: dict[str, Any] = {}
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
        if row is None:
            api_error(404, "User not found")
        if req.name is not None:
            n = req.name.strip()
            if not n:
                api_error(400, "Name cannot be empty")
            updates["name"] = n
        if req.email is not None:
            e = normalize_email(req.email)
            if "@" not in e:
                api_error(400, "Valid email is required")
            if conn.execute("SELECT id FROM users WHERE email=? AND id!=?", (e, user["id"])).fetchone():
                api_error(409, "Email is already in use")
            updates["email"] = e
        if req.profileImageUrl is not None:
            updates["profile_image_url"] = normalize_profile_image(req.profileImageUrl)
        if req.location  is not None:
            updates["location"] = normalize_optional_text(req.location, "Location", 80)
        if req.headline  is not None:
            updates["headline"] = normalize_optional_text(req.headline, "Headline", 120)
        if req.bio       is not None:
            updates["bio"]      = normalize_optional_text(req.bio, "Bio", 280)
        if req.newPassword:
            if len(req.newPassword) < 8:
                api_error(400, "New password must be at least 8 characters")
            ph = row["password_hash"] or ""
            if ph and (not req.currentPassword or not verify_password(req.currentPassword, ph)):
                api_error(401, "Current password is incorrect")
            updates["password_hash"] = hash_password(req.newPassword)
        if updates:
            updates["updated_at"] = now_iso()
            cols = ", ".join(f"{k}=?" for k in updates)
            conn.execute(f"UPDATE users SET {cols} WHERE id=?", [*updates.values(), user["id"]])
        fresh = conn.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
    return {"user": public_user(fresh)}


@app.delete("/api/auth/me")
def delete_me(req: AccountDeleteRequest, user: dict = Depends(get_current_user)):
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
        if row is None:
            api_error(404, "User not found")
        ph = row["password_hash"] or ""
        if ph and not verify_password(req.password, ph):
            api_error(401, "Password is incorrect")
        conn.execute("DELETE FROM users WHERE id=?", (user["id"],))
    return {"success": True}


@app.get("/api/profile/history")
def get_training_history(user: dict = Depends(get_current_user)):
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM training_history WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
            (user["id"],),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "topicId": r["topic_id"],
            "topicTitle": r["topic_title"],
            "topicTag": r["topic_tag"],
            "topicDifficulty": r["topic_difficulty"],
            "characterId": r["character_id"],
            "characterName": r["character_name"],
            "side": r["side"],
            "rubric": json.loads(r["rubric_json"]),
            "feedback": json.loads(r["feedback_json"]),
            "transcript": json.loads(r["transcript_json"]),
            "createdAt": r["created_at"],
        }
        for r in rows
    ]


# ── Progression routes ────────────────────────────────────────────────────────

@app.get("/api/progression/config")
def get_progression_config():
    return progression_config()


@app.get("/api/tutorial/session")
def get_tutorial_session(user: dict = Depends(get_current_user)):
    if user["tutorialCompleted"]:
        api_error(400, "Tutorial placement is already complete")
    with db_conn() as conn:
        row = conn.execute(
            "SELECT * FROM tutorial_sessions WHERE user_id=? AND status='started' "
            "ORDER BY created_at DESC LIMIT 1",
            (user["id"],),
        ).fetchone()
        if row is None:
            qs  = tutorial_question_bundle(CLASH_TOPICS, FALLACIES, SPEECH_POLISH)
            qid = {item["miniGame"]: item["questionId"] for item in qs}
            now = now_iso()
            cur = conn.execute(
                "INSERT INTO tutorial_sessions(user_id,question_ids_json,questions_json,created_at) "
                "VALUES(?,?,?,?)",
                (user["id"], json.dumps(qid), json.dumps(qs), now),
            )
            row = conn.execute(
                "SELECT * FROM tutorial_sessions WHERE id=?", (int(cur.lastrowid),)
            ).fetchone()
    return {
        "session": {
            "id": row["id"],
            "status": row["status"],
            "miniGames": MINI_GAMES,
            "questions": json.loads(row["questions_json"]),
        }
    }


@app.post("/api/tutorial/complete")
def complete_tutorial(req: TutorialCompleteRequest, user: dict = Depends(get_current_user)):
    if user["tutorialCompleted"]:
        api_error(400, "Tutorial placement is already complete")
    answers_by_game = {a.miniGame: a.model_dump() for a in req.answers}
    with db_conn() as conn:
        row = conn.execute(
            "SELECT * FROM tutorial_sessions WHERE id=? AND user_id=?",
            (req.sessionId, user["id"]),
        ).fetchone()
        if row is None:
            api_error(404, "Tutorial session not found")
        if row["status"] == "completed":
            api_error(409, "Tutorial session already completed")
        questions = json.loads(row["questions_json"])
        expected  = json.loads(row["question_ids_json"])
        if set(expected.keys()) != set(answers_by_game.keys()):
            api_error(400, "All tutorial questions must be answered")
        for mg, qid in expected.items():
            if str(answers_by_game[mg].get("questionId")) != str(qid):
                api_error(400, f"Tutorial answer mismatch for {mg}")
        placement    = score_tutorial(
            questions, answers_by_game,
            FALLACY_LOOKUP, CLASH_TOPIC_LOOKUP, SPEECH_LEVEL1_LOOKUP,
        )
        assigned_lvl = int(placement["assignedLevel"])
        user_row     = fetch_user_row(conn, user["id"])
        placed_xp    = max(int(user_row["total_xp"] or 0), baseline_xp_for_level(assigned_lvl))
        completed_at = now_iso()
        conn.execute(
            "UPDATE tutorial_sessions "
            "SET answers_json=?, scores_json=?, total_score=?, assigned_level=?, "
            "    status='completed', completed_at=? "
            "WHERE id=?",
            (
                json.dumps(answers_by_game), json.dumps(placement["scores"]),
                placement["totalScore"], assigned_lvl, completed_at, req.sessionId,
            ),
        )
        conn.execute(
            "UPDATE users SET tutorial_completed=1, placement_score=?, "
            "current_level=?, total_xp=?, updated_at=? WHERE id=?",
            (placement["totalScore"], assigned_lvl, placed_xp, completed_at, user["id"]),
        )
        fresh = fetch_user_row(conn, user["id"])
    return {
        "session": {
            "id": req.sessionId,
            "status": "completed",
            "questionIds": expected,
            "scores": placement["scores"],
            "totalScore": placement["totalScore"],
            "assignedLevel": placement["assignedLevel"],
            "assignedLevelName": placement["assignedLevelName"],
        },
        "placement": placement,
        "user": public_user(fresh),
    }


@app.post("/api/training-sessions")
def complete_training_session(req: TrainingSessionRequest, user: dict = Depends(get_current_user)):
    require_tutorial_completed(user)
    stype = req.type.strip().lower().replace("speech_polish", "speech")
    if stype not in {"clash", "fallacy", "speech"}:
        api_error(400, "Unsupported training session type")
    result = dict(req.result or {})
    if req.completedQuestions is not None:
        result["completedQuestions"] = req.completedQuestions
    if req.score    is not None:
        result["score"]    = req.score
    if req.maxScore is not None:
        result["maxScore"] = req.maxScore
    earned = calculate_training_xp(stype, score=req.score, max_score=req.maxScore, result=result)
    with db_conn() as conn:
        ts = save_training_session(conn, user["id"], stype, earned, result)
        fresh, leveled = award_user_xp(conn, user["id"], earned)
    return {"trainingSession": ts, "earnedXP": earned, "leveledUp": leveled, "user": public_user(fresh)}


# ── PvP routes ────────────────────────────────────────────────────────────────

@app.post("/api/pvp/match")
def match_pvp(user: dict = Depends(get_current_user)):
    require_tutorial_completed(user)
    with db_conn() as conn:
        existing = conn.execute(
            "SELECT p.*,u1.name AS player1_name,u2.name AS player2_name "
            "FROM pvp_sessions p "
            "JOIN users u1 ON u1.id=p.player1_id "
            "LEFT JOIN users u2 ON u2.id=p.player2_id "
            "WHERE (p.player1_id=? OR p.player2_id=?) AND p.status IN('waiting','matched') "
            "ORDER BY p.updated_at DESC LIMIT 1",
            (user["id"], user["id"]),
        ).fetchone()
        if existing:
            return {"session": serialize_pvp(existing)}
        candidate = conn.execute(
            "SELECT p.*,u.name AS player1_name,u.current_level,u.placement_score "
            "FROM pvp_sessions p "
            "JOIN users u ON u.id=p.player1_id "
            "WHERE p.status='waiting' AND p.player1_id!=? "
            "ORDER BY ABS(u.current_level-?) ASC, ABS(u.placement_score-?) ASC, p.created_at ASC "
            "LIMIT 1",
            (user["id"], user["currentLevel"], user["placementScore"]),
        ).fetchone()
        if candidate is None:
            sid = f"pvp_{secrets.token_hex(8)}"
            now = now_iso()
            conn.execute(
                "INSERT INTO pvp_sessions(id,player1_id,status,created_at,updated_at) "
                "VALUES(?,?,'waiting',?,?)",
                (sid, user["id"], now, now),
            )
            row = conn.execute(
                "SELECT p.*,u1.name AS player1_name,u2.name AS player2_name "
                "FROM pvp_sessions p "
                "JOIN users u1 ON u1.id=p.player1_id "
                "LEFT JOIN users u2 ON u2.id=p.player2_id "
                "WHERE p.id=?",
                (sid,),
            ).fetchone()
            return {"session": serialize_pvp(row)}
        opp   = public_user(fetch_user_row(conn, int(candidate["player1_id"])))
        topic = select_pvp_topic(user, opp)
        p1s, p2s = random.choice([("A", "B"), ("B", "A")])
        now = now_iso()
        conn.execute(
            "UPDATE pvp_sessions "
            "SET player2_id=?, topic_id=?, topic_title=?, topic_difficulty=?, "
            "    player1_side=?, player2_side=?, status='matched', updated_at=? "
            "WHERE id=?",
            (user["id"], topic["id"], topic["title"], topic["difficulty"], p1s, p2s, now, candidate["id"]),
        )
        row = conn.execute(
            "SELECT p.*,u1.name AS player1_name,u2.name AS player2_name "
            "FROM pvp_sessions p "
            "JOIN users u1 ON u1.id=p.player1_id "
            "LEFT JOIN users u2 ON u2.id=p.player2_id "
            "WHERE p.id=?",
            (candidate["id"],),
        ).fetchone()
    return {"session": serialize_pvp(row)}


@app.get("/api/pvp/sessions")
def get_pvp_sessions(user: dict = Depends(get_current_user)):
    require_tutorial_completed(user)
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT p.*,u1.name AS player1_name,u2.name AS player2_name "
            "FROM pvp_sessions p "
            "JOIN users u1 ON u1.id=p.player1_id "
            "LEFT JOIN users u2 ON u2.id=p.player2_id "
            "WHERE p.player1_id=? OR p.player2_id=? "
            "ORDER BY p.updated_at DESC LIMIT 20",
            (user["id"], user["id"]),
        ).fetchall()
    return [serialize_pvp(r) for r in rows]


@app.post("/api/pvp/sessions/{session_id}/complete")
def complete_pvp(session_id: str, req: PvPResultRequest, user: dict = Depends(get_current_user)):
    require_tutorial_completed(user)
    with db_conn() as conn:
        row = conn.execute(
            "SELECT p.*,u1.name AS player1_name,u2.name AS player2_name "
            "FROM pvp_sessions p "
            "JOIN users u1 ON u1.id=p.player1_id "
            "LEFT JOIN users u2 ON u2.id=p.player2_id "
            "WHERE p.id=?",
            (session_id,),
        ).fetchone()
        if row is None:
            api_error(404, "PvP session not found")
        if user["id"] not in {row["player1_id"], row["player2_id"]}:
            api_error(403, "You are not a player in this session")
        if row["status"] == "waiting":
            api_error(400, "The session is still waiting for an opponent")
        if row["status"] == "completed":
            return {"session": serialize_pvp(row), "user": user}
        p1, p2 = int(row["player1_id"]), int(row["player2_id"])
        if   req.player1Score > req.player2Score: winner, o1, o2 = p1, "win",  "loss"
        elif req.player2Score > req.player1Score: winner, o1, o2 = p2, "loss", "win"
        else:                                      winner, o1, o2 = None, "draw", "draw"
        result = {
            "notes": req.notes,
            "submittedBy": user["id"],
            "player1Outcome": o1,
            "player2Outcome": o2,
        }
        now = now_iso()
        conn.execute(
            "UPDATE pvp_sessions "
            "SET status='completed', scores_json=?, result_json=?, winner_id=?, updated_at=? "
            "WHERE id=?",
            (
                json.dumps({"player1": req.player1Score, "player2": req.player2Score}),
                json.dumps(result), winner, now, session_id,
            ),
        )
        x1, x2 = pvp_xp_for_outcome(o1), pvp_xp_for_outcome(o2)
        for uid, xp, outcome in [(p1, x1, o1), (p2, x2, o2)]:
            save_training_session(
                conn, uid, "pvp", xp,
                {"sessionId": session_id, "topicId": row["topic_id"], "outcome": outcome},
            )
        r1, _ = award_user_xp(conn, p1, x1)
        r2, _ = award_user_xp(conn, p2, x2)
        cur_row = r1 if user["id"] == p1 else r2
        fresh = conn.execute(
            "SELECT p.*,u1.name AS player1_name,u2.name AS player2_name "
            "FROM pvp_sessions p "
            "JOIN users u1 ON u1.id=p.player1_id "
            "LEFT JOIN users u2 ON u2.id=p.player2_id "
            "WHERE p.id=?",
            (session_id,),
        ).fetchone()
    return {"session": serialize_pvp(fresh), "user": public_user(cur_row)}


# ── Data routes ───────────────────────────────────────────────────────────────

@app.get("/api/topics")
def get_topics(user: dict | None = Depends(get_optional_user)):
    topics = [topic_payload(t, user) for t in TOPICS]
    if user and user.get("tutorialCompleted"):
        return [t for t in topics if t.get("unlocked")]
    return topics


@app.get("/api/characters")
def get_characters():
    return CHARACTERS


@app.get("/api/drills")
def get_drills():
    return DRILLS


@app.get("/api/clash-topics")
def get_clash_topics():
    return CLASH_TOPICS


@app.get("/api/fallacies")
def get_fallacies():
    return FALLACIES


@app.get("/api/speech-polish")
def get_speech_polish():
    return SPEECH_POLISH


@app.get("/api/health")
def health():
    with db_conn() as conn:
        users = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    return {
        "status": "ok",
        "topics": len(TOPICS),
        "characters": len(CHARACTERS),
        "drills": len(DRILLS),
        "users": users,
    }


# ── Safety ────────────────────────────────────────────────────────────────────

@app.post("/api/safety-check")
def post_safety_check(req: SafetyRequest):
    return safety_check(req.text)


# ── Opponent speech — streamed SSE ────────────────────────────────────────────

@app.post("/api/opponent-speech")
async def post_opponent_speech(req: OpponentRequest):
    """
    Streams the opponent's reply token-by-token as Server-Sent Events.
    Each chunk is a `data: <token>\\n\\n` line.
    Newlines inside tokens are escaped as \\n so SSE framing stays intact.
    The final frame is `data: [DONE]\\n\\n`.
    """
    if req.userSpeech:
        check = safety_check(req.userSpeech)
        if not check["safe"]:
            raise HTTPException(400, detail=check)

    character = get_or_404(CHARACTERS, req.characterId, "Character")
    topic     = get_or_404(TOPICS,     req.topicId,     "Topic")
    g_client  = get_gemini_client()
    system    = build_opponent_system(character, topic, req.side)
    user_msg  = (
        f'Stage: {req.stageName}. The student said: "{req.userSpeech}". '
        f'Respond now as {character["name"]}.'
        if req.userSpeech else
        f'Stage: {req.stageName}. Give your opening argument as {character["name"]}.'
    )

    async def stream() -> AsyncIterator[str]:
        try:
            if g_client is None:
                raise RuntimeError("Missing GEMINI_API_KEY. Set it before calling AI endpoints.")
            response = g_client.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=user_msg,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    max_output_tokens=400,
                ),
            )
            for chunk in response:
                text = getattr(chunk, "text", "") or ""
                if text:
                    safe = text.replace("\\", "\\\\").replace("\n", "\\n")
                    yield f"data: {safe}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: [ERROR] {exc}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Coach report ──────────────────────────────────────────────────────────────

@app.post("/api/coach-report")
def post_coach_report(req: ReportRequest, user: dict | None = Depends(get_optional_user)):
    """
    Step 1 — compute rubric instantly (no AI, returns immediately in the JSON).
    Step 2 — call the model for qualitative text only.
    Both are returned together so the frontend can animate the rubric bars
    the moment the response arrives, before the user reads the feedback.
    """
    if user is not None:
        require_tutorial_completed(user)

    character = get_or_404(CHARACTERS, req.characterId, "Character")
    topic     = get_or_404(TOPICS,     req.topicId,     "Topic")
    g_client  = get_gemini_client()
    rubric    = compute_rubric(req.transcript)
    side_data = topic["sideA"] if req.side == "A" else topic["sideB"]

    tx_text = "\n\n".join(
        f"[{t['stageName']}] "
        f"{'STUDENT' if t['role'] == 'user' else character['name'].upper()}: {t['text']}"
        for t in req.transcript
    )
    rubric_lines = "\n".join(
        f"- {v['label']}: {v['score']}/{v['max']}"
        for v in rubric["breakdown"].values()
    )

    system = (
        "You are a blunt expert debate coach. Be specific and name exact transcript moments. "
        "Do NOT invent or change the score — it is already computed by rubric."
    )
    prompt = (
        f'Topic: "{topic["title"]}" ({topic["tag"]}, {topic["difficulty"]})\n'
        f"Student position: {side_data['position']}\n"
        f"Opponent: {character['name']} — {character['tagline']}\n\n"
        f"RUBRIC (do not change):\n{rubric_lines}\nTOTAL: {rubric['total']}/100\n\n"
        f"TRANSCRIPT:\n{tx_text}\n\n"
        "Write exactly these three sections:\n"
        "STRENGTHS: (2-3 specific things, with transcript examples)\n"
        "GAPS: (2-3 specific weaknesses, with transcript examples)\n"
        "NEXT DRILL: (one concrete practice task)\n\n"
        "No generic praise."
    )

    try:
        if g_client is None:
            raise RuntimeError("Missing GEMINI_API_KEY. Set it before calling AI endpoints.")
        resp = g_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=800,
            ),
        )
        ai_text = getattr(resp, "text", "") or ""
    except Exception:
        ai_text = ""

    def section(label: str, stop: str | None, src: str) -> str:
        pat   = rf"{label}:?\s*([\s\S]*?){f'(?={stop}:)' if stop else '$'}"
        match = re.search(pat, src, re.I)
        return match.group(1).strip() if match else ""

    feedback = {
        "strengths": section("STRENGTHS", "GAPS",       ai_text),
        "gaps":      section("GAPS",      "NEXT DRILL", ai_text),
        "nextDrill": section("NEXT DRILL", None,        ai_text),
    }

    updated_user = None
    earned_xp    = 0
    if user is not None:
        saved_history = persist_training_history(
            user_id=user["id"],
            session_id=req.sessionId,
            topic=topic,
            character=character,
            side=req.side,
            transcript=req.transcript,
            rubric=rubric,
            feedback=feedback,
        )
        if saved_history:
            training_result = {
                "sessionId":       req.sessionId or "",
                "topicId":         topic["id"],
                "topicDifficulty": topic["difficulty"],
                "rubricTotal":     rubric["total"],
            }
            earned_xp = calculate_training_xp("debate", result=training_result)
            with db_conn() as conn:
                save_training_session(conn, user["id"], "debate", earned_xp, training_result)
                fresh, _ = award_user_xp(conn, user["id"], earned_xp)
                updated_user = public_user(fresh)
        else:
            with db_conn() as conn:
                updated_user = public_user(fetch_user_row(conn, user["id"]))

    # ── Coach Mode extras — extract seeds, weak trees, and mini-game recs ────
    coach = build_coach_extras(
        user=user,
        topic=topic,
        character=character,
        side=req.side,
        transcript=req.transcript,
        rubric=rubric,
        feedback=feedback,
        session_id=req.sessionId,
    )

    return {
        "rubric":               rubric,
        "feedback":             feedback,
        "savedToProfile":       user is not None,
        "earnedXP":             earned_xp,
        "user":                 updated_user,
        "weakTrees":            coach["weakTrees"],
        "practiceSeeds":        coach["practiceSeeds"],
        "recommendedMiniGames": coach["recommendedMiniGames"],
    }


# ── Drill completion ──────────────────────────────────────────────────────────

@app.post("/api/drills/{drill_id}/complete")
def complete_drill(drill_id: str, req: DrillCompleteRequest, user: dict | None = Depends(get_optional_user)):
    drill       = get_or_404(DRILLS, drill_id, "Drill")
    completed_at = now_iso()

    with db_conn() as conn:
        conn.execute(
            """
            INSERT INTO drill_completions(
                drill_id,
                session_id,
                user_id,
                answers_json,
                score,
                completed_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(drill_id, session_id)
            DO UPDATE SET
                user_id      = excluded.user_id,
                answers_json = excluded.answers_json,
                score        = excluded.score,
                completed_at = excluded.completed_at
            """,
            (
                drill["id"],
                req.sessionId,
                user["id"] if user else None,
                json.dumps(req.answers),
                req.score,
                completed_at,
            ),
        )

    return {"success": True, "key": f"{req.sessionId}:{drill['id']}"}


@app.get("/api/drills/{drill_id}/completion/{session_id}")
def get_completion(drill_id: str, session_id: str):
    with db_conn() as conn:
        row = conn.execute(
            """
            SELECT drill_id, session_id, user_id, answers_json, score, completed_at
            FROM drill_completions
            WHERE drill_id = ? AND session_id = ?
            """,
            (drill_id, session_id),
        ).fetchone()

    if row is None:
        return None

    return {
        "drillId":     row["drill_id"],
        "sessionId":   row["session_id"],
        "userId":      row["user_id"],
        "answers":     json.loads(row["answers_json"]),
        "score":       row["score"],
        "completedAt": row["completed_at"],
    }


# ── Coach Mode routes ─────────────────────────────────────────────────────────

@app.get("/api/coach-mode")
def get_coach_mode(user: dict = Depends(get_current_user)):
    """Returns the full Coach Mode dashboard payload."""
    with db_conn() as conn:
        trees = get_skill_tree_progress(conn, user["id"])
        seed_rows = conn.execute(
            "SELECT * FROM practice_seeds "
            "WHERE user_id=? AND status IN('new','active') "
            "ORDER BY confidence DESC, created_at DESC LIMIT 6",
            (user["id"],),
        ).fetchall()
        game_rows = conn.execute(
            "SELECT * FROM mini_game_sessions "
            "WHERE user_id=? ORDER BY created_at DESC LIMIT 10",
            (user["id"],),
        ).fetchall()
        recs = recommend_next_actions(conn, user["id"], top_n=3)

    return {
        "skillTrees": list(trees.values()),
        "practiceSeeds": [
            {
                "id":          r["id"],
                "miniGameId":  r["mini_game_id"],
                "skillTreeId": r["skill_tree_id"],
                "excerpt":     r["source_excerpt"],
                "coachNote":   r["coach_note"],
                "prompt":      r["prompt"],
                "difficulty":  r["difficulty"],
                "confidence":  r["confidence"],
                "status":      r["status"],
                "createdAt":   r["created_at"],
            }
            for r in seed_rows
        ],
        "recommendations": recs,
        "recentGames": [
            {
                "id":          r["id"],
                "miniGameId":  r["mini_game_id"],
                "skillTreeId": r["skill_tree_id"],
                "score":       r["score"],
                "maxScore":    r["max_score"],
                "treeXP":      r["tree_xp_earned"],
                "globalXP":    r["global_xp_earned"],
                "durationMs":  r["duration_ms"],
                "createdAt":   r["created_at"],
            }
            for r in game_rows
        ],
    }


@app.get("/api/skill-trees")
def get_skill_trees(user: dict = Depends(get_current_user)):
    with db_conn() as conn:
        trees = get_skill_tree_progress(conn, user["id"])
    return list(trees.values())


@app.get("/api/practice-seeds")
def get_practice_seeds(user: dict = Depends(get_current_user)):
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM practice_seeds WHERE user_id=? ORDER BY created_at DESC LIMIT 20",
            (user["id"],),
        ).fetchall()
    return [
        {
            "id":          r["id"],
            "miniGameId":  r["mini_game_id"],
            "skillTreeId": r["skill_tree_id"],
            "excerpt":     r["source_excerpt"],
            "coachNote":   r["coach_note"],
            "prompt":      r["prompt"],
            "difficulty":  r["difficulty"],
            "confidence":  r["confidence"],
            "status":      r["status"],
            "createdAt":   r["created_at"],
        }
        for r in rows
    ]


@app.get("/api/coach-recommendations")
def get_coach_recommendations(user: dict = Depends(get_current_user)):
    with db_conn() as conn:
        return recommend_next_actions(conn, user["id"], top_n=3)


@app.get("/api/minigames/{mini_game_id}/content")
def get_mini_game_content(
    mini_game_id: str,
    seed_id: int | None = None,
    user: dict = Depends(get_current_user),
):
    if mini_game_id not in MINI_GAME_REGISTRY:
        raise HTTPException(404, f"Mini game '{mini_game_id}' not found")
    if seed_id is not None:
        with db_conn() as conn:
            row = conn.execute(
                "SELECT * FROM practice_seeds WHERE id=? AND user_id=?",
                (seed_id, user["id"]),
            ).fetchone()
        if row is None:
            raise HTTPException(404, "Practice seed not found")
        return {
            "contentType":   "personalized",
            "miniGameId":    mini_game_id,
            "skillTreeId":   row["skill_tree_id"],
            "seedId":        seed_id,
            "sourceExcerpt": row["source_excerpt"],
            "coachIntro":    row["coach_note"],
            "prompt":        row["prompt"],
            "weak":          row["source_excerpt"],
            "difficulty":    row["difficulty"],
        }
    meta = MINI_GAME_REGISTRY[mini_game_id]
    return {
        "contentType": "static",
        "miniGameId":  mini_game_id,
        "skillTreeId": meta["skillTreeId"],
        "note":        "Use the static data file for this game.",
    }


@app.post("/api/minigames/{mini_game_id}/complete")
def complete_mini_game(
    mini_game_id: str,
    req: MiniGameCompleteRequest,
    user: dict = Depends(get_current_user),
):
    if mini_game_id not in MINI_GAME_REGISTRY:
        raise HTTPException(404, f"Mini game '{mini_game_id}' not found")

    skill_tree_id = req.skillTreeId or MINI_GAME_REGISTRY[mini_game_id]["skillTreeId"]
    xp_awards = calculate_mini_game_xp(
        mini_game_id, req.score, req.maxScore, req.difficulty, req.streak
    )

    with db_conn() as conn:
        conn.execute(
            """
            INSERT INTO mini_game_sessions(
                user_id, mini_game_id, skill_tree_id, practice_seed_id,
                score, max_score, tree_xp_earned, global_xp_earned,
                duration_ms, metadata_json, created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                user["id"], mini_game_id, skill_tree_id, req.practiceSeedId,
                req.score, req.maxScore,
                xp_awards["treeXP"], xp_awards["globalXP"],
                req.durationMs, json.dumps(req.metadata), now_iso(),
            ),
        )
        updated_tree       = award_tree_xp(conn, user["id"], skill_tree_id, xp_awards["treeXP"])
        fresh, leveled_up  = award_user_xp(conn, user["id"], xp_awards["globalXP"])
        if req.practiceSeedId:
            conn.execute(
                "UPDATE practice_seeds SET status='completed' WHERE id=? AND user_id=?",
                (req.practiceSeedId, user["id"]),
            )
        next_recs = recommend_next_actions(conn, user["id"], top_n=2)

    return {
        "treeXPEarned":      xp_awards["treeXP"],
        "globalXPEarned":    xp_awards["globalXP"],
        "updatedTree":       updated_tree,
        "leveledUp":         leveled_up,
        "user":              public_user(fresh),
        "nextRecommendations": next_recs,
    }