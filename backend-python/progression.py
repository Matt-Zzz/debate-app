from __future__ import annotations

from typing import Any

LEVELS = {
    1: {"name": "Iron", "difficulties": ["Easy"]},
    2: {"name": "Silver", "difficulties": ["Easy", "Medium"]},
    3: {"name": "Gold", "difficulties": ["Medium"]},
    4: {"name": "Diamond", "difficulties": ["Medium", "Hard"]},
    5: {"name": "Master", "difficulties": ["Hard"]},
}

XP_THRESHOLDS = {
    1: 0,
    2: 120,
    3: 300,
    4: 550,
    5: 850,
}

PLACEMENT_THRESHOLDS = [
    {"minScore": 85, "level": 5},
    {"minScore": 70, "level": 4},
    {"minScore": 55, "level": 3},
    {"minScore": 40, "level": 2},
    {"minScore": 0, "level": 1},
]

MINI_GAMES = [
    {"id": "clash", "title": "Clash Point Picker", "tutorialQuestionCount": 1},
    {"id": "fallacy", "title": "Fallacy Hunt", "tutorialQuestionCount": 1},
    {"id": "speech", "title": "Speech Polish", "tutorialQuestionCount": 1},
]

TRAINING_XP_RULES = {
    "clash": {"base": 18, "bonus": 22},
    "fallacy": {"base": 22, "bonus": 28},
    "speech": {"base": 26, "bonus": 10},
}

PVP_XP_RULES = {
    "win": 48,
    "loss": 24,
    "draw": 32,
}

DEBATE_SESSION_XP = {
    "minimumGrade": 50,
    "baseXP": 10,
    "xpPerPointAboveMinimum": 5,
}


def level_name(level: int) -> str:
    return LEVELS.get(level, LEVELS[1])["name"]


def level_from_score(score: int) -> int:
    for band in PLACEMENT_THRESHOLDS:
        if score >= band["minScore"]:
            return int(band["level"])
    return 1


def level_from_xp(total_xp: int) -> int:
    level = 1
    for candidate, threshold in XP_THRESHOLDS.items():
        if total_xp >= threshold:
            level = candidate
    return level


def baseline_xp_for_level(level: int) -> int:
    return int(XP_THRESHOLDS.get(level, 0))


def allowed_difficulties_for_level(level: int) -> list[str]:
    return list(LEVELS.get(level, LEVELS[1])["difficulties"])


def allowed_levels_for_difficulty(difficulty: str) -> list[int]:
    return [level for level, meta in LEVELS.items() if difficulty in meta["difficulties"]]


def next_level_details(total_xp: int) -> dict[str, Any] | None:
    current_level = level_from_xp(total_xp)
    if current_level >= max(LEVELS):
        return None

    next_level = current_level + 1
    next_threshold = XP_THRESHOLDS[next_level]
    return {
        "nextLevel": next_level,
        "nextLevelName": level_name(next_level),
        "nextLevelXP": next_threshold,
        "xpToNextLevel": max(0, next_threshold - total_xp),
    }


def progression_snapshot(level: int, total_xp: int) -> dict[str, Any]:
    next_details = next_level_details(total_xp) or {
        "nextLevel": None,
        "nextLevelName": None,
        "nextLevelXP": None,
        "xpToNextLevel": 0,
    }
    return {
        "currentLevel": level,
        "levelName": level_name(level),
        "totalXP": total_xp,
        "unlockedDifficulties": allowed_difficulties_for_level(level),
        **next_details,
    }


def debate_session_xp(score: float | None) -> int:
    if score is None:
        return 0

    grade = max(0.0, float(score))
    minimum = float(DEBATE_SESSION_XP["minimumGrade"])
    if grade < minimum:
        return 0

    return int(round(
        DEBATE_SESSION_XP["baseXP"] +
        DEBATE_SESSION_XP["xpPerPointAboveMinimum"] * (grade - minimum)
    ))


def calculate_training_xp(session_type: str, score: float | None = None, max_score: float | None = None, result: dict[str, Any] | None = None) -> int:
    rules = TRAINING_XP_RULES.get(session_type, {"base": 15, "bonus": 0})
    result = result or {}

    if session_type == "debate":
        return debate_session_xp(result.get("rubricTotal"))

    if session_type == "speech":
        completed = max(1, int(result.get("completedQuestions") or 0))
        return int(rules["base"] + min(rules["bonus"], completed))

    if max_score and max_score > 0 and score is not None:
        ratio = max(0.0, min(1.0, score / max_score))
        return int(round(rules["base"] + rules["bonus"] * ratio))

    return int(rules["base"])


def pvp_xp_for_outcome(outcome: str) -> int:
    return int(PVP_XP_RULES.get(outcome, PVP_XP_RULES["loss"]))


def progression_config() -> dict[str, Any]:
    levels = []
    for level, meta in LEVELS.items():
        levels.append(
            {
                "level": level,
                "name": meta["name"],
                "minXP": XP_THRESHOLDS[level],
                "unlockedDifficulties": list(meta["difficulties"]),
            }
        )

    placement_bands = []
    for band in PLACEMENT_THRESHOLDS:
        placement_bands.append(
            {
                "minScore": band["minScore"],
                "level": band["level"],
                "name": level_name(int(band["level"])),
            }
        )

    return {
        "levels": levels,
        "placementBands": placement_bands,
        "topicAccessByLevel": {str(level): allowed_difficulties_for_level(level) for level in LEVELS},
        "miniGames": MINI_GAMES,
        "xpThresholds": {str(level): threshold for level, threshold in XP_THRESHOLDS.items()},
        "debateSessionXP": dict(DEBATE_SESSION_XP),
    }
