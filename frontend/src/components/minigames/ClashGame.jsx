import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../lib/api";

// ─── CLASH POINT PICKER ────────────────────────────────────────────────────────
// Self-contained mini-game component.
//
// INTEGRATION — two steps:
//
// 1. In App.jsx, import this at the top:
//      import ClashGame from "./ClashGame";
//
// 2. In the Root export default function, add "clash" as a possible screen
//    and render it:
//
//    const [screen, setScreen] = useState("clash");   // start on clash, or "setup"
//
//    {screen === "clash" && (
//      <ClashGame onFinish={(score, total) => {
//        // Called when the user finishes the mini-game.
//        // Transition to setup, optionally passing the score.
//        setScreen("setup");
//      }} />
//    )}
//
//    Add a way to reach it from the setup screen if you want it as an optional
//    warm-up rather than the default landing page.
// ──────────────────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound(rawTopics) {
  return shuffle(rawTopics).slice(0, 5).map(t => ({
    ...t,
    options: shuffle([t.clashPoint, ...shuffle(t.distractors).slice(0, 2)]),
  }));
}

function getResultMessage(score, total) {
  if (score === total) return "Perfect — you found every clash point.";
  if (score >= total * 0.7) return "Strong read. A few slipped past you.";
  if (score >= total * 0.4) return "You spotted some. Keep training your ear.";
  return "The surface arguments fooled you. Practice helps.";
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  wrap:         { maxWidth: "640px", margin: "0 auto", padding: "44px 24px", fontFamily: "'DM Sans', sans-serif" },
  eyebrow:      { fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", fontFamily: "'DM Mono', monospace", marginBottom: "6px" },
  h1:           { fontSize: "2rem", fontWeight: 600, color: "#1a1a1a", margin: "8px 0 0", fontFamily: "'Playfair Display', Georgia, serif" },
  p:            { fontSize: "14px", color: "#666", lineHeight: 1.7, margin: "12px 0 0" },
  topBar:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" },
  pipRow:       { display: "flex", gap: "5px" },
  pip:          (state) => ({ width: "24px", height: "4px", borderRadius: "2px", background: state === "done" ? "#1a1a1a" : state === "current" ? "#888" : "#e8e8e8", transition: "background 0.3s" }),
  scoreBadge:   { fontSize: "13px", color: "#888", fontFamily: "'DM Mono', monospace", fontWeight: 500 },
  topicCard:    { background: "#f5f5f0", border: "1px solid #eee", borderRadius: "10px", padding: "18px 22px", marginBottom: "18px" },
  categoryTag:  { fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", fontFamily: "'DM Mono', monospace", marginBottom: "6px" },
  topicText:    { fontSize: "16px", fontWeight: 500, color: "#1a1a1a", lineHeight: 1.55 },
  prompt:       { fontSize: "13px", color: "#888", marginBottom: "12px" },
  optionsWrap:  { display: "flex", flexDirection: "column", gap: "9px", marginBottom: "16px" },
  optionBtn:    (state) => ({
    padding: "13px 16px", borderRadius: "8px", fontSize: "14px", lineHeight: 1.5,
    textAlign: "left", cursor: state === "idle" ? "pointer" : "default",
    fontFamily: "'DM Sans', sans-serif", border: "1px solid",
    transition: "all 0.15s",
    background: state === "correct" ? "#edf7ee" : state === "wrong" ? "#fdecea" : state === "reveal" ? "#edf7ee" : "#fafafa",
    borderColor: state === "correct" ? "#c8e6c9" : state === "wrong" ? "#ffcdd2" : state === "reveal" ? "#c8e6c9" : "#e8e8e8",
    color: state === "correct" ? "#1a5c20" : state === "wrong" ? "#b71c1c" : state === "reveal" ? "#1a5c20" : "#1a1a1a",
  }),
  feedback:     (correct) => ({
    padding: "14px 18px", borderRadius: "8px", marginBottom: "16px",
    border: "1px solid", fontSize: "13px", lineHeight: 1.65,
    background: correct ? "#edf7ee" : "#fdecea",
    borderColor: correct ? "#c8e6c9" : "#ffcdd2",
    color: correct ? "#1a5c20" : "#b71c1c",
  }),
  fbLabel:      { fontWeight: 600, marginBottom: "4px" },
  solidBtn:     { padding: "10px 22px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  outlineBtn:   { padding: "10px 22px", background: "#fff", color: "#1a1a1a", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  howGrid:      { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", margin: "24px 0" },
  howCard:      { background: "#f5f5f0", borderRadius: "8px", padding: "14px 16px" },
  howNum:       { fontSize: "10px", color: "#bbb", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: "6px" },
  howText:      { fontSize: "13px", color: "#555", lineHeight: 1.5 },
  resultScore:  { fontSize: "56px", fontWeight: 300, fontFamily: "'DM Mono', monospace", color: "#1a1a1a", margin: "24px 0 4px" },
  resultLabel:  { fontSize: "14px", color: "#888", marginBottom: "6px" },
  resultMsg:    { fontSize: "13px", color: "#bbb", marginBottom: "32px" },
  btnRow:       { display: "flex", gap: "10px", flexWrap: "wrap" },
};

// ── Splash screen ───────────────────────────────────────────────────────────────
function Splash({ onStart, loading }) {
  return (
    <div style={s.wrap}>
      <div style={s.eyebrow}>Warm-up</div>
      <h1 style={s.h1}>Clash point picker</h1>
      <p style={s.p}>
        Every debate has a surface argument and a real disagreement underneath.<br />
        Can you tell them apart before you step into the arena?
      </p>
      <div style={s.howGrid}>
        <div style={s.howCard}><div style={s.howNum}>01</div><div style={s.howText}>Read a real debate topic</div></div>
        <div style={s.howCard}><div style={s.howNum}>02</div><div style={s.howText}>Pick the deepest point of disagreement</div></div>
        <div style={s.howCard}><div style={s.howNum}>03</div><div style={s.howText}>See why the other options miss the mark</div></div>
      </div>
      <p style={{ fontSize: "12px", color: "#ccc", marginBottom: "20px", fontFamily: "'DM Mono', monospace" }}>5 topics · ~2 minutes</p>
      <button onClick={onStart} disabled={loading} style={{ ...s.solidBtn, opacity: loading ? 0.5 : 1 }}>
        {loading ? "Loading…" : "Start →"}
      </button>
    </div>
  );
}

// ── Question screen ─────────────────────────────────────────────────────────────
function Question({ questions, current, score, chosen, onChoose, onNext }) {
  const q         = questions[current];
  const answered  = chosen !== null;
  const isLast    = current === questions.length - 1;

  const getState = (opt) => {
    if (!answered) return "idle";
    if (opt === q.clashPoint) return chosen === opt ? "correct" : "reveal";
    if (opt === chosen) return "wrong";
    return "idle";
  };

  return (
    <div style={s.wrap}>
      {/* Progress + score */}
      <div style={s.topBar}>
        <div style={s.pipRow}>
          {questions.map((_, i) => (
            <div key={i} style={s.pip(i < current ? "done" : i === current ? "current" : "empty")} />
          ))}
        </div>
        <div style={s.scoreBadge}>{score} / {current + (answered ? 1 : 0)}</div>
      </div>

      {/* Topic */}
      <div style={s.topicCard}>
        <div style={s.categoryTag}>{q.category}</div>
        <div style={s.topicText}>{q.topic}</div>
      </div>

      {/* Options */}
      <p style={s.prompt}>Which is the most important point of disagreement?</p>
      <div style={s.optionsWrap}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => !answered && onChoose(opt)}
            disabled={answered}
            style={s.optionBtn(getState(opt))}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {answered && (
        <div style={s.feedback(chosen === q.clashPoint)}>
          <div style={s.fbLabel}>{chosen === q.clashPoint ? "That's the clash point." : "Not quite."}</div>
          {q.explanation}
        </div>
      )}

      {/* Next */}
      {answered && (
        <button onClick={onNext} style={s.solidBtn}>
          {isLast ? "See results →" : "Next topic →"}
        </button>
      )}
    </div>
  );
}

// ── Result screen ───────────────────────────────────────────────────────────────
function Result({ score, total, onReplay, onDebate }) {
  return (
    <div style={{ ...s.wrap, textAlign: "center" }}>
      <div style={s.eyebrow}>Result</div>
      <div style={s.resultScore}>{score}/{total}</div>
      <div style={s.resultLabel}>clash points found</div>
      <div style={s.resultMsg}>{getResultMessage(score, total)}</div>
      <div style={{ ...s.btnRow, justifyContent: "center" }}>
        <button onClick={onReplay} style={s.outlineBtn}>Play again</button>
        <button onClick={onDebate} style={s.solidBtn}>Start a debate session →</button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function ClashGame({ onFinish }) {
  const [screen,    setScreen]    = useState("splash");
  const [rawTopics, setRawTopics] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [questions, setQuestions] = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [score,     setScore]     = useState(0);
  const [chosen,    setChosen]    = useState(null);

  // Fetch clash topics from backend on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/clash-topics`)
      .then(r => r.json())
      .then(data => { setRawTopics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const startGame = useCallback(() => {
    const qs = buildRound(rawTopics);
    setQuestions(qs);
    setCurrent(0);
    setScore(0);
    setChosen(null);
    setScreen("game");
  }, [rawTopics]);

  const handleChoose = (opt) => {
    setChosen(opt);
    if (opt === questions[current].clashPoint) setScore(s => s + 1);
  };

  const handleNext = () => {
    const nextIdx = current + 1;
    if (nextIdx >= questions.length) {
      setScreen("result");
    } else {
      setCurrent(nextIdx);
      setChosen(null);
    }
  };

  const handleDebate = () => {
    if (onFinish) onFinish(score, questions.length);
  };

  if (screen === "splash") return <Splash onStart={startGame} loading={loading} />;
  if (screen === "game")   return <Question questions={questions} current={current} score={score} chosen={chosen} onChoose={handleChoose} onNext={handleNext} />;
  if (screen === "result") return <Result score={score} total={questions.length} onReplay={startGame} onDebate={handleDebate} />;
  return null;
}
