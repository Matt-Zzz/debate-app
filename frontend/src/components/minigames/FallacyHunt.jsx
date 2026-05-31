import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../lib/api";
import { mg, solidBtn, secondaryBtn, theme } from "../../styles/minigameStyles";

const FALLACY_DICT = {
  "Ad hominem": "Attacking the person instead of the argument.",
  "Straw man": "Misrepresenting someone's position to make it easier to attack.",
  Strawman: "Misrepresenting someone's position to make it easier to attack.",
  "False dilemma": "Presenting only two options when more exist.",
  "Slippery slope": "Claiming one step will inevitably lead to extreme outcomes without enough proof.",
  "Circular reasoning": "Using the conclusion as part of the premise.",
  "Hasty generalization": "Drawing a broad conclusion from too little evidence.",
  "Appeal to authority": "Treating a claim as true only because an authority says it is.",
  "Bandwagon fallacy": "Arguing something is true or right because many people believe it.",
  "Red herring": "Introducing an irrelevant point to distract from the main issue.",
  "Tu quoque": "Rejecting criticism by accusing the other person of the same flaw.",
  "Post hoc": "Assuming that because one event followed another, the first caused the second.",
  "Post hoc ergo propter hoc": "Assuming that because one event followed another, the first caused the second.",
  "Correlation vs. causation": "Treating a statistical relationship as proof of cause.",
  "Appeal to emotion": "Using feelings like fear, pity, or anger instead of evidence.",
  "False analogy": "Comparing two things that are not similar in the relevant way.",
  Equivocation: "Using a key word in two different meanings during the same argument.",
  "No true Scotsman": "Redefining a group to dismiss counterexamples.",
  "Begging the question": "Assuming the truth of what must be proved.",
  "Cherry picking": "Selecting only evidence that supports your side and ignoring the rest.",
  "Loaded question": "Asking a question that contains an unfair assumption.",
  "Appeal to ignorance": "Claiming something is true because it has not been proven false, or the reverse.",
  "Genetic fallacy": "Judging a claim based on its source instead of its merits.",
  "Composition fallacy": "Assuming what is true of the parts must be true of the whole.",
  "Division fallacy": "Assuming what is true of the whole must be true of each part.",
  "Special pleading": "Applying standards, principles, or exceptions unfairly to protect a claim.",
  "Moving the goalposts": "Changing the standard of proof after it has been met.",
  "False cause": "Assigning causation without enough evidence.",
  "Appeal to tradition": "Claiming something is right because it has long been done.",
  "Appeal to novelty": "Claiming something is better because it is new.",
  "Black and white thinking": "Oversimplifying a complex issue into extreme categories.",
  "Anecdotal fallacy": "Using a personal story or isolated example as strong proof.",
  Scapegoating: "Blaming a person or group unfairly for a complex problem.",
  "Non sequitur": "A conclusion that does not logically follow from the premises.",
  Exaggeration: "Overstating the likely consequences to make a point seem stronger.",
  "Appeal to nature": "Claiming something is good or safe simply because it is natural.",
};

const ALL_FALLACY_NAMES = Object.keys(FALLACY_DICT).filter(
  (k) => k !== "Strawman" && k !== "Post hoc ergo propter hoc"
);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalise(name) {
  if (name === "Strawman") return "Straw man";
  if (name === "Post hoc") return "Post hoc ergo propter hoc";
  return name;
}

function buildOptions(correctFallacies) {
  const normalised = correctFallacies.map(normalise);
  const wrong = shuffle(ALL_FALLACY_NAMES.filter((f) => !normalised.includes(f))).slice(
    0,
    Math.max(0, 6 - normalised.length)
  );
  return shuffle([...normalised, ...wrong]);
}

function buildRound(rawData) {
  return shuffle(rawData).slice(0, 5).map((item) => {
    const normFallacies = item.fallacies.map(normalise);
    return {
      ...item,
      fallacies: normFallacies,
      options: buildOptions(normFallacies),
    };
  });
}

function calcScore(selected, correct) {
  const hits = selected.filter((f) => correct.includes(f)).length;
  const wrong = selected.filter((f) => !correct.includes(f)).length;
  return Math.max(0, hits - wrong);
}

function getResultMessage(score, maxScore) {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct === 1) return "Flawless. You could teach this.";
  if (pct >= 0.75) return "Sharp eye — a few slipped past you.";
  if (pct >= 0.5) return "You're spotting patterns. Keep going.";
  if (pct >= 0.25) return "The arguments fooled you more than once.";
  return "Logic traps are tricky. Replay to sharpen your eye.";
}

