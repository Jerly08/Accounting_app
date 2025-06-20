const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const { prisma } = require('../utils/prisma');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Return token and user data (excluding password)
    const { password: _, ...userData } = user;
    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: userData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saat login', error: error.message });
  }
});

// Register route (for admin to create new users)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, name, role } = req.body;
    
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
    
    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name,
        role: role || 'user'
      }
    });

    // Remove password from response
    const { password: _, ...userData } = newUser;
    
    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      user: userData
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat registrasi', 
      error: error.message 
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
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
    res.status(401).json({ success: false, message: 'Token tidak valid', error: error.message });
  }
});

// Verify token endpoint
router.get('/verify', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user || !user.id) {
      return res.status(401).json({ 
        valid: false, 
        message: 'Invalid token' 
      });
    }
    
    // Get fresh user data from database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!userData) {
      return res.status(401).json({ 
        valid: false, 
        message: 'User not found' 
      });
    }
    
    res.status(200).json({
      valid: true,
      message: 'Token is valid',
      user: userData
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Server error during token verification', 
      error: error.message 
    });
  }
});

module.exports = router; 