import { theme } from "../../styles/ui";

function NavIcon({ active, children }) {
  return (
    <div
      style={{
        width: "34px",
        height: "34px",
        borderRadius: "12px",
        display: "grid",
        placeItems: "center",
        background: active ? "rgba(79, 70, 229, 0.12)" : "transparent",
        color: active ? theme.primary : "#64748b",
      }}
    >
      {children}
    </div>
  );
}

function SessionsIcon({ active }) {
  return (
    <NavIcon active={active}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="6" rx="2" />
        <rect x="3" y="14" width="18" height="7" rx="2" />
      </svg>
    </NavIcon>
  );
}

function PvPIcon({ active }) {
  return (
    <NavIcon active={active}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 5l5 5" />
        <path d="M4 20l6-6" />
        <path d="M9 5l10 10" />
        <path d="M15 14l5 5" />
        <path d="M4 4l5 5" />
      </svg>
    </NavIcon>
  );
}

function ProfileIcon({ active }) {
  return (
    <NavIcon active={active}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.5-3 4.2-4.5 7-4.5S17.5 17 19 20" />
      </svg>
    </NavIcon>
  );
}

const icons = {
  setup: SessionsIcon,
  pvp: PvPIcon,
  profile: ProfileIcon,
};

export default function BottomNav({ screen, onNavigate }) {
  const items = [
    { id: "setup", label: "Sessions" },
    { id: "pvp", label: "PvP" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        left: "50%",
        bottom: "18px",
        transform: "translateX(-50%)",
        width: "min(720px, calc(100% - 24px))",
        background: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(99, 102, 241, 0.14)",
        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.14)",
        borderRadius: "24px",
        padding: "10px",
        zIndex: 30,
        backdropFilter: "blur(14px)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {items.map((item) => {
          const active = screen === item.id;
          const Icon = icons[item.id];
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                border: "none",
                background: active ? "rgba(79, 70, 229, 0.08)" : "transparent",
                borderRadius: "18px",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                color: active ? theme.primary : "#64748b",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Icon active={active} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
