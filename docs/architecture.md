# Crosswise Architecture

## Overview

Crosswise is a static single-page application (SPA) that connects directly from the
user's browser to the Microsoft Graph API. There is no backend: no server processes
tenant data, no database stores it, and nothing is persisted beyond the active browser
session.

```
Browser
  |
  |-- MSAL.js (PKCE) --> Microsoft Entra ID (token endpoint)
  |                          |
  |                          v
  |<------- access token ----+
  |
  |-- Bearer token --> Microsoft Graph API
  |                          |
  |                          v
  |<------- Graph data ------+
  |
  +-- in-browser rule engine --> findings rendered to DOM
  |
  sessionStorage (cleared on tab close)
```

---

## Deployment

Crosswise is deployed as a static site on **Cloudflare Pages**. All assets (HTML, CSS,
JS) are served from Cloudflare's CDN. There is no origin server.

The Cloudflare Pages build pipeline (`.github/workflows/deploy.yml`) runs `npm run build`
and deploys `dist/` on every push to `main`.

---

## Authentication

Crosswise uses the **OAuth 2.0 Authorization Code flow with PKCE (S256)**, implemented
by [MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js).

Key properties:
- **No client secret** — the App Registration is a SPA type; PKCE replaces the secret
- **Delegated permissions** — the access token represents the signed-in user, not an app
  service principal
- **User's own tenant** — the App Registration lives in the scanning user's tenant
- **Token storage** — MSAL stores tokens in `sessionStorage`; they are cleared when the
  tab closes

Auth flow:
1. User clicks "Sign in with Microsoft"
2. MSAL redirects to the Entra ID `/authorize` endpoint with a PKCE challenge
3. User authenticates and consents to the requested delegated permissions
4. Entra ID redirects back with an authorization code
5. MSAL exchanges the code (plus the PKCE verifier) for an access token
6. The access token is used for all subsequent Graph calls

---

## Data flow

1. **Collection** — `src/graph.js` calls Microsoft Graph with the delegated access token.
   Paginated endpoints are followed via `@odata.nextLink` until all pages are retrieved.
2. **Analysis** — the in-browser rule engine evaluates collected Graph data against the
   detection rule catalog to identify toxic permission combinations.
3. **Rendering** — findings are rendered to the DOM. No data is sent to any external
   service.
4. **Disposal** — all Graph data lives in JavaScript memory and `sessionStorage`. Closing
   or refreshing the tab clears it completely.

Nothing is written to disk, sent to a server, or persisted across sessions.

---

## Components

| File | Role |
|---|---|
| `index.html` | SPA shell: layout markup for the sign-in screen and dashboard |
| `src/main.js` | Application bootstrap: MSAL initialization, sign-in/sign-out, post-auth orchestration |
| `src/graph.js` | Microsoft Graph API client: token acquisition, single-resource fetch, paginated fetch, typed endpoint methods |
| Rule engine | In active development — will evaluate Graph data against the detection rule catalog |
| Report UI | In active development — will render findings grouped by category and severity |

---

## Rule engine (design intent)

The rule engine evaluates the collected Graph data against a catalog of detection rules.
Each rule defines a pattern — a set of conditions across roles, app permissions, group
memberships, or policy gaps — that constitutes a toxic combination. When a principal
matches a rule's conditions, a finding is emitted.

The rule catalog is maintained in the Go CLI repo (`github.com/arusso-aboutcloud/crosswise`)
and synchronized to `crosswise-web` for browser evaluation.

The rule engine is in active development.

---

## Graph permissions

Crosswise requests five delegated Microsoft Graph permissions. All are read-only and
none grant access to user content (mail, files, messages).

| Permission | What it enables |
|---|---|
| `User.Read` | Sign in and read the signed-in user's profile |
| `Directory.Read.All` | Read directory roles, role assignments, users, groups |
| `RoleManagement.Read.Directory` | Read directory RBAC role definitions and assignments |
| `Application.Read.All` | Read app registrations and service principals |
| `Policy.Read.All` | Read Conditional Access and authentication-method policies |

---

## Security boundaries

| Boundary | Mechanism |
|---|---|
| Browser to Entra ID (auth) | TLS; PKCE S256 code challenge |
| Browser to Microsoft Graph | TLS; short-lived bearer token issued by the user's tenant |
| Browser to Cloudflare Pages | TLS; security headers enforced via `public/_headers` |
| Data at rest | None — sessionStorage only, no persistent storage |
| Data egress | None — no backend, no analytics on scan data |

---

## What Crosswise does not do

- No write operations against Microsoft Graph
- No backend API or database
- No telemetry on scan results or tenant data
- No cross-origin calls except to `login.microsoftonline.com` and `graph.microsoft.com`
- No persistent storage beyond `sessionStorage`
