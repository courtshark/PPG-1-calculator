document.addEventListener('DOMContentLoaded', (event) => {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');
  const subgroupInputs = document.querySelectorAll('.inputSubgroup');
  const yearHeaderInputs = document.querySelectorAll('.yearHeader');

  // Initialize subgroup names and year headers across all tables
  initializeSubgroups();
  initializeYearHeaders();

  // Add event listener for each input field
  numeratorInputs.forEach(input => input.addEventListener('keydown', handleEnterPress));
  denominatorInputs.forEach(input => input.addEventListener('keydown', handleEnterPress));
  subgroupInputs.forEach((input, index) => {
    input.addEventListener('input', () => updateSubgroup(index, input.value));
  });

  yearHeaderInputs.forEach((input, index) => {
    if (index % 4 === 0) { // Only the first column header is editable
      input.addEventListener('input', () => updateYearHeaders(input.value));
    }
  });

  // Add event listener to recalculate when numerator or denominator changes
  numeratorInputs.forEach(input => input.addEventListener('input', calculate));
  denominatorInputs.forEach(input => input.addEventListener('input', calculate));

  // Calculate on page load
  calculate();
});

// Function to handle "Enter" key press to move to the next input
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

// Initialize subgroup names across all tables
function initializeSubgroups() {
  const subgroups = document.querySelectorAll('#numeratorTable .inputSubgroup');
  subgroups.forEach((input, index) => {
    const value = input.value;
    updateSubgroup(index, value);
  });
}

// Initialize year headers across all tables
function initializeYearHeaders() {
  const initialYear = document.getElementById('year-0').value;
  updateYearHeaders(initialYear);
}

// Update subgroup names across all relevant tables
function updateSubgroup(row, value) {
  document.getElementById(`successSubgroup-${row}`).value = value;
  document.getElementById(`denominatorSubgroup-${row}`).value = value;
  document.getElementById(`ppgSubgroup-${row}`).value = value;
}

// Update year headers across all relevant tables
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

function calculatePPG1() {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');

  // Compute total numerator and denominator across all groups
  const totalNumerator = Array.from(numeratorInputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
  const totalDenominator = Array.from(denominatorInputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);

  for (let row = 0; row < 9; row++) {  // Loop over rows (ethnicities)
    for (let col = 0; col < 4; col++) {  // Loop over years
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

      if (denominator > 0) {
        // Calculate group success rate
        const groupSuccessRate = numerator / denominator;

        // Adjust total by subtracting the current group's numerator and denominator
        const adjustedNumerator = totalNumerator - numerator;
        const adjustedDenominator = totalDenominator - denominator;

        // Calculate adjusted success rate for the rest of the population
        const adjustedSuccessRate = adjustedDenominator > 0 ? adjustedNumerator / adjustedDenominator : 0;

        // Calculate PPG-1: Group Success Rate - Adjusted Success Rate
        const ppg1Value = ((groupSuccessRate - adjustedSuccessRate) * 100).toFixed(1);

        // Update the PPG-1 value in the table
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = ppg1Value + '%';

        // Apply background color to reflect the PPG-1 value
        const bgColor = getHeatmapColor(ppg1Value);
        ppg1Cell.style.backgroundColor = bgColor;
        ppg1Cell.style.color = bgColor === '#ff0000' ? '#ffffff' : '#000000';  // White text on red background, black otherwise

      } else {
        // Clear the cell if there's no denominator
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = '';
        ppg1Cell.style.backgroundColor = '';
        ppg1Cell.style.color = '';  // Reset text color
      }
    }
  }
}

// Helper function to determine heatmap color based on PPG-1 value
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
