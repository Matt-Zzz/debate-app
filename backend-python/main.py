"""
Debate Training Simulator — FastAPI Backend
Run: uvicorn main:app --reload --port 3001
"""

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, AsyncIterator
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from google.auth.transport import requests as google_requests
from google.genai import types
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(title="Debate Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA = Path(__file__).parent / "data"
DB_PATH = Path(__file__).parent / "app.db"

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite").strip()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()

TOKEN_TTL_DAYS = 30
PBKDF2_ITERATIONS = 210_000

client: Optional[genai.Client] = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


# ── Load data files ───────────────────────────────────────────────────────────

TOPICS: list[dict] = json.loads((DATA / "topics.json").read_text())
CHARACTERS: list[dict] = json.loads((DATA / "characters.json").read_text())
DRILLS: list[dict] = json.loads((DATA / "drills.json").read_text())
CLASH_TOPICS: list[dict] = json.loads((DATA / "clash_topics.json").read_text())
FALLACIES:     list[dict] = json.loads((DATA / "fallacies.json").read_text())
SPEECH_POLISH: dict = json.loads((DATA / "speech_polish.json").read_text())



# ── Database ──────────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with db_conn() as conn:
        conn.executescript(
            """
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

            CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_training_history_user_created ON training_history(user_id, created_at DESC);
            """
        )


init_db()

print(f"✓ {len(TOPICS)} topics · {len(CHARACTERS)} characters · {len(DRILLS)} drills · {len(CLASH_TOPICS)} clash topics")


# ── Auth helpers ──────────────────────────────────────────────────────────────

def api_error(status_code: int, message: str) -> None:
    raise HTTPException(status_code=status_code, detail={"message": message})


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str, salt: str | None = None) -> str:
    use_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        use_salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"{use_salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, digest = stored_hash.split("$", 1)
    except ValueError:
        return False
    calc = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(calc, digest)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_token(conn: sqlite3.Connection, user_id: int) -> str:
    raw_token = secrets.token_urlsafe(32)
    conn.execute(
        "INSERT INTO auth_tokens(token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (
            hash_token(raw_token),
            user_id,
            now_iso(),
            (datetime.now(timezone.utc) + timedelta(days=TOKEN_TTL_DAYS)).isoformat(),
        ),
    )
    return raw_token


def parse_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


