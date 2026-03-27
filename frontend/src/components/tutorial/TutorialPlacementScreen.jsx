import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { cardBtn, eyebrow, eyebrowSmall, headline, pageWrap, solidBtn } from "../../styles/ui";

function emptyAnswer(question) {
  return question.miniGame === "fallacy"
    ? { miniGame: question.miniGame, questionId: question.questionId, selectedOptions: [], explanation: "" }
    : { miniGame: question.miniGame, questionId: question.questionId, selectedOption: null, selectedIndex: null, explanation: "" };
}

function ResultScreen({ result, onContinue }) {
  const scores = Object.values(result.placement.scores || {});

  return (
    <div style={pageWrap}>
      <div style={{ marginBottom: "28px" }}>
        <div style={eyebrow}>Tutorial Complete</div>
        <h1 style={headline}>Placement Result</h1>
        <div style={{ fontSize: "13px", color: "#666", marginTop: "8px", lineHeight: 1.6 }}>
          You placed into <strong>Level {result.placement.assignedLevel}</strong>: {result.placement.assignedLevelName}.
        </div>
      </div>

      <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "20px 22px", marginBottom: "18px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Placement Score</div>
        <div style={{ fontSize: "40px", fontFamily: "'DM Mono', monospace", color: "#1a1a1a" }}>{result.placement.totalScore}<span style={{ fontSize: "18px", color: "#aaa" }}>/100</span></div>
        <div style={{ fontSize: "13px", color: "#666", marginTop: "8px" }}>
          Unlocked difficulties: {result.user.unlockedDifficulties.join(" + ")}
        </div>
      </div>

      <div style={{ display: "grid", gap: "10px", marginBottom: "20px" }}>
        {scores.map((score, index) => (
          <div key={score.miniGame} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
              <div>
                <div style={eyebrowSmall}>Exercise {index + 1}</div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", textTransform: "capitalize" }}>{score.total}/100</div>
              </div>
              <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.6, textAlign: "right" }}>
                Correctness {score.criteria.correctness}
                <br />
                Reasoning {score.criteria.reasoningQuality}
              </div>
            </div>
            <div style={{ fontSize: "13px", color: "#555", lineHeight: 1.6 }}>{score.feedback}</div>
          </div>
        ))}
      </div>

      <button onClick={onContinue} style={solidBtn}>Continue to Sessions →</button>
    </div>
  );
}

