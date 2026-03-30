/**
 * exchange-tracker.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { ProxyApi } from '../api.js';
import { formatMoney, formatPercent, createElement, debounce, slugify } from '../utils.js';
import { createChart } from '../charts.js';
import { getRealm } from '../core.js';
import { RESOURCES_SNAPSHOT } from '../data/resources-static.js';

/* -------------------------------------------------------------------------- */
/*                                    STATE                                   */
/* -------------------------------------------------------------------------- */

const state = {
  resources: [],
  prices: {}, 
  history: {}, 
  simcoData: {}, 
  favorites: [],
  selected: new Set(),
  filter: { search: '', cat: 'all', q: 0 },
  chart: null
};

const els = {
  search: document.getElementById('search-input'),
  cat: document.getElementById('category-filter'),
  q: document.getElementById('quality-filter'),
  refresh: document.getElementById('refresh-btn'),
  compare: document.getElementById('compare-btn'),
  updated: document.getElementById('last-updated'),
  proxyStatus: document.getElementById('proxy-status'),
  body: document.getElementById('table-body')
};

// Module-level price and VWAP maps
let _priceMap = new Map();
let _vwapMap  = new Map();

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupHeader();

  const realm = getRealm();
  
  state.favorites = JSON.parse(localStorage.getItem('og_favorites') || '[]');
  state.history = JSON.parse(localStorage.getItem('og_price_history') || '{}');
  
  try {
    // TRY PROXY RESOURCES FIRST (server-side fetched, no CORS)
    let resources = await ProxyApi.getResources(realm);
    let validResources = (Array.isArray(resources) ? resources : []).filter(r =>
      r && typeof r === 'object' && typeof r.name === 'string' && Number.isFinite(Number(r.id ?? r.kind))
    ).map(r => ({ ...r, id: Number(r.id ?? r.kind), kind: Number(r.kind ?? r.id) }));

    // IF PROXY FAILS, TRY DIRECT SIMCOTOOLS API
    if (!validResources.length) {
      try {
        const { SimCoToolsApi } = await import('../api.js');
        const directResources = await SimCoToolsApi.getResources(realm);
        if (directResources && directResources.length > 0) {
          validResources = directResources.filter(r =>
            r && typeof r === 'object' && typeof r.name === 'string' && Number.isFinite(Number(r.id ?? r.kind))
          ).map(r => ({ ...r, id: Number(r.id ?? r.kind), kind: Number(r.kind ?? r.id) }));
          console.log('Using direct SimCoTools API for resources');
        }
      } catch (directApiError) {
        console.warn('Direct SimCoTools API for resources failed:', directApiError);
      }
    }

    // FALLBACK: Static snapshot if both proxy and direct API fail
    if (!validResources.length) {
      validResources = (Array.isArray(RESOURCES_SNAPSHOT) ? RESOURCES_SNAPSHOT : []).filter(r =>
        r && typeof r === 'object' && typeof r.name === 'string' && Number.isFinite(Number(r.id ?? r.kind))
      ).map(r => ({ ...r, id: Number(r.id ?? r.kind), kind: Number(r.kind ?? r.id) }));
    }

    if (!validResources.length) {
      window.showToast?.('Resource data unavailable. Please refresh the page.', 'error');
      els.body.innerHTML = '<tr><td colspan="8" class="text-center text-red p-4">No resource data available.</td></tr>';
      return;
    }
    state.resources = [...validResources].sort((a,b) => a.name.localeCompare(b.name));
    
    const cats = [...new Set(state.resources.map(r => r.category).filter(Boolean))].sort();
    cats.forEach(c => {
      const opt = createElement('option');
      opt.value = c; opt.textContent = c;
      els.cat.appendChild(opt);
    });
    
    renderTable();          // render names first (no prices yet)
    await loadAllPrices();  // then fetch all prices in one bulk call
    
  } catch(e) {
    console.error(e);
    els.body.innerHTML = '<tr><td colspan="8" class="text-center text-red">Failed to load resources.</td></tr>';
  }
  
  setupListeners();
}

function setupHeader() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  document.getElementById('btnExport').onclick = exportCSV;
}

