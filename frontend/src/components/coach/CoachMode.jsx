import { useState, useEffect, useCallback } from "react";
import CoachSummaryBar from "./CoachSummaryBar";
import CoachSuggestionCard from "./CoachSuggestionCard";
import PracticeFromYourRoundCard from "./PracticeFromYourRoundCard";
import SkillTreeCard from "./SkillTreeCard";
import { SKILL_TREES } from "../../lib/coach/registry";
import {
  pickEncouragement,
  LEVEL_UP_MESSAGES,
} from "../../lib/coach/uiText";

// API helper, mirrors the one in App.jsx / lib/api.js
const API = "http://localhost:3001/api";

function getToken() {
  return localStorage.getItem("debate_auth_token") || "";
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.message || "API error"), { data: err });
  }

  return res.json();
}

// Styles
const wrap = {
  maxWidth: "700px",
  margin: "0 auto",
  padding: "36px 24px",
  fontFamily: "'DM Sans', sans-serif",
};

const eyebrow = {
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#aaa",
  fontFamily: "'DM Mono', monospace",
  marginBottom: "6px",
};

const headline = {
  fontSize: "1.9rem",
  fontWeight: 600,
  color: "#1a1a1a",
  margin: "8px 0 0",
  fontFamily: "'Playfair Display', Georgia, serif",
};

const sectionHdr = {
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#bbb",
  fontFamily: "'DM Mono', monospace",
  marginBottom: "12px",
};

const solidBtn = {
  padding: "10px 22px",
  background: "#1a1a1a",
  color: "#fff",
  border: "1px solid #1a1a1a",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const outlineBtn = {
  padding: "10px 22px",
  background: "#fff",
  color: "#1a1a1a",
  border: "1px solid #ddd",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const treeGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "10px",
  marginBottom: "8px",
};

const recGrid = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginBottom: "8px",
};

