import { useEffect, useState, useRef, useCallback } from "react";
import { API_BASE_URL } from "../../lib/api";
import { mg, solidBtn, secondaryBtn, textareaStyle } from "../../styles/minigameStyles";

const LEVEL_META = {
  level1: {
    num: 1,
    label: "Choose the sharpest",
    desc: "Four versions of the same argument. Pick the one that is clearest, most direct, and most persuasive.",
  },
  level2: {
    num: 2,
    label: "Rewrite the claim",
    desc: "Take a vague claim and rewrite it so it becomes specific, direct, and persuasive.",
  },
  level3: {
    num: 3,
    label: "Improve the mini-argument",
    desc: "A full short argument that hedges or stays vague. Rewrite it to take a clear position.",
  },
  level4: {
    num: 4,
    label: "Cut the filler",
    desc: "A sentence bloated with filler words. Cut everything that adds no meaning without losing the claim.",
  },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(data) {
  return [
    ...shuffle(data.level1).slice(0, 2).map((q) => ({ ...q, level: "level1" })),
    ...shuffle(data.level2).slice(0, 2).map((q) => ({ ...q, level: "level2" })),
    ...shuffle(data.level3).slice(0, 1).map((q) => ({ ...q, level: "level3" })),
    ...shuffle(data.level4).slice(0, 2).map((q) => ({ ...q, level: "level4" })),
  ];
}

function wordCount(str) {
  return (str || "").trim().split(/\s+/).filter(Boolean).length;
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
      <div style={mg.eyebrow}>Warm-up · Speech polish</div>
      <div style={mg.title}>Sharpen your argument</div>
      <div style={mg.support}>
        Weak arguments lose on language before they lose on logic. Four levels, one target: clarity.
      </div>

      <div style={mg.howGrid}>
        {Object.entries(LEVEL_META).map(([key, meta]) => (
          <div key={key} style={mg.howCard}>
            <div style={mg.howNum}>Level {meta.num}</div>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px", color: "#111827" }}>
              {meta.label}
            </div>
            <div style={mg.howText}>{meta.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ ...mg.scoreBadge, marginBottom: "16px" }}>7 questions · 4 levels</div>

      <button onClick={onStart} disabled={loading} style={{ ...solidBtn, opacity: loading ? 0.5 : 1 }}>
        {loading ? "Loading…" : "Start →"}
      </button>
    </div>
  );
}

function Level1({ q, onNext, isLast }) {
  const [chosen, setChosen] = useState(null);
  const submitted = chosen !== null;

  const getState = (i) => {
    if (!submitted) return chosen === i ? "selected" : "idle";
    if (i === q.correct) return "correct";
    if (i === chosen) return "wrong";
    return "idle";
  };

  return (
    <div>
      {q.context && <div style={{ ...mg.metaLabel, marginBottom: "10px" }}>{q.context}</div>}

      {q.options.map((opt, i) => (
        <button
          key={i}
          onClick={() => !submitted && setChosen(i)}
          disabled={submitted}
          style={mg.choiceBtn(getState(i))}
        >
          <span style={mg.choicePrefix(getState(i))}>{String.fromCharCode(65 + i)}</span>
          <span>{opt}</span>
        </button>
      ))}

      {submitted && (
        <>
          <div style={mg.feedbackBox(chosen === q.correct ? "correct" : "wrong")}>
            <div style={mg.feedbackTitle(chosen === q.correct ? "correct" : "wrong")}>
              {chosen === q.correct ? "Sharp choice." : "Not the sharpest."}
            </div>
            <div style={{ ...mg.feedbackText, marginBottom: 0 }}>{q.explanation}</div>
          </div>
          <button onClick={onNext} style={solidBtn}>
            {isLast ? "See results →" : "Next →"}
          </button>
        </>
      )}
    </div>
  );
}

function LevelRewrite({ q, onNext, isLast }) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const wc = wordCount(value);

  return (
    <div>
      <div style={mg.contentCard()}>
        <div style={mg.metaLabel}>Original — improve this</div>
        <div style={{ ...mg.cardBody, fontStyle: "italic" }}>{q.weak}</div>
      </div>

      {!submitted ? (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write your improved version here…"
            style={{ ...textareaStyle, marginBottom: "8px" }}
          />
          <div style={{ ...mg.scoreBadge, marginBottom: "12px" }}>
            {wc} word{wc !== 1 ? "s" : ""}
          </div>
          <button
            onClick={() => setSubmitted(true)}
            disabled={wc < 3}
            style={{ ...solidBtn, opacity: wc < 3 ? 0.45 : 1 }}
          >
            Compare →
          </button>
        </>
      ) : (
        <>
          <div style={mg.contentCard("accent")}>
            <div style={mg.metaLabel}>Your version</div>
            <div style={mg.cardBody}>{value}</div>
          </div>

          <div style={mg.modelBox}>
            <div style={mg.metaLabel}>Strong version</div>
            <div style={mg.cardBody}>{q.model}</div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <div style={{ ...mg.metaLabel, marginBottom: "8px" }}>What to look for</div>
            {q.rubric.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#475467", lineHeight: 1.5, marginBottom: "5px" }}>
                <span style={{ color: "#15803d", fontWeight: 700 }}>✓</span>
                <span>{r}</span>
              </div>
            ))}
          </div>

          <div style={mg.tipBox}>
            <div style={mg.metaLabel}>Coach tip</div>
            <div style={mg.cardBodyMuted}>{q.tip}</div>
          </div>

          <button onClick={onNext} style={solidBtn}>
            {isLast ? "See results →" : "Next →"}
          </button>
        </>
      )}
    </div>
  );
}

