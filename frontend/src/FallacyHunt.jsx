import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://localhost:3001/api";

// ─── FALLACY DICTIONARY ────────────────────────────────────────────────────────
// Every fallacy that can appear as a chip option.
// "definition" is shown on hover/tap.
const FALLACY_DICT = {
  "Ad hominem":                  "Attacking the person instead of the argument.",
  "Straw man":                   "Misrepresenting someone's position to make it easier to attack.",
  "Strawman":                    "Misrepresenting someone's position to make it easier to attack.",
  "False dilemma":               "Presenting only two options when more exist.",
  "Slippery slope":              "Claiming one step will inevitably lead to extreme outcomes without enough proof.",
  "Circular reasoning":          "Using the conclusion as part of the premise.",
  "Hasty generalization":        "Drawing a broad conclusion from too little evidence.",
  "Appeal to authority":         "Treating a claim as true only because an authority says it is.",
  "Bandwagon fallacy":           "Arguing something is true or right because many people believe it.",
  "Red herring":                 "Introducing an irrelevant point to distract from the main issue.",
  "Tu quoque":                   "Rejecting criticism by accusing the other person of the same flaw.",
  "Post hoc":                    "Assuming that because one event followed another, the first caused the second.",
  "Post hoc ergo propter hoc":   "Assuming that because one event followed another, the first caused the second.",
  "Correlation vs. causation":   "Treating a statistical relationship as proof of cause.",
  "Appeal to emotion":           "Using feelings like fear, pity, or anger instead of evidence.",
  "False analogy":               "Comparing two things that are not similar in the relevant way.",
  "Equivocation":                "Using a key word in two different meanings during the same argument.",
  "No true Scotsman":            "Redefining a group to dismiss counterexamples.",
  "Begging the question":        "Assuming the truth of what must be proved.",
  "Cherry picking":              "Selecting only evidence that supports your side and ignoring the rest.",
  "Loaded question":             "Asking a question that contains an unfair assumption.",
  "Appeal to ignorance":         "Claiming something is true because it has not been proven false, or the reverse.",
  "Genetic fallacy":             "Judging a claim based on its source instead of its merits.",
  "Composition fallacy":         "Assuming what is true of the parts must be true of the whole.",
  "Division fallacy":            "Assuming what is true of the whole must be true of each part.",
  "Special pleading":            "Applying standards, principles, or exceptions unfairly to protect a claim.",
  "Moving the goalposts":        "Changing the standard of proof after it has been met.",
  "False cause":                 "Assigning causation without enough evidence.",
  "Appeal to tradition":         "Claiming something is right because it has long been done.",
  "Appeal to novelty":           "Claiming something is better because it is new.",
  "Black and white thinking":    "Oversimplifying a complex issue into extreme categories.",
  "Anecdotal fallacy":           "Using a personal story or isolated example as strong proof.",
  "Scapegoating":                "Blaming a person or group unfairly for a complex problem.",
  "Non sequitur":                "A conclusion that does not logically follow from the premises.",
  "Exaggeration":                "Overstating the likely consequences to make a point seem stronger.",
  "Appeal to nature":            "Claiming something is good or safe simply because it is natural.",
};

const ALL_FALLACY_NAMES = Object.keys(FALLACY_DICT).filter(
  // remove aliases — keep canonical names only
  k => k !== "Strawman" && k !== "Post hoc ergo propter hoc"
);

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalise(name) {
  // Map dataset aliases to canonical keys
  if (name === "Strawman") return "Straw man";
  if (name === "Post hoc") return "Post hoc ergo propter hoc";
  return name;
}

function buildOptions(correctFallacies) {
  // Always show 6 chips: all correct + random wrong ones to fill
  const normalised = correctFallacies.map(normalise);
  const wrong = shuffle(
    ALL_FALLACY_NAMES.filter(f => !normalised.includes(f))
  ).slice(0, Math.max(0, 6 - normalised.length));
  return shuffle([...normalised, ...wrong]);
}

function buildRound(rawData) {
  return shuffle(rawData).slice(0, 5).map(item => {
    const normFallacies = item.fallacies.map(normalise);
    return {
      ...item,
      fallacies: normFallacies,
      options: buildOptions(normFallacies),
    };
  });
}

function calcScore(selected, correct) {
  const hits  = selected.filter(f => correct.includes(f)).length;
  const wrong = selected.filter(f => !correct.includes(f)).length;
  return Math.max(0, hits - wrong);
}

