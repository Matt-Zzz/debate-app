import {
  solidBtn,
  secondaryBtn,
  subheadline,
  textareaStyle,
  theme,
} from "./ui";

export { solidBtn, secondaryBtn, textareaStyle, theme };

export const CHOICE_STATES = {
  idle: "idle",
  selected: "selected",
  correct: "correct",
  wrong: "wrong",
  reveal: "reveal",
  partial: "partial",
  "correct-hit": "correct-hit",
  "correct-miss": "correct-miss",
  "wrong-pick": "wrong-pick",
  "correct-chosen": "correct-chosen",
  "correct-missed": "correct-missed",
  disabled: "disabled",
};

const choicePalette = {
  idle: {
    bg: "rgba(255,255,255,0.94)",
    border: theme.border,
    color: theme.ink,
    shadow: "0 4px 12px rgba(15,23,42,0.06)",
  },
  selected: {
    bg: "rgba(79,70,229,0.08)",
    border: "rgba(99,102,241,0.28)",
    color: theme.primaryDeep,
    shadow: "0 8px 20px rgba(79,70,229,0.12)",
  },
  correct: {
    bg: "rgba(22,163,74,0.07)",
    border: "rgba(22,163,74,0.28)",
    color: "#15803d",
    shadow: "none",
  },
  "correct-hit": {
    bg: "rgba(22,163,74,0.07)",
    border: "rgba(22,163,74,0.28)",
    color: "#15803d",
    shadow: "none",
  },
  "correct-chosen": {
    bg: "rgba(22,163,74,0.07)",
    border: "rgba(22,163,74,0.28)",
    color: "#15803d",
    shadow: "none",
  },
  wrong: {
    bg: "rgba(220,38,38,0.06)",
    border: "rgba(220,38,38,0.22)",
    color: theme.danger,
    shadow: "none",
  },
  "wrong-pick": {
    bg: "rgba(220,38,38,0.06)",
    border: "rgba(220,38,38,0.22)",
    color: theme.danger,
    shadow: "none",
  },
  reveal: {
    bg: "rgba(79,70,229,0.06)",
    border: "rgba(99,102,241,0.24)",
    color: theme.primaryDeep,
    shadow: "none",
  },
  partial: {
    bg: "rgba(217,119,6,0.08)",
    border: "rgba(217,119,6,0.24)",
    color: theme.warning,
    shadow: "none",
  },
  "correct-miss": {
    bg: "rgba(217,119,6,0.08)",
    border: "rgba(217,119,6,0.24)",
    color: "#a16207",
    shadow: "none",
  },
  "correct-missed": {
    bg: "rgba(22,163,74,0.04)",
    border: "rgba(22,163,74,0.18)",
    color: "#166534",
    shadow: "none",
  },
  disabled: {
    bg: "rgba(248,250,252,0.94)",
    border: theme.border,
    color: theme.muted,
    shadow: "none",
  },
};

function paletteFor(state) {
  return choicePalette[state] || choicePalette.idle;
}

