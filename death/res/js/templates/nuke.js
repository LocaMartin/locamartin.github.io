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