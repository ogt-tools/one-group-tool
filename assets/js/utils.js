/**
 * utils.js | ONE Group Tools
 * Formatting and Helpers
 * v1.0.0
 */

/**
 * Format Currency: "$1,234.56"
 */
export function formatMoney(value, currency = "$") {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return currency + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format Number (Compact): "1.2M" or "1,234"
 */
export function formatNumber(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);
  }
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format Percentage: "12.5%"
 */
export function formatPercent(value, decimals = 1) {
  if (isNaN(value)) return "—";
  return value.toFixed(decimals) + "%";
}

/**
 * Parse Number Input
 */
export function parseNumber(input) {
  if (typeof input === 'string') {
    input = input.replace(/[^0-9.\-]/g, '');
  }
  const val = parseFloat(input);
  return isNaN(val) ? 0 : val;
}

/**
 * Debounce Function
 */
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Slugify String
 */
export function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Create DOM Element
 */
export function createElement(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

/**
 * Clamp value
 */
export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}
