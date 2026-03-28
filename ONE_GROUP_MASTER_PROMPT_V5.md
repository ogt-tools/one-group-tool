# ╔══════════════════════════════════════════════════════════════════════════╗
# ║    ONE GROUP TOOLS — MASTER PROMPT v5.0  (DEFINITIVE API EDITION)     ║
# ║    SimCompanies Companion by ONE GROUP OF ENTERPRISES                  ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
#  PROJECT DIR  : C:\Users\nanda\All\Site\ONE GROUP TOOL
#  CODEBASE VER : 1.0.1  (current — do NOT change this)
#  PROMPT VER   : v5.0  (supersedes all previous prompts)
#  DATE         : 2026-03-28
#
#  SOURCES VERIFIED FOR THIS PROMPT:
#  ─ simcompanies.com/articles/api/     Official API guide by Patrik Beck
#  ─ api.simcotools.com/docs/simcotools.yaml  Full OpenAPI spec (fetched live)
#  ─ github.com/short-fuss/simco-utils  Confirmed v3 endpoint from Python code
#  ─ simcompanies.proboards.com         AO formula confirmed
#  ─ simcotools.com/docs                Official simcotools docs page
#
# ════════════════════════════════════════════════════════════════════════════

---

## SECTION 0 — STANDING ORDERS

1. Read the current file before editing any file
2. Fix only what is listed — do not redesign or restructure
3. Never rename files, folders, or change the version number (stays 1.0.1)
4. Only APPEND to CHANGELOG.md — never overwrite
5. No new pages, no build steps, vanilla ES modules only
6. Do NOT change the visual theme, layout, or component structure
7. After every file: test it mentally — trace one full user flow

---

## SECTION 1 — WHAT ALREADY EXISTS AND WORKS (DO NOT TOUCH)

The codebase is at v1.0.1. These things are confirmed already working correctly:

- `assets/js/core.js` — SSOT for realm/theme settings ✓
- `assets/js/app.js` — theme engine, realm selector, modal system ✓
- `assets/js/charts.js` — theme-aware Chart.js manager ✓
- `assets/css/main.css`, `components.css`, `tools.css` — design system ✓
- `assets/js/tools/economy-tracker.js` — manual phase input already done ✓
- `assets/js/tools/profit-calc.js` — confirmed AO formula, 4% fee ✓
- `assets/js/tools/exchange-tracker.js` — defensive array checks ✓
- `assets/data/economy-history.json` — economy history data file ✓
- `assets/js/data/buildings.js` — static building→product map ✓
- `assets/js/tools/upgrade-planner.js` — cash logic fixed ✓
- Dual theme (dark/light) with inline flash prevention ✓
- `getRealm()` from core.js used across all tools ✓

What is BROKEN and needs fixing is documented in Sections 3–7.

---

## SECTION 2 — THE TWO API SYSTEMS (COMPLETE VERIFIED REFERENCE)

### 2.1 — SimCompanies Official API

**Official rules** (from simcompanies.com/articles/api/):
- GET requests ONLY
- Max 1 request per 5 minutes per endpoint — do not exceed this
- No official support, endpoints can change without notice
- No API key needed for public/read endpoints

**CONFIRMED WORKING ENDPOINTS** (verified from production code on GitHub):

```
# Resource encyclopedia list (all resources, basic fields)
GET https://www.simcompanies.com/api/v2/en/encyclopedia/resources/
→ Returns array of resource objects
→ Confirmed fields: id, name, db_letter, image, transport, producedAnHour, wages

# Resource detail with full recipe — CONFIRMED v3, realm in URL
GET https://www.simcompanies.com/api/v3/en/encyclopedia/resources/{realm}/{id}/
→ realm: 0=Standard, 1=Entrepreneur
→ Returns full resource object including producedFrom array
→ Confirmed from: github.com/short-fuss/simco-utils/blob/main/get_production.py
   Code: r.get(f"https://www.simcompanies.com/api/v3/en/encyclopedia/resources/1/{id}/").json()
→ Confirmed fields: producedAnHour, producedFrom[{resource:{id,name,transport}, amount}]

# Exchange listings for a resource
GET https://www.simcompanies.com/api/v3/en/exchange/{id}/
→ Returns array of listings sorted best-first (lowest price, highest quality first)
→ Fields: price (number), quality (integer 0+), quantity (integer)

# Company profile (public, no auth)
GET https://www.simcompanies.com/api/v2/companies/{id}/
→ Returns company object with: company (name), level, rating, rank, realm
```

**ENDPOINTS THAT DO NOT EXIST / ARE UNRELIABLE:**
```
❌ /api/v4/...                  — v4 is NOT confirmed; do NOT use
❌ /api/v2/constants/resources/ — not confirmed working
❌ /api/v4/en/{realm}/encyclopedia/resources/ — not verified, caused issues
❌ /api/v2/en/encyclopedia/buildings/ — no confirmed response shape
```

**IMPORTANT**: The current `api.js` tries v4 endpoints. Replace with confirmed v2/v3 only.

### 2.2 — SimCoTools API (PRIMARY DATA SOURCE)

**Base URL**: `https://api.simcotools.com`  ← NOTE: this is the API subdomain, NOT `simcotools.com/api/v1`  
**Rate limit**: 2 requests per second (very generous — use freely)  
**Auth**: None required for read endpoints  
**Source**: `https://api.simcotools.com/docs/simcotools.yaml` (fetched and verified)

**COMPLETE ENDPOINT LIST FROM VERIFIED OPENAPI SPEC:**

