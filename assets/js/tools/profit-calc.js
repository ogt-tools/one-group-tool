/**
 * profit-calc.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { SimCoApi, SimCoToolsApi, ProxyApi } from '../api.js';
import { formatMoney, formatNumber, parseNumber, createElement, debounce, formatPercent, slugify } from '../utils.js';
import { createChart } from '../charts.js';
import { getRealm } from '../core.js';

/* -------------------------------------------------------------------------- */
/*                                    STATE                                   */
/* -------------------------------------------------------------------------- */

const state = {
  allResources: [],
  resource: null,
  recipe: [],
  inputs: {},
  transportPrice: 0.35,
  params: {
    q: 0,
    qty: 1,
    buildingLevel: 1,
    totalLevels: 1,
    speedBonus: 0,
    abundance: 100,
    mgmt: { coo: 0, cfo: 0, cmo: 0, cto: 0 },
    sellPrice: 0,
    method: 'exchange',
    tax: 15,
    manual: false
  },
  chart: null
};

const EXCHANGE_FEE = 0.04;
let resourceMap = new Map();

/* -------------------------------------------------------------------------- */
/*                               DOM ELEMENTS                                 */
/* -------------------------------------------------------------------------- */

const els = {
  search: document.getElementById('resource-search'),
  list: document.getElementById('resource-list'),
  q: document.getElementById('quality'),
  qVal: document.getElementById('q-val'),
  qty: document.getElementById('amount'),
  buildingLevel: document.getElementById('building-level'),
  totalLevels: document.getElementById('total-levels'),
  speedBonus: document.getElementById('speed-bonus'),
  abundance: document.getElementById('abundance'),
  abGroup: document.getElementById('abundance-group'),
  coo: document.getElementById('coo-mgmt'),
  cfo: document.getElementById('cfo-mgmt'),
  cmo: document.getElementById('cmo-mgmt'),
  cto: document.getElementById('cto-mgmt'),
  price: document.getElementById('price'),
  fetchBtn: document.getElementById('fetchPrice'),
  method: document.getElementById('method'),
  tax: document.getElementById('tax-rate'),
  manual: document.getElementById('override-costs'),
  ingList: document.getElementById('ingredients-list'),
  
  // Results
  profit: document.getElementById('res-profit'),
  ppu: document.getElementById('res-ppu'),
  margin: document.getElementById('res-margin'),
  be: document.getElementById('res-be'),
  card: document.getElementById('profit-card'),
  
  rowRev: document.getElementById('row-rev'),
  rowCogs: document.getElementById('row-cogs'),
  rowLabor: document.getElementById('row-labor'),
  rowTrans: document.getElementById('row-trans'),
  rowFees: document.getElementById('row-fees'),
  rowTax: document.getElementById('row-tax')
};

/* -------------------------------------------------------------------------- */
/*                               INITIALIZATION                               */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupHeader();
  setupListeners();

  const realm = getRealm();
  
  try {
    state.allResources = await SimCoApi.getAllResources(realm);
    if (!state.allResources.length) {
      window.showToast?.('Resource data unavailable. Check API connection.', 'error');
      els.list.innerHTML = '<p class="text-red text-center p-4">Resources unavailable.</p>';
      return;
    }
    resourceMap = new Map(state.allResources.map(r => [r.id, r]));
    state.transportPrice = await fetchTransportPrice(realm);
    setupSearch();
    
    // URL rid param
    const rid = new URLSearchParams(window.location.search).get('rid');
    if(rid) loadResource(parseInt(rid), realm);
    
  } catch(e) { console.error(e); }
  
  state.chart = createChart('costChart', {
    type: 'doughnut',
    data: {
      labels: ['Materials', 'Labor', 'Transport', 'Fees', 'Tax', 'Profit'],
      datasets: [{ data: [0,0,0,0,0,0], backgroundColor: ['#3b82f6', '#facc15', '#8b5cf6', '#ef4444', '#f87171', '#22c55e'] }]
    },
    options: { cutout: '70%', plugins: { legend: { display: false } } }
  });
}

