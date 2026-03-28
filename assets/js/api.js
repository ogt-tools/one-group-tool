/**
 * api.js | ONE Group Tools — v1.0.1 Definitive
 *
 * DATA SOURCES (priority order):
 *  1. GitHub Pages Proxy  (ogt-data-proxy) — bulk, cached, no rate limits
 *  2. api.simcotools.com  — prices, VWAP, economy phase, companies
 *  3. simcompanies.com    — resource recipes ONLY (/v2 encyclopedia + /v3 market)
 *
 * CONFIRMED ENDPOINTS (from HAR captures 2026-03-28):
 *  ★ /api/v3/market-ticker/{realm}/          → all resource prices
 *  ★ /api/v3/market/{realm}/{kind}/           → exchange listings for one resource
 *  ★ /api/v2/production-modifiers/{realm}/    → speed modifier events
 *  ★ /api/v2/weather/{realm}/                 → retail speed multiplier
 *  ★ /api/v4/{realm}/resources-retail-info/   → retail demand data
 *  ★ /api/v2/en/encyclopedia/resources/       → resource catalog (wages, transport, etc)
 *  ★ /api/v2/companies/{id}/                  → public company profile
 *
 * EXCHANGE FEE: 4% CONFIRMED (verified from fees field in HAR listing data)
 * ECONOMY PHASE: Use SimCoTools /v1/realms/{realm} — not available via public SimCo API
 */

// ─── Proxy & API Base URLs ────────────────────────────────────────────
// TODO: Replace {username} with actual GitHub username after creating ogt-data-proxy repo
const PROXY_BASE = 'https://raw.githubusercontent.com/ogt-tools/ogt-data-proxy/main';
const PROXY_ENABLED = !PROXY_BASE.includes('{username}'); // false until configured

const STC   = 'https://api.simcotools.com';   // SimCoTools API
const SC_V2 = 'https://www.simcompanies.com/api/v2';
const SC_V3 = 'https://www.simcompanies.com/api/v3';
const SC_V4 = 'https://www.simcompanies.com/api/v4';

// ─── Cache TTLs ───────────────────────────────────────────────────────
const TTL = {
  TICKER  : 3  * 60 * 1000,   //  3 min  — market prices
  WEATHER : 10 * 60 * 1000,   // 10 min  — weather/retail speed
  MODS    : 10 * 60 * 1000,   // 10 min  — production modifiers
  RETAIL  : 30 * 60 * 1000,   // 30 min  — retail demand history
  CATALOG : 60 * 60 * 1000,   //  1 hr   — resource catalog
  RECIPE  : 60 * 60 * 1000,   //  1 hr   — production recipes
  EXCHANGE: 5  * 60 * 1000,   //  5 min  — per-resource exchange listings
  STC_VWAP: 30 * 60 * 1000,   // 30 min  — VWAP averages
};

// ─── Request Throttle (for direct SimCo calls only) ───────────────────────────
const _th = { last: 0, gap: 600 }; // 600ms between direct SimCo API calls

async function _throttle(url) {
  const wait = Math.max(0, _th.gap - (Date.now() - _th.last));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _th.last = Date.now();
  return fetch(url);
}

async function _fetchJSON(url, useThrottle = true) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await (useThrottle ? _throttle(url) : fetch(url));
      if (res.status === 429) { await new Promise(r => setTimeout(r, (i+1)*1500)); continue; }
      if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
      return await res.json();
    } catch (err) {
      if (err.status >= 400 && err.status < 500 && err.status !== 429) throw err;
      if (i === 2) throw err;
      await new Promise(r => setTimeout(r, (i+1)*800));
    }
  }
}

// ─── Cache ────────────────────────────────────────────────────────────
const PFX = 'og_c_';

function cGet(key) {
  try {
    const raw = localStorage.getItem(PFX + key);
    if (!raw) return null;
    const { d, t, ttl } = JSON.parse(raw);
    return (Date.now() - t < ttl) ? d : null;
  } catch { return null; }
}

function cSet(key, data, ttl) {
  try {
    localStorage.setItem(PFX + key, JSON.stringify({ d: data, t: Date.now(), ttl }));
  } catch {
    // Storage full — evict oldest half
    Object.keys(localStorage).filter(k => k.startsWith(PFX))
      .sort().slice(0, 20).forEach(k => localStorage.removeItem(k));
    try { localStorage.setItem(PFX + key, JSON.stringify({ d: data, t: Date.now(), ttl })); } catch {}
  }
}

