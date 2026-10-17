/* ════════════════════════════════════════════════════════════════════════
   templates.js — every sidebar module in one file.

   Each module below registers itself with ModuleRegistry (see sidebar.js
   for the contract). Sections are delimited with a banner comment so you
   can jump straight to the module you're editing:

     ▶ HOME        — overview / launcher
     ▶ DEATH       — pipeline dashboard (scope, scan progress, workflow runs)
     ▶ LOGS        — notification feed, findings/workflow split, bulk delete
     ▶ ANALYTICS   — page-view analytics (unrelated to the recon pipeline)
     ▶ DATABASE    — D1-backed target tree explorer
     ▶ THEME       — appearance settings (accent color, corner roundness)
     ▶ APP         — placeholder (AppKrack)
     ▶ NUKE        — placeholder
     ▶ NOTES       — Quill-based note editor, synced via worker KV
     ▶ RAGEX       — regex-matched wayback URL findings

   Notes' CSS (notes.css) is NOT merged into templates.css — its source
   wasn't available when that file was assembled, and its styling (Quill
   theme overrides, the table-insert grid picker, etc.) is involved enough
   that guessing at it risked a worse result than just leaving it alone.
   notes.css stays its own file; see index.html.
   ════════════════════════════════════════════════════════════════════════ */


/* ┌──────────────────────────────────────────────────────────────────────┐
   │ MODULE: HOME                                                         │
   └──────────────────────────────────────────────────────────────────────┘ */
ModuleRegistry.register({
  id: "home",
  title: "Home",
  description: "Overview and quick launcher",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,

  loadFull(body) {
    body.innerHTML = `
      <div class="home-hero">
        <h2>Internal Operations Control</h2>
        <p>Pick a module to open it fullscreen. Use the ☰ button any time to switch.</p>
      </div>
      <div class="home-grid" id="home-grid"></div>`;
  },

  // built on open so modules attached later still show up
  onOpen() {
    const grid = document.getElementById("home-grid");
    if (!grid) return;
    grid.innerHTML = "";
    window.sidebarEngine.mods
      .filter((m) => m.id !== this.id)
      .forEach((m) => {
        const card = document.createElement("button");
        card.className = "home-card";
        card.innerHTML = `
          <span class="home-card-icon">${m.icon || ""}</span>
          <span class="home-card-title">${Core.esc(m.title)}${m.badge ? ` <span class="badge-pill">${Core.esc(m.badge)}</span>` : ""}</span>
          <span class="home-card-desc">${Core.esc(m.description || "")}</span>`;
        card.addEventListener("click", () => window.sidebarEngine.openFullpage(m.id));
        grid.appendChild(card);
      });
  },
});


/* ┌──────────────────────────────────────────────────────────────────────┐
   │ MODULE: DEATH (pipeline dashboard)                                   │
   └──────────────────────────────────────────────────────────────────────┘ */
ModuleRegistry.register({
  id: "death",
  title: "Death Pipeline",
  description: "Scope, scan progress and latest workflow runs",
  badge: "LIVE",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,

  WF_NAMES: {
    "bbscope.yml": "BBScope Fetcher",
    "nuclei_header_bbp.yml": "Nuclei BBP",
    "nuclei_header_sub.yml": "Nuclei Sub",
    "subrecon.yml": "Subrecon",
  },
  REFRESH_MS: 60000,
  RECENT: 8,
  timer: null,

  loadFull(body, actions) {
    actions.innerHTML = `
      <span class="death-last-updated" id="death-last-updated"></span>
      <button class="death-action-btn" id="death-refresh">↻ Refresh</button>`;
    actions.querySelector("#death-refresh").addEventListener("click", () => this.refresh());

    const stat = (id, label, cls = "") =>
      `<div class="death-stat-card ${cls}"><div class="ds-num" id="ds-${id}">0</div><div class="ds-label">${label}</div></div>`;
    const bar = (id, label) => `
      <div class="death-scope-row">
        <div class="death-scope-label">${label}</div>
        <div class="death-scope-bar-wrap"><div class="death-scope-bar" id="dbar-${id}" style="width:0"></div></div>
        <div class="death-scope-count" id="dbar-${id}-count">0 / 0</div>
      </div>`;

    body.innerHTML = `
      <div class="death-error" id="death-error" hidden></div>
      <div class="death-stats-row">
        ${stat("domains", "BBP Domains")}${stat("wildcards", "Wildcards")}${stat("ips", "BBP IPs")}${stat("subs", "Subdomains")}
        ${stat("findings", "Findings (30d)", "finding")}${stat("findings-bbp", "BBP Findings", "finding")}
        ${stat("errors", "Errors (30d)", "error")}${stat("notifs", "Logs (30d)")}
      </div>
      <div class="death-scope-section">${bar("bbp", "BBP scan")}${bar("sub", "Subrecon roots")}</div>
      <div class="section-title">Workflow Status</div>
      <div class="death-runs-grid" id="death-runs-grid"></div>
      <div class="death-feed-header" style="margin-top:24px">
        <div class="section-title" style="margin:0">Recent Activity</div>
        <button class="death-action-btn" id="death-open-logs" hidden>All logs →</button>
      </div>
      <div class="death-feed" id="death-feed"></div>`;

    const logsBtn = body.querySelector("#death-open-logs");
    if (window.sidebarEngine.find("logs")) {
      logsBtn.hidden = false;
      logsBtn.addEventListener("click", () => window.sidebarEngine.openFullpage("logs"));
    }
  },

  onOpen() {
    this.refresh();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.refresh(), this.REFRESH_MS);
  },
  onClose() { clearInterval(this.timer); },

  showError(msg) {
    const el = document.getElementById("death-error");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
  },

  async refresh() {
    try {
      const [s, n] = await Promise.all([
        Core.api("/death/stats"),
        Core.api(`/death/notifications?limit=${this.RECENT}`),
      ]);
      if (!s.ok) {
        const err = await s.json().catch(() => ({}));
        throw new Error(err.error || `Stats request failed (HTTP ${s.status})`);
      }
      this.renderStats(await s.json());
      this.renderRecent(n.ok ? (await n.json()).items ?? [] : []);
      this.showError("");
      Core.setText("death-last-updated", `Updated ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      console.error("[death]", e);
      this.showError(e.message);
    }
  },

  renderStats(s) {
    const sc = s.scope ?? {}, f = s.findings ?? {}, n = s.notifications ?? {};
    Core.setText("ds-domains", sc.bbpDomains ?? 0);
    Core.setText("ds-wildcards", sc.bbpWildcards ?? 0);
    Core.setText("ds-ips", sc.bbpIPs ?? 0);
    Core.setText("ds-subs", sc.subdomains ?? 0);
    Core.setText("ds-findings", f.total ?? 0);
    Core.setText("ds-findings-bbp", f.bbp ?? 0);
    Core.setText("ds-errors", n.errors ?? 0);
    Core.setText("ds-notifs", n.total ?? 0);
    this.setBar("bbp", sc.bbpProcessed ?? 0, sc.bbpTotal || sc.bbpDomains || 0);
    this.setBar("sub", sc.subRootsProcessed ?? 0, sc.subRootsTotal || 0);
    this.renderRuns(s.runs ?? []);
  },

  setBar(id, val, total) {
    const pct = total ? Math.min((val / total) * 100, 100) : 0;
    const el = document.getElementById(`dbar-${id}`);
    if (el) el.style.width = `${pct.toFixed(1)}%`;
    Core.setText(`dbar-${id}-count`, `${val.toLocaleString()} / ${total.toLocaleString()}`);
  },

  renderRuns(runs) {
    const box = document.getElementById("death-runs-grid");
    if (!box) return;
    if (!runs.length) { box.innerHTML = `<p class="muted-note">No run data.</p>`; return; }
    box.innerHTML = runs.map((r) => {
      const name = Core.esc(this.WF_NAMES[r.workflow] ?? r.workflow);
      if (r.run === null) {
        return `<div class="death-run-card cancelled"><div class="death-run-name"><span class="death-run-dot cancelled"></span>${name}</div><div class="death-run-meta">No runs found</div></div>`;
      }
      const cls = r.status === "in_progress" ? "in_progress" : r.conclusion === "success" ? "success" : r.conclusion === "cancelled" ? "cancelled" : "failure";
      const label = r.status === "in_progress" ? "In progress" : r.conclusion ?? r.status;
      const link = /^https:\/\//.test(r.html_url || "") ? ` href="${Core.esc(r.html_url)}"` : "";
      return `<a class="death-run-card ${cls}"${link} target="_blank" rel="noopener noreferrer">
        <div class="death-run-name"><span class="death-run-dot ${cls}"></span>${name}</div>
        <div class="death-run-meta">${Core.esc(label)}</div>
        <div class="death-run-number">#${Core.esc(r.run_number ?? "")}</div></a>`;
    }).join("");
  },

  renderRecent(items) {
    const box = document.getElementById("death-feed");
    if (!box) return;
    if (!items.length) { box.innerHTML = `<div class="death-empty">No log events yet.</div>`; return; }
    box.innerHTML = items.map((i) => {
      const kind = ["finding", "error", "cancelled", "success"].includes(i.type) ? i.type : "";
      const tag = ["bbp", "sub", "subrecon", "bbscope", "cleanup"].includes(i.tag) ? i.tag : "general";
      const time = i.ts ? new Date(i.ts * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
      return `<div class="death-entry ${kind}">
        <div class="death-entry-top">
          <span class="death-tag-pill ${tag}">${Core.esc(i.tag)}</span>
          ${i.type ? `<span class="death-entry-type-badge ${Core.esc(i.type)}">${Core.esc(i.type)}</span>` : ""}
          <span class="death-entry-time">${time}</span>
        </div>
        <div class="death-entry-text">${Core.esc(i.text)}</div></div>`;
    }).join("");
  },
});


