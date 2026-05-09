from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def fetch_json(url: str, headers: dict[str, str] | None = None, timeout: float = 8.0) -> dict | list | None:
    req = Request(url, headers=headers or {})
    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except (HTTPError, URLError, TimeoutError, OSError):
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def clean_text(value: str | None, max_len: int = 320) -> str:
    if not value:
        return ""
    text = " ".join(str(value).split())
    return text[:max_len].strip()