function cStale(key) {
  try { const r = localStorage.getItem(PFX+key); return r ? JSON.parse(r).d : null; } catch { return null; }
}

export function clearAllCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PFX));
  keys.forEach(k => localStorage.removeItem(k));
  window.showToast?.(`Cleared ${keys.length} cached entries`, 'success');
  return keys.length;
}

export function getCacheAge(key) {
  try { return Math.floor((Date.now() - JSON.parse(localStorage.getItem(PFX+key)||'{}').t) / 1000); }
  catch { return null; }
}

async function fetch_c(url, key, ttl, opts = {}) {
  const hit = cGet(key);
  if (hit !== null) return hit;
  try {
    const data = await _fetchJSON(url, opts.throttle !== false);
    cSet(key, data, ttl);
    return data;
  } catch (err) {
    if (!opts.silent) console.error(`[API] ${url}:`, err.message);
    const stale = cStale(key);
    if (stale !== null) {
      if (!opts.silent) window.showToast?.('Showing cached data (API unavailable)', 'warning');
      return stale;
    }
    if (!opts.silent) window.showToast?.(`Unavailable: ${err.message}`, 'error');
    throw err;
  }
}

function arr(x) {
  if (Array.isArray(x)) return x;
  if (x?.results && Array.isArray(x.results)) return x.results;
  if (x?.data   && Array.isArray(x.data))    return x.data;
  return [];
}

// ─────────────────────────────────────────────────────────────────────
//  PROXY API  (GitHub Pages — primary data source, no rate limits)
// ─────────────────────────────────────────────────────────────────────
export const ProxyApi = {

  isEnabled: () => PROXY_ENABLED,

  /**
   * Fetch a proxy data file. Returns null if proxy not configured.
   */
  _fetch: async (path, key, ttl) => {
    if (!PROXY_ENABLED) return null;
    try {
      return await fetch_c(`${PROXY_BASE}/${path}`, `proxy_${key}`, ttl,
        { throttle: false, silent: true });
    } catch { return null; }
  },

  /**
   * Market ticker: all resource prices in one file.
   * Returns [{kind, image, price, is_up, realmId}]
   * kind = numeric resource ID
   */
  getMarketTicker: (realm = 0) =>
    ProxyApi._fetch(`data/realm-${realm}/market-ticker.json`, `ticker_${realm}`, TTL.TICKER),

  /**
   * Production modifiers: speed events per resource.
   * Returns {resourceProductionModifiers: [{id, realm, kind, speedModifier, since, until}]}
   */
  getProductionModifiers: (realm = 0) =>
    ProxyApi._fetch(`data/realm-${realm}/production-modifiers.json`, `mods_${realm}`, TTL.MODS),

  /**
   * Weather: retail selling speed multiplier (changes ~every 11 hours).
   * Returns {id, realm, since, until, sellingSpeedMultiplier}
   */
  getWeather: (realm = 0) =>
    ProxyApi._fetch(`data/realm-${realm}/weather.json`, `weather_${realm}`, TTL.WEATHER),

  /**
   * Retail info: demand, saturation, average prices per resource.
   * Returns [{quality, dbLetter, averagePrice, saturation, retailData[...]}]
   * dbLetter = numeric resource kind/ID
   */
  getRetailInfo: (realm = 0) =>
    ProxyApi._fetch(`data/realm-${realm}/retail-info.json`, `retail_${realm}`, TTL.RETAIL),

  /**
   * Proxy meta: when data was last fetched.
   * Returns {lastUpdated, proxyCacheTTL}
   */
  getMeta: () => ProxyApi._fetch('meta.json', 'meta', 60 * 1000),

  /**
   * Build a price map from market ticker response.
   * Returns Map<number, number>: kind → price
   */
  buildPriceMap: (ticker) => {
    const map = new Map();
    for (const item of (ticker || [])) {
      if (item.kind != null && item.price != null) {
        map.set(Number(item.kind), Number(item.price));
      }
    }
    return map;
  },

  /**
   * Build a speed modifier map from production-modifiers response.
   * Returns Map<number, number>: kind → speedModifier (percentage integer)
   * Only includes currently active modifiers.
   */
  buildModifierMap: (modifiers) => {
    const map = new Map();
    const now = Date.now();
    const mods = modifiers?.resourceProductionModifiers || [];
    for (const m of mods) {
      if (new Date(m.since) <= now && new Date(m.until) >= now) {
        map.set(Number(m.kind), m.speedModifier);
      }
    }
    return map;
  },

  /**
   * Build retail demand map from retail-info.
   * Returns Map<number, {demand, saturation, averagePrice}>: kind → retail data
   */
  buildRetailMap: (retailInfo) => {
    const map = new Map();
    for (const item of (retailInfo || [])) {
      if (item.dbLetter != null) {
        // Get latest demand from retailData array (last entry)
        const latest = item.retailData?.[item.retailData.length - 1];
        map.set(Number(item.dbLetter), {
          demand: latest?.demand ?? 0,
          saturation: item.saturation ?? 1,
          averagePrice: item.averagePrice ?? 0
        });
      }
    }
    return map;
  }
};

