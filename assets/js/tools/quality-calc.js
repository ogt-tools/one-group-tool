/**
 * quality-calc.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { SimCoApi } from '../api.js';
import { formatMoney, formatPercent, parseNumber, createElement } from '../utils.js';
import { createChart } from '../charts.js';
import { getRealm } from '../core.js';

const state = {
  resources: [],
  prices: [],
  chart: null
};

const els = {
  select: document.getElementById('resource-select'),
  prodCost: document.getElementById('prod-cost'),
  btn: document.getElementById('analyze-btn'),
  body: document.getElementById('table-body')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  
  try {
    const res = await SimCoApi.getAllResources(getRealm());
    const resourceList = Array.isArray(res) ? [...res] : [];
    if (!resourceList.length) {
      window.showToast?.('Resource data unavailable. Check API connection.', 'error');
      return;
    }
    state.resources = resourceList.sort((a,b) => a.name.localeCompare(b.name));
    
    els.select.innerHTML = '<option value="">Select Resource...</option>';
    state.resources.forEach(r => {
      const opt = createElement('option');
      opt.value = r.id; opt.textContent = r.name;
      els.select.appendChild(opt);
    });
  } catch(e) { console.error(e); }
  
  els.btn.onclick = analyze;
  els.prodCost.oninput = renderResults;
  
  state.chart = createChart('quality-chart', {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: false } },
      plugins: { legend: { display: false } }
    }
  });
}

function setupHeader() {
  document.getElementById('btnExport').onclick = async () => {
    const canvas = await html2canvas(document.getElementById('main-content'), { backgroundColor: '#0a0e1a' });
    const link = document.createElement('a');
    link.download = `OGT-Quality.png`;
    link.href = canvas.toDataURL();
    link.click();
  };
}

async function analyze() {
  const id = els.select.value;
  if(!id) return;
  
  els.btn.disabled = true;
  els.btn.textContent = "Fetching...";
  state.prices = [];
  
  try {
    const listings = await SimCoApi.getExchangeListings(id, getRealm());
    const maxQ = 4; // Capped per Part 1.6
    const qPrices = new Array(maxQ + 1).fill(0);
    
    listings.forEach(l => {
      const q = l.quality;
      if(q <= maxQ) {
        if(qPrices[q] === 0 || l.price < qPrices[q]) qPrices[q] = l.price;
      }
    });
    
    state.prices = qPrices;
    renderResults();
    renderChart();
  } catch(e) {
    console.error(e);
    window.showToast("Failed to fetch data", "error");
  }
  
  els.btn.disabled = false;
  els.btn.textContent = "Analyze Quality";
}

function renderResults() {
  els.body.innerHTML = '';
  const q0 = state.prices[0] || 0;
  const userCost = parseNumber(els.prodCost.value);
  
  state.prices.forEach((p, q) => {
    if(p === 0) return;
    
    const premium = q0 > 0 ? (p - q0)/q0 : 0;
    const margin = p > 0 ? (p - userCost)/p : 0;
    
    const tr = createElement('tr');
    tr.innerHTML = `
      <td class="font-mono">Q${q}</td>
      <td class="text-right font-mono text-gold">${formatMoney(p)}</td>
      <td class="text-right font-mono ${premium>0?'text-green':'text-secondary'}">
        ${premium>0?'+':''}${formatPercent(premium*100)}
      </td>
      <td class="text-right font-mono ${margin>=0?'text-green':'text-red'}">
        ${formatPercent(margin*100)}
      </td>
    `;
    els.body.appendChild(tr);
  });
}

function renderChart() {
  const labels = [], data = [];
  state.prices.forEach((p, q) => {
    if(p > 0) { labels.push(`Q${q}`); data.push(p); }
  });
  state.chart.data.labels = labels;
  state.chart.data.datasets = [{
    label: 'Price', data: data,
    borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,0.1)',
    fill: true, tension: 0.2
  }];
  state.chart.update();
}
