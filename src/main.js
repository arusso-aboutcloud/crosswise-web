import { PublicClientApplication } from '@azure/msal-browser';
import { GraphAPI } from './graph.js';
import { collectRecords } from './collector.js';
import { evaluateAllRules } from './engine.js';
import { rules } from './rules/index.js';
import { renderTemplate, buildTemplateContext } from './render.js';
import { initHero } from './hero.js';

// ============================================
// Security helper
// ============================================
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

// ============================================
// MSAL configuration
// ============================================
const msalConfig = {
  auth: {
    clientId: '4b4def46-865f-415e-af9f-b65825197430',
    authority: 'https://login.microsoftonline.com/0b259eac-5a5e-4c47-bc9f-f29ed875b165',
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
};

const loginRequest = {
  scopes: ['User.Read', 'Directory.Read.All', 'RoleManagement.Read.Directory'],
};

let graphApi = null;
let heroInstance = null;

// ============================================
// Bootstrap
// ============================================
window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btn-signin')?.addEventListener('click', signIn);
  document.getElementById('btn-signout')?.addEventListener('click', signOut);

  try {
    window.msalInstance = new PublicClientApplication(msalConfig);
    await window.msalInstance.initialize();
    await window.msalInstance.handleRedirectPromise().catch(() => null);
    const accounts = window.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      await initializeApp(accounts[0]);
    } else {
      showSignIn();
    }
  } catch (err) {
    console.error('MSAL init failed:', err);
    showSignIn();
  }
});

// ============================================
// Authentication
// ============================================
async function signIn() {
  try {
    if (!window.msalInstance) {
      window.msalInstance = new PublicClientApplication(msalConfig);
      await window.msalInstance.initialize();
    }
    await window.msalInstance.loginRedirect(loginRequest);
  } catch (err) {
    console.error('Sign-in failed:', err);
    const errEl = document.getElementById('error-msg');
    if (errEl) {
      errEl.textContent = 'Sign-in failed: ' + err.message;
      errEl.classList.remove('hidden');
    }
  }
}

function signOut() {
  if (window.msalInstance) {
    window.msalInstance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }
}

// ============================================
// Post-sign-in: fetch tenant name and show dashboard
// ============================================
async function initializeApp(account) {
  window.msalInstance.setActiveAccount(account);
  graphApi = new GraphAPI(window.msalInstance, loginRequest.scopes);

  showLoading('Fetching tenant info...');

  let tenantName = 'Unknown tenant';
  try {
    const org = await graphApi.getOrganization();
    if (org?.displayName) tenantName = org.displayName;
  } catch (err) {
    console.error('Organization fetch failed:', err);
  }

  hideLoading();
  showDashboard(account, tenantName);
}

