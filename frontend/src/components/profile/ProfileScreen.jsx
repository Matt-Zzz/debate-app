import { useEffect, useState } from "react";
import { apiFetch, setAuthToken } from "../../lib/api";
import LevelBadge from "../common/LevelBadge";
import XPProgressBar from "../common/XPProgressBar";
import DifficultyChip from "../common/DifficultyChip";
import {
  eyebrow,
  eyebrowSmall,
  heroCard,
  inputStyle,
  pageWrap,
  sectionCard,
  secondaryBtn,
  solidBtn,
  textareaStyle,
} from "../../styles/ui";

export default function ProfileScreen({ user, onUserUpdated, onBack, onSignOut }) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setLoadingHistory(true);
    apiFetch("/profile/history")
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, []);

  const saveAccount = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const body = {};
      if (name.trim() && name.trim() !== user.name) body.name = name.trim();
      if (email.trim().toLowerCase() && email.trim().toLowerCase() !== user.email.toLowerCase()) body.email = email.trim().toLowerCase();
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      if (Object.keys(body).length === 0) {
        setMessage("No account changes.");
        return;
      }
      const res = await apiFetch("/auth/me", { method: "PUT", body: JSON.stringify(body) });
      onUserUpdated(res.user);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Account updated.");
    } catch (err) {
      setError(err.message || "Could not update account");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    const pw = window.prompt("Enter your password to delete your account (leave blank for Google-only accounts).");
    if (pw === null) return;
    try {
      await apiFetch("/auth/me", {
        method: "DELETE",
        body: JSON.stringify({ password: pw }),
      });
      setAuthToken("");
      onSignOut();
    } catch (err) {
      setError(err.message || "Could not delete account");
    }
  };

  return (
    <div style={pageWrap}>
      <div style={{ ...heroCard, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Profile</div>
            <div style={{ fontSize: "clamp(2rem, 7vw, 3rem)", lineHeight: 0.98, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "10px" }}>
              {user.name}
            </div>
            <div style={{ fontSize: "14px", lineHeight: 1.7, color: "rgba(255,255,255,0.84)", marginTop: "8px" }}>
              Level {user.currentLevel}: {user.levelName} · {user.totalXP} XP
            </div>
          </div>
          <LevelBadge level={user.currentLevel} size="lg" />
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "22px", marginBottom: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
          <div>
            <div style={eyebrowSmall}>Progress</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827", marginTop: "8px", marginBottom: "10px" }}>
              Next level track
            </div>
            <XPProgressBar user={user} />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
              {user.unlockedDifficulties.map((difficulty) => (
                <DifficultyChip key={difficulty} difficulty={difficulty} size="sm" />
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
            <div style={{ background: "#eef2ff", borderRadius: "18px", padding: "14px", border: "1px solid rgba(99,102,241,0.12)" }}>
              <div style={eyebrowSmall}>Total XP</div>
              <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "8px" }}>{user.totalXP}</div>
            </div>
            <div style={{ background: "#fdf2f8", borderRadius: "18px", padding: "14px", border: "1px solid rgba(236,72,153,0.12)" }}>
              <div style={eyebrowSmall}>Placement</div>
              <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "8px" }}>{user.placementScore}</div>
            </div>
            <div style={{ background: "#ecfdf3", borderRadius: "18px", padding: "14px", border: "1px solid rgba(34,197,94,0.12)" }}>
              <div style={eyebrowSmall}>Sessions</div>
              <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "8px" }}>{history.length}</div>
            </div>
            <div style={{ background: "#fff7ed", borderRadius: "18px", padding: "14px", border: "1px solid rgba(249,115,22,0.12)" }}>
              <div style={eyebrowSmall}>Tutorial</div>
              <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "12px" }}>{user.tutorialCompleted ? "Complete" : "Pending"}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "22px", marginBottom: "14px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "12px" }}>Account Settings</div>
        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Email</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={inputStyle} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Current password</div>
            <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" style={inputStyle} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>New password</div>
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" style={inputStyle} />
          </div>
        </div>

        {(message || error) && (
          <div style={{ fontSize: "12px", color: error ? "#dc2626" : "#16a34a", marginTop: "12px" }}>
            {error || message}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
          <button onClick={saveAccount} disabled={saving} style={{ ...solidBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save account"}
          </button>
          <button onClick={onSignOut} style={secondaryBtn}>Sign out</button>
          <button onClick={deleteAccount} style={{ ...secondaryBtn, color: "#dc2626", borderColor: "rgba(220,38,38,0.18)" }}>Delete account</button>
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "22px", marginBottom: "14px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Training History</div>
        {loadingHistory && <div style={{ color: "#667085", fontSize: "13px" }}>Loading history…</div>}
        {!loadingHistory && history.length === 0 && <div style={{ color: "#667085", fontSize: "13px" }}>No training sessions saved yet.</div>}
        {!loadingHistory && history.length > 0 && (
          <div style={{ display: "grid", gap: "10px" }}>
            {history.map((item) => (
              <div key={item.id} style={{ background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)", borderRadius: "18px", padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'Fraunces', serif" }}>{item.topicTitle}</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#4338ca" }}>{item.rubric?.total ?? 0}/100</div>
                </div>
                <div style={{ fontSize: "12px", color: "#667085", marginBottom: "8px" }}>
                  {item.characterName} · Side {item.side} · {new Date(item.createdAt).toLocaleString()}
                </div>
                <details>
                  <summary style={{ cursor: "pointer", fontSize: "12px", color: "#4338ca", fontWeight: 700 }}>View feedback</summary>
                  <textarea
                    readOnly
                    value={[
                      item.feedback?.strengths ? `STRENGTHS:\n${item.feedback.strengths}` : "",
                      item.feedback?.gaps ? `GAPS:\n${item.feedback.gaps}` : "",
                      item.feedback?.nextDrill ? `NEXT DRILL:\n${item.feedback.nextDrill}` : "",
                    ].filter(Boolean).join("\n\n")}
                    style={{ ...textareaStyle, marginTop: "10px", minHeight: "160px", background: "#fff" }}
                  />
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onBack} style={secondaryBtn}>Back to sessions</button>
    </div>
  );
}
