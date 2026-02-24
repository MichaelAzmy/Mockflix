// app.js — light state manager + realistic-ish delays

const DEFAULT_STATE = {
  loggedIn: false,
  subscriptionStatus: "active", // active | paused | cancelled
  billingProvider: "direct",    // direct | apple | google | partner
  plan: "Standard",
  renewalDateISO: "2026-03-18",
  payment: "Visa •••• 4242",
};

function qs() {
  return new URLSearchParams(window.location.search);
}
function isTestMode() {
  return qs().get("test") === "1";
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function realisticDelay() {
  if (isTestMode()) return;
  await delay(randInt(300, 850));
}

function loadState() {
  const raw = localStorage.getItem("mockflix_state");
  if (!raw) return { ...DEFAULT_STATE };
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}
function saveState(state) {
  localStorage.setItem("mockflix_state", JSON.stringify(state));
}
function setState(patch) {
  const s = loadState();
  const next = { ...s, ...patch };
  saveState(next);
  return next;
}

function requireLogin(redirectTo = "index.html") {
  const s = loadState();
  if (!s.loggedIn) window.location.href = redirectTo;
}

function fmtDate(iso) {
  // keep it simple / stable (no locale surprises)
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

function setLoading(containerId = "page") {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.classList.add("is-loading");
}

function clearLoading(containerId = "page") {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.classList.remove("is-loading");
}

function disableBriefly(button) {
  if (!button) return;
  button.disabled = true;
  const ms = isTestMode() ? 50 : randInt(350, 900);
  setTimeout(() => (button.disabled = false), ms);
}

function signOut() {
  setState({ loggedIn: false });
  window.location.href = "index.html";
}

function injectTopbar(active = "") {
  const s = loadState();
  const top = document.getElementById("topbar");
  if (!top) return;

  top.innerHTML = `
    <div class="topbar-inner">
      <a class="brand" href="browse.html">Mockflix</a>
      <div class="topbar-right">
        <button class="iconbtn" id="profileBtn" aria-label="Profile menu" data-testid="profile-menu">
          <span class="avatar"></span>
        </button>
        <div class="menu" id="profileMenu" aria-hidden="true">
          <a href="account.html" class="${active === "account" ? "active" : ""}">Account</a>
          <button class="menu-btn" id="logoutBtn" data-testid="logout">Sign out</button>
        </div>
      </div>
    </div>
  `;

  const btn = document.getElementById("profileBtn");
  const menu = document.getElementById("profileMenu");
  btn?.addEventListener("click", () => {
    const open = menu.getAttribute("aria-hidden") === "false";
    menu.setAttribute("aria-hidden", open ? "true" : "false");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", signOut);

  document.addEventListener("click", (e) => {
    if (!menu) return;
    if (btn?.contains(e.target)) return;
    if (menu.contains(e.target)) return;
    menu.setAttribute("aria-hidden", "true");
  });

  // Little “real-world” touch: sometimes menu closes when you navigate quickly
  if (!isTestMode()) {
    window.addEventListener("beforeunload", () => {
      try { menu.setAttribute("aria-hidden", "true"); } catch {}
    });
  }
}

function renderMembershipSummary(containerId = "membershipSummary") {
  const s = loadState();
  const el = document.getElementById(containerId);
  if (!el) return;

  const renewal = fmtDate(s.renewalDateISO);
  let statusLine = "";
  if (s.subscriptionStatus === "active") statusLine = `Renews on <strong>${renewal}</strong>`;
  if (s.subscriptionStatus === "paused") statusLine = `Paused until <strong>${renewal}</strong>`;
  if (s.subscriptionStatus === "cancelled") statusLine = `Active until <strong>${renewal}</strong>`;

  el.innerHTML = `
    <div class="kv">
      <div class="k">Plan</div>
      <div class="v">${s.plan}</div>
    </div>
    <div class="kv">
      <div class="k">Status</div>
      <div class="v">${statusLine}</div>
    </div>
    <div class="kv">
      <div class="k">Billing</div>
      <div class="v">${s.billingProvider === "direct" ? s.payment : `Billed through ${cap(s.billingProvider)}`}</div>
    </div>
  `;
}

function cap(x) {
  return x.charAt(0).toUpperCase() + x.slice(1);
}

// For realism + testing: allow setting provider via query param once logged in.
// e.g. membership.html?provider=apple
function applyProviderParamIfPresent() {
  const p = qs().get("provider");
  if (!p) return;
  const allowed = ["direct", "apple", "google", "partner"];
  if (allowed.includes(p)) setState({ billingProvider: p });
}

// Expose a few helpers globally for inline scripts
window.Mockflix = {
  loadState, saveState, setState,
  requireLogin, realisticDelay,
  setLoading, clearLoading,
  disableBriefly, injectTopbar,
  renderMembershipSummary, fmtDate,
  applyProviderParamIfPresent,
  signOut,
  isTestMode
};