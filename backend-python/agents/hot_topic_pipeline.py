from __future__ import annotations

import re
from hashlib import sha1

from agents.debate_filter import evaluate_debate_suitability
from agents.debate_generator import generate_debate_draft
from agents.difficulty_classifier import classify_topic
from agents.topic_collector import collect_hot_topics_with_meta
from models.debate_topic import HotDebateTopic


def _make_topic_id(title: str, source_url: str) -> str:
    digest = sha1(f"{title}|{source_url}".encode("utf-8")).hexdigest()[:14]
    return f"hot_{digest}"


def _draft_usable(topic_text: str) -> bool:
    q = " ".join((topic_text or "").split()).strip()
    lower = q.lower()
    if not q.endswith("?"):
        return False
    if len(q) < 20 or len(q) > 130:
        return False
    if ":" in q:
        return False
    if "should society adopt this policy" in lower:
        return False
    if any(fragment in lower for fragment in ("live updates", "breaking:", "hours after", "minutes after", "cbs news")):
        return False
    if re.match(r"^\s*(what|who|where|when|how many)\b", lower):
        return False
    if not re.search(r"\b(should|can|must|ought|allow|ban|regulate|require|prioritize)\b", lower):
        return False
    return True


def run_hot_debate_topic_pipeline(target_count: int = 10, max_per_source: int = 12) -> dict:
    raw_topics, source_diagnostics = collect_hot_topics_with_meta(max_per_source=max_per_source)
    raw_source_breakdown: dict[str, int] = {}
    for item in raw_topics:
        raw_source_breakdown[item.source] = raw_source_breakdown.get(item.source, 0) + 1

    evaluated = 0
    accepted: list[HotDebateTopic] = []
    for raw in raw_topics:
        fit = evaluate_debate_suitability(raw)
        evaluated += 1
        if not fit.is_debatable or fit.safety_level == "unsafe":
            continue

        draft = generate_debate_draft(raw)
        if not _draft_usable(draft.topic):
            continue
        cls = classify_topic(raw, draft)

        accepted.append(
            HotDebateTopic(
                id=_make_topic_id(draft.topic, raw.url),
                source=raw.source,
                raw_title=raw.raw_title,
                raw_summary=raw.summary,
                source_url=raw.url,
                title=draft.topic,
                motion_title=draft.motion,
                category=cls.category,
                difficulty=cls.difficulty,
                debate_style=cls.debate_style,
                classification_reason=cls.reason,
                recommended_level=cls.recommended_level,
                pro_position=draft.pro_position,
                pro_arguments=draft.pro_arguments,
                con_position=draft.con_position,
                con_arguments=draft.con_arguments,
                source_urls=[raw.url],
                trend_score=raw.popularity_score,
                status="approved",
                safety_level=fit.safety_level,
            )
        )

    deduped: dict[str, HotDebateTopic] = {}
    for topic in accepted:
        prev = deduped.get(topic.id)
        if prev is None or topic.trend_score > prev.trend_score:
            deduped[topic.id] = topic

    final_topics = sorted(deduped.values(), key=lambda item: item.trend_score, reverse=True)
    trimmed = final_topics[: max(1, min(target_count, 30))]
    accepted_source_breakdown: dict[str, int] = {}
    for item in trimmed:
        accepted_source_breakdown[item.source] = accepted_source_breakdown.get(item.source, 0) + 1

    return {
        "raw_count": len(raw_topics),
        "evaluated_count": evaluated,
        "accepted_count": len(trimmed),
        "raw_source_breakdown": raw_source_breakdown,
        "accepted_source_breakdown": accepted_source_breakdown,
        "source_diagnostics": source_diagnostics,
        "topics": trimmed,
    }
