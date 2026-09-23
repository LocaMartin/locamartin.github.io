# Death dashboard auth migration

This bundle changes `/dashboard` to `/death`, removes Google Sign-In, and uses
Cloudflare Worker environment variables for username/password authentication.

## Cloudflare Worker variables

Set these in Worker Settings → Variables and Secrets:

- `DASHBOARD_ORIGIN` = `https://locamartin.github.io`
- `PUBLIC_SITE_ORIGIN` = `https://locamartin.github.io`
- `DASHBOARD_USERNAME` = your chosen username
- `DASHBOARD_PASSWORD` = your chosen password (Secret)
- `AUTH_SESSION_SECRET` = long random secret (Secret)

Keep existing bindings/secrets such as `BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`GITHUB_TOKEN`, `ANALYTICS`, and `NOTIFICATIONS`.

## Apply

From the repository root:

```bash
mv dashboard death
cp death_auth_ready/death/index.html death/index.html
cp death_auth_ready/res/js/dashboard.js res/js/dashboard.js
cp death_auth_ready/res/css/dashboard.css res/css/dashboard.css
cp death_auth_ready/worker.js worker.js
```

The existing `death/img/death.png` remains untouched.

The Worker protects `/stats` and all `/death/*` API routes except the Telegram
webhook. The browser receives only an expiring signed HttpOnly session cookie;
the username/password values are never returned to the browser.

Open:

`https://locamartin.github.io/death`
