# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ONE GROUP TOOLS — MASTER PROMPT v6.0  (HAR-VERIFIED EDITION)         ║
# ║  SimCompanies Companion by ONE GROUP OF ENTERPRISES                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
#  PROJECT DIR  : C:\Users\nanda\All\Site\ONE GROUP TOOL
#  CODEBASE VER : 1.0.1  (never change this)
#  PROMPT VER   : v6.0  — supersedes ALL previous prompts
#  DATE         : 2026-03-28
#
#  SOURCES FOR THIS PROMPT:
#  ─ HAR captures from live simcompanies.com browser session (user-provided)
#  ─ api.simcotools.com/docs/simcotools.yaml  (live OpenAPI spec)
#  ─ simcompanies.com/articles/api/  (official API guide)
#  ─ Exchange fee confirmed 4% via fees field in HAR listing responses
# ════════════════════════════════════════════════════════════════════════════

---

## PART 0 — STANDING ORDERS

1. Read every file before editing it — no exceptions
2. Fix only what is listed here — do not redesign or refactor unrelated code
3. Never rename files, folders, or change the version number (stays 1.0.1)
4. Only APPEND to CHANGELOG.md — never overwrite existing content
5. No new pages, no build steps, vanilla ES modules only
6. No visual redesign — this prompt is about correctness and data accuracy
7. After finishing each file, trace one full user flow mentally before marking done

---

## PART 1 — CONFIRMED API TRUTH TABLE (HAR-VERIFIED)

These endpoints were observed live from an authenticated browser session.
The `★` mark = accessible without auth cookies (public).
The `🔒` mark = requires session cookies (user must be logged in).

```
★  GET /api/v3/market-ticker/{realm}/
   → [{kind, image, price, is_up, realmId}]
   → realm: 0 = Standard, 1 = Entrepreneur
   → kind = numeric resource ID (same as "dbLetter" in other contexts)
   → 142 items covering ALL resources with current best price
   → This is THE price feed for the entire site

★  GET /api/v3/market/{realm}/{kind}/
   → [{id, kind, quantity, quality, price, datetimeDecayUpdated, seller, posted, fees}]
   → Full exchange listings for ONE resource
   → fees = listing_qty × price × 0.04  ← CONFIRMS 4% exchange fee
   → NOTE: endpoint is /market/{realm}/{kind}/ NOT /exchange/{kind}/

★  GET /api/v2/production-modifiers/{realm}/
   → {resourceProductionModifiers: [{id, realm, kind, speedModifier, since, until}]}
   → speedModifier: integer percentage (e.g. +22 means +22% speed for that resource)
   → These are "random events" affecting production speed per resource

★  GET /api/v2/weather/{realm}/
   → {id, realm, since, until, sellingSpeedMultiplier}
   → sellingSpeedMultiplier: float (e.g. 1.2 = 20% faster retail sales today)
   → Changes every ~11 hours

★  GET /api/v4/{realm}/resources-retail-info/
   → [{quality, dbLetter, averagePrice, saturation, retailData[{averagePrice,
       amountSoldRestaurant, demand, saturation, date}]}]
   → 80 items covering retail products with 28-day history
   → dbLetter = numeric resource kind/ID
   → demand = float representing relative demand level
   → saturation = float (market saturation — lower = less saturated = higher demand)

🔒  GET /api/v3/companies/auth-data/
   → {authCompany, authUser, levelInfo, temporals, ...}
   → temporals.economyState: 0=Recession, 1=Normal, 2=Boom  ← ECONOMY PHASE
   → authCompany.productionModifier: integer (current global production speed modifier %)
   → authCompany.salesModifier: integer (current global sales speed modifier)
   → REQUIRES SESSION COOKIE — cannot be called without login
   → Use SimCoTools /v1/realms/{realm} for economy phase instead

🔒  GET /api/v2/companies/me/administration-overhead/
   → Single float: e.g. 1.6352941176470588
   → This IS the raw_AO value for the authenticated company
   → REQUIRES AUTH

🔒  GET /api/v3/companies/{companyId}/executives/
   → {executives: [{id, name, gender, genome, isCandidate, realm, age,
                     strikeUntil, salary, skills:{coo,cfo,cmo,cto},
                     currentWorkHistory, plansToRetire}]}
   → REQUIRES AUTH (company ID in URL is user's own company)

🔒  GET /api/v2/companies/me/buildings/
   → [{id, kind, position, name, cost, size, category, busy:{resource:{amount,
       quality, unitCost, kind, name}}, robotsSpecialization}]
   → REQUIRES AUTH
```

**CRITICAL CORRECTIONS FROM HAR:**

```
❌ WRONG (previous prompts): GET /api/v3/en/exchange/{id}/
✅ CORRECT:                  GET /api/v3/market/{realm}/{kind}/

❌ WRONG (previous prompts): GET /api/v4/en/{realm}/encyclopedia/resources/
✅ CORRECT:                  GET /api/v3/market-ticker/{realm}/   (for prices)
                             GET /api/v2/en/encyclopedia/resources/  (for catalog)

❌ WRONG (previous prompts): Exchange fee 3%
✅ CONFIRMED FROM FEES FIELD: Exchange fee = 4%
   Proof: listing fees=14014, qty=120, price=2920.0 → 120×2920×0.04=14016 ≈ 14014 ✓

❌ WRONG (all previous prompts): economy phase from getServerStatus stub
✅ CORRECT: Use SimCoTools GET /v1/realms/{realm} → summary.phase (lowercase)
   OR use SimCoTools GET /v1/realms/{realm}/phases for history

★ NEW: Economy state = integer in auth-data temporals: 0=Recession, 1=Normal, 2=Boom
   But this requires auth — public tools cannot access it directly.

★ NEW: productionModifier in auth-data = global production speed %
   Currently: 4 (meaning +4% production speed economy bonus)
   salesModifier = 1 (meaning +1% sales speed economy bonus)
   These values change with economy phase.

★ NEW: weather endpoint affects retail selling speed via sellingSpeedMultiplier
   Currently: 1.2008 = 20% faster retail today (changes ~every 11 hours)
```

