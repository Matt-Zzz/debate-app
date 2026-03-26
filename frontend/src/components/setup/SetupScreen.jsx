import { useEffect, useState } from "react";
import { DIFF_COLOR } from "../../constants/debate";
import { apiFetch } from "../../lib/api";
import { cardBtn, eyebrow, eyebrowSmall, headline, pageWrap, solidBtn } from "../../styles/ui";

export default function SetupScreen({ onStart }) {
  const [topics, setTopics] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState(null);
  const [char, setChar] = useState(null);
  const [side, setSide] = useState(null);
  const [tagFilter, setTagFilter] = useState("All");

  useEffect(() => {
    Promise.all([apiFetch("/topics"), apiFetch("/characters")])
      .then(([nextTopics, nextCharacters]) => {
        setTopics(nextTopics);
        setCharacters(nextCharacters);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const done = [!!topic, !!char, !!side];
  const tags = ["All", ...Array.from(new Set(topics.map((item) => item.tag)))];
  const filtered = tagFilter === "All" ? topics : topics.filter((item) => item.tag === tagFilter);

  if (loading) {
    return <div style={{ ...pageWrap, color: "#999", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>Loading…</div>;
  }

  return (
    <div style={pageWrap}>
      <div style={{ marginBottom: "40px" }}>
        <div style={eyebrow}>Debate Simulator</div>
        <h1 style={headline}>Configure your session</h1>
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
        <>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                style={{
                  padding: "4px 12px",
                  fontSize: "11px",
                  borderRadius: "20px",
                  border: "1px solid",
                  borderColor: tagFilter === tag ? "#1a1a1a" : "#ddd",
                  background: tagFilter === tag ? "#1a1a1a" : "#fff",
                  color: tagFilter === tag ? "#fff" : "#666",
                  cursor: "pointer",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setTopic(item);
                  setStep(1);
                }}
                style={{ ...cardBtn(topic?.id === item.id), padding: "14px 18px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.4, fontFamily: "'Playfair Display', serif", marginBottom: "3px" }}>{item.title}</div>
                    <div style={{ fontSize: "11px", opacity: 0.6 }}>{item.description}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
                    <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", opacity: 0.55, textTransform: "uppercase" }}>{item.tag}</div>
                    <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", fontWeight: 600, color: topic?.id === item.id ? "rgba(255,255,255,0.8)" : DIFF_COLOR[item.difficulty] }}>{item.difficulty}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
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
