import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";
import {
  eyebrow,
  heroCard,
  inputStyle,
  pageWrap,
  secondaryBtn,
  sectionCard,
  solidBtn,
  subheadline,
} from "../../styles/ui";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const featureCards = [
  { title: "Placement" },
  { title: "Training XP" },
  { title: "PvP" },
];

export default function AuthScreen({ onAuth }) {
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
          } catch (err) {
            setError(err.message || "Google sign-in failed");
          } finally {
            setBusy(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 320,
        text: "signin_with",
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [isSignIn, onAuth]);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = isSignIn ? { email, password } : { name, email, password };
      const auth = await apiFetch(isSignIn ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onAuth(auth);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...pageWrap, minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <div style={{ width: "100%", display: "grid", gap: "14px", maxWidth: "560px", margin: "0 auto" }}>
        <div style={heroCard}>
          <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>DebateHub</div>
          <h1 style={{ margin: "8px 0 6px", fontSize: "clamp(1.9rem, 8vw, 2.9rem)", lineHeight: 1, fontFamily: "'Fraunces', serif" }}>
            Train debate fast.
          </h1>
          <p style={{ ...subheadline, color: "rgba(255,255,255,0.86)", marginTop: "8px" }}>
            Practice, level up, and queue PvP.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "8px", marginTop: "14px" }}>
            {featureCards.map((item) => (
              <div
                key={item.title}
                style={{
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: "14px",
                  padding: "10px 8px",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 800, textAlign: "center" }}>{item.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...sectionCard, padding: "18px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <div style={eyebrow}>{isSignIn ? "Welcome Back" : "Create Account"}</div>
              <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "6px", color: "#111827" }}>
                {isSignIn ? "Sign in to continue" : "Start your debate path"}
              </div>
            </div>
            <button
              onClick={() => {
                setMode(isSignIn ? "signup" : "signin");
                setError("");
              }}
              style={secondaryBtn}
            >
              {isSignIn ? "Create account" : "Sign in"}
            </button>
          </div>

          {!isSignIn && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ ...eyebrow, marginBottom: "6px" }}>Name</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your display name" style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom: "12px" }}>
            <div style={{ ...eyebrow, marginBottom: "6px" }}>Email</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" style={inputStyle} />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <div style={{ ...eyebrow, marginBottom: "6px" }}>Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignIn ? "Your password" : "At least 8 characters"}
              type="password"
              style={inputStyle}
            />
          </div>

          {error && <div style={{ fontSize: "12px", color: "#dc2626", marginBottom: "12px" }}>{error}</div>}

          <button onClick={submit} disabled={busy} style={{ ...solidBtn, width: "100%", opacity: busy ? 0.72 : 1 }}>
            {busy ? "Please wait…" : isSignIn ? "Sign in" : "Create account"}
          </button>

          {isSignIn && GOOGLE_CLIENT_ID && (
            <>
              <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", margin: "14px 0 10px" }}>or continue with</div>
              <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center" }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
