import { House, MessageCircleMore, Target, UsersRound, UserRound } from "lucide-react";
import "./BottomNav.css";

export const NAV_ITEMS = [
  { id: "home", label: "Home", detail: "Your overview, progress and debate topics", Icon: House },
  { id: "training", label: "AI Debate", detail: "Practice a full debate with an AI opponent", Icon: MessageCircleMore },
  { id: "coach", label: "Skills", detail: "Build debate skills with focused drills and coaching", Icon: Target },
  { id: "pvp", label: "Live Debate", detail: "Exchange text arguments with another player", Icon: UsersRound },
  { id: "profile", label: "Profile", detail: "Your history, account and settings", Icon: UserRound },
];

export default function BottomNav({ screen, onNavigate }) {
  return (
    <nav className="app-tabbar" aria-label="Main navigation">
      <div className="app-tabbar__surface">
        {NAV_ITEMS.map(({ id, label, detail, Icon }) => (
          <button key={id} type="button" className="app-tabbar__item"
            aria-label={label}
            aria-current={screen === id ? "page" : undefined}
            aria-describedby={`nav-help-${id}`} title={detail}
            onClick={() => { if (screen !== id) onNavigate(id); }}>
            <span className="app-tabbar__icon"><Icon size={23} strokeWidth={screen === id ? 2.35 : 1.85} aria-hidden="true" /></span>
            <span className="app-tabbar__label">{label}</span>
            <span id={`nav-help-${id}`} className="app-tabbar__help">{detail}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
