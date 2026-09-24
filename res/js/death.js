const WORKER = "https://locamartin-auth.locamartin.workers.dev";

// Global Application & UI State
let sidebarOpen = false;
let analyticsLoaded = false;
let deathTimer = null;
let deathTimerFull = null;
let quill = null;
let notes = {};
let currentNoteId = null;

// Global Death Pipeline Telemetry State
let deathFilter = "";
let deathItems = [];
let deathStats = null;
let deathLoaded = false;
let deathRefreshTimer = null;

// Workflow Display Mapping
const DEATH_WF_NAMES = {
  "bbscope.yml": "BBScope Fetcher",
  "nuclei_header_bbp.yml": "Nuclei BBP",
  "nuclei_header_sub.yml": "Nuclei Sub",
  "subrecon.yml": "Subrecon",
};

// Initialize Quill Editor on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  const quillContainer = document.getElementById("quill-editor");
  if (quillContainer && typeof Quill !== "undefined") {
    quill = new Quill("#quill-editor", {
      theme: "snow",
      placeholder: "Write your note here...",
    });
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = document.getElementById("username")?.value;
      const p = document.getElementById("password")?.value;
      if (u && p) {
        await loginWithPassword(u, p);
      }
    });
  }

  const togglePw = document.getElementById("togglePassword");
  if (togglePw) {
    togglePw.addEventListener("click", () => {
      const pwInput = document.getElementById("password");
      if (pwInput) {
        const isPassword = pwInput.getAttribute("type") === "password";
        pwInput.setAttribute("type", isPassword ? "text" : "password");
      }
    });
  }

  verifySession().then((isValid) => {
    if (isValid) {
      showApp();
    }
  });
});

// ── Auth & Session Management ──
async function verifySession() {
  try {
    const res = await fetch(`${WORKER}/session`, { method: "GET", credentials: "include" });
    return res.ok && (await res.json()).success === true;
  } catch {
    return false;
  }
}

function showApp() {
  const login = document.getElementById("login-screen");
  const app = document.getElementById("app");
  if (login) login.style.display = "none";
  if (app) app.style.display = "block";
  trackPage();
  loadNotesFromStorage();
  renderSidebarNotesList();
  refreshDeathData();
}

async function loginWithPassword(username, password) {
  const res = await fetch(`${WORKER}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.success) {
    showApp();
    return true;
  }
  const error = document.getElementById("login-error");
  if (error) error.textContent = data.error || "Invalid username or password.";
  return false;
}

async function logout() {
  await fetch(`${WORKER}/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  window.location.reload();
}

function trackPage() {
  fetch(`${WORKER}/track`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page: "/death" }),
  }).catch(() => {});
}

// ── Navigation & Sidebar Controls ──
function toggleSidebar() {
  sidebarOpen ? closeSidebar() : openSidebar();
}

function openSidebar() {
  sidebarOpen = true;
  const overlay = document.getElementById("overlay");
  const sidebar = document.getElementById("sidebar");
  if (overlay) overlay.classList.add("open");
  if (sidebar) sidebar.classList.add("open");
  if (!analyticsLoaded) {
    loadAnalytics();
    analyticsLoaded = true;
  }
}

function closeSidebar() {
  sidebarOpen = false;
  const overlay = document.getElementById("overlay");
  const sidebar = document.getElementById("sidebar");
  if (overlay) overlay.classList.remove("open");
  if (sidebar) sidebar.classList.remove("open");
}

function showPanel(name, evt) {
  document.querySelectorAll(".panel").forEach((p) => {
    p.style.display = "none";
    p.classList.remove("active");
  });
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  
  const panel = document.getElementById(`panel-${name}`);
  if (panel) {
    panel.style.display = "block";
    panel.classList.add("active");
  }
  if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");
  
  if (name === "analytics" && !analyticsLoaded) {
    loadAnalytics();
    analyticsLoaded = true;
  }
  if (name === "death-pipeline") loadDeathDashboard();
}

