import { useState, useRef, useEffect } from "react";
import { mg, solidBtn, secondaryBtn } from "../../styles/minigameStyles";

const DEFAULT_SCENARIOS = [
  {
    id: "c1",
    situation:
      "You are in the final focus of a debate on mandatory voting. You have 90 seconds left. Your opponent's strongest offense is that compulsion violates political autonomy. You have four arguments in play but time to crystallize only two.",
    arguments: [
      {
        id: 0,
        label: "Representative legitimacy",
        body: "Outcomes under universal participation reflect the genuine will of the full electorate, not just motivated minorities, making the resulting government meaningfully more legitimate.",
        tag: "High magnitude · Not conceded",
      },
      {
        id: 1,
        label: "Comparative turnout evidence",
        body: "Compulsory voting raises average turnout by 15 to 20 percent, and the gap is largest among low income and young voters who are systematically underrepresented under voluntary systems.",
        tag: "Strong data · Responsive to harms",
      },
      {
        id: 2,
        label: "Administrative feasibility",
        body: "Existing electoral infrastructure can absorb mandatory voting with minimal adjustment. Several mid sized democracies have implemented it without significant bureaucratic cost.",
        tag: "Weak magnitude · Already granted by opponent",
      },
      {
        id: 3,
        label: "Civic education spillover",
        body: "Mandatory voting creates incentives for citizens to engage with political information before election day, producing a marginally better informed electorate over time.",
        tag: "Speculative · Long causal chain",
      },
    ],
    idealPair: [0, 1],
    reasonablePair: [0, 3],
    explanation:
      "Arguments 0 and 1 are the ideal collapse. Argument 0 directly answers the opponent's autonomy offense by reframing legitimacy as the governing value. Argument 1 provides empirical grounding that makes the impact concrete and comparative. Arguments 2 and 3 are underpowered. Argument 2 was partially granted and adds little, and argument 3 has a long causal chain the opponent can easily break.",
    idealLabels: ["Representative legitimacy", "Comparative turnout evidence"],
  },
  {
    id: "c2",
    situation:
      "You are summarising in a debate on universal basic income replacing means tested welfare. Your opponent has successfully argued that UBI is fiscally unsustainable at full implementation scale. You need to pick the two arguments most likely to win the round.",
    arguments: [
      {
        id: 0,
        label: "Dignity floor",
        body: "An unconditional income floor removes the humiliation and surveillance built into means testing, preserving the dignity of recipients in a way targeted welfare structurally cannot.",
        tag: "Values based · High moral weight",
      },
      {
        id: 1,
        label: "Pilot programme results",
        body: "Controlled UBI pilots in Finland, Kenya, and Stockton showed no significant reduction in employment and measurable improvements in mental health outcomes.",
        tag: "Empirical · Directly answers solvency concern",
      },
      {
        id: 2,
        label: "Reduced bureaucratic overhead",
        body: "Eliminating the gatekeeping apparatus of means tested welfare frees administrative budget that partially offsets UBI costs.",
        tag: "Partially conceded · Insufficient to resolve fiscal concern",
      },
      {
        id: 3,
        label: "Labour market flexibility",
        body: "A basic income floor allows workers to take risks on entrepreneurship and retraining, producing long term economic dynamism that generates fiscal returns.",
        tag: "Speculative · Long timeframe",
      },
    ],
    idealPair: [0, 1],
    reasonablePair: [1, 2],
    explanation:
      "Arguments 0 and 1 form the ideal collapse. Argument 1 directly answers the fiscal solvency attack with real world evidence. Leaving it out means ceding the opponent's biggest point. Argument 0 sets the moral framework. Even if costs are high, the dignity floor is the right trade off. Together they cover both the empirical and the values dimension. Arguments 2 and 3 are weaker. Argument 2 does not resolve the fiscal concern, and argument 3 relies on a speculative causal chain over a long time horizon.",
    idealLabels: ["Dignity floor", "Pilot programme results"],
  },
  {
    id: "c3",
    situation:
      "You are two minutes from the end of a debate on whether social media platforms should be held liable for algorithmic harm. Your opponent's best argument is that liability would chill legitimate speech by making platforms over moderate. You have four arguments in play.",
    arguments: [
      {
        id: 0,
        label: "Radicalisation pipeline causation",
        body: "Internal documents from multiple platforms show algorithmic amplification of extremist content is not incidental but a designed feature optimising engagement, making the causal link to downstream violence demonstrable rather than theoretical.",
        tag: "High magnitude · Directly documented",
      },
      {
        id: 1,
        label: "Narrow liability standard",
        body: "A well scoped liability standard targeting demonstrably harmful amplification, not all moderation decisions, creates incentives to fix the algorithm without threatening good faith content removal.",
        tag: "Directly answers opponent's chilling effect offense",
      },
      {
        id: 2,
        label: "Analogous product liability law",
        body: "Car manufacturers are held liable for foreseeable defects without being required to make cars that never crash. Algorithmic liability follows the same principle.",
        tag: "Analogy · Useful but not load bearing",
      },
      {
        id: 3,
        label: "Adolescent mental health data",
        body: "Correlational studies link heavy social media use among teenagers to increased rates of anxiety and depression, suggesting platform design choices have public health consequences.",
        tag: "Correlational · Not directly responsive to opponent",
      },
    ],
    idealPair: [0, 1],
    reasonablePair: [0, 2],
    explanation:
      "Arguments 0 and 1 are the ideal collapse. Argument 1 must be in the final two because it is the only argument that directly answers the chilling effect attack. Leaving it out means conceding the opponent's strongest point by silence. Argument 0 provides the magnitude story that makes liability worth the cost. Arguments 2 and 3 are secondary. Argument 2 is a useful analogy but does not carry independent weight, and argument 3 is correlational and not responsive to the opponent's specific offense.",
    idealLabels: ["Radicalisation pipeline causation", "Narrow liability standard"],
  },
  {
    id: "c4",
    situation:
      "Final rebuttal in a debate on whether wealthy nations should dramatically increase climate refugee intake. Your opponent has argued that receiving nations lack the integration infrastructure to absorb large numbers quickly. You have four arguments still alive.",
    arguments: [
      {
        id: 0,
        label: "Survival imperative",
        body: "Climate refugees are not economic migrants. They face uninhabitable conditions created by the emissions of the very nations they are fleeing to. The survival claim takes moral priority over logistical friction.",
        tag: "Foundational · High moral weight",
      },
      {
        id: 1,
        label: "Infrastructure is a policy choice",
        body: "Integration capacity is not a fixed ceiling. It is a resource allocation decision. Nations that committed to building intake infrastructure in advance could meet the challenge. The opponent confuses a current deficit with a permanent limit.",
        tag: "Directly refutes opponent's offense",
      },
      {
        id: 2,
        label: "Economic contribution evidence",
        body: "Historical refugee cohorts have shown positive long term fiscal contributions in receiving economies, suggesting intake is economically self correcting over a 10 to 15 year horizon.",
        tag: "Useful second order point · Long timeframe",
      },
      {
        id: 3,
        label: "Historical precedent",
        body: "Post war Europe absorbed millions of displaced persons in conditions of genuine infrastructure scarcity, demonstrating that political will is the binding constraint, not physical capacity.",
        tag: "Strong supporting point · Not primary",
      },
    ],
    idealPair: [0, 1],
    reasonablePair: [0, 3],
    explanation:
      "Arguments 0 and 1 are the ideal collapse. Argument 1 is essential because it directly refutes the opponent's infrastructure offense. Without it, that attack stands uncontested in the final summary. Argument 0 keeps the moral stakes at the centre and prevents the debate from collapsing into a purely logistical comparison. Arguments 2 and 3 are useful support but neither answers the opponent's specific attack, so neither should headline the collapse.",
    idealLabels: ["Survival imperative", "Infrastructure is a policy choice"],
  },
  {
    id: "c5",
    situation:
      "You are in the final summary of a debate on mandatory drug testing for welfare recipients. Your opponent's main offense is that testing is cost ineffective. Studies show positive rates are lower than the general population and programme costs exceed savings. You have four arguments in play.",
    arguments: [
      {
        id: 0,
        label: "Programme cost data",
        body: "Every state that has published audit data on mandatory drug testing programmes has found that the cost of administering tests exceeds the value of benefits denied, making the programme a net fiscal loss on its own terms.",
        tag: "Directly answers opponent · High empirical weight",
      },
      {
        id: 1,
        label: "Stigmatisation harm",
        body: "Subjecting welfare recipients specifically to drug testing presumes criminal behaviour without cause, a form of institutional stigmatisation that has measurable chilling effects on benefit uptake among eligible families.",
        tag: "Dignity based · Independent of cost argument",
      },
      {
        id: 2,
        label: "Detection effectiveness ceiling",
        body: "Standard urine testing detects use only within a narrow window and misses the drugs most associated with functional impairment, making it an unreliable proxy for the problem it claims to solve.",
        tag: "Technical · Useful but secondary",
      },
      {
        id: 3,
        label: "Political symbolism framing",
        body: "The policy persists because it performs toughness rather than addressing addiction, which is better treated through funded rehabilitation than punitive surveillance.",
        tag: "Framing argument · Harder to weigh",
      },
    ],
    idealPair: [0, 1],
    reasonablePair: [0, 2],
    explanation:
      "Arguments 0 and 1 form the ideal collapse. Argument 0 must be in the final two. It directly accepts and wins on the opponent's chosen ground. If you concede the cost argument, you lose the round on their terms. Argument 1 introduces a separate harm that is not addressed by the opponent's case, giving you two independent paths to winning. Arguments 2 and 3 support the case but neither is load bearing.",
    idealLabels: ["Programme cost data", "Stigmatisation harm"],
  },
];

