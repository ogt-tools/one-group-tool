/**
 * salary-calc.js | ONE Group Tools
 * Admin Overhead & Executive Planner Logic
 * v1.0.0
 */

import { formatMoney, parseNumber, formatPercent } from '../utils.js';

const els = {
  levels: document.getElementById('total-levels'),
  wages: document.getElementById('total-wages'),
  coo: document.getElementById('s-coo'),
  cfo: document.getElementById('s-cfo'),
  cmo: document.getElementById('s-cmo'),
  cto: document.getElementById('s-cto'),
  
  daily: document.getElementById('daily-savings'),
  eff: document.getElementById('eff-ao'),
  raw: document.getElementById('raw-ao'),
  score: document.getElementById('mgmt-score'),
  red: document.getElementById('ao-red'),
  hrCost: document.getElementById('hr-cost'),
  hrSave: document.getElementById('hr-save')
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  
  [els.levels, els.wages, els.coo, els.cfo, els.cmo, els.cto].forEach(el => {
    el.oninput = calculate;
  });
  
  calculate();
}

function calculate() {
  const totalLevels = Math.max(1, parseNumber(els.levels.value));
  const baseWages = parseNumber(els.wages.value);
  const cooMgmt = parseNumber(els.coo.value);
  const otherMgmt = parseNumber(els.cfo.value) + parseNumber(els.cmo.value) + parseNumber(els.cto.value);

  const rawAO = Math.max(0, (totalLevels - 1) * 0.58825);
  const totalMgmt = cooMgmt + Math.floor(otherMgmt / 4);
  const AO_reduction = (rawAO * totalMgmt) / 100;
  const effectiveAO = Math.max(0, rawAO - AO_reduction);

  const hourlyAdminNoExec = (rawAO / 100) * baseWages;
  const hourlyAdminWithExec = (effectiveAO / 100) * baseWages;
  const hourlySavings = hourlyAdminNoExec - hourlyAdminWithExec;

  els.raw.textContent = `Raw: ${rawAO.toFixed(2)}%`;
  els.eff.textContent = `${effectiveAO.toFixed(2)}%`;
  els.score.textContent = totalMgmt;
  els.red.textContent = `-${AO_reduction.toFixed(2)}%`;
  els.hrCost.textContent = formatMoney(hourlyAdminWithExec);
  els.hrSave.textContent = formatMoney(hourlySavings);
  els.daily.textContent = formatMoney(hourlySavings * 24);
}
