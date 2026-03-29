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
          marginBottom: "18px",
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.78)" }}>{label}</div>
      <div style={{ fontSize: "20px", lineHeight: 1.2, fontWeight: 800, color: "#fff", marginTop: "6px" }}>{value}</div>
      <div style={{ fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.84)", marginTop: "8px" }}>{detail}</div>
    </>
  );

  const cardStyle = {
    ...sectionCard,
    padding: "18px 18px 16px",
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
              Your next best rep is ready. Jump into training, check your unlocked difficulty pool, or head straight into PvP.
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
          borderRadius: "28px",
          padding: "22px 22px 20px",
          color: "#fff",
          boxShadow: "0 20px 46px rgba(249, 115, 22, 0.22)",
          marginBottom: "18px",
        }}
      >
        <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Recommended</div>
        <div style={{ fontSize: "26px", lineHeight: 1.1, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "8px" }}>
          Continue deliberate training.
        </div>
        <p style={{ ...subheadline, color: "rgba(255,255,255,0.88)", marginBottom: "16px" }}>
          You currently have {strongestDifficulty} prompts unlocked. Start a fresh training run and keep building XP toward your next level.
        </p>
        <button onClick={() => onNavigate("training")} style={{ ...secondaryBtn, background: "#fff", color: "#f97316" }}>
          Go to Training
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Quick Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
          <ActionCard
            icon={Dumbbell}
            label="Training"
            value={`${history.length} runs`}
            detail="Launch a new practice round and earn XP."
            tint="linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)"
            onClick={() => onNavigate("training")}
          />
          <ActionCard
            icon={Target}
            label="Difficulty Pool"
            value={strongestDifficulty}
            detail={`${user.unlockedDifficulties.length} unlocked tier${user.unlockedDifficulties.length === 1 ? "" : "s"} available right now.`}
            tint="linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)"
          />
          <ActionCard
            icon={Swords}
            label="PvP Mode"
            value={activeMatch ? "Live match" : `${matches.length} matches`}
            detail={activeMatch ? "You already have an active PvP debate waiting." : "Find a nearby skill band and report the result after the round."}
            tint="linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
            onClick={() => onNavigate("pvp")}
          />
          <ActionCard
            icon={User}
            label="Profile"
            value={`${user.totalXP} XP`}
            detail="Review history, progress, and account settings."
            tint="linear-gradient(135deg, #0f172a 0%, #334155 100%)"
            onClick={() => onNavigate("profile")}
          />
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "20px 22px", marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={eyebrowSmall}>Recent Activity</div>
            <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px", color: "#111827" }}>Your latest debate reps</div>
          </div>
          <button onClick={() => onNavigate("profile")} style={solidBtn}>
            Open Profile
          </button>
        </div>

        <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
          {!loading && recentHistory.length === 0 && !activeMatch && (
            <>
              <ActivityCard title="Start your first training run" meta="Pick a prompt, choose an opponent, and generate your first coach report." />
              <ActivityCard title="Try PvP after a few reps" meta="Once you’re warm, queue into matchmaking and report the result from the arena screen." />
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

      <div style={{ ...sectionCard, padding: "18px 20px" }}>
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
            <div style={{ fontSize: "15px", lineHeight: 1.7, color: "#475467" }}>
              Use the training screen for prompt selection and sparring setup. There's no separate topics tab in this flow; your available prompt pool is already folded into training.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
