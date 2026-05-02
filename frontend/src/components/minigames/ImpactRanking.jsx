import { useState, useRef, useEffect } from "react";

// ── Static scenario bank ───────────────────────────────────────────────────────
// Each scenario has a claim and exactly 3 impacts with a canonical ranking.
// correctOrder is [0-indexed] best → weakest.

const DEFAULT_SCENARIOS = [
  {
    id: "s1",
    claim: "Governments should ban single-use plastics.",
    impacts: [
      { id: "a", label: "Marine ecosystem collapse over decades", dimension: "Long-term & irreversible" },
      { id: "b", label: "Reduced litter in coastal communities within months", dimension: "Short-term & visible" },
      { id: "c", label: "Minor consumer inconvenience from switching products", dimension: "Low magnitude" },
    ],
    correctOrder: [0, 1, 2], // a > b > c
    explanation: "Irreversible ecological damage outweighs visible but reversible improvements, which outweigh minor inconvenience.",
  },
  {
    id: "s2",
   nates bureaucratic gatekeeping that excludes eligible people", dimension: "Systemic" },
      { id: "b", label: "Unconditional floor prevents extreme poverty for millions", dimension: "Magnitude" },
      { id: "c", label: "Administrative cost savings free up budget for other programmes", dimension: "Secondary" },
    ],
    correctOrder: [1, 0, 2], // b > a > c
    explanation: "Preventing extreme poverty at scale is the largest impact. Structural access fixes are second. Cost savings are real but secondary.",
  },
  {
    id: "s3",
    claim: "Social media platforms should be held liable for algorithmic harm.",
    impacts: [
      { id: "a", label: "Radicalisation pipelines that contribute to real-world violence", dimension: "Severe & causal" },
      { id: "b", label: "Adolescent mental health decline tied to engagement loops", dimension: "Broad & developmental" },
      { id: "c", label: "Misinformation spreads faster than corrections can follow", dimension: "Epistemic" },
    ],
    correctOrder: [0, 1, 2], // a > b > c
    explanation: "Direct contribution to violence carries the highest moral weight. Developmental harm to millions is second. Epistemic harm, while serious, is more diffuse and harder to pin causally.",
  },
  {
    id: "s4",
    claim: "Wealthy nations should accept significantly more climate refugees.",
    impacts: [
      { id: "a", label: "Lives saved from flooding, drought, and extreme heat", dimension: "Direct & immediate" },
      { id: "b", label: "Distributes burden fairly given historical emissions inequality", dimension: "Justice-based" },
      { id: "c", label: "Receiving economies gain long-term labour and demographic benefits", dimension: "Economic" },
    ],
    correctOrder: [0, 1, 2], // a > b > c
    explanation: "Survival is the foundational impact. Justice arguments are powerful second-order supports. Economic gains follow but shouldn't anchor the moral case.",
  },
  {
    id: "s5",
    claim: "Mandatory voting should be introduced in democracies.",
    impacts: [
      { id: "a", label: "Outcomes better reflect the full population rather than motivated minorities", dimension: "Representational" },
      { id: "b", label: "Low-information ballots dilute electoral signal quality", dimension: "Counter-impact" },
      { id: "c", label: "Removes civic apathy as an opt-out of accountability", dimension: "Behavioural" },
    ],
    correctOrder: [0, 2, 1], // a > c > b
    explanation: "Representational legitimacy is the central impact. Shifting civic norms is a real secondary effect. The dilution concern is real but smaller in well-designed systems.",
  },
];

function pickScenario(context) {
  // If the seed has a prompt, try to make it feel relevant
  // For now: deterministically pick based on seedId or use first scenario
  if (context?.seedId) {
    return DEFAULT_SCENARIOS[Number(context.seedId) % DEFAULT_SCENARIOS.length];
  }
  return DEFAULT_SCENARIOS[0];
}

// ── Styles — match CoachMode visual tokens ─────────────────────────────────────
// CoachMode wraps this in sectionCard, so we only need inner layout styles.

