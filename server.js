// Magic Eight Ball backed by Jev, TypeSafe's System One decision model.
// Zero dependencies: node:http serves ./public and proxies /api/ask to Jev
// so the API key never reaches the browser.

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ANSWERS } from "./answers.js";

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.TYPESAFE_API_KEY;
const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const MODEL = process.env.JEV_MODEL || "jev-latest";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// Weighted sample from Jev's probability distribution so the ball stays
// playful instead of always returning the argmax.
function sample(probabilities) {
  const entries = Object.entries(probabilities).filter(([k]) => k in ANSWERS);
  const total = entries.reduce((s, [, p]) => s + p, 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const [key, p] of entries) {
    r -= p;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function randomAnswer() {
  const keys = Object.keys(ANSWERS);
  return keys[Math.floor(Math.random() * keys.length)];
}

async function askJev(question) {
  const criteria = Object.fromEntries(
    Object.entries(ANSWERS).map(([key, a]) => [key, a.criteria])
  );
  const res = await fetch(JEV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      state: { question },
      questions: {
        verdict: {
          type: "choice",
          instructions:
            "You are a Magic Eight Ball. Pick the classic eight-ball reply that best fits this yes/no question, reading its tone, plausibility, and how much uncertainty it carries.",
          criteria,
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Jev responded ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.answers?.verdict;
}

async function handleAsk(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;
  let question;
  try {
    question = String(JSON.parse(body || "{}").question ?? "").trim();
  } catch {
    return sendJson(res, 400, { error: "Invalid JSON" });
  }
  if (!question) return sendJson(res, 400, { error: "Ask a question first." });
  if (question.length > 500) question = question.slice(0, 500);

  if (!API_KEY) {
    const key = randomAnswer();
    return sendJson(res, 200, {
      key,
      text: ANSWERS[key].text,
      mood: ANSWERS[key].mood,
      source: "offline",
      probabilities: null,
    });
  }

  try {
    const verdict = await askJev(question);
    const probabilities = verdict?.probabilities ?? {};
    const key = sample(probabilities) ?? verdict?.choice ?? randomAnswer();
    return sendJson(res, 200, {
      key,
      text: ANSWERS[key].text,
      mood: ANSWERS[key].mood,
      source: "jev",
      model: MODEL,
      top: verdict?.choice ?? null,
      confidence: verdict?.confidence ?? null,
      probabilities,
    });
  } catch (err) {
    console.error(err);
    const key = randomAnswer();
    return sendJson(res, 200, {
      key,
      text: ANSWERS[key].text,
      mood: ANSWERS[key].mood,
      source: "fallback",
      probabilities: null,
    });
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let filePath = path.normalize(path.join(publicDir, url.pathname));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end();
  }
  if (url.pathname === "/" || url.pathname === "") {
    filePath = path.join(publicDir, "index.html");
  }
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}

http
  .createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/api/ask") return handleAsk(req, res);
    if (req.method === "GET") return serveStatic(req, res);
    res.writeHead(405);
    res.end();
  })
  .listen(PORT, () => {
    console.log(
      `Eight ball listening on http://localhost:${PORT} (${API_KEY ? "Jev " + MODEL : "offline mode: set TYPESAFE_API_KEY"})`
    );
  });
