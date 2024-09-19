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
  
