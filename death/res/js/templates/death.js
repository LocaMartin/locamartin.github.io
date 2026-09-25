window.DeathTemplate = {
  init() {
    const container = document.getElementById("panel-death");
    if (!container) return;
    
    container.innerHTML = `
      <div class="death-mini-panel">
        <h3>Death Pipeline Status</h3>
        <p>Active Workflows: <strong id="sb-death-active">4</strong></p>
        <div id="sidebar-death-feed" class="mini-feed">Loading feed...</div>
      </div>
    `;
    this.loadData();
  },

  loadFull() {
    const container = document.getElementById("fp-body-death");
    if (!container) return;

    container.innerHTML = `
      <div class="death-full-dashboard">
        <h2>DEATH Recon Pipeline Console</h2>
        <div id="death-stats-grid">Loading telemetry stats...</div>
      </div>
    `;
    this.loadDataFull();
  },

  async loadData() {
    // Fetch mini telemetry for sidebar
  },

  async loadDataFull() {
    // Fetch complete telemetry for full page
  }
};
