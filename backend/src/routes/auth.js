const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const { prisma } = require('../utils/prisma');

// Login route
router.post('/login', async (req, res) => {
  console.log('Login attempt:', { 
    body: req.body,
    headers: req.headers
  });
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ 
        success: false, 
        message: 'Username dan password harus diisi' 
      });
    }
    
    console.log('Finding user with username:', username);
    
    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username }
    });

    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User details (excluding password):', {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    // Check password
    console.log('Comparing password');
    console.log('Input password:', password);
    console.log('Stored hashed password:', user.password);
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    // Generate JWT token
    console.log('Generating JWT token');
    console.log('JWT_SECRET available:', !!process.env.JWT_SECRET);
    console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
    
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secure_jwt_secret_key_for_accounting_app',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return token and user data (excluding password)
    const { password: _, ...userData } = user;
    console.log('Login successful for user:', userData.username);
    
    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error saat login', error: error.message });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, name, role = 'user' } = req.body;
    
    // Validate required fields
    if (!username || !email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Semua field wajib diisi (username, email, password, name)' 
      });
    }
    
    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username atau email sudah digunakan' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user with current date for timestamps
    const now = new Date();
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name,
        role: role || 'user',
        createdAt: now,
        updatedAt: now
      }
    });

    // Remove password from response
    const { password: _, ...userData } = newUser;
    
    // Generate token for immediate login
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || 'secure_jwt_secret_key_for_accounting_app',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      user: userData,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat registrasi', 
      error: error.message 
    });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    // User is already attached to req by the authenticate middleware
    if (!req.user || !req.user.id) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    // Remove password from response
    const { password: _, ...userData } = user;
    
    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil profil', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/auth/verify
 * @desc    Verify JWT token
 * @access  Private
 */
router.get('/verify', authenticate, async (req, res) => {
  try {
    // If authenticate middleware passed, token is valid
    res.json({ 
      success: true, 
      message: 'Token is valid',
      user: req.user 
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
});

module.exports = router; 