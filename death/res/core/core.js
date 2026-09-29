/* Shared helpers available to every module as window.Core */
window.Core = {
  WORKER: "https://locamartin-auth.locamartin.workers.dev",

  /** fetch wrapper: always sends the session cookie. Returns the Response. */
  api(path, opts = {}) {
    return fetch(`${this.WORKER}${path}`, { credentials: "include", ...opts });
  },

  /** Escape text before putting it in innerHTML. */
  esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  },

  /** Set textContent by id (numbers get locale formatting). */
  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof val === "number" ? val.toLocaleString() : val;
  },

  /** Show a short confirmation message in an element, then clear it. */
  flash(id, msg, ms = 2000) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    setTimeout(() => (el.textContent = ""), ms);
  },
};