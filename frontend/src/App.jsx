import { useEffect, useState } from "react";
import AuthScreen from "./components/auth/AuthScreen";
import DebateScreen from "./components/debate/DebateScreen";
import ProfileScreen from "./components/profile/ProfileScreen";
import PvPScreen from "./components/pvp/PvPScreen";
import ReportScreen from "./components/report/ReportScreen";
import SetupScreen from "./components/setup/SetupScreen";
import TutorialPlacementScreen from "./components/tutorial/TutorialPlacementScreen";
import { apiFetch, getAuthToken, setAuthToken } from "./lib/api";
import { appSurface, baseStyles, loadingSurface, solidBtn } from "./styles/ui";

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("setup");
  const [config, setConfig] = useState(null);
  const [transcript, setTranscript] = useState([]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    apiFetch("/auth/me")
      .then((response) => setUser(response.user))
      .catch(() => {
        setAuthToken("");
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const finishSignOut = () => {
    setAuthToken("");
    setUser(null);
    setScreen("setup");
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
    setScreen("setup");
    setConfig(null);
    setTranscript([]);
  };

  if (authLoading) {
    return (
      <div style={loadingSurface}>
        <style>{baseStyles}</style>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={appSurface}>
        <style>{baseStyles}</style>
        <AuthScreen onAuth={handleAuth} />
      </div>
    );
  }

  if (!user.tutorialCompleted) {
    return (
      <div style={appSurface}>
        <style>{baseStyles}</style>
        <TutorialPlacementScreen onComplete={(nextUser) => { setUser(nextUser); setScreen("setup"); }} />
      </div>
    );
  }

  return (
    <div style={appSurface}>
      <style>{baseStyles}</style>

      <div style={{ borderBottom: "1px solid #eee", background: "#fff", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.6 }}>
            Signed in as <span style={{ fontWeight: 600 }}>{user.name}</span>
            <br />
            Level {user.currentLevel}: {user.levelName} · {user.totalXP} XP
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setScreen("pvp")} style={{ ...solidBtn, padding: "7px 12px", fontSize: "11px", background: screen === "pvp" ? "#1a1a1a" : "#555" }}>PvP</button>
            <button onClick={() => setScreen("setup")} style={{ ...solidBtn, padding: "7px 12px", fontSize: "11px", background: screen === "setup" ? "#1a1a1a" : "#555" }}>Sessions</button>
            <button onClick={() => setScreen("profile")} style={{ ...solidBtn, padding: "7px 12px", fontSize: "11px", background: screen === "profile" ? "#1a1a1a" : "#555" }}>Profile</button>
            <button onClick={signOut} style={{ ...solidBtn, padding: "7px 12px", fontSize: "11px", background: "#8b0000" }}>Sign out</button>
          </div>
        </div>
      </div>

      {screen === "pvp" && <PvPScreen user={user} onUserUpdated={setUser} />}
      {screen === "setup" && <SetupScreen user={user} onStart={(nextConfig) => { setConfig(nextConfig); setScreen("debate"); }} />}
      {screen === "debate" && config && <DebateScreen config={config} onComplete={(nextTranscript) => { setTranscript(nextTranscript); setScreen("report"); }} />}
      {screen === "report" && config && (
        <ReportScreen
          config={config}
          transcript={transcript}
          onNew={() => { setConfig(null); setTranscript([]); setScreen("setup"); }}
          onUserUpdated={setUser}
        />
      )}
      {screen === "profile" && <ProfileScreen user={user} onUserUpdated={setUser} onBack={() => setScreen("setup")} onSignOut={finishSignOut} />}
    </div>
  );
}