/* ┌──────────────────────────────────────────────────────────────────────┐
   │ MODULE: LOGS                                                         │
   └──────────────────────────────────────────────────────────────────────┘ */
ModuleRegistry.register({
  id: "logs",
  title: "Logs",
  description: "Workflow logs from bbscope, subrecon, nuclei and cleanup",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,

  TAGS: [["", "All"], ["bbp", "BBP"], ["sub", "Sub"], ["subrecon", "Subrecon"], ["bbscope", "BBScope"], ["cleanup", "Cleanup"]],
  TYPES: [["", "All types"], ["error", "Errors"], ["success", "Success"], ["info", "Info"], ["cancelled", "Cancelled"]],
  CATEGORIES: [["", "All"], ["finding", "Findings"], ["workflow", "Workflow Logs"]],
  RANGES: [
    ["1w", "1 week", 7],
    ["1m", "1 month", 30],
    ["3m", "3 months", 90],
    ["6m", "6 months", 180],
    ["1y", "1 year", 365],
  ],
  AUTO_MS: 15000,

  tag: "",
  type: "",
  category: "",
  query: "",
  items: [],
  selected: new Set(),
  timer: null,

  loadFull(body, actions) {
    actions.innerHTML = `
      <span class="logs-count" id="logs-count"></span>
      <label class="logs-auto"><input type="checkbox" id="logs-auto"> Auto</label>
      <button class="death-action-btn" id="logs-export" title="Download the visible logs">⭳ Export</button>
      <button class="death-action-btn" id="logs-refresh">↻ Refresh</button>`;

    const chips = (list, attr) => list
      .map(([v, l], i) => `<button class="logs-chip${i === 0 ? " active" : ""}" data-${attr}="${v}">${l}</button>`)
      .join("");

    const rangeOptions = this.RANGES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");

    body.innerHTML = `
      <div class="logs-toolbar">
        <input type="search" id="logs-search" class="logs-search" placeholder="Search logs…" autocomplete="off">
        <div class="logs-chips" id="logs-categories">${chips(this.CATEGORIES, "category")}</div>
        <div class="logs-chips" id="logs-tags">${chips(this.TAGS, "tag")}</div>
        <div class="logs-chips" id="logs-types">${chips(this.TYPES, "type")}</div>
      </div>
      <div class="logs-bulk-bar" id="logs-bulk-bar">
        <label class="logs-select-all">
          <input type="checkbox" id="logs-select-all"> Select all visible
        </label>
        <span class="logs-selected-count" id="logs-selected-count"></span>
        <button class="death-action-btn logs-danger" id="logs-delete-selected" disabled>Delete selected</button>
        <span class="logs-bulk-sep">·</span>
        <label for="logs-range-select">Older than</label>
        <select id="logs-range-select">${rangeOptions}</select>
        <button class="death-action-btn logs-danger" id="logs-delete-range">Delete matching range</button>
      </div>
      <div class="logs-error" id="logs-error" hidden></div>
      <div class="logs-list" id="logs-list"></div>`;

    actions.querySelector("#logs-refresh").addEventListener("click", () => this.refresh());
    actions.querySelector("#logs-export").addEventListener("click", () => this.exportVisible());
    actions.querySelector("#logs-auto").addEventListener("change", (e) => this.setAuto(e.target.checked));

    body.querySelector("#logs-categories").addEventListener("click", (e) => {
      const b = e.target.closest("[data-category]");
      if (!b) return;
      this.category = b.dataset.category;
      this.mark("#logs-categories", b);
      this.render();
    });
    body.querySelector("#logs-tags").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tag]");
      if (!b) return;
      this.tag = b.dataset.tag;
      this.mark("#logs-tags", b);
      this.refresh();                       // tag is filtered server-side
    });
    body.querySelector("#logs-types").addEventListener("click", (e) => {
      const b = e.target.closest("[data-type]");
      if (!b) return;
      this.type = b.dataset.type;
      this.mark("#logs-types", b);
      this.render();
    });
    body.querySelector("#logs-search").addEventListener("input", (e) => {
      this.query = e.target.value.trim().toLowerCase();
      this.render();
    });
    body.querySelector("#logs-list").addEventListener("click", (e) => {
      if (e.target.closest(".log-checkbox")) return;  // don't expand when hitting the checkbox
      const row = e.target.closest(".log-row");
      if (row) row.classList.toggle("expanded");
    });
    body.querySelector("#logs-list").addEventListener("change", (e) => {
      const cb = e.target.closest(".log-checkbox");
      if (!cb) return;
      if (cb.checked) this.selected.add(cb.dataset.id);
      else this.selected.delete(cb.dataset.id);
      this.updateBulkBar();
    });
    body.querySelector("#logs-select-all").addEventListener("change", (e) => {
      const ids = this.visible().map((i) => i.key);
      if (e.target.checked) ids.forEach((id) => this.selected.add(id));
      else ids.forEach((id) => this.selected.delete(id));
      this.render();
    });
    body.querySelector("#logs-delete-selected").addEventListener("click", () => this.deleteSelected());
    body.querySelector("#logs-delete-range").addEventListener("click", () => this.deleteByRange());
  },

  onOpen() { this.refresh(); },
  onClose() { this.setAuto(false); const c = document.getElementById("logs-auto"); if (c) c.checked = false; },

  mark(sel, btn) {
    document.querySelectorAll(`${sel} .logs-chip`).forEach((b) => b.classList.toggle("active", b === btn));
  },

  setAuto(on) {
    clearInterval(this.timer);
    if (on) this.timer = setInterval(() => this.refresh(), this.AUTO_MS);
  },

  async refresh() {
    const err = document.getElementById("logs-error");
    try {
      const res = await Core.api(`/death/notifications?limit=500${this.tag ? `&tag=${encodeURIComponent(this.tag)}` : ""}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (HTTP ${res.status})`);
      }
      this.items = (await res.json()).items ?? [];
      this.selected.clear();
      err.hidden = true;
      this.render();
    } catch (e) {
      console.error("[logs]", e);
      err.hidden = false;
      err.textContent = e.message;
    }
  },

  visible() {
    return this.items.filter((i) => {
      const cat = i.type === "finding" ? "finding" : "workflow";
      return (!this.category || cat === this.category) &&
        (!this.type || i.type === this.type) &&
        (!this.query || `${i.tag} ${i.type} ${i.text}`.toLowerCase().includes(this.query));
    });
  },

  fmt(ts) {
    return new Date(ts * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  },

  render() {
    const list = document.getElementById("logs-list");
    if (!list) return;
    const rows = this.visible();
    Core.setText("logs-count", `${rows.length} / ${this.items.length}`);
    if (!rows.length) {
      list.innerHTML = `<div class="logs-empty">No logs match the current filters.</div>`;
      this.updateBulkBar();
      return;
    }
    list.innerHTML = rows.map((i) => {
      const type = ["finding", "error", "cancelled", "success"].includes(i.type) ? i.type : "info";
      const long = i.text.length > 220 || i.text.includes("\n");
      const id = i.key;
      const checked = this.selected.has(id) ? " checked" : "";
      return `<div class="log-row ${type}${long ? " collapsible" : ""}">
        <label class="log-checkbox-wrap"><input type="checkbox" class="log-checkbox" data-id="${Core.esc(id)}"${checked}></label>
        <div class="log-meta">
          <span class="log-time">${this.fmt(i.ts)}</span>
          <span class="log-tag">${Core.esc(i.tag)}</span>
          <span class="log-type">${type}</span>
        </div>
        <div class="log-text">${Core.esc(i.text)}</div>
      </div>`;
    }).join("");

    const allIds = rows.map((i) => i.key);
    const selectAll = document.getElementById("logs-select-all");
    if (selectAll) selectAll.checked = allIds.length > 0 && allIds.every((id) => this.selected.has(id));
    this.updateBulkBar();
  },

  updateBulkBar() {
    const count = this.selected.size;
    Core.setText("logs-selected-count", count ? `${count} selected` : "");
    const delBtn = document.getElementById("logs-delete-selected");
    if (delBtn) delBtn.disabled = count === 0;
  },

  async deleteSelected() {
    if (!this.selected.size) return;
    const keys = [...this.selected];
    if (!confirm(`Delete ${keys.length} selected log${keys.length === 1 ? "" : "s"}? This cannot be undone.`)) return;

    const err = document.getElementById("logs-error");
    try {
      const res = await Core.api("/death/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (HTTP ${res.status})`);
      }
      this.items = this.items.filter((i) => !keys.includes(i.key));
      this.selected.clear();
      err.hidden = true;
      this.render();
    } catch (e) {
      console.error("[logs] delete", e);
      err.hidden = false;
      err.textContent = e.message;
    }
  },

  async deleteByRange() {
    const sel = document.getElementById("logs-range-select");
    const [, label, days] = this.RANGES.find(([v]) => v === sel.value) || [];
    if (!days) return;
    const olderThanSeconds = days * 86400;
    const cutoff = Math.floor(Date.now() / 1000) - olderThanSeconds;

    const visibleMatch = this.visible().filter((i) => i.ts < cutoff);
    if (!visibleMatch.length) { alert("No visible logs are older than that range."); return; }

    let warning = "";
    if (this.query) warning = "\n\nNote: your search text won't be applied server-side — this deletes by tag/category/age only, which may remove more than what's currently filtered by search.";
    if (!confirm(`Delete logs older than ${label}${this.tag ? ` (tag: ${this.tag})` : ""}${this.type ? ` (type: ${this.type})` : this.category ? ` (category: ${this.category})` : ""}? This cannot be undone.${warning}`)) return;

    const params = new URLSearchParams({ older_than: String(olderThanSeconds) });
    if (this.tag) params.set("tag", this.tag);
    if (this.type) {
      params.set("type", this.type);
    } else if (this.category === "finding") {
      params.set("type", "finding");
    } else if (this.category === "workflow") {
      params.set("exclude_type", "finding");
    }

    const err = document.getElementById("logs-error");
    try {
      const res = await Core.api(`/death/notifications?${params}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (HTTP ${res.status})`);
      }
      const { deleted } = await res.json();
      err.hidden = true;
      this.selected.clear();
      await this.refresh();
      Core.flash("logs-selected-count", `Deleted ${deleted}`);
    } catch (e) {
      console.error("[logs] deleteByRange", e);
      err.hidden = false;
      err.textContent = e.message;
    }
  },

  exportVisible() {
    const rows = this.visible();
    if (!rows.length) return;
    const text = rows.map((i) => `[${new Date(i.ts * 1000).toISOString()}] [${i.tag}] [${i.type}] ${i.text.replace(/\n/g, " | ")}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `death-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
});


