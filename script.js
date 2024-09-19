document.addEventListener('DOMContentLoaded', (event) => {
    const numeratorInputs = document.querySelectorAll('.inputNumerator');
    const denominatorInputs = document.querySelectorAll('.inputDenominator');
    const subgroupInputs = document.querySelectorAll('.inputSubgroup');
    const yearHeaderInputs = document.querySelectorAll('.yearHeader');
  
    // Initialize subgroup names across all tables
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
  
    document.querySelectorAll('.inputNumerator, .inputDenominator').forEach(input => {
      input.addEventListener('input', () => {
        console.log('Numerator or Denominator changed, recalculating...');
        calculate();
      });
    });
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
  const messageDiv = document.getElementById('message');

  // Step 1: Count valid subgroups (those with both numerator and denominator filled in)
  let validSubgroups = 0;
  for (let row = 0; row < 9; row++) {
    let hasNumerator = false;
    let hasDenominator = false;
    for (let col = 0; col < 4; col++) {
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value);
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value);

      if (!isNaN(numerator) && numerator > 0) {
        hasNumerator = true;
      }
      if (!isNaN(denominator) && denominator > 0) {
        hasDenominator = true;
      }
    }
    if (hasNumerator && hasDenominator) {
      validSubgroups += 1;
    }
  }

  // Step 2: Show warning if fewer than two subgroups have been filled
  if (validSubgroups < 2) {
    messageDiv.innerText = "At least two subgroups must be filled in to calculate results.";
    clearCalculations();  // Clear the table if not enough data is provided
    return;
  } else {
    messageDiv.innerText = ""; // Clear message when valid
  }

  // Step 3: Perform the calculation if there are two or more valid subgroups
  const totalNumerator = Array.from(numeratorInputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
  const totalDenominator = Array.from(denominatorInputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 4; col++) {
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

      if (denominator > 0) {
        // Calculate success rate for the subgroup
        const successRate = (numerator / denominator) * 100;

        // Calculate adjusted success rate for all other subgroups
        const adjustedNumerator = totalNumerator - numerator;
        const adjustedDenominator = totalDenominator - denominator;
        const adjustedSuccessRate = adjustedDenominator > 0 ? (adjustedNumerator / adjustedDenominator) * 100 : 0;

        // Calculate PPG-1 value
        const ppg1Value = successRate - adjustedSuccessRate;

        // Update the table with the calculated values
        document.getElementById(`successRate-${row}-${col}`).innerText = successRate.toFixed(1) + '%';
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = ppg1Value.toFixed(1) + '%';

        // Update heatmap colors based on PPG-1 value
        const bgColor = getHeatmapColor(ppg1Value);
        ppg1Cell.style.backgroundColor = bgColor;
        ppg1Cell.style.color = bgColor === '#ff0000' ? '#ffffff' : '#000000'; // Adjust text color for readability
      } else {
        // Clear the fields if denominator is 0
        document.getElementById(`successRate-${row}-${col}`).innerText = '';
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = '';
        ppg1Cell.style.backgroundColor = '';
        ppg1Cell.style.color = '';
      }
    }
  }
}

// Helper function to clear calculations if fewer than two subgroups are filled
function clearCalculations() {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 4; col++) {
      document.getElementById(`successRate-${row}-${col}`).innerText = '';
      const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
      ppg1Cell.innerText = '';
      ppg1Cell.style.backgroundColor = '';
      ppg1Cell.style.color = '';
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
  
