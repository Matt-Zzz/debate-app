import { useState, useEffect, useRef, useCallback } from "react";
import ClashGame from "./ClashGame";

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const API = "http://localhost:3001/api";
const AUTH_TOKEN_KEY = "debate_auth_token";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function setAuthToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

function authHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractErrorMessage(err) {
  return (
    err?.message ||
    err?.detail?.message ||
    err?.detail ||
    "API error"
  );
}

// ─── API HELPERS ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...authHeader(),
    ...(opts.headers || {}),
  };
  const res = await fetch(`${API}${path}`, {
    headers,
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(extractErrorMessage(err)), { status: res.status, data: err });
  }
  return res.json();
}

async function streamOpponentSpeech(payload, onChunk) {
  const res = await fetch(`${API}/opponent-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(extractErrorMessage(err) || "Stream error"), { data: err });
  }
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full   = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const chunk = line.slice(6);
      if (chunk === "[DONE]") return full;
      if (chunk.startsWith("[ERROR]")) throw new Error(chunk.slice(8));
      const token = chunk.replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
      full += token;
      onChunk(token);
    }
  }
  return full;
}

// ─── FORMAT ────────────────────────────────────────────────────────────────────
const FORMAT = [
  { name: "Your Constructive", role: "user",     duration: 180, description: "Present your full case. Define key terms, state your framework, and lay out your main contentions with warrants." },
  { name: "Opponent Rebuttal", role: "opponent", duration: 120, description: "Your opponent responds to your constructive." },
  { name: "Your Rebuttal",     role: "user",     duration: 120, description: "Rebuild your case and clash directly with opponent arguments. Do not introduce new contentions." },
  { name: "Opponent Summary",  role: "opponent", duration: 90,  description: "Your opponent crystallizes their key arguments." },
  { name: "Your Summary",      role: "user",     duration: 90,  description: "Collapse to your strongest 2–3 arguments. Explain why you win the round." },
];

// ─── TIMER ─────────────────────────────────────────────────────────────────────
function Timer({ totalSeconds, isRunning, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const ref = useRef(null);
  useEffect(() => { setRemaining(totalSeconds); }, [totalSeconds]);
  useEffect(() => {
    if (isRunning) {
      ref.current = setInterval(() => {
        setRemaining(p => { if (p <= 1) { clearInterval(ref.current); onExpire(); return 0; } return p - 1; });
      }, 1000);
    } else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [isRunning, onExpire]);
  const pct = (remaining / totalSeconds) * 100;
  const m = Math.floor(remaining / 60), s = remaining % 60;
  const low = remaining < 30 && remaining > 0;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "2.6rem", fontFamily: "'DM Mono', monospace", fontWeight: 300, color: low ? "#c0392b" : "#1a1a1a", letterSpacing: "0.04em", transition: "color 0.3s" }}>
        {m}:{s.toString().padStart(2, "0")}
      </div>
      <div style={{ height: "3px", background: "#eee", borderRadius: "2px", marginTop: "6px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: low ? "#c0392b" : "#1a1a1a", transition: "width 1s linear, background 0.3s" }} />
      </div>
    </div>
  );
}

// ─── SKELETON LOADERS ──────────────────────────────────────────────────────────
function Skeleton({ width = "100%", height = "14px", style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: "4px",
      background: "linear-gradient(90deg,#f0f0f0 25%,#e4e4e4 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      ...style,
    }} />
  );
}
function RubricSkeleton() {
  return (
    <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: "10px", padding: "20px 24px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <Skeleton width="80px" height="11px" /><Skeleton width="64px" height="36px" style={{ borderRadius: "6px" }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <Skeleton width="150px" height="11px" /><Skeleton width="30px" height="11px" />
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
      {[["#edf7ee",["100%","88%","60%"]], ["#fdecea",["100%","75%"]], ["#e8f2fd",["100%","55%"]]].map(([bg, widths], i) => (
        <div key={i} style={{ padding: "16px 20px", background: bg, borderRadius: "8px" }}>
          <Skeleton width="60px" height="10px" style={{ marginBottom: "12px" }} />
          {widths.map((w, j) => <Skeleton key={j} width={w} height="13px" style={{ marginBottom: j < widths.length - 1 ? "6px" : "0" }} />)}
        </div>
      ))}
    </div>
  );
}

// ─── RUBRIC DISPLAY ────────────────────────────────────────────────────────────
function RubricDisplay({ rubric }) {
  if (!rubric) return null;
  const { total, breakdown } = rubric;
  const scoreColor = total >= 80 ? "#2e7d32" : total >= 60 ? "#e65100" : total >= 40 ? "#b8860b" : "#c62828";
  return (
    <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: "10px", padding: "20px 24px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={eyebrowSmall}>Rubric Score</div>
        <div style={{ fontSize: "2.2rem", fontFamily: "'DM Mono', monospace", fontWeight: 300, color: scoreColor }}>{total}<span style={{ fontSize: "1rem", color: "#aaa" }}>/100</span></div>
      </div>
      {Object.values(breakdown).map((cat) => (
        <div key={cat.label} style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <div style={{ fontSize: "12px", color: "#555" }}>{cat.label}</div>
            <div style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: cat.score >= cat.max * 0.7 ? "#2e7d32" : cat.score >= cat.max * 0.4 ? "#e65100" : "#c62828" }}>{cat.score}/{cat.max}</div>
          </div>
          <div style={{ height: "5px", background: "#eee", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(cat.score / cat.max) * 100}%`, background: cat.score >= cat.max * 0.7 ? "#2e7d32" : cat.score >= cat.max * 0.4 ? "#e65100" : "#c62828", borderRadius: "3px", transition: "width 0.6s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DRILL PANEL ───────────────────────────────────────────────────────────────
function DrillPanel({ drill, sessionId, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!drill) return null;
  const handleSubmit = async () => {
    setSaving(true);
    try {
      await apiFetch(`/drills/${drill.id}/complete`, { method: "POST", body: JSON.stringify({ sessionId, answers, score: Object.keys(answers).length }) });
      setSubmitted(true);
      onComplete({ drill, answers });
    } catch (e) { console.error(e); }
    setSaving(false);
  };
  if (submitted) return (
    <div style={{ padding: "20px 24px", background: "#edf7ee", borderRadius: "10px", border: "1px solid #c8e6c9" }}>
      <div style={{ ...eyebrowSmall, marginBottom: "8px", color: "#2e7d32" }}>✓ Drill Completed</div>
      <div style={{ fontSize: "14px", color: "#1a5c20", lineHeight: 1.6 }}>{drill.completionPrompt}</div>
    </div>
  );
  return (
    <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "20px 24px" }}>
      <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>{drill.tag} · Next Drill</div>
      <div style={{ fontSize: "17px", fontWeight: 600, fontFamily: "'Playfair Display', serif", marginBottom: "6px" }}>{drill.name}</div>
      <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.55, marginBottom: "16px" }}>{drill.instructions}</div>
      {drill.questions.map((q, i) => (
        <div key={i} style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px", fontFamily: "'DM Mono', monospace" }}>Q{i + 1}. {q}</div>
          <textarea value={answers[i] || ""} onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))} placeholder="Your answer…" style={{ width: "100%", minHeight: "64px", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", lineHeight: 1.55, resize: "vertical", fontFamily: "'DM Sans', sans-serif", background: "#fff", boxSizing: "border-box" }} />
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={handleSubmit} disabled={saving} style={{ ...solidBtn, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Submit Drill"}</button>
        <div style={{ fontSize: "12px", color: "#aaa" }}>Rubric: {drill.rubric}</div>
      </div>
    </div>
  );
}

// ─── VOICE TO TEXT ─────────────────────────────────────────────────────────────

const MIC_ERRORS = {
  "not-allowed":   "Microphone access was denied. Click the lock icon in your browser's address bar, allow microphone, then try again.",
  "audio-capture": "No microphone was found. Connect a microphone and try again.",
  "network":       "A network error prevented speech recognition. Check your connection and try again.",
};

// Checks whether the browser has already granted mic permission.
// Returns "granted", "denied", "prompt", or "unknown".
async function getMicPermissionState() {
  try {
    const result = await navigator.permissions.query({ name: "microphone" });
    return result.state; // "granted" | "denied" | "prompt"
  } catch (_) {
    return "unknown";
  }
}

function useSpeechToText({ onAppend, onError }) {
  const recognitionRef = useRef(null);
  const restartRef     = useRef(false);
  const committedRef   = useRef("");
  const [listening,  setListening]  = useState(false);
  const [supported,  setSupported]  = useState(false);
  const [permError,  setPermError]  = useState(null);
  const [permState,  setPermState]  = useState("unknown"); // "granted"|"denied"|"prompt"|"unknown"

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    setSupported(true);

    // Check current permission state so the UI can adapt
    getMicPermissionState().then(setPermState);

    const r = new SR();
    r.continuous     = true;
    r.interimResults = true;
    r.lang           = "en-US";

    r.onstart = () => { setListening(true); setPermError(null); setPermState("granted"); };

    r.onresult = (e) => {
      let newFinal = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) newFinal += e.results[i][0].transcript + " ";
      }
      if (newFinal) { committedRef.current += newFinal; onAppend(newFinal); }
    };

    r.onerror = (e) => {
      console.error("[SpeechRecognition] error:", e.error);
      const msg = MIC_ERRORS[e.error];
      if (msg) {
        setPermError(msg);
        setPermState(e.error === "not-allowed" ? "denied" : permState);
        restartRef.current = false;
        setListening(false);
        if (onError) onError(msg);
      }
    };

    r.onend = () => {
      if (restartRef.current) {
        try { r.start(); } catch (_) {}
      } else {
        setListening(false);
        committedRef.current = "";
      }
    };

    recognitionRef.current = r;
    return () => { restartRef.current = false; r.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    const r = recognitionRef.current;
    if (!r || listening) return;
    committedRef.current = "";
    restartRef.current   = true;
    setPermError(null);
    try { r.start(); } catch (e) { console.error("[SpeechRecognition] start failed:", e); }
  }, [listening]);

  const stop = useCallback(() => {
    restartRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => { listening ? stop() : start(); }, [listening, start, stop]);

  return { listening, supported, toggle, stop, permError, permState };
}

