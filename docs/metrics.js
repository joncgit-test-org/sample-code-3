const METRICS_URL = 'parity-metrics.json';

// Fix Performance: grouped tile definitions
const fixMergedDefinitions = [
  {
    key: 'merged',
    label: 'Merged Fix PRs',
    tooltip: 'Number of fix pull requests merged in the period.',
  },
  {
    key: 'mergedPercent',
    label: 'Merged Rate',
    format: v => v.toFixed(1) + '%',
    compute: data => {
      const total = data.total ?? 0;
      const merged = data.merged ?? 0;
      if (!total) return 0;
      return (merged / total) * 100;
    },
    tooltip: 'Merged PRs as a percentage of all fix PRs.',
  },
  {
    key: 'avgCommentsPerPr',
    label: 'Comments per PR',
    format: v => v.toFixed(1),
    tooltip: 'Average number of review comments per merged fix PR.',
  },
  {
    key: 'avgCommitsPerPr',
    label: 'Commits per PR',
    format: v => v.toFixed(1),
    tooltip: 'Average number of commits per merged fix PR.',
  },
  {
    key: 'avgDaysToMerge',
    label: 'Time to Merge',
    format: v => v.toFixed(2) + ' days',
    tooltip: 'Average number of days from PR creation to merge.',
  },
];

const fixOpenDefinitions = [
  {
    key: 'open',
    label: 'Open Fix PRs',
    tooltip: 'Number of fix pull requests currently open.',
  },
  {
    key: 'avgOpenPrAgeDays',
    label: 'Avg Open PR Age',
    format: v => v.toFixed(2) + ' days',
    tooltip: 'Average age in days of currently open fix PRs.',
  },
];

