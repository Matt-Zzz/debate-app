from __future__ import annotations

import json
import os
import re
from typing import Any

from google import genai
from google.genai import types


DEFAULT_MODEL = "gemini-2.5-flash-lite"
_AGENT_MODEL = (os.environ.get("GEMINI_AGENT_MODEL") or os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL).strip() or DEFAULT_MODEL
_client: genai.Client | None = None


def _extract_json_block(raw: str) -> str | None:
    text = (raw or "").strip()
    if not text:
        return None

    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.I)
    if fenced:
        candidate = fenced.group(1).strip()
        if candidate:
            return candidate

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return None


def _get_client() -> genai.Client | None:
    global _client
    if _client is not None:
        return _client

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    _client = genai.Client(api_key=api_key)
    return _client


def gemini_json_or_default(
    *,
    system_instruction: str,
    prompt: str,
    default: dict[str, Any],
    max_output_tokens: int = 650,
) -> dict[str, Any]:
    client = _get_client()
    if client is None:
        return dict(default)

    try:
        resp = client.models.generate_content(
            model=_AGENT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                max_output_tokens=max(200, min(max_output_tokens, 2048)),
                temperature=0.2,
            ),
        )
    except Exception:
        return dict(default)

    raw_text = getattr(resp, "text", "") or ""
    json_text = _extract_json_block(raw_text)
    if not json_text:
        return dict(default)

    try:
        payload = json.loads(json_text)
    except json.JSONDecodeError:
        return dict(default)

    if not isinstance(payload, dict):
        return dict(default)

    merged = dict(default)
    merged.update(payload)
    return merged
