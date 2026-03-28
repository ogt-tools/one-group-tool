/**
 * company-compare.js | ONE Group Tools
 * Definitive Edition Logic
 * v1.0.0
 */

import { SimCoApi, SimCoToolsApi } from '../api.js';
import { getRealm } from '../core.js';
import { formatNumber, createElement } from '../utils.js';

const els = {
  idA: document.getElementById('id-a'),
  idB: document.getElementById('id-b'),
  btn: document.getElementById('compare-btn'),
  body: document.getElementById('table-body')
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  document.getElementById('btnHelp').onclick = () => document.getElementById('helpPanel').classList.toggle('open');
  els.btn.onclick = compare;
}

async function compare() {
  const idA = parseInt(els.idA.value);
  const idB = parseInt(els.idB.value);
  if (!idA || !idB || isNaN(idA) || isNaN(idB)) {
    return window.showToast('Enter valid numeric Company IDs', 'warning');
  }

  const realm = getRealm();
  els.btn.disabled = true;
  els.body.innerHTML = '<tr><td colspan="3" class="text-center p-4">Loading...</td></tr>';

  try {
    const [dataA, dataB] = await Promise.all([
      SimCoToolsApi.getCompany(idA, realm) || SimCoApi.getCompany(idA),
      SimCoToolsApi.getCompany(idB, realm) || SimCoApi.getCompany(idB)
    ]);
    if (!dataA || !dataB) throw new Error('One or both companies not found');
    render(dataA, dataB);
  } catch(e) {
    els.body.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-red">${e.message}</td></tr>`;
  }
  els.btn.disabled = false;
}

function render(a, b) {
  els.body.innerHTML = '';
  const metrics = [
    { label: 'Company Name', key: 'company', type: 'text' },
    { label: 'Level', key: 'level', type: 'number', higherIsBetter: true },
    { label: 'Rating', key: 'rating', type: 'text' },
    { label: 'Rank', key: 'rank', type: 'rank', lowerIsBetter: true },
    { label: 'Realm', key: 'realm', type: 'text' },
    { label: 'Certificate Count', key: 'certificates', type: 'number', higherIsBetter: true },
    { label: 'Base Wages', key: 'wages', type: 'number', lowerIsBetter: true }
  ];
  
  metrics.forEach(m => {
    const valA = a[m.key];
    const valB = b[m.key];
    
    let classA = '', classB = '';
    if (m.higherIsBetter || m.lowerIsBetter) {
      const numA = parseFloat(valA) || 0;
      const numB = parseFloat(valB) || 0;
      if (numA !== numB) {
        if (m.higherIsBetter) {
          if (numA > numB) classA = 'text-green font-weight-bold';
          else classB = 'text-green font-weight-bold';
        } else {
          // lowerIsBetter (Rank)
          if (numA < numB && numA > 0) classA = 'text-green font-weight-bold';
          else if (numB < numA && numB > 0) classB = 'text-green font-weight-bold';
        }
      }
    }
    
    const tr = createElement('tr');
    tr.innerHTML = `
      <td class="text-secondary">${m.label}</td>
      <td class="text-center ${classA}">${formatVal(valA, m.type)}</td>
      <td class="text-center ${classB}">${formatVal(valB, m.type)}</td>
    `;
    els.body.appendChild(tr);
  });
}

function formatVal(v, type) {
  if(v === undefined || v === null) return '—';
  if(type === 'rank' && v > 0) return '#' + v;
  if(type === 'number') return formatNumber(v);
  return v;
}