function getResultMessage(score, maxScore) {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct === 1)   return "Flawless. You could teach this.";
  if (pct >= 0.75) return "Sharp eye — a few slipped past you.";
  if (pct >= 0.5)  return "You're spotting patterns. Keep going.";
  if (pct >= 0.25) return "The arguments fooled you more than once.";
  return "Logic traps are tricky. Replay to sharpen your eye.";
}

// ─── TOOLTIP ───────────────────────────────────────────────────────────────────
// Appears on hover (desktop) and on tap (mobile).
// Positioned above the chip; flips below if too close to top of viewport.
function Tooltip({ text, visible, anchorRef }) {
  const tooltipRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, flipDown: false });

  useEffect(() => {
    if (!visible || !anchorRef.current) return;
    const r   = anchorRef.current.getBoundingClientRect();
    const vw  = window.innerWidth;
    const TW  = 220; // tooltip width
    let left  = r.left + r.width / 2 - TW / 2;
    if (left < 8)      left = 8;
    if (left + TW > vw - 8) left = vw - TW - 8;
    const flipDown = r.top < 80;
    setPos({ top: flipDown ? r.bottom + 8 : r.top - 8, left, flipDown });
  }, [visible, anchorRef]);

  if (!visible) return null;

  return (
    <div
      ref={tooltipRef}
      style={{
        position: "fixed",
        top: pos.flipDown ? pos.top : undefined,
        bottom: pos.flipDown ? undefined : `calc(100vh - ${pos.top}px)`,
        left: pos.left,
        width: "220px",
        background: "#1a1a1a",
        color: "#fff",
        fontSize: "12px",
        lineHeight: 1.55,
        padding: "9px 12px",
        borderRadius: "7px",
        pointerEvents: "none",
        zIndex: 200,
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      }}
    >
      {text}
      {/* Arrow */}
      <div style={{
        position: "absolute",
        [pos.flipDown ? "top" : "bottom"]: "-5px",
        left: "50%",
        transform: "translateX(-50%)",
        width: 0,
        height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        [pos.flipDown ? "borderBottom" : "borderTop"]: "5px solid #1a1a1a",
      }} />
    </div>
  );
}