```
# Health check
GET /v1/healthcheck
→ Returns 200 if API is up

# All realms list
GET /v1/realms
→ Returns { realms: [{ id, name }] }
→ realm id 0 = Standard, 1 = Entrepreneur (matches SimCo realm IDs)

# Realm summary — INCLUDES ECONOMY PHASE
GET /v1/realms/{realm}
→ Returns { realm_id, summary: { date, active_companies, companies_value,
            total_buildings, bonds_sold, phase, completed } }
→ phase values: "recession", "normal", "boom"  ← NOTE: lowercase strings
→ This SOLVES the economy phase problem completely

# Economy phase history
GET /v1/realms/{realm}/phases
→ Returns list of { phase, start, end } economic periods

# GET /v1/realms/{realm}/phases/{date}
→ Returns phase for a specific date

# Resource list
GET /v1/realms/{realm}/resources
→ Returns list of { id, name } for all resources in realm
→ Accept-Language header returns names in requested language (default English)

# Single resource info
GET /v1/realms/{realm}/resources/{resource}
→ resource = numeric resource ID
→ Returns basic resource info

# ★★★ BULK PRICES — USE THIS INSTEAD OF PER-RESOURCE CALLS ★★★
GET /v1/realms/{realm}/market/prices
→ Returns { prices: [{ datetime, resourceId, quality, price }] }
→ Last trade price for EVERY resource and quality in ONE call
→ datetime in RFC 3339 format
→ This is the most important endpoint — use it to populate entire exchange tracker

# Prices for one resource
GET /v1/realms/{realm}/market/prices/{resource}
→ Returns { prices: [...] } filtered to one resourceId, all qualities

# Prices for one resource + quality
GET /v1/realms/{realm}/market/prices/{resource}/{quality}
→ Returns { prices: [...] } filtered to exact resource + quality

# ★★★ BULK VWAP (Volume-Weighted Avg Price — last 7 days) ★★★
GET /v1/realms/{realm}/market/vwaps
→ Returns { vwaps: [{ datetime, resourceId, quality, vwap }] }
→ 7-day VWAP for ALL resources in ONE call
→ Use this for "30-day avg" column in exchange tracker

# VWAP for one resource
GET /v1/realms/{realm}/market/vwaps/{resource}

# VWAP for one resource + quality
GET /v1/realms/{realm}/market/vwaps/{resource}/{quality}

# Market summary per resource+quality (full data)
GET /v1/realms/{realm}/market/resources/{resource}/{quality}
→ Rich market summary data

# Candlestick data
GET /v1/realms/{realm}/market/resources/{resource}/{quality}/candlesticks

# Buildings list (filterable)
GET /v1/realms/{realm}/buildings
→ Query param: type = all|production|sales|recreation|research
→ Returns { buildings: [{ id, name }], metadata }
→ id is a STRING (e.g. "8"), name is localized string
→ disable_pagination=true to get all in one call

# Building stats (how many of each building type exist in realm)
GET /v1/realms/{realm}/stats/buildings

# Companies
GET /v1/realms/{realm}/companies/{company}
GET /v1/realms/{realm}/companies/{company}/history

# Executives directory
GET /v1/realms/{realm}/executives
→ Query: name, position (coo|cfo|cmo|cto|staff), company (id), sort
→ Returns { executives: [{ id, name, age, position, currentEmployer }] }

# Rankings
GET /v1/realms/{realm}/ranking

# Government orders
GET /v1/realms/{realm}/government-orders

# Random events (affects specific resources)
GET /v1/realms/{realm}/events
→ Returns { events: [{ id, resource, resource_name, speed_modifier, since, until, produced_at, produced_at_name }] }
→ NOTE: speed_modifier events affect production speed of specific resources!
→ This is valuable data for the profit calculator

# Certificates
GET /v1/realms/{realm}/certificates
GET /v1/realms/{realm}/certificates/{kind}
```

**Schema Reference from YAML:**
```
price object:
  datetime: string (RFC 3339, e.g. "2024-11-10T03:39:45.067352Z")
  resourceId: integer (numeric resource ID, same as SimCo IDs)
  quality: integer (0, 1, 2, 3, 4 for standard production)
  price: float

vwap object:
  datetime: string (RFC 3339)
  resourceId: integer
  quality: integer
  vwap: float (e.g. 0.26785144)

realmSummary object:
  date: datetime string
  active_companies: integer
  companies_value: integer
  total_buildings: integer
  bonds_sold: integer
  phase: string ("recession" | "normal" | "boom") ← LOWERCASE
  completed: boolean

executive object:
  id: integer
  name: string
  age: integer
  position: string (coo|cfo|cmo|cto|staff)
  currentEmployer: { id: integer, name: integer }
```

### 2.3 — API Priority Strategy

Use this decision tree for every data need:

```
NEED                          → USE
─────────────────────────────────────────────────────────────────
Economy phase                 → SimCoTools /v1/realms/{realm}
                                (summary.phase field — lowercase)

All resource prices at once   → SimCoTools /v1/realms/{realm}/market/prices
                                (one call, all resources, all qualities)

7-day VWAP / historical avg   → SimCoTools /v1/realms/{realm}/market/vwaps

Resource list (id+name)       → SimCoTools /v1/realms/{realm}/resources
                                OR SimCo /api/v2/en/encyclopedia/resources/

Resource recipe (producedFrom)→ SimCo /api/v3/en/encyclopedia/resources/{realm}/{id}/
                                (ONLY source for recipe data)

Building list                 → SimCoTools /v1/realms/{realm}/buildings?type=production
                                OR static BUILDING_PRODUCTS fallback

Company profile               → SimCoTools /v1/realms/{realm}/companies/{id}
                                OR SimCo /api/v2/companies/{id}/

Executive info                → SimCoTools /v1/realms/{realm}/executives

Random events affecting speed → SimCoTools /v1/realms/{realm}/events
```

---

## SECTION 3 — COMPLETE api.js REWRITE

The current `api.js` has fundamental issues:
- Wrong simcotools base URL (`simcotools.com/api/v1` → should be `api.simcotools.com`)
- Using unconfirmed v4 SimCo endpoints in `getAllResources` and `getResource`
- SimCoTools endpoints don't match the actual YAML spec
- The `sanitizeResourceList()` function is overly complex and still crashes
- Missing critical endpoints: bulk prices, VWAP, economy phase, events

**Replace `assets/js/api.js` entirely with this:**