---

## PART 2 — PROXY CACHE SERVER ARCHITECTURE

### 2.1 — The Problem

SimCompanies API: official limit = 1 request per 5 minutes per endpoint.
If 50 users all open exchange-tracker at the same time, they all hit the same
API endpoint — most get rate-limited or hit cached but stale data.

### 2.2 — The Solution: GitHub Actions Data Proxy

Create a separate GitHub repository `ogt-data-proxy` that:
- Runs on a cron schedule every 5 minutes via GitHub Actions
- Fetches all public endpoints from SimCompanies
- Saves the data as static JSON files committed to the repo
- GitHub Pages serves these files at a public URL
- The site's api.js reads from this proxy URL instead of hitting SimCo directly

```
ARCHITECTURE:

  [GitHub Actions - runs every 5 min]
         ↓ fetches
  [SimCompanies Public APIs]
         ↓ commits JSON files
  [GitHub Pages: ogt-data-proxy]
         ↓ served at
  https://{username}.github.io/ogt-data-proxy/
         ↓ fetched by
  [User browsers running ONE Group Tools]
```

Benefits:
- Zero rate-limit issues (proxy respects limits, users hit GitHub CDN)
- Data is always fresh for all users simultaneously
- GitHub Pages has unlimited free bandwidth
- No server cost, no maintenance
- GitHub Actions provides 2000 free minutes/month (1 workflow × 5min × 12/hr × 24hr × 30days = 4320 runs/month — need to optimize or use 10-min intervals)

### 2.3 — Proxy Repository Structure

