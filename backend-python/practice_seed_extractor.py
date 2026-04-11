"""
practice_seed_extractor.py
Extracts 1 to 3 personalized practice seeds from a debate transcript and rubric.

Rules based first pass. No AI required.
Each seed maps to one skill tree and one mini game.
"""

from __future__ import annotations

import re
from typing import Any


# Weakness detectors

_HEDGE_PATTERN = re.compile(
    r"\b(maybe|perhaps|possibly|kind of|sort of|probably|might be|could be"
    r"|seems like|i think|i feel like|i guess|somewhat|in a way)\b",
    re.I,
)

_VAGUE_PATTERN = re.compile(
    r"\b(bad|good|problems?|issues?|things?|stuff|aspects?|factors?|various|"
    r"many|some|lots of|a lot of)\b",
    re.I,
)

_ABSOLUTE_PATTERN = re.compile(
    r"\b(always|never|every|all|none|no one|everyone|completely|totally|"
    r"obviously|clearly|definitely|certainly)\b",
    re.I,
)

_IMPACT_WORDS = re.compile(
    r"\b(harm|hurts?|damage|risk|danger|death|deaths|injury|injuries|suffering|"
    r"poverty|violence|abuse|loss|cost|collapse|rights|freedom|safety|wellbeing)\b",
    re.I,
)

_WEIGHING_WORDS = re.compile(
    r"\b(outweigh|more important|greater|matters more|bigger|worse|better than|"
    r"compared to|offset|justify|priorit)\b",
    re.I,
)

_OPPONENT_WORDS = re.compile(
    r"\b(my opponent|they (said|argued|claim)|the other side|their (argument|case|point))\b",
    re.I,
)

_STRUCTURE_WORDS = re.compile(
    r"\b(first(ly)?|second(ly)?|third(ly)?|in conclusion|to sum up|therefore|thus|"
    r"my (first|second|main) (point|contention|argument))\b",
    re.I,
)


def _split_sentences(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 20]


def _hedge_score(sentence: str) -> float:
    return min(1.0, len(_HEDGE_PATTERN.findall(sentence)) * 0.35)


def _vague_score(sentence: str) -> float:
    return min(1.0, len(_VAGUE_PATTERN.findall(sentence)) * 0.3)


def _pick_weakest_sentence(
    sentences: list[str],
    scorer,
) -> tuple[str, float] | None:
    scored = [(s, scorer(s)) for s in sentences if scorer(s) > 0.25]
    if not scored:
        return None
    return max(scored, key=lambda x: x[1])


