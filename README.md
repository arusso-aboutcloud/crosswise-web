<p align="center">
  <a href="https://crosswise.aboutcloud.io">
    <img src="docs/crosswise_banner.png" alt="Crosswise — Toxic Permission Combination Scanner" width="800"/>
  </a>
</p>

> **Detect toxic permission combinations before they become breaches.**
> Open source (MIT) · Browser-only · No data leaves your machine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Security Scan](https://github.com/arusso-aboutcloud/crosswise-web/actions/workflows/security-scan.yml/badge.svg)](https://github.com/arusso-aboutcloud/crosswise-web/actions/workflows/security-scan.yml)

---

## What is Crosswise?

Crosswise is a **client-side browser application** that scans a Microsoft Entra ID tenant
and surfaces dangerous permission combinations — cases where individual assignments look
benign but together open the door to privilege escalation, persistence, or lateral movement.

The key insight: individual permissions are usually approved in isolation, but the combinations
are where the danger hides. Crosswise evaluates what a principal can do across the full set
of their roles and app permissions, not just each grant in isolation.

It runs entirely in your browser. The only network calls it makes are to the Microsoft Graph
API — there is no Crosswise backend, no database, and no telemetry.

---

## Status

Crosswise is in active development. MSAL authentication and tenant data collection are
working. The detection rule catalog is being built.

---

## What it does NOT do

- **No write access** — read-only Microsoft Graph scopes only
- **No data storage** — everything stays in your browser's `sessionStorage`
- **No scan-data egress** — tenant data never leaves the browser
- **No server** — zero backend, just static files served from a CDN

---

## Quick Start

### 1. Open the app

Go to **[crosswise.aboutcloud.io](https://crosswise.aboutcloud.io)** (or your self-hosted URL).

### 2. Create an App Registration in your tenant

Crosswise needs a **PKCE SPA app registration** (no client secret) in your own Microsoft
Entra ID tenant. In the Azure Portal:

1. Go to **Azure Active Directory → App registrations → New registration**
2. Name: `crosswise-scanner` (or any name you choose)
3. Supported account types: **This organizational directory only**
4. Redirect URI: **Single-page application (SPA)** → `https://crosswise.aboutcloud.io`
5. Click **Register**
6. Under **API permissions**, add the 5 delegated Graph permissions listed below and
   grant admin consent

### 3. Sign in

Enter your **Client ID** and **Tenant ID**, then sign in with Microsoft and consent to
the requested permissions.

### 4. Scan

Detection rules are in active development — stay tuned.

---

## Security model

- **PKCE (S256)** — authorization code flow with Proof Key for Code Exchange
- **No client secret** — SPA apps do not need one and cannot store one securely
- **Your own tenant** — the App Registration lives in your tenant, not a shared one
- **Delegated permissions** — the app acts on behalf of the signed-in user
- **Read-only scopes** — no write operations against Graph
- **Browser-only data** — no servers, no databases, no scan-data analytics
- **No cookies** — `sessionStorage` only, cleared when the tab closes
- **Open source** — full transparency, build verifiable from source

### Required permissions (Microsoft Graph, delegated)

| Permission | Purpose |
|---|---|
| `User.Read` | Sign in and read the signed-in user's profile |
| `Directory.Read.All` | Read directory roles, role assignments, users, groups |
| `RoleManagement.Read.Directory` | Read directory RBAC role definitions and assignments |
| `Application.Read.All` | Read app registrations and service principals |
| `Policy.Read.All` | Read Conditional Access and authentication-method policies |

None of these permissions grant write access or access to user content (mail, files, messages).

---

## Development

### Prerequisites

- **Node.js 18+**
- **npm 9+**
- A modern browser (Chrome, Edge, Firefox, Safari)
- An Entra ID tenant with rights to create an App Registration

### Setup

```bash
# Clone
git clone https://github.com/arusso-aboutcloud/crosswise-web.git
cd crosswise-web

# Install dependencies
npm install

# Dev server with hot reload (http://localhost:5173)
npm run dev

# Production build to dist/
npm run build

# Preview the production build locally
npm run preview
```

### Project structure

```
index.html                 # SPA entry point and layout
vite.config.js             # Vite build configuration
wrangler.toml              # Cloudflare Pages / Workers configuration

src/
  main.js                  # Application orchestration: MSAL auth, bootstrap
  graph.js                 # Microsoft Graph API client
  style.css                # UI styling

functions/
  ai/
    ask.js                 # Cloudflare Pages Function (dormant)

public/
  aboutcloud_logo.png      # Shared Aboutcloud branding
  favicon.png              # Site favicon
  crosswise_banner.png     # Banner image
  _headers                 # Cloudflare Pages security headers

docs/
  architecture.md          # Architecture overview
  crosswise_banner.png     # Banner source

.github/workflows/
  deploy.yml               # Cloudflare Pages deployment
  security-scan.yml        # Trivy security scanning
```

---

## Contributing

Contributions are welcome — bug reports, documentation improvements, detection rule
proposals, and UI improvements are all appreciated.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow and coding guidelines.

**Core contract (non-negotiable):** Crosswise is read-only and browser-only. No write
operations against Microsoft Graph, no backend, no persistent storage beyond `sessionStorage`.
PRs that change this contract will not be merged.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/arusso-aboutcloud/crosswise-web/issues)
- **Discussions:** [GitHub Discussions](https://github.com/arusso-aboutcloud/crosswise-web/discussions)
- **Security:** report vulnerabilities privately via [GitHub Security Advisories](https://github.com/arusso-aboutcloud/crosswise-web/security/advisories/new)

---

> Built by [Aboutcloud](https://aboutcloud.io) &bull;
> [EntraPass](https://entrapass.aboutcloud.io) &bull;
> [Entra RoleLens](https://entrarolelens.aboutcloud.io) &bull;
> [Entra Tracker](https://entratracker.aboutcloud.io) &bull;
> [AADSTS Errors](https://entraerrors.aboutcloud.io)
