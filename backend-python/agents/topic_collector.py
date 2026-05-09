from __future__ import annotations

import re

from agents.ai_runtime import gemini_json_or_default
from models.debate_topic import RawTopic
from services.hackernews_service import fetch_hackernews_topics
from services.news_service import fetch_news_topics
from services.reddit_service import fetch_reddit_topics


def _normalize_title(title: str) -> str:
    return re.sub(r"\W+", "", title.lower())


def _sanitize_topic(topic: RawTopic) -> RawTopic | None:
    title = " ".join(topic.raw_title.split())
    summary = " ".join(topic.summary.split())
    if len(title) < 12:
        return None
    return RawTopic(
        source=topic.source,
        raw_title=title[:180],
        summary=summary[:320] or title[:180],
        url=topic.url,
        popularity_score=max(0, min(100, int(topic.popularity_score))),
    )


def _to_bool(value: object, fallback: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "yes", "1", "y"}
    return fallback


def _ai_refine_topic(topic: RawTopic) -> RawTopic | None:
    default = {
        "keep": True,
        "raw_title": topic.raw_title[:180],
        "summary": (topic.summary or topic.raw_title)[:320],
        "popularity_score": max(0, min(100, int(topic.popularity_score))),
    }
    prompt = (
        "Clean and normalize a hot trend item for a student debate app.\n"
        "Return JSON with keys: keep(boolean), raw_title(string), summary(string), popularity_score(int 0-100).\n"
        "Drop only if it is clearly spam, pure gossip, or too vague to understand.\n\n"
        f"Source: {topic.source}\n"
        f"Raw title: {topic.raw_title}\n"
        f"Raw summary: {topic.summary}\n"
        f"Popularity score: {topic.popularity_score}\n"
    )
    payload = gemini_json_or_default(
        system_instruction=(
            "You are Topic Collector Agent. Output compact valid JSON only. "
            "Keep titles factual and short. Summaries must be <= 320 characters."
        ),
        prompt=prompt,
        default=default,
        max_output_tokens=350,
    )

    if not _to_bool(payload.get("keep"), True):
        return None

    title = " ".join(str(payload.get("raw_title", "")).split())[:180]
    summary = " ".join(str(payload.get("summary", "")).split())[:320]
    if len(title) < 12:
        return None

    try:
        score = int(payload.get("popularity_score", topic.popularity_score))
    except (TypeError, ValueError):
        score = topic.popularity_score

    return RawTopic(
        source=topic.source,
        raw_title=title,
        summary=summary or title,
        url=topic.url,
        popularity_score=max(0, min(100, score)),
    )


def collect_hot_topics(max_per_source: int = 12) -> list[RawTopic]:
    batches = [
        fetch_reddit_topics(max_per_source),
        fetch_news_topics(max_per_source),
        fetch_hackernews_topics(max_per_source),
    ]

    seen: set[str] = set()
    topics: list[RawTopic] = []
    for batch in batches:
        for item in batch:
            clean = _sanitize_topic(item)
            if clean is None:
                continue
            clean = _ai_refine_topic(clean)
            if clean is None:
                continue
            key = _normalize_title(clean.raw_title)
            if not key or key in seen:
                continue
            seen.add(key)
            topics.append(clean)

    topics.sort(key=lambda item: item.popularity_score, reverse=True)
    return topics
