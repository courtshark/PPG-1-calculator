function calculatePPG1() {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');

  // Calculate totals for each column (for each year)
  const columnTotals = {
    totalNumerator: [0, 0, 0, 0],
    totalDenominator: [0, 0, 0, 0]
  };

  // Sum up the numerators and denominators for each year (column)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 9; row++) {  // Assuming 9 subgroups (you can adjust this)
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

      columnTotals.totalNumerator[col] += numerator;
      columnTotals.totalDenominator[col] += denominator;
    }
  }

  // Now calculate PPG-1 for each subgroup and year
  for (let row = 0; row < 9; row++) {  // Loop through rows (subgroups)
    for (let col = 0; col < 4; col++) {  // Loop through columns (years)
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

      if (denominator > 0 && columnTotals.totalDenominator[col] > 0) {
        // Calculate group success rate
        const groupSuccessRate = numerator / denominator;

        // Adjust totals by subtracting the current group's values
        const adjustedNumerator = columnTotals.totalNumerator[col] - numerator;
        const adjustedDenominator = columnTotals.totalDenominator[col] - denominator;

        // Ensure adjusted denominator is greater than zero to avoid division by zero
        const adjustedSuccessRate = adjustedDenominator > 0 ? adjustedNumerator / adjustedDenominator : 0;

        // Calculate PPG-1
        const ppg1Value = ((groupSuccessRate - adjustedSuccessRate) * 100).toFixed(1);

        // Update the PPG-1 value in the table
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = `${ppg1Value}%`;

        // Apply background color based on PPG-1 value
        const bgColor = getHeatmapColor(ppg1Value);
        ppg1Cell.style.backgroundColor = bgColor;
        ppg1Cell.style.color = bgColor === '#ff0000' ? '#ffffff' : '#000000';  // White text on red background, black otherwise
      } else {
        // Clear the PPG-1 cell if there's no denominator
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = '';
        ppg1Cell.style.backgroundColor = '';
        ppg1Cell.style.color = '';  // Reset text color
      }
    }
  }
}

// Helper function to apply heatmap color based on PPG-1 value
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
