const ROW_COUNT = 9;
const COLUMN_COUNT = 4;
const Z_SCORE_95 = 1.96;
const MIN_MARGIN_OF_ERROR = 2;
const MINIMUM_REPORTABLE_N = 10;

document.addEventListener('DOMContentLoaded', () => {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');
  const subgroupInputs = document.querySelectorAll('#numeratorTable .inputSubgroup');
  const firstYearInput = document.getElementById('year-0');

  [...numeratorInputs, ...denominatorInputs].forEach((input) => {
    input.min = '0';
    input.step = '1';
    input.inputMode = 'numeric';
    input.addEventListener('input', recalculateAll);
  });

  subgroupInputs.forEach((input, row) => {
    input.addEventListener('input', () => updateSubgroup(row, input.value));
  });

  firstYearInput.addEventListener('input', () => updateYearHeaders(firstYearInput.value));

  initializeSubgroups();
  initializeYearHeaders();
  recalculateAll();
});

function initializeSubgroups() {
  const subgroups = document.querySelectorAll('#numeratorTable .inputSubgroup');

  subgroups.forEach((input, row) => {
    updateSubgroup(row, input.value);
  });
}

function initializeYearHeaders() {
  updateYearHeaders(document.getElementById('year-0').value);
}

function updateSubgroup(row, value) {
  document.getElementById(`successSubgroup-${row}`).value = value;
  document.getElementById(`denominatorSubgroup-${row}`).value = value;
  document.getElementById(`ppgSubgroup-${row}`).value = value;
}

function updateYearHeaders(initialYear) {
  const yearRegex = /^(\d{4})-(\d{2})$/;
  const match = initialYear.trim().match(yearRegex);

  if (!match) {
    return;
  }

  const startYear = Number.parseInt(match[1], 10);
  const endYear = Number.parseInt(match[2], 10);

  for (let column = 0; column < COLUMN_COUNT; column += 1) {
    const endSuffix = String((endYear + column) % 100).padStart(2, '0');
    const yearHeader = `${startYear + column}-${endSuffix}`;

    document.getElementById(`year-${column}`).value = yearHeader;
    document.getElementById(`success-year-${column}`).value = yearHeader;
    document.getElementById(`denominator-year-${column}`).value = yearHeader;
    document.getElementById(`ppg-year-${column}`).value = yearHeader;
  }
}

function recalculateAll() {
  const grid = buildDataGrid();

  calculateSuccessRates(grid);
  calculatePpgAnalysis(grid);
}

function buildDataGrid() {
  const grid = [];

  for (let row = 0; row < ROW_COUNT; row += 1) {
    const columnValues = [];

    for (let column = 0; column < COLUMN_COUNT; column += 1) {
      columnValues.push(readCell(row, column));
    }

    grid.push(columnValues);
  }

  return grid;
}

function readCell(row, column) {
  const numeratorInput = document.getElementById(`inputNumerator-${row}-${column}`);
  const denominatorInput = document.getElementById(`inputDenominator-${row}-${column}`);
  const numeratorRaw = parseInputValue(numeratorInput.value);
  const denominatorRaw = parseInputValue(denominatorInput.value);
  const numerator = numeratorRaw ?? 0;
  const denominator = denominatorRaw ?? 0;

  let invalidReason = '';

  if (numeratorRaw !== null && numeratorRaw < 0) {
    invalidReason = 'Outcome counts cannot be negative.';
  } else if (denominatorRaw !== null && denominatorRaw < 0) {
    invalidReason = 'Population counts cannot be negative.';
  } else if (numeratorRaw !== null && !Number.isInteger(numeratorRaw)) {
    invalidReason = 'Outcome counts must be whole numbers.';
  } else if (denominatorRaw !== null && !Number.isInteger(denominatorRaw)) {
    invalidReason = 'Population counts must be whole numbers.';
  } else if (numeratorRaw !== null && denominatorRaw === null) {
    invalidReason = 'Enter a total population count for this subgroup.';
  } else if (denominator > 0 && numerator > denominator) {
    invalidReason = 'Outcome counts cannot be greater than the subgroup total.';
  } else if (denominator === 0 && numerator > 0) {
    invalidReason = 'Outcome counts require a subgroup total greater than zero.';
  }

  syncInputState(numeratorInput, denominatorInput, invalidReason);

  return {
    row,
    column,
    numerator,
    denominator,
    hasPopulation: denominator > 0,
    isInvalid: invalidReason !== '',
    invalidReason
  };
}

function syncInputState(numeratorInput, denominatorInput, invalidReason) {
  const isInvalid = invalidReason !== '';

  [numeratorInput, denominatorInput].forEach((input) => {
    input.classList.toggle('input-error', isInvalid);

    if (isInvalid) {
      input.title = invalidReason;
    } else {
      input.removeAttribute('title');
    }
  });
}

