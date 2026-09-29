ModuleRegistry.register({
  id: "home",
  title: "Home",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  hasFullpage: false,

  init(panel) {
    panel.innerHTML = `
      <p class="muted-note">Pick a module above, or jump straight to one:</p>
      <div id="home-quick-links"></div>`;
    const box = panel.querySelector("#home-quick-links");
    window.sidebarEngine.mods
      .filter((m) => m.hasFullpage)
      .forEach((m) => {
        const b = document.createElement("button");
        b.className = "expand-btn";
        b.textContent = `Open ${m.title}`;
        b.addEventListener("click", () => window.sidebarEngine.openFullpage(m.id));
        box.appendChild(b);
      });
  },
});