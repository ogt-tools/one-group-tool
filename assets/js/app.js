/**
 * app.js | ONE Group Tools
 * Global Application Logic (Theme, Nav, Toast, Modal)
 * v1.0.0
 */

import { createElement } from './utils.js';
import { getSettings, setSettings } from './core.js';

/* -------------------------------------------------------------------------- */
/*                                THEME ENGINE                                */
/* -------------------------------------------------------------------------- */

function initTheme() {
  const { theme } = getSettings();
  document.documentElement.classList.remove('theme-dark', 'theme-light');
  document.documentElement.classList.add(`theme-${theme}`);
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains('theme-dark');
  const next = isDark ? 'light' : 'dark';
  
  html.classList.remove('theme-dark', 'theme-light');
  html.classList.add(`theme-${next}`);
  
  setSettings({ theme: next });
  
  // Notify charts
  document.dispatchEvent(new CustomEvent('themechange'));
  
  // Show toast
  window.showToast?.(`Switched to ${next} theme`, "info");
}

/* -------------------------------------------------------------------------- */
/*                               REALM SELECTOR                               */
/* -------------------------------------------------------------------------- */

function initRealm() {
  const { realm } = getSettings(); // Default Standard
  
  // Find buttons if they exist (in navbar)
  const btns = document.querySelectorAll('.realm-btn');
  if(btns.length) {
    btns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.realm) === realm);
      btn.addEventListener('click', () => setRealm(parseInt(btn.dataset.realm)));
    });
  }
}

function setRealm(id) {
  setSettings({ realm: id });
  
  const realmName = id === 1 ? "Entrepreneur" : "Standard";
  window.showToast?.(`Switching to ${realmName} realm...`, "info");
  
  setTimeout(() => {
    window.location.reload();
  }, 800);
}

/* -------------------------------------------------------------------------- */
/*                                TOAST SYSTEM                                */
/* -------------------------------------------------------------------------- */

const TOAST_DURATION = 4000;

class ToastSystem {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info') {
    const toast = createElement('div', `toast ${type}`);
    
    let icon = '';
    if (type === 'success') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    else if (type === 'error') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    else icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    toast.innerHTML = `${icon}<span>${message}</span>`;
    
    const closeBtn = createElement('button', '', '×');
    closeBtn.style.marginLeft = 'auto';
    closeBtn.style.fontSize = '1.25rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => this.dismiss(toast);
    toast.appendChild(closeBtn);

    this.container.appendChild(toast);

    setTimeout(() => { this.dismiss(toast); }, TOAST_DURATION);
  }

  dismiss(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300);
  }
}

const toastSystem = new ToastSystem();
window.showToast = (msg, type) => toastSystem.show(msg, type);

/* -------------------------------------------------------------------------- */
/*                                MODAL SYSTEM                                */
/* -------------------------------------------------------------------------- */

class Modal {
  constructor(id, title, content) {
    this.id = id;
    this.title = title;
    this.content = content; 
    this.overlay = null;
  }

  open() {
    // Check if open
    if (document.querySelector('.modal-overlay')) return;

    this.overlay = createElement('div', 'modal-overlay');
    Object.assign(this.overlay.style, {
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
      zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: 0, transition: 'opacity 0.2s ease'
    });

    const modalCard = createElement('div', 'modal-card');
    Object.assign(modalCard.style, {
      backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-card)',
      maxWidth: '600px', width: '90%', border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-card)', transform: 'scale(0.95)', transition: 'transform 0.2s ease'
    });

    const header = createElement('div', 'modal-header');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '1.5rem';

    const h3 = createElement('h3', '', this.title);
    const closeBtn = createElement('button', 'btn-icon', '×');
    closeBtn.style.fontSize = '1.5rem';
    closeBtn.onclick = () => this.close();

    header.append(h3, closeBtn);
    
    const body = createElement('div', 'modal-body');
    if (typeof this.content === 'string') body.innerHTML = this.content;
    else body.appendChild(this.content);

    modalCard.append(header, body);
    this.overlay.appendChild(modalCard);
    document.body.appendChild(this.overlay);

    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
      modalCard.style.transform = 'scale(1)';
    });

    this.overlay.onclick = (e) => { if (e.target === this.overlay) this.close(); };
    
    this.escListener = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this.escListener);
  }

  close() {
    if (!this.overlay) return;
    this.overlay.style.opacity = '0';
    this.overlay.firstChild.style.transform = 'scale(0.95)';
    document.removeEventListener('keydown', this.escListener);
    setTimeout(() => { if (this.overlay) this.overlay.remove(); }, 200);
  }
}

window.Modal = Modal;

/* -------------------------------------------------------------------------- */
/*                                GLOBAL INIT                                 */
/* -------------------------------------------------------------------------- */

function initializeApp() {
  initTheme();
  initRealm();
  
  // Theme Toggle Button Logic
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  // Mobile Menu Toggle
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.toggle('mobile-open');
  });

  // Feather Icons (Post-Load)
  if (window.feather) window.feather.replace();

  // Active Nav Detection
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href.endsWith(path) || (path === 'index.html' && href === 'index.html') || (path === '' && href === 'index.html'))) {
      link.classList.add('active');
    }
  });

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Toggle Theme: Alt + T
    if (e.altKey && e.key === 't') {
      toggleTheme();
    }
    // Help: ?
    if (e.key === '?' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      showShortcuts();
    }
  });
}

// Ensure init runs
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

function showShortcuts() {
  const html = `
    <div class="grid-2">
      <div><code class="text-gold">?</code> Help</div>
      <div><code class="text-gold">Alt + T</code> Toggle Theme</div>
      <div><code class="text-gold">Esc</code> Close Modal</div>
      <div><code class="text-gold">Alt + H</code> Home</div>
    </div>
  `;
  new Modal('shortcuts', 'Keyboard Shortcuts', html).open();
}

export { ToastSystem, Modal, initTheme };
