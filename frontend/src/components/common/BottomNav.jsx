import React from "react";

const navWrap = {
  position: "sticky",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 40,
  background: "#f7f5f5",
  borderTop: "1px solid #e7e1e1",
  padding: "10px 8px 12px",
};

const navGrid = {
  maxWidth: "900px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "4px",
  alignItems: "end",
};

const itemBase = {
  appearance: "none",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  padding: "8px 4px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  color: "#6b7a90",
  fontFamily: "'DM Sans', sans-serif",
};

const activePill = {
  width: "56px",
  height: "56px",
  borderRadius: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(91, 90, 230, 0.12)",
};

const inactivePill = {
  width: "56px",
  height: "56px",
  borderRadius: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
};

const activeLabel = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#5b5ae6",
};

const inactiveLabel = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#6b7a90",
};

function IconStroke({ children, active = false }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#5b5ae6" : "#6b7a90"}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function HomeIcon({ active }) {
  return (
    <IconStroke active={active}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-6h5v6" />
    </IconStroke>
  );
}

function TrainingIcon({ active }) {
  return (
    <IconStroke active={active}>
      <path d="M6 7l2-2" />
      <path d="M16 17l2-2" />
      <path d="M4.5 9.5l5 5" />
      <path d="M14.5 19.5l5-5" />
      <path d="M10 6l8 8" />
      <path d="M7 13l4 4" />
      <path d="M13 7l4-4" />
      <path d="M7 17l-4 4" />
    </IconStroke>
  );
}

function CoachIcon({ active }) {
  return (
    <IconStroke active={active}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M6.5 19c1.1-2.5 3.1-3.8 5.5-3.8s4.4 1.3 5.5 3.8" />
      <path d="M18.2 6.2l1.8-1.8" />
      <path d="M18.2 9.8 20 11.6" />
    </IconStroke>
  );
}

function PvPIcon({ active }) {
  return (
    <IconStroke active={active}>
      <path d="M7 7l10 10" />
      <path d="M17 7 7 17" />
      <path d="M5.5 5.5 8 8" />
      <path d="M16 16l2.5 2.5" />
      <path d="M16 8l2.5-2.5" />
      <path d="M5.5 18.5 8 16" />
    </IconStroke>
  );
}

function ProfileIcon({ active }) {
  return (
    <IconStroke active={active}>
      <circle cx="12" cy="7.5" r="3.2" />
      <path d="M5 19c1.4-3.1 4-4.7 7-4.7s5.6 1.6 7 4.7" />
    </IconStroke>
  );
}

const ITEMS = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "training", label: "Training", Icon: TrainingIcon },
  { id: "coach", label: "Coach", Icon: CoachIcon },
  { id: "pvp", label: "PvP", Icon: PvPIcon },
  { id: "profile", label: "Profile", Icon: ProfileIcon },
];

export default function BottomNav({ screen, onNavigate }) {
  return (
    <nav style={navWrap}>
      <div style={navGrid}>
        {ITEMS.map(({ id, label, Icon }) => {
          const active = screen === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              style={itemBase}
              aria-current={active ? "page" : undefined}
            >
              <div style={active ? activePill : inactivePill}>
                <Icon active={active} />
              </div>
              <div style={active ? activeLabel : inactiveLabel}>{label}</div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}