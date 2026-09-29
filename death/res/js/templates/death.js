ModuleRegistry.register({
  id: "death",
  title: "Death Pipeline",
  badge: "LIVE",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  hasFullpage: true,

  WF_NAMES: {
    "bbscope.yml": "BBScope Fetcher",
    "nuclei_header_bbp.yml": "Nuclei BBP",
    "nuclei_header_sub.yml": "Nuclei Sub",
    "subrecon.yml": "Subrecon",
  },
  REFRESH_MS: 60000,
  stats: null,
  items: [],
  filter: "",
  timer: null,

  normalize(i) {
    return {
      workflow: i.tag ?? i.workflow ?? "system",
      message: i.text ?? i.message ?? "",
      timestamp: i.ts ? i.ts * 1000 : i.timestamp ?? null,
      type: i.type ?? "",
    };
  },

  async refresh() {
    this.setLoading(true);
    try {
      const [s, n] = await Promise.all([
        window.Core.api("/death/stats"),
        window.Core.api("/death/notifications?limit=100"),
      ]);
      if (s.ok) this.stats = await s.json();
      if (n.ok) this.items = ((await n.json()).items ?? []).map((i) => this.normalize(i));
      this.renderAll();
    } catch (e) { console.error("[death] load error", e); }
    this.setLoading(false);
    const el = document.getElementById("death-last-updated");
    if (el) el.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  },

  onAppReady() { this.refresh(); },

  init(panel) {
    panel.innerHTML = `
      <div class="death-mini-stat-row">
        <div class="death-mini-stat"><div class="mn" id="dm-domains">0</div><div class="ml">BBP Domains</div></div>
        <div class="death-mini-stat"><div class="mn" id="dm-subs">0</div><div class="ml">Subdomains</div></div>
        <div class="death-mini-stat"><div class="mn" id="dm-findings">0</div><div class="ml">Findings</div></div>
        <div class="death-mini-stat"><div class="mn" id="dm-processed">0</div><div class="ml">Processed</div></div>
      </div>
      <div class="death-mini-feed" id="death-mini-feed"></div>
      <button class="expand-btn" data-open>Open Full Dashboard</button>`;
    panel.querySelector("[data-open]").addEventListener("click", () => window.sidebarEngine.openFullpage("death"));
    this.renderMini();
  },

  loadFull(body, actions) {
    actions.innerHTML = `
      <span class="death-last-updated" id="death-last-updated"></span>
      <button class="death-action-btn" id="death-refresh" title="Refresh">↻ Refresh</button>`;
    document.getElementById("death-refresh").addEventListener("click", () => this.refresh());

    const stat = (id, label, cls = "") =>
      `<div class="death-stat-card ${cls}"><div class="ds-num" id="ds-${id}">0</div><div class="ds-label">${label}</div></div>`;
    const bar = (id, label) => `
      <div class="death-scope-row">
        <div class="death-scope-label">${label}</div>
        <div class="death-scope-bar-wrap"><div class="death-scope-bar" id="dbar-${id}" style="width:0"></div></div>
        <div class="death-scope-count" id="dbar-${id}-count">0 / 0</div>
      </div>`;

    body.innerHTML = `
      <div class="death-stats-row">
        ${stat("domains","BBP Domains")}${stat("wildcards","Wildcards")}${stat("ips","BBP IPs")}${stat("subs","Subdomains")}
        ${stat("findings","Total Findings","finding")}${stat("findings-bbp","BBP Findings","finding")}
        ${stat("errors","Errors","error")}${stat("notifs","Total Logs")}
      </div>
      <div class="death-scope-section">${bar("bbp","BBP scan")}${bar("sub","Subdomain scan")}</div>
      <div class="section-title">Workflow Status</div>
      <div class="death-runs-grid" id="death-runs-grid"></div>
      <div class="death-feed-header" style="margin-top:24px">
        <div class="section-title" style="margin:0">Live Pipeline Notifications</div>
        <div class="death-feed-filters" id="death-filters">
          <button class="death-filter-btn active" data-filter="">All</button>
          <button class="death-filter-btn" data-filter="bbp">BBP</button>
          <button class="death-filter-btn" data-filter="subrecon">Subrecon</button>
          <button class="death-filter-btn" data-filter="cleanup">Cleanup</button>
        </div>
      </div>
      <div class="death-loading" id="death-feed-loading" style="display:none"><span class="spinner"></span>Loading...</div>
      <div class="death-feed" id="death-feed"></div>`;

    document.getElementById("death-filters").addEventListener("click", (e) => {
      const b = e.target.closest("[data-filter]");
      if (!b) return;
      this.filter = b.dataset.filter;
      document.querySelectorAll("#death-filters .death-filter-btn").forEach((x) => x.classList.toggle("active", x === b));
      this.renderFeed();
    });
    this.renderFull();
  },

  onOpen() {
    this.refresh();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.refresh(), this.REFRESH_MS);
  },
  onClose() { clearInterval(this.timer); },

  renderAll() { this.renderMini(); this.renderFull(); },
  setLoading(on) { const el = document.getElementById("death-feed-loading"); if (el) el.style.display = on ? "block" : "none"; },

  renderMini() {
    const s = this.stats;
    if (s) {
      window.Core.setText("dm-domains", s.scope?.bbpDomains ?? 0);
      window.Core.setText("dm-subs", s.scope?.subdomains ?? 0);
      window.Core.setText("dm-findings", s.findings?.total ?? 0);
      window.Core.setText("dm-processed", s.scope?.bbpProcessed ?? 0);
    }
    const box = document.getElementById("death-mini-feed");
    if (!box) return;
    const top = this.items.slice(0, 5);
    box.innerHTML = top.length
      ? top.map((i) => `<div class="death-mini-entry ${i.type==="finding"?"finding":i.type==="error"?"error":""}">[${window.Core.esc(i.workflow)}] ${window.Core.esc(i.message)}</div>`).join("")
      : `<div style="padding:10px;color:var(--muted)">No recent logs.</div>`;
  },

  renderFull() {
    const s = this.stats;
    if (!document.getElementById("death-feed")) return;
    if (s) {
      const sc = s.scope ?? {}, f = s.findings ?? {}, n = s.notifications ?? {};
      window.Core.setText("ds-domains", sc.bbpDomains ?? 0);
      window.Core.setText("ds-wildcards", sc.bbpWildcards ?? 0);
      window.Core.setText("ds-ips", sc.bbpIPs ?? 0);
      window.Core.setText("ds-subs", sc.subdomains ?? 0);
      window.Core.setText("ds-findings", f.total ?? 0);
      window.Core.setText("ds-findings-bbp", f.bbp ?? 0);
      window.Core.setText("ds-errors", n.errors ?? 0);
      window.Core.setText("ds-notifs", n.total ?? 0);
      this.setBar("bbp", sc.bbpProcessed ?? 0, sc.bbpDomains || 1);
      this.setBar("sub", sc.subProcessed ?? 0, sc.subdomains || 1);
      this.renderRuns(s.runs ?? []);
    }
    this.renderFeed();
  },

  setBar(id, val, total) {
    const el = document.getElementById(`dbar-${id}`);
    if (el) el.style.width = `${Math.min((val / total) * 100, 100).toFixed(1)}%`;
    window.Core.setText(`dbar-${id}-count`, `${val.toLocaleString()} / ${total.toLocaleString()}`);
  },

  renderRuns(runs) {
    const box = document.getElementById("death-runs-grid");
    if (!box) return;
    if (!runs.length) { box.innerHTML = `<p style="padding:12px;color:var(--muted)">No recent run data.</p>`; return; }
    box.innerHTML = runs.map((r) => {
      if (r.run === null) return `<div class="death-run-card cancelled"><div class="death-run-name"><span class="death-run-dot cancelled"></span>${window.Core.esc(this.WF_NAMES[r.workflow] ?? r.workflow)}</div><div class="death-run-meta">No runs</div></div>`;
      const cls = r.status === "in_progress" ? "in_progress" : r.conclusion === "success" ? "success" : r.conclusion === "cancelled" ? "cancelled" : "failure";
      const label = r.status === "in_progress" ? "In Progress" : r.conclusion ?? r.status;
      const link = r.html_url || r.url || "";
      const url = /^https:\/\//.test(link) ? ` href="${window.Core.esc(link)}"` : "";
      return `<a class="death-run-card ${cls}"${url} target="_blank" rel="noopener noreferrer"><div class="death-run-name"><span class="death-run-dot ${cls}"></span>${window.Core.esc(this.WF_NAMES[r.workflow] ?? r.workflow)}</div><div class="death-run-meta">${window.Core.esc(label)}</div><div class="death-run-number">#${window.Core.esc(String(r.run_number ?? ""))}</div></a>`;
    }).join("");
  },

  renderFeed() {
    const box = document.getElementById("death-feed");
    if (!box) return;
    const f = this.filter.toLowerCase();
    const list = f ? this.items.filter((i) => i.workflow.toLowerCase().includes(f)) : this.items;
    if (!list.length) { box.innerHTML = `<div class="death-empty">No log events match current filter.</div>`; return; }
    box.innerHTML = list.map((i) => {
      const tag = i.workflow?.includes("bbp") ? "bbp" : i.workflow?.includes("sub") ? "subrecon" : "general";
      const kind = i.type === "finding" ? "finding" : i.type === "error" ? "error" : "";
      const time = i.timestamp ? new Date(i.timestamp).toLocaleTimeString() : "";
      return `<div class="death-entry ${kind}"><div class="death-entry-top"><span class="death-tag-pill ${tag}">${window.Core.esc(i.workflow)}</span>${i.type ? `<span class="death-entry-type-badge ${window.Core.esc(i.type)}">${window.Core.esc(i.type)}</span>` : ""}<span class="death-entry-time">${time}</span></div><div class="death-entry-text">${window.Core.esc(i.message)}</div></div>`;
    }).join("");
  },
});
