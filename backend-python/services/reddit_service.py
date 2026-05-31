from __future__ import annotations

import base64
import os
from urllib.parse import urlencode

from models.debate_topic import RawTopic
from services.http_utils import clean_text, fetch_json_detailed


REDDIT_PUBLIC_HOT_URL = "https://www.reddit.com/r/popular/hot.json?limit={limit}&raw_json=1"
REDDIT_OAUTH_HOT_URL = "https://oauth.reddit.com/r/popular/hot?limit={limit}&raw_json=1"
REDDIT_OAUTH_TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
DEFAULT_USER_AGENT = "python:debate-app.hot-topics:v1.0 (by /u/debate_app_bot)"


def _user_agent() -> str:
    return os.environ.get("REDDIT_USER_AGENT", "").strip() or DEFAULT_USER_AGENT


def _to_error(label: str, err: str | None) -> str:
    detail = (err or "unknown error").strip()
    return f"{label}: {detail}"


def _extract_topics(payload: dict | list | None) -> list[RawTopic]:
    if not isinstance(payload, dict):
        return []

    data = payload.get("data")
    children = data.get("children") if isinstance(data, dict) else None
    if not isinstance(children, list):
        return []

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
    return topics


def _fetch_public_topics(limit: int, user_agent: str) -> tuple[list[RawTopic], str | None]:
    payload, err = fetch_json_detailed(
        REDDIT_PUBLIC_HOT_URL.format(limit=max(1, min(limit, 50))),
        headers={"User-Agent": user_agent, "Accept": "application/json"},
    )
    topics = _extract_topics(payload)
    if topics:
        return topics, None
    if isinstance(payload, dict):
        reason = str(payload.get("message") or "").strip()
        if reason:
            return [], reason
    return [], err or "missing data.children"


def _fetch_oauth_topics(limit: int, user_agent: str) -> tuple[list[RawTopic], str | None]:
    client_id = os.environ.get("REDDIT_CLIENT_ID", "").strip()
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return [], "REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET missing"

    basic = base64.b64encode(f"{client_id}:{client_secret}".encode("utf-8")).decode("ascii")
    token_payload, token_err = fetch_json_detailed(
        REDDIT_OAUTH_TOKEN_URL,
        headers={
            "User-Agent": user_agent,
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        method="POST",
        body=urlencode({"grant_type": "client_credentials"}).encode("utf-8"),
    )
    if not isinstance(token_payload, dict):
        return [], _to_error("oauth token request failed", token_err)

    token = str(token_payload.get("access_token") or "").strip()
    if not token:
        message = str(token_payload.get("error_description") or token_payload.get("error") or "").strip()
        return [], f"oauth token missing access_token ({message or 'unknown token error'})"

    payload, err = fetch_json_detailed(
        REDDIT_OAUTH_HOT_URL.format(limit=max(1, min(limit, 50))),
        headers={
            "User-Agent": user_agent,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    topics = _extract_topics(payload)
    if topics:
        return topics, None
    if isinstance(payload, dict):
        reason = str(payload.get("message") or "").strip()
        if reason:
            return [], reason
    return [], err or "missing data.children"


def fetch_reddit_topics_with_meta(limit: int = 12) -> tuple[list[RawTopic], dict]:
    ua = _user_agent()
    oauth_topics, oauth_err = _fetch_oauth_topics(limit, ua)
    if oauth_topics:
        return oauth_topics, {"source": "Reddit", "ok": True, "error": "", "count": len(oauth_topics)}

    public_topics, public_err = _fetch_public_topics(limit, ua)
    if public_topics:
        suffix = "" if not oauth_err else f" (oauth fallback failed: {oauth_err})"
        return public_topics, {"source": "Reddit", "ok": True, "error": suffix.strip(), "count": len(public_topics)}

    error_msg = (
        f"oauth failed ({oauth_err or 'unknown'}) ; direct failed ({public_err or 'unknown'})"
    )
    return [], {"source": "Reddit", "ok": False, "error": error_msg, "count": 0}


def fetch_reddit_topics(limit: int = 12) -> list[RawTopic]:
    topics, _ = fetch_reddit_topics_with_meta(limit=limit)
    return topics
