/**
 * Request Logger Middleware
 * Middleware untuk mencatat HTTP requests
 */
const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom token untuk response time
morgan.token('response-time', (req, res) => {
  return res.responseTime ? res.responseTime : '-';
});

// Format log untuk development
const devFormat = ':method :url :status :response-time ms';

// Format log untuk production
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

// Middleware untuk mencatat waktu respons
const responseTime = (req, res, next) => {
  const startHrTime = process.hrtime();
  
  // Listener untuk event 'finish'
  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1000000;
    res.responseTime = elapsedTimeInMs.toFixed(3);
    
    // Log request menggunakan logger
    logger.request(req, res, res.responseTime);
  });
  
  next();
};

// Middleware untuk development
const developmentLogger = [
  responseTime,
  morgan(devFormat, {
    skip: (req, res) => {
      // Skip logging for successful static requests
      return req.url.startsWith('/static') && res.statusCode < 400;
    }
  })
];

// Middleware untuk production
const productionLogger = [
  responseTime,
  morgan(prodFormat, {
    skip: (req, res) => {
      // Skip logging for successful static requests
      return req.url.startsWith('/static') && res.statusCode < 400;
    }
  })
];

module.exports = {
  developmentLogger,
  productionLogger
}; 