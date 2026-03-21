import { useState, useEffect, useCallback } from "react";

// ─── FALLACY HUNT ──────────────────────────────────────────────────────────────
// Mini-game: read an argument, identify all the logical fallacies hidden in it.
//
// INTEGRATION — three steps:
//
// 1. In App.jsx, import at the top:
//      import FallacyHunt from "./FallacyHunt";
//
// 2. Add "fallacy" as a screen in the Root component:
//      {screen === "fallacy" && <FallacyHunt onFinish={() => setScreen("clash")} />}
//
// 3. Add a way to reach it — e.g. a button on the ClashGame result screen,
//    or add it to the screen flow: clash → fallacy → setup
// ──────────────────────────────────────────────────────────────────────────────

const API = "httpngth - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// For each question, show the correct fallacies + enough wrong ones to fill 6 options
function buildOptions(correctFallacies) {
  const wrong = shuffle(
    ALL_FALLACY_NAMES.filter(f => !correctFallacies.includes(f))
  ).slice(0, Math.max(0, 6 - correctFallacies.length));
  return shuffle([...correctFallacies, ...wrong]);
}

function buildRound(rawData) {
  return shuffle(rawData).slice(0, 5).map(item => ({
    ...item,
    options: buildOptions(item.fallacies),
  }));
}

function getScore(selected, correct) {
  const hits = selected.filter(f => correct.includes(f)).length;
  const wrong = selected.filter(f => !correct.includes(f)).length;
  return Math.max(0, hits - wrong);
}

function getResultMessage(score, maxScore) {
  const pct = score / maxScore;
  if (pct === 1)    return "Flawless. You could teach this.";
  if (pct >= 0.75)  return "Sharp eye — a few slipped past you.";
  if (pct >= 0.5)   return "You're spotting patterns. Keep going.";
  if (pct  0.25)  return "The arguments fooled you more than once.";
  return "Logic traps are tricky. Replay to sharpen your eye.";
}

