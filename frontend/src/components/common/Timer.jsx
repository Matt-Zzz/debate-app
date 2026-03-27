import { useEffect, useRef, useState } from "react";

export default function Timer({ totalSeconds, isRunning, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const ref = useRef(null);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (isRunning) {
      ref.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(ref.current);
            onExpire();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [isRunning, onExpire]);

  const pct = (remaining / totalSeconds) * 100;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const low = remaining < 30 && remaining > 0;

  return (
    <div style={{ textAlign: "center", background: "#f8fafc", borderRadius: "20px", padding: "14px 12px", border: "1px solid rgba(99, 102, 241, 0.10)" }}>
      <div style={{ fontSize: "2.3rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: low ? "#dc2626" : "#111827", letterSpacing: "0.04em", transition: "color 0.3s" }}>
        {m}:{s.toString().padStart(2, "0")}
      </div>
      <div style={{ height: "6px", background: "#e5e7eb", borderRadius: "999px", marginTop: "10px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: low ? "#ef4444" : "linear-gradient(90deg, #4f46e5 0%, #8b5cf6 100%)", transition: "width 1s linear, background 0.3s" }} />
      </div>
    </div>
  );
}
