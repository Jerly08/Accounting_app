const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const doubleEntryService = require('../services/doubleEntryService');
const statusTransitionService = require('../services/statusTransitionService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Configure multer for invoice uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/invoices');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'invoice-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only certain file types
    const fileTypes = /jpeg|jpg|png|pdf/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('File harus bertype image (jpeg, jpg, png) atau PDF'));
    }
  }
});

/**
 * @route   GET /api/billings
 * @desc    Get all billings with optional filtering
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, projectId, startDate, endDate, limit, page } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Build filter conditions
    let where = {};
    
    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = parseInt(projectId);
    }

    // Date range filter
    if (startDate || endDate) {
      where.billingDate = {};
      if (startDate) {
        where.billingDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.billingDate.lte = new Date(endDate);
      }
    }

    // Get billings with pagination
    const billings = await prisma.billing.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { billingDate: 'desc' }
      ],
      include: {
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

    // Get total count for pagination
    const total = await prisma.billing.count({ where });

    // Get total amount
    const totalAmount = await prisma.billing.aggregate({
      where,
      _sum: {
        amount: true
      }
    });

    res.json({
      success: true,
      data: billings,
      summary: {
        totalAmount: totalAmount._sum.amount || 0
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
      message: 'Error saat mengambil data penagihan',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/billings/project/:projectId
 * @desc    Get billings for a specific project
 * @access  Private
 */
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;

    // Build filter conditions
    let where = { 
      projectId: parseInt(projectId) 
    };
    
    if (status) {
      where.status = status;
    }

    // Get all billings for the project
    const billings = await prisma.billing.findMany({
      where,
      orderBy: [
        { billingDate: 'desc' }
      ]
    });

    // Get total amount
    const totalAmount = await prisma.billing.aggregate({
      where,
      _sum: {
        amount: true
      }
    });

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      select: {
        totalValue: true
      }
    });

    const percentageBilled = project ? 
      (totalAmount._sum.amount / parseFloat(project.totalValue.toString())) * 100 : 0;

    res.json({
      success: true,
      data: billings,
      summary: {
        totalAmount: totalAmount._sum.amount || 0,
        percentageBilled: parseFloat(percentageBilled.toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data penagihan proyek',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/billings/:id/history
 * @desc    Get billing status history
 * @access  Private
 */
router.get('/:id/history', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const history = await statusTransitionService.getBillingStatusHistory(id);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil riwayat status penagihan',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/billings/:id
 * @desc    Get single billing by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const billing = await prisma.billing.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            totalValue: true,
            client: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!billing) {
      return res.status(404).json({ 
        success: false, 
        message: 'Penagihan tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: billing
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data penagihan',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/billings
 * @desc    Create new billing
 * @access  Private
 */
router.post('/', auth, upload.single('invoice'), async (req, res) => {
  try {
    const { projectId, billingDate, percentage, amount, status, notes } = req.body;
    const userId = req.user?.userId || null;
    let invoiceFilename = null;
    
    // Process file upload if present
    if (req.file) {
      invoiceFilename = `/uploads/invoices/${req.file.filename}`;
    }
    
    // Validate inputs
    if (!projectId || !billingDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID dan tanggal penagihan wajib diisi' 
      });
    }
    
    // Check if project exists
    const project = await prisma.project.findUnique({ 
      where: { id: parseInt(projectId) } 
    });
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proyek tidak ditemukan' 
      });
    }
    
    // Calculate amount based on percentage if only percentage is provided
    let billingAmount = amount ? parseFloat(amount) : undefined;
    let billingPercentage = percentage ? parseFloat(percentage) : undefined;
    
    if (billingPercentage && !billingAmount) {
      // Calculate amount from percentage
      billingAmount = (billingPercentage / 100) * parseFloat(project.totalValue.toString());
      logger.info('Calculated amount from percentage', { 
        percentage: billingPercentage, 
        projectValue: parseFloat(project.totalValue.toString()),
        calculatedAmount: billingAmount 
      });
    } else if (billingAmount && !billingPercentage) {
      // Calculate percentage from amount
      billingPercentage = (billingAmount / parseFloat(project.totalValue.toString())) * 100;
      logger.info('Calculated percentage from amount', { 
        amount: billingAmount, 
        projectValue: parseFloat(project.totalValue.toString()),
        calculatedPercentage: billingPercentage 
      });
    }
    
    // Create billing
    const newBilling = await prisma.billing.create({
      data: {
        projectId: parseInt(projectId),
        billingDate: new Date(billingDate),
        percentage: billingPercentage || 0,
        amount: billingAmount || 0,
        status: status || 'pending',
        invoice: invoiceFilename,
        createdAt: new Date(),
        updatedAt: new Date(),
        createJournalEntry: true // Enable journal entries by default
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true
          }
        }
      }
    });
    
    // Record initial status history
    await doubleEntryService.recordBillingStatusHistory(
      newBilling.id,
      'pending', // Initial status is always 'pending'
      newBilling.status,
      userId,
      notes
    );
    
    // Create journal entries if status is not pending
    if (newBilling.status !== 'pending' && newBilling.createJournalEntry) {
      try {
        const journalResult = await doubleEntryService.createJournalEntryForBilling(newBilling);
        logger.info('Journal entries created for new billing', { 
          billingId: newBilling.id, 
          status: newBilling.status,
          result: journalResult ? 'success' : 'no entries created'
        });
      } catch (journalError) {
        logger.error('Failed to create journal entries for new billing', { 
          billingId: newBilling.id, 
          error: journalError.message 
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Penagihan berhasil dibuat',
      data: newBilling
    });
  } catch (error) {
    logger.error('Error creating billing', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Error saat membuat penagihan',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/billings/:id
 * @desc    Update billing details (not status)
 * @access  Private
 */
router.put('/:id', auth, upload.single('invoice'), async (req, res) => {
  try {
    const { id } = req.params;
    const { billingDate, percentage, amount, createJournalEntry } = req.body;

    // Check if billing exists
    const existingBilling = await prisma.billing.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: {
          select: {
            totalValue: true,
            name: true,
            projectCode: true
          }
        }
      }
    });

    if (!existingBilling) {
      return res.status(404).json({
        success: false,
        message: 'Penagihan tidak ditemukan'
      });
    }

    // Only allow editing if status is pending
    if (existingBilling.status !== 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Hanya penagihan dengan status "pending" yang dapat diubah'
      });
    }

    // Process invoice file if uploaded
    let invoicePath = existingBilling.invoice;
    if (req.file) {
      // Delete old invoice if exists
      if (existingBilling.invoice) {
        const oldPath = path.join(__dirname, '../../../', existingBilling.invoice);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      invoicePath = `/uploads/invoices/${req.file.filename}`;
    }

    // Calculate amount based on percentage if only percentage is provided
    let updateData = {
      billingDate: billingDate ? new Date(billingDate) : undefined,
      invoice: invoicePath,
      updatedAt: new Date()
    };

    if (createJournalEntry !== undefined) {
      updateData.createJournalEntry = createJournalEntry === 'true';
    }

    const projectTotalValue = parseFloat(existingBilling.project.totalValue.toString());

    if (percentage && !amount) {
      const newPercentage = parseFloat(percentage);
      const newAmount = (newPercentage / 100) * projectTotalValue;
      updateData.percentage = newPercentage;
      updateData.amount = newAmount;
      
      logger.info('Calculated amount from percentage during update', { 
        percentage: newPercentage, 
        projectValue: projectTotalValue,
        calculatedAmount: newAmount 
      });
    } else if (amount && !percentage) {
      const newAmount = parseFloat(amount);
      const newPercentage = (newAmount / projectTotalValue) * 100;
      updateData.amount = newAmount;
      updateData.percentage = newPercentage;
      
      logger.info('Calculated percentage from amount during update', { 
        amount: newAmount, 
        projectValue: projectTotalValue,
        calculatedPercentage: newPercentage 
      });
    } else if (amount && percentage) {
      updateData.amount = parseFloat(amount);
      updateData.percentage = parseFloat(percentage);
    }

    // Update billing
    const updatedBilling = await prisma.billing.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Penagihan berhasil diperbarui',
      data: updatedBilling
    });
  } catch (error) {
    logger.error('Error updating billing', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui penagihan',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/billings/:id/status
 * @desc    Update billing status
 * @access  Private
 */
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, cashAccount } = req.body;
    const userId = req.user.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status wajib diisi'
      });
    }

    // Use status transition service
    const result = await statusTransitionService.handleBillingStatusTransition(
      id,
      status,
      userId,
      notes || '',
      cashAccount || '1102' // Default to Bank BCA if not provided
    );

    res.json({
      success: true,
      message: `Status penagihan berhasil diubah ke ${status}`,
      data: result.data,
      journalEntries: result.journalEntries
    });
  } catch (error) {
    res.status(error.message.includes('Invalid status transition') ? 400 : 500).json({ 
      success: false, 
      message: 'Error saat memperbarui status penagihan',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/billings/:id
 * @desc    Delete billing
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if billing exists
    const existingBilling = await prisma.billing.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: true
      }
    });

    if (!existingBilling) {
      return res.status(404).json({
        success: false,
        message: 'Penagihan tidak ditemukan'
      });
    }

    // Delete invoice file if exists
    if (existingBilling.invoice) {
      const filePath = path.join(__dirname, '../../../', existingBilling.invoice);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Use transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (prisma) => {
      // Delete related transactions using the new service function
      const deletedTransactions = await doubleEntryService.findAndDeleteBillingTransactions(existingBilling);
      logger.info(`Deleted ${deletedTransactions.count} transactions for billing #${id}`);

      // Delete billing status history
      await prisma.billing_status_history.deleteMany({
        where: {
          billingId: parseInt(id)
        }
      });

      // Delete billing
      await prisma.billing.delete({
        where: { id: parseInt(id) }
      });
    });

    res.json({
      success: true,
      message: 'Penagihan berhasil dihapus'
    });
  } catch (error) {
    logger.error('Error deleting billing', { error: error.message, billingId: req.params.id });
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghapus penagihan',
      error: error.message 
    });
  }
});