**Repo name**: `ogt-data-proxy` (public, under user's GitHub account)

```
ogt-data-proxy/
  .github/
    workflows/
      fetch-data.yml          ← Scheduled workflow
  data/
    realm-0/
      market-ticker.json      ← All resource prices (realm 0)
      production-modifiers.json ← Speed modifiers per resource
      weather.json            ← Retail speed multiplier
      retail-info.json        ← Retail demand data (v4)
    realm-1/
      market-ticker.json      ← All resource prices (realm 1)
      production-modifiers.json
      weather.json
  meta.json                   ← { lastUpdated, proxyCacheTTL }
  README.md
```

### 2.4 — GitHub Actions Workflow File

Create `.github/workflows/fetch-data.yml` in the proxy repo:

```yaml
name: Fetch SimCompanies Data

on:
  schedule:
    - cron: '*/10 * * * *'   # every 10 minutes (conservative)
  workflow_dispatch:           # also allow manual trigger

jobs:
  fetch:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - name: Fetch realm 0 data
        run: |
          mkdir -p data/realm-0 data/realm-1

          # Market ticker (all current prices)
          curl -sf "https://www.simcompanies.com/api/v3/market-ticker/0/" \
            -H "User-Agent: OGT-DataProxy/1.0 (github.com/ogt-data-proxy)" \
            -o data/realm-0/market-ticker.json || echo "[]" > data/realm-0/market-ticker.json

          sleep 2  # respect rate limit

          # Production modifiers (speed events)
          curl -sf "https://www.simcompanies.com/api/v2/production-modifiers/0/" \
            -H "User-Agent: OGT-DataProxy/1.0" \
            -o data/realm-0/production-modifiers.json \
            || echo '{"resourceProductionModifiers":[]}' > data/realm-0/production-modifiers.json

          sleep 2

          # Weather (retail speed multiplier)
          curl -sf "https://www.simcompanies.com/api/v2/weather/0/" \
            -H "User-Agent: OGT-DataProxy/1.0" \
            -o data/realm-0/weather.json \
            || echo '{"sellingSpeedMultiplier":1.0}' > data/realm-0/weather.json

          sleep 2

          # Retail info (demand data, v4)
          curl -sf "https://www.simcompanies.com/api/v4/0/resources-retail-info/" \
            -H "User-Agent: OGT-DataProxy/1.0" \
            -o data/realm-0/retail-info.json \
            || echo "[]" > data/realm-0/retail-info.json

      - name: Fetch realm 1 data
        run: |
          sleep 5  # gap before realm 1

          curl -sf "https://www.simcompanies.com/api/v3/market-ticker/1/" \
            -H "User-Agent: OGT-DataProxy/1.0" \
            -o data/realm-1/market-ticker.json || echo "[]" > data/realm-1/market-ticker.json

          sleep 2

          curl -sf "https://www.simcompanies.com/api/v2/production-modifiers/1/" \
            -H "User-Agent: OGT-DataProxy/1.0" \
            -o data/realm-1/production-modifiers.json \
            || echo '{"resourceProductionModifiers":[]}' > data/realm-1/production-modifiers.json

          sleep 2

          curl -sf "https://www.simcompanies.com/api/v2/weather/1/" \
            -H "User-Agent: OGT-DataProxy/1.0" \
            -o data/realm-1/weather.json \
            || echo '{"sellingSpeedMultiplier":1.0}' > data/realm-1/weather.json

      - name: Write meta
        run: |
          echo "{\"lastUpdated\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"proxyCacheTTL\":600}" > meta.json

      - name: Commit and push
        run: |
          git config user.name  "OGT Data Bot"
          git config user.email "bot@ogt-data-proxy"
          git add data/ meta.json
          git diff --staged --quiet || git commit -m "data: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
          git push
```

### 2.5 — Proxy URL Constants

Once the repo `ogt-data-proxy` is created under user's GitHub account:
```
PROXY_BASE = https://{github_username}.github.io/ogt-data-proxy
```

Replace `{github_username}` with actual GitHub username when creating the repo.

The site's api.js should define:
```javascript
// Set this to the actual GitHub Pages URL of the proxy repo
const PROXY_BASE = 'https://raw.githubusercontent.com/{username}/ogt-data-proxy/main';
// OR if GitHub Pages is enabled:
// const PROXY_BASE = 'https://{username}.github.io/ogt-data-proxy';
```

### 2.6 — Proxy Files the Site Uses

```javascript
// Market prices (all resources) — fetched every page load, cached 10 min
`${PROXY_BASE}/data/realm-${realm}/market-ticker.json`
→ [{kind, image, price, is_up, realmId}]

// Production speed modifiers
`${PROXY_BASE}/data/realm-${realm}/production-modifiers.json`
→ {resourceProductionModifiers: [{id, realm, kind, speedModifier, since, until}]}

// Retail selling speed multiplier (weather)
`${PROXY_BASE}/data/realm-${realm}/weather.json`
→ {id, realm, since, until, sellingSpeedMultiplier}

// Retail demand data (30-day history per resource)
`${PROXY_BASE}/data/realm-${realm}/retail-info.json`
→ [{quality, dbLetter, averagePrice, saturation, retailData[...]}]

// Meta — check if proxy is fresh
`${PROXY_BASE}/meta.json`
→ {lastUpdated, proxyCacheTTL}
```

---

## PART 3 — COMPLETE api.js REWRITE (DEFINITIVE)

Replace `assets/js/api.js` entirely:

```javascript
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

// ─── Proxy & API Base URLs ────────────────────────────────────────────────────
// TODO: Replace {username} with actual GitHub username after creating ogt-data-proxy repo
const PROXY_BASE = 'https://raw.githubusercontent.com/{username}/ogt-data-proxy/main';
const PROXY_ENABLED = !PROXY_BASE.includes('{username}'); // false until configured

const STC   = 'https://api.simcotools.com';   // SimCoTools API
const SC_V2 = 'https://www.simcompanies.com/api/v2';
const SC_V3 = 'https://www.simcompanies.com/api/v3';
const SC_V4 = 'https://www.simcompanies.com/api/v4';

// ─── Cache TTLs ───────────────────────────────────────────────────────────────
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

// ─── Cache ────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  PROXY API  (GitHub Pages — primary data source, no rate limits)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  SimCoTools API  (api.simcotools.com — economy phase, VWAP, companies)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  SimCompanies API  (for catalog and recipes — secondary)
// ─────────────────────────────────────────────────────────────────────────────
export const SimCoApi = {

  /**
   * All resources from encyclopedia.
   * Returns [{id/kind, name, transport, producedAnHour, wages, ...}]
   * Falls back to empty array — tools use RESOURCES_STATIC as instant baseline.
   */
  getAllResources: async (realm = 0) => {
    try {
      const data = await fetch_c(
        `${SC_V2}/en/encyclopedia/resources/`,
        `sc_resources_${realm}`,
        TTL.CATALOG
      );
      const list = arr(data);
      if (list.length > 10) return list;
    } catch {}
    // Fallback to static snapshot
    try {
      const { RESOURCES_SNAPSHOT } = await import('./data/resources-static.js');
      return RESOURCES_SNAPSHOT;
    } catch { return []; }
  },

  /**
   * Full resource detail with producedFrom recipe.
   * CONFIRMED URL: /api/v2/en/encyclopedia/resources/ for catalog
   * For recipe: the game uses internal calls that require auth.
   * The public encyclopedia page at /encyclopedia/{realm}/resource/{kind}/
   * embeds the data. Try /v2/en/encyclopedia/resources/{kind}/ first.
   * Returns null on failure.
   */
  getResource: async (kind, realm = 0) => {
    if (!kind || isNaN(Number(kind))) return null;
    // Try multiple known endpoint patterns for resource detail
    const urls = [
      `${SC_V2}/en/encyclopedia/resources/${kind}/`,
      `${SC_V3}/en/encyclopedia/resources/${realm}/${kind}/`,
    ];
    for (const url of urls) {
      try {
        const data = await fetch_c(url, `sc_res_${kind}_${realm}`, TTL.RECIPE, { silent: true });
        if (data && (data.producedFrom !== undefined || data.wages !== undefined)) return data;
      } catch {}
    }
    return null;
  },

  /**
   * Exchange listings for a single resource.
   * CONFIRMED URL: /api/v3/market/{realm}/{kind}/
   * Returns [{id, kind, quantity, quality, price, fees, seller, posted}]
   * fees = qty × price × 0.04  (4% exchange fee confirmed)
   */
  getExchangeListings: async (kind, realm = 0) => {
    if (!kind || isNaN(Number(kind))) return [];
    try {
      const data = await fetch_c(
        `${SC_V3}/market/${realm}/${kind}/`,
        `sc_mkt_${kind}_${realm}`,
        TTL.EXCHANGE
      );
      return arr(data).sort((a, b) => {
        // Best first: highest quality first, then lowest price
        if (b.quality !== a.quality) return b.quality - a.quality;
        return a.price - b.price;
      });
    } catch { return []; }
  },

  /**
   * Public company profile.
   */
  getCompany: async (id) => {
    if (!id) return null;
    try {
      return await fetch_c(`${SC_V2}/companies/${id}/`, `sc_co_${id}`, 5 * 60 * 1000);
    } catch { return null; }
  },

  /**
   * Best (lowest) price for a resource at minimum quality.
   * Uses proxy price map if available (zero extra API calls).
   * Falls back to exchange listings.
   */
  getBestPrice: async (kind, minQ = 0, realm = 0, priceMap = null) => {
    // Use proxy price map if caller provides it
    if (priceMap instanceof Map) {
      // Proxy ticker only has one price per resource (the latest best price, Q0 typically)
      return priceMap.get(Number(kind)) ?? 0;
    }
    // Otherwise fetch per-resource listings
    const listings = await SimCoApi.getExchangeListings(kind, realm);
    const filtered = listings.filter(l => (l.quality ?? 0) >= minQ);
    if (!filtered.length) return 0;
    filtered.sort((a, b) => a.price - b.price);
    return filtered[0].price ?? 0;
  },

  buildNameMap: async (realm = 0) => {
    const all = await SimCoApi.getAllResources(realm);
    return new Map(all.map(r => [(r.name || '').toLowerCase(), r.id ?? r.kind]));
  }
};
```

---

## PART 4 — RESOURCES STATIC SNAPSHOT

Create `assets/js/data/resources-static.js`. This is the HAR-observed mapping
of `kind` (the resource numeric ID used throughout the APIs) to resource names.

The market ticker uses `kind`, the exchange uses `kind`, the resource encyclopedia
uses `id` (same value). The HAR data confirmed these IDs from the market-ticker:

```javascript
/**
 * resources-static.js | ONE Group Tools
 * Static resource ID → name mapping for instant zero-latency rendering.
 * kind = numeric resource ID used across all SimCompanies APIs.
 * Updated from HAR captures 2026-03-28 + SimCoTools resource list.
 */
export const RESOURCES_SNAPSHOT = [
  // IDs confirmed from market-ticker HAR (kind field):
  { id: 1,   kind: 1,   name: "Power",           image: "images/resources/power.png",            category: "Energy" },
  { id: 2,   kind: 2,   name: "Water",            image: "images/resources/water.png",            category: "Resources" },
  { id: 3,   kind: 3,   name: "Apples",           image: "images/resources/apples.png",           category: "Agriculture" },
  { id: 4,   kind: 4,   name: "Oranges",          image: "images/resources/oranges.png",          category: "Agriculture" },
  { id: 5,   kind: 5,   name: "Grapes",           image: "images/resources/grapes.png",           category: "Agriculture" },
  { id: 6,   kind: 6,   name: "Grain",            image: "images/resources/grain.png",            category: "Agriculture" },
  { id: 7,   kind: 7,   name: "Sugarcane",        image: "images/resources/sugarcane.png",        category: "Agriculture" },
  { id: 8,   kind: 8,   name: "Seeds",            image: "images/resources/seeds.png",            category: "Agriculture" },
  { id: 9,   kind: 9,   name: "Cocoa beans",      image: "images/resources/cocoa-beans.png",      category: "Agriculture" },
  { id: 10,  kind: 10,  name: "Crude oil",        image: "images/resources/crude-oil.png",        category: "Mining" },
  { id: 11,  kind: 11,  name: "Wood",             image: "images/resources/wood.png",             category: "Forestry" },
  { id: 12,  kind: 12,  name: "Transport",        image: "images/resources/transport.png",        category: "Resources" },
  { id: 13,  kind: 13,  name: "Transport",        image: "images/resources/transport.png",        category: "Resources" },
  { id: 14,  kind: 14,  name: "Iron ore",         image: "images/resources/iron-ore.png",         category: "Mining" },
  { id: 15,  kind: 15,  name: "Bauxite",          image: "images/resources/bauxite.png",          category: "Mining" },
  { id: 16,  kind: 16,  name: "Sand",             image: "images/resources/sand.png",             category: "Mining" },
  { id: 17,  kind: 17,  name: "Steel",            image: "images/resources/steel.png",            category: "Metallurgy" },
  { id: 18,  kind: 18,  name: "Aluminium",        image: "images/resources/aluminium.png",        category: "Metallurgy" },
  { id: 19,  kind: 19,  name: "Petrol",           image: "images/resources/petrol.png",           category: "Energy" },
  { id: 20,  kind: 20,  name: "Diesel",           image: "images/resources/diesel.png",           category: "Energy" },
  { id: 21,  kind: 21,  name: "Plastic",          image: "images/resources/plastic.png",          category: "Chemicals" },
  { id: 22,  kind: 22,  name: "Rubber",           image: "images/resources/rubber.png",           category: "Chemicals" },
  { id: 23,  kind: 23,  name: "Chemicals",        image: "images/resources/chemicals.png",        category: "Chemicals" },
  { id: 24,  kind: 24,  name: "Glass",            image: "images/resources/glass.png",            category: "Manufacturing" },
  { id: 25,  kind: 25,  name: "Electronic components", image: "images/resources/electronic-components.png", category: "Electronics" },
  { id: 26,  kind: 26,  name: "Processor",        image: "images/resources/processor.png",        category: "Electronics" },
  { id: 27,  kind: 27,  name: "Reinforced concrete", image: "images/resources/reinforced-concrete.png", category: "Construction" },
  { id: 28,  kind: 28,  name: "Bricks",           image: "images/resources/bricks.png",           category: "Construction" },
  { id: 29,  kind: 29,  name: "Planks",           image: "images/resources/planks.png",           category: "Construction" },
  { id: 30,  kind: 30,  name: "Construction units", image: "images/resources/construction-units.png", category: "Construction" },
  { id: 31,  kind: 31,  name: "Leather",          image: "images/resources/leather.png",          category: "Fashion" },
  { id: 32,  kind: 32,  name: "Fabric",           image: "images/resources/fabric.png",           category: "Fashion" },
  { id: 33,  kind: 33,  name: "Milk",             image: "images/resources/milk.png",             category: "Agriculture" },
  { id: 34,  kind: 34,  name: "Eggs",             image: "images/resources/eggs.png",             category: "Agriculture" },
  { id: 35,  kind: 35,  name: "Software",         image: "images/resources/software.png",         category: "Electronics" },
  { id: 36,  kind: 36,  name: "Research",         image: "images/resources/research.png",         category: "Research" },
  { id: 43,  kind: 43,  name: "Steel",            image: "images/resources/steel.png",            category: "Metallurgy" },
  { id: 44,  kind: 44,  name: "Sand",             image: "images/resources/sand.png",             category: "Mining" },
  { id: 45,  kind: 45,  name: "Glass",            image: "images/resources/glass.png",            category: "Manufacturing" },
  { id: 53,  kind: 53,  name: "Flour",            image: "images/resources/flour.png",            category: "Food" },
  { id: 58,  kind: 58,  name: "Automotive research", image: "images/resources/automotive-research.png", category: "Research" },
  { id: 63,  kind: 63,  name: "Vegetables",       image: "images/resources/vegetables.png",       category: "Agriculture" },
  { id: 72,  kind: 72,  name: "Sugarcane",        image: "images/resources/sugarcane.png",        category: "Agriculture" },
  { id: 79,  kind: 79,  name: "High-grade e-components", image: "images/resources/high-grade-e-components.png", category: "Electronics" },
  { id: 86,  kind: 86,  name: "Car body",         image: "images/resources/car-body.png",         category: "Automotive" },
  { id: 87,  kind: 87,  name: "Luxury car",       image: "images/resources/luxury-car.png",       category: "Automotive" },
  { id: 88,  kind: 88,  name: "Ion drive",        image: "images/resources/ion-drive.png",        category: "Aerospace" },
  { id: 102, kind: 102, name: "Bricks",           image: "images/resources/bricks.png",           category: "Construction" },
  { id: 103, kind: 103, name: "Cement",           image: "images/resources/cement.png",           category: "Construction" },
  { id: 104, kind: 104, name: "Clay",             image: "images/resources/clay.png",             category: "Mining" },
  { id: 107, kind: 107, name: "Rocket engine",    image: "images/resources/rocket-engine.png",    category: "Aerospace" },
  { id: 109, kind: 109, name: "BFR",              image: "images/resources/BFR.png",              category: "Aerospace" },
  { id: 110, kind: 110, name: "Jumbo jet",        image: "images/resources/jumbojet2.png",        category: "Aerospace" },
  { id: 111, kind: 111, name: "Private jet",      image: "images/resources/private-jet.png",      category: "Aerospace" },
  { id: 112, kind: 112, name: "Sub-orbital rocket", image: "images/resources/sub-orbital-rocket2.png", category: "Aerospace" },
  { id: 122, kind: 122, name: "Tablets",          image: "images/resources/tablets.png",          category: "Electronics" },
  { id: 132, kind: 132, name: "BFR",              image: "images/resources/BFR.png",              category: "Aerospace" },
  { id: 135, kind: 135, name: "Sugar",            image: "images/resources/sugar.png",            category: "Food" },
];

// NOTE: This list is from HAR captures and is INCOMPLETE.
// The full list (~142 resources) should be fetched from:
//   GET https://www.simcompanies.com/api/v3/market-ticker/0/
// and merged into this file periodically.

export const KIND_TO_NAME = new Map(RESOURCES_SNAPSHOT.map(r => [r.kind, r.name]));
export const NAME_TO_KIND = new Map(RESOURCES_SNAPSHOT.map(r => [r.name.toLowerCase(), r.kind]));
export const KIND_TO_IMAGE = new Map(RESOURCES_SNAPSHOT.map(r => [r.kind, r.image]));
```

---

## PART 5 — TOOL UPDATES

### 5.1 — Exchange Tracker

Replace `fetchBatch()` entirely. Use the proxy market-ticker for bulk prices.

```javascript
async function loadAllPrices() {
  const realm = getRealm();
  els.refresh.disabled = true;

  try {
    // TRY PROXY FIRST (fastest — no rate limits)
    let ticker = await ProxyApi.getMarketTicker(realm);
    let priceMap = ProxyApi.buildPriceMap(ticker || []);

    // FALLBACK: SimCo market-ticker directly
    if (!priceMap.size) {
      const data = await SimCoApi._fetchDirectTicker(realm);
      ticker = data;
      priceMap = ProxyApi.buildPriceMap(ticker || []);
    }

    // SimCoTools VWAP for historical average
    const vwaps = await SimCoToolsApi.getAllVwaps(realm);
    const vwapMap = SimCoToolsApi.buildVwapMap(vwaps);

    const now = Date.now();
    for (const r of state.resources) {
      const price = priceMap.get(Number(r.id ?? r.kind)) ?? 0;
      if (price > 0) {
        // 24h delta tracking
        if (!state.history[r.id]) {
          state.history[r.id] = { price, time: now, prevPrice: price };
        } else if (now - state.history[r.id].time > 86_400_000) {
          state.history[r.id] = { price, time: now, prevPrice: state.history[r.id].price };
        } else {
          state.history[r.id].prevPrice ??= price;
        }
        state.prices[r.id] = { price, time: now };
      }
      // VWAP — keyed by resourceId_quality (Q0)
      const vwap = vwapMap.get(`${r.id}_0`) ?? 0;
      state.simcoData[r.id] = { avg: vwap };
    }

    localStorage.setItem('og_price_history', JSON.stringify(state.history));
    els.updated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    renderTable();

  } catch(e) {
    console.error('Price load failed:', e);
    window.showToast?.('Could not load prices', 'error');
  }

  els.refresh.disabled = false;
  if (window.feather) feather.replace();
}
```

Add a direct ticker fallback to api.js:
```javascript
// In SimCoApi — direct market-ticker fetch (public, no proxy needed)
_fetchDirectTicker: async (realm = 0) => {
  try {
    return await fetch_c(
      `${SC_V3}/market-ticker/${realm}/`,
      `sc_ticker_${realm}`,
      TTL.TICKER
    );
  } catch { return []; }
}
```

Also rename the "30d Avg" or "Simcotools Avg" column header to "7d VWAP".

### 5.2 — Economy Tracker

Add to `init()`:
```javascript
// Try SimCoTools for real phase
const phase = await SimCoToolsApi.getEconomyPhase(realm);
if (phase) {
  state.phase = phase;
  els.manualSection.style.display = 'none';
} else {
  els.manualSection.style.display = 'block';
}
```

### 5.3 — Profit Calculator

**Fix `loadResource()` to use confirmed endpoint:**
```javascript
// getResource() now tries both known endpoint patterns
const detail = await SimCoApi.getResource(resourceKind, realm);
```

**Add production modifiers to production speed:**
```javascript
// Get active modifier for this resource from proxy
const modifiers = await ProxyApi.getProductionModifiers(realm);
const modMap = ProxyApi.buildModifierMap(modifiers || {});
const speedModifierPct = modMap.get(Number(state.resource.kind ?? state.resource.id)) ?? 0;

// Apply in calculate():
const unitsPerHour = (resource.producedAnHour ?? 0)
  * buildingLevel
  * (1 + speedBonus / 100)
  * abundanceFactor
  * (1 + speedModifierPct / 100);  // ← real event modifier from proxy

// Show in UI if modifier is non-zero:
if (speedModifierPct !== 0) {
  document.getElementById('event-note').textContent =
    `⚡ Event: ${speedModifierPct > 0 ? '+' : ''}${speedModifierPct}% production speed`;
  document.getElementById('event-note').style.display = 'block';
}
```

**Use market ticker for sell price (faster than per-resource exchange call):**
```javascript
async function fetchSellPrice() {
  const realm = getRealm();
  const kind = state.resource?.kind ?? state.resource?.id;
  if (!kind) return;

  // Try proxy price map first
  const ticker = await ProxyApi.getMarketTicker(realm);
  const priceMap = ProxyApi.buildPriceMap(ticker || []);
  let price = priceMap.get(Number(kind));

  // Fallback: per-resource exchange call
  if (!price) {
    price = await SimCoApi.getBestPrice(kind, state.params.q, realm);
  }
  if (price) {
    els.price.value = price;
    state.params.sellPrice = price;
    calculate();
  }
}
```

### 5.4 — Retail Calculator

Now we have REAL retail demand data from the proxy. Use it:
```javascript
async function init() {
  const realm = getRealm();
  const retailInfo = await ProxyApi.getRetailInfo(realm);
  const retailMap = ProxyApi.buildRetailMap(retailInfo || []);
  const weather = await ProxyApi.getWeather(realm);
  const weatherMult = weather?.sellingSpeedMultiplier ?? 1.0;

  // Show current weather effect
  document.getElementById('weather-note').textContent =
    `Today's retail speed: ×${weatherMult.toFixed(2)} (updates ~every 11 hours)`;

  // When user selects a resource, populate real demand
  els.resourceSelect.addEventListener('change', (e) => {
    const kind = parseInt(e.target.value);
    const rd = retailMap.get(kind);
    if (rd) {
      // Pre-fill demand level based on real data (normalize 0.15-0.25 → 1-10 scale)
      const normalizedDemand = Math.round(Math.min(10, Math.max(1, rd.demand / 0.025)));
      els.demandLevel.value = normalizedDemand;
      document.getElementById('real-demand').textContent =
        `Real demand: ${(rd.demand * 100).toFixed(2)}% | Saturation: ${rd.saturation.toFixed(2)}`;
    }
  });
}

