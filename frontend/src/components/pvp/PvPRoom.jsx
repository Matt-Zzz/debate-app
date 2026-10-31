import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";
import { eyebrowSmall, sectionCard, solidBtn, secondaryBtn, textareaStyle } from "../../styles/ui";

export default function PvPRoom({ session, user, onSessionUpdated, onUserUpdated }) {
  const [room, setRoom] = useState({ session, messages: [], finishedBy: [] });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Harassment or bullying");
  const [notice, setNotice] = useState("");
  const after = useRef(0);
  const retry = useRef(null);
  const bottom = useRef(null);
  const syncRef = useRef(null);
  const callbacks = useRef({ onSessionUpdated, onUserUpdated });
  callbacks.current = { onSessionUpdated, onUserUpdated };
  const ended = useRef(false);

  useEffect(() => {
    let stopped = false;
    let syncing = false;
    let halted = false;
    let timer;
    after.current = 0;
    ended.current = false;
    retry.current = null;
    const controller = new AbortController();
    const sync = async () => {
      if (syncing || stopped) return;
      syncing = true;
      const request = new AbortController();
      const abort = () => request.abort();
      controller.signal.addEventListener("abort", abort);
      const deadline = setTimeout(abort, 12000);
      try {
        const data = await apiFetch(`/pvp/sessions/${session.id}/room?after=${after.current}`, { signal: request.signal });
        if (stopped) return;
        after.current = Math.max(after.current, ...data.messages.map((m) => m.id));
        setRoom((prev) => ({ ...data, messages: [...new Map([...prev.messages, ...data.messages].map((m) => [m.id, m])).values()].sort((a, b) => a.id - b.id) }));
        setConnected(true);
        setError((previous) => previous.startsWith("Connection:") ? "" : previous);
        callbacks.current.onSessionUpdated(data.session);
        if (data.session.status === "completed" && !ended.current) {
          const fresh = await apiFetch("/auth/me", { signal: controller.signal });
          if (!stopped) { ended.current = true; callbacks.current.onUserUpdated?.(fresh.user); }
        }
      } catch (err) {
        if (!stopped) {
          setConnected(false);
          setError(`Connection: ${err.message || "Unable to sync. Retrying automatically; your draft is kept."}`);
          if ([401, 403, 404].includes(err.status)) halted = true;
        }
      } finally {
        clearTimeout(deadline);
        controller.signal.removeEventListener("abort", abort);
        syncing = false;
      }
    };
    const poll = async () => {
      await sync();
      if (!stopped && !halted) timer = setTimeout(poll, 1000);
    };
    syncRef.current = async () => {
      const wasHalted = halted;
      halted = false;
      await sync();
      if (wasHalted && !stopped && !halted) timer = setTimeout(poll, 1000);
    };
    poll();
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [session.id]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [room.messages.length]);
  const current = room.session;
  const isFirst = current.player1Id === user.id;
  const opponent = isFirst ? current.player2Name : current.player1Name;
  const side = isFirst ? current.player1Side : current.player2Side;
  const finished = room.finishedBy.includes(user.id);
  const active = current.status === "matched";
  const judging = current.judgeState === "judging";
  const myRubric = current.result?.rubric?.[isFirst ? "player1" : "player2"];

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy || !active || finished) return;
    setBusy(true); setError("");
    if (retry.current?.text !== text) retry.current = { text, clientId: crypto.randomUUID() };
    try {
      await apiFetch(`/pvp/sessions/${session.id}/messages`, { method: "POST", body: JSON.stringify(retry.current) });
      setDraft(""); retry.current = null;
      await syncRef.current?.();
    } catch (err) { setError(err.message || "Message not sent. Retry to send it once."); }
    finally { setBusy(false); }
  };

  const finish = async () => {
    if (busy) return;
    if (draft.trim()) { setError("Send or clear your draft before finishing."); return; }
    setBusy(true); setError("");
    try {
      const result = await apiFetch(`/pvp/sessions/${session.id}/finish`, { method: "POST" });
      if (result.session.status === "completed") callbacks.current.onUserUpdated?.(result.user);
      await syncRef.current?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const leave = async (report = false) => {
    if (busy) return;
    const reason = report ? reportReason.trim() : "";
    if (report && !reason) { setError("Choose a reason for your report."); return; }
    if (!report && !window.confirm("Leave this debate? No XP will be awarded.")) return;
    setBusy(true); setError("");
    try {
      await apiFetch(`/pvp/sessions/${session.id}/leave`, { method: "POST", body: JSON.stringify({ blockOpponent: report, reportReason: reason }) });
      if (report) { setReportOpen(false); setNotice("Report saved for operator review. This opponent is blocked from future matching. For urgent concerns, contact zhanghaoranmatt@gmail.com."); }
      await syncRef.current?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <section style={{ ...sectionCard, padding: "18px", marginBottom: "16px" }} aria-label="Live debate room">
      <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Live text debate · {connected ? "Synced" : "Reconnecting…"}</div>
      <h2 style={{ fontSize: "20px", margin: "0 0 8px" }}>{current.topicTitle || "Finding your opponent…"}</h2>
      <p style={{ fontSize: "13px", color: "#667085" }}>{opponent || "Waiting for a second player"}{side ? ` · You: Side ${side}` : ""}</p>
      {(isFirst ? current.player1Position : current.player2Position) && <p>Your position: {isFirst ? current.player1Position : current.player2Position}</p>}
      {current.status === "waiting" && <p>Keep this screen open. Your room opens automatically when someone joins.</p>}
      {current.status === "cancelled" && <p>This debate has ended without a score. You can find a new opponent.</p>}
      {current.scores && <div style={{ background: "#eef2ff", borderRadius: "16px", padding: "16px", marginBottom: "12px" }}>
        <h3 style={{ margin: "0 0 8px", color: "#4338ca" }}>{current.winnerId == null ? "Draw · 平局" : current.winnerId === user.id ? "You won! · 获胜" : "You lost · 失利"}</h3>
        <p>Your score: {isFirst ? current.scores.player1 : current.scores.player2}/100 · Opponent: {isFirst ? current.scores.player2 : current.scores.player1}/100</p>
        <p>{current.result?.notes}</p>
        {myRubric && <details><summary>Your scoring & feedback</summary><p>Reasoning {myRubric.reasoning}/25 · Evidence {myRubric.evidence}/25 · Rebuttal {myRubric.rebuttal}/25 · Clarity {myRubric.clarity}/25</p><p>{myRubric.feedback}</p></details>}
        <small>{current.result?.judge || "Practice rubric"}{current.result?.judge ? " · AI judgment may be inaccurate." : ""}</small>
      </div>}
      <div role="log" aria-label="Debate messages" aria-live="polite" style={{ maxHeight: "42dvh", minHeight: active ? "140px" : 0, overflowY: "auto", display: "grid", gap: "10px", padding: "8px 0", overscrollBehavior: "contain" }}>
        {active && room.messages.length === 0 && <p style={{ color: "#667085", fontSize: "14px" }}>Send your opening argument. Messages sync automatically.</p>}
        {room.messages.map((message) => {
          const mine = message.senderId === user.id;
          return <div key={message.id} style={{ justifySelf: mine ? "end" : "start", maxWidth: "88%", background: mine ? "#6254dd" : "#eeeef4", color: mine ? "white" : "#1c1c1e", borderRadius: "16px", padding: "12px 14px", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
            <div style={{ fontSize: "11px", opacity: 0.75, marginBottom: "5px" }}>{mine ? "You" : opponent} · {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div style={{ fontSize: "15px", lineHeight: 1.5 }}>{message.text}</div>
          </div>;
        })}
        <div ref={bottom} />
      </div>
      {error && <p role="alert" style={{ color: "#b42318", fontSize: "13px" }}>{error}</p>}
      {!connected && <button type="button" onClick={() => syncRef.current?.()} disabled={busy} style={secondaryBtn}>Retry connection</button>}
      {notice && <p role="status" style={{ color: "#166534", lineHeight: 1.6 }}>{notice}</p>}
      {active && current.judgeError && <p role="alert" style={{ color: "#b42318" }}>{current.judgeError}</p>}
      {active && <>
        {finished ? <div><p>{judging ? "Gemini is judging… This may take up to a minute." : room.finishedBy.length === 2 ? "Both players finished. Ready to retry AI judging." : "Your arguments are finished. Waiting for your opponent to finish and agree to AI judging."}</p>
          {room.finishedBy.length === 2 && !judging && <button onClick={finish} disabled={busy} style={secondaryBtn}>{busy ? "Judging…" : "Retry AI judging"}</button>}
        </div> : <form onSubmit={send}>
          <textarea aria-label="Your argument" placeholder="Write your argument…" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} disabled={busy} style={{ ...textareaStyle, minHeight: "90px", marginTop: "10px" }} />
          <div style={{ fontSize: "11px", color: "#667085", textAlign: "right" }}>{draft.length}/2000</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
            <button type="submit" disabled={busy || !draft.trim()} style={{ ...solidBtn, opacity: busy || !draft.trim() ? 0.5 : 1 }}>Send argument</button>
            <button type="button" onClick={finish} disabled={busy} style={secondaryBtn}>{busy ? "Please wait…" : "Finish & AI judge"}</button>
          </div>
        </form>}
        <p style={{ fontSize: "12px", color: "#667085" }}>Both players consent and finish before Google Gemini judges the full conversation. The AI scores reasoning, evidence, rebuttal and clarity to decide the winner and XP. AI judgments may be inaccurate. Be respectful; do not share personal information.</p>
      </>}
      {["waiting", "matched"].includes(current.status) && <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
        <button disabled={busy} onClick={() => leave()} style={secondaryBtn}>{active ? "Leave debate" : "Cancel search"}</button>
      </div>}
      {current.player2Id && <button type="button" disabled={busy} onClick={() => setReportOpen(true)} style={{ ...secondaryBtn, color: "#b42318", marginTop: "12px" }}>Report & block</button>}
      {reportOpen && <div role="region" aria-label="Report opponent" style={{ marginTop: "16px", padding: "16px", border: "1px solid #fecaca", borderRadius: "16px", background: "#fff7f7" }}>
        <h3 style={{ marginTop: 0 }}>Report opponent</h3>
        <p style={{ fontSize: "13px", lineHeight: 1.6 }}>The operator can review this room's messages. Submitting ends an active debate and blocks this account from future matching. Never include passwords or private contact details.</p>
        <label>Reason<select aria-label="Report reason" value={reportReason} onChange={(e) => setReportReason(e.target.value)} style={{ width: "100%", minHeight: "44px", fontSize: "16px", margin: "8px 0 16px" }}>
          {["Harassment or bullying", "Hate speech or discrimination", "Threats or dangerous content", "Sexual or inappropriate content", "Spam or sharing private information", "Other safety concern"].map((reason) => <option key={reason}>{reason}</option>)}
        </select></label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}><button type="button" disabled={busy} onClick={() => leave(true)} style={solidBtn}>{busy ? "Submitting…" : "Submit report & block"}</button><button type="button" disabled={busy} onClick={() => setReportOpen(false)} style={secondaryBtn}>Cancel</button></div>
      </div>}
    </section>
  );
}
