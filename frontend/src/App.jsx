import { useEffect, useState } from "react";
import AuthScreen from "./components/auth/AuthScreen";
import BottomNav from "./components/common/BottomNav";
import DebateScreen from "./components/debate/DebateScreen";
import ProfileScreen from "./components/profile/ProfileScreen";
import PvPScreen from "./components/pvp/PvPScreen";
import ReportScreen from "./components/report/ReportScreen";
import SetupScreen from "./components/setup/SetupScreen";
import TutorialPlacementScreen from "./components/tutorial/TutorialPlacementScreen";
import { apiFetch, getAuthToken, setAuthToken } from "./lib/api";
import { appSurface, baseStyles, loadingSurface } from "./styles/ui";

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

  const showBottomNav = screen === "setup" || screen === "pvp" || screen === "profile";

  return (
    <div style={appSurface}>
      <style>{baseStyles}</style>

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
      {screen === "profile" && <ProfileScreen user={user} onUserUpdated={setUser} onBack={() => setScreen("setup")} onSignOut={signOut} />}
      {showBottomNav && <BottomNav screen={screen} onNavigate={setScreen} />}
    </div>
  );
}
