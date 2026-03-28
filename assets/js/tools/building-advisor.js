/**
 * building-advisor.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { SimCoApi } from '../api.js';
import { BUILDING_PRODUCTS } from '../data/buildings.js';
import { formatMoney, formatNumber, parseNumber, createElement, slugify } from '../utils.js';
import { createChart } from '../charts.js';
import { getRealm } from '../core.js';

/* -------------------------------------------------------------------------- */
/*                                    STATE                                   */
/* -------------------------------------------------------------------------- */

const state = {
  buildings: [],
  resources: [],
  selectedBuilding: null,
  params: { from: 1, to: 2, admin: 0 },
  chart: null
};

const els = {
  bSelect: document.getElementById('building-select'),
  pSelect: document.getElementById('product-select'),
  from: document.getElementById('from-level'),
  to: document.getElementById('to-level'),
  admin: document.getElementById('admin-input'),
  btn: document.getElementById('calculate-btn'),
  cost: document.getElementById('upgrade-cost'),
  mats: document.getElementById('material-list'),
  profInc: document.getElementById('profit-increase'),
  roiTime: document.getElementById('roi-time')
};

/* -------------------------------------------------------------------------- */
/*                               INITIALIZATION                               */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupHeader();
  try {
    const realm = getRealm();
    const [b, r] = await Promise.all([
      SimCoApi.getBuildings(realm),
      SimCoApi.getAllResources(realm)
    ]);
    state.buildings = b.sort((a,b) => a.name.localeCompare(b.name));
    const resourceList = Array.isArray(r) ? [...r] : [];
    state.resources = resourceList;
    if (!resourceList.length) {
      window.showToast?.('Resource data unavailable. Check API connection.', 'error');
      els.pSelect.disabled = true;
    } else {
      els.pSelect.disabled = false;
    }
    
    populateBuildings();
    
  } catch(e) { console.error(e); }
  
  setupListeners();
  
  state.chart = createChart('roi-timeline-chart', {
    type: 'bar',
    data: {
      labels: ['Cost', '1 Week Gain', '1 Month Gain'],
      datasets: [{ label: 'Value ($)', data: [0,0,0], backgroundColor: ['#ef4444', '#f0b429', '#22c55e'] }]
    },
    options: { indexAxis: 'y', plugins: { legend: { display: false } } }
  });
}

function setupHeader() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
}

function populateBuildings() {
  els.bSelect.innerHTML = '<option value="">Select Building...</option>';
  state.buildings.forEach(b => {
    const opt = createElement('option');
    opt.value = b.id; opt.textContent = b.name;
    els.bSelect.appendChild(opt);
  });
}

function setupListeners() {
  els.bSelect.onchange = (e) => {
    const id = e.target.value;
    if(!id) return;
    state.selectedBuilding = state.buildings.find(b => b.id == id);
    populateProducts();
  };
  
  els.from.oninput = (e) => state.params.from = parseNumber(e.target.value);
  els.to.oninput = (e) => state.params.to = parseNumber(e.target.value);
  els.admin.oninput = (e) => state.params.admin = parseNumber(e.target.value);
  
  els.btn.onclick = calculate;
}

function populateProducts() {
  els.pSelect.innerHTML = '<option value="">Select Product...</option>';
  els.pSelect.disabled = false;
  
  const bName = state.selectedBuilding.name;
  const candidates = BUILDING_PRODUCTS[bName] || [];
  
  const filtered = state.resources.filter(r => candidates.includes(r.name));
  filtered.sort((a,b)=>a.name.localeCompare(b.name)).forEach(r => {
    const opt = createElement('option');
    opt.value = r.id; opt.textContent = r.name;
    els.pSelect.appendChild(opt);
  });
}

/* -------------------------------------------------------------------------- */
/*                               CALCULATION                                  */
/* -------------------------------------------------------------------------- */

async function calculate() {
  if(!state.selectedBuilding || !els.pSelect.value) return window.showToast("Select building and product", "warning");
  
  els.btn.disabled = true;
  els.btn.textContent = "Calculating...";
  
  try {
    const from = state.params.from;
    const to = state.params.to;
    const levels = to - from;
    if(levels <= 0) throw new Error("Target level must be higher");
    
    // 1. Get Upgrade Materials from Building Detail
    const realm = getRealm();
    const detail = await SimCoApi.getBuildingDetail(state.selectedBuilding.id, realm);
    let totalUpgradeCost = 0;
    let matSummary = [];

    // The API structure for building materials is usually nested.
    // Fallback if detail lacks materials: Use generic estimate
    if(detail.upgradeCost) {
       for(const mat of detail.upgradeCost) {
         // mat: { resource: {id, name}, amount }
         const price = await getExchangePrice(mat.resource.id, realm);
         const cost = mat.amount * price * levels;
         totalUpgradeCost += cost;
         matSummary.push(`${formatNumber(mat.amount * levels)}x ${mat.resource.name}`);
       }
    } else {
       // Fallback: $10,000 per level estimate
       totalUpgradeCost = 10000 * levels;
       matSummary.push("Estimated based on generic materials");
    }
    
    els.cost.textContent = formatMoney(totalUpgradeCost);
    els.mats.textContent = matSummary.join(', ');

    // 2. Profit Gain
    const rid = parseInt(els.pSelect.value);
    const resDetail = await SimCoApi.getResource(rid, realm);
    
    // Marginal Gain = (To - From) * producedAnHour * ProfitPerUnit
    const baseOutput = resDetail?.producedAnHour ?? 0;
    const price = await getExchangePrice(rid, realm);
    const profitPerUnit = price * 0.15; // Assume 15% estimated margin for v1.0
    
    const marginalProfitHr = (to - from) * baseOutput * profitPerUnit;
    
    els.profInc.textContent = `+${formatMoney(marginalProfitHr)} / hr`;
    
    // ROI
    const days = marginalProfitHr > 0 ? (totalUpgradeCost / (marginalProfitHr * 24)) : 0;
    els.roiTime.textContent = days > 0 ? `${days.toFixed(1)} Days` : "Never";
    
    // Chart
    state.chart.data.datasets[0].data = [totalUpgradeCost, marginalProfitHr*24*7, marginalProfitHr*24*30];
    state.chart.update();
    
  } catch(e) {
    console.error(e);
    window.showToast("Calculation failed", "error");
  }
  
  els.btn.disabled = false;
  els.btn.textContent = "Calculate ROI";
}

async function getExchangePrice(id, realm = getRealm()) {
  try {
    const list = await SimCoApi.getExchangeListings(id, realm);
    return list.length ? list[0].price : 0;
  } catch { return 0; }
}
