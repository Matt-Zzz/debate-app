import { Flame, Sparkles, Target, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import CoachSummaryBar from "./CoachSummaryBar";
import CoachSuggestionCard from "./CoachSuggestionCard";
import PracticeFromYourRoundCard from "./PracticeFromYourRoundCard";
import SkillTreeCard from "./SkillTreeCard";
import { SKILL_TREES } from "../../lib/coach/registry";
import { apiFetch } from "../../lib/api";
import { LEVEL_UP_MESSAGES, pickEncouragement } from "../../lib/coach/uiText";

// Mini-game components — add imports here as each game is wired
import ClashGame from "../minigames/ClashGame";
import FallacyHunt from "../minigames/FallacyHunt";
import SpeechPolish from "../minigames/SpeechPolish";

import {
  eyebrow,
  eyebrowSmall,
  headline,
  heroCard,
  pageWrap,
  secondaryBtn,
  sectionCard,
  solidBtn,
  subheadline,
  theme,
} from "../../styles/ui";

// ── Local style constants ─────────────────────────────────────────────────────

const heroActionBtn = {
  ...secondaryBtn,
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.16)",
  color: "#fff",
  boxShadow: "none",
};

const sectionTitle = {
  fontSize: "24px",
  lineHeight: 1.05,
  fontWeight: 700,
  fontFamily: "'Fraunces', serif",
  color: theme.ink,
  marginTop: "8px",
};

const heroStatGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginTop: "20px",
};

const skillGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const cardGrid = {
  display: "grid",
  gap: "12px",
};

const detailCard = {
  marginTop: "16px",
  padding: "18px 20px",
  borderRadius: "22px",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,251,0.96))",
  border: `1px solid ${theme.border}`,
  boxShadow: theme.shadowSoft,
};

const recentRow = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "14px 16px",
  borderRadius: "18px",
  background: "rgba(248,250,252,0.94)",
  border: `1px solid ${theme.border}`,
};

const emptyCard = {
  ...sectionCard,
  padding: "20px 22px",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,247,251,0.92))",
};

const Skeleton = ({ h = "60px" }) => (
  <div
    style={{
      height: h,
      borderRadius: "18px",
      background: "linear-gradient(90deg,#f0f0f0 25%,#e4e4e4 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }}
  />
);

// ── Utility helpers ───────────────────────────────────────────────────────────

function formatMiniGameLabel(miniGameId = "") {
  return miniGameId
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function getWeakestTree(trees) {
  if (!Array.isArray(trees) || trees.length === 0) return null;
  return [...trees].sort(
    (l, r) =>
      (l.level ?? 1) - (r.level ?? 1) ||
      (l.totalXP ?? 0) - (r.totalXP ?? 0)
  )[0];
}

function buildCoachLead(userName, newSeeds, weakestTree, recentGames) {
  const prefix = userName ? `${userName}, ` : "";
  if (newSeeds.length > 0) {
    return `${prefix}I pulled ${newSeeds.length} personalized rep${
      newSeeds.length === 1 ? "" : "s"
    } from your latest round so you can practice the exact spots that slipped.`;
  }
  if (weakestTree) {
    return `${prefix}${weakestTree.name} is still your thinnest area. Stay deliberate here and the rest of the skill map will feel easier.`;
  }
  if (recentGames.length > 0) {
    return `${prefix}you already have momentum. Keep the reps tight and stack another focused game before the streak cools off.`;
  }
  return `${prefix}Coach Mode turns your debate history into deliberate reps so you can train the right weakness instead of guessing.`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, title, description }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        alignItems: "flex-end",
        flexWrap: "wrap",
        marginBottom: "12px",
      }}
    >
      <div>
        <div style={eyebrowSmall}>{label}</div>
        <div style={sectionTitle}>{title}</div>
      </div>
      {description && (
        <div style={{ fontSize: "13px", color: theme.muted, lineHeight: 1.6, maxWidth: "360px" }}>
          {description}
        </div>
      )}
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, tint }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: "20px",
        background: tint,
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "14px",
          background: "rgba(255,255,255,0.16)",
          display: "grid",
          placeItems: "center",
          color: "#fff",
          marginBottom: "14px",
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.72)" }}>
        {label}
      </div>
      <div style={{ fontSize: "24px", lineHeight: 1.1, fontWeight: 800, color: "#fff", marginTop: "6px" }}>
        {value}
      </div>
    </div>
  );
}

