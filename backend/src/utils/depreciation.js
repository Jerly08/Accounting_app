/**
 * Calculate depreciation for a fixed asset using straight-line method
 * @param {number} value - Original asset value
 * @param {Date|string} acquisitionDate - Date of asset acquisition
 * @param {number} usefulLife - Useful life in years
 * @param {Date|string} calculationDate - Date to calculate depreciation to (defaults to current date)
 * @returns {Object} Depreciation data
 */
exports.calculateDepreciation = (value, acquisitionDate, usefulLife, calculationDate = new Date()) => {
  // Ensure dates are Date objects
  const acqDate = acquisitionDate instanceof Date ? acquisitionDate : new Date(acquisitionDate);
  const calcDate = calculationDate instanceof Date ? calculationDate : new Date(calculationDate);
  
  // Calculate time elapsed
  const msPerDay = 1000 * 60 * 60 * 24;
  const msPerMonth = msPerDay * 30.44; // Average days per month
  const msPerYear = msPerDay * 365.25; // Account for leap years
  
  const timeElapsedMs = Math.max(0, calcDate.getTime() - acqDate.getTime());
  const daysElapsed = timeElapsedMs / msPerDay;
  const monthsElapsed = timeElapsedMs / msPerMonth;
  const yearsElapsed = timeElapsedMs / msPerYear;
  
  // Calculate depreciation rates
  const depreciationPerYear = value / usefulLife;
  const depreciationPerMonth = depreciationPerYear / 12;
  const depreciationPerDay = depreciationPerYear / 365.25;
  
  // Calculate accumulated depreciation
  // Using the exact number of days for more precise calculation
  let accumulatedDepreciation = depreciationPerDay * daysElapsed;
  
  // Cap accumulated depreciation at the asset value
  accumulatedDepreciation = Math.min(accumulatedDepreciation, value);
  
  // Calculate book value
  const bookValue = Math.max(0, value - accumulatedDepreciation);
  
  // Calculate remaining life
  const remainingYears = Math.max(0, usefulLife - yearsElapsed);
  const remainingMonths = Math.max(0, usefulLife * 12 - monthsElapsed);
  
  // Determine if asset is fully depreciated
  const isFullyDepreciated = bookValue === 0 || yearsElapsed >= usefulLife;
  
  return {
    originalValue: value,
    depreciationPerYear,
    depreciationPerMonth,
    depreciationPerDay,
    daysElapsed: Math.floor(daysElapsed),
    monthsElapsed: Math.floor(monthsElapsed),
    yearsElapsed: Math.floor(yearsElapsed * 100) / 100, // Round to 2 decimal places
    accumulatedDepreciation,
    bookValue,
    remainingYears: Math.ceil(remainingYears * 100) / 100, // Round up to 2 decimal places
    remainingMonths: Math.ceil(remainingMonths),
    isFullyDepreciated,
  };
};

/**
 * Calculate monthly depreciation schedule for an asset
 * @param {number} value - Original asset value
 * @param {Date|string} acquisitionDate - Date of asset acquisition
 * @param {number} usefulLife - Useful life in years
 * @returns {Array} Monthly depreciation schedule
 */
exports.calculateMonthlySchedule = (value, acquisitionDate, usefulLife) => {
  const acqDate = acquisitionDate instanceof Date ? acquisitionDate : new Date(acquisitionDate);
  const depreciationPerYear = value / usefulLife;
  const depreciationPerMonth = depreciationPerYear / 12;
  const totalMonths = usefulLife * 12;
  
  const schedule = [];
  let remainingValue = value;
  
  for (let i = 0; i < totalMonths; i++) {
    // Calculate date for this period
    const currentDate = new Date(acqDate);
    currentDate.setMonth(acqDate.getMonth() + i);
    
    // Calculate depreciation for this period
    const monthDepreciation = Math.min(depreciationPerMonth, remainingValue);
    remainingValue -= monthDepreciation;
    
    // Ensure we don't go below zero
    if (remainingValue < 0) remainingValue = 0;
    
    schedule.push({
      period: i + 1,
      date: currentDate,
      depreciation: monthDepreciation,
      accumulatedDepreciation: value - remainingValue,
      bookValue: remainingValue,
    });
    
    // If fully depreciated, stop
    if (remainingValue === 0) break;
  }
  
  return schedule;
};

/**
 * Calculate yearly depreciation schedule for an asset
 * @param {number} value - Original asset value
 * @param {Date|string} acquisitionDate - Date of asset acquisition
 * @param {number} usefulLife - Useful life in years
 * @returns {Array} Yearly depreciation schedule
 */
exports.calculateYearlySchedule = (value, acquisitionDate, usefulLife) => {
  const acqDate = acquisitionDate instanceof Date ? acquisitionDate : new Date(acquisitionDate);
  const depreciationPerYear = value / usefulLife;
  
  const schedule = [];
  let remainingValue = value;
  
  for (let i = 0; i < usefulLife; i++) {
    // Calculate date for this period
    const currentDate = new Date(acqDate);
    currentDate.setFullYear(acqDate.getFullYear() + i);
    
    // Calculate depreciation for this period
    const yearDepreciation = Math.min(depreciationPerYear, remainingValue);
    remainingValue -= yearDepreciation;
    
    // Ensure we don't go below zero
    if (remainingValue < 0) remainingValue = 0;
    
    schedule.push({
      year: i + 1,
      date: currentDate,
      depreciation: yearDepreciation,
      accumulatedDepreciation: value - remainingValue,
      bookValue: remainingValue,
    });
    
    // If fully depreciated, stop
    if (remainingValue === 0) break;
  }
  
  return schedule;
}; 