function Level4({ q, onNext, isLast }) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const originalWC = wordCount(q.weak);
  const userWC = wordCount(value);
  const modelWC = wordCount(q.model);
  const saved = originalWC - userWC;
  const modelSaved = originalWC - modelWC;

  return (
    <div>
      <div style={mg.contentCard()}>
        <div style={mg.metaLabel}>Cut the filler · {originalWC} words</div>
        <div style={{ ...mg.cardBody, fontStyle: "italic" }}>{q.weak}</div>
      </div>

      {!submitted ? (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste and cut, or retype the trimmed version…"
            style={{ ...textareaStyle, marginBottom: "8px" }}
          />
          <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
            <div style={mg.scoreBadge}>{userWC} words</div>
            {userWC > 0 && saved > 0 && (
              <div style={{ ...mg.scoreBadge, color: "#15803d" }}>−{saved} cut</div>
            )}
          </div>
          <button
            onClick={() => setSubmitted(true)}
            disabled={userWC < 2}
            style={{ ...solidBtn, opacity: userWC < 2 ? 0.45 : 1 }}
          >
            Compare →
          </button>
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div style={mg.contentCard()}>
              <div style={mg.metaLabel}>
                Your cut · {userWC} words
                {saved > 0 && <span style={{ color: "#15803d", marginLeft: "6px" }}>−{saved}</span>}
              </div>
              <div style={mg.cardBody}>{value}</div>
            </div>
            <div style={mg.modelBox}>
              <div style={mg.metaLabel}>
                Strong cut · {modelWC} words
                <span style={{ marginLeft: "6px" }}>−{modelSaved}</span>
              </div>
              <div style={{ ...mg.cardBody, fontWeight: 600 }}>{q.model}</div>
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <div style={{ ...mg.metaLabel, marginBottom: "8px" }}>What was cut and why</div>
            {q.rubric.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#475467", lineHeight: 1.5, marginBottom: "5px" }}>
                <span style={{ color: "#15803d", fontWeight: 700 }}>✓</span>
                <span>{r}</span>
              </div>
            ))}
          </div>

          <div style={mg.tipBox}>
            <div style={mg.metaLabel}>Coach tip</div>
            <div style={mg.cardBodyMuted}>{q.tip}</div>
          </div>

          <button onClick={onNext} style={solidBtn}>
            {isLast ? "See results →" : "Next →"}
          </button>
        </>
      )}
    </div>
  );
}

function Question({ questions, current, onNext, context }) {
  const q = questions[current];
  const meta = LEVEL_META[q.level];
  const isLast = current === questions.length - 1;

  const body =
    q.level === "level1" ? (
      <Level1 key={q.id} q={q} onNext={onNext} isLast={isLast} />
    ) : q.level === "level4" ? (
      <Level4 key={q.id} q={q} onNext={onNext} isLast={isLast} />
    ) : (
      <LevelRewrite key={q.id} q={q} onNext={onNext} isLast={isLast} />
    );

  return (
    <div>
      <div style={mg.topBar}>
        <div style={{ ...mg.progressRow, flex: 1, marginBottom: 0 }}>
          {questions.map((_, i) => (
            <div key={i} style={mg.pip(i < current ? "done" : i === current ? "current" : "empty")} />
          ))}
        </div>
        <div style={mg.scoreBadge}>
          {current + 1} / {questions.length}
        </div>
      </div>

      <div style={mg.eyebrow}>Speech polish</div>
      <div style={mg.title}>{meta.label}</div>
      <div style={mg.support}>{meta.desc}</div>

      <SeedBox context={context} />

      <div style={mg.levelBadge}>Level {meta.num}</div>

      {body}
    </div>
  );
}

function Result({ total, onReplay, onFinish }) {
  const msgs = [
    "Your language is now sharper than when you started.",
    "Every cut word is a clearer argument.",
    "Precision is a debate skill. You're building it.",
  ];
  const msg = msgs[Math.floor(Math.random() * msgs.length)];

  return (
    <div style={{ textAlign: "center" }}>
      <div style={mg.eyebrow}>Complete</div>
      <div style={mg.resultScore}>{total}</div>
      <div style={mg.resultSub}>questions completed</div>
      <div style={mg.resultMsg}>{msg}</div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onReplay} style={secondaryBtn}>Play again</button>
        <button onClick={onFinish} style={solidBtn}>Continue →</button>
      </div>
    </div>
  );
}

export default function SpeechPolish({ onFinish, context }) {
  const startTime = useRef(Date.now());
  const [screen, setScreen] = useState(context ? "game" : "splash");
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE_URL}/speech-polish`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch speech polish data");
        return r.json();
      })
      .then((data) => {
        setRawData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const startGame = useCallback(() => {
    if (!rawData) return;
    setQuestions(buildQueue(rawData));
    setCurrent(0);
    startTime.current = Date.now();
    setScreen("game");
  }, [rawData]);

  useEffect(() => {
    if (context && !loading && rawData && screen === "game" && questions.length === 0) {
      startGame();
    }
  }, [context, loading, rawData, screen, questions.length, startGame]);

  const handleNext = () => {
    const next = current + 1;
    if (next >= questions.length) setScreen("result");
    else setCurrent(next);
  };

  const handleFinish = () => {
    onFinish?.(questions.length, questions.length, Date.now() - startTime.current);
  };

  if (screen === "splash") return <Splash onStart={startGame} loading={loading} />;

  if (screen === "game" && questions.length > 0) {
    return <Question questions={questions} current={current} onNext={handleNext} context={context} />;
  }

  if (screen === "result") {
    return (
      <Result
        total={questions.length}
        onReplay={startGame}
        onFinish={handleFinish}
      />
    );
  }

  if (loading) return <div style={mg.support}>Loading exercises…</div>;
  return null;
}
