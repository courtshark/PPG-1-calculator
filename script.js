// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const ROW_COUNT = 9;
const COLUMN_COUNT = 4;
const Z_SCORE_95 = 1.96;
const MIN_MARGIN_OF_ERROR = 2;
const MINIMUM_REPORTABLE_N = 10;
const STORAGE_PREFIX = 'ppg1_';

// ─────────────────────────────────────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'race',       label: 'Race/Ethnicity',   defaultSubgroups: ['Am Ind/Ntv Alsk','Asian','Black','Hispanic/Latinx','More than one','Unknown','White','',''] },
  { id: 'gender',     label: 'Gender',            defaultSubgroups: ['Men','Women','Non-binary/Other','Unknown','','','','',''] },
  { id: 'age',        label: 'Age',               defaultSubgroups: ['Under 18','18–24','25–39','40+','Unknown','','','',''] },
  { id: 'disability', label: 'Disability Status', defaultSubgroups: ['Students with Disability','Students without Disability','','','','','','',''] },
  { id: 'foster',     label: 'Foster Youth',      defaultSubgroups: ['Foster Youth','Non-Foster Youth','','','','','','',''] },
  { id: 'veterans',   label: 'Veterans',          defaultSubgroups: ['Veterans','Non-Veterans','','','','','','',''] },
];

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
let activeTabId = 'race';
let ppg1Chart = null;
let ppgResults = []; // [col][row] computed results

// ─────────────────────────────────────────────────────────────────────────────
// DOMContentLoaded
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildTabBar();
  setupActionButtons();
  setupInputListeners();

  const sharedState = decodeStateFromUrl();
  if (sharedState) {
    applySharedState(sharedState);
  } else {
    activeTabId = localStorage.getItem(STORAGE_PREFIX + 'activeTab') || 'race';
    updateTabBar();
    loadTabState(activeTabId);
  }

  initializeSubgroups();
  initializeYearHeaders();
  initChart();
  recalculateAll();
});

// ─────────────────────────────────────────────────────────────────────────────
// Tab management
// ─────────────────────────────────────────────────────────────────────────────
function buildTabBar() {
  const nav = document.getElementById('tabBar');
  TABS.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => switchTab(tab.id));
    nav.appendChild(btn);
  });
}

function updateTabBar() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeTabId);
    btn.setAttribute('aria-selected', btn.dataset.tab === activeTabId);
  });
}

function switchTab(tabId) {
  saveTabState(activeTabId);
  activeTabId = tabId;
  localStorage.setItem(STORAGE_PREFIX + 'activeTab', tabId);
  updateTabBar();
  loadTabState(tabId);
  initializeSubgroups();
  initializeYearHeaders();
  recalculateAll();
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage — save & load
// ─────────────────────────────────────────────────────────────────────────────
function storageKey(tabId, inputId) {
  return `${STORAGE_PREFIX}${tabId}_${inputId}`;
}

function saveTabState(tabId) {
  const year0El = document.getElementById('year-0');
  if (year0El) localStorage.setItem(storageKey(tabId, 'year-0'), year0El.value);

  for (let row = 0; row < ROW_COUNT; row++) {
    const sgEl = document.getElementById(`inputSubgroup-${row}`);
    if (sgEl) localStorage.setItem(storageKey(tabId, `inputSubgroup-${row}`), sgEl.value);
    for (let col = 0; col < COLUMN_COUNT; col++) {
      const nEl = document.getElementById(`inputNumerator-${row}-${col}`);
      const dEl = document.getElementById(`inputDenominator-${row}-${col}`);
      if (nEl) localStorage.setItem(storageKey(tabId, `inputNumerator-${row}-${col}`), nEl.value);
      if (dEl) localStorage.setItem(storageKey(tabId, `inputDenominator-${row}-${col}`), dEl.value);
    }
  }
}

function loadTabState(tabId) {
  const tab = TABS.find(t => t.id === tabId);
  const defaults = tab ? tab.defaultSubgroups : [];

  // Year — inherit current year if tab has never been visited
  const savedYear = localStorage.getItem(storageKey(tabId, 'year-0'));
  const year0El = document.getElementById('year-0');
  if (year0El) year0El.value = savedYear || year0El.value || '2020-21';

  for (let row = 0; row < ROW_COUNT; row++) {
    const savedSg = localStorage.getItem(storageKey(tabId, `inputSubgroup-${row}`));
    const sgEl = document.getElementById(`inputSubgroup-${row}`);
    if (sgEl) sgEl.value = savedSg !== null ? savedSg : (defaults[row] || '');

    for (let col = 0; col < COLUMN_COUNT; col++) {
      const savedN = localStorage.getItem(storageKey(tabId, `inputNumerator-${row}-${col}`));
      const savedD = localStorage.getItem(storageKey(tabId, `inputDenominator-${row}-${col}`));
      const nEl = document.getElementById(`inputNumerator-${row}-${col}`);
      const dEl = document.getElementById(`inputDenominator-${row}-${col}`);
      if (nEl) nEl.value = savedN || '';
      if (dEl) dEl.value = savedD || '';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Input listeners & auto-save
// ─────────────────────────────────────────────────────────────────────────────
function setupInputListeners() {
  document.querySelectorAll('.inputNumerator, .inputDenominator').forEach(input => {
    input.min = '0';
    input.step = '1';
    input.inputMode = 'numeric';
    input.addEventListener('input', () => {
      localStorage.setItem(storageKey(activeTabId, input.id), input.value);
      recalculateAll();
    });
  });

  document.querySelectorAll('#numeratorTable .inputSubgroup').forEach((input, row) => {
    input.addEventListener('input', () => {
      updateSubgroup(row, input.value);
      localStorage.setItem(storageKey(activeTabId, input.id), input.value);
    });
  });

  const year0El = document.getElementById('year-0');
  year0El.addEventListener('input', () => {
    updateYearHeaders(year0El.value);
    localStorage.setItem(storageKey(activeTabId, 'year-0'), year0El.value);
  });
}

function setupActionButtons() {
  document.getElementById('btnImport').addEventListener('click', openImportModal);
  document.getElementById('btnExport').addEventListener('click', exportCSV);
  document.getElementById('btnShare').addEventListener('click', shareLink);
  document.getElementById('btnPrint').addEventListener('click', () => window.print());
  document.getElementById('btnClear').addEventListener('click', clearAll);

  // Modal close buttons
  document.getElementById('importClose').addEventListener('click', closeImportModal);
  document.getElementById('importCancel').addEventListener('click', closeImportModal);
  document.getElementById('importRawCancel').addEventListener('click', closeImportModal);
  document.getElementById('importOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('importOverlay')) closeImportModal();
  });

  // Pre-aggregated import
  document.getElementById('importApply').addEventListener('click', applyImport);

  // Raw import
  document.getElementById('importDetect').addEventListener('click', detectRawColumns);
  document.getElementById('importRawApply').addEventListener('click', applyRawImport);

  // Import mode tabs
  document.querySelectorAll('.import-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.import-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      document.getElementById('importModeRaw').classList.toggle('hidden', mode !== 'raw');
      document.getElementById('importModeAgg').classList.toggle('hidden', mode !== 'agg');
    });
  });

  // Auto-detect on paste into raw textarea
  document.getElementById('importRawPaste').addEventListener('paste', () => {
    setTimeout(detectRawColumns, 100);
  });

  // File upload — click or drag-and-drop
  const fileInput = document.getElementById('rawFileInput');
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  });

  const dropZone = document.getElementById('rawDropZone');
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', e => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// URL state — share & restore
// ─────────────────────────────────────────────────────────────────────────────
function encodeStateToUrl() {
  const state = {
    t: activeTabId,
    y: document.getElementById('year-0')?.value || '2020-21',
    g: [],
    n: [],
    d: [],
  };
  for (let row = 0; row < ROW_COUNT; row++) {
    state.g.push(document.getElementById(`inputSubgroup-${row}`)?.value || '');
    const nr = [], dr = [];
    for (let col = 0; col < COLUMN_COUNT; col++) {
      nr.push(document.getElementById(`inputNumerator-${row}-${col}`)?.value || '');
      dr.push(document.getElementById(`inputDenominator-${row}-${col}`)?.value || '');
    }
    state.n.push(nr);
    state.d.push(dr);
  }
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

function decodeStateFromUrl() {
  const hash = window.location.hash;
  if (!hash.startsWith('#s=')) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(hash.slice(3)))));
  } catch { return null; }
}