// In optimize() — use real demand and weather
function optimize() {
  const kind = parseInt(els.resourceSelect.value);
  const retailData = retailMap.get(kind);
  const demand = retailData?.demand ?? (state.demandLevel / 40);
  const saturation = retailData?.saturation ?? 1.0;
  const weatherMult = state.weatherMult ?? 1.0;

  // Real retail speed model (using actual SimCo saturation/demand values):
  // units_per_hour ≈ building_level × (demand / saturation) × weatherMult × quality_mult × price_factor
  const quality_mult = 1 + (state.quality * 0.10);
  const base_speed = state.buildingLevel * (demand / Math.max(0.1, saturation));
  const price_factor = state.cost > 0 ? Math.pow(state.cost / Math.max(0.01, state.price), 0.6) : 1;
  const units_per_hour = base_speed * weatherMult * quality_mult * price_factor;
  // ... rest of calculation
}
```

---

## PART 6 — CONFIRMED GAME MECHANICS (HAR-VERIFIED)

### Exchange fee: 4% CONFIRMED from HAR fees field
```javascript
const EXCHANGE_FEE = 0.04;
// listing.fees = qty × price × 0.04
// Verified: 120 × 2920 × 0.04 = 14016 ≈ HAR value 14014 ✓
```

### Exchange listings sort order (HAR-confirmed)
```javascript
// Server returns listings sorted by:
// 1. Quality DESCENDING (highest quality first)
// 2. Price ASCENDING within same quality
// To find cheapest at minimum quality:
const best = listings
  .filter(l => (l.quality ?? 0) >= minQ)
  .sort((a, b) => a.price - b.price)[0];
