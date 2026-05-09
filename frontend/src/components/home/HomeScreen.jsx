// home screen component

import { Dumbbell, Swords, Target, User } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import {
  eyebrow,
  eyebrowSmall,
  heroCard,
  pageWrap,
  sectionCard,
  solidBtn,
  subheadline,
} from "../../styles/ui";
import DifficultyChip from "../common/DifficultyChip";
import LevelBadge from "../common/LevelBadge";
import XPProgressBar from "../common/XPProgressBar";

function ActionCard({ icon: Icon, label, value, detail, tint, onClick }) {
  const content = (
    <>
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "11px",
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.22)",
          color: "#fff",
          marginBottom: "8px",
        }}
      >
        <Icon size={16} />
      </div>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.82)" }}>{label}</div>
      <div style={{ fontSize: "15px", lineHeight: 1.2, fontWeight: 800, color: "#fff", marginTop: "2px" }}>{value}</div>
      {!!detail && <div style={{ fontSize: "10px", lineHeight: 1.35, color: "rgba(255,255,255,0.84)", marginTop: "4px" }}>{detail}</div>}
    </>
  );

  const cardStyle = {
    ...sectionCard,
    padding: "10px 10px 9px",
    textAlign: "left",
    background: tint,
    minHeight: "112px",
  };

  if (!onClick) {
    return <div style={cardStyle}>{content}</div>;
  }

  return (
    <button onClick={onClick} style={{ ...cardStyle, border: "none", cursor: "pointer" }}>
      {content}
    </button>
  );
}

function ActivityCard({ title, meta, score }) {
  return (
    <div style={{ ...sectionCard, padding: "11px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>{title}</div>
          <div style={{ fontSize: "11px", color: "#667085", marginTop: "4px", lineHeight: 1.45 }}>{meta}</div>
        </div>
        {score !== null && score !== undefined && (
          <div
            style={{
              padding: "6px 8px",
              borderRadius: "10px",
              background: "#eef2ff",
              color: "#4338ca",
              fontSize: "11px",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {score}/100
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label, value, tint }) {
  return (
    <div
      style={{
        background: tint,
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.20)",
        padding: "8px",
      }}
    >
      <div style={{ fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.78)", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", marginTop: "3px", color: "#fff", fontWeight: 800 }}>
        {value}
      </div>
    </div>
  );
}

export default function HomeScreen({ user, onNavigate }) {
  const [history, setHistory] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      apiFetch("/profile/history").catch(() => []),
      apiFetch("/pvp/sessions").catch(() => []),
    ])
      .then(([nextHistory, nextMatches]) => {
        if (!active) return;
        setHistory(Array.isArray(nextHistory) ? nextHistory : []);
        setMatches(Array.isArray(nextMatches) ? nextMatches : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const recentHistory = history.slice(0, 2);
  const activeMatch = matches.find((item) => item.status === "matched" || item.status === "waiting") || null;
  const strongestDifficulty = user.unlockedDifficulties[user.unlockedDifficulties.length - 1] || "Easy";

  return (
    <div style={pageWrap}>
      <div style={{ ...heroCard, marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div style={{ maxWidth: "460px" }}>
            <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Home Dashboard</div>
            <div style={{ fontSize: "clamp(1.55rem, 6vw, 2.4rem)", lineHeight: 1.02, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "8px" }}>
              Welcome back, {user.name}.
            </div>
            <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)" }}>
              Training tier unlocked: {strongestDifficulty}.
            </p>
          </div>
          <LevelBadge level={user.currentLevel} size="md" showLabel={false} />
        </div>

        <div style={{ marginTop: "12px", background: "rgba(255,255,255,0.12)", borderRadius: "14px", padding: "12px", border: "1px solid rgba(255,255,255,0.16)" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
            Level {user.currentLevel}: {user.levelName}
          </div>
          <XPProgressBar user={user} showNumbers={!!user.nextLevelXP} />
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
            {user.unlockedDifficulties.map((difficulty) => (
              <DifficultyChip key={difficulty} difficulty={difficulty} size="sm" />
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", marginTop: "10px" }}>
          <SummaryPill label="Runs" value={history.length} tint="rgba(59, 130, 246, 0.26)" />
          <SummaryPill label="PvP" value={matches.length} tint="rgba(236, 72, 153, 0.26)" />
          <SummaryPill label="XP" value={user.totalXP} tint="rgba(16, 185, 129, 0.26)" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
          <button onClick={() => onNavigate("training")} style={{ ...solidBtn, background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", boxShadow: "0 10px 22px rgba(234, 88, 12, 0.24)" }}>
            Start Training
          </button>
          <button onClick={() => onNavigate("pvp")} style={{ ...solidBtn, background: "linear-gradient(135deg, #475569 0%, #334155 100%)", boxShadow: "0 10px 22px rgba(51, 65, 85, 0.24)" }}>
            Open PvP
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Quick Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
          <ActionCard
            icon={Dumbbell}
            label="Training"
            value={`${history.length} runs`}
            detail="Start now"
            tint="linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)"
            onClick={() => onNavigate("training")}
          />
          <ActionCard
            icon={Target}
            label="Difficulty Pool"
            value={strongestDifficulty}
            detail={`${user.unlockedDifficulties.length} tier${user.unlockedDifficulties.length === 1 ? "" : "s"} unlocked`}
            tint="linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)"
          />
          <ActionCard
            icon={Swords}
            label="PvP Mode"
            value={activeMatch ? "Live match" : `${matches.length} matches`}
            detail={activeMatch ? "Match waiting" : "Queue a match"}
            tint="linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
            onClick={() => onNavigate("pvp")}
          />
          <ActionCard
            icon={User}
            label="Profile"
            value={`${user.totalXP} XP`}
            detail="View progress"
            tint="linear-gradient(135deg, #0f172a 0%, #334155 100%)"
            onClick={() => onNavigate("profile")}
          />
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "12px", marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={eyebrowSmall}>Recent Activity</div>
            <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "4px", color: "#111827" }}>Latest reps</div>
          </div>
          <button onClick={() => onNavigate("profile")} style={{ ...solidBtn, padding: "8px 11px", fontSize: "11px" }}>
            Open Profile
          </button>
        </div>

        <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
          {!loading && recentHistory.length === 0 && !activeMatch && (
            <ActivityCard title="Start your first run" meta="Open Training or queue a PvP match." />
          )}

          {activeMatch && (
            <ActivityCard
              title={activeMatch.topicTitle || "PvP match in progress"}
              meta={`PvP ${activeMatch.status === "matched" ? "match ready" : "matchmaking in progress"}`}
            />
          )}

          {recentHistory.map((item) => (
            <ActivityCard
              key={item.id}
              title={item.topicTitle}
              meta={`${item.characterName} · Side ${item.side} · ${new Date(item.createdAt).toLocaleString()}`}
              score={item.rubric?.total ?? null}
            />
          ))}

          {loading && <div style={{ fontSize: "12px", color: "#667085" }}>Loading activity…</div>}
        </div>
      </div>
    </div>
  );
}
