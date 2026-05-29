# Contributing to Crosswise

Thanks for your interest in improving Crosswise! This project is an open-source
(MIT) toxic permission combination scanner for Microsoft Entra ID. Contributions
of all kinds are welcome — bug reports, documentation fixes, detection rule proposals,
and UI improvements.

## Ways to contribute

- **Report a bug** — open a [GitHub Issue](https://github.com/arusso-aboutcloud/crosswise-web/issues)
  with steps to reproduce, expected vs. actual behavior, and your browser/OS.
- **Suggest a feature or detection rule** — open an issue describing the use case before sending a PR.
- **Improve the docs** — fixes to anything under `docs/` or the `README` are very welcome.
- **Submit code** — see the workflow below.

## Development setup

```bash
git clone https://github.com/arusso-aboutcloud/crosswise-web.git
cd crosswise-web
npm install
npm run dev          # http://localhost:5173
```

To run a scan locally you also need an App Registration in an Entra ID tenant with the
five delegated Graph permissions listed in the README.

Useful scripts:

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Pull request workflow

1. **Fork** the repository and create a feature branch from `main`
   (e.g. `fix/graph-pagination`, `docs/architecture-update`).
2. **Make your change.** Keep PRs focused — one logical change per PR.
3. **Verify it builds:** `npm run build` must succeed.
4. **Test in the browser:** run `npm run dev` and confirm the affected flow
   still works end-to-end (sign-in, tenant fetch, the relevant UI section).
5. **Open a PR** against `main` with a clear description of what changed and why.
   Link any related issue.
6. CI runs the Cloudflare Pages build and the Trivy security scan on every PR —
   please make sure both pass.

## Coding guidelines

- The app is **vanilla JavaScript** (ES modules) plus Vite — no framework. Keep
  new code dependency-free unless there is a strong reason to add a package.
- Match the existing style in `src/` (2-space indentation, ES modules).
- Save files as **UTF-8** with no BOM.
- Update the relevant document under `docs/` when behavior changes.

## Core contract (non-negotiable)

Crosswise is **read-only** and **browser-only**:

- No write operations against Microsoft Graph
- No backend server or database
- No persistent storage beyond `sessionStorage`
- No transmission of tenant data to any server other than Microsoft Graph

PRs that change this contract will not be merged.

## Adding AI-agent app IDs

CW-007 detects AI-agent service principals that hold Application Administrator.
The "AI agent" classification is determined by membership in a curated allowlist
at `src/data/ai-agent-app-ids.js`.

**Why it is hand-curated:** Microsoft provides no API that classifies a service
principal as an AI agent. Auto-populating the list would risk false positives in
a security tool, which erodes user trust. Every entry is reviewed by a human.

**To propose a new entry:**

1. Open a PR adding an object to the `AI_AGENT_APPS` array in
   `src/data/ai-agent-app-ids.js`:
   ```js
   {
     appId:  '<the-app-id-guid>',
     name:   '<human-readable service name>',
     source: '<URL to Microsoft documentation or other verifiable reference>',
   }
   ```
2. The `source` field must be a real, verifiable URL — a Microsoft Learn page,
   a Power Platform admin reference, or equivalent official documentation that
   confirms the appId belongs to the service. Unsourced entries will not be merged.
3. `npm run test` validates every entry: GUID format, no duplicates, non-empty
   fields. CI will fail the build if the entry is malformed.

**Coverage note:** This list covers Microsoft first-party AI services only.
Custom organizational AI agents are caught by CW-004, which fires on any
service principal holding Application Administrator regardless of AI classification.

## Reporting security issues

Please do **not** open a public issue for security vulnerabilities. Report them
privately via [GitHub Security Advisories](https://github.com/arusso-aboutcloud/crosswise-web/security/advisories/new).

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
