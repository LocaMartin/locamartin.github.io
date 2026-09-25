class SidebarEngine {
  constructor(config) {
    this.config = config;
    this.sidebarOpen = false;
  }

  init() {
    this.renderSidebarMarkup();
    this.bindEvents();
    // Default load first tab (Home)
    if (this.config.length > 0) {
      this.switchTab(this.config[0].id);
    }
  }

  renderSidebarMarkup() {
    const navContainer = document.getElementById("sidebar-nav-items");
    const fullpageContainer = document.getElementById("fullpage-containers");
    const panelContainer = document.getElementById("sidebar-panels");

    if (!navContainer) return;

    navContainer.innerHTML = "";
    if (fullpageContainer) fullpageContainer.innerHTML = "";
    if (panelContainer) panelContainer.innerHTML = "";

    this.config.forEach((item) => {
      // 1. Navigation Item
      const navItem = document.createElement("button");
      navItem.className = "nav-item";
      navItem.dataset.id = item.id;
      navItem.innerHTML = `
        <div class="nav-item-left">
          <span class="icon">${item.icon}</span>
          <span>${item.title}</span>
          ${item.badge ? `<span class="badge-pill">${item.badge}</span>` : ""}
        </div>
        ${
          item.hasFullpage
            ? `<span class="open-full" title="Expand Fullscreen">
                 <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
               </span>`
            : ""
        }
      `;

      navItem.addEventListener("click", (e) => {
        if (e.target.closest(".open-full")) {
          e.stopPropagation();
          this.openFullpage(item.id);
        } else {
          this.switchTab(item.id);
        }
      });
      navContainer.appendChild(navItem);

      // 2. Sidebar Panel Content Mount
      if (panelContainer) {
        const panel = document.createElement("div");
        panel.className = "sidebar-panel-content";
        panel.id = `panel-${item.id}`;
        panel.style.display = "none";
        panelContainer.appendChild(panel);
      }

      // 3. Fullpage Modal Container Mount
      if (item.hasFullpage && fullpageContainer) {
        const fp = document.createElement("div");
        fp.className = "fullpage-panel";
        fp.id = `fp-${item.id}`;
        fp.innerHTML = `
          <div class="fp-header">
            <div class="fp-title">${item.icon} ${item.title}</div>
            <button class="fp-close" onclick="sidebarEngine.closeFullpage('${item.id}')">&times;</button>
          </div>
          <div class="fp-body" id="fp-body-${item.id}"></div>
        `;
        fullpageContainer.appendChild(fp);
      }
    });
  }

  switchTab(id) {
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.id === id);
    });

    document.querySelectorAll(".sidebar-panel-content").forEach((p) => {
      p.style.display = p.id === `panel-${id}` ? "block" : "none";
    });

    const itemConfig = this.config.find((i) => i.id === id);
    if (itemConfig && typeof itemConfig.init === "function") {
      itemConfig.init();
    }
  }

  openFullpage(id) {
    this.toggleSidebar(false);
    const fp = document.getElementById(`fp-${id}`);
    if (fp) {
      fp.classList.add("open");
      document.body.style.overflow = "hidden";
      const itemConfig = this.config.find((i) => i.id === id);
      if (itemConfig && typeof itemConfig.loadFull === "function") {
        itemConfig.loadFull();
      }
    }
  }

  closeFullpage(id) {
    const fp = document.getElementById(`fp-${id}`);
    if (fp) fp.classList.remove("open");
    document.body.style.overflow = "";
  }

  toggleSidebar(force) {
    this.sidebarOpen = force !== undefined ? force : !this.sidebarOpen;
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    if (sidebar) sidebar.classList.toggle("open", this.sidebarOpen);
    if (overlay) overlay.classList.toggle("open", this.sidebarOpen);
  }

  bindEvents() {
    document.getElementById("menu-toggle")?.addEventListener("click", () => this.toggleSidebar());
    document.getElementById("sidebar-close")?.addEventListener("click", () => this.toggleSidebar(false));
    document.getElementById("overlay")?.addEventListener("click", () => this.toggleSidebar(false));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".fullpage-panel.open").forEach((fp) => {
          fp.classList.remove("open");
        });
        document.body.style.overflow = "";
        this.toggleSidebar(false);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.sidebarEngine = new SidebarEngine(window.SIDEBAR_CONFIG);
  window.sidebarEngine.init();
});
