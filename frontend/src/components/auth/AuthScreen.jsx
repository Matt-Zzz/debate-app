import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";
import { eyebrow, headline, pageWrap, solidBtn } from "../../styles/ui";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

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
        width: 300,
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
    <div style={pageWrap}>
      <div style={{ maxWidth: "460px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <div style={eyebrow}>Debate Simulator</div>
          <h1 style={headline}>{isSignIn ? "Sign in" : "Create account"}</h1>
        </div>

        <div style={{ background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "18px 20px" }}>
          {!isSignIn && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
              />
            </div>
          )}

          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              onClick={() => {
                setMode(isSignIn ? "signup" : "signin");
                setError("");
              }}
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
