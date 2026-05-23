from __future__ import annotations

from models.debate_topic import RawTopic
from services.http_utils import clean_text, fetch_json_detailed


HN_TOP_STORIES = "https://hacker-news.firebaseio.com/v0/topstories.json"
HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item/{item_id}.json"


def fetch_hackernews_topics_with_meta(limit: int = 12) -> tuple[list[RawTopic], dict]:
    ids_payload, err = fetch_json_detailed(HN_TOP_STORIES, headers={"User-Agent": "DebateAppHotTopics/1.0"})
    if not isinstance(ids_payload, list):
        return [], {"source": "HackerNews", "ok": False, "error": err or "no topstories payload", "count": 0}

    topics: list[RawTopic] = []
    item_errors = 0
    for item_id in ids_payload[: max(5, min(limit * 3, 45))]:
        item, item_err = fetch_json_detailed(
            HN_ITEM_URL.format(item_id=item_id),
            headers={"User-Agent": "DebateAppHotTopics/1.0"},
        )
        if not isinstance(item, dict):
            if item_err:
                item_errors += 1
            continue
        title = clean_text(item.get("title"), 180)
        if not title:
            continue
        story_type = str(item.get("type") or "")
        if story_type != "story":
            continue

        summary = clean_text(item.get("text") or title, 320)
        source_url = clean_text(item.get("url"), 500)
        if not source_url:
            source_url = f"https://news.ycombinator.com/item?id={item.get('id')}"

        score = int(item.get("score") or 0)
        topics.append(
            RawTopic(
                source="HackerNews",
                raw_title=title,
                summary=summary,
                url=source_url,
                popularity_score=max(0, min(100, score // 3)),
            )
        )
        if len(topics) >= limit:
            break
    if not topics and item_errors:
        return [], {"source": "HackerNews", "ok": False, "error": f"item fetch failures: {item_errors}", "count": 0}
    return topics, {"source": "HackerNews", "ok": True, "error": "", "count": len(topics)}


def fetch_hackernews_topics(limit: int = 12) -> list[RawTopic]:
    topics, _ = fetch_hackernews_topics_with_meta(limit=limit)
    return topics
