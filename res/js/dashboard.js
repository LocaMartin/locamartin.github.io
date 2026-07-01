const WORKER = "https://locamartin-auth.locamartin.workers.dev";
let sidebarOpen = false;
let analyticsLoaded = false;
let deathTimer = null,
  deathTimerFull = null;
let quill = null;
let notes = {}; // { id: {title, content, date} }
let currentNoteId = null;

// ── Init Quill ──
window.addEventListener("load", () => {
  quill = new Quill("#quill-editor", {
    theme: "snow",
    placeholder: "Write your note here…",
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "code-block"],
        ["link"],
        ["clean"],
      ],
    },
  });
  loadNotesFromStorage();
});

// ── Google login ──
async function handleCredentialResponse(response) {
  const res = await fetch(WORKER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: response.credential }),
  });
  const data = await res.json();
  if (data.success) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "block";
    trackPage();
    loadNotesFromStorage();
    renderSidebarNotesList();
  } else {
    alert("Access denied.");
  }
}
function trackPage() {
  fetch(WORKER + "/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page: "/dashboard" }),
  }).catch(() => {});
}

// ── Sidebar ──
function toggleSidebar() {
  sidebarOpen ? closeSidebar() : openSidebar();
}
function openSidebar() {
  sidebarOpen = true;
  document.getElementById("overlay").classList.add("open");
  document.getElementById("sidebar").classList.add("open");
  if (!analyticsLoaded) {
    loadAnalytics();
    analyticsLoaded = true;
  }
}
function closeSidebar() {
  sidebarOpen = false;
  document.getElementById("overlay").classList.remove("open");
  document.getElementById("sidebar").classList.remove("open");
}

// ── Panel switch (sidebar) ──
/*function showPanel(name, evt) {
  document.querySelectorAll(".panel").forEach((p) => {
    p.style.display = "none";
    p.classList.remove("active");
  });
  document
    .querySelectorAll(".nav-item")
    .forEach((b) => b.classList.remove("active"));
  const panel = document.getElementById("panel-" + name);
  panel.style.display = "block";
  panel.classList.add("active");
  if (evt) evt.currentTarget.classList.add("active");
  if (name === "analytics" && !analyticsLoaded) {
    loadAnalytics();
    analyticsLoaded = true;
  }
}*/

function showPanel(name, evt) {
  document.querySelectorAll(".panel").forEach((p) => {
    p.style.display = "none";
    p.classList.remove("active");
  });
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  const panel = document.getElementById("panel-" + name);
  panel.style.display = "block";
  panel.classList.add("active");
  if (evt) evt.currentTarget.classList.add("active");
  if (name === "analytics" && !analyticsLoaded) { loadAnalytics(); analyticsLoaded = true; }
  if (name === "death-pipeline") loadDeathDashboard();       // ← ADD THIS LINE
}

// ── Full-page open/close ──

/*function openFull(name) {
  closeSidebar();
  document.getElementById("fp-" + name).classList.add("open");
  if (name === "analytics") loadAnalyticsFull();
  if (name === "notes") {
    loadNotesFromStorage();
    renderFpNotesList();
  }
  if (name === "portfolio") loadPortfolioFields();
  document.body.style.overflow = "hidden";
}*/

function openFull(name) {
  closeSidebar();
  document.getElementById("fp-" + name).classList.add("open");
  if (name === "analytics")       loadAnalyticsFull();
  if (name === "notes")           { loadNotesFromStorage(); renderFpNotesList(); }
  if (name === "portfolio")       loadPortfolioFields();
  if (name === "death-pipeline")  loadDeathDashboard();      // ← ADD THIS LINE
  document.body.style.overflow = "hidden";
}

function closeFull(name) {
  document.getElementById("fp-" + name).classList.remove("open");
  document.body.style.overflow = "";
}

// ESC key closes any open full-page panel
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document
      .querySelectorAll(".fullpage-panel.open")
      .forEach((p) => p.classList.remove("open"));
    document.body.style.overflow = "";
  }
});

