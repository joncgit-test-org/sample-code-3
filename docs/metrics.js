const METRICS_URL = 'parity-metrics.json';

const statDefinitions = [
  {
    key: 'total',
    label: 'Total Fix PRs',
    tooltip: 'Total number of fix pull requests created in the evaluation period for the selected scope.',
  },
  {
    key: 'merged',
    label: 'Merged Fix PRs',
    tooltip: 'Number of fix pull requests that were successfully merged in the evaluation period.',
  },
  {
    key: 'mergeRate',
    label: 'Merge Rate',
    format: v => (v * 100).toFixed(1) + '%',
    tooltip: 'Fraction of fix PRs that were merged: merged / total.',
  },
  {
    key: 'open',
    label: 'Open Fix PRs',
    tooltip: 'Number of fix pull requests that are currently open.',
  },
  {
    key: 'closedNotMerged',
    label: 'Closed (Not Merged)',
    tooltip: 'Number of fix pull requests that were closed without being merged.',
  },
  {
    key: 'avgCommentsPerPr',
    label: 'Avg Comments / PR',
    format: v => v.toFixed(2),
    tooltip: 'Average number of review comments per merged fix PR.',
  },
  {
    key: 'avgCommitsPerPr',
    label: 'Avg Commits / PR',
    format: v => v.toFixed(2),
    tooltip: 'Average number of commits per merged fix PR.',
  },
];

let metrics = null;
let currentScope = 'overall';
let chartCtx = null;
let chartData = null;

async function loadMetrics() {
  const res = await fetch(METRICS_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load metrics: ${res.status}`);
  }
  return res.json();
}

function getScopeFixMetrics(scope) {
  if (!metrics || !metrics.fixPrs) return null;

  if (scope === 'overall') {
    const { total, open, closedNotMerged, merged, mergeRate, avgCommentsPerPr, avgCommitsPerPr } =
      metrics.fixPrs;
    return { total, open, closedNotMerged, merged, mergeRate, avgCommentsPerPr, avgCommitsPerPr };
  }

  const byLang = metrics.fixPrs.byLanguage || {};
  const langData = byLang[scope];
  if (!langData) return null;
  return langData;
}

function renderGeneratedAt() {
  const el = document.getElementById('generated-at');
  if (!metrics || !metrics.generatedAt) {
    el.textContent = '';
    return;
  }
  const d = new Date(metrics.generatedAt);
  el.textContent = `Metrics generated at ${d.toUTCString()}`;
}

function renderFixStats() {
  const container = document.getElementById('fix-stats-grid');
  container.innerHTML = '';

  const scopeData = getScopeFixMetrics(currentScope);
  if (!scopeData) {
    container.innerHTML = '<div class="error">No fix metrics available for this scope.</div>';
    return;
  }

  statDefinitions.forEach(def => {
    const raw = scopeData[def.key];
    if (raw === undefined || raw === null) return;

    let displayValue;
    if (def.format) {
      displayValue = def.format(raw);
    } else if (typeof raw === 'number') {
      displayValue = Number.isInteger(raw) ? raw.toString() : raw.toFixed(2);
    } else {
      displayValue = String(raw);
    }

    const card = document.createElement('div');
    card.className = 'stat-card';

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = def.tooltip;
    card.appendChild(tooltip);

    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = def.label;
    card.appendChild(label);

    const value = document.createElement('div');
    value.className = 'stat-value';
    value.textContent = displayValue;
    card.appendChild(value);

    container.appendChild(card);
  });
}

function renderChart() {
  const scopeData = getScopeFixMetrics(currentScope);
  const errorEl = document.getElementById('chart-error');
  const labelEl = document.getElementById('chart-scope-label');

  const scopeLabelMap = {
    overall: 'Overall (last period)',
    python: 'Python (last period)',
    dotnet: '.NET (last period)',
    nodejs: 'Node.js (last period)',
  };
  labelEl.textContent = scopeLabelMap[currentScope] || 'Selected scope';

  if (!scopeData) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'No data available to render chart for this scope.';
    clearChart();
    return;
  }

  errorEl.style.display = 'none';

  const open = scopeData.open || 0;
  const merged = scopeData.merged || 0;
  const closed = scopeData.closedNotMerged || 0;

  chartData = { open, merged, closed };

  drawBarChart();
}

function clearChart() {
  if (!chartCtx) return;
  const canvas = chartCtx.canvas;
  chartCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBarChart() {
  if (!chartCtx || !chartData) return;
  const canvas = chartCtx.canvas;
  const ctx = chartCtx;
  const { width, height } = canvas;

  ctx.clearRect(0, 0, width, height);

  const values = [chartData.open, chartData.merged, chartData.closed];
  const labels = ['Open', 'Merged', 'Closed'];
  const colors = ['#f97316', '#22c55e', '#ef4444'];

  const max = Math.max(...values, 1);
  const padding = { top: 20, right: 20, bottom: 35, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / (values.length * 1.6);

  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  values.forEach((val, i) => {
    const xCenter =
      padding.left + (i + 0.5) * (chartWidth / values.length);
    const barHeight = (val / max) * chartHeight;
    const yTop = padding.top + (chartHeight - barHeight);

    // Bar
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.roundRect(
      xCenter - barWidth / 2,
      yTop,
      barWidth,
      barHeight,
      6
    );
    ctx.fill();

    // Value label
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(val.toString(), xCenter, yTop - 14);

    // X label
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(labels[i], xCenter, padding.top + chartHeight + 6);
  });
}

function setupScopeSwitcher() {
  const control = document.getElementById('segment-control');
  control.addEventListener('click', e => {
    const btn = e.target.closest('button[data-scope]');
    if (!btn) return;
    const scope = btn.dataset.scope;
    if (scope === currentScope) return;

    currentScope = scope;

    control.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b === btn)
    );

    renderFixStats();
    renderChart();
  });
}

function initChartContext() {
  const canvas = document.getElementById('fix-state-chart');
  // Make canvas resolution match CSS size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  chartCtx = canvas.getContext('2d');
  chartCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

window.addEventListener('load', async () => {
  try {
    metrics = await loadMetrics();
    initChartContext();
    setupScopeSwitcher();
    renderGeneratedAt();
    renderFixStats();
    renderChart();
  } catch (err) {
    console.error(err);
    const grid = document.getElementById('fix-stats-grid');
    grid.innerHTML =
      '<div class="error">Failed to load metrics. Check that parity-metrics.json is present and accessible.</div>';
  }
});

window.addEventListener('resize', () => {
  if (!chartCtx) return;
  initChartContext();
  renderChart();
});