document.addEventListener('DOMContentLoaded', (event) => {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');

  // Add event listener to recalculate when numerator or denominator changes
  document.querySelectorAll('.inputNumerator, .inputDenominator').forEach(input => {
    input.addEventListener('input', () => {
      console.log('Numerator or Denominator changed, recalculating...');
      calculate();
    });
  });

  // Call calculate on page load
  calculate();
});

function calculate() {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');

  // Calculate total numerator and denominator
  const totalNumerator = Array.from(numeratorInputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
  const totalDenominator = Array.from(denominatorInputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);

  // Debugging: Log total numerator and denominator
  console.log(`Total Numerator: ${totalNumerator}, Total Denominator: ${totalDenominator}`);

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 4; col++) {
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

      // Ensure denominator is non-zero
      if (denominator > 0) {
        // Calculate the success rate for the current row and column
        const successRate = (numerator / denominator).toFixed(4);

        // Calculate adjusted numerator and denominator by removing the current group from the totals
        const adjustedNumerator = totalNumerator - numerator;
        const adjustedDenominator = totalDenominator - denominator;

        // Ensure adjusted denominator is non-zero to avoid division by zero
        const adjustedSuccessRate = adjustedDenominator > 0 ? (adjustedNumerator / adjustedDenominator).toFixed(4) : 0;

        // Calculate PPG-1
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
