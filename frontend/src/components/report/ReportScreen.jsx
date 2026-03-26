import { useEffect, useState } from "react";
import { DIFF_COLOR } from "../../constants/debate";
import { apiFetch } from "../../lib/api";
import { cardBtn, eyebrow, eyebrowSmall, headline, pageWrap, solidBtn } from "../../styles/ui";

function Skeleton({ width = "100%", height = "14px", style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: "4px",
        background: "linear-gradient(90deg,#f0f0f0 25%,#e4e4e4 50%,#f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        ...style,
      }}
    />
  );
}

function RubricSkeleton() {
  return (
    <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: "10px", padding: "20px 24px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <Skeleton width="80px" height="11px" />
        <Skeleton width="64px" height="36px" style={{ borderRadius: "6px" }} />
      </div>
      {[...Array(5)].map((_, index) => (
        <div key={index} style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <Skeleton width="150px" height="11px" />
            <Skeleton width="30px" height="11px" />
          </div>
          <Skeleton height="5px" style={{ borderRadius: "3px" }} />
        </div>
      ))}
    </div>
  );
}

function FeedbackSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
      {[["#edf7ee", ["100%", "88%", "60%"]], ["#fdecea", ["100%", "75%"]], ["#e8f2fd", ["100%", "55%"]]].map(([bg, widths], index) => (
        <div key={index} style={{ padding: "16px 20px", background: bg, borderRadius: "8px" }}>
          <Skeleton width="60px" height="10px" style={{ marginBottom: "12px" }} />
          {widths.map((width, widthIndex) => (
            <Skeleton key={widthIndex} width={width} height="13px" style={{ marginBottom: widthIndex < widths.length - 1 ? "6px" : "0" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function RubricDisplay({ rubric }) {
  if (!rubric) return null;
  const { total, breakdown } = rubric;
  const scoreColor = total >= 80 ? "#2e7d32" : total >= 60 ? "#e65100" : total >= 40 ? "#b8860b" : "#c62828";

  return (
    <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: "10px", padding: "20px 24px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={eyebrowSmall}>Rubric Score</div>
        <div style={{ fontSize: "2.2rem", fontFamily: "'DM Mono', monospace", fontWeight: 300, color: scoreColor }}>
          {total}
          <span style={{ fontSize: "1rem", color: "#aaa" }}>/100</span>
        </div>
      </div>
      {Object.values(breakdown).map((category) => (
        <div key={category.label} style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <div style={{ fontSize: "12px", color: "#555" }}>{category.label}</div>
            <div style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: category.score >= category.max * 0.7 ? "#2e7d32" : category.score >= category.max * 0.4 ? "#e65100" : "#c62828" }}>
              {category.score}/{category.max}
            </div>
          </div>
          <div style={{ height: "5px", background: "#eee", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(category.score / category.max) * 100}%`, background: category.score >= category.max * 0.7 ? "#2e7d32" : category.score >= category.max * 0.4 ? "#e65100" : "#c62828", borderRadius: "3px", transition: "width 0.6s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DrillPanel({ drill, sessionId, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!drill) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await apiFetch(`/drills/${drill.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ sessionId, answers, score: Object.keys(answers).length }),
      });
      setSubmitted(true);
      onComplete({ drill, answers });
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  if (submitted) {
    return (
      <div style={{ padding: "20px 24px", background: "#edf7ee", borderRadius: "10px", border: "1px solid #c8e6c9" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "8px", color: "#2e7d32" }}>✓ Drill Completed</div>
        <div style={{ fontSize: "14px", color: "#1a5c20", lineHeight: 1.6 }}>{drill.completionPrompt}</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "20px 24px" }}>
      <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>{drill.tag} · Next Drill</div>
      <div style={{ fontSize: "17px", fontWeight: 600, fontFamily: "'Playfair Display', serif", marginBottom: "6px" }}>{drill.name}</div>
      <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.55, marginBottom: "16px" }}>{drill.instructions}</div>
      {drill.questions.map((question, index) => (
        <div key={index} style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px", fontFamily: "'DM Mono', monospace" }}>Q{index + 1}. {question}</div>
          <textarea
            value={answers[index] || ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [index]: e.target.value }))}
            placeholder="Your answer…"
            style={{ width: "100%", minHeight: "64px", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", lineHeight: 1.55, resize: "vertical", fontFamily: "'DM Sans', sans-serif", background: "#fff", boxSizing: "border-box" }}
          />
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={handleSubmit} disabled={saving} style={{ ...solidBtn, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Submit Drill"}</button>
        <div style={{ fontSize: "12px", color: "#aaa" }}>Rubric: {drill.rubric}</div>
      </div>
    </div>
  );
}

export default function ReportScreen({ config, transcript, onNew }) {
  const { topic, character, side, sessionId } = config;
  const [rubric, setRubric] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [drills, setDrills] = useState([]);
  const [selectedDrill, setSelectedDrill] = useState(null);
  const [drillDone, setDrillDone] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);

  useEffect(() => {
    apiFetch("/drills").then(setDrills).catch(() => {});
    apiFetch("/coach-report", {
      method: "POST",
      body: JSON.stringify({ topicId: topic.id, characterId: character.id, side, transcript }),
    })
      .then((response) => {
        setRubric(response.rubric);
        setFeedback(response.feedback);
        setSavedToProfile(!!response.savedToProfile);
        if (response.rubric?.breakdown) {
          const drillMap = { structure: "d10", argQuality: "d6", clash: "d9", impact: "d2", precision: "d1" };
          const weakestKey = Object.entries(response.rubric.breakdown).sort((a, b) => (a[1].score / a[1].max) - (b[1].score / b[1].max))[0]?.[0];
          apiFetch("/drills")
            .then((allDrills) => {
              setDrills(allDrills);
              setSelectedDrill(allDrills.find((drill) => drill.id === (drillMap[weakestKey] || "d1")) || allDrills[0]);
            })
            .catch(() => {});
        }
      })
      .catch(() => setFetchError(true));
  }, []);

  const sideData = side === "A" ? topic.sideA : topic.sideB;
  const feedbackBg = { STRENGTHS: "#edf7ee", GAPS: "#fdecea", "NEXT DRILL": "#e8f2fd" };

  return (
    <div style={pageWrap}>
      <div style={{ marginBottom: "36px" }}>
        <div style={eyebrow}>Session Complete</div>
        <h1 style={headline}>Coach Report</h1>
        <div style={{ fontSize: "13px", color: "#888", marginTop: "6px" }}>
          {topic.title.slice(0, 55)}… · <span style={{ color: DIFF_COLOR[topic.difficulty] }}>{topic.difficulty}</span> · {sideData.position} · vs {character.name}
        </div>
      </div>

      {fetchError && <div style={{ color: "#c62828", fontSize: "13px", marginBottom: "16px" }}>Could not generate report. Check your backend connection.</div>}
      {!fetchError && savedToProfile && (
        <div style={{ color: "#2e7d32", fontSize: "13px", marginBottom: "14px" }}>
          Saved to your profile history.
        </div>
      )}

      {rubric ? <RubricDisplay rubric={rubric} /> : !fetchError && <RubricSkeleton />}

      {feedback ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {[["STRENGTHS", feedback.strengths], ["GAPS", feedback.gaps], ["NEXT DRILL", feedback.nextDrill]].map(([label, content]) => (
            content ? (
              <div key={label} style={{ padding: "16px 20px", background: feedbackBg[label] || "#f5f5f0", borderRadius: "8px" }}>
                <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>{label}</div>
                <div style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{content}</div>
              </div>
            ) : null
          ))}
        </div>
      ) : !fetchError && <FeedbackSkeleton />}

      <div style={{ padding: "14px 18px", background: "#fafafa", border: "1px solid #eee", borderRadius: "8px", marginBottom: "20px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>{character.avatar} What convinces {character.name}</div>
        {character.convincedBy.map((item, index) => (
          <div key={index} style={{ fontSize: "12px", color: "#555", marginBottom: "2px" }}>
            · {item}
          </div>
        ))}
      </div>

      {!drillDone && selectedDrill && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Assigned Drill</div>
          <DrillPanel drill={selectedDrill} sessionId={sessionId} onComplete={() => setDrillDone(true)} />
        </div>
      )}

      {drillDone && (
        <div style={{ padding: "14px 18px", background: "#edf7ee", border: "1px solid #c8e6c9", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", color: "#2e7d32" }}>✓ Drill completed. Good work - bring this to your next session.</div>
        </div>
      )}

      {drills.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>All Drills</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {drills.map((drill) => (
              <button
                key={drill.id}
                onClick={() => {
                  setSelectedDrill(drill);
                  setDrillDone(false);
                  window.scrollTo(0, document.body.scrollHeight);
                }}
                style={{ ...cardBtn(selectedDrill?.id === drill.id), padding: "10px 16px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500 }}>{drill.name}</div>
                    <div style={{ fontSize: "11px", opacity: 0.6 }}>{drill.description.slice(0, 70)}…</div>
                  </div>
                  <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", opacity: 0.5, marginLeft: "12px", flexShrink: 0 }}>{drill.tag}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: "28px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Full Transcript</div>
        {transcript.map((entry, index) => (
          <div key={index} style={{ padding: "9px 13px", marginBottom: "5px", borderLeft: `3px solid ${entry.role === "user" ? "#1a1a1a" : "#ddd"}`, background: "#fafafa", borderRadius: "0 6px 6px 0" }}>
            <div style={{ ...eyebrowSmall, marginBottom: "2px" }}>{entry.stageName} · {entry.role === "user" ? "YOU" : character.name.toUpperCase()}</div>
            <div style={{ fontSize: "13px", color: "#444", lineHeight: 1.6 }}>{entry.text}</div>
          </div>
        ))}
      </div>

      <button onClick={onNew} style={solidBtn}>← Start New Session</button>
    </div>
  );
}
