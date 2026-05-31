from __future__ import annotations

import re

from agents.ai_runtime import gemini_json_or_default
from models.debate_topic import DebateDraft, RawTopic


QUESTION_PREFIXES = (
    "should ",
    "is ",
    "are ",
    "can ",
    "do ",
    "does ",
    "will ",
    "would ",
)

BAD_QUESTION_FRAGMENTS = (
    "should society adopt this policy:",
    "live updates",
    "breaking:",
    "hours after",
    "minutes after",
)

POLICY_QUESTION_PREFIX = "Should governments regulate "

ARGUMENT_BANK: list[tuple[list[str], dict[str, list[str] | str]]] = [
    (
        ["ai", "exam", "university", "school", "student"],
        {
            "pro_position": "AI tools should be allowed with clear rules.",
            "pro": [
                "AI mirrors real-world workflows students will use after graduation.",
                "It can shift assessment from memorization to higher-order reasoning.",
                "Transparent AI usage policies are easier to enforce than total bans.",
            ],
            "con_position": "AI tools should not be allowed during formal exams.",
            "con": [
                "It can weaken independent thinking and foundational skill development.",
                "Access to AI tools is uneven and can create fairness gaps.",
                "Traditional exams become less reliable for measuring individual understanding.",
            ],
        },
    ),
    (
        ["climate", "carbon", "emission", "environment", "energy"],
        {
            "pro_position": "Strong intervention should be adopted quickly.",
            "pro": [
                "Early action reduces long-term environmental and economic damage.",
                "Clear policy signals accelerate clean technology investment.",
                "Public policy can correct market failures in pollution costs.",
            ],
            "con_position": "Aggressive intervention should be limited or delayed.",
            "con": [
                "Rapid mandates can raise costs for lower-income households.",
                "Poorly designed rules can hurt competitiveness and jobs.",
                "Gradual transitions may produce more stable long-term compliance.",
            ],
        },
    ),
    (
        ["privacy", "data", "surveillance", "facial recognition"],
        {
            "pro_position": "Expanded use can be justified for public interests.",
            "pro": [
                "Data tools can improve safety, fraud prevention, and service efficiency.",
                "Proper oversight can reduce abuse while keeping utility benefits.",
                "Public institutions need modern tools to manage large-scale risks.",
            ],
            "con_position": "Expanded use should be restricted to protect rights.",
            "con": [
                "Mass data collection can chill free expression and autonomy.",
                "Oversight systems often lag behind technological deployment.",
                "Once surveillance infrastructure exists, misuse risk grows over time.",
            ],
        },
    ),
    (
        ["government", "law", "policy", "tax", "regulation"],
        {
            "pro_position": "Government should take stronger policy action.",
            "pro": [
                "Regulation can protect public welfare where markets fail.",
                "Clear rules reduce uncertainty and improve accountability.",
                "Policy action can reduce long-term social costs.",
            ],
            "con_position": "Government intervention should be limited.",
            "con": [
                "Overregulation can reduce innovation and individual freedom.",
                "Implementation is often inefficient and politically distorted.",
                "Decentralized solutions may adapt better than one-size-fits-all rules.",
            ],
        },
    ),
]


def _normalize_title(raw_title: str) -> str:
    text = " ".join(raw_title.split())
    return re.sub(r"\s+", " ", text).strip(" .?!")


def _trim_to_words(text: str, max_len: int) -> str:
    value = " ".join((text or "").split()).strip()
    if len(value) <= max_len:
        return value
    clipped = value[:max_len].rsplit(" ", 1)[0].strip()
    return clipped or value[:max_len].strip()


def _safe_policy_question(raw_title: str, summary: str) -> str:
    seed = _normalize_title(raw_title) or _normalize_title(summary)
    phrase = seed.lower()
    phrase = re.sub(r"^\s*(live updates?|breaking|watch)\s*[:\-]\s*", "", phrase, flags=re.I)
    phrase = re.sub(r"\b(cbs news|fox news|bbc|cnn|reuters|associated press)\b", "", phrase, flags=re.I)
    phrase = re.sub(r"^\s*(what|who|where|when|how many)\b", "", phrase, flags=re.I)
    phrase = phrase.replace(":", " ")
    phrase = re.sub(r"[\"'`]", "", phrase)
    phrase = re.sub(r"\s+", " ", phrase).strip(" .?!,-")
    if not phrase:
        phrase = "major public issues"

    max_phrase_len = 130 - len(POLICY_QUESTION_PREFIX) - 1
    phrase = _trim_to_words(phrase, max_phrase_len)
    if len(phrase) < 8:
        phrase = "major public issues"
    return f"{POLICY_QUESTION_PREFIX}{phrase}?"


def _rewrite_as_question(raw_title: str, summary: str) -> str:
    title = _normalize_title(raw_title)
    lower = title.lower()

    if lower.startswith(QUESTION_PREFIXES):
        return title if title.endswith("?") else f"{title}?"

    if "whether" in lower:
        after = lower.split("whether", 1)[1].strip(" .")
        if after:
            sentence = after[0].upper() + after[1:]
            return sentence if sentence.endswith("?") else f"{sentence}?"

    if title.endswith("?"):
        return title

    if summary:
        summary_low = summary.lower()
        if "whether" in summary_low:
            after = summary_low.split("whether", 1)[1].strip(" .")
            if after:
                sentence = after[0].upper() + after[1:]
                return sentence if sentence.endswith("?") else f"{sentence}?"

    return _safe_policy_question(raw_title, summary)


