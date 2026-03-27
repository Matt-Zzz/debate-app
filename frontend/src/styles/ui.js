import { LEVEL_NAMES, LEVEL_XP_THRESHOLDS } from "../constants/debate";

export const theme = {
  bg: "#f4f7fb",
  card: "rgba(255,255,255,0.94)",
  cardStrong: "#ffffff",
  ink: "#111827",
  muted: "#667085",
  border: "rgba(99, 102, 241, 0.12)",
  borderStrong: "rgba(15, 23, 42, 0.1)",
  shadow: "0 20px 50px rgba(15, 23, 42, 0.10)",
  shadowSoft: "0 12px 28px rgba(15, 23, 42, 0.08)",
  primary: "#4f46e5",
  primaryDeep: "#4338ca",
  secondary: "#8b5cf6",
  accent: "#ec4899",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
};

export const appSurface = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(129,140,248,0.12), transparent 28%), radial-gradient(circle at top right, rgba(236,72,153,0.10), transparent 24%), linear-gradient(180deg, #f8faff 0%, #f4f7fb 100%)",
  color: theme.ink,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export const loadingSurface = {
  ...appSurface,
  display: "grid",
  placeItems: "center",
  color: theme.muted,
  fontSize: "14px",
};

export const pageWrap = {
  maxWidth: "760px",
  margin: "0 auto",
  padding: "24px 20px 110px",
};

export const sectionCard = {
  background: theme.card,
  border: `1px solid ${theme.border}`,
  borderRadius: "24px",
  boxShadow: theme.shadowSoft,
  backdropFilter: "blur(10px)",
};

export const softCard = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(244,247,251,0.9))",
  border: `1px solid ${theme.border}`,
  borderRadius: "22px",
  boxShadow: theme.shadowSoft,
};

export const heroCard = {
  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #ec4899 100%)",
  color: "#fff",
  borderRadius: "30px",
  padding: "28px 24px",
  boxShadow: "0 28px 60px rgba(79, 70, 229, 0.28)",
};

export const eyebrow = {
  fontSize: "11px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(15, 23, 42, 0.48)",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
};

export const eyebrowSmall = {
  fontSize: "10px",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(15, 23, 42, 0.48)",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
};

export const headline = {
  fontSize: "clamp(2rem, 5vw, 2.8rem)",
  lineHeight: 1.04,
  fontWeight: 700,
  color: theme.ink,
  margin: "8px 0 0",
  fontFamily: "'Fraunces', serif",
};

export const subheadline = {
  fontSize: "14px",
  color: theme.muted,
  lineHeight: 1.7,
  marginTop: "10px",
};

export const solidBtn = {
  padding: "13px 22px",
  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "16px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  letterSpacing: "0.01em",
  boxShadow: "0 16px 28px rgba(79, 70, 229, 0.22)",
};

export const secondaryBtn = {
  padding: "13px 22px",
  background: "#fff",
  color: theme.primary,
  border: `1px solid rgba(79, 70, 229, 0.18)`,
  borderRadius: "16px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  letterSpacing: "0.01em",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
};

export const ghostBtn = {
  padding: "12px 18px",
  background: "rgba(255,255,255,0.72)",
  color: theme.ink,
  border: `1px solid ${theme.border}`,
  borderRadius: "16px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export const cardBtn = (active) => ({
  padding: "18px 20px",
  background: active
    ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
    : "rgba(255,255,255,0.94)",
  color: active ? "#fff" : theme.ink,
  border: `1px solid ${active ? "rgba(79,70,229,0.16)" : theme.border}`,
  borderRadius: "22px",
  cursor: "pointer",
  textAlign: "left",
  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease",
  width: "100%",
  boxShadow: active ? "0 20px 35px rgba(79, 70, 229, 0.24)" : theme.shadowSoft,
});

export const inputStyle = {
  width: "100%",
  padding: "13px 15px",
  border: `1px solid rgba(99, 102, 241, 0.16)`,
  borderRadius: "16px",
  fontSize: "14px",
  background: "rgba(248,250,252,0.96)",
  boxSizing: "border-box",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: theme.ink,
};

export const textareaStyle = {
  ...inputStyle,
  minHeight: "110px",
  lineHeight: 1.65,
  resize: "vertical",
};

export const tabStyle = (active, done) => ({
  padding: "10px 16px",
  background: active ? "#fff" : "transparent",
  border: "none",
  borderRadius: "14px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 700,
  color: active ? theme.ink : done ? "#374151" : "#98a2b3",
  boxShadow: active ? "0 10px 22px rgba(15, 23, 42, 0.08)" : "none",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
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
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  html, body, #root { min-height: 100%; }
  body {
    margin: 0;
    background: #f4f7fb;
    color: #111827;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  textarea, input, button, select { font: inherit; }
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
  button { transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease; }
  button:hover { transform: translateY(-1px); }
  button:active { transform: translateY(0); }
  button:disabled { transform: none !important; box-shadow: none !important; cursor: not-allowed; }
  details summary { list-style: none; }
  details summary::-webkit-details-marker { display: none; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.7); border-radius: 999px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes mic-pulse { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.6);opacity:0} }
  .stream-cursor::after { content:"▎"; animation:blink 1s infinite; margin-left:1px; font-size:.85em; color:#818cf8; }
`;
