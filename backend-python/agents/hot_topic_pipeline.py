from __future__ import annotations

from hashlib import sha1

from agents.debate_filter import evaluate_debate_suitability
from agents.debate_generator import generate_debate_draft
from agents.difficulty_classifier import classify_topic
from agents.topic_collector import collect_hot_topics
from models.debate_topic import HotDebateTopic


def _make_topic_id(title: str, source_url: str) -> str:
    digest = sha1(f"{title}|{source_url}".encode("utf-8")).hexdigest()[:14]
    return f"hot_{digest}"


def run_hot_debate_topic_pipeline(target_count: int = 10, max_per_source: int = 12) -> dict:
    raw_topics = collect_hot_topics(max_per_source=max_per_source)

    evaluated = 0
    accepted: list[HotDebateTopic] = []
    for raw in raw_topics:
        fit = evaluate_debate_suitability(raw)
        evaluated += 1
        if not fit.is_debatable or fit.safety_level == "unsafe":
            continue

        draft = generate_debate_draft(raw)
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

    return {
        "raw_count": len(raw_topics),
        "evaluated_count": evaluated,
        "accepted_count": len(trimmed),
        "topics": trimmed,
    }
