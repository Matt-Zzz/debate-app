import { useEffect, useState } from "react";

// SPEECH POLISH
// Four-level mini-game for sharpening debate language.
//
// INTEGRATION:
// 1. import SpeechPolish from "./SpeechPolish";
// 2. {screen === "polish" && <SpeechPolish onFinish={() => setScreen("setup")} />}
// 3. Wire it into your screen flow after FallacyHunt, or as a standalone warm-up.

const API = "http://localhost:3001/api";

const LEVEL_META = {
  level1: {
    num: 1,
    label: "Choose the sharpest",
    desc: "Four versions of the same argument. Pick the one that is clearest, most direct, and most persuasive.",
    color: "#e3f2fd",
    border: "#bbdefb",
    text: "#0d3c61",
    badge: "#1565c0",
  },
  level2: {
    num: 2,
    label: "Rewrite the claim",
    desc: "Take a vague claim and rewrite it so it becomes specific, direct, and persuasive.",
    color: "#e8f5e9",
    border: "#c8e6c9",
    text: "#1b5e20",
    badge: "#2e7d32",
  },
  level3: {
    num: 3,
    label: "Improve the mini-argument",
    desc: "A full short argument that hedges, sits on the fence, or stays vague. Rewrite it to take a clear position.",
    color: "#fff3e0",
    border: "#ffe0b2",
    text: "#6d3a00",
    badge: "#e65100",
  },
  level4: {
    num: 4,
    label: "Cut the filler",
    desc: "A sentence bloated with filler words. Cut everything that adds no meaning without losing the claim.",
    color: "#fce4ec",
    border: "#f8bbd0",
    text: "#6d0025",
    badge: "#c62828",
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

const S = {
  wrap: {
    maxWidth: "680px",
    margin: "0 auto",
    padding: "44px 24px",
    fontFamily: "'DM Sans', sans-serif",
  },
  eyebrow: {
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 600,
    color: "#777",
    margin: "0 0 10px",
    fontFamily: "'DM Mono', monospace",
  },
  h1: {
    fontSize: "40px",
    lineHeight: 1.1,
    fontWeight: 600,
    color: "#1a1a1a",
    margin: "8px 0 0",
    fontFamily: "'Playfair Display', Georgia, serif",
  },
  p: {
    fontSize: "14px",
    color: "#666",
    lineHeight: 1.7,
    margin: "12px 0 0",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },
  pipRow: {
    display: "flex",
    gap: "5px",
  },
  pip: (s) => ({
    width: "24px",
    height: "4px",
    borderRadius: "2px",
    background:
      s === "done" ? "#1a1a1a" : s === "current" ? "#888" : "#e8e8e8",
    transition: "background 0.3s",
  }),
  scoreBadge: {
    fontSize: "13px",
    color: "#888",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 500,
  },
  levelBadge: (meta) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    background: meta.color,
    border: `1px solid ${meta.border}`,
    color: meta.badge,
    fontSize: "11px",
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.06em",
    marginBottom: "10px",
  }),
  promptCard: {
    background: "#f5f5f0",
    border: "1px solid #eee",
    borderRadius: "10px",
    padding: "18px 22px",
    marginBottom: "18px",
  },
  weakLabel: {
    fontSize: "10px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#bbb",
    fontFamily: "'DM Mono', monospace",
    marginBottom: "8px",
  },
  weakText: {
    fontSize: "15px",
    color: "#1a1a1a",
    lineHeight: 1.7,
    fontStyle: "italic",
  },
  contextTag: {
    fontSize: "11px",
    color: "#aaa",
    fontFamily: "'DM Mono', monospace",
    marginBottom: "4px",
  },
  prompt: {
    fontSize: "13px",
    color: "#888",
    marginBottom: "14px",
  },
  optionsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    marginBottom: "18px",
  },
  option: (state) => ({
    padding: "13px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    lineHeight: 1.55,
    textAlign: "left",
    cursor: state === "idle" ? "pointer" : "default",
    border: "1px solid",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.15s",
    background:
      state === "correct"
        ? "#edf7ee"
        : state === "wrong"
          ? "#fdecea"
          : "#fafafa",
    borderColor:
      state === "correct"
        ? "#c8e6c9"
        : state === "wrong"
          ? "#ffcdd2"
          : "#e8e8e8",
    color:
      state === "correct"
        ? "#1a5c20"
        : state === "wrong"
          ? "#b71c1c"
          : "#1a1a1a",
  }),
  textarea: (active) => ({
    width: "100%",
    minHeight: "90px",
    padding: "13px 15px",
    border: `1px solid ${active ? "#1a1a1a" : "#ddd"}`,
    borderRadius: "8px",
    fontSize: "14px",
    lineHeight: 1.65,
    fontFamily: "'DM Sans', sans-serif",
    background: "#fff",
    resize: "vertical",
    boxSizing: "border-box",
    outline: "none",
    marginBottom: "10px",
    transition: "border-color 0.15s",
    color: "#1a1a1a",
  }),
  wordCount: {
    fontSize: "11px",
    color: "#bbb",
    fontFamily: "'DM Mono', monospace",
    marginBottom: "12px",
  },
  submitBtn: {
    padding: "10px 22px",
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "16px",
  },
  submitDis: {
    padding: "10px 22px",
    background: "#e8e8e8",
    color: "#bbb",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "default",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "16px",
  },
  modelBox: (meta) => ({
    padding: "16px 20px",
    background: meta.color,
    border: `1px solid ${meta.border}`,
    borderRadius: "8px",
    marginBottom: "14px",
  }),
  modelLabel: (meta) => ({
    fontSize: "10px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: meta.badge,
    fontFamily: "'DM Mono', monospace",
    marginBottom: "6px",
  }),
  modelText: (meta) => ({
    fontSize: "14px",
    color: meta.text,
    lineHeight: 1.65,
    fontWeight: 500,
  }),
  rubricWrap: {
    marginTop: "10px",
  },
  rubricItem: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    fontSize: "12px",
    color: "#555",
    lineHeight: 1.5,
    marginBottom: "5px",
  },
  checkmark: {
    color: "#2e7d32",
    fontWeight: 700,
    flexShrink: 0,
    marginTop: "1px",
  },
  tipBox: {
    padding: "12px 16px",
    background: "#fafafa",
    border: "1px solid #eee",
    borderRadius: "8px",
    marginBottom: "14px",
  },
  tipLabel: {
    fontSize: "10px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#ccc",
    fontFamily: "'DM Mono', monospace",
    marginBottom: "4px",
  },
  tipText: {
    fontSize: "13px",
    color: "#666",
    lineHeight: 1.6,
  },
  nextBtn: {
    padding: "10px 22px",
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  solidBtn: {
    padding: "10px 22px",
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  outlineBtn: {
    padding: "10px 22px",
    background: "#fff",
    color: "#1a1a1a",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  howGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    margin: "20px 0",
  },
  howCard: (meta) => ({
    background: meta.color,
    border: `1px solid ${meta.border}`,
    borderRadius: "8px",
    padding: "14px 16px",
  }),
  howNum: (meta) => ({
    fontSize: "10px",
    color: meta.badge,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.1em",
    marginBottom: "4px",
    fontWeight: 600,
  }),
  howText: {
    fontSize: "13px",
    color: "#333",
    lineHeight: 1.5,
  },
  resultBig: {
    fontSize: "56px",
    fontWeight: 300,
    fontFamily: "'DM Mono', monospace",
    color: "#1a1a1a",
    margin: "24px 0 4px",
  },
  resultSub: {
    fontSize: "14px",
    color: "#888",
    marginBottom: "6px",
  },
  resultMsg: {
    fontSize: "13px",
    color: "#bbb",
    marginBottom: "32px",
  },
  btnRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
};

function Splash({ onStart, loading }) {
  return (
    <div style={S.wrap}>
      <div style={S.eyebrow}>Warm-up · Speech Polish</div>
      <h1 style={S.h1}>Sharpen your argument</h1>
      <p style={S.p}>
        Weak arguments lose on language before they lose on logic.
        <br />
        Four levels, four skills, all pointing at the same target: clarity.
      </p>

      <div style={S.howGrid}>
        {Object.entries(LEVEL_META).map(([key, meta]) => (
          <div key={key} style={S.howCard(meta)}>
            <div style={S.howNum(meta)}>Level {meta.num}</div>
            <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px", color: "#1a1a1a" }}>
              {meta.label}
            </div>
            <div style={S.howText}>{meta.desc}</div>
          </div>
        ))}
      </div>

      <p
        style={{
          fontSize: "12px",
          color: "#ccc",
          marginBottom: "20px",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        7 questions · 4 levels · rewriting required
      </p>

      <button
        onClick={onStart}
        disabled={loading}
        style={{ ...S.solidBtn, opacity: loading ? 0.5 : 1 }}
      >
        {loading ? "Loading…" : "Start →"}
      </button>
    </div>
  );
}

function Level1({ q, meta, onNext, isLast }) {
  const [chosen, setChosen] = useState(null);
  const submitted = chosen !== null;

  const getState = (i) => {
    if (!submitted) return "idle";
    if (i === q.correct) return "correct";
    if (i === chosen) return "wrong";
    return "idle";
  };

  return (
    <div>
      {q.context && <div style={S.contextTag}>{q.context}</div>}
      <p style={S.prompt}>{q.prompt}</p>

      <div style={S.optionsWrap}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => setChosen(i)}
            disabled={submitted}
            style={S.option(getState(i))}
          >
            <span
              style={{
                fontSize: "11px",
                color:
                  getState(i) === "correct"
                    ? "#2e7d32"
                    : getState(i) === "wrong"
                      ? "#b71c1c"
                      : "#bbb",
                fontFamily: "'DM Mono', monospace",
                marginRight: "8px",
              }}
            >
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
          </button>
        ))}
      </div>

      {submitted && (
        <>
          <div style={S.modelBox(meta)}>
            <div style={S.modelLabel(meta)}>Why this one works</div>
            <div style={{ fontSize: "13px", color: meta.text, lineHeight: 1.65 }}>
              {q.explanation}
            </div>
          </div>

          <button onClick={onNext} style={S.nextBtn}>
            {isLast ? "See results →" : "Next →"}
          </button>
        </>
      )}
    </div>
  );
}