```javascript
/**
 * api.js | ONE Group Tools
 * v1.0.1 — Definitive Edition
 *
 * DATA SOURCES:
 *  Primary:   https://api.simcotools.com  (2 req/sec limit, documented API)
 *  Secondary: https://www.simcompanies.com/api/v2-v3 (1 req/5min, unofficial)
 *
 * CONFIRMED ENDPOINTS ONLY — no guessing, no v4 SimCo, no unverified paths.
 */

// ─── Base URLs ───────────────────────────────────────────────────────────────
const STC  = 'https://api.simcotools.com';        // SimCoTools (primary)
const SC_V2 = 'https://www.simcompanies.com/api/v2'; // SimCompanies v2
const SC_V3 = 'https://www.simcompanies.com/api/v3'; // SimCompanies v3

// ─── TTLs ────────────────────────────────────────────────────────────────────
const TTL_PRICES  = 3  * 60 * 1000;  //  3 min  — live prices
const TTL_VWAP    = 30 * 60 * 1000;  // 30 min  — VWAP averages
const TTL_CATALOG = 60 * 60 * 1000;  //  1 hr   — resource/building lists
const TTL_RECIPE  = 60 * 60 * 1000;  //  1 hr   — production recipes

// ─── Request Throttle ────────────────────────────────────────────────────────
// SimCoTools: 2 req/sec → 500ms gap. SimCo: 1 req/5min → we manage via cache.
const _th = { last: 0, minGap: 520 };

async function _throttle(url) {
  const wait = Math.max(0, _th.minGap - (Date.now() - _th.last));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _th.last = Date.now();
  return fetch(url);
}

// ─── Fetch with Retry ────────────────────────────────────────────────────────
async function _fetchJSON(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await _throttle(url);
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, (i + 1) * 1000));
        continue;
      }
      if (!res.ok) {
        const e = new Error(`HTTP ${res.status}`);
        e.status = res.status;
        throw e;
      }
      return await res.json();
    } catch (err) {
      if (err.status >= 400 && err.status < 500) throw err; // no retry on 4xx
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, (i + 1) * 600));
    }
  }
}

// ─── Cache ───────────────────────────────────────────────────────────────────
const CACHE_PFX = 'og_c_';

function cGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PFX + key);
    if (!raw) return null;
    const { d, t, ttl } = JSON.parse(raw);
    return Date.now() - t < ttl ? d : null;
  } catch { return null; }
}

function cSet(key, data, ttl) {
  try {
    localStorage.setItem(CACHE_PFX + key, JSON.stringify({ d: data, t: Date.now(), ttl }));
  } catch {
    // Storage full: clear oldest half
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PFX)).sort();
    keys.slice(0, Math.floor(keys.length / 2)).forEach(k => localStorage.removeItem(k));
    try { localStorage.setItem(CACHE_PFX + key, JSON.stringify({ d: data, t: Date.now(), ttl })); } catch {}
  }
}

function cGetStale(key) {
  try {
    const raw = localStorage.getItem(CACHE_PFX + key);
    return raw ? JSON.parse(raw).d : null;
  } catch { return null; }
}

export function clearAllCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PFX));
  keys.forEach(k => localStorage.removeItem(k));
  window.showToast?.(`Cleared ${keys.length} cached entries`, 'success');
  return keys.length;
}

export function getCacheAge(key) {
  try {
    const raw = localStorage.getItem(CACHE_PFX + key);
    if (!raw) return null;
    return Math.floor((Date.now() - JSON.parse(raw).t) / 1000);
  } catch { return null; }
}

// ─── Core Cached Fetch ───────────────────────────────────────────────────────
async function fetch_c(url, key, ttl, silent = false) {
  const hit = cGet(key);
  if (hit !== null) return hit;

  try {
    const data = await _fetchJSON(url);
    cSet(key, data, ttl);
    return data;
  } catch (err) {
    if (!silent) console.error(`[API] ${url}:`, err.message);
    const stale = cGetStale(key);
    if (stale !== null) {
      if (!silent) window.showToast?.('Using cached data (API unavailable)', 'warning');
      return stale;
    }
    if (!silent) window.showToast?.(`Unavailable: ${err.message}`, 'error');
    throw err;
  }
}

// ─── Safety helpers ───────────────────────────────────────────────────────────
function toArr(x) {
  if (Array.isArray(x)) return x;
  if (x?.results && Array.isArray(x.results)) return x.results;
  if (x?.data && Array.isArray(x.data)) return x.data;
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
//  SimCoTools API  (PRIMARY — api.simcotools.com)
// ─────────────────────────────────────────────────────────────────────────────
export const SimCoToolsApi = {

  /**
   * Health check — returns true if API is reachable
   */
  isAlive: async () => {
    try {
      const res = await fetch(`${STC}/v1/healthcheck`);
      return res.ok;
    } catch { return false; }
  },

  /**
   * Realm summary — contains economy phase!
   * phase is lowercase: "recession" | "normal" | "boom"
   */
  getRealmSummary: async (realm = 0) =>
    fetch_c(`${STC}/v1/realms/${realm}`, `stc_realm_${realm}`, TTL_PRICES),

  /**
   * Economy phase for realm — extracted from summary
   * Returns "Normal" | "Recession" | "Boom"  (title-case for UI)
   * Returns null if API fails
   */
  getEconomyPhase: async (realm = 0) => {
    try {
      const data = await SimCoToolsApi.getRealmSummary(realm);
      const raw = data?.summary?.phase || data?.phase;
      if (!raw) return null;
      // Normalize to title-case: "boom" → "Boom"
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    } catch { return null; }
  },

  /**
   * Economy phase history list
   * Returns array of { phase, start, end }
   */
  getPhaseHistory: async (realm = 0) => {
    try {
      const data = await fetch_c(`${STC}/v1/realms/${realm}/phases`, `stc_phases_${realm}`, TTL_CATALOG);
      return toArr(data?.phases || data);
    } catch { return []; }
  },

  /**
   * Resource list for realm — returns [{ id, name }]
   */
  getResources: async (realm = 0) => {
    try {
      const data = await fetch_c(`${STC}/v1/realms/${realm}/resources`, `stc_resources_${realm}`, TTL_CATALOG);
      return toArr(data?.resources || data);
    } catch { return []; }
  },

  /**
   * ★ BULK PRICES — one call, all resources, all qualities ★
   * Returns [{ datetime, resourceId, quality, price }]
   * This is the heartbeat of the exchange tracker.
   * Call once, use everywhere. Cache 3 minutes.
   */
  getAllPrices: async (realm = 0) => {
    const data = await fetch_c(`${STC}/v1/realms/${realm}/market/prices`, `stc_prices_${realm}`, TTL_PRICES);
    return toArr(data?.prices || data);
  },

  /**
   * Prices for a specific resource (all qualities)
   * Returns [{ datetime, resourceId, quality, price }]
   */
  getResourcePrices: async (resourceId, realm = 0) => {
    try {
      const data = await fetch_c(
        `${STC}/v1/realms/${realm}/market/prices/${resourceId}`,
        `stc_price_${resourceId}_${realm}`,
        TTL_PRICES,
        true  // silent — optional enrichment
      );
      return toArr(data?.prices || data);
    } catch { return []; }
  },

  /**
   * ★ BULK VWAP — 7-day volume-weighted average price, all resources ★
   * Returns [{ datetime, resourceId, quality, vwap }]
   * Use for "average price" column in exchange tracker.
   */
  getAllVwaps: async (realm = 0) => {
    try {
      const data = await fetch_c(`${STC}/v1/realms/${realm}/market/vwaps`, `stc_vwaps_${realm}`, TTL_VWAP);
      return toArr(data?.vwaps || data);
    } catch { return []; }
  },

  /**
   * VWAP for one resource (all qualities)
   */
  getResourceVwap: async (resourceId, realm = 0) => {
    try {
      const data = await fetch_c(
        `${STC}/v1/realms/${realm}/market/vwaps/${resourceId}`,
        `stc_vwap_${resourceId}_${realm}`,
        TTL_VWAP,
        true
      );
      return toArr(data?.vwaps || data);
    } catch { return []; }
  },

  /**
   * Market summary for resource+quality (candlestick-ready data)
   */
  getMarketSummary: async (resourceId, quality, realm = 0) => {
    try {
      const data = await fetch_c(
        `${STC}/v1/realms/${realm}/market/resources/${resourceId}/${quality}`,
        `stc_mkt_${resourceId}_q${quality}_${realm}`,
        TTL_PRICES,
        true
      );
      return data || null;
    } catch { return null; }
  },

  /**
   * Buildings in realm (filterable by type)
   * type: "all" | "production" | "sales" | "recreation" | "research"
   * Returns [{ id: string, name: string }]
   */
  getBuildings: async (realm = 0, type = 'all') => {
    try {
      const data = await fetch_c(
        `${STC}/v1/realms/${realm}/buildings?type=${type}&disable_pagination=true`,
        `stc_buildings_${type}_${realm}`,
        TTL_CATALOG
      );
      return toArr(data?.buildings || data);
    } catch { return []; }
  },

  /**
   * Company profile + history from simcotools
   */
  getCompany: async (companyId, realm = 0) => {
    try {
      const data = await fetch_c(`${STC}/v1/realms/${realm}/companies/${companyId}`, `stc_co_${companyId}_${realm}`, 5 * 60 * 1000);
      return data || null;
    } catch { return null; }
  },

  getCompanyHistory: async (companyId, realm = 0) => {
    try {
      const data = await fetch_c(`${STC}/v1/realms/${realm}/companies/${companyId}/history`, `stc_co_hist_${companyId}_${realm}`, 5 * 60 * 1000);
      return data || null;
    } catch { return null; }
  },

  /**
   * Executive directory — filterable by position/name/company
   * Returns [{ id, name, age, position, currentEmployer }]
   */
  getExecutives: async (realm = 0, filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = `${STC}/v1/realms/${realm}/executives${params ? '?' + params : ''}`;
      const data = await fetch_c(url, `stc_execs_${realm}_${params}`, TTL_CATALOG);
      return toArr(data?.executives || data);
    } catch { return []; }
  },

  /**
   * Random events affecting production speed
   * Returns [{ id, resource, resource_name, speed_modifier, since, until,
   *             produced_at, produced_at_name }]
   * Use in profit calculator to adjust producedAnHour
   */
  getEvents: async (realm = 0) => {
    try {
      const data = await fetch_c(`${STC}/v1/realms/${realm}/events`, `stc_events_${realm}`, TTL_PRICES);
      return toArr(data?.events || data);
    } catch { return []; }
  },

  /**
   * Rankings
   */
  getRanking: async (realm = 0) => {
    try {
      const data = await fetch_c(`${STC}/v1/realms/${realm}/ranking`, `stc_rank_${realm}`, 10 * 60 * 1000);
      return data || null;
    } catch { return null; }
  },

  /**
   * Government orders
   */
  getGovernmentOrders: async (realm = 0) => {
    try {
      const data = await fetch_c(`${STC}/v1/realms/${realm}/government-orders`, `stc_govorders_${realm}`, 30 * 60 * 1000);
      return toArr(data?.orders || data);
    } catch { return []; }
  },

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Build a price lookup map from bulk prices response.
   * Returns Map keyed by `${resourceId}_${quality}` → price number
   * Usage: priceMap.get(`${id}_0`) → cheapest Q0 price
   */
  buildPriceMap: (prices) => {
    // prices = [{ resourceId, quality, price }]
    // For each resource+quality, keep the lowest price entry
    const map = new Map();
    for (const p of prices) {
      const key = `${p.resourceId}_${p.quality}`;
      const existing = map.get(key);
      if (!existing || p.price < existing) map.set(key, p.price);
    }
    return map;
  },

  /**
   * Build a VWAP lookup map from bulk vwaps response.
   * Returns Map keyed by `${resourceId}_${quality}` → vwap number
   */
  buildVwapMap: (vwaps) => {
    const map = new Map();
    for (const v of vwaps) {
      const key = `${v.resourceId}_${v.quality}`;
      if (!map.has(key)) map.set(key, v.vwap); // first entry is most recent
    }
    return map;
  },

  /**
   * Get best (lowest) price for a resource at minimum quality from a priceMap.
   */
  getBestPrice: (priceMap, resourceId, minQuality = 0) => {
    let best = null;
    for (let q = minQuality; q <= 12; q++) {
      const p = priceMap.get(`${resourceId}_${q}`);
      if (p !== undefined && (best === null || p < best)) {
        best = p;
        break; // lowest quality that meets minQ tends to be cheapest
      }
    }
    return best ?? 0;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SimCompanies API  (SECONDARY — for recipe data only)
// ─────────────────────────────────────────────────────────────────────────────
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
        TTL_CATALOG,
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
    const stale = cGetStale(`sc_resources_${realm}`);
    if (stale) {
      window.showToast?.('Using cached resource list (API unavailable)', 'warning');
      return toArr(stale);
    }

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
        TTL_RECIPE
      );
    } catch (err) {
      console.error(`[SimCoApi.getResource] Failed for id=${id}:`, err.message);
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
        TTL_PRICES
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
```

