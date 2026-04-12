import { xpProgressInLevel } from "../../lib/coach/registry";
import { theme } from "../../styles/ui";

const S = {
  card: (active) => ({
    width: "100%",
    padding: "18px 18px 16px",
    background: active
      ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,251,0.94))",
    border: `1px solid ${active ? "rgba(79,70,229,0.16)" : theme.border}`,
    borderRadius: "22px",
    cursor: "pointer",
    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: active
      ? "0 20px 35px rgba(79, 70, 229, 0.24)"
      : "0 12px 28px rgba(15, 23, 42, 0.08)",
    textAlign: "left",
  }),
  top: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  iconWrap: (active) => ({
    width: "42px",
    height: "42px",
    borderRadius: "15px",
    background: active ? "rgba(255,255,255,0.16)" : "#eef2ff",
    color: active ? "#fff" : theme.primary,
    display: "grid",
    placeItems: "center",
    fontSize: "20px",
    flexShrink: 0,
  }),
  titleBlock: {
    minWidth: 0,
  },
  name: (active) => ({
    fontSize: "16px",
    fontWeight: 800,
    color: active ? "#fff" : "#1a1a1a",
  }),
  level: (active) => ({
    marginLeft: "auto",
    fontSize: "11px",
    fontFamily: "'JetBrains Mono', monospace",
    color: active ? "#fff" : theme.primary,
    background: active ? "rgba(255,255,255,0.14)" : "#eef2ff",
    padding: "7px 10px",
    borderRadius: "999px",
    fontWeight: 700,
  }),
  desc: (active) => ({
    fontSize: "13px",
    color: active ? "rgba(255,255,255,0.86)" : "#667085",
    lineHeight: 1.6,
    marginBottom: "14px",
    minHeight: "42px",
  }),
  barBg: (active) => ({
    height: "8px",
    borderRadius: "999px",
    background: active ? "rgba(255,255,255,0.18)" : "rgba(79,70,229,0.10)",
    overflow: "hidden",
  }),
  barFill: (pct, active) => ({
    height: "100%",
    width: `${pct}%`,
    background: active ? "#fff" : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    borderRadius: "999px",
    transition: "width 0.6s ease",
  }),
  xpRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "8px",
  },
  xpText: (active) => ({
    fontSize: "11px",
    fontFamily: "'JetBrains Mono', monospace",
    color: active ? "rgba(255,255,255,0.76)" : "#98a2b3",
  }),
};

export default function SkillTreeCard({ tree, active = false, onClick }) {
  if (!tree) return null;

  const { earned, total, pct } = xpProgressInLevel(tree.totalXP ?? 0);

  return (
    <button
      type="button"
      style={S.card(active)}
      onClick={onClick}
      aria-pressed={active}
    >
      <div style={S.top}>
        <span style={S.iconWrap(active)}>{tree.icon || "📘"}</span>
        <span style={S.titleBlock}>
          <span style={S.name(active)}>{tree.name || "Skill"}</span>
        </span>
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
    </button>
  );
}
