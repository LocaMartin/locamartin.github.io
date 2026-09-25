window.ReconTemplate = {
  init: async function () {
    const container = document.getElementById("panel-recon");
    if (!container) return;

    container.innerHTML = `
      <div class="template-mini-panel">
        <p style="font-size: 0.85rem; color: var(--text-muted);">Recon Pipeline</p>
        <p style="font-size: 1.1rem; font-weight: 600; color: var(--accent); margin-top: 0.25rem;">Nuclei / Subfinder Engine</p>
        <button class="expand-btn" style="margin-top: 0.75rem; width:100%; padding: 0.5rem; background: var(--bg-panel); border:1px solid var(--border-color); color:var(--text-main); border-radius:6px; cursor:pointer;" onclick="window.sidebarEngine?.openFullpage('recon')">
          Launch Recon Console
        </button>
      </div>
    `;
  },

  loadFull: async function () {
    const body = document.getElementById("fp-body-recon");
    if (!body) return;

    body.innerHTML = `
      <h2>Recon Execution Manager</h2>
      <p style="color: var(--text-muted); margin-bottom: 1rem;">Execute automated discovery modules (subfinder, httpx, nuclei).</p>
      <div style="background: var(--bg-card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <code style="color: var(--accent); font-family: var(--font-mono);">$ subfinder -d target.com | httpx -title -tech-detect</code>
      </div>
    `;
  }
};