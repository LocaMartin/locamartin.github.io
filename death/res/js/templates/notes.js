/* Notes: stored in Cloudflare KV (worker routes /notes), edited with Quill 2.
   Content is saved as a Quill Delta (JSON), never as raw HTML. */
ModuleRegistry.register({
  id: "notes",
  title: "Notes",
  description: "Synced notes with tables, checklists and highlights",
  flush: true,
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,

  SAVE_DELAY: 1200,
  LOCAL_KEY: "lm_notes_v2",              // where notes lived before (browser only)
  MIGRATED_KEY: "lm_notes_migrated_v1",
  GRID: { cols: 10, rows: 8 },
  EMPTY: { ops: [{ insert: "\n" }] },

  list: [],          // [{id,title,updated}]
  current: null,     // id of the open note
  quill: null,
  dirty: false,
  rev: 0,            // bumps on every edit, so a save can tell if newer edits arrived
  saveTimer: null,
  filter: "",

  $(id) { return document.getElementById(id); },

  // ───────────────────────── layout ─────────────────────────
  loadFull(body, actions) {
    actions.innerHTML = `
      <span class="nt-status" id="nt-status"></span>
      <button class="btn-primary" id="nt-save" hidden>Save</button>`;

    const swatch = ["#fde047", "#86efac", "#93c5fd", "#f9a8d4", "#fdba74", "#c4b5fd"]
      .map((c) => `<option value="${c}"></option>`).join("");

    body.innerHTML = `
      <div class="notes-layout" id="nt-layout">
        <aside class="notes-side">
          <div class="notes-side-head">
            <input type="search" id="nt-search" class="notes-search" placeholder="Search notes…" autocomplete="off">
            <button class="new-note-btn" id="nt-new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New
            </button>
          </div>
          <div class="notes-list" id="nt-list"></div>
        </aside>

        <section class="notes-main">
          <div class="notes-empty" id="nt-empty">Select a note, or create a new one.</div>
          <div class="notes-editor" id="nt-editor" hidden>
            <div class="note-top">
              <button class="nt-back" id="nt-back" aria-label="Back to notes">←</button>
              <input type="text" id="nt-title" class="note-title-input" placeholder="Note title…" maxlength="200">
            </div>

            <div class="nt-toolbar-wrap">
              <div id="nt-toolbar">
                <span class="ql-formats">
                  <select class="ql-header"><option value="1"></option><option value="2"></option><option value="3"></option><option selected></option></select>
                </span>
                <span class="ql-formats">
                  <button class="ql-bold"></button><button class="ql-italic"></button><button class="ql-underline"></button><button class="ql-strike"></button>
                </span>
                <span class="ql-formats">
                  <select class="ql-color" title="Text colour"></select>
                  <select class="ql-background" title="Highlight"><option selected></option>${swatch}</select>
                </span>
                <span class="ql-formats">
                  <button class="ql-list" value="check" title="Checklist"></button>
                  <button class="ql-list" value="bullet"></button>
                  <button class="ql-list" value="ordered"></button>
                </span>
                <span class="ql-formats">
                  <button class="ql-blockquote"></button><button class="ql-code-block"></button><button class="ql-link"></button>
                </span>
                <span class="ql-formats">
                  <button type="button" class="nt-table-btn" id="nt-table-btn" title="Insert table">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="1.5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>
                  </button>
                  <button class="ql-clean" title="Clear formatting"></button>
                </span>
              </div>
              <div class="nt-grid-pop" id="nt-grid-pop" hidden>
                <div class="nt-grid" id="nt-grid"></div>
                <div class="nt-grid-label" id="nt-grid-label">Insert table</div>
              </div>
            </div>

            <div class="nt-table-tools" id="nt-table-tools" hidden>
              <span>Table</span>
              <button data-tbl="insertRowAbove">+ Row above</button>
              <button data-tbl="insertRowBelow">+ Row below</button>
              <button data-tbl="insertColumnLeft">+ Col left</button>
              <button data-tbl="insertColumnRight">+ Col right</button>
              <button data-tbl="deleteRow" class="danger">− Row</button>
              <button data-tbl="deleteColumn" class="danger">− Col</button>
              <button data-tbl="deleteTable" class="danger">Delete table</button>
            </div>

            <div id="nt-quill"></div>
          </div>
        </section>
      </div>`;

    if (!window.Quill) {
      this.$("nt-empty").textContent = "The editor library failed to load (check your connection / ad-blocker).";
      return;
    }

    this.quill = new Quill("#nt-quill", {
      theme: "snow",
      placeholder: "Write your note…",
      modules: { toolbar: "#nt-toolbar", table: true, history: { userOnly: true } },
    });

    this.buildGrid();
    this.bind(body, actions);
  },

  bind(body, actions) {
    this.$("nt-new").addEventListener("click", () => this.newNote());
    this.$("nt-save").addEventListener("click", () => this.save());
    this.$("nt-back").addEventListener("click", () => this.closeEditor());
    this.$("nt-search").addEventListener("input", (e) => { this.filter = e.target.value.trim().toLowerCase(); this.renderList(); });
    this.$("nt-title").addEventListener("input", () => this.markDirty());

    this.quill.on("text-change", (_d, _o, source) => { if (source === "user") this.markDirty(); });
    this.quill.on("editor-change", () => this.updateTableTools());

    this.$("nt-table-tools").addEventListener("mousedown", (e) => e.preventDefault());
    this.$("nt-table-tools").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tbl]");
      if (!b) return;
      const fn = b.dataset.tbl;
      this.quill.getModule("table")[fn]();
      this.markDirty();
      this.updateTableTools();
    });

    body.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); this.save(); }
    });
    // close the table picker when clicking elsewhere
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#nt-table-btn") && !e.target.closest("#nt-grid-pop")) this.$("nt-grid-pop").hidden = true;
    });
    window.addEventListener("beforeunload", (e) => {
      if (this.dirty) { e.preventDefault(); e.returnValue = ""; }
    });
  },

  // ───────────────────────── table picker ─────────────────────────
  buildGrid() {
    const { cols, rows } = this.GRID;
    const grid = this.$("nt-grid");
    grid.style.gridTemplateColumns = `repeat(${cols}, 18px)`;
    grid.innerHTML = Array.from({ length: cols * rows }, (_, i) =>
      `<div class="nt-cell" data-r="${Math.floor(i / cols) + 1}" data-c="${(i % cols) + 1}"></div>`).join("");

    const paint = (r, c) => {
      grid.querySelectorAll(".nt-cell").forEach((cell) =>
        cell.classList.toggle("on", +cell.dataset.r <= r && +cell.dataset.c <= c));
      this.$("nt-grid-label").textContent = r ? `${c} × ${r}  (columns × rows)` : "Insert table";
    };
    grid.addEventListener("mouseover", (e) => { const c = e.target.closest(".nt-cell"); if (c) paint(+c.dataset.r, +c.dataset.c); });
    grid.addEventListener("mouseleave", () => paint(0, 0));
    grid.addEventListener("click", (e) => {
      const c = e.target.closest(".nt-cell");
      if (!c) return;
      this.insertTable(+c.dataset.r, +c.dataset.c);
    });

    this.$("nt-table-btn").addEventListener("click", () => {
      const pop = this.$("nt-grid-pop");
      pop.hidden = !pop.hidden;
      paint(0, 0);
    });
  },

  insertTable(rows, cols) {
    this.$("nt-grid-pop").hidden = true;
    const q = this.quill;
    const Delta = Quill.import("delta");
    q.focus();
    const range = q.getSelection(true);
    let at = range.index;

    // Quill turns the current line into the first cell, so when the line has text
    // put the table on the line below it instead (adding one if this is the last line).
    const [line] = q.getLine(range.index);
    if (line && line.length() > 1) {
      at = q.getIndex(line) + line.length();
      if (!line.next) q.updateContents(new Delta().retain(at).insert("\n"), "user");
    }
    q.setSelection(at, 0, "silent");
    q.getModule("table").insertTable(rows, cols);

    // keep a normal paragraph after the table so there is always somewhere to type
    if (at + rows * cols >= q.getLength()) q.updateContents(new Delta().retain(q.getLength()).insert("\n"), "user");
    q.setSelection(at, 0, "user");
    this.markDirty();
    this.updateTableTools();
  },

  updateTableTools() {
    const tools = this.$("nt-table-tools");
    if (!tools || !this.quill) return;
    let inTable = false;
    try {
      const range = this.quill.getSelection();
      inTable = !!range && !!this.quill.getModule("table").getTable(range)[0];
    } catch { /* selection not ready */ }
    tools.hidden = !inTable;
  },

  // ───────────────────────── status / saving ─────────────────────────
  setStatus(text, kind = "") {
    const el = this.$("nt-status");
    if (!el) return;
    el.textContent = text;
    el.className = `nt-status ${kind}`;
  },

  markDirty() {
    if (!this.current) return;
    this.dirty = true;
    this.rev++;
    this.setStatus("Unsaved changes…");
    const btn = this.$("nt-save");
    if (btn) btn.hidden = false;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), this.SAVE_DELAY);
  },

  /** Returns true if the note is saved (or there was nothing to save). */
  async save() {
    if (!this.current || !this.dirty) return true;
    clearTimeout(this.saveTimer);
    const id = this.current;
    const rev = this.rev;
    const title = this.$("nt-title").value.trim() || "Untitled";
    this.setStatus("Saving…");
    try {
      const res = await Core.api(`/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: this.quill.getContents() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);

      const entry = this.list.find((n) => n.id === id);
      if (entry) { entry.title = title; entry.updated = j.updated; }
      this.list.sort((a, b) => b.updated - a.updated);
      this.renderList();

      if (rev === this.rev) {                 // nothing typed while we were saving
        this.dirty = false;
        this.$("nt-save").hidden = true;
        this.setStatus("Saved ✓", "ok");
      } else {
        this.saveTimer = setTimeout(() => this.save(), 300);
      }
      return true;
    } catch (e) {
      console.error("[notes] save failed", e);
      this.setStatus(`Save failed: ${e.message}`, "err");
      return false;
    }
  },

  // ───────────────────────── list / open / delete ─────────────────────────
  async onOpen() {
    if (!this.quill) return;
    await this.loadList();
    await this.migrateLocal();
  },

  async onClose() {
    if (this.dirty) await this.save();
  },

  async loadList() {
    const box = this.$("nt-list");
    try {
      const res = await Core.api("/notes");
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      this.list = j.notes ?? [];
      this.renderList();
    } catch (e) {
      console.error("[notes] list failed", e);
      box.innerHTML = `<div class="notes-error">Couldn't load notes: ${Core.esc(e.message)}</div>`;
    }
  },

  renderList() {
    const box = this.$("nt-list");
    if (!box) return;
    const rows = this.list.filter((n) => !this.filter || n.title.toLowerCase().includes(this.filter));
    if (!rows.length) {
      box.innerHTML = `<p class="muted-note" style="padding:10px">${this.list.length ? "No matches." : "No notes yet. Click New."}</p>`;
      return;
    }
    box.innerHTML = "";
    rows.forEach((n) => {
      const row = document.createElement("div");
      row.className = "note-item" + (n.id === this.current ? " active" : "");
      row.innerHTML = `
        <div class="note-item-info">
          <div class="note-item-title">${Core.esc(n.title || "Untitled")}</div>
          <div class="note-item-date">${n.updated ? new Date(n.updated).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
        </div>
        <button class="note-item-del" aria-label="Delete note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>`;
      row.addEventListener("click", () => this.openNote(n.id));
      row.querySelector(".note-item-del").addEventListener("click", (e) => { e.stopPropagation(); this.deleteNote(n.id); });
      box.appendChild(row);
    });
  },

  showEditor(on) {
    this.$("nt-editor").hidden = !on;
    this.$("nt-empty").hidden = on;
    this.$("nt-layout").classList.toggle("editing", on);
  },

  closeEditor() {
    if (this.dirty) this.save();
    this.current = null;
    this.showEditor(false);
    this.renderList();
  },

  async openNote(id) {
    if (id === this.current) { this.showEditor(true); return; }
    if (this.dirty && !(await this.save()) && !confirm("This note couldn't be saved. Discard your changes?")) return;

    this.setStatus("Loading…");
    try {
      const res = await Core.api(`/notes/${id}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);

      this.current = id;
      this.$("nt-title").value = j.note.title || "";
      this.quill.setContents(j.note.content?.ops ? j.note.content : this.EMPTY, "silent");
      this.quill.history.clear();
      this.dirty = false;
      this.$("nt-save").hidden = true;
      this.setStatus("");
      this.showEditor(true);
      this.renderList();
    } catch (e) {
      this.setStatus(`Couldn't open note: ${e.message}`, "err");
    }
  },

  async newNote() {
    if (this.dirty && !(await this.save()) && !confirm("This note couldn't be saved. Discard your changes?")) return;
    const id = `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    this.setStatus("Creating…");
    try {
      const res = await Core.api(`/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled note", content: this.EMPTY }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      this.list.unshift({ id, title: "Untitled note", updated: j.updated });
      this.current = null;                    // force a clean load
      await this.openNote(id);
      this.$("nt-title").focus();
      this.$("nt-title").select();
    } catch (e) {
      this.setStatus(`Couldn't create note: ${e.message}`, "err");
    }
  },

  async deleteNote(id) {
    const n = this.list.find((x) => x.id === id);
    if (!confirm(`Delete "${n?.title || "this note"}"? This can't be undone.`)) return;
    try {
      const res = await Core.api(`/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.list = this.list.filter((x) => x.id !== id);
      if (this.current === id) {
        this.current = null;
        this.dirty = false;
        clearTimeout(this.saveTimer);
        this.$("nt-save").hidden = true;
        this.showEditor(false);
      }
      this.renderList();
      this.setStatus("");
    } catch (e) {
      this.setStatus(`Delete failed: ${e.message}`, "err");
    }
  },

  // ───────────────── one-time import of notes stored in this browser ─────────────────
  async migrateLocal() {
    if (localStorage.getItem(this.MIGRATED_KEY)) return;
    let local = {};
    try { local = JSON.parse(localStorage.getItem(this.LOCAL_KEY) || "{}"); } catch { return; }
    const known = new Set(this.list.map((n) => n.id));
    const todo = Object.entries(local)
      .filter(([id, n]) => /^[A-Za-z0-9_-]{1,40}$/.test(id) && !known.has(id) && n)
      .sort((a, b) => (a[1].date || 0) - (b[1].date || 0));      // oldest first, so the newest stays on top

    if (!todo.length) { localStorage.setItem(this.MIGRATED_KEY, "1"); return; }
    this.setStatus(`Importing ${todo.length} note(s) from this browser…`);
    let done = 0;
    for (const [id, n] of todo) {
      try {
        const html = window.DOMPurify ? DOMPurify.sanitize(n.content || "") : "";
        const delta = JSON.parse(JSON.stringify(this.quill.clipboard.convert({ html })));
        const res = await Core.api(`/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: n.title || "Untitled", content: delta.ops?.length ? delta : this.EMPTY }),
        });
        if (res.ok) done++;
      } catch (e) { console.error("[notes] import failed for", id, e); }
    }
    if (done === todo.length) localStorage.setItem(this.MIGRATED_KEY, "1");   // your local copy is left untouched
    this.setStatus(`Imported ${done} of ${todo.length} note(s) ✓`, done === todo.length ? "ok" : "err");
    await this.loadList();
  },
});