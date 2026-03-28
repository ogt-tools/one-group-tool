/**
 * api.js | ONE Group Tools
 * Unified API wrapper with proxy-first data loading, cache, retries, and fallbacks.
 */

const hasWindow = typeof window !== 'undefined';
const storage = hasWindow ? window.localStorage : null;

// Proxy data source (ogt-data-proxy) - will be updated dynamically from settings
let PROXY_BASE = 'https://raw.githubusercontent.com/ogt-tools/ogt-data-proxy/main';
let PROXY_ENABLED = true;

// API base URLs
const STC = 'https://api.simcotools.com';
const SC_V2 = 'https://www.simcompanies.com/api/v2';
const SC_V3 = 'https://www.simcompanies.com/api/v3';
const SC_V4 = 'https://www.simcompanies.com/api/v4';

// Cache TTLs
const TTL = {
  TICKER: 3 * 60 * 1000,
  WEATHER: 10 * 60 * 1000,
  MODS: 10 * 60 * 1000,
  RETAIL: 30 * 60 * 1000,
  CATALOG: 60 * 60 * 1000,
  RECIPE: 60 * 60 * 1000,
  EXCHANGE: 5 * 60 * 1000,
  STC_VWAP: 30 * 60 * 1000,
  STC_PRICE: 3 * 60 * 1000,
};

const PFX = 'og_c_';
const THROTTLE = { last: 0, gap: 600 };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRealm(realm = 0) {
  const n = Number(realm);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function titleCase(text) {
  if (!text || typeof text !== 'string') return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function toArr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function normalizeResource(raw) {
  const id = toNum(raw?.id ?? raw?.kind ?? raw?.dbLetter ?? raw?.resourceId ?? raw?.resource?.id, NaN);
  if (!Number.isFinite(id) || id <= 0) return null;

  const name = raw?.name ?? raw?.resourceName ?? raw?.resource?.name ?? `Resource ${id}`;
  const kind = toNum(raw?.kind ?? id, id);

  return {
    ...raw,
    id,
    kind,
    name,
    category: raw?.category ?? raw?.categoryName ?? raw?.type ?? 'Other',
    transport: toNum(raw?.transport ?? raw?.transportation ?? 0, 0),
    wages: toNum(raw?.wages ?? raw?.baseSalary ?? 0, 0),
    producedAnHour: toNum(raw?.producedAnHour ?? raw?.productionPerHour ?? 0, 0),
  };
}

function dedupeById(items) {
  const map = new Map();
  for (const item of items) {
    if (!item || !Number.isFinite(item.id)) continue;
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

function normalizeResources(payload) {
  return dedupeById(toArr(payload).map(normalizeResource).filter(Boolean));
}

function normalizeListings(payload) {
  return toArr(payload)
    .map((row) => ({
      ...row,
      price: toNum(row?.price ?? row?.ask ?? 0, 0),
      quality: toNum(row?.quality ?? row?.q ?? 0, 0),
      quantity: toNum(row?.quantity ?? row?.amount ?? row?.qty ?? 0, 0),
    }))
    .filter((row) => row.price > 0)
    .sort((a, b) => a.price - b.price || b.quality - a.quality);
}

function normalizePriceEntries(payload) {
  return toArr(payload)
    .map((row) => {
      const resourceId = toNum(row?.resourceId ?? row?.kind ?? row?.resource?.id ?? row?.id, NaN);
      const quality = toNum(row?.quality ?? row?.q ?? 0, 0);
      const price = toNum(row?.price ?? row?.averagePrice ?? row?.vwap ?? row?.average ?? 0, 0);
      if (!Number.isFinite(resourceId) || resourceId <= 0 || price <= 0) return null;
      return {
        ...row,
        resourceId,
        quality,
        price,
      };
    })
    .filter(Boolean);
}

function normalizeBuilding(raw, idx = 0) {
  const name = raw?.name ?? raw?.building ?? raw?.displayName;
  if (!name) return null;
  const id = toNum(raw?.id ?? raw?.buildingId ?? raw?.kind ?? idx + 1, idx + 1);
  return {
    ...raw,
    id,
    name,
    type: raw?.type ?? raw?.category ?? null,
    category: raw?.category ?? raw?.type ?? null,
  };
}

function cacheGet(key) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PFX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (Date.now() - toNum(parsed.t, 0) < toNum(parsed.ttl, 0)) return parsed.d;
    return null;
  } catch {
    return null;
  }
}

function cacheStale(key) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PFX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.d ?? null;
  } catch {
    return null;
  }
}

