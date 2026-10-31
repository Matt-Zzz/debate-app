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
  if (Array.isArray(err?.detail)) return err.detail.map((item) => item.msg).join("; ");
  return (
    err?.message ||
    err?.detail?.message ||
    err?.detail ||
    "API error"
  );
}

async function boundedRequest(action, signal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; abort(); }, timeoutMs);
  try { return await action(controller.signal); }
  catch (err) {
    if (timedOut) throw new Error("Connection timed out. Your request may have reached the server; refresh before retrying.");
    if (err instanceof TypeError) throw new Error("Cannot reach Rebutto. Check your internet connection and try again.");
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function confirmAiSharing() {
  if (!window.confirm(
    "Use Google Gemini AI?\n\nRebutto will send your debate text, topic, chosen side and opponent character to Google Gemini to generate a response or coaching feedback. Your name, email and password are not included. Avoid entering sensitive personal information. AI responses may be inaccurate.\n\nChoose OK to send this request, or Cancel to keep your text from being sent. Read the Privacy Policy on the sign-in screen or in Profile Settings."
  )) {
    throw new Error("AI request cancelled. Your debate text was not sent to Google Gemini.");
  }
}

export async function apiFetch(path, opts = {}) {
  if (path === "/coach-report") {
    confirmAiSharing();
    opts = { ...opts, body: JSON.stringify({ ...JSON.parse(opts.body || "{}"), aiConsent: true }) };
  }
  if (/^\/pvp\/sessions\/[^/]+\/finish$/.test(path)) {
    if (!window.confirm("Finish and use Google Gemini as the AI judge?\n\nOnce both players agree and finish, Rebutto sends the topic, assigned positions and complete text conversation to Google Gemini to determine scores and the winner. Account names, emails and passwords are not included. AI judgments can be wrong. Avoid sharing sensitive information.\n\nChoose OK to consent and finish, or Cancel to keep debating. Retrying may send the conversation again.")) {
      throw new Error("AI judging cancelled. You have not finished this debate.");
    }
    opts = { ...opts, body: JSON.stringify({ aiConsent: true }) };
  }
  const headers = {
    "Content-Type": "application/json",
    ...authHeader(),
    ...(opts.headers || {}),
  };
  const aiRequest = path === "/coach-report" || /\/(finish|complete)$/.test(path);
  const requestPath = path === "/coach-report" ? "/v2/coach-report" : path;
  return boundedRequest(async (signal) => {
    const { timeoutMs, ...requestOptions } = opts;
    const res = await fetch(`${API_BASE_URL}${requestPath}`, { ...requestOptions, headers, signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = res.status === 401 ? "Your session has expired. Sign out and sign in again." : extractErrorMessage(err);
      throw Object.assign(new Error(message), { status: res.status, data: err });
    }
    return res.json();
  }, opts.signal, opts.timeoutMs ?? (aiRequest ? 75000 : 15000));
}

export async function streamOpponentSpeech(payload, onChunk) {
  confirmAiSharing();
  return boundedRequest(async (signal) => {
  const res = await fetch(`${API_BASE_URL}/v2/opponent-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ ...payload, aiConsent: true }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(extractErrorMessage(err) || "Stream error"), { data: err });
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  try { while (true) {
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
  throw new Error("AI response was interrupted. Please retry; the partial reply is not complete.");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }, undefined, 75000);
}
