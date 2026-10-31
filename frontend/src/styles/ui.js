import { LEVEL_NAMES, LEVEL_XP_THRESHOLDS } from "../constants/debate";

export const theme = {
  bg: "#f2f2f7",
  card: "rgba(255,255,255,0.92)",
  cardStrong: "#ffffff",
  ink: "#1c1c1e",
  muted: "#6e6e73",
  border: "rgba(60, 60, 67, 0.12)",
  borderStrong: "rgba(60, 60, 67, 0.18)",
  shadow: "0 18px 42px rgba(28, 28, 30, 0.10)",
  shadowSoft: "0 8px 24px rgba(28, 28, 30, 0.07)",
  primary: "#5856d6",
  primaryDeep: "#4846c7",
  secondary: "#af52de",
  accent: "#ff2d55",
  success: "#34c759",
  warning: "#ff9500",
  danger: "#ff3b30",
};

export const appSurface = {
  minHeight: "100dvh",
  background:
    "radial-gradient(circle at top left, rgba(88,86,214,0.10), transparent 28%), radial-gradient(circle at top right, rgba(175,82,222,0.08), transparent 24%), linear-gradient(180deg, #f9f9fb 0%, #f2f2f7 100%)",
  color: theme.ink,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
};

export const loadingSurface = {
  ...appSurface,
  display: "grid",
  placeItems: "center",
  color: theme.muted,
  fontSize: "14px",
};

export const pageWrap = {
  maxWidth: "680px",
  margin: "0 auto",
  width: "100%",
  padding: "calc(14px + env(safe-area-inset-top, 0px)) 16px calc(124px + env(safe-area-inset-bottom, 0px))",
};

export const sectionCard = {
  background: theme.card,
  border: `1px solid ${theme.border}`,
  borderRadius: "22px",
  boxShadow: theme.shadowSoft,
  backdropFilter: "saturate(160%) blur(18px)",
  WebkitBackdropFilter: "saturate(160%) blur(18px)",
};

export const softCard = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(244,247,251,0.9))",
  border: `1px solid ${theme.border}`,
  borderRadius: "22px",
  boxShadow: theme.shadowSoft,
};

export const heroCard = {
  background: "linear-gradient(135deg, #5947ba 0%, #7964ce 100%)",
  color: "#fff",
  borderRadius: "28px",
  padding: "20px",
  boxShadow: "0 12px 28px rgba(71, 54, 139, 0.16)",
  overflow: "hidden",
};

export const eyebrow = {
  fontSize: "11px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(15, 23, 42, 0.48)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
  fontWeight: 700,
};

export const eyebrowSmall = {
  fontSize: "10px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(15, 23, 42, 0.48)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
  fontWeight: 700,
};

export const headline = {
  fontSize: "clamp(1.7rem, 5vw, 2.5rem)",
  lineHeight: 1.04,
  fontWeight: 700,
  color: theme.ink,
  margin: "8px 0 0",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
  letterSpacing: "-0.035em",
};

export const subheadline = {
  fontSize: "12px",
  color: theme.muted,
  lineHeight: 1.45,
  marginTop: "6px",
};

export const solidBtn = {
  minHeight: "44px",
  padding: "11px 16px",
  background: "linear-gradient(135deg, #5856d6 0%, #6f67df 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "14px",
  fontSize: "15px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
  letterSpacing: "0.01em",
  boxShadow: "0 16px 28px rgba(79, 70, 229, 0.22)",
};

export const secondaryBtn = {
  minHeight: "44px",
  padding: "11px 16px",
  background: "#fff",
  color: theme.primary,
  border: `1px solid rgba(79, 70, 229, 0.18)`,
  borderRadius: "14px",
  fontSize: "15px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
  letterSpacing: "0.01em",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
};

export const ghostBtn = {
  minHeight: "44px",
  padding: "11px 16px",
  background: "rgba(255,255,255,0.72)",
  color: theme.ink,
  border: `1px solid ${theme.border}`,
  borderRadius: "16px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
};

export const cardBtn = (active) => ({
  padding: "16px",
  background: active
    ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
    : "rgba(255,255,255,0.94)",
  color: active ? "#fff" : theme.ink,
  border: `1px solid ${active ? "rgba(79,70,229,0.16)" : theme.border}`,
  borderRadius: "18px",
  cursor: "pointer",
  textAlign: "left",
  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease",
  width: "100%",
  boxShadow: active ? "0 20px 35px rgba(79, 70, 229, 0.24)" : theme.shadowSoft,
});

