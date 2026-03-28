/**
 * strategy-advisor.js | ONE Group Tools
 * Logic for Strategy Advisor
 * v1.0.0
 */

import { SimCoApi, SimCoToolsApi } from '../api.js';
import { getRealm } from '../core.js';
import { parseNumber, createElement } from '../utils.js';

const els = {
  cash: document.getElementById('cash-input'),
  cv: document.getElementById('cv-input'),
  bCount: document.getElementById('b-count'),
  profit: document.getElementById('profit-input'),
  btn: document.getElementById('advise-btn'),
  area: document.getElementById('recommendations-area')
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  els.btn.addEventListener('click', advise);
}

async function advise() {
  els.btn.disabled = true;
  els.btn.textContent = "Analyzing...";
  els.area.innerHTML = '<div class="card p-4 text-center">Analyzing economy...</div>';
  
  const cash = parseNumber(els.cash.value);
  const cv = parseNumber(els.cv.value);
  const b = parseNumber(els.bCount.value);
  const profit = parseNumber(els.profit.value);
  
  const realm = getRealm();
  let econ = 'Normal';

  try {
    const phase = await SimCoToolsApi.getEconomyPhase(realm);
    econ = phase || 'Normal';
  } catch {}

  // Show what phase was used
  const phaseDisplay = document.createElement('div');
  phaseDisplay.className = 'text-sm text-secondary mb-3';
  phaseDisplay.id = 'econ-used';
  phaseDisplay.textContent = `Economy: ${econ}`;
  
  const recs = [];
  
  // --- RULE ENGINE ---
  
  // 1. Liquidity
  const cashRatio = cash / cv;
  if(cashRatio < 0.05) {
    recs.push({ title: "Liquidity Crisis", desc: "Your cash is dangerously low (<5% CV). Prioritize selling inventory immediately. Do not start new construction.", type: "error" });
  } else if (cashRatio > 0.40) {
    recs.push({ title: "Idle Capital", desc: "You have too much cash (>40% CV). Money sitting is money lost. Consider buying bonds (if ROI > 0.5%) or expanding production.", type: "warning" });
  }
  
  // 2. Growth Stage
  if(cv < 500000) {
    // Early Game
    recs.push({ title: "Focus: Low Complexity", desc: "Stick to single-stage products (Agriculture, Quarry). Avoid Electronics or Aero until CV > $2M.", type: "info" });
    if(b > 15) recs.push({ title: "Admin Warning", desc: "You have many small buildings. Admin costs will eat profits. Upgrade existing buildings instead of building new ones.", type: "warning" });
  } else if (cv > 5000000) {
    // Late Game
    recs.push({ title: "Vertical Integration", desc: "Produce your own inputs. If you make Cars, ensure you mine your own Ore and produce your own Steel.", type: "success" });
  }
  
  // 3. Economy Context
  if(econ === "Recession") {
    recs.push({ title: "Recession Strategy", desc: "Production speed is low. Wages are low. Good time to upgrade buildings (materials cheap) or produce high-labor items (Research).", type: "info" });
  } else if (econ === "Boom") {
    recs.push({ title: "Boom Strategy", desc: "Retail demand is high. Sell everything. Avoid upgrading now (costly materials). Maximize production volume.", type: "success" });
  }
  
  // 4. Bond/Finance
  if(profit > 0 && profit < cv * 0.005) {
    // Low profit
    recs.push({ title: "Low Efficiency", desc: "Your daily profit is < 0.5% of CV. Review your margins in Profit Calculator. You might be producing unprofitable items.", type: "error" });
  }
  
  // 5. Executives
  if(b > 20 || cv > 2000000) {
    recs.push({ title: "Hire Executives", desc: "If you haven't yet, hire a COO to reduce admin costs and a CFO to reduce tax.", type: "info" });
  }
  
  // Render
  els.area.innerHTML = '';
  els.area.appendChild(phaseDisplay);
  
  if(!recs.length) els.area.innerHTML += '<div class="card p-4">No specific alerts. You are doing well!</div>';
  
  recs.forEach(r => {
    const div = createElement('div', `card`);
    div.style.marginBottom = '1rem';
    div.style.borderLeft = `4px solid var(--accent-${r.type === 'error'?'red':(r.type==='warning'?'gold':(r.type==='success'?'green':'teal'))})`;
    div.innerHTML = `
      <h4 style="margin-bottom:0.5rem">${r.title}</h4>
      <p class="text-secondary text-sm">${r.desc}</p>
    `;
    els.area.appendChild(div);
  });
  
  els.btn.disabled = false;
  els.btn.textContent = "Get Advice";
}
