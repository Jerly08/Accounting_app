/**
 * Format a number as Indonesian Rupiah currency
 * @param {number} amount - The amount to format
 * @param {boolean} withSymbol - Whether to include the Rp symbol (default: true)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, withSymbol = true) => {
  if (amount === undefined || amount === null || isNaN(amount)) return withSymbol ? 'Rp 0' : '0';
  
  try {
    // Parse the amount to ensure it's a valid number
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return withSymbol ? 'Rp 0' : '0';
    
    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    
    const formatted = formatter.format(numericAmount);
    
    // If we don't want the symbol, remove "Rp" and any non-breaking space
    return withSymbol ? formatted : formatted.replace(/Rp\s?/g, '');
  } catch (error) {
    console.error('Error formatting currency:', error);
    return withSymbol ? 'Rp 0' : '0';
  }
};

/**
 * Format a date as Indonesian date string
 * @param {string|Date} date - The date to format
 * @param {string} format - The format to use (short, medium, long)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'medium') => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';
  
  const options = {
    short: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
    medium: {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
    long: {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
    time: {
      hour: '2-digit',
      minute: '2-digit',
    },
    datetime: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  };
  
  return new Intl.DateTimeFormat('id-ID', options[format] || options.medium).format(dateObj);
};

/**
 * Format a number with thousand separators
 * @param {number} number - The number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, decimals = 0) => {
  if (number === undefined || number === null) return '0';
  
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

/**
 * Format a percentage value
 * @param {number} value - The value to format as percentage
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string with % symbol
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === undefined || value === null) return '0%';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

/**
 * Truncate text to a maximum length and add ellipsis if needed
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string} Truncated text with ellipsis if needed
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return `${text.substring(0, maxLength)}...`;
}; 