function LevelRewrite({ q, meta, onNext, isLast }) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);
  const wc = wordCount(value);

  return (
    <div>
      <div style={S.promptCard}>
        <div style={S.weakLabel}>Original, improve this</div>
        <div style={S.weakText}>{q.weak}</div>
      </div>

      <p style={S.prompt}>{q.prompt}</p>

      {!submitted ? (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Write your improved version here…"
            style={S.textarea(focused)}
          />

          <div style={S.wordCount}>
            {wc} word{wc !== 1 ? "s" : ""}
          </div>

          <button
            onClick={() => setSubmitted(true)}
            disabled={wc < 3}
            style={wc < 3 ? S.submitDis : S.submitBtn}
          >
            Compare →
          </button>
        </>
      ) : (
        <>
          <div
            style={{
              padding: "14px 18px",
              background: "#fafafa",
              border: "1px solid #eee",
              borderRadius: "8px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#bbb",
                fontFamily: "'DM Mono', monospace",
                marginBottom: "6px",
              }}
            >
              Your version
            </div>
            <div style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.65 }}>
              {value}
            </div>
          </div>

          <div style={S.modelBox(meta)}>
            <div style={S.modelLabel(meta)}>Strong version</div>
            <div style={S.modelText(meta)}>{q.model}</div>
          </div>

          <div style={S.rubricWrap}>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#bbb",
                fontFamily: "'DM Mono', monospace",
                marginBottom: "8px",
              }}
            >
              What to look for in a strong rewrite
            </div>

            {q.rubric.map((r, i) => (
              <div key={i} style={S.rubricItem}>
                <span style={S.checkmark}>✓</span>
                <span>{r}</span>
              </div>
            ))}
          </div>

          <div style={{ ...S.tipBox, marginTop: "14px" }}>
            <div style={S.tipLabel}>Coach tip</div>
            <div style={S.tipText}>{q.tip}</div>
          </div>

          <button onClick={onNext} style={S.nextBtn}>
            {isLast ? "See results →" : "Next →"}
          </button>
        </>
      )}
    </div>
  );
}

