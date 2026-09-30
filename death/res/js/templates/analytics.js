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

  // ── fullscreen ──
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