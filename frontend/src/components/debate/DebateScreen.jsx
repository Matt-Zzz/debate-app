import { useCallback, useEffect, useRef, useState } from "react";
import { FORMAT } from "../../constants/debate";
import useSpeechToText from "../../hooks/useSpeechToText";
import { apiFetch, streamOpponentSpeech } from "../../lib/api";
import { eyebrow, eyebrowSmall, pageWrap, solidBtn } from "../../styles/ui";
import Timer from "../common/Timer";

function MicPermissionModal({ onAllow, onDismiss }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "#fff", borderRadius: "12px", padding: "32px 28px", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: "48px", height: "48px", background: "#f5f5f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#1a1a1a">
            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
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

        <div style={{ padding: "10px 14px", background: "#f5f5f0", borderRadius: "8px", marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", color: "#999", fontFamily: "'DM Mono', monospace", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tip</div>
          <div style={{ fontSize: "12px", color: "#555", lineHeight: 1.5 }}>
            If no prompt appears, click the lock icon in your browser&apos;s address bar → Site settings → Microphone → Allow.
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onAllow} style={{ flex: 1, padding: "11px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "7px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Allow &amp; Start
          </button>
          <button onClick={onDismiss} style={{ padding: "11px 18px", background: "#fff", color: "#555", border: "1px solid #ddd", borderRadius: "7px", fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function MicButton({ listening, supported, toggle, permError, permState, onRequestPermission }) {
  if (!supported) {
    return (
      <div style={{ fontSize: "11px", color: "#999", fontFamily: "'DM Mono', monospace", padding: "10px 0" }}>
        Voice input requires Chrome or Edge.
      </div>
    );
  }

  if (permState === "denied") {
    return (
      <div style={{ fontSize: "12px", color: "#c62828", lineHeight: 1.5, maxWidth: "260px" }}>
        Microphone blocked. Click the lock icon in your address bar → Microphone → Allow, then reload.
      </div>
    );
  }

  const needsModal = !listening && permState !== "granted";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <button
        onClick={needsModal ? onRequestPermission : toggle}
        title={listening ? "Stop recording" : "Start voice input"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding: "10px 18px",
          background: listening ? "#c62828" : "#fff",
          color: listening ? "#fff" : "#1a1a1a",
          border: `1px solid ${listening ? "#c62828" : "#ddd"}`,
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.2s",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {listening && (
          <span style={{ position: "absolute", inset: 0, borderRadius: "6px", animation: "mic-pulse 1.4s ease-out infinite", background: "rgba(255,255,255,0.15)", pointerEvents: "none" }} />
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
        </svg>
        {listening ? "Stop Voice" : "Use Voice"}
      </button>
      {permError && (
        <div style={{ fontSize: "11px", color: "#c62828", maxWidth: "260px", lineHeight: 1.4 }}>{permError}</div>
      )}
    </div>
  );
}

export default function DebateScreen({ config, onComplete }) {
  const { topic, character, side } = config;
  const [idx, setIdx] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [userText, setUserText] = useState("");
  const userTextRef = useRef("");
  const stageNameRef = useRef("");
  const [streamedText, setStreamedText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [stageDone, setStageDone] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const transcriptRef = useRef([]);
  const [safetyWarning, setSafetyWarning] = useState(null);
  const [showMicModal, setShowMicModal] = useState(false);

  const { listening, supported, toggle: toggleMic, stop: stopMic, permError, permState } = useSpeechToText({
    onAppend: (newText) => {
      const updated = userTextRef.current + newText;
      setUserText(updated);
      userTextRef.current = updated;
    },
    onError: (msg) => console.warn("[Voice]", msg),
  });

  const stage = FORMAT[idx];
  const isUser = stage.role === "user";
  const isLast = idx === FORMAT.length - 1;
  const sideData = side === "A" ? topic.sideA : topic.sideB;

  useEffect(() => {
    stageNameRef.current = stage.name;
  }, [stage.name]);

  const addToTranscript = useCallback((entry) => {
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript([...transcriptRef.current]);
  }, []);

  const handleExpire = useCallback(() => {
    setTimerRunning(false);
    stopMic();
    if (isUser) {
      const captured = userTextRef.current.trim() || "(Time expired - no speech recorded)";
      addToTranscript({ stageName: stageNameRef.current, role: "user", text: captured });
      setUserText("");
      userTextRef.current = "";
      setAutoSubmitted(true);
      setStageDone(true);
    } else {
      setStageDone(true);
    }
  }, [addToTranscript, isUser, stopMic]);

  const startStage = async () => {
    setAutoSubmitted(false);
    if (isUser) {
      setTimerRunning(true);
      return;
    }

    const lastUser = [...transcriptRef.current].reverse().find((entry) => entry.role === "user")?.text || "";
    setStreamedText("");
    setStreaming(true);
    try {
      await streamOpponentSpeech(
        { characterId: character.id, topicId: topic.id, side, stageName: stage.name, userSpeech: lastUser },
        (token) => setStreamedText((prev) => prev + token),
      );
    } catch (err) {
      const detail = err.data?.detail || err.data;
      if (detail?.safe === false) setSafetyWarning(detail.message);
      else setStreamedText((prev) => prev || "There was an error generating a response. Please continue.");
    }
    setStreaming(false);
    setTimerRunning(true);
  };

  const submitUser = async () => {
    stopMic();
    if (userText.trim()) {
      try {
        const check = await apiFetch("/safety-check", { method: "POST", body: JSON.stringify({ text: userText }) });
        if (!check.safe) {
          setSafetyWarning(check.message);
          return;
        }
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
    stopMic();
    if (isLast) {
      onComplete(transcriptRef.current);
      return;
    }
    setIdx((prev) => prev + 1);
    setStageDone(false);
    setAutoSubmitted(false);
    setTimerRunning(false);
    setTimerKey((prev) => prev + 1);
    setStreamedText("");
    setUserText("");
    userTextRef.current = "";
  };

  return (
    <div style={pageWrap}>
      {showMicModal && (
        <MicPermissionModal
          onAllow={() => {
            setShowMicModal(false);
            toggleMic();
          }}
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
        {FORMAT.map((_, index) => (
          <div key={index} style={{ flex: 1, height: "3px", borderRadius: "2px", background: index < idx ? "#1a1a1a" : index === idx ? "#888" : "#e8e8e8", transition: "background 0.3s" }} />
        ))}
      </div>

      {safetyWarning && (
        <div style={{ padding: "14px 18px", background: "#fff8e6", border: "1px solid #ffe082", borderRadius: "8px", marginBottom: "16px" }}>
          <div style={{ ...eyebrowSmall, marginBottom: "4px", color: "#b8860b" }}>Content Notice</div>
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

        {!stageDone && isUser && !timerRunning && (
          <button onClick={startStage} style={solidBtn}>Start Timer & Speak</button>
        )}

        {!stageDone && isUser && timerRunning && (
          <>
            <textarea
              value={userText}
              onChange={(e) => {
                setUserText(e.target.value);
                userTextRef.current = e.target.value;
              }}
              placeholder={listening ? "Listening - speak your argument…" : "Type your argument, or click Use Voice to speak…"}
              style={{
                width: "100%",
                minHeight: "110px",
                padding: "12px 14px",
                border: `1px solid ${listening ? "#c62828" : "#ddd"}`,
                borderRadius: "6px",
                fontSize: "14px",
                lineHeight: 1.65,
                resize: "vertical",
                fontFamily: "'DM Sans', sans-serif",
                background: listening ? "#fff8f8" : "#fff",
                marginBottom: "12px",
                boxSizing: "border-box",
                transition: "border-color 0.2s, background 0.2s",
              }}
            />
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
              <button onClick={submitUser} style={solidBtn}>Submit Speech</button>
              <MicButton listening={listening} supported={supported} toggle={toggleMic} permError={permError} permState={permState} onRequestPermission={() => setShowMicModal(true)} />
              {listening && (
                <span style={{ fontSize: "12px", color: "#c62828", fontFamily: "'DM Mono', monospace", paddingTop: "11px" }}>
                  LIVE
                </span>
              )}
            </div>
          </>
        )}

        {stageDone && autoSubmitted && (
          <div style={{ padding: "10px 14px", background: "#fff3e0", border: "1px solid #ffe0b2", borderRadius: "6px", fontSize: "13px", color: "#e65100", marginBottom: "12px" }}>
            Time expired - your speech was automatically submitted.
          </div>
        )}

        {!stageDone && !isUser && !streaming && !streamedText && (
          <button onClick={startStage} style={solidBtn}>Generate {character.name}&apos;s Response</button>
        )}

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

        {stageDone && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "#888" }}>Stage complete.</span>
            <button onClick={next} style={solidBtn}>{isLast ? "Get Coach Report →" : "Next Stage →"}</button>
          </div>
        )}
      </div>

      <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Watch out - {character.name} will flag:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {character.fallaciesDetected.slice(0, 5).map((fallacy, index) => (
            <div key={index} style={{ fontSize: "11px", padding: "3px 10px", background: "#fff", border: "1px solid #e8e8e8", borderRadius: "20px", color: "#555" }}>{fallacy}</div>
          ))}
        </div>
      </div>

      {transcript.length > 0 && (
        <div>
          <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Transcript</div>
          {transcript.map((entry, index) => (
            <div key={index} style={{ padding: "9px 13px", marginBottom: "5px", borderLeft: `3px solid ${entry.role === "user" ? "#1a1a1a" : "#ddd"}`, background: "#fafafa", borderRadius: "0 6px 6px 0" }}>
              <div style={{ ...eyebrowSmall, marginBottom: "2px" }}>{entry.stageName} · {entry.role === "user" ? "YOU" : character.name.toUpperCase()}</div>
              <div style={{ fontSize: "13px", color: "#444", lineHeight: 1.6 }}>{entry.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
