import { difficultyPalette } from "../../styles/ui";

export default function DifficultyChip({ difficulty, size = "md" }) {
  const palette = difficultyPalette(difficulty);
  const padding = size === "sm" ? "5px 9px" : "7px 11px";
  const fontSize = size === "sm" ? "11px" : "12px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding,
        borderRadius: "999px",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize,
        fontWeight: 700,
      }}
    >
      {difficulty}
    </span>
  );
}
