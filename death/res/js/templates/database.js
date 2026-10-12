ModuleRegistry.register({
  id: "database",
  title: "Database",
  description: "In-scope targets: domains and app links, by platform",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  flush: true, // owns its own layout/scrolling (tree + editor side by side)

  currentPath: null,
  tree: {},

  loadFull(body, actions) {
    actions.innerHTML = `
      <button class="death-action-btn" id="db-new-file" title="New file">+ File</button>
      <button class="death-action-btn" id="db-new-folder" title="New folder">+ Folder</button>
      <button class="death-action-btn" id="db-export" title="Download the encrypted database">⭳ Export</button>`;

    body.innerHTML = `
      <div class="db-explorer">
        <div class="db-sidebar">
          <div class="db-sidebar-header">Targets</div>
          <ul class="db-tree-group" id="db-tree-root"></ul>
        </div>
        <div class="db-content">
          <div class="db-header-bar">
            <h3 id="db-selected-path">Select a file to view targets</h3>
            <div class="db-editor-actions" id="db-editor-actions" hidden>
              <button class="death-action-btn" id="db-save">Save</button>
              <button class="death-action-btn db-danger" id="db-delete-file">Delete file</button>
            </div>
          </div>
          <div class="db-error" id="db-error" hidden></div>
          <textarea class="db-editor" id="db-editor" placeholder="Select a file from the tree, or create one, then type one target per line." spellcheck="false"></textarea>
        </div>
      </div>`;

    actions.querySelector("#db-new-file").addEventListener("click", () => this.promptCreateFile());
    actions.querySelector("#db-new-folder").addEventListener("click", () => this.promptCreateFolder());
    actions.querySelector("#db-export").addEventListener("click", () => this.exportDb());
    body.querySelector("#db-save").addEventListener("click", () => this.saveCurrentFile());
    body.querySelector("#db-delete-file").addEventListener("click", () => this.deleteCurrentFile());
  },

  onOpen() { this.fetchTree(); },

  showError(msg) {
    const el = document.getElementById("db-error");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
  },

  async fetchTree() {
    try {
      const res = await Core.api("/api/tree");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (HTTP ${res.status})`);
      }
      const { paths } = await res.json();
      this.tree = {};
      (paths ?? []).forEach((p) => {
        const parts = p.split("/");
        let node = this.tree;
        parts.forEach((part, i) => {
          if (!node[part]) node[part] = i === parts.length - 1 ? null : {};
          if (i < parts.length - 1) node = node[part];
        });
      });
      this.renderTree();
      this.showError("");
    } catch (e) {
      console.error("[database]", e);
      this.showError(e.message);
    }
  },

  renderTree() {
    const root = document.getElementById("db-tree-root");
    if (!root) return;
    root.innerHTML = "";
    this.renderNode(this.tree, "", root);
    if (!root.children.length) {
      root.innerHTML = `<li class="db-empty">No targets yet. Use + File to add one.</li>`;
    }
  },

  renderNode(node, prefix, mount) {
    Object.keys(node).sort().forEach((key) => {
      const li = document.createElement("li");
      const fullPath = prefix ? `${prefix}/${key}` : key;

      if (node[key] === null) {
        const span = document.createElement("span");
        span.className = "db-file" + (fullPath === this.currentPath ? " active" : "");
        span.textContent = key;
        span.addEventListener("click", () => this.loadFile(fullPath));
        li.appendChild(span);
      } else {
        const wrap = document.createElement("div");
        wrap.className = "db-folder-wrap";
        const span = document.createElement("span");
        span.className = "db-folder open";
        span.textContent = key;
        const del = document.createElement("button");
        del.className = "db-folder-delete";
        del.textContent = "✕";
        del.title = `Delete folder ${fullPath}`;
        del.addEventListener("click", (e) => { e.stopPropagation(); this.deleteFolder(fullPath); });
        wrap.append(span, del);
        li.appendChild(wrap);

        const childUl = document.createElement("ul");
        childUl.className = "db-tree-group";
        this.renderNode(node[key], fullPath, childUl);
        li.appendChild(childUl);

        span.addEventListener("click", () => {
          span.classList.toggle("open");
          childUl.hidden = !childUl.hidden;
        });
      }
      mount.appendChild(li);
    });
  },

  async loadFile(path) {
    this.currentPath = path;
    Core.setText("db-selected-path", path);
    document.getElementById("db-editor-actions").hidden = false;
    try {
      const res = await Core.api(`/api/file?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (HTTP ${res.status})`);
      }
      const { content } = await res.json();
      document.getElementById("db-editor").value = content || "";
      this.showError("");
      this.renderTree();
    } catch (e) {
      console.error("[database]", e);
      this.showError(e.message);
    }
  },

  async saveCurrentFile() {
    if (!this.currentPath) return;
    const content = document.getElementById("db-editor").value;
    try {
      const res = await Core.api("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: this.currentPath, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Save failed (HTTP ${res.status})`);
      Core.flash("db-selected-path", `Saved ${data.count} entries to ${this.currentPath}`, 1800);
      this.showError("");
      this.fetchTree();
    } catch (e) {
      console.error("[database]", e);
      this.showError(e.message);
    }
  },

  async deleteCurrentFile() {
    if (!this.currentPath) return;
    if (!confirm(`Delete ${this.currentPath}? This cannot be undone.`)) return;
    try {
      const res = await Core.api("/api/delete-file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: this.currentPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Delete failed (HTTP ${res.status})`);
      this.currentPath = null;
      Core.setText("db-selected-path", "Select a file to view targets");
      document.getElementById("db-editor-actions").hidden = true;
      document.getElementById("db-editor").value = "";
      this.showError("");
      this.fetchTree();
    } catch (e) {
      console.error("[database]", e);
      this.showError(e.message);
    }
  },

  async deleteFolder(path) {
    if (!confirm(`Delete the entire folder "${path}" and everything in it? This cannot be undone.`)) return;
    try {
      const res = await Core.api("/api/delete-folder", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: path }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Delete failed (HTTP ${res.status})`);
      if (this.currentPath && this.currentPath.startsWith(`${path}/`)) {
        this.currentPath = null;
        Core.setText("db-selected-path", "Select a file to view targets");
        document.getElementById("db-editor-actions").hidden = true;
        document.getElementById("db-editor").value = "";
      }
      this.showError("");
      this.fetchTree();
    } catch (e) {
      console.error("[database]", e);
      this.showError(e.message);
    }
  },

  promptCreateFile() {
    const path = prompt("New file path, e.g. android/domains/new_targets.txt:");
    if (!path) return;
    this.currentPath = path.replace(/^\/+/, "").trim();
    Core.setText("db-selected-path", this.currentPath);
    document.getElementById("db-editor-actions").hidden = false;
    document.getElementById("db-editor").value = "";
    this.showError("");
  },

  promptCreateFolder() {
    const path = prompt("New folder path, e.g. android/domains:");
    if (!path) return;
    const clean = path.replace(/^\/+/, "").replace(/\/+$/, "").trim();
    this.currentPath = `${clean}/placeholder.txt`;
    Core.setText("db-selected-path", this.currentPath);
    document.getElementById("db-editor-actions").hidden = false;
    document.getElementById("db-editor").value = "# placeholder target\n";
    this.showError("");
    this.saveCurrentFile();
  },

  exportDb() {
    // Direct navigation (not Core.api/fetch) so the browser handles the download;
    // the session cookie still goes along since it's SameSite=None.
    window.location.href = `${Core.WORKER}/api/export`;
  },
});