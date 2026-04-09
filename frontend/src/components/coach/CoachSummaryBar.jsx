import { SKILL_TREES } from "../../lib/coach/registry";

const S = {
  bar: {
    background: "#f5f5f0",
    border: "1px solid #eee",
    borderRadius: "8px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "18px",
  },
  avatar: { fontSize: "22px", flexShrink: 0 },
  msg: { fontSize: "14px", color: "#1a1a1a", lineHeight: 1.5, flex: 1 },
  focus: {
    fontSize: "11px", fontFamily: "'DM Mono', monospace",
    color: "#888", letterSpacing: "0.06em", textTransform: "uppercase",
    marginTop: "2px",
  },
};

function buildSummaryMessage(trees, seeds, recentGames) {
  if (!trees || trees.length === 0) return "Welcome to Coach Mode. Let's see where you stand.";
  const weakest = [...trees].sort((a, b) => a.totalXP - b.totalXP)[0];
  const newSeeds = seeds?.filter(s => s.status === "new") || [];
  if (newSeeds.length > 0) {
    return `I found ${newSeeds.length} moment${newSeeds.length > 1 ? "s" : ""} from your recent debate worth drilling. Let's work through ${newSeeds.length > 1 ? "them" : "it"}.`;
  }
  if (weakest && weakest.level <= 2) {
    const tree = SKILL_TREES[weakest.treeId] || {};
    return `Your ${tree.name || weakest.treeId} skill is your lowest right now. That's today's focus.`;
  }
  if (recentGames?.length >= 3) return "You've been active lately. Keep the streak going.";
  return "Pick a game below to keep building your skills.";
}

export default function CoachSummaryBar({ trees, seeds, recentGames }) {
  const msg = buildSummaryMessage(trees, seeds, recentGames);
  const newCount = seeds?.filter(s => s.status === "new").length || 0;

  return (
    <div style={S.bar}>
      <span style={S.avatar}>🎓</span>
      <div>
        <div style={S.msg}>{msg}</div>
        {newCount > 0 && (
          <div style={S.focus}>
            {newCount} personalized exercise{newCount > 1 ? "s" : ""} ready
          </div>
        )}
      </div>
    </div>
  );
}