// ── Styles ────────────────────────────────────────────────────────── sans-serif" },
  eyebrow:    { fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", fontFamily: "'DM Mono', monospace", marginBottom: "6px" },
  h1:         { fontSize: "2rem", fontWeight: 600, color: "#1a1a1a", margin: "8px 0 0", fontFamily: "'Playfair Display', Georgia, serif" },
  p:          { fontSize: "14px", color: "#666", lineHeight: 1.7, margin: "12px 0 0" },
  topBar:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" },
  pipRow:     { display: "flex", gap: "5px" },
  pip:        (state) => ({ width: "24px", height: "4px", borderRadius: "2px", background: state === "done" ? "#1a1a1a" : state === "current"DM Mono', monospace", fontWeight: 500 },
  argCard:    { background: "#f5f5f0", border: "1px solid #eee", borderRadius: "10px", padding: "20px 24px", marginBottom: "20px" },
  catTag:     { fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", fontFamily: "'DM Mono', monospace", marginBottom: "8px" },
  argText:    { fontSize: "15px", color: "#1a1a1a", lineHeight: 1.7, fontStyle: "italic" },
  prompt:     { fontSize: "13px", color: "#888", marginBottom: "12px" },
  hint:       { fontSize: "12px", color: "#bbb", marginBottom: "14px", fontFamily: "'DM Mono', monospace" },
  grid:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "18px" },
  chip:       (state) => ({
    padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
    textAlign: "center", cursor: state === "idle" || state === "selected" ? "pointer" : "default",
    border: "1px solid", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
    background:
      state === "selected"      ? "#1a1a1a" :
      state === "correct-hit"   ? "#edf7ee" :
      state === "correct-miss"  ? "#fff3e0" :
      state === "wrong-pick"    ? "#fdecea" : "#fafafa",
    borderColor:
      state === "selected"      ? "#1a1a1a" :
      state === "correct-hit"   ? "#c8e6c9" :
      state === "correct-miss"  ? "#ffcc80" :
      state === "wrong-pick"    ? "#ffcdd2" : "#e8e8e8",
    color:
      state === "selected"      ? "#fff" :
      state === "correct-hit"   ? "#1a5c20" :
      state === "correct-miss"  ? "#e65100" :
      state === "wrong-pick"    ? "#b71c1c" : "#555",
  }),
  submitBtn:  { padding: "10px 22px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: "16px" },
  submitDis:  { padding: "10px 22px", background: "#e8e8e8", color: "#bbb", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "default", fontFamily: "'DM Sans', sans-serif", marginBottom: "16px" },
  feedback:   (good) => ({ padding: "16px 20px", borderRadius: "8px", border: "1px solid", fontSize: "13px", lineHeight: 1.65, marginBottom: "16px", background: good ? "#edf7ee" : "#fdecea", borderColor: good ? "#c8e6c9" : "#ffcdd2", color: good ? "#1a5c20" : "#b71c1c" }),
  fbLabel:    { fontWeight: 600, marginBottom: "4px" },
  legend:     { display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" },
  legendItem: (color, text) => ({ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#888" }),
  dot:        (color) => ({ width: "10px", height: "10px", borderRadius: "50%", background: color, flexShrink: 0 }),
  nextBtn:    { padding: "10px 22px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  solidBtn:   { padding: "10px 22px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  outlineBtn: { padding: "10px 22px", background: "#fff", color: "#1a1a1a", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  howGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", margin: "24px 0" },
  howCard:    { background: "#f5f5f0", borderRadius: "8px", padding: "14px 16px" },
  howNum:     { fontSize: "10px", color: "#bbb", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: "6px" },
  howText:    { fontSize: "13px", color: "#555", lineHeight: 1.5 },
  resultBig:  { fontSize: "56px", fontWeight: 300, fontFamily: "'DM Mono', monospace", color: "#1a1a1a", margin: "24px 0 4px" },
  resultSub:  { fontSize: "14px", color: "#888", marginBottom: "6px" },
  resultMsg:  { fontSize: "13px", color: "#bbb", marginBottom: "32px" },
  btnRow:     { display: "flex", gap: "10px", flexWrap: "wrap" },
};

// ── Splash ─────────────────────────────────────────────────────────────────────1 style={S.h1}>Spot the flaw</h1>
      <p style={S.p}>
        Every bad argument hides its flaw in plain sight.<br />
        Read the argument, then select every logical fallacy you can find.
      </p>
      <div style={S.howGrid}>
        <div style={S.howCard}><div stiv><div style={S.howText}>Select all fallacies hiding inside it</div></div>
        <div style={S.howCard}><div style={S.howNum}>03</div><div style={S.howText}>See exactly how each flaw works</div></div>
      </div>
      <p style={{ fontSize: "12px", color: "#ccc", marginBottom: "20px", fontFamily: "'DM Mono', monospace" }}>
        5 arguments · select all that apply · wrong picks cost points
      </p>
      <button onClick={onStart} disabled={loading} style={{ ...S.solidBtn, opacity: loading ? 0.5 : 1 }}>
      {loading ? "Loading…" : "Start →"}
      </button>
    </div>
  );
}

// ── Question ────────────────────────────────────────────────────────────────────
function Question({ questions, current, totalScore, maxScore, onScore, onNext }) {
  const q           = questions[current];
  const [selected, setSelected]   = useState([]);
  const [submitted, setSelected(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    const pts = getScore(selected, q.fallacies);
    onScore(pts, q.fallacies.length);
  };

  const getChipState = (f) => {
    if (!submitted) return selected.includes(f) ? "selected" : "idle";
    const isCorrect = q.fallacies.includes(f);
    const wasPicked = selected.includes(f);
    if (isCorrec!isCorrect && wasPicked) return "wrong-pick";    // red: wrong pick
    return "idle";
  };

  const hits  = submitted ? selected.filter(f => q.fallacies.includes(f)).length : 0;
  const wrong = submitted ? selected.filter(f => !q.fallacies.includes(f)).length : 0;
  const pts   = submitted ? Math.max(0, hits - wrong) : 0;
  const perfect = submitted && hits === q.fallacies.length && wrong === 0;

  return (
    <div style={S.wrap}>
      {/* Progress + score */}
      <div style={S.topBar}>
        <div style={S.pipRow}>
          {questions.map((_, i) => (
            <div key={i} style={S.pip(i < current ? "done" : i === current ? "current" : "empty")} />
          ))}
        </div>
        <div style={S.scoreBadge}>{totalScore} pts</div>
      </div>

      {/* Argument */}
      <div style={S.argCard}>
        <div style={S.catTag}>{q.category}</div>
        <div style={S.argText}>"{q.argument}"</div>
      </div>

      {/* Chip grid */}
      <p style={S.prompt}>Select every logical fallacy hiding in this argument.</p>
      {!submitted && (
        <p style={S.hint}>
          {q.fallacies.length} flaw{q.fallacies.length > 1 ? "s" : ""} to find · wrong picks cost −1
        </p>
      )}

      <div style={S.grid}>
        {q.options.map((f, i) => (
          <button key={i} onClick={() => toggleChip(f)} style={S.chip(getChipState(f))}>
            {f}
          </button>
        ))}
   </div>

      {/* Legend after submit */}
      {submitted && (
        <div style={S.legend}>
          <div style={S.legendItem()}><div style={S.dot("#4caf50")} /><span>Found it</span></div>
          <div style={S.legendItem()}><div style={S.dot("#ff9800")} /><span>Missed it</span></div>
          <div style={S.legendItem()}><div style={S.dot("#ef5350")} /><span>Wrong pick</span></div>
        </div>
      )}

      {/* Submit */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          dbled={selected.length === 0}
          style={selected.length === 0 ? S.submitDis : S.submitBtn}
        >
          Submit →
        </button>
      ) : (
        <>
          {/* Feedback */}
          <div style={S.feedback(perfect)}>
            <div style={S.fbLabel}>
              {perft ? `Perfect — ${pts} / ${q.fallacies.length} pts` :
               pts > 0 ? `${pts} point${pts > 1 ? "s" : ""} — not quite complete` :
               "No points this round"}
            </div>
            {q.explanation}
          </div>
          <button onClick={onNext} style={S.nextBtn}>
            {isLast ? "See results →" : "Next argument →"}
    tton>
        </>
      )}
    </div>
  );
}

// ── Result ──────────────────────────────────────────────────────────────────────
function Result({ score, maxScore, onReplay, onFinish }) {
  return (
    <div style={{ ...S.wrap, textAlign: "center" }}>
      <div style={S.eyebrow}>Result · Fallacy Hunt</div>
      <div style={S.resultBig}>{score}<span style={{ fontSize: "28n</button>
        <button onClick={onFinish} style={S.solidBtn}>Start a debate session →</button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function FallacyHunt({ onFinish }) {
  const [screen,     setScreen]    = useState("splash");
  const [rawData,    setRawData]   = useState([]);
  const [loading,    setLoading]   = uscore, setTotalScore] = useState(0);
  const [maxScore,   setMaxScore]  = useState(0);

  useEffect(() => {
    fetch(`${API}/fallacies`)
      .then(r => r.json())
      .then(data => { setRawData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const startGame = useCallback(() => {
    const qs q.fallacies.length, 0));
    setScreen("game");
  }, [rawData]);

  const handleScore = (pts) => {
    setTotalScore(prev => prev + pts);
  };

  const handleNext = () => {
    const next = current + 1;
    if (next >= questions.length) {
      setScreen("result");
    } else {
      setCurrent(next);
    }
  };

  if (screen === "splash") return <Splash onStart={startGame} loading={loading} />;

  if (screen === "game") return (
    <Question
      questions={questions}
      current={current}
      totalScore={totalScore}
      maxScore={maxScore}
      onScore={handleScore}
      onNext={handleNext}
    />
  );

  if (screen === "result") return (
    <Result
      score={totalScore}
      maxScore={maxScore}
      onReplay={startGame}
      onFinish={onFinish}
    />
  );

  return null;
}