function cacheSet(key, value, ttl) {
  if (!storage) return;
  try {
    storage.setItem(PFX + key, JSON.stringify({ d: value, t: Date.now(), ttl }));
  } catch {
    try {
      const keys = Object.keys(storage).filter((k) => k.startsWith(PFX)).sort();
      keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => storage.removeItem(k));
      storage.setItem(PFX + key, JSON.stringify({ d: value, t: Date.now(), ttl }));
    } catch {
      // no-op if storage remains unavailable
    }
  }
}

export function clearAllCache() {
  if (!storage) return 0;
  const keys = Object.keys(storage).filter((k) => k.startsWith(PFX));
  keys.forEach((k) => storage.removeItem(k));
  if (hasWindow) window.showToast?.(`Cleared ${keys.length} cached entries`, 'success');
  return keys.length;
}

export function getCacheAge(key) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PFX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.t) return null;
    return Math.floor((Date.now() - parsed.t) / 1000);
  } catch {
    return null;
  }
}

async function throttledFetch(url) {
  const wait = Math.max(0, THROTTLE.gap - (Date.now() - THROTTLE.last));
  if (wait > 0) await sleep(wait);
  THROTTLE.last = Date.now();
  return fetch(url);
}

async function fetchJson(url, options = {}) {
  const useThrottle = options.throttle !== false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await (useThrottle ? throttledFetch(url) : fetch(url));
      if (response.status === 429) {
        await sleep((attempt + 1) * 1500);
        continue;
      }
      if (!response.ok) {
        const err = new Error(`HTTP ${response.status}`);
        err.status = response.status;
        throw err;
      }
      return await response.json();
    } catch (err) {
      const status = toNum(err?.status, 0);
      const isFatal4xx = status >= 400 && status < 500 && status !== 429;
      if (isFatal4xx || attempt === 2) throw err;
      await sleep((attempt + 1) * 800);
    }
  }
  throw new Error('Request failed');
}

async function fetchCached(url, key, ttl, options = {}) {
  const hit = cacheGet(key);
  if (hit !== null) return hit;

  try {
    const data = await fetchJson(url, options);
    cacheSet(key, data, ttl);
    return data;
  } catch (err) {
    if (!options.silent) console.error(`[API] ${url}:`, err?.message || err);

    const stale = cacheStale(key);
    if (stale !== null) {
      if (!options.silent && hasWindow) {
        window.showToast?.('Showing cached data (API unavailable)', 'warning');
      }
      return stale;
    }

    if (!options.silent && hasWindow) {
      window.showToast?.(`Unavailable: ${err?.message || 'Network error'}`, 'error');
    }
    throw err;
  }
}

async function fetchFirst(urls, keyBase, ttl, options = {}) {
  const list = Array.isArray(urls) ? urls : [urls];
  let lastErr = null;

  for (let i = 0; i < list.length; i += 1) {
    try {
      return await fetchCached(list[i], `${keyBase}_${i}`, ttl, options);
    } catch (err) {
      lastErr = err;
    }
  }

  if (lastErr) throw lastErr;
  return null;
}

