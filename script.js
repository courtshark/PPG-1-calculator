document.addEventListener('DOMContentLoaded', (event) => {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');
  const subgroupInputs = document.querySelectorAll('.inputSubgroup');
  const yearHeaderInputs = document.querySelectorAll('.yearHeader');

  // Initialize subgroup names and year headers across all tables
  initializeSubgroups();
  initializeYearHeaders();

  // Add event listeners for each input field to recalculate when the values change
  numeratorInputs.forEach(input => {
    input.addEventListener('input', () => {
      calculatePPG1();
      calculateSuccessRates();  // Call the new function here
    });
  });

  denominatorInputs.forEach(input => {
    input.addEventListener('input', () => {
      calculatePPG1();
      calculateSuccessRates();  // Call the new function here
    });
  });

  subgroupInputs.forEach((input, index) => {
    input.addEventListener('input', () => updateSubgroup(index, input.value));
  });

  yearHeaderInputs.forEach((input, index) => {
    if (index % 4 === 0) {  // Only the first year is editable
      input.addEventListener('input', () => updateYearHeaders(input.value));
    }
  });

  // Call calculations on page load to handle preset values
  calculatePPG1();
  calculateSuccessRates();  // Initial call to fill the success rates table
});

// Function to autofill subgroup names across tables
function initializeSubgroups() {
  const subgroups = document.querySelectorAll('#numeratorTable .inputSubgroup');
  subgroups.forEach((input, index) => {
    const value = input.value;
    updateSubgroup(index, value);
  });
}

// Function to autofill year headers across tables
function initializeYearHeaders() {
  const initialYear = document.getElementById('year-0').value;
  updateYearHeaders(initialYear);
}

// Update subgroup names across all tables
function updateSubgroup(row, value) {
  document.getElementById(`successSubgroup-${row}`).value = value;
  document.getElementById(`denominatorSubgroup-${row}`).value = value;
  document.getElementById(`ppgSubgroup-${row}`).value = value;
}

// Update year headers across all tables based on the first input
function updateYearHeaders(initialYear) {
  const yearRegex = /^(\d{4})-(\d{2})$/;
  const match = initialYear.match(yearRegex);

  if (match) {
    const startYear = parseInt(match[1]);
    let endYear = parseInt(match[2]);

    for (let i = 0; i < 4; i++) {
      const yearHeader = `${startYear + i}-${(endYear + i) % 100}`;
      document.getElementById(`year-${i}`).value = yearHeader;
      document.getElementById(`success-year-${i}`).value = yearHeader;
      document.getElementById(`denominator-year-${i}`).value = yearHeader;
      document.getElementById(`ppg-year-${i}`).value = yearHeader;
    }
  }
}

// Function to calculate Percentage Point Gap Minus One (PPG-1)
function calculatePPG1() {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');

  const columnTotals = {
    totalNumerator: [0, 0, 0, 0],
    totalDenominator: [0, 0, 0, 0]
  };

  for (let col = 0; col < 4; col++) {
    let validSubgroups = 0;

    for (let row = 0; row < 9; row++) {
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

      if (numerator > 0 && denominator > 0) {
        validSubgroups++;
        columnTotals.totalNumerator[col] += numerator;
        columnTotals.totalDenominator[col] += denominator;
      }
    }

    if (validSubgroups >= 2) {
      for (let row = 0; row < 9; row++) {
        const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
        const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

        if (denominator > 0 && columnTotals.totalDenominator[col] > 0) {
          const groupSuccessRate = numerator / denominator;

          const adjustedNumerator = columnTotals.totalNumerator[col] - numerator;
          const adjustedDenominator = columnTotals.totalDenominator[col] - denominator;

          const adjustedSuccessRate = adjustedDenominator > 0 ? adjustedNumerator / adjustedDenominator : 0;

          const ppg1Value = ((groupSuccessRate - adjustedSuccessRate) * 100).toFixed(1);

          const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
          ppg1Cell.innerText = `${ppg1Value}%`;

          const bgColor = getHeatmapColor(ppg1Value);
          ppg1Cell.style.backgroundColor = bgColor;
          ppg1Cell.style.color = bgColor === '#ff0000' ? '#ffffff' : '#000000';
        } else {
          const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
          ppg1Cell.innerText = '';
          ppg1Cell.style.backgroundColor = '';
          ppg1Cell.style.color = '';
        }
      }
    } else {
      for (let row = 0; row < 9; row++) {
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = '';
        ppg1Cell.style.backgroundColor = '';
        ppg1Cell.style.color = '';
      }
    }
  }
}

// New function to calculate Disaggregated Success Rates
function calculateSuccessRates() {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');

  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 9; row++) {
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

      if (denominator > 0) {
        const successRate = ((numerator / denominator) * 100).toFixed(1);

        const successRateCell = document.getElementById(`successRate-${row}-${col}`);
        successRateCell.innerText = `${successRate}%`;

        successRateCell.style.backgroundColor = getHeatmapColor(successRate);
        successRateCell.style.color = successRateCell.style.backgroundColor === '#ff0000' ? '#ffffff' : '#000000';
      } else {
        const successRateCell = document.getElementById(`successRate-${row}-${col}`);
        successRateCell.innerText = '';
        successRateCell.style.backgroundColor = '';
        successRateCell.style.color = '';
      }
    }
  }
}

// Helper function to apply heatmap color based on value
function getHeatmapColor(value) {
  const numValue = parseFloat(value);
  if (numValue > 0) {
    return '#FEEDDE';  // Neutral for positive values
  } else if (numValue >= -10) {
    return '#ffc7ce';  // Pink for small negative values
  } else {
    return '#ff0000';  // Red for larger negative values
  }
}
