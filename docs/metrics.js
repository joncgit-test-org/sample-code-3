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

function renderCurrentFixes() {
  const container = document.getElementById('current-fixes-list');
  container.innerHTML = '';

  if (!metrics || !metrics.parityGaps || !Array.isArray(metrics.parityGaps.openFixIssues)) {
    container.innerHTML = '<div class="error">No open fix issues available.</div>';
    return;
  }

  const issues = metrics.parityGaps.openFixIssues;
  if (issues.length === 0) {
    container.textContent = 'No open fix issues at the moment.';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'stats-grid';

  issues.slice(0, 3).forEach(issue => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.title = `${issue.title} • Open for ${issue.ageDays.toFixed(1)} days`;

    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = `Fix Issue #${issue.issueNumber}`;

    const value = document.createElement('div');
    value.className = 'stat-value';
    value.textContent = issue.language || 'unknown';

    const meta = document.createElement('div');
    meta.className = 'stat-meta';
    const link = document.createElement('a');
    link.href = issue.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = issue.title;

    const age = issue.ageDays != null ? issue.ageDays.toFixed(1) : 'N/A';
    meta.textContent = `Open for ${age} days • `;
    meta.appendChild(link);

    card.appendChild(label);
    card.appendChild(value);
    card.appendChild(meta);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function renderAnalysisStats() {
  const container = document.getElementById('analysis-stats-grid');
  container.innerHTML = '';

  if (!metrics || !metrics.analysis || !metrics.parityGaps) {
    container.innerHTML = '<div class="error">No analysis metrics available.</div>';
    return;
  }

  const analysis = metrics.analysis;
  const gaps = metrics.parityGaps;

  const cards = [
    {
      label: 'New Gaps Identified',
      value: gaps.newGapsIdentified ?? 0,
      tooltip: 'Number of new parity gaps identified since the previous task list snapshot.'
    },
    {
      label: 'Time Since Last Analysis',
      value: (analysis.timeSinceLastAnalysisDays ?? 0).toFixed(1) + ' days',
      tooltip: 'Elapsed time in days since the most recent parity analysis issue was created.',
      link: analysis.lastAnalysis?.url || null,
      linkLabel: analysis.lastAnalysis ? `Issue #${analysis.lastAnalysis.issueNumber}` : null
    },
    {
      label: 'Current Open Fixes',
      value: gaps.openFixIssuesCount ?? (gaps.openFixIssues?.length ?? 0),
      tooltip: 'Number of currently open [AI First Parity] fix issues.'
    }
  ];

  cards.forEach(card => {
    const el = document.createElement('div');
    el.className = 'stat-card';

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = card.tooltip;
    el.appendChild(tooltip);

    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = card.label;
    el.appendChild(label);

    const value = document.createElement('div');
    value.className = 'stat-value';
    value.textContent = card.value;
    el.appendChild(value);

    if (card.link && card.linkLabel) {
      const sub = document.createElement('div');
      sub.className = 'stat-sub';
      const a = document.createElement('a');
      a.href = card.link;
      a.textContent = card.linkLabel;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.color = '#60a5fa';
      sub.appendChild(a);
      el.appendChild(sub);
    }

    container.appendChild(el);
  });
}

function renderCurrentFixes() {
  const container = document.getElementById('current-fixes-list');
  container.innerHTML = '';

  if (!metrics || !metrics.parityGaps || !Array.isArray(metrics.parityGaps.openFixIssues)) {
    container.innerHTML = '<div class="error">No open fix issues available.</div>';
    return;
  }

  const issues = metrics.parityGaps.openFixIssues;
  if (issues.length === 0) {
    container.textContent = 'No open fix issues at the moment.';
    return;
  }

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';

  issues.forEach(issue => {
    const li = document.createElement('li');
    li.style.marginBottom = '0.4rem';

    const link = document.createElement('a');
    link.href = issue.url;
    link.textContent = `#${issue.issueNumber} ${issue.title}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.color = '#60a5fa';
    link.style.textDecoration = 'none';

    const meta = document.createElement('div');
    meta.style.fontSize = '0.8rem';
    meta.style.color = '#6b7280';
    const lang = issue.language || 'unknown';
    const age = issue.ageDays != null ? issue.ageDays.toFixed(1) : 'N/A';
    meta.textContent = `${lang} • open for ${age} days`;

    li.appendChild(link);
    li.appendChild(meta);
    list.appendChild(li);
  });

  container.appendChild(list);
}

window.addEventListener('load', async () => {
  try {
    metrics = await loadMetrics();
    initChartContext();
    setupScopeSwitcher();
    renderGeneratedAt();
    renderFixStats();
    renderChart();
    renderAnalysisStats();
    renderCurrentFixes();
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