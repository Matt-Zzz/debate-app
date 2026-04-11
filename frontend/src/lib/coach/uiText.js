// lib/coach/uiText.js
// All Coach Mode tone phrases live here. Never scatter them elsewhere.

export const COACH_INTROS = [
  "This part is worth another shot.",
  "You had the start of a real point here.",
  "Try tightening this before you bring it back into debate.",
  "I found one exchange that could become much stronger.",
  "This line almost landed — one rewrite away.",
  "You were close. Here is where it slipped.",
];

export const TREE_ENCOURAGEMENT = {
  clash:      ["You're learning to find what debates are really about.", "Clash is the foundation. Keep building it."],
  logic:      ["Spotting flaws is half the battle.", "Your logical radar is getting sharper."],
  rebuttal:   ["Engaging directly is what wins rounds.", "You're learning to meet arguments head-on."],
  weighing:   ["Impact matters. So does explaining why.", "The numbers game is getting clearer for you."],
  expression: ["Precision in language is precision in thought.", "Your arguments are getting harder to ignore."],
  strategy: ["You're seeing the round from higher up.", "Reading the opponent is becoming an instinct."],
};

export const LEVEL_UP_MESSAGES = {
  clash:      "You've levelled up in Clash. Your framing is getting cleaner.",
  logic:      "Logic level up. You're catching more of the weak moves.",
  rebuttal:   "Rebuttal level up. You're engaging the other side more directly.",
  weighing:   "Weighing level up. Your impacts are landing with more force.",
  expression: "Expression level up. Your language is sharper and more direct.",
  strategy:   "Strategy level up. You're reading the round with more confidence.",
};

export const COACH_SUMMARIES = {
  improving:   "You're getting sharper. Keep the sessions going.",
  needsWork:   "There's real room to grow here. Let's work on it.",
  worthRetry:  "Worth replaying. One more pass and this will click.",
  focusToday:  "This is your focus for today.",
  newStreak:   "Building a streak. Don't break it.",
};

export function pickCoachIntro(seed = 0) {
  return COACH_INTROS[seed % COACH_INTROS.length];
}

export function pickEncouragement(treeId, seed = 0) {
  const phrases = TREE_ENCOURAGEMENT[treeId] || ["Keep practising this skill."];
  return phrases[seed % phrases.length];
}