function openFull(name) {
  closeSidebar();
  const fp = document.getElementById(`fp-${name}`);
  if (fp) fp.classList.add("open");
  
  if (name === "analytics") loadAnalyticsFull();
  if (name === "notes") { loadNotesFromStorage(); renderFpNotesList(); }
  if (name === "portfolio") loadPortfolioFields();
  if (name === "death-pipeline") loadDeathDashboard();
  document.body.style.overflow = "hidden";
}

function closeFull(name) {
  const fp = document.getElementById(`fp-${name}`);
  if (fp) fp.classList.remove("open");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".fullpage-panel.open").forEach((p) => p.classList.remove("open"));
    document.body.style.overflow = "";
  }
});

// ── Analytics ──
async function loadAnalytics() {
  const loading = document.getElementById("loading-msg");
  const content = document.getElementById("analytics-content");
  const error = document.getElementById("error-msg");
  
  if (loading) loading.style.display = "block";
  if (content) content.style.display = "none";
  if (error) error.style.display = "none";
  
  try {
    const data = await (await fetch(`${WORKER}/stats`, { credentials: "include" })).json();
    renderAnalytics(data, "total-views", "chart", "top-pages");
    if (loading) loading.style.display = "none";
    if (content) content.style.display = "block";
  } catch (e) {
    if (loading) loading.style.display = "none";
    if (error) error.style.display = "block";
  }
}

async function loadAnalyticsFull() {
  try {
    const data = await (await fetch(`${WORKER}/stats`, { credentials: "include" })).json();
    setDeathEl("fp-total", data.total || 0);
    const days = data.days || {};
    const today = new Date().toISOString().slice(0, 10);
    setDeathEl("fp-today", days[today] || 0);
    setDeathEl("fp-week", Object.values(days).reduce((a, b) => a + b, 0));
    setDeathEl("fp-pages", Object.keys(data.topPages || {}).length);
    renderAnalytics(data, null, "fp-chart", "fp-top-pages");
  } catch (e) {}
}

