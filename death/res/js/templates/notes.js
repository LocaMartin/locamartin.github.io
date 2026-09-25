window.NotesTemplate = {
  quillInstance: null,

  init: async function () {
    const container = document.getElementById("panel-notes");
    if (!container) return;

    container.innerHTML = `
      <div class="template-mini-panel">
        <p style="font-size: 0.85rem; color: var(--text-muted);">Scratchpad</p>
        <div id="mini-notes-preview" style="font-size: 0.8rem; color: var(--text-main); margin: 0.5rem 0;">No quick notes saved.</div>
        <button class="expand-btn" style="width:100%; padding: 0.5rem; background: var(--bg-panel); border:1px solid var(--border-color); color:var(--text-main); border-radius:6px; cursor:pointer;" onclick="window.sidebarEngine?.openFullpage('notes')">
          Open Full Editor
        </button>
      </div>
    `;
  },

  loadFull: async function () {
    const body = document.getElementById("fp-body-notes");
    if (!body) return;

    body.innerHTML = `
      <h2>Target Notes & Payload Stash</h2>
      <div id="quill-editor" style="height: 350px; background: var(--bg-card); color: var(--text-main); margin-top: 1rem; border-radius: 8px;"></div>
    `;

    if (window.Quill && !this.quillInstance) {
      this.quillInstance = new window.Quill("#quill-editor", {
        theme: "snow",
        placeholder: "Write target notes, headers, or payloads..."
      });
    }
  }
};