function setupHeader() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  document.getElementById('btnReset').onclick = () => location.href = 'profit-calculator.html';
  document.getElementById('btnExport').onclick = async () => {
    const canvas = await html2canvas(document.getElementById('main-content'), { backgroundColor: '#0a0e1a' });
    const link = document.createElement('a');
    link.download = `OGT-Profit.png`;
    link.href = canvas.toDataURL();
    link.click();
  };
}

async function fetchTransportPrice(realm) {
  const tRes = state.allResources.find(r =>
    r.name === 'Transport' || r.name.toLowerCase() === 'transport'
  );
  if(!tRes) return 0.35;
  const price = await SimCoApi.getBestPrice(tRes.id, 0, realm);
  return price || 0.35;
}

/* -------------------------------------------------------------------------- */
/*                                SEARCH LOGIC                                */
/* -------------------------------------------------------------------------- */

function setupSearch() {
  const filter = (term) => {
    const t = term.toLowerCase();
    return state.allResources.filter(r => r.name.toLowerCase().includes(t)).slice(0, 10);
  };

  els.search.oninput = (e) => renderList(filter(e.target.value));
  els.search.onfocus = () => renderList(filter(els.search.value));
  
  document.addEventListener('click', (e) => {
    if(!e.target.closest('.combo-wrapper')) els.list.classList.remove('open');
  });

  function renderList(items) {
    els.list.innerHTML = '';
    if(!items.length) return els.list.classList.remove('open');
    items.forEach(item => {
      const div = createElement('div', 'combo-item');
      div.innerHTML = `<span>${item.name}</span><span class="combo-cat">${item.category}</span>`;
      div.onclick = () => {
        els.search.value = item.name;
        els.list.classList.remove('open');
        loadResource(item.id, getRealm());
      };
      els.list.appendChild(div);
    });
    els.list.classList.add('open');
  }
}

/* -------------------------------------------------------------------------- */
/*                                CORE LOGIC                                  */
/* -------------------------------------------------------------------------- */