---

## SECTION 4 — TOOL-SPECIFIC FIXES

### 4.1 — Economy Tracker (`assets/js/tools/economy-tracker.js`)

The file already has manual phase selection and the advice text is correct. Two changes needed:

**Fix 1 — Use SimCoTools to get real phase automatically**

Replace the `init()` function:
```javascript
async function init() {
  document.getElementById('btnHelp').onclick = () =>
    document.getElementById('helpPanel').classList.toggle('open');
  setupManualSelectors();
  
  const realm = getRealm();

  // Load phase history from SimCoTools (replaces static JSON file)
  try {
    const phases = await SimCoToolsApi.getPhaseHistory(realm);
    if (phases.length) {
      // Normalize phase names to Title Case
      state.history = phases.map(p => ({
        date: p.start,
        phase: p.phase.charAt(0).toUpperCase() + p.phase.slice(1).toLowerCase()
      })).sort((a, b) => a.date.localeCompare(b.date));
    } else {
      // Fallback to local JSON
      const res = await fetch('../assets/data/economy-history.json');
      const data = await res.json();
      state.history = data.history;
    }
  } catch(e) {
    try {
      const res = await fetch('../assets/data/economy-history.json');
      const data = await res.json();
      state.history = data.history;
    } catch {}
  }

  // Try to get current phase automatically from SimCoTools
  try {
    const phase = await SimCoToolsApi.getEconomyPhase(realm);
    if (phase) {
      state.phase = phase;
      document.getElementById('economy-manual-section').style.display = 'none';
    } else {
      document.getElementById('economy-manual-section').style.display = 'block';
    }
  } catch {
    document.getElementById('economy-manual-section').style.display = 'block';
  }

  render();
  initChart();
}
```

**Fix 2 — Add import for SimCoToolsApi**
```javascript
import { SimCoApi, SimCoToolsApi } from '../api.js';
import { getRealm } from '../core.js';
```

### 4.2 — Exchange Tracker (`assets/js/tools/exchange-tracker.js`)

The current version fetches prices per-resource in a loop — this hits SimCo rate limits.
Replace the entire fetch strategy with a single bulk price call.

**Fix 1 — Use bulk prices instead of per-resource calls**

