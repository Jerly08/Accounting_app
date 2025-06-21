const jwt = require('jsonwebtoken');
const prismaUtil = require('../utils/prisma');
const prisma = prismaUtil.prisma;

// Cache for user data to reduce database queries
const userCache = {
  data: {},
  maxAge: 300000, // 5 minutes
  timestamps: {}
};

// Check if user is in cache and still valid
const getUserFromCache = (userId) => {
  if (!userCache.data[userId] || !userCache.timestamps[userId]) {
    return null;
  }
  
  const now = Date.now();
  if (now - userCache.timestamps[userId] > userCache.maxAge) {
    // Cache expired
    delete userCache.data[userId];
    delete userCache.timestamps[userId];
    return null;
  }
  
  return userCache.data[userId];
};

// Add user to cache
const cacheUser = (user) => {
  if (user && user.id) {
    userCache.data[user.id] = user;
    userCache.timestamps[user.id] = Date.now();
  }
};

/**
 * Middleware to authenticate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format' 
      });
    }
    
    try {
      // Fast path: verify token without database lookup
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secure_jwt_secret_key_for_accounting_app');
      
      // Check if we have userId in the decoded token
      if (!decoded.userId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token payload'
        });
      }
      
      // Check if user is in cache
      const cachedUser = getUserFromCache(decoded.userId);
      if (cachedUser) {
        req.user = cachedUser;
        return next();
      }
      
      // If not in cache, get from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true
        }
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Add user to cache
      cacheUser(user);
      
      // Set user on request
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication' 
    });
  }
};

/**
 * Middleware to check user role
 */
const authorize = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Check if user has required role
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }
    
    // If specific role is required
    if (role !== 'admin' && req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. ${role} privileges required.` 
      });
    }
    
    next();
  };
};

module.exports = { authenticate, authorize }; 