// ── Analytics (sidebar) ──
async function loadAnalytics() {
  document.getElementById("loading-msg").style.display = "block";
  document.getElementById("analytics-content").style.display = "none";
  document.getElementById("error-msg").style.display = "none";
  try {
    const data = await (await fetch(WORKER + "/stats")).json();
    renderAnalytics(data, "total-views", "chart", "top-pages");
    document.getElementById("loading-msg").style.display = "none";
    document.getElementById("analytics-content").style.display = "block";
  } catch (e) {
    document.getElementById("loading-msg").style.display = "none";
    document.getElementById("error-msg").style.display = "block";
  }
}

// ── Analytics (full-page) ──
async function loadAnalyticsFull() {
  try {
    const data = await (await fetch(WORKER + "/stats")).json();
    document.getElementById("fp-total").textContent = data.total || 0;
    const days = data.days || {};
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("fp-today").textContent = days[today] || 0;
    document.getElementById("fp-week").textContent = Object.values(days).reduce(
      (a, b) => a + b,
      0,
    );
    document.getElementById("fp-pages").textContent = Object.keys(
      data.topPages || {},
    ).length;
    renderAnalytics(data, null, "fp-chart", "fp-top-pages");
  } catch (e) {}
}

function renderAnalytics(data, totalId, chartId, pagesId) {
  if (totalId) document.getElementById(totalId).textContent = data.total || 0;
  const chart = document.getElementById(chartId);
  chart.innerHTML = "";
  const days = data.days || {};
  const vals = Object.values(days);
  const maxVal = Math.max(...vals, 1);
  const chartH = chart.offsetHeight || 80;
  Object.entries(days).forEach(([date, count]) => {
    const h = Math.max(
      Math.round((count / maxVal) * (chartH - 14)),
      count > 0 ? 4 : 2,
    );
    // date/count come from our own backend — still use DOM API as defence-in-depth
    const col = document.createElement("div");
    col.className = "bar-col";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = h + "px";
    bar.title = count + " views";
    const lbl = document.createElement("div");
    lbl.className = "bar-label";
    lbl.textContent = date.slice(5);
    col.appendChild(bar);
    col.appendChild(lbl);
    chart.appendChild(col);
  });
  const pagesDiv = document.getElementById(pagesId);
  pagesDiv.innerHTML = "";
  const sorted = Object.entries(data.topPages || {}).sort(
    (a, b) => b[1] - a[1],
  );
  if (!sorted.length) {
    pagesDiv.innerHTML =
      '<p style="color:rgba(255,255,255,0.28);font-size:0.82rem">No data yet.</p>';
    return;
  }
  sorted.forEach(([page, count]) => {
    // fix #1: DOM API instead of innerHTML to prevent Stored XSS
    const row = document.createElement("div");
    row.className = "page-row";
    const nameSpan = document.createElement("span");
    nameSpan.className = "page-name";
    nameSpan.textContent = page; // attacker-controlled — MUST use textContent
    const countSpan = document.createElement("span");
    countSpan.className = "page-count";
    countSpan.textContent = String(count);
    row.appendChild(nameSpan);
    row.appendChild(countSpan);
    pagesDiv.appendChild(row);
  });
}

// ── Death (sidebar) ──
function calcDeath() {
  _calcDeath(
    "dob",
    "sex",
    "lifestyle",
    "death-result",
    "death-date",
    "years-left",
    "countdown",
    deathTimer,
    (t) => (deathTimer = t),
  );
}
function calcDeathFull() {
  _calcDeath(
    "fp-dob",
    "fp-sex",
    "fp-lifestyle",
    "fp-death-result",
    "fp-death-date",
    "fp-years-left",
    "fp-countdown",
    deathTimerFull,
    (t) => (deathTimerFull = t),
  );
}

