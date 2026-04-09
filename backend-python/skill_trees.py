"""
skill_trees.py — Skill tree definitions, XP rules, and level helpers.
"""
from __future__ import annotations
from typing import Any

SKILL_TREES: dict[str, dict] = {
    "clash": {
        "name": "Clash",
        "description": "Find the real disagreement.",
        "icon": "⚡",
    },
    "logic": {
        "name": "Logic",
        "description": "Spot weak reasoning.",
        "icon": "🧠",
    },
    "rebuttal": {
        "name": "Rebuttal",
        "description": "Answer the other side directly.",
        "icon": "🛡️",
    },
    "weighing": {
        "name": "Weighing",
        "description": "Explain why your impact matters more.",
        "icon": "⚖️",
    },
    "expression": {
        "name": "Expression",
        "description": "Say it sharply and clearly.",
        "icon": "✍️",
    },
    "strategy": {
        "name": "Strategy",
        "description": "Choose what matters most in the round.",
        "icon": "🎯",
    },
}

# XP required to reach each level within a trS = {1: 0, 2: 60, 3: 150, 4: 300, 5: 500}

# XP rewards per mini-game
MINI_GAME_TREE_XP: dict[str, dict] = {
    "clash_point_picker": {"base": 15, "bonus": 20, "global": 5},
    "fallacy_hunt":       {"base": 18, "bonus": 25, "global": 6},
    "rebuttal_match":     {"base": 16, "bonus": 20, "global": 5},
    "impact_ranking":     {"base": 14, "bonus": 18, "global": 4},
    "speech_polish":      {"base": 20, "bonus": 15, "global": 6},
    "opponent_read":      {"base": 12, "bonus": 15, "global": 4},
}

MINI_GAME_REGISTRY: dict[str, dict] = {
    "clash_point_picker": {
        "skillTreeId": "clash",
        "mode": "choice",
        "contentSource": "static_or_generated",
        "label": "Clash Point Picker",
    },
    "fallacy_hunt": {
        "skillTreeId": "logic",
        "mode": "choice",
        "contentSource": "static_or_generated",
        "label": "Fallacy Hunt",
    },
    "rebuttal_match": {
        "skillTreeId": "rebuttal",
        "mode": "choice",
        "contentSource": "static_or_generated",
        "label": "Rebuttal Match",
    },
    "impact_ranking": {
        "skillTreeId": "weighing",
        "mode": "ranking",
        "contentSource": "static_or_generated",
        "label": "Impact Ranking",
    },
    "speech_polish": {
        "skillTreeId": "expression",
        "mode": "rewrite",
        "contentSource": "static_or_generated",
        "label": "Speech Polish",
    },
    "opponent_read": {
        "skillTreeId": "strategy",
        "mode": "prediction",
        "contentSource": "static_or_generated",
        "label": "Opponent Read",
    },
}


def tree_level_from_xp(xp: int) -> int:
    level = 1
    for candidate, threshold in TREE_XP_THRESHOLDS.items():
        if xp >= threshold:
            level = candidate
    return level


def tree_xp_to_next(xp: int) -> int:
    current = tree_level_from_xp(xp)
    max_level = max(TREE_XP_THRESHOLDS)
    if current >= max_level:
        return 0
    return max(0, TREE_XP_THRESHOLDS[current + 1] - xp)


def calculate_mini_game_xp(
    mini_game_id: str,
    score: int,
    max_score: int,
    difficulty: str = "medium",
    streak: int = 0,
) -> dict[str, int]:
    rules = MINI_GAME_TREE_XP.get(mini_game_id, {"base": 10, "bonus": 10, "global": 3})
    ratio = max(0.0, min(1.0, score / max_score)) if max_score > 0 else 0.0
    difficulty_mult = {"easy": 0.8, "medium": 1.0, "hard": 1.3}.get(difficulty, 1.0)
    streak_bonus = min(streak * 3, 12)
    tree_xp = int(round((rules["base"] + rules["bonus"] * ratio) * difficulty_mult + streak_bonus))
    global_xp = int(rules["global"] * difficulty_mult)
    return {"treeXP": tree_xp, "globalXP": global_xp}


def skill_tree_snapshot(tree_id: str, xp: int) -> dict[str, Any]:
    level = tree_level_from_xp(xp)
    meta = SKILL_TREES.get(tree_id, {"name": tree_id, "icon": "📘", "description": ""})
    max_level = max(TREE_XP_THRESHOLDS)
    current_threshold = TREE_XP_THRESHOLDS.get(level, 0)
    next_threshold = TREE_XP_THRESHOLDS.get(level + 1) if lel < max_level else None
    xp_in_level = xp - current_threshold
    xp_for_level = (next_threshold - current_threshold) if next_threshold else 0
    return {
        "treeId": tree_id,
        "name": meta["name"],
        "icon": meta["icon"],
        "description": meta["description"],
        "level": level,
        "totalXP": xp,
        "xpInLevel": xp_in_level,
        "xpForLevel": xp_for_level,
        "xpToNext": tree_xp_to_next(xp),
        "maxLevel": level >= max_level,
    }
