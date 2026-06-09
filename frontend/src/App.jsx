import { useEffect, useState } from "react";
import AuthScreen from "./components/auth/AuthScreen";
import BottomNav from "./components/common/BottomNav";
import CoachMode from "./components/coach/CoachMode";
import DebateScreen from "./components/debate/DebateScreen";
import HomeScreen from "./components/home/HomeScreen";
import ProfileScreen from "./components/profile/ProfileScreen";
import PvPScreen from "./components/pvp/PvPScreen";
import ReportScreen from "./components/report/ReportScreen";
import SetupScreen from "./components/setup/SetupScreen";
import TutorialPlacementScreen from "./components/tutorial/TutorialPlacementScreen";
import { apiFetch, getAuthToken, setAuthToken } from "./lib/api";
import { appSurface, baseStyles, loadingSurface } from "./styles/ui";

const NAV_SCREENS = ["home", "training", "coach", "pvp", "profile"];

function normalizeTrendingTopic(topic) {
  if (!topic || typeof topic !== "object") return null;

  const proArgs = Array.isArray(topic.proArguments)
    ? topic.proArguments.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const conArgs = Array.isArray(topic.conArguments)
    ? topic.conArguments.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return {
    id: String(topic.id || `trending-${Date.now()}`),
    title: String(topic.title || "Trending topic").trim() || "Trending topic",
    description: String(topic.classificationReason || topic.motionTitle || "").trim(),
    tag: String(topic.category || "Trending").trim() || "Trending",
    difficulty: String(topic.difficulty || "Medium").trim() || "Medium",
    sideA: {
      position: String(topic.proPosition || "Support").trim() || "Support",
      args: proArgs.length ? proArgs : ["Support this policy based on likely public benefits."],
    },
    sideB: {
      position: String(topic.conPosition || "Oppose").trim() || "Oppose",
      args: conArgs.length ? conArgs : ["Oppose this policy based on fairness and implementation risks."],
    },
  };
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("home");
  const [config, setConfig] = useState(null);
  const [trainingSeedTopic, setTrainingSeedTopic] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [reportSessionId, setReportSessionId] = useState(null);
  const [coachSeeds, setCoachSeeds] = useState([]);
  const [coachLaunchSeed, setCoachLaunchSeed] = useState(null);

  const resolvedCoachSeeds = coachLaunchSeed ? [coachLaunchSeed] : coachSeeds;

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

  const resetRoundState = () => {
    setConfig(null);
    setTrainingSeedTopic(null);
    setTranscript([]);
    setReportSessionId(null);
    setCoachSeeds([]);
    setCoachLaunchSeed(null);
  };

  const finishSignOut = () => {
    setAuthToken("");
    setUser(null);
    resetRoundState();
    setScreen("home");
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
    resetRoundState();
    setScreen("home");
  };

  const goCoach = (seeds = []) => {
    setCoachLaunchSeed(null);
    setCoachSeeds(seeds);
    setScreen("coach");
  };

  const handleNavigate = (target) => {
    if (typeof target === "string") {
      setTrainingSeedTopic(null);
      setScreen(target);
      return;
    }

    if (!target || typeof target !== "object") return;

    const nextScreen = typeof target.screen === "string" ? target.screen : "home";

    if (nextScreen === "training") {
      setTrainingSeedTopic(normalizeTrendingTopic(target.topic));
    } else {
      setTrainingSeedTopic(null);
    }

    setScreen(nextScreen);
  };

  const showBottomNav = NAV_SCREENS.includes(screen);

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
        <TutorialPlacementScreen
          onComplete={(nextUser) => {
            setUser(nextUser);
            setScreen("home");
          }}
        />
      </div>
    );
  }

  return (
    <div style={appSurface}>
      <style>{baseStyles}</style>

      {screen === "home" && (
        <HomeScreen user={user} onNavigate={handleNavigate} />
      )}

      {screen === "pvp" && (
        <PvPScreen user={user} onUserUpdated={setUser} />
      )}

      {screen === "training" && (
        <SetupScreen
          user={user}
          seedTopic={trainingSeedTopic}
          onStart={(nextConfig) => {
            setConfig(nextConfig);
            setTrainingSeedTopic(null);
            setTranscript([]);
            setReportSessionId(null);
            setScreen("debate");
          }}
        />
      )}

      {screen === "debate" && config && (
        <DebateScreen
          config={config}
          onComplete={({ sessionId, transcript: nextTranscript }) => {
            setReportSessionId(sessionId);
            setTranscript(Array.isArray(nextTranscript) ? nextTranscript : []);
            setScreen("report");
          }}
          onExit={() => {
            setConfig(null);
            setTranscript([]);
            setReportSessionId(null);
            setScreen("training");
          }}
        />
      )}

      {screen === "report" && config && (
        <ReportScreen
          config={config}
          sessionId={reportSessionId}
          transcript={transcript}
          onNew={() => {
            setConfig(null);
            setTrainingSeedTopic(null);
            setTranscript([]);
            setReportSessionId(null);
            setScreen("training");
          }}
          onCoach={goCoach}
          onUserUpdated={setUser}
        />
      )}

      {screen === "coach" && (
        <CoachMode
          user={user}
          onUserUpdated={setUser}
          initialSeeds={resolvedCoachSeeds}
          onExit={() => setScreen(config ? "report" : "home")}
        />
      )}

      {screen === "profile" && (
        <ProfileScreen
          user={user}
          onUserUpdated={setUser}
          onBack={() => setScreen("home")}
          onSignOut={signOut}
        />
      )}

      {showBottomNav && (
        <BottomNav screen={screen} onNavigate={handleNavigate} />
      )}
    </div>
  );
}