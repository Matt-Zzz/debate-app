from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener, urlopen


def _proxy_env_present() -> bool:
    keys = ("http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY")
    return any(bool(os.environ.get(k, "").strip()) for k in keys)


def _open_response(req: Request, timeout: float, use_proxy: bool):
    if use_proxy:
        return urlopen(req, timeout=timeout)
    opener = build_opener(ProxyHandler({}))
    return opener.open(req, timeout=timeout)


def fetch_json_detailed(
    url: str,
    headers: dict[str, str] | None = None,
    timeout: float = 8.0,
) -> tuple[dict | list | None, str | None]:
    req = Request(url, headers=headers or {})

    mode = os.environ.get("HOT_TOPICS_PROXY_MODE", "auto").strip().lower()
    if mode not in {"auto", "on", "off"}:
        mode = "auto"

    attempts: list[tuple[str, bool]] = []
    if mode == "on":
        attempts = [("proxy", True)]
    elif mode == "off":
        attempts = [("direct", False)]
    else:
        attempts = [("proxy", True)]
        if _proxy_env_present():
            attempts.append(("direct_fallback", False))

    last_error: str | None = None
    for label, use_proxy in attempts:
        try:
            with _open_response(req, timeout=timeout, use_proxy=use_proxy) as resp:
                raw = resp.read().decode("utf-8")
        except HTTPError as exc:
            last_error = f"{label}: HTTP {exc.code}"
            continue
        except URLError as exc:
            last_error = f"{label}: URL error {getattr(exc, 'reason', exc)}"
            continue
        except TimeoutError:
            last_error = f"{label}: timeout"
            continue
        except OSError as exc:
            last_error = f"{label}: OS error {exc}"
            continue

        try:
            return json.loads(raw), None
        except json.JSONDecodeError:
            return None, f"{label}: invalid JSON"

    return None, last_error or "unknown fetch error"


def fetch_json(url: str, headers: dict[str, str] | None = None, timeout: float = 8.0) -> dict | list | None:
    payload, _ = fetch_json_detailed(url, headers=headers, timeout=timeout)
    return payload


def clean_text(value: str | None, max_len: int = 320) -> str:
    if not value:
        return ""
    text = " ".join(str(value).split())
    return text[:max_len].strip()