/* ┌──────────────────────────────────────────────────────────────────────┐
   │ MODULE: ANALYTICS (page-view analytics — unrelated to the recon      │
   │ pipeline; hits /stats, not /death/stats)                             │
   └──────────────────────────────────────────────────────────────────────┘ */
ModuleRegistry.register({
  id: "analytics",
  title: "Analytics",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  description: "Page views and traffic",

  data: null,

  async fetchStats(force = false) {
    if (this.data && !force) return this.data;
    const res = await Core.api("/stats");
    if (!res.ok) throw new Error(`stats ${res.status}`);
    return (this.data = await res.json());
  },

  loadFull(body) {
    body.innerHTML = `
      <div class="analytics-grid">
        <div class="stat-card"><div class="num" id="an-fp-total">0</div><div class="label">Total Views</div></div>
        <div class="stat-card"><div class="num" id="an-fp-today">0</div><div class="label">Today</div></div>
        <div class="stat-card"><div class="num" id="an-fp-week">0</div><div class="label">This Week</div></div>
        <div class="stat-card"><div class="num" id="an-fp-pages">0</div><div class="label">Unique Pages</div></div>
      </div>
      <div class="chart-wrap" id="an-fp-chart" style="height:200px;margin:24px 0"></div>
      <div class="section-title">All Tracked Pages</div>
      <div id="an-fp-list"></div>`;
  },

  async onOpen() {
    try {
      const d = await this.fetchStats(true);
      const days = d.days || {};
      const today = new Date().toISOString().slice(0, 10);
      Core.setText("an-fp-total", d.total || 0);
      Core.setText("an-fp-today", days[today] || 0);
      Core.setText("an-fp-week", Object.values(days).reduce((a, b) => a + b, 0));
      Core.setText("an-fp-pages", Object.keys(d.topPages || {}).length);
      this.renderChart(document.getElementById("an-fp-chart"), d, 200);
      this.renderPages(document.getElementById("an-fp-list"), d);
    } catch (e) { console.error("[analytics]", e); }
  },

  renderChart(el, data, height) {
    if (!el) return;
    el.innerHTML = "";
    const entries = Object.entries(data.days || {});
    const max = Math.max(...entries.map(([, c]) => c), 1);
    entries.forEach(([date, count]) => {
      const h = Math.max(Math.round((count / max) * (height - 14)), count > 0 ? 4 : 2);
      const col = document.createElement("div");
      col.className = "bar-col";
      col.innerHTML = `<div class="bar" style="height:${h}px" title="${count} views"></div><div class="bar-label">${Core.esc(date.slice(5))}</div>`;
      el.appendChild(col);
    });
  },

  renderPages(el, data) {
    if (!el) return;
    const sorted = Object.entries(data.topPages || {}).sort((a, b) => b[1] - a[1]);
    el.innerHTML = sorted.length
      ? sorted.map(([p, c]) => `<div class="page-row"><span class="page-name">${Core.esc(p)}</span><span class="page-count">${Core.esc(c)}</span></div>`).join("")
      : `<p class="muted-note">No data yet.</p>`;
  },
});


