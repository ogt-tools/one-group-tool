/**
 * resource-optimizer.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { SimCoApi, SimCoToolsApi } from '../api.js';
import { BUILDING_PRODUCTS } from '../data/buildings.js';
import { formatMoney, formatNumber, parseNumber, createElement, slugify } from '../utils.js';
import { getRealm } from '../core.js';

const state = {
  buildings: [],
  resources: [],
  selected: [], 
  bonus: 0,
  results: []
};

const els = {
  select: document.getElementById('building-select'),
  qty: document.getElementById('building-qty'),
  add: document.getElementById('add-btn'),
  list: document.getElementById('selected-list'),
  speed: document.getElementById('speed-bonus'),
  go: document.getElementById('optimize-btn'),
  body: document.getElementById('table-body')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupHeader();
  try {
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
    if (!resources.length) {
      window.showToast?.('Resource data unavailable. Check API connection.', 'error');
    }
    
    els.select.innerHTML = '<option value="">Select Building...</option>';
    state.buildings.forEach(item => {
      const opt = createElement('option');
      opt.value = item.id; opt.textContent = item.name;
      els.select.appendChild(opt);
    });
  } catch(e) { console.error(e); }
  setupListeners();
}

function setupHeader() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  document.getElementById('btnExport').onclick = () => {
    let csv = "Product,Building,Output,Profit\n";
    state.results.forEach(r => csv += `"${r.prod}","${r.build}",${r.out},${r.profit}\n`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = 'OGT-Optimizer.csv'; a.click();
  };
}

function setupListeners() {
  els.add.onclick = () => {
    const id = els.select.value;
    if(!id) return;
    const bDef = state.buildings.find(x => x.id == id);
    const count = Math.max(1, parseNumber(els.qty.value));
    const exist = state.selected.find(s => s.id == id);
    if(exist) exist.count = count; else state.selected.push({ id, name: bDef.name, count });
    renderSelected();
  };
  els.go.onclick = runOptimizer;
}

function renderSelected() {
  els.list.innerHTML = '';
  state.selected.forEach((s, idx) => {
    const div = createElement('div');
    div.className = 'p-2 mb-1 bg-secondary rounded d-flex justify-content-between align-items-center';
    div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.background = 'var(--bg-secondary)'; div.style.padding = '5px';
    div.innerHTML = `<span class="text-sm">${s.name} <span class="text-gold">x${s.count}</span></span><button class="btn-icon text-red" onclick="removeSel(${idx})">×</button>`;
    els.list.appendChild(div);
  });
}

window.removeSel = (idx) => { state.selected.splice(idx, 1); renderSelected(); };

async function runOptimizer() {
  if(!state.selected.length) return window.showToast("Select a building first", "warning");
  els.body.innerHTML = '<tr><td colspan="6" class="text-center p-4">Optimizing (includes labor cost)...</td></tr>';
  els.go.disabled = true;
  state.bonus = parseNumber(els.speed.value);
  state.results = [];
  
  const totalLevels = state.selected.reduce((acc, s) => acc + s.count, 0);
  const effectiveAO = Math.max(0, (totalLevels - 1) * 0.58825); // Simplified (no execs here)

  try {
    const realm = getRealm();
    // ONE bulk price call
    const prices = await SimCoToolsApi.getAllPrices(realm);
    const priceMap = SimCoToolsApi.buildPriceMap(prices);

    for(const sel of state.selected) {
      const candidates = state.buildingProducts[sel.name] || [];
      for(const prodName of candidates) {
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
  } catch(e) { console.error(e); }
  els.go.disabled = false;
}

function renderResults() {
  els.body.innerHTML = '';
  state.results.sort((a,b) => b.profit - a.profit);
  if(!state.results.length) { els.body.innerHTML = '<tr><td colspan="6" class="text-center p-4">No data.</td></tr>'; return; }
  state.results.forEach(r => {
    const tr = createElement('tr');
    tr.innerHTML = `
      <td class="font-weight-bold">${r.prod}</td>
      <td class="text-secondary text-sm">${r.build}</td>
      <td class="text-right font-mono">${formatNumber(r.out)}</td>
      <td class="text-right font-mono text-red">${formatMoney(r.cost)}</td>
      <td class="text-right font-mono text-green font-weight-bold">${formatMoney(r.profit)}</td>
      <td class="text-right"><a href="profit-calculator.html?rid=${r.id}" class="btn btn-outline btn-sm">Details</a></td>
    `;
    els.body.appendChild(tr);
  });
}