// ── GameResultPanel — document 20 visual, unchanged ───────────────────────────

function GameResultPanel({ result, onContinue }) {
  if (!result) return null;
  const { treeXPEarned, globalXPEarned, leveledUp, updatedTree, nextRecommendations } = result;
  const resultGlyph = leveledUp ? "🎉" : treeXPEarned >= 20 ? "⭐" : "✓";
  const resultTitle = leveledUp
    ? LEVEL_UP_MESSAGES[updatedTree?.treeId] || "Level up!"
    : "Rep logged.";

  return (
    <>
      <div
        style={{
          ...heroCard,
          marginBottom: "18px",
          display: "flex",
          justifyContent: "space-between",
          gap: "18px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: "480px" }}>
          <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Session Logged</div>
          <div
            style={{
              fontSize: "clamp(2rem, 7vw, 3rem)",
              lineHeight: 0.98,
              fontWeight: 800,
              fontFamily: "'Fraunces', serif",
              marginTop: "10px",
            }}
          >
            {resultTitle}
          </div>
          <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)" }}>
            Your coach queue is updated and the next best reps are ready.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
            <div style={{ padding: "10px 12px", borderRadius: "16px", background: "rgba(255,255,255,0.14)", fontSize: "13px", fontWeight: 700 }}>
              +{treeXPEarned} tree XP
            </div>
            <div style={{ padding: "10px 12px", borderRadius: "16px", background: "rgba(255,255,255,0.14)", fontSize: "13px", fontWeight: 700 }}>
              +{globalXPEarned} global XP
            </div>
          </div>
        </div>
        <div
          style={{
            width: "88px",
            height: "88px",
            borderRadius: "28px",
            background: "rgba(255,255,255,0.14)",
            display: "grid",
            placeItems: "center",
            fontSize: "42px",
            flexShrink: 0,
          }}
        >
          {resultGlyph}
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "22px 22px 20px" }}>
        <SectionHeader
          label="Next Move"
          title="Coach update"
          description="Your tree progress and next recommendations are already refreshed."
        />
        <div
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: updatedTree ? "repeat(auto-fit, minmax(240px, 1fr))" : "1fr",
          }}
        >
          {updatedTree && (
            <div>
              <SkillTreeCard tree={updatedTree} active />
            </div>
          )}
          <div>
            {nextRecommendations?.length > 0 ? (
              <div style={{ display: "grid", gap: "10px" }}>
                {nextRecommendations.slice(0, 2).map((rec, index) => (
                  <div
                    key={`${rec.skillTreeId}-${index}`}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "18px",
                      background: "rgba(248,250,252,0.94)",
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Up Next</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: theme.ink }}>
                      {SKILL_TREES[rec.skillTreeId]?.icon} {rec.treeName}
                    </div>
                    <div style={{ fontSize: "13px", color: theme.muted, marginTop: "4px", lineHeight: 1.6 }}>
                      {rec.miniGameLabel}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyCard}>
                <div style={{ fontSize: "16px", fontWeight: 800, color: theme.ink }}>Queue cleared</div>
                <div style={{ ...subheadline, marginTop: "6px" }}>
                  No immediate follow-up recommendations. Head back to Coach and pick the next tree manually.
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
          <button onClick={() => onContinue("home")} style={solidBtn}>Back to Coach</button>
        </div>
      </div>
    </>
  );
}

// ── renderActiveGame — maps miniGameId to the real component ──────────────────
// Each mini-game receives a unified `content` object and an `onFinish` callback.
// onFinish({ score, maxScore, durationMs }) — the game reports back, CoachMode records it.

