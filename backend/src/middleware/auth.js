const jwt = require('jsonwebtoken');
const prismaUtil = require('../utils/prisma');
const prisma = prismaUtil.prisma;

// Cache for user data to reduce database queries
// Make it globally accessible
if (!global.userCache) {
  global.userCache = {
    data: {},
    maxAge: 300000, // 5 minutes
    timestamps: {}
  };
}

// Initialize token blacklist if not exists
if (!global.tokenBlacklist) {
  global.tokenBlacklist = new Set();
}

// Check if user is in cache and still valid
const getUserFromCache = (userId) => {
  if (!global.userCache.data[userId] || !global.userCache.timestamps[userId]) {
    return null;
  }
  
  const now = Date.now();
  if (now - global.userCache.timestamps[userId] > global.userCache.maxAge) {
    // Cache expired
    delete global.userCache.data[userId];
    delete global.userCache.timestamps[userId];
    return null;
  }
  
  return global.userCache.data[userId];
};

// Add user to cache
const cacheUser = (user) => {
  if (user && user.id) {
    global.userCache.data[user.id] = user;
    global.userCache.timestamps[user.id] = Date.now();
  }
};

/**
 * Middleware to authenticate JWT token
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, authorization denied' });
    }

    // Check if token is blacklisted
    if (global.tokenBlacklist && global.tokenBlacklist.has(token)) {
      return res.status(401).json({ message: 'Token is invalid or has been logged out' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // For DELETE operations, always fetch fresh user data from database
    const isDeleteRequest = req.method === 'DELETE';
    
    // Get user from cache or database
    let user = isDeleteRequest ? null : getUserFromCache(decoded.id);
    
    if (!user) {
      // User not in cache or delete request, fetch from database
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          username: true
        }
      });
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Add user to cache
      cacheUser(user);
    }
    
    // Log user role for debugging
    console.log(`User ${user.id} (${user.username}) with role ${user.role} accessing ${req.method} ${req.originalUrl}`);
    
    // Add user to request object
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Middleware to check user role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied: insufficient permissions' 
      });
    }

    next();
  };
};

module.exports = { auth, authorize }; 