export const mg = {
  progressRow: {
    display: "flex",
    gap: "6px",
    marginBottom: "16px",
  },

  pip: (state) => ({
    flex: 1,
    height: "5px",
    borderRadius: "999px",
    background:
      state === "done"
        ? "linear-gradient(90deg, #4f46e5, #7c3aed)"
        : state === "current"
          ? "rgba(79,70,229,0.35)"
          : "rgba(15,23,42,0.08)",
    transition: "background 0.3s ease",
  }),

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },

  scoreBadge: {
    fontSize: "12px",
    color: theme.muted,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  eyebrow: {
    fontSize: "10px",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "rgba(15,23,42,0.48)",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    marginBottom: "6px",
  },

  title: {
    fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
    lineHeight: 1.25,
    fontWeight: 700,
    color: theme.ink,
    fontFamily: "'Fraunces', serif",
    marginBottom: "6px",
  },

  support: {
    ...subheadline,
    marginTop: 0,
    marginBottom: "16px",
  },

  metaLabel: {
    fontSize: "10px",
    fontWeight: 700,
    color: "rgba(15,23,42,0.42)",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: "8px",
  },

  seedBox: {
    padding: "12px 15px",
    borderRadius: "16px",
    background: "rgba(79,70,229,0.06)",
    border: "1px solid rgba(99,102,241,0.14)",
    fontSize: "13px",
    color: "#374151",
    lineHeight: 1.65,
    fontStyle: "italic",
    marginBottom: "16px",
  },

  contentCard: (tint = "neutral") => {
    const tints = {
      neutral: {
        bg: "rgba(15,23,42,0.04)",
        border: "rgba(15,23,42,0.09)",
      },
      accent: {
        bg: "rgba(79,70,229,0.06)",
        border: "rgba(99,102,241,0.14)",
      },
      warm: {
        bg: "rgba(220,38,38,0.05)",
        border: "rgba(220,38,38,0.14)",
      },
    };
    const t = tints[tint] || tints.neutral;
    return {
      padding: "16px 18px",
      borderRadius: "18px",
      background: t.bg,
      border: `1px solid ${t.border}`,
      marginBottom: "16px",
    };
  },

  cardTitle: {
    fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
    fontWeight: 700,
    color: theme.ink,
    lineHeight: 1.45,
    fontFamily: "'Fraunces', serif",
  },

  cardBody: {
    fontSize: "14px",
    color: theme.ink,
    lineHeight: 1.65,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  cardBodyMuted: {
    fontSize: "13px",
    color: "#475467",
    lineHeight: 1.65,
  },

  choiceBtn: (state) => {
    const p = paletteFor(state);
    const interactive = state === "idle" || state === "selected";
    return {
      width: "100%",
      padding: "14px 16px",
      borderRadius: "18px",
      textAlign: "left",
      fontSize: "14px",
      fontWeight: interactive ? 500 : 600,
      lineHeight: 1.55,
      cursor: interactive ? "pointer" : "default",
      border: "1px solid",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: "background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease",
      marginBottom: "10px",
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      background: p.bg,
      borderColor: p.border,
      color: p.color,
      boxShadow: p.shadow,
      opacity: state === "disabled" ? 0.55 : 1,
    };
  },

  choicePrefix: (state) => {
    const p = paletteFor(state);
    return {
      width: "24px",
      height: "24px",
      borderRadius: "8px",
      background:
        state === "selected" || state === "reveal"
          ? "rgba(79,70,229,0.12)"
          : state === "correct" || state === "correct-hit" || state === "correct-chosen"
            ? "rgba(22,163,74,0.15)"
            : state === "wrong" || state === "wrong-pick"
              ? "rgba(220,38,38,0.12)"
              : state === "partial" || state === "correct-miss"
                ? "rgba(217,119,6,0.14)"
                : "rgba(15,23,42,0.06)",
      color: p.color,
      fontSize: "11px",
      fontWeight: 800,
      fontFamily: "'JetBrains Mono', monospace",
      display: "grid",
      placeItems: "center",
      flexShrink: 0,
    };
  },

  chipBtn: (state) => {
    const p = paletteFor(state === "idle" ? "idle" : state);
    const selected = state === "selected";
    return {
      position: "relative",
      padding: "11px 14px",
      borderRadius: "14px",
      fontSize: "13px",
      fontWeight: 600,
      textAlign: "center",
      cursor: state === "idle" || state === "selected" ? "pointer" : "default",
      border: "1px solid",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: "background 0.18s ease, border-color 0.18s ease, color 0.18s ease",
      userSelect: "none",
      background: selected ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" : p.bg,
      borderColor: selected ? "rgba(79,70,229,0.16)" : p.border,
      color: selected ? "#fff" : p.color,
      boxShadow: selected ? "0 10px 22px rgba(79,70,229,0.18)" : "0 4px 12px rgba(15,23,42,0.05)",
    };
  },

  counterPill: (active) => ({
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "999px",
    background: active ? "rgba(79,70,229,0.10)" : "rgba(15,23,42,0.05)",
    color: active ? theme.primaryDeep : "rgba(15,23,42,0.42)",
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    border: `1px solid ${active ? "rgba(99,102,241,0.22)" : "rgba(15,23,42,0.08)"}`,
    marginBottom: "14px",
    transition: "all 0.2s ease",
  }),

  feedbackBox: (verdict) => {
    const styles = {
      correct: {
        bg: "rgba(22,163,74,0.07)",
        border: "rgba(22,163,74,0.20)",
      },
      partial: {
        bg: "rgba(217,119,6,0.08)",
        border: "rgba(217,119,6,0.22)",
      },
      wrong: {
        bg: "rgba(220,38,38,0.06)",
        border: "rgba(220,38,38,0.18)",
      },
    };
    const s = styles[verdict] || styles.wrong;
    return {
      marginTop: "4px",
      marginBottom: "16px",
      padding: "16px 18px",
      borderRadius: "18px",
      background: s.bg,
      border: `1px solid ${s.border}`,
    };
  },

  feedbackTitle: (verdict) => {
    const colors = {
      correct: "#15803d",
      partial: "#a16207",
      wrong: theme.danger,
    };
    return {
      fontSize: "15px",
      fontWeight: 800,
      color: colors[verdict] || colors.wrong,
      marginBottom: "8px",
      fontFamily: "'Fraunces', serif",
    };
  },

  feedbackText: {
    fontSize: "13px",
    color: "#475467",
    lineHeight: 1.7,
    marginBottom: "14px",
  },

  modelBox: {
    padding: "14px 16px",
    borderRadius: "16px",
    background: "rgba(79,70,229,0.06)",
    border: "1px solid rgba(99,102,241,0.14)",
    marginBottom: "14px",
  },

  tipBox: {
    padding: "12px 16px",
    borderRadius: "16px",
    background: "rgba(248,250,252,0.96)",
    border: `1px solid ${theme.border}`,
    marginBottom: "14px",
  },

  levelBadge: {
    display: "inline-block",
    padding: "5px 11px",
    borderRadius: "999px",
    background: "rgba(79,70,229,0.08)",
    border: "1px solid rgba(99,102,241,0.16)",
    color: theme.primaryDeep,
    fontSize: "10px",
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "10px",
  },

  howGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
    margin: "18px 0",
  },

  howCard: {
    background: "rgba(248,250,252,0.96)",
    border: `1px solid ${theme.border}`,
    borderRadius: "16px",
    padding: "14px 16px",
  },

  howNum: {
    fontSize: "10px",
    color: theme.primary,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.1em",
    marginBottom: "6px",
    fontWeight: 700,
  },

  howText: {
    fontSize: "13px",
    color: theme.muted,
    lineHeight: 1.5,
  },

  resultScore: {
    fontSize: "clamp(2.4rem, 8vw, 3.2rem)",
    fontWeight: 700,
    fontFamily: "'Fraunces', serif",
    color: theme.ink,
    margin: "12px 0 4px",
    lineHeight: 1,
  },

  resultSub: {
    fontSize: "13px",
    color: theme.muted,
    marginBottom: "8px",
  },

  resultMsg: {
    fontSize: "13px",
    color: theme.muted,
    lineHeight: 1.65,
    marginBottom: "24px",
  },

  legend: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginBottom: "14px",
    alignItems: "center",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: theme.muted,
  },

  legendDot: (color) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),

  moveBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    border: "1px solid rgba(99,102,241,0.18)",
    background: "rgba(248,250,252,0.96)",
    color: theme.primary,
    fontSize: "14px",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    transition: "background 0.15s ease, opacity 0.15s ease",
  },
};

export function verdictFromScore(score, maxScore) {
  if (score >= maxScore) return "correct";
  if (score > 0) return "partial";
  return "wrong";
}
