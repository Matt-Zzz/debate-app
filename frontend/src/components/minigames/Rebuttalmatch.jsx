import { useState, useRef, useEffect } from "react";
import { mg, solidBtn } from "../../styles/minigameStyles";

const DEFAULT_SETS = [
  {
    id: "set1",
    rounds: [
      {
        claim: "This policy saves money, so it clearly outweighs your side.",
        choices: [
          "Cost savings do not automatically win a round. You still need to show that money matters more than the harm we identified.",
          "We also care about money, so both sides agree on that.",
          "The policy might save money in theory, but it has never been tested in practice.",
          "That depends on how you define saving money.",
        ],
        correct: 0,
        explanation:
          "The strongest rebuttal directly challenges the weighing claim instead of accepting it silently. It forces the opponent to prove why their metric should govern the round.",
      },
      {
        claim: "Your impact is only theoretical, while ours is practical and immediate.",
        choices: [
          "That is a double standard. You accepted your own theoretical evidence earlier in the round.",
          "All impacts are somewhat theoretical because they deal with the future.",
          "We can find more evidence to support our impact if needed.",
          "Our impact is not theoretical. It is very real and serious.",
        ],
        correct: 0,
        explanation:
          "Calling out the double standard is precise and damaging. It does not just defend against the accusation. It turns it back on the opponent by exposing inconsistency in how they treated evidence across the round.",
      },
      {
        claim: "You never answered our solvency evidence, even if you win harms, you still lose.",
        choices: [
          "I did answer it. In my second speech I said your mechanism fails because it assumes perfect compliance, and you never responded to that.",
          "Our case was about harms, not solvency, so that is not relevant to how you evaluate the round.",
          "Solvency is always uncertain in any policy debate, so that cannot be the deciding factor.",
          "The judge should evaluate the round based on the strongest overall arguments, not just one dropped point.",
        ],
        correct: 0,
        explanation:
          "A specific, transcript level response is the only answer that actually closes the issue. The other options are evasions. None of them engage the dropped argument directly, which leaves the solvency gap open.",
      },
    ],
  },
  {
    id: "set2",
    rounds: [
      {
        claim: "Even if harm exists, your solution makes things worse by creating new risks.",
        choices: [
          "You have not quantified those new risks or shown they are larger than the existing harm. Without that comparison, your objection does not decide the round.",
          "Every solution involves some risk, so this is not a valid objection.",
          "We can minimise the new risks by refining the policy over time.",
          "The new risks you describe are speculative.",
        ],
        correct: 0,
        explanation:
          "The key move is demanding a comparative cost benefit analysis. Simply saying the risks are speculative, or that all solutions have risks, is too weak. Forcing a magnitude comparison puts the burden back on them.",
      },
      {
        claim: "Your only evidence is from a single study with a small sample size.",
        choices: [
          "That study was peer reviewed and replicated in a separate cohort, and you have provided no counter study, so you are asking the judge to prefer absence of evidence over actual evidence.",
          "One study is still evidence, and evidence beats no evidence.",
          "We are happy to accept more studies into the round if you have them.",
          "Sample size does not determine whether a finding is true.",
        ],
        correct: 0,
        explanation:
          "The strongest rebuttal does two things at once. It defends the evidence with a specific quality marker, replication, and it shifts the burden by pointing out the opponent has offered nothing in return.",
      },
      {
        claim: "Your framework is self serving. Of course your side wins under a framework you chose.",
        choices: [
          "Frameworks are not self serving when they are grounded in the resolution itself. Ours emerges from the literal words of the motion. Show me where your framework comes from if not from the same text.",
          "All frameworks involve some value judgment, so neither side is neutral.",
          "We chose this framework because it is the most common one used in this type of debate.",
          "You are free to propose a counter framework and we will respond to it.",
        ],
        correct: 0,
        explanation:
          "The best answer anchors the framework in the resolution, an external source, and then turns the challenge back on the opponent by demanding their derivation. The other answers either concede the critique or defer it.",
      },
    ],
  },
  {
    id: "set3",
    rounds: [
      {
        claim: "You are conflating correlation with causation in your evidence.",
        choices: [
          "Our study used a randomised controlled design specifically to isolate causation. It is not correlational. Point to the methodology section if you want to challenge it.",
          "Correlation is often sufficient to establish a pattern worth acting on.",
          "Even if it is only correlation, the relationship is still strong and concerning.",
          "Causation is difficult to establish in social science and both sides face this problem.",
        ],
        correct: 0,
        explanation:
          "Only the first answer actually closes the logical gap. It asserts that the study's methodology already addresses the critique. The other answers either accept the weakness or deflect.",
      },
      {
        claim: "Your case relies entirely on expert opinion rather than hard data.",
        choices: [
          "Expert consensus is not a substitute for data, but our expert sources cite specific datasets in the papers we introduced. The data is embedded in the evidence, not absent from it.",
          "Expert opinion is a legitimate form of evidence in any debate format.",
          "Hard data requires interpretation, which is exactly what expert opinion provides.",
          "We referenced experts because they are the most credible voices on this topic.",
        ],
        correct: 0,
        explanation:
          "The strongest answer concedes the general principle, expert opinion alone is weak, and then closes the attack by pointing to the embedded data. That stops the opponent from rerunning the same claim without specifics.",
      },
      {
        claim: "Your entire case assumes the status quo is broken, but you have not proven that.",
        choices: [
          "We introduced three pieces of evidence in our constructive that demonstrated specific, measurable failures in the current system, and you have not addressed any of those pieces in this round.",
          "The status quo is clearly broken. That is why this debate is happening.",
          "We do not need to prove the status quo is broken if our solution produces better outcomes regardless.",
          "The burden of proof on this question belongs to both sides equally.",
        ],
        correct: 0,
        explanation:
          "This is a dropped evidence response. Rather than rearguing the premise, the best answer demands the opponent engage evidence that was already in the round and went unanswered.",
      },
    ],
  },
];