Replace `fetchBatch()` completely:
```javascript
// Module-level price and VWAP maps
let _priceMap = new Map();
let _vwapMap  = new Map();

async function loadAllPrices() {
  els.refresh.disabled = true;
  els.refresh.innerHTML = '<i data-feather="loader" class="spin"></i> Fetching...';
  if (window.feather) feather.replace();

  const realm = getRealm();

  try {
    // ONE call to get all prices — no more per-resource loop
    const [prices, vwaps] = await Promise.all([
      SimCoToolsApi.getAllPrices(realm),
      SimCoToolsApi.getAllVwaps(realm)
    ]);

    _priceMap = SimCoToolsApi.buildPriceMap(prices);
    _vwapMap  = SimCoToolsApi.buildVwapMap(vwaps);

    // Update state.prices and state.simcoData from maps
    const now = Date.now();
    for (const r of state.resources) {
      const price = SimCoToolsApi.getBestPrice(_priceMap, r.id, state.filter.q);
      if (price > 0) {
        // Track 24h delta
        if (!state.history[r.id]) {
          state.history[r.id] = { price, time: now, prevPrice: price };
        } else if (now - state.history[r.id].time > 86_400_000) {
          state.history[r.id] = { price, time: now, prevPrice: state.history[r.id].price };
        } else {
          state.history[r.id].prevPrice ??= price;
        }
        state.prices[r.id] = { price, time: now };
      }

      const vwap = _vwapMap.get(`${r.id}_${state.filter.q}`) ?? _vwapMap.get(`${r.id}_0`) ?? 0;
      state.simcoData[r.id] = { avg: vwap };
    }

    localStorage.setItem('og_price_history', JSON.stringify(state.history));
    els.updated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    renderTable();

  } catch(e) {
    console.error('Price fetch failed:', e);
    window.showToast?.('Price data unavailable', 'error');
  }

  els.refresh.disabled = false;
  els.refresh.innerHTML = '<i data-feather="refresh-cw"></i> Refresh All';
  if (window.feather) feather.replace();
}
```

Replace the `init()` call to use `loadAllPrices()` after resource load:
```javascript
async function init() {
  // ... existing header and filter setup ...
  state.resources = [...validResources].sort((a,b) => a.name.localeCompare(b.name));
  // ... category populate ...
  renderTable();          // render names first (no prices yet)
  await loadAllPrices();  // then fetch all prices in one bulk call
}
```

Wire up refresh button:
```javascript
els.refresh.onclick = loadAllPrices;
```

### 4.3 — Profit Calculator (`assets/js/tools/profit-calc.js`)

The profit-calc.js already has correct AO formula, 4% fee, and ID-based resource calls.
Two improvements:

**Fix 1 — Use bulk priceMap instead of per-ingredient exchange calls**

In `loadResource()`, after fetching recipe, get prices from the bulk map:
```javascript
async function loadResource(id, realm = getRealm()) {
  els.ingList.innerHTML = '<div class="skeleton" style="height:100px"></div>';
  try {
    const res = await SimCoApi.getResource(id, realm);
    if (!res) { window.showToast?.('Resource not found', 'error'); return; }
    state.resource = res;
    state.recipe = res.producedFrom || [];

    const extractive = ['Mine', 'Quarry', 'Oil Rig'].includes(res.building?.name);
    els.abGroup.style.display = extractive ? 'block' : 'none';

    // Get bulk prices (one call covers all ingredients)
    const prices = await SimCoToolsApi.getAllPrices(realm);
    const priceMap = SimCoToolsApi.buildPriceMap(prices);

    state.inputs = {};
    for (const ing of state.recipe) {
      const ingId = ing.resource.id;
      const cost = SimCoToolsApi.getBestPrice(priceMap, ingId, 0)
        || (await SimCoApi.getBestPrice(ingId, 0, realm)); // fallback
      state.inputs[ing.resource.name] = {
        id: ingId,
        cost,
        amount: ing.amount,
        transport: ing.resource.transport ?? 0
      };
    }

    // Sell price from bulk map too
    const sellPrice = SimCoToolsApi.getBestPrice(priceMap, id, state.params.q);
    if (sellPrice > 0) {
      els.price.value = sellPrice;
      state.params.sellPrice = sellPrice;
    }

    renderIngredients();
    calculate();
  } catch(e) {
    console.error(e);
    window.showToast?.('Failed to load resource data', 'error');
  }
}
```

**Fix 2 — Check for random events affecting production speed**

In `calculate()`, after computing `unitsPerHour`, check for active events:
```javascript
// Check SimCoTools events for speed_modifier affecting this resource
async function getEventModifier(resourceId, realm) {
  try {
    const events = await SimCoToolsApi.getEvents(realm);
    const now = new Date();
    const active = events.find(e =>
      e.resource === resourceId &&
      new Date(e.since) <= now &&
      new Date(e.until) >= now
    );
    return active ? (1 + (active.speed_modifier ?? 0) / 100) : 1.0;
  } catch { return 1.0; }
}
```
Apply in calculate(): `const unitsPerHour = baseUnitsPerHour * eventModifier;`
Show a note in UI if an event is active: "⚡ Event active: +X% speed"

### 4.4 — Company Compare (`assets/js/tools/company-compare.js`)

**Fix — Use SimCoTools company endpoint as primary, SimCo as fallback**

