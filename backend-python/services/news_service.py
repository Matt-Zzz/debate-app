from __future__ import annotations

import os
from urllib.parse import urlencode

from models.debate_topic import RawTopic
from services.http_utils import clean_text, fetch_json_detailed


NEWS_API_BASE = "https://newsapi.org/v2/top-headlines"


def _build_news_url(limit: int, api_key: str) -> str:
    query = urlencode(
        {
            "country": "us",
            "pageSize": max(1, min(limit, 40)),
            "apiKey": api_key,
        }
    )
    return f"{NEWS_API_BASE}?{query}"


def fetch_news_topics_with_meta(limit: int = 12) -> tuple[list[RawTopic], dict]:
    api_key = os.environ.get("NEWS_API_KEY", "").strip()
    if not api_key:
        return [], {"source": "NewsAPI", "ok": False, "error": "NEWS_API_KEY missing", "count": 0}

    payload, err = fetch_json_detailed(_build_news_url(limit, api_key), headers={"User-Agent": "DebateAppHotTopics/1.0"})
    if not isinstance(payload, dict):
        return [], {"source": "NewsAPI", "ok": False, "error": err or "no payload", "count": 0}
    if payload.get("status") != "ok":
        code = str(payload.get("code") or "").strip()
        message = str(payload.get("message") or "").strip()
        detail = f"{code}: {message}".strip(": ").strip()
        return [], {"source": "NewsAPI", "ok": False, "error": detail or "status not ok", "count": 0}

    articles = payload.get("articles")
    if not isinstance(articles, list):
        return [], {"source": "NewsAPI", "ok": False, "error": "missing articles array", "count": 0}

    topics: list[RawTopic] = []
    for idx, article in enumerate(articles):
        if not isinstance(article, dict):
            continue
        title = clean_text(article.get("title"), 180)
        if not title:
            continue
        summary = clean_text(article.get("description") or article.get("content") or title, 320)
        source_url = clean_text(article.get("url"), 500)
        if not source_url:
            continue
        popularity = max(10, 100 - idx * 4)
        topics.append(
            RawTopic(
                source="NewsAPI",
                raw_title=title,
                summary=summary,
                url=source_url,
                popularity_score=popularity,
            )
        )
    return topics, {"source": "NewsAPI", "ok": True, "error": "", "count": len(topics)}


def fetch_news_topics(limit: int = 12) -> list[RawTopic]:
    topics, _ = fetch_news_topics_with_meta(limit=limit)
    return topics
