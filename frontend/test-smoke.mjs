import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const rendered = await build({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToString } from 'react-dom/server';
      import ReportScreen from './src/components/report/ReportScreen.jsx';
      import PvPRoom from './src/components/pvp/PvPRoom.jsx';
      import BottomNav, { NAV_ITEMS } from './src/components/common/BottomNav.jsx';
      import topics from '../backend-python/data/topics.json';
      import characters from '../backend-python/data/characters.json';
      const html = renderToString(React.createElement(ReportScreen, {
        config: { topic: topics[0], character: characters[0], side: 'A' },
        transcript: [], sessionId: 'render-test'
      }));
      if (!html || html.length < 100) throw new Error('Report screen did not render');
      for (const item of NAV_ITEMS) {
        const nav = renderToString(React.createElement(BottomNav, { screen: item.id, onNavigate: () => {} }));
        if ((nav.match(/aria-current="page"/g) || []).length !== 1) throw new Error('Navigation must have exactly one active destination');
        if (!nav.includes('aria-label="' + item.label + '"') || !nav.includes('Main navigation')) throw new Error('Navigation label missing');
      }
      for (const [winnerId, expected] of [[1, 'You won!'], [2, 'You lost'], [null, 'Draw']]) {
        const room = renderToString(React.createElement(PvPRoom, {
          session: { id: 'pvp-test', player1Id: 1, player2Id: 2, player2Name: 'Opponent', status: 'completed',
            winnerId, scores: {player1: 80, player2: 70}, result: {judge: 'Google Gemini', notes: 'Specific judging reason'} },
          user: {id: 1}, onSessionUpdated: () => {}
        }));
        if (!room.includes(expected) || !room.includes('Specific judging reason')) throw new Error('Missing PvP verdict');
      }
    `,
    resolveDir: process.cwd(),
    loader: "jsx",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  loader: { ".css": "empty" },
  define: { "import.meta.env.VITE_API_BASE_URL": '"https://example.test/api"' },
  write: false,
});
new Function("require", rendered.outputFiles[0].text)(require);
console.log("PASS: report screen renders without undefined React hooks");

const stored = new Map([["debate_auth_token", "test-token"]]);
globalThis.localStorage = {
  getItem: (key) => stored.get(key) || null,
  setItem: (key, value) => stored.set(key, value),
  removeItem: (key) => stored.delete(key),
};
let allow = false;
let requests = 0;
let lastHeaders;
globalThis.window = { confirm: () => allow };
globalThis.fetch = async (_url, options) => {
  requests += 1;
  lastHeaders = options.headers;
  return {
    ok: true,
    json: async () => ({ ok: true }),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: hello\n\ndata: [DONE]\n\n"));
        controller.close();
      },
    }),
  };
};
const apiBuild = await build({
  entryPoints: ["src/lib/api.js"], bundle: true, platform: "node",
  format: "esm", write: false, define: { "import.meta.env.VITE_API_BASE_URL": '"https://example.test/api"' },
});
const api = await import(`data:text/javascript;base64,${Buffer.from(apiBuild.outputFiles[0].text).toString("base64")}`);
await assert.rejects(api.apiFetch("/coach-report", { method: "POST" }), /cancelled/);
await assert.rejects(api.streamOpponentSpeech({}, () => {}), /cancelled/);
await assert.rejects(api.apiFetch("/pvp/sessions/test/finish", { method: "POST" }), /cancelled/);
assert.equal(requests, 0, "Declining consent must make zero network requests");
allow = true;
let pvpBody;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => { pvpBody = options.body; return originalFetch(url, options); };
await api.apiFetch("/pvp/sessions/test/finish", { method: "POST" });
assert.equal(JSON.parse(pvpBody).aiConsent, true);
globalThis.fetch = originalFetch;
await api.apiFetch("/coach-report", { method: "POST", headers: { "X-Test": "yes" } });
assert.equal(lastHeaders.Authorization, "Bearer test-token");
assert.equal(lastHeaders["Content-Type"], "application/json");
assert.equal(lastHeaders["X-Test"], "yes");
let received = "";
assert.equal(await api.streamOpponentSpeech({}, (chunk) => { received += chunk; }), "hello");
assert.equal(received, "hello");
assert.equal(requests, 3);
console.log("PASS: consent blocks network calls; accepted AI calls retain authentication and stream text");

let coachBody;
globalThis.fetch = async (_url, options) => { coachBody = JSON.parse(options.body); return { ok: true, json: async () => ({}) }; };
await api.apiFetch("/coach-report", { method: "POST", body: JSON.stringify({ transcript: [], sessionId: "consent-test" }) });
assert.equal(coachBody.aiConsent, true);
assert.equal(coachBody.sessionId, "consent-test");
globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({ detail: [{ msg: "Side must be A or B" }] }) });
await assert.rejects(api.apiFetch("/example"), /Side must be A or B/);
globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
await assert.rejects(api.apiFetch("/example"), /session has expired/);
globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
  options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
});
await assert.rejects(api.apiFetch("/example", { timeoutMs: 5 }), /timed out/);
globalThis.fetch = async () => ({ ok: true, body: new ReadableStream({ start(controller) {
  controller.enqueue(new TextEncoder().encode("data: partial\n\n")); controller.close();
} }) });
await assert.rejects(api.streamOpponentSpeech({}, () => {}), /interrupted/);
console.log("PASS: server consent payload, validation errors, expired login, timeouts and interrupted streams");
