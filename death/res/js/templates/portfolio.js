ModuleRegistry.register({
  id: "portfolio",
  title: "Portfolio",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  hasFullpage: true,

  STORAGE_KEY: "lm_portfolio", // unchanged
  FIELDS: ["name", "title", "summary", "github", "linkedin", "medium", "proof", "sk-lang", "sk-tools", "sk-vuln"],

  init(panel) {
    panel.innerHTML = `
      <p class="muted-note">Manage your portfolio details in full view mode.</p>
      <button class="expand-btn" data-open>Open Portfolio Editor</button>`;
    panel.querySelector("[data-open]").addEventListener("click", () => window.sidebarEngine.openFullpage("portfolio"));
  },

  loadFull(body, actions) {
    actions.innerHTML = `
      <span class="fp-flash" id="pe-saved"></span>
      <button class="btn-primary" id="pe-save">Save</button>
      <button class="btn-primary" id="pe-copy">Copy JSON</button>`;
    const f = (id, label, tag = "input", extra = "") =>
      `<div class="pe-field"><label for="pe-${id}">${label}</label><${tag} id="pe-${id}" ${extra}>${tag === "textarea" ? "</textarea>" : ""}</div>`;
    body.innerHTML = `
      <div class="pe-section"><h3>About</h3>
        <div class="pe-grid">${f("name", "Full Name")}${f("title", "Title / Role")}</div>
        ${f("summary", "Summary", "textarea", 'rows="3"')}
      </div>
      <div class="pe-section"><h3>Links</h3>
        <div class="pe-grid">${f("github", "GitHub URL")}${f("linkedin", "LinkedIn URL")}${f("medium", "Medium / Blog")}</div>
        ${f("proof", "Bug Bounty / Proof Link")}
      </div>
      <div class="pe-section"><h3>Skills</h3>
        <div class="pe-grid">${f("sk-lang", "Languages (comma separated)")}${f("sk-tools", "Tools (comma separated)")}${f("sk-vuln", "Vulnerabilities (comma separated)")}</div>
      </div>`;
    document.getElementById("pe-save").addEventListener("click", () => this.save());
    document.getElementById("pe-copy").addEventListener("click", () => this.copy());
  },

  onOpen() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || "{}"); } catch {}
    this.FIELDS.forEach((k) => {
      const el = document.getElementById(`pe-${k}`);
      if (el && d[k]) el.value = d[k];
    });
  },

  save() {
    const d = {};
    this.FIELDS.forEach((k) => { const el = document.getElementById(`pe-${k}`); if (el) d[k] = el.value; });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(d));
    Core.flash("pe-saved", "✓ Saved to browser", 2500);
  },

  copy() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || "{}"); } catch {}
    navigator.clipboard.writeText(JSON.stringify(d, null, 2)).then(() => Core.flash("pe-saved", "✓ Copied to clipboard", 2500));
  },
});
