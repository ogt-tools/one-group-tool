/**
 * trade-analyzer.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { SimCoApi, SimCoToolsApi } from '../api.js';
import { formatMoney, formatPercent, parseNumber, createElement, slugify } from '../utils.js';
import { getRealm } from '../core.js';

const state = {
  resources: [],
  scanning: false,
  results: []
};

const els = {
  cat: document.getElementById('category-select'),
  min: document.getElementById('min-profit'),
  btn: document.getElementById('scan-btn'),
  prog: document.getElementById('progress-area'),
  bar: document.getElementById('progress-bar'),
  txt: document.getElementById('progress-text'),
  body: document.getElementById('table-body')
};

const EXCHANGE_FEE = 0.04;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  
  try {
    const realm = getRealm();
    const res = await SimCoApi.getAllResources(realm);
    if (!res.length) {
      window.showToast?.('Resource data unavailable. Check API connection.', 'error');
      els.body.innerHTML = '<tr><td colspan="6" class="text-center text-red p-4">No resource data available. Check API connection.</td></tr>';
    }
    state.resources = [...res].sort((a,b) => a.name.localeCompare(b.name));
    
    const cats = [...new Set(res.map(r=>r.category).filter(Boolean))].sort();
    cats.forEach(c => {
      const opt = createElement('option');
      opt.value = c; opt.textContent = c;
      els.cat.appendChild(opt);
    });
    
  } catch(e) { console.error(e); }
  
  els.btn.addEventListener('click', startScan);
}

async function startScan() {
  if(state.scanning) return;
  state.scanning = true;
  state.results = [];
  
  els.btn.disabled = true;
  els.btn.textContent = "Scanning...";
  els.prog.style.display = 'block';
  els.body.innerHTML = '<tr><td colspan="6" class="text-center p-4">Scanning market... (Transport not included in profit estimate)</td></tr>';
  
  const realm = getRealm();
  const cat = els.cat.value;
  const targets = state.resources.filter(r => cat === 'all' || r.category === cat);
  const minP = parseNumber(els.min.value);

  // ONE bulk call covers everything
  const [prices, vwaps] = await Promise.all([
    SimCoToolsApi.getAllPrices(realm),
    SimCoToolsApi.getAllVwaps(realm)
  ]);
  const priceMap = SimCoToolsApi.buildPriceMap(prices);
  const vwapMap  = SimCoToolsApi.buildVwapMap(vwaps);

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
  
  state.scanning = false;
  els.btn.disabled = false;
  els.btn.textContent = "Start Scan";
  els.prog.style.display = 'none';
}

async function analyze(res, minProfit) {
  const realm = getRealm();
  const [listings, stcData] = await Promise.all([
    SimCoApi.getExchangeListings(res.id, realm),
    SimCoToolsApi.getResourcePrices(res.id, realm)
  ]);
  
  if(!listings.length) return;
  
  const byQ = {};
  listings.forEach(l => {
    if(!byQ[l.quality]) byQ[l.quality] = [];
    byQ[l.quality].push(l);
  });
  
  for(const q in byQ) {
    const list = byQ[q].sort((a,b) => a.price - b.price);
    if(list.length < 2) continue;
    
    const lowest = list[0];
    const next = list[1];
    
    const sellPrice = Math.max(lowest.price * 1.001, next.price * 0.999);
    const revenue = sellPrice * (1 - EXCHANGE_FEE);
    const profit = revenue - lowest.price;
    
    const avg = SimCoToolsApi.getQ0Average(stcData);
    
    const diffAvg = avg > 0 ? (lowest.price - avg) / avg : 0;
    
    if(profit >= minProfit) {
      state.results.push({
        name: res.name,
        q: q,
        price: lowest.price,
        next: next.price,
        profit: profit,
        avg: avg,
        diffAvg: diffAvg,
        slug: slugify(res.name)
      });
    }
  }
}

function renderResults() {
  els.body.innerHTML = '';
  state.results.sort((a,b) => b.estimatedProfit - a.estimatedProfit);
  
  if(!state.results.length) {
    els.body.innerHTML = '<tr><td colspan="6" class="text-center p-4">No opportunities found.</td></tr>';
    return;
  }
  
  state.results.forEach(r => {
    const tr = createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="font-weight-bold">${r.name}</div>
        <div class="text-xs text-secondary">Q${r.q}</div>
      </td>
      <td class="text-right font-mono text-green">${formatMoney(r.price)}</td>
      <td class="text-right font-mono text-secondary">${r.vwap ? formatMoney(r.vwap) : '—'}</td>
      <td class="text-right font-mono text-gold font-weight-bold">+${formatMoney(r.estimatedProfit)}</td>
      <td class="text-right">
        <span class="badge badge-${r.diffFromAvg < -0.05 ? 'green' : (r.diffFromAvg > 0.05 ? 'red' : 'outline')}">
          ${r.diffFromAvg < 0 ? '' : '+'}${formatPercent(r.diffFromAvg*100)} vs 7d VWAP
        </span>
      </td>
      <td class="text-right text-xs text-secondary">${r.note}</td>
    `;
    els.body.appendChild(tr);
  });
}