function Level4({ q, meta, onNext, isLast }) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);

  const originalWC = wordCount(q.weak);
  const userWC = wordCount(value);
  const modelWC = wordCount(q.model);
  const saved = originalWC - userWC;
  const modelSaved = originalWC - modelWC;

  return (
    <div>
      <div style={S.promptCard}>
        <div style={S.weakLabel}>Cut the filler, original ({originalWC} words)</div>
        <div style={S.weakText}>{q.weak}</div>
      </div>

      <p style={S.prompt}>{q.prompt}</p>

      {!submitted ? (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Paste and cut, or retype the trimmed version…"
            style={S.textarea(focused)}
          />

          <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
            <div style={S.wordCount}>{userWC} words</div>
            {userWC > 0 && saved > 0 && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#2e7d32",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                −{saved} cut
              </div>
            )}
          </div>

          <button
            onClick={() => setSubmitted(true)}
            disabled={userWC < 2}
            style={userWC < 2 ? S.submitDis : S.submitBtn}
          >
            Compare →
          </button>
        </>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                background: "#fafafa",
                border: "1px solid #eee",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#bbb",
                  fontFamily: "'DM Mono', monospace",
                  marginBottom: "5px",
                }}
              >
                Your cut · {userWC} words
                {saved > 0 && (
                  <span style={{ color: "#2e7d32", marginLeft: "6px" }}>
                    −{saved}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.6 }}>
                {value}
              </div>
            </div>

            <div
              style={{
                padding: "14px 16px",
                background: meta.color,
                border: `1px solid ${meta.border}`,
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: meta.badge,
                  fontFamily: "'DM Mono', monospace",
                  marginBottom: "5px",
                }}
              >
                Strong cut · {modelWC} words
                <span style={{ color: meta.badge, marginLeft: "6px" }}>
                  −{modelSaved}
                </span>
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: meta.text,
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                {q.model}
              </div>
            </div>
          </div>

          <div style={S.rubricWrap}>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#bbb",
                fontFamily: "'DM Mono', monospace",
                marginBottom: "8px",
              }}
            >
              What was cut and why
            </div>

            {q.rubric.map((r, i) => (
              <div key={i} style={S.rubricItem}>
                <span style={S.checkmark}>✓</span>
                <span>{r}</span>
              </div>
            ))}
          </div>

          <div style={{ ...S.tipBox, marginTop: "14px" }}>
            <div style={S.tipLabel}>Coach tip</div>
            <div style={S.tipText}>{q.tip}</div>
          </div>

          <button onClick={onNext} style={S.nextBtn}>
            {isLast ? "See results →" : "Next →"}
          </button>
        </>
      )}
    </div>
  );
}