function setupListeners() {
  const update = debounce(renderTable, 200);
  els.search.oninput = (e) => { state.filter.search = e.target.value.toLowerCase(); update(); };
  els.cat.onchange = (e) => { state.filter.cat = e.target.value; update(); };
  els.q.onchange = (e) => { state.filter.q = parseInt(e.target.value); update(); };
  
  els.refresh.onclick = loadAllPrices;
  els.compare.onclick = renderChart;
}

/* -------------------------------------------------------------------------- */
/*                                DATA FETCHING                               */
/* -------------------------------------------------------------------------- */

async function loadAllPrices() {
  const realm = getRealm();
  els.refresh.disabled = true;

  try {
    // TRY PROXY FIRST (fastest — no rate limits)
    let ticker = await ProxyApi.getMarketTicker(realm);
    let priceMap = ProxyApi.buildPriceMap(ticker || []);
    let usedProxy = priceMap.size > 0;

    // IF PROXY FAILS, TRY DIRECT SIMCOTOOLS API
    if (!priceMap.size) {
      usedProxy = false;
      try {
        // Import and use SimCoToolsApi directly
        const { SimCoToolsApi } = await import('../api.js');
        const prices = await SimCoToolsApi.getAllPrices(realm);
        if (prices && prices.length > 0) {
          priceMap = SimCoToolsApi.buildPriceMap(prices);
          console.log('Using direct SimCoTools API as fallback');
        }
      } catch (directApiError) {
        console.warn('Direct SimCoTools API also failed:', directApiError);
      }
    }

    // Update proxy status indicator
    if (els.proxyStatus) {
      if (priceMap.size > 0) {
        if (usedProxy && ProxyApi.isEnabled()) {
          els.proxyStatus.innerHTML = '<i data-feather="wifi" style="width:14px;height:14px;"></i> <span class="text-green">Proxy</span>';
        } else {
          els.proxyStatus.innerHTML = '<i data-feather="wifi" style="width:14px;height:14px;"></i> <span class="text-blue">Direct API</span>';
        }
      } else {
        els.proxyStatus.innerHTML = '<i data-feather="wifi-off" style="width:14px;height:14px;"></i> <span class="text-red">No Data</span>';
      }
    }

    // Show appropriate message if no data available
    if (!priceMap.size) {
      window.showToast?.('Market data temporarily unavailable. Try again later.', 'warning');
      els.updated.textContent = 'Updated: No data';
      renderTable();
      els.refresh.disabled = false;
      if (window.feather) feather.replace();
      return;
    }

    // GET VWAP DATA - TRY PROXY FIRST, THEN DIRECT API
    let vwaps = await ProxyApi.getVwaps(realm);
    let vwapMap = ProxyApi.buildVwapMap(vwaps || []);
    
    if (!vwapMap.size) {
      try {
        const { SimCoToolsApi } = await import('../api.js');
        const vwapData = await SimCoToolsApi.getAllVwaps(realm);
        if (vwapData && vwapData.length > 0) {
          vwapMap = SimCoToolsApi.buildVwapMap(vwapData);
          console.log('Using direct SimCoTools VWAP API as fallback');
        }
      } catch (vwapError) {
        console.warn('VWAP data unavailable:', vwapError);
      }
    }

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

/* -------------------------------------------------------------------------- */
/*                                   RENDER                                   */
/* -------------------------------------------------------------------------- */

function renderTable() {
  els.body.innerHTML = '';
  const filtered = state.resources.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(state.filter.search);
    const matchCat = state.filter.cat === 'all' || r.category === state.filter.cat;
    return matchSearch && matchCat;
  });
  
  filtered.sort((a,b) => {
    const af = state.favorites.includes(a.id);
    const bf = state.favorites.includes(b.id);
    if(af && !bf) return -1;
    if(!af && bf) return 1;
    return a.name.localeCompare(b.name);
  });
  
  if(!filtered.length) {
    els.body.innerHTML = '<tr><td colspan="8" class="text-center p-4">No resources found.</td></tr>';
    return;
  }
  
  const frag = document.createDocumentFragment();
  filtered.forEach(r => {
    const tr = createElement('tr');
    tr.dataset.id = r.id;
    const isFav = state.favorites.includes(r.id);
    const pData = state.prices[r.id];
    const hData = state.history[r.id];
    const sData = state.simcoData[r.id];
    
    const price = pData ? pData.price : 0;
    const prev = hData ? hData.prevPrice : price;
    const delta = price > 0 && prev > 0 ? (price - prev) / prev : 0;
    
    tr.innerHTML = `
      <td><input type="checkbox" onchange="toggleSel(${r.id}, this.checked)" ${state.selected.has(r.id)?'checked':''}></td>
      <td onclick="toggleFav(${r.id})" style="cursor:pointer; color:${isFav?'var(--accent-gold)':'var(--text-secondary)'}">
        <i data-feather="star" style="fill:${isFav?'currentColor':'none'}"></i>
      </td>
      <td>
        <div style="font-weight:600">${r.name}</div>
        <div class="text-secondary text-xs">${r.category}</div>
      </td>
      <td class="text-right font-mono text-gold" id="price-${r.id}">${price ? formatMoney(price) : '—'}</td>
      <td class="text-right font-mono ${delta>0?'text-green':(delta<0?'text-red':'text-secondary')}">
        ${delta !== 0 ? (delta > 0 ? '↑' : '↓') + formatPercent(Math.abs(delta*100)) : '→ 0%'}
      </td>
      <td class="text-right font-mono text-secondary">${sData?.avg ? formatMoney(sData.avg) : '—'}</td>
      <td class="text-right font-mono text-secondary">${pData?.gap ? formatMoney(pData.gap) : '—'}</td>
      <td class="text-right">
        <a href="profit-calculator.html?rid=${r.id}" class="btn btn-outline btn-sm" style="padding:2px 6px">Calc</a>
      </td>
    `;
    frag.appendChild(tr);
  });
  els.body.appendChild(frag);
  if(window.feather) feather.replace();
}

