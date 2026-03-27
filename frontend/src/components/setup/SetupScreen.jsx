import { useEffect, useState } from "react";
import { DIFF_COLOR, TRAINING_TOPIC_REFRESH_LIMIT } from "../../constants/debate";
import { apiFetch } from "../../lib/api";
import { cardBtn, eyebrow, eyebrowSmall, headline, pageWrap, solidBtn } from "../../styles/ui";

function pickRandomTopic(topics, excludeId = null) {
  if (!topics.length) return null;
  const pool = topics.filter((item) => item.id !== excludeId);
  const source = pool.length ? pool : topics;
  return source[Math.floor(Math.random() * source.length)];
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
    return <div style={{ ...pageWrap, color: "#999", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>Loading…</div>;
  }

  return (
    <div style={pageWrap}>
      <div style={{ marginBottom: "40px" }}>
        <div style={eyebrow}>Debate Simulator</div>
        <h1 style={headline}>Configure your session</h1>
        {user && (
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#666", lineHeight: 1.6 }}>
            Level {user.currentLevel}: {user.levelName} · unlocked topics: {user.unlockedDifficulties.join(" + ")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: "24px", borderBottom: "1px solid #eee" }}>
        {["Topic", "Opponent", "Side"].map((label, index) => (
          <button
            key={label}
            onClick={() => setStep(index)}
            style={{
              padding: "10px 20px",
              background: "none",
              border: "none",
              borderBottom: step === index ? "2px solid #1a1a1a" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: step === index ? 600 : 400,
              color: step === index ? "#1a1a1a" : done[index] ? "#555" : "#bbb",
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: "-1px",
            }}
          >
            {done[index] ? "✓ " : ""}
            {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ padding: "14px 16px", background: "#f5f5f0", borderRadius: "10px" }}>
            <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Topic Assignment</div>
            <div style={{ fontSize: "13px", color: "#555", lineHeight: 1.6 }}>
              Training topics are assigned randomly from your unlocked difficulty pool. You can refresh up to {TRAINING_TOPIC_REFRESH_LIMIT} times before starting.
            </div>
          </div>

          {topic ? (
            <div style={{ ...cardBtn(true), padding: "18px 20px", cursor: "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.4, fontFamily: "'Playfair Display', serif", marginBottom: "4px" }}>{topic.title}</div>
                  <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: 1.55 }}>{topic.description}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                  <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", opacity: 0.7, textTransform: "uppercase" }}>{topic.tag}</div>
                  <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{topic.difficulty}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#888", fontSize: "13px" }}>No topic available for this level.</div>
          )}

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={refreshTopic} disabled={!topic || refreshesLeft <= 0} style={{ ...solidBtn, background: "#555", opacity: !topic || refreshesLeft <= 0 ? 0.5 : 1 }}>
              Refresh Topic
            </button>
            <div style={{ fontSize: "12px", color: refreshesLeft > 0 ? "#666" : "#c62828", fontFamily: "'DM Mono', monospace" }}>
              Refreshes left: {refreshesLeft}/{TRAINING_TOPIC_REFRESH_LIMIT}
            </div>
            <button onClick={() => setStep(1)} disabled={!topic} style={{ ...solidBtn, opacity: topic ? 1 : 0.5 }}>
              Lock Topic →
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {characters.map((character) => (
            <button
              key={character.id}
              onClick={() => {
                setChar(character);
                setStep(2);
              }}
              style={cardBtn(char?.id === character.id)}
            >
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "24px", flexShrink: 0 }}>{character.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "2px", fontFamily: "'Playfair Display', serif" }}>{character.name}</div>
                  <div style={{ fontSize: "12px", opacity: 0.6, marginBottom: "6px" }}>{character.tagline}</div>
                  <div style={{ fontSize: "12px", opacity: char?.id === character.id ? 0.85 : 0.55, lineHeight: 1.5 }}>{character.description}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", flexShrink: 0 }}>
                  {Object.entries(character.settings).map(([key, value]) => (
                    <div key={key} style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", opacity: 0.5, whiteSpace: "nowrap" }}>
                      {key}: {value}
                    </div>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && topic && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ padding: "12px 16px", background: "#f5f5f0", borderRadius: "8px" }}>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>Topic</div>
            <div style={{ fontSize: "14px", fontFamily: "'Playfair Display', serif", lineHeight: 1.4 }}>{topic.title}</div>
          </div>
          {["A", "B"].map((nextSide) => {
            const data = nextSide === "A" ? topic.sideA : topic.sideB;
            return (
              <button key={nextSide} onClick={() => setSide(nextSide)} style={cardBtn(side === nextSide)}>
                <div style={{ ...eyebrowSmall, marginBottom: "6px", color: side === nextSide ? "rgba(255,255,255,0.55)" : undefined }}>Side {nextSide} · {data.position}</div>
                {data.args.map((arg, index) => (
                  <div key={index} style={{ fontSize: "13px", lineHeight: 1.6, opacity: side === nextSide ? 0.9 : 0.7 }}>
                    · {arg}
                  </div>
                ))}
              </button>
            );
          })}
        </div>
      )}

      {done.every(Boolean) && (
        <button onClick={() => onStart({ topic, character: char, side, sessionId: `session-${Date.now()}` })} style={{ ...solidBtn, marginTop: "28px" }}>
          Begin Session →
        </button>
      )}
    </div>
  );
}
