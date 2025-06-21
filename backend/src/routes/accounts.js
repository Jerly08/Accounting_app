const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

/**
 * @route   GET /api/accounts
 * @desc    Get all chart of accounts with optional filtering
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, type, limit, page } = req.query;
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
      message: 'Error saat mengambil data akun',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/accounts/:code
 * @desc    Get single account by code
 * @access  Private
 */
router.get('/:code', authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const account = await prisma.chartofaccount.findUnique({
      where: { code },
      include: {
        _count: {
          select: { transaction: true }
        }
      }
    });

    if (!account) {
      return res.status(404).json({ 
        success: false, 
        message: 'Akun tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data akun',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/accounts/type/:type
 * @desc    Get accounts by type
 * @access  Private
 */
router.get('/type/:type', authenticate, async (req, res) => {
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
      message: 'Error saat mengambil data akun',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/accounts
 * @desc    Create new account
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { code, name, type } = req.body;

    // Validate required fields
    if (!code || !name || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode, nama, dan tipe akun wajib diisi' 
      });
    }

    // Validate code format
    if (!/^\d{4}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Kode akun harus 4 digit angka'
      });
    }

    // Check if account code already exists
    const existingAccount = await prisma.chartofaccount.findUnique({
      where: { code }
    });

    if (existingAccount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode akun sudah digunakan',
        code: 'ACCOUNT_CODE_EXISTS'
      });
    }

    // Validate account type
    const validTypes = ['Pendapatan', 'Beban', 'Aktiva', 'Aset Tetap', 'Kontra Aset'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe akun tidak valid',
        validTypes
      });
    }

    // Create account
    const account = await prisma.chartofaccount.create({
      data: {
        code,
        name,
        type,
        updatedAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Akun berhasil ditambahkan',
      data: account
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menambahkan akun',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/accounts/:code
 * @desc    Update account
 * @access  Private (Admin only)
 */
router.put('/:code', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { code } = req.params;
    const { name, type } = req.body;

    // Check if account exists
    const existingAccount = await prisma.chartofaccount.findUnique({
      where: { code }
    });

    if (!existingAccount) {
      return res.status(404).json({ 
        success: false, 
        message: 'Akun tidak ditemukan' 
      });
    }

    // Validate account type
    const validTypes = ['Pendapatan', 'Beban', 'Aktiva', 'Aset Tetap', 'Kontra Aset'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe akun tidak valid',
        validTypes
      });
    }

    // Update account
    const updatedAccount = await prisma.chartofaccount.update({
      where: { code },
      data: {
        name,
        type,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Akun berhasil diperbarui',
      data: updatedAccount
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui akun',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/accounts/:code
 * @desc    Delete account
 * @access  Private (Admin only)
 */
router.delete('/:code', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { code } = req.params;
    
    // Check if account exists
    const existingAccount = await prisma.chartofaccount.findUnique({
      where: { code },
      include: {
        _count: {
          select: { transaction: true }
        }
      }
    });

    if (!existingAccount) {
      return res.status(404).json({ 
        success: false, 
        message: 'Akun tidak ditemukan' 
      });
    }
    
    // Check if account has transactions
    if (existingAccount._count.transaction > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus akun yang memiliki transaksi'
      });
    }

    // Delete account
    await prisma.chartofaccount.delete({
      where: { code }
    });

    res.json({
      success: true,
      message: 'Akun berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghapus akun',
      error: error.message 
    });
  }
});

module.exports = router; 