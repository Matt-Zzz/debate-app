const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
export const API_BASE_URL = rawApiBaseUrl.endsWith("/")
  ? rawApiBaseUrl.slice(0, -1)
  : rawApiBaseUrl;
const AUTH_TOKEN_KEY = "debate_auth_token";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function authHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractErrorMessage(err) {
  return (
    err?.message ||
    err?.detail?.message ||
    err?.detail ||
    "API error"
  );
}

export async function apiFetch(path, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...authHeader(),
    ...(opts.headers || {}),
  };
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(extractErrorMessage(err)), { status: res.status, data: err });
  }
  return res.json();
}

export async function streamOpponentSpeech(payload, onChunk) {
  const res = await fetch(`${API_BASE_URL}/opponent-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(extractErrorMessage(err) || "Stream error"), { data: err });
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const chunk = line.slice(6);
      if (chunk === "[DONE]") return full;
      if (chunk.startsWith("[ERROR]")) throw new Error(chunk.slice(8));
      const token = chunk.replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
      full += token;
      onChunk(token);
    }
  }
  return full;
}
