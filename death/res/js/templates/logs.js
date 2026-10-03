ModuleRegistry.register({
  id: "logs",
  title: "Logs",
  description: "Workflow logs from bbscope, subrecon, nuclei and cleanup",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,

  TAGS: [["", "All"], ["bbp", "BBP"], ["sub", "Sub"], ["subrecon", "Subrecon"], ["bbscope", "BBScope"], ["cleanup", "Cleanup"]],
  TYPES: [["", "All types"], ["error", "Errors"], ["success", "Success"], ["info", "Info"], ["cancelled", "Cancelled"]],
  // Category is a coarser split on top of `type`: any item with type "finding" is a
  // Finding, everything else is a Workflow (execution) log. Purely client-side —
  // no backend schema change needed, since `type` already distinguishes them.
  CATEGORIES: [["", "All"], ["finding", "Findings"], ["workflow", "Workflow Logs"]],
  RANGES: [
    ["1w", "1 week", 7],
    ["1m", "1 month", 30],
    ["3m", "3 months", 90],
    ["6m", "6 months", 180],
    ["1y", "1 year", 365],
  ],
  AUTO_MS: 15000,

  tag: "",
  type: "",
  category: "",
  query: "",
  items: [],
  selected: new Set(),
  timer: null,

  loadFull(body, actions) {
    actions.innerHTML = `
      <span class="logs-count" id="logs-count"></span>
      <label class="logs-auto"><input type="checkbox" id="logs-auto"> Auto</label>
      <button class="death-action-btn" id="logs-export" title="Download the visible logs">⭳ Export</button>
      <button class="death-action-btn" id="logs-refresh">↻ Refresh</button>`;

    const chips = (list, attr) => list
      .map(([v, l], i) => `<button class="logs-chip${i === 0 ? " active" : ""}" data-${attr}="${v}">${l}</button>`)
      .join("");

    const rangeOptions = this.RANGES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");

    body.innerHTML = `
      <div class="logs-toolbar">
        <input type="search" id="logs-search" class="logs-search" placeholder="Search logs…" autocomplete="off">
        <div class="logs-chips" id="logs-categories">${chips(this.CATEGORIES, "category")}</div>
        <div class="logs-chips" id="logs-tags">${chips(this.TAGS, "tag")}</div>
        <div class="logs-chips" id="logs-types">${chips(this.TYPES, "type")}</div>
      </div>
      <div class="logs-bulk-bar" id="logs-bulk-bar">
        <label class="logs-select-all">
          <input type="checkbox" id="logs-select-all"> Select all visible
        </label>
        <span class="logs-selected-count" id="logs-selected-count"></span>
        <button class="death-action-btn logs-danger" id="logs-delete-selected" disabled>Delete selected</button>
        <span class="logs-bulk-sep">·</span>
        <label for="logs-range-select">Older than</label>
        <select id="logs-range-select">${rangeOptions}</select>
        <button class="death-action-btn logs-danger" id="logs-delete-range">Delete matching range</button>
      </div>
      <div class="logs-error" id="logs-error" hidden></div>
      <div class="logs-list" id="logs-list"></div>`;

    actions.querySelector("#logs-refresh").addEventListener("click", () => this.refresh());
    actions.querySelector("#logs-export").addEventListener("click", () => this.exportVisible());
    actions.querySelector("#logs-auto").addEventListener("change", (e) => this.setAuto(e.target.checked));

    body.querySelector("#logs-categories").addEventListener("click", (e) => {
      const b = e.target.closest("[data-category]");
      if (!b) return;
      this.category = b.dataset.category;
      this.mark("#logs-categories", b);
      this.render();
    });
    body.querySelector("#logs-tags").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tag]");
      if (!b) return;
      this.tag = b.dataset.tag;
      this.mark("#logs-tags", b);
      this.refresh();                       // tag is filtered server-side
    });
    body.querySelector("#logs-types").addEventListener("click", (e) => {
      const b = e.target.closest("[data-type]");
      if (!b) return;
      this.type = b.dataset.type;
      this.mark("#logs-types", b);
      this.render();
    });
    body.querySelector("#logs-search").addEventListener("input", (e) => {
      this.query = e.target.value.trim().toLowerCase();
      this.render();
    });
    body.querySelector("#logs-list").addEventListener("click", (e) => {
      if (e.target.closest(".log-checkbox")) return;  // don't expand when hitting the checkbox
      const row = e.target.closest(".log-row");
      if (row) row.classList.toggle("expanded");
    });
    body.querySelector("#logs-list").addEventListener("change", (e) => {
      const cb = e.target.closest(".log-checkbox");
      if (!cb) return;
      if (cb.checked) this.selected.add(cb.dataset.id);
      else this.selected.delete(cb.dataset.id);
      this.updateBulkBar();
    });
    body.querySelector("#logs-select-all").addEventListener("change", (e) => {
      const ids = this.visible().map((i) => i.key);
      if (e.target.checked) ids.forEach((id) => this.selected.add(id));
      else ids.forEach((id) => this.selected.delete(id));
      this.render();
    });
    body.querySelector("#logs-delete-selected").addEventListener("click", () => this.deleteSelected());
    body.querySelector("#logs-delete-range").addEventListener("click", () => this.deleteByRange());
  },

  onOpen() { this.refresh(); },
  onClose() { this.setAuto(false); const c = document.getElementById("logs-auto"); if (c) c.checked = false; },

  mark(sel, btn) {
    document.querySelectorAll(`${sel} .logs-chip`).forEach((b) => b.classList.toggle("active", b === btn));
  },

  setAuto(on) {
    clearInterval(this.timer);
    if (on) this.timer = setInterval(() => this.refresh(), this.AUTO_MS);
  },

  async refresh() {
    const err = document.getElementById("logs-error");
    try {
      const res = await Core.api(`/death/notifications?limit=500${this.tag ? `&tag=${encodeURIComponent(this.tag)}` : ""}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (HTTP ${res.status})`);
      }
      this.items = (await res.json()).items ?? [];
      this.selected.clear();  // ids are fallback-derived until the backend gives stable ones; don't trust them across refetches
      err.hidden = true;
      this.render();
    } catch (e) {
      console.error("[logs]", e);
      err.hidden = false;
      err.textContent = e.message;
    }
  },

  visible() {
    return this.items.filter((i) => {
      const cat = i.type === "finding" ? "finding" : "workflow";
      return (!this.category || cat === this.category) &&
        (!this.type || i.type === this.type) &&
        (!this.query || `${i.tag} ${i.type} ${i.text}`.toLowerCase().includes(this.query));
    });
  },

  fmt(ts) {
    return new Date(ts * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  },

  render() {
    const list = document.getElementById("logs-list");
    if (!list) return;
    const rows = this.visible();
    Core.setText("logs-count", `${rows.length} / ${this.items.length}`);
    if (!rows.length) {
      list.innerHTML = `<div class="logs-empty">No logs match the current filters.</div>`;
      this.updateBulkBar();
      return;
    }
    list.innerHTML = rows.map((i) => {
      const type = ["finding", "error", "cancelled", "success"].includes(i.type) ? i.type : "info";
      const long = i.text.length > 220 || i.text.includes("\n");
      const id = i.key;
      const checked = this.selected.has(id) ? " checked" : "";
      return `<div class="log-row ${type}${long ? " collapsible" : ""}">
        <label class="log-checkbox-wrap"><input type="checkbox" class="log-checkbox" data-id="${Core.esc(id)}"${checked}></label>
        <div class="log-meta">
          <span class="log-time">${this.fmt(i.ts)}</span>
          <span class="log-tag">${Core.esc(i.tag)}</span>
          <span class="log-type">${type}</span>
        </div>
        <div class="log-text">${Core.esc(i.text)}</div>
      </div>`;
    }).join("");

    const allIds = rows.map((i) => i.key);
    const selectAll = document.getElementById("logs-select-all");
    if (selectAll) selectAll.checked = allIds.length > 0 && allIds.every((id) => this.selected.has(id));
    this.updateBulkBar();
  },

  updateBulkBar() {
    const count = this.selected.size;
    Core.setText("logs-selected-count", count ? `${count} selected` : "");
    const delBtn = document.getElementById("logs-delete-selected");
    if (delBtn) delBtn.disabled = count === 0;
  },

  /** Deletes the checked rows via DELETE /death/notifications { keys: [...] }. */
  async deleteSelected() {
    if (!this.selected.size) return;
    const keys = [...this.selected];
    if (!confirm(`Delete ${keys.length} selected log${keys.length === 1 ? "" : "s"}? This cannot be undone.`)) return;

    const err = document.getElementById("logs-error");
    try {
      const res = await Core.api("/death/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (HTTP ${res.status})`);
      }
      this.items = this.items.filter((i) => !keys.includes(i.key));
      this.selected.clear();
      err.hidden = true;
      this.render();
    } catch (e) {
      console.error("[logs] delete", e);
      err.hidden = false;
      err.textContent = e.message;
    }
  },

  /** Bulk-deletes everything older than the chosen preset via
   *  DELETE /death/notifications?tag=&older_than=<seconds>&type=|exclude_type=
   *  Scoped by the active tag chip and category/type filter. Note: the free-text
   *  search box is client-side only and is NOT applied server-side here — if a
   *  search query is active we warn before deleting, since the server-side
   *  count may differ from what's currently visible on screen. */
  async deleteByRange() {
    const sel = document.getElementById("logs-range-select");
    const [, label, days] = this.RANGES.find(([v]) => v === sel.value) || [];
    if (!days) return;
    const olderThanSeconds = days * 86400;
    const cutoff = Math.floor(Date.now() / 1000) - olderThanSeconds;

    const visibleMatch = this.visible().filter((i) => i.ts < cutoff);
    if (!visibleMatch.length) { alert("No visible logs are older than that range."); return; }

    let warning = "";
    if (this.query) warning = "\n\nNote: your search text won't be applied server-side — this deletes by tag/category/age only, which may remove more than what's currently filtered by search.";
    if (!confirm(`Delete logs older than ${label}${this.tag ? ` (tag: ${this.tag})` : ""}${this.type ? ` (type: ${this.type})` : this.category ? ` (category: ${this.category})` : ""}? This cannot be undone.${warning}`)) return;

    const params = new URLSearchParams({ older_than: String(olderThanSeconds) });
    if (this.tag) params.set("tag", this.tag);
    if (this.type) {
      params.set("type", this.type);                              // a specific type chip wins over category
    } else if (this.category === "finding") {
      params.set("type", "finding");
    } else if (this.category === "workflow") {
      params.set("exclude_type", "finding");
    }

    const err = document.getElementById("logs-error");
    try {
      const res = await Core.api(`/death/notifications?${params}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (HTTP ${res.status})`);
      }
      const { deleted } = await res.json();
      err.hidden = true;
      this.selected.clear();
      await this.refresh();   // server-side deletion may not exactly match `visibleMatch`, so refetch rather than patch locally
      Core.flash("logs-selected-count", `Deleted ${deleted}`);
    } catch (e) {
      console.error("[logs] deleteByRange", e);
      err.hidden = false;
      err.textContent = e.message;
    }
  },

  exportVisible() {
    const rows = this.visible();
    if (!rows.length) return;
    const text = rows.map((i) => `[${new Date(i.ts * 1000).toISOString()}] [${i.tag}] [${i.type}] ${i.text.replace(/\n/g, " | ")}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `death-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
});