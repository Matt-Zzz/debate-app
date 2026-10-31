import { theme, xpProgressForUser } from "../../styles/ui";

export default function XPProgressBar({ user, showNumbers = true, label = "XP Progress", inverted = false }) {
  const { current, required, percentage } = xpProgressForUser(user);
  const isMax = !user?.nextLevelXP;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "10px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: inverted ? "#fff" : "#1f2937" }}>{label}</span>
        {showNumbers && (
          <span style={{ fontSize: "12px", color: inverted ? "rgba(255,255,255,0.88)" : theme.muted }}>
            {isMax ? "Max level reached" : `${Math.max(0, current)} / ${required} XP`}
          </span>
        )}
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100} style={{ width: "100%", height: "8px", background: inverted ? "rgba(255,255,255,0.24)" : "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, percentage))}%`,
            height: "100%",
            background: inverted ? "#fff" : "linear-gradient(90deg, #6251bd, #9a88e3)",
            borderRadius: "999px",
            transition: "width 0.35s ease",
          }}
        />
      </div>
    </div>
  );
}
