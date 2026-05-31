import { useState, useRef, useEffect } from "react";
import { mg, solidBtn, secondaryBtn } from "../../styles/minigameStyles";

const DEFAULT_SCENARIOS = [
  {
    id: "s1",
    claim: "Governments should ban single-use plastics.",
    impacts: [
      { id: "a", label: "Marine ecosystem collapse over decades", dimension: "Long-term & irreversible" },
      { id: "b", label: "Reduced litter in coastal communities within months", dimension: "Short-term & visible" },
      { id: "c", label: "Minor consumer inconvenience from switching products", dimension: "Low magnitude" },
    ],
    correctOrder: [0, 1, 2],
    explanation: "Irreversible ecological damage outweighs visible but reversible improvements, which outweigh minor inconvenience.",
  },
  {
    id: "s2",
    claim: "Universal basic income should replace most targeted welfare programs.",
    impacts: [
      { id: "a", label: "Eliminates bureaucratic gatekeeping that excludes eligible people", dimension: "Systemic" },
      { id: "b", label: "Unconditional floor prevents extreme poverty for millions", dimension: "Magnitude" },
      { id: "c", label: "Administrative cost savings free up budget for other programmes", dimension: "Secondary" },
    ],
    correctOrder: [1, 0, 2],
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
    correctOrder: [0, 1, 2],
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
    correctOrder: [0, 1, 2],
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
    correctOrder: [0, 2, 1],
    explanation: "Representational legitimacy is the central impact. Shifting civic norms is a real secondary effect. The dilution concern is real but smaller in well-designed systems.",
  },
];

function pickScenario(context) {
  if (context?.seedId) {
    return DEFAULT_SCENARIOS[Number(context.seedId) % DEFAULT_SCENARIOS.length];
  }
  return DEFAULT_SCENARIOS[0];
}

function computeScore(userOrder, correctOrder) {
  if (userOrder[0] === correctOrder[0] && userOrder[1] === correctOrder[1] && userOrder[2] === correctOrder[2]) return 3;
  if (userOrder[0] === correctOrder[0] && userOrder[1] === correctOrder[1]) return 2;
  if (userOrder[0] === correctOrder[0]) return 1;
  return 0;
}

function feedbackVerdict(score) {
  if (score === 3) return "correct";
  if (score >= 1) return "partial";
  return "wrong";
}

function rankBadge(pos) {
  return {
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
    fontFamily: "'JetBrains Mono', monospace",
  };
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

export default function ImpactRanking({ context, onFinish }) {
  const scenario = pickScenario(context);
  const startTime = useRef(Date.now());
  const [order, setOrder] = useState([0, 1, 2]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const isPersonalized = context?.type === "seed";

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
    setScore(computeScore(order, scenario.correctOrder));
    setSubmitted(true);
  };

  const handleContinue = () => {
    onFinish(computeScore(order, scenario.correctOrder), 3, Date.now() - startTime.current);
  };

  const verdict = score !== null ? feedbackVerdict(score) : "wrong";

  return (
    <div>
      <div style={mg.eyebrow}>
        {isPersonalized ? "Personalized rep" : "Impact ranking"}
      </div>
      <div style={mg.title}>Rank these impacts</div>
      <div style={mg.support}>
        Order from strongest to weakest. Weigh magnitude, probability, and reversibility.
      </div>

      <SeedBox context={context} />

      <div style={mg.contentCard("accent")}>
        <div style={mg.metaLabel}>Claim</div>
        <div style={mg.cardTitle}>{scenario.claim}</div>
      </div>

      {order.map((impactIdx, pos) => {
        const impact = scenario.impacts[impactIdx];
        return (
          <div
            key={impact.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "14px 16px",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.94)",
              border: "1px solid rgba(99,102,241,0.12)",
              boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
              marginBottom: "10px",
            }}
          >
            <div style={rankBadge(pos)}>{pos + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", lineHeight: 1.45, marginBottom: "4px" }}>
                {impact.label}
              </div>
              <div style={mg.metaLabel}>{impact.dimension}</div>
            </div>
            {!submitted && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
                <button
                  onClick={() => moveUp(pos)}
                  disabled={pos === 0}
                  style={{ ...mg.moveBtn, opacity: pos === 0 ? 0.3 : 1 }}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(pos)}
                  disabled={pos === order.length - 1}
                  style={{ ...mg.moveBtn, opacity: pos === order.length - 1 ? 0.3 : 1 }}
                  title="Move down"
                >
                  ↓
                </button>
              </div>
            )}
          </div>
        );
      })}

      {!submitted && (
        <button onClick={handleSubmit} style={solidBtn}>
          Submit ranking →
        </button>
      )}

      {submitted && score !== null && (
        <div style={mg.feedbackBox(verdict)}>
          <div style={mg.feedbackTitle(verdict)}>
            {score === 3 ? "Perfect ranking." : score === 2 ? "Nearly there." : score === 1 ? "Partially correct." : "Not quite."}
            {" "}({score}/3)
          </div>
          <div style={mg.feedbackText}>{scenario.explanation}</div>

          <div style={mg.metaLabel}>Strongest → Weakest</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
            {scenario.correctOrder.map((impactIdx, pos) => (
              <div
                key={impactIdx}
                style={{
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
                }}
              >
                <div style={{ ...rankBadge(pos), width: "24px", height: "24px", fontSize: "12px", borderRadius: "8px" }}>
                  {pos + 1}
                </div>
                <span>{scenario.impacts[impactIdx].label}</span>
              </div>
            ))}
          </div>

          <button onClick={handleContinue} style={secondaryBtn}>
            {score === 3 ? "Nice — back to coach →" : "Got it — back to coach →"}
          </button>
        </div>
      )}
    </div>
  );
}