// ─────────────────────────────────────────────────────────────────────
//  SimCoTools API  (api.simcotools.com — economy phase, VWAP, companies)
// ─────────────────────────────────────────────────────────────────────
export const SimCoToolsApi = {

  /**
   * Economy phase from SimCoTools (most reliable public source).
   * Returns "Normal" | "Recession" | "Boom" | null
   */
  getEconomyPhase: async (realm = 0) => {
    try {
      const data = await fetch_c(
        `${STC}/v1/realms/${realm}`,
        `stc_realm_${realm}`,
        TTL.TICKER,
        { throttle: false, silent: true }
      );
      const raw = data?.summary?.phase || data?.phase;
      if (!raw) return null;
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    } catch { return null; }
  },

  /**
   * Economy phase history.
   * Returns [{phase, start, end}]
   */
  getPhaseHistory: async (realm = 0) => {
    try {
      const data = await fetch_c(
        `${STC}/v1/realms/${realm}/phases`,
        `stc_phases_${realm}`,
        TTL.CATALOG,
        { throttle: false }
      );
      return arr(data?.phases || data);
    } catch { return []; }
  },

  /**
   * Bulk VWAP — 7-day volume-weighted average prices.
   * Returns [{datetime, resourceId, quality, vwap}]
   */
  getAllVwaps: async (realm = 0) => {
    try {
      const data = await fetch_c(
        `${STC}/v1/realms/${realm}/market/vwaps`,
        `stc_vwaps_${realm}`,
        TTL.STC_VWAP,
        { throttle: false }
      );
      return arr(data?.vwaps || data);
    } catch { return []; }
  },

  /**
   * Build VWAP map: Map<`${resourceId}_${quality}`, vwap>
   */
  buildVwapMap: (vwaps) => {
    const map = new Map();
    for (const v of vwaps) {
      const key = `${v.resourceId}_${v.quality}`;
      if (!map.has(key)) map.set(key, v.vwap); // first = most recent
    }
    return map;
  },

  /**
   * Company profile via SimCoTools.
   * Returns null on failure.
   */
  getCompany: async (companyId, realm = 0) => {
    try {
      const data = await fetch_c(
        `${STC}/v1/realms/${realm}/companies/${companyId}`,
        `stc_co_${companyId}_${realm}`,
        5 * 60 * 1000,
        { throttle: false, silent: true }
      );
      return data || null;
    } catch { return null; }
  },

  /**
   * Executive directory (filterable).
   */
  getExecutives: async (realm = 0, filters = {}) => {
    try {
      const qs = new URLSearchParams(filters).toString();
      const url = `${STC}/v1/realms/${realm}/executives${qs ? '?' + qs : ''}`;
      const data = await fetch_c(url, `stc_execs_${realm}_${qs}`, TTL.CATALOG, { throttle: false });
      return arr(data?.executives || data);
    } catch { return []; }
  }
};

