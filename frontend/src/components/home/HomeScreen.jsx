// home screen component

import { MessageCircleMore, Flame, UsersRound, Target, UserRound, ArrowUpRight } from "lucide-react";
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

const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"];
const CATEGORY_OPTIONS = [
  "Education / AI",
  "AI / Technology",
  "Environment",
  "Politics / Policy",
  "Ethics",
  "Economy",
  "Culture / Society",
];
const MODE_OPTIONS = ["Casual", "Academic", "Policy", "Ethical"];

function buildTrendingPath(filters) {
  const params = new URLSearchParams({ limit: "10" });
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.category) params.set("category", filters.category);
  if (filters.mode) params.set("mode", filters.mode);
  return `/trending-topics?${params.toString()}`;
}

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
          background: tint,
          color: "#5b4bb4",
          marginBottom: "14px",
        }}
      >
        <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}><span style={{ fontSize: "15px", fontWeight: 750, color: "#282438" }}>{label}</span><ArrowUpRight size={15} color="#9992b1" aria-hidden="true" /></div>
      <div style={{ fontSize: "12px", lineHeight: 1.5, color: "#716b82", marginTop: "6px" }}>{value}</div>
      {!!detail && <div style={{ fontSize: "11px", lineHeight: 1.4, color: "#5c4db1", fontWeight: 600, marginTop: "10px" }}>{detail}</div>}
    </>
  );

  const cardStyle = {
    ...sectionCard,
    padding: "16px",
    textAlign: "left",
    background: "#fff",
    minHeight: "160px",
  };

  if (!onClick) {
    return <div style={cardStyle}>{content}</div>;
  }

  return (
    <button onClick={onClick} style={{ ...cardStyle, cursor: "pointer" }}>
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
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingRefreshing, setTrendingRefreshing] = useState(false);
  const [trendingRefreshMeta, setTrendingRefreshMeta] = useState(null);
  const [trendingRefreshError, setTrendingRefreshError] = useState("");
  const [expandedTopicId, setExpandedTopicId] = useState("");
  const [topicFilters, setTopicFilters] = useState({
    difficulty: "",
    category: "",
    mode: "",
  });

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

  useEffect(() => {
    let active = true;
    setTrendingLoading(true);

    apiFetch(buildTrendingPath(topicFilters))
      .then((topics) => {
        if (!active) return;
        setTrendingTopics(Array.isArray(topics) ? topics : []);
      })
      .catch(() => {
        if (!active) return;
        setTrendingTopics([]);
      })
      .finally(() => {
        if (active) setTrendingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [topicFilters.difficulty, topicFilters.category, topicFilters.mode]);

  const refreshTrending = async () => {
    setTrendingRefreshing(true);
    setTrendingRefreshError("");
    try {
      const payload = await apiFetch("/trending-topics/refresh", {
        method: "POST",
        body: JSON.stringify({ targetCount: 12, maxPerSource: 12 }),
      });
      setTrendingRefreshMeta(payload?.refresh || null);
      const topics = await apiFetch(buildTrendingPath(topicFilters)).catch(() => []);
      setTrendingTopics(topics);
      setExpandedTopicId("");
    } catch (err) {
      setTrendingRefreshError(err?.message || "Refresh failed");
    } finally {
      setTrendingRefreshing(false);
      setTrendingLoading(false);
    }
  };

  const recentHistory = history.slice(0, 2);
  const activeMatch = matches.find((item) => item.status === "matched" || item.status === "waiting") || null;
  const categoryChoices = Array.from(
    new Set([...CATEGORY_OPTIONS, ...trendingTopics.map((item) => item.category).filter(Boolean)])
  );
  const allLocalSeed = trendingTopics.length > 0 && trendingTopics.every((item) => item.source === "LocalSeed");

  return (
    <div style={pageWrap}>
      <div style={{ ...heroCard, marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div style={{ maxWidth: "460px" }}>
            <div style={{ ...eyebrow, color: "rgba(255,255,255,0.78)" }}>Your debate space</div>
            <div style={{ fontSize: "clamp(1.7rem, 7vw, 2.35rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", marginTop: "8px", overflowWrap: "anywhere" }}>
              Ready to debate?
            </div>
            <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)" }}>
              Welcome back, {user.name}.
            </p>
          </div>
          <LevelBadge level={user.currentLevel} size="md" showLabel={false} />
        </div>

        <div style={{ marginTop: "12px", background: "rgba(255,255,255,0.12)", borderRadius: "14px", padding: "12px", border: "1px solid rgba(255,255,255,0.16)" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
            Level {user.currentLevel}: {user.levelName}
          </div>
          <XPProgressBar user={user} showNumbers={!!user.nextLevelXP} inverted />
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
            {user.unlockedDifficulties.map((difficulty) => (
              <DifficultyChip key={difficulty} difficulty={difficulty} size="sm" />
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", marginTop: "10px" }}>
          <SummaryPill label="Practice" value={history.length} tint="rgba(255,255,255,0.10)" />
          <SummaryPill label="Debates" value={matches.length} tint="rgba(255,255,255,0.10)" />
          <SummaryPill label="XP" value={user.totalXP} tint="rgba(255,255,255,0.10)" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
          <button onClick={() => onNavigate("training")} style={{ ...solidBtn, background: "#fff", color: "#5141bc", boxShadow: "0 4px 12px rgba(39,28,96,0.10)" }}>
            Start AI Debate
          </button>
          <button onClick={() => onNavigate("pvp")} style={{ ...solidBtn, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", boxShadow: "none" }}>
            Live Debate
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "18px", fontWeight: 750, letterSpacing: "-0.03em", margin: "24px 2px 12px" }}>Your debate studio</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
          <ActionCard
            icon={MessageCircleMore}
            label="AI Debate"
            value="A full debate with an AI opponent."
            detail={`${history.length} practice sessions`}
            tint="#eeeafb"
            onClick={() => onNavigate("training")}
          />
          <ActionCard
            icon={Target}
            label="Skills"
            value="Short drills. Stronger arguments."
            detail="Explore skill drills"
            tint="#eaf4ef"
            onClick={() => onNavigate("coach")}
          />
          <ActionCard
            icon={UsersRound}
            label="Live Debate"
            value="Text debate with another player."
            detail={activeMatch ? "Return to your room" : "Find a debate partner"}
            tint="#edf0fb"
            onClick={() => onNavigate("pvp")}
          />
          <ActionCard
            icon={UserRound}
            label="Profile"
            value="Your progress, history and settings."
            detail={`${user.totalXP} XP earned`}
            tint="#f5eef7"
            onClick={() => onNavigate("profile")}
          />
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "12px", marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={eyebrowSmall}>Trending</div>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "16px", fontWeight: 800, marginTop: "4px", color: "#111827" }}>
              <Flame size={17} color="#ff9500" aria-hidden="true" />
              Trending Debate Topics
            </div>
          </div>
          <button
            onClick={refreshTrending}
            disabled={trendingRefreshing}
            style={{
              ...solidBtn,
              padding: "8px 11px",
              fontSize: "11px",
              background: "#eeebfb",
              color: "#5141bc",
              boxShadow: "none",
              opacity: trendingRefreshing ? 0.7 : 1,
            }}
          >
            {trendingRefreshing ? "Refreshing..." : "Refresh Topics"}
          </button>
        </div>
        {!!trendingRefreshMeta && (
          <>
            <div style={{ fontSize: "11px", color: "#475467", marginTop: "7px" }}>
              Refresh stats: raw {trendingRefreshMeta.rawCount} · evaluated {trendingRefreshMeta.evaluatedCount} · accepted {trendingRefreshMeta.acceptedCount} · stored {trendingRefreshMeta.storedCount}
            </div>
            <div style={{ fontSize: "11px", color: "#667085", marginTop: "2px" }}>
              Sources: raw {Object.entries(trendingRefreshMeta.rawBySource || {}).map(([k, v]) => `${k}:${v}`).join(", ") || "-"} | accepted {Object.entries(trendingRefreshMeta.acceptedBySource || {}).map(([k, v]) => `${k}:${v}`).join(", ") || "-"}
            </div>
            {Array.isArray(trendingRefreshMeta.sourceDiagnostics) && trendingRefreshMeta.sourceDiagnostics.length > 0 && (
              <div style={{ fontSize: "11px", color: "#667085", marginTop: "2px", lineHeight: 1.35 }}>
                Diagnostics: {trendingRefreshMeta.sourceDiagnostics.map((d) => `${d.source}:${d.ok ? `ok(${d.count})` : `fail(${d.error})`}`).join(" | ")}
              </div>
            )}
          </>
        )}
        {!!trendingRefreshError && (
          <div style={{ fontSize: "11px", color: "#b42318", marginTop: "7px" }}>
            Refresh failed: {trendingRefreshError}
          </div>
        )}
        {allLocalSeed && (
          <div style={{ fontSize: "11px", color: "#b54708", marginTop: "7px" }}>
            Showing local fallback topics. No live source topics are currently available.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px", marginTop: "10px" }}>
          <select
            value={topicFilters.difficulty}
            onChange={(event) => setTopicFilters((prev) => ({ ...prev, difficulty: event.target.value }))}
            style={{ borderRadius: "10px", border: "1px solid #d0d5dd", fontSize: "11px", padding: "8px", background: "#fff" }}
          >
            <option value="">Difficulty</option>
            {DIFFICULTY_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            value={topicFilters.category}
            onChange={(event) => setTopicFilters((prev) => ({ ...prev, category: event.target.value }))}
            style={{ borderRadius: "10px", border: "1px solid #d0d5dd", fontSize: "11px", padding: "8px", background: "#fff" }}
          >
            <option value="">Category</option>
            {categoryChoices.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            value={topicFilters.mode}
            onChange={(event) => setTopicFilters((prev) => ({ ...prev, mode: event.target.value }))}
            style={{ borderRadius: "10px", border: "1px solid #d0d5dd", fontSize: "11px", padding: "8px", background: "#fff" }}
          >
            <option value="">Mode</option>
            {MODE_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
          {!trendingLoading && trendingTopics.length === 0 && (
            <ActivityCard
              title="No trending topics yet"
              meta="Try refresh to run the Hot Debate Topic Agent Pipeline."
            />
          )}

          {trendingTopics.map((item) => {
            const expanded = expandedTopicId === item.id;
            return (
              <div key={item.id} style={{ ...sectionCard, padding: "11px 12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#111827", lineHeight: 1.35 }}>{item.title}</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                  <div style={{ padding: "5px 9px", borderRadius: "999px", background: "#eef2ff", color: "#4338ca", fontSize: "10px", fontWeight: 700 }}>
                    Category: {item.category}
                  </div>
                  <div style={{ padding: "5px 9px", borderRadius: "999px", background: "#fef3c7", color: "#a16207", fontSize: "10px", fontWeight: 700 }}>
                    Difficulty: {item.difficulty}
                  </div>
                  <div style={{ padding: "5px 9px", borderRadius: "999px", background: "#ecfeff", color: "#0e7490", fontSize: "10px", fontWeight: 700 }}>
                    Trend Score: {item.trendScore}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => onNavigate({ screen: "training", topic: item })} style={{ ...solidBtn, padding: "8px 10px", fontSize: "11px" }}>
                    Start Debate
                  </button>
                  <button
                    onClick={() => setExpandedTopicId((prev) => (prev === item.id ? "" : item.id))}
                    style={{
                      ...solidBtn,
                      padding: "8px 10px",
                      fontSize: "11px",
                      background: "linear-gradient(135deg, #334155 0%, #0f172a 100%)",
                      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.2)",
                    }}
                  >
                    {expanded ? "Hide Both Sides" : "View Both Sides"}
                  </button>
                </div>

                {expanded && (
                  <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                    <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f766e", marginBottom: "4px" }}>{item.proPosition}</div>
                      {(item.proArguments || []).map((arg, index) => (
                        <div key={`${item.id}-pro-${index}`} style={{ fontSize: "11px", color: "#334155", lineHeight: 1.45 }}>
                          · {arg}
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "#fff7ed", borderRadius: "10px", padding: "8px", border: "1px solid #fed7aa" }}>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#9a3412", marginBottom: "4px" }}>{item.conPosition}</div>
                      {(item.conArguments || []).map((arg, index) => (
                        <div key={`${item.id}-con-${index}`} style={{ fontSize: "11px", color: "#7c2d12", lineHeight: 1.45 }}>
                          · {arg}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {trendingLoading && <div style={{ fontSize: "12px", color: "#667085" }}>Loading trending topics…</div>}
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