function pickScenario(context) {
  if (context?.seedId != null) {
    return DEFAULT_SCENARIOS[Number(context.seedId) % DEFAULT_SCENARIOS.length];
  }
  return DEFAULT_SCENARIOS[0];
}

function computeScore(selected, scenario) {
  const { idealPair, reasonablePair } = scenario;
  const idealSet = new Set(idealPair);
  const reasonableSet = new Set(reasonablePair);
  const idealHits = selected.filter((id) => idealSet.has(id)).length;

  if (idealHits === 2) return 3;
  if (idealHits === 1) {
    const otherChoice = selected.find((id) => !idealSet.has(id));
    if (reasonableSet.has(otherChoice)) return 2;
    return 1;
  }
  if (selected.filter((id) => reasonableSet.has(id)).length === 2) return 1;
  return 0;
}

function feedbackVerdict(score) {
  if (score === 3) return "correct";
  if (score >= 1) return "partial";
  return "wrong";
}

function feedbackTitle(score) {
  if (score === 3) return "Ideal collapse. Both arguments chosen.";
  if (score === 2) return "One strong pick, one reasonable.";
  if (score === 1) return "One ideal argument identified.";
  return "Neither ideal argument chosen.";
}

const MAX_SELECTIONS = 2;
const MAX_SCORE = 3;

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