function updateRow(id) {
  const tr = els.body.querySelector(`tr[data-id="${id}"]`);
  if(!tr) return;
  const pData = state.prices[id];
  const hData = state.history[id];
  const sData = state.simcoData[id];
  const price = pData.price;
  const prev = hData?.prevPrice ?? price;
  const delta = prev > 0 ? (price - prev) / prev : 0;
  
  tr.querySelector(`[id^="price-"]`).textContent = formatMoney(price);
  const dCell = tr.children[4];
  dCell.className = `text-right font-mono ${delta>0?'text-green':(delta<0?'text-red':'text-secondary')}`;
  dCell.textContent = (delta !== 0 ? (delta > 0 ? '↑' : '↓') : '→ ') + formatPercent(Math.abs(delta*100));
  tr.children[5].textContent = sData?.avg ? formatMoney(sData.avg) : '—';
  tr.children[6].textContent = formatMoney(pData.gap);
}

window.toggleFav = (id) => {
  if(state.favorites.includes(id)) state.favorites = state.favorites.filter(x => x !== id);
  else state.favorites.push(id);
  localStorage.setItem('og_favorites', JSON.stringify(state.favorites));
  renderTable();
};

window.toggleSel = (id, checked) => {
  if(checked) state.selected.add(id); else state.selected.delete(id);
  els.compare.disabled = state.selected.size < 2;
  els.compare.textContent = `Compare Selected (${state.selected.size})`;
};

function renderChart() {
  els.chartSec.style.display = 'block';
  const labels = [], data = [];
  state.selected.forEach(id => {
    const r = state.resources.find(x => x.id === id);
    if(r) { labels.push(r.name); data.push(state.prices[id]?.price || 0); }
  });
  state.chart = createChart('comparison-chart', {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Price', data, backgroundColor: '#f0b429' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
  els.chartSec.scrollIntoView({behavior:'smooth'});
}

function exportCSV() {
  let csv = "ID,Name,Price,Delta,7dVWAP\n";
  state.resources.forEach(r => {
    const p = state.prices[r.id];
    if(p) csv += `${r.id},"${r.name}",${p.price},0,${state.simcoData[r.id]?.avg||0}\n`;
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = 'OGT-Prices.csv'; a.click();
}
