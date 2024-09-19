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

// Function to calculate success rates and PPG-1 values
function calculate() {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');

  // Convert NodeLists to arrays for easier manipulation
  const numerators = Array.from(numeratorInputs).map(input => parseFloat(input.value) || 0);
  const denominators = Array.from(denominatorInputs).map(input => parseFloat(input.value) || 0);

  // Calculate total numerator and denominator for all groups
  const totalNumerator = numerators.reduce((sum, value) => sum + value, 0);
  const totalDenominator = denominators.reduce((sum, value) => sum + value, 0);

  // Loop through each row (subgroup) and calculate success rates and PPG-1
  for (let row = 0; row < numerators.length / 4; row++) {
    for (let col = 0; col < 4; col++) {
      const numerator = numerators[row * 4 + col];
      const denominator = denominators[row * 4 + col];

      // Ensure denominator is non-zero to avoid division by zero
      if (denominator > 0) {
        // 1. Success rate for the subgroup
        const successRate = (numerator / denominator).toFixed(4);

        // 2. Adjusted numerator and denominator (excluding current group)
        const adjustedNumerator = totalNumerator - numerator;
        const adjustedDenominator = totalDenominator - denominator;

        // 3. Adjusted success rate for all other groups
        const adjustedSuccessRate = adjustedDenominator > 0 ? (adjustedNumerator / adjustedDenominator).toFixed(4) : 0;

        // 4. Calculate PPG-1
        const ppg1Value = (successRate - adjustedSuccessRate).toFixed(4);

        // Update the success rate and PPG-1 in the table
        document.getElementById(`successRate-${row}-${col}`).innerText = (successRate * 100).toFixed(1) + '%';
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = (ppg1Value * 100).toFixed(1) + '%';

        // Apply background color based on the PPG-1 value
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

// Function to return a background color based on PPG-1 value
function getHeatmapColor(value) {
  const numValue = parseFloat(value);
  if (numValue > 0) {
    return '#FEEDDE'; // Neutral color
  } else if (numValue >= -10) {
    return '#ffc7ce'; // Light red/pink for moderate negative PPG-1 values
  } else {
    return '#ff0000'; // Dark red for strong negative PPG-1 values
  }
}
