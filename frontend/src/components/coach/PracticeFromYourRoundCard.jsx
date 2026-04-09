import { SKILL_TREES } from "../../lib/coach/registry";

const S = {
  card: {
    background: "#fff8f0",
    border: "1px solid #ffe0b2",
    borderRadius: "10px",
    padding: "16px 18px",
    fontFamily: "'DM Sans', sans-serif",
  },
  eyebrow: {
    fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase",
    color: "#e65100", fontFamily: "'DM Mono', monospace", marginBottom: "8px",
  },
  excerpt: {
    fontSize: "14px", fontStyle: "italic", color: "#1a1a1a",
    lineHeight: 1.65, background: "#fff", border: "1px solid #ffe0b2",
    borderRadius: "6px", padding: "10px 13px", marginBottom: "10px",
  },
  note: { fontSize: "13px", color: "#7a4500", lineHeight: 1.55, marginBottom: "14px" },
  footer: { display: "flex", alignItems: "center", gap: "10px" },
  treeTag: {
    fontSize: "11px", fontFamily: "'DM Mono', monospace",
    color: "#e65100", background: "#fff3e0",
    padding: "3px 9px", borderRadius: "20px", border: "1px solid #ffe0b2",
  },
  btn: {
    marginLeft: "auto", padding: "8px 16px", background: "#e65100",
    color: "#fff", border: "none", borderRadius: "6px",
    fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
};

export default function PracticeFromYourRoundCard({ seed, onPlay }) {
  const tree = SKILL_TREES[seed.skillTreeId] || {};

  return (
    <div style={S.card}>
      <div style={S.eyebrow}>From your last round — {tree.icon} {tree.name}</div>
      <div style={S.excerpt}>"{seed.sourceExcerpt || seed.excerpt}"</div>
      <div style={S.note}>{seed.coachNote}</div>
      <div style={S.footer}>
        <span style={S.treeTag}seed.difficulty || "medium"}</span>
        <button style={S.btn} onClick={() => onPlay(seed)}>Practice this →</button>
      </div>
    </div>
  );
}