export default function TutorialPlacementScreen({ onComplete }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    apiFetch("/tutorial/session")
      .then((response) => {
        const nextSession = response.session;
        setSession(nextSession);
        setAnswers(
          Object.fromEntries(
            nextSession.questions.map((question) => [question.miniGame, emptyAnswer(question)]),
          ),
        );
      })
      .catch((err) => setError(err.message || "Could not load tutorial"))
      .finally(() => setLoading(false));
  }, []);

  const question = session?.questions[current];
  const answer = question ? answers[question.miniGame] : null;
  const isLast = session ? current === session.questions.length - 1 : false;

  const canContinue = useMemo(() => {
    if (!question || !answer) return false;
    if ((answer.explanation || "").trim().length < 12) return false;
    if (question.miniGame === "fallacy") return (answer.selectedOptions || []).length > 0;
    return answer.selectedIndex !== null || !!answer.selectedOption;
  }, [answer, question]);

  const updateAnswer = (patch) => {
    setAnswers((prev) => ({
      ...prev,
      [question.miniGame]: { ...prev[question.miniGame], ...patch },
    }));
  };

  const toggleFallacy = (option) => {
    const selected = answer.selectedOptions || [];
    updateAnswer({
      selectedOptions: selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const response = await apiFetch("/tutorial/complete", {
        method: "POST",
        body: JSON.stringify({
          sessionId: session.id,
          answers: Object.values(answers),
        }),
      });
      setResult(response);
    } catch (err) {
      setError(err.message || "Could not complete tutorial");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...pageWrap, color: "#999", fontSize: "14px" }}>
        Loading tutorial…
      </div>
    );
  }

  if (result) {
    return <ResultScreen result={result} onContinue={() => onComplete(result.user)} />;
  }

  if (!session || !question || !answer) {
    return (
      <div style={pageWrap}>
        <div style={{ color: "#c62828", fontSize: "13px" }}>{error || "Tutorial could not be loaded."}</div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={{ marginBottom: "28px" }}>
        <div style={eyebrow}>First Session</div>
        <h1 style={headline}>Tutorial + Placement</h1>
        <div style={{ fontSize: "13px", color: "#666", marginTop: "8px", lineHeight: 1.6 }}>
          You’ll complete three short tutorial exercises. The app picks them randomly from the training bank and uses them to place you into an initial level.
        </div>
      </div>

      <div style={{ display: "flex", gap: "4px", marginBottom: "18px" }}>
        {session.questions.map((item, index) => (
          <div key={item.miniGame} style={{ flex: 1, height: "4px", borderRadius: "999px", background: index < current ? "#1a1a1a" : index === current ? "#666" : "#e8e8e8" }} />
        ))}
      </div>

      <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "20px 22px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "12px", alignItems: "flex-start" }}>
          <div>
            <div style={eyebrowSmall}>Placement Exercise</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a", marginTop: "4px" }}>{question.prompt}</div>
          </div>
          <div style={{ fontSize: "12px", color: "#888", fontFamily: "'DM Mono', monospace" }}>
            {current + 1}/{session.questions.length}
          </div>
        </div>

        <div style={{ fontSize: "13px", color: "#666", marginBottom: "14px", lineHeight: 1.6 }}>{question.instructions}</div>

        {question.category && (
          <div style={{ padding: "10px 12px", background: "#fff", border: "1px solid #eee", borderRadius: "8px", fontSize: "13px", color: "#555", marginBottom: "14px", lineHeight: 1.6 }}>
            {question.category}
          </div>
        )}

        {question.stem && question.stem !== question.category && (
          <div style={{ padding: "14px 16px", background: "#f5f5f0", borderRadius: "8px", marginBottom: "14px", fontSize: "14px", color: "#1a1a1a", lineHeight: 1.65 }}>
            {question.stem}
          </div>
        )}

        {question.miniGame === "fallacy" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
            {question.options.map((option) => (
              <button
                key={option}
                onClick={() => toggleFallacy(option)}
                style={cardBtn((answer.selectedOptions || []).includes(option))}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
            {question.options.map((option, index) => (
              <button
                key={option}
                onClick={() => updateAnswer({ selectedOption: option, selectedIndex: index })}
                style={cardBtn(answer.selectedIndex === index)}
              >
                <span style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", opacity: 0.6, marginRight: "8px" }}>
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            ))}
          </div>
        )}

        <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Explain Your Choice</div>
        <textarea
          value={answer.explanation}
          onChange={(e) => updateAnswer({ explanation: e.target.value })}
          placeholder="Write 1-3 sentences explaining your choice."
          style={{ width: "100%", minHeight: "96px", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", lineHeight: 1.65, resize: "vertical", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }}
        />
      </div>

      {error && <div style={{ color: "#c62828", fontSize: "12px", marginBottom: "12px" }}>{error}</div>}

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {current > 0 && (
          <button onClick={() => setCurrent((prev) => prev - 1)} style={{ ...solidBtn, background: "#555" }}>
            Back
          </button>
        )}
        {!isLast && (
          <button onClick={() => setCurrent((prev) => prev + 1)} disabled={!canContinue} style={{ ...solidBtn, opacity: canContinue ? 1 : 0.5 }}>
            Next →
          </button>
        )}
        {isLast && (
          <button onClick={submit} disabled={!canContinue || submitting} style={{ ...solidBtn, opacity: !canContinue || submitting ? 0.5 : 1 }}>
            {submitting ? "Placing…" : "Finish Placement →"}
          </button>
        )}
      </div>
    </div>
  );
}