function _calcDeath(
  dobId,
  sexId,
  lsId,
  resId,
  dateId,
  ylId,
  cdId,
  timer,
  setTimer,
) {
  const dob = document.getElementById(dobId).value;
  const sex = document.getElementById(sexId).value;
  const lifestyle = document.getElementById(lsId).value;
  if (!dob) {
    alert("Please enter your date of birth.");
    return;
  }
  const baseLife = { male: 74, female: 80 };
  const lsAdj = { healthy: 5, average: 0, unhealthy: -8 };
  const expectancy = baseLife[sex] + lsAdj[lifestyle];
  const birth = new Date(dob);
  const deathDate = new Date(birth);
  deathDate.setFullYear(birth.getFullYear() + expectancy);
  const now = new Date();
  const msLeft = deathDate - now;
  if (msLeft <= 0) {
    document.getElementById(dateId).textContent = "Date has passed";
    document.getElementById(ylId).textContent = "";
    document.getElementById(cdId).innerHTML = "";
  } else {
    const yearsLeft = (msLeft / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
    document.getElementById(dateId).textContent = deathDate.toLocaleDateString(
      "en-GB",
      { day: "numeric", month: "long", year: "numeric" },
    );
    document.getElementById(ylId).textContent = `~${yearsLeft} years remaining`;
    if (timer) clearInterval(timer);
    _updateCd(deathDate, cdId);
    setTimer(setInterval(() => _updateCd(deathDate, cdId), 1000));
  }
  document.getElementById(resId).style.display = "block";
}

function _updateCd(target, cdId) {
  const diff = target - new Date();
  if (diff <= 0) return;
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  document.getElementById(cdId).innerHTML = `
    <div class="cd-box"><div class="cd-num">${d.toLocaleString()}</div><div class="cd-label">Days</div></div>
    <div class="cd-box"><div class="cd-num">${h}</div><div class="cd-label">Hours</div></div>
    <div class="cd-box"><div class="cd-num">${m}</div><div class="cd-label">Mins</div></div>
    <div class="cd-box"><div class="cd-num">${s}</div><div class="cd-label">Secs</div></div>`;
}

// ── Notes ──
function loadNotesFromStorage() {
  const raw = localStorage.getItem("lm_notes_v2");
  notes = raw ? JSON.parse(raw) : {};
}
function saveNotesToStorage() {
  localStorage.setItem("lm_notes_v2", JSON.stringify(notes));
}

function renderFpNotesList() {
  const list = document.getElementById("fp-notes-list");
  list.innerHTML = "";
  const ids = Object.keys(notes).sort((a, b) => notes[b].date - notes[a].date);
  if (!ids.length) {
    list.innerHTML =
      '<p style="font-size:0.8rem;color:var(--muted)">No notes yet. Click New.</p>';
    return;
  }
  ids.forEach((id) => {
    const n = notes[id];
    const div = document.createElement("div");
    div.className = "note-item" + (id === currentNoteId ? " active" : "");
    // Safe DOM construction — no innerHTML with user data (fix #2 & #4)
    const info = document.createElement("div");
    info.className = "note-item-info";
    info.style.cursor = "pointer";
    info.addEventListener("click", () => openNote(id));
    const titleDiv = document.createElement("div");
    titleDiv.className = "note-item-title";
    titleDiv.textContent = n.title || "Untitled"; // fix #2: textContent not innerHTML
    const dateDiv = document.createElement("div");
    dateDiv.className = "note-item-date";
    dateDiv.textContent = new Date(n.date).toLocaleDateString();
    info.appendChild(titleDiv);
    info.appendChild(dateDiv);
    const delBtn = document.createElement("button");
    delBtn.className = "note-item-del";
    delBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteNote(id);
    }); // fix #4
    div.appendChild(info);
    div.appendChild(delBtn);
    list.appendChild(div);
  });
}
function renderSidebarNotesList() {
  const list = document.getElementById("sidebar-notes-list");
  if (!list) return;
  list.innerHTML = "";
  const ids = Object.keys(notes)
    .sort((a, b) => notes[b].date - notes[a].date)
    .slice(0, 5);
  if (!ids.length) {
    list.innerHTML =
      '<p style="font-size:0.78rem;color:var(--muted)">No notes yet.</p>';
    return;
  }
  ids.forEach((id) => {
    const n = notes[id];
    const div = document.createElement("div");
    div.className = "note-item";
    div.style.cursor = "pointer";
    // Safe DOM construction (fix #2)
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
    }); // fix #4
    list.appendChild(div);
  });
}
function newNote() {
  const id = "note_" + Date.now();
  notes[id] = { title: "Untitled Note", content: "", date: Date.now() };
  saveNotesToStorage();
  openNote(id);
  renderFpNotesList();
}
function openNote(id) {
  currentNoteId = id;
  const n = notes[id];
  document.getElementById("note-title").value = n.title || "";
  if (quill) quill.root.innerHTML = DOMPurify.sanitize(n.content || ""); // fix #3
  document.getElementById("note-saved").textContent = "";
  renderFpNotesList();
}
function saveCurrentNote() {
  if (!currentNoteId) return;
  notes[currentNoteId].title =
    document.getElementById("note-title").value || "Untitled";
  notes[currentNoteId].content = quill
    ? DOMPurify.sanitize(quill.root.innerHTML)
    : ""; // fix #3
  notes[currentNoteId].date = Date.now();
  saveNotesToStorage();
  renderFpNotesList();
  renderSidebarNotesList();
  const c = document.getElementById("note-saved");
  c.textContent = "✓ Saved";
  setTimeout(() => (c.textContent = ""), 2000);
}
function deleteNote(id) {
  if (!confirm("Delete this note?")) return;
  delete notes[id];
  saveNotesToStorage();
  if (currentNoteId === id) {
    currentNoteId = null;
    document.getElementById("note-title").value = "";
    if (quill) quill.root.innerHTML = ""; // safe: no user data
  }
  renderFpNotesList();
  renderSidebarNotesList();
}