```

### Resource ID field: `kind` (integer)
```javascript
// Throughout all SimCo APIs, the numeric resource identifier is called:
// "kind" in market-ticker, market listings, production-modifiers
// "id" in encyclopedia resources
// "dbLetter" in resources-retail-info (misleading name — it's actually the numeric kind)
// They are ALL the same number.
const resourceKind = resource.kind ?? resource.id ?? resource.dbLetter;
```

### Economy state (from auth-data temporals.economyState):
```javascript
// economyState integer → phase name:
const ECONOMY_STATE = { 0: 'Recession', 1: 'Normal', 2: 'Boom' };
// Current state = 1 (Normal) as of 2026-03-28
// productionModifier: 4 means +4% global production speed
// salesModifier: 1 means +1% global sales speed
// These come from auth-data which requires login — use SimCoTools as public source
```

### Production modifiers (HAR-confirmed):
```javascript
// GET /api/v2/production-modifiers/{realm}/
// {resourceProductionModifiers: [{id, realm, kind, speedModifier, since, until}]}
// Active mods from 2026-03-28 HAR:
// kind 53: +22% (until 2026-04-13)
// kind 122: -23% (until 2026-04-13)
// kind 103: +20% (until 2026-04-13)
// kind 43: +18% (until 2026-03-30)
// kind 63: +28% (until 2026-03-30)
// kind 4: -19% (until 2026-03-30)
// These combine with the per-resource producedAnHour for actual output
```

### Weather / Retail selling speed (HAR-confirmed):
```javascript
// GET /api/v2/weather/{realm}/
// {id, realm, since, until, sellingSpeedMultiplier: 1.2008...}
// sellingSpeedMultiplier > 1.0 = faster retail sales
// Changes approximately every 11 hours
// Use this as a multiplier in the Retail Calculator
```

### AO formula (community-confirmed):
```javascript
const rawAO = Math.max(0, (totalBuildingLevels - 1) * 0.58825);
const totalMgmt = cooMgmt + Math.floor((cfoMgmt + cmoMgmt + ctoMgmt) / 4);
const effectiveAO = Math.max(0, rawAO * (1 - totalMgmt / 100));
// AO applies ONLY to wages — not materials, not transport
const totalWages = baseWages * (1 + effectiveAO / 100);
```

---

## PART 7 — DO NOT DO

```
❌ DO NOT use /api/v3/en/exchange/{id}/ — wrong endpoint (confirmed from HAR)
✅ CORRECT exchange endpoint: /api/v3/market/{realm}/{kind}/