/* ┌──────────────────────────────────────────────────────────────────────┐
   │ MODULE: NOTES (Quill editor, saved as Quill Delta JSON via worker KV)│
   └──────────────────────────────────────────────────────────────────────┘ */
ModuleRegistry.register({
  id: "notes",
  title: "Notes",
  description: "Synced notes with tables, checklists and highlights",
  flush: true,
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,

  SAVE_DELAY: 1200,
  LOCAL_KEY: "lm_notes_v2",              // where notes lived before (browser only)
  MIGRATED_KEY: "lm_notes_migrated_v1",
  GRID: { cols: 10, rows: 8 },
  EMPTY: { ops: [{ insert: "\n" }] },

  list: [],          // [{id,title,updated}]
  current: null,     // id of the open note
  quill: null,
  dirty: false,
  rev: 0,            // bumps on every edit, so a save can tell if newer edits arrived
  saveTimer: null,
  filter: "",

  $(id) { return document.getElementById(id); },

  // ───────────────────────── layout ─────────────────────────
  loadFull(body, actions) {
    actions.innerHTML = `
      <span class="nt-status" id="nt-status"></span>
      <button class="btn-primary" id="nt-save" hidden>Save</button>`;

    const swatch = ["#fde047", "#86efac", "#93c5fd", "#f9a8d4", "#fdba74", "#c4b5fd"]
      .map((c) => `<option value="${c}"></option>`).join("");

    body.innerHTML = `
      <div class="notes-layout" id="nt-layout">
        <aside class="notes-side">
          <div class="notes-side-head">
            <input type="search" id="nt-search" class="notes-search" placeholder="Search notes…" autocomplete="off">
            <button class="new-note-btn" id="nt-new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New
            </button>
          </div>
          <div class="notes-list" id="nt-list"></div>
        </aside>

        <section class="notes-main">
          <div class="notes-empty" id="nt-empty">Select a note, or create a new one.</div>
          <div class="notes-editor" id="nt-editor" hidden>
            <div class="note-top">
              <button class="nt-back" id="nt-back" aria-label="Back to notes">←</button>
              <input type="text" id="nt-title" class="note-title-input" placeholder="Note title…" maxlength="200">
            </div>

            <div class="nt-toolbar-wrap">
              <div id="nt-toolbar">
                <span class="ql-formats">
                  <select class="ql-header"><option value="1"></option><option value="2"></option><option value="3"></option><option selected></option></select>
                </span>
                <span class="ql-formats">
                  <button class="ql-bold"></button><button class="ql-italic"></button><button class="ql-underline"></button><button class="ql-strike"></button>
                </span>
                <span class="ql-formats">
                  <select class="ql-color" title="Text colour"></select>
                  <select class="ql-background" title="Highlight"><option selected></option>${swatch}</select>
                </span>
                <span class="ql-formats">
                  <button class="ql-list" value="check" title="Checklist"></button>
                  <button class="ql-list" value="bullet"></button>
                  <button class="ql-list" value="ordered"></button>
                </span>
                <span class="ql-formats">
                  <button class="ql-blockquote"></button><button class="ql-code-block"></button><button class="ql-link"></button>
                </span>
                <span class="ql-formats">
                  <button type="button" class="nt-table-btn" id="nt-table-btn" title="Insert table">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="1.5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>
                  </button>
                  <button class="ql-clean" title="Clear formatting"></button>
                </span>
              </div>
              <div class="nt-grid-pop" id="nt-grid-pop" hidden>
                <div class="nt-grid" id="nt-grid"></div>
                <div class="nt-grid-label" id="nt-grid-label">Insert table</div>
              </div>
            </div>

            <div class="nt-table-tools" id="nt-table-tools" hidden>
              <span>Table</span>
              <button data-tbl="insertRowAbove">+ Row above</button>
              <button data-tbl="insertRowBelow">+ Row below</button>
              <button data-tbl="insertColumnLeft">+ Col left</button>
              <button data-tbl="insertColumnRight">+ Col right</button>
              <button data-tbl="deleteRow" class="danger">− Row</button>
              <button data-tbl="deleteColumn" class="danger">− Col</button>
              <button data-tbl="deleteTable" class="danger">Delete table</button>
            </div>

            <div id="nt-quill"></div>
          </div>
        </section>
      </div>`;

    if (!window.Quill) {
      this.$("nt-empty").textContent = "The editor library failed to load (check your connection / ad-blocker).";
      return;
    }

    this.quill = new Quill("#nt-quill", {
      theme: "snow",
      placeholder: "Write your note…",
      modules: { toolbar: "#nt-toolbar", table: true, history: { userOnly: true } },
    });

    this.buildGrid();
    this.bind(body, actions);
  },

  bind(body, actions) {
    this.$("nt-new").addEventListener("click", () => this.newNote());
    this.$("nt-save").addEventListener("click", () => this.save());
    this.$("nt-back").addEventListener("click", () => this.closeEditor());
    this.$("nt-search").addEventListener("input", (e) => { this.filter = e.target.value.trim().toLowerCase(); this.renderList(); });
    this.$("nt-title").addEventListener("input", () => this.markDirty());

    this.quill.on("text-change", (_d, _o, source) => { if (source === "user") this.markDirty(); });
    this.quill.on("editor-change", () => this.updateTableTools());

    this.$("nt-table-tools").addEventListener("mousedown", (e) => e.preventDefault());
    this.$("nt-table-tools").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tbl]");
      if (!b) return;
      const fn = b.dataset.tbl;
      this.quill.getModule("table")[fn]();
      this.markDirty();
      this.updateTableTools();
    });

    body.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); this.save(); }
    });
    // close the table picker when clicking elsewhere
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#nt-table-btn") && !e.target.closest("#nt-grid-pop")) this.$("nt-grid-pop").hidden = true;
    });
    window.addEventListener("beforeunload", (e) => {
      if (this.dirty) { e.preventDefault(); e.returnValue = ""; }
    });
  },

  // ───────────────────────── table picker ─────────────────────────
  buildGrid() {
    const { cols, rows } = this.GRID;
    const grid = this.$("nt-grid");
    grid.style.gridTemplateColumns = `repeat(${cols}, 18px)`;
    grid.innerHTML = Array.from({ length: cols * rows }, (_, i) =>
      `<div class="nt-cell" data-r="${Math.floor(i / cols) + 1}" data-c="${(i % cols) + 1}"></div>`).join("");

    const paint = (r, c) => {
      grid.querySelectorAll(".nt-cell").forEach((cell) =>
        cell.classList.toggle("on", +cell.dataset.r <= r && +cell.dataset.c <= c));
      this.$("nt-grid-label").textContent = r ? `${c} × ${r}  (columns × rows)` : "Insert table";
    };
    grid.addEventListener("mouseover", (e) => { const c = e.target.closest(".nt-cell"); if (c) paint(+c.dataset.r, +c.dataset.c); });
    grid.addEventListener("mouseleave", () => paint(0, 0));
    grid.addEventListener("click", (e) => {
      const c = e.target.closest(".nt-cell");
      if (!c) return;
      this.insertTable(+c.dataset.r, +c.dataset.c);
    });

    this.$("nt-table-btn").addEventListener("click", () => {
      const pop = this.$("nt-grid-pop");
      pop.hidden = !pop.hidden;
      paint(0, 0);
    });
  },

  insertTable(rows, cols) {
    this.$("nt-grid-pop").hidden = true;
    const q = this.quill;
    const Delta = Quill.import("delta");
    q.focus();
    const range = q.getSelection(true);
    let at = range.index;

    // Quill turns the current line into the first cell, so when the line has text
    // put the table on the line below it instead (adding one if this is the last line).
    const [line] = q.getLine(range.index);
    if (line && line.length() > 1) {
      at = q.getIndex(line) + line.length();
      if (!line.next) q.updateContents(new Delta().retain(at).insert("\n"), "user");
    }
    q.setSelection(at, 0, "silent");
    q.getModule("table").insertTable(rows, cols);

    // keep a normal paragraph after the table so there is always somewhere to type
    if (at + rows * cols >= q.getLength()) q.updateContents(new Delta().retain(q.getLength()).insert("\n"), "user");
    q.setSelection(at, 0, "user");
    this.markDirty();
    this.updateTableTools();
  },

  updateTableTools() {
    const tools = this.$("nt-table-tools");
    if (!tools || !this.quill) return;
    let inTable = false;
    try {
      const range = this.quill.getSelection();
      inTable = !!range && !!this.quill.getModule("table").getTable(range)[0];
    } catch { /* selection not ready */ }
    tools.hidden = !inTable;
  },

  // ───────────────────────── status / saving ─────────────────────────
  setStatus(text, kind = "") {
    const el = this.$("nt-status");
    if (!el) return;
    el.textContent = text;
    el.className = `nt-status ${kind}`;
  },

  markDirty() {
    if (!this.current) return;
    this.dirty = true;
    this.rev++;
    this.setStatus("Unsaved changes…");
    const btn = this.$("nt-save");
    if (btn) btn.hidden = false;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), this.SAVE_DELAY);
  },

  /** Returns true if the note is saved (or there was nothing to save). */
  async save() {
    if (!this.current || !this.dirty) return true;
    clearTimeout(this.saveTimer);
    const id = this.current;
    const rev = this.rev;
    const title = this.$("nt-title").value.trim() || "Untitled";
    this.setStatus("Saving…");
    try {
      const res = await Core.api(`/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: this.quill.getContents() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);

      const entry = this.list.find((n) => n.id === id);
      if (entry) { entry.title = title; entry.updated = j.updated; }
      this.list.sort((a, b) => b.updated - a.updated);
      this.renderList();

      if (rev === this.rev) {                 // nothing typed while we were saving
        this.dirty = false;
        this.$("nt-save").hidden = true;
        this.setStatus("Saved ✓", "ok");
      } else {
        this.saveTimer = setTimeout(() => this.save(), 300);
      }
      return true;
    } catch (e) {
      console.error("[notes] save failed", e);
      this.setStatus(`Save failed: ${e.message}`, "err");
      return false;
    }
  },

  // ───────────────────────── list / open / delete ─────────────────────────
  async onOpen() {
    if (!this.quill) return;
    await this.loadList();
    await this.migrateLocal();
  },

  async onClose() {
    if (this.dirty) await this.save();
  },

  async loadList() {
    const box = this.$("nt-list");
    try {
      const res = await Core.api("/notes");
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      this.list = j.notes ?? [];
      this.renderList();
    } catch (e) {
      console.error("[notes] list failed", e);
      box.innerHTML = `<div class="notes-error">Couldn't load notes: ${Core.esc(e.message)}</div>`;
    }
  },

  renderList() {
    const box = this.$("nt-list");
    if (!box) return;
    const rows = this.list.filter((n) => !this.filter || n.title.toLowerCase().includes(this.filter));
    if (!rows.length) {
      box.innerHTML = `<p class="muted-note" style="padding:10px">${this.list.length ? "No matches." : "No notes yet. Click New."}</p>`;
      return;
    }
    box.innerHTML = "";
    rows.forEach((n) => {
      const row = document.createElement("div");
      row.className = "note-item" + (n.id === this.current ? " active" : "");
      row.innerHTML = `
        <div class="note-item-info">
          <div class="note-item-title">${Core.esc(n.title || "Untitled")}</div>
          <div class="note-item-date">${n.updated ? new Date(n.updated).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
        </div>
        <button class="note-item-del" aria-label="Delete note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>`;
      row.addEventListener("click", () => this.openNote(n.id));
      row.querySelector(".note-item-del").addEventListener("click", (e) => { e.stopPropagation(); this.deleteNote(n.id); });
      box.appendChild(row);
    });
  },

  showEditor(on) {
    this.$("nt-editor").hidden = !on;
    this.$("nt-empty").hidden = on;
    this.$("nt-layout").classList.toggle("editing", on);
  },

  closeEditor() {
    if (this.dirty) this.save();
    this.current = null;
    this.showEditor(false);
    this.renderList();
  },

  async openNote(id) {
    if (id === this.current) { this.showEditor(true); return; }
    if (this.dirty && !(await this.save()) && !confirm("This note couldn't be saved. Discard your changes?")) return;

    this.setStatus("Loading…");
    try {
      const res = await Core.api(`/notes/${id}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);

      this.current = id;
      this.$("nt-title").value = j.note.title || "";
      this.quill.setContents(j.note.content?.ops ? j.note.content : this.EMPTY, "silent");
      this.quill.history.clear();
      this.dirty = false;
      this.$("nt-save").hidden = true;
      this.setStatus("");
      this.showEditor(true);
      this.renderList();
    } catch (e) {
      this.setStatus(`Couldn't open note: ${e.message}`, "err");
    }
  },

  async newNote() {
    if (this.dirty && !(await this.save()) && !confirm("This note couldn't be saved. Discard your changes?")) return;
    const id = `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    this.setStatus("Creating…");
    try {
      const res = await Core.api(`/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled note", content: this.EMPTY }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      this.list.unshift({ id, title: "Untitled note", updated: j.updated });
      this.current = null;                    // force a clean load
      await this.openNote(id);
      this.$("nt-title").focus();
      this.$("nt-title").select();
    } catch (e) {
      this.setStatus(`Couldn't create note: ${e.message}`, "err");
    }
  },

  async deleteNote(id) {
    const n = this.list.find((x) => x.id === id);
    if (!confirm(`Delete "${n?.title || "this note"}"? This can't be undone.`)) return;
    try {
      const res = await Core.api(`/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.list = this.list.filter((x) => x.id !== id);
      if (this.current === id) {
        this.current = null;
        this.dirty = false;
        clearTimeout(this.saveTimer);
        this.$("nt-save").hidden = true;
        this.showEditor(false);
      }
      this.renderList();
      this.setStatus("");
    } catch (e) {
      this.setStatus(`Delete failed: ${e.message}`, "err");
    }
  },

  // ───────────────── one-time import of notes stored in this browser ─────────────────
  async migrateLocal() {
    if (localStorage.getItem(this.MIGRATED_KEY)) return;
    let local = {};
    try { local = JSON.parse(localStorage.getItem(this.LOCAL_KEY) || "{}"); } catch { return; }
    const known = new Set(this.list.map((n) => n.id));
    const todo = Object.entries(local)
      .filter(([id, n]) => /^[A-Za-z0-9_-]{1,40}$/.test(id) && !known.has(id) && n)
      .sort((a, b) => (a[1].date || 0) - (b[1].date || 0));      // oldest first, so the newest stays on top

    if (!todo.length) { localStorage.setItem(this.MIGRATED_KEY, "1"); return; }
    this.setStatus(`Importing ${todo.length} note(s) from this browser…`);
    let done = 0;
    for (const [id, n] of todo) {
      try {
        const html = window.DOMPurify ? DOMPurify.sanitize(n.content || "") : "";
        const delta = JSON.parse(JSON.stringify(this.quill.clipboard.convert({ html })));
        const res = await Core.api(`/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: n.title || "Untitled", content: delta.ops?.length ? delta : this.EMPTY }),
        });
        if (res.ok) done++;
      } catch (e) { console.error("[notes] import failed for", id, e); }
    }
    if (done === todo.length) localStorage.setItem(this.MIGRATED_KEY, "1");   // your local copy is left untouched
    this.setStatus(`Imported ${done} of ${todo.length} note(s) ✓`, done === todo.length ? "ok" : "err");
    await this.loadList();
  },
});


