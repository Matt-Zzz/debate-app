import { useEffect, useMemo, useState } from "react";
import DifficultyChip from "../common/DifficultyChip";
import LevelBadge from "../common/LevelBadge";
import { apiFetch } from "../../lib/api";
import {
  cardBtn,
  eyebrow,
  eyebrowSmall,
  heroCard,
  inputStyle,
  pageWrap,
  sectionCard,
  solidBtn,
  subheadline,
  textareaStyle,
} from "../../styles/ui";

function emptyAnswer(question) {
  return question.miniGame === "fallacy"
    ? { miniGame: question.miniGame, questionId: question.questionId, selectedOptions: [], explanation: "" }
    : { miniGame: question.miniGame, questionId: question.questionId, selectedOption: null, selectedIndex: null, explanation: "" };
}

function ResultScreen({ result, onContinue }) {
  const scores = Object.values(result.placement.scores || {});

  return (
    <div style={pageWrap}>
      <div style={{ ...heroCard, marginBottom: "18px" }}>
        <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Tutorial Complete</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
          <div>
            <div style={{ fontSize: "44px", fontWeight: 800, lineHeight: 1 }}>{result.placement.totalScore}<span style={{ fontSize: "18px", opacity: 0.75 }}>/100</span></div>
            <div style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(255,255,255,0.84)", marginTop: "8px", maxWidth: "440px" }}>
              You placed into Level {result.placement.assignedLevel}: {result.placement.assignedLevelName}. This unlocks {result.user.unlockedDifficulties.join(" + ")} topics to start training.
            </div>
          </div>
          <LevelBadge level={result.placement.assignedLevel} size="lg" />
        </div>
      </div>

      <div style={{ display: "grid", gap: "12px", marginBottom: "18px" }}>
        {scores.map((score, index) => (
          <div key={score.miniGame} style={{ ...sectionCard, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
              <div>
                <div style={eyebrowSmall}>Exercise {index + 1}</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#111827", marginTop: "4px" }}>{score.total}/100</div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <DifficultyChip difficulty={score.total >= 70 ? "Hard" : score.total >= 50 ? "Medium" : "Easy"} size="sm" />
              </div>
            </div>
            <div style={{ fontSize: "13px", color: "#475467", lineHeight: 1.7, marginBottom: "10px" }}>{score.feedback}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px" }}>
              {[
                ["Correctness", score.criteria.correctness],
                ["Reasoning", score.criteria.reasoningQuality],
                ["Clarity", score.criteria.clarity],
                ["Response", score.criteria.responseQuality],
              ].map(([label, value]) => (
                <div key={label} style={{ background: "#f8fafc", borderRadius: "16px", padding: "10px 12px", border: "1px solid rgba(148, 163, 184, 0.16)" }}>
                  <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={onContinue} style={solidBtn}>Start Training</button>
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
          Object.fromEntries(nextSession.questions.map((question) => [question.miniGame, emptyAnswer(question)])),
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
    return <div style={{ ...pageWrap, color: "#667085", fontSize: "14px" }}>Loading tutorial…</div>;
  }

  if (result) {
    return <ResultScreen result={result} onContinue={() => onComplete(result.user)} />;
  }

  if (!session || !question || !answer) {
    return (
      <div style={pageWrap}>
        <div style={{ color: "#dc2626", fontSize: "13px" }}>{error || "Tutorial could not be loaded."}</div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={{ ...heroCard, marginBottom: "18px" }}>
        <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>First Session</div>
        <div style={{ fontSize: "clamp(2rem, 7vw, 3rem)", lineHeight: 0.98, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "10px" }}>
          Tutorial + placement
        </div>
        <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)", maxWidth: "520px" }}>
          You’ll complete three short placement exercises. The app samples one prompt from each backend training bank to estimate your starting level.
        </p>
        <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
          {session.questions.map((item, index) => (
            <div
              key={item.miniGame}
              style={{
                flex: "1 1 0",
                minWidth: "90px",
                height: "10px",
                borderRadius: "999px",
                background: index < current ? "rgba(255,255,255,0.86)" : index === current ? "#fff" : "rgba(255,255,255,0.28)",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "22px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap" }}>
          <div>
            <div style={eyebrowSmall}>Exercise {current + 1} of {session.questions.length}</div>
            <div style={{ fontSize: "24px", lineHeight: 1.2, fontWeight: 800, color: "#111827", marginTop: "8px" }}>{question.prompt}</div>
          </div>
          <div style={{ padding: "8px 12px", borderRadius: "999px", background: "#eef2ff", color: "#4338ca", fontSize: "12px", fontWeight: 700 }}>
            Placement
          </div>
        </div>

        <div style={{ fontSize: "14px", color: "#475467", lineHeight: 1.7, marginBottom: "14px" }}>{question.instructions}</div>

        {question.category && (
          <div style={{ ...sectionCard, padding: "14px 16px", marginBottom: "14px", background: "#f8fafc" }}>
            <div style={{ fontSize: "13px", color: "#475467", lineHeight: 1.65 }}>{question.category}</div>
          </div>
        )}

        {question.stem && question.stem !== question.category && (
          <div style={{ background: "#f8fafc", borderRadius: "20px", padding: "16px 18px", marginBottom: "14px", border: "1px solid rgba(148, 163, 184, 0.16)", fontSize: "14px", color: "#111827", lineHeight: 1.7 }}>
            {question.stem}
          </div>
        )}

        {question.miniGame === "fallacy" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "14px" }}>
            {question.options.map((option) => (
              <button key={option} onClick={() => toggleFallacy(option)} style={cardBtn((answer.selectedOptions || []).includes(option))}>
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px", marginBottom: "14px" }}>
            {question.options.map((option, index) => (
              <button
                key={option}
                onClick={() => updateAnswer({ selectedOption: option, selectedIndex: index })}
                style={cardBtn(answer.selectedIndex === index)}
              >
                <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", opacity: 0.68, marginRight: "8px" }}>
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            ))}
          </div>
        )}

        <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Explain your choice</div>
        <textarea
          value={answer.explanation}
          onChange={(e) => updateAnswer({ explanation: e.target.value })}
          placeholder="Write 1-3 sentences explaining why you chose this answer."
          style={textareaStyle}
        />
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "12px" }}>{error}</div>}

      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        {current > 0 && (
          <button onClick={() => setCurrent((prev) => prev - 1)} style={{ ...solidBtn, background: "linear-gradient(135deg, #64748b 0%, #475569 100%)", boxShadow: "0 12px 24px rgba(71, 85, 105, 0.2)" }}>
            Back
          </button>
        )}
        {!isLast && (
          <button onClick={() => setCurrent((prev) => prev + 1)} disabled={!canContinue} style={{ ...solidBtn, opacity: canContinue ? 1 : 0.5 }}>
            Next
          </button>
        )}
        {isLast && (
          <button onClick={submit} disabled={!canContinue || submitting} style={{ ...solidBtn, opacity: !canContinue || submitting ? 0.5 : 1 }}>
            {submitting ? "Placing…" : "Finish placement"}
          </button>
        )}
      </div>
    </div>
  );
}