const S = {
  prompt: {
    fontSize: "13px",
    color: "rgba(15,23,42,0.55)",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  claim: {
    fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
    fontWeight: 700,
    lineHeight: 1.35,
    color: "#111827",
    fontFamily: "'Fraunces', serif",
    marginBottom: "20px",
  },
  instruction: {
    fontSize: "13px",
    color: "rgba(15,23,42,0.48)",
    lineHeight: 1.6,
    marginBottom: "18px",
  },
  seedBox: {
    padding: "12px 15px",
    borderRadius: "16px",
    background: "rgba(79,70,229,0.06)",
    border: "1px solid rgba(99,102,241,0.14)",
    fontSize: "13px",
    color: "#374151",
    lineHeight: 1.65,
    fontStyle: "italic",
    marginBottom: "18px",
  },
  impactCard: (rank, dragging) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    padding: "14px 16px",
    borderRadius: "18px",
    background: dragging ? "rgba(79,70,229,0.08)" : "rgba(255,255,255,0.94)",
    border: `1px solid ${dragging ? "rgba(99,102,241,0.30)" : "rgba(99,102,241,0.12)"}`,
    boxShadow: dragging
      ? "0 12px 28px rgba(79,70,229,0.14)"
      : "0 4px 12px rgba(15,23,42,0.06)",
    cursor: "grab",
    transition: "box-shadow 0.18s, border-color 0.18s, background 0.18s",
    userSelect: "none",
    marginBottom: "10px",
  }),
  rankBadge: (pos) => ({
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    background: pos === 0 ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : pos === 1 ? "#eef2ff" : "#f8fafc",
    color: pos === 0 ? "#fff" : pos === 1 ? "#4338ca" : "#94a3b8",
    display: "grid",
    placeItems: "center",
    fontSize: "14px",
    fontWeight: 800,
    flexShrink: 0,
    fontFamily: "'JetBrains Mono',   color: "#111827",
    lineHeight: 1.35,
    marginBottom: "4px",
  },
  impactDim: {
    fontSize: "11px",
    fontWeight: 700,
    color: "rgba(15,23,42,0.42)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontFamily: "'JetBrains Mono', monospace",
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flexShrink: 0,
  },
  moveBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    border: "1px solid rgba(99,102,241,0.18)",
    background: "rgba(248,250,252,0.96)",
    color: "#4f46e5",
    fontSize: "14px",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    transition: "background 0.15s",
  },
  submitBtn: {
    padding: "13px 22px",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "16px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: "0.01em",
    boxShadow: "0 16px 28px rgba(79, 70, 229, 0.22)",
    marginTop: "20px",
  },
  feedbackBox: (correct) => ({
    marginTop: "20px",
    padding: "18px 20px",
    borderRadius: "18px",
    background: correct ? "rgba(22,163,74,0.07)" : "rgba(220,38,38,0.06)",
    border: `1px solid ${correct ? "rgba(22,163,74,0.20)" : "rgba(220,38,38,0.18)"}`,
  }),
  feedbackTitle: (correct) => ({
    fontSize: "16px",
    fontWeight: 800,
    color: correct ? "#15803d" : "#dc2626",
    marginBottom: "8px",
    fontFamily: "'Fraunces', serif",
  }),
  feedbackText: {
    fontSize: "13px",
    color: "#475467",
    lineHeight: 1.7,
    marginBottom: "14px",
  },
  correctOrderBox: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "16px",
  },
  correctItem: (pos) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "12px",
    background: pos === 0 ? "rgba(79,70,229,0.08)" : "rgba(248,250,252,0.94)",
    border: "1px solid rgba(99,102,241,0.12)",
    fontSize: "13px",
    fontWeight: pos === 0 ? 700 : 500,
    color: "#111827",
  }),
  continueBtn: {
    padding: "12px 22px",
    background: "#fff",
    color: "#4f46e5",
    border: "1px solid rgba(79,70,229,0.18)",
    borderRadius: "16px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
  },
};

// ── Scoring ────────────────────────────────────────────────────────────────────

