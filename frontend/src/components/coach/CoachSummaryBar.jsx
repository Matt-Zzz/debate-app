import { Brain, Sparkles, Target } from "lucide-react";
import { SKILL_TREES } from "../../lib/coach/registry";
import { eyebrowSmall, sectionCard, theme } from "../../styles/ui";

function buildSummaryMessage(trees, seeds, recentGames) {
  if (!trees || trees.length === 0) {
    return "Welcome to Coach Mode. Your training map will fill in as soon as your debate history loads.";
  }

  const weakest = [...trees].sort((a, b) => a.totalXP - b.totalXP)[0];
  const newSeeds = seeds?.filter((seed) => seed.status === "new") || [];

  if (newSeeds.length > 0) {
    return `I found ${newSeeds.length} moment${newSeeds.length > 1 ? "s" : ""} from your recent debate worth drilling. Start there before you widen the training plan.`;
  }

  if (weakest && weakest.level <= 2) {
    const tree = SKILL_TREES[weakest.treeId] || {};
    return `Your ${tree.name || weakest.treeId} tree is still the softest spot right now. That is the cleanest place to invest your next rep.`;
  }

  if (recentGames?.length >= 3) {
    return "You already have recent volume. Keep the streak useful by rotating into the tree that still lags behind.";
  }

  return "Pick a game below and keep building the slow, deliberate reps that actually move the skill map.";
}

export default function CoachSummaryBar({ trees, seeds, recentGames }) {
  const msg = buildSummaryMessage(trees, seeds, recentGames);
  const newCount = seeds?.filter(s => s.status === "new").length || 0;
  const weakest = [...(trees || [])].sort((a, b) => a.totalXP - b.totalXP)[0];

  return (
    <div
      style={{
        ...sectionCard,
        marginBottom: "18px",
        padding: "18px 20px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,251,0.94))",
      }}
    >
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "16px",
            background: "#eef2ff",
            color: theme.primary,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Brain size={20} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={eyebrowSmall}>Coach Briefing</div>
          <div
            style={{
              fontSize: "15px",
              color: theme.ink,
              lineHeight: 1.65,
              marginTop: "8px",
            }}
          >
            {msg}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
            {newCount > 0 && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  borderRadius: "999px",
                  background: "#fff7ed",
                  color: "#c2410c",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                <Sparkles size={14} />
                {newCount} personalized exercise{newCount === 1 ? "" : "s"} ready
              </div>
            )}

            {weakest && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  borderRadius: "999px",
                  background: "#eef2ff",
                  color: theme.primaryDeep,
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                <Target size={14} />
                Focus on {SKILL_TREES[weakest.treeId]?.name || weakest.treeId}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
