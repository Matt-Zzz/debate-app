export const FORMAT = [
  { name: "Your Constructive", role: "user", duration: 180, description: "Present your full case. Define key terms, state your framework, and lay out your main contentions with warrants." },
  { name: "Opponent Rebuttal", role: "opponent", duration: 120, description: "Your opponent responds to your constructive." },
  { name: "Your Rebuttal", role: "user", duration: 120, description: "Rebuild your case and clash directly with opponent arguments. Do not introduce new contentions." },
  { name: "Opponent Summary", role: "opponent", duration: 90, description: "Your opponent crystallizes their key arguments." },
  { name: "Your Summary", role: "user", duration: 90, description: "Collapse to your strongest 2–3 arguments. Explain why you win the round." },
];

export const DIFF_COLOR = {
  Easy: "#2e7d32",
  Medium: "#e65100",
  Hard: "#c62828",
};

export const LEVEL_NAMES = {
  1: "Novice",
  2: "Speaker",
  3: "Debater",
  4: "Advocate",
  5: "Champion",
};

export const LEVEL_XP_THRESHOLDS = {
  1: 0,
  2: 120,
  3: 300,
  4: 550,
  5: 850,
};

export const TRAINING_TOPIC_REFRESH_LIMIT = 3;
