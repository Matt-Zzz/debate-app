from __future__ import annotations

import random
import re
from typing import Any

from progression import level_from_score, level_name

HEDGE_WORDS = {
    "kind",
    "maybe",
    "perhaps",
    "probably",
    "somewhat",
    "sort",
    "might",
    "could",
    "possibly",
}

STOPWORDS = {
    "about",
    "against",
    "because",
    "between",
    "could",
    "every",
    "first",
    "have",
    "into",
    "just",
    "more",
    "other",
    "should",
    "their",
    "there",
    "these",
    "those",
    "under",
    "while",
    "with",
    "would",
}


def tutorial_question_bundle(clash_topics: list[dict], fallacies: list[dict], speech_polish: dict[str, Any]) -> list[dict[str, Any]]:
    clash = random.choice(clash_topics)
    fallacy = random.choice(fallacies)
    speech = random.choice(speech_polish["level1"])

    clash_options = shuffle([clash["clashPoint"], *random.sample(clash["distractors"], k=min(2, len(clash["distractors"])))])
    fallacy_options = build_fallacy_options(fallacy)

    return [
        {
            "miniGame": "clash",
            "questionId": clash["id"],
            "title": "Clash Point Picker",
            "instructions": "Pick the deepest disagreement, then explain why it matters.",
            "category": clash["category"],
            "prompt": "Which is the most important point of disagreement?",
            "stem": clash["topic"],
            "options": clash_options,
        },
        {
            "miniGame": "fallacy",
            "questionId": str(fallacy["id"]),
            "title": "Fallacy Hunt",
            "instructions": "Select every fallacy you can find, then explain your reasoning.",
            "category": fallacy["category"],
            "prompt": "Select every logical fallacy hiding in this argument.",
            "stem": fallacy["argument"],
            "options": fallacy_options,
        },
        {
            "miniGame": "speech",
            "questionId": speech["id"],
            "title": "Speech Polish",
            "instructions": "Choose the sharpest version, then explain why it is stronger.",
            "category": speech.get("context", ""),
            "prompt": speech["prompt"],
            "stem": speech.get("context", ""),
            "options": speech["options"],
        },
    ]


def score_tutorial(questions: list[dict[str, Any]], answers: dict[str, dict[str, Any]], fallacy_lookup: dict[str, dict], clash_lookup: dict[str, dict], speech_lookup: dict[str, dict]) -> dict[str, Any]:
    per_question: list[dict[str, Any]] = []

    for question in questions:
        mini_game = question["miniGame"]
        answer = answers.get(mini_game, {})
        if mini_game == "clash":
            source = clash_lookup[question["questionId"]]
            per_question.append(score_clash_question(source, answer))
        elif mini_game == "fallacy":
            source = fallacy_lookup[question["questionId"]]
            per_question.append(score_fallacy_question(source, answer))
        elif mini_game == "speech":
            source = speech_lookup[question["questionId"]]
            per_question.append(score_speech_question(source, answer))

    total_score = round(sum(item["total"] for item in per_question) / max(1, len(per_question)))
    assigned_level = level_from_score(total_score)
    return {
        "scores": {item["miniGame"]: item for item in per_question},
        "totalScore": total_score,
        "assignedLevel": assigned_level,
        "assignedLevelName": level_name(assigned_level),
    }


def score_clash_question(question: dict[str, Any], answer: dict[str, Any]) -> dict[str, Any]:
    selected = str(answer.get("selectedOption") or "").strip()
    explanation = str(answer.get("explanation") or "").strip()
    correctness = 40 if selected == question["clashPoint"] else 10 if selected else 0
    reasoning, clarity, response_quality = text_scores(explanation, f"{question['clashPoint']} {question['explanation']}")
    total = correctness + reasoning + clarity + response_quality
    feedback = (
        "You identified the real value clash and supported it clearly."
        if correctness >= 40
        else "You missed the deepest disagreement, but your explanation still contributes to placement scoring."
    )
    return build_score_payload("clash", question["id"], correctness, reasoning, clarity, response_quality, total, feedback)


