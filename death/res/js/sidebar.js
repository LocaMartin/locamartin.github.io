/* ────────────────────────────────────────────────────────────
   Module registry + sidebar engine.

   A module is a plain object registered by its own file:

   ModuleRegistry.register({
     id: "example",            // unique, used for DOM ids  (panel-<id>, fp-<id>)
     title: "Example",
     icon: "<svg …>",          // shown in sidebar + top nav pill
     badge: "LIVE",            // optional pill in sidebar
     hasFullpage: true,        // adds expand button + top nav pill + fullscreen panel
     init(panel)               // once, first time the sidebar tab is shown
     onShow(panel)             // every time the sidebar tab is shown
     loadFull(body, actions)   // once, first time the fullscreen panel opens
                               //   body = content area, actions = header button area
     onOpen() / onClose()      // every time fullscreen opens / closes
     onAppReady()              // once, right after login succeeds
   });
   ──────────────────────────────────────────────────────────── */
window.ModuleRegistry = {
  modules: {},
  register(mod) {
    if (!mod || !mod.id) return console.error("[registry] module needs an id", mod);
    this.modules[mod.id] = mod;
  },
  get(id) {
    return this.modules[id];
  },
};

class SidebarEngine {
  constructor(ids) {
    this.mods = ids
      .map((id) => {
        const m = window.ModuleRegistry.get(id);
        if (!m) console.warn(`[sidebar] module "${id}" is listed in sidebar-config.js but its script is not loaded`);
        return m;
      })
      .filter(Boolean);
    this.sidebarOpen = false;
    this.inited = new Set();
    this.fullLoaded = new Set();
  }

  init() {
    this.render();
    this.bindEvents();
    if (this.mods.length) this.switchTab(this.mods[0].id);
  }

  /** Called by auth.js once the user is logged in. */
  appReady() {
    this.mods.forEach((m) => {
      try { m.onAppReady?.(); } catch (e) { console.error(`[${m.id}] onAppReady`, e); }
    });
  }

  render() {
    const nav = document.getElementById("sidebar-nav-items");
    const panels = document.getElementById("sidebar-panels");
    const fullpages = document.getElementById("fullpage-containers");
    const pills = document.getElementById("nav-center");
    if (!nav || !panels) return;

    const expandSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;

    this.mods.forEach((m) => {
      // sidebar nav item
      const btn = document.createElement("button");
      btn.className = "nav-item";
      btn.dataset.id = m.id;
      btn.innerHTML = `
        <span class="nav-item-left">
          <span class="icon">${m.icon || ""}</span>
          <span>${m.title}</span>
          ${m.badge ? `<span class="badge-pill">${m.badge}</span>` : ""}
        </span>
        ${m.hasFullpage ? `<span class="open-full" title="Open fullscreen">${expandSvg}</span>` : ""}`;
      btn.addEventListener("click", (e) => {
        if (e.target.closest(".open-full")) {
          e.stopPropagation();
          this.openFullpage(m.id);
        } else this.switchTab(m.id);
      });
      nav.appendChild(btn);

      // sidebar panel mount
      const panel = document.createElement("div");
      panel.className = "sidebar-panel-content";
      panel.id = `panel-${m.id}`;
      panels.appendChild(panel);

      if (!m.hasFullpage) return;

      // top nav pill
      if (pills) {
        const pill = document.createElement("button");
        pill.className = "nav-pill";
        pill.innerHTML = `${m.icon || ""}${m.title}`;
        pill.addEventListener("click", () => this.openFullpage(m.id));
        pills.appendChild(pill);
      }

      // fullscreen panel
      if (fullpages) {
        const fp = document.createElement("div");
        fp.className = "fullpage-panel";
        fp.id = `fp-${m.id}`;
        fp.innerHTML = `
          <div class="fp-header">
            <div class="fp-title">${m.icon || ""}${m.title}</div>
            <div class="fp-actions" id="fp-actions-${m.id}"></div>
            <button class="fp-close" data-close="${m.id}" aria-label="Close">✕</button>
          </div>
          <div class="fp-body" id="fp-body-${m.id}"></div>`;
        fp.querySelector("[data-close]").addEventListener("click", () => this.closeFullpage(m.id));
        fullpages.appendChild(fp);
      }
    });
  }

  find(id) { return this.mods.find((m) => m.id === id); }

  switchTab(id) {
    const m = this.find(id);
    if (!m) return;
    document.querySelectorAll("#sidebar-nav-items .nav-item").forEach((b) =>
      b.classList.toggle("active", b.dataset.id === id));
    document.querySelectorAll(".sidebar-panel-content").forEach((p) =>
      (p.style.display = p.id === `panel-${id}` ? "block" : "none"));

    const panel = document.getElementById(`panel-${id}`);
    try {
      if (!this.inited.has(id)) { this.inited.add(id); m.init?.(panel); }
      m.onShow?.(panel);
    } catch (e) { console.error(`[${id}] init/onShow`, e); }
  }

  openFullpage(id) {
    const m = this.find(id);
    const fp = document.getElementById(`fp-${id}`);
    if (!m || !fp) return;
    this.toggleSidebar(false);
    fp.classList.add("open");
    document.body.style.overflow = "hidden";
    try {
      if (!this.fullLoaded.has(id)) {
        this.fullLoaded.add(id);
        m.loadFull?.(document.getElementById(`fp-body-${id}`), document.getElementById(`fp-actions-${id}`));
      }
      m.onOpen?.();
    } catch (e) { console.error(`[${id}] loadFull/onOpen`, e); }
  }

  closeFullpage(id) {
    document.getElementById(`fp-${id}`)?.classList.remove("open");
    if (!document.querySelector(".fullpage-panel.open")) document.body.style.overflow = "";
    try { this.find(id)?.onClose?.(); } catch (e) { console.error(`[${id}] onClose`, e); }
  }

  toggleSidebar(force) {
    this.sidebarOpen = force !== undefined ? force : !this.sidebarOpen;
    document.getElementById("sidebar")?.classList.toggle("open", this.sidebarOpen);
    document.getElementById("overlay")?.classList.toggle("open", this.sidebarOpen);
  }

  bindEvents() {
    document.getElementById("menu-toggle")?.addEventListener("click", () => this.toggleSidebar());
    document.getElementById("sidebar-close")?.addEventListener("click", () => this.toggleSidebar(false));
    document.getElementById("overlay")?.addEventListener("click", () => this.toggleSidebar(false));
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll(".fullpage-panel.open").forEach((fp) =>
        this.closeFullpage(fp.id.replace(/^fp-/, "")));
      this.toggleSidebar(false);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.sidebarEngine = new SidebarEngine(window.SIDEBAR_MODULES || []);
  window.sidebarEngine.init();
});