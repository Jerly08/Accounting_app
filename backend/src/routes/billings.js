const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
router.get('/', authenticate, async (req, res) => {
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
 * @route   GET /api/billings/:id
 * @desc    Get single billing by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
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
 * @route   GET /api/billings/project/:projectId
 * @desc    Get billings for a specific project
 * @access  Private
 */
router.get('/project/:projectId', authenticate, async (req, res) => {
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
 * @route   POST /api/billings
 * @desc    Create new billing/invoice
 * @access  Private
 */
router.post('/', authenticate, upload.single('invoice'), async (req, res) => {
  try {
    const { projectId, billingDate, percentage, amount, status = 'unpaid' } = req.body;
    
    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      select: {
        totalValue: true
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyek tidak ditemukan'
      });
    }

    // Process invoice file if uploaded
    let invoicePath = null;
    if (req.file) {
      invoicePath = `/uploads/invoices/${req.file.filename}`;
    }

    // Validate required fields
    if (!projectId || !billingDate || (!percentage && !amount)) {
      return res.status(400).json({
        success: false,
        message: 'ID proyek, tanggal penagihan, dan persentase/jumlah wajib diisi'
      });
    }

    // Calculate amount based on percentage if only percentage is provided
    let billingAmount = amount ? parseFloat(amount) : undefined;
    const billingPercentage = percentage ? parseFloat(percentage) : undefined;

    if (billingPercentage && !billingAmount) {
      billingAmount = (billingPercentage / 100) * parseFloat(project.totalValue.toString());
    } else if (billingAmount && !billingPercentage) {
      // Calculate percentage based on amount
      const calculatedPercentage = (billingAmount / parseFloat(project.totalValue.toString())) * 100;
      req.body.percentage = calculatedPercentage.toFixed(2);
    }

    // Validate status
    const validStatuses = ['unpaid', 'partially_paid', 'paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid',
        validStatuses
      });
    }

    // Create billing
    const billing = await prisma.billing.create({
      data: {
        projectId: parseInt(projectId),
        billingDate: new Date(billingDate),
        percentage: billingPercentage || parseFloat(req.body.percentage),
        amount: billingAmount,
        status,
        invoice: invoicePath
      },
      include: {
        project: {
          select: {
            projectCode: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Penagihan berhasil ditambahkan',
      data: billing
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menambahkan penagihan',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/billings/:id
 * @desc    Update billing status and details
 * @access  Private
 */
router.put('/:id', authenticate, upload.single('invoice'), async (req, res) => {
  try {
    const { id } = req.params;
    const { billingDate, percentage, amount, status } = req.body;

    // Check if billing exists
    const existingBilling = await prisma.billing.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: {
          select: {
            totalValue: true
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
      status,
      invoice: invoicePath
    };

    if (percentage && !amount) {
      const newPercentage = parseFloat(percentage);
      const newAmount = (newPercentage / 100) * parseFloat(existingBilling.project.totalValue.toString());
      updateData.percentage = newPercentage;
      updateData.amount = newAmount;
    } else if (amount && !percentage) {
      const newAmount = parseFloat(amount);
      const newPercentage = (newAmount / parseFloat(existingBilling.project.totalValue.toString())) * 100;
      updateData.amount = newAmount;
      updateData.percentage = newPercentage;
    } else if (amount && percentage) {
      updateData.amount = parseFloat(amount);
      updateData.percentage = parseFloat(percentage);
    }

    // Validate status
    const validStatuses = ['unpaid', 'partially_paid', 'paid'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid',
        validStatuses
      });
    }

    // Update billing
    const updatedBilling = await prisma.billing.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Penagihan berhasil diperbarui',
      data: updatedBilling
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui penagihan',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/billings/:id
 * @desc    Delete billing
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if billing exists
    const existingBilling = await prisma.billing.findUnique({
      where: { id: parseInt(id) }
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

    // Delete billing
    await prisma.billing.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Penagihan berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghapus penagihan',
      error: error.message 
    });
  }
});

module.exports = router; 