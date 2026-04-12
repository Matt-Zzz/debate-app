import { ArrowRight, Sparkles } from "lucide-react";
import { SKILL_TREES } from "../../lib/coach/registry";
import { eyebrowSmall, sectionCard, theme } from "../../styles/ui";

function formatMiniGameLabel(miniGameId = "") {
  return miniGameId
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export default function CoachSuggestionCard({ rec, onPlay }) {
  const tree = SKILL_TREES[rec.skillTreeId] || {};

  return (
    <div
      style={{
        ...sectionCard,
        padding: "18px 20px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,251,0.94))",
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "16px",
            background: "#eef2ff",
            color: theme.primary,
            display: "grid",
            placeItems: "center",
            fontSize: "19px",
            flexShrink: 0,
          }}
        >
          {tree.icon || "📘"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={eyebrowSmall}>{tree.name || rec.skillTreeId}</div>
          <div
            style={{
              fontSize: "21px",
              lineHeight: 1.08,
              fontWeight: 700,
              fontFamily: "'Fraunces', serif",
              color: theme.ink,
              marginTop: "8px",
            }}
          >
            {rec.miniGameLabel || formatMiniGameLabel(rec.miniGameId)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
        <div
          style={{
            padding: "7px 10px",
            borderRadius: "999px",
            background: "#eef2ff",
            color: theme.primaryDeep,
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          {tree.icon || "📘"} {tree.name || rec.skillTreeId}
        </div>
        {rec.isPersonalized && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 10px",
              borderRadius: "999px",
              background: "#fff7ed",
              color: "#c2410c",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            <Sparkles size={13} />
            From your round
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: "14px",
          color: theme.muted,
          lineHeight: 1.7,
          marginTop: "14px",
        }}
      >
        {rec.reason}
      </div>

      <button
        style={{
          marginTop: "18px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 16px",
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          color: "#fff",
          border: "none",
          borderRadius: "16px",
          fontSize: "14px",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 16px 28px rgba(79, 70, 229, 0.22)",
        }}
        onClick={() => onPlay(rec)}
      >
        Play next
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
