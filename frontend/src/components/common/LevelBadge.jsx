import { levelLabel, levelPalette } from "../../styles/ui";

export default function LevelBadge({ level, size = "md", showLabel = true }) {
  const palette = levelPalette(level);
  const sizes = {
    sm: { wrap: 40, icon: 16, text: "12px" },
    md: { wrap: 54, icon: 20, text: "13px" },
    lg: { wrap: 84, icon: 30, text: "14px" },
  };
  const scale = sizes[size] || sizes.md;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          width: `${scale.wrap}px`,
          height: `${scale.wrap}px`,
          borderRadius: "999px",
          background: palette.bg,
          border: `2px solid ${palette.border}`,
          color: palette.color,
          display: "grid",
          placeItems: "center",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
          fontSize: `${scale.icon}px`,
          fontWeight: 800,
        }}
      >
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: `${Math.max(8, scale.icon * 0.42)}px`, letterSpacing: "0.08em", opacity: 0.72 }}>
            LV
          </span>
          <span style={{ fontSize: `${scale.icon}px`, marginTop: "2px" }}>{level}</span>
        </span>
      </div>
      {showLabel && (
        <div style={{ fontSize: scale.text, fontWeight: 700, color: "#1f2937" }}>
          {levelLabel(level)}
        </div>
      )}
    </div>
  );
}
