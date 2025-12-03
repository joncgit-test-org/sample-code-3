const METRICS_URL = 'parity-metrics.json';

const fixStatsDefinitions = [
  {
    key: 'total',
    label: 'Total Fix PRs',
    tooltip:
      'Total number of fix pull requests created in the evaluation period.',
  },
      {
        key: 'total',
        label: 'Total Fix PRs',
        tooltip:
          'Total number of fix pull requests created in the evaluation period.',
      },
  {
    key: 'merged',
    label: 'Merged Fix PRs',
    tooltip:
      'Number of fix pull requests that were successfully merged in the evaluation period.',
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
    tooltip: 'Average number of review comments per fix PR.',
  },
  {
    key: 'avgCommitsPerPr',
    label: 'Avg Commits / PR',
    format: v => v.toFixed(2),
    tooltip: 'Average number of commits per fix PR.',
  },
  {
    key: 'avgDaysToMerge',
    label: 'Avg Days to Merge',
    format: v => v.toFixed(2),
    tooltip: 'Average number of days from PR creation to merge.',
  },
  {
    key: 'avgOpenPrAgeDays',
    label: 'Avg Open PR Age',
    format: v => v.toFixed(2) + ' days',
    tooltip: 'Average age in days of currently open fix PRs.',
  },
  {
    key: 'avgOpenIssueAgeDays',
    label: 'Avg Open Issue Age',
    format: v => v.toFixed(2) + ' days',
    tooltip: 'Average age in days of currently open parity issues.',
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
         setupWorkflowSwitcher();
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