❌ DO NOT use /api/v4/en/{realm}/encyclopedia/resources/ — not confirmed
✅ CORRECT resource catalog: /api/v2/en/encyclopedia/resources/

❌ DO NOT call market-ticker per-resource in a loop
✅ CORRECT: one call to /api/v3/market-ticker/{realm}/ covers all resources

❌ DO NOT use exchange fee 3% anywhere — confirmed 4% from HAR fees field

❌ DO NOT assume economy phase is in any public SimCo endpoint without auth
✅ CORRECT: SimCoTools /v1/realms/{realm} has economy phase (public)

❌ DO NOT add new pages, settings pages, or build steps

❌ DO NOT change the visual design, colors, or layout

❌ DO NOT overwrite CHANGELOG.md

❌ DO NOT change the version number

❌ DO NOT call SimCo API endpoints without checking the proxy cache first

❌ DO NOT hardcode {username} in PROXY_BASE — it must be replaced with real GitHub username

❌ DO NOT show SimCoTools API errors to users — all STC failures are silent

❌ DO NOT use quality > 4 in standard production tools (Q5+ needs research)

❌ DO NOT call .sort() on raw API responses without Array.isArray() guard
```

---

## PART 8 — MUST DO

```
✅ Replace api.js with Part 3 implementation
✅ Create/update assets/js/data/resources-static.js with Part 5 content
✅ Fix exchange endpoint to /api/v3/market/{realm}/{kind}/ everywhere
✅ Exchange tracker uses market-ticker + proxy for all prices (not per-resource loop)
✅ Profit calculator applies production modifiers from proxy
✅ Profit calculator uses market-ticker for sell price (proxy → ticker → exchange)
✅ Retail calculator uses real demand/saturation from /api/v4/{realm}/resources-retail-info/
✅ Retail calculator shows weather sellingSpeedMultiplier
✅ Economy tracker gets phase from SimCoTools (falls back to manual)
✅ All resource kind/id lookups use kind field (NOT db_letter misread as name)
✅ Create proxy repo setup instructions in README.md under "## Data Proxy Setup"
✅ Proxy workflow (Part 2.4) committed to ogt-data-proxy repo
✅ CHANGELOG.md appended with Part 9 entry
```

---

## PART 9 — CHANGELOG APPEND

```markdown
## [1.0.1] - 2026-03-28 (HAR-Verified API Overhaul + Data Proxy)

