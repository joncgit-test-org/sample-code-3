// Tab switching functionality
function showTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Chart.js configurations
const chartColors = {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8'
};

let charts = {};
let metricsData = null;
let currentLanguage = 'all'; // Track currently selected language

// Manual metrics data (to be updated based on evaluations)
const manualMetrics = {
    detectionAccuracy: null, // % (target: > 90)
    avgQualityScore: null, // 1-5 scale (target: > 3.5)
    qualityDistribution: [0, 0, 0, 0, 0], // [excellent(5), good(4), acceptable(3), needs work(2), poor(1)]
    developerSatisfaction: null, // 1-5 scale (target: > 4.0)
    contextUtilization: null, // % (target: > 80)
    falsePositiveRate: null // % (target: < 5)
};

// Aggregate metrics from language-specific data
function aggregateMetrics(metrics) {
    const languages = ['python', 'nodejs', 'dotnet'];
    const aggregated = {
        fixPrs: {
            total: 0,
            open: 0,
            closedNotMerged: 0,
            merged: 0,
            createdByAgent: 0,
            reviewRounds: 0,
            avgCommentsPerPr: 0,
            avgCommitsPerPr: 0,
            avgDaysToMerge: 0,
            avgOpenPrAgeDays: 0
        },
        fixIssues: {
            open: 0,
            closed: 0,
            assignedToAgent: 0,
            closedCompleted: 0,
            closedNotPlanned: 0,
            staleCount: 0,
            avgOpenIssueAgeDays: 0
        }
    };

    let totalMerged = 0;
    let totalOpen = 0;
    let sumAvgDaysToMerge = 0;
    let sumAvgOpenPrAge = 0;
    let sumAvgOpenIssueAge = 0;
    let sumAvgComments = 0;
    let sumAvgCommits = 0;

    languages.forEach(lang => {
        const prKey = `${lang}FixPrs`;
        const issueKey = `${lang}FixIssues`;
        
        if (metrics[prKey]) {
            aggregated.fixPrs.total += metrics[prKey].total || 0;
            aggregated.fixPrs.open += metrics[prKey].open || 0;
            aggregated.fixPrs.closedNotMerged += metrics[prKey].closedNotMerged || 0;
            aggregated.fixPrs.merged += metrics[prKey].merged || 0;
            aggregated.fixPrs.createdByAgent += metrics[prKey].createdByAgent || 0;
            aggregated.fixPrs.reviewRounds += metrics[prKey].reviewRounds || 0;
            
            if (metrics[prKey].merged > 0) {
                totalMerged += metrics[prKey].merged;
                sumAvgDaysToMerge += (metrics[prKey].avgDaysToMerge || 0) * metrics[prKey].merged;
                sumAvgComments += (metrics[prKey].avgCommentsPerPr || 0) * metrics[prKey].merged;
                sumAvgCommits += (metrics[prKey].avgCommitsPerPr || 0) * metrics[prKey].merged;
            }
            
            if (metrics[prKey].open > 0) {
                totalOpen += metrics[prKey].open;
                sumAvgOpenPrAge += (metrics[prKey].avgOpenPrAgeDays || 0) * metrics[prKey].open;
            }
        }
        
        if (metrics[issueKey]) {
            aggregated.fixIssues.open += metrics[issueKey].open || 0;
            aggregated.fixIssues.closed += metrics[issueKey].closed || 0;
            aggregated.fixIssues.assignedToAgent += metrics[issueKey].assignedToAgent || 0;
            aggregated.fixIssues.closedCompleted += metrics[issueKey].closedCompleted || 0;
            aggregated.fixIssues.closedNotPlanned += metrics[issueKey].closedNotPlanned || 0;
            aggregated.fixIssues.staleCount += metrics[issueKey].staleCount || 0;
            
            if (metrics[issueKey].open > 0) {
                sumAvgOpenIssueAge += (metrics[issueKey].avgOpenIssueAgeDays || 0) * metrics[issueKey].open;
            }
        }
    });

    // Calculate weighted averages
    aggregated.fixPrs.avgDaysToMerge = totalMerged > 0 ? sumAvgDaysToMerge / totalMerged : 0;
    aggregated.fixPrs.avgCommentsPerPr = totalMerged > 0 ? sumAvgComments / totalMerged : 0;
    aggregated.fixPrs.avgCommitsPerPr = totalMerged > 0 ? sumAvgCommits / totalMerged : 0;
    aggregated.fixPrs.avgOpenPrAgeDays = totalOpen > 0 ? sumAvgOpenPrAge / totalOpen : 0;
    aggregated.fixIssues.avgOpenIssueAgeDays = aggregated.fixIssues.open > 0 ? sumAvgOpenIssueAge / aggregated.fixIssues.open : 0;

    return aggregated;
}

