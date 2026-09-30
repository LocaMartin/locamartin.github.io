/* ────────────────────────────────────────────────────────────
   Module registry + sidebar engine.

   Every module is a sidebar item that opens in a fullscreen panel.

   ModuleRegistry.register({
     id: "example",           // unique; DOM ids are fp-<id>, fp-body-<id>, fp-actions-<id>
     title: "Example",
     description: "…",        // optional, shown on the Home launcher
     icon: "<svg …>",         // sidebar + panel header
     badge: "LIVE",           // optional pill in the sidebar
     flush: true,             // optional: no padding, module handles its own scrolling
     loadFull(body, actions)  // once, first time the panel opens
                              //   body = content area, actions = header button area
     onOpen()                 // every time the panel opens
     onClose()                // every time it closes
     onAppReady()             // once, right after login succeeds
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

const ICON_MENU = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;

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
    this.fullLoaded = new Set();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  find(id) { return this.mods.find((m) => m.id === id); }

  /** Called by auth.js once the user is logged in. */
  appReady() {
    this.mods.forEach((m) => {
      try { m.onAppReady?.(); } catch (e) { console.error(`[${m.id}] onAppReady`, e); }
    });
  }

  render() {
    const nav = document.getElementById("sidebar-nav-items");
    const fullpages = document.getElementById("fullpage-containers");
    if (!nav || !fullpages) return;

    this.mods.forEach((m) => {
      // sidebar item → opens the module fullscreen
      const btn = document.createElement("button");
      btn.className = "nav-item";
      btn.dataset.id = m.id;
      btn.innerHTML = `
        <span class="nav-item-left">
          <span class="icon">${m.icon || ""}</span>
          <span>${m.title}</span>
          ${m.badge ? `<span class="badge-pill">${m.badge}</span>` : ""}
        </span>`;
      btn.addEventListener("click", () => this.openFullpage(m.id));
      nav.appendChild(btn);

      // fullscreen panel
      const fp = document.createElement("div");
      fp.className = "fullpage-panel" + (m.flush ? " flush" : "");
      fp.id = `fp-${m.id}`;
      fp.innerHTML = `
        <div class="fp-header">
          <button class="fp-menu" data-menu aria-label="Open menu">${ICON_MENU}</button>
          <div class="fp-title">${m.icon || ""}<span>${m.title}</span></div>
          <div class="fp-actions" id="fp-actions-${m.id}"></div>
          <button class="fp-close" data-close aria-label="Close">✕</button>
        </div>
        <div class="fp-body" id="fp-body-${m.id}"></div>`;
      fp.querySelector("[data-menu]").addEventListener("click", () => this.toggleSidebar(true));
      fp.querySelector("[data-close]").addEventListener("click", () => this.closeFullpage(m.id));
      fullpages.appendChild(fp);
    });
  }

  openFullpage(id) {
    const m = this.find(id);
    const fp = document.getElementById(`fp-${id}`);
    if (!m || !fp) return;

    // one panel at a time
    document.querySelectorAll(".fullpage-panel.open").forEach((other) => {
      const otherId = other.id.replace(/^fp-/, "");
      if (otherId !== id) this.closeFullpage(otherId);
    });

    this.toggleSidebar(false);
    fp.classList.add("open");
    document.body.style.overflow = "hidden";
    this.setActive(id);

    try {
      if (!this.fullLoaded.has(id)) {
        this.fullLoaded.add(id);
        m.loadFull?.(document.getElementById(`fp-body-${id}`), document.getElementById(`fp-actions-${id}`));
      }
      m.onOpen?.();
    } catch (e) { console.error(`[${id}] loadFull/onOpen`, e); }
  }

  closeFullpage(id) {
    const fp = document.getElementById(`fp-${id}`);
    if (!fp || !fp.classList.contains("open")) return;
    fp.classList.remove("open");
    if (!document.querySelector(".fullpage-panel.open")) {
      document.body.style.overflow = "";
      this.setActive(null);
    }
    try { this.find(id)?.onClose?.(); } catch (e) { console.error(`[${id}] onClose`, e); }
  }

  setActive(id) {
    document.querySelectorAll("#sidebar-nav-items .nav-item").forEach((b) =>
      b.classList.toggle("active", b.dataset.id === id));
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
      if (this.sidebarOpen) return this.toggleSidebar(false);
      document.querySelectorAll(".fullpage-panel.open").forEach((fp) =>
        this.closeFullpage(fp.id.replace(/^fp-/, "")));
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.sidebarEngine = new SidebarEngine(window.SIDEBAR_MODULES || []);
  window.sidebarEngine.init();
});