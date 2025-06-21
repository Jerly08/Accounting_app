const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { exportTransactionsToExcel, handleExportError } = require('../utils/exportHelper');

const prisma = new PrismaClient();

/**
 * @route   GET /api/transactions
 * @desc    Get all transactions with optional filtering
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, accountCode, projectId, startDate, endDate, limit, page } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 20;
    const skip = (pageNumber - 1) * pageSize;

    // Build filter conditions
    let where = {};
    
    if (type) {
      where.type = type;
    }

    if (accountCode) {
      where.accountCode = accountCode;
    }

    if (projectId) {
      where.projectId = parseInt(projectId);
    }

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Get transactions with pagination
    const transactions = await prisma.transaction.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { date: 'desc' }
      ],
      include: {
        chartofaccount: true,
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true
          }
        }
      }
    });

    // Get total count for pagination
    const total = await prisma.transaction.count({ where });

    // Get total amount by type
    const totalIncome = await prisma.transaction.aggregate({
      where: {
        ...where,
        type: 'income'
      },
      _sum: {
        amount: true
      }
    });

    const totalExpense = await prisma.transaction.aggregate({
      where: {
        ...where,
        type: 'expense'
      },
      _sum: {
        amount: true
      }
    });

    res.json({
      success: true,
      data: transactions,
      summary: {
        totalIncome: totalIncome._sum.amount || 0,
        totalExpense: totalExpense._sum.amount || 0,
        netAmount: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0)
      },
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
      message: 'Error saat mengambil data transaksi',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/transactions/:id
 * @desc    Get single transaction by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        chartofaccount: true,
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaksi tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data transaksi',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/transactions/project/:projectId
 * @desc    Get transactions for a specific project
 * @access  Private
 */
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { type } = req.query;

    // Build filter conditions
    let where = { 
      projectId: parseInt(projectId) 
    };
    
    if (type) {
      where.type = type;
    }

    // Get all transactions for the project
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: [
        { date: 'desc' }
      ],
      include: {
        chartofaccount: true
      }
    });

    // Get totals by type
    const totalIncome = await prisma.transaction.aggregate({
      where: {
        projectId: parseInt(projectId),
        type: 'income'
      },
      _sum: {
        amount: true
      }
    });

    const totalExpense = await prisma.transaction.aggregate({
      where: {
        projectId: parseInt(projectId),
        type: 'expense'
      },
      _sum: {
        amount: true
      }
    });

    res.json({
      success: true,
      data: transactions,
      summary: {
        totalIncome: totalIncome._sum.amount || 0,
        totalExpense: totalExpense._sum.amount || 0,
        netAmount: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data transaksi proyek',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/transactions/account/:accountCode
 * @desc    Get transactions for a specific account
 * @access  Private
 */
router.get('/account/:accountCode', authenticate, async (req, res) => {
  try {
    const { accountCode } = req.params;
    const { startDate, endDate } = req.query;

    // Build filter conditions
    let where = { 
      accountCode 
    };
    
    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Get all transactions for the account
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: [
        { date: 'desc' }
      ],
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true
          }
        }
      }
    });

    // Get total
    const total = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true
      }
    });

    res.json({
      success: true,
      data: transactions,
      summary: {
        totalAmount: total._sum.amount || 0
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data transaksi akun',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/transactions
 * @desc    Create new transaction
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { date, type, accountCode, description, amount, projectId } = req.body;
    
    // Validate required fields
    if (!date || !type || !accountCode || !description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal, tipe, kode akun, deskripsi, dan jumlah wajib diisi'
      });
    }

    // Validate account exists
    const account = await prisma.chartofaccount.findUnique({
      where: { code: accountCode }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Akun tidak ditemukan'
      });
    }

    // Validate project if provided
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyek tidak ditemukan'
        });
      }
    }

    // Validate transaction type
    const validTypes = ['income', 'expense'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe transaksi tidak valid',
        validTypes
      });
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        type,
        accountCode,
        description,
        amount: parseFloat(amount),
        projectId: projectId ? parseInt(projectId) : null,
        updatedAt: new Date()
      },
      include: {
        chartofaccount: true,
        project: projectId ? {
          select: {
            projectCode: true,
            name: true
          }
        } : undefined
      }
    });

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil ditambahkan',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menambahkan transaksi',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/transactions/:id
 * @desc    Update transaction
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, accountCode, description, amount, projectId } = req.body;

    // Check if transaction exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan'
      });
    }

    // Validate account if changed
    if (accountCode) {
      const account = await prisma.chartofaccount.findUnique({
        where: { code: accountCode }
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Akun tidak ditemukan'
        });
      }
    }

    // Validate project if provided
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyek tidak ditemukan'
        });
      }
    }

    // Validate transaction type
    const validTypes = ['income', 'expense'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe transaksi tidak valid',
        validTypes
      });
    }

    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        date: date ? new Date(date) : undefined,
        type,
        accountCode,
        description,
        amount: amount ? parseFloat(amount) : undefined,
        projectId: projectId ? parseInt(projectId) : projectId === null ? null : undefined
      }
    });

    res.json({
      success: true,
      message: 'Transaksi berhasil diperbarui',
      data: updatedTransaction
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui transaksi',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/transactions/:id
 * @desc    Delete transaction
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transaction exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan'
      });
    }

    // Delete transaction
    await prisma.transaction.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Transaksi berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghapus transaksi',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/transactions/export
 * @desc    Export transactions to Excel
 * @access  Private
 */
