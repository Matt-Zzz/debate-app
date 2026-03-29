import { Dumbbell, Home, Swords, User } from "lucide-react";
import { theme } from "../../styles/ui";

const icons = {
  home: Home,
  training: Dumbbell,
  pvp: Swords,
  profile: User,
};

export default function BottomNav({ screen, onNavigate }) {
  const items = [
    { id: "home", label: "Home" },
    { id: "training", label: "Training" },
    { id: "pvp", label: "PvP" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(255,255,255,0.98)",
        borderTop: "1px solid rgba(99, 102, 241, 0.12)",
        boxShadow: "0 -10px 24px rgba(15, 23, 42, 0.08)",
        zIndex: 30,
        backdropFilter: "blur(14px)",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", padding: "8px 10px 10px" }}>
        {items.map((item) => {
          const active = screen === item.id;
          const Icon = icons[item.id];
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                border: "none",
                background: "transparent",
                borderRadius: "16px",
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                color: active ? theme.primary : "#64748b",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "12px",
                  display: "grid",
                  placeItems: "center",
                  background: active ? "rgba(79, 70, 229, 0.12)" : "transparent",
                }}
              >
                <Icon size={20} />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
