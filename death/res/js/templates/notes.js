ModuleRegistry.register({
  id: "notes",
  title: "Notes",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  hasFullpage: true,

  STORAGE_KEY: "lm_notes_v2", // unchanged → your existing notes keep working
  notes: {},
  currentId: null,
  quill: null,

  // ── storage ──
  load() {
    try { this.notes = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || "{}"); }
    catch { this.notes = {}; }
  },
  persist() { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notes)); },
  sortedIds() { return Object.keys(this.notes).sort((a, b) => this.notes[b].date - this.notes[a].date); },
  clean(html) { return window.DOMPurify ? DOMPurify.sanitize(html || "") : html || ""; },

  // ── sidebar mini panel ──
  init(panel) {
    this.load();
    panel.innerHTML = `
      <div id="notes-mini-list"></div>
      <button class="expand-btn" data-open>Open Notes Workspace</button>`;
    panel.querySelector("[data-open]").addEventListener("click", () => window.sidebarEngine.openFullpage("notes"));
    this.renderMini();
  },
  onAppReady() { this.load(); this.renderMini(); },

  renderMini() {
    const list = document.getElementById("notes-mini-list");
    if (!list) return;
    const ids = this.sortedIds().slice(0, 5);
    if (!ids.length) { list.innerHTML = `<p class="muted-note">No notes yet.</p>`; return; }
    list.innerHTML = "";
    ids.forEach((id) => {
      const n = this.notes[id];
      const row = document.createElement("div");
      row.className = "note-item";
      row.style.cursor = "pointer";
      row.innerHTML = `<div class="note-item-info"><div class="note-item-title">${Core.esc(n.title || "Untitled")}</div><div class="note-item-date">${new Date(n.date).toLocaleDateString()}</div></div>`;
      row.addEventListener("click", () => { window.sidebarEngine.openFullpage("notes"); this.openNote(id); });
      list.appendChild(row);
    });
  },

  // ── fullscreen ──
  loadFull(body) {
    body.style.padding = "0";
    body.style.maxWidth = "none";
    body.innerHTML = `
      <div class="notes-layout">
        <div class="notes-sidebar">
          <div class="notes-sidebar-header"><span>Saved Notes</span>
            <button class="new-note-btn" id="note-new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New
            </button>
          </div>
          <div class="notes-list" id="notes-full-list"></div>
        </div>
        <div class="note-editor-col">
          <div class="note-editor-top">
            <input type="text" id="note-title" class="note-title-input" placeholder="Note title...">
            <button class="save-btn" id="note-save">Save</button>
            <span class="save-confirm" id="note-saved"></span>
          </div>
          <div id="quill-editor"></div>
        </div>
      </div>`;
    if (window.Quill) this.quill = new Quill("#quill-editor", { theme: "snow", placeholder: "Write your note here..." });
    document.getElementById("note-new").addEventListener("click", () => this.newNote());
    document.getElementById("note-save").addEventListener("click", () => this.saveCurrent());
  },
  onOpen() { this.load(); this.renderFullList(); },

  renderFullList() {
    const list = document.getElementById("notes-full-list");
    if (!list) return;
    const ids = this.sortedIds();
    if (!ids.length) { list.innerHTML = `<p class="muted-note" style="padding:10px">No notes yet. Click New.</p>`; return; }
    list.innerHTML = "";
    ids.forEach((id) => {
      const n = this.notes[id];
      const row = document.createElement("div");
      row.className = "note-item" + (id === this.currentId ? " active" : "");
      row.innerHTML = `
        <div class="note-item-info" style="cursor:pointer"><div class="note-item-title">${Core.esc(n.title || "Untitled")}</div><div class="note-item-date">${new Date(n.date).toLocaleDateString()}</div></div>
        <button class="note-item-del" aria-label="Delete note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>`;
      row.querySelector(".note-item-info").addEventListener("click", () => this.openNote(id));
      row.querySelector(".note-item-del").addEventListener("click", (e) => { e.stopPropagation(); this.deleteNote(id); });
      list.appendChild(row);
    });
  },

  newNote() {
    const id = `note_${Date.now()}`;
    this.notes[id] = { title: "Untitled Note", content: "", date: Date.now() };
    this.persist();
    this.openNote(id);
  },
  openNote(id) {
    const n = this.notes[id];
    if (!n) return;
    this.currentId = id;
    const t = document.getElementById("note-title");
    if (t) t.value = n.title || "";
    if (this.quill) this.quill.root.innerHTML = this.clean(n.content);
    Core.setText("note-saved", "");
    this.renderFullList();
  },
  saveCurrent() {
    if (!this.currentId) return;
    const n = this.notes[this.currentId];
    n.title = document.getElementById("note-title")?.value || "Untitled";
    n.content = this.clean(this.quill ? this.quill.root.innerHTML : "");
    n.date = Date.now();
    this.persist();
    this.renderFullList();
    this.renderMini();
    Core.flash("note-saved", "✓ Saved");
  },
  deleteNote(id) {
    if (!confirm("Delete this note?")) return;
    delete this.notes[id];
    this.persist();
    if (this.currentId === id) {
      this.currentId = null;
      const t = document.getElementById("note-title");
      if (t) t.value = "";
      if (this.quill) this.quill.root.innerHTML = "";
    }
    this.renderFullList();
    this.renderMini();
  },
});