// setup screen component

import { useEffect, useState } from "react";
import { TRAINING_TOPIC_REFRESH_LIMIT } from "../../constants/debate";
import { apiFetch } from "../../lib/api";
import DifficultyChip from "../common/DifficultyChip";
import LevelBadge from "../common/LevelBadge";
import XPProgressBar from "../common/XPProgressBar";
import {
  eyebrow,
  eyebrowSmall,
  heroCard,
  pageWrap,
  sectionCard,
  solidBtn,
  subheadline,
} from "../../styles/ui";

function pickRandomTopic(topics, excludeId = null) {
  if (!topics.length) return null;
  const pool = topics.filter((item) => item.id !== excludeId);
  const source = pool.length ? pool : topics;
  return source[Math.floor(Math.random() * source.length)];
}

function pickRandomCharacter(characters) {
  if (!characters.length) return null;
  return characters[Math.floor(Math.random() * characters.length)];
}

function pickRandomSide() {
  return Math.random() < 0.5 ? "A" : "B";
}

function shorten(text = "", limit = 96) {
  if (!text || text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}...`;
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

export default function SetupScreen({ onStart, user, seedTopic = null }) {
  const [topics, setTopics] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState(null);
  const [char, setChar] = useState(null);
  const [side, setSide] = useState(null);
  const [refreshesLeft, setRefreshesLeft] = useState(TRAINING_TOPIC_REFRESH_LIMIT);

  const assignRandomRound = (availableTopics, availableCharacters, excludeTopicId = null) => {
    const nextTopic = pickRandomTopic(availableTopics, excludeTopicId);
    const nextChar = pickRandomCharacter(availableCharacters);
    const nextSide = nextTopic ? pickRandomSide() : null;
    setTopic(nextTopic);
    setChar(nextChar);
    setSide(nextSide);
  };

  useEffect(() => {
    Promise.all([apiFetch("/topics"), apiFetch("/characters")])
      .then(([nextTopics, nextCharacters]) => {
        setTopics(nextTopics);
        setCharacters(nextCharacters);
        if (seedTopic) {
          setTopic(seedTopic);
          setChar(pickRandomCharacter(nextCharacters));
          setSide(pickRandomSide());
        } else {
          assignRandomRound(nextTopics, nextCharacters);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [seedTopic]);

  const refreshTopic = () => {
    if (refreshesLeft <= 0) return;
    assignRandomRound(topics, characters, topic?.id || null);
    setRefreshesLeft((prev) => Math.max(0, prev - 1));
  };

  const switchSide = () => {
    if (!topic) return;
    setSide((prev) => (prev === "A" ? "B" : "A"));
  };

  if (loading) {
    return <div style={{ ...pageWrap, color: "#667085", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>Loading training…</div>;
  }

  const selectedSideData = topic ? (side === "A" ? topic.sideA : side === "B" ? topic.sideB : null) : null;

  return (
    <div style={pageWrap}>
      <div style={{ ...heroCard, marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div style={{ maxWidth: "460px" }}>
            <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Training Sessions</div>
            <div style={{ fontSize: "clamp(1.55rem, 6vw, 2.4rem)", lineHeight: 1.02, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "8px" }}>
              Set your next run.
            </div>
            <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)" }}>
              Topic and side are assigned automatically.
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
          <SummaryPill label="Topics" value={topics.length} tint="rgba(59, 130, 246, 0.26)" />
          <SummaryPill label="Opponents" value={characters.length} tint="rgba(236, 72, 153, 0.26)" />
          <SummaryPill label="Refreshes" value={`${refreshesLeft}/${TRAINING_TOPIC_REFRESH_LIMIT}`} tint="rgba(16, 185, 129, 0.26)" />
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "12px", marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div style={eyebrowSmall}>Assigned Topic</div>
            <div style={{ fontSize: "16px", lineHeight: 1.22, fontWeight: 800, color: "#111827", marginTop: "4px", maxWidth: "520px" }}>
              {topic ? topic.title : "No topic available"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {topic?.difficulty && <DifficultyChip difficulty={topic.difficulty} size="sm" />}
            <button
              onClick={refreshTopic}
              disabled={!topic || refreshesLeft <= 0}
              style={{
                ...solidBtn,
                padding: "8px 11px",
                fontSize: "11px",
                background: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
                boxShadow: "0 8px 18px rgba(71, 85, 105, 0.22)",
                opacity: !topic || refreshesLeft <= 0 ? 0.5 : 1,
              }}
            >
              New Topic
            </button>
          </div>
        </div>

        {topic && (
          <>
            <div style={{ fontSize: "12px", color: "#475467", lineHeight: 1.45, marginTop: "8px", marginBottom: "8px" }}>
              {shorten(topic.description, 125)}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <div style={{ padding: "5px 9px", borderRadius: "999px", background: "#eef2ff", color: "#4338ca", fontSize: "10px", fontWeight: 700 }}>
                Tag: {topic.tag}
              </div>
              <div style={{ padding: "5px 9px", borderRadius: "999px", background: "#f8fafc", color: "#475467", fontSize: "10px", fontWeight: 700 }}>
                Refreshes left: {refreshesLeft}/{TRAINING_TOPIC_REFRESH_LIMIT}
              </div>
            </div>
          </>
        )}
      </div>

      {topic && selectedSideData && (
        <div style={{ ...sectionCard, padding: "12px", marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div>
              <div style={eyebrowSmall}>Your Assigned Side</div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827", marginTop: "4px" }}>
                Side {side}
              </div>
            </div>
            <button
              onClick={switchSide}
              style={{
                ...solidBtn,
                padding: "8px 11px",
                fontSize: "11px",
                background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                boxShadow: "0 8px 18px rgba(79, 70, 229, 0.22)",
              }}
            >
              Switch Side
            </button>
          </div>

          <div style={{ marginTop: "8px" }}>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>{selectedSideData.position}</div>
            <div style={{ display: "grid", gap: "4px", marginTop: "7px" }}>
              {selectedSideData.args.map((arg, index) => (
                <div key={index} style={{ fontSize: "11px", lineHeight: 1.45, color: "#475467" }}>
                  · {arg}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!!topic && !!char && !!side && (
        <button onClick={() => onStart({ topic, character: char, side, sessionId: `training-${Date.now()}` })} style={{ ...solidBtn, width: "100%", marginTop: "2px" }}>
          Begin Training
        </button>
      )}
    </div>
  );
}
