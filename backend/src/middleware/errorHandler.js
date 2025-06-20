/**
 * Error Handler Middleware
 * Middleware untuk menangani error di aplikasi
 */
const { formatErrorResponse } = require('../services/validation');
const logger = require('../utils/logger');

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error dengan detail
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    statusCode: err.statusCode || 500
  });
  
  // Format error response
  const errorResponse = formatErrorResponse(err);
  
  // Send error response
  res.status(err.statusCode || 500).json(errorResponse);
};

/**
 * Not found handler middleware
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    url: req.originalUrl,
    method: req.method
  });
  
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
    error: `Route ${req.method} ${req.originalUrl} tidak ditemukan`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
}; 