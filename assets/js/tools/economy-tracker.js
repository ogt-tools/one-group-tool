/**
 * economy-tracker.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { SimCoApi, SimCoToolsApi, ProxyApi } from '../api.js';
import { getRealm } from '../core.js';
import { createChart } from '../charts.js';

const state = {
  phase: "Normal",
  history: []
};

const ADVICE = {
  "Recession": {
    color: "red",
    headline: "Production speed is lower. Retail demand is low.",
    prod: "Production runs slower than Normal. Effective labor cost per unit is higher due to lower output. Consider pausing production expansion. Good time to upgrade buildings as construction material prices tend to be lower.",
    retail: "Retail demand is LOW. Sales are slow. Consider reducing price to maintain throughput, or temporarily switching to exchange sales.",
    exchange: "Exchange prices may dip. Good time to buy and stockpile raw materials if cash allows.",
    strategy: "Focus on efficiency. Reduce unnecessary overheads. Avoid over-leveraging new buildings until economy recovers."
  },
  "Normal": {
    color: "gold",
    headline: "Stable economy. Standard production speed and demand.",
    prod: "Standard output speed. Steady-state operations. Focus on optimizing margins and consistent supply chains.",
    retail: "Normal retail demand. Reliable sales rate. Maintain consistent pricing.",
    exchange: "Balanced prices. Good time for regular trading and contracts.",
    strategy: "Good time for building upgrades and expanding product lines steadily."
  },
  "Boom": {
    color: "green",
    headline: "Production speed is higher. Retail demand is very high.",
    prod: "Production runs FASTER than Normal — higher output per hour. Maximize volume. Aerospace and high-value products benefit most from elevated demand.",
    retail: "Retail demand is HIGH. Consumers buy faster. Price confidently. Best selling period for all retail categories.",
    exchange: "Exchange prices elevated. Excellent time to sell stockpiles. Be cautious buying expensive inputs.",
    strategy: "Sell everything in stock. Defer non-urgent building upgrades (materials are expensive). Accumulate cash."
  }
};

const els = {
  phase: document.getElementById('current-phase'),
  card: document.getElementById('phase-card'),
  headline: document.getElementById('advice-headline'),
  prod: document.getElementById('prod-advice'),
  retail: document.getElementById('retail-advice'),
  exchange: document.getElementById('exchange-advice'),
  strategy: document.getElementById('strategy-advice'),
  manualSection: document.getElementById('economy-manual-section'),
  note: document.getElementById('next-change')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('btnHelp').onclick = () =>
    document.getElementById('helpPanel').classList.toggle('open');
  setupManualSelectors();
  
  const realm = getRealm();

  // Load phase history from SimCoTools (replaces static JSON file)
  try {
    const phases = await SimCoToolsApi.getPhaseHistory(realm);
    if (phases.length) {
      // Normalize phase names to Title Case
      state.history = phases.map(p => ({
        date: p.start,
        phase: p.phase.charAt(0).toUpperCase() + p.phase.slice(1).toLowerCase()
      })).sort((a, b) => a.date.localeCompare(b.date));
    } else {
      // Fallback to local JSON
      const res = await fetch('../assets/data/economy-history.json');
      const data = await res.json();
      state.history = data.history;
    }
  } catch(e) {
    try {
      const res = await fetch('../assets/data/economy-history.json');
      const data = await res.json();
      state.history = data.history;
    } catch {}
  }

  // Try proxy first for economy phase (server-side fetched, no CORS)
  let phase = null;
  try {
    const index = await ProxyApi.getMeta();
    if (index?.lastUpdated) {
      phase = 'Normal'; // Default when proxy is working
    }
  } catch {}
  
  // Fallback: SimCoTools if proxy fails
  if (!phase) {
    phase = await SimCoToolsApi.getEconomyPhase(realm);
  }
  
  if (phase) {
    state.phase = phase;
    els.manualSection.style.display = 'none';
  } else {
    els.manualSection.style.display = 'block';
  }

  render();
  initChart();
}

function setupManualSelectors() {
  document.querySelectorAll('.econ-btn').forEach(btn => {
    btn.onclick = () => {
      setPhase(btn.dataset.val);
    };
  });
}

window.setPhase = (phase) => {
  if(!phase) return;
  state.phase = phase;
  render();
};

function render() {
  els.phase.textContent = state.phase;
  const info = ADVICE[state.phase] || ADVICE["Normal"];
  
  els.phase.className = `text-${info.color}`;
  els.card.style.borderTopColor = `var(--accent-${info.color})`;
  els.headline.textContent = info.headline;
  els.prod.textContent = info.prod;
  els.retail.textContent = info.retail;
  els.exchange.textContent = info.exchange;
  els.strategy.textContent = info.strategy;
}

function initChart() {
  const phaseMap = { "Recession": 0, "Normal": 1, "Boom": 2 };
  const sorted = [...state.history]; // Already sorted in JSON
  
  const data = sorted.map(h => phaseMap[h.phase]);
  const labels = sorted.map(h => h.date);
  
  createChart('economy-chart', {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Economy State',
        data: data,
        borderColor: '#f0b429',
        backgroundColor: 'rgba(240, 180, 41, 0.1)',
        stepped: true,
        fill: true,
        tension: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: (val) => {
              if (val === 0) return "Recession";
              if (val === 1) return "Normal";
              if (val === 2) return "Boom";
              return "";
            }
          },
          min: 0, max: 2,
          grid: { color: '#1e2d4a' }
        },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}