function unwrapProxyPayload(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

async function fetchStc(paths, keyBase, ttl, options = {}) {
  const list = Array.isArray(paths) ? paths : [paths];
  for (let i = 0; i < list.length; i += 1) {
    const url = `${STC}${list[i]}`;
    try {
      return await fetchCached(url, `${keyBase}_${i}`, ttl, { throttle: false, ...options });
    } catch {
      // try next endpoint shape
    }
  }
  return null;
}

export const ProxyApi = {
  // Update proxy configuration from settings
  updateConfig: (base, enabled) => {
    PROXY_BASE = (base || 'https://raw.githubusercontent.com/ogt-tools/ogt-data-proxy/main').replace(/\/+$/, '');
    PROXY_ENABLED = enabled !== false;
  },

  isEnabled: () => PROXY_ENABLED,

  _fetch: async (path, key, ttl, options = {}) => {
    if (!PROXY_ENABLED) return null;
    try {
      const data = await fetchCached(`${PROXY_BASE}/${path}`, `proxy_${key}`, ttl, {
        throttle: false,
        silent: true,
      });
      return options.unwrap === false ? data : unwrapProxyPayload(data);
    } catch {
      return null;
    }
  },

  // ogt-data-proxy file names: data/<endpoint>-<realm>.json
  getMarketTicker: (realm = 0) =>
    ProxyApi._fetch(`data/market-ticker-${normalizeRealm(realm)}.json`, `ticker_${normalizeRealm(realm)}`, TTL.TICKER),

  getProductionModifiers: (realm = 0) =>
    ProxyApi._fetch(`data/production-modifiers-${normalizeRealm(realm)}.json`, `mods_${normalizeRealm(realm)}`, TTL.MODS),

  getWeather: (realm = 0) =>
    ProxyApi._fetch(`data/weather-${normalizeRealm(realm)}.json`, `weather_${normalizeRealm(realm)}`, TTL.WEATHER),

  getRetailInfo: (realm = 0) =>
    ProxyApi._fetch(`data/retail-info-${normalizeRealm(realm)}.json`, `retail_${normalizeRealm(realm)}`, TTL.RETAIL),

  getMeta: async () => {
    const index = await ProxyApi._fetch('data/index.json', 'index', 60 * 1000, { unwrap: false });
    if (!index || typeof index !== 'object') return null;
    return {
      lastUpdated: index.timestamp ?? null,
      realms: toArr(index.realms),
      endpoints: toArr(index.endpoints),
      files: toArr(index.files),
    };
  },

  buildPriceMap: (ticker) => {
    const map = new Map();
    for (const item of toArr(ticker)) {
      const kind = toNum(item?.kind ?? item?.id, NaN);
      const price = toNum(item?.price, NaN);
      if (Number.isFinite(kind) && Number.isFinite(price) && price > 0) {
        map.set(kind, price);
      }
    }
    return map;
  },

  buildModifierMap: (modifiers) => {
    const map = new Map();
    const now = Date.now();
    const rows = toArr(modifiers?.resourceProductionModifiers ?? modifiers?.modifiers ?? modifiers);
    for (const row of rows) {
      const kind = toNum(row?.kind ?? row?.resourceId, NaN);
      const speedModifier = toNum(row?.speedModifier, NaN);
      const since = row?.since ? Date.parse(row.since) : NaN;
      const until = row?.until ? Date.parse(row.until) : NaN;
      if (!Number.isFinite(kind) || !Number.isFinite(speedModifier)) continue;
      const inWindow =
        (!Number.isFinite(since) || since <= now) &&
        (!Number.isFinite(until) || until >= now);
      if (inWindow) map.set(kind, speedModifier);
    }
    return map;
  },

  buildRetailMap: (retailInfo) => {
    const map = new Map();
    for (const item of toArr(retailInfo)) {
      const kind = toNum(item?.dbLetter ?? item?.kind ?? item?.resource?.id, NaN);
      if (!Number.isFinite(kind)) continue;
      const retailData = toArr(item?.retailData);
      const latest = retailData.length ? retailData[retailData.length - 1] : null;
      map.set(kind, {
        demand: toNum(latest?.demand ?? item?.demand, 0),
        saturation: toNum(item?.saturation ?? latest?.saturation ?? 1, 1),
        averagePrice: toNum(item?.averagePrice ?? latest?.averagePrice ?? 0, 0),
      });
    }
    return map;
  },
};

export const SimCoToolsApi = {
  getEconomyPhase: async (realm = 0) => {
    const r = normalizeRealm(realm);
    const data = await fetchStc(
      [`/v1/realms/${r}`, `/v1/realms/${r}/summary`],
      `stc_realm_${r}`,
      TTL.TICKER,
      { silent: true }
    );
    const phase = data?.summary?.phase ?? data?.phase ?? data?.economyPhase ?? null;
    return phase ? titleCase(String(phase)) : null;
  },

  getPhaseHistory: async (realm = 0) => {
    const r = normalizeRealm(realm);
    const data = await fetchStc(
      [`/v1/realms/${r}/phases`, `/v1/realms/${r}/economy/phases`],
      `stc_phases_${r}`,
      TTL.CATALOG,
      { silent: true }
    );
    return toArr(data?.phases ?? data).map((row) => ({
      ...row,
      phase: titleCase(String(row?.phase ?? row?.name ?? 'Normal')),
      start: row?.start ?? row?.since ?? null,
      end: row?.end ?? row?.until ?? null,
    }));
  },

  getAllVwaps: async (realm = 0) => {
    const r = normalizeRealm(realm);
    const data = await fetchStc(
      [`/v1/realms/${r}/market/vwaps`, `/v1/realms/${r}/vwaps`],
      `stc_vwaps_${r}`,
      TTL.STC_VWAP,
      { silent: true }
    );
    return normalizePriceEntries(data?.vwaps ?? data).map((row) => ({
      ...row,
      vwap: row.price,
    }));
  },

  buildVwapMap: (vwaps) => {
    const map = new Map();
    for (const row of normalizePriceEntries(vwaps)) {
      const key = `${row.resourceId}_${row.quality}`;
      if (!map.has(key)) map.set(key, row.price);
    }
    return map;
  },

  getAllPrices: async (realm = 0) => {
    const r = normalizeRealm(realm);

    const stc = await fetchStc(
      [`/v1/realms/${r}/market/prices`, `/v1/realms/${r}/prices`],
      `stc_prices_${r}`,
      TTL.STC_PRICE,
      { silent: true }
    );
    const stcPrices = normalizePriceEntries(stc?.prices ?? stc);
    if (stcPrices.length) return stcPrices;

    const ticker = await ProxyApi.getMarketTicker(r);
    const proxyRows = toArr(ticker).map((row) => ({
      resourceId: toNum(row?.kind ?? row?.id, 0),
      quality: 0,
      price: toNum(row?.price, 0),
    })).filter((row) => row.resourceId > 0 && row.price > 0);
    if (proxyRows.length) return proxyRows;

    const directTicker = await SimCoApi.getMarketTicker(r);
    return toArr(directTicker).map((row) => ({
      resourceId: toNum(row?.kind ?? row?.id, 0),
      quality: 0,
      price: toNum(row?.price, 0),
    })).filter((row) => row.resourceId > 0 && row.price > 0);
  },

  buildPriceMap: (prices) => {
    const map = new Map();
    for (const row of normalizePriceEntries(prices)) {
      const key = `${row.resourceId}_${row.quality}`;
      const prev = map.get(key);
      if (prev == null || row.price < prev) map.set(key, row.price);
    }
    return map;
  },

  getBestPrice: (priceMap, resourceId, minQ = 0) => {
    if (!(priceMap instanceof Map)) return 0;
    const rid = toNum(resourceId, NaN);
    if (!Number.isFinite(rid)) return 0;
    const threshold = toNum(minQ, 0);

    let best = Infinity;
    for (const [key, price] of priceMap.entries()) {
      const [kRid, q] = String(key).split('_').map((n) => toNum(n, NaN));
      if (kRid !== rid || !Number.isFinite(q) || q < threshold) continue;
      if (Number.isFinite(price) && price > 0) best = Math.min(best, price);
    }
    return Number.isFinite(best) ? best : 0;
  },

  getResourcePrices: async (resourceId, realm = 0) => {
    const rid = toNum(resourceId, NaN);
    if (!Number.isFinite(rid)) return [];
    const r = normalizeRealm(realm);

    const stc = await fetchStc(
      [
        `/v1/realms/${r}/resources/${rid}/prices`,
        `/v1/realms/${r}/market/resources/${rid}/prices`,
      ],
      `stc_resource_prices_${rid}_${r}`,
      TTL.STC_PRICE,
      { silent: true }
    );
    const direct = normalizePriceEntries(stc?.prices ?? stc).filter((row) => row.resourceId === rid);
    if (direct.length) return direct;

    const all = await SimCoToolsApi.getAllPrices(r);
    return normalizePriceEntries(all).filter((row) => row.resourceId === rid);
  },

  getQ0Average: (payload) => {
    const rows = normalizePriceEntries(payload?.prices ?? payload);
    const q0 = rows.find((row) => row.quality === 0);
    if (q0) return q0.price;
    return toNum(payload?.q0 ?? payload?.average ?? payload?.avg, 0);
  },

  getCompany: async (companyId, realm = 0) => {
    const id = toNum(companyId, NaN);
    if (!Number.isFinite(id)) return null;
    const r = normalizeRealm(realm);
    const data = await fetchStc(
      [`/v1/realms/${r}/companies/${id}`, `/v1/companies/${id}`],
      `stc_company_${id}_${r}`,
      5 * 60 * 1000,
      { silent: true }
    );
    return data || null;
  },

  getExecutives: async (realm = 0, filters = {}) => {
    const r = normalizeRealm(realm);
    const qs = new URLSearchParams(filters).toString();
    const path = `/v1/realms/${r}/executives${qs ? `?${qs}` : ''}`;
    const data = await fetchStc(path, `stc_execs_${r}_${qs}`, TTL.CATALOG, { silent: true });
    return toArr(data?.executives ?? data);
  },

  getResources: async (realm = 0) => {
    const r = normalizeRealm(realm);
    const data = await fetchStc(
      [`/v1/realms/${r}/resources`, '/v1/resources'],
      `stc_resources_${r}`,
      TTL.CATALOG,
      { silent: true }
    );
    const normalized = normalizeResources(data?.resources ?? data);
    if (normalized.length) return normalized;

    try {
      const mod = await import('./data/resources-static.js');
      return normalizeResources(mod?.RESOURCES_SNAPSHOT ?? []);
    } catch {
      return [];
    }
  },

  getBuildings: async (realm = 0, type = '') => {
    const r = normalizeRealm(realm);
    const data = await fetchStc(
      [`/v1/realms/${r}/buildings`, '/v1/buildings'],
      `stc_buildings_${r}`,
      TTL.CATALOG,
      { silent: true }
    );
    let rows = toArr(data?.buildings ?? data).map(normalizeBuilding).filter(Boolean);

    if (!rows.length) {
      try {
        const mod = await import('./data/buildings.js');
        rows = Object.keys(mod?.BUILDING_PRODUCTS ?? {}).map((name, idx) =>
          normalizeBuilding({ id: idx + 1, name, type: 'production' }, idx)
        ).filter(Boolean);
      } catch {
        rows = [];
      }
    }

    if (!type) return rows;
    const t = String(type).toLowerCase();
    return rows.filter((row) =>
      String(row?.type ?? '').toLowerCase().includes(t) ||
      String(row?.category ?? '').toLowerCase().includes(t)
    );
  },
};

export const SimCoApi = {
  getMarketTicker: async (realm = 0) => {
    const r = normalizeRealm(realm);
    try {
      const data = await fetchFirst(
        [`${SC_V3}/market-ticker/${r}/`, `${SC_V2}/market-ticker/${r}/`],
        `sc_ticker_${r}`,
        TTL.TICKER
      );
      return toArr(data);
    } catch {
      return [];
    }
  },

  getAllResources: async (realm = 0) => {
    const r = normalizeRealm(realm);
    try {
      const data = await fetchFirst(
        [`${SC_V2}/en/encyclopedia/resources/`, `${SC_V3}/en/encyclopedia/resources/`],
        `sc_resources_${r}`,
        TTL.CATALOG
      );
      const rows = normalizeResources(data);
      if (rows.length) return rows;
    } catch {
      // continue to fallbacks
    }

    try {
      const stcRows = await SimCoToolsApi.getResources(r);
      if (stcRows.length) return stcRows;
    } catch {
      // continue
    }

    const stale = cacheStale(`sc_resources_${r}_0`);
    const staleRows = normalizeResources(stale);
    if (staleRows.length) {
      if (hasWindow) window.showToast?.('Using cached resource list (API unavailable)', 'warning');
      return staleRows;
    }

    try {
      const mod = await import('./data/resources-static.js');
      const rows = normalizeResources(mod?.RESOURCES_SNAPSHOT ?? []);
      if (rows.length && hasWindow) {
        window.showToast?.('Using static resource list (API unavailable)', 'warning');
      }
      return rows;
    } catch {
      if (hasWindow) window.showToast?.('Resource data unavailable. Please check connection.', 'error');
      return [];
    }
  },

  getResource: async (id, realm = 0) => {
    const rid = toNum(id, NaN);
    const r = normalizeRealm(realm);
    if (!Number.isFinite(rid)) return null;

    try {
      const data = await fetchFirst(
        [
          `${SC_V3}/en/encyclopedia/resources/${r}/${rid}/`,
          `${SC_V2}/en/encyclopedia/resources/${rid}/`,
        ],
        `sc_resource_${rid}_${r}`,
        TTL.RECIPE
      );
      const normalized = normalizeResource(data);
      return normalized || data || null;
    } catch {
      // continue to fallback
    }

    try {
      const all = await SimCoApi.getAllResources(r);
      const fallback = all.find((row) => toNum(row?.id, 0) === rid || toNum(row?.kind, 0) === rid);
      if (fallback && hasWindow) {
        window.showToast?.('Using cached resource data (API unavailable)', 'warning');
      }
      return fallback || null;
    } catch {
      return null;
    }
  },

  getExchangeListings: async (id, realm = 0) => {
    const rid = toNum(id, NaN);
    const r = normalizeRealm(realm);
    if (!Number.isFinite(rid)) return [];

    try {
      const data = await fetchFirst(
        [
          `${SC_V3}/market/${r}/${rid}/`,
          `${SC_V3}/en/exchange/${rid}/`,
          `${SC_V2}/market/${r}/${rid}/`,
        ],
        `sc_exchange_${rid}_${r}`,
        TTL.EXCHANGE
      );
      return normalizeListings(data);
    } catch {
      return [];
    }
  },

  getCompany: async (id) => {
    const cid = toNum(id, NaN);
    if (!Number.isFinite(cid)) return null;
    try {
      return await fetchCached(`${SC_V2}/companies/${cid}/`, `sc_company_${cid}`, 5 * 60 * 1000);
    } catch {
      return SimCoToolsApi.getCompany(cid, 0);
    }
  },

  getBestPrice: async (id, minQ = 0, realm = 0, priceMap = null) => {
    const rid = toNum(id, NaN);
    const r = normalizeRealm(realm);
    if (!Number.isFinite(rid)) return 0;

    if (priceMap instanceof Map) {
      return SimCoToolsApi.getBestPrice(priceMap, rid, minQ);
    }

    if (toNum(minQ, 0) <= 0) {
      const ticker = await ProxyApi.getMarketTicker(r);
      const proxyMap = ProxyApi.buildPriceMap(ticker || []);
      const hit = proxyMap.get(rid);
      if (Number.isFinite(hit) && hit > 0) return hit;
    }

    const listings = await SimCoApi.getExchangeListings(rid, r);
    const filtered = listings.filter((row) => toNum(row?.quality, 0) >= toNum(minQ, 0));
    if (!filtered.length) return 0;
    return toNum(filtered[0]?.price, 0);
  },

  buildNameMap: async (realm = 0) => {
    const rows = await SimCoApi.getAllResources(realm);
    return new Map(rows.map((row) => [String(row?.name || '').toLowerCase(), row.id]));
  },

  getBuildings: async (realm = 0) => {
    const r = normalizeRealm(realm);
    const stcRows = await SimCoToolsApi.getBuildings(r);
    if (stcRows.length) return stcRows;

    try {
      const data = await fetchFirst(
        [
          `${SC_V3}/en/encyclopedia/buildings/${r}/`,
          `${SC_V2}/en/encyclopedia/buildings/`,
        ],
        `sc_buildings_${r}`,
        TTL.CATALOG,
        { silent: true }
      );
      const rows = toArr(data).map(normalizeBuilding).filter(Boolean);
      if (rows.length) return rows;
    } catch {
      // continue to static fallback
    }

    try {
      const mod = await import('./data/buildings.js');
      return Object.keys(mod?.BUILDING_PRODUCTS ?? {}).map((name, idx) => ({ id: idx + 1, name }));
    } catch {
      return [];
    }
  },

  getBuildingDetail: async (id, realm = 0) => {
    const bid = toNum(id, NaN);
    const r = normalizeRealm(realm);
    if (!Number.isFinite(bid)) return {};

    try {
      const detail = await fetchFirst(
        [
          `${SC_V4}/${r}/buildings/${bid}/`,
          `${SC_V3}/en/encyclopedia/buildings/${r}/${bid}/`,
          `${SC_V2}/en/encyclopedia/buildings/${bid}/`,
        ],
        `sc_building_${bid}_${r}`,
        TTL.CATALOG,
        { silent: true }
      );

      if (!detail || typeof detail !== 'object') return {};

      if (!Array.isArray(detail.upgradeCost)) {
        const mats = toArr(detail.upgradeMaterials ?? detail.materials ?? detail.costs);
        if (mats.length) {
          detail.upgradeCost = mats
            .map((m) => {
              const resourceId = toNum(m?.resource?.id ?? m?.resourceId ?? m?.kind ?? m?.id, NaN);
              const amount = toNum(m?.amount ?? m?.quantity ?? m?.count, 0);
              if (!Number.isFinite(resourceId) || amount <= 0) return null;
              return {
                resource: {
                  id: resourceId,
                  name: m?.resource?.name ?? m?.name ?? `Resource ${resourceId}`,
                },
                amount,
              };
            })
            .filter(Boolean);
        }
      }
      return detail;
    } catch {
      return {};
    }
  },

  getServerStatus: async (realm = 0) => {
    const r = normalizeRealm(realm);
    const [economy, meta] = await Promise.all([
      SimCoToolsApi.getEconomyPhase(r),
      ProxyApi.getMeta(),
    ]);
    return {
      economy: economy || null,
      realm: r,
      source: economy ? 'simcotools' : 'unknown',
      updatedAt: meta?.lastUpdated ?? null,
    };
  },
};