/* ┌──────────────────────────────────────────────────────────────────────┐
   │ MODULE: DATABASE (D1-backed target tree explorer)                    │
   └──────────────────────────────────────────────────────────────────────┘ */
ModuleRegistry.register({
  id: "database",
  title: "Database",
  description: "In-scope targets: domains and app links, by platform",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  flush: true,

  currentPath: null,
  tree: {},

  loadFull(body, actions) {
    actions.innerHTML = `
      <button class="death-action-btn" id="db-new-file" title="New file">+ File</button>
      <button class="death-action-btn" id="db-new-folder" title="New folder">+ Folder</button>
      <button class="death-action-btn" id="db-export" title="Download the encrypted database">⭳ Export</button>`;

    body.innerHTML = `
      <div class="db-explorer">
        <div class="db-sidebar">
          <div class="db-sidebar-header">Targets</div>
          <ul class="db-tree-group" id="db-tree-root"></ul>
        </div>
        <div class="db-content">
          <div class="db-header-bar">
            <h3 id="db-selected-path">Select a file to view targets</h3>
            <div class="db-editor-actions" id="db-editor-actions" hidden>
              <button class="death-action-btn" id="db-save">Save</button>
              <button class="death-action-btn db-danger" id="db-delete-file">Delete file</button>
            </div>
          </div>
          <div class="db-error" id="db-error" hidden></div>
          <textarea class="db-editor" id="db-editor" placeholder="Select a file from the tree, or create one, then type one target per line." spellcheck="false"></textarea>
        </div>
      </div>`;

    actions.querySelector("#db-new-file").addEventListener("click", () => this.promptCreateFile());
    actions.querySelector("#db-new-folder").addEventListener("click", () => this.promptCreateFolder());
    actions.querySelector("#db-export").addEventListener("click", () => this.exportDb());
    body.querySelector("#db-save").addEventListener("click", () => this.saveCurrentFile());
    body.querySelector("#db-delete-file").addEventListener("click", () => this.deleteCurrentFile());
  },

  onOpen() { this.fetchTree(); },

  showError(msg) {
    const el = document.getElementById("db-error");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
  },

  async fetchTree() {
    try {
      const res = await Core.api("/api/tree");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (HTTP ${res.status})`);
      }
      const { paths } = await res.json();
      this.tree = {};
      (paths ?? []).forEach((p) => {
        const parts = p.split("/");
        let node = this.tree;
        parts.forEach((part, i) => {
          if (!node[part]) node[part] = i === parts.length - 1 ? null : {};
          if (i < parts.length - 1) node = node[part];
        });
      });
      this.renderTree();
      this.showError("");
    } catch (e) {
      console.error("[database]", e);
      this.showError(e.message);
    }
  },

  renderTree() {
    const root = document.getElementById("db-tree-root");
    if (!root) return;
    root.innerHTML = "";
    this.renderNode(this.tree, "", root);
    if (!root.children.length) {
      root.innerHTML = `<li class="db-empty">No targets yet. Use + File to add one.</li>`;
    }
  },

  renderNode(node, prefix, mount) {
    Object.keys(node).sort().forEach((key) => {
      const li = document.createElement("li");
      const fullPath = prefix ? `${prefix}/${key}` : key;

      if (node[key] === null) {
        const span = document.createElement("span");
        span.className = "db-file" + (fullPath === this.currentPath ? " active" : "");
        span.textContent = key;
        span.addEventListener("click", () => this.loadFile(fullPath));
        li.appendChild(span);
      } else {
        const wrap = document.createElement("div");
        wrap.className = "db-folder-wrap";
        const span = document.createElement("span");
        span.className = "db-folder open";
        span.textContent = key;
        const del = document.createElement("button");
        del.className = "db-folder-delete";
        del.textContent = "✕";
        del.title = `Delete folder ${fullPath}`;
        del.addEventListener("click", (e) => { e.stopPropagation(); this.deleteFolder(fullPath); });
        wrap.append(span, del);
        li.appendChild(wrap);

        const childUl = document.createElement("ul");
        childUl.className = "db-tree-group";
        this.renderNode(node[key], fullPath, childUl);
        li.appendChild(childUl);

        span.addEventListener("click", () => {
          span.classList.toggle("open");
          childUl.hidden = !childUl.hidden;
        });
      }
      mount.appendChild(li);
    });
  },

  async loadFile(path) {
    this.currentPath = path;
    Core.setText("db-selected-path", path);
    document.getElementById("db-editor-actions").hidden = false;
    try {
      const res = await Core.api(`/api/file?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (HTTP ${res.status})`);
      }
      const { content } = await res.json();
      document.getElementById("db-editor").value = content || "";
      this.showError("");
      this.renderTree();
    } catch (e) {
      console.error("[database]", e);
      this.showError(e.message);
    }
  },

  async saveCurrentFile() {
    if (!this.currentPath) return;
    const content = document.getElementById("db-editor").value;
    try {
      const res = await Core.api("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: this.currentPath, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Save failed (HTTP ${res.status})`);
      Core.flash("db-selected-path", `Saved ${data.count} entries to ${this.currentPath}`, 1800);
      this.showError("");
      this.fetchTree();
    } catch (e) {
      console.error("[database]", e);
      this.showError(e.message);
    }
  },

  async deleteCurrentFile() {
    if (!this.currentPath) return;
    if (!confirm(`Delete ${this.currentPath}? This cannot be undone.`)) return;
    try {
      const res = await Core.api("/api/delete-file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: this.currentPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Delete failed (HTTP ${res.status})`);
      this.currentPath = null;
      Core.setText("db-selected-path", "Select a file to view targets");
      document.getElementById("db-editor-actions").hidden = true;
      document.getElementById("db-editor").value = "";
      this.showError("");
      this.fetchTree();
    } catch (e) {
      console.error("[database]", e);
      this.showError(e.message);
    }
  },

  async deleteFolder(path) {
    if (!confirm(`Delete the entire folder "${path}" and everything in it? This cannot be undone.`)) return;
    try {
      const res = await Core.api("/api/delete-folder", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: path }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Delete failed (HTTP ${res.status})`);
      if (this.currentPath && this.currentPath.startsWith(`${path}/`)) {
        this.currentPath = null;
        Core.setText("db-selected-path", "Select a file to view targets");
        document.getElementById("db-editor-actions").hidden = true;
        document.getElementById("db-editor").value = "";
      }
      this.showError("");
      this.fetchTree();
    } catch (e) {
      console.error("[database]", e);
      this.showError(e.message);
    }
  },

  promptCreateFile() {
    const path = prompt("New file path, e.g. android/domains/new_targets.txt:");
    if (!path) return;
    this.currentPath = path.replace(/^\/+/, "").trim();
    Core.setText("db-selected-path", this.currentPath);
    document.getElementById("db-editor-actions").hidden = false;
    document.getElementById("db-editor").value = "";
    this.showError("");
  },

  promptCreateFolder() {
    const path = prompt("New folder path, e.g. android/domains:");
    if (!path) return;
    const clean = path.replace(/^\/+/, "").replace(/\/+$/, "").trim();
    this.currentPath = `${clean}/placeholder.txt`;
    Core.setText("db-selected-path", this.currentPath);
    document.getElementById("db-editor-actions").hidden = false;
    document.getElementById("db-editor").value = "# placeholder target\n";
    this.showError("");
    this.saveCurrentFile();
  },

  exportDb() {
    window.location.href = `${Core.WORKER}/api/export`;
  },
});


/* ┌──────────────────────────────────────────────────────────────────────┐
   │ MODULE: THEME (appearance settings, live preview)                    │
   │                                                                      │
   │ Writes CSS custom properties directly onto :root (inline style, so   │
   │ it wins over the values set in index.css) and persists the choice to │
   │ localStorage. Applied on every page load by applyStoredTheme() below,│
   │ which runs immediately — not gated behind login — so the chosen      │
   │ theme is visible on the login screen's surrounding chrome too        │
   │ (the login card itself is intentionally excluded from theming).      │
   └──────────────────────────────────────────────────────────────────────┘ */
(function () {
  const STORAGE_KEY = "death-theme";

  const ACCENTS = [
    { id: "violet", label: "Violet", purple: "#a78bfa", purple2: "#8b6be8" },
    { id: "indigo", label: "Indigo", purple: "#818cf8", purple2: "#6366f1" },
    { id: "blue",   label: "Blue",   purple: "#60a5fa", purple2: "#3b82f6" },
    { id: "green",  label: "Green",  purple: "#6ee7b7", purple2: "#34d399" },
    { id: "rose",   label: "Rose",   purple: "#fda4af", purple2: "#fb7185" },
    { id: "amber",  label: "Amber",  purple: "#fbbf24", purple2: "#f59e0b" },
  ];
  const RADII = [
    { id: "sharp", label: "Sharp", sm: "6px",  md: "9px",  lg: "14px" },
    { id: "soft",  label: "Soft",  sm: "10px", md: "14px", lg: "22px" },
    { id: "round", label: "Round", sm: "14px", md: "20px", lg: "30px" },
  ];

  function hexToRgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function applyTheme(accentId, radiusId) {
    const accent = ACCENTS.find((a) => a.id === accentId) || ACCENTS[0];
    const radius = RADII.find((r) => r.id === radiusId) || RADII[1];
    const [r, g, b] = hexToRgb(accent.purple);
    const root = document.documentElement.style;
    root.setProperty("--purple", accent.purple);
    root.setProperty("--purple-2", accent.purple2);
    root.setProperty("--purple-dim", `rgba(${r}, ${g}, ${b}, 0.15)`);
    root.setProperty("--purple-border", `rgba(${r}, ${g}, ${b}, 0.25)`);
    root.setProperty("--glow", `0 0 28px rgba(${r}, ${g}, ${b}, 0.3)`);
    root.setProperty("--radius-sm", radius.sm);
    root.setProperty("--radius-md", radius.md);
    root.setProperty("--radius-lg", radius.lg);
  }

  function loadStored() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function saveStored(accentId, radiusId) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accent: accentId, radius: radiusId }));
  }

  // Apply immediately on script load — before login, before any module renders —
  // so there's no flash of default styling.
  const stored = loadStored();
  applyTheme(stored.accent, stored.radius);

  ModuleRegistry.register({
    id: "theme",
    title: "Theme",
    description: "Accent color and corner roundness, applied live",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.2-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.4-4.5-8-10-8z"/></svg>`,

    accent: stored.accent || "violet",
    radius: stored.radius || "soft",

    loadFull(body) {
      const swatches = ACCENTS.map((a) => `
        <button class="theme-swatch${a.id === this.accent ? " active" : ""}" data-accent="${a.id}" style="--swatch:${a.purple}" title="${a.label}">
          <span class="theme-swatch-dot"></span><span>${a.label}</span>
        </button>`).join("");

      const radii = RADII.map((r) => `
        <button class="theme-radius-btn${r.id === this.radius ? " active" : ""}" data-radius="${r.id}" style="border-radius:${r.md}">
          ${r.label}
        </button>`).join("");

      body.innerHTML = `
        <div class="section-title">Accent Color</div>
        <div class="theme-swatches" id="theme-swatches">${swatches}</div>

        <div class="section-title" style="margin-top:22px">Corner Roundness</div>
        <div class="theme-radii" id="theme-radii">${radii}</div>

        <div class="section-title" style="margin-top:22px">Preview</div>
        <div class="theme-preview glass-card">
          <div class="theme-preview-row">
            <span class="pill pill-purple">LIVE</span>
            <span class="pill pill-green">Success</span>
            <span class="pill pill-red">Error</span>
          </div>
          <button class="btn-primary" style="margin-top:12px">Primary button</button>
          <p class="muted-note" style="margin-top:12px">This card, the sidebar, and every module reflect the choice above immediately — nothing to save.</p>
        </div>

        <button class="death-action-btn" id="theme-reset" style="margin-top:20px">Reset to default</button>`;

      body.querySelector("#theme-swatches").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-accent]");
        if (!btn) return;
        this.accent = btn.dataset.accent;
        this.commit();
      });
      body.querySelector("#theme-radii").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-radius]");
        if (!btn) return;
        this.radius = btn.dataset.radius;
        this.commit();
      });
      body.querySelector("#theme-reset").addEventListener("click", () => {
        this.accent = "violet";
        this.radius = "soft";
        this.commit();
      });
    },

    commit() {
      applyTheme(this.accent, this.radius);
      saveStored(this.accent, this.radius);
      // re-render the active/selected states without a full reload
      document.querySelectorAll("#theme-swatches .theme-swatch").forEach((b) =>
        b.classList.toggle("active", b.dataset.accent === this.accent));
      document.querySelectorAll("#theme-radii .theme-radius-btn").forEach((b) =>
        b.classList.toggle("active", b.dataset.radius === this.radius));
    },
  });
})();