// Get metrics for the selected language
function getLanguageMetrics(metrics, language) {
    if (language === 'all') {
        return aggregateMetrics(metrics);
    }
    
    const prKey = `${language}FixPrs`;
    const issueKey = `${language}FixIssues`;
    
    return {
        fixPrs: metrics[prKey] || {},
        fixIssues: metrics[issueKey] || {}
    };
}

// Load metrics from parity-metrics-latest.json
async function loadMetrics() {
    try {
        let response = await fetch('parity-metrics-latest.json');
        if (!response.ok) {
            console.warn('⚠️ parity-metrics-latest.json not found, trying dummy-metrics.json...');
            response = await fetch('dummy-metrics.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        metricsData = await response.json();
        console.log('✅ Metrics loaded successfully');
        updateDashboard(metricsData);
    } catch (error) {
        console.error('❌ Error loading metrics:', error);
        showError('Failed to load metrics data. Please ensure the metrics JSON file is accessible.');
    }
}

// Update dashboard with loaded metrics
function updateDashboard(metrics) {
    console.log('📊 Updating dashboard...');
    
    // Update volume metrics
    updateVolumeMetrics(metrics);
    
    // Update summary stats
    updateSummaryStats(metrics);
    
    // Create charts
    createOverviewChart(metrics);
    createWorkflowChart(metrics);
    createQualityChart(metrics);
    createIssuesPrsChart(metrics);
    createAnalysisChart(metrics);
    
    // Update production criteria
    updateProductionCriteria(metrics);
    
    // Update footer
    updateFooter(metrics);
    
    console.log('✅ Dashboard updated successfully');
}

// Switch language filter
function switchLanguage(language) {
    currentLanguage = language;
    
    // Update button states
    document.querySelectorAll('.language-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Refresh dashboard with filtered data
    if (metricsData) {
        updateDashboard(metricsData);
    }
}

// Update volume metric cards
function updateVolumeMetrics(metrics) {
    const langMetrics = getLanguageMetrics(metrics, currentLanguage);
    const fixPrs = langMetrics.fixPrs;
    const fixIssues = langMetrics.fixIssues;
    const analysis = metrics.analysis;
    
    // Total Fix PRs
    const totalFixPrs = fixPrs.total || 0;
    document.getElementById('total-fix-prs').textContent = totalFixPrs;
    document.getElementById('total-fix-prs').classList.remove('loading');
    document.getElementById('open-fix-prs').textContent = fixPrs.open;
    document.getElementById('open-fix-prs').classList.remove('loading');
    document.getElementById('merged-fix-prs').textContent = fixPrs.merged;
    document.getElementById('merged-fix-prs').classList.remove('loading');
    
    // Fix PR Merge Rate
    const fixMergeRate = totalFixPrs > 0 
        ? (fixPrs.merged / totalFixPrs * 100) 
        : 0;
    document.getElementById('fix-merge-rate').textContent = `${fixMergeRate.toFixed(1)}%`;
    document.getElementById('fix-merge-rate').classList.remove('loading');
    document.getElementById('fix-merge-label').textContent = `${fixPrs.merged} merged of ${totalFixPrs} total`;
    document.getElementById('fix-merge-label').classList.remove('loading');
    
    const fixMergeTrend = document.getElementById('fix-merge-trend');
    if (fixMergeRate >= 70) {
        fixMergeTrend.textContent = '✅ Meets target (>70%)';
        fixMergeTrend.className = 'trend up';
    } else {
        fixMergeTrend.textContent = `⚠️ Below target (${(70 - fixMergeRate).toFixed(1)}% gap)`;
        fixMergeTrend.className = 'trend down';
    }
    
    // Analysis PRs
    const totalAnalysisPrs = analysis.openPrs + analysis.mergedPrs + analysis.closedPrs;
    document.getElementById('analysis-prs').textContent = totalAnalysisPrs;
    document.getElementById('analysis-prs').classList.remove('loading');
    document.getElementById('analysis-open-prs').textContent = analysis.openPrs;
    document.getElementById('analysis-open-prs').classList.remove('loading');
    document.getElementById('analysis-merged-prs').textContent = analysis.mergedPrs;
    document.getElementById('analysis-merged-prs').classList.remove('loading')
    
    // Analysis PR Merge Rate
    const analysisMergeRate = (analysis.openPrs + analysis.mergedPrs + analysis.closedPrs) > 0
        ? (analysis.mergedPrs / (analysis.openPrs + analysis.mergedPrs + analysis.closedPrs) * 100)
        : 0;
    document.getElementById('analysis-merge-rate').textContent = `${analysisMergeRate.toFixed(1)}%`;
    document.getElementById('analysis-merge-rate').classList.remove('loading');
    document.getElementById('analysis-merge-label').textContent = `${analysis.mergedPrs} merged of ${analysis.openPrs + analysis.mergedPrs + analysis.closedPrs} total`;
    document.getElementById('analysis-merge-label').classList.remove('loading');
    
    const analysisTrend = document.getElementById('analysis-trend');
    if (analysisMergeRate >= 70) {
        analysisTrend.textContent = '✅ Good merge rate';
        analysisTrend.className = 'trend up';
    } else {
        analysisTrend.textContent = '⚠️ Low merge rate';
        analysisTrend.className = 'trend down';
    }
}

// Update summary statistics
function updateSummaryStats(metrics) {
    const langMetrics = getLanguageMetrics(metrics, currentLanguage);
    
    document.getElementById('avg-days-to-merge').textContent = 
        (langMetrics.fixPrs.avgDaysToMerge || 0).toFixed(2);
    
    document.getElementById('avg-comments').textContent = 
        (langMetrics.fixPrs.avgCommentsPerPr || 0).toFixed(1);
    
    document.getElementById('avg-review-rounds').textContent = 
        langMetrics.fixPrs.reviewRounds || 0;
    
    document.getElementById('stale-issues').textContent = 
        langMetrics.fixIssues.staleCount || 0;
    
    // Issues & PRs tab stats
    document.getElementById('fix-issues-completed').textContent = 
        langMetrics.fixIssues.closedCompleted || 0;
    
    document.getElementById('fix-issues-not-planned').textContent = 
        langMetrics.fixIssues.closedNotPlanned || 0;
    
    document.getElementById('prs-review-rounds').textContent = 
        langMetrics.fixPrs.reviewRounds || 0;
    
    document.getElementById('prs-by-agent').textContent = 
        langMetrics.fixPrs.createdByAgent || 0;
    
    // Manual metrics (if available)
    if (manualMetrics.detectionAccuracy !== null) {
        document.getElementById('detection-accuracy').textContent = 
            `${manualMetrics.detectionAccuracy.toFixed(1)}%`;
    } else {
        document.getElementById('detection-accuracy').textContent = 'N/A';
    }
    
    if (manualMetrics.avgQualityScore !== null) {
        document.getElementById('avg-quality-score').textContent = 
            `${manualMetrics.avgQualityScore.toFixed(1)}/5`;
    } else {
        document.getElementById('avg-quality-score').textContent = 'N/A';
    }
    
    if (manualMetrics.developerSatisfaction !== null) {
        document.getElementById('dev-satisfaction').textContent = 
            `${manualMetrics.developerSatisfaction.toFixed(1)}/5`;
    } else {
        document.getElementById('dev-satisfaction').textContent = 'N/A';
    }
    
    if (manualMetrics.contextUtilization !== null) {
        document.getElementById('context-utilization').textContent = 
            `${manualMetrics.contextUtilization.toFixed(1)}%`;
    } else {
        document.getElementById('context-utilization').textContent = 'N/A';
    }
}

// Create overview chart
function createOverviewChart(metrics) {
    if (charts.overview) charts.overview.destroy();
    
    const langMetrics = getLanguageMetrics(metrics, currentLanguage);
    
    const copilotSuccessRate = langMetrics.fixIssues.assignedToAgent > 0 
        ? ((langMetrics.fixPrs.createdByAgent || 0) / langMetrics.fixIssues.assignedToAgent * 100) 
        : 0;
    
    const fixMergeRate = (langMetrics.fixPrs.total || 0) > 0
        ? ((langMetrics.fixPrs.merged || 0) / langMetrics.fixPrs.total * 100)
        : 0;
    
    const analysisMergeRate = (metrics.analysis.openPrs + metrics.analysis.mergedPrs + metrics.analysis.closedPrs) > 0
        ? (metrics.analysis.mergedPrs / (metrics.analysis.openPrs + metrics.analysis.mergedPrs + metrics.analysis.closedPrs) * 100)
        : 0;
    
    const ctx = document.getElementById('overviewChart').getContext('2d');
    charts.overview = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [
                'Copilot PR\nSuccess Rate',
                'Fix PR\nMerge Rate',
                'Analysis PR\nMerge Rate'
            ],
            datasets: [{
                label: 'Current %',
                data: [
                    copilotSuccessRate,
                    fixMergeRate,
                    analysisMergeRate
                ],
                backgroundColor: [
                    chartColors.primary,
                    chartColors.secondary,
                    chartColors.info
                ],
                borderWidth: 0
            }, {
                label: 'Target %',
                data: [95, 70, 70],
                backgroundColor: [
                    'rgba(255, 193, 7, 0.3)',
                    'rgba(255, 193, 7, 0.3)',
                    'rgba(255, 193, 7, 0.3)'
                ],
                borderColor: [
                    chartColors.warning,
                    chartColors.warning,
                    chartColors.warning
                ],
                borderWidth: 2,
                borderDash: [5, 5]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                title: {
                    display: true,
                    text: 'Key Success Metrics vs. Production Targets',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Percentage (%)' }
                }
            }
        }
    });
}

// Create workflow chart
function createWorkflowChart(metrics) {
    if (charts.workflow) charts.workflow.destroy();
    
    const workflows = metrics.workflows;
    
    const ctx = document.getElementById('workflowChart').getContext('2d');
    charts.workflow = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [
                'AI Parity Scan',
                'Scan Merge',
                'Issue Creation',
                'Metrics'
            ],
            datasets: [{
                label: 'Success',
                data: [
                    workflows.aiParityScan.success,
                    workflows.aiParityScanMerge.success,
                    workflows.aiParityIssueCreation.success,
                    workflows.aiParityMaintenanceMetrics.success
                ],
                backgroundColor: chartColors.success
            }, {
                label: 'Failure',
                data: [
                    workflows.aiParityScan.failure,
                    workflows.aiParityScanMerge.failure,
                    workflows.aiParityIssueCreation.failure,
                    workflows.aiParityMaintenanceMetrics.failure
                ],
                backgroundColor: chartColors.danger
            }, {
                label: 'Cancelled',
                data: [
                    workflows.aiParityScan.cancelled,
                    workflows.aiParityScanMerge.cancelled,
                    workflows.aiParityIssueCreation.cancelled,
                    workflows.aiParityMaintenanceMetrics.cancelled
                ],
                backgroundColor: chartColors.warning
            }, {
                label: 'Skipped',
                data: [
                    workflows.aiParityScan.skipped,
                    workflows.aiParityScanMerge.skipped,
                    workflows.aiParityIssueCreation.skipped,
                    workflows.aiParityMaintenanceMetrics.skipped
                ],
                backgroundColor: '#6c757d'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                title: {
                    display: true,
                    text: 'Workflow Runs Status (Last 7 Days)',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        footer: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            const workflowNames = ['aiParityScan', 'aiParityScanMerge', 'aiParityIssueCreation', 'aiParityMaintenanceMetrics'];
                            const workflow = workflows[workflowNames[index]];
                            return `Success Rate: ${workflow.successRate.toFixed(1)}%\nAvg Duration: ${workflow.avgDurationSeconds.toFixed(1)}s`;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: 'Number of Runs' }
                }
            }
        }
    });
}

