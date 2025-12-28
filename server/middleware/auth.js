const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required. Please provide a valid token.' 
      });
    }
    
    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required. Please provide a valid token.' 
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      
      // Find user and attach to request
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found. Token is invalid.' 
        });
      }
      
      // Attach user to request object
      req.user = user;
      req.userId = decoded.userId;
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token has expired. Please login again.' 
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Invalid token. Please login again.' 
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed. Please try again.' 
    });
  }
};

// Optional authentication - doesn't fail if no token, but attaches user if token is valid
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user) {
          req.user = user;
          req.userId = decoded.userId;
        }
      } catch (error) {
        // Token is invalid, but continue without authentication
        // This allows anonymous users to still use the app
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};


