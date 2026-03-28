/**
 * production-chain.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { SimCoApi } from '../api.js';
import { formatMoney, parseNumber, createElement, slugify } from '../utils.js';
import { getRealm } from '../core.js';

/* -------------------------------------------------------------------------- */
/*                                    STATE                                   */
/* -------------------------------------------------------------------------- */

const state = {
  allResources: [],
  root: null,
  amount: 1,
  tree: null, 
  pan: { x: 0, y: 0, scale: 1 },
  dragging: false,
  lastPos: { x: 0, y: 0 }
};

const els = {
  container: document.getElementById('tree-container'),
  content: document.getElementById('tree-content'),
  svg: document.getElementById('connections-layer'),
  nodes: document.getElementById('nodes-layer'),
  select: document.getElementById('resource-select'),
  qty: document.getElementById('amount-input'),
  marketVal: document.getElementById('market-val'),
  totalCost: document.getElementById('total-cost'),
  badge: document.getElementById('profit-badge')
};

/* -------------------------------------------------------------------------- */
/*                               INITIALIZATION                               */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupHeader();
  setupInteractions();

  const realm = getRealm();
  
  try {
    state.allResources = await SimCoApi.getAllResources(realm);
    if (!state.allResources.length) {
      window.showToast?.('Resource data unavailable. Check API connection.', 'error');
      els.nodes.innerHTML = '<div class="text-red p-4">Resource data unavailable. Check API connection.</div>';
      return;
    }
    populateSelect(state.allResources);
    
    const p = new URLSearchParams(window.location.search).get('rid');
    if(p) {
      const id = parseInt(p);
      els.select.value = id;
      loadTree(id);
    }
  } catch(e) { console.error(e); }
}

function setupHeader() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  document.getElementById('btnExport').onclick = async () => {
    const prev = { ...state.pan };
    state.pan = { x: 50, y: 50, scale: 1 };
    updateTransform();
    const canvas = await html2canvas(els.content, { backgroundColor: '#0a0e1a' });
    const link = document.createElement('a');
    link.download = `OGT-Chain.png`;
    link.href = canvas.toDataURL();
    link.click();
    state.pan = prev;
    updateTransform();
  };
}

function populateSelect(list) {
  const sorted = [...list].sort((a,b) => a.name.localeCompare(b.name));
  els.select.innerHTML = '<option value="">Select product...</option>';
  sorted.forEach(r => {
    const opt = createElement('option');
    opt.value = r.id; opt.textContent = r.name;
    els.select.appendChild(opt);
  });
}

function setupInteractions() {
  els.select.onchange = (e) => { if(e.target.value) loadTree(parseInt(e.target.value)); };
  els.qty.oninput = (e) => {
    state.amount = parseNumber(e.target.value);
    if(state.amount < 1) state.amount = 1;
    renderSummary();
  };
  
  els.container.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', drag);
  window.addEventListener('mouseup', stopDrag);
  els.container.addEventListener('wheel', (e) => {
    e.preventDefault();
    window.zoom(e.deltaY > 0 ? -0.1 : 0.1);
  }, { passive: false });
  
  window.zoom = (d) => {
    state.pan.scale = Math.max(0.2, Math.min(3, state.pan.scale + d));
    updateTransform();
  };
  window.resetView = () => {
    state.pan = { x: 50, y: 50, scale: 1 };
    updateTransform();
  };
}

/* -------------------------------------------------------------------------- */
/*                                 TREE LOGIC                                 */
/* -------------------------------------------------------------------------- */

async function loadTree(id) {
  els.nodes.innerHTML = '<div class="p-4">Building tree...</div>';
  els.svg.innerHTML = '';
  try {
    const root = await buildNode(id, 1);
    state.tree = root;
    layoutTree(root);
    els.nodes.innerHTML = '';
    renderNodeRecursive(root);
    resetView();
    renderSummary();
  } catch(e) {
    console.error(e);
    els.nodes.innerHTML = '<div class="text-red p-4">Error loading chain.</div>';
  }
}

async function buildNode(id, depth) {
  if(depth > 6) return null;
  
  const resDef = state.allResources.find(r => r.id === id);
  if(!resDef) return null;
  
  const detail = await SimCoApi.getResource(id, getRealm());
  
  let price = 0;
  try {
    const list = await SimCoApi.getExchangeListings(id, getRealm());
    if(list.length) price = list[0].price;
  } catch {}
  
  const node = {
    id: id,
    name: resDef.name,
    price: price,
    amount: 1, // Default base
    mode: 'build',
    children: [],
    w: 180, h: 120, x: 0, y: 0
  };
  
  if(detail.producedFrom && detail.producedFrom.length) {
    for(const ing of detail.producedFrom) {
      const ingDef = state.allResources.find(r => r.id === ing.resource.id);
      if(ingDef) {
        const child = await buildNode(ingDef.id, depth + 1);
        if(child) {
          child.amount = ing.amount;
          node.children.push(child);
        }
      }
    }
  } else {
    node.mode = 'buy';
    node.isRaw = true;
  }
  return node;
}

