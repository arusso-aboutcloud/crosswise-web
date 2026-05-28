# Security Policy

## Supported Versions

Crosswise is a browser-only SPA deployed continuously to Cloudflare Pages.
There are no long-lived release branches — users always receive the latest
deployed version automatically. Security fixes are applied to `main` and
promoted to production within one business day.

| Version | Status |
|---------|--------|
| Latest deployed (`main`) | Supported |
| Any pinned or self-hosted fork | Not supported |

If you are self-hosting Crosswise, keep your fork in sync with `main` to
receive security fixes.

---

## Reporting a Vulnerability

**Please do not open a public GitHub Issue for security vulnerabilities.**

Report privately via
[GitHub Security Advisories](https://github.com/arusso-aboutcloud/crosswise-web/security/advisories/new).
This lets us triage and patch before public disclosure.

Include as much of the following as possible:

- A clear description of the vulnerability and its impact
- Steps to reproduce (or a proof-of-concept)
- The browser, OS, and Crosswise version (URL + date is sufficient)
- Any relevant network traces or screenshots (redact tenant data)

### Response timeline

| Milestone | Target |
|-----------|--------|
| Acknowledgement | Within 48 hours |
| Initial triage and severity assessment | Within 5 business days |
| Fix or mitigation in `main` | Dependent on severity (see below) |
| CVE / public disclosure | Coordinated with the reporter |

| Severity | Fix target |
|----------|------------|
| Critical (data exfiltration, token theft, auth bypass) | Within 24-48 hours |
| High (XSS, CSP bypass, credential leak) | Within 7 days |
| Medium (information disclosure, CORS misconfiguration) | Within 30 days |
| Low (hardening improvements, minor info leaks) | Next regular release |

We will keep you informed at each milestone. If a reported vulnerability is
declined we will explain why. Credit is given in the release notes unless
you prefer to remain anonymous.

---

## Security Architecture

Understanding the architecture helps scope valid reports.

### What Crosswise does

- Runs entirely in the **user's browser** — no server-side processing of tenant data
- Authenticates via **PKCE S256** (no client secret, no implicit flow)
- Makes **read-only** Microsoft Graph API calls using a delegated access token
- Stores tokens and state in **`sessionStorage`** only (cleared when the tab closes)

### What Crosswise does not do

- Transmit, log, or persist any tenant data to Aboutcloud servers
- Store credentials, tokens, or tenant data beyond the browser session
- Use a backend API that holds tenant information
- Request write permissions to Microsoft Graph
- Access user content (mail, files, messages, calendars)

### Required Graph permissions (delegated, read-only)

| Permission | Purpose | Write access granted? |
|---|---|---|
| `User.Read` | Sign in and read the signed-in user's profile | No |
| `Directory.Read.All` | Read directory roles, role assignments, users, groups | No |
| `RoleManagement.Read.Directory` | Read directory RBAC role definitions and assignments | No |
| `Application.Read.All` | Read app registrations and service principals | No |
| `Policy.Read.All` | Read Conditional Access and authentication-method policies | No |

None of these permissions grant write access or access to user-generated content.

### Trust boundaries

| Boundary | Notes |
|----------|-------|
| Browser to Microsoft Entra ID | TLS; PKCE S256 authorization code flow |
| Browser to Microsoft Graph API | TLS; short-lived bearer token issued by the user's own tenant |
| Browser to Cloudflare Pages | TLS; security headers enforced via `public/_headers` |
| GitHub Actions | Trivy filesystem scan + Dependabot on every push |

---

## In-Scope Vulnerabilities

The following are considered valid security reports:

- **XSS** — injecting arbitrary script into the dashboard from Graph API responses
- **CSP bypass** — circumventing the `Content-Security-Policy` header
- **Token exposure** — access tokens leaving `sessionStorage` or being sent to a third party
- **PKCE flow weaknesses** — state/nonce bypass, redirect URI manipulation
- **Data exfiltration** — tenant data sent to any host other than `graph.microsoft.com` or `login.microsoftonline.com`
- **Supply chain** — malicious code introduced via an npm dependency
- **Cloudflare misconfiguration** — WAF rules or security headers that fail to block a known attack class
- **Sensitive data in source** — credentials, tokens, or operator-specific values committed to the public repository

---

## Out-of-Scope

The following are **not** considered valid reports for this project:

- Vulnerabilities in **Microsoft Graph API or Entra ID** itself — report those to [Microsoft MSRC](https://msrc.microsoft.com/report)
- Vulnerabilities in **Cloudflare's platform** — report those to [Cloudflare](https://www.cloudflare.com/disclosure/)
- Missing security headers that are already set by the Cloudflare Response Header Transform (verify against a live request, not the static `public/_headers` file)
- Rate limiting of the Graph API — this is governed by Microsoft's throttling policy
- Self-XSS (requires the user to paste code into the browser console)
- Attacks that require physical access to the user's device
- Social engineering of the user or the Aboutcloud team
- Scanner findings with no demonstrated impact (automated Nuclei/ZAP reports without a PoC)
- The fact that tenant data is visible in `sessionStorage` — this is by design and documented; the data is accessible only to the authenticated user in their own browser session

---

## Dependency Security

- **Dependabot** is enabled and opens PRs for outdated or vulnerable npm dependencies automatically.
- **Trivy** runs a filesystem vulnerability scan on every push and pull request (`.github/workflows/security-scan.yml`).
- Scan results are uploaded to GitHub Security Code scanning alerts.

---

## Security Contact

For questions about this policy or the security model contact
[security@aboutcloud.io](mailto:security@aboutcloud.io) or open a
[private advisory](https://github.com/arusso-aboutcloud/crosswise-web/security/advisories/new).