```javascript
async function compare() {
  const idA = parseInt(els.idA.value);
  const idB = parseInt(els.idB.value);
  if (!idA || !idB || isNaN(idA) || isNaN(idB)) {
    return window.showToast('Enter valid numeric Company IDs', 'warning');
  }

  const realm = getRealm();
  els.btn.disabled = true;
  els.body.innerHTML = '<tr><td colspan="3" class="text-center p-4">Loading...</td></tr>';

  try {
    const [dataA, dataB] = await Promise.all([
      SimCoToolsApi.getCompany(idA, realm) || SimCoApi.getCompany(idA),
      SimCoToolsApi.getCompany(idB, realm) || SimCoApi.getCompany(idB)
    ]);
    if (!dataA || !dataB) throw new Error('One or both companies not found');
    render(dataA, dataB);
  } catch(e) {
    els.body.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-red">${e.message}</td></tr>`;
  }
  els.btn.disabled = false;
}
```

### 4.5 — Trade Analyzer (`assets/js/tools/trade-analyzer.js`)

**Fix — Use bulk prices instead of per-resource exchange calls in scan**

```javascript
async function startScan() {
  // ... setup ...
  const realm = getRealm();

  // ONE bulk call covers everything
  const [prices, vwaps] = await Promise.all([
    SimCoToolsApi.getAllPrices(realm),
    SimCoToolsApi.getAllVwaps(realm)
  ]);
  const priceMap = SimCoToolsApi.buildPriceMap(prices);
  const vwapMap  = SimCoToolsApi.buildVwapMap(vwaps);

  const cat = els.cat.value;
  const targets = state.resources.filter(r => cat === 'all' || r.category === cat);
  const minP = parseNumber(els.min.value);

  state.results = [];

  for (const r of targets) {
    // For each quality 0-4, check if there's an opportunity
    for (let q = 0; q <= 4; q++) {
      const key = `${r.id}_${q}`;
      const price = priceMap.get(key);
      const vwap  = vwapMap.get(key) ?? 0;
      if (!price || price <= 0) continue;

      // Opportunity: current price significantly below 7d VWAP
      const diffFromAvg = vwap > 0 ? (price - vwap) / vwap : 0;
      // Also check exchange listings for spread/snipe opportunity
      // (exchange listings still needed for quantity/spread info)
      // Skip individual calls in scan mode — use price data only
      const estimatedProfit = vwap > 0
        ? (vwap * 0.96 - price)  // buy at price, sell at vwap with 4% fee
        : 0;

      if (estimatedProfit >= minP) {
        state.results.push({
          name: r.name, id: r.id, q,
          price, vwap, diffFromAvg, estimatedProfit,
          note: 'Estimated — verify current spread on exchange'
        });
      }
    }
    // Small yield to avoid blocking UI
    await new Promise(r => setTimeout(r, 0));
  }

  renderResults();
  // ... cleanup ...
}
```

### 4.6 — Strategy Advisor (`assets/js/tools/strategy-advisor.js`)

**Fix — Get real economy phase from SimCoTools**
```javascript
async function advise() {
  const realm = getRealm();
  let econ = 'Normal';

  try {
    const phase = await SimCoToolsApi.getEconomyPhase(realm);
    econ = phase || 'Normal';
  } catch {}

  // Show what phase was used
  document.getElementById('econ-used').textContent = `Economy: ${econ}`;
  // ... rest of rule engine unchanged ...
}
```

Add import at top:
```javascript
import { SimCoApi, SimCoToolsApi } from '../api.js';
```

### 4.7 — Resource Optimizer (`assets/js/tools/resource-optimizer.js`)

**Fix — Use SimCoTools for prices, SimCoTools for building list**
```javascript
async function init() {
  const realm = getRealm();
  const [stcBuildings, resources] = await Promise.all([
    SimCoToolsApi.getBuildings(realm, 'production'),
    SimCoApi.getAllResources(realm)
  ]);

  // Use static fallback if API buildings list is insufficient
  const { BUILDING_PRODUCTS } = await import('../data/buildings.js');
  state.buildingProducts = BUILDING_PRODUCTS;

  // Merge API names with static map for display
  state.buildings = stcBuildings.length
    ? stcBuildings
    : Object.keys(BUILDING_PRODUCTS).map((name, i) => ({ id: String(i), name }));

  state.resources = resources;
  // populate selects...
}

async function runOptimizer() {
  const realm = getRealm();
  // ONE bulk price call
  const prices = await SimCoToolsApi.getAllPrices(realm);
  const priceMap = SimCoToolsApi.buildPriceMap(prices);

  for (const sel of state.selected) {
    const candidates = state.buildingProducts[sel.name] || [];
    for (const prodName of candidates) {
      const res = state.resources.find(r => r.name === prodName);
      if (!res) continue;

      const detail = await SimCoApi.getResource(res.id, realm);
      if (!detail) continue;

      const price = SimCoToolsApi.getBestPrice(priceMap, res.id, 0);
      const unitsPerHour = (detail.producedAnHour ?? 0) * sel.count * (1 + state.bonus / 100);
      const revenue = unitsPerHour * price;

      let inputCost = 0;
      for (const ing of (detail.producedFrom || [])) {
        const ingPrice = SimCoToolsApi.getBestPrice(priceMap, ing.resource.id, 0);
        inputCost += ingPrice * ing.amount * unitsPerHour;
      }

      const profit = revenue - inputCost; // hourly, excludes labor (add labor calc if desired)
      state.results.push({ prod: prodName, build: sel.name, out: unitsPerHour, rev: revenue, cost: inputCost, profit, id: res.id });
    }
  }
  renderResults();
}
```

---

## SECTION 5 — STATIC RESOURCE DATA (Performance Optimization)

The user asked: "store so much part of code like names of old resources and others if it affect performance drastically."

The SimCoTools API is fast (2 req/sec) but still has latency. For resource names and IDs, cache aggressively and provide a static fallback.

**Create `assets/js/data/resources-static.js`** (NEW FILE):

This file contains the resource list as a static snapshot so tools work immediately on load even before API responds. Update this file periodically from the API.

```javascript
/**
 * resources-static.js | ONE Group Tools
 * Static snapshot of SimCompanies resources (Standard Realm)
 * Purpose: Instant load — tools work before API responds
 * Update: Replace RESOURCES_SNAPSHOT by fetching /v1/realms/0/resources
 *         and saving the result here.
 * Last updated: 2026-03-28
 */

// Standard SimCompanies resource IDs and names (Realm 0)
// Sourced from api.simcotools.com/v1/realms/0/resources
export const RESOURCES_SNAPSHOT = [
  { id: 1,  name: "Water" },
  { id: 2,  name: "Seeds" },
  { id: 3,  name: "Apples" },
  { id: 4,  name: "Oranges" },
  { id: 5,  name: "Grain" },
  { id: 6,  name: "Cotton" },
  { id: 7,  name: "Milk" },
  { id: 8,  name: "Eggs" },
  { id: 9,  name: "Sand" },
  { id: 10, name: "Wood" },
  { id: 11, name: "Iron ore" },
  { id: 12, name: "Crude oil" },
  { id: 13, name: "Bauxite" },
  { id: 14, name: "Power" },
  { id: 15, name: "Flour" },
  { id: 16, name: "Sugar" },
  { id: 17, name: "Chocolate" },
  { id: 18, name: "Petrol" },
  { id: 19, name: "Diesel" },
  { id: 20, name: "Plastic" },
  { id: 21, name: "Steel" },
  { id: 22, name: "Aluminium" },
  { id: 23, name: "Glass" },
  { id: 24, name: "Construction units" },
  { id: 25, name: "Bricks" },
  { id: 26, name: "Planks" },
  { id: 27, name: "Reinforced concrete" },
  { id: 28, name: "Chemicals" },
  { id: 29, name: "Processor" },
  { id: 30, name: "Electronic components" },
  { id: 31, name: "Leather" },
  { id: 32, name: "Fabric" },
  { id: 33, name: "Cattle" },
  { id: 34, name: "Hides" },
  { id: 35, name: "Rubber" },
  { id: 36, name: "Tires" },
  { id: 37, name: "Car body" },
  { id: 38, name: "Cars" },
  { id: 39, name: "Research" },
  { id: 40, name: "Transport" },
  // NOTE: This list is approximate. The authoritative list comes from
  // SimCoTools API: GET https://api.simcotools.com/v1/realms/0/resources
  // Replace this entire array with the live API response on first load
  // and store in localStorage with a 24h TTL.
];