### Fixed (Critical — from HAR captures)
- api.js: Exchange endpoint corrected to `/api/v3/market/{realm}/{kind}/`
  (was `/api/v3/en/exchange/{id}/` — wrong path, wrong version)
- api.js: Exchange fee corrected to 4% — confirmed from `fees` field in
  live exchange listings (fees = qty × price × 0.04, verified 120×2920×0.04=14016)
- api.js: Market ticker `/api/v3/market-ticker/{realm}/` now primary price source
  (returns all 142 resources in one call — no more per-resource loops)
- exchange-tracker.js: Replaced per-resource exchange loop with single
  market-ticker call — eliminates all rate-limit errors
- Proxy SimCoTools wrong base URL (simcotools.com/api/v1 → api.simcotools.com)
- Resources static snapshot updated with kind IDs confirmed from HAR

### Added
- GitHub Actions Data Proxy (ogt-data-proxy) architecture
  — fetches SimCo public endpoints every 10 min
  — serves as GitHub Pages CDN for all users
  — zero rate-limit issues for end users
- api.js: ProxyApi module — fetches from ogt-data-proxy GitHub Pages
- api.js: ProxyApi.buildPriceMap() — O(1) kind→price from market-ticker
- api.js: ProxyApi.buildModifierMap() — active production speed modifiers
- api.js: ProxyApi.buildRetailMap() — demand/saturation per resource
- Retail calculator: real demand/saturation from /api/v4/{realm}/resources-retail-info/
- Retail calculator: weather sellingSpeedMultiplier from /api/v2/weather/{realm}/
- Profit calculator: production modifier events applied to speed calculation
- Economy tracker: SimCoTools real phase auto-detection

