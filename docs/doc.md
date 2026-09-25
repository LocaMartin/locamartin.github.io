# Documentation: Death Dashboard & Auth Migration

This document provides complete setup instructions, architecture details, and technical documentation for the **Death Dashboard** authentication migration and Cloudflare Worker telemetry integration.

---

## Technical Overview

The authentication migration converts the dashboard path from `/dashboard` to `/death`, removes Google Sign-In, and introduces server-side session authentication handled via a Cloudflare Worker. Authenticated users receive an expiring, signed, `HttpOnly` session cookie.

### Key Architecture Components

* **Frontend**: HTML5, custom CSS (`death_10.css`), vanilla JavaScript (`death_11.js`), and Quill WYSIWYG editor integration.


* **Backend Worker**: Cloudflare Worker (`worker_3.js`) acting as an API gateway, authentication layer, telemetry logger, and analytics aggregator.


* **Authentication**: Password verification via PBKDF2 with SHA-256 and HMAC-SHA256 signed session cookies (`lm_session`).



---

## File Structure & Directory Layout

```text
.
├── death/
│   ├── index.html
│   └── img/
│       └── death.png
├── res/
│   ├── css/
│   │   └── dashboard.css (death_10.css)
│   └── js/
│       └── dashboard.js  (death_11.js)
├── worker.js             (worker_3.js)
└── README.md

```

(Source:)

---

## Configuration & Environment Variables

Configure the following secrets and environment variables inside Cloudflare Worker Settings (**Settings** → **Variables and Secrets**):

| Variable | Type | Description |
| --- | --- | --- |
| `DASHBOARD_ORIGIN` | Plaintext | Public base URL (e.g., `[https://locamartin.github.io](https://locamartin.github.io)`)

 |
| `PUBLIC_SITE_ORIGIN` | Plaintext | Domain for CORS headers

 |
| `DASHBOARD_USERNAME` | Plaintext | Administrative username

 |
| `DASHBOARD_PASSWORD_HASH` | Secret | Salted PBKDF2 hash formatted as `pbkdf2-sha256$iterations$salt$hash`<br> |
| `AUTH_SESSION_SECRET` | Secret | Long random string used for HMAC signing

 |
| `BOT_TOKEN` | Secret | Telegram Bot API token

 |
| `TELEGRAM_WEBHOOK_SECRET` | Secret | Secret header for verifying Telegram webhooks

 |
| `GITHUB_TOKEN` | Secret | GitHub Personal Access Token for workflow status queries

 |

### Required KV Namespace Bindings

* `ANALYTICS`: Stores page counts and daily access metrics.


* `NOTIFICATIONS`: Stores compressed logs, execution stats, and pipeline metrics.



---

## Deployment Instructions

To apply the authentication migration from the repository root, run the following commands:

```bash
# Rename dashboard path
mv dashboard death

# Copy build artifacts into workspace
cp death_auth_ready/death/index.html death/index.html
cp death_auth_ready/res/js/dashboard.js res/js/dashboard.js
cp death_auth_ready/res/css/dashboard.css res/css/dashboard.css
cp death_auth_ready/worker.js worker.js

```

(Source:)

Once deployed, access the interface at:
`[https://locamartin.github.io/death](https://locamartin.github.io/death)`

---

## API Endpoint Reference

### Authentication Routes

#### `POST /login`

Authenticates credentials and issues a signed `HttpOnly` cookie.

* **Request Body**:
```json
{
  "username": "admin",
  "password": "your_password"
}

```


* **Success Response (200 OK)**:
* Sets Cookie: `lm_session=<payload>.<hmac_signature>; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=28800`



```json
{ "success": true }

```



#### `GET /session`

Validates the presence and signature of the `lm_session` cookie.

* **Response**: `{ "success": true }` or `{ "success": false }`


#### `POST /logout`

Clears the active session cookie.

* **Response**: Sets `lm_session` `Max-Age=0`.



---

### Telemetry & Analytics Routes

#### `POST /track`

Increments view metrics for allowed pathnames (`/`, `/dashboard`, `/projects`, `/blog`, `/contact`).

* **Request Body**:
```json
{ "page": "/dashboard" }

```



#### `GET /stats`

Retrieves aggregated page metrics and 7-day daily visit totals.

#### `GET /death/stats`

Retrieves line-count statistics from repository artifacts alongside GitHub workflow status metrics.

#### `POST /death/webhook`

Receives status updates via inbound webhooks and stores gzip-compressed log entries in the `NOTIFICATIONS` KV store.

---

## Client Features & Modules

1. **Session & Auth Management**: Automatically checks session validity on DOM load and updates display state between login screens and active panels.


2. **Notes Scratchpad**: Integrated rich text editor powered by Quill with local storage persistence (`lm_notes_v2`).


3. **Portfolio Editor**: Local state manager for managing developer resume and skill fields.