async function loadResource(id, realm = getRealm()) {
  els.ingList.innerHTML = '<div class="skeleton" style="height:100px"></div>';
  try {
    const res = await SimCoApi.getResource(id, realm);
    if (!res) { window.showToast?.('Resource not found', 'error'); return; }
    state.resource = res;
    state.recipe = res.producedFrom || [];

    const extractive = ['Mine', 'Quarry', 'Oil Rig'].includes(res.building?.name);
    els.abGroup.style.display = extractive ? 'block' : 'none';

    // Get active modifier for this resource from proxy
    const modifiers = await ProxyApi.getProductionModifiers(realm);
    const modMap = ProxyApi.buildModifierMap(modifiers || {});
    window._lastModifiers = modifiers; // Store for calculate() function
    const speedModifierPct = modMap.get(Number(res.kind ?? res.id)) ?? 0;

    // Show in UI if modifier is non-zero:
    if (speedModifierPct !== 0) {
      document.getElementById('event-text').textContent = 
        `${speedModifierPct > 0 ? '+' : ''}${speedModifierPct}% production speed`;
      document.getElementById('event-note').style.display = 'block';
    } else {
      document.getElementById('event-note').style.display = 'none';
    }

    // Get bulk prices (one call covers all ingredients)
    const prices = await ProxyApi.getMarketTicker(realm);
    const priceMap = ProxyApi.buildPriceMap(prices || []);

    state.inputs = {};
    for (const ing of state.recipe) {
      const ingId = ing.resource.id;
      const cost = priceMap.get(Number(ingId)) ?? 
        (await SimCoApi.getBestPrice(ingId, 0, realm)); // fallback
      state.inputs[ing.resource.name] = {
        id: ingId,
        cost,
        amount: ing.amount,
        transport: ing.resource.transport ?? 0
      };
    }

    // Sell price from bulk map too
    const sellPrice = priceMap.get(Number(id)) ?? 0;
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

async function fetchSellPrice() {
  if(!state.resource) return;
  const realm = getRealm();
  const kind = state.resource?.kind ?? state.resource?.id;
  if (!kind) return;

  // Try proxy price map first
  const ticker = await ProxyApi.getMarketTicker(realm);
  const priceMap = ProxyApi.buildPriceMap(ticker || []);
  let price = priceMap.get(Number(kind));

  // Fallback: per-resource exchange call
  if (!price) {
    const list = await SimCoApi.getExchangeListings(kind, realm);
    const qList = list.filter(l => (l.quality ?? 0) >= state.params.q);
    if (qList.length) {
      price = qList[0].price;
    }
  }
  if (price) {
    els.price.value = price;
    state.params.sellPrice = price;
    calculate();
  }
}

function setupListeners() {
  const update = debounce(calculate, 200);
  if (els.qVal) els.qVal.textContent = 'Q0';
  
  els.q.oninput = (e) => {
    if (els.qVal) els.qVal.textContent = `Q${e.target.value}`;
    state.params.q = parseInt(e.target.value) || 0;
    fetchSellPrice();
  };
  els.qty.oninput = (e) => { state.params.qty = parseNumber(e.target.value); update(); };
  els.buildingLevel.oninput = (e) => { state.params.buildingLevel = parseNumber(e.target.value); update(); };
  els.totalLevels.oninput = (e) => { state.params.totalLevels = parseNumber(e.target.value); update(); };
  els.speedBonus.oninput = (e) => { state.params.speedBonus = parseNumber(e.target.value); update(); };
  els.abundance.oninput = (e) => { state.params.abundance = parseNumber(e.target.value); update(); };
  
  ['coo', 'cfo', 'cmo', 'cto'].forEach(key => {
    els[key].oninput = (e) => { state.params.mgmt[key] = parseNumber(e.target.value); update(); };
  });
  
  els.price.oninput = (e) => { state.params.sellPrice = parseNumber(e.target.value); update(); };
  els.fetchBtn.onclick = fetchSellPrice;
  els.method.onchange = (e) => { state.params.method = e.target.value; update(); };
  els.tax.oninput = (e) => { state.params.tax = parseNumber(e.target.value); update(); };
  els.manual.onchange = (e) => { state.params.manual = e.target.checked; renderIngredients(); update(); };
}

function renderIngredients() {
  els.ingList.innerHTML = '';
  if(!state.recipe.length) return els.ingList.innerHTML = '<p class="text-muted text-sm">No inputs (Raw Material?)</p>';
  
  const table = createElement('table');
  table.style.width = '100%';
  state.recipe.forEach(ing => {
    const data = state.inputs[ing.resource.name];
    const tr = createElement('tr');
    tr.innerHTML = `
      <td class="text-sm py-1">${ing.resource.name} <span class="text-muted">x${ing.amount}</span></td>
      <td class="text-right">
        ${state.params.manual 
          ? `<input type="number" class="form-input text-xs" style="width:70px; padding:2px" value="${data.cost}" oninput="updateInputCost('${ing.resource.name}', this.value)">`
          : formatMoney(data.cost)}
      </td>
    `;
    table.appendChild(tr);
  });
  els.ingList.appendChild(table);
}

window.updateInputCost = (name, val) => {
  state.inputs[name].cost = parseNumber(val);
  calculate();
};

/* -------------------------------------------------------------------------- */
/*                               CALCULATIONS                                 */
/* -------------------------------------------------------------------------- */

function calculate() {
  const r = state.resource;
  if(!r) return;
  const p = state.params;
  
  const quantity = Math.max(0, p.qty || 0);

  const abundanceMult = ["Mine", "Quarry", "Oil Rig"].includes(r.building?.name) ? p.abundance / 100 : 1.0;
  const baseUnitsPerHour = (r.producedAnHour ?? 0) * p.buildingLevel * (1 + (p.speedBonus || 0) / 100) * abundanceMult;
  
  // Get production modifier from proxy (already fetched in loadResource)
  const modifiers = ProxyApi.buildModifierMap(window._lastModifiers || {});
  const speedModifierPct = modifiers.get(Number(r.kind ?? r.id)) ?? 0;
  const unitsPerHour = baseUnitsPerHour * (1 + speedModifierPct / 100);
  
  const rawAO = Math.max(0, (p.totalLevels - 1) * 0.58825);
  const totalMgmt = p.mgmt.coo + Math.floor((p.mgmt.cfo + p.mgmt.cmo + p.mgmt.cto) / 4);
  const AO_reduction = rawAO * totalMgmt / 100;
  const effectiveAO = Math.max(0, rawAO - AO_reduction);
  
  const baseWagesHr = (r.wages ?? 0) * p.buildingLevel;
  const totalWagesHr = baseWagesHr * (1 + effectiveAO / 100);
  const laborPerUnit = unitsPerHour > 0 ? totalWagesHr / unitsPerHour : 0;
  const totalLabor = laborPerUnit * quantity;
  
  // 3. Materials (COGS) & Input Transport
  let totalCogs = 0;
  let inputTrans = 0;
  for(const k in state.inputs) {
    const ing = state.inputs[k];
    totalCogs += ing.cost * ing.amount * quantity;
    inputTrans += ing.transport * ing.amount * quantity * state.transportPrice;
  }
  
  // 4. Revenue & Fees
  const revenue = p.sellPrice * quantity;
  const feeRate = p.method === 'exchange' ? 0.04 : 0;
  const fees = revenue * feeRate;
  
  // 5. Output Transport (Contracts Only)
  const outputTrans = p.method === 'contract' ? (r.transport * quantity * 0.5 * state.transportPrice) : 0;
  
  // 6. Tax
  const taxableProfit = revenue - totalCogs - totalLabor - fees - inputTrans - outputTrans;
  const tax = taxableProfit > 0 ? taxableProfit * (p.tax / 100) : 0;
  const netProfit = taxableProfit - tax;
  
  const inputTransPerUnit = quantity > 0 ? inputTrans / quantity : 0;
  const perUnitCogs = quantity > 0 ? totalCogs / quantity : 0;
  const perUnitLabor = laborPerUnit;
  const totalCostExclOutput = perUnitCogs + perUnitLabor + inputTransPerUnit;

  const outputTransportPerUnit = p.method === 'contract' ? (r.transport * 0.5 * state.transportPrice) : 0;
  let breakEvenPerUnit = totalCostExclOutput;
  if (p.method === 'exchange' && (1 - EXCHANGE_FEE) > 0) {
    breakEvenPerUnit = totalCostExclOutput / (1 - EXCHANGE_FEE);
  } else if (p.method === 'contract') {
    breakEvenPerUnit += outputTransportPerUnit;
  }

  // UI Update
  const profitPerUnit = quantity > 0 ? (netProfit / quantity) : 0;
  els.profit.textContent = formatMoney(netProfit);
  els.profit.className = `stat-value ${netProfit>=0?'text-green':'text-red'}`;
  els.card.style.borderLeft = `4px solid var(--accent-${netProfit>=0?'green':'red'})`;
  els.ppu.textContent = `${formatMoney(profitPerUnit)} / unit`;
  els.margin.textContent = revenue > 0 ? formatPercent((netProfit/revenue)*100) + " Margin" : "0% Margin";
  
  els.rowRev.textContent = formatMoney(revenue);
  els.rowCogs.textContent = formatMoney(totalCogs);
  els.rowLabor.textContent = formatMoney(totalLabor);
  els.rowTrans.textContent = formatMoney(inputTrans + outputTrans);
  els.rowFees.textContent = formatMoney(fees);
  els.rowTax.textContent = formatMoney(tax);
  els.be.textContent = formatMoney(breakEvenPerUnit);
  
  // Chart
  if(state.chart) {
    state.chart.data.datasets[0].data = [
      totalCogs, totalLabor, inputTrans+outputTrans, fees, tax, Math.max(0, netProfit)
    ];
    state.chart.update();
  }
}