const fixClosedDefinitions = [
  {
    key: 'closedNotMerged',
    label: 'Closed PRs',
    tooltip: 'Fix pull requests closed without being merged.',
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
  // New data format has a single aggregate `fixPrs` object without per-language breakdown.
  if (!metrics || !metrics.fixPrs) return null;

  if (scope === 'overall') {
    return metrics.fixPrs;
  }

  // For language-specific scopes, fall back to overall until per-language data is added again.
  return metrics.fixPrs;
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

function renderDefinitionGroup(containerId, definitions, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!data) {
    container.innerHTML = '<div class="error">No metrics available for this scope.</div>';
    return;
  }

  definitions.forEach(def => {
    const valueSource = def.compute ? def.compute(data) : data[def.key];
    if (valueSource === undefined || valueSource === null || Number.isNaN(valueSource)) return;

    let displayValue;
    if (def.format) {
      displayValue = def.format(valueSource);
    } else if (typeof valueSource === 'number') {
      displayValue = Number.isInteger(valueSource)
        ? valueSource.toString()
        : valueSource.toFixed(2);
    } else {
      displayValue = String(valueSource);
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

    const valueEl = document.createElement('div');
    valueEl.className = 'stat-value';
    valueEl.textContent = displayValue;
    card.appendChild(valueEl);

    container.appendChild(card);
  });
}

function renderFixStats() {
  const scopeData = getScopeFixMetrics(currentScope);
  renderDefinitionGroup('fix-merged-grid', fixMergedDefinitions, scopeData);
  renderDefinitionGroup('fix-open-grid', fixOpenDefinitions, scopeData);
  renderDefinitionGroup('fix-closed-grid', fixClosedDefinitions, scopeData);
}

function renderChart() {
  const scopeData = getScopeFixMetrics(currentScope);
  const errorEl = document.getElementById('chart-error');
  const labelEl = document.getElementById('chart-scope-label');

  const scopeLabelMap = {
    overall: 'Overall (last 7 days)',
    python: 'Python (fallback to overall)',
    dotnet: '.NET (fallback to overall)',
    nodejs: 'Node.js (fallback to overall)',
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

// Note: there is a second renderCurrentFixes below that renders the list view.

function renderAnalysisStats() {
  if (!metrics || !metrics.analysis) {
    const merged = document.getElementById('analysis-merged-grid');
    const open = document.getElementById('analysis-open-grid');
    if (merged) {
      merged.innerHTML = '<div class="error">No analysis metrics available.</div>';
    }
    if (open) {
      open.innerHTML = '';
    }
    return;
  }

  const analysis = metrics.analysis;

  const mergedContainer = document.getElementById('analysis-merged-grid');
  const openContainer = document.getElementById('analysis-open-grid');

  if (mergedContainer) {
    mergedContainer.innerHTML = '';
    const mergedCards = [
      {
        label: 'Merged Analysis PRs',
        value: analysis.mergedPrs ?? 0,
        tooltip: 'Number of analysis PRs merged in the period.',
      },
      {
        label: 'Merged PR %',
        value: ((analysis.mergedPrPercent ?? 0).toFixed
          ? analysis.mergedPrPercent.toFixed(1)
          : Number(analysis.mergedPrPercent || 0).toFixed(1)) + '%',
        tooltip: 'Share of analysis PRs that have been merged.',
      },
      {
        label: 'Time to Merge PRs',
        value: (analysis.avgPrDaysToMerge ?? 0).toFixed(2) + ' days',
        tooltip: 'Average days from analysis PR creation to merge.',
      },
      {
        label: 'Issue Close Time',
        value: (analysis.avgIssueDaysOpenToClose ?? 0).toFixed(2) + ' days',
        tooltip: 'Average time to close analysis issues.',
      },
    ];

    mergedCards.forEach(card => {
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

      mergedContainer.appendChild(el);
    });
  }

  if (openContainer) {
    openContainer.innerHTML = '';
    const openCards = [
      {
        label: 'Open Analysis PRs',
        value: analysis.openPrs ?? 0,
        tooltip: 'Number of currently open analysis PRs.',
      },
      {
        label: 'Closed (Not Merged)',
        value: analysis.closedPrs ?? 0,
        tooltip: 'Analysis PRs closed without being merged.',
      },
      {
        label: 'Time Since Last PR',
        value: (analysis.timeSinceLastAnalysisPrDays ?? 0).toFixed(1) + ' days',
        tooltip: 'Time since the last analysis PR was created.',
      },
    ];

    openCards.forEach(card => {
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

      openContainer.appendChild(el);
    });
  }
}

function aggregateWorkflows() {
  if (!metrics || !metrics.workflows) return null;
  const workflows = metrics.workflows;
  const keys = Object.keys(workflows);
  if (!keys.length) return null;

  const agg = {
    totalRuns: 0,
    success: 0,
    failure: 0,
    skipped: 0,
    cancelled: 0,
  };

  keys.forEach(k => {
    const w = workflows[k];
    agg.totalRuns += w.totalRuns ?? 0;
    agg.success += w.success ?? 0;
    agg.failure += w.failure ?? 0;
    agg.skipped += w.skipped ?? 0;
    agg.cancelled += w.cancelled ?? 0;
  });

  agg.successRate = agg.totalRuns ? (agg.success / agg.totalRuns) * 100 : 0;
  return agg;
}

function getWorkflowMetrics(key) {
  if (!metrics || !metrics.workflows) return null;
  if (key === 'all') {
    return aggregateWorkflows();
  }
  const w = metrics.workflows[key];
  if (!w) return null;
  return {
    totalRuns: w.totalRuns ?? 0,
    success: w.success ?? 0,
    failure: w.failure ?? 0,
    skipped: w.skipped ?? 0,
    cancelled: w.cancelled ?? 0,
    successRate: w.successRate ?? (w.totalRuns ? (w.success / w.totalRuns) * 100 : 0),
  };
}

function renderWorkflowStats(currentWorkflowKey) {
  const container = document.getElementById('workflow-stats-grid');
  if (!container) return;
  container.innerHTML = '';

  const data = getWorkflowMetrics(currentWorkflowKey);
  if (!data) {
    container.innerHTML = '<div class="error">No workflow metrics available.</div>';
    return;
  }

  const cards = [
    {
      label: 'Success Rate',
      value: (data.successRate ?? 0).toFixed(1) + '%',
      tooltip: 'Percentage of workflow runs that completed successfully.',
    },
    {
      label: 'Successful Runs',
      value: data.success ?? 0,
      tooltip: 'Number of successful workflow runs in the period.',
    },
    {
      label: 'Total Runs',
      value: data.totalRuns ?? 0,
      tooltip: 'Total number of workflow runs in the period.',
    },
    {
      label: 'Failed Runs',
      value: data.failure ?? 0,
      tooltip: 'Number of workflow runs that failed.',
    },
    {
      label: 'Skipped Runs',
      value: data.skipped ?? 0,
      tooltip: 'Number of workflow runs that were skipped.',
    },
    {
      label: 'Cancelled Runs',
      value: data.cancelled ?? 0,
      tooltip: 'Number of workflow runs that were cancelled.',
    },
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

    container.appendChild(el);
  });
}

// Current Fixes list rendering has been removed for now per design.

function setupWorkflowSwitcher() {
  const control = document.getElementById('workflow-segment-control');
  if (!control) return;

  let currentWorkflowKey = 'all';

  control.addEventListener('click', e => {
    const btn = e.target.closest('button[data-workflow]');
    if (!btn) return;
    const key = btn.dataset.workflow;
    if (!key || key === currentWorkflowKey) return;

    currentWorkflowKey = key;

    control.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b === btn);
    });

    renderWorkflowStats(currentWorkflowKey);
  });

  renderWorkflowStats(currentWorkflowKey);
}

window.addEventListener('load', async () => {
  try {
    metrics = await loadMetrics();
    initChartContext();
    setupScopeSwitcher();
    setupWorkflowSwitcher();
    renderGeneratedAt();
    renderFixStats();
    renderChart();
    renderAnalysisStats();
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