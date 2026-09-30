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