// Create quality chart (manual data)
function createQualityChart(metrics) {
    if (charts.quality) charts.quality.destroy();
    
    const hasManualData = manualMetrics.qualityDistribution.some(val => val > 0);
    
    const ctx = document.getElementById('qualityChart').getContext('2d');
    charts.quality = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [
                'Excellent (5)',
                'Good (4)',
                'Acceptable (3)',
                'Needs Work (2)',
                'Poor (1)'
            ],
            datasets: [{
                data: hasManualData ? manualMetrics.qualityDistribution : [1, 1, 1, 1, 1],
                backgroundColor: [
                    chartColors.success,
                    chartColors.info,
                    chartColors.warning,
                    '#fd7e14',
                    chartColors.danger
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                title: {
                    display: true,
                    text: hasManualData ? 'Implementation Quality Score Distribution' : 'Implementation Quality Score Distribution (Placeholder)',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (!hasManualData) return 'No data - Requires manual review';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create issues & PRs chart
function createIssuesPrsChart(metrics) {
    if (charts.issuesPrs) charts.issuesPrs.destroy();
    
    const langMetrics = getLanguageMetrics(metrics, currentLanguage);
    
    const ctx = document.getElementById('issuesPrsChart').getContext('2d');
    charts.issuesPrs = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Fix Issues', 'Fix PRs', 'Analysis Issues', 'Analysis PRs'],
            datasets: [{
                label: 'Open',
                data: [
                    langMetrics.fixIssues.open || 0,
                    langMetrics.fixPrs.open || 0,
                    metrics.analysis.openIssues || 0,
                    metrics.analysis.openPrs || 0
                ],
                backgroundColor: chartColors.info
            }, {
                label: 'Closed/Not Merged',
                data: [
                    langMetrics.fixIssues.closed || 0,
                    langMetrics.fixPrs.closedNotMerged || 0,
                    metrics.analysis.closedIssues || 0,
                    metrics.analysis.closedPrs || 0
                ],
                backgroundColor: chartColors.warning
            }, {
                label: 'Merged',
                data: [
                    0, // Issues don't get merged
                    langMetrics.fixPrs.merged || 0,
                    0, // Issues don't get merged
                    metrics.analysis.mergedPrs || 0
                ],
                backgroundColor: chartColors.success
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                title: {
                    display: true,
                    text: 'Issues & PRs Status Breakdown',
                    font: { size: 16 }
                }
            },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: 'Count' }
                }
            }
        }
    });
}