// ============================================
// Scan
// ============================================
async function runScan() {
  const btn = document.getElementById('btn-scan');
  const statusEl = document.getElementById('scan-status');
  if (btn) btn.disabled = true;
  if (statusEl) statusEl.textContent = '';

  document.getElementById('prescan-prompt')?.classList.add('hidden');

  try {
    showLoading('Collecting tenant data...');
    const records = await collectRecords(graphApi);

    showLoading('Evaluating detection rules...');
    const matches = evaluateAllRules(rules, records);

    hideLoading();
    renderFindings(matches);

    if (statusEl) {
      const principalCount = new Set(matches.map(m => m.principal.id)).size;
      statusEl.textContent = matches.length > 0
        ? `${matches.length} finding${matches.length !== 1 ? 's' : ''} across ${principalCount} principal${principalCount !== 1 ? 's' : ''}`
        : 'Scan complete';
    }
  } catch (err) {
    console.error('Scan failed:', err);
    hideLoading();
    renderScanError(err.message || String(err));
    if (statusEl) statusEl.textContent = 'Scan failed';
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================
// Findings render
// ============================================
function renderFindings(matches) {
  const container = document.getElementById('findings-container');
  if (!container) return;

  if (matches.length === 0) {
    container.innerHTML =
      '<div class="pre-scan">' +
        '<h3>No findings</h3>' +
        '<p>No toxic permission combinations detected for the active detection rules.</p>' +
      '</div>';
    return;
  }

  const cards = matches.map(({ rule, principal, scope }) => {
    const ctx = buildTemplateContext(principal, scope);
    const summary = renderTemplate(rule.finding.summary, ctx);
    const sev = escapeHtml(rule.severity);
    const principalType = escapeHtml(principal.type);
    const displayName = escapeHtml(principal.displayName);

    return (
      '<div class="gap-card ' + sev + '">' +
        '<div class="gap-card-top">' +
          '<span class="gap-sev-badge ' + sev + '">' + sev + '</span>' +
          '<span class="gap-type-tag">' + escapeHtml(rule.id) + '</span>' +
          '<span class="gap-card-title">' + escapeHtml(rule.finding.title) + '</span>' +
        '</div>' +
        '<div class="gap-card-desc">' + escapeHtml(summary) + '</div>' +
        '<div class="gap-rec"><strong>Remediation:</strong> ' +
          escapeHtml(rule.finding.remediationSummary) +
        '</div>' +
        '<div class="gap-card-footer">' +
          '<span class="gap-context">' +
            'Principal: ' + displayName + ' &bull; Type: ' + principalType +
            ' &bull; Scope: ' + escapeHtml(scope) +
          '</span>' +
        '</div>' +
      '</div>'
    );
  });

  container.innerHTML = '<div class="gap-list">' + cards.join('') + '</div>';
}

function renderScanError(message) {
  const container = document.getElementById('findings-container');
  if (!container) return;
  container.innerHTML =
    '<div class="gap-card high">' +
      '<div class="gap-card-top">' +
        '<span class="gap-sev-badge high">ERROR</span>' +
        '<span class="gap-card-title">Scan failed</span>' +
      '</div>' +
      '<div class="gap-card-desc">' + escapeHtml(message) + '</div>' +
    '</div>';
}

// ============================================
// UI helpers
// ============================================
function showSignIn() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  if (!heroInstance) {
    heroInstance = initHero('hero-container');
  }
}

function showDashboard(account, tenantName) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  if (heroInstance) { heroInstance.destroy(); heroInstance = null; }
  const userEl = document.getElementById('user-info');
  if (userEl) userEl.textContent = account.name || account.username || '';
  const tenantEl = document.getElementById('tenant-name');
  if (tenantEl) tenantEl.textContent = escapeHtml(tenantName);
  document.getElementById('btn-scan')?.addEventListener('click', runScan);

  // Dev-only demo button — Vite replaces import.meta.env.DEV with `false` in
  // production builds, making this entire block dead code that is tree-shaken out.
  // The dynamic import inside also disappears, so demo-data.js never enters the
  // production bundle.
  if (import.meta.env.DEV) {
    const scanBar = document.querySelector('.scan-bar');
    if (scanBar) {
      const demoBtn = document.createElement('button');
      demoBtn.className = 'btn-ghost';
      demoBtn.style.cssText = 'font-size:0.78rem;opacity:0.65;border:1px dashed var(--border);';
      demoBtn.textContent = 'Demo (dev only)';
      demoBtn.addEventListener('click', async () => {
        const { demoRecords } = await import('./demo-data.js');
        document.getElementById('prescan-prompt')?.classList.add('hidden');
        const matches = evaluateAllRules(rules, demoRecords);
        renderFindings(matches);
        const statusEl = document.getElementById('scan-status');
        if (statusEl) {
          statusEl.textContent = 'Demo scan (synthetic data) -- '
            + matches.length + ' finding' + (matches.length !== 1 ? 's' : '');
        }
      });
      scanBar.appendChild(demoBtn);
    }
  }
}

function showLoading(text) {
  const loadingEl = document.getElementById('loading-text');
  if (loadingEl) loadingEl.textContent = text || 'Loading...';
  document.getElementById('loading-overlay')?.classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay')?.classList.add('hidden');
}