// Update billing status
router.put('/status/:id', async (req, res) => {
  const { id } = req.params;
  const { status, userId, notes } = req.body;

  try {
    // Get the current billing to check status change
    const currentBilling = await prisma.billing.findUnique({
      where: { id: Number(id) },
      include: {
        project: true
      }
    });

    if (!currentBilling) {
      return res.status(404).json({ message: 'Billing not found' });
    }

    const oldStatus = currentBilling.status;

    // Update the billing status
    const updatedBilling = await prisma.billing.update({
      where: { id: Number(id) },
      data: {
        status,
        updatedAt: new Date()
      },
      include: {
        project: true
      }
    });

    // Record status history
    await prisma.billingStatusHistory.create({
      data: {
        billingId: updatedBilling.id,
        oldStatus,
        newStatus: status,
        changedBy: userId || null,
        notes: notes || null,
        changedAt: new Date()
      }
    });

    // Create journal entries if needed
    if (status === 'paid' && oldStatus !== 'paid') {
      await doubleEntryService.createBillingJournalEntries(updatedBilling);
    }

    // Update WIP automatically when billing status changes
    try {
      // Import wipService dynamically to avoid circular dependency
      const wipService = require('../services/wipService');
      await wipService.updateWipAutomatically(updatedBilling.projectId, 'BILLING');
    } catch (wipError) {
      console.error('Error updating WIP:', wipError);
      // Continue even if WIP update fails
    }

    res.json({
      message: 'Billing status updated successfully',
      billing: updatedBilling
    });
  } catch (error) {
    console.error('Error updating billing status:', error);
    res.status(500).json({ message: 'Error updating billing status', error });
  }
});

module.exports = router; 