function applySharedState(state) {
  activeTabId = state.t || 'race';
  localStorage.setItem(STORAGE_PREFIX + 'activeTab', activeTabId);
  updateTabBar();

  const year0El = document.getElementById('year-0');
  if (year0El) year0El.value = state.y || '2020-21';

  for (let row = 0; row < ROW_COUNT; row++) {
    const sgEl = document.getElementById(`inputSubgroup-${row}`);
    if (sgEl) sgEl.value = state.g?.[row] || '';
    for (let col = 0; col < COLUMN_COUNT; col++) {
      const nEl = document.getElementById(`inputNumerator-${row}-${col}`);
      const dEl = document.getElementById(`inputDenominator-${row}-${col}`);
      if (nEl) nEl.value = state.n?.[row]?.[col] || '';
      if (dEl) dEl.value = state.d?.[row]?.[col] || '';
    }
  }
  saveTabState(activeTabId);
}

function shareLink() {
  const encoded = encodeStateToUrl();
  const url = `${window.location.origin}${window.location.pathname}#s=${encoded}`;
  history.replaceState(null, '', `#s=${encoded}`);
  navigator.clipboard.writeText(url)
    .then(() => showToast('Link copied to clipboard!'))
    .catch(() => prompt('Copy this shareable link:', url));
}

// ─────────────────────────────────────────────────────────────────────────────
// Subgroup & year header sync
// ─────────────────────────────────────────────────────────────────────────────
function initializeSubgroups() {
  document.querySelectorAll('#numeratorTable .inputSubgroup').forEach((input, row) => {
    updateSubgroup(row, input.value);
  });
}

function initializeYearHeaders() {
  updateYearHeaders(document.getElementById('year-0').value);
}

