/**
 * Logger utility
 * Provides structured logging for the application
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Current log level (can be set from environment variable)
const currentLogLevel = process.env.LOG_LEVEL || 'INFO';

// Format timestamp
const formatTimestamp = () => {
  return new Date().toISOString();
};

// Format log message
const formatLogMessage = (level, message, context = {}) => {
  const timestamp = formatTimestamp();
  
  // Build structured log object
  const logObject = {
    timestamp,
    level,
    message
  };
  
  // Add context if provided
  if (Object.keys(context).length > 0) {
    logObject.context = context;
  }
  
  return JSON.stringify(logObject);
};

// Log methods
const logger = {
  error: (message, context = {}) => {
    console.error(formatLogMessage(LOG_LEVELS.ERROR, message, context));
  },
  
  warn: (message, context = {}) => {
    if (['ERROR', 'WARN', 'INFO', 'DEBUG'].includes(currentLogLevel)) {
      console.warn(formatLogMessage(LOG_LEVELS.WARN, message, context));
    }
  },
  
  info: (message, context = {}) => {
    if (['INFO', 'DEBUG'].includes(currentLogLevel)) {
      console.info(formatLogMessage(LOG_LEVELS.INFO, message, context));
    }
  },
  
  debug: (message, context = {}) => {
    if (['DEBUG'].includes(currentLogLevel)) {
      console.debug(formatLogMessage(LOG_LEVELS.DEBUG, message, context));
    }
  },
  
  // Log HTTP request
  request: (req, res, responseTime) => {
    if (['INFO', 'DEBUG'].includes(currentLogLevel)) {
      const context = {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userAgent: req.get('user-agent') || '-',
        ip: req.ip || req.connection.remoteAddress
      };
      
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, context);
    }
  }
};

module.exports = logger; 