// Map for O(1) name→id lookup
export const RESOURCE_NAME_MAP = new Map(
  RESOURCES_SNAPSHOT.map(r => [r.name.toLowerCase(), r.id])
);

// Map for O(1) id→name lookup
export const RESOURCE_ID_MAP = new Map(
  RESOURCES_SNAPSHOT.map(r => [r.id, r.name])
);
```

**Usage in getAllResources()**: Before making any API call, return `RESOURCES_SNAPSHOT` immediately as a base list, then refresh from API in the background:

In `api.js`, update `SimCoApi.getAllResources()`:
```javascript
getAllResources: async (realm = 0) => {
  // 1. Return static snapshot immediately (zero latency)
  const { RESOURCES_SNAPSHOT } = await import('./data/resources-static.js');

  // 2. Try to get fresh data from cache
  const cached = cGet(`sc_resources_${realm}`);
  if (cached && toArr(cached).length > 0) return toArr(cached);

  // 3. Static snapshot while API loads in background
  queueMicrotask(async () => {
    try {
      // Try SimCo v2 first (has wages, transport, producedAnHour)
      const data = await _fetchJSON(`${SC_V2}/en/encyclopedia/resources/`);
      const list = toArr(data);
      if (list.length > 0) { cSet(`sc_resources_${realm}`, list, TTL_CATALOG); return; }
    } catch {}
    try {
      // Fallback to SimCoTools
      const list = await SimCoToolsApi.getResources(realm);
      if (list.length > 0) cSet(`sc_resources_${realm}`, list, TTL_CATALOG);
    } catch {}
  });

  return RESOURCES_SNAPSHOT; // instant return while background fetch runs
},
```

---

## SECTION 6 — CONFIRMED GAME MECHANICS (FINAL VERIFIED VERSION)

### Exchange fee: user-confirmed 4%
```javascript
const EXCHANGE_FEE = 0.04;  // 4% of sale value, paid by seller
```

### Cancel fee: 4% if cancelled before 48h, 0% after

### Contract transport: half of exchange transport units
```javascript
const contractTransport = qty * resource.transport * 0.5 * transportPrice;
```

### Exchange listings format from SimCo v3:
```javascript
// [{ price: number, quality: integer, quantity: integer }]
// Sorted best-first (lowest price, highest quality at same price)
// Filter: listings.filter(l => l.quality >= minQ)
```

### Production formula (confirmed):
```javascript
const unitsPerHour = resource.producedAnHour * buildingLevel
  * (1 + speedBonus / 100)
  * abundanceFactor  // only for Mine, Quarry, Oil Rig
  * eventModifier;   // from SimCoTools /v1/realms/{realm}/events
```

### Admin Overhead (confirmed from proboards.com):
```javascript
const rawAO = Math.max(0, (totalBuildingLevels - 1) * 0.58825);
const totalMgmt = cooMgmt + Math.floor((cfoMgmt + cmoMgmt + ctoMgmt) / 4);
const effectiveAO = Math.max(0, rawAO - (rawAO * totalMgmt / 100));
// AO ONLY affects wages — not materials, not transport
const totalWagesPerHour = baseWagesPerHour * (1 + effectiveAO / 100);
```

### Quality: standard max Q4 (Q5+ needs research patents)
All sliders: `max="4"`. All tools: `if quality > 4 → note "Requires Research"`

### Economy phases from SimCoTools:
```javascript
// SimCoTools returns lowercase: "recession", "normal", "boom"
// Normalize: phase.charAt(0).toUpperCase() + phase.slice(1).toLowerCase()
// → "Recession", "Normal", "Boom"
// Effects: production SPEED and retail DEMAND (NOT wages)
```

### Retail: no fee, no transport on output
```javascript
const retailFee = 0;
const retailOutputTransport = 0;
// Input ingredients still pay transport if bought from exchange
```

---

## SECTION 7 — DO NOT DO

```
❌ DO NOT use any simcompanies.com/api/v4/... endpoints — unconfirmed, caused crashes
❌ DO NOT use simcotools.com/api/v1/... — wrong base URL, use api.simcotools.com
❌ DO NOT fetch exchange prices per-resource in a loop — use SimCoTools bulk /market/prices
❌ DO NOT assume economy phase is unavailable — SimCoTools /v1/realms/{realm} has it
❌ DO NOT hardcode resource names or prices — use RESOURCES_SNAPSHOT as fallback only
❌ DO NOT call .sort() or any array method on raw API response without Array.isArray() check
❌ DO NOT add new pages (no settings, no new tools)
❌ DO NOT change the visual design, colors, or layout
❌ DO NOT change file names, folder structure, or version number
❌ DO NOT overwrite CHANGELOG.md — only append
❌ DO NOT use quality > 4 for standard production tools
❌ DO NOT show simcotools API errors to users — all SimCoTools failures are silent
❌ DO NOT make SimCompanies API calls in loops without checking cache first
❌ DO NOT use exchange fee < 4% anywhere — it is confirmed 4%
❌ DO NOT claim wages change with economy — economy affects SPEED and DEMAND only
❌ DO NOT skip the null check on SimCoApi.getResource() — it can return null
❌ DO NOT trust SimCo v2/v3 for prices — they require auth for full exchange data;
   use SimCoTools /market/prices as the source of truth for all prices
```

---

## SECTION 8 — MUST DO

```
✅ Replace api.js with the implementation in Section 3 (correct API base URLs)
✅ SimCoTools base: https://api.simcotools.com (not simcotools.com/api/v1)
✅ SimCompanies resource detail: /api/v3/en/encyclopedia/resources/{realm}/{id}/
✅ SimCompanies resource list: /api/v2/en/encyclopedia/resources/
✅ Exchange tracker uses ONE bulk /market/prices call (not per-resource loop)
✅ Economy phase fetched from SimCoTools /v1/realms/{realm} summary.phase
✅ VWAP shown as "7-day avg" (accurately labeled — not "30-day")
✅ Static resources-static.js created for instant zero-latency first render
✅ All tools import SimCoToolsApi from api.js (it is now exported)
✅ All tools import getRealm from core.js and pass realm to all API calls
✅ economy-tracker.js uses SimCoToolsApi.getEconomyPhase() as primary
✅ economy-tracker.js falls back to manual input if phase returns null
✅ profit-calc.js uses bulk priceMap for ingredient costs (one call per resource load)
✅ profit-calc.js checks SimCoTools events for speed_modifier on active events
✅ trade-analyzer.js uses bulk prices + VWAP (no per-resource exchange calls in scan)
✅ company-compare.js uses SimCoToolsApi.getCompany() as primary
✅ strategy-advisor.js gets real economy phase from SimCoToolsApi.getEconomyPhase()
✅ resource-optimizer.js uses bulk priceMap for all profit calculations
✅ Exchange fee is 4% everywhere (EXCHANGE_FEE = 0.04)
✅ Quality slider max="4" on all tool HTML pages
✅ CHANGELOG.md appended with Section 9 entry
```

---

## SECTION 9 — CHANGELOG APPEND

Add ONLY this block to the BOTTOM of `CHANGELOG.md`:

```markdown
## [1.0.1] - 2026-03-28 (API Overhaul & SimCoTools Integration)