// ─── CHIP ──────────────────────────────────────────────────────────────────────
// A single selectable fallacy chip with hover/tap tooltip.
function Chip({ label, chipState, onToggle, submitted }) {
  const [showTip, setShowTip]   = useState(false);
  const [tapped,  setTapped]    = useState(false); // tracks tap-to-show on mobile
  const ref                     = useRef(null);
  const definition              = FALLACY_DICT[label] || "";

  // Desktop: show tooltip on hover
  const handleMouseEnter = () => { if (!tapped) setShowTip(true); };
  const handleMouseLeave = () => { setShowTip(false); setTapped(false); };

  // Mobile: first tap shows tooltip, second tap toggles selection
  const handleClick = (e) => {
    if (submitted) return;
    // On touch devices, first interaction shows definition
    const isTouch = e.nativeEvent?.pointerType === "touch";
    if (isTouch && !tapped) {
      e.preventDefault();
      setTapped(true);
      setShowTip(true);
      return;
    }
    setShowTip(false);
    setTapped(false);
    onToggle(label);
  };

  const chipStyle = {
    position: "relative",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    textAlign: "center",
    cursor: submitted ? "default" : "pointer",
    border: "1px solid",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.15s",
    userSelect: "none",
    background:
      chipState === "selected"     ? "#1a1a1a" :
      chipState === "correct-hit"  ? "#edf7ee" :
      chipState === "correct-miss" ? "#fff3e0" :
      chipState === "wrong-pick"   ? "#fdecea" : "#fafafa",
    borderColor:
      chipState === "selected"     ? "#1a1a1a" :
      chipState === "correct-hit"  ? "#c8e6c9" :
      chipState === "correct-miss" ? "#ffcc80" :
      chipState === "wrong-pick"   ? "#ffcdd2" : "#e8e8e8",
    color:
      chipState === "selected"     ? "#fff"    :
      chipState === "correct-hit"  ? "#1a5c20" :
      chipState === "correct-miss" ? "#e65100" :
      chipState === "wrong-pick"   ? "#b71c1c" : "#555",
  };

  // Small "?" hint visible only before submit
  const hintDot = !submitted && (
    <span style={{
      position: "absolute", top: "5px", right: "7px",
      fontSize: "9px", color: chipState === "selected" ? "rgba(255,255,255,0.5)" : "#ccc",
      fontFamily: "'DM Mono', monospace",
    }}>?</span>
  );

  return (
    <>
      <button
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={chipStyle}
      >
        {hintDot}
        {label}
      </button>
      <Tooltip text={definition} visible={showTip && !!definition} anchorRef={ref} />
    </>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  wrap:       { maxWidth: "660px", margin: "0 auto", padding: "44px 24px", fontFamily: "'DM Sans', sans-serif" },
  eyebrow:    { fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", fontFamily: "'DM Mono', monospace", marginBottom: "6px" },
  h1:         { fontSize: "2rem", fontWeight: 600, color: "#1a1a1a", margin: "8px 0 0", fontFamily: "'Playfair Display', Georgia, serif" },
  p:          { fontSize: "14px", color: "#666", lineHeight: 1.7, margin: "12px 0 0" },
  topBar:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" },
  pipRow:     { display: "flex", gap: "5px" },
  pip:        (s) => ({ width: "24px", height: "4px", borderRadius: "2px", background: s === "done" ? "#1a1a1a" : s === "current" ? "#888" : "#e8e8e8", transition: "background 0.3s" }),
  scoreBadge: { fontSize: "13px", color: "#888", fontFamily: "'DM Mono', monospace", fontWeight: 500 },
  argCard:    { background: "#f5f5f0", border: "1px solid #eee", borderRadius: "10px", padding: "20px 24px", marginBottom: "20px" },
  catTag:     { fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", fontFamily: "'DM Mono', monospace", marginBottom: "8px" },
  argText:    { fontSize: "15px", color: "#1a1a1a", lineHeight: 1.7, fontStyle: "italic" },
  prompt:     { fontSize: "13px", color: "#888", marginBottom: "6px" },
  tipHint:    { fontSize: "11px", color: "#ccc", marginBottom: "14px", fontFamily: "'DM Mono', monospace" },
  hint:       { fontSize: "12px", color: "#bbb", marginBottom: "14px", fontFamily: "'DM Mono', monospace" },
  grid:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "18px" },
  submitBtn:  { padding: "10px 22px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: "16px" },
  submitDis:  { padding: "10px 22px", background: "#e8e8e8", color: "#bbb", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "default", fontFamily: "'DM Sans', sans-serif", marginBottom: "16px" },
  feedback:   (good) => ({ padding: "16px 20px", borderRadius: "8px", border: "1px solid", fontSize: "13px", lineHeight: 1.65, marginBottom: "16px", background: good ? "#edf7ee" : "#fdecea", borderColor: good ? "#c8e6c9" : "#ffcdd2", color: good ? "#1a5c20" : "#b71c1c" }),
  fbLabel:    { fontWeight: 600, marginBottom: "4px" },
  legend:     { display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" },
  dot:        (c) => ({ width: "9px", height: "9px", borderRadius: "50%", background: c, flexShrink: 0 }),
  legendItem: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#888" },
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

// ─── SPLASH ────────────────────────────────────────────────────────────────────
function Splash({ onStart, loading }) {
  return (
    <div style={S.wrap}>
      <div style={S.eyebrow}>Warm-up · Fallacy Hunt</div>
      <h1 style={S.h1}>Spot the flaw</h1>
      <p style={S.p}>
        Every bad argument hides its flaw in plain sight.<br />
        Read the argument, then select every logical fallacy you can find.
      </p>
      <div style={S.howGrid}>
        <div style={S.howCard}><div style={S.howNum}>01</div><div style={S.howText}>Read a short flawed argument</div></div>
        <div style={S.howCard}><div style={S.howNum}>02</div><div style={S.howText}>Hover a chip to see its definition, then click to select</div></div>
        <div style={S.howCard}><div style={S.howNum}>03</div><div style={S.howText}>Submit — wrong picks cost −1 point</div></div>
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

// ─── QUESTION ──────────────────────────────────────────────────────────────────
function Question({ questions, current, totalScore, onScore, onNext }) {
  const q = questions[current];
  const [selected,  setSelected]  = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const isLast = current === questions.length - 1;

  // Reset state when question changes
  useEffect(() => { setSelected([]); setSubmitted(false); }, [current]);

  const toggleChip = (f) => {
    if (submitted) return;
    setSelected(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const handleSubmit = () => {
    if (submitted || selected.length === 0) return;
    setSubmitted(true);
    onScore(calcScore(selected, q.fallacies));
  };

  const getChipState = (f) => {
    if (!submitted) return selected.includes(f) ? "selected" : "idle";
    const isCorrect = q.fallacies.includes(f);
    const wasPicked = selected.includes(f);
    if (isCorrect && wasPicked)  return "correct-hit";
    if (isCorrect && !wasPicked) return "correct-miss";
    if (!isCorrect && wasPicked) return "wrong-pick";
    return "idle";
  };

  const hits    = submitted ? selected.filter(f => q.fallacies.includes(f)).length : 0;
  const wrong   = submitted ? selected.filter(f => !q.fallacies.includes(f)).length : 0;
  const pts     = submitted ? Math.max(0, hits - wrong) : 0;
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
        <>
          <p style={S.hint}>{q.fallacies.length} flaw{q.fallacies.length > 1 ? "s" : ""} to find · wrong picks cost −1</p>
          <p style={S.tipHint}>Hover (or tap) a chip to see its definition before selecting.</p>
        </>
      )}

      <div style={S.grid}>
        {q.options.map((f, i) => (
          <Chip
            key={`${current}-${i}`}
            label={f}
            chipState={getChipState(f)}
            onToggle={toggleChip}
            submitted={submitted}
          />
        ))}
      </div>

      {/* Legend */}
      {submitted && (
        <div style={S.legend}>
          <div style={S.legendItem}><div style={S.dot("#4caf50")} /><span>Found it</span></div>
          <div style={S.legendItem}><div style={S.dot("#ff9800")} /><span>Missed it</span></div>
          <div style={S.legendItem}><div style={S.dot("#ef5350")} /><span>Wrong pick</span></div>
        </div>
      )}

      {/* Submit / feedback / next */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0}
          style={selected.length === 0 ? S.submitDis : S.submitBtn}
        >
          Submit →
        </button>
      ) : (
        <>
          <div style={S.feedback(perfect)}>
            <div style={S.fbLabel}>
              {perfect
                ? `Perfect — ${pts} / ${q.fallacies.length} pts`
                : pts > 0
                ? `${pts} point${pts > 1 ? "s" : ""} — not quite complete`
                : "No points this round"}
            </div>
            {q.explanation}
          </div>
          <button onClick={onNext} style={S.nextBtn}>
            {isLast ? "See results →" : "Next argument →"}
          </button>
        </>
      )}
    </div>
  );
}

// ─── RESULT ────────────────────────────────────────────────────────────────────
function Result({ score, maxScore, onReplay, onFinish }) {
  return (
    <div style={{ ...S.wrap, textAlign: "center" }}>
      <div style={S.eyebrow}>Result · Fallacy Hunt</div>
      <div style={S.resultBig}>
        {score}<span style={{ fontSize: "28px", color: "#ccc" }}>/{maxScore}</span>
      </div>
      <div style={S.resultSub}>points scored</div>
      <div style={S.resultMsg}>{getResultMessage(score, maxScore)}</div>
      <div style={{ ...S.btnRow, justifyContent: "center" }}>
        <button onClick={onReplay} style={S.outlineBtn}>Play again</button>
        <button onClick={onFinish} style={S.solidBtn}>Start a debate session →</button>
      </div>
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function FallacyHunt({ onFinish }) {
  const [screen,     setScreen]     = useState("splash");
  const [rawData,    setRawData]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [questions,  setQuestions]  = useState([]);
  const [current,    setCurrent]    = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore,   setMaxScore]   = useState(0);

  useEffect(() => {
    fetch(`${API}/fallacies`)
      .then(r => r.json())
      .then(data => { setRawData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const startGame = useCallback(() => {
    const qs = buildRound(rawData);
    setQuestions(qs);
    setCurrent(0);
    setTotalScore(0);
    setMaxScore(qs.reduce((sum, q) => sum + q.fallacies.length, 0));
    setScreen("game");
  }, [rawData]);

  const handleScore = (pts) => setTotalScore(prev => prev + pts);

  const handleNext = () => {
    const next = current + 1;
    if (next >= questions.length) setScreen("result");
    else setCurrent(next);
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