// ─────────────────────────────────────────────────────────────────────
//  SimCompanies API  (for catalog and recipes — secondary)
// ─────────────────────────────────────────────────────────────────────
export const SimCoApi = {

  /**
   * All resources list — basic info (id, name, transport, producedAnHour, wages)
   * Uses SimCo v2 encyclopedia. Falls back to SimCoTools resource list.
   * ALWAYS returns an Array — never throws or returns non-array.
   */
  getAllResources: async (realm = 0) => {
    // Try SimCo v2 first (has wages, transport, producedAnHour)
    try {
      const data = await fetch_c(
        `${SC_V2}/en/encyclopedia/resources/`,
        `sc_resources_${realm}`,
        TTL.CATALOG,
        true
      );
      const list = toArr(data);
      if (list.length > 0 && list[0].id !== undefined) return list;
    } catch {}

    // Fallback: SimCoTools resource list (less fields but reliable)
    try {
      const list = await SimCoToolsApi.getResources(realm);
      if (list.length > 0) return list;
    } catch {}

    // Last resort: stale cache
    const stale = cStale(`sc_resources_${realm}`);
    if (stale) {
      window.showToast?.('Using cached resource list (API unavailable)', 'warning');
      return toArr(stale);
    }

    // Final fallback: static snapshot
    try {
      const { RESOURCES_SNAPSHOT } = await import('./data/resources-static.js');
      if (RESOURCES_SNAPSHOT && RESOURCES_SNAPSHOT.length > 0) {
        window.showToast?.('Using static resource list (API unavailable)', 'warning');
        return RESOURCES_SNAPSHOT;
      }
    } catch {}

    window.showToast?.('Resource data unavailable. Please check connection.', 'error');
    return [];
  },

  /**
   * Full resource detail with producedFrom recipe.
   * CONFIRMED endpoint: /api/v3/en/encyclopedia/resources/{realm}/{id}/
   * Returns null on failure — callers must handle null.
   */
  getResource: async (id, realm = 0) => {
    if (!id || isNaN(Number(id))) {
      console.error('[SimCoApi.getResource] Invalid ID:', id);
      return null;
    }
    try {
      return await fetch_c(
        `${SC_V3}/en/encyclopedia/resources/${realm}/${id}/`,
        `sc_resource_${id}_${realm}`,
        TTL.RECIPE
      );
    } catch (err) {
      console.error(`[SimCoApi.getResource] Failed for id=${id}:`, err.message);
      
      // Fallback: try static resources
      try {
        const { RESOURCES_SNAPSHOT } = await import('./data/resources-static.js');
        const resource = RESOURCES_SNAPSHOT.find(r => r.id === parseInt(id) || r.kind === parseInt(id));
        if (resource) {
          window.showToast?.('Using static resource data (API unavailable)', 'warning');
          return resource;
        }
      } catch {}
      
      return null;
    }
  },

  /**
   * Exchange listings for a resource.
   * Listings sorted best-first (lowest price, highest quality) by server.
   * Returns [] on failure.
   */
  getExchangeListings: async (id, realm = 0) => {
    if (!id || isNaN(Number(id))) return [];
    try {
      const data = await fetch_c(
        `${SC_V3}/en/exchange/${id}/`,
        `sc_exchange_${id}_${realm}`,
        TTL.EXCHANGE
      );
      return toArr(data);
    } catch { return []; }
  },

  /**
   * Company profile (public).
   */
  getCompany: async (id) => {
    if (!id) return null;
    try {
      return await fetch_c(`${SC_V2}/companies/${id}/`, `sc_company_${id}`, 5 * 60 * 1000);
    } catch { return null; }
  },

  /**
   * Cheapest price for a resource at given min quality.
   * Tries SimCoTools bulk prices first (fast, no extra request).
   * Falls back to SimCo exchange endpoint.
   */
  getBestPrice: async (id, minQ = 0, realm = 0, priceMap = null) => {
    // If caller passes priceMap from bulk fetch, use it (zero cost)
    if (priceMap instanceof Map) {
      return SimCoToolsApi.getBestPrice(priceMap, id, minQ);
    }
    // Otherwise fall back to individual exchange call
    try {
      const listings = await SimCoApi.getExchangeListings(id, realm);
      const filtered = listings.filter(l => (l.quality ?? 0) >= minQ);
      if (!filtered.length) return 0;
      filtered.sort((a, b) => a.price - b.price);
      return filtered[0].price ?? 0;
    } catch { return 0; }
  },

  // Convenience: build resource name→id map
  buildNameMap: async (realm = 0) => {
    const all = await SimCoApi.getAllResources(realm);
    return new Map(all.map(r => [r.name?.toLowerCase(), r.id]));
  }
};