// ── Portfolio editor ──
function loadPortfolioFields() {
  const d = JSON.parse(localStorage.getItem("lm_portfolio") || "{}");
  [
    "name",
    "title",
    "summary",
    "github",
    "linkedin",
    "medium",
    "proof",
    "sk-lang",
    "sk-tools",
    "sk-vuln",
  ].forEach((k) => {
    const el = document.getElementById("pe-" + k);
    if (el && d[k]) el.value = d[k];
  });
}
function savePortfolio() {
  const d = {};
  [
    "name",
    "title",
    "summary",
    "github",
    "linkedin",
    "medium",
    "proof",
    "sk-lang",
    "sk-tools",
    "sk-vuln",
  ].forEach((k) => {
    const el = document.getElementById("pe-" + k);
    if (el) d[k] = el.value;
  });
  localStorage.setItem("lm_portfolio", JSON.stringify(d));
  const c = document.getElementById("pe-saved");
  c.textContent = "✓ Saved to browser";
  setTimeout(() => (c.textContent = ""), 2500);
}
function exportPortfolio() {
  const d = JSON.parse(localStorage.getItem("lm_portfolio") || "{}");
  navigator.clipboard.writeText(JSON.stringify(d, null, 2)).then(() => {
    const c = document.getElementById("pe-saved");
    c.textContent = "✓ Copied to clipboard";
    setTimeout(() => (c.textContent = ""), 2500);
  });
}

// ══════════════════════════════════════════════════════════
// DEATH PROJECT PANEL
// ══════════════════════════════════════════════════════════

let deathFilter     = "";         // active tag filter
let deathItems      = [];         // cached notification items
let deathStats      = null;       // cached stats
let deathLoaded     = false;
let deathRefreshTimer = null;

// Workflow display names
const DEATH_WF_NAMES = {
  "bbscope.yml":           "BBScope Fetcher",
  "nuclei_header_bbp.yml": "Nuclei BBP",
  "nuclei_header_sub.yml": "Nuclei Sub",
  "subrecon.yml":          "Subrecon",
};