export const inputStyle = {
  width: "100%",
  minHeight: "44px",
  padding: "11px 13px",
  border: `1px solid rgba(99, 102, 241, 0.16)`,
  borderRadius: "14px",
  fontSize: "16px",
  background: "rgba(255,255,255,0.92)",
  boxSizing: "border-box",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
  color: theme.ink,
};

export const textareaStyle = {
  ...inputStyle,
  minHeight: "96px",
  lineHeight: 1.55,
  resize: "vertical",
};

export const tabStyle = (active, done) => ({
  minHeight: "44px",
  padding: "10px 16px",
  background: active ? "#fff" : "transparent",
  border: "none",
  borderRadius: "14px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 700,
  color: active ? theme.ink : done ? "#374151" : "#98a2b3",
  boxShadow: active ? "0 10px 22px rgba(15, 23, 42, 0.08)" : "none",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
});

export const pill = (background, color = theme.ink) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 11px",
  borderRadius: "999px",
  background,
  color,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.02em",
});

export const levelPalette = (level) => {
  const palettes = {
    1: { bg: "#eef2ff", border: "#c7d2fe", color: "#4338ca", icon: "◇" },
    2: { bg: "#e0f2fe", border: "#7dd3fc", color: "#0369a1", icon: "✦" },
    3: { bg: "#f3e8ff", border: "#d8b4fe", color: "#7e22ce", icon: "◆" },
    4: { bg: "#fff7ed", border: "#fdba74", color: "#c2410c", icon: "▲" },
    5: { bg: "#fef3c7", border: "#fcd34d", color: "#a16207", icon: "★" },
  };
  return palettes[level] || palettes[1];
};

export const difficultyPalette = (difficulty) => {
  const palettes = {
    Easy: { bg: "#dcfce7", border: "#86efac", color: "#166534" },
    Medium: { bg: "#fef3c7", border: "#fcd34d", color: "#a16207" },
    Hard: { bg: "#fee2e2", border: "#fca5a5", color: "#b91c1c" },
  };
  return palettes[difficulty] || palettes.Easy;
};

export function xpProgressForUser(user) {
  if (!user) {
    return { current: 0, required: 0, percentage: 0, floor: 0 };
  }

  const currentLevel = Number(user.currentLevel || 1);
  const floor = LEVEL_XP_THRESHOLDS[currentLevel] || 0;
  const nextThreshold = user.nextLevelXP || floor;
  const span = Math.max(1, nextThreshold - floor);
  const current = Math.max(0, Number(user.totalXP || 0) - floor);
  const required = currentLevel >= 5 ? current : span;
  const percentage = currentLevel >= 5 ? 100 : Math.max(0, Math.min(100, (current / span) * 100));
  return { current, required, percentage, floor };
}

export function levelLabel(level) {
  return LEVEL_NAMES[level] || LEVEL_NAMES[1];
}

export const baseStyles = `
  * { box-sizing: border-box; }
  :root { color-scheme: light; }
  html, body, #root { min-height: 100%; width: 100%; }
  html { background: #f2f2f7; }
  body {
    margin: 0;
    min-height: 100dvh;
    overflow-x: hidden;
    background: #f2f2f7;
    color: #1c1c1e;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
    overscroll-behavior-y: none;
  }
  textarea, input, button, select {
    font: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  button, [role='button'] { touch-action: manipulation; }
  button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
    outline: 3px solid rgba(0, 122, 255, 0.26);
    outline-offset: 2px;
  }
  textarea { outline: none !important; }
  textarea:focus {
    border-color: rgba(79, 70, 229, 0.55) !important;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.10);
  }
  input { outline: none !important; }
  input:focus {
    border-color: rgba(79, 70, 229, 0.55) !important;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.10);
  }
  button { transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease; }
  @media (hover: hover) and (pointer: fine) {
    button:hover { transform: translateY(-1px); }
  }
  button:active { transform: scale(0.98); opacity: 0.88; }
  button:disabled { transform: none !important; box-shadow: none !important; cursor: not-allowed; }
  details summary { list-style: none; }
  details summary::-webkit-details-marker { display: none; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.7); border-radius: 999px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes mic-pulse { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.6);opacity:0} }
  .stream-cursor::after { content:"▎"; animation:blink 1s infinite; margin-left:1px; font-size:.85em; color:#818cf8; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
