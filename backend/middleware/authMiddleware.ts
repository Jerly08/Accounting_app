import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT secret key (should be loaded from environment variables in production)
const JWT_SECRET = 'your_default_secret_key';

// Extend the Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token and extract user data
    const decodedToken = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      username: string;
      role: string;
    };
    
    // Attach user data to the request object
    req.user = decodedToken;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}; 