function updateSubgroup(row, value) {
  const ids = [`successSubgroup-${row}`, `denominatorSubgroup-${row}`, `ppgSubgroup-${row}`];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

function updateYearHeaders(initialYear) {
  const match = initialYear.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return;
  const startYear = parseInt(match[1], 10);
  const endYear = parseInt(match[2], 10);
  for (let col = 0; col < COLUMN_COUNT; col++) {
    const suffix = String((endYear + col) % 100).padStart(2, '0');
    const label = `${startYear + col}-${suffix}`;
    [`year-${col}`, `success-year-${col}`, `denominator-year-${col}`, `ppg-year-${col}`].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = label;
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core calculation
// ─────────────────────────────────────────────────────────────────────────────
function recalculateAll() {
  const grid = buildDataGrid();
  calculateSuccessRates(grid);
  ppgResults = calculatePpgAnalysis(grid);
  updateDiSummary(ppgResults);
  updateChart(ppgResults);
}

function buildDataGrid() {
  return Array.from({ length: ROW_COUNT }, (_, row) =>
    Array.from({ length: COLUMN_COUNT }, (_, col) => readCell(row, col))
  );
}

function readCell(row, col) {
  const nEl = document.getElementById(`inputNumerator-${row}-${col}`);
  const dEl = document.getElementById(`inputDenominator-${row}-${col}`);
  const nRaw = parseInputValue(nEl.value);
  const dRaw = parseInputValue(dEl.value);
  const numerator = nRaw ?? 0;
  const denominator = dRaw ?? 0;
  let invalidReason = '';

  if (nRaw !== null && nRaw < 0) invalidReason = 'Outcome counts cannot be negative.';
  else if (dRaw !== null && dRaw < 0) invalidReason = 'Population counts cannot be negative.';
  else if (nRaw !== null && !Number.isInteger(nRaw)) invalidReason = 'Outcome counts must be whole numbers.';
  else if (dRaw !== null && !Number.isInteger(dRaw)) invalidReason = 'Population counts must be whole numbers.';
  else if (nRaw !== null && dRaw === null) invalidReason = 'Enter a total population count.';
  else if (denominator > 0 && numerator > denominator) invalidReason = 'Outcome counts cannot exceed subgroup total.';
  else if (denominator === 0 && numerator > 0) invalidReason = 'Subgroup total must be greater than zero.';

  syncInputState(nEl, dEl, invalidReason);
  return { row, col, numerator, denominator, hasPopulation: denominator > 0, isInvalid: invalidReason !== '', invalidReason };
}

function syncInputState(nEl, dEl, invalidReason) {
  [nEl, dEl].forEach(el => {
    el.classList.toggle('input-error', invalidReason !== '');
    if (invalidReason) el.title = invalidReason;
    else el.removeAttribute('title');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Success rates rendering
// ─────────────────────────────────────────────────────────────────────────────
function calculateSuccessRates(grid) {
  for (let row = 0; row < ROW_COUNT; row++) {
    for (let col = 0; col < COLUMN_COUNT; col++) {
      const cell = grid[row][col];
      const out = document.getElementById(`successRate-${row}-${col}`);
      clearOutputCell(out);
      if (cell.isInvalid) { renderInfoCell(out, 'Check counts', cell.invalidReason, 'status-invalid'); continue; }
      if (!cell.hasPopulation) continue;
      const rate = (cell.numerator / cell.denominator) * 100;
      out.className = 'rate-cell';
      out.innerHTML = `<div class="rate-value">${formatPercent(rate)}</div><div class="rate-meta">${cell.numerator} / ${cell.denominator}</div>`;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PPG-1 analysis rendering (with trend arrows)
// ─────────────────────────────────────────────────────────────────────────────
function calculatePpgAnalysis(grid) {
  // results[col][row]
  const results = Array.from({ length: COLUMN_COUNT }, () => Array(ROW_COUNT).fill(null));

  for (let col = 0; col < COLUMN_COUNT; col++) {
    const popCells = grid.map(r => r[col]).filter(c => !c.isInvalid && c.hasPopulation);
    const totalN = popCells.reduce((s, c) => s + c.numerator, 0);
    const totalD = popCells.reduce((s, c) => s + c.denominator, 0);

    for (let row = 0; row < ROW_COUNT; row++) {
      const cell = grid[row][col];
      const out = document.getElementById(`ppg1Value-${row}-${col}`);
      clearOutputCell(out);

      if (cell.isInvalid) { renderInfoCell(out, 'Check counts', cell.invalidReason, 'status-invalid'); continue; }
      if (!cell.hasPopulation) continue;

      if (cell.denominator <= MINIMUM_REPORTABLE_N) {
        renderInfoCell(out, 'Insufficient data', `n = ${cell.denominator}. CCCCO advises against estimating DI when n ≤ 10.`, 'status-muted');
        results[col][row] = { label: 'Insufficient data', status: 'status-muted' };
        continue;
      }

      const otherD = totalD - cell.denominator;
      if (popCells.length < 2 || otherD <= 0) {
        renderInfoCell(out, 'Need more data', 'Enter at least two populated subgroups to compare.', 'status-muted');
        results[col][row] = { label: 'Need more data', status: 'status-muted' };
        continue;
      }

      const otherN = totalN - cell.numerator;
      const sgRate = cell.numerator / cell.denominator;
      const otherRate = otherN / otherD;
      const ppg1 = (sgRate - otherRate) * 100;
      const moe = calcMOE(sgRate, cell.denominator);
      const statusObj = getPpgStatus(ppg1, moe);
      const studentsNeeded = ppg1 < 0 ? Math.round(Math.abs(ppg1 / 100) * cell.denominator) : null;

      // Trend arrow vs previous year
      const prev = col > 0 ? results[col - 1][row] : null;
      let trendHtml = '';
      if (prev && prev.ppg1 !== undefined) {
        const delta = ppg1 - prev.ppg1;
        if (Math.abs(delta) >= 0.5) {
          trendHtml = delta > 0
            ? `<span class="trend-up" title="Improving: +${delta.toFixed(1)}pp vs prior year">↑</span>`
            : `<span class="trend-dn" title="Worsening: ${delta.toFixed(1)}pp vs prior year">↓</span>`;
        } else {
          trendHtml = `<span class="trend-flat" title="Stable vs prior year">→</span>`;
        }
      }

      out.className = `analysis-cell ${statusObj.className}`;
      out.innerHTML = `
        <div class="ppg-value">${formatPercent(ppg1)}${trendHtml}</div>
        <div class="ppg-meta">All other: ${formatPercent(otherRate * 100)}</div>
        <div class="ppg-meta">Threshold E: ${formatPercent(moe)}</div>
        <div class="ppg-meta">Close gap: ${studentsNeeded === null ? '—' : studentsNeeded}</div>
        <span class="status-badge">${statusObj.label}</span>
      `;

      results[col][row] = { ppg1, moe, sgRate, otherRate, status: statusObj.className, label: statusObj.label };
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// DI Summary banner
// ─────────────────────────────────────────────────────────────────────────────
function updateDiSummary(results) {
  const container = document.getElementById('diSummary');
  if (!container) return;

  const yearLabels = Array.from({ length: COLUMN_COUNT }, (_, i) =>
    document.getElementById(`year-${i}`)?.value || `Year ${i + 1}`
  );

  const cols = [];
  for (let col = 0; col < COLUMN_COUNT; col++) {
    const flagged = [], total = [];
    for (let row = 0; row < ROW_COUNT; row++) {
      const r = results[col][row];
      if (!r) continue;
      const sg = document.getElementById(`inputSubgroup-${row}`)?.value;
      if (!sg) continue;
      total.push(sg);
      if (r.status === 'status-di') flagged.push(sg);
    }
    if (total.length > 0) cols.push({ year: yearLabels[col], flagged, total: total.length });
  }

  if (cols.length === 0) { container.innerHTML = ''; return; }

  const recent = cols[cols.length - 1];
  const anyFlagged = cols.some(c => c.flagged.length > 0);

  let html = `<div class="di-summary-inner">`;
  html += `<div class="di-summary-headline">`;
  if (recent.flagged.length === 0) {
    html += `<span class="di-badge di-badge-ok">✓ No DI flagged in ${recent.year}</span>`;
  } else {
    html += `<span class="di-badge di-badge-alert">⚠ ${recent.flagged.length} of ${recent.total} subgroup${recent.flagged.length !== 1 ? 's' : ''} DI-flagged in ${recent.year}</span>`;
  }
  html += `</div>`;

  if (anyFlagged) {
    html += `<div class="di-summary-detail">`;
    cols.forEach(c => {
      if (c.flagged.length === 0) return;
      html += `<div class="di-year-row"><strong>${c.year}:</strong> ${c.flagged.join(', ')}</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart (Chart.js horizontal bar)
// ─────────────────────────────────────────────────────────────────────────────
const zeroLinePlugin = {
  id: 'zeroLine',
  afterDraw(chart) {
    const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
    if (!x) return;
    const xPos = x.getPixelForValue(0);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xPos, top);
    ctx.lineTo(xPos, bottom);
    ctx.strokeStyle = 'rgba(20,50,74,0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }
};

function initChart() {
  const canvas = document.getElementById('ppg1Chart');
  if (!canvas || typeof Chart === 'undefined') return;
  Chart.register(zeroLinePlugin);
  ppg1Chart = new Chart(canvas, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` PPG-1: ${ctx.parsed.x.toFixed(1)}%` }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'PPG-1 (percentage points)', font: { size: 12 } },
          grid: { color: '#e0e7ef' },
          ticks: { callback: v => `${v}%` },
        },
        y: { grid: { display: false }, ticks: { font: { size: 12 } } }
      }
    }
  });
}

function updateChart(results) {
  const chartCard = document.getElementById('chartCard');
  if (!ppg1Chart) return;

  // Find most recent col with numeric PPG-1 data
  let bestCol = -1;
  for (let col = COLUMN_COUNT - 1; col >= 0; col--) {
    if (results[col].some(r => r && r.ppg1 !== undefined)) { bestCol = col; break; }
  }

  if (bestCol === -1) {
    if (chartCard) chartCard.style.display = 'none';
    ppg1Chart.data.labels = [];
    ppg1Chart.data.datasets = [];
    ppg1Chart.update();
    return;
  }

  const yearLabel = document.getElementById(`year-${bestCol}`)?.value || `Year ${bestCol + 1}`;
  const labels = [], vals = [], colors = [];

  for (let row = 0; row < ROW_COUNT; row++) {
    const r = results[bestCol][row];
    if (!r || r.ppg1 === undefined) continue;
    const sg = document.getElementById(`inputSubgroup-${row}`)?.value;
    if (!sg) continue;
    labels.push(sg);
    vals.push(parseFloat(r.ppg1.toFixed(1)));
    colors.push(
      r.status === 'status-di'    ? '#d4473b' :
      r.status === 'status-watch' ? '#c8930a' :
      r.status === 'status-high'  ? '#2d7a4f' : '#4a82a6'
    );
  }

  const titleEl = document.getElementById('chartTitle');
  if (titleEl) titleEl.textContent = `PPG-1 by Subgroup — ${yearLabel}`;

  // Adjust canvas height based on number of bars
  const height = Math.max(180, labels.length * 38 + 60);
  const canvas = document.getElementById('ppg1Chart');
  if (canvas) canvas.style.height = `${height}px`;

  ppg1Chart.data.labels = labels;
  ppg1Chart.data.datasets = [{ data: vals, backgroundColor: colors, borderRadius: 4, barThickness: 22 }];
  ppg1Chart.update();
  if (chartCard) chartCard.style.display = '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw data import — smart aggregation from student-level exports
// ─────────────────────────────────────────────────────────────────────────────

// Known gender code → label mapping
const GENDER_LABELS = { M: 'Men', F: 'Women', N: 'Non-binary/Other', B: 'Non-binary/Other' };

// Convert a numeric academic year (e.g. 2022) to "2022-23" display format
function fmtAcademicYear(year) {
  const y = parseInt(year, 10);
  if (isNaN(y)) return String(year);
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

// Heuristic column auto-detection from header array
function autoDetectColumns(header) {
  const h = header.map(c => c.toLowerCase().replace(/[\s_]/g, ''));
  // Term-priority: try each term across ALL columns before moving to the next term.
  // This ensures 'census' finds 'enrolledatcensus' before 'enrolled' finds 'crossenrolled'.
  const find = (...terms) => {
    for (const t of terms) {
      const idx = h.findIndex(c => c.includes(t));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  return {
    year:    find('academicyear', 'year', 'yr'),
    race:    find('race', 'ethnicity', 'ancestry'),
    gender:  find('gender', 'sex'),
    age:     find('agegroup', 'age'),
    success: find('success', 'successful', 'complete', 'pass'),
    total:   find('census', 'headcount', 'enrolled', 'total', 'count'),
    course:     find('course', 'section', 'crn', 'class', 'discipline', 'subject', 'program'),
    retention:  find('retention', 'retain', 'persist', 'endofterm'),
  };
}

let rawParsedRows = [];
let rawHeader = [];

// Stored after import — used by course/outcome filters to re-aggregate without re-importing
let storedRawRows    = [];
let storedRawColMap  = {};   // { yearCol, raceCol, genderCol, ageCol, successCol, totalCol }
let storedCourseCol  = -1;
let storedOutcomes   = [];   // [{ col, label }, ...] — outcomes user can switch between
let activeOutcomeIdx = 0;    // index into storedOutcomes
let activeCourseValue = '';  // '' = All Courses

function parseRaw(text) {
  // Always keep header row (raw import needs it for column detection)
  return text.split('\n')
    .map(l => l.trim()).filter(Boolean)
    .map(line => (line.includes('\t') ? line.split('\t') : line.split(',')).map(c => c.trim()));
}

// ── File upload handling ──────────────────────────────────────────────────────

function handleFileUpload(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const status = document.getElementById('rawFileStatus');
  status.textContent = '⏳ Loading…';
  status.classList.remove('hidden');

  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload  = e => loadRawRows(parseRaw(e.target.result), file.name);
    reader.onerror = () => showToast('Failed to read file.');
    reader.readAsText(file);

  } else if (ext === 'xlsx' || ext === 'xls') {
    const doRead = () => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
            .map(r => r.map(c => (c === null || c === undefined ? '' : String(c)).trim()));
          loadRawRows(rows, file.name);
        } catch {
          showToast('Could not parse Excel file — try saving as .csv first.');
          status.classList.add('hidden');
        }
      };
      reader.onerror = () => showToast('Failed to read file.');
      reader.readAsArrayBuffer(file);
    };

    if (typeof XLSX === 'undefined') {
      // Lazy-load SheetJS only when first Excel file is selected
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.20.3/dist/xlsx.full.min.js';
      script.onload  = doRead;
      script.onerror = () => {
        showToast('Could not load Excel parser — try saving as .csv first.');
        status.classList.add('hidden');
      };
      document.head.appendChild(script);
    } else {
      doRead();
    }
  } else {
    showToast('Please upload a .csv, .xlsx, or .xls file.');
    status.classList.add('hidden');
  }
}

function loadRawRows(allRows, fileName) {
  const dataRows = allRows.filter(r => r.some(c => c !== ''));
  if (dataRows.length < 2) { showToast('File appears empty.'); return; }
  rawHeader    = dataRows[0];
  rawParsedRows = dataRows.slice(1);

  const status = document.getElementById('rawFileStatus');
  status.textContent = `✓ ${fileName}  —  ${rawParsedRows.length} rows × ${rawHeader.length} columns`;
  status.classList.remove('hidden');

  triggerColumnDetection();
}

// ── Column detection UI ───────────────────────────────────────────────────────

function triggerColumnDetection() {
  const detected = autoDetectColumns(rawHeader);

  ['mapYear','mapRace','mapGender','mapAge','mapSuccess','mapTotal','mapCourse','mapRetention'].forEach((selectId, i) => {
    const sel = document.getElementById(selectId);
    const keyMap = ['year','race','gender','age','success','total','course','retention'];
    const detectedIdx = detected[keyMap[i]];
    sel.innerHTML = '<option value="-1">— not used —</option>' +
      rawHeader.map((col, idx) =>
        `<option value="${idx}"${idx === detectedIdx ? ' selected' : ''}>${col}</option>`
      ).join('');
  });

  document.getElementById('rawColumnMap').classList.remove('hidden');
  buildRawPreview(detected);
  document.getElementById('importRawApply').disabled = false;
}

function detectRawColumns() {
  const text = document.getElementById('importRawPaste').value.trim();
  if (!text && !rawParsedRows.length) { showToast('Upload a file or paste some data first.'); return; }

  if (text) {
    const rows = parseRaw(text);
    if (rows.length < 2) { showToast('Need at least a header row and one data row.'); return; }
    rawHeader     = rows[0];
    rawParsedRows = rows.slice(1);
    document.getElementById('rawFileStatus').classList.add('hidden');
  }

  triggerColumnDetection();
}

function buildRawPreview(detected) {
  const yearCol    = parseInt(document.getElementById('mapYear').value);
  const raceCol    = parseInt(document.getElementById('mapRace').value);
  const successCol = parseInt(document.getElementById('mapSuccess').value);
  const totalCol   = parseInt(document.getElementById('mapTotal').value);

  if (yearCol < 0 || raceCol < 0 || successCol < 0) {
    document.getElementById('rawPreview').innerHTML = '';
    return;
  }

  const agg = aggregateRaw(rawParsedRows, yearCol, raceCol, successCol, totalCol);
  const years = Object.keys(agg).sort();
  const subgroups = [...new Set(years.flatMap(y => Object.keys(agg[y])))].sort();

  let html = `<p class="preview-label">Preview — Race/Ethnicity aggregation (${subgroups.length} subgroups × ${years.length} years):</p>`;
  html += `<div class="preview-scroll"><table class="preview-table"><tr><th>Subgroup</th>${years.map(y => `<th>${fmtAcademicYear(y)}<br><small>S / T</small></th>`).join('')}</tr>`;
  subgroups.forEach(sg => {
    html += `<tr><td>${sg}</td>${years.map(y => {
      const c = agg[y][sg];
      return c ? `<td>${c.s} / ${c.t}</td>` : '<td>—</td>';
    }).join('')}</tr>`;
  });
  html += '</table></div>';
  document.getElementById('rawPreview').innerHTML = html;
}

function aggregateRaw(rows, yearCol, sgCol, successCol, totalCol, labelMap = null) {
  // Returns { year: { subgroup: { s, t } } }
  // Apply labelMap during aggregation so codes like M→Men, N+B→Non-binary/Other merge correctly
  const result = {};
  rows.forEach(row => {
    const year = row[yearCol]?.trim();
    let sg     = row[sgCol]?.trim();
    if (!year || !sg) return;
    if (labelMap) sg = labelMap[sg] || sg;  // Normalize label (e.g. 'N' and 'B' → 'Non-binary/Other')
    const s = parseFloat(row[successCol]) || 0;
    const t = totalCol >= 0 ? (parseFloat(row[totalCol]) || 1) : 1;
    if (!result[year]) result[year] = {};
    if (!result[year][sg]) result[year][sg] = { s: 0, t: 0 };
    result[year][sg].s += s;
    result[year][sg].t += t;
  });
  return result;
}

function applyRawImport() {
  const yearCol      = parseInt(document.getElementById('mapYear').value);
  const raceCol      = parseInt(document.getElementById('mapRace').value);
  const genderCol    = parseInt(document.getElementById('mapGender').value);
  const ageCol       = parseInt(document.getElementById('mapAge').value);
  const successCol   = parseInt(document.getElementById('mapSuccess').value);
  const totalCol     = parseInt(document.getElementById('mapTotal').value);
  const courseCol    = parseInt(document.getElementById('mapCourse').value);
  const retentionCol = parseInt(document.getElementById('mapRetention').value);

  // Store raw data + column map for dynamic re-aggregation
  storedRawRows    = rawParsedRows.slice();
  storedRawColMap  = { yearCol, raceCol, genderCol, ageCol, successCol, totalCol };
  storedCourseCol  = courseCol;
  activeCourseValue = '';

  // Build outcomes list
  storedOutcomes = [];
  if (successCol >= 0)   storedOutcomes.push({ col: successCol,   label: rawHeader[successCol]   || 'Success' });
  if (retentionCol >= 0) storedOutcomes.push({ col: retentionCol, label: rawHeader[retentionCol] || 'Retention' });
  activeOutcomeIdx = 0;

  // First aggregation: all rows, first outcome
  reAggregate();
  renderFilterBar();

  // Switch to race tab (or first populated) and reload
  const firstTabId = raceCol >= 0 ? 'race' : genderCol >= 0 ? 'gender' : 'age';
  activeTabId = firstTabId;
  localStorage.setItem(STORAGE_PREFIX + 'activeTab', activeTabId);
  updateTabBar();
  loadTabState(activeTabId);
  initializeSubgroups();
  initializeYearHeaders();
  recalculateAll();

  const tabNames = [raceCol >= 0 && 'Race/Ethnicity', genderCol >= 0 && 'Gender', ageCol >= 0 && 'Age'].filter(Boolean);
  closeImportModal();
  showToast(`Imported into: ${tabNames.join(', ')}`);
}

// Aggregate all demographic tabs from a row set + effective column map
function populateTabsFromRows(rows, colMap) {
  const { yearCol, raceCol, genderCol, ageCol, successCol, totalCol } = colMap;
  if (raceCol   >= 0) saveAggToTab('race',   aggregateRaw(rows, yearCol, raceCol,   successCol, totalCol));
  if (genderCol >= 0) saveAggToTab('gender', aggregateRaw(rows, yearCol, genderCol, successCol, totalCol, GENDER_LABELS));
  if (ageCol    >= 0) saveAggToTab('age',    aggregateRaw(rows, yearCol, ageCol,    successCol, totalCol));
}

// Shared re-aggregation — applies both active outcome and active course filter
function reAggregate() {
  const rows = activeCourseValue
    ? storedRawRows.filter(r => r[storedCourseCol] === activeCourseValue)
    : storedRawRows;

  const effectiveSuccessCol = storedOutcomes[activeOutcomeIdx]?.col ?? storedRawColMap.successCol;
  const colMap = { ...storedRawColMap, successCol: effectiveSuccessCol };

  populateTabsFromRows(rows, colMap);
  loadTabState(activeTabId);
  initializeSubgroups();
  initializeYearHeaders();
  recalculateAll();
}

// ── Filter bar (Outcome + Course) ─────────────────────────────────────────────

function renderFilterBar() {
  const bar = document.getElementById('courseFilterBar');
  bar.innerHTML = '';
  let hasContent = false;

  // Outcome pills — only shown if 2+ outcomes available
  if (storedOutcomes.length > 1) {
    hasContent = true;
    const lbl = document.createElement('span');
    lbl.className = 'cf-label';
    lbl.textContent = 'Outcome:';
    bar.appendChild(lbl);

    storedOutcomes.forEach((o, i) => {
      addFilterPill(bar, o.label, 'outcome', String(i), i === activeOutcomeIdx);
    });
  }

  // Course pills — only shown if course column was mapped
  if (storedCourseCol >= 0) {
    if (hasContent) {
      const sep = document.createElement('span');
      sep.className = 'cf-sep';
      sep.textContent = '·';
      bar.appendChild(sep);
    }
    hasContent = true;

    const lbl = document.createElement('span');
    lbl.className = 'cf-label';
    lbl.textContent = 'Course:';
    bar.appendChild(lbl);

    addFilterPill(bar, `All (${storedRawRows.length})`, 'course', '', activeCourseValue === '');

    const courses = [...new Set(storedRawRows.map(r => r[storedCourseCol]).filter(Boolean))].sort();
    courses.forEach(course => {
      const count = storedRawRows.filter(r => r[storedCourseCol] === course).length;
      addFilterPill(bar, `${course} (${count})`, 'course', course, activeCourseValue === course);
    });
  }

  bar.classList.toggle('hidden', !hasContent);
}

function addFilterPill(bar, label, type, value, active) {
  const btn = document.createElement('button');
  btn.className = 'course-pill' + (active ? ' active' : '');
  btn.textContent = label;
  btn.dataset.filterType  = type;
  btn.dataset.filterValue = value;
  btn.addEventListener('click', () => {
    if (type === 'outcome') selectOutcome(parseInt(value));
    else selectCourse(value);
  });
  bar.appendChild(btn);
}

function selectOutcome(idx) {
  activeOutcomeIdx = idx;
  renderFilterBar();
  reAggregate();
  showToast(`Outcome: ${storedOutcomes[idx].label}`);
}

function selectCourse(courseValue) {
  activeCourseValue = courseValue;
  renderFilterBar();
  reAggregate();
  const rows = courseValue ? storedRawRows.filter(r => r[storedCourseCol] === courseValue) : storedRawRows;
  showToast(`Course: ${courseValue || 'All'} — ${rows.length} records`);
}

function saveAggToTab(tabId, agg) {
  // Sort years; use most recent COLUMN_COUNT
  const allYears = Object.keys(agg).sort();
  const years = allYears.slice(-COLUMN_COUNT);

  // Set first year header
  if (years.length > 0) {
    localStorage.setItem(storageKey(tabId, 'year-0'), fmtAcademicYear(years[0]));
  }

  // Collect all subgroups across all years, sorted
  const sgSet = new Set(years.flatMap(y => Object.keys(agg[y] || {})));
  const subgroups = [...sgSet].sort();

  for (let row = 0; row < ROW_COUNT; row++) {
    const sg = subgroups[row] || '';
    localStorage.setItem(storageKey(tabId, `inputSubgroup-${row}`), sg);

    for (let col = 0; col < COLUMN_COUNT; col++) {
      const year = years[col];
      const cell = year && sg ? agg[year]?.[sg] : null;
      localStorage.setItem(storageKey(tabId, `inputNumerator-${row}-${col}`), cell ? Math.round(cell.s) : '');
      localStorage.setItem(storageKey(tabId, `inputDenominator-${row}-${col}`), cell ? Math.round(cell.t) : '');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Import modal
// ─────────────────────────────────────────────────────────────────────────────
function openImportModal() {
  document.getElementById('importOverlay').classList.remove('hidden');
  document.getElementById('importNumerator').value = '';
  document.getElementById('importDenominator').value = '';
  document.getElementById('importRawPaste').value = '';
  document.getElementById('rawFileInput').value = '';
  document.getElementById('rawFileStatus').classList.add('hidden');
  document.getElementById('rawDropZone').classList.remove('dragover');
  document.getElementById('rawColumnMap').classList.add('hidden');
  document.getElementById('rawPreview').innerHTML = '';
  document.getElementById('importRawApply').disabled = true;
  rawHeader = [];
  rawParsedRows = [];
  // Always open on Raw tab
  document.querySelectorAll('.import-tab').forEach(b => b.classList.remove('active'));
  document.querySelector('.import-tab[data-mode="raw"]').classList.add('active');
  document.getElementById('importModeRaw').classList.remove('hidden');
  document.getElementById('importModeAgg').classList.add('hidden');
}

function closeImportModal() {
  document.getElementById('importOverlay').classList.add('hidden');
}

function applyImport() {
  const numText = document.getElementById('importNumerator').value.trim();
  const denText = document.getElementById('importDenominator').value.trim();
  if (!numText && !denText) { showToast('Paste some data first.'); return; }

  if (numText) applyPastedData(parsePaste(numText), 'inputNumerator', 'inputSubgroup');
  if (denText) applyPastedData(parsePaste(denText), 'inputDenominator', null);

  initializeSubgroups();
  initializeYearHeaders();
  saveTabState(activeTabId);
  recalculateAll();
  closeImportModal();
  showToast('Data imported!');
}

function parsePaste(text) {
  const rows = text.split('\n').map(l => l.trim()).filter(Boolean).map(line =>
    (line.includes('\t') ? line.split('\t') : line.split(',')).map(c => c.trim())
  );
  // Skip header row if all data columns are non-numeric
  if (rows.length > 1 && rows[0].slice(1).every(v => v === '' || isNaN(Number(v.replace(/,/g,''))))) {
    return rows.slice(1);
  }
  return rows;
}

function applyPastedData(rows, valuePrefix, subgroupPrefix) {
  rows.forEach((cells, rowIdx) => {
    if (rowIdx >= ROW_COUNT) return;
    if (subgroupPrefix) {
      const el = document.getElementById(`${subgroupPrefix}-${rowIdx}`);
      if (el) el.value = cells[0] || '';
    }
    cells.slice(1).forEach((val, colIdx) => {
      if (colIdx >= COLUMN_COUNT) return;
      const el = document.getElementById(`${valuePrefix}-${rowIdx}-${colIdx}`);
      if (el) el.value = val.replace(/,/g, '').trim();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Export
// ─────────────────────────────────────────────────────────────────────────────
function exportCSV() {
  const years = Array.from({ length: COLUMN_COUNT }, (_, i) =>
    document.getElementById(`year-${i}`)?.value || `Year ${i + 1}`
  );
  const tab = TABS.find(t => t.id === activeTabId);

  const headerRow = ['Subgroup',
    ...years.flatMap(y => [`${y} Successes`, `${y} Total`, `${y} Rate`, `${y} PPG-1`, `${y} Trend`, `${y} Status`])
  ];
  const dataRows = [];

  for (let row = 0; row < ROW_COUNT; row++) {
    const sg = document.getElementById(`inputSubgroup-${row}`)?.value || '';
    if (!sg) continue;
    const cols = [];
    for (let col = 0; col < COLUMN_COUNT; col++) {
      const n = document.getElementById(`inputNumerator-${row}-${col}`)?.value || '';
      const d = document.getElementById(`inputDenominator-${row}-${col}`)?.value || '';
      const r = ppgResults[col]?.[row];
      const nv = parseFloat(n), dv = parseFloat(d);
      const rate = (n && d && dv > 0) ? (nv / dv * 100).toFixed(1) + '%' : '';
      const ppg1Str = r?.ppg1 !== undefined ? r.ppg1.toFixed(1) + '%' : (r?.label || '');
      // Trend
      let trend = '';
      if (col > 0 && r?.ppg1 !== undefined) {
        const prev = ppgResults[col - 1]?.[row];
        if (prev?.ppg1 !== undefined) {
          const d2 = r.ppg1 - prev.ppg1;
          trend = Math.abs(d2) < 0.5 ? 'Stable' : d2 > 0 ? 'Improving' : 'Worsening';
        }
      }
      cols.push(n, d, rate, ppg1Str, trend, r?.label || '');
    }
    dataRows.push([sg, ...cols]);
  }

  const csv = [headerRow, ...dataRows]
    .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PPG1-${(tab?.label || 'results').replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV downloaded!');
}

// ─────────────────────────────────────────────────────────────────────────────
// Clear all data for current tab
// ─────────────────────────────────────────────────────────────────────────────
function clearAll() {
  if (!confirm('Clear all data for this tab?')) return;
  const tab = TABS.find(t => t.id === activeTabId);
  const defaults = tab?.defaultSubgroups || [];

  for (let row = 0; row < ROW_COUNT; row++) {
    const sgEl = document.getElementById(`inputSubgroup-${row}`);
    if (sgEl) sgEl.value = defaults[row] || '';
    for (let col = 0; col < COLUMN_COUNT; col++) {
      const nEl = document.getElementById(`inputNumerator-${row}-${col}`);
      const dEl = document.getElementById(`inputDenominator-${row}-${col}`);
      if (nEl) nEl.value = '';
      if (dEl) dEl.value = '';
      localStorage.removeItem(storageKey(activeTabId, `inputNumerator-${row}-${col}`));
      localStorage.removeItem(storageKey(activeTabId, `inputDenominator-${row}-${col}`));
    }
    localStorage.removeItem(storageKey(activeTabId, `inputSubgroup-${row}`));
  }
  history.replaceState(null, '', window.location.pathname);
  initializeSubgroups();
  initializeYearHeaders();
  recalculateAll();
  showToast('Data cleared.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('toast-show');
  setTimeout(() => toast.classList.remove('toast-show'), 2600);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
function calcMOE(rate, n) {
  return Math.max(Z_SCORE_95 * Math.sqrt((rate * (1 - rate)) / n) * 100, MIN_MARGIN_OF_ERROR);
}

function getPpgStatus(ppg1, moe) {
  if (ppg1 <= -moe) return { label: 'DI flagged',       className: 'status-di' };
  if (ppg1 < 0)     return { label: 'Below peers',      className: 'status-watch' };
  if (ppg1 >= moe)  return { label: 'Higher than peers',className: 'status-high' };
  return               { label: 'Within threshold', className: 'status-good' };
}

function renderInfoCell(el, title, detail, cls) {
  el.className = `analysis-cell ${cls}`;
  el.innerHTML = `<div class="ppg-value">${title}</div><div class="ppg-note">${detail}</div><span class="status-badge">${title}</span>`;
}

function clearOutputCell(el) {
  el.className = '';
  el.style.backgroundColor = '';
  el.innerHTML = '';
}

function parseInputValue(raw) {
  if (raw.trim() === '') return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

function formatPercent(v) { return `${v.toFixed(1)}%`; }
