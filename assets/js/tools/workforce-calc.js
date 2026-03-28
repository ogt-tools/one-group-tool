/**
 * workforce-calc.js | ONE Group Tools
 * Building Level vs Output Calculator Logic
 * v1.0.0
 */

import { SimCoApi } from '../api.js';
import { formatMoney, formatNumber, parseNumber, createElement, formatPercent } from '../utils.js';
import { createChart } from '../charts.js';
import { getRealm } from '../core.js';

const state = {
  resources: [],
  selected: null,
  chart: null
};

const els = {
  select: document.getElementById('resource-select'),
  from: document.getElementById('from-level'),
  to: document.getElementById('to-level'),
  speed: document.getElementById('speed-bonus'),
  total: document.getElementById('total-levels'),
  mgmt: document.getElementById('mgmt-score'),
  btn: document.getElementById('calc-btn'),
  
  outInc: document.getElementById('out-inc'),
  outPct: document.getElementById('out-pct'),
  wageUnit: document.getElementById('wage-unit'),
  wageDiff: document.getElementById('wage-diff')
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
  } catch(e) { console.error(e); }
  
  els.btn.onclick = calculate;
  
  state.chart = createChart('scaling-chart', {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Units / Hr' } },
        y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Wage / Unit ($)' }, grid: { drawOnChartArea: false } }
      }
    }
  });
}

async function calculate() {
  const rid = parseInt(els.select.value);
  if(!rid) return;
  
  const res = state.resources.find(r => r.id === rid);
  if(!res) return;
  const from = parseNumber(els.from.value);
  const to = parseNumber(els.to.value);
  const speed = parseNumber(els.speed.value);
  const totalBase = parseNumber(els.total.value);
  const mgmt = parseNumber(els.mgmt.value);
  
  // Model data for chart (Levels 1 to 20 or max(to, 20))
  const maxLvl = Math.max(20, to);
  const labels = [];
  const dataOut = [];
  const dataWage = [];
  
  let currentOut = 0, currentWage = 0;
  let targetOut = 0, targetWage = 0;

  for(let l = 1; l <= maxLvl; l++) {
    labels.push(`Lvl ${l}`);
    
    // Formula from Part 1.3/1.4
    const units = res.producedAnHour * l * (1 + speed/100);
    
    // AO logic: assume this building is part of the total levels
    // When this building is level 'l', what is total levels?
    // Current total levels = totalBase. 
    // New total levels = totalBase - from + l
    const currentTotalLevels = Math.max(1, totalBase - from + l);
    const rawAO = (currentTotalLevels - 1) * 0.58825;
    const effectiveAO = rawAO * (1 - mgmt/100);
    
    const baseWages = (res.wages ?? 0) * l;
    const totalWages = baseWages * (1 + effectiveAO/100);
    const wagePerUnit = units > 0 ? totalWages / units : 0;
    
    dataOut.push(units);
    dataWage.push(wagePerUnit);
    
    if(l === from) { currentOut = units; currentWage = wagePerUnit; }
    if(l === to) { targetOut = units; targetWage = wagePerUnit; }
  }
  
  // UI
  els.outInc.textContent = `+${formatNumber(targetOut - currentOut)} / hr`;
  els.outPct.textContent = formatPercent(((targetOut - currentOut) / (currentOut || 1)) * 100) + " Gain";
  els.wageUnit.textContent = formatMoney(targetWage) + " / unit";
  const wDiff = ((targetWage - currentWage) / (currentWage || 1)) * 100;
  els.wageDiff.textContent = `${wDiff >= 0 ? '+' : ''}${wDiff.toFixed(2)}% vs current`;
  els.wageDiff.className = `stat-sub ${wDiff > 0 ? 'text-red' : 'text-green'}`;
  
  // Chart
  state.chart.data.labels = labels;
  state.chart.data.datasets = [
    { label: 'Units/Hr', data: dataOut, yAxisID: 'y', borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,0.1)', fill: true },
    { label: 'Wage/Unit', data: dataWage, yAxisID: 'y1', borderColor: '#f0b429', borderDash: [5, 5] }
  ];
  state.chart.update();
}
