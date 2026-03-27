import { theme, xpProgressForUser } from "../../styles/ui";

export default function XPProgressBar({ user, showNumbers = true, label = "XP Progress" }) {
  const { current, required, percentage } = xpProgressForUser(user);
  const isMax = !user?.nextLevelXP;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "10px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1f2937" }}>{label}</span>
        {showNumbers && (
          <span style={{ fontSize: "12px", color: theme.muted }}>
            {isMax ? "Max level reached" : `${Math.max(0, current)} / ${required} XP`}
          </span>
        )}
      </div>
      <div style={{ width: "100%", height: "12px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, percentage))}%`,
            height: "100%",
            background: "linear-gradient(90deg, #4f46e5 0%, #8b5cf6 50%, #ec4899 100%)",
            borderRadius: "999px",
            transition: "width 0.35s ease",
          }}
        />
      </div>
    </div>
  );
}
