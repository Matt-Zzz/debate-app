import { useEffect, useState } from "react";
import { TRAINING_TOPIC_REFRESH_LIMIT } from "../../constants/debate";
import { apiFetch } from "../../lib/api";
import DifficultyChip from "../common/DifficultyChip";
import LevelBadge from "../common/LevelBadge";
import XPProgressBar from "../common/XPProgressBar";
import {
  cardBtn,
  eyebrow,
  eyebrowSmall,
  heroCard,
  pageWrap,
  sectionCard,
  solidBtn,
  subheadline,
  tabStyle,
} from "../../styles/ui";

function pickRandomTopic(topics, excludeId = null) {
  if (!topics.length) return null;
  const pool = topics.filter((item) => item.id !== excludeId);
  const source = pool.length ? pool : topics;
  return source[Math.floor(Math.random() * source.length)];
}

function SettingPill({ label, value, active }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: "999px",
        background: active ? "rgba(255,255,255,0.18)" : "#eef2ff",
        border: `1px solid ${active ? "rgba(255,255,255,0.16)" : "rgba(99, 102, 241, 0.12)"}`,
        color: active ? "rgba(255,255,255,0.86)" : "#4338ca",
        fontSize: "11px",
        fontWeight: 700,
      }}
    >
      {label}: {value}
    </div>
  );
}

export default function SetupScreen({ onStart, user }) {
  const [topics, setTopics] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState(null);
  const [char, setChar] = useState(null);
  const [side, setSide] = useState(null);
  const [refreshesLeft, setRefreshesLeft] = useState(TRAINING_TOPIC_REFRESH_LIMIT);

  useEffect(() => {
    Promise.all([apiFetch("/topics"), apiFetch("/characters")])
      .then(([nextTopics, nextCharacters]) => {
        setTopics(nextTopics);
        setCharacters(nextCharacters);
        setTopic(pickRandomTopic(nextTopics));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const done = [!!topic, !!char, !!side];

  const refreshTopic = () => {
    if (refreshesLeft <= 0) return;
    const nextTopic = pickRandomTopic(topics, topic?.id || null);
    if (!nextTopic) return;
    setTopic(nextTopic);
    setSide(null);
    setRefreshesLeft((prev) => Math.max(0, prev - 1));
  };

  if (loading) {
    return <div style={{ ...pageWrap, color: "#667085", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>Loading sessions…</div>;
  }

  return (
    <div style={pageWrap}>
      <div style={{ ...heroCard, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ maxWidth: "460px" }}>
            <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Training Sessions</div>
            <div style={{ fontSize: "clamp(2rem, 7vw, 3rem)", lineHeight: 0.98, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "10px" }}>
              Configure your next debate.
            </div>
            <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)" }}>
              Topics are assigned from your unlocked difficulty pool. Lock the topic, choose your opponent, then pick a side.
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

      <div style={{ ...sectionCard, padding: "10px", marginBottom: "18px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {["Topic", "Opponent", "Side"].map((label, index) => (
          <button key={label} onClick={() => setStep(index)} style={tabStyle(step === index, done[index])}>
            {done[index] ? "✓ " : ""}
            {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <>
          <div style={{ ...sectionCard, padding: "18px 20px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={eyebrowSmall}>Assigned Topic</div>
                <div style={{ fontSize: "26px", lineHeight: 1.15, fontWeight: 800, color: "#111827", marginTop: "8px", maxWidth: "520px" }}>
                  {topic ? topic.title : "No topic available"}
                </div>
              </div>
              {topic?.difficulty && <DifficultyChip difficulty={topic.difficulty} />}
            </div>

            {topic && (
              <>
                <div style={{ fontSize: "14px", color: "#475467", lineHeight: 1.75, marginTop: "12px", marginBottom: "14px" }}>
                  {topic.description}
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <div style={{ padding: "7px 11px", borderRadius: "999px", background: "#eef2ff", color: "#4338ca", fontSize: "11px", fontWeight: 700 }}>
                    Tag: {topic.tag}
                  </div>
                  <div style={{ padding: "7px 11px", borderRadius: "999px", background: "#f8fafc", color: "#475467", fontSize: "11px", fontWeight: 700 }}>
                    Refreshes left: {refreshesLeft}/{TRAINING_TOPIC_REFRESH_LIMIT}
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={refreshTopic}
              disabled={!topic || refreshesLeft <= 0}
              style={{ ...solidBtn, background: "linear-gradient(135deg, #64748b 0%, #475569 100%)", boxShadow: "0 12px 24px rgba(71, 85, 105, 0.20)", opacity: !topic || refreshesLeft <= 0 ? 0.5 : 1 }}
            >
              Refresh Topic
            </button>
            <button onClick={() => setStep(1)} disabled={!topic} style={{ ...solidBtn, opacity: topic ? 1 : 0.5 }}>
              Lock Topic
            </button>
          </div>
        </>
      )}

      {step === 1 && (
        <div style={{ display: "grid", gap: "12px" }}>
          {characters.map((character) => {
            const active = char?.id === character.id;
            return (
              <button
                key={character.id}
                onClick={() => {
                  setChar(character);
                  setStep(2);
                }}
                style={cardBtn(active)}
              >
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "32px", flexShrink: 0 }}>{character.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "'Fraunces', serif", marginBottom: "4px" }}>{character.name}</div>
                    <div style={{ fontSize: "13px", opacity: active ? 0.78 : 0.66, marginBottom: "8px" }}>{character.tagline}</div>
                    <div style={{ fontSize: "13px", opacity: active ? 0.88 : 0.72, lineHeight: 1.65, marginBottom: "12px" }}>{character.description}</div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {Object.entries(character.settings).map(([key, value]) => (
                        <SettingPill key={key} label={key} value={value} active={active} />
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && topic && (
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ ...sectionCard, padding: "18px 20px" }}>
            <div style={eyebrowSmall}>Locked Topic</div>
            <div style={{ fontSize: "22px", lineHeight: 1.2, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "8px" }}>{topic.title}</div>
          </div>
          {["A", "B"].map((nextSide) => {
            const data = nextSide === "A" ? topic.sideA : topic.sideB;
            const active = side === nextSide;
            return (
              <button key={nextSide} onClick={() => setSide(nextSide)} style={cardBtn(active)}>
                <div style={{ ...eyebrowSmall, marginBottom: "8px", color: active ? "rgba(255,255,255,0.72)" : undefined }}>
                  Side {nextSide}
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "10px" }}>{data.position}</div>
                {data.args.map((arg, index) => (
                  <div key={index} style={{ fontSize: "13px", lineHeight: 1.65, opacity: active ? 0.92 : 0.72, marginBottom: "4px" }}>
                    · {arg}
                  </div>
                ))}
              </button>
            );
          })}
        </div>
      )}

      {done.every(Boolean) && (
        <button onClick={() => onStart({ topic, character: char, side, sessionId: `session-${Date.now()}` })} style={{ ...solidBtn, marginTop: "20px" }}>
          Begin Session
        </button>
      )}
    </div>
  );
}
