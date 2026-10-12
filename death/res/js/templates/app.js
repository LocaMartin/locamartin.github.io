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