function layoutTree(node) {
  function calcSize(n) {
    if(!n.children.length || n.mode === 'buy') {
      n.treeW = n.w + 20; return;
    }
    let w = 0;
    n.children.forEach(c => { calcSize(c); w += c.treeW; });
    n.treeW = Math.max(n.w + 20, w);
  }
  calcSize(node);
  function setPos(n, x, y) {
    n.x = x + (n.treeW / 2) - (n.w / 2);
    n.y = y;
    if(n.children.length && n.mode === 'build') {
      let currentX = x;
      n.children.forEach(c => { setPos(c, currentX, y + 180); currentX += c.treeW; });
    }
  }
  setPos(node, 0, 50);
}

function renderNodeRecursive(node) {
  const el = createElement('div', `node ${node.mode==='buy'?'buy-mode':''} ${!node.children.length?'leaf':''}`);
  el.style.left = `${node.x}px`; el.style.top = `${node.y}px`;
  
  const needs = node.children.map(c => `<div class="text-xs">• ${c.amount}x ${c.name}</div>`).join('');
  
  el.innerHTML = `
    <div class="node-header"><span>${node.name}</span></div>
    <div class="node-stats">
      <div class="text-gold">$${formatMoney(node.price).replace('$','')}</div>
      ${node.mode === 'build' ? `<div class="mt-1">${needs}</div>` : ''}
    </div>
  `;
  
  if(!node.isRaw) {
    const toggle = createElement('div', 'node-toggle');
    const bld = createElement('div', node.mode==='build'?'active':'', 'Build');
    const buy = createElement('div', node.mode==='buy'?'active-buy':'', 'Buy');
    bld.onclick = () => { node.mode = 'build'; refreshVisuals(); };
    buy.onclick = () => { node.mode = 'buy'; refreshVisuals(); };
    toggle.append(bld, buy);
    el.appendChild(toggle);
  } else {
    el.innerHTML += `<div class="text-xs text-center opacity-50 mt-1">Raw Material</div>`;
  }
  els.nodes.appendChild(el);
  if(node.mode === 'build' && node.children.length) {
    node.children.forEach(child => { drawLink(node, child); renderNodeRecursive(child); });
  }
}

function refreshVisuals() {
  els.nodes.innerHTML = ''; els.svg.innerHTML = '';
  layoutTree(state.tree);
  renderNodeRecursive(state.tree);
  renderSummary();
}

function drawLink(p, c) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'connector');
  const sx = p.x + p.w/2, sy = p.y + p.h, ex = c.x + c.w/2, ey = c.y;
  path.setAttribute('d', `M ${sx} ${sy} C ${sx} ${sy+50}, ${ex} ${ey-50}, ${ex} ${ey}`);
  els.svg.appendChild(path);
}

function renderSummary() {
  if(!state.tree) return;
  const cost_per_unit = calcCost(state.tree);
  const total_cost = cost_per_unit * state.amount;
  const market_val = (state.tree?.price ?? 0) * state.amount;
  const profit = market_val - total_cost;
  const margin = market_val > 0 ? ((profit / market_val) * 100).toFixed(1) : '0.0';
  
  els.marketVal.textContent = formatMoney(market_val);
  els.totalCost.textContent = formatMoney(total_cost);
  els.badge.textContent = `${profit>=0?'+':''}${margin}%`;
  els.badge.className = `badge badge-${profit>=0?'green':'red'}`;
}

function calcCost(node) {
  if(!node) return 0;
  if(node.mode === 'buy' || node.isRaw) return node.price ?? 0;
  let cost = 0;
  (node.children ?? []).forEach(c => {
    const amount = c.amount ?? 1;
    cost += calcCost(c) * amount;
  });
  return cost;
}

function startDrag(e) { state.dragging = true; state.lastPos = { x: e.clientX, y: e.clientY }; els.container.style.cursor = 'grabbing'; }
function stopDrag() { state.dragging = false; els.container.style.cursor = 'grab'; }
function drag(e) {
  if(!state.dragging) return;
  const dx = e.clientX - state.lastPos.x, dy = e.clientY - state.lastPos.y;
  state.pan.x += dx; state.pan.y += dy;
  state.lastPos = { x: e.clientX, y: e.clientY };
  updateTransform();
}
function updateTransform() { els.content.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.pan.scale})`; }
