const ballEl = document.getElementById("ball");
const form = document.getElementById("form");
const input = document.getElementById("question");
const askBtn = document.getElementById("ask");
const statusEl = document.getElementById("status");
const oddsEl = document.getElementById("odds");

const FRAME_MS = 90;
const SHAKE_FRAMES = 12;
const BAR_WIDTH = window.innerWidth < 480 ? 10 : 20;

let busy = false;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

// The ball is a disc of 2-char block cells, shaded like a sphere lit from
// the top left, with the window cut out of it. Every frame is ROWS_TOTAL
// rows so the layout never jumps. Vertical distances are in text rows,
// scaled by ASPECT.
const R = 14;          // ball radius in cells (1 cell = 2 chars wide)
const WR = 9;          // window radius
const ASPECT = 1.2;    // a 2-char cell is ~1.2x wider than a text row is tall
const RY = Math.round(R * ASPECT);   // ball radius in text rows
const SIZE = 2 * R + 1;
const ROWS_TOTAL = 2 * RY + 1;
const INK = "██", DARK = "▓▓", MID = "▒▒", LIGHT = "░░", GAP = "  ";

const EIGHT = [
  ".###.",
  "#...#",
  "#...#",
  ".###.",
  "#...#",
  "#...#",
  ".###.",
];

function shadeCell(nx, ny, rn) {
  // Lit from the top left; a reflection band bottom-right widens toward the rim.
  const l = -(nx * 0.7 + ny * 0.7);         // +1 lit, -1 in shadow
  const t = rn * rn * (0.5 - l);              // grows toward bottom-right rim
  if (t > 0.75) return DARK;
  if (t > 0.4) return MID;
  return LIGHT;
}

// grid(paint): paint(dx, ry, r) may return a 2-char cell for the window area.
// dx is in cells, ry in text rows, r the distance from center in cells.
function grid(paint) {
  const rows = [];
  for (let py = 0; py < ROWS_TOTAL; py++) {
    const cells = [];
    for (let px = 0; px < SIZE; px++) {
      const ry = py - RY;
      const dx = px - R, dy = ry / ASPECT;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > R + 0.5) { cells.push(GAP); continue; }
      if (r > R - 0.6) { cells.push(INK); continue; }
      const w = paint && paint(dx, ry, r);
      cells.push(w || shadeCell(dx / R, dy / R, r / R));
    }
    rows.push(cells);
  }
  return rows;
}

function idleBall() {
  const rows = grid((dx, ry, r) => {
    if (r > WR + 0.5) return null;
    const gx = dx + 2, gy = ry + 3;
    if (gy >= 0 && gy < 7 && gx >= 0 && gx < 5 && EIGHT[gy][gx] === "#") return INK;
    return GAP;
  });
  return rows.map((c) => c.join("")).join("\n");
}

function swirlBall(step) {
  const a0 = step * 0.7;
  const bubbles = [0, 1, 2].map((i) => {
    const a = a0 + (i * 2 * Math.PI) / 3;
    const rr = 3 + (i % 2);
    return [Math.round(Math.cos(a) * rr), Math.round(Math.sin(a) * rr)];
  });
  const rows = grid((dx, ry, r) => {
    if (r > WR + 0.5) return null;
    if (bubbles.some(([bx, by]) => bx === dx && by === ry)) return INK;
    return GAP;
  });
  return rows.map((c) => c.join("")).join("\n");
}

// Split the reply into centered lines that fit the widening triangle rows.
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

const TEXT_WIDTH = 16;
const TEXT_WIDTHS = [TEXT_WIDTH, TEXT_WIDTH, TEXT_WIDTH];

// Returns {text, spans}: the frame as plain text plus [row, start, end] char
// ranges of the answer lines, so the caller can wrap them in spans.
function answerBall(text) {
  const lines = wrapAnswer(text, TEXT_WIDTHS).filter(Boolean);
  const rows = grid((dx, ry, r) => (r > WR + 0.5 ? null : GAP));
  const out = rows.map((c) => c.join(""));
  const spans = [];
  const firstRow = RY - Math.floor(lines.length / 2);
  lines.forEach((line, i) => {
    const py = firstRow + i;
    const start = Math.round((SIZE * 2 - line.length) / 2);
    // Each cell is 2 chars and block glyphs are 1 code unit each, so char
    // offsets and cell offsets agree.
    out[py] = out[py].slice(0, start) + line + out[py].slice(start + line.length);
    spans.push([py, start, start + line.length]);
  });
  return { text: out.join("\n"), spans };
}

function answerBallHtml(text) {
  const { text: frame, spans } = answerBall(text);
  const lines = frame.split("\n");
  for (const [row, start, end] of spans) {
    const l = lines[row];
    lines[row] =
      escapeHtml(l.slice(0, start)) +
      `<span class="answer">${escapeHtml(l.slice(start, end))}</span>` +
      escapeHtml(l.slice(end));
  }
  return lines.join("\n");
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
  const out = [];
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
    ballEl.innerHTML = answerBallHtml("Reply hazy, try again.");
    ballEl.classList.add("mood-maybe");
    statusEl.textContent = "error: could not reach the ball.";
  } else {
    ballEl.innerHTML = answerBallHtml(result.text);
    ballEl.classList.add(`mood-${result.mood}`);
    statusEl.textContent =
      result.source === "offline" ? "offline: random pick (no TYPESAFE_API_KEY)" :
      result.source === "fallback" ? "jev request failed: random pick" : "";
    renderOdds(result);
  }

  busy = false;
  askBtn.disabled = false;
}

ballEl.textContent = idleBall();

// Theme: follow the system unless the visitor picked one.
const themeBtn = document.getElementById("theme");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function currentTheme() {
  return document.documentElement.dataset.theme || (systemDark.matches ? "dark" : "light");
}

function renderThemeButton() {
  themeBtn.textContent = currentTheme() === "dark" ? "[ light ]" : "[ dark ]";
}

themeBtn.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch {}
  renderThemeButton();
});
systemDark.addEventListener("change", renderThemeButton);
renderThemeButton();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  ask(q);
});