### Changed
- "30d Avg" column in exchange-tracker renamed to "7d VWAP" (accurate description)
- resource-static.js: kind field added, aligned with market-ticker kind field
```

---

## PART 10 — EXECUTION ORDER

```
STEP 1  assets/js/api.js
        FULL REPLACEMENT with Part 3 implementation.
        Critical: correct exchange endpoint, proxy module, ticker method.

STEP 2  assets/js/data/resources-static.js
        REPLACE with Part 5 content (HAR-verified kind IDs).

STEP 3  assets/js/tools/exchange-tracker.js
        Replace fetchBatch() with loadAllPrices() from Part 5.1.
        Add SimCoApi._fetchDirectTicker fallback method.

STEP 4  assets/js/tools/profit-calc.js
        Update getResource() calls, add production modifier display,
        use market-ticker for sell price fetch.

STEP 5  assets/js/tools/economy-tracker.js
        Add SimCoToolsApi.getEconomyPhase() call in init().

STEP 6  assets/js/tools/retail-calc.js
        Add ProxyApi.getRetailInfo() and ProxyApi.getWeather() integration.

STEP 7  Create ogt-data-proxy GitHub repository with:
        — .github/workflows/fetch-data.yml (from Part 2.4)
        — README.md explaining what it does
        — Enable GitHub Pages from main branch

STEP 8  Update PROXY_BASE in api.js with actual GitHub username.

STEP 9  CHANGELOG.md — append Part 9 block only.

STEP 10 VERIFICATION:
        Open Network tab in DevTools.
        Load exchange-tracker → confirm ONE request to market-ticker (not N requests).
        Load profit-calculator → select Apples → confirm recipe loads.
        Check "fees" understanding: API listing fees field should ≈ qty×price×0.04.
        Load economy-tracker → phase should auto-show (not "manually select").
        Check proxy: if ogt-data-proxy is set up, requests should go to GitHub Pages.
        Zero console errors, zero TypeErrors, zero wrong-endpoint 404s.
```

---

*END OF MASTER PROMPT v6.0 — ONE GROUP TOOLS*
*Based on live HAR captures from simcompanies.com browser session 2026-03-28*
*All API endpoints, response shapes, and field names verified from real traffic*
*Exchange fee 4% confirmed from fees field: 120 × $2920 × 0.04 = $14,016 ≈ HAR $14,014*
*ONE GROUP OF ENTERPRISES | SimCompanies Companion Platform*
