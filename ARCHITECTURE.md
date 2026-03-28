# ONE Group Tools — Architecture Notes

## Overview
ONE Group Tools is a static web application that provides 16+ utilities for SimCompanies players. It uses vanilla JavaScript with ES6 modules, localStorage for persistence, and the SimCompanies Public API (v4/v3/v2) with optional simcotools.com enrichment.

## Core Concepts

### Single Source of Truth (SSOT)
- `assets/js/core.js` owns all reads/writes for `og_settings` (theme, realm)
- All other modules import `getRealm()` / `getTheme()` / `getSettings()` / `setSettings()`
- Prevents drift and makes future extensions trivial

### Realm-Aware Data
- All API calls accept an optional `realm` parameter (0 = Standard, 1 = Entrepreneur)
- Cache keys include realm suffix to prevent cross-realm contamination
- Tools automatically use the current realm from `core.js`

### Module Structure
```
assets/js/
├── core.js          # SSOT settings and localStorage helpers
├── app.js           # Global UI (theme toggle, realm selector, toasts, modals)
├── api.js           # SimCompanies API wrapper with caching, throttling, retries
├── utils.js         # General helpers (format, debounce, slugify, etc.)
├── charts.js        # Chart.js manager with theme integration
└── tools/           # Individual tool logic modules
    ├── profit-calc.js
    ├── exchange-tracker.js
    ├── production-chain.js
    ├── building-advisor.js
    ├── resource-optimizer.js
    ├── quality-calc.js
    ├── retail-calc.js
    ├── trade-analyzer.js
    ├── transport-calc.js
    ├── workforce-calc.js
    └── ...
```

### API Layer (`api.js`)
- Wraps SimCompanies Public API v4/v3/v2 with consistent interface
- Features:
  - Request throttling (400ms minimum between calls)
  - Exponential backoff retry (3 attempts: 1s/2s/4s)
  - localStorage caching with TTLs (short/medium/long)
  - Stale cache fallback with warning toast
  - Realm-aware cache keys
  - Optional simcotools.com integration for historical data

### Theme System
- CSS variables in `:root` for light theme, `[data-theme="dark"]` for dark
- Instant toggle with zero flash (prevents FOUC)
- Chart.js charts automatically update colors on theme change
- Theme preference persisted in `og_settings.theme`

### Data Flow
1. User selects realm → stored in `og_settings.realm`
2. Tools import `getRealm()` from `core.js`
3. API calls receive realm parameter → cache keys include realm
4. Data fetched/persisted with realm isolation
5. UI updates with realm-specific data

## Key Files

### `core.js`
```javascript
export function getSettings() { /* safe parse og_settings */ }
export function setSettings(next) { /* merge and persist */ }
export function getRealm() { /* shortcut for current realm */ }
export function getTheme() { /* shortcut for current theme */ }
```

### `api.js`
```javascript
export const SimCoApi = {
  getAllResources: async (realm = 0) => { /* realm-aware */ },
  getExchangeListings: async (id, realm = 0) => { /* realm-aware */ },
  getResource: async (id, realm = 0) => { /* realm-aware */ },
  getBuildings: async (realm = 0) => { /* realm-aware */ },
  getBuildingDetail: async (id, realm = 0) => { /* realm-aware */ },
  // ... other methods
};
```

### Tool Pattern
```javascript
import { getRealm } from '../core.js';
import { SimCoApi } from '../api.js';

const realm = getRealm();
const resources = await SimCoApi.getAllResources(realm);
```

## Deployment Notes
- Pure static site (no build step required)
- Works on GitHub Pages with subpath hosting
- Uses relative module paths (`./assets/...`) for portability
- UTF-8 encoding required (fixes garbled characters)

## Future Extensions
- Add new settings to `core.js` (e.g., language, units)
- Extend API wrapper with new endpoints
- Add new tools following the same pattern
- Enhance caching with IndexedDB for larger datasets
