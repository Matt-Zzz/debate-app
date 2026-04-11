// lib/coach/registry.js
// Single source of truth for mini game to skill tree mappings.
// All Coach Mode components import from here, never hardcode game IDs elsewhere.

export const SKILL_TREES = {
  clash: {
    id: "clash",
    name: "Clash",
    icon: "⚡",
    description: "Find the real disagreement.",
  },
  logic: {
    id: "logic",
    name: "Logic",
    icon: "🧠",
    description: "Spot weak reasoning.",
  },
  rebuttal: {
    id: "rebuttal",
    name: "Rebuttal",
    icon: "🛡️",
    description: "Answer the other side directly.",
  },
  weighing: {
    id: "weighing",
    name: "Weighing",
    icon: "⚖️",
    description: "Explain why your impact matters more.",
  },
  expression: {
    id: "expression",
    name: "Expression",
    icon: "✍️",
    description: "Say it sharply and clearly.",
  },
  strategy: {
    id: "strategy",
    name: "Strategy",
    icon: "🎯",
    description: "Choose what matters most in the round.",
  },
};

export const MINI_GAMES = {
  clash_point_picker: {
    skillTreeId: "clash",
    label: "Clash Point Picker",
  },
  fallacy_hunt: {
    skillTreeId: "logic",
    label: "Fallacy Hunt",
    mode: "choice",
  },
  rebuttal_match: {
    skillTreeId: "rebuttal",
    label: "Rebuttal Match",
    mode: "choice",
  },
  impact_ranking: {
    skillTreeId: "weighing",
    label: "Impact Ranking",
    mode: "ranking",
  },
  speech_polish: {
    skillTreeId: "expression",
    label: "Speech Polish",
    mode: "rewrite",
  },
  opponent_read: {
    skillTreeId: "strategy",
    label: "Opponent Read",
    mode: "prediction",
  },
};

export const TREE_XP_THRESHOLDS = {
  1: 0,
  2: 60,
  3: 150,
  4: 300,
  5: 500,
};

export function treeLevelFromXP(xp) {
  let level = 1;

  for (const [lvl, threshold] of Object.entries(TREE_XP_THRESHOLDS)) {
    if (xp >= threshold) {
      level = parseInt(lvl, 10);
    }
  }

  return level;
}

export function xpToNextLevel(xp) {
  const current = treeLevelFromXP(xp);
  const max = Math.max(...Object.keys(TREE_XP_THRESHOLDS).map(Number));

  if (current >= max) {
    return 0;
  }

  return Math.max(0, TREE_XP_THRESHOLDS[current + 1] - xp);
}

export function xpProgressInLevel(xp) {
  const current = treeLevelFromXP(xp);
  const max = Math.max(...Object.keys(TREE_XP_THRESHOLDS).map(Number));

  if (current >= max) {
    return { earned: xp, total: xp, pct: 100 };
  }

  const floor = TREE_XP_THRESHOLDS[current];
  const ceil = TREE_XP_THRESHOLDS[current + 1];
  const earned = xp - floor;
  const total = ceil - floor;

  return {
    earned,
    total,
    pct: Math.round((earned / total) * 100),
  };
}
