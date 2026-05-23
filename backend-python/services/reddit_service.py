from __future__ import annotations

from models.debate_topic import RawTopic
from services.http_utils import clean_text, fetch_json_detailed


REDDIT_HOT_URL = "https://www.reddit.com/r/popular/hot.json?limit={limit}"
USER_AGENT = "DebateAppHotTopics/1.0"


def fetch_reddit_topics_with_meta(limit: int = 12) -> tuple[list[RawTopic], dict]:
    payload, err = fetch_json_detailed(
        REDDIT_HOT_URL.format(limit=max(1, min(limit, 50))),
        headers={"User-Agent": USER_AGENT},
    )
    if not isinstance(payload, dict):
        return [], {"source": "Reddit", "ok": False, "error": err or "no payload", "count": 0}

    data = payload.get("data")
    children = data.get("children") if isinstance(data, dict) else None
    if not isinstance(children, list):
        return [], {"source": "Reddit", "ok": False, "error": "missing data.children", "count": 0}

    topics: list[RawTopic] = []
    for child in children:
        item = child.get("data") if isinstance(child, dict) else None
        if not isinstance(item, dict):
            continue
        title = clean_text(item.get("title"), 180)
        if not title:
            continue
        summary = clean_text(item.get("selftext") or item.get("title"), 320)
        permalink = str(item.get("permalink") or "").strip()
        source_url = f"https://www.reddit.com{permalink}" if permalink else "https://www.reddit.com"
        score = int(item.get("ups") or item.get("score") or 0)
        topics.append(
            RawTopic(
                source="Reddit",
                raw_title=title,
                summary=summary,
                url=source_url,
                popularity_score=max(0, min(100, score // 100 + 20)),
            )
        )
    return topics, {"source": "Reddit", "ok": True, "error": "", "count": len(topics)}


def fetch_reddit_topics(limit: int = 12) -> list[RawTopic]:
    topics, _ = fetch_reddit_topics_with_meta(limit=limit)
    return topics
