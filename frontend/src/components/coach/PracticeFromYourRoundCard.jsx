import { ArrowRight, Quote } from "lucide-react";
import { SKILL_TREES } from "../../lib/coach/registry";
import { eyebrowSmall, sectionCard } from "../../styles/ui";

export default function PracticeFromYourRoundCard({ seed, onPlay }) {
  const tree = SKILL_TREES[seed.skillTreeId] || {};
  const excerpt = seed.sourceExcerpt || seed.excerpt || "";

  return (
    <div
      style={{
        ...sectionCard,
        padding: "18px 20px",
        background:
          "linear-gradient(135deg, rgba(255,247,237,0.98), rgba(255,255,255,0.98) 58%, rgba(252,231,243,0.9))",
        border: "1px solid rgba(249, 115, 22, 0.16)",
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "16px",
            background: "rgba(249,115,22,0.12)",
            color: "#c2410c",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Quote size={18} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ ...eyebrowSmall, color: "#c2410c" }}>
            From your last round
          </div>
          <div
            style={{
              fontSize: "20px",
              lineHeight: 1.08,
              fontWeight: 700,
              fontFamily: "'Fraunces', serif",
              color: "#7c2d12",
              marginTop: "8px",
            }}
          >
            {tree.icon || "📘"} {tree.name || seed.skillTreeId}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "14px",
          padding: "14px 16px",
          borderRadius: "18px",
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(249, 115, 22, 0.14)",
          color: "#7c2d12",
          fontSize: "14px",
          fontStyle: "italic",
          lineHeight: 1.7,
        }}
      >
        "{excerpt}"
      </div>

      <div
        style={{
          fontSize: "14px",
          color: "#9a3412",
          lineHeight: 1.7,
          marginTop: "14px",
        }}
      >
        {seed.coachNote}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 10px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.86)",
            color: "#c2410c",
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "capitalize",
          }}
        >
          {seed.difficulty || "medium"} difficulty
        </span>
        <button
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            background: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "16px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 16px 28px rgba(249, 115, 22, 0.22)",
          }}
          onClick={() => onPlay(seed)}
        >
          Practice this
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
