"""
recommendations.py
Coach Mode recommendation engine.
Looks at skill tree levels, recent seeds, recent games, and recent debates,
then returns the top 2 to 3 next actions for the user.
"""

from __future__ import annotations

import sqlite3
from typing import Any

from skill_trees import MINI_GAME_REGISTRY, SKILL_TREES, tree_level_from_xp


# Tone phrases, never scatter these in other files
_REASON_PHRASES: dict[str, list[str]] = {
    "lowest_tree": [
        "This skill is your lowest right now. Consistent practice here will move you fastest.",
        "You haven't drilled this area much yet. A quick game will start building the muscle.",
    ],
    "new_seed": [
        "I found a moment from your last debate that's worth another look.",
        "There's a specific line from your recent round that could be much stronger.",
        "This came directly from your last session. Worth one more pass.",
    ],
    "repeat_weakness": [
        "This came up in two recent sessions. Worth targeting directly.",
        "You've hit this weakness before. A focused drill will help break the pattern.",
    ],
    "diversify": [
        "You've been strong on this lately. Time to tackle a different area.",
        "You're building momentum here. Let's make sure the rest of the skill set keeps up.",
    ],
    "streak_game": [
        "You've been on a roll with this one. Keep the streak going.",
        "Strong recent performance here. One more session will cement the progress.",
    ],
}


def _pick_phrase(key: str, seed: int = 0) -> str:
    phrases = _REASON_PHRASES.get(key, ["Practice this skill to improve."])
    return phrases[seed % len(phrases)]


def _tree_progress_map(conn: sqlite3.Connection, user_id: int) -> dict[str, int]:
    rows = conn.execute(
        "SELECT tree_id, xp FROM skill_progress WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    return {row["tree_id"]: int(row["xp"]) for row in rows}


def _recent_weak_trees(
    conn: sqlite3.Connection,
    user_id: int,
    limit: int = 3,
) -> list[str]:
    """Pull skill_tree_id from the most recent new or active practice seeds."""
    rows = conn.execute(
        """
        SELECT skill_tree_id, COUNT(*) AS cnt
        FROM practice_seeds
        WHERE user_id = ? AND status IN ('new', 'active')
        GROUP BY skill_tree_id
        ORDER BY MAX(created_at) DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    return [row["skill_tree_id"] for row in rows]


def _recent_games_played(
    conn: sqlite3.Connection,
    user_id: int,
    limit: int = 10,
) -> list[str]:
    rows = conn.execute(
        """
        SELECT mini_game_id
        FROM mini_game_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    return [row["mini_game_id"] for row in rows]


def _new_seeds_for_tree(
    conn: sqlite3.Connection,
    user_id: int,
    tree_id: str,
) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT *
        FROM practice_seeds
        WHERE user_id = ? AND skill_tree_id = ? AND status = 'new'
        ORDER BY confidence DESC, created_at DESC
        LIMIT 1
        """,
        (user_id, tree_id),
    ).fetchall()
    return [dict(row) for row in rows]


def recommend_next_actions(
    conn: sqlite3.Connection,
    user_id: int,
    top_n: int = 3,
) -> list[dict[str, Any]]:
    """
    Returns up to top_n recommended mini game actions with reasons.
    Each item: { miniGameId, skillTreeId, reason, seedId, isPersonalized }
    """
    tree_xp = _tree_progress_map(conn, user_id)
    weak_trees = _recent_weak_trees(conn, user_id)
    recent_games = _recent_games_played(conn, user_id)

    # All trees with their current level
    # Default 0 XP means level 1 for unseen trees
    all_trees = list(SKILL_TREES.keys())
    tree_levels = {
        tree_id: tree_level_from_xp(tree_xp.get(tree_id, 0))
        for tree_id in all_trees
    }

    recommendations: list[dict[str, Any]] = []
    seen_trees: set[str] = set()

    def add_rec(
        mini_game_id: str,
        tree_id: str,
        reason: str,
        seed_id: int | None = None,
    ) -> bool:
        if len(recommendations) >= top_n:
            return False
        if tree_id in seen_trees:
            return False

        meta = MINI_GAME_REGISTRY.get(mini_game_id, {})
        recommendations.append(
            {
                "miniGameId": mini_game_id,
                "skillTreeId": tree_id,
                "miniGameLabel": meta.get("label", mini_game_id),
                "treeIcon": SKILL_TREES.get(tree_id, {}).get("icon", "📘"),
                "treeName": SKILL_TREES.get(tree_id, {}).get("name", tree_id),
                "reason": reason,
                "seedId": seed_id,
                "isPersonalized": seed_id is not None,
            }
        )
        seen_trees.add(tree_id)
        return True

    # Priority 1: trees with new seeds, personalized first
    for tree_id in weak_trees:
        seeds = _new_seeds_for_tree(conn, user_id, tree_id)
        if not seeds:
            continue

        seed = seeds[0]
        game_id = _game_for_tree(tree_id)
        add_rec(
            game_id,
            tree_id,
            _pick_phrase("new_seed", seed["id"] % 3),
            seed["id"],
        )

    # Priority 2: lowest level tree that has not been recommended yet
    sorted_by_level = sorted(
        all_trees,
        key=lambda tree_id: (tree_levels[tree_id], tree_xp.get(tree_id, 0)),
    )

    for tree_id in sorted_by_level:
        if tree_id in seen_trees:
            continue

        game_id = _game_for_tree(tree_id)

        # Diversify if the same game was played 3 or more times recently
        if recent_games.count(game_id) >= 3:
            game_id = _alternate_game_for_tree(tree_id, recent_games)

        add_rec(
            game_id,
            tree_id,
            _pick_phrase("lowest_tree", tree_levels[tree_id]),
        )

    return recommendations


def _game_for_tree(tree_id: str) -> str:
    """Return the primary mini game for a given skill tree."""
    mapping = {
        "clash": "clash_point_picker",
        "logic": "fallacy_hunt",
        "rebuttal": "rebuttal_match",
        "weighing": "impact_ranking",
        "expression": "speech_polish",
        "strategy": "opponent_read",
    }
    return mapping.get(tree_id, "speech_polish")


def _alternate_game_for_tree(tree_id: str, recent: list[str]) -> str:
    """When the primary game has been overplayed, suggest the secondary."""
    alternates = {
        "clash": "speech_polish",
        "logic": "clash_point_picker",
        "rebuttal": "fallacy_hunt",
        "weighing": "speech_polish",
        "expression": "impact_ranking",
        "strategy": "fallacy_hunt",
    }
    return alternates.get(tree_id, _game_for_tree(tree_id))