window.AnalyticsTemplate = {
  init: async function () {
    const container = document.getElementById("panel-analytics");
    if (!container) return;

    container.innerHTML = `
      <div class="template-mini-panel">
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem;">Traffic & Recon Metrics</p>
        <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">99.8% Success Rate</div>
        <button class="expand-btn" style="margin-top: 1rem; width:100%; padding: 0.5rem; background: var(--bg-panel); border:1px solid var(--border-color); color:var(--text-main); border-radius:6px; cursor:pointer;" onclick="window.sidebarEngine?.openFullpage('analytics')">
          View Detailed Analytics
        </button>
      </div>
    `;
  },

  loadFull: async function () {
    const body = document.getElementById("fp-body-analytics");
    if (!body) return;

    body.innerHTML = `
      <h2>Telemetry & Request Analytics</h2>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Historical request trends, scan rates, and latency breakdowns.</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: 8px;">
          <div style="color: var(--text-muted); font-size: 0.8rem;">TOTAL REQUESTS</div>
          <div style="font-size: 1.8rem; font-weight: bold; margin-top: 0.5rem;">1,420,890</div>
        </div>
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: 8px;">
          <div style="color: var(--text-muted); font-size: 0.8rem;">AVG RESPONSE TIME</div>
          <div style="font-size: 1.8rem; font-weight: bold; margin-top: 0.5rem; color: var(--accent-green);">142 ms</div>
        </div>
      </div>
    `;
  }
};