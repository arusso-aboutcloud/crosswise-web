import { PublicClientApplication } from '@azure/msal-browser';
import { GraphAPI } from './graph.js';

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
  scopes: ['User.Read', 'Directory.Read.All'],
};

let graphApi = null;

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
// UI helpers
// ============================================
function showSignIn() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard(account, tenantName) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  const userEl = document.getElementById('user-info');
  if (userEl) userEl.textContent = account.name || account.username || '';
  const tenantEl = document.getElementById('tenant-name');
  if (tenantEl) tenantEl.textContent = escapeHtml(tenantName);
}

function showLoading(text) {
  const loadingEl = document.getElementById('loading-text');
  if (loadingEl) loadingEl.textContent = text || 'Loading...';
  document.getElementById('loading-overlay')?.classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay')?.classList.add('hidden');
}