export default function CollapseChoice({ context, onFinish }) {
  const scenario = pickScenario(context);
  const startTime = useRef(Date.now());
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const isPersonalized = context?.type === "seed";

  useEffect(() => {
    setSelected([]);
    setSubmitted(false);
    setScore(null);
    startTime.current = Date.now();
  }, [scenario.id]);

  const toggleSelect = (id) => {
    if (submitted) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTIONS) return prev;
      return [...prev, id];
    });
  };

  const handleSubmit = () => {
    if (selected.length < MAX_SELECTIONS || submitted) return;
    setScore(computeScore(selected, scenario));
    setSubmitted(true);
  };

  const handleContinue = () => {
    onFinish(computeScore(selected, scenario), MAX_SCORE, Date.now() - startTime.current);
  };

  const getCardState = (arg) => {
    const isSelected = selected.includes(arg.id);
    const isIdeal = scenario.idealPair.includes(arg.id);
    if (!submitted) {
      if (isSelected) return "selected";
      if (selected.length >= MAX_SELECTIONS) return "disabled";
      return "idle";
    }
    if (isIdeal && isSelected) return "correct-chosen";
    if (isIdeal && !isSelected) return "correct-missed";
    if (!isIdeal && isSelected) return "wrong";
    return "idle";
  };

  const checkGlyph = (state) => {
    if (state === "selected" || state === "correct-chosen") return "✓";
    if (state === "correct-missed") return "→";
    if (state === "wrong") return "✗";
    return "";
  };

  const canSubmit = selected.length === MAX_SELECTIONS && !submitted;

  return (
    <div>
      <div style={mg.eyebrow}>
        {isPersonalized ? "Personalized rep" : "Collapse choice"}
      </div>
      <div style={mg.title}>Pick the two arguments to collapse to</div>
      <div style={mg.support}>
        Select the pair most likely to win the round given the opponent&apos;s best offense and the time left.
      </div>

      <SeedBox context={context} />

      <div style={mg.contentCard()}>
        <div style={mg.metaLabel}>Round situation</div>
        <div style={mg.cardBodyMuted}>{scenario.situation}</div>
      </div>

      {!submitted && (
        <div style={mg.counterPill(selected.length === MAX_SELECTIONS)}>
          {selected.length} / {MAX_SELECTIONS} selected
        </div>
      )}

      {scenario.arguments.map((arg) => {
        const state = getCardState(arg);
        return (
          <button
            key={arg.id}
            onClick={() => toggleSelect(arg.id)}
            disabled={submitted || (selected.length >= MAX_SELECTIONS && !selected.includes(arg.id))}
            style={mg.choiceBtn(state)}
          >
            <span style={mg.choicePrefix(state)}>{checkGlyph(state) || "·"}</span>
            <span style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "15px", marginBottom: "6px" }}>
                {arg.label}
              </div>
              <div style={mg.cardBodyMuted}>{arg.body}</div>
              <div style={{ ...mg.metaLabel, marginTop: "8px", marginBottom: 0, fontSize: "10px" }}>
                {arg.tag}
              </div>
            </span>
          </button>
        );
      })}

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ ...solidBtn, opacity: canSubmit ? 1 : 0.4 }}
        >
          Lock in collapse →
        </button>
      )}

      {submitted && score !== null && (
        <div style={mg.feedbackBox(feedbackVerdict(score))}>
          <div style={mg.feedbackTitle(feedbackVerdict(score))}>
            {feedbackTitle(score)} ({score}/{MAX_SCORE})
          </div>
          <div style={mg.feedbackText}>{scenario.explanation}</div>

          <div style={mg.metaLabel}>Ideal collapse pair</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
            {scenario.idealPair.map((id) => {
              const arg = scenario.arguments.find((a) => a.id === id);
              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    background: "rgba(22,163,74,0.07)",
                    border: "1px solid rgba(22,163,74,0.18)",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#15803d",
                  }}
                >
                  <span>✓</span>
                  <span>{arg?.label}</span>
                </div>
              );
            })}
          </div>

          <button onClick={handleContinue} style={secondaryBtn}>
            {score === 3 ? "Clean, back to coach →" : "Noted, back to coach →"}
          </button>
        </div>
      )}
    </div>
  );
}