function renderActiveGame({ activeGame, activeSeed, activeRecommendation, onFinish, onCancel }) {
  if (!activeGame) return null;

  const { miniGameId, skillTreeId } = activeGame;

  // Build the context object the game can use to adapt its content
  const context = activeSeed
    ? {
        type: "seed",
        excerpt:     activeSeed.excerpt || activeSeed.sourceExcerpt || "",
        coachNote:   activeSeed.coachNote || "",
        prompt:      activeSeed.prompt || "",
        seedId:      activeSeed.id,
        skillTreeId,
      }
    : {
        type:          "recommendation",
        skillTreeId,
        miniGameId,
        treeName:      activeRecommendation?.treeName || "",
        miniGameLabel: activeRecommendation?.miniGameLabel || "",
        seedId:        activeRecommendation?.seedId || null,
      };

  // Shared finish wrapper — game calls this with { score, maxScore, durationMs }
  const finish = ({ score, maxScore, durationMs = 0 }) => {
    onFinish({ miniGameId, skillTreeId, score, maxScore, durationMs, context });
  };

  switch (miniGameId) {
    case "clash_point_picker":
      return <ClashGame onFinish={(score, maxScore, durationMs) => finish({ score, maxScore, durationMs })} context={context} />;

    case "fallacy_hunt":
      return <FallacyHunt onFinish={(score, maxScore, durationMs) => finish({ score, maxScore, durationMs })} context={context} />;

    case "speech_polish":
      return <SpeechPolish onFinish={(score, maxScore, durationMs) => finish({ score, maxScore, durationMs })} context={context} />;

    default:
      // Placeholder for games not yet wired
      return (
        <div
          style={{
            padding: "28px 24px",
            borderRadius: "22px",
            background: "rgba(248,250,252,0.94)",
            border: `1px solid ${theme.border}`,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔧</div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: theme.ink, marginBottom: "8px" }}>
            {formatMiniGameLabel(miniGameId)}
          </div>
          <div style={{ fontSize: "14px", color: theme.muted, lineHeight: 1.65, marginBottom: "20px" }}>
            This mini-game isn't wired into Coach Mode yet. It's coming soon.
          </div>
          <button onClick={onCancel} style={secondaryBtn}>Back to Coach</button>
        </div>
      );
  }
}

// ── Main CoachMode component ──────────────────────────────────────────────────