function computeScore(userOrder, correctOrder) {
  // userOrder and correctOrder are arrays of indices into scenario.impacts
  const MAX = 3;
  if (userOrder[0] === correctOrder[0] && userOrder[1] === correctOrder[1] && userOrder[2] === correctOrder[2]) return MAX;
  if (userOrder[0] === correctOrder[0] && userOrder[1] === correctOrder[1]) return 2;
  if (userOrder[0] === correctOrder[0]) return 1;
  return 0;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ImpactRanking({ context, onFinish }) {
  const scenario    = pickScenario(context);
  const startTime   = useRef(Date.now());

  // order holds indices into scenario.impacts, representing user's current ranking
  const [order,     setOrder]     = useState([0, 1, 2]);
  const [submitted, setSubmitted] = useState(false);
  const [score,     setScore]     = useState(null);

  // Reset when context/scenario changes
  useEffect(() => {
    setOrder([0, 1, 2]);
    setSubmitted(false);
    setScore(null);
    startTime.current = Date.now();
  }, [scenario.id]);

  const moveUp = (pos) => {
    if (pos === 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[pos - 1], next[pos]] = [next[pos], next[pos - 1]];
      return next;
    });
  };

  const moveDown = (pos) => {
    if (pos === order.length - 1) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[pos], next[pos + 1]] = [next[pos + 1], next[pos]];
      return next;
    });
  };

  const handleSubmit = () => {
    const finalScore = computeScore(order, scenario.correctOrder);
    const durationMs = Date.now() - startTime.current;
    setScore(finalScore);
    setSubmitted(true);
    // Do NOT call onFinish here — let the player read feedback first
  };

  const handleContinue = () => {
    const finalScore = computeScore(order, scenario.correctOrder);
    const durationMs = Date.now() - startTime.current;
    onFinish(finalScore, 3, durationMs);
  };

  const isPersonalized = context?.type === "seed";
  const isCorrect      = score === 3;

  return (
    <div>
      {/* Coach intro for personalized reps */}
      {isPersonalized && (context.excerpt || context.coachNote) && (
        <div style={S.seedBox}>
          {context.excerpt && <div style={{ marginBottom: context.coachNote ? "8px" : 0 }}>"{context.excerpt}"</div>}
          {context.coachNote && <div style={{ fontStyle: "normal", fontWeight: 600, color: "#374151" }}>{context.coachNote}</div>}
        </div>
      )}

      {/* Prompt */}
      <div style={S.prompt}>
        {isPersonalized ? "Rank the impacts from this round" : "Impact ranking"}
      </div>

      {/* Claim */}
      <div style={S.claim}>{scenario.claim}</div>

      {/* Instruction */}
      <div style={S.instruction}>
        Drag the cards or use the ↑ ↓ buttons to rank these impacts <strong>strongest → weakest</strong>.
        Think about magnitude, probability, and whether the harm is reversible.
      </div>

      {/* Impact cards */}
      {order.map((impactIdx, pos) => {
        const impact = scenario.impacts[impactIdx];
        return (
          <div key={impact.id} style={S.impactCard(pos, false)}>
            <div style={S.rankBadge(pos)}>{pos + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={S.impactLabel}>{impact.label}</div>
              <div style={S.impactDim}>{impact.dimension}</div>
            </div>
            {!submitted && (
              <div style={S.controls}>
                <button
                  onClick={() => moveUp(pos)}
                disabled={pos === order.length - 1}
                  style={{ ...S.moveBtn, opacity: pos === order.length - 1 ? 0.3 : 1 }}
                  title="Move down"
                >
                  ↓
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Submit */}
      {!submitted && (
        <button onClick={handleSubmit} style={S.submitBtn}>
          Submit ranking →
        </button>
      )}

      {/* Feedback panel */}
      {submitted && score !== null && (
        <div style={S.feedbackBox(isCorrect)}>
          <div style={S.feedbackTitle(isCorrect)}>
            {score === 3 ? "Perfect ranking." : score === 2 ? "Nearly there." : score === 1 ? "Partially correct." : "Not quite."}
            {" "}({score}/3)
          </div>

          <div style={S.feedbackText}>{scenario.explanation}</div>

          <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(15,23,42,0.42)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", marginBottom: "8px" }}>
            Strongest → Weakest
          </div>
          <div style={S.correctOrderBox}>
            {scenario.correctOrder.map((impactIdx, pos) => (
              <div key={impactIdx} style={S.correctItem(pos)}>
                <div style={{ ...S.rankBadge(pos), width: "24px", height: "24px", fontSize: "12px", borderRadius: "8px" }}>
                  {pos + 1}
                </div>
                <span>{scenario.impacts[impactIdx].label}</span>
              </div>
            ))}
          </div>

          <button onClick={handleContinue} style={S.continueBtn}>
            {score === 3 ? "Nice — back to coach →" : "Got it — back to coach →"}
          </button>
        </div>
      )}
    </div>
  );
}