def extract_practice_seeds(
    transcript: list[dict],
    rubric: dict,
    feedback: dict,
    max_seeds: int = 2,
) -> list[dict[str, Any]]:
    """
    Returns up to max_seeds practice seeds, each containing:
    miniGameId, skillTreeId, sourceExcerpt, weaknessLabel,
    coachNote, confidence, prompt, difficulty.
    """
    seeds: list[dict[str, Any]] = []
    used_trees: set[str] = set()

    user_turns = [t for t in transcript if t.get("role") == "user"]
    breakdown = rubric.get("breakdown", {})

    all_sentences: list[str] = []
    for turn in user_turns:
        all_sentences.extend(_split_sentences(turn.get("text", "")))

    if not all_sentences:
        return []

    def make_seed(
        mini_game_id: str,
        skill_tree_id: str,
        excerpt: str,
        weakness_label: str,
        coach_note: str,
        confidence: float,
        prompt: str,
        difficulty: str = "medium",
    ) -> dict[str, Any]:
        return {
            "miniGameId": mini_game_id,
            "skillTreeId": skill_tree_id,
            "sourceExcerpt": excerpt,
            "weaknessLabel": weakness_label,
            "coachNote": coach_note,
            "confidence": round(confidence, 2),
            "prompt": prompt,
            "difficulty": difficulty,
        }

    def add_seed(seed: dict[str, Any]) -> bool:
        if len(seeds) >= max_seeds:
            return False
        if seed["skillTreeId"] in used_trees:
            return False
        seeds.append(seed)
        used_trees.add(seed["skillTreeId"])
        return True

    # Rule 1: Expression, hedging or vagueness
    if "expression" not in used_trees:
        hedge_hit = _pick_weakest_sentence(all_sentences, _hedge_score)
        vague_hit = _pick_weakest_sentence(all_sentences, _vague_score)

        best = (
            hedge_hit
            if hedge_hit and (not vague_hit or hedge_hit[1] >= vague_hit[1])
            else vague_hit
        )

        if best:
            excerpt, score = best
            label = (
                "hedged_claim"
                if _hedge_score(excerpt) > _vague_score(excerpt)
                else "vague_claim"
            )
            note = (
                "This sentence hedges instead of committing. A sharp debater makes the claim directly."
                if label == "hedged_claim"
                else "This claim is too vague to be persuasive. Name the specific harm, person, or mechanism."
            )
            prompt = (
                "Rewrite this sentence to remove the hedging. Make the claim direct and specific."
                if label == "hedged_claim"
                else "Rewrite this claim so it names exactly what goes wrong, for whom, and why it matters."
            )
            add_seed(
                make_seed(
                    "speech_polish",
                    "expression",
                    excerpt,
                    label,
                    note,
                    min(0.92, 0.55 + score),
                    prompt,
                    "easy",
                )
            )

    # Rule 2: Weighing, impact named but not weighed
    if "weighing" not in used_trees:
        weighing_score = breakdown.get("impact", {}).get("score", 20)
        weighing_max = breakdown.get("impact", {}).get("max", 20)

        if weighing_score < weighing_max * 0.5:
            impact_sentences = [
                s
                for s in all_sentences
                if _IMPACT_WORDS.search(s) and not _WEIGHING_WORDS.search(s)
            ]

            if impact_sentences:
                excerpt = min(impact_sentences, key=len)
                add_seed(
                    make_seed(
                        "impact_ranking",
                        "weighing",
                        excerpt,
                        "missing_weighing",
                        "You named a harm but did not explain why it matters more than the other side's benefit. That's the difference between saying this is bad and winning on impact.",
                        0.78,
                        "Explain why this harm outweighs the opposing benefit. Use magnitude, probability, or irreversibility.",
                        "medium",
                    )
                )

    # Rule 3: Rebuttal, opponent not addressed
    if "rebuttal" not in used_trees and len(user_turns) >= 2:
        clash_score = breakdown.get("clash", {}).get("score", 20)
        clash_max = breakdown.get("clash", {}).get("max", 20)

        if clash_score < clash_max * 0.6:
            rebuttal_turns = [
                t for t in user_turns[1:] if not _OPPONENT_WORDS.search(t.get("text", ""))
            ]

            if rebuttal_turns:
                excerpts = _split_sentences(rebuttal_turns[0].get("text", ""))
                if excerpts:
                    add_seed(
                        make_seed(
                            "rebuttal_match",
                            "rebuttal",
                            excerpts[0],
                            "no_opponent_clash",
                            "In this rebuttal turn you did not engage with what your opponent actually said. Good rebuttal starts with direct clash.",
                            0.71,
                            "Write a rebuttal that directly answers the opponent's claim instead of just extending your own case.",
                            "medium",
                        )
                    )

    # Rule 4: Logic, absolute claim with no support
    if "logic" not in used_trees:
        absolute_sentences = [
            s
            for s in all_sentences
            if _ABSOLUTE_PATTERN.search(s) and not _IMPACT_WORDS.search(s)
        ]

        if absolute_sentences:
            excerpt = absolute_sentences[0]
            add_seed(
                make_seed(
                    "fallacy_hunt",
                    "logic",
                    excerpt,
                    "unsupported_absolute",
                    "You used an absolute claim without backing it up. Strong opponents will immediately demand a counterexample, and you have no defence.",
                    0.74,
                    "What fallacy does this absolute claim risk committing? Then find the version of this argument that does not need to be absolute.",
                    "medium",
                )
            )

    # Rule 5: Clash, low structure score and no clear thesis
    if "clash" not in used_trees:
        structure_score = breakdown.get("structure", {}).get("score", 20)
        structure_max = breakdown.get("structure", {}).get("max", 20)

        if structure_score < structure_max * 0.4 and all_sentences:
            excerpt = all_sentences[0]
            add_seed(
                make_seed(
                    "clash_point_picker",
                    "clash",
                    excerpt,
                    "unclear_thesis",
                    "Your opening did not make the central clash clear. Before you can win an argument, you need to pin down exactly what you are disagreeing about.",
                    0.68,
                    "What is the single most important disagreement in this debate? Pick it, then build every argument around that.",
                    "easy",
                )
            )

    return seeds[:max_seeds]


def seeds_to_db_rows(
    seeds: list[dict[str, Any]],
    user_id: int,
    session_id: str | None,
) -> list[dict[str, Any]]:
    """Convert extracted seeds to the shape expected by the database insert."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    rows = []

    for seed in seeds:
        rows.append(
            {
                "user_id": user_id,
                "source_type": "debate_transcript",
                "source_session_id": session_id or "",
                "source_excerpt": seed["sourceExcerpt"],
                "skill_tree_id": seed["skillTreeId"],
                "weakness_label": seed["weaknessLabel"],
                "coach_note": seed["coachNote"],
                "confidence": seed["confidence"],
                "status": "new",
                "created_at": now,
                "_mini_game_id": seed["miniGameId"],
                "_prompt": seed["prompt"],
                "_difficulty": seed["difficulty"],
            }
        )

    return rows