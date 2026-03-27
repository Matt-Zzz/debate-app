import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { eyebrow, eyebrowSmall, headline, pageWrap, solidBtn } from "../../styles/ui";

function SessionCard({ session, user }) {
  const mySide = session.player1Id === user.id ? session.player1Side : session.player2Side;
  const opponent = session.player1Id === user.id ? session.player2Name : session.player1Name;

  return (
    <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
        <div>
          <div style={eyebrowSmall}>Session {session.status}</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a" }}>{session.topicTitle || "Waiting for opponent…"}</div>
        </div>
        <div style={{ fontSize: "12px", color: "#666", textAlign: "right" }}>
          {session.topicDifficulty || "Queue"}
          <br />
          {mySide ? `Side ${mySide}` : "Unassigned"}
        </div>
      </div>
      <div style={{ fontSize: "13px", color: "#555", lineHeight: 1.6 }}>
        Opponent: {opponent || "Searching…"}
      </div>
      {session.scores && (
        <div style={{ fontSize: "13px", color: "#555", lineHeight: 1.6, marginTop: "8px" }}>
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
      <div style={{ marginBottom: "28px" }}>
        <div style={eyebrow}>PvP Debate</div>
        <h1 style={headline}>Match Against Similar Players</h1>
        <div style={{ fontSize: "13px", color: "#666", marginTop: "8px", lineHeight: 1.6 }}>
          Matchmaking uses your current level and placement score. Completed PvP sessions award progression XP.
        </div>
      </div>

      <div style={{ background: "#f5f5f0", borderRadius: "10px", padding: "14px 16px", marginBottom: "18px", fontSize: "13px", color: "#555", lineHeight: 1.6 }}>
        Level {user.currentLevel}: {user.levelName} · {user.totalXP} XP
      </div>

      {error && <div style={{ color: "#c62828", fontSize: "12px", marginBottom: "12px" }}>{error}</div>}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
        <button onClick={findMatch} disabled={busy} style={{ ...solidBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Working…" : activeSession ? "Refresh Match" : "Find Match"}
        </button>
        <button onClick={loadSessions} style={{ ...solidBtn, background: "#555" }}>Refresh Sessions</button>
      </div>

      {loading ? (
        <div style={{ color: "#999", fontSize: "13px" }}>Loading PvP sessions…</div>
      ) : (
        <>
          {activeSession && (
            <div style={{ marginBottom: "18px" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Active Session</div>
              <SessionCard session={activeSession} user={user} />
            </div>
          )}

          {activeSession?.status === "matched" && (
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "18px 20px", marginBottom: "18px" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Report Result</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <input value={player1Score} onChange={(e) => setPlayer1Score(e.target.value)} placeholder="Player 1 score" type="number" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }} />
                <input value={player2Score} onChange={(e) => setPlayer2Score(e.target.value)} placeholder="Player 2 score" type="number" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }} />
              </div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional round notes" style={{ width: "100%", minHeight: "84px", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", marginBottom: "12px" }} />
              <button onClick={submitResult} disabled={busy || player1Score === "" || player2Score === ""} style={{ ...solidBtn, opacity: busy || player1Score === "" || player2Score === "" ? 0.5 : 1 }}>
                Submit PvP Result
              </button>
            </div>
          )}

          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Recent Sessions</div>
            <div style={{ display: "grid", gap: "10px" }}>
              {sessions.length === 0 && <div style={{ color: "#888", fontSize: "13px" }}>No PvP sessions yet.</div>}
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
