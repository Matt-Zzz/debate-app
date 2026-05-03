// home screen component

import { Dumbbell, Home, Swords, Target, User } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import {
  eyebrow,
  eyebrowSmall,
  heroCard,
  pageWrap,
  sectionCard,
  secondaryBtn,
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
          width: "42px",
          height: "42px",
          borderRadius: "14px",
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.22)",
          color: "#fff",
          marginBottom: "12px",
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.78)" }}>{label}</div>
      <div style={{ fontSize: "18px", lineHeight: 1.2, fontWeight: 800, color: "#fff", marginTop: "4px" }}>{value}</div>
      {!!detail && <div style={{ fontSize: "11px", lineHeight: 1.45, color: "rgba(255,255,255,0.84)", marginTop: "6px" }}>{detail}</div>}
    </>
  );

  const cardStyle = {
    ...sectionCard,
    padding: "14px 14px 12px",
    textAlign: "left",
    background: tint,
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
    <div style={{ ...sectionCard, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#111827" }}>{title}</div>
          <div style={{ fontSize: "12px", color: "#667085", marginTop: "6px" }}>{meta}</div>
        </div>
        {score !== null && score !== undefined && (
          <div
            style={{
              padding: "8px 10px",
              borderRadius: "12px",
              background: "#eef2ff",
              color: "#4338ca",
              fontSize: "12px",
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

  const recentHistory = history.slice(0, 3);
  const activeMatch = matches.find((item) => item.status === "matched" || item.status === "waiting") || null;
  const strongestDifficulty = user.unlockedDifficulties[user.unlockedDifficulties.length - 1] || "Easy";

  return (
    <div style={pageWrap}>
      <div style={{ ...heroCard, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ maxWidth: "480px" }}>
            <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Home Dashboard</div>
            <div style={{ fontSize: "clamp(2rem, 7vw, 3rem)", lineHeight: 0.98, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "10px" }}>
              Welcome back, {user.name}.
            </div>
            <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)" }}>
              Pick Training or PvP and log a rep.
            </p>
          </div>
          <LevelBadge level={user.currentLevel} size="lg" />
        </div>

        <div style={{ marginTop: "18px", background: "rgba(255,255,255,0.12)", borderRadius: "20px", padding: "16px", border: "1px solid rgba(255,255,255,0.16)" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>
            Level {user.currentLevel}: {user.levelName}
          </div>
          <XPProgressBar user={user} showNumbers={!!user.nextLevelXP} />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
            {user.unlockedDifficulties.map((difficulty) => (
              <DifficultyChip key={difficulty} difficulty={difficulty} size="sm" />
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #fb923c 0%, #f97316 45%, #ec4899 100%)",
          borderRadius: "22px",
          padding: "18px 16px",
          color: "#fff",
          boxShadow: "0 20px 46px rgba(249, 115, 22, 0.22)",
          marginBottom: "18px",
        }}
      >
        <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Recommended</div>
        <div style={{ fontSize: "22px", lineHeight: 1.1, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "6px" }}>
          Start a training rep.
        </div>
        <p style={{ ...subheadline, color: "rgba(255,255,255,0.88)", marginBottom: "12px" }}>
          Unlocked tier: {strongestDifficulty}.
        </p>
        <button onClick={() => onNavigate("training")} style={{ ...secondaryBtn, background: "#fff", color: "#f97316" }}>
          Go to Training
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Quick Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
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

      <div style={{ ...sectionCard, padding: "16px 14px", marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={eyebrowSmall}>Recent Activity</div>
            <div style={{ fontSize: "19px", fontWeight: 800, marginTop: "6px", color: "#111827" }}>Latest reps</div>
          </div>
          <button onClick={() => onNavigate("profile")} style={solidBtn}>
            Open Profile
          </button>
        </div>

        <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
          {!loading && recentHistory.length === 0 && !activeMatch && (
            <>
              <ActivityCard title="Start your first run" meta="Open Training and begin." />
              <ActivityCard title="Try PvP next" meta="Queue when you are ready." />
            </>
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

          {loading && <div style={{ fontSize: "13px", color: "#667085" }}>Loading activity…</div>}
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "14px 14px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "14px",
              background: "#eef2ff",
              color: "#4338ca",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Home size={18} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Today&apos;s Focus</div>
            <div style={{ fontSize: "13px", lineHeight: 1.5, color: "#475467" }}>
              Use Training to pick a prompt and opponent.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