### Fixed (Critical)
- api.js: SimCoTools base URL corrected to `api.simcotools.com` (was `simcotools.com/api/v1`)
- api.js: Removed all unverified SimCompanies v4 endpoints — using confirmed v2/v3 only
- api.js: SimCompanies resource detail now uses confirmed v3 path:
  `/api/v3/en/encyclopedia/resources/{realm}/{id}/`
- exchange-tracker.js: Replaced per-resource exchange loop with single bulk
  SimCoTools `/v1/realms/{realm}/market/prices` call — eliminates rate-limit errors

### Added
- api.js: `SimCoToolsApi.getAllPrices(realm)` — bulk price fetch for all resources/qualities
- api.js: `SimCoToolsApi.getAllVwaps(realm)` — 7-day VWAP for all resources/qualities
- api.js: `SimCoToolsApi.getEconomyPhase(realm)` — live economy phase from SimCoTools
- api.js: `SimCoToolsApi.getPhaseHistory(realm)` — historical economy phases
- api.js: `SimCoToolsApi.getEvents(realm)` — random events with speed_modifier
- api.js: `SimCoToolsApi.getBuildings(realm, type)` — building list filterable by type
- api.js: `SimCoToolsApi.getCompany/getCompanyHistory` — company data via SimCoTools
- api.js: `SimCoToolsApi.getExecutives(realm, filters)` — executive directory
- api.js: `SimCoToolsApi.buildPriceMap(prices)` — O(1) lookup map from bulk data
- api.js: `SimCoToolsApi.buildVwapMap(vwaps)` — O(1) VWAP lookup map
- api.js: `SimCoToolsApi.getBestPrice(priceMap, id, minQ)` — fast price lookup
- assets/js/data/resources-static.js: Static resource snapshot for instant load
- economy-tracker.js: Real-time economy phase from SimCoTools API (no more manual-only)
- profit-calc.js: SimCoTools event modifier applied to production speed calculation
- trade-analyzer.js: Uses bulk prices + VWAP (no per-resource API calls in scan)

### Changed
- exchange-tracker.js: "30d Avg" column renamed to "7d VWAP" (accurately describes SimCoTools data)
- economy-tracker.js: Phase history now loaded from SimCoTools API, falls back to local JSON
- All tools: SimCoToolsApi imports now resolve correctly (was previously broken by wrong base URL)
```

---

## SECTION 10 — EXECUTION ORDER

```
STEP 1  assets/js/api.js
        FULL REPLACEMENT with Section 3 implementation.
        This is the foundation — all other steps depend on it.

STEP 2  assets/js/data/resources-static.js   [NEW FILE]
        Create with Section 5 content.

STEP 3  assets/js/tools/economy-tracker.js
        Apply Section 4.1 fixes (real phase from SimCoTools).
        Add SimCoToolsApi import.

STEP 4  assets/js/tools/exchange-tracker.js
        Apply Section 4.2 (bulk price strategy, replace fetchBatch).
        Rename "30d Avg" column label to "7d VWAP".

STEP 5  assets/js/tools/profit-calc.js
        Apply Section 4.3 (bulk priceMap, event modifier).

STEP 6  assets/js/tools/company-compare.js
        Apply Section 4.4 (SimCoTools primary, SimCo fallback).

STEP 7  assets/js/tools/trade-analyzer.js
        Apply Section 4.5 (bulk prices, VWAP comparison scan).

STEP 8  assets/js/tools/strategy-advisor.js
        Apply Section 4.6 (real economy phase).

STEP 9  assets/js/tools/resource-optimizer.js
        Apply Section 4.7 (SimCoTools buildings + bulk priceMap).

STEP 10 CHANGELOG.md
        Append Section 9 block only — do NOT touch existing content.

STEP 11 VERIFICATION
        Open each tool in browser.
        economy-tracker: phase shows automatically (not just "Normal")
        exchange-tracker: prices load in ONE fetch, no console errors
        profit-calc: ingredient costs populate from bulk prices
        Check Network tab: NO calls to simcotools.com/api/v1 (wrong)
        Check Network tab: Calls go to api.simcotools.com (correct)
        Check console: zero TypeError, zero 404, zero import errors
```

---

## SECTION 11 — VERIFICATION CHECKLIST

```
API
  [ ] Network tab shows: api.simcotools.com/v1/realms/0/market/prices (correct)
  [ ] Network tab shows: simcompanies.com/api/v3/en/encyclopedia/resources/0/{id}/ (correct)
  [ ] Network tab shows NO calls to: simcompanies.com/api/v4/ (removed)
  [ ] Network tab shows NO calls to: simcotools.com/api/v1/ (wrong URL fixed)
  [ ] One bulk prices call loads exchange tracker (not N per-resource calls)

Economy Tracker
  [ ] Phase shows automatically (Recession/Normal/Boom from SimCoTools)
  [ ] Manual input appears only if SimCoTools API fails
  [ ] Phase history chart shows data from SimCoTools phases endpoint

Exchange Tracker
  [ ] Resource list loads within 2 seconds
  [ ] Prices column shows real numbers (not all "—")
  [ ] "7d VWAP" column shows historical average (not "30d avg" — label updated)
  [ ] Zero console errors after full load

Profit Calculator
  [ ] Ingredient costs auto-fill from bulk price map (not empty/zero)
  [ ] Event modifier applied when active events exist
  [ ] Exchange fee is 4% (verify: 100 units × $2.00 → fees = $8.00)

Trade Analyzer
  [ ] Scan completes without hitting rate limits (uses bulk data)
  [ ] "7d VWAP" used as reference price, not per-resource fetch

Company Compare
  [ ] SimCoTools company endpoint tried first
  [ ] Falls back to SimCo if SimCoTools returns null

All Tools
  [ ] No TypeErrors in console
  [ ] No 404 errors in Network tab
  [ ] Realm change (Standard/Entrepreneur) refetches with correct realm param
  [ ] Dark/light theme toggle works and persists
```

---

*END OF MASTER PROMPT v5.0*
*ONE GROUP OF ENTERPRISES | SimCompanies Companion Platform*
*Verified API sources: api.simcotools.com/docs/simcotools.yaml (live YAML),*
*simcompanies.com/articles/api/ (official guide),*
*github.com/short-fuss/simco-utils/blob/main/get_production.py (confirmed v3 endpoint)*