export default function CoachMode({ user, onUserUpdated, onExit, initialSeeds = [] }) {
  // Core view state
  const [view,         setView]         = useState("home"); // "home" | "game" | "result"
  const [coachData,    setCoachData]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeTree,   setActiveTree]   = useState(null);
  const [latestResult, setLatestResult] = useState(null);

  // ── NEW: active game session state (document 21) ──────────────────────────
  const [activeGame,           setActiveGame]           = useState(null); // { miniGameId, skillTreeId, source }
  const [activeSeed,           setActiveSeed]           = useState(null); // seed object | null
  const [activeRecommendation, setActiveRecommendation] = useState(null); // rec object | null

  // ── Data loading ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/coach-mode");

      if (initialSeeds?.length) {
        setCoachData({
          ...data,
          practiceSeeds: [
            ...initialSeeds,
            ...(data.practiceSeeds?.filter(
              (s) => !initialSeeds.find((is) => is.id === s.id)
            ) || []),
          ],
        });
      } else {
        setCoachData(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [initialSeeds]);

  useEffect(() => { load(); }, [load]);

  // ── Game completion — single source of truth (document 21) ────────────────
  // Games call onFinish → this records the result → moves to result view.
  // Never call setView("result") from anywhere else.
  const handleGameComplete = useCallback(
    async ({ miniGameId, skillTreeId, score, maxScore, durationMs = 0, context }) => {
      const seedId = context?.seedId ?? null;
      try {
        const result = await apiFetch(`/minigames/${miniGameId}/complete`, {
          method: "POST",
          body: JSON.stringify({
            miniGameId,
            skillTreeId,
            score,
            maxScore,
            durationMs,
            difficulty: "medium",
            practiceSeedId: seedId,
          }),
        });
        setLatestResult(result);
        if (result.user && onUserUpdated) onUserUpdated(result.user);
        // Clear game session state, then move to result
        setActiveGame(null);
        setActiveSeed(null);
        setActiveRecommendation(null);
        setView("result");
      } catch (e) {
        console.error("Failed to record game result:", e);
      }
    },
    [onUserUpdated]
  );

  // ── Cancel game without completing ────────────────────────────────────────
  const cancelGame = useCallback(() => {
    setActiveGame(null);
    setActiveSeed(null);
    setActiveRecommendation(null);
    setView("home");
  }, []);

  // ── After result, continue back to coach home ─────────────────────────────
  const handleContinue = useCallback((dest) => {
    setLatestResult(null);
    setActiveGame(null);
    setActiveSeed(null);
    setActiveRecommendation(null);
    setView(dest);
    if (dest === "home") load();
  }, [load]);

  // ── RENDER: loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={pageWrap}>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <div style={{ ...heroCard, marginBottom: "18px" }}>
          <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Coach Mode</div>
          <div style={{ fontSize: "clamp(2rem, 7vw, 3rem)", lineHeight: 0.98, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "10px" }}>
            Loading your training map...
          </div>
          <div style={{ marginTop: "18px" }}>
            <Skeleton h="70px" />
          </div>
          <div style={heroStatGrid}>
            {[1, 2, 3].map((i) => <Skeleton key={i} h="120px" />)}
          </div>
        </div>
        <div style={{ ...sectionCard, padding: "20px 22px", marginBottom: "18px" }}>
          <Skeleton h="20px" />
          <div style={{ marginTop: "14px", display: "grid", gap: "12px" }}>
            {[1, 2].map((i) => <Skeleton key={i} h="164px" />)}
          </div>
        </div>
        <div style={{ ...sectionCard, padding: "20px 22px" }}>
          <Skeleton h="20px" />
          <div style={{ ...skillGrid, marginTop: "14px" }}>
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} h="170px" />)}
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={pageWrap}>
        <div style={{ ...sectionCard, padding: "24px 24px 22px" }}>
          <div style={eyebrowSmall}>Coach Mode</div>
          <div style={{ ...headline, fontSize: "clamp(1.8rem, 5vw, 2.4rem)" }}>
            Could not load your coach queue.
          </div>
          <div style={{ ...subheadline, color: theme.danger, marginTop: "10px" }}>{error}</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
            <button onClick={load} style={solidBtn}>Retry</button>
            {onExit && <button onClick={onExit} style={secondaryBtn}>Back</button>}
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: result ────────────────────────────────────────────────────────
  if (view === "result" && latestResult) {
    return (
      <div style={pageWrap}>
        <GameResultPanel result={latestResult} onContinue={handleContinue} />
      </div>
    );
  }

  // ── RENDER: game (document 21 — new branch) ───────────────────────────────
  // Wraps the active mini-game inside the CoachMode hero shell so it still
  // feels like CoachMode, not a blank page.
  if (view === "game" && activeGame) {
    const gameLabel = formatMiniGameLabel(activeGame.miniGameId);
    const gameSubtitle = activeSeed
      ? activeSeed.coachNote || "Work through this personalized rep."
      : activeRecommendation?.reason || "Focus on this skill area.";

    return (
      <div style={pageWrap}>
        {/* Hero — same gradient, same typographic scale as doc 20 */}
        <div style={{ ...heroCard, marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ maxWidth: "520px" }}>
              <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Coach Mode</div>
              <div style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)", lineHeight: 0.98, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "10px" }}>
                Focused rep
              </div>
              <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)" }}>
                {gameSubtitle}
              </p>
              {activeSeed?.excerpt && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.84)",
                    lineHeight: 1.65,
                    fontStyle: "italic",
                  }}
                >
                  "{activeSeed.excerpt}"
                </div>
              )}
            </div>
            <button onClick={cancelGame} style={heroActionBtn}>Cancel rep</button>
          </div>

          {/* Game identity pill */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
            <div style={{ padding: "8px 12px", borderRadius: "16px", background: "rgba(255,255,255,0.14)", fontSize: "13px", fontWeight: 700, color: "#fff" }}>
              {SKILL_TREES[activeGame.skillTreeId]?.icon} {SKILL_TREES[activeGame.skillTreeId]?.name || activeGame.skillTreeId}
            </div>
            <div style={{ padding: "8px 12px", borderRadius: "16px", background: "rgba(255,255,255,0.12)", fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.84)" }}>
              {gameLabel}
            </div>
          </div>
        </div>

        {/* Game content — mounted inside a section card */}
        <div style={{ ...sectionCard, padding: "22px 22px 20px", marginBottom: "18px" }}>
          {renderActiveGame({
            activeGame,
            activeSeed,
            activeRecommendation,
            onFinish: handleGameComplete,
            onCancel: cancelGame,
          })}
        </div>
      </div>
    );
  }

  // ── RENDER: coach dashboard (document 20 layout, unchanged) ──────────────
  const {
    skillTrees    = [],
    practiceSeeds = [],
    recommendations = [],
    recentGames   = [],
  } = coachData || {};

  const newSeeds    = practiceSeeds.filter((s) => s.status === "new");
  const weakestTree = getWeakestTree(skillTrees);
  const heroCopy    = buildCoachLead(user?.name, newSeeds, weakestTree, recentGames);
  const selectedTree = skillTrees.find((t) => t.treeId === activeTree) || null;

  return (
    <div style={pageWrap}>
      {/* ── Hero ── */}
      <div style={{ ...heroCard, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ maxWidth: "520px" }}>
            <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Coach Mode</div>
            <div style={{ fontSize: "clamp(2rem, 7vw, 3rem)", lineHeight: 0.98, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "10px" }}>
              Train with intent.
            </div>
            <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)" }}>{heroCopy}</p>
          </div>
          {onExit && (
            <button onClick={onExit} style={heroActionBtn}>Exit Coach</button>
          )}
        </div>

        <div style={heroStatGrid}>
          <HeroStat
            icon={Sparkles}
            label="Personalized Reps"
            value={`${newSeeds.length}`}
            tint="linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.08))"
          />
          <HeroStat
            icon={Target}
            label="Current Focus"
            value={weakestTree?.name || "All Trees"}
            tint="linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.08))"
          />
          <HeroStat
            icon={Flame}
            label="Recent Reps"
            value={`${recentGames.length}`}
            tint="linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.08))"
          />
        </div>
      </div>

      {/* ── Summary bar ── */}
      <CoachSummaryBar trees={skillTrees} seeds={practiceSeeds} recentGames={recentGames} />

      {/* ── Personalized reps — document 21 onPlay handler ── */}
      {newSeeds.length > 0 && (
        <div style={{ marginBottom: "18px" }}>
          <SectionHeader
            label="From Your Last Round"
            title="Personalized reps"
            description="These drills were generated from the exact moments your last debate exposed."
          />
          <div style={cardGrid}>
            {newSeeds.slice(0, 2).map((seed) => (
              <PracticeFromYourRoundCard
                key={seed.id || `${seed.skillTreeId}-${seed.coachNote}`}
                seed={seed}
                onPlay={(s) => {
                  setActiveSeed(s);
                  setActiveRecommendation(null);
                  setActiveGame({
                    miniGameId:   s.miniGameId,
                    skillTreeId:  s.skillTreeId,
                    source:       "seed",
                  });
                  setView("game");
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Recommendations — document 21 onPlay handler ── */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: "18px" }}>
          <SectionHeader
            label="Suggested Next"
            title="Coach queue"
            description="Priority picks based on your weakest trees, recent seeds, and the games you have already been playing."
          />
          <div style={cardGrid}>
            {recommendations.map((rec, i) => (
              <CoachSuggestionCard
                key={i}
                rec={rec}
                onPlay={(r) => {
                  setActiveRecommendation(r);
                  setActiveSeed(null);
                  setActiveGame({
                    miniGameId:   r.miniGameId,
                    skillTreeId:  r.skillTreeId,
                    source:       "recommendation",
                  });
                  setView("game");
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Skill tree grid ── */}
      <div style={{ ...sectionCard, padding: "20px 22px", marginBottom: "18px" }}>
        <SectionHeader
          label="Skill Trees"
          title="Your training map"
          description="Tap a tree to inspect its current level, XP runway, and the specific coaching note behind it."
        />
        <div style={skillGrid}>
          {skillTrees.map((tree) => (
            <SkillTreeCard
              key={tree.treeId}
              tree={tree}
              active={activeTree === tree.treeId}
              onClick={() => setActiveTree(activeTree === tree.treeId ? null : tree.treeId)}
            />
          ))}
        </div>

        {selectedTree ? (
          <div style={detailCard}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={eyebrowSmall}>Current Focus</div>
                <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "'Fraunces', serif", color: theme.ink, marginTop: "8px" }}>
                  {selectedTree.icon} {selectedTree.name}
                </div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: "16px", background: "#eef2ff", color: theme.primary, fontSize: "12px", fontWeight: 800 }}>
                Level {selectedTree.level}
              </div>
            </div>
            <div style={{ ...subheadline, marginTop: "10px" }}>
              {pickEncouragement(selectedTree.treeId, selectedTree.level)}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
              <div style={{ padding: "10px 12px", borderRadius: "16px", background: "rgba(79,70,229,0.08)", color: theme.primaryDeep, fontSize: "12px", fontWeight: 700 }}>
                {selectedTree.totalXP} total XP
              </div>
              {!selectedTree.maxLevel && (
                <div style={{ padding: "10px 12px", borderRadius: "16px", background: "rgba(15,23,42,0.06)", color: theme.ink, fontSize: "12px", fontWeight: 700 }}>
                  {selectedTree.xpToNext} XP to next level
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ ...subheadline, marginTop: "14px" }}>
            Select a tree to inspect its coaching note and progression details.
          </div>
        )}
      </div>

      {/* ── Recent games ── */}
      <div style={{ ...sectionCard, padding: "20px 22px" }}>
        <SectionHeader
          label="Recent Games"
          title="Latest reps"
          description="A quick read on what you have played most recently and where the XP landed."
        />
        {recentGames.length > 0 ? (
          <div style={{ display: "grid", gap: "10px" }}>
            {recentGames.slice(0, 5).map((g) => {
              const tree = SKILL_TREES[g.skillTreeId] || {};
              return (
                <div key={g.id} style={recentRow}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "15px",
                      background: "#eef2ff",
                      color: theme.primary,
                      display: "grid",
                      placeItems: "center",
                      fontSize: "18px",
                      flexShrink: 0,
                    }}
                  >
                    {tree.icon || "📘"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: theme.ink }}>
                      {formatMiniGameLabel(g.miniGameId)}
                    </div>
                    <div style={{ fontSize: "12px", color: theme.muted, marginTop: "4px" }}>
                      {tree.name || g.skillTreeId} · {g.score}/{g.maxScore} · +{g.treeXP} tree XP
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: theme.primary }}>
                      +{g.globalXP} XP
                    </div>
                    <div style={{ fontSize: "11px", color: theme.muted, marginTop: "4px" }}>
                      {new Date(g.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={emptyCard}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "14px",
                  background: "#eef2ff",
                  color: theme.primary,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Trophy size={18} />
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: theme.ink }}>No reps logged yet</div>
                <div style={{ ...subheadline, marginTop: "6px" }}>
                  Start from a suggested game or a personalized round excerpt and this section will begin tracking your coach history.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
