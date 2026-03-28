/**
 * core.js | ONE Group Tools
 * Shared settings + storage helpers
 * v1.0.0
 */

const SETTINGS_KEY = 'og_settings';

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function getSettings() {
  const s = safeJsonParse(localStorage.getItem(SETTINGS_KEY) || '{}', {});
  return {
    theme: s.theme === 'light' ? 'light' : 'dark',
    realm: Number.isFinite(Number(s.realm)) ? Number(s.realm) : 0,
    proxyBase: s.proxyBase || 'https://raw.githubusercontent.com/ogt-tools/ogt-data-proxy/main',
    proxyEnabled: s.proxyEnabled !== false
  };
}

export function setSettings(next) {
  const prev = getSettings();
  const merged = {
    ...prev,
    ...(next || {})
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

export function getRealm() {
  return getSettings().realm;
}

export function getTheme() {
  return getSettings().theme;
}
