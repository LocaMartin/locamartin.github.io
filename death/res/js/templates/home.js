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