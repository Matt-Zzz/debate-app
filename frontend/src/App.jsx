import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const API = "http://localhost:3001/api";

// ─── API HELPERS ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.message || "API error"), { status: res.status, data: err });
  }
  return res.json();
}

// Streams opponent speech from the Python SSE endpoint.
// onChunk(token) is called for each piece of text as it arrives.
// Returns the full assembled string when the stream ends.
async function streamOpponentSpeech(payload, onChunk) {
  const res = await fetch(`${API}/opponent-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.message || "Stream error"), { data: err });
  }
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full   = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep any incomplete line for next iteration
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") return full;
      if (payload.startsWith("[ERROR]")) throw new Error(payload.slice(8));
      // Unescape newlines the server escaped to keep SSE frames intact
      const token = payload.replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
      full += token;
      onChunk(token);
    }
  }
  return full;
}

// ─── FORMAT ────────────────────────────────────────────────────────────────────
const FORMAT = [
  { name: "Your Constructive", role: "user", duration: 180, description: "Present your full case. Define key terms, state your framework, and lay out your main contentions with warrants." },
  { name: "Opponent Rebuttal", role: "opponent", duration: 120, description: "Your opponent responds to your constructive." },
  { name: "Your Rebuttal", role: "user", duration: 120, description: "Rebuild your case and clash directly with opponent arguments. Do not introduce new contentions." },
  { name: "Opponent Summary", role: "opponent", duration: 90, description: "Your opponent crystallizes their key arguments." },
  { name: "Your Summary", role: "user", duration: 90, description: "Collapse to your strongest 2–3 arguments. Explain why you win the round." },
];

// ─── TIMER ─────────────────────────────────────────────────────────────────────
function Timer({ totalSeconds, isRunning, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const ref = useRef(null);
  useEffect(() => { setRemaining(totalSeconds); }, [totalSeconds]);
  useEffect(() => {
    if (isRunning) {
      ref.current = setInterval(() => {
        setRemaining(p => { if (p <= 1) { clearInterval(ref.current); onExpire(); return 0; } return p - 1; });
      }, 1000);
    } else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [isRunning, onExpire]);
  const pct = (remaining / totalSeconds) * 100;
  const m = Math.floor(remaining / 60), s = remaining % 60;
  const low = remaining < 30 && remaining > 0;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "2.6rem", fontFamily: "'DM Mono', monospace", fontWeight: 300, color: low ? "#c0392b" : "#1a1a1a", letterSpacing: "0.04em", transition: "color 0.3s" }}>
        {m}:{s.toString().padStart(2, "0")}
      </div>
      <div style={{ height: "3px", background: "#eee", borderRadius: "2px", marginTop: "6px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: low ? "#c0392b" : "#1a1a1a", transition: "width 1s linear, background 0.3s" }} />
      </div>
    </div>
  );
}

// ─── SKELETON LOADERS ──────────────────────────────────────────────────────────
function Skeleton({ width = "100%", height = "14px", style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: "4px",
      background: "linear-gradient(90deg,#f0f0f0 25%,#e4e4e4 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      ...style,
    }} />
  );
}

function RubricSkeleton() {
  return (
    <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: "10px", padding: "20px 24px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <Skeleton width="80px" height="11px" />
        <Skeleton width="64px" height="36px" style={{ borderRadius: "6px" }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <Skeleton width="150px" height="11px" />
            <Skeleton width="30px" height="11px" />
          </div>
          <Skeleton height="5px" style={{ borderRadius: "3px" }} />
        </div>
      ))}
    </div>
  );
}

function FeedbackSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
      {[["#edf7ee",["100%","88%","60%"]], ["#fdecea",["100%","75%"]], ["#e8f2fd",["100%","55%"]]].map(([bg, widths], i) => (
        <div key={i} style={{ padding: "16px 20px", background: bg, borderRadius: "8px" }}>
          <Skeleton width="60px" height="10px" style={{ marginBottom: "12px" }} />
          {widths.map((w, j) => (
            <Skeleton key={j} width={w} height="13px" style={{ marginBottom: j < widths.length - 1 ? "6px" : "0" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── RUBRIC DISPLAY ────────────────────────────────────────────────────────────
function RubricDisplay({ rubric }) {
  if (!rubric) return null;
  const { total, breakdown } = rubric;
  const scoreColor = total >= 80 ? "#2e7d32" : total >= 60 ? "#e65100" : total >= 40 ? "#b8860b" : "#c62828";
  return (
    <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: "10px", padding: "20px 24px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={eyebrowSmall}>Rubric Score</div>
        <div style={{ fontSize: "2.2rem", fontFamily: "'DM Mono', monospace", fontWeight: 300, color: scoreColor }}>{total}<span style={{ fontSize: "1rem", color: "#aaa" }}>/100</span></div>
      </div>
      {Object.values(breakdown).map((cat) => (
        <div key={cat.label} style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <div style={{ fontSize: "12px", color: "#555" }}>{cat.label}</div>
            <div style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: cat.score >= cat.max * 0.7 ? "#2e7d32" : cat.score >= cat.max * 0.4 ? "#e65100" : "#c62828" }}>
              {cat.score}/{cat.max}
            </div>
          </div>
          <div style={{ height: "5px", background: "#eee", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(cat.score / cat.max) * 100}%`, background: cat.score >= cat.max * 0.7 ? "#2e7d32" : cat.score >= cat.max * 0.4 ? "#e65100" : "#c62828", borderRadius: "3px", transition: "width 0.6s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DRILL PANEL ───────────────────────────────────────────────────────────────
function DrillPanel({ drill, sessionId, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!drill) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await apiFetch(`/drills/${drill.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ sessionId, answers, score: Object.keys(answers).length }),
      });
      setSubmitted(true);
      onComplete({ drill, answers });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (submitted) {
    return (
      <div style={{ padding: "20px 24px", background: "#edf7ee", borderRadius: "10px", border: "1px solid #c8e6c9" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "8px", color: "#2e7d32" }}>✓ Drill Completed</div>
        <div style={{ fontSize: "14px", color: "#1a5c20", lineHeight: 1.6 }}>{drill.completionPrompt}</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "20px 24px" }}>
      <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>{drill.tag} · Next Drill</div>
      <div style={{ fontSize: "17px", fontWeight: 600, fontFamily: "'Playfair Display', serif", marginBottom: "6px" }}>{drill.name}</div>
      <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.55, marginBottom: "16px" }}>{drill.instructions}</div>
      {drill.questions.map((q, i) => (
        <div key={i} style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px", fontFamily: "'DM Mono', monospace" }}>Q{i + 1}. {q}</div>
          <textarea
            value={answers[i] || ""}
            onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
            placeholder="Your answer…"
            style={{ width: "100%", minHeight: "64px", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", lineHeight: 1.55, resize: "vertical", fontFamily: "'DM Sans', sans-serif", background: "#fff", boxSizing: "border-box" }}
          />
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={handleSubmit} disabled={saving} style={{ ...solidBtn, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Submit Drill"}
        </button>
        <div style={{ fontSize: "12px", color: "#aaa" }}>Rubric: {drill.rubric}</div>
      </div>
    </div>
  );
}

// ─── SETUP SCREEN ──────────────────────────────────────────────────────────────
const DIFF_COLOR = { Easy: "#2e7d32", Medium: "#e65100", Hard: "#c62828" };

function SetupScreen({ onStart }) {
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
      .then(([t, c]) => { setTopics(t); setCharacters(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const done = [!!topic, !!char, !!side];
  const tags = ["All", ...Array.from(new Set(topics.map(t => t.tag)))];
  const filtered = tagFilter === "All" ? topics : topics.filter(t => t.tag === tagFilter);

  if (loading) return <div style={{ ...pageWrap, color: "#999", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>Loading…</div>;

  return (
    <div style={pageWrap}>
      <div style={{ marginBottom: "40px" }}>
        <div style={eyebrow}>Debate Simulator</div>
        <h1 style={headline}>Configure your session</h1>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: "24px", borderBottom: "1px solid #eee" }}>
        {["Topic", "Opponent", "Side"].map((l, i) => (
          <button key={i} onClick={() => setStep(i)} style={{ padding: "10px 20px", background: "none", border: "none", borderBottom: step === i ? "2px solid #1a1a1a" : "2px solid transparent", cursor: "pointer", fontSize: "13px", fontWeight: step === i ? 600 : 400, color: step === i ? "#1a1a1a" : done[i] ? "#555" : "#bbb", fontFamily: "'DM Sans', sans-serif", marginBottom: "-1px" }}>
            {done[i] ? "✓ " : ""}{l}
          </button>
        ))}
      </div>

      {step === 0 && (
        <>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
            {tags.map(t => <button key={t} onClick={() => setTagFilter(t)} style={{ padding: "4px 12px", fontSize: "11px", borderRadius: "20px", border: "1px solid", borderColor: tagFilter === t ? "#1a1a1a" : "#ddd", background: tagFilter === t ? "#1a1a1a" : "#fff", color: tagFilter === t ? "#fff" : "#666", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{t}</button>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
            {filtered.map(t => (
              <button key={t.id} onClick={() => { setTopic(t); setStep(1); }} style={{ ...cardBtn(topic?.id === t.id), padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.4, fontFamily: "'Playfair Display', serif", marginBottom: "3px" }}>{t.title}</div>
                    <div style={{ fontSize: "11px", opacity: 0.6 }}>{t.description}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
                    <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", opacity: 0.55, textTransform: "uppercase" }}>{t.tag}</div>
                    <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", fontWeight: 600, color: topic?.id === t.id ? "rgba(255,255,255,0.8)" : DIFF_COLOR[t.difficulty] }}>{t.difficulty}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {characters.map(c => (
            <button key={c.id} onClick={() => { setChar(c); setStep(2); }} style={cardBtn(char?.id === c.id)}>
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "24px", flexShrink: 0 }}>{c.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "2px", fontFamily: "'Playfair Display', serif" }}>{c.name}</div>
                  <div style={{ fontSize: "12px", opacity: 0.6, marginBottom: "6px" }}>{c.tagline}</div>
                  <div style={{ fontSize: "12px", opacity: char?.id === c.id ? 0.85 : 0.55, lineHeight: 1.5 }}>{c.description}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", flexShrink: 0 }}>
                  {Object.entries(c.settings).map(([k, v]) => <div key={k} style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", opacity: 0.5, whiteSpace: "nowrap" }}>{k}: {v}</div>)}
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
          {["A", "B"].map(s => {
            const data = s === "A" ? topic.sideA : topic.sideB;
            return (
              <button key={s} onClick={() => setSide(s)} style={cardBtn(side === s)}>
                <div style={{ ...eyebrowSmall, marginBottom: "6px", color: side === s ? "rgba(255,255,255,0.55)" : undefined }}>Side {s} · {data.position}</div>
                {data.args.map((a, i) => <div key={i} style={{ fontSize: "13px", lineHeight: 1.6, opacity: side === s ? 0.9 : 0.7 }}>· {a}</div>)}
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

// ─── DEBATE SCREEN ─────────────────────────────────────────────────────────────
function DebateScreen({ config, onComplete }) {
  const { topic, character, side } = config;
  const [idx, setIdx] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [userText, setUserText] = useState("");
  // Ref always holds the latest userText so the auto-submit closure can read it
  const userTextRef = useRef("");
  const stageNameRef = useRef("");
  const [streamedText, setStreamedText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [stageDone, setStageDone] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const transcriptRef = useRef([]);
  const [safetyWarning, setSafetyWarning] = useState(null);

  const stage = FORMAT[idx];
  const isUser = stage.role === "user";
  const isLast = idx === FORMAT.length - 1;
  const sideData = side === "A" ? topic.sideA : topic.sideB;

  // Keep refs in sync so callbacks always see fresh values
  useEffect(() => { stageNameRef.current = stage.name; }, [stage.name]);

  const addToTranscript = useCallback((entry) => {
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript(transcriptRef.current);
  }, []);

  // ── Auto-submit when timer hits zero on a user stage ──────────────────────
  const handleExpire = useCallback(() => {
    setTimerRunning(false);
    if (isUser) {
      const captured = userTextRef.current.trim() || "(Time expired — no speech recorded)";
      addToTranscript({ stageName: stageNameRef.current, role: "user", text: captured });
      setUserText("");
      userTextRef.current = "";
      setAutoSubmitted(true);
      setStageDone(true);
    } else {
      // Opponent timer ran out — just mark done so user can proceed
      setStageDone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUser, addToTranscript]);

  // ── Start stage ───────────────────────────────────────────────────────────
  const startStage = async () => {
    setAutoSubmitted(false);
    if (isUser) { setTimerRunning(true); return; }

    // Opponent turn: stream the speech token-by-token
    const lastUser = [...transcriptRef.current].reverse().find(t => t.role === "user")?.text || "";
    setStreamedText("");
    setStreaming(true);
    try {
      await streamOpponentSpeech(
        { characterId: character.id, topicId: topic.id, side, stageName: stage.name, userSpeech: lastUser },
        (token) => setStreamedText(prev => prev + token),
      );
    } catch (e) {
      if (e.data?.safe === false) setSafetyWarning(e.data.message);
      else setStreamedText(prev => prev || "There was an error generating a response. Please continue.");
    }
    setStreaming(false);
    setTimerRunning(true);
  };

  // ── Manual user submit ────────────────────────────────────────────────────
  const submitUser = async () => {
    if (userText.trim()) {
      try {
        const check = await apiFetch("/safety-check", { method: "POST", body: JSON.stringify({ text: userText }) });
        if (!check.safe) { setSafetyWarning(check.message); return; }
      } catch (_) { /* allow on network error */ }
    }
    setTimerRunning(false);
    addToTranscript({ stageName: stage.name, role: "user", text: userText || "(No speech recorded)" });
    setUserText("");
    userTextRef.current = "";
    setStageDone(true);
  };

  // ── Mark opponent speech as heard ─────────────────────────────────────────
  const markHeard = () => {
    setTimerRunning(false);
    addToTranscript({ stageName: stage.name, role: "opponent", text: streamedText });
    setStreamedText("");
    setStageDone(true);
  };

  const next = () => {
    if (isLast) { onComplete(transcriptRef.current); return; }
    setIdx(i => i + 1);
    setStageDone(false);
    setAutoSubmitted(false);
    setTimerRunning(false);
    setTimerKey(k => k + 1);
    setStreamedText("");
  };

  return (
    <div style={pageWrap}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .stream-cursor::after { content:"▎"; animation:blink 1s infinite; margin-left:1px; font-size:.85em; color:#aaa; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <div style={eyebrow}>vs {character.avatar} {character.name}</div>
          <div style={{ fontSize: "13px", color: "#555", maxWidth: "440px", lineHeight: 1.5, marginTop: "3px" }}>{topic.title}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...eyebrow, textAlign: "right" }}>Side {side}: {sideData.position}</div>
          <div style={{ fontSize: "11px", color: "#bbb", marginTop: "2px" }}>Stage {idx + 1}/{FORMAT.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
        {FORMAT.map((_, i) => <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i < idx ? "#1a1a1a" : i === idx ? "#888" : "#e8e8e8", transition: "background 0.3s" }} />)}
      </div>

      {safetyWarning && (
        <div style={{ padding: "14px 18px", background: "#fff8e6", border: "1px solid #ffe082", borderRadius: "8px", marginBottom: "16px" }}>
          <div style={{ ...eyebrowSmall, marginBottom: "4px", color: "#b8860b" }}>⚠ Content Notice</div>
          <div style={{ fontSize: "13px", color: "#7a5c00", lineHeight: 1.55 }}>{safetyWarning}</div>
          <button onClick={() => setSafetyWarning(null)} style={{ marginTop: "10px", padding: "6px 14px", background: "#fff", border: "1px solid #ddd", borderRadius: "5px", fontSize: "12px", cursor: "pointer" }}>Dismiss</button>
        </div>
      )}

      <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "22px 26px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>{stage.name}</h2>
            <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#777", lineHeight: 1.5 }}>{stage.description}</p>
          </div>
          <div style={{ marginLeft: "24px", minWidth: "106px" }}>
            <Timer key={timerKey} totalSeconds={stage.duration} isRunning={timerRunning} onExpire={handleExpire} />
          </div>
        </div>

        {/* User turn: not started */}
        {!stageDone && isUser && !timerRunning && (
          <button onClick={startStage} style={solidBtn}>Start Timer & Speak</button>
        )}

        {/* User turn: timer running — textarea + manual submit */}
        {!stageDone && isUser && timerRunning && (
          <>
            <textarea
              value={userText}
              onChange={e => { setUserText(e.target.value); userTextRef.current = e.target.value; }}
              placeholder="Type your argument here — it will auto-submit when time runs out…"
              style={{ width: "100%", minHeight: "100px", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", lineHeight: 1.6, resize: "vertical", fontFamily: "'DM Sans', sans-serif", background: "#fff", marginBottom: "10px", boxSizing: "border-box" }}
            />
            <button onClick={submitUser} style={solidBtn}>Submit Speech</button>
          </>
        )}

        {/* Auto-submit notice shown after expire */}
        {stageDone && autoSubmitted && (
          <div style={{ padding: "10px 14px", background: "#fff3e0", border: "1px solid #ffe0b2", borderRadius: "6px", fontSize: "13px", color: "#e65100", marginBottom: "12px" }}>
            ⏱ Time expired — your speech was automatically submitted.
          </div>
        )}

        {/* Opponent turn: not started */}
        {!stageDone && !isUser && !streaming && !streamedText && (
          <button onClick={startStage} style={solidBtn}>Generate {character.name}'s Response</button>
        )}

        {/* Opponent turn: streaming or done streaming — show text word-by-word */}
        {!stageDone && !isUser && (streaming || streamedText) && (
          <>
            <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "6px", padding: "14px 16px", marginBottom: "12px" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>{character.avatar} {character.name}</div>
              <div className={streaming ? "stream-cursor" : ""} style={{ fontSize: "14px", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                {streamedText}
              </div>
            </div>
            {!streaming && (
              <button onClick={markHeard} style={{ ...solidBtn, background: "#555" }}>Mark as Heard</button>
            )}
          </>
        )}

        {/* Stage complete */}
        {stageDone && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "#888" }}>Stage complete.</span>
            <button onClick={next} style={solidBtn}>{isLast ? "Get Coach Report →" : "Next Stage →"}</button>
          </div>
        )}
      </div>

      <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Watch out — {character.name} will flag:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {character.fallaciesDetected.slice(0, 5).map((f, i) => <div key={i} style={{ fontSize: "11px", padding: "3px 10px", background: "#fff", border: "1px solid #e8e8e8", borderRadius: "20px", color: "#555" }}>{f}</div>)}
        </div>
      </div>

      {transcript.length > 0 && (
        <div>
          <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Transcript</div>
          {transcript.map((e, i) => (
            <div key={i} style={{ padding: "9px 13px", marginBottom: "5px", borderLeft: `3px solid ${e.role === "user" ? "#1a1a1a" : "#ddd"}`, background: "#fafafa", borderRadius: "0 6px 6px 0" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "2px" }}>{e.stageName} · {e.role === "user" ? "YOU" : character.name.toUpperCase()}</div>
              <div style={{ fontSize: "13px", color: "#444", lineHeight: 1.6 }}>{e.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── REPORT SCREEN ─────────────────────────────────────────────────────────────
function ReportScreen({ config, transcript, onNew }) {
  const { topic, character, side, sessionId } = config;

  // rubric and feedback are set independently so rubric renders the instant
  // the fetch resolves, while skeletons hold the place for feedback
  const [rubric, setRubric] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [drills, setDrills] = useState([]);
  const [selectedDrill, setSelectedDrill] = useState(null);
  const [drillDone, setDrillDone] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    // Drills load independently — don't block the report
    apiFetch("/drills").then(setDrills).catch(() => {});

    apiFetch("/coach-report", {
      method: "POST",
      body: JSON.stringify({ topicId: topic.id, characterId: character.id, side, transcript }),
    }).then(r => {
      // Set rubric first — it renders immediately while the page is still loading
      setRubric(r.rubric);
      setFeedback(r.feedback);

      // Pick drill for weakest rubric category
      if (r.rubric?.breakdown) {
        const drillMap = { structure: "d10", argQuality: "d6", clash: "d9", impact: "d2", precision: "d1" };
        const weakestKey = Object.entries(r.rubric.breakdown)
          .sort((a, b) => (a[1].score / a[1].max) - (b[1].score / b[1].max))[0]?.[0];
        apiFetch("/drills").then(d => {
          setDrills(d);
          setSelectedDrill(d.find(dr => dr.id === (drillMap[weakestKey] || "d1")) || d[0]);
        }).catch(() => {});
      }
    }).catch(() => setFetchError(true));
  }, []);

  const sideData = side === "A" ? topic.sideA : topic.sideB;
  const feedbackBg = { STRENGTHS: "#edf7ee", GAPS: "#fdecea", "NEXT DRILL": "#e8f2fd" };

  return (
    <div style={pageWrap}>
      <div style={{ marginBottom: "36px" }}>
        <div style={eyebrow}>Session Complete</div>
        <h1 style={headline}>Coach Report</h1>
        <div style={{ fontSize: "13px", color: "#888", marginTop: "6px" }}>
          {topic.title.slice(0, 55)}… · <span style={{ color: DIFF_COLOR[topic.difficulty] }}>{topic.difficulty}</span> · {sideData.position} · vs {character.name}
        </div>
      </div>

      {fetchError && (
        <div style={{ color: "#c62828", fontSize: "13px", marginBottom: "16px" }}>
          Could not generate report. Check your backend connection.
        </div>
      )}

      {/* Rubric — shows immediately on arrival; skeleton until then */}
      {rubric ? <RubricDisplay rubric={rubric} /> : !fetchError && <RubricSkeleton />}

      {/* Feedback — skeleton while AI is working */}
      {feedback ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {[["STRENGTHS", feedback.strengths], ["GAPS", feedback.gaps], ["NEXT DRILL", feedback.nextDrill]].map(([label, content]) => content ? (
            <div key={label} style={{ padding: "16px 20px", background: feedbackBg[label] || "#f5f5f0", borderRadius: "8px" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>{label}</div>
              <div style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{content}</div>
            </div>
          ) : null)}
        </div>
      ) : !fetchError && <FeedbackSkeleton />}

      {/* Character insight — always available immediately */}
      <div style={{ padding: "14px 18px", background: "#fafafa", border: "1px solid #eee", borderRadius: "8px", marginBottom: "20px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>{character.avatar} What convinces {character.name}</div>
        {character.convincedBy.map((c, i) => <div key={i} style={{ fontSize: "12px", color: "#555", marginBottom: "2px" }}>· {c}</div>)}
      </div>

      {/* Assigned drill */}
      {!drillDone && selectedDrill && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Assigned Drill</div>
          <DrillPanel drill={selectedDrill} sessionId={sessionId} onComplete={() => setDrillDone(true)} />
        </div>
      )}
      {drillDone && (
        <div style={{ padding: "14px 18px", background: "#edf7ee", border: "1px solid #c8e6c9", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", color: "#2e7d32" }}>✓ Drill completed. Good work — bring this to your next session.</div>
        </div>
      )}

      {/* All drills */}
      {drills.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>All Drills</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {drills.map(d => (
              <button key={d.id} onClick={() => { setSelectedDrill(d); setDrillDone(false); window.scrollTo(0, document.body.scrollHeight); }} style={{ ...cardBtn(selectedDrill?.id === d.id), padding: "10px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: "11px", opacity: 0.6 }}>{d.description.slice(0, 70)}…</div>
                  </div>
                  <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", opacity: 0.5, marginLeft: "12px", flexShrink: 0 }}>{d.tag}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Full Transcript</div>
        {transcript.map((e, i) => (
          <div key={i} style={{ padding: "9px 13px", marginBottom: "5px", borderLeft: `3px solid ${e.role === "user" ? "#1a1a1a" : "#ddd"}`, background: "#fafafa", borderRadius: "0 6px 6px 0" }}>
            <div style={{ ...eyebrowSmall, marginBottom: "2px" }}>{e.stageName} · {e.role === "user" ? "YOU" : character.name.toUpperCase()}</div>
            <div style={{ fontSize: "13px", color: "#444", lineHeight: 1.6 }}>{e.text}</div>
          </div>
        ))}
      </div>

      <button onClick={onNew} style={solidBtn}>← Start New Session</button>
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const pageWrap = { maxWidth: "700px", margin: "0 auto", padding: "44px 24px" };
const eyebrow = { fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#999", fontFamily: "'DM Mono', monospace" };
const eyebrowSmall = { fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", fontFamily: "'DM Mono', monospace" };
const headline = { fontSize: "2rem", fontWeight: 600, color: "#1a1a1a", margin: "8px 0 0", fontFamily: "'Playfair Display', Georgia, serif" };
const solidBtn = { padding: "10px 22px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em" };
const cardBtn = (active) => ({ padding: "16px 20px", background: active ? "#1a1a1a" : "#fafafa", color: active ? "#fff" : "#1a1a1a", border: `1px solid ${active ? "#1a1a1a" : "#e8e8e8"}`, borderRadius: "8px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%" });

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("setup");
  const [config, setConfig] = useState(null);
  const [transcript, setTranscript] = useState([]);
  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=DM+Mono:wght@300;400&family=Playfair+Display:wght@400;600&display=swap');
        * { box-sizing: border-box; } textarea { outline: none !important; } textarea:focus { border-color: #1a1a1a !important; }
        button:hover { opacity: 0.82; transition: opacity 0.15s; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .stream-cursor::after { content:"▎"; animation:blink 1s infinite; margin-left:1px; font-size:.85em; color:#aaa; }
      `}</style>
      {screen === "setup" && <SetupScreen onStart={c => { setConfig(c); setScreen("debate"); }} />}
      {screen === "debate" && config && <DebateScreen config={config} onComplete={t => { setTranscript(t); setScreen("report"); }} />}
      {screen === "report" && config && <ReportScreen config={config} transcript={transcript} onNew={() => { setConfig(null); setTranscript([]); setScreen("setup"); }} />}
    </div>
  );
}
