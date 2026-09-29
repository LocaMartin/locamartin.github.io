/* Login / session / logout.
   Knows nothing about modules: once logged in it calls sidebarEngine.appReady(). */
(function () {
  const { api } = window.Core;

  const $ = (id) => document.getElementById(id);
  const setError = (msg) => { const e = $("login-error"); if (e) e.textContent = msg || ""; };

  async function verifySession() {
    try {
      const res = await api("/session");
      return res.ok && (await res.json()).success === true;
    } catch {
      return false;
    }
  }

  function showApp() {
    const login = $("login-screen");
    const app = $("app");
    if (login) login.style.display = "none";
    if (app) app.style.display = "block";
    // NOTE: the worker only accepts pages listed in ALLOWED_PAGES for /track.
    api("/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: "/death" }),
    }).catch(() => {});
    window.sidebarEngine?.appReady();
  }

  async function login(username, password) {
    setError("");
    let res;
    try {
      res = await api("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch (e) {
      console.error("[auth] login request failed", e);
      setError("Could not reach the server (network or CORS error). Check the browser console.");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      setError(data.error || `Login failed (HTTP ${res.status}).`);
      return;
    }

    // /login succeeded, but the cookie may still have been blocked as a
    // third-party cookie (page on github.io, cookie set by workers.dev).
    if (!(await verifySession())) {
      setError("Signed in, but the browser blocked the session cookie (third-party cookies). Allow cookies for this site or serve the worker from the same domain.");
      return;
    }
    showApp();
  }

  async function logout() {
    await api("/logout", { method: "POST" }).catch(() => {});
    window.location.reload();
  }

  function bind() {
    const form = $("login-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();               // never let the browser submit credentials into the URL
      const btn = form.querySelector(".login-submit");
      const u = $("username")?.value.trim();
      const p = $("password")?.value;
      if (!u || !p) return setError("Enter your username and password.");
      if (btn) btn.disabled = true;
      try { await login(u, p); } finally { if (btn) btn.disabled = false; }
    });

    $("togglePassword")?.addEventListener("click", () => {
      const pw = $("password");
      if (pw) pw.type = pw.type === "password" ? "text" : "password";
    });

    $("logout-btn")?.addEventListener("click", logout);

    verifySession().then((ok) => ok && showApp());
  }

  // Works whether the script runs before or after DOMContentLoaded.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();