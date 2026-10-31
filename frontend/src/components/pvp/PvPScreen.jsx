// pvp screen component

import { useCallback, useEffect, useState } from "react";
import PvPRoom from "./PvPRoom";
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
  if (status === "cancelled") return { text: "Ended", bg: "#eeeef4", color: "#667085" };
  return { text: "Searching", bg: "#fef3c7", color: "#a16207" };
}

function SessionCard({ session, user }) {
  const mySide = session.player1Id === user.id ? session.player1Side : session.player2Side;
  const opponent = session.player1Id === user.id ? session.player2Name : session.player1Name;
  const status = statusLabel(session.status);

  return (
    <div style={{ ...sectionCard, padding: "16px" }}>
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
          {session.winnerId == null ? "Draw" : session.winnerId === user.id ? "You won" : "You lost"} · Score: {session.scores.player1} - {session.scores.player2}
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
  const [selectedId, setSelectedId] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const updateSession = useCallback((session) => {
    setSessions((prev) => [session, ...prev.filter((item) => item.id !== session.id)]);
    setSelectedId((prev) => prev || session.id);
  }, []);

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
      const response = await apiFetch("/pvp/match", { method: "POST", body: JSON.stringify({ roomCode }) });
      setSessions((prev) => [response.session, ...prev.filter((item) => item.id !== response.session.id)]);
      setSelectedId(response.session.id);
    } catch (err) {
      setError(err.message || "Could not find a match");
    } finally {
      setBusy(false);
    }
  };

  const roomSession = sessions.find((item) => item.id === selectedId) || activeSession;

  return (
    <div style={pageWrap}>
      <div style={{ ...heroCard, marginBottom: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "14px", alignItems: "start" }}>
          <div>
            <div style={{ ...eyebrow, color: "rgba(255,255,255,0.80)" }}>Live Debate · Player vs player</div>
            <div style={{ fontSize: "clamp(2rem, 9vw, 2.55rem)", lineHeight: 1.03, letterSpacing: "-0.045em", fontWeight: 800, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", marginTop: "8px" }}>
              Two minds. One topic.
            </div>
            <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)", fontSize: "13px", marginBottom: 0 }}>
              Matchmaking uses your level and placement score, then assigns a topic and side automatically.
            </p>
          </div>
          <LevelBadge level={user.currentLevel} size="md" showLabel={false} />
        </div>
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "12px" }}>{error}</div>}

      {roomSession && <PvPRoom key={roomSession.id} session={roomSession} user={user} onSessionUpdated={updateSession} onUserUpdated={onUserUpdated} />}

      <details style={{ ...sectionCard, padding: "16px", marginBottom: "14px", fontSize: "14px", lineHeight: 1.6 }}>
        <summary style={{ minHeight: "44px", cursor: "pointer" }}>Community rules & safety</summary>
        <p>Challenge ideas, not people. No harassment, hate speech, threats, sexual content, spam or sharing another person's private information. Do not share your own sensitive information.</p>
        <p>Messages may be filtered. You can leave at any time, or report and block an opponent—even after a debate ends. The operator reviews reports and can suspend PvP access for abuse.</p>
        <p>Report a safety concern: <a href="mailto:zhanghaoranmatt@gmail.com">zhanghaoranmatt@gmail.com</a>. AI scores are practice feedback, not an objective ranking of people.</p>
      </details>

      <div style={{ ...sectionCard, padding: "16px", marginBottom: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "#eef2ff", borderRadius: "16px", padding: "12px" }}>
            <div style={eyebrowSmall}>Level</div>
            <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px" }}>{user.currentLevel}</div>
          </div>
          <div style={{ background: "#fdf2f8", borderRadius: "16px", padding: "12px" }}>
            <div style={eyebrowSmall}>Placement</div>
            <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px" }}>{user.placementScore}</div>
          </div>
          <div style={{ background: "#ecfdf3", borderRadius: "16px", padding: "12px" }}>
            <div style={eyebrowSmall}>Sessions</div>
            <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px" }}>{sessions.length}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={findMatch} disabled={busy} style={{ ...solidBtn, flex: "1 1 145px", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Matching…" : activeSession ? "Refresh Match" : "Find Opponent"}
          </button>
          <button onClick={loadSessions} style={{ ...solidBtn, flex: "1 1 145px", background: "#e9e9ef", color: "#1c1c1e", boxShadow: "none" }}>
            Refresh Sessions
          </button>
        </div>
        {!activeSession && <div style={{ marginTop: "12px" }}>
          <label style={{ fontSize: "13px", color: "#667085" }}>Optional friend room code (both players enter the same code)
            <input aria-label="Friend room code" placeholder="Leave blank for public matchmaking" value={roomCode} onChange={(e) => setRoomCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase())} maxLength={32} style={{ ...inputStyle, marginTop: "6px" }} />
          </label>
        </div>}
      </div>

      <div style={{ ...sectionCard, padding: "16px", marginBottom: "14px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>How PvP works</div>
        <div style={{ display: "grid", gap: "10px" }}>
          {[
            "Get matched with a user near your level and placement score.",
            "Receive a topic, difficulty, and assigned side.",
            "Exchange text arguments in your shared live debate room.",
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

          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Recent Sessions</div>
            <div style={{ display: "grid", gap: "10px" }}>
              {sessions.length === 0 && <div style={{ color: "#667085", fontSize: "13px" }}>No PvP sessions yet.</div>}
              {sessions.map((session) => (
                <div key={session.id}>
                  <SessionCard session={session} user={user} />
                  <button onClick={() => setSelectedId(session.id)} style={{ ...solidBtn, marginTop: "8px" }}>Open debate</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