def _to_motion(question: str) -> str:
    q = question.strip().rstrip("?")
    return (
        f"This House believes that {q[0].lower() + q[1:]}"
        if q
        else "This House believes that this policy should be adopted"
    )


def _question_quality_ok(question: str) -> bool:
    q = " ".join(question.split()).strip()
    lower = q.lower()
    if not q.endswith("?"):
        return False
    if len(q) < 20 or len(q) > 130:
        return False
    if q.count("?") != 1:
        return False
    if ":" in q:
        return False
    if any(fragment in lower for fragment in BAD_QUESTION_FRAGMENTS):
        return False
    if not re.search(r"\b(should|can|must|ought|allow|ban|regulate|require|prioritize)\b", lower):
        return False
    return True


def _pick_argument_pack(text: str) -> dict[str, list[str] | str] | None:
    for keywords, pack in ARGUMENT_BANK:
        if any(word in text for word in keywords):
            return pack
    return None


def _heuristic_generate(topic: RawTopic) -> DebateDraft:
    question = _rewrite_as_question(topic.raw_title, topic.summary)
    motion = _to_motion(question)
    text = f"{topic.raw_title} {topic.summary}".lower()
    pack = _pick_argument_pack(text)

    if pack:
        return DebateDraft(
            topic=question,
            motion=motion,
            pro_position=str(pack["pro_position"]),
            pro_arguments=list(pack["pro"]),
            con_position=str(pack["con_position"]),
            con_arguments=list(pack["con"]),
        )

    return DebateDraft(
        topic=question,
        motion=motion,
        pro_position="The proposal should be supported.",
        pro_arguments=[
            "The proposal offers practical benefits for a broad group of people.",
            "It responds to current social or technological realities.",
            "A structured implementation can reduce foreseeable downsides.",
        ],
        con_position="The proposal should be rejected.",
        con_arguments=[
            "The proposal may create unintended harms or fairness concerns.",
            "Evidence for long-term effectiveness is still limited.",
            "Alternative approaches could achieve similar goals with lower risk.",
        ],
    )


def _clean_args(value: object, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return fallback
    cleaned = [" ".join(str(item).split())[:180] for item in value if str(item).strip()]
    if len(cleaned) < 2:
        return fallback
    return cleaned[:4]


def generate_debate_draft(topic: RawTopic) -> DebateDraft:
    fallback = _heuristic_generate(topic)
    default = {
        "topic": fallback.topic,
        "motion": fallback.motion,
        "pro_position": fallback.pro_position,
        "pro_arguments": fallback.pro_arguments,
        "con_position": fallback.con_position,
        "con_arguments": fallback.con_arguments,
    }

    prompt = (
        "Rewrite a trending issue into a formal debate topic and generate both sides.\n"
        "Return JSON keys: topic, motion, pro_position, pro_arguments(array), con_position, con_arguments(array).\n"
        "The topic must be one concise classroom debate question (8-18 words).\n"
        "Do not copy headline phrasing, names, timestamps, outlets, or quotes.\n"
        "Frame the core principle/policy as a general question.\n"
        "Arguments should be concise and not extremist.\n\n"
        f"Source: {topic.source}\n"
        f"Raw title: {topic.raw_title}\n"
        f"Summary: {topic.summary}\n"
    )
    payload = gemini_json_or_default(
        system_instruction=(
            "You are Debate Question Generator Agent. Output strict JSON only. "
            "Generate balanced, classroom-safe debate framing."
        ),
        prompt=prompt,
        default=default,
        max_output_tokens=700,
    )

    question = " ".join(str(payload.get("topic", fallback.topic)).split()).strip()
    if not question:
        question = fallback.topic
    if not question.endswith("?"):
        question = f"{question.rstrip('.')}?"

    if not _question_quality_ok(question):
        repair_default = {"topic": fallback.topic}
        repair_payload = gemini_json_or_default(
            system_instruction=(
                "You are Debate Question Repair Agent. Output strict JSON only."
            ),
            prompt=(
                "Rewrite this into one concise, neutral classroom debate question.\n"
                "Return JSON with key: topic.\n"
                "Rules: 8-18 words, no names/outlets/time markers, no headline copy, must be arguable from both sides.\n\n"
                f"Candidate question: {question}\n"
                f"Original title: {topic.raw_title}\n"
                f"Summary: {topic.summary}\n"
            ),
            default=repair_default,
            max_output_tokens=220,
        )
        repaired = " ".join(str(repair_payload.get("topic", fallback.topic)).split()).strip()
        if repaired and not repaired.endswith("?"):
            repaired = f"{repaired.rstrip('.')}?"
        if repaired:
            question = repaired
    if not _question_quality_ok(question):
        question = _safe_policy_question(topic.raw_title, topic.summary)

    motion = " ".join(str(payload.get("motion", fallback.motion)).split()).strip() or _to_motion(question)
    if not motion.lower().startswith("this house believes"):
        motion = _to_motion(question)

    pro_position = " ".join(str(payload.get("pro_position", fallback.pro_position)).split()).strip() or fallback.pro_position
    con_position = " ".join(str(payload.get("con_position", fallback.con_position)).split()).strip() or fallback.con_position

    return DebateDraft(
        topic=question[:180],
        motion=motion[:220],
        pro_position=pro_position[:180],
        pro_arguments=_clean_args(payload.get("pro_arguments"), fallback.pro_arguments),
        con_position=con_position[:180],
        con_arguments=_clean_args(payload.get("con_arguments"), fallback.con_arguments),
    )
