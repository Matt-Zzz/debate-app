// profile screen component

import { Bell, ChevronRight, History, LogOut, Settings, Swords, Target, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch, setAuthToken } from "../../lib/api";
import LevelBadge from "../common/LevelBadge";
import XPProgressBar from "../common/XPProgressBar";
import DifficultyChip from "../common/DifficultyChip";
import {
  eyebrow,
  eyebrowSmall,
  heroCard,
  inputStyle,
  pageWrap,
  sectionCard,
  secondaryBtn,
  solidBtn,
  textareaStyle,
} from "../../styles/ui";

const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const PROFILE_UI_PREFS_KEY = "debate-profile-ui-prefs";
const DEFAULT_NOTIFICATION_PREFS = {
  matchUpdates: true,
  trainingReminders: true,
  weeklyProgress: false,
};
const DEFAULT_APP_PREFS = {
  showLocationOnCard: true,
  showHeadlineOnCard: true,
  compactHistory: false,
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not process image"));
    image.src = src;
  });
}

async function fileToProfileImage(file) {
  if (!file) {
    throw new Error("No image selected");
  }

  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Use a PNG, JPEG, WEBP, or GIF image");
  }

  if (file.size > 8_000_000) {
    throw new Error("Image must be smaller than 8 MB");
  }

  if (file.type === "image/gif") {
    const gifUrl = await readFileAsDataUrl(file);
    if (gifUrl.length > 2_000_000) {
      throw new Error("GIF is too large. Use a smaller image.");
    }
    return gifUrl;
  }

  const sourceUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceUrl);
  const width = image.naturalWidth || image.width || 1;
  const height = image.naturalHeight || image.height || 1;
  const scale = Math.min(1, 512 / Math.max(width, height));
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not process image");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let output = canvas.toDataURL("image/webp", 0.86);
  if (output.length > 2_000_000) {
    output = canvas.toDataURL("image/jpeg", 0.82);
  }
  if (output.length > 2_000_000) {
    throw new Error("Image is too large after compression. Try a smaller one.");
  }

  return output;
}