def public_user(row: sqlite3.Row | dict) -> dict:
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def get_optional_user(authorization: str | None = Header(default=None)) -> dict | None:
    token = parse_bearer_token(authorization)
    if not token:
        return None

    token_hash = hash_token(token)
    with db_conn() as conn:
        row = conn.execute(
            """
            SELECT u.*, t.expires_at
            FROM auth_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token_hash = ?
            """,
            (token_hash,),
        ).fetchone()

        if row is None:
            return None

        try:
            expires = datetime.fromisoformat(row["expires_at"])
        except ValueError:
            conn.execute("DELETE FROM auth_tokens WHERE token_hash = ?", (token_hash,))
            return None

        if expires <= datetime.now(timezone.utc):
            conn.execute("DELETE FROM auth_tokens WHERE token_hash = ?", (token_hash,))
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
    opp_turns = [t for t in transcript if t["role"] == "opponent"]
    if not user_turns:
        return {"total": 0, "breakdown": {}}

    text = " ".join(t["text"] for t in user_turns)
    wc = len(text.split())

    def has(*pats: str) -> bool:
        return any(re.search(p, text, re.I) for p in pats)

    s = 0
    if has(r"\b(define|definition|mean(?:s|ing)|by .{1,20} I mean)\b"):
        s += 5
    if has(r"\b(framework|value|criterion|principle|I argue|I contend)\b"):
        s += 5
    if has(r"\b(first|second|contention|argument|because)\b"):
        s += 5
    if has(r"\b(therefore|thus|in conclusion|for these reasons)\b"):
        s += 3
    if wc > 150:
        s += 2
    s = min(s, 20)

    a = 0
    if has(r"\b(because|since|evidence|studies|research|data)\b"):
        a += 7
    if has(r"\b(for example|for instance|such as)\b"):
        a += 4
    if has(r"\b(therefore|this means that|it follows that)\b"):
        a += 5
    if has(r"\b(however|although|I concede|granted)\b"):
        a += 4
    a = min(a, 20)

    c = 0
    if opp_turns:
        if has(r"\b(my opponent|they claim|the other side|disagree)\b"):
            c += 8
        if len(user_turns) >= 2:
            c += 5
        if has(r"\b(my position stands|still holds|despite this)\b"):
            c += 4
        if has(r"\b(counter|in response|the real issue is)\b"):
            c += 3
    else:
        c = 10
    c = min(c, 20)

    i = 0
    if has(r"\b(impact|harm|benefit|cost|consequence|lives|people|society)\b"):
        i += 6
    if has(r"\b(more important|outweigh|greater|more likely|magnitude)\b"):
        i += 7
    if has(r"\b(this matters because|the stakes)\b"):
        i += 4
    if has(r"\b(alternative|compared to|versus|rather than|status quo)\b"):
        i += 3
    i = min(i, 20)

    p = 0
    if has(r"\b(I (?:claim|argue|contend|maintain) that)\b"):
        p += 6
    if has(r"\b(specifically|precisely|exactly|to be clear)\b"):
        p += 4
    if not has(r"\b(maybe|kind of|sort of|perhaps maybe)\b"):
        p += 5
    if has(r"\b(always|never|necessarily|must|cannot)\b"):
        p += 5
    p = min(p, 20)

    total = s + a + c + i + p
    return {
        "total": total,
        "breakdown": {
            "structure": {"score": s, "max": 20, "label": "Structure & Organization"},
            "argQuality": {"score": a, "max": 20, "label": "Argument Quality"},
            "clash": {"score": c, "max": 20, "label": "Clash & Responsiveness"},
            "impact": {"score": i, "max": 20, "label": "Impact & Weighing"},
            "precision": {"score": p, "max": 20, "label": "Precision & Commitment"},
        },
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_or_404(collection: list[dict], item_id: str, label: str) -> dict:
    obj = next((x for x in collection if x["id"] == item_id), None)
    if not obj:
        raise HTTPException(404, f"{label} '{item_id}' not found")
    return obj


def build_opponent_system(character: dict, topic: dict, side: str) -> str:
    opp = topic["sideB"] if side == "A" else topic["sideA"]
    nl = "\n"
    return (
        f"You are {character['name']} in a competitive debate.\n\n"
        f"PROFILE: {character['description']}\n\n"
        f"YOU ALWAYS DO:\n{nl.join('- ' + d for d in character['alwaysDoes'])}\n\n"
        f"SIGNATURE STRUCTURE: {character['signatureStructure']}\n\n"
        f"EXAMPLE PHRASES:\n{nl.join(chr(34) + p + chr(34) for p in character['examplePhrases'])}\n\n"
        f"FALLACIES YOU FLAG: {', '.join(character['fallaciesDetected'])}\n\n"
        f"TOPIC: \"{topic['title']}\"\n"
        f"YOUR POSITION: {opp['position']}\n"
        f"YOUR ARGUMENTS: {' | '.join(opp['args'])}\n"
        f"Aggression: {character['settings']['aggression']} · "
        f"Charity: {character['settings']['charity']}\n\n"
        "RULES: Stay in character. 3-5 sentences. Natural prose — no bullets. "
        "End with a pointed question or sharp crystallization. "
        "Never produce hateful or dehumanizing content."
    )


def persist_training_history(
    user_id: int,
    topic: dict,
    character: dict,
    side: str,
    transcript: list[dict],
    rubric: dict,
    feedback: dict[str, Any],
) -> None:
    with db_conn() as conn:
        conn.execute(
            """
            INSERT INTO training_history(
                user_id,
                topic_id,
                topic_title,
                topic_tag,
                topic_difficulty,
                character_id,
                character_name,
                side,
                rubric_json,
                feedback_json,
                transcript_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                topic["id"],
                topic["title"],
                topic.get("tag"),
                topic.get("difficulty"),
                character["id"],
                character["name"],
                side,
                json.dumps(rubric),
                json.dumps(feedback),
                json.dumps(transcript),
                now_iso(),
            ),
        )


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
    transcript: list[dict]


class SafetyRequest(BaseModel):
    text: str


class DrillCompleteRequest(BaseModel):
    sessionId: str
    answers: dict
    score: int


# ── Auth routes ───────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    name = req.name.strip()
    email = normalize_email(req.email)

    if not name:
        api_error(400, "Name is required")
    if not email or "@" not in email:
        api_error(400, "Valid email is required")
    if len(req.password) < 8:
        api_error(400, "Password must be at least 8 characters")

    with db_conn() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            api_error(409, "Email already registered")

        now = now_iso()
        cursor = conn.execute(
            """
            INSERT INTO users(email, name, password_hash, google_sub, created_at, updated_at)
            VALUES (?, ?, ?, NULL, ?, ?)
            """,
            (email, name, hash_password(req.password), now, now),
        )
        user_id = int(cursor.lastrowid)
        token = issue_token(conn, user_id)
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    return {"token": token, "user": public_user(row)}


@app.post("/api/auth/login")
def login(req: LoginRequest):
    email = normalize_email(req.email)
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            api_error(401, "Invalid email or password")

        password_hash = row["password_hash"] or ""
        if not password_hash:
            api_error(400, "This account uses Google sign-in. Use Google login.")
        if not verify_password(req.password, password_hash):
            api_error(401, "Invalid email or password")

        token = issue_token(conn, int(row["id"]))

    return {"token": token, "user": public_user(row)}


@app.post("/api/auth/google")
def google_login(req: GoogleLoginRequest):
    if not GOOGLE_CLIENT_ID:
        api_error(400, "GOOGLE_CLIENT_ID is not configured on the server")

    try:
        payload = google_id_token.verify_oauth2_token(
            req.idToken,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        api_error(401, "Invalid Google token")

    email = normalize_email(str(payload.get("email", "")))
    name = str(payload.get("name", "")).strip() or (email.split("@")[0] if email else "Google User")
    sub = str(payload.get("sub", "")).strip()

    if not email:
        api_error(400, "Google account did not provide an email")
    if not sub:
        api_error(400, "Google account did not provide a subject id")

    email_verified = bool(payload.get("email_verified"))
    if not email_verified:
        api_error(403, "Google email is not verified")

    with db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE google_sub = ?", (sub,)).fetchone()

        if row is None:
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if row is None:
                now = now_iso()
                cursor = conn.execute(
                    """
                    INSERT INTO users(email, name, password_hash, google_sub, created_at, updated_at)
                    VALUES (?, ?, NULL, ?, ?, ?)
                    """,
                    (email, name, sub, now, now),
                )
                row = conn.execute("SELECT * FROM users WHERE id = ?", (int(cursor.lastrowid),)).fetchone()
            else:
                if row["google_sub"] and row["google_sub"] != sub:
                    api_error(409, "Email already linked to another Google account")
                conn.execute(
                    "UPDATE users SET google_sub = ?, name = ?, updated_at = ? WHERE id = ?",
                    (sub, name, now_iso(), int(row["id"])),
                )
                row = conn.execute("SELECT * FROM users WHERE id = ?", (int(row["id"]),)).fetchone()

        token = issue_token(conn, int(row["id"]))

    return {"token": token, "user": public_user(row)}


@app.post("/api/auth/logout")
def logout(
    authorization: str | None = Header(default=None),
    _user: dict = Depends(get_current_user),
):
    token = parse_bearer_token(authorization)
    if token:
        with db_conn() as conn:
            conn.execute("DELETE FROM auth_tokens WHERE token_hash = ?", (hash_token(token),))
    return {"success": True}


@app.get("/api/auth/me")
def me(user: dict = Depends(get_current_user)):
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    if row is None:
        api_error(404, "User not found")
    return {"user": public_user(row)}


@app.put("/api/auth/me")
def update_me(req: AccountUpdateRequest, user: dict = Depends(get_current_user)):
    updates: dict[str, Any] = {}

    with db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
        if row is None:
            api_error(404, "User not found")

        if req.name is not None:
            name = req.name.strip()
            if not name:
                api_error(400, "Name cannot be empty")
            updates["name"] = name

        if req.email is not None:
            email = normalize_email(req.email)
            if not email or "@" not in email:
                api_error(400, "Valid email is required")
            exists = conn.execute("SELECT id FROM users WHERE email = ? AND id != ?", (email, user["id"])).fetchone()
            if exists:
                api_error(409, "Email is already in use")
            updates["email"] = email

        if req.newPassword:
            if len(req.newPassword) < 8:
                api_error(400, "New password must be at least 8 characters")

            current_hash = row["password_hash"] or ""
            if current_hash:
                if not req.currentPassword or not verify_password(req.currentPassword, current_hash):
                    api_error(401, "Current password is incorrect")
            updates["password_hash"] = hash_password(req.newPassword)

        if updates:
            updates["updated_at"] = now_iso()
            cols = ", ".join(f"{k} = ?" for k in updates.keys())
            vals = list(updates.values()) + [user["id"]]
            conn.execute(f"UPDATE users SET {cols} WHERE id = ?", vals)

        fresh = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()

    return {"user": public_user(fresh)}


@app.delete("/api/auth/me")
def delete_me(req: AccountDeleteRequest, user: dict = Depends(get_current_user)):
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
        if row is None:
            api_error(404, "User not found")

        current_hash = row["password_hash"] or ""
        if current_hash and not verify_password(req.password, current_hash):
            api_error(401, "Password is incorrect")

        conn.execute("DELETE FROM users WHERE id = ?", (user["id"],))

    return {"success": True}


@app.get("/api/profile/history")
def get_training_history(user: dict = Depends(get_current_user)):
    with db_conn() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM training_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (user["id"],),
        ).fetchall()

    result = []
    for row in rows:
        result.append(
            {
                "id": row["id"],
                "topicId": row["topic_id"],
                "topicTitle": row["topic_title"],
                "topicTag": row["topic_tag"],
                "topicDifficulty": row["topic_difficulty"],
                "characterId": row["character_id"],
                "characterName": row["character_name"],
                "side": row["side"],
                "rubric": json.loads(row["rubric_json"]),
                "feedback": json.loads(row["feedback_json"]),
                "transcript": json.loads(row["transcript_json"]),
                "createdAt": row["created_at"],
            }
        )

    return result


# ── Data routes ───────────────────────────────────────────────────────────────

@app.get("/api/topics")
def get_topics():
    return TOPICS


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
    Each chunk is a `data: <token>\n\n` line.
    Newlines inside tokens are escaped as \n so SSE framing stays intact.
    The final frame is `data: [DONE]\n\n`.
    """
    if req.userSpeech:
        check = safety_check(req.userSpeech)
        if not check["safe"]:
            raise HTTPException(400, detail=check)

    character = get_or_404(CHARACTERS, req.characterId, "Character")
    topic = get_or_404(TOPICS, req.topicId, "Topic")
    g_client = get_gemini_client()
    system = build_opponent_system(character, topic, req.side)
    user_msg = (
        f'Stage: {req.stageName}. The student said: "{req.userSpeech}". '
        f'Respond now as {character["name"]}.'
        if req.userSpeech
        else f'Stage: {req.stageName}. Give your opening argument as {character["name"]}.'
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
    character = get_or_404(CHARACTERS, req.characterId, "Character")
    topic = get_or_404(TOPICS, req.topicId, "Topic")
    g_client = get_gemini_client()
    rubric = compute_rubric(req.transcript)
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
        pat = rf"{label}:?\s*([\s\S]*?){f'(?={stop}:)' if stop else '$'}"
        match = re.search(pat, src, re.I)
        return match.group(1).strip() if match else ""

    feedback = {
        "strengths": section("STRENGTHS", "GAPS", ai_text),
        "gaps": section("GAPS", "NEXT DRILL", ai_text),
        "nextDrill": section("NEXT DRILL", None, ai_text),
    }

    if user is not None:
        persist_training_history(
            user_id=user["id"],
            topic=topic,
            character=character,
            side=req.side,
            transcript=req.transcript,
            rubric=rubric,
            feedback=feedback,
        )

    return {
        "rubric": rubric,
        "feedback": feedback,
        "savedToProfile": user is not None,
    }


# ── Drill completion ──────────────────────────────────────────────────────────

@app.post("/api/drills/{drill_id}/complete")
def complete_drill(drill_id: str, req: DrillCompleteRequest, user: dict | None = Depends(get_optional_user)):
    drill = get_or_404(DRILLS, drill_id, "Drill")
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
                user_id = excluded.user_id,
                answers_json = excluded.answers_json,
                score = excluded.score,
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
        "drillId": row["drill_id"],
        "sessionId": row["session_id"],
        "userId": row["user_id"],
        "answers": json.loads(row["answers_json"]),
        "score": row["score"],
        "completedAt": row["completed_at"],
    }
