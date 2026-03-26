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