function initialsForName(name) {
  return (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "DU";
}

function mergePrefs(defaults, stored) {
  if (!stored || typeof stored !== "object") {
    return defaults;
  }
  return { ...defaults, ...stored };
}

function statusLabel(status) {
  if (status === "matched") {
    return { text: "Ready", bg: "#dcfce7", color: "#166534" };
  }
  if (status === "completed") {
    return { text: "Completed", bg: "#eef2ff", color: "#4338ca" };
  }
  return { text: "Searching", bg: "#fef3c7", color: "#a16207" };
}

function buildSkillBreakdown(history) {
  const totals = {};

  history.forEach((item) => {
    const breakdown = item.rubric?.breakdown || {};
    Object.entries(breakdown).forEach(([key, category]) => {
      if (!totals[key]) {
        totals[key] = {
          key,
          label: category.label || key,
          totalScore: 0,
          totalMax: 0,
          count: 0,
        };
      }
      totals[key].totalScore += Number(category.score || 0);
      totals[key].totalMax += Number(category.max || 0);
      totals[key].count += 1;
    });
  });

  return Object.values(totals)
    .map((item) => ({
      ...item,
      averageScore: item.count ? item.totalScore / item.count : 0,
      averageMax: item.count ? item.totalMax / item.count : 0,
      percentage: item.totalMax ? Math.round((item.totalScore / item.totalMax) * 100) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

function MetricCard({ label, value, tint }) {
  return (
    <div
      style={{
        background: tint,
        borderRadius: "18px",
        padding: "14px",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      <div style={{ ...eyebrowSmall, color: "rgba(255,255,255,0.72)" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#fff", marginTop: "8px" }}>{value}</div>
    </div>
  );
}

function EntryRow({ icon: Icon, title, detail, onClick, active = false, danger = false, last = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        border: "none",
        background: active ? "rgba(79,70,229,0.06)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        padding: "18px 20px",
        cursor: "pointer",
        borderBottom: last ? "none" : "1px solid rgba(148,163,184,0.14)",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "16px",
            display: "grid",
            placeItems: "center",
            background: danger ? "rgba(220,38,38,0.08)" : active ? "rgba(79,70,229,0.12)" : "#f8fafc",
            color: danger ? "#dc2626" : active ? "#4338ca" : "#475467",
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "17px", fontWeight: 800, color: danger ? "#b42318" : "#111827" }}>{title}</div>
          <div style={{ fontSize: "13px", color: "#667085", marginTop: "4px", lineHeight: 1.5 }}>{detail}</div>
        </div>
      </div>
      <ChevronRight size={18} color={danger ? "#dc2626" : active ? "#4338ca" : "#98a2b3"} />
    </button>
  );
}

function DetailPanel({ section, title, detail, children }) {
  return (
    <div style={{ ...sectionCard, padding: "22px", marginBottom: "16px" }}>
      <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>{section}</div>
      <div style={{ fontSize: "26px", lineHeight: 1.1, fontWeight: 800, color: "#111827", fontFamily: "'Fraunces', serif" }}>{title}</div>
      {detail && <div style={{ fontSize: "13px", lineHeight: 1.7, color: "#667085", marginTop: "8px", marginBottom: "16px" }}>{detail}</div>}
      {children}
    </div>
  );
}

function ToggleRow({ title, detail, checked, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: "100%",
        border: "1px solid rgba(148,163,184,0.14)",
        background: "#f8fafc",
        borderRadius: "18px",
        padding: "15px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div>
        <div style={{ fontSize: "15px", fontWeight: 800, color: "#111827" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "#667085", lineHeight: 1.6, marginTop: "4px" }}>{detail}</div>
      </div>
      <div
        style={{
          width: "48px",
          height: "28px",
          borderRadius: "999px",
          background: checked ? "#4f46e5" : "#d0d5dd",
          position: "relative",
          flexShrink: 0,
          transition: "background 0.18s ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "3px",
            left: checked ? "23px" : "3px",
            width: "22px",
            height: "22px",
            borderRadius: "999px",
            background: "#fff",
            boxShadow: "0 4px 10px rgba(15,23,42,0.14)",
            transition: "left 0.18s ease",
          }}
        />
      </div>
    </button>
  );
}

export default function ProfileScreen({ user, onUserUpdated, onBack, onSignOut }) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImageUrl || "");
  const [location, setLocation] = useState(user.location || "");
  const [headline, setHeadline] = useState(user.headline || "");
  const [bio, setBio] = useState(user.bio || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [history, setHistory] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [avatarActionsOpen, setAvatarActionsOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);
  const [appPrefs, setAppPrefs] = useState(DEFAULT_APP_PREFS);
  const imageInputRef = useRef(null);

  useEffect(() => {
    setName(user.name || "");
    setEmail(user.email || "");
    setProfileImageUrl(user.profileImageUrl || "");
    setLocation(user.location || "");
    setHeadline(user.headline || "");
    setBio(user.bio || "");
  }, [user]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [profileImageUrl]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_UI_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setNotificationPrefs(mergePrefs(DEFAULT_NOTIFICATION_PREFS, parsed.notifications));
      setAppPrefs(mergePrefs(DEFAULT_APP_PREFS, parsed.app));
    } catch {
      setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS);
      setAppPrefs(DEFAULT_APP_PREFS);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        PROFILE_UI_PREFS_KEY,
        JSON.stringify({
          notifications: notificationPrefs,
          app: appPrefs,
        }),
      );
    } catch {
      // Ignore storage errors on constrained browsers.
    }
  }, [notificationPrefs, appPrefs]);

  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    setLoadingMatches(true);

    Promise.all([apiFetch("/profile/history").catch(() => []), apiFetch("/pvp/sessions").catch(() => [])])
      .then(([nextHistory, nextMatches]) => {
        if (!active) return;
        setHistory(Array.isArray(nextHistory) ? nextHistory : []);
        setMatches(Array.isArray(nextMatches) ? nextMatches : []);
      })
      .finally(() => {
        if (!active) return;
        setLoadingHistory(false);
        setLoadingMatches(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const body = {};
      const nextName = name.trim();
      const nextEmail = email.trim().toLowerCase();
      const nextProfileImageUrl = profileImageUrl.trim();
      const nextLocation = location.trim();
      const nextHeadline = headline.trim();
      const nextBio = bio.trim();

      if (nextName && nextName !== user.name) body.name = nextName;
      if (nextEmail && nextEmail !== user.email.toLowerCase()) body.email = nextEmail;
      if (nextProfileImageUrl !== (user.profileImageUrl || "")) body.profileImageUrl = nextProfileImageUrl;
      if (nextLocation !== (user.location || "")) body.location = nextLocation;
      if (nextHeadline !== (user.headline || "")) body.headline = nextHeadline;
      if (nextBio !== (user.bio || "")) body.bio = nextBio;

      if (Object.keys(body).length === 0) {
        setProfileMessage("No profile changes.");
        return;
      }

      const res = await apiFetch("/auth/me", { method: "PUT", body: JSON.stringify(body) });
      onUserUpdated(res.user);
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileError(err.message || "Could not update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    setPasswordSaving(true);
    setPasswordMessage("");
    setPasswordError("");
    try {
      if (!newPassword.trim()) {
        setPasswordMessage("No password changes.");
        return;
      }

      await apiFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password updated.");
    } catch (err) {
      setPasswordError(err.message || "Could not update password");
    } finally {
      setPasswordSaving(false);
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
    } catch (err) {
      setProfileError(err.message || "Could not delete account");
    }
  };

  const openImagePicker = () => {
    if (imageLoading || avatarSaving) return;
    imageInputRef.current?.click();
  };

  const openAvatarActions = () => {
    if (imageLoading || avatarSaving) return;
    setAvatarActionsOpen(true);
  };

  const closeAvatarActions = () => {
    if (avatarSaving) return;
    setAvatarActionsOpen(false);
  };

  const saveAvatar = async () => {
    setAvatarSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const nextProfileImageUrl = profileImageUrl.trim();
      if (nextProfileImageUrl === (user.profileImageUrl || "")) {
        setProfileMessage("Avatar is already saved.");
        setAvatarActionsOpen(false);
        return;
      }

      const res = await apiFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ profileImageUrl: nextProfileImageUrl }),
      });
      onUserUpdated(res.user);
      setAvatarBroken(false);
      setProfileMessage("Avatar saved.");
      setAvatarActionsOpen(false);
    } catch (err) {
      setProfileError(err.message || "Could not save avatar");
    } finally {
      setAvatarSaving(false);
    }
  };

  const deleteAvatar = async () => {
    setAvatarSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const hasAvatar = Boolean(profileImageUrl.trim() || user.profileImageUrl || "");
      if (!hasAvatar) {
        setProfileMessage("No avatar to delete.");
        setAvatarActionsOpen(false);
        return;
      }

      const res = await apiFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ profileImageUrl: "" }),
      });
      setProfileImageUrl("");
      setAvatarBroken(false);
      onUserUpdated(res.user);
      setProfileMessage("Avatar deleted.");
      setAvatarActionsOpen(false);
    } catch (err) {
      setProfileError(err.message || "Could not delete avatar");
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImageLoading(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const nextImage = await fileToProfileImage(file);
      setProfileImageUrl(nextImage);
      setAvatarBroken(false);
      setProfileMessage("Profile image selected. Save profile to persist it.");
      setAvatarActionsOpen(true);
    } catch (err) {
      setProfileError(err.message || "Could not process image");
    } finally {
      setImageLoading(false);
    }
  };

  const handleSignOut = () => {
    onSignOut();
  };

  const toggleNotification = (key) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAppPref = (key) => {
    setAppPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const avatarSrc = profileImageUrl.trim();
  const rawLocationLabel = location.trim() || user.location || "";
  const rawHeadlineLabel = headline.trim() || user.headline || "";
  const locationLabel = appPrefs.showLocationOnCard ? rawLocationLabel : "";
  const headlineLabel = appPrefs.showHeadlineOnCard ? rawHeadlineLabel : "";
  const showAvatarImage = avatarSrc && !avatarBroken;
  const avatarLabel = initialsForName(name.trim() || user.name);
  const avatarChanged = avatarSrc !== (user.profileImageUrl || "");
  const hasAvatar = Boolean(avatarSrc || user.profileImageUrl || "");
  const completedMatches = matches.filter((session) => session.status === "completed");
  const pvpWins = completedMatches.filter((session) => session.winnerId === user.id).length;
  const skillBreakdown = buildSkillBreakdown(history);
  const strongestSkill = skillBreakdown[0] || null;
  const weakestSkill = skillBreakdown[skillBreakdown.length - 1] || null;
  const averageTrainingScore = history.length
    ? Math.round(history.reduce((sum, item) => sum + Number(item.rubric?.total || 0), 0) / history.length)
    : 0;
  const enabledNotifications = Object.values(notificationPrefs).filter(Boolean).length;

  const renderActivePanel = () => {
    if (activePanel === "training-history") {
      return (
        <DetailPanel
          section="Stats"
          title="Training History"
          detail={`${history.length} saved training session${history.length === 1 ? "" : "s"} with an average rubric score of ${averageTrainingScore}.`}
        >
          {loadingHistory && <div style={{ color: "#667085", fontSize: "13px" }}>Loading history…</div>}
          {!loadingHistory && history.length === 0 && <div style={{ color: "#667085", fontSize: "13px" }}>No training runs saved yet.</div>}
          {!loadingHistory && history.length > 0 && (
            <div style={{ display: "grid", gap: "12px" }}>
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid rgba(148,163,184,0.14)",
                    borderRadius: "20px",
                    padding: appPrefs.compactHistory ? "14px 16px" : "18px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'Fraunces', serif", color: "#111827" }}>{item.topicTitle}</div>
                      <div style={{ fontSize: "12px", color: "#667085", marginTop: "5px", lineHeight: 1.6 }}>
                        {item.characterName} · Side {item.side} · {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "12px",
                        background: "#eef2ff",
                        color: "#4338ca",
                        fontSize: "12px",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        height: "fit-content",
                      }}
                    >
                      {item.rubric?.total ?? 0}/100
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                    {item.topicDifficulty && <DifficultyChip difficulty={item.topicDifficulty} size="sm" />}
                    {item.topicTag && (
                      <div style={{ padding: "7px 11px", borderRadius: "999px", background: "#ecfeff", color: "#0f766e", fontSize: "11px", fontWeight: 700 }}>
                        {item.topicTag}
                      </div>
                    )}
                  </div>

                  <details>
                    <summary style={{ cursor: "pointer", fontSize: "12px", color: "#4338ca", fontWeight: 700 }}>View coach feedback</summary>
                    <textarea
                      readOnly
                      value={[
                        item.feedback?.strengths ? `STRENGTHS:\n${item.feedback.strengths}` : "",
                        item.feedback?.gaps ? `GAPS:\n${item.feedback.gaps}` : "",
                        item.feedback?.nextDrill ? `NEXT DRILL:\n${item.feedback.nextDrill}` : "",
                      ]
                        .filter(Boolean)
                        .join("\n\n")}
                      style={{ ...textareaStyle, marginTop: "10px", minHeight: "170px", background: "#fff" }}
                    />
                  </details>
                </div>
              ))}
            </div>
          )}
        </DetailPanel>
      );
    }

    if (activePanel === "match-history") {
      return (
        <DetailPanel
          section="Stats"
          title="Match History"
          detail={
            user.tutorialCompleted
              ? `${matches.length} PvP session${matches.length === 1 ? "" : "s"} tracked so far, with ${pvpWins} win${pvpWins === 1 ? "" : "s"}.`
              : "Complete tutorial placement to unlock PvP matchmaking and match history."
          }
        >
          {!user.tutorialCompleted && <div style={{ color: "#667085", fontSize: "13px" }}>PvP becomes available after tutorial placement.</div>}
          {user.tutorialCompleted && loadingMatches && <div style={{ color: "#667085", fontSize: "13px" }}>Loading match history…</div>}
          {user.tutorialCompleted && !loadingMatches && matches.length === 0 && <div style={{ color: "#667085", fontSize: "13px" }}>No matches yet.</div>}
          {user.tutorialCompleted && !loadingMatches && matches.length > 0 && (
            <div style={{ display: "grid", gap: "12px" }}>
              {matches.map((session) => {
                const mySide = session.player1Id === user.id ? session.player1Side : session.player2Side;
                const opponent = session.player1Id === user.id ? session.player2Name : session.player1Name;
                const status = statusLabel(session.status);
                const outcome =
                  session.status !== "completed"
                    ? status.text
                    : session.winnerId === null || session.winnerId === undefined
                      ? "Draw"
                      : session.winnerId === user.id
                        ? "Win"
                        : "Loss";

                return (
                  <div key={session.id} style={{ background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)", borderRadius: "20px", padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                      <div>
                        <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'Fraunces', serif", color: "#111827" }}>{session.topicTitle || "Waiting for opponent…"}</div>
                        <div style={{ fontSize: "12px", color: "#667085", marginTop: "5px", lineHeight: 1.6 }}>
                          Opponent: {opponent || "Searching…"} · Side {mySide || "Pending"} · {new Date(session.updatedAt || session.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <div style={{ padding: "7px 11px", borderRadius: "999px", background: status.bg, color: status.color, fontSize: "11px", fontWeight: 700 }}>
                          {status.text}
                        </div>
                        <div style={{ padding: "7px 11px", borderRadius: "999px", background: outcome === "Win" ? "#dcfce7" : outcome === "Loss" ? "#fee2e2" : "#eef2ff", color: outcome === "Win" ? "#166534" : outcome === "Loss" ? "#b42318" : "#4338ca", fontSize: "11px", fontWeight: 700 }}>
                          {outcome}
                        </div>
                        {session.topicDifficulty && <DifficultyChip difficulty={session.topicDifficulty} size="sm" />}
                      </div>
                    </div>

                    {session.scores && (
                      <div style={{ fontSize: "13px", color: "#475467", lineHeight: 1.7, marginBottom: session.result?.notes ? "8px" : 0 }}>
                        Score: {session.scores.player1} - {session.scores.player2}
                      </div>
                    )}

                    {session.result?.notes && (
                      <div style={{ fontSize: "13px", color: "#667085", lineHeight: 1.7 }}>
                        Notes: {session.result.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DetailPanel>
      );
    }

    if (activePanel === "skill-breakdown") {
      return (
        <DetailPanel
          section="Stats"
          title="Skill Breakdown"
          detail={
            history.length
              ? `Average rubric view across ${history.length} training session${history.length === 1 ? "" : "s"}.`
              : "Complete a training session to start building rubric trends."
          }
        >
          {history.length === 0 && <div style={{ color: "#667085", fontSize: "13px" }}>No training data yet.</div>}
          {history.length > 0 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                <div style={{ background: "#eef2ff", borderRadius: "18px", padding: "14px", border: "1px solid rgba(99,102,241,0.12)" }}>
                  <div style={eyebrowSmall}>Average Score</div>
                  <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "8px", color: "#111827" }}>{averageTrainingScore}</div>
                </div>
                <div style={{ background: "#ecfdf3", borderRadius: "18px", padding: "14px", border: "1px solid rgba(34,197,94,0.12)" }}>
                  <div style={eyebrowSmall}>Best Area</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, marginTop: "8px", color: "#111827" }}>{strongestSkill?.label || "No data"}</div>
                </div>
                <div style={{ background: "#fff7ed", borderRadius: "18px", padding: "14px", border: "1px solid rgba(249,115,22,0.12)" }}>
                  <div style={eyebrowSmall}>Focus Next</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, marginTop: "8px", color: "#111827" }}>{weakestSkill?.label || "No data"}</div>
                </div>
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                {skillBreakdown.map((item) => (
                  <div key={item.key} style={{ background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)", borderRadius: "20px", padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>{item.label}</div>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "#4338ca" }}>{item.percentage}%</div>
                    </div>
                    <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${item.percentage}%`,
                          height: "100%",
                          borderRadius: "999px",
                          background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: "12px", color: "#667085", marginTop: "8px", lineHeight: 1.6 }}>
                      Average {item.averageScore.toFixed(1)}/{item.averageMax.toFixed(1)} across {item.count} session{item.count === 1 ? "" : "s"}.
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DetailPanel>
      );
    }

    if (activePanel === "edit-profile") {
      return (
        <DetailPanel section="Account" title="Edit Profile" detail="Update your avatar, name, location, and profile details here.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px", alignItems: "start" }}>
            <div style={{ background: "#f8fafc", borderRadius: "20px", padding: "18px", border: "1px solid rgba(148,163,184,0.14)" }}>
              <button
                type="button"
                onClick={openAvatarActions}
                aria-label="Manage profile image"
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "999px",
                  overflow: "hidden",
                  background: "#e2e8f0",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "34px",
                  fontWeight: 800,
                  color: "#334155",
                  margin: "0 auto 14px",
                  border: "none",
                  cursor: imageLoading ? "progress" : "pointer",
                  padding: 0,
                }}
              >
                {showAvatarImage ? (
                  <img
                    src={avatarSrc}
                    alt={`${name || user.name} profile preview`}
                    onError={() => setAvatarBroken(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  avatarLabel
                )}
              </button>
              <div style={{ textAlign: "center", fontSize: "17px", fontWeight: 800, color: "#111827" }}>{name || user.name}</div>
              <div style={{ textAlign: "center", fontSize: "12px", color: "#667085", marginTop: "6px", lineHeight: 1.6 }}>
                {rawHeadlineLabel || "Add a short headline"}
              </div>
              <div style={{ textAlign: "center", fontSize: "12px", color: "#667085", marginTop: "4px", lineHeight: 1.6 }}>
                {rawLocationLabel || "Set your location"}
              </div>
              <div style={{ textAlign: "center", fontSize: "12px", color: "#667085", marginTop: "12px", lineHeight: 1.6 }}>
                Click the avatar to change, save, or delete it.
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Name</div>
                  <input value={name} onChange={(event) => setName(event.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Email</div>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" style={inputStyle} />
                </div>
              </div>

              <div>
                <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Profile image URL</div>
                <input
                  value={profileImageUrl}
                  onChange={(event) => setProfileImageUrl(event.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Location</div>
                  <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Vancouver, BC" style={inputStyle} />
                </div>
                <div>
                  <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Headline</div>
                  <input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Varsity debater building clash reps" style={inputStyle} />
                </div>
              </div>

              <div>
                <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Bio</div>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Add a short bio, goals, school, or the debate skills you want to improve."
                  style={{ ...textareaStyle, minHeight: "120px" }}
                />
              </div>

              {(profileMessage || profileError) && (
                <div style={{ fontSize: "12px", color: profileError ? "#dc2626" : "#16a34a" }}>{profileError || profileMessage}</div>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={saveProfile} disabled={profileSaving} style={{ ...solidBtn, opacity: profileSaving ? 0.7 : 1 }}>
                  {profileSaving ? "Saving…" : "Save profile"}
                </button>
                <button onClick={openAvatarActions} style={secondaryBtn}>
                  Manage avatar
                </button>
              </div>
            </div>
          </div>
        </DetailPanel>
      );
    }

    if (activePanel === "notifications") {
      return (
        <DetailPanel section="Account" title="Notifications" detail="These notification preferences are saved on this device.">
          <div style={{ display: "grid", gap: "10px" }}>
            <ToggleRow
              title="Match updates"
              detail="Keep alerts ready for matchmaking and result updates."
              checked={notificationPrefs.matchUpdates}
              onToggle={() => toggleNotification("matchUpdates")}
            />
            <ToggleRow
              title="Training reminders"
              detail="Get nudges to keep your training streak moving."
              checked={notificationPrefs.trainingReminders}
              onToggle={() => toggleNotification("trainingReminders")}
            />
            <ToggleRow
              title="Weekly progress recap"
              detail="Save a lightweight weekly summary of your debate progress."
              checked={notificationPrefs.weeklyProgress}
              onToggle={() => toggleNotification("weeklyProgress")}
            />
          </div>
          <div style={{ fontSize: "12px", color: "#667085", lineHeight: 1.6, marginTop: "14px" }}>
            {enabledNotifications} notification setting{enabledNotifications === 1 ? "" : "s"} currently enabled.
          </div>
        </DetailPanel>
      );
    }

    if (activePanel === "settings") {
      return (
        <DetailPanel section="Account" title="Settings" detail="Control profile visibility, history layout, and password updates.">
          <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
            <ToggleRow
              title="Show location on profile card"
              detail="Display your location in the top profile summary."
              checked={appPrefs.showLocationOnCard}
              onToggle={() => toggleAppPref("showLocationOnCard")}
            />
            <ToggleRow
              title="Show headline on profile card"
              detail="Keep your short intro visible in the hero card."
              checked={appPrefs.showHeadlineOnCard}
              onToggle={() => toggleAppPref("showHeadlineOnCard")}
            />
            <ToggleRow
              title="Compact history cards"
              detail="Reduce spacing in the training history list."
              checked={appPrefs.compactHistory}
              onToggle={() => toggleAppPref("compactHistory")}
            />
          </div>

          <div style={{ borderTop: "1px solid rgba(148,163,184,0.14)", paddingTop: "18px", marginTop: "4px" }}>
            <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Change Password</div>
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Current password</div>
                <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" style={inputStyle} />
              </div>
              <div>
                <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>New password</div>
                <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" style={inputStyle} />
              </div>
            </div>

            {(passwordMessage || passwordError) && (
              <div style={{ fontSize: "12px", color: passwordError ? "#dc2626" : "#16a34a", marginTop: "12px" }}>
                {passwordError || passwordMessage}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
              <button onClick={changePassword} disabled={passwordSaving} style={{ ...solidBtn, opacity: passwordSaving ? 0.7 : 1 }}>
                {passwordSaving ? "Saving…" : "Change password"}
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(148,163,184,0.14)", paddingTop: "18px", marginTop: "18px" }}>
            <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Account Actions</div>
            {(profileError || profileMessage) && (
              <div style={{ fontSize: "12px", color: profileError ? "#dc2626" : "#16a34a", marginBottom: "12px" }}>{profileError || profileMessage}</div>
            )}
            <div style={{ fontSize: "12px", color: "#667085", lineHeight: 1.6, marginBottom: "14px" }}>
              Signed in as {email || user.email}.
            </div>
            <button onClick={deleteAccount} style={{ ...secondaryBtn, color: "#dc2626", borderColor: "rgba(220,38,38,0.18)" }}>
              Delete account
            </button>
          </div>
        </DetailPanel>
      );
    }

    if (activePanel === "sign-out") {
      return (
        <DetailPanel section="Account" title="Sign Out" detail="End this session on the current device.">
          <div style={{ background: "#fff7ed", borderRadius: "18px", padding: "16px", color: "#9a3412", fontSize: "13px", lineHeight: 1.7, marginBottom: "16px" }}>
            You will be signed out and returned to the login screen.
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={handleSignOut} style={{ ...solidBtn, background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", boxShadow: "0 16px 28px rgba(220, 38, 38, 0.22)" }}>
              Sign out now
            </button>
            <button onClick={() => setActivePanel(null)} style={secondaryBtn}>
              Cancel
            </button>
          </div>
        </DetailPanel>
      );
    }

    return (
      <DetailPanel section="Profile" title="Open a section" detail="Choose one of the entries above to view your history, account tools, or settings.">
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ background: "#eef2ff", borderRadius: "18px", padding: "14px", color: "#4338ca", fontSize: "13px", lineHeight: 1.7 }}>
            Training History keeps your past practice rounds and coach feedback in one place.
          </div>
          <div style={{ background: "#ecfdf3", borderRadius: "18px", padding: "14px", color: "#166534", fontSize: "13px", lineHeight: 1.7 }}>
            Match History tracks PvP rounds, while Skill Breakdown summarizes rubric trends over time.
          </div>
          <div style={{ background: "#fff7ed", borderRadius: "18px", padding: "14px", color: "#c2410c", fontSize: "13px", lineHeight: 1.7 }}>
            Account entries handle profile edits, notifications, app settings, and sign out.
          </div>
        </div>
      </DetailPanel>
    );
  };

  const sharedProfileChrome = (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleImageSelect}
        style={{ display: "none" }}
      />

      {avatarActionsOpen && (
        <div
          onClick={closeAvatarActions}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.28)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
            zIndex: 60,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              ...sectionCard,
              width: "min(420px, 100%)",
              padding: "22px",
              background: "#fff",
            }}
          >
            <div style={{ ...eyebrowSmall, marginBottom: "8px" }}>Avatar</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827", marginBottom: "8px" }}>What do you want to do?</div>
            <div style={{ fontSize: "13px", color: "#667085", lineHeight: 1.7, marginBottom: "18px" }}>
              Change the image, save the current one, or remove your avatar entirely.
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <button
                onClick={() => {
                  setAvatarActionsOpen(false);
                  openImagePicker();
                }}
                style={solidBtn}
              >
                Change Avatar
              </button>
              <button
                onClick={saveAvatar}
                disabled={avatarSaving || imageLoading || !avatarChanged}
                style={{ ...secondaryBtn, opacity: avatarSaving || imageLoading || !avatarChanged ? 0.55 : 1 }}
              >
                {avatarSaving ? "Saving…" : "Save Avatar"}
              </button>
              <button
                onClick={deleteAvatar}
                disabled={avatarSaving || !hasAvatar}
                style={{
                  ...secondaryBtn,
                  color: "#dc2626",
                  borderColor: "rgba(220,38,38,0.18)",
                  opacity: avatarSaving || !hasAvatar ? 0.55 : 1,
                }}
              >
                Delete Avatar
              </button>
              <button onClick={closeAvatarActions} disabled={avatarSaving} style={secondaryBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (activePanel) {
    return (
      <div style={pageWrap}>
        {sharedProfileChrome}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
          <button onClick={() => setActivePanel(null)} style={secondaryBtn}>
            Back to Profile
          </button>
          <button onClick={onBack} style={secondaryBtn}>
            Back home
          </button>
        </div>

        {renderActivePanel()}
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      {sharedProfileChrome}

      <div style={{ ...heroCard, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={openAvatarActions}
              aria-label="Manage profile image"
              style={{
                width: "92px",
                height: "92px",
                borderRadius: "999px",
                overflow: "hidden",
                background: "rgba(255,255,255,0.16)",
                border: "2px solid rgba(255,255,255,0.22)",
                display: "grid",
                placeItems: "center",
                fontSize: "28px",
                fontWeight: 800,
                color: "#fff",
                flexShrink: 0,
                cursor: imageLoading ? "progress" : "pointer",
                padding: 0,
              }}
            >
              {showAvatarImage ? (
                <img
                  src={avatarSrc}
                  alt={`${name || user.name} profile`}
                  onError={() => setAvatarBroken(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                avatarLabel
              )}
            </button>

            <div>
              <div style={{ ...eyebrow, color: "rgba(255,255,255,0.72)" }}>Profile</div>
              <div style={{ fontSize: "clamp(2rem, 7vw, 3rem)", lineHeight: 0.98, fontWeight: 800, fontFamily: "'Fraunces', serif", marginTop: "10px" }}>
                {name || user.name}
              </div>
              {headlineLabel && (
                <div style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.88)", marginTop: "6px" }}>{headlineLabel}</div>
              )}
              {locationLabel && (
                <div style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.76)", marginTop: "4px" }}>{locationLabel}</div>
              )}
              <div style={{ fontSize: "14px", lineHeight: 1.7, color: "rgba(255,255,255,0.84)", marginTop: "8px" }}>
                Level {user.currentLevel}: {user.levelName} · {user.totalXP} XP
              </div>
              <div style={{ fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.76)", marginTop: "4px" }}>
                Click the avatar to change, save, or delete it.
              </div>
            </div>
          </div>
          <LevelBadge level={user.currentLevel} size="lg" />
        </div>

        <div
          style={{
            marginTop: "18px",
            background: "rgba(255,255,255,0.12)",
            borderRadius: "22px",
            padding: "16px",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>
            Level {user.currentLevel}: {user.levelName}
          </div>
          <XPProgressBar user={user} showNumbers={!!user.nextLevelXP} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", marginTop: "14px" }}>
            <MetricCard label="Total XP" value={user.totalXP} tint="rgba(79,70,229,0.28)" />
            <MetricCard label="Training" value={history.length} tint="rgba(34,197,94,0.24)" />
            <MetricCard label="PvP Wins" value={pvpWins} tint="rgba(236,72,153,0.26)" />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
            {user.unlockedDifficulties.map((difficulty) => (
              <DifficultyChip key={difficulty} difficulty={difficulty} size="sm" />
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Stats</div>
      <div style={{ ...sectionCard, overflow: "hidden", marginBottom: "18px" }}>
        <EntryRow
          icon={History}
          title="Training History"
          detail={`${history.length} training session${history.length === 1 ? "" : "s"} saved`}
          onClick={() => setActivePanel("training-history")}
          active={activePanel === "training-history"}
        />
        <EntryRow
          icon={Swords}
          title="Match History"
          detail={user.tutorialCompleted ? `${matches.length} PvP session${matches.length === 1 ? "" : "s"} tracked` : "Unlock after tutorial placement"}
          onClick={() => setActivePanel("match-history")}
          active={activePanel === "match-history"}
        />
        <EntryRow
          icon={Target}
          title="Skill Breakdown"
          detail={strongestSkill ? `${strongestSkill.label} is currently your strongest area` : "View rubric progress over time"}
          onClick={() => setActivePanel("skill-breakdown")}
          active={activePanel === "skill-breakdown"}
          last
        />
      </div>

      <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Account</div>
      <div style={{ ...sectionCard, overflow: "hidden", marginBottom: "18px" }}>
        <EntryRow
          icon={UserRound}
          title="Edit Profile"
          detail={rawLocationLabel || rawHeadlineLabel || "Update avatar, location, and bio"}
          onClick={() => setActivePanel("edit-profile")}
          active={activePanel === "edit-profile"}
        />
        <EntryRow
          icon={Bell}
          title="Notifications"
          detail={`${enabledNotifications} preference${enabledNotifications === 1 ? "" : "s"} enabled`}
          onClick={() => setActivePanel("notifications")}
          active={activePanel === "notifications"}
        />
        <EntryRow
          icon={Settings}
          title="Settings"
          detail="Password, visibility, and account controls"
          onClick={() => setActivePanel("settings")}
          active={activePanel === "settings"}
        />
        <EntryRow
          icon={LogOut}
          title="Sign Out"
          detail="End your current session"
          onClick={() => setActivePanel("sign-out")}
          danger
          last
        />
      </div>

      <button onClick={onBack} style={secondaryBtn}>
        Back home
      </button>
    </div>
  );
}
