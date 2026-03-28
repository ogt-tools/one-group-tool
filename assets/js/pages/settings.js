/**
 * settings.js | ONE Group Tools
 * Settings page functionality with proxy configuration and testing
 */

import { ProxyApi, SimCoApi, SimCoToolsApi, clearAllCache, getCacheAge } from '../api.js';
import { getRealm } from '../core.js';

const state = {
  settings: {},
  testing: false
};

const els = {
  proxyBase: document.getElementById('proxyBaseInput'),
  proxyEnabled: document.getElementById('proxyEnabled'),
  proxyStatus: document.getElementById('proxyStatus'),
  themeSelect: document.getElementById('themeSelect'),
  cacheInfo: document.getElementById('cacheInfo'),
  testBtn: document.getElementById('testProxyBtn'),
  clearBtn: document.getElementById('clearCacheBtn'),
  resetBtn: document.getElementById('resetBtn')
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  loadSettings();
  setupEventListeners();
  updateCacheInfo();
  updateProxyStatus();
}

function loadSettings() {
  const saved = localStorage.getItem('og_settings');
  state.settings = saved ? JSON.parse(saved) : {
    proxyBase: 'https://raw.githubusercontent.com/ogt-tools/ogt-data-proxy/main',
    proxyEnabled: true,
    theme: 'dark'
  };

  // Apply settings to UI
  els.proxyBase.value = state.settings.proxyBase || '';
  els.proxyEnabled.checked = state.settings.proxyEnabled !== false;
  els.themeSelect.value = state.settings.theme || 'dark';

  // Apply theme
  applyTheme(state.settings.theme);
  
  // Update proxy configuration in API module
  ProxyApi.updateConfig(state.settings.proxyBase, state.settings.proxyEnabled);
}

function setupEventListeners() {
  els.proxyBase.addEventListener('input', saveSettings);
  els.proxyEnabled.addEventListener('change', saveSettings);
  els.themeSelect.addEventListener('change', (e) => {
    saveSettings();
    applyTheme(e.target.value);
  });

  els.testBtn.addEventListener('click', testProxyConnection);
  els.clearBtn.addEventListener('click', clearAllCaches);
  els.resetBtn.addEventListener('click', resetToDefaults);
}

function saveSettings() {
  state.settings = {
    proxyBase: els.proxyBase.value.trim(),
    proxyEnabled: els.proxyEnabled.checked,
    theme: els.themeSelect.value
  };

  localStorage.setItem('og_settings', JSON.stringify(state.settings));
  
  // Update proxy configuration in API module
  ProxyApi.updateConfig(state.settings.proxyBase, state.settings.proxyEnabled);
}

function applyTheme(theme) {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.className = `theme-${prefersDark ? 'dark' : 'light'}`;
  } else {
    document.documentElement.className = `theme-${theme}`;
  }
}

