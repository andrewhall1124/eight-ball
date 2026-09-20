const ball = document.getElementById("ball");
const form = document.getElementById("form");
const input = document.getElementById("question");
const askBtn = document.getElementById("ask");
const answerEl = document.getElementById("answer");
const statusEl = document.getElementById("status");
const oddsEl = document.getElementById("odds");
const oddsList = document.getElementById("odds-list");

const SHAKE_MS = 1100;
const SWIRL_MS = 900;

let busy = false;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function setStatus(text, badge) {
  statusEl.textContent = text;
  if (badge) {
    const b = document.createElement("span");
    b.className = "badge";
    b.textContent = badge;
    statusEl.appendChild(b);
  }
}

function resetBall() {
  ball.classList.remove("revealing", "revealed", "mood-yes", "mood-no", "mood-maybe");
  oddsEl.hidden = true;
}

function renderOdds(result) {
  const probs = result.probabilities;
  if (!probs) {
    oddsEl.hidden = true;
    return;
  }
  const rows = Object.entries(probs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  oddsList.innerHTML = "";
  for (const [key, p] of rows) {
    const li = document.createElement("li");
    li.style.setProperty("--w", `${Math.round(p * 100)}%`);
    if (key === result.key) li.classList.add("picked");
    const name = document.createElement("span");
    name.textContent = key.replace(/_/g, " ");
    const pct = document.createElement("span");
    pct.textContent = `${Math.round(p * 100)}%`;
    li.append(name, pct);
    oddsList.appendChild(li);
  }
  oddsEl.hidden = false;
}

async function ask(question) {
  if (busy) return;
  busy = true;
  askBtn.disabled = true;
  resetBall();
  setStatus("Shaking...");

  // Kick off the request and the shake at the same time so the network
  // round-trip hides behind the animation.
  const request = fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  })
    .then((r) => r.json())
    .catch(() => null);

  ball.classList.add("shaking");
  await wait(SHAKE_MS);
  ball.classList.remove("shaking");

  ball.classList.add("revealing");
  setStatus("Consulting the depths...");
  const [result] = await Promise.all([request, wait(SWIRL_MS)]);

  if (!result || !result.text) {
    answerEl.textContent = "Reply hazy, try again.";
    ball.classList.add("mood-maybe", "revealed");
    setStatus("Something went wrong reaching the ball.");
  } else {
    answerEl.textContent = result.text;
    ball.classList.add(`mood-${result.mood}`, "revealed");
    const badge =
      result.source === "jev" ? `Jev · ${result.model}` :
      result.source === "offline" ? "offline: no TYPESAFE_API_KEY" :
      "fallback";
    setStatus("The ball has spoken.", badge);
    renderOdds(result);
  }

  busy = false;
  askBtn.disabled = false;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  ask(q);
});

ball.addEventListener("click", () => {
  const q = input.value.trim();
  if (q) ask(q);
  else input.focus();
});
