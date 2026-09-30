# Sidebar modules

Every sidebar item is a **module**: one JS file (+ optional CSS file) that registers itself.
Clicking a sidebar item opens the module **fullscreen**. The ☰ button in every fullscreen header
re-opens the sidebar so you can switch modules without closing first.

    res/js/templates/<id>.js      the module
    res/css/templates/<id>.css    its styles
    res/js/sidebar-config.js      enabled module ids (order = sidebar order)

## Attach a module
1. Copy `templates/home.js` to `templates/myproject.js`; change `id`, `title`, `icon`, `description`.
2. Add its `<script>` and `<link>` to `index.html`.
3. Add `"myproject"` to `window.SIDEBAR_MODULES` in `sidebar-config.js`.

## Detach a module
Remove its id from `sidebar-config.js` (optionally delete its `<script>`/`<link>` and files).
Nothing else references a module by name, except that Death Pipeline shows an "All logs →"
button only if the `logs` module is attached.

## Module contract
```js
ModuleRegistry.register({
  id, title, icon,          // required
  description, badge,       // optional (Home launcher card / sidebar pill)
  flush: true,              // optional: no padding, module manages its own scrolling (Notes)
  loadFull(body, actions),  // once, first time the panel opens. actions = header button area
  onOpen(), onClose(),      // every open / close
  onAppReady(),             // once, right after login
});
```
Rules: prefix DOM ids with your module id, call the worker with `Core.api()`, escape data with
`Core.esc()` before using innerHTML, keep styles in your own CSS file.

## Worker (worker.js) — Cloudflare bindings
| Type            | Name             | Used by                          |
|-----------------|------------------|----------------------------------|
| KV namespace    | `ANALYTICS`      | Analytics                        |
| KV namespace    | `NOTIFICATIONS`  | Death Pipeline + Logs            |
| KV namespace    | `NOTES`          | Notes                            |
| Secret          | `AUTH_SESSION_SECRET`, `DASHBOARD_USERNAME`, `DASHBOARD_PASSWORD_HASH`, `DEATH_NOTIFY_SECRET` | auth / GitHub Actions |
| Variable (opt.) | `GITHUB_REPO`    | repo to read workflow runs from (default `LocaMartin/locamartin.github.io`) |
| Secret (opt.)   | `GITHUB_TOKEN`   | only needed if that repo is private |