const Skeleton = ({ h = "60px" }) => (
  <div
    style={{
      height: h,
      borderRadius: "8px",
      background:
        "linear-gradient(90deg,#f0f0f0 25%,#e4e4e4 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }}
  />
);

// Result overlay shown after completing a game
function GameResultPanel({ result, onContinue }) {
  if (!result) return null;

  const {
    treeXPEarned,
    globalXPEarned,
    leveledUp,
    updatedTree,
    nextRecommendations,
  } = result;

  return (
    <div style={{ textAlign: "center", padding: "40px 24px" }}>
      <div style={{ fontSize: "48px", marginBottom: "12px" }}>
        {leveledUp ? "🎉" : treeXPEarned >= 20 ? "⭐" : "✓"}
      </div>

      <div
        style={{
          fontSize: "22px",
          fontWeight: 600,
          fontFamily: "'Playfair Display', serif",
          marginBottom: "8px",
        }}
      >
        {leveledUp
          ? LEVEL_UP_MESSAGES[updatedTree?.treeId] || "Level up!"
          : "Good work."}
      </div>

      <div style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
        +{treeXPEarned} tree XP · +{globalXPEarned} global XP
      </div>

      {updatedTree && (
        <div style={{ maxWidth: "280px", margin: "0 auto 24px" }}>
          <SkillTreeCard tree={updatedTree} active />
        </div>
      )}

      {nextRecommendations?.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              ...sectionHdr,
              textAlign: "left",
              maxWidth: "280px",
              margin: "0 auto 10px",
            }}
          >
            Up next
          </div>

          <div
            style={{
              maxWidth: "280px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {nextRecommendations.slice(0, 2).map((rec, i) => (
              <div
                key={i}
                style={{
                  fontSize: "13px",
                  color: "#555",
                  padding: "10px 13px",
                  background: "#fafafa",
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  textAlign: "left",
                }}
              >
                <strong>
                  {SKILL_TREES[rec.skillTreeId]?.icon} {rec.treeName}
                </strong>{" "}
                - {rec.miniGameLabel}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button onClick={() => onContinue("home")} style={solidBtn}>
          Back to Coach
        </button>
      </div>
    </div>
  );
}

// Main CoachMode component
export default function CoachMode({
  user,
  onUserUpdated,
  onExit,
  initialSeeds = [],
}) {
  const [view, setView] = useState("home");
  const [coachData, setCoachData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTree, setActiveTree] = useState(null);
  const [latestResult, setLatestResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch("/coach-mode");
      setCoachData(data);

      if (initialSeeds?.length) {
        setCoachData((prev) => ({
          ...prev,
          practiceSeeds: [
            ...initialSeeds,
            ...(prev?.practiceSeeds?.filter(
              (s) => !initialSeeds.find((is) => is.id === s.id)
            ) || []),
          ],
        }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [initialSeeds]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGameComplete = useCallback(
    async (
      miniGameId,
      skillTreeId,
      score,
      maxScore,
      seedId = null,
      durationMs = 0
    ) => {
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
            practiceSeedId: seedId ?? null,
          }),
        });

        setLatestResult(result);

        if (result.user && onUserUpdated) {
          onUserUpdated(result.user);
        }

        setView("result");
      } catch (e) {
        console.error("Failed to record game result:", e);
      }
    },
    [onUserUpdated]
  );

  const handleContinue = (dest) => {
    setLatestResult(null);
    setView(dest);
    if (dest === "home") load();
  };

  if (loading) {
    return (
      <div style={wrap}>
        <div style={{ ...eyebrow, marginBottom: "6px" }}>Coach Mode</div>
        <div style={{ ...headline, marginBottom: "24px" }}>
          Loading your progress…
        </div>
        <Skeleton h="60px" />
        <div
          style={{
            marginTop: "16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} h="90px" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={wrap}>
        <div style={{ color: "#c62828", fontSize: "14px", marginBottom: "16px" }}>
          Could not load Coach Mode: {error}
        </div>
        <button onClick={load} style={solidBtn}>
          Retry
        </button>
        {onExit && (
          <button onClick={onExit} style={{ ...outlineBtn, marginLeft: "10px" }}>
            ← Back
          </button>
        )}
      </div>
    );
  }

  if (view === "result" && latestResult) {
    return (
      <div style={wrap}>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <GameResultPanel result={latestResult} onContinue={handleContinue} />
      </div>
    );
  }

  const {
    skillTrees = [],
    practiceSeeds = [],
    recommendations = [],
    recentGames = [],
  } = coachData || {};

  const newSeeds = practiceSeeds.filter((s) => s.status === "new");

  return (
    <div style={wrap}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "20px",
        }}
      >
        <div>
          <div style={eyebrow}>Coach Mode</div>
          <h1 style={headline}>Your training</h1>
        </div>

        {onExit && (
          <button onClick={onExit} style={{ ...outlineBtn, padding: "7px 14px" }}>
            Exit
          </button>
        )}
      </div>

      <CoachSummaryBar
        trees={skillTrees}
        seeds={practiceSeeds}
        recentGames={recentGames}
      />

      {newSeeds.length > 0 && (
        <>
          <div style={sectionHdr}>From your last round</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            {newSeeds.slice(0, 2).map((seed) => (
              <PracticeFromYourRoundCard
                key={seed.id}
                seed={seed}
                onPlay={(s) => {
                  alert(
                    `Launching ${s.miniGameId} with personalized content from your round.\n\nExcerpt: "${
                      s.excerpt || s.sourceExcerpt
                    }"\n\nCoach: ${s.coachNote}\n\nPrompt: ${s.prompt}`
                  );
                }}
              />
            ))}
          </div>
        </>
      )}

      {recommendations.length > 0 && (
        <>
          <div style={sectionHdr}>Suggested next</div>
          <div style={recGrid}>
            {recommendations.map((rec, i) => (
              <CoachSuggestionCard
                key={i}
                rec={rec}
                onPlay={(r) => {
                  const score = Math.floor(Math.random() * 4) + 2;
                  handleGameComplete(
                    r.miniGameId,
                    r.skillTreeId,
                    score,
                    5,
                    r.seedId,
                    90000
                  );
                }}
              />
            ))}
          </div>
        </>
      )}

      <div style={sectionHdr}>Skill trees</div>
      <div style={treeGrid}>
        {skillTrees.map((tree) => (
          <SkillTreeCard
            key={tree.treeId}
            tree={tree}
            active={activeTree === tree.treeId}
            onClick={() =>
              setActiveTree(activeTree === tree.treeId ? null : tree.treeId)
            }
          />
        ))}
      </div>

      {activeTree &&
        (() => {
          const tree = skillTrees.find((t) => t.treeId === activeTree);
          if (!tree) return null;

          return (
            <div
              style={{
                padding: "14px 16px",
                background: "#fafafa",
                border: "1px solid #eee",
                borderRadius: "8px",
                marginTop: "8px",
              }}
            >
              <div style={{ fontSize: "13px", color: "#555", lineHeight: 1.6 }}>
                {pickEncouragement(activeTree, tree.level)}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#bbb",
                  marginTop: "6px",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                Total XP: {tree.totalXP} · Level {tree.level}
                {!tree.maxLevel && ` · ${tree.xpToNext} to next level`}
              </div>
            </div>
          );
        })()}

      {recentGames.length > 0 && (
        <>
          <div style={sectionHdr}>Recent games</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {recentGames.slice(0, 5).map((g) => {
              const tree = SKILL_TREES[g.skillTreeId] || {};

              return (
                <div
                  key={g.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 13px",
                    background: "#fafafa",
                    border: "1px solid #eee",
                    borderRadius: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{tree.icon || "📘"}</span>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#1a1a1a",
                      }}
                    >
                      {g.miniGameId.replace(/_/g, " ")}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#aaa",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {g.score}/{g.maxScore} · +{g.treeXP} XP
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#ccc",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {new Date(g.createdAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}