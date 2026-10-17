/* ────────────────────────────────────────────────────────────
   Which modules are ATTACHED, and in what order (= sidebar order).

   All of these except "notes" now live in templates.js/templates.css —
   attach/detach for those is just adding/removing the id below (no
   separate <script>/<link> to manage anymore). "notes" still has its
   own notes.js/notes.css pair in index.html.
   ──────────────────────────────────────────────────────────── */
window.SIDEBAR_MODULES = [
  "home",
  "death",
  "logs",
  "analytics",
  "notes",
  "database",
  "theme",
  "app",
  "nuke",
  "ragex",
];