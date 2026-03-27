import { useEffect, useState } from "react";
import DifficultyChip from "../common/DifficultyChip";
import LevelBadge from "../common/LevelBadge";
import { apiFetch } from "../../lib/api";
import {
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

function statusLabel(status) {
  if (status === "matched") return { text: "Matched", bg: "#dcfce7", color: "#166534" };
  if (status === "completed") return { text: "Completed", bg: "#eef2ff", color: "#4338ca" };
  return { text: "Searching", bg: "#fef3c7", color: "#a16207" };
}

function SessionCard({ session, user }) {
  const mySide = session.player1Id === user.id ? session.player1Side : session.player2Side;
  const opponent = session.player1Id === user.id ? session.player2Name : session.player1Name;
  const status = statusLabel(session.status);

  return (
    <div style={{ ...sectionCard, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
        <div>
          <div style={eyebrowSmall}>PvP Session</div>
          <div style={{ fontSize: "20px", fontWeight: 800, marginTop: "6px", color: "#111827" }}>{session.topicTitle || "Waiting for opponent…"}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ padding: "7px 11px", borderRadius: "999px", background: status.bg, color: status.color, fontSize: "11px", fontWeight: 700 }}>
            {status.text}
          </div>
          {session.topicDifficulty && <DifficultyChip difficulty={session.topicDifficulty} size="sm" />}
        </div>
      </div>
      <div style={{ fontSize: "13px", color: "#475467", lineHeight: 1.7 }}>
        Opponent: {opponent || "Searching…"}
      </div>
      <div style={{ fontSize: "13px", color: "#475467", lineHeight: 1.7 }}>
        Assigned side: {mySide ? `Side ${mySide}` : "Pending"}
      </div>
      {session.scores && (
        <div style={{ fontSize: "13px", color: "#475467", lineHeight: 1.7 }}>
          Score: {session.scores.player1} - {session.scores.player2}
        </div>
      )}
    </div>
  );
}

export default function PvPScreen({ user, onUserUpdated }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [player1Score, setPlayer1Score] = useState("");
  const [player2Score, setPlayer2Score] = useState("");
  const [notes, setNotes] = useState("");

  const loadSessions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/pvp/sessions");
      setSessions(response);
    } catch (err) {
      setError(err.message || "Could not load PvP sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const activeSession = sessions.find((session) => session.status === "matched" || session.status === "waiting") || null;

  const findMatch = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch("/pvp/match", { method: "POST" });
      setSessions((prev) => [response.session, ...prev.filter((item) => item.id !== response.session.id)]);
    } catch (err) {
      setError(err.message || "Could not find a match");
    } finally {
      setBusy(false);
    }
  };

  const submitResult = async () => {
    if (!activeSession) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch(`/pvp/sessions/${activeSession.id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          player1Score: Number(player1Score),
          player2Score: Number(player2Score),
          notes,
        }),
      });
      setPlayer1Score("");
      setPlayer2Score("");
      setNotes("");
      onUserUpdated(response.user);
      await loadSessions();
    } catch (err) {
      setError(err.message || "Could not submit PvP result");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={pageWrap}>
      <div style={{ ...heroCard, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>PvP Arena</div>
            <div style={{ fontSize: "clamp(2rem, 7vw, 3rem)", lineHeight: 0.98, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "10px" }}>
              Challenge a nearby skill band.
            </div>
            <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)" }}>
              Matchmaking uses your level and placement score, then assigns a topic and side automatically.
            </p>
          </div>
          <LevelBadge level={user.currentLevel} size="lg" />
        </div>
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "12px" }}>{error}</div>}

      <div style={{ ...sectionCard, padding: "22px", marginBottom: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "#eef2ff", borderRadius: "18px", padding: "14px" }}>
            <div style={eyebrowSmall}>Level</div>
            <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px" }}>{user.currentLevel}</div>
          </div>
          <div style={{ background: "#fdf2f8", borderRadius: "18px", padding: "14px" }}>
            <div style={eyebrowSmall}>Placement</div>
            <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px" }}>{user.placementScore}</div>
          </div>
          <div style={{ background: "#ecfdf3", borderRadius: "18px", padding: "14px" }}>
            <div style={eyebrowSmall}>Sessions</div>
            <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px" }}>{sessions.length}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={findMatch} disabled={busy} style={{ ...solidBtn, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Matching…" : activeSession ? "Refresh Match" : "Find Opponent"}
          </button>
          <button onClick={loadSessions} style={{ ...solidBtn, background: "linear-gradient(135deg, #64748b 0%, #475569 100%)", boxShadow: "0 12px 24px rgba(71, 85, 105, 0.20)" }}>
            Refresh Sessions
          </button>
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "22px", marginBottom: "14px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>How PvP works</div>
        <div style={{ display: "grid", gap: "10px" }}>
          {[
            "Get matched with a user near your level and placement score.",
            "Receive a topic, difficulty, and assigned side.",
            "Report the round result after the debate finishes.",
            "PvP outcomes can contribute XP to progression.",
          ].map((item, index) => (
            <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "999px", background: "#eef2ff", color: "#4338ca", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>
                {index + 1}
              </div>
              <div style={{ fontSize: "13px", color: "#475467", lineHeight: 1.65 }}>{item}</div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#667085", fontSize: "13px" }}>Loading PvP sessions…</div>
      ) : (
        <>
          {activeSession && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Active Session</div>
              <SessionCard session={activeSession} user={user} />
            </div>
          )}

          {activeSession?.status === "matched" && (
            <div style={{ ...sectionCard, padding: "22px", marginBottom: "14px" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Report Result</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <input value={player1Score} onChange={(e) => setPlayer1Score(e.target.value)} placeholder="Player 1 score" type="number" style={inputStyle} />
                <input value={player2Score} onChange={(e) => setPlayer2Score(e.target.value)} placeholder="Player 2 score" type="number" style={inputStyle} />
              </div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional round notes" style={{ ...textareaStyle, minHeight: "92px", marginBottom: "12px" }} />
              <button onClick={submitResult} disabled={busy || player1Score === "" || player2Score === ""} style={{ ...solidBtn, opacity: busy || player1Score === "" || player2Score === "" ? 0.5 : 1 }}>
                Submit PvP Result
              </button>
            </div>
          )}

          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Recent Sessions</div>
            <div style={{ display: "grid", gap: "10px" }}>
              {sessions.length === 0 && <div style={{ color: "#667085", fontSize: "13px" }}>No PvP sessions yet.</div>}
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} user={user} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