function Tooltip({ text, visible, anchorRef }) {
  const [pos, setPos] = useState({ top: 0, left: 0, flipDown: false });

  useEffect(() => {
    if (!visible || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const TW = 220;
    let left = r.left + r.width / 2 - TW / 2;
    if (left < 8) left = 8;
    if (left + TW > vw - 8) left = vw - TW - 8;
    const flipDown = r.top < 80;
    setPos({ top: flipDown ? r.bottom + 8 : r.top - 8, left, flipDown });
  }, [visible, anchorRef]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: pos.flipDown ? pos.top : undefined,
        bottom: pos.flipDown ? undefined : `calc(100vh - ${pos.top}px)`,
        left: pos.left,
        width: "220px",
        background: theme.ink,
        color: "#fff",
        fontSize: "12px",
        lineHeight: 1.55,
        padding: "10px 12px",
        borderRadius: "12px",
        pointerEvents: "none",
        zIndex: 200,
        boxShadow: "0 12px 28px rgba(15,23,42,0.18)",
      }}
    >
      {text}
    </div>
  );
}

function Chip({ label, chipState, onToggle, submitted }) {
  const [showTip, setShowTip] = useState(false);
  const [tapped, setTapped] = useState(false);
  const ref = useRef(null);
  const definition = FALLACY_DICT[label] || "";

  const handleMouseEnter = () => {
    if (!tapped) setShowTip(true);
  };
  const handleMouseLeave = () => {
    setShowTip(false);
    setTapped(false);
  };

  const handleClick = (e) => {
    if (submitted) return;
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

  return (
    <>
      <button
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={mg.chipBtn(chipState)}
      >
        {!submitted && (
          <span
            style={{
              position: "absolute",
              top: "5px",
              right: "7px",
              fontSize: "9px",
              color: chipState === "selected" ? "rgba(255,255,255,0.55)" : theme.muted,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ?
          </span>
        )}
        {label}
      </button>
      <Tooltip text={definition} visible={showTip && !!definition} anchorRef={ref} />
    </>
  );
}

function SeedBox({ context }) {
  if (context?.type !== "seed" || (!context.excerpt && !context.coachNote)) return null;
  return (
    <div style={mg.seedBox}>
      {context.excerpt && (
        <div style={{ marginBottom: context.coachNote ? "8px" : 0 }}>
          &ldquo;{context.excerpt}&rdquo;
        </div>
      )}
      {context.coachNote && (
        <div style={{ fontStyle: "normal", fontWeight: 600, color: "#374151" }}>
          {context.coachNote}
        </div>
      )}
    </div>
  );
}

function Splash({ onStart, loading }) {
  return (
    <div>
      <div style={mg.eyebrow}>Warm-up · Fallacy hunt</div>
      <div style={mg.title}>Spot the flaw</div>
      <div style={mg.support}>
        Read the argument, then select every logical fallacy you can find. Wrong picks cost one point.
      </div>

      <div style={mg.howGrid}>
        <div style={mg.howCard}>
          <div style={mg.howNum}>01</div>
          <div style={mg.howText}>Read a short flawed argument</div>
        </div>
        <div style={mg.howCard}>
          <div style={mg.howNum}>02</div>
          <div style={mg.howText}>Hover a chip to see its definition, then select</div>
        </div>
        <div style={mg.howCard}>
          <div style={mg.howNum}>03</div>
          <div style={mg.howText}>Submit — wrong picks cost −1 point</div>
        </div>
      </div>

      <div style={{ ...mg.scoreBadge, marginBottom: "16px" }}>
        5 arguments · select all that apply
      </div>

      <button onClick={onStart} disabled={loading} style={{ ...solidBtn, opacity: loading ? 0.5 : 1 }}>
        {loading ? "Loading…" : "Start →"}
      </button>
    </div>
  );
}

function Question({ questions, current, totalScore, onScore, onNext, context }) {
  const q = questions[current];
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const isLast = current === questions.length - 1;

  useEffect(() => {
    setSelected([]);
    setSubmitted(false);
  }, [current]);

  const toggleChip = (f) => {
    if (submitted) return;
    setSelected((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
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
    if (isCorrect && wasPicked) return "correct-hit";
    if (isCorrect && !wasPicked) return "correct-miss";
    if (!isCorrect && wasPicked) return "wrong-pick";
    return "idle";
  };

  const hits = submitted ? selected.filter((f) => q.fallacies.includes(f)).length : 0;
  const wrong = submitted ? selected.filter((f) => !q.fallacies.includes(f)).length : 0;
  const pts = submitted ? Math.max(0, hits - wrong) : 0;
  const perfect = submitted && hits === q.fallacies.length && wrong === 0;

  return (
    <div>
      <div style={mg.topBar}>
        <div style={{ ...mg.progressRow, flex: 1, marginBottom: 0 }}>
          {questions.map((_, i) => (
            <div key={i} style={mg.pip(i < current ? "done" : i === current ? "current" : "empty")} />
          ))}
        </div>
        <div style={mg.scoreBadge}>{totalScore} pts</div>
      </div>

      <div style={mg.eyebrow}>Fallacy hunt</div>
      <div style={mg.title}>Find the logical flaws</div>
      <div style={mg.support}>Select every fallacy hiding in this argument.</div>

      <SeedBox context={context} />

      <div style={mg.contentCard()}>
        <div style={mg.metaLabel}>{q.category}</div>
        <div style={{ ...mg.cardBody, fontStyle: "italic" }}>&ldquo;{q.argument}&rdquo;</div>
      </div>

      {!submitted && (
        <div style={{ ...mg.scoreBadge, marginBottom: "12px" }}>
          {q.fallacies.length} flaw{q.fallacies.length > 1 ? "s" : ""} to find · hover or tap chips for definitions
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
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

      {submitted && (
        <div style={mg.legend}>
          <div style={mg.legendItem}>
            <div style={mg.legendDot("#16a34a")} />
            <span>Found it</span>
          </div>
          <div style={mg.legendItem}>
            <div style={mg.legendDot("#d97706")} />
            <span>Missed it</span>
          </div>
          <div style={mg.legendItem}>
            <div style={mg.legendDot("#dc2626")} />
            <span>Wrong pick</span>
          </div>
        </div>
      )}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0}
          style={{ ...solidBtn, opacity: selected.length === 0 ? 0.45 : 1 }}
        >
          Submit →
        </button>
      ) : (
        <>
          <div style={mg.feedbackBox(perfect ? "correct" : pts > 0 ? "partial" : "wrong")}>
            <div style={mg.feedbackTitle(perfect ? "correct" : pts > 0 ? "partial" : "wrong")}>
              {perfect
                ? `Perfect — ${pts} / ${q.fallacies.length} pts`
                : pts > 0
                  ? `${pts} point${pts > 1 ? "s" : ""} — not quite complete`
                  : "No points this round"}
            </div>
            <div style={{ ...mg.feedbackText, marginBottom: 0 }}>{q.explanation}</div>
          </div>
          <button onClick={onNext} style={solidBtn}>
            {isLast ? "See results →" : "Next argument →"}
          </button>
        </>
      )}
    </div>
  );
}

function Result({ score, maxScore, onReplay, onFinish }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={mg.eyebrow}>Result</div>
      <div style={mg.resultScore}>
        {score}
        <span style={{ fontSize: "0.5em", color: "rgba(15,23,42,0.28)" }}>/{maxScore}</span>
      </div>
      <div style={mg.resultSub}>points scored</div>
      <div style={mg.resultMsg}>{getResultMessage(score, maxScore)}</div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onReplay} style={secondaryBtn}>Play again</button>
        <button onClick={onFinish} style={solidBtn}>Continue →</button>
      </div>
    </div>
  );
}

export default function FallacyHunt({ onFinish, context }) {
  const startTime = useRef(Date.now());
  const [screen, setScreen] = useState(context ? "game" : "splash");
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE_URL}/fallacies`)
      .then((r) => r.json())
      .then((data) => {
        setRawData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const startGame = useCallback(() => {
    const qs = buildRound(rawData);
    setQuestions(qs);
    setCurrent(0);
    setTotalScore(0);
    setMaxScore(qs.reduce((sum, q) => sum + q.fallacies.length, 0));
    startTime.current = Date.now();
    setScreen("game");
  }, [rawData]);

  useEffect(() => {
    if (context && !loading && rawData.length > 0 && screen === "game" && questions.length === 0) {
      startGame();
    }
  }, [context, loading, rawData, screen, questions.length, startGame]);

  const handleScore = (pts) => setTotalScore((prev) => prev + pts);

  const handleNext = () => {
    const next = current + 1;
    if (next >= questions.length) setScreen("result");
    else setCurrent(next);
  };

  const handleFinish = () => {
    onFinish?.(totalScore, maxScore, Date.now() - startTime.current);
  };

  if (screen === "splash") return <Splash onStart={startGame} loading={loading} />;

  if (screen === "game" && questions.length > 0) {
    return (
      <Question
        questions={questions}
        current={current}
        totalScore={totalScore}
        onScore={handleScore}
        onNext={handleNext}
        context={context}
      />
    );
  }

  if (screen === "result") {
    return (
      <Result
        score={totalScore}
        maxScore={maxScore}
        onReplay={startGame}
        onFinish={handleFinish}
      />
    );
  }

  if (loading) return <div style={mg.support}>Loading arguments…</div>;
  return null;
}