// Create analysis chart
function createAnalysisChart(metrics) {
    if (charts.analysis) charts.analysis.destroy();
    
    const analysis = metrics.analysis;
    
    const ctx = document.getElementById('analysisChart').getContext('2d');
    charts.analysis = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [
                'Average Days\nto Merge',
                'Average Days Issue\nOpen to Close',
                'Days Since Last\nAnalysis PR',
                'Days Since Last\nAnalysis Issue'
            ],
            datasets: [{
                label: 'Days',
                data: [
                    analysis.avgPrDaysToMerge,
                    analysis.avgIssueDaysOpenToClose,
                    analysis.timeSinceLastAnalysisPrDays,
                    analysis.timeSinceLastAnalysisIssueDays
                ],
                backgroundColor: [
                    chartColors.primary,
                    chartColors.secondary,
                    chartColors.info,
                    chartColors.warning
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Analysis Pipeline Time Metrics',
                    font: { size: 16 }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: function(value) {
                        return value.toFixed(1);
                    },
                    font: {
                        weight: 'bold',
                        size: 12
                    },
                    color: '#333'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Days' }
                }
            }
        },
        plugins: [{
            afterDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const data = dataset.data[index];
                        ctx.fillStyle = '#333';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(data.toFixed(1), bar.x, bar.y - 5);
                    });
                });
            }
        }]
    });
}

