from __future__ import annotations

import re

from agents.ai_runtime import gemini_json_or_default
from models.debate_topic import RawTopic
from services.hackernews_service import fetch_hackernews_topics, fetch_hackernews_topics_with_meta
from services.news_service import fetch_news_topics, fetch_news_topics_with_meta
from services.reddit_service import fetch_reddit_topics, fetch_reddit_topics_with_meta


def _normalize_title(title: str) -> str:
    return re.sub(r"\W+", "", title.lower())


def _sanitize_topic(topic: RawTopic) -> RawTopic | None:
    title = " ".join(topic.raw_title.split())
    summary = " ".join(topic.summary.split())
    if len(title) < 12:
        return None
    if len(title) > 180:
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
        "Drop if it is pure gossip, raw breaking-news update text, or not usable for policy/ethics debate reframing.\n"
        "Keep titles neutral and compact; avoid quotes and sensational phrasing.\n\n"
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


def collect_hot_topics_with_meta(max_per_source: int = 12) -> tuple[list[RawTopic], list[dict]]:
    reddit_topics, reddit_meta = fetch_reddit_topics_with_meta(max_per_source)
    news_topics, news_meta = fetch_news_topics_with_meta(max_per_source)
    hn_topics, hn_meta = fetch_hackernews_topics_with_meta(max_per_source)

    batches = [reddit_topics, news_topics, hn_topics]
    diagnostics = [reddit_meta, news_meta, hn_meta]

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
    return topics, diagnostics
