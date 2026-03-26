import { useEffect, useState } from "react";
import { apiFetch, setAuthToken } from "../../lib/api";
import { eyebrow, eyebrowSmall, headline, pageWrap, solidBtn } from "../../styles/ui";

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
      <div style={{ marginBottom: "28px" }}>
        <div style={eyebrow}>Account</div>
        <h1 style={headline}>Profile</h1>
      </div>

      <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "18px 20px", marginBottom: "20px" }}>
        <div style={{ display: "grid", gap: "10px" }}>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>Email</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>Current password (only for changing password)</div>
            <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>New password</div>
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }} />
          </div>
        </div>

        {(message || error) && (
          <div style={{ fontSize: "12px", color: error ? "#c62828" : "#2e7d32", marginTop: "10px" }}>
            {error || message}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
          <button onClick={saveAccount} disabled={saving} style={{ ...solidBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save account"}
          </button>
          <button onClick={deleteAccount} style={{ ...solidBtn, background: "#8b0000" }}>Delete account</button>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Training History</div>
        {loadingHistory && <div style={{ color: "#999", fontSize: "13px" }}>Loading history…</div>}
        {!loadingHistory && history.length === 0 && (
          <div style={{ color: "#888", fontSize: "13px" }}>No training sessions saved yet.</div>
        )}
        {!loadingHistory && history.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {history.map((item) => (
              <div key={item.id} style={{ padding: "12px 14px", background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "4px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
                    {item.topicTitle}
                  </div>
                  <div style={{ fontSize: "13px", fontFamily: "'DM Mono', monospace" }}>
                    {item.rubric?.total ?? 0}/100
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px" }}>
                  {item.characterName} · Side {item.side} · {new Date(item.createdAt).toLocaleString()}
                </div>
                <details>
                  <summary style={{ cursor: "pointer", fontSize: "12px", color: "#444" }}>View feedback</summary>
                  <div style={{ fontSize: "12px", color: "#444", whiteSpace: "pre-wrap", marginTop: "6px" }}>
                    {item.feedback?.strengths ? `STRENGTHS:\n${item.feedback.strengths}\n\n` : ""}
                    {item.feedback?.gaps ? `GAPS:\n${item.feedback.gaps}\n\n` : ""}
                    {item.feedback?.nextDrill ? `NEXT DRILL:\n${item.feedback.nextDrill}` : ""}
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onBack} style={solidBtn}>← Back to sessions</button>
    </div>
  );
}