function calculateSuccessRates(grid) {
  for (let row = 0; row < ROW_COUNT; row += 1) {
    for (let column = 0; column < COLUMN_COUNT; column += 1) {
      const cell = grid[row][column];
      const outputCell = document.getElementById(`successRate-${row}-${column}`);

      clearOutputCell(outputCell);

      if (cell.isInvalid) {
        renderInfoCell(outputCell, 'Check counts', cell.invalidReason, 'status-invalid');
        continue;
      }

      if (!cell.hasPopulation) {
        continue;
      }

      const successRate = (cell.numerator / cell.denominator) * 100;

      outputCell.className = 'rate-cell';
      outputCell.style.backgroundColor = getRateColor(successRate);
      outputCell.innerHTML = `
        <div class="rate-value">${formatPercent(successRate)}</div>
        <div class="rate-meta">${cell.numerator} / ${cell.denominator}</div>
      `;
    }
  }
}

function calculatePpgAnalysis(grid) {
  for (let column = 0; column < COLUMN_COUNT; column += 1) {
    const populationCells = [];

    for (let row = 0; row < ROW_COUNT; row += 1) {
      const cell = grid[row][column];

      if (!cell.isInvalid && cell.hasPopulation) {
        populationCells.push(cell);
      }
    }

    const totalNumerator = populationCells.reduce((sum, cell) => sum + cell.numerator, 0);
    const totalDenominator = populationCells.reduce((sum, cell) => sum + cell.denominator, 0);

    for (let row = 0; row < ROW_COUNT; row += 1) {
      const cell = grid[row][column];
      const outputCell = document.getElementById(`ppg1Value-${row}-${column}`);

      clearOutputCell(outputCell);

      if (cell.isInvalid) {
        renderInfoCell(outputCell, 'Check counts', cell.invalidReason, 'status-invalid');
        continue;
      }

      if (!cell.hasPopulation) {
        continue;
      }

      if (cell.denominator <= MINIMUM_REPORTABLE_N) {
        renderInfoCell(
          outputCell,
          'Insufficient data',
          `n = ${cell.denominator}. The CCCCO methodology advises against estimating DI when n \u2264 10.`,
          'status-muted'
        );
        continue;
      }

      const allOtherDenominator = totalDenominator - cell.denominator;
      const allOtherNumerator = totalNumerator - cell.numerator;

      if (populationCells.length < 2 || allOtherDenominator <= 0) {
        renderInfoCell(
          outputCell,
          'Need more data',
          'Enter at least two populated subgroups in this year to compare the target group against all other students.',
          'status-muted'
        );
        continue;
      }

      const subgroupRate = cell.numerator / cell.denominator;
      const allOtherRate = allOtherNumerator / allOtherDenominator;
      const ppg1 = (subgroupRate - allOtherRate) * 100;
      const marginOfError = calculateMarginOfError(subgroupRate, cell.denominator);
      const studentsNeeded = ppg1 < 0 ? Math.round((Math.abs(ppg1) / 100) * cell.denominator) : null;
      const status = getPpgStatus(ppg1, marginOfError);

      outputCell.className = `analysis-cell ${status.className}`;
      outputCell.innerHTML = `
        <div class="ppg-value">${formatPercent(ppg1)}</div>
        <div class="ppg-meta">All other: ${formatPercent(allOtherRate * 100)}</div>
        <div class="ppg-meta">Threshold E: ${formatPercent(marginOfError)}</div>
        <div class="ppg-meta">Close gap: ${studentsNeeded === null ? '--' : studentsNeeded}</div>
        <span class="status-badge">${status.label}</span>
      `;
    }
  }
}

function calculateMarginOfError(subgroupRate, denominator) {
  const calculatedMargin = Z_SCORE_95 * Math.sqrt((subgroupRate * (1 - subgroupRate)) / denominator) * 100;

  return Math.max(calculatedMargin, MIN_MARGIN_OF_ERROR);
}

function getPpgStatus(ppg1, marginOfError) {
  if (ppg1 <= -marginOfError) {
    return { label: 'DI flagged', className: 'status-di' };
  }

  if (ppg1 < 0) {
    return { label: 'Below peers', className: 'status-watch' };
  }

  if (ppg1 >= marginOfError) {
    return { label: 'Higher than peers', className: 'status-high' };
  }

  return { label: 'Within threshold', className: 'status-good' };
}

function renderInfoCell(outputCell, title, detail, className) {
  outputCell.className = `analysis-cell ${className}`;
  outputCell.innerHTML = `
    <div class="ppg-value">${title}</div>
    <div class="ppg-note">${detail}</div>
    <span class="status-badge">${title}</span>
  `;
}

function clearOutputCell(outputCell) {
  outputCell.className = '';
  outputCell.style.backgroundColor = '';
  outputCell.innerHTML = '';
}

function parseInputValue(rawValue) {
  if (rawValue.trim() === '') {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function getRateColor(rate) {
  const boundedRate = Math.min(Math.max(rate, 0), 100);
  const hue = (boundedRate / 100) * 120;

  return `hsl(${hue} 48% 89%)`;
}