function renderAnalytics(data, totalId, chartId, pagesId) {
  if (totalId) setDeathEl(totalId, data.total || 0);
  const chart = document.getElementById(chartId);
  if (!chart) return;
  chart.innerHTML = "";
  
  const days = data.days || {};
  const vals = Object.values(days);
  const maxVal = Math.max(...vals, 1);
  const chartH = chart.offsetHeight || 80;
  
  Object.entries(days).forEach(([date, count]) => {
    const h = Math.max(Math.round((count / maxVal) * (chartH - 14)), count > 0 ? 4 : 2);
    const col = document.createElement("div");
    col.className = "bar-col";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${h}px`;
    bar.title = `${count} views`;
    const lbl = document.createElement("div");
    lbl.className = "bar-label";
    lbl.textContent = date.slice(5);
    col.appendChild(bar);
    col.appendChild(lbl);
    chart.appendChild(col);
  });

  const pagesDiv = document.getElementById(pagesId);
  if (!pagesDiv) return;
  pagesDiv.innerHTML = "";
  const sorted = Object.entries(data.topPages || {}).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) {
    pagesDiv.innerHTML = '<p style="color:rgba(255,255,255,0.28);font-size:0.82rem">No data yet.</p>';
    return;
  }
  sorted.forEach(([page, count]) => {
    const row = document.createElement("div");
    row.className = "page-row";
    const nameSpan = document.createElement("span");
    nameSpan.className = "page-name";
    nameSpan.textContent = page;
    const countSpan = document.createElement("span");
    countSpan.className = "page-count";
    countSpan.textContent = String(count);
    row.appendChild(nameSpan);
    row.appendChild(countSpan);
    pagesDiv.appendChild(row);
  });
}

// ── Notes Scratchpad Module ──
function loadNotesFromStorage() {
  const raw = localStorage.getItem("lm_notes_v2");
  notes = raw ? JSON.parse(raw) : {};
}

function saveNotesToStorage() {
  localStorage.setItem("lm_notes_v2", JSON.stringify(notes));
}

function renderFpNotesList() {
  const list = document.getElementById("fp-notes-list");
  if (!list) return;
  list.innerHTML = "";
  const ids = Object.keys(notes).sort((a, b) => notes[b].date - notes[a].date);
  if (!ids.length) {
    list.innerHTML = '<p style="font-size:0.8rem;color:var(--muted)">No notes yet. Click New.</p>';
    return;
  }
  ids.forEach((id) => {
    const n = notes[id];
    const div = document.createElement("div");
    div.className = "note-item" + (id === currentNoteId ? " active" : "");
    const info = document.createElement("div");
    info.className = "note-item-info";
    info.style.cursor = "pointer";
    info.addEventListener("click", () => openNote(id));
    
    const titleDiv = document.createElement("div");
    titleDiv.className = "note-item-title";
    titleDiv.textContent = n.title || "Untitled";
    const dateDiv = document.createElement("div");
    dateDiv.className = "note-item-date";
    dateDiv.textContent = new Date(n.date).toLocaleDateString();
    
    info.appendChild(titleDiv);
    info.appendChild(dateDiv);
    
    const delBtn = document.createElement("button");
    delBtn.className = "note-item-del";
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteNote(id);
    });
    
    div.appendChild(info);
    div.appendChild(delBtn);
    list.appendChild(div);
  });
}

function renderSidebarNotesList() {
  const list = document.getElementById("sidebar-notes-list");
  if (!list) return;
  list.innerHTML = "";
  const ids = Object.keys(notes).sort((a, b) => notes[b].date - notes[a].date).slice(0, 5);
  if (!ids.length) {
    list.innerHTML = '<p style="font-size:0.78rem;color:var(--muted)">No notes yet.</p>';
    return;
  }
  ids.forEach((id) => {
    const n = notes[id];
    const div = document.createElement("div");
    div.className = "note-item";
    div.style.cursor = "pointer";
    const sbInfo = document.createElement("div");
    sbInfo.className = "note-item-info";
    const sbTitle = document.createElement("div");
    sbTitle.className = "note-item-title";
    sbTitle.textContent = n.title || "Untitled";
    const sbDate = document.createElement("div");
    sbDate.className = "note-item-date";
    sbDate.textContent = new Date(n.date).toLocaleDateString();
    sbInfo.appendChild(sbTitle);
    sbInfo.appendChild(sbDate);
    div.appendChild(sbInfo);
    div.addEventListener("click", () => {
      openFull("notes");
      setTimeout(() => openNote(id), 100);
    });
    list.appendChild(div);
  });
}

function newNote() {
  const id = `note_${Date.now()}`;
  notes[id] = { title: "Untitled Note", content: "", date: Date.now() };
  saveNotesToStorage();
  openNote(id);
  renderFpNotesList();
}

function openNote(id) {
  currentNoteId = id;
  const n = notes[id];
  if (!n) return;
  const titleEl = document.getElementById("note-title");
  if (titleEl) titleEl.value = n.title || "";
  if (quill) {
    quill.root.innerHTML = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(n.content || "") : (n.content || "");
  }
  setDeathEl("note-saved", "");
  renderFpNotesList();
}

function saveCurrentNote() {
  if (!currentNoteId) return;
  const titleEl = document.getElementById("note-title");
  notes[currentNoteId].title = titleEl ? titleEl.value || "Untitled" : "Untitled";
  const rawContent = quill ? quill.root.innerHTML : "";
  notes[currentNoteId].content = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(rawContent) : rawContent;
  notes[currentNoteId].date = Date.now();
  saveNotesToStorage();
  renderFpNotesList();
  renderSidebarNotesList();
  
  const c = document.getElementById("note-saved");
  if (c) {
    c.textContent = "✓ Saved";
    setTimeout(() => (c.textContent = ""), 2000);
  }
}

function deleteNote(id) {
  if (!confirm("Delete this note?")) return;
  delete notes[id];
  saveNotesToStorage();
  if (currentNoteId === id) {
    currentNoteId = null;
    const titleEl = document.getElementById("note-title");
    if (titleEl) titleEl.value = "";
    if (quill) quill.root.innerHTML = "";
  }
  renderFpNotesList();
  renderSidebarNotesList();
}

// ── Portfolio Editor ──
function loadPortfolioFields() {
  const d = JSON.parse(localStorage.getItem("lm_portfolio") || "{}");
  ["name", "title", "summary", "github", "linkedin", "medium", "proof", "sk-lang", "sk-tools", "sk-vuln"].forEach((k) => {
    const el = document.getElementById(`pe-${k}`);
    if (el && d[k]) el.value = d[k];
  });
}

function savePortfolio() {
  const d = {};
  ["name", "title", "summary", "github", "linkedin", "medium", "proof", "sk-lang", "sk-tools", "sk-vuln"].forEach((k) => {
    const el = document.getElementById(`pe-${k}`);
    if (el) d[k] = el.value;
  });
  localStorage.setItem("lm_portfolio", JSON.stringify(d));
  const c = document.getElementById("pe-saved");
  if (c) {
    c.textContent = "✓ Saved to browser";
    setTimeout(() => (c.textContent = ""), 2500);
  }
}

function exportPortfolio() {
  const d = JSON.parse(localStorage.getItem("lm_portfolio") || "{}");
  navigator.clipboard.writeText(JSON.stringify(d, null, 2)).then(() => {
    const c = document.getElementById("pe-saved");
    if (c) {
      c.textContent = "✓ Copied to clipboard";
      setTimeout(() => (c.textContent = ""), 2500);
    }
  });
}

// ── DEATH Recon Pipeline Module ──
async function loadDeathDashboard() {
  if (deathLoaded && deathStats) {
    renderDeathStats(deathStats);
    renderDeathFeed(deathItems);
    return;
  }
  await refreshDeathData();

  clearInterval(deathRefreshTimer);
  deathRefreshTimer = setInterval(() => {
    const panel = document.getElementById("fp-death-pipeline");
    if (panel && panel.classList.contains("open")) {
      refreshDeathData();
    } else {
      clearInterval(deathRefreshTimer);
    }
  }, 60000);
}

async function refreshDeathData() {
  setDeathLoading(true);
  try {
    const [statsRes, notifsRes] = await Promise.all([
      fetch(`${WORKER}/death/stats`, { credentials: "include" }),
      fetch(`${WORKER}/death/notifications?limit=100`, { credentials: "include" }),
    ]);

    if (statsRes.ok) {
      deathStats = await statsRes.json();
      renderDeathStats(deathStats);
      renderDeathSidebarStats(deathStats);
    }

    if (notifsRes.ok) {
      const data = await notifsRes.json();
      deathItems = data.items ?? [];
      renderDeathFeed(deathItems);
      renderDeathSidebarFeed(deathItems);
    }

    deathLoaded = true;
  } catch (e) {
    console.error("Death data load error:", e);
  }
  setDeathLoading(false);
  updateDeathLastUpdated();
}

function setDeathLoading(on) {
  const el = document.getElementById("death-feed-loading");
  if (el) el.style.display = on ? "block" : "none";
}

function updateDeathLastUpdated() {
  const el = document.getElementById("death-last-updated");
  if (el) el.textContent = `Updated ${new Date().toLocaleTimeString()}`;
}

function renderDeathStats(s) {
  if (!s) return;
  const scope = s.scope ?? {};
  const findings = s.findings ?? {};
  const notifs = s.notifications ?? {};

  setDeathEl("dstat-bbp-domains", scope.bbpDomains ?? 0);
  setDeathEl("dstat-bbp-wildcards", scope.bbpWildcards ?? 0);
  setDeathEl("dstat-bbp-ips", scope.bbpIPs ?? 0);
  setDeathEl("dstat-subdomains", scope.subdomains ?? 0);
  setDeathEl("dstat-findings", findings.total ?? 0);
  setDeathEl("dstat-findings-bbp", findings.bbp ?? 0);
  setDeathEl("dstat-errors", notifs.errors ?? 0);
  setDeathEl("dstat-notifs", notifs.total ?? 0);

  const bbpTotal = scope.bbpDomains || 1;
  const subTotal = scope.subdomains || 1;
  setDeathBar("dbar-bbp-processed", scope.bbpProcessed ?? 0, bbpTotal);
  setDeathBar("dbar-sub-processed", scope.subProcessed ?? 0, subTotal);
  setDeathEl("dbar-bbp-count", `${(scope.bbpProcessed ?? 0).toLocaleString()} / ${bbpTotal.toLocaleString()}`);
  setDeathEl("dbar-sub-count", `${(scope.subProcessed ?? 0).toLocaleString()} / ${subTotal.toLocaleString()}`);

  renderDeathRunCards(s.runs ?? []);
}

function renderDeathSidebarStats(s) {
  if (!s) return;
  const scope = s.scope ?? {};
  const findings = s.findings ?? {};
  setDeathEl("sidebar-dstat-domains", scope.bbpDomains ?? 0);
  setDeathEl("sidebar-dstat-subs", scope.subdomains ?? 0);
  setDeathEl("sidebar-dstat-findings", findings.total ?? 0);
  setDeathEl("sidebar-dstat-processed", scope.bbpProcessed ?? 0);
}

function setDeathEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = typeof val === "number" ? val.toLocaleString() : val;
}

function setDeathBar(id, val, total) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.min((val / total) * 100, 100).toFixed(1)}%`;
}

function renderDeathRunCards(runs) {
  const container = document.getElementById("death-runs-grid");
  if (!container) return;
  container.innerHTML = "";

  if (!runs.length) {
    container.innerHTML = '<p class="death-empty" style="padding:12px">No recent run data.</p>';
    return;
  }

  for (const r of runs) {
    const name = DEATH_WF_NAMES[r.workflow] ?? r.workflow;
    const cssClass =
      r.status === "in_progress"
        ? "in_progress"
        : r.conclusion === "success"
        ? "success"
        : r.conclusion === "cancelled"
        ? "cancelled"
        : "failure";

    const card = document.createElement("a");
    card.className = `death-run-card ${cssClass}`;
    if (r.url) card.href = r.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    card.innerHTML = `
      <div class="death-run-name">
        <span class="death-run-dot ${cssClass}"></span>
        ${name}
      </div>
      <div class="death-run-meta">${r.status === "in_progress" ? "In Progress" : r.conclusion ?? r.status}</div>
      <div class="death-run-number">#${r.run_number ?? ""}</div>
    `;
    container.appendChild(card);
  }
}

function setDeathFilter(filter, btn) {
  deathFilter = filter;
  document.querySelectorAll(".death-feed-filters .death-filter-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderDeathFeed(deathItems);
}

function renderDeathFeed(items) {
  const container = document.getElementById("death-feed");
  if (!container) return;
  container.innerHTML = "";

  const filtered = deathFilter
    ? items.filter((item) => item.workflow && item.workflow.toLowerCase().includes(deathFilter.toLowerCase()))
    : items;

  if (!filtered.length) {
    container.innerHTML = '<div class="death-empty">No log events match current filter.</div>';
    return;
  }

  filtered.forEach((item) => {
    const entry = document.createElement("div");
    const isFinding = item.type === "finding";
    const isError = item.type === "error";
    entry.className = `death-entry ${isFinding ? "finding" : isError ? "error" : ""}`;

    const tagClass = item.workflow?.includes("bbp") ? "bbp" : item.workflow?.includes("sub") ? "subrecon" : "general";
    const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "";

    entry.innerHTML = `
      <div class="death-entry-top">
        <span class="death-tag-pill ${tagClass}">${item.workflow ?? "system"}</span>
        ${item.type ? `<span class="death-entry-type-badge ${item.type}">${item.type}</span>` : ""}
        <span class="death-entry-time">${timeStr}</span>
      </div>
      <div class="death-entry-text">${item.message ?? ""}</div>
    `;
    container.appendChild(entry);
  });
}

function renderDeathSidebarFeed(items) {
  const container = document.getElementById("sidebar-death-feed");
  if (!container) return;
  container.innerHTML = "";

  const previewItems = items.slice(0, 5);
  if (!previewItems.length) {
    container.innerHTML = '<div class="death-empty" style="padding:10px">No recent logs.</div>';
    return;
  }

  previewItems.forEach((item) => {
    const div = document.createElement("div");
    const isFinding = item.type === "finding";
    const isError = item.type === "error";
    div.className = `death-mini-entry ${isFinding ? "finding" : isError ? "error" : ""}`;
    div.textContent = `[${item.workflow ?? "log"}] ${item.message ?? ""}`;
    container.appendChild(div);
  });
}