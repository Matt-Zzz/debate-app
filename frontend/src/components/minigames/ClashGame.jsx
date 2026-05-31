import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../lib/api";
import { mg, solidBtn, secondaryBtn } from "../../styles/minigameStyles";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound(rawTopics) {
  return shuffle(rawTopics).slice(0, 5).map((t) => ({
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
      <div style={mg.eyebrow}>Warm-up</div>
      <div style={mg.title}>Clash point picker</div>
      <div style={mg.support}>
        Every debate has a surface argument and a real disagreement underneath. Can you tell them apart?
      </div>

      <div style={mg.howGrid}>
        <div style={mg.howCard}>
          <div style={mg.howNum}>01</div>
          <div style={mg.howText}>Read a real debate topic</div>
        </div>
        <div style={mg.howCard}>
          <div style={mg.howNum}>02</div>
          <div style={mg.howText}>Pick the deepest point of disagreement</div>
        </div>
        <div style={mg.howCard}>
          <div style={mg.howNum}>03</div>
          <div style={mg.howText}>See why the other options miss the mark</div>
        </div>
      </div>

      <div style={{ ...mg.scoreBadge, marginBottom: "16px" }}>5 topics · ~2 minutes</div>

      <button onClick={onStart} disabled={loading} style={{ ...solidBtn, opacity: loading ? 0.5 : 1 }}>
        {loading ? "Loading…" : "Start →"}
      </button>
    </div>
  );
}

function Question({ questions, current, score, chosen, onChoose, onNext, context }) {
  const q = questions[current];
  const answered = chosen !== null;
  const isLast = current === questions.length - 1;

  const getState = (opt) => {
    if (!answered) return "idle";
    if (opt === q.clashPoint) return chosen === opt ? "correct" : "reveal";
    if (opt === chosen) return "wrong";
    return "idle";
  };

  return (
    <div>
      <div style={mg.topBar}>
        <div style={{ ...mg.progressRow, flex: 1, marginBottom: 0 }}>
          {questions.map((_, i) => (
            <div
              key={i}
              style={mg.pip(i < current ? "done" : i === current ? "current" : "empty")}
            />
          ))}
        </div>
        <div style={mg.scoreBadge}>{score} / {current + (answered ? 1 : 0)}</div>
      </div>

      <div style={mg.eyebrow}>Clash point picker</div>
      <div style={mg.title}>Find the real disagreement</div>
      <div style={mg.support}>Which option captures the deepest point of contention?</div>

      <SeedBox context={context} />

      <div style={mg.contentCard()}>
        <div style={mg.metaLabel}>{q.category}</div>
        <div style={mg.cardBody}>{q.topic}</div>
      </div>

      {q.options.map((opt, i) => (
        <button
          key={i}
          onClick={() => !answered && onChoose(opt)}
          disabled={answered}
          style={mg.choiceBtn(getState(opt))}
        >
          <span style={mg.choicePrefix(getState(opt))}>{String.fromCharCode(65 + i)}</span>
          <span>{opt}</span>
        </button>
      ))}

      {answered && (
        <div style={mg.feedbackBox(chosen === q.clashPoint ? "correct" : "wrong")}>
          <div style={mg.feedbackTitle(chosen === q.clashPoint ? "correct" : "wrong")}>
            {chosen === q.clashPoint ? "That's the clash point." : "Not quite."}
          </div>
          <div style={{ ...mg.feedbackText, marginBottom: 0 }}>{q.explanation}</div>
        </div>
      )}

      {answered && (
        <button onClick={onNext} style={solidBtn}>
          {isLast ? "See results →" : "Next topic →"}
        </button>
      )}
    </div>
  );
}

function Result({ score, total, onReplay, onFinish }) {
  const verdict = score === total ? "correct" : score >= total * 0.4 ? "partial" : "wrong";

  return (
    <div style={{ textAlign: "center" }}>
      <div style={mg.eyebrow}>Result</div>
      <div style={mg.resultScore}>
        {score}<span style={{ fontSize: "0.5em", color: "rgba(15,23,42,0.28)" }}>/{total}</span>
      </div>
      <div style={mg.resultSub}>clash points found</div>
      <div style={mg.resultMsg}>{getResultMessage(score, total)}</div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onReplay} style={secondaryBtn}>Play again</button>
        <button onClick={onFinish} style={solidBtn}>Continue →</button>
      </div>
    </div>
  );
}

export default function ClashGame({ onFinish, context }) {
  const startTime = useRef(Date.now());
  const [screen, setScreen] = useState(context ? "game" : "splash");
  const [rawTopics, setRawTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/clash-topics`)
      .then((r) => r.json())
      .then((data) => {
        setRawTopics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const startGame = useCallback(() => {
    const qs = buildRound(rawTopics);
    setQuestions(qs);
    setCurrent(0);
    setScore(0);
    setChosen(null);
    startTime.current = Date.now();
    setScreen("game");
  }, [rawTopics]);

  useEffect(() => {
    if (context && !loading && rawTopics.length > 0 && screen === "game" && questions.length === 0) {
      startGame();
    }
  }, [context, loading, rawTopics, screen, questions.length, startGame]);

  const handleChoose = (opt) => {
    setChosen(opt);
    if (opt === questions[current].clashPoint) setScore((s) => s + 1);
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

  const handleFinish = () => {
    onFinish?.(score, questions.length, Date.now() - startTime.current);
  };

  if (screen === "splash") return <Splash onStart={startGame} loading={loading} />;
  if (screen === "game" && questions.length > 0) {
    return (
      <Question
        questions={questions}
        current={current}
        score={score}
        chosen={chosen}
        onChoose={handleChoose}
        onNext={handleNext}
        context={context}
      />
    );
  }
  if (screen === "result") {
    return (
      <Result
        score={score}
        total={questions.length}
        onReplay={startGame}
        onFinish={handleFinish}
      />
    );
  }
  if (loading) {
    return <div style={mg.support}>Loading topics…</div>;
  }
  return null;
}
