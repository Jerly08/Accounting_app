const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');

const prisma = new PrismaClient();

/**
 * @route   GET /api/chartofaccounts
 * @desc    Get all chart of accounts with optional filtering
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { search, type, category, limit, page } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 100; // Default higher for accounts list
    const skip = (pageNumber - 1) * pageSize;

    // Build filter conditions
    let where = {};
    if (search) {
      where = {
        OR: [
          { code: { contains: search } },
          { name: { contains: search } }
        ]
      };
    }

    if (type) {
      where = {
        ...where,
        type
      };
    }

    if (category) {
      where = {
        ...where,
        category
      };
    }

    // Get accounts with pagination
    const accounts = await prisma.chartofaccount.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { code: 'asc' }
      ]
    });

    // Get total count for pagination
    const total = await prisma.chartofaccount.count({ where });

    res.json({
      success: true,
      data: accounts,
      pagination: {
        page: pageNumber,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving chart of accounts',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/chartofaccounts/type/:type
 * @desc    Get accounts by type
 * @access  Private
 */
router.get('/type/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const accounts = await prisma.chartofaccount.findMany({
      where: { type },
      orderBy: { code: 'asc' }
    });

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving accounts by type',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/chartofaccounts/:code
 * @desc    Get single account by code
 * @access  Private
 */
router.get('/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const account = await prisma.chartofaccount.findUnique({
      where: { code }
    });

    if (!account) {
      return res.status(404).json({ 
        success: false, 
        message: 'Account not found' 
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving account',
      error: error.message 
    });
  }
});

module.exports = router; 