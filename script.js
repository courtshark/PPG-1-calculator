function calculatePPG1() {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');
  const successRatesTable = document.querySelectorAll('#successRatesTable td[id^="successRate"]'); 

  // Calculate totals for each column (for each year)
  const columnTotals = {
    totalNumerator: [0, 0, 0, 0],
    totalDenominator: [0, 0, 0, 0]
  };

  // Iterate through columns (years)
  for (let col = 0; col < 4; col++) {
    let validSubgroups = 0;  // Counter for subgroups with both numerator and denominator filled

    // Iterate through rows (subgroups)
    for (let row = 0; row < 9; row++) {  // Assuming 9 subgroups, adjust as needed
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

      if (numerator > 0 && denominator > 0) {
        validSubgroups++;  // Count how many subgroups have data for the current year

        columnTotals.totalNumerator[col] += numerator;
        columnTotals.totalDenominator[col] += denominator;

        // Calculate and fill out the success rate for this subgroup
        const successRate = ((numerator / denominator) * 100).toFixed(1);
        const successRateCell = document.getElementById(`successRate-${row}-${col}`);
        successRateCell.innerText = `${successRate}%`;
      } else {
        // Clear the success rate cell if there's no valid data
        const successRateCell = document.getElementById(`successRate-${row}-${col}`);
        successRateCell.innerText = '';
      }
    }

    // Only calculate PPG-1 if there are at least 2 valid subgroups for this year
    if (validSubgroups >= 2) {
      // Now calculate PPG-1 for each subgroup in the valid year
      for (let row = 0; row < 9; row++) {
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
    } else {
      // If less than 2 subgroups have data, clear all PPG-1 cells for that year (column)
      for (let row = 0; row < 9; row++) {
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = '';
        ppg1Cell.style.backgroundColor = '';
        ppg1Cell.style.color = '';  // Reset text color
      }
    }
  }
}