router.get('/export', authenticate, async (req, res) => {
  try {
    console.log('Starting export process with query params:', req.query);
    
    // Extract filter parameters
    const { type, accountCode, projectId, startDate, endDate } = req.query;
    
    // Build filter object for database query
    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (accountCode) {
      filter.accountCode = accountCode;
    }
    
    if (projectId) {
      if (projectId === 'none') {
        filter.projectId = null;
      } else {
        try {
          filter.projectId = parseInt(projectId);
        } catch (error) {
          console.error('Error parsing projectId:', error);
          // Skip this filter if parsing fails
        }
      }
    }
    
    // Date range filter using Prisma syntax
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        try {
          filter.date.gte = new Date(startDate);
        } catch (error) {
          console.error('Error parsing startDate:', error);
          // Use a default date if parsing fails
          filter.date.gte = new Date(0); // Jan 1, 1970
        }
      }
      if (endDate) {
        try {
          filter.date.lte = new Date(endDate);
        } catch (error) {
          console.error('Error parsing endDate:', error);
          // Use current date if parsing fails
          filter.date.lte = new Date();
        }
      }
    }
    
    console.log('Fetching transactions with filter:', JSON.stringify(filter));
    
    // Fetch transactions with related data
    let transactions = [];
    try {
      transactions = await prisma.transaction.findMany({
        where: filter,
        orderBy: {
          date: 'desc'
        },
        include: {
          chartofaccount: true,
          project: {
            include: {
              client: true
            }
          }
        }
      });
      
      console.log(`Found ${transactions.length} transactions`);
    } catch (dbError) {
      console.error('Database error when fetching transactions:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error when fetching transactions',
        error: dbError.message 
      });
    }
    
    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No transactions found for the specified filters',
        data: []
      });
    }
    
    // Get filter names for Excel report
    let accountName = null;
    let projectName = null;
    
    if (accountCode) {
      try {
        const account = await prisma.chartofaccount.findUnique({
          where: { code: accountCode }
        });
        accountName = account?.name;
      } catch (error) {
        console.error('Error fetching account name:', error);
      }
    }
    
    if (projectId && projectId !== 'none') {
      try {
        const project = await prisma.project.findUnique({
          where: { id: parseInt(projectId) }
        });
        projectName = project?.name;
      } catch (error) {
        console.error('Error fetching project name:', error);
      }
    } else if (projectId === 'none') {
      projectName = 'No Project';
    }
    
    console.log('Generating Excel file');
    
    // Generate Excel file
    let excelBuffer;
    try {
      excelBuffer = await exportTransactionsToExcel(transactions, {
        filters: {
          type,
          accountName,
          projectName,
          startDate,
          endDate
        }
      });
      
      console.log('Excel file generated successfully');
    } catch (excelError) {
      console.error('Error generating Excel:', excelError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error generating Excel file',
        error: excelError.message 
      });
    }
    
    if (!excelBuffer) {
      console.error('Excel buffer is null or undefined');
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate Excel buffer'
      });
    }
    
    // Set response headers for Excel download
    try {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=financial_transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      console.log('Sending Excel file to client');
      
      // Send the Excel file
      return res.status(200).send(excelBuffer);
    } catch (responseError) {
      console.error('Error sending response:', responseError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error sending Excel file',
        error: responseError.message 
      });
    }
    
  } catch (error) {
    console.error('Unexpected error in exportTransactions:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Unexpected error during export',
      error: error.message 
    });
  }
});

module.exports = router; 