const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prismaUtil = require('../utils/prisma');
const prisma = prismaUtil.prisma;
const { auth } = require('../middleware/auth');

// Initialize token blacklist if not exists
if (!global.tokenBlacklist) {
  global.tokenBlacklist = new Set();
}

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user', username } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if username already exists (if provided)
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      });

      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        username: username || email, // Use email as username if not provided
        password: hashedPassword,
        role,
        updatedAt: new Date()
      }
    });

    // Create token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists - support login with either username or email
    let user;
    if (email) {
      user = await prisma.user.findUnique({
        where: { email }
      });
    } else if (username) {
      user = await prisma.user.findUnique({
        where: { username }
      });
    } else {
      return res.status(400).json({ message: 'Username or email is required' });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/auth/logout
// @desc    Logout user and invalidate token
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    // Add token to blacklist
    const token = req.token;
    if (token) {
      if (!global.tokenBlacklist) {
        global.tokenBlacklist = new Set();
      }
      global.tokenBlacklist.add(token);
      
      // Remove user from cache if exists
      if (req.user && req.user.id && global.userCache && global.userCache.data) {
        delete global.userCache.data[req.user.id];
        delete global.userCache.timestamps[req.user.id];
      }
      
      console.log(`User ${req.user.id} logged out, token invalidated`);
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// @route   GET api/auth/verify
// @desc    Verify token and return user data
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 