/**
 * upgrade-planner.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { formatMoney, parseNumber, createElement } from '../utils.js';

const state = {
  queue: [],
  cash: 0,
  profit: 10000
};

const els = {
  name: document.getElementById('build-name'),
  cost: document.getElementById('build-cost'),
  add: document.getElementById('add-btn'),
  cash: document.getElementById('cash-input'),
  profit: document.getElementById('profit-input'),
  calc: document.getElementById('calc-btn'),
  table: document.getElementById('table-body')
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  load();
  setupListeners();
  render();
}

function setupListeners() {
  els.add.onclick = () => {
    const name = els.name.value;
    const cost = parseNumber(els.cost.value);
    if (name && cost > 0) {
      state.queue.push({ name, cost });
      save(); render();
      els.name.value = ''; els.cost.value = '';
    }
  };

  els.calc.onclick = () => {
    state.cash = parseNumber(els.cash.value);
    state.profit = parseNumber(els.profit.value);
    save(); render();
  };
}

function render() {
  els.table.innerHTML = '';
  if (!state.queue.length) {
    els.table.innerHTML = '<tr><td colspan="5" class="text-center p-4">Queue is empty.</td></tr>';
    return;
  }

  let accumulatedCash = state.cash;
  let currentDate = new Date();
  
  state.queue.forEach((item, idx) => {
    let dateStr = "";
    if (accumulatedCash >= item.cost) {
      accumulatedCash -= item.cost;
      dateStr = "Now (Affordable)";
    } else {
      const needed = item.cost - accumulatedCash;
      const daysNeeded = Math.ceil(needed / (state.profit || 1));
      accumulatedCash = (state.profit * daysNeeded) - needed;
      currentDate.setDate(currentDate.getDate() + daysNeeded);
      dateStr = currentDate.toLocaleDateString();
    }

    const tr = createElement('tr');
    tr.draggable = true;
    tr.dataset.index = idx;
    tr.innerHTML = `
      <td class="text-secondary" style="cursor:move"><i data-feather="menu" width="14"></i></td>
      <td class="font-weight-bold">${item.name}</td>
      <td class="text-right font-mono">${formatMoney(item.cost)}</td>
      <td class="text-right text-gold font-mono">${dateStr}</td>
      <td class="text-right">
        <button class="btn-icon text-red" onclick="removeQueue(${idx})"><i data-feather="x"></i></button>
      </td>
    `;
    
    // Drag & Drop
    tr.ondragstart = (e) => { e.dataTransfer.setData('text/plain', idx); tr.style.opacity = '0.5'; };
    tr.ondragend = () => { tr.style.opacity = '1'; };
    tr.ondragover = (e) => { e.preventDefault(); tr.style.borderTop = '2px solid var(--accent-gold)'; };
    tr.ondragleave = () => { tr.style.borderTop = 'none'; };
    tr.ondrop = (e) => {
      e.preventDefault();
      tr.style.borderTop = 'none';
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
      const toIdx = idx;
      if(fromIdx !== toIdx) {
        const temp = state.queue.splice(fromIdx, 1)[0];
        state.queue.splice(toIdx, 0, temp);
        save(); render();
      }
    };

    els.table.appendChild(tr);
  });
  if(window.feather) feather.replace();
}

window.removeQueue = (idx) => {
  state.queue.splice(idx, 1);
  save(); render();
};

function save() { localStorage.setItem('og_upgrade_plan', JSON.stringify(state)); }
function load() {
  const s = localStorage.getItem('og_upgrade_plan');
  if (s) {
    const d = JSON.parse(s);
    state.queue = d.queue || [];
    state.cash = d.cash || 0;
    state.profit = d.profit || 10000;
    els.cash.value = state.cash;
    els.profit.value = state.profit;
  }
}