async function testProxyConnection() {
  if (state.testing) return;
  
  state.testing = true;
  els.testBtn.disabled = true;
  els.testBtn.innerHTML = '<i data-feather="loader"></i> Testing...';
  if (window.feather) feather.replace();

  const proxyBase = els.proxyBase.value.trim().replace(/\/+$/, '');
  const candidates = [];

  // Normal expected bases:
  // - https://raw.githubusercontent.com/<user>/<repo>/main
  // - https://<user>.github.io/<repo>
  candidates.push(`${proxyBase}/data/index.json`);

  // If user entered only https://<user>.github.io, try common repo path
  if (/^https:\/\/[^/]+\.github\.io$/i.test(proxyBase)) {
    candidates.push(`${proxyBase}/ogt-data-proxy/data/index.json`);
  }
  
  els.proxyStatus.innerHTML = '<div class="text-blue">Testing connection...</div>';

  try {
    const startTime = Date.now();
    let response = null;
    let data = null;
    let okUrl = null;

    for (const url of candidates) {
      response = await fetch(url);
      if (response.ok) {
        data = await response.json();
        okUrl = url;
        break;
      }
    }
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (!response || !response.ok) {
      const status = response ? `${response.status} ${response.statusText}` : 'No response';
      throw new Error(`HTTP ${status}`);
    }
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }

    // Success!
    els.proxyStatus.innerHTML = `
      <div class="text-green">
        <i data-feather="check-circle" style="width:16px;height:16px;margin-right:4px;"></i>
        Connected successfully (${responseTime}ms)
        <br><small>URL: ${okUrl}</small>
        <br><small>Last updated: ${data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown'}</small>
        <br><small>Realms: ${data.realms ? data.realms.join(', ') : 'Unknown'}</small>
      </div>
    `;

    // Save working proxy
    if (proxyBase !== state.settings.proxyBase) {
      els.proxyBase.value = proxyBase;
      saveSettings();
    }

  } catch (error) {
    els.proxyStatus.innerHTML = `
      <div class="text-red">
        <i data-feather="x-circle" style="width:16px;height:16px;margin-right:4px;"></i>
        Connection failed
        <br><small>${error.message}</small>
      </div>
    `;
  } finally {
    state.testing = false;
    els.testBtn.disabled = false;
    els.testBtn.innerHTML = '<i data-feather="zap"></i> Test Proxy Connection';
    if (window.feather) feather.replace();
  }
}

function updateProxyStatus() {
  const proxyBase = els.proxyBase.value.trim();
  const enabled = els.proxyEnabled.checked;

  if (!proxyBase) {
    els.proxyStatus.innerHTML = '<div class="text-secondary">No proxy URL configured</div>';
  } else if (!enabled) {
    els.proxyStatus.innerHTML = '<div class="text-orange">Proxy disabled</div>';
  } else {
    els.proxyStatus.innerHTML = '<div class="text-blue">Click "Test Proxy Connection" to verify</div>';
  }
}

function updateCacheInfo() {
  const cacheKeys = [
    'proxy_ticker_0',
    'proxy_mods_0', 
    'proxy_weather_0',
    'proxy_retail_0',
    'sc_resources_0_0',
    'stc_vwaps_0',
    'stc_prices_0'
  ];

  const info = [];
  let totalSize = 0;

  for (const key of cacheKeys) {
    const age = getCacheAge(key);
    if (age !== null) {
      info.push(`
        <div style="display:flex; justify-content:space-between; padding:0.25rem 0;">
          <span>${key}</span>
          <span class="text-secondary">${age}s ago</span>
        </div>
      `);
      totalSize++;
    }
  }

  if (info.length === 0) {
    els.cacheInfo.innerHTML = '<div class="text-secondary">No cached data</div>';
  } else {
    els.cacheInfo.innerHTML = `
      <div class="text-secondary" style="margin-bottom:0.5rem;">
        ${totalSize} cached entries:
      </div>
      ${info.join('')}
    `;
  }
}

function clearAllCaches() {
  if (!confirm('Clear all cached data? This will force fresh API calls on next load.')) {
    return;
  }

  const cleared = clearAllCache();
  updateCacheInfo();
  updateProxyStatus();
  
  if (window.showToast) {
    window.showToast(`Cleared ${cleared} cache entries`, 'success');
  }
}

function resetToDefaults() {
  if (!confirm('Reset all settings to defaults? This will clear your custom proxy URL and preferences.')) {
    return;
  }

  // Reset settings
  state.settings = {
    proxyBase: 'https://raw.githubusercontent.com/ogt-tools/ogt-data-proxy/main',
    proxyEnabled: true,
    theme: 'dark'
  };

  // Save and apply
  localStorage.setItem('og_settings', JSON.stringify(state.settings));
  loadSettings();
  updateCacheInfo();
  updateProxyStatus();

  if (window.showToast) {
    window.showToast('Settings reset to defaults', 'success');
  }
}

// Update proxy status when settings change
els.proxyBase.addEventListener('input', updateProxyStatus);
els.proxyEnabled.addEventListener('change', updateProxyStatus);