// ── Entry point called when full-page panel opens ──
async function loadDeathDashboard() {
  if (deathLoaded && deathStats) {
    renderDeathStats(deathStats);
    renderDeathFeed(deathItems);
    return;
  }
  await refreshDeathData();

  // Auto-refresh every 60 seconds while panel is open
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
      fetch(WORKER + "/death/stats"),
      fetch(WORKER + "/death/notifications?limit=100")
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
  if (el) el.textContent = "Updated " + new Date().toLocaleTimeString();
}

// ── Render stats section ──
function renderDeathStats(s) {
  if (!s) return;
  const scope    = s.scope    ?? {};
  const findings = s.findings ?? {};
  const notifs   = s.notifications ?? {};

  // Stat cards
  setDeathEl("dstat-bbp-domains",   scope.bbpDomains   ?? 0);
  setDeathEl("dstat-bbp-wildcards", scope.bbpWildcards ?? 0);
  setDeathEl("dstat-bbp-ips",       scope.bbpIPs       ?? 0);
  setDeathEl("dstat-subdomains",    scope.subdomains   ?? 0);
  setDeathEl("dstat-findings",      findings.total     ?? 0);
  setDeathEl("dstat-findings-bbp",  findings.bbp       ?? 0);
  setDeathEl("dstat-errors",        notifs.errors      ?? 0);
  setDeathEl("dstat-notifs",        notifs.total       ?? 0);

  // Progress bars
  const bbpTotal = scope.bbpDomains || 1;
  const subTotal = scope.subdomains || 1;
  setDeathBar("dbar-bbp-processed",  scope.bbpProcessed ?? 0, bbpTotal);
  setDeathBar("dbar-sub-processed",  scope.subProcessed ?? 0, subTotal);
  setDeathEl("dbar-bbp-count", `${(scope.bbpProcessed ?? 0).toLocaleString()} / ${bbpTotal.toLocaleString()}`);
  setDeathEl("dbar-sub-count", `${(scope.subProcessed ?? 0).toLocaleString()} / ${subTotal.toLocaleString()}`);

  // Workflow run cards
  renderDeathRunCards(s.runs ?? []);
}

function setDeathEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = typeof val === "number" ? val.toLocaleString() : val;
}

function setDeathBar(id, val, total) {
  const el = document.getElementById(id);
  if (el) el.style.width = (Math.min((val / total) * 100, 100).toFixed(1)) + "%";
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
    const name       = DEATH_WF_NAMES[r.workflow] ?? r.workflow;
    const conclusion = r.conclusion ?? r.status ?? "unknown";
    const cssClass   = r.status === "in_progress" ? "in_progress"
                     : r.conclusion === "success"   ? "success"
                     : r.conclusion === "failure"   ? "failure"
                     : r.conclusion === "cancelled" ? "cancelled"
                     : "unknown";

    const elapsed = r.updated_at
      ? timeAgo(new Date(r.updated_at))
      : "";

    const card = document.createElement("a");
    card.className = `death-run-card ${cssClass}`;
    card.href      = r.html_url ?? "#";
    card.target    = "_blank";
    card.rel       = "noopener";

    const label = r.status === "in_progress" ? "Running"
                : (r.conclusion ?? "Unknown");

    card.innerHTML = `
      <div class="death-run-name">
        <div class="death-run-dot ${cssClass}"></div>
        ${escHtml(name)}
      </div>
      <div class="death-run-meta">${escHtml(label)} · ${escHtml(elapsed)}</div>
      <div class="death-run-number">#${r.run_number ?? "?"}</div>`;
    container.appendChild(card);
  }
}