// Update production criteria
function updateProductionCriteria(metrics) {
    const langMetrics = getLanguageMetrics(metrics, currentLanguage);
    
    const copilotSuccessRate = langMetrics.fixIssues.assignedToAgent > 0 
        ? ((langMetrics.fixPrs.createdByAgent || 0) / langMetrics.fixIssues.assignedToAgent * 100) 
        : 0;
    
    // Calculate overall workflow failure rate
    const workflows = metrics.workflows;
    const totalRuns = workflows.aiParityScan.totalRuns + 
                     workflows.aiParityScanMerge.totalRuns + 
                     workflows.aiParityIssueCreation.totalRuns + 
                     workflows.aiParityMaintenanceMetrics.totalRuns;
    const totalFailures = workflows.aiParityScan.failure + 
                         workflows.aiParityScanMerge.failure + 
                         workflows.aiParityIssueCreation.failure + 
                         workflows.aiParityMaintenanceMetrics.failure;
    const overallFailureRate = totalRuns > 0 ? (totalFailures / totalRuns * 100) : 0;
    
    document.getElementById('criteria-pr-success').textContent = `${copilotSuccessRate.toFixed(1)}%`;
    document.getElementById('criteria-failure-rate').textContent = `${overallFailureRate.toFixed(1)}%`;
    
    // Update criteria status
    const criteriaList = document.getElementById('criteria-list');
    const items = criteriaList.querySelectorAll('li');
    
    // PR Success Rate
    if (copilotSuccessRate >= 95) {
        items[0].className = 'met';
        items[0].querySelector('.status-indicator').className = 'status-indicator success';
    } else {
        items[0].className = 'not-met';
        items[0].querySelector('.status-indicator').className = 'status-indicator danger';
    }
    
    // Workflow Failure Rate
    if (overallFailureRate < 2) {
        items[1].className = 'met';
        items[1].querySelector('.status-indicator').className = 'status-indicator success';
    } else {
        items[1].className = 'not-met';
        items[1].querySelector('.status-indicator').className = 'status-indicator danger';
    }
    
    // Manual metrics remain pending until data is provided
    // Detection Accuracy, Quality Score, Dev Satisfaction, False Positive Rate stay as pending/warning
}

// Update footer with timestamp
function updateFooter(metrics) {
    const date = new Date(metrics.generatedAt);
    const formatted = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
    
    document.getElementById('last-updated').textContent = formatted;
    document.getElementById('last-updated').classList.remove('loading');
}

// Show error message
function showError(message) {
    const container = document.querySelector('.container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
    container.insertBefore(errorDiv, container.firstChild.nextSibling);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing AI Parity Metrics Dashboard...');
    loadMetrics();
});