def score_fallacy_question(question: dict[str, Any], answer: dict[str, Any]) -> dict[str, Any]:
    selected = sorted(set(str(item).strip() for item in answer.get("selectedOptions") or [] if str(item).strip()))
    explanation = str(answer.get("explanation") or "").strip()
    correct = set(question["fallacies"])
    hits = len(correct.intersection(selected))
    wrong = len(set(selected) - correct)
    correctness = max(0, round(40 * (hits / max(1, len(correct))) - wrong * 8))
    reasoning, clarity, response_quality = text_scores(explanation, f"{' '.join(question['fallacies'])} {question['explanation']}")
    total = correctness + reasoning + clarity + response_quality
    feedback = (
        "You found the logic flaws with strong accuracy."
        if hits == len(correct) and wrong == 0
        else "Your fallacy selection was partial or included extra picks, which lowers the placement score."
    )
    return build_score_payload("fallacy", str(question["id"]), correctness, reasoning, clarity, response_quality, total, feedback)


def score_speech_question(question: dict[str, Any], answer: dict[str, Any]) -> dict[str, Any]:
    selected_index = answer.get("selectedIndex")
    explanation = str(answer.get("explanation") or "").strip()
    correctness = 40 if selected_index == question["correct"] else 10 if selected_index is not None else 0
    correct_option = question["options"][question["correct"]]
    reasoning, clarity, response_quality = text_scores(explanation, f"{correct_option} {question['explanation']}")
    total = correctness + reasoning + clarity + response_quality
    feedback = (
        "You recognized the sharper version and explained why it works."
        if correctness >= 40
        else "You chose a weaker version, but your explanation still informs placement."
    )
    return build_score_payload("speech", question["id"], correctness, reasoning, clarity, response_quality, total, feedback)


def build_score_payload(mini_game: str, question_id: str, correctness: int, reasoning: int, clarity: int, response_quality: int, total: int, feedback: str) -> dict[str, Any]:
    return {
        "miniGame": mini_game,
        "questionId": question_id,
        "criteria": {
            "correctness": correctness,
            "reasoningQuality": reasoning,
            "clarity": clarity,
            "responseQuality": response_quality,
        },
        "total": total,
        "feedback": feedback,
    }


def text_scores(text: str, reference: str) -> tuple[int, int, int]:
    tokens = tokenize(text)
    ref_words = reference_words(reference)

    if not tokens:
        return 0, 0, 0

    overlap = len(set(tokens) & ref_words)
    reasoning = min(25, 8 + min(9, len(tokens) // 2) + min(8, overlap * 2))

    unique_ratio = len(set(tokens)) / max(1, len(tokens))
    hedge_penalty = sum(1 for token in tokens if token in HEDGE_WORDS)
    clarity = min(20, max(4, 12 + round(unique_ratio * 6) - hedge_penalty * 2))

    response_quality = 0
    if len(tokens) >= 5:
        response_quality += 5
    if len(tokens) >= 10:
        response_quality += 5
    if re.search(r"[.!?]$", text.strip()):
        response_quality += 5

    return reasoning, clarity, min(15, response_quality)


def build_fallacy_options(question: dict[str, Any]) -> list[str]:
    aliases = {
        "Strawman": "Straw man",
        "Post hoc": "Post hoc ergo propter hoc",
    }
    correct = [aliases.get(name, name) for name in question["fallacies"]]
    all_names = [
        "Ad hominem",
        "Straw man",
        "False dilemma",
        "Slippery slope",
        "Circular reasoning",
        "Hasty generalization",
        "Appeal to authority",
        "Red herring",
        "Tu quoque",
        "Post hoc ergo propter hoc",
        "Appeal to emotion",
        "False analogy",
        "Cherry picking",
        "Loaded question",
        "Genetic fallacy",
        "Non sequitur",
    ]
    wrong = [name for name in all_names if name not in correct]
    return shuffle(correct + random.sample(wrong, k=max(0, 6 - len(correct))))


def shuffle(items: list[Any]) -> list[Any]:
    shuffled = list(items)
    random.shuffle(shuffled)
    return shuffled


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


def reference_words(text: str) -> set[str]:
    return {
        token
        for token in tokenize(text)
        if len(token) >= 5 and token not in STOPWORDS and token not in HEDGE_WORDS
    }