function Question({ questions, current, onNext }) {
  const q = questions[current];
  const meta = LEVEL_META[q.level];
  const isLast = current === questions.length - 1;

  const body =
    q.level === "level1" ? (
      <Level1 key={q.id} q={q} meta={meta} onNext={onNext} isLast={isLast} />
    ) : q.level === "level4" ? (
      <Level4 key={q.id} q={q} meta={meta} onNext={onNext} isLast={isLast} />
    ) : (
      <LevelRewrite key={q.id} q={q} meta={meta} onNext={onNext} isLast={isLast} />
    );

  return (
    <div style={S.wrap}>
      <div style={S.topBar}>
        <div style={S.pipRow}>
          {questions.map((_, i) => (
            <div
              key={i}
              style={S.pip(
                i < current ? "done" : i === current ? "current" : "empty"
              )}
            />
          ))}
        </div>
        <div style={S.scoreBadge}>
          {current + 1} / {questions.length}
        </div>
      </div>

      <div style={S.levelBadge(meta)}>
        Level {meta.num} · {meta.label}
      </div>

      <p
        style={{
          fontSize: "13px",
          color: "#aaa",
          marginBottom: "18px",
          lineHeight: 1.5,
        }}
      >
        {meta.desc}
      </p>

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
    <div style={{ ...S.wrap, textAlign: "center" }}>
      <div style={S.eyebrow}>Complete</div>
      <div style={S.resultBig}>{total}</div>
      <div style={S.resultSub}>questions completed</div>
      <div style={S.resultMsg}>{msg}</div>

      <div style={{ ...S.btnRow, justifyContent: "center" }}>
        <button onClick={onReplay} style={S.outlineBtn}>
          Play again
        </button>
        <button onClick={onFinish} style={S.solidBtn}>
          Start a debate session →
        </button>
      </div>
    </div>
  );
}

export default function SpeechPolish({ onFinish }) {
  const [screen, setScreen] = useState("splash");
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch(`${API}/speech-polish`)
      .then((r) => {
        if (!r.ok) {
          throw new Error("Failed to fetch speech polish data");
        }
        return r.json();
      })
      .then((data) => {
        setRawData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const startGame = () => {
    if (!rawData) return;
    setQuestions(buildQueue(rawData));
    setCurrent(0);
    setScreen("game");
  };

  const handleNext = () => {
    const next = current + 1;
    if (next >= questions.length) {
      setScreen("result");
    } else {
      setCurrent(next);
    }
  };

  if (screen === "splash") {
    return <Splash onStart={startGame} loading={loading} />;
  }

  if (screen === "game") {
    return <Question questions={questions} current={current} onNext={handleNext} />;
  }

  if (screen === "result") {
    return (
      <Result
        total={questions.length}
        onReplay={startGame}
        onFinish={onFinish}
      />
    );
  }

  return null;
}