import { useCallback, useEffect, useRef, useState } from "react";

const MIC_ERRORS = {
  "not-allowed": "Microphone access was denied. Click the lock icon in your browser's address bar, allow microphone, then try again.",
  "audio-capture": "No microphone was found. Connect a microphone and try again.",
  "network": "A network error prevented speech recognition. Check your connection and try again.",
};

async function getMicPermissionState() {
  try {
    const result = await navigator.permissions.query({ name: "microphone" });
    return result.state;
  } catch (_) {
    return "unknown";
  }
}

export default function useSpeechToText({ onAppend, onError }) {
  const recognitionRef = useRef(null);
  const restartRef = useRef(false);
  const committedRef = useRef("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permError, setPermError] = useState(null);
  const [permState, setPermState] = useState("unknown");

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    getMicPermissionState().then(setPermState);

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setListening(true);
      setPermError(null);
      setPermState("granted");
    };

    recognition.onresult = (event) => {
      let newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) newFinal += `${event.results[i][0].transcript} `;
      }
      if (newFinal) {
        committedRef.current += newFinal;
        onAppend(newFinal);
      }
    };

    recognition.onerror = (event) => {
      console.error("[SpeechRecognition] error:", event.error);
      const msg = MIC_ERRORS[event.error];
      if (!msg) return;
      setPermError(msg);
      setPermState((prev) => (event.error === "not-allowed" ? "denied" : prev));
      restartRef.current = false;
      setListening(false);
      if (onError) onError(msg);
    };

    recognition.onend = () => {
      if (restartRef.current) {
        try {
          recognition.start();
        } catch (_) {}
      } else {
        setListening(false);
        committedRef.current = "";
      }
    };

    recognitionRef.current = recognition;
    return () => {
      restartRef.current = false;
      recognition.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || listening) return;
    committedRef.current = "";
    restartRef.current = true;
    setPermError(null);
    try {
      recognition.start();
    } catch (error) {
      console.error("[SpeechRecognition] start failed:", error);
    }
  }, [listening]);

  const stop = useCallback(() => {
    restartRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { listening, supported, toggle, stop, permError, permState };
}