/* ┌──────────────────────────────────────────────────────────────────────┐
   │ MODULE: APP (placeholder — AppKrack)                                 │
   └──────────────────────────────────────────────────────────────────────┘ */
ModuleRegistry.register({
  id: "app",
  title: "AppKrack",
  description: "Not wired up yet",
  badge: "SOON",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18.01" x2="12.01" y2="18.01"/></svg>`,

  loadFull(body) {
    body.innerHTML = `
      <div class="placeholder-card">
        <h2>AppKrack</h2>
        <p class="muted-note">This panel is a placeholder. Tell Claude what AppKrack does, how it's hosted, and what this panel should show or link to, and it'll get wired up the same way Logs and Analytics are.</p>
      </div>`;
  },
});


/* ┌──────────────────────────────────────────────────────────────────────┐
   │ MODULE: NUKE (placeholder)                                           │
   └──────────────────────────────────────────────────────────────────────┘ */
ModuleRegistry.register({
  id: "nuke",
  title: "Nuke",
  description: "Not wired up yet",
  badge: "SOON",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>`,

  loadFull(body) {
    body.innerHTML = `
      <div class="placeholder-card">
        <h2>Nuke</h2>
        <p class="muted-note">This panel is a placeholder. Tell Claude what Nuke does, how it's hosted, and what this panel should show or link to, and it'll get wired up the same way Logs and Analytics are.</p>
      </div>`;
  },
});


/* ┌──────────────────────────────────────────────────────────────────────┐
   │ MODULE: RAGEX                                                        │
   │                                                                      │
   │ Ported from the standalone ragexui.js prototype (window.onload +     │
   │ global functions + its own fetch(API_BASE)) into the ModuleRegistry  │
   │ pattern: state lives on the module object, fetches go through        │
   │ Core.api (same worker as everything else, session-cookie protected,  │
   │ matching the routes merged into worker.js), and the inline           │
   │ onclick="copyToClipboard(...)" became a delegated click listener.    │
   └──────────────────────────────────────────────────────────────────────┘ */
ModuleRegistry.register({
  id: "ragex",
  title: "Ragex",
  description: "Regex-matched findings from wayback URL scans",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21l-4.35-4.35"/><circle cx="11" cy="11" r="7"/></svg>`,

  items: [],
  query: "",

  loadFull(body, actions) {
    actions.innerHTML = `<button class="death-action-btn" id="ragex-refresh">↻ Refresh</button>`;
    actions.querySelector("#ragex-refresh").addEventListener("click", () => this.load());

    body.innerHTML = `
      <div class="ragex-status" id="ragex-status">Loading…</div>
      <input type="search" id="ragex-search" class="logs-search" placeholder="Search by ID, URL, or match content…" disabled>
      <div class="ragex-list" id="ragex-list">
        <div class="ragex-skeleton"></div>
        <div class="ragex-skeleton"></div>
        <div class="ragex-skeleton"></div>
      </div>`;

    body.querySelector("#ragex-search").addEventListener("input", (e) => {
      this.query = e.target.value.trim().toLowerCase();
      this.render();
    });
    body.querySelector("#ragex-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-copy]");
      if (btn) this.copy(btn);
    });
  },

  onOpen() { this.load(); },

  async load() {
    const status = document.getElementById("ragex-status");
    const search = document.getElementById("ragex-search");
    const list = document.getElementById("ragex-list");
    search.disabled = true;
    status.textContent = "Loading…";

    try {
      const [stateRes, resultsRes] = await Promise.all([
        Core.api("/api/state"),
        Core.api("/api/results"),
      ]);

      if (stateRes.ok) {
        const s = await stateRes.json();
        status.textContent = `Status: ${s.status} · Processed ${s.lastProcessedIndex}/${s.totalLines} · Remaining ${s.remaining}`;
      } else {
        status.textContent = "Could not load scan state.";
      }

      if (!resultsRes.ok) {
        const j = await resultsRes.json().catch(() => ({}));
        throw new Error(j.error || `Results request failed (HTTP ${resultsRes.status})`);
      }
      this.items = await resultsRes.json();
      search.disabled = false;
      status.textContent += ` · Found ${this.items.length} match${this.items.length === 1 ? "" : "es"}`;
      this.render();
    } catch (e) {
      console.error("[ragex]", e);
      status.textContent = `Error: ${e.message}`;
      list.innerHTML = `<div class="ragex-empty">Could not load results. Confirm the worker is deployed and RAGEX_PASS is set.</div>`;
    }
  },

  visible() {
    if (!this.query) return this.items;
    const q = this.query;
    return this.items.filter((i) =>
      String(i.id).includes(q) ||
      (i.url || "").toLowerCase().includes(q) ||
      (i.ragex || "").toLowerCase().includes(q) ||
      (i.patternName || "").toLowerCase().includes(q));
  },

  render() {
    const list = document.getElementById("ragex-list");
    if (!list) return;
    const rows = this.visible();
    if (!rows.length) {
      list.innerHTML = `<div class="ragex-empty">${this.items.length ? "No matches for your search." : "No vulnerabilities detected."}</div>`;
      return;
    }
    list.innerHTML = rows.map((item) => `
      <div class="ragex-card">
        <div class="ragex-card-header">
          <span class="pill pill-purple">ID ${Core.esc(item.id)}</span>
          <span class="ragex-card-line">Line ${Core.esc(item.line)}</span>
        </div>
        <div class="ragex-card-url">
          <a href="${Core.esc(item.url)}" target="_blank" rel="noopener noreferrer">${Core.esc(item.url)}</a>
        </div>
        <div class="ragex-match">
          <span class="ragex-match-content">${Core.esc(item.ragex)}</span>
          <button class="ragex-copy-btn" data-copy data-value="${Core.esc(item.ragex)}">Copy</button>
        </div>
        <div class="ragex-card-meta">Pattern: ${Core.esc(item.patternName)}</div>
      </div>`).join("");
  },

  copy(btn) {
    navigator.clipboard.writeText(btn.dataset.value || "").then(() => {
      const original = btn.textContent;
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = original; btn.classList.remove("copied"); }, 1500);
    });
  },
});