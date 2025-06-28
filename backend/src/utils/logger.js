/**
 * Simple logger utility
 */
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const errorLogPath = path.join(logsDir, 'error.log');
const infoLogPath = path.join(logsDir, 'info.log');

/**
 * Format log message with timestamp
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @returns {string} - Formatted log message
 */
const formatLogMessage = (level, message, data) => {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (data) {
    if (data instanceof Error) {
      logMessage += `\n${data.stack || data.message}`;
    } else {
      try {
        logMessage += `\n${JSON.stringify(data, null, 2)}`;
      } catch (e) {
        logMessage += `\n[Non-serializable data]`;
      }
    }
  }
  
  return logMessage;
};

/**
 * Write log to file
 * @param {string} filePath - Path to log file
 * @param {string} message - Message to log
 */
const writeToFile = (filePath, message) => {
  fs.appendFile(filePath, message + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
};

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Error|Object} error - Error object or additional data
 */
const error = (message, error) => {
  const logMessage = formatLogMessage('ERROR', message, error);
  console.error(logMessage);
  writeToFile(errorLogPath, logMessage);
};

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} data - Additional data
 */
const info = (message, data) => {
  const logMessage = formatLogMessage('INFO', message, data);
  console.log(logMessage);
  writeToFile(infoLogPath, logMessage);
};

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} data - Additional data
 */
const warn = (message, data) => {
  const logMessage = formatLogMessage('WARN', message, data);
  console.warn(logMessage);
  writeToFile(infoLogPath, logMessage);
};

/**
 * Log debug message (only in development)
 * @param {string} message - Debug message
 * @param {Object} data - Additional data
 */
const debug = (message, data) => {
  if (process.env.NODE_ENV !== 'production') {
    const logMessage = formatLogMessage('DEBUG', message, data);
    console.debug(logMessage);
  }
};

module.exports = {
  error,
  info,
  warn,
  debug
}; 