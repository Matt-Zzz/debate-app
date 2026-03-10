"""
Debate Training Simulator — FastAPI Backend
Run: uvicorn main:app --reload --port 3001
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from pydantic import BaseModel

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(title="Debate Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL   = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite").strip()
client: genai.Client | None = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

DATA = Path(__file__).parent / "data"

# ── Load data files ───────────────────────────────────────────────────────────

TOPICS:     list[dict] = json.loads((DATA / "topics.json").read_text())
CHARACTERS: list[dict] = json.loads((DATA / "characters.json").read_text())
DRILLS:     list[dict] = json.loads((DATA / "drills.json").read_text())

drill_completions: dict[str, dict] = {}

print(f"✓ {len(TOPICS)} topics · {len(CHARACTERS)} characters · {len(DRILLS)} drills")

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

    # Structure & Organisation (20 pts)
    s = 0
    if has(r"\b(define|definition|mean(?:s|ing)|by .{1,20} I mean)\b"): s += 5
    if has(r"\b(framework|value|criterion|principle|I argue|I contend)\b"): s += 5
    if has(r"\b(first|second|contention|argument|because)\b"): s += 5
    if has(r"\b(therefore|thus|in conclusion|for these reasons)\b"): s += 3
    if wc > 150: s += 2
    s = min(s, 20)

    # Argument Quality (20 pts)
    a = 0
    if has(r"\b(because|since|evidence|studies|research|data)\b"): a += 7
    if has(r"\b(for example|for instance|such as)\b"): a += 4
    if has(r"\b(therefore|this means that|it follows that)\b"): a += 5
    if has(r"\b(however|although|I concede|granted)\b"): a += 4
    a = min(a, 20)

    # Clash & Responsiveness (20 pts)
    c = 0
    if opp_turns:
        if has(r"\b(my opponent|they claim|the other side|disagree)\b"): c += 8
        if len(user_turns) >= 2: c += 5
        if has(r"\b(my position stands|still holds|despite this)\b"): c += 4
        if has(r"\b(counter|in response|the real issue is)\b"): c += 3
    else:
        c = 10  # no opponent yet — partial credit
    c = min(c, 20)

    # Impact & Weighing (20 pts)
    i = 0
    if has(r"\b(impact|harm|benefit|cost|consequence|lives|people|society)\b"): i += 6
    if has(r"\b(more important|outweigh|greater|more likely|magnitude)\b"): i += 7
    if has(r"\b(this matters because|the stakes)\b"): i += 4
    if has(r"\b(alternative|compared to|versus|rather than|status quo)\b"): i += 3
    i = min(i, 20)

    # Precision & Commitment (20 pts)
    p = 0
    if has(r"\b(I (?:claim|argue|contend|maintain) that)\b"): p += 6
    if has(r"\b(specifically|precisely|exactly|to be clear)\b"): p += 4
    if not has(r"\b(maybe|kind of|sort of|perhaps maybe)\b"): p += 5
    if has(r"\b(always|never|necessarily|must|cannot)\b"): p += 5
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_or_404(collection: list[dict], item_id: str, label: str) -> dict:
    obj = next((x for x in collection if x["id"] == item_id), None)
    if not obj:
        raise HTTPException(404, f"{label} '{item_id}' not found")
    return obj


def get_gemini_client() -> genai.Client | None:
    return client


def build_opponent_system(character: dict, topic: dict, side: str) -> str:
    opp = topic["sideB"] if side == "A" else topic["sideA"]
    nl  = "\n"
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


# ── Request models ────────────────────────────────────────────────────────────

class OpponentRequest(BaseModel):
    characterId: str
    topicId:     str
    side:        str
    stageName:   str
    userSpeech:  str = ""

class ReportRequest(BaseModel):
    topicId:     str
    characterId: str
    side:        str
    transcript:  list[dict]

class SafetyRequest(BaseModel):
    text: str

class DrillCompleteRequest(BaseModel):
    sessionId: str
    answers:   dict
    score:     int


# ── Data routes ───────────────────────────────────────────────────────────────

@app.get("/api/topics")
def get_topics(): return TOPICS

@app.get("/api/characters")
def get_characters(): return CHARACTERS

@app.get("/api/drills")
def get_drills(): return DRILLS

@app.get("/api/health")
def health():
    return {"status": "ok", "topics": len(TOPICS), "characters": len(CHARACTERS), "drills": len(DRILLS)}


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
def post_coach_report(req: ReportRequest):
    """
    Step 1 — compute rubric instantly (no AI, returns immediately in the JSON).
    Step 2 — call the model for qualitative text only.
    Both are returned together so the frontend can animate the rubric bars
    the moment the response arrives, before the user reads the feedback.
    """
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
        resp    = g_client.models.generate_content(
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
        m   = re.search(pat, src, re.I)
        return m.group(1).strip() if m else ""

    return {
        "rubric": rubric,
        "feedback": {
            "strengths": section("STRENGTHS", "GAPS",       ai_text),
            "gaps":      section("GAPS",      "NEXT DRILL", ai_text),
            "nextDrill": section("NEXT DRILL", None,        ai_text),
        },
    }


# ── Drill completion ──────────────────────────────────────────────────────────

@app.post("/api/drills/{drill_id}/complete")
def complete_drill(drill_id: str, req: DrillCompleteRequest):
    get_or_404(DRILLS, drill_id, "Drill")
    key = f"{req.sessionId}:{drill_id}"
    drill_completions[key] = {
        "drillId":     drill_id,
        "sessionId":   req.sessionId,
        "answers":     req.answers,
        "score":       req.score,
        "completedAt": datetime.now(timezone.utc).isoformat(),
    }
    return {"success": True, "key": key}

@app.get("/api/drills/{drill_id}/completion/{session_id}")
def get_completion(drill_id: str, session_id: str):
    return drill_completions.get(f"{session_id}:{drill_id}")
