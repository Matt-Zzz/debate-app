from __future__ import annotations

import re

from agents.ai_runtime import gemini_json_or_default
from models.debate_topic import RawTopic, SuitabilityResult


PROTECTED_GROUP_ATTACK = re.compile(
    r"\b(race|religion|ethnic|immigrant|gender|lgbt|gay|lesbian|trans|jew|muslim|christian)\b"
    r".*\b(inferior|superior|eliminate|remove|banish|should not exist|dangerous by nature)\b",
    re.I | re.S,
)

FACT_ONLY_PATTERNS = [
    re.compile(r"\b(earthquake|flood|hurricane|wildfire|tsunami|shooting|accident|obituary)\b", re.I),
    re.compile(r"\b(score|won|defeated|results|box office|earnings beat)\b", re.I),
]

GOSSIP_PATTERNS = [
    re.compile(r"\b(celebrity|divorce|dating|relationship drama|red carpet|fashion week)\b", re.I),
]

DEBATE_MARKERS = {
    "should",
    "ban",
    "allow",
    "regulate",
    "policy",
    "legal",
    "ethics",
    "ethical",
    "fair",
    "rights",
    "privacy",
    "responsibility",
    "school",
    "schools",
    "university",
    "universities",
    "exam",
    "government",
    "tax",
    "climate",
    "public",
}

CONTROVERSY_MARKERS = [
    "debate",
    "backlash",
    "critic",
    "protest",
    "controvers",
    "dispute",
    "concern",
    "lawsuit",
    "ban",
]

CAUTION_MARKERS = [
    "war",
    "military",
    "abortion",
    "suicide",
    "terror",
    "drugs",
    "violence",
]

NON_DEBATE_HEADLINE_PATTERNS = [
    re.compile(r"^\s*(live updates?|breaking|watch):", re.I),
    re.compile(r"\b(hours after|minutes after|today|this week|according to)\b", re.I),
    re.compile(r"\b(cbs news|fox news|bbc|cnn|reuters|associated press)\b", re.I),
    re.compile(r"\b(what happened|who is|where is|when did|how many)\b", re.I),
]

FACTUAL_QUESTION_PREFIX = re.compile(r"^\s*(what|who|where|when|how)\b", re.I)

_ALLOWED_SAFETY = {"safe", "caution", "unsafe"}


def _to_bool(value: object, fallback: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "yes", "1", "y"}
    return fallback


def _has_keyword(text: str, keyword: str) -> bool:
    return re.search(rf"\b{re.escape(keyword)}\b", text) is not None


def _heuristic_suitability(topic: RawTopic) -> SuitabilityResult:
    text = f"{topic.raw_title}. {topic.summary}".strip().lower()
    title = topic.raw_title.strip()

    if PROTECTED_GROUP_ATTACK.search(text):
        return SuitabilityResult(
            is_debatable=False,
            reason="Targets protected groups in a harmful way.",
            safety_level="unsafe",
        )

    safety_level = "caution" if any(marker in text for marker in CAUTION_MARKERS) else "safe"

    if any(pattern.search(text) for pattern in GOSSIP_PATTERNS):
        return SuitabilityResult(
            is_debatable=False,
            reason="Mostly entertainment gossip with weak educational debate value.",
            safety_level=safety_level,
        )

    if any(pattern.search(title) for pattern in NON_DEBATE_HEADLINE_PATTERNS):
        return SuitabilityResult(
            is_debatable=False,
            reason="Headline format is breaking-news style and needs reframing before debate use.",
            safety_level=safety_level,
        )

    if FACTUAL_QUESTION_PREFIX.search(title):
        return SuitabilityResult(
            is_debatable=False,
            reason="Question is mainly factual and does not create two clear policy sides.",
            safety_level=safety_level,
        )

    has_debate_signal = any(_has_keyword(text, marker) for marker in DEBATE_MARKERS)
    has_controversy_signal = any(marker in text for marker in CONTROVERSY_MARKERS)

    if any(pattern.search(text) for pattern in FACT_ONLY_PATTERNS) and not has_debate_signal:
        return SuitabilityResult(
            is_debatable=False,
            reason="Mostly factual breaking news and not a two-sided policy question.",
            safety_level=safety_level,
        )

    if len(topic.raw_title.split()) < 4:
        return SuitabilityResult(
            is_debatable=False,
            reason="Topic is too short and vague for structured debate.",
            safety_level=safety_level,
        )

    if len(title) > 120 and ":" in title:
        return SuitabilityResult(
            is_debatable=False,
            reason="Topic title is too headline-like and specific for classroom debate.",
            safety_level=safety_level,
        )

    if has_debate_signal or has_controversy_signal or "?" in topic.raw_title:
        return SuitabilityResult(
            is_debatable=True,
            reason="Clear controversy with reasonable arguments on both sides.",
            safety_level=safety_level,
        )

    return SuitabilityResult(
        is_debatable=False,
        reason="Insufficient policy or ethical tension for student debate.",
        safety_level=safety_level,
    )


def evaluate_debate_suitability(topic: RawTopic) -> SuitabilityResult:
    fallback = _heuristic_suitability(topic)
    default = {
        "is_debatable": fallback.is_debatable,
        "reason": fallback.reason,
        "safety_level": fallback.safety_level,
    }

    prompt = (
        "Evaluate if this trending topic is suitable for student debate.\n"
        "Return JSON with keys: is_debatable(boolean), reason(string), safety_level(string: safe|caution|unsafe).\n"
        "Criteria: clear controversy, both sides arguable, not only factual event, avoid targeted harm.\n"
        "Reject raw headline/update items that are too specific or rely on named-person drama.\n\n"
        f"Source: {topic.source}\n"
        f"Title: {topic.raw_title}\n"
        f"Summary: {topic.summary}\n"
    )
    payload = gemini_json_or_default(
        system_instruction=(
            "You are Debate Suitability Filter Agent for a school debate app. "
            "Output valid JSON only. Keep reason concise and specific."
        ),
        prompt=prompt,
        default=default,
        max_output_tokens=300,
    )

    reason = str(payload.get("reason", fallback.reason)).strip() or fallback.reason
    safety = str(payload.get("safety_level", fallback.safety_level)).strip().lower()
    if safety not in _ALLOWED_SAFETY:
        safety = fallback.safety_level

    return SuitabilityResult(
        is_debatable=_to_bool(payload.get("is_debatable"), fallback.is_debatable),
        reason=reason[:240],
        safety_level=safety,
    )
