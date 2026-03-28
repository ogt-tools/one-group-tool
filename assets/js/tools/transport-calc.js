/**
 * transport-calc.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { SimCoApi } from '../api.js';
import { formatMoney, formatNumber, parseNumber, createElement, slugify } from '../utils.js';
import { getRealm } from '../core.js';

const state = {
  resources: [],
  transportPrice: 0.35
};

const els = {
  select: document.getElementById('resource-select'),
  qty: document.getElementById('qty-input'),
  method: document.getElementById('method-select'),
  btn: document.getElementById('calc-btn'),
  total: document.getElementById('total-cost'),
  perUnit: document.getElementById('cost-per-unit'),
  needed: document.getElementById('units-needed'),
  priceDisplay: document.getElementById('transport-price')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  
  try {
    const resources = await SimCoApi.getAllResources(getRealm());
    const resourceList = Array.isArray(resources) ? [...resources] : [];
    if (!resourceList.length) {
      window.showToast?.('Resource data unavailable. Check API connection.', 'error');
      return;
    }
    state.resources = resourceList;
    state.resources.sort((a,b) => a.name.localeCompare(b.name));
    
    els.select.innerHTML = '<option value="">Select Resource...</option>';
    state.resources.forEach(r => {
      const opt = createElement('option');
      opt.value = r.id; opt.textContent = r.name;
      els.select.appendChild(opt);
    });
    
    fetchTransportPrice();
  } catch(e) { console.error(e); }
  
  els.btn.onclick = calculate;
}

async function fetchTransportPrice() {
  const tRes = state.resources.find(r => r.name === 'Transport');
  if (tRes) {
    const list = await SimCoApi.getExchangeListings(tRes.id, getRealm());

    if (list.length) {
      state.transportPrice = list[0].price;
      els.priceDisplay.textContent = `Price: ${formatMoney(state.transportPrice)}`;
    }
  }
}

async function calculate() {
  const id = parseInt(els.select.value);
  if (!id) return;
  const qty = parseNumber(els.qty.value);
  const method = els.method.value;
  
  const res = state.resources.find(r => r.id === id);
  let transportFactor = res.transport;
  
  // Primary fallback check
  if (transportFactor === undefined) {
    try {
      const detail = await SimCoApi.getResource(id, getRealm());
      transportFactor = detail.transport || 1;
    } catch {
      transportFactor = 1; 
    }
  }
  
  const methodFactor = method === 'contract' ? 0.5 : 1.0;
  const needed = qty * transportFactor * methodFactor;
  const cost = needed * state.transportPrice;
  
  els.total.textContent = formatMoney(cost);
  els.perUnit.textContent = `${formatMoney(cost / qty)} / unit`;
  els.needed.textContent = formatNumber(needed);
}
