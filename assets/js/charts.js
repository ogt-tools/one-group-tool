/**
 * charts.js | ONE Group Tools
 * Theme-aware Chart.js manager
 * v1.0.0
 */

// Registry of active charts
const chartRegistry = {};

// Get current CSS variable values
function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    textPrimary: style.getPropertyValue('--text-primary').trim(),
    textSecondary: style.getPropertyValue('--text-secondary').trim(),
    bgCard: style.getPropertyValue('--bg-card').trim(),
    borderSubtle: style.getPropertyValue('--border-subtle').trim(),
    accentGold: style.getPropertyValue('--accent-gold').trim(),
    accentTeal: style.getPropertyValue('--accent-teal').trim(),
    accentGreen: style.getPropertyValue('--accent-green').trim(),
    accentRed: style.getPropertyValue('--accent-red').trim()
  };
}

// Apply global defaults based on theme
function applyChartTheme() {
  const c = getThemeColors();
  
  if (!window.Chart) return;

  Chart.defaults.color = c.textSecondary;
  Chart.defaults.borderColor = c.borderSubtle;
  Chart.defaults.font.family = "'Inter', sans-serif";
  
  // Tooltip
  Chart.defaults.plugins.tooltip.backgroundColor = c.bgCard;
  Chart.defaults.plugins.tooltip.titleColor = c.textPrimary;
  Chart.defaults.plugins.tooltip.bodyColor = c.textSecondary;
  Chart.defaults.plugins.tooltip.borderColor = c.borderSubtle;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  
  // Legend
  Chart.defaults.plugins.legend.labels.color = c.textSecondary;
}

// Create or Update a chart
export function createChart(canvasId, config) {
  // Destroy existing if any
  if (chartRegistry[canvasId]) {
    chartRegistry[canvasId].destroy();
  }
  
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  applyChartTheme();
  
  const chart = new Chart(ctx, config);
  chartRegistry[canvasId] = chart;
  return chart;
}

// Update all charts on theme change
document.addEventListener('themechange', () => {
  applyChartTheme();
  const c = getThemeColors();
  Object.values(chartRegistry).forEach(chart => {
    // Update scale colors
    if (chart.options.scales) {
      Object.values(chart.options.scales).forEach(scale => {
        if (scale.grid) scale.grid.color = c.borderSubtle;
        if (scale.ticks) scale.ticks.color = c.textSecondary;
      });
    }
    chart.update('none');
  });
});

// Initial Setup
applyChartTheme();
