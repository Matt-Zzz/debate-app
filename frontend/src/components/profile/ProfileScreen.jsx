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

export default function ProfileScreen({ user, onUserUpdated, onBack, onSignOut }) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImageUrl || "");
  const [location, setLocation] = useState(user.location || "");
  const [headline, setHeadline] = useState(user.headline || "");
  const [bio, setBio] = useState(user.bio || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
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
    setLoadingHistory(true);
    apiFetch("/profile/history")
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, []);

  const saveAccount = async () => {
    setSaving(true);
    setMessage("");
    setError("");
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
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      if (Object.keys(body).length === 0) {
        setMessage("No profile changes.");
        return;
      }
      const res = await apiFetch("/auth/me", { method: "PUT", body: JSON.stringify(body) });
      onUserUpdated(res.user);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Profile updated.");
    } catch (err) {
      setError(err.message || "Could not update profile");
    } finally {
      setSaving(false);
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
      setError(err.message || "Could not delete account");
    }
  };

  const openImagePicker = () => {
    if (imageLoading) return;
    imageInputRef.current?.click();
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImageLoading(true);
    setMessage("");
    setError("");

    try {
      const nextImage = await fileToProfileImage(file);
      setProfileImageUrl(nextImage);
      setAvatarBroken(false);
      setMessage("Profile image selected. Save profile to persist it.");
    } catch (err) {
      setError(err.message || "Could not process image");
    } finally {
      setImageLoading(false);
    }
  };

  const avatarSrc = profileImageUrl.trim();
  const showAvatarImage = avatarSrc && !avatarBroken;
  const locationLabel = location.trim() || user.location || "";
  const headlineLabel = headline.trim() || user.headline || "";
  const avatarLabel = initialsForName(name.trim() || user.name);

  return (
    <div style={pageWrap}>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleImageSelect}
        style={{ display: "none" }}
      />

      <div style={{ ...heroCard, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={openImagePicker}
              aria-label="Upload profile image"
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
                <div style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.88)", marginTop: "6px" }}>
                  {headlineLabel}
                </div>
              )}
              {locationLabel && (
                <div style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.76)", marginTop: "4px" }}>
                  {locationLabel}
                </div>
              )}
              <div style={{ fontSize: "14px", lineHeight: 1.7, color: "rgba(255,255,255,0.84)", marginTop: "8px" }}>
                Level {user.currentLevel}: {user.levelName} · {user.totalXP} XP
              </div>
              <div style={{ fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.76)", marginTop: "4px" }}>
                Click your profile image to upload a photo.
              </div>
            </div>
          </div>
          <LevelBadge level={user.currentLevel} size="lg" />
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "22px", marginBottom: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
          <div>
            <div style={eyebrowSmall}>Progress</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827", marginTop: "8px", marginBottom: "10px" }}>
              Next level track
            </div>
            <XPProgressBar user={user} />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
              {user.unlockedDifficulties.map((difficulty) => (
                <DifficultyChip key={difficulty} difficulty={difficulty} size="sm" />
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
            <div style={{ background: "#eef2ff", borderRadius: "18px", padding: "14px", border: "1px solid rgba(99,102,241,0.12)" }}>
              <div style={eyebrowSmall}>Total XP</div>
              <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "8px" }}>{user.totalXP}</div>
            </div>
            <div style={{ background: "#fdf2f8", borderRadius: "18px", padding: "14px", border: "1px solid rgba(236,72,153,0.12)" }}>
              <div style={eyebrowSmall}>Placement</div>
              <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "8px" }}>{user.placementScore}</div>
            </div>
            <div style={{ background: "#ecfdf3", borderRadius: "18px", padding: "14px", border: "1px solid rgba(34,197,94,0.12)" }}>
              <div style={eyebrowSmall}>Training Runs</div>
              <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "8px" }}>{history.length}</div>
            </div>
            <div style={{ background: "#fff7ed", borderRadius: "18px", padding: "14px", border: "1px solid rgba(249,115,22,0.12)" }}>
              <div style={eyebrowSmall}>Tutorial</div>
              <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "12px" }}>{user.tutorialCompleted ? "Complete" : "Pending"}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "22px", marginBottom: "14px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "12px" }}>Profile Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px", alignItems: "start" }}>
          <div style={{ background: "#f8fafc", borderRadius: "20px", padding: "18px", border: "1px solid rgba(148,163,184,0.14)" }}>
            <button
              type="button"
              onClick={openImagePicker}
              aria-label="Change profile image"
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
            <div style={{ textAlign: "center", fontSize: "15px", fontWeight: 800, color: "#111827" }}>{name || user.name}</div>
            <div style={{ textAlign: "center", fontSize: "12px", color: "#667085", marginTop: "6px", lineHeight: 1.6 }}>
              {headlineLabel || "Add a short headline"}
            </div>
            <div style={{ textAlign: "center", fontSize: "12px", color: "#667085", marginTop: "4px", lineHeight: 1.6 }}>
              {locationLabel || "Set your location"}
            </div>
            <button
              type="button"
              onClick={() => {
                setProfileImageUrl("");
                setAvatarBroken(false);
                setMessage("Profile image cleared. Save profile to persist it.");
              }}
              style={{ ...secondaryBtn, width: "100%", marginTop: "14px", padding: "10px 14px", fontSize: "13px" }}
            >
              Remove photo
            </button>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Profile image URL</div>
              <input
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div>
                <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Location</div>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Vancouver, BC" style={inputStyle} />
              </div>
              <div>
                <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Headline</div>
                <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Varsity debater building clash reps" style={inputStyle} />
              </div>
            </div>
            <div>
              <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Bio</div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Add a short bio, goals, school, or the debate skills you want to improve."
                style={{ ...textareaStyle, minHeight: "120px" }}
              />
            </div>
            <div style={{ fontSize: "12px", color: "#667085" }}>
              Click the avatar to upload a photo, or paste an image URL here. Leave any profile field blank to clear it.
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "22px", marginBottom: "14px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "12px" }}>Account Settings</div>
        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Email</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={inputStyle} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>Current password</div>
            <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" style={inputStyle} />
          </div>
          <div>
            <div style={{ ...eyebrowSmall, marginBottom: "6px" }}>New password</div>
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" style={inputStyle} />
          </div>
        </div>

        {(message || error) && (
          <div style={{ fontSize: "12px", color: error ? "#dc2626" : "#16a34a", marginTop: "12px" }}>
            {error || message}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
          <button onClick={saveAccount} disabled={saving} style={{ ...solidBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save profile"}
          </button>
          <button onClick={onSignOut} style={secondaryBtn}>Sign out</button>
          <button onClick={deleteAccount} style={{ ...secondaryBtn, color: "#dc2626", borderColor: "rgba(220,38,38,0.18)" }}>Delete account</button>
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "22px", marginBottom: "14px" }}>
        <div style={{ ...eyebrowSmall, marginBottom: "10px" }}>Training History</div>
        {loadingHistory && <div style={{ color: "#667085", fontSize: "13px" }}>Loading history…</div>}
        {!loadingHistory && history.length === 0 && <div style={{ color: "#667085", fontSize: "13px" }}>No training runs saved yet.</div>}
        {!loadingHistory && history.length > 0 && (
          <div style={{ display: "grid", gap: "10px" }}>
            {history.map((item) => (
              <div key={item.id} style={{ background: "#f8fafc", border: "1px solid rgba(148,163,184,0.14)", borderRadius: "18px", padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'Fraunces', serif" }}>{item.topicTitle}</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#4338ca" }}>{item.rubric?.total ?? 0}/100</div>
                </div>
                <div style={{ fontSize: "12px", color: "#667085", marginBottom: "8px" }}>
                  {item.characterName} · Side {item.side} · {new Date(item.createdAt).toLocaleString()}
                </div>
                <details>
                  <summary style={{ cursor: "pointer", fontSize: "12px", color: "#4338ca", fontWeight: 700 }}>View feedback</summary>
                  <textarea
                    readOnly
                    value={[
                      item.feedback?.strengths ? `STRENGTHS:\n${item.feedback.strengths}` : "",
                      item.feedback?.gaps ? `GAPS:\n${item.feedback.gaps}` : "",
                      item.feedback?.nextDrill ? `NEXT DRILL:\n${item.feedback.nextDrill}` : "",
                    ].filter(Boolean).join("\n\n")}
                    style={{ ...textareaStyle, marginTop: "10px", minHeight: "160px", background: "#fff" }}
                  />
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onBack} style={secondaryBtn}>Back home</button>
    </div>
  );
}
