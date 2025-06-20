const jwt = require('jsonwebtoken');

/**
 * Authentication middleware to verify JWT token
 */
const authenticate = (req, res, next) => {
  try {
    // Check if authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Extract token from header (Bearer <token>)
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication token required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request object
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token', 
      error: error.message 
    });
  }
};

/**
 * Role-based access control middleware
 * @param {string[]} roles - Array of allowed roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    // Convert string role to array if needed
    if (typeof roles === 'string') {
      roles = [roles];
    }

    // Check if user role is in allowed roles
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: you do not have permission to access this resource' 
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
}; 