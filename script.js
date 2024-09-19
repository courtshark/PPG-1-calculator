document.addEventListener('DOMContentLoaded', (event) => {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');
  const subgroupInputs = document.querySelectorAll('.inputSubgroup');
  const yearHeaderInputs = document.querySelectorAll('.yearHeader');

  // Initialize subgroup names across all tables
  initializeSubgroups();
  initializeYearHeaders();

  // Add event listener for input fields to recalculate
  numeratorInputs.forEach(input => input.addEventListener('keydown', handleEnterPress));
  denominatorInputs.forEach(input => input.addEventListener('keydown', handleEnterPress));

  // Add event listener to recalculate when numerator or denominator changes
  numeratorInputs.forEach(input => input.addEventListener('input', () => calculate()));
  denominatorInputs.forEach(input => input.addEventListener('input', () => calculate()));

  // Handle subgroup input to update across all tables
  subgroupInputs.forEach((input, index) => {
    input.addEventListener('input', () => updateSubgroup(index, input.value));
  });

  // Handle year header input
  yearHeaderInputs.forEach((input, index) => {
    if (index % 4 === 0) { // Only the first column header is editable
      input.addEventListener('input', () => updateYearHeaders(input.value));
    }
  });

  // Call calculate on page load
  calculate();
});

function handleEnterPress(event) {
  if (event.key === 'Enter') {
    event.preventDefault(); // Prevent the default behavior of the Enter key

    const currentId = event.target.id;
    const [prefix, row, col] = currentId.split('-');
    const nextRow = parseInt(row) + 1;
    const nextId = `${prefix}-${nextRow}-${col}`;
    const nextInput = document.getElementById(nextId);

    if (nextInput) {
      nextInput.focus();
    }
  }
}

function initializeSubgroups() {
  const subgroups = document.querySelectorAll('#numeratorTable .inputSubgroup');
  subgroups.forEach((input, index) => {
    const value = input.value;
    updateSubgroup(index, value);
  });
}

function initializeYearHeaders() {
  const initialYear = document.getElementById('year-0').value;
  updateYearHeaders(initialYear);
}

function updateSubgroup(row, value) {
  document.getElementById(`successSubgroup-${row}`).value = value;
  document.getElementById(`denominatorSubgroup-${row}`).value = value;
  document.getElementById(`ppgSubgroup-${row}`).value = value;
}

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

function calculate() {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');

  // Calculate total numerator and denominator for all ethnicities
  const totalNumerator = Array.from(numeratorInputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
  const totalDenominator = Array.from(denominatorInputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);

  // Debugging: Log total numerator and denominator
  console.log(`Total Numerator: ${totalNumerator}, Total Denominator: ${totalDenominator}`);

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 4; col++) {
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

      if (denominator > 0) {
        // 1. Success rate for the ethnicity
        const successRate = (numerator / denominator).toFixed(4);

        // 2. Adjusted numerator and denominator (excluding current ethnicity)
        const adjustedNumerator = totalNumerator - numerator;
        const adjustedDenominator = totalDenominator - denominator;

        // Ensure adjusted denominator is non-zero to avoid division by zero
        const adjustedSuccessRate = adjustedDenominator > 0 ? (adjustedNumerator / adjustedDenominator).toFixed(4) : 0;

        // 3. Calculate PPG-1
        const ppg1Value = (successRate - adjustedSuccessRate).toFixed(4);

        // Debugging: Log individual cell values
        console.log(`Row: ${row}, Col: ${col}, Numerator: ${numerator}, Denominator: ${denominator}`);
        console.log(`Success Rate: ${successRate}, Adjusted Success Rate: ${adjustedSuccessRate}, PPG-1: ${ppg1Value}`);

        // Update the success rate and PPG-1 in the table
        document.getElementById(`successRate-${row}-${col}`).innerText = (successRate * 100).toFixed(1) + '%';
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = (ppg1Value * 100).toFixed(1) + '%';

        // Apply background color based on value
        const bgColor = getHeatmapColor(ppg1Value);
        ppg1Cell.style.backgroundColor = bgColor;
        ppg1Cell.style.color = bgColor === '#ff0000' ? '#ffffff' : '#000000'; // White text on red background, black otherwise
      } else {
        // Clear the success rate and PPG-1 if denominator is 0
        document.getElementById(`successRate-${row}-${col}`).innerText = '';
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = '';
        ppg1Cell.style.backgroundColor = '';
        ppg1Cell.style.color = ''; // Reset text color
      }
    }
  }
}

function getHeatmapColor(value) {
  const numValue = parseFloat(value);
  if (numValue > 0) {
    return '#FEEDDE'; // Neutral
  } else if (numValue >= -10) {
    return '#ffc7ce'; // Pink
  } else {
    return '#ff0000'; // Red
  }
}
