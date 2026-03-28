/**
 * roi-calc.js | ONE Group Tools
 * Logic for ROI Calculator
 * v1.0.0
 */

import { formatMoney, formatPercent, parseNumber, debounce } from '../utils.js';
import { createChart } from '../charts.js';

const state = {
  horizon: 30,
  compare: false,
  a: { invest: 0, rev: 0, cost: 0 },
  b: { invest: 0, rev: 0, cost: 0 },
  chart: null
};

const els = {
  h: document.getElementById('horizon'),
  comp: document.getElementById('compare-mode'),
  cardB: document.getElementById('card-b'),
  a: {
    invest: document.getElementById('a-invest'),
    rev: document.getElementById('a-rev'),
    cost: document.getElementById('a-cost'),
    day: document.getElementById('a-day'),
    pay: document.getElementById('a-payback'),
    roi: document.getElementById('a-roi')
  },
  b: {
    invest: document.getElementById('b-invest'),
    rev: document.getElementById('b-rev'),
    cost: document.getElementById('b-cost'),
    day: document.getElementById('b-day'),
    pay: document.getElementById('b-payback'),
    roi: document.getElementById('b-roi')
  }
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  setupHeader();
  setupListeners();
  
  state.chart = createChart('roiChart', {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { title: { display: true, text: 'Days' } } },
      interaction: { mode: 'index', intersect: false }
    }
  });
  
  calc();
}

function setupHeader() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  document.getElementById('btnReset').onclick = () => location.reload();
  document.getElementById('btnExport').onclick = async () => {
    const canvas = await html2canvas(document.getElementById('main-content'), { backgroundColor: '#131b2e' });
    const link = document.createElement('a');
    link.download = `OGT-ROI.png`;
    link.href = canvas.toDataURL();
    link.click();
  };
}

function setupListeners() {
  const update = debounce(calc, 200);
  
  els.h.addEventListener('input', (e) => { state.horizon = parseNumber(e.target.value); update(); });
  els.comp.addEventListener('change', (e) => {
    state.compare = e.target.checked;
    els.cardB.style.opacity = state.compare ? '1' : '0.5';
    els.cardB.style.pointerEvents = state.compare ? 'auto' : 'none';
    update();
  });
  
  ['a', 'b'].forEach(key => {
    ['invest', 'rev', 'cost'].forEach(field => {
      els[key][field].addEventListener('input', (e) => {
        state[key][field] = parseNumber(e.target.value);
        update();
      });
    });
  });
}

function calc() {
  const resA = calcStrat(state.a);
  updateUI(els.a, resA);
  
  let resB = null;
  if(state.compare) {
    resB = calcStrat(state.b);
    updateUI(els.b, resB);
  }
  
  updateChart(resA, resB);
}

function calcStrat(s) {
  const hourly = s.rev - s.cost;
  const daily = hourly * 24;
  const total = (daily * state.horizon) - s.invest;
  const roi = s.invest > 0 ? (total / s.invest) : 0;
  
  let paybackDays = 0;
  if(s.invest > 0 && daily > 0) paybackDays = s.invest / daily;
  else if(s.invest === 0) paybackDays = 0;
  else paybackDays = Infinity;
  
  return { daily, total, roi, paybackDays, invest: s.invest };
}

function updateUI(dom, res) {
  dom.day.textContent = formatMoney(res.daily);
  dom.roi.textContent = formatPercent(res.roi * 100);
  
  if(res.paybackDays === Infinity) dom.pay.textContent = "Never";
  else if(res.paybackDays === 0) dom.pay.textContent = "Immediate";
  else dom.pay.textContent = `${res.paybackDays.toFixed(1)} Days`;
  
  dom.roi.className = `font-mono ${res.roi>=0 ? 'text-green' : 'text-red'}`;
}

function updateChart(a, b) {
  const labels = [];
  const dA = [];
  const dB = [];
  
  const step = Math.ceil(state.horizon / 20);
  
  for(let i=0; i<=state.horizon; i+=step) {
    labels.push(`Day ${i}`);
    dA.push((a.daily * i) - a.invest);
    if(b) dB.push((b.daily * i) - b.invest);
  }
  
  const datasets = [{
    label: 'Strategy A',
    data: dA,
    borderColor: '#00d4aa',
    backgroundColor: 'rgba(0,212,170,0.1)',
    fill: true
  }];
  
  if(b) {
    datasets.push({
      label: 'Strategy B',
      data: dB,
      borderColor: '#f0b429',
      backgroundColor: 'rgba(240,180,41,0.1)',
      fill: true
    });
  }
  
  state.chart.data.labels = labels;
  state.chart.data.datasets = datasets;
  state.chart.update();
}
