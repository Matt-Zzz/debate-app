from __future__ import annotations

from agents.ai_runtime import gemini_json_or_default
from models.debate_topic import DebateDraft, RawTopic, TopicClassification


CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("Education / AI", ["school", "student", "university", "exam", "curriculum", "ai", "chatgpt"]),
    ("AI / Technology", ["ai", "algorithm", "automation", "software", "platform", "cyber"]),
    ("Environment", ["climate", "emission", "carbon", "energy", "pollution", "biodiversity"]),
    ("Politics / Policy", ["government", "policy", "regulation", "law", "election", "tax", "public"]),
    ("Ethics", ["ethical", "morality", "rights", "fairness", "privacy", "responsibility"]),
    ("Economy", ["economy", "inflation", "trade", "wage", "labor", "market"]),
]

STYLE_RULES: list[tuple[str, list[str]]] = [
    ("Policy", ["policy", "regulation", "law", "government", "public", "tax"]),
    ("Ethical", ["ethic", "moral", "rights", "fair", "privacy", "justice"]),
    ("Academic", ["student", "school", "university", "research", "exam", "curriculum"]),
]

HARD_KEYWORDS = [
    "constitutional",
    "geopolitical",
    "legal",
    "human rights",
    "privacy",
    "algorithmic bias",
    "regulation",
    "ethics",
]

MEDIUM_KEYWORDS = [
    "ai",
    "education",
    "economy",
    "tax",
    "labor",
    "public health",
    "climate",
    "platform",
]


LEVEL_RECOMMENDATION = {
    "Easy": "middle school / high school",
    "Medium": "high school / university beginner",
    "Hard": "university advanced",
}

_ALLOWED_DIFFICULTY = {"Easy", "Medium", "Hard"}
_ALLOWED_STYLE = {"Casual", "Academic", "Policy", "Ethical"}


def _pick_label(text: str, rules: list[tuple[str, list[str]]], default: str) -> str:
    for label, keywords in rules:
        if any(word in text for word in keywords):
            return label
    return default


def _heuristic_classify(topic: RawTopic, draft: DebateDraft) -> TopicClassification:
    text = f"{topic.raw_title} {topic.summary} {draft.topic}".lower()

    category = _pick_label(text, CATEGORY_RULES, "Culture / Society")
    style = _pick_label(text, STYLE_RULES, "Casual")

    score = 0
    if style in {"Policy", "Ethical"}:
        score += 1
    if any(word in text for word in MEDIUM_KEYWORDS):
        score += 1
    if any(word in text for word in HARD_KEYWORDS):
        score += 2

    if score <= 1:
        difficulty = "Easy"
        reason = "Topic connects to daily experience and needs limited background knowledge."
    elif score <= 3:
        difficulty = "Medium"
        reason = "Topic needs some social, tech, or policy context to argue well."
    else:
        difficulty = "Hard"
        reason = "Topic requires complex policy, ethical, or legal reasoning."

    return TopicClassification(
        category=category,
        difficulty=difficulty,
        debate_style=style,
        reason=reason,
        recommended_level=LEVEL_RECOMMENDATION[difficulty],
    )


def classify_topic(topic: RawTopic, draft: DebateDraft) -> TopicClassification:
    fallback = _heuristic_classify(topic, draft)
    default = {
        "category": fallback.category,
        "difficulty": fallback.difficulty,
        "debate_style": fallback.debate_style,
        "reason": fallback.reason,
        "recommended_level": fallback.recommended_level,
    }

    prompt = (
        "Classify this debate topic for a student app.\n"
        "Return JSON with: category, difficulty(Easy/Medium/Hard), debate_style(Casual/Academic/Policy/Ethical), reason, recommended_level.\n\n"
        f"Source title: {topic.raw_title}\n"
        f"Source summary: {topic.summary}\n"
        f"Debate topic: {draft.topic}\n"
        f"Motion: {draft.motion}\n"
    )
    payload = gemini_json_or_default(
        system_instruction=(
            "You are Difficulty Classifier Agent. Output strict JSON only. "
            "Use practical classroom judgement and concise reasoning."
        ),
        prompt=prompt,
        default=default,
        max_output_tokens=320,
    )

    category = " ".join(str(payload.get("category", fallback.category)).split()).strip() or fallback.category
    difficulty = str(payload.get("difficulty", fallback.difficulty)).strip().title()
    if difficulty not in _ALLOWED_DIFFICULTY:
        difficulty = fallback.difficulty

    style = str(payload.get("debate_style", fallback.debate_style)).strip().title()
    if style not in _ALLOWED_STYLE:
        style = fallback.debate_style

    reason = " ".join(str(payload.get("reason", fallback.reason)).split()).strip() or fallback.reason
    recommended_level = " ".join(
        str(payload.get("recommended_level", LEVEL_RECOMMENDATION[difficulty])).split()
    ).strip() or LEVEL_RECOMMENDATION[difficulty]

    return TopicClassification(
        category=category[:80],
        difficulty=difficulty,
        debate_style=style,
        reason=reason[:240],
        recommended_level=recommended_level[:120],
    )