function pickSet(context) {
  if (context?.seedId != null) {
    return DEFAULT_SETS[Number(context.seedId) % DEFAULT_SETS.length];
  }
  return DEFAULT_SETS[0];
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

export default function RebuttalMatch({ context, onFinish }) {
  const roundSet = pickSet(context);
  const rounds = roundSet.rounds;
  const startTime = useRef(Date.now());
  const MAX_SCORE = rounds.length;

  const [roundIdx, setRoundIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [committed, setCommitted] = useState(false);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    setRoundIdx(0);
    setSelected(null);
    setCommitted(false);
    setScores([]);
    startTime.current = Date.now();
  }, [roundSet.id]);

  const round = rounds[roundIdx];
  const isCorrect = committed && selected === round.correct;
  const isLast = roundIdx === rounds.length - 1;
  const isPersonalized = context?.type === "seed";

  const handleSelect = (idx) => {
    if (committed) return;
    setSelected(idx);
  };

  const handleSubmit = () => {
    if (selected === null || committed) return;
    setCommitted(true);
    setScores((prev) => [...prev, selected === round.correct]);
  };

  const handleNext = () => {
    if (isLast) {
      const total = scores.filter(Boolean).length;
      onFinish(total, MAX_SCORE, Date.now() - startTime.current);
      return;
    }
    setRoundIdx((i) => i + 1);
    setSelected(null);
    setCommitted(false);
  };

  const getChoiceState = (idx) => {
    if (!committed) return selected === idx ? "selected" : "idle";
    if (idx === round.correct) return "correct";
    if (idx === selected && selected !== round.correct) return "wrong";
    return "idle";
  };

  return (
    <div>
      <div style={mg.progressRow}>
        {rounds.map((_, i) => (
          <div
            key={i}
            style={mg.pip(i < roundIdx ? "done" : i === roundIdx ? "current" : "empty")}
          />
        ))}
      </div>

      <div style={mg.eyebrow}>
        {isPersonalized ? "Personalized rep" : "Rebuttal match"}
      </div>
      <div style={mg.title}>Choose the strongest rebuttal</div>
      <div style={mg.support}>
        One answer directly closes the argument. The others deflect, concede, or avoid.
      </div>

      <SeedBox context={context} />

      <div style={{ ...mg.topBar, marginBottom: "12px" }}>
        <div style={mg.scoreBadge}>
          Round {roundIdx + 1} / {rounds.length}
        </div>
      </div>

      <div style={mg.contentCard("warm")}>
        <div style={{ ...mg.metaLabel, color: "rgba(220,38,38,0.65)" }}>Opponent claim</div>
        <div style={mg.cardTitle}>&ldquo;{round.claim}&rdquo;</div>
      </div>

      {round.choices.map((text, idx) => {
        const state = getChoiceState(idx);
        return (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            disabled={committed}
            style={mg.choiceBtn(state)}
          >
            <span style={mg.choicePrefix(state)}>{String.fromCharCode(65 + idx)}</span>
            <span>{text}</span>
          </button>
        );
      })}

      {!committed && (
        <button
          onClick={handleSubmit}
          disabled={selected === null}
          style={{ ...solidBtn, opacity: selected === null ? 0.45 : 1 }}
        >
          Submit answer →
        </button>
      )}

      {committed && (
        <div style={mg.feedbackBox(isCorrect ? "correct" : "wrong")}>
          <div style={mg.feedbackTitle(isCorrect ? "correct" : "wrong")}>
            {isCorrect ? "Correct." : "Not quite."}
          </div>
          <div style={{ ...mg.feedbackText, marginBottom: 0 }}>{round.explanation}</div>
        </div>
      )}

      {committed && (
        <button onClick={handleNext} style={solidBtn}>
          {isLast ? "Finish round →" : "Next round →"}
        </button>
      )}
    </div>
  );
}
