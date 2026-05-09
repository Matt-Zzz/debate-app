from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone

from agents.hot_topic_pipeline import run_hot_debate_topic_pipeline
from models.debate_topic import HotDebateTopic


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def serialize_trending_topic(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "motionTitle": row["motion_title"],
        "category": row["category"],
        "difficulty": row["difficulty"],
        "debateStyle": row["debate_style"],
        "classificationReason": row["classification_reason"],
        "recommendedLevel": row["recommended_level"],
        "proPosition": row["pro_position"],
        "proArguments": json.loads(row["pro_arguments_json"]),
        "conPosition": row["con_position"],
        "conArguments": json.loads(row["con_arguments_json"]),
        "source": row["source"],
        "sourceUrl": row["source_url"],
        "sourceUrls": json.loads(row["source_urls_json"]),
        "trendScore": int(row["trend_score"] or 0),
        "safetyLevel": row["safety_level"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def upsert_hot_topics(conn: sqlite3.Connection, topics: list[HotDebateTopic]) -> int:
    now = _now_iso()
    count = 0
    for item in topics:
        existing = conn.execute(
            "SELECT source_urls_json FROM debate_topics WHERE id=?",
            (item.id,),
        ).fetchone()

        merged_urls = set(item.source_urls)
        if existing is not None:
            try:
                merged_urls.update(json.loads(existing["source_urls_json"]))
            except (TypeError, json.JSONDecodeError):
                pass

        payload = (
            item.id,
            item.title,
            item.motion_title,
            item.category,
            item.difficulty,
            item.debate_style,
            item.classification_reason,
            item.recommended_level,
            item.pro_position,
            json.dumps(item.pro_arguments),
            item.con_position,
            json.dumps(item.con_arguments),
            item.source,
            item.raw_title,
            item.raw_summary,
            item.source_url,
            json.dumps(sorted(merged_urls)),
            item.trend_score,
            item.status,
            item.safety_level,
            now,
            now,
        )

        conn.execute(
            """
            INSERT INTO debate_topics (
                id, title, motion_title, category, difficulty, debate_style,
                classification_reason, recommended_level,
                pro_position, pro_arguments_json, con_position, con_arguments_json,
                source, raw_title, raw_summary, source_url, source_urls_json,
                trend_score, status, safety_level, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title,
                motion_title=excluded.motion_title,
                category=excluded.category,
                difficulty=excluded.difficulty,
                debate_style=excluded.debate_style,
                classification_reason=excluded.classification_reason,
                recommended_level=excluded.recommended_level,
                pro_position=excluded.pro_position,
                pro_arguments_json=excluded.pro_arguments_json,
                con_position=excluded.con_position,
                con_arguments_json=excluded.con_arguments_json,
                source=excluded.source,
                raw_title=excluded.raw_title,
                raw_summary=excluded.raw_summary,
                source_url=excluded.source_url,
                source_urls_json=excluded.source_urls_json,
                trend_score=excluded.trend_score,
                status=excluded.status,
                safety_level=excluded.safety_level,
                updated_at=excluded.updated_at
            """,
            payload,
        )
        count += 1

    return count


def list_hot_topics(
    conn: sqlite3.Connection,
    *,
    limit: int,
    difficulty: str | None,
    category: str | None,
    mode: str | None,
) -> list[dict]:
    where = ["status='approved'"]
    params: list[str | int] = []

    if difficulty:
        where.append("difficulty=?")
        params.append(difficulty)
    if category:
        where.append("category=?")
        params.append(category)
    if mode:
        where.append("debate_style=?")
        params.append(mode)

    params.append(max(1, min(limit, 30)))
    sql = (
        "SELECT * FROM debate_topics "
        f"WHERE {' AND '.join(where)} "
        "ORDER BY trend_score DESC, updated_at DESC LIMIT ?"
    )
    rows = conn.execute(sql, tuple(params)).fetchall()
    return [serialize_trending_topic(row) for row in rows]


def refresh_hot_topics(conn: sqlite3.Connection, target_count: int = 10, max_per_source: int = 12) -> dict:
    result = run_hot_debate_topic_pipeline(target_count=target_count, max_per_source=max_per_source)
    topics = result.get("topics") or []
    stored = upsert_hot_topics(conn, topics)
    return {
        "rawCount": result.get("raw_count", 0),
        "evaluatedCount": result.get("evaluated_count", 0),
        "acceptedCount": result.get("accepted_count", 0),
        "storedCount": stored,
    }


def seed_from_static_topics(conn: sqlite3.Connection, static_topics: list[dict], limit: int = 8) -> int:
    existing = conn.execute("SELECT COUNT(*) AS c FROM debate_topics").fetchone()["c"]
    if int(existing or 0) > 0:
        return 0

    now = _now_iso()
    seeded = 0
    for idx, item in enumerate(static_topics[: max(1, min(limit, 20))]):
        pro = item.get("sideA") or {}
        con = item.get("sideB") or {}
        conn.execute(
            """
            INSERT OR IGNORE INTO debate_topics (
                id, title, motion_title, category, difficulty, debate_style,
                classification_reason, recommended_level,
                pro_position, pro_arguments_json, con_position, con_arguments_json,
                source, raw_title, raw_summary, source_url, source_urls_json,
                trend_score, status, safety_level, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                f"static_{item.get('id')}",
                item.get("title") or "Untitled debate",
                f"This House believes that {(item.get('title') or 'this proposition').rstrip('?').lower()}",
                item.get("tag") or "General",
                item.get("difficulty") or "Medium",
                "Academic",
                "Seeded from local topic bank while live sources are unavailable.",
                "high school / university beginner",
                pro.get("position") or "Support",
                json.dumps(pro.get("args") or []),
                con.get("position") or "Oppose",
                json.dumps(con.get("args") or []),
                "LocalSeed",
                item.get("title") or "",
                item.get("description") or "",
                "",
                json.dumps([]),
                max(30, 90 - idx * 3),
                "approved",
                "safe",
                now,
                now,
            ),
        )
        seeded += 1
    return seeded
