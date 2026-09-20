const ballEl = document.getElementById("ball");
const form = document.getElementById("form");
const input = document.getElementById("question");
const askBtn = document.getElementById("ask");
const statusEl = document.getElementById("status");
const oddsEl = document.getElementById("odds");

const FRAME_MS = 90;
const SHAKE_FRAMES = 12;
const BAR_WIDTH = 20;

let busy = false;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

// Every frame is 14 lines so the layout never jumps.
function idleBall() {
  return [
    "          ________________",
    "       .-'                '-.",
    "     .'                      '.",
    "    /          ______          \\",
    "   |         .'      '.         |",
    "   |        |    8     |        |",
    "   |        |          |        |",
    "   |         '.______.'         |",
    "    \\                          /",
    "     '.                      .'",
    "       '-.________________.-'",
    "",
    "",
    "",
  ].join("\n");
}

function swirlBall(step) {
  const s = ["~", "~ ~", "~ ~ ~", "~ ~"][step % 4];
  const top = center(s, 10);
  const bottom = center(s.split("").reverse().join(""), 10);
  return [
    "          ________________",
    "       .-'                '-.",
    "     .'                      '.",
    "    /          ______          \\",
    "   |         .'      '.         |",
    `   |        |${top}|        |`,
    `   |        |${bottom}|        |`,
    "   |         '.______.'         |",
    "    \\                          /",
    "     '.                      .'",
    "       '-.________________.-'",
    "",
    "",
    "",
  ].join("\n");
}

// Split the reply into up to three centered lines that fit in the triangle.
function wrapAnswer(text, widths) {
  const words = text.toUpperCase().split(" ");
  const lines = [];
  let i = 0;
  for (const w of widths) {
    let line = "";
    while (i < words.length && (line + " " + words[i]).trim().length <= w) {
      line = (line + " " + words[i]).trim();
      i++;
    }
    lines.push(line);
  }
  if (i < words.length) lines[lines.length - 1] += " " + words.slice(i).join(" ");
  return lines;
}

function center(s, w) {
  const pad = Math.max(0, w - s.length);
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + s + " ".repeat(pad - left);
}

// The triangle widens by two columns per row: interiors 0, 4, 8, 12, 16.
function answerBall(text) {
  const [a, b, c] = wrapAnswer(text, [8, 12, 16]);
  const line = (s, w) => `<span class="answer">${escapeHtml(center(s, w))}</span>`;
  return [
    "          ________________",
    "       .-'                '-.",
    "     .'                      '.",
    "    /            /\\            \\",
    "   |           /    \\           |",
    `   |         /${line(a, 8)}\\         |`,
    `   |       /${line(b, 12)}\\       |`,
    `   |     /${line(c, 16)}\\     |`,
    "    \\   --------------------   /",
    "     '.                      .'",
    "       '-.________________.-'",
    "",
    "",
    "",
  ].join("\n");
}

function renderOdds(result) {
  const probs = result.probabilities;
  if (!probs) {
    oddsEl.hidden = true;
    return;
  }
  const labels = result.labels || {};
  const rows = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  const nameWidth = Math.max(...rows.map(([k]) => (labels[k] || k).length));
  const out = [
    `<span class="head">jev probabilities (${escapeHtml(result.model || "jev")}), <- = sampled reply</span>`,
    "",
  ];
  for (const [key, p] of rows) {
    const name = (labels[key] || key).padEnd(nameWidth);
    const filled = Math.round(p * BAR_WIDTH);
    const bar = `<span class="bar">${"#".repeat(filled)}</span>${"-".repeat(BAR_WIDTH - filled)}`;
    const pct = `${(p * 100).toFixed(1).padStart(5)}%`;
    const mark = key === result.key ? "  <-" : "";
    const line = `${escapeHtml(name)}  ${bar}  ${pct}${mark}`;
    out.push(key === result.key ? `<span class="picked">${line}</span>` : line);
  }
  out.push("", "the ball samples from this distribution", "instead of always taking the top pick.");
  oddsEl.innerHTML = out.join("\n");
  oddsEl.hidden = false;
}

async function ask(question) {
  if (busy) return;
  busy = true;
  askBtn.disabled = true;
  ballEl.className = "ball";
  oddsEl.hidden = true;
  statusEl.textContent = "shaking...";

  // Fire the request first so the round-trip hides behind the animation.
  const request = fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  })
    .then((r) => r.json())
    .catch(() => null);

  for (let i = 0; i < SHAKE_FRAMES; i++) {
    const jitter = " ".repeat(Math.floor(Math.random() * 4));
    ballEl.textContent = idleBall().split("\n").map((l) => jitter + l).join("\n");
    await wait(FRAME_MS);
  }

  statusEl.textContent = "consulting jev...";
  let step = 0;
  let result;
  let done = false;
  request.then((r) => { result = r; done = true; });
  while (!done || step < 8) {
    ballEl.textContent = swirlBall(step++);
    await wait(FRAME_MS * 2);
  }

  if (!result || !result.text) {
    ballEl.innerHTML = answerBall("Reply hazy, try again.");
    ballEl.classList.add("mood-maybe");
    statusEl.textContent = "error: could not reach the ball.";
  } else {
    ballEl.innerHTML = answerBall(result.text);
    ballEl.classList.add(`mood-${result.mood}`);
    statusEl.textContent =
      result.source === "jev" ? `source: jev (${result.model})` :
      result.source === "offline" ? "source: offline, random pick (no TYPESAFE_API_KEY)" :
      "source: fallback, random pick (jev request failed)";
    renderOdds(result);
  }

  busy = false;
  askBtn.disabled = false;
}

ballEl.textContent = idleBall();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  ask(q);
});
