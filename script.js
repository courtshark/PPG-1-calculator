function calculate() {
  const numeratorInputs = document.querySelectorAll('.inputNumerator');
  const denominatorInputs = document.querySelectorAll('.inputDenominator');

  const totalNumerator = Array.from(numeratorInputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
  const totalDenominator = Array.from(denominatorInputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 4; col++) {
      const numerator = parseFloat(numeratorInputs[row * 4 + col].value) || 0;
      const denominator = parseFloat(denominatorInputs[row * 4 + col].value) || 0;

      if (denominator > 0) {
        const successRate = ((numerator / denominator) * 100).toFixed(1);

        const adjustedNumerator = totalNumerator - numerator;
        const adjustedDenominator = totalDenominator - denominator;
        const adjustedSuccessRate = adjustedDenominator > 0 ? ((adjustedNumerator / adjustedDenominator) * 100).toFixed(1) : 0;

        const ppg1Value = (successRate - adjustedSuccessRate).toFixed(1);

        document.getElementById(`successRate-${row}-${col}`).innerText = successRate + '%';
        const ppg1Cell = document.getElementById(`ppg1Value-${row}-${col}`);
        ppg1Cell.innerText = ppg1Value + '%';

        // Determine background color and text color
        const bgColor = getHeatmapColor(ppg1Value);
        ppg1Cell.style.backgroundColor = bgColor;
        ppg1Cell.style.color = bgColor === '#ff0000' ? '#ffffff' : '#000000'; // White text on red background, black otherwise
      } else {
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