// ─── MIC PERMISSION MODAL ──────────────────────────────────────────────────────
function MicPermissionModal({ onAllow, onDismiss }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "#fff", borderRadius: "12px", padding: "32px 28px",
        maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        {/* Icon */}
        <div style={{ width: "48px", height: "48px", background: "#f5f5f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#1a1a1a">
            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z"/>
          </svg>
        </div>

        <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: "#1a1a1a" }}>
          Allow microphone access
        </h2>
        <p style={{ margin: "0 0 10px", fontSize: "14px", color: "#555", lineHeight: 1.6 }}>
          To use voice input, your browser needs access to your microphone.
        </p>
        <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#888", lineHeight: 1.6 }}>
          After clicking <strong>Allow &amp; Start</strong>, your browser will show a permission prompt at the top of the page. Click <strong>Allow</strong> there to activate the microphone.
        </p>

        {/* Browser tip */}
        <div style={{ padding: "10px 14px", background: "#f5f5f0", borderRadius: "8px", marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", color: "#999", fontFamily: "'DM Mono', monospace", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tip</div>
          <div style={{ fontSize: "12px", color: "#555", lineHeight: 1.5 }}>
            If no prompt appears, click the 🔒 lock icon in your browser's address bar → Site settings → Microphone → Allow.
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onAllow}
            style={{ flex: 1, padding: "11px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "7px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            Allow &amp; Start
          </button>
          <button
            onClick={onDismiss}
            style={{ padding: "11px 18px", background: "#fff", color: "#555", border: "1px solid #ddd", borderRadius: "7px", fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MIC BUTTON ────────────────────────────────────────────────────────────────
function MicButton({ listening, supported, toggle, permError, permState, onRequestPermission }) {
  if (!supported) return (
    <div style={{ fontSize: "11px", color: "#999", fontFamily: "'DM Mono', monospace", padding: "10px 0" }}>
      Voice input requires Chrome or Edge.
    </div>
  );

  if (permState === "denied") return (
    <div style={{ fontSize: "12px", color: "#c62828", lineHeight: 1.5, maxWidth: "260px" }}>
      ⚠ Microphone blocked. Click the 🔒 lock icon in your address bar → Microphone → Allow, then reload.
    </div>
  );

  // First-time or unknown: show the "Use Voice" button that triggers the modal
  const needsModal = !listening && permState !== "granted";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <button
        onClick={needsModal ? onRequestPermission : toggle}
        title={listening ? "Stop recording" : "Start voice input"}
        style={{
          display: "inline-flex", alignItems: "center", gap: "7px",
          padding: "10px 18px",
          background: listening ? "#c62828" : "#fff",
          color:      listening ? "#fff"    : "#1a1a1a",
          border:     `1px solid ${listening ? "#c62828" : "#ddd"}`,
          borderRadius: "6px", fontSize: "13px", fontWeight: 600,
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.2s", position: "relative", overflow: "hidden",
        }}
      >
        {listening && (
          <span style={{ position: "absolute", inset: 0, borderRadius: "6px", animation: "mic-pulse 1.4s ease-out infinite", background: "rgba(255,255,255,0.15)", pointerEvents: "none" }} />
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z"/>
        </svg>
        {listening ? "Stop Voice" : "Use Voice"}
      </button>
      {permError && (
        <div style={{ fontSize: "11px", color: "#c62828", maxWidth: "260px", lineHeight: 1.4 }}>⚠ {permError}</div>
      )}
    </div>
  );
}

// ─── AUTH SCREEN ───────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const googleBtnRef = useRef(null);

  const isSignIn = mode === "signin";

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !isSignIn || !googleBtnRef.current) return;
    let cancelled = false;

    const renderButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleBtnRef.current) return;
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp) => {
          if (!resp?.credential) return;
          setBusy(true);
          setError("");
          try {
            const auth = await apiFetch("/auth/google", {
              method: "POST",
              body: JSON.stringify({ idToken: resp.credential }),
            });
            onAuth(auth);
          } catch (e) {
            setError(e.message || "Google sign-in failed");
          } finally {
            setBusy(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 300,
        text: "signin_with",
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return () => { cancelled = true; };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);

    return () => { cancelled = true; };
  }, [isSignIn, onAuth]);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = isSignIn
        ? { email, password }
        : { name, email, password };
      const auth = await apiFetch(isSignIn ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onAuth(auth);
    } catch (e) {
      setError(e.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={pageWrap}>
      <div style={{ maxWidth: "460px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <div style={eyebrow}>Debate Simulator</div>
          <h1 style={headline}>{isSignIn ? "Sign in" : "Create account"}</h1>
        </div>

        <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "18px 20px" }}>
          {!isSignIn && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>Name</div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
              />
            </div>
          )}

          <div style={{ marginBottom: "10px" }}>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>Email</div>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>Password</div>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSignIn ? "Your password" : "At least 8 characters"}
              type="password"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
            />
          </div>

          {error && (
            <div style={{ fontSize: "12px", color: "#c62828", marginBottom: "12px" }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={busy} style={{ ...solidBtn, width: "100%", opacity: busy ? 0.7 : 1 }}>
            {busy ? "Please wait…" : (isSignIn ? "Sign in" : "Create account")}
          </button>

          {isSignIn && GOOGLE_CLIENT_ID && (
            <>
              <div style={{ fontSize: "11px", color: "#aaa", textAlign: "center", margin: "12px 0 8px" }}>or</div>
              <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center" }} />
            </>
          )}

          <div style={{ marginTop: "12px", fontSize: "12px", color: "#666" }}>
            {isSignIn ? "No account yet?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(isSignIn ? "signup" : "signin"); setError(""); }}
              style={{ border: "none", background: "none", color: "#1a1a1a", cursor: "pointer", fontWeight: 600, padding: 0 }}
            >
              {isSignIn ? "Create one" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE SCREEN ────────────────────────────────────────────────────────────
function ProfileScreen({ user, onUserUpdated, onBack, onSignOut }) {
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
    } catch (e) {
      setError(e.message || "Could not update account");
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
    } catch (e) {
      setError(e.message || "Could not delete account");
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
            <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>Email</div>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>Current password (only for changing password)</div>
            <input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>New password</div>
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }} />
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
            {history.map(item => (
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

// ─── SETUP SCREEN ──────────────────────────────────────────────────────────────
const DIFF_COLOR = { Easy: "#2e7d32", Medium: "#e65100", Hard: "#c62828" };

function SetupScreen({ onStart }) {
  const [topics, setTopics]       = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [step, setStep]           = useState(0);
  const [topic, setTopic]         = useState(null);
  const [char, setChar]           = useState(null);
  const [side, setSide]           = useState(null);
  const [tagFilter, setTagFilter] = useState("All");

  useEffect(() => {
    Promise.all([apiFetch("/topics"), apiFetch("/characters")])
      .then(([t, c]) => { setTopics(t); setCharacters(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const done     = [!!topic, !!char, !!side];
  const tags     = ["All", ...Array.from(new Set(topics.map(t => t.tag)))];
  const filtered = tagFilter === "All" ? topics : topics.filter(t => t.tag === tagFilter);

  if (loading) return <div style={{ ...pageWrap, color: "#999", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>Loading…</div>;

  return (
    <div style={pageWrap}>
      <div style={{ marginBottom: "40px" }}>
        <div style={eyebrow}>Debate Simulator</div>
        <h1 style={headline}>Configure your session</h1>
      </div>
      <div style={{ display: "flex", gap: 0, marginBottom: "24px", borderBottom: "1px solid #eee" }}>
        {["Topic", "Opponent", "Side"].map((l, i) => (
          <button key={i} onClick={() => setStep(i)} style={{ padding: "10px 20px", background: "none", border: "none", borderBottom: step === i ? "2px solid #1a1a1a" : "2px solid transparent", cursor: "pointer", fontSize: "13px", fontWeight: step === i ? 600 : 400, color: step === i ? "#1a1a1a" : done[i] ? "#555" : "#bbb", fontFamily: "'DM Sans', sans-serif", marginBottom: "-1px" }}>
            {done[i] ? "✓ " : ""}{l}
          </button>
        ))}
      </div>
      {step === 0 && (
        <>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
            {tags.map(t => <button key={t} onClick={() => setTagFilter(t)} style={{ padding: "4px 12px", fontSize: "11px", borderRadius: "20px", border: "1px solid", borderColor: tagFilter === t ? "#1a1a1a" : "#ddd", background: tagFilter === t ? "#1a1a1a" : "#fff", color: tagFilter === t ? "#fff" : "#666", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{t}</button>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
            {filtered.map(t => (
              <button key={t.id} onClick={() => { setTopic(t); setStep(1); }} style={{ ...cardBtn(topic?.id === t.id), padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.4, fontFamily: "'Playfair Display', serif", marginBottom: "3px" }}>{t.title}</div>
                    <div style={{ fontSize: "11px", opacity: 0.6 }}>{t.description}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
                    <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", opacity: 0.55, textTransform: "uppercase" }}>{t.tag}</div>
                    <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", fontWeight: 600, color: topic?.id === t.id ? "rgba(255,255,255,0.8)" : DIFF_COLOR[t.difficulty] }}>{t.difficulty}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {characters.map(c => (
            <button key={c.id} onClick={() => { setChar(c); setStep(2); }} style={cardBtn(char?.id === c.id)}>
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "24px", flexShrink: 0 }}>{c.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "2px", fontFamily: "'Playfair Display', serif" }}>{c.name}</div>
                  <div style={{ fontSize: "12px", opacity: 0.6, marginBottom: "6px" }}>{c.tagline}</div>
                  <div style={{ fontSize: "12px", opacity: char?.id === c.id ? 0.85 : 0.55, lineHeight: 1.5 }}>{c.description}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", flexShrink: 0 }}>
                  {Object.entries(c.settings).map(([k, v]) => <div key={k} style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", opacity: 0.5, whiteSpace: "nowrap" }}>{k}: {v}</div>)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {step === 2 && topic && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ padding: "12px 16px", background: "#f5f5f0", borderRadius: "8px" }}>
            <div style={{ ...eyebrowSmall, marginBottom: "4px" }}>Topic</div>
            <div style={{ fontSize: "14px", fontFamily: "'Playfair Display', serif", lineHeight: 1.4 }}>{topic.title}</div>
          </div>
          {["A", "B"].map(s => {
            const data = s === "A" ? topic.sideA : topic.sideB;
            return (
              <button key={s} onClick={() => setSide(s)} style={cardBtn(side === s)}>
                <div style={{ ...eyebrowSmall, marginBottom: "6px", color: side === s ? "rgba(255,255,255,0.55)" : undefined }}>Side {s} · {data.position}</div>
                {data.args.map((a, i) => <div key={i} style={{ fontSize: "13px", lineHeight: 1.6, opacity: side === s ? 0.9 : 0.7 }}>· {a}</div>)}
              </button>
            );
          })}
        </div>
      )}
      {done.every(Boolean) && (
        <button onClick={() => onStart({ topic, character: char, side, sessionId: `session-${Date.now()}` })} style={{ ...solidBtn, marginTop: "28px" }}>
          Begin Session →
        </button>
      )}
    </div>
  );
}

// ─── DEBATE SCREEN ─────────────────────────────────────────────────────────────
function DebateScreen({ config, onComplete }) {
  const { topic, character, side } = config;
  const [idx, setIdx]               = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerKey, setTimerKey]     = useState(0);
  const [userText, setUserText]     = useState("");
  const userTextRef                 = useRef("");  // always-current value for closures
  const stageNameRef                = useRef("");
  const [streamedText, setStreamedText] = useState("");
  const [streaming, setStreaming]   = useState(false);
  const [stageDone, setStageDone]   = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const transcriptRef               = useRef([]);
  const [safetyWarning, setSafetyWarning] = useState(null);
  const [showMicModal, setShowMicModal]   = useState(false);

  // ── Voice hook ──────────────────────────────────────────────────────────────
  // FIX: onAppend adds to existing text — never replaces it
  const { listening, supported, toggle: toggleMic, stop: stopMic, permError, permState } = useSpeechToText({
    onAppend: (newText) => {
      const updated = userTextRef.current + newText;
      setUserText(updated);
      userTextRef.current = updated;
    },
    onError: (msg) => console.warn("[Voice]", msg),
  });

  const stage   = FORMAT[idx];
  const isUser  = stage.role === "user";
  const isLast  = idx === FORMAT.length - 1;
  const sideData = side === "A" ? topic.sideA : topic.sideB;

  useEffect(() => { stageNameRef.current = stage.name; }, [stage.name]);

  const addToTranscript = useCallback((entry) => {
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript([...transcriptRef.current]);
  }, []);

  // ── Auto-submit on timer expire ─────────────────────────────────────────────
  // FIX: stopMic() is called so the mic doesn't keep running after stage ends
  const handleExpire = useCallback(() => {
    setTimerRunning(false);
    stopMic(); // always stop mic when stage ends
    if (isUser) {
      const captured = userTextRef.current.trim() || "(Time expired — no speech recorded)";
      addToTranscript({ stageName: stageNameRef.current, role: "user", text: captured });
      setUserText("");
      userTextRef.current = "";
      setAutoSubmitted(true);
      setStageDone(true);
    } else {
      setStageDone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUser, addToTranscript, stopMic]);

  // ── Start stage ─────────────────────────────────────────────────────────────
  const startStage = async () => {
    setAutoSubmitted(false);
    if (isUser) { setTimerRunning(true); return; }
    const lastUser = [...transcriptRef.current].reverse().find(t => t.role === "user")?.text || "";
    setStreamedText("");
    setStreaming(true);
    try {
      await streamOpponentSpeech(
        { characterId: character.id, topicId: topic.id, side, stageName: stage.name, userSpeech: lastUser },
        (token) => setStreamedText(prev => prev + token),
      );
    } catch (e) {
      const detail = e.data?.detail || e.data;
      if (detail?.safe === false) setSafetyWarning(detail.message);
      else setStreamedText(prev => prev || "There was an error generating a response. Please continue.");
    }
    setStreaming(false);
    setTimerRunning(true);
  };

  // ── Manual submit ────────────────────────────────────────────────────────────
  // FIX: stopMic() called before recording the text
  const submitUser = async () => {
    stopMic();
    if (userText.trim()) {
      try {
        const check = await apiFetch("/safety-check", { method: "POST", body: JSON.stringify({ text: userText }) });
        if (!check.safe) { setSafetyWarning(check.message); return; }
      } catch (_) {}
    }
    setTimerRunning(false);
    addToTranscript({ stageName: stage.name, role: "user", text: userText || "(No speech recorded)" });
    setUserText("");
    userTextRef.current = "";
    setStageDone(true);
  };

  const markHeard = () => {
    setTimerRunning(false);
    addToTranscript({ stageName: stage.name, role: "opponent", text: streamedText });
    setStreamedText("");
    setStageDone(true);
  };

  const next = () => {
    stopMic(); // FIX: ensure mic is off between stages
    if (isLast) { onComplete(transcriptRef.current); return; }
    setIdx(i => i + 1);
    setStageDone(false);
    setAutoSubmitted(false);
    setTimerRunning(false);
    setTimerKey(k => k + 1);
    setStreamedText("");
    setUserText("");
    userTextRef.current = "";
  };

  return (
    <div style={pageWrap}>
      {/* Mic permission modal */}
      {showMicModal && (
        <MicPermissionModal
          onAllow={() => { setShowMicModal(false); toggleMic(); }}
          onDismiss={() => setShowMicModal(false)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <div style={eyebrow}>vs {character.avatar} {character.name}</div>
          <div style={{ fontSize: "13px", color: "#555", maxWidth: "440px", lineHeight: 1.5, marginTop: "3px" }}>{topic.title}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...eyebrow, textAlign: "right" }}>Side {side}: {sideData.position}</div>
          <div style={{ fontSize: "11px", color: "#bbb", marginTop: "2px" }}>Stage {idx + 1}/{FORMAT.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
        {FORMAT.map((_, i) => <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i < idx ? "#1a1a1a" : i === idx ? "#888" : "#e8e8e8", transition: "background 0.3s" }} />)}
      </div>

      {safetyWarning && (
        <div style={{ padding: "14px 18px", background: "#fff8e6", border: "1px solid #ffe082", borderRadius: "8px", marginBottom: "16px" }}>
          <div style={{ ...eyebrowSmall, marginBottom: "4px", color: "#b8860b" }}>⚠ Content Notice</div>
          <div style={{ fontSize: "13px", color: "#7a5c00", lineHeight: 1.55 }}>{safetyWarning}</div>
          <button onClick={() => setSafetyWarning(null)} style={{ marginTop: "10px", padding: "6px 14px", background: "#fff", border: "1px solid #ddd", borderRadius: "5px", fontSize: "12px", cursor: "pointer" }}>Dismiss</button>
        </div>
      )}

      <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "22px 26px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>{stage.name}</h2>
            <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#777", lineHeight: 1.5 }}>{stage.description}</p>
          </div>
          <div style={{ marginLeft: "24px", minWidth: "106px" }}>
            <Timer key={timerKey} totalSeconds={stage.duration} isRunning={timerRunning} onExpire={handleExpire} />
          </div>
        </div>

        {/* User: not started */}
        {!stageDone && isUser && !timerRunning && (
          <button onClick={startStage} style={solidBtn}>Start Timer & Speak</button>
        )}

        {/* User: timer running — textarea + submit + mic */}
        {!stageDone && isUser && timerRunning && (
          <>
            <textarea
              value={userText}
              onChange={e => { setUserText(e.target.value); userTextRef.current = e.target.value; }}
              placeholder={listening ? "🎙 Listening — speak your argument…" : "Type your argument, or click Use Voice to speak…"}
              style={{
                width: "100%", minHeight: "110px", padding: "12px 14px",
                border: `1px solid ${listening ? "#c62828" : "#ddd"}`,
                borderRadius: "6px", fontSize: "14px", lineHeight: 1.65,
                resize: "vertical", fontFamily: "'DM Sans', sans-serif",
                background: listening ? "#fff8f8" : "#fff",
                marginBottom: "12px", boxSizing: "border-box",
                transition: "border-color 0.2s, background 0.2s",
              }}
            />
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
              <button onClick={submitUser} style={solidBtn}>Submit Speech</button>
              <MicButton listening={listening} supported={supported} toggle={toggleMic} permError={permError} permState={permState} onRequestPermission={() => setShowMicModal(true)} />
              {listening && (
                <span style={{ fontSize: "12px", color: "#c62828", fontFamily: "'DM Mono', monospace", paddingTop: "11px" }}>
                  ● LIVE
                </span>
              )}
            </div>
          </>
        )}

        {/* Auto-submit banner */}
        {stageDone && autoSubmitted && (
          <div style={{ padding: "10px 14px", background: "#fff3e0", border: "1px solid #ffe0b2", borderRadius: "6px", fontSize: "13px", color: "#e65100", marginBottom: "12px" }}>
            ⏱ Time expired — your speech was automatically submitted.
          </div>
        )}

        {/* Opponent: not started */}
        {!stageDone && !isUser && !streaming && !streamedText && (
          <button onClick={startStage} style={solidBtn}>Generate {character.name}'s Response</button>
        )}

        {/* Opponent: streaming */}
        {!stageDone && !isUser && (streaming || streamedText) && (
          <>
            <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "6px", padding: "14px 16px", marginBottom: "12px" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>{character.avatar} {character.name}</div>
              <div className={streaming ? "stream-cursor" : ""} style={{ fontSize: "14px", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                {streamedText}
              </div>
            </div>
            {!streaming && <button onClick={markHeard} style={{ ...solidBtn, background: "#555" }}>Mark as Heard</button>}
          </>
        )}

        {/* Stage complete */}
        {stageDone && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "#888" }}>Stage complete.</span>
            <button onClick={next} style={solidBtn}>{isLast ? "Get Coach Report →" : "Next Stage →"}</button>
          </div>
        )}
      </div>

      <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Watch out — {character.name} will flag:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {character.fallaciesDetected.slice(0, 5).map((f, i) => (
            <div key={i} style={{ fontSize: "11px", padding: "3px 10px", background: "#fff", border: "1px solid #e8e8e8", borderRadius: "20px", color: "#555" }}>{f}</div>
          ))}
        </div>
      </div>

      {transcript.length > 0 && (
        <div>
          <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Transcript</div>
          {transcript.map((e, i) => (
            <div key={i} style={{ padding: "9px 13px", marginBottom: "5px", borderLeft: `3px solid ${e.role === "user" ? "#1a1a1a" : "#ddd"}`, background: "#fafafa", borderRadius: "0 6px 6px 0" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "2px" }}>{e.stageName} · {e.role === "user" ? "YOU" : character.name.toUpperCase()}</div>
              <div style={{ fontSize: "13px", color: "#444", lineHeight: 1.6 }}>{e.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── REPORT SCREEN ─────────────────────────────────────────────────────────────
function ReportScreen({ config, transcript, onNew }) {
  const { topic, character, side, sessionId } = config;
  const [rubric, setRubric]           = useState(null);
  const [feedback, setFeedback]       = useState(null);
  const [drills, setDrills]           = useState([]);
  const [selectedDrill, setSelectedDrill] = useState(null);
  const [drillDone, setDrillDone]     = useState(false);
  const [fetchError, setFetchError]   = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);

  useEffect(() => {
    apiFetch("/drills").then(setDrills).catch(() => {});
    apiFetch("/coach-report", {
      method: "POST",
      body: JSON.stringify({ topicId: topic.id, characterId: character.id, side, transcript }),
    }).then(r => {
      setRubric(r.rubric);
      setFeedback(r.feedback);
      setSavedToProfile(!!r.savedToProfile);
      if (r.rubric?.breakdown) {
        const drillMap = { structure: "d10", argQuality: "d6", clash: "d9", impact: "d2", precision: "d1" };
        const weakestKey = Object.entries(r.rubric.breakdown).sort((a, b) => (a[1].score / a[1].max) - (b[1].score / b[1].max))[0]?.[0];
        apiFetch("/drills").then(d => {
          setDrills(d);
          setSelectedDrill(d.find(dr => dr.id === (drillMap[weakestKey] || "d1")) || d[0]);
        }).catch(() => {});
      }
    }).catch(() => setFetchError(true));
  }, []);

  const sideData   = side === "A" ? topic.sideA : topic.sideB;
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
          {[["STRENGTHS", feedback.strengths], ["GAPS", feedback.gaps], ["NEXT DRILL", feedback.nextDrill]].map(([label, content]) => content ? (
            <div key={label} style={{ padding: "16px 20px", background: feedbackBg[label] || "#f5f5f0", borderRadius: "8px" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>{label}</div>
              <div style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{content}</div>
            </div>
          ) : null)}
        </div>
      ) : !fetchError && <FeedbackSkeleton />}
      <div style={{ padding: "14px 18px", background: "#fafafa", border: "1px solid #eee", borderRadius: "8px", marginBottom: "20px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>{character.avatar} What convinces {character.name}</div>
        {character.convincedBy.map((c, i) => <div key={i} style={{ fontSize: "12px", color: "#555", marginBottom: "2px" }}>· {c}</div>)}
      </div>
      {!drillDone && selectedDrill && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Assigned Drill</div>
          <DrillPanel drill={selectedDrill} sessionId={sessionId} onComplete={() => setDrillDone(true)} />
        </div>
      )}
      {drillDone && (
        <div style={{ padding: "14px 18px", background: "#edf7ee", border: "1px solid #c8e6c9", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", color: "#2e7d32" }}>✓ Drill completed. Good work — bring this to your next session.</div>
        </div>
      )}
      {drills.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>All Drills</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {drills.map(d => (
              <button key={d.id} onClick={() => { setSelectedDrill(d); setDrillDone(false); window.scrollTo(0, document.body.scrollHeight); }} style={{ ...cardBtn(selectedDrill?.id === d.id), padding: "10px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: "11px", opacity: 0.6 }}>{d.description.slice(0, 70)}…</div>
                  </div>
                  <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", opacity: 0.5, marginLeft: "12px", flexShrink: 0 }}>{d.tag}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Full Transcript</div>
        {transcript.map((e, i) => (
          <div key={i} style={{ padding: "9px 13px", marginBottom: "5px", borderLeft: `3px solid ${e.role === "user" ? "#1a1a1a" : "#ddd"}`, background: "#fafafa", borderRadius: "0 6px 6px 0" }}>
            <div style={{ ...eyebrowSmall, marginBottom: "2px" }}>{e.stageName} · {e.role === "user" ? "YOU" : character.name.toUpperCase()}</div>
            <div style={{ fontSize: "13px", color: "#444", lineHeight: 1.6 }}>{e.text}</div>
          </div>
        ))}
      </div>
      <button onClick={onNew} style={solidBtn}>← Start New Session</button>
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const pageWrap    = { maxWidth: "700px", margin: "0 auto", padding: "44px 24px" };
const eyebrow     = { fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#999", fontFamily: "'DM Mono', monospace" };
const eyebrowSmall = { fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", fontFamily: "'DM Mono', monospace" };
const headline    = { fontSize: "2rem", fontWeight: 600, color: "#1a1a1a", margin: "8px 0 0", fontFamily: "'Playfair Display', Georgia, serif" };
const solidBtn    = { padding: "10px 22px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em" };
const cardBtn     = (active) => ({ padding: "16px 20px", background: active ? "#1a1a1a" : "#fafafa", color: active ? "#fff" : "#1a1a1a", border: `1px solid ${active ? "#1a1a1a" : "#e8e8e8"}`, borderRadius: "8px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%" });

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("clash");
  const [config, setConfig] = useState(null);
  const [transcript, setTranscript] = useState([]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    apiFetch("/auth/me")
      .then(r => setUser(r.user))
      .catch(() => {
        setAuthToken("");
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const finishSignOut = () => {
    setAuthToken("");
    setUser(null);
    setScreen("clash");
    setConfig(null);
    setTranscript([]);
  };

  const signOut = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (_) {}
    finishSignOut();
  };

  const handleAuth = ({ token, user: nextUser }) => {
    setAuthToken(token);
    setUser(nextUser);
    setScreen("clash");
    setConfig(null);
    setTranscript([]);
  };

  const baseStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=DM+Mono:wght@300;400&family=Playfair+Display:wght@400;600&display=swap');
    * { box-sizing: border-box; }
    textarea { outline: none !important; }
    textarea:focus { border-color: #1a1a1a !important; }
    input { outline: none !important; }
    input:focus { border-color: #1a1a1a !important; }
    button:hover { opacity: 0.82; transition: opacity 0.15s; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
    @keyframes shimmer    { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes blink      { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes mic-pulse  { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.6);opacity:0} }
    .stream-cursor::after { content:"▎"; animation:blink 1s infinite; margin-left:1px; font-size:.85em; color:#aaa; }
  `;

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'DM Sans', sans-serif", display: "grid", placeItems: "center", color: "#999", fontSize: "14px" }}>
        <style>{baseStyles}</style>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
        <style>{baseStyles}</style>
        <AuthScreen onAuth={handleAuth} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{baseStyles}</style>

      <div style={{ borderBottom: "1px solid #eee", background: "#fff", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "12px", color: "#666" }}>
            Signed in as <span style={{ fontWeight: 600 }}>{user.name}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setScreen("clash")} style={{ ...solidBtn, padding: "7px 12px", fontSize: "11px", background: screen === "clash" ? "#1a1a1a" : "#555" }}>Clash</button>
            <button onClick={() => setScreen("setup")} style={{ ...solidBtn, padding: "7px 12px", fontSize: "11px", background: screen === "setup" ? "#1a1a1a" : "#555" }}>Sessions</button>
            <button onClick={() => setScreen("profile")} style={{ ...solidBtn, padding: "7px 12px", fontSize: "11px", background: screen === "profile" ? "#1a1a1a" : "#555" }}>Profile</button>
            <button onClick={signOut} style={{ ...solidBtn, padding: "7px 12px", fontSize: "11px", background: "#8b0000" }}>Sign out</button>
          </div>
        </div>
      </div>

      {screen === "clash" && <ClashGame onFinish={() => setScreen("setup")} />}
      {screen === "setup" && <SetupScreen onStart={c => { setConfig(c); setScreen("debate"); }} />}
      {screen === "debate" && config && <DebateScreen config={config} onComplete={t => { setTranscript(t); setScreen("report"); }} />}
      {screen === "report" && config && <ReportScreen config={config} transcript={transcript} onNew={() => { setConfig(null); setTranscript([]); setScreen("clash"); }} />}
      {screen === "profile" && <ProfileScreen user={user} onUserUpdated={setUser} onBack={() => setScreen("clash")} onSignOut={finishSignOut} />}
    </div>
  );
}