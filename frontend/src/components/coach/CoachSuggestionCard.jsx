import { SKILL_TREES } from "../../lib/coach/registry";

const S = {
  card: {
    background: "#fff",
    border: "1px solid #e8e8e8",
    borderRadius: "10px",
    padding: "16px 18px",
    fontFamily: "'DM Sans', sans-serif",
  },
  top: { display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "8px" },
  iconWrap: {
    width: "36px", height: "36px", borderRadius: "8px",
    background: "#f5f5f0", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "18px", flexShrink: 0,
  },
  label: { fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#bbb", fontFamily: "'DM Mono', monospace", marginBottom: "2px" },
  title: { fontSize: "14px", fontWeight: 600, color: "#1a1a1a", lineHeight: 1.35 },
  reason: { fontSize: "13px", color: "#666", lineHeight: 1.55, marginBottom: "14px" },
  personalBadge: {
    display: "inline-block", padding: "2px 8px", borderRadius: "20px",
    background: "#fff3e0", border: "1px solid #ffe0b2",
    color: "#e65100", fontSize: "10px", fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.06em", marginBottom: "10px",
  },
  btn: {
    padding: "9px 18px", background: "#1a1a1a", color: "#fff",
    border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
};

export default function CoachSuggestionCard({ rec, onPlay }) {
  const tree = SKILL_TREES[rec.skillTreeId] || {};

  return (
    <div style={S.card}>
      <div style={S.top}>
        <div style={S.iconWrap}>{tree.icon || "📘"}</div>
        <divtyle={{ flex: 1 }}>
          <div style={S.label}>{tree.name || rec.skillTreeId}</div>
          <div style={S.title}>{rec.miniGameLabel || rec.miniGameId}</div>
        </div>
      </div>
      {rec.isPersonalized && (
        <div style={S.personalBadge}>FROM YOUR ROUND</div>
      )}
      <div style={S.reason}>{rec.reason}</div>
      <button style={S.btn} onClick={() => onPlay(rec)}>
        Play →
      </button>
    </div>
  );
}