// ── Render notification feed ──
function renderDeathFeed(items) {
  const feed = document.getElementById("death-feed");
  if (!feed) return;

  const filtered = deathFilter
    ? items.filter(i => i.tag === deathFilter)
    : items;

  feed.innerHTML = "";

  if (!filtered.length) {
    feed.innerHTML = '<div class="death-empty">No notifications yet.<br>Run a workflow to see logs here.</div>';
    return;
  }

  for (const item of filtered) {
    const entry = document.createElement("div");
    entry.className = `death-entry ${item.type ?? "info"}`;

    const time   = item.ts ? new Date(item.ts * 1000).toLocaleString() : "";
    const typeBadge = item.type && item.type !== "info"
      ? `<span class="death-entry-type-badge ${item.type}">${item.type.toUpperCase()}</span>`
      : "";

    // Build top row safely
    const top = document.createElement("div");
    top.className = "death-entry-top";

    const tagPill = document.createElement("span");
    tagPill.className = `death-tag-pill ${item.tag ?? "general"}`;
    tagPill.textContent = item.tag ?? "general";
    top.appendChild(tagPill);

    if (item.type && item.type !== "info") {
      const badge = document.createElement("span");
      badge.className = `death-entry-type-badge ${item.type}`;
      badge.textContent = item.type.toUpperCase();
      top.appendChild(badge);
    }

    const timeEl = document.createElement("span");
    timeEl.className = "death-entry-time";
    timeEl.textContent = time;
    top.appendChild(timeEl);

    // Text body — highlight URLs and domain findings
    const textEl = document.createElement("div");
    textEl.className = "death-entry-text";
    textEl.textContent = item.text ?? "";

    entry.appendChild(top);
    entry.appendChild(textEl);
    feed.appendChild(entry);
  }
}

// ── Sidebar preview ──
function renderDeathSidebarStats(s) {
  const scope    = s?.scope    ?? {};
  const findings = s?.findings ?? {};

  const mn = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof v === "number" ? v.toLocaleString() : v;
  };
  mn("sidebar-dstat-domains",   scope.bbpDomains  ?? 0);
  mn("sidebar-dstat-subs",      scope.subdomains  ?? 0);
  mn("sidebar-dstat-findings",  findings.total    ?? 0);
  mn("sidebar-dstat-processed", scope.bbpProcessed ?? 0);
}

function renderDeathSidebarFeed(items) {
  const feed = document.getElementById("sidebar-death-feed");
  if (!feed) return;
  feed.innerHTML = "";

  const top5 = items.slice(0, 5);
  if (!top5.length) {
    feed.innerHTML = '<div style="font-size:0.75rem;color:var(--muted)">No notifications yet.</div>';
    return;
  }

  for (const item of top5) {
    const div = document.createElement("div");
    div.className = `death-mini-entry ${item.type ?? "info"}`;
    div.textContent = item.text?.split("\n")[0] ?? "";
    div.title = item.text ?? "";
    div.style.cursor = "pointer";
    div.addEventListener("click", () => { openFull("death-pipeline"); });
    feed.appendChild(div);
  }
}

// ── Filter buttons ──
function setDeathFilter(tag, el) {
  deathFilter = tag;
  document.querySelectorAll(".death-filter-btn").forEach(b => b.classList.remove("active"));
  if (el) {
    el.classList.add("active");
    if (tag) el.classList.add(tag);
  }
  renderDeathFeed(deathItems);
}

// ── Delete old notifications ──
async function deleteOldDeathNotifs() {
  if (!confirm("Delete notifications older than 7 days?")) return;
  try {
    const res = await fetch(WORKER + "/death/notifications?older_than=604800", { method: "DELETE" });
    const data = await res.json();
    alert(`Deleted ${data.deleted} old notifications.`);
    await refreshDeathData();
  } catch (e) {
    alert("Delete failed: " + e.message);
  }
}

// ── Utilities ──
function timeAgo(date) {
  const sec = Math.floor((Date.now() - date) / 1000);
  if (sec < 60)   return "just now";
  if (sec < 3600) return Math.floor(sec / 60) + "m ago";
  if (sec < 86400) return Math.floor(sec / 3600) + "h ago";
  return Math.floor(sec / 86400) + "d ago";
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
