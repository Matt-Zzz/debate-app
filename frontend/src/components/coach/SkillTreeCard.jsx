import { xpProgressInLevel } from "../../lib/coach/registry";

const S = {
  card: (active) => ({
    background: active ? "#1a1a1a" : "#fafafa",
    border: `1px solid ${active ? "#1a1a1a" : "#e8e8e8"}`,
    borderRadius: "10px",
    padding: "14px 16px",
    cursor: active ? "default" : "pointer",
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  }),
  top: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  icon: {
    fontSize: "20px",
    lineHeight: 1,
  },
  name: (active) => ({
    fontSize: "14px",
    fontWeight: 600,
    color: active ? "#fff" : "#1a1a1a",
  }),
  level: (active) => ({
    marginLeft: "auto",
    fontSize: "11px",
    fontFamily: "'DM Mono', monospace",
    color: active ? "rgba(255,255,255,0.5)" : "#bbb",
  }),
  desc: (active) => ({
    fontSize: "12px",
    color: active ? "rgba(255,255,255,0.75)" : "#666",
    lineHeight: 1.5,
    marginBottom: "10px",
    minHeight: "36px",
  }),
  barBg: (active) => ({
    height: "4px",
    borderRadius: "2px",
    background: active ? "rgba(255,255,255,0.15)" : "#eee",
    overflow: "hidden",
  }),
  barFill: (pct, active) => ({
    height: "100%",
    width: `${pct}%`,
    background: active ? "#fff" : "#1a1a1a",
    borderRadius: "2px",
    transition: "width 0.6s ease",
  }),
  xpRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "4px",
  },
  xpText: (active) => ({
    fontSize: "10px",
    fontFamily: "'DM Mono', monospace",
    color: active ? "rgba(255,255,255,0.4)" : "#ccc",
  }),
};

export default function SkillTreeCard({ tree, active = false, onClick }) {
  if (!tree) return null;

  const { earned, total, pct } = xpProgressInLevel(tree.totalXP ?? 0);

  return (
    <div style={S.card(active)} onClick={onClick}>
      <div style={S.top}>
        <span style={S.icon}>{tree.icon || "📘"}</span>
        <span style={S.name(active)}>{tree.name || "Skill"}</span>
        <span style={S.level(active)}>Lv {tree.level ?? 1}</span>
      </div>

      <div style={S.desc(active)}>{tree.description || ""}</div>

      <div style={S.barBg(active)}>
        <div style={S.barFill(pct, active)} />
      </div>

      {!tree.maxLevel && (
        <div style={S.xpRow}>
          <span style={S.xpText(active)}>
            {earned} / {total} XP
          </span>
          <span style={S.xpText(active)}>
            {tree.xpToNext ?? 0} to next
          </span>
        </div>
      )}
    </div>
  );
}