/**
 * retail-calc.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { SimCoApi, ProxyApi } from '../api.js';
import { formatMoney, parseNumber, createElement } from '../utils.js';
import { createChart } from '../charts.js';
import { getRealm } from '../core.js';

const state = {
  allResources: [],
  chart: null
};

const els = {
  sel: document.getElementById('resource-select'),
  cost: document.getElementById('cost-input'),
  bLvl: document.getElementById('b-level'),
  q: document.getElementById('quality-input'),
  demand: document.getElementById('demand-range'),
  demandVal: document.getElementById('demand-val'),
  btn: document.getElementById('calc-btn'),
  price: document.getElementById('opt-price'),
  units: document.getElementById('opt-units'),
  profit: document.getElementById('opt-profit'),
  vsExch: document.getElementById('vs-exchange')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  
  const realm = getRealm();
  
  try {
    const [resources, retailInfo, weather] = await Promise.all([
      SimCoApi.getAllResources(realm),
      ProxyApi.getRetailInfo(realm),
      ProxyApi.getWeather(realm)
    ]);
    
    const resourceList = Array.isArray(resources) ? [...resources] : [];
    if (!resourceList.length) {
      window.showToast?.('Resource data unavailable. Check API connection.', 'error');
      return;
    }
    state.allResources = resourceList;
    state.allResources.sort((a,b) => a.name.localeCompare(b.name));
    
    // Build retail demand map
    const retailMap = ProxyApi.buildRetailMap(retailInfo || []);
    const weatherMult = weather?.sellingSpeedMultiplier ?? 1.0;
    
    // Show current weather effect
    document.getElementById('weather-text').textContent = 
      `×${weatherMult.toFixed(2)} (updates ~every 11 hours)`;
    document.getElementById('weather-note').style.display = 'block';
    
    els.sel.innerHTML = '<option value="">Select Resource...</option>';
    state.allResources.forEach(r => {
      const opt = createElement('option');
      opt.value = r.id; opt.textContent = r.name;
      els.sel.appendChild(opt);
    });
    
    // Store retail data for use in optimize
    window._retailMap = retailMap;
    window._weatherMult = weatherMult;
    
  } catch(e) { console.error(e); }
  
  els.demand.oninput = (e) => {
    const v = e.target.value;
    let lbl = "Average";
    if(v <= 3) lbl = "Very Low";
    else if(v <= 4) lbl = "Low";
    else if(v >= 8) lbl = "Very High";
    else if(v >= 6) lbl = "High";
    els.demandVal.textContent = `${lbl} (${v})`;
  };
  
  els.sel.onchange = async (e) => {
    const id = e.target.value;
    if(id) {
      const list = await SimCoApi.getExchangeListings(id, realm);
      if(list.length) els.cost.value = list[0].price;
      
      // Pre-fill demand level based on real data
      const rd = window._retailMap?.get(parseInt(id));
      if (rd) {
        // Normalize demand level based on real data (0.15-0.25 → 1-10 scale)
        const normalizedDemand = Math.round(Math.min(10, Math.max(1, rd.demand / 0.025)));
        els.demand.value = normalizedDemand;
        els.demandVal.textContent = `Real demand: ${(rd.demand * 100).toFixed(2)}% | Saturation: ${rd.saturation.toFixed(2)}`;
      }
    }
  };

  els.btn.onclick = optimize;
  
  state.chart = createChart('retail-chart', {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { title: { display: true, text: 'Sell Price ($)' } }, y: { title: { display: true, text: 'Profit/Hr' } } },
      plugins: { legend: { display: false } }
    }
  });
}

function optimize() {
  const rid = parseInt(els.sel.value);
  if(!rid) return;
  const res = state.allResources.find(r => r.id === rid);
  if(!res) return;
  const cost = parseNumber(els.cost.value);
  const bLvl = parseNumber(els.bLvl.value);
  const q = parseNumber(els.q.value);
  const demand = parseNumber(els.demand.value);
  
  if(!cost) return;
  
  // Get real retail data
  const retailData = window._retailMap?.get(rid);
  const weatherMult = window._weatherMult ?? 1.0;
  const demandReal = retailData?.demand ?? (demand / 40);
  const saturation = retailData?.saturation ?? 1.0;
  
  // Simulation
  const start = cost;
  const end = cost * 3;
  const step = (end - start) / 50;
  
  const points = [];
  let bestProfitHr = -Infinity;
  let bestPrice = 0;
  let bestUnitsHr = 0;
  
  const qMult = 1 + (q * 0.1);
  
  for(let p = start; p <= end; p += step) {
    if(p <= cost) continue;
    
    // Real retail speed model (using actual SimCo saturation/demand values):
    // units_per_hour ≈ building_level × (demand / saturation) × weatherMult × quality_mult × price_factor
    const quality_mult = qMult;
    const base_speed = bLvl * (demandReal / Math.max(0.1, saturation));
    const price_factor = cost > 0 ? Math.pow(cost / Math.max(0.01, p), 0.6) : 1;
    const units_per_hour = base_speed * weatherMult * quality_mult * price_factor;
    const profitHr = (p - cost) * units_per_hour;
    
    points.push({ x: p, y: profitHr });
    if(profitHr > bestProfitHr) {
      bestProfitHr = profitHr;
      bestPrice = p;
      bestUnitsHr = units_per_hour;
    }
  }
  
  // Exchange Comparison
  // Units produced per hour = res.producedAnHour * bLvl
  // Exchange Profit = (SellPrice * 0.96 - cost) * TotalUnitsProduced
  const exchUnitsHr = (res.producedAnHour || 0) * bLvl;
  // Assume same sell price for exchange? 
  const exchProfitHr = (bestPrice * 0.96 - cost) * exchUnitsHr;
  
  els.price.textContent = formatMoney(bestPrice);
  els.units.textContent = `${bestUnitsHr.toFixed(1)} units / hr`;
  els.profit.textContent = formatMoney(bestProfitHr) + " / hr";
  els.vsExch.textContent = `vs. Exchange Profit: ${formatMoney(exchProfitHr)} / hr`;
  
  state.chart.data.datasets = [{
    label: 'Profit/Hr',
    data: points,
    borderColor: '#00d4aa',
    backgroundColor: 'rgba(0,212,170,0.1)',
    fill: true,
    tension: 0.4
  }];
  state.chart.update();
}
