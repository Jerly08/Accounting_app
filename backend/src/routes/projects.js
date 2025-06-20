const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

/**
 * @route   GET /api/projects
 * @desc    Get all projects with optional filtering
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, status, clientId, limit, page } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Build filter conditions
    let where = {};
    if (search) {
      where = {
        OR: [
          { name: { contains: search } },
          { projectCode: { contains: search } }
        ]
      };
    }

    if (status) {
      where = {
        ...where,
        status
      };
    }

    if (clientId) {
      where = {
        ...where,
        clientId: parseInt(clientId)
      };
    }

    // Get projects with pagination
    const projects = await prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { createdAt: 'desc' }
      ],
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            projectCosts: true,
            billings: true
          }
        }
      }
    });

    // Get total count for pagination
    const total = await prisma.project.count({ where });

    res.json({
      success: true,
      data: projects,
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
      message: 'Error saat mengambil data proyek',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: true,
        projectCosts: {
          orderBy: {
            date: 'desc'
          }
        },
        billings: {
          orderBy: {
            billingDate: 'desc'
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proyek tidak ditemukan' 
      });
    }

    // Calculate project summary
    const totalCosts = project.projectCosts.reduce(
      (sum, cost) => sum + parseFloat(cost.amount.toString()), 
      0
    );
    
    const totalBilled = project.billings.reduce(
      (sum, billing) => sum + parseFloat(billing.amount.toString()),
      0
    );
    
    const totalPaid = project.billings
      .filter(billing => billing.status === 'paid')
      .reduce((sum, billing) => sum + parseFloat(billing.amount.toString()), 0);

    // Add summary to response
    const projectWithSummary = {
      ...project,
      summary: {
        totalCosts,
        totalBilled,
        totalPaid,
        remaining: parseFloat(project.totalValue.toString()) - totalBilled,
        profit: parseFloat(project.totalValue.toString()) - totalCosts
      }
    };

    res.json({
      success: true,
      data: projectWithSummary
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data proyek',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      projectCode, 
      name, 
      clientId, 
      startDate, 
      endDate, 
      totalValue, 
      status = 'ongoing'
    } = req.body;

    // Validate required fields
    if (!projectCode || !name || !clientId || !startDate || !totalValue) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode proyek, nama, klien, tanggal mulai, dan nilai total wajib diisi' 
      });
    }

    // Check if project code already exists
    const existingProject = await prisma.project.findUnique({
      where: { projectCode }
    });

    if (existingProject) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode proyek sudah digunakan' 
      });
    }

    // Validate status
    const validStatuses = ['ongoing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid',
        validStatuses
      });
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        projectCode,
        name,
        clientId: parseInt(clientId),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        totalValue: parseFloat(totalValue),
        status
      },
      include: {
        client: {
          select: {
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Proyek berhasil ditambahkan',
      data: project
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menambahkan proyek',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      clientId, 
      startDate, 
      endDate, 
      totalValue, 
      status 
    } = req.body;

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingProject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proyek tidak ditemukan' 
      });
    }

    // Validate status
    const validStatuses = ['ongoing', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid',
        validStatuses
      });
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id: parseInt(id) },
      data: {
        name,
        clientId: clientId ? parseInt(clientId) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : endDate === null ? null : undefined,
        totalValue: totalValue ? parseFloat(totalValue) : undefined,
        status
      }
    });

    res.json({
      success: true,
      message: 'Proyek berhasil diperbarui',
      data: updatedProject
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui proyek',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            projectCosts: true,
            billings: true,
            transactions: true
          }
        }
      }
    });

    if (!existingProject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proyek tidak ditemukan' 
      });
    }

    // Check if project has related data
    if (
      existingProject._count.projectCosts > 0 ||
      existingProject._count.billings > 0 ||
      existingProject._count.transactions > 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Proyek ini memiliki data biaya, penagihan, atau transaksi terkait dan tidak dapat dihapus'
      });
    }

    // Delete project
    await prisma.project.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Proyek berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghapus proyek',
      error: error.message 
    });
  }
});

// Routes for project costs
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/receipts');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'receipt-' + uniqueSuffix + ext);
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
 * @route   GET /api/projects/:projectId/costs
 * @desc    Get all costs for a project
 * @access  Private
 */
router.get('/:projectId/costs', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { category, limit, page } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 20;
    const skip = (pageNumber - 1) * pageSize;

    // Build filter conditions
    let where = { projectId: parseInt(projectId) };
    if (category) {
      where.category = category;
    }

    // Get project costs
    const costs = await prisma.projectCost.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { date: 'desc' }
    });

    // Get total count
    const total = await prisma.projectCost.count({ where });

    // Get total amount
    const totalAmount = await prisma.projectCost.aggregate({
      where,
      _sum: {
        amount: true
      }
    });

    res.json({
      success: true,
      data: costs,
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
      message: 'Error saat mengambil data biaya',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/projects/:projectId/costs
 * @desc    Add cost to a project
 * @access  Private
 */
router.post(
  '/:projectId/costs',
  authenticate,
  upload.single('receipt'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { category, description, amount, date, status = 'pending' } = req.body;
      
      // Validate project exists
      const project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyek tidak ditemukan'
        });
      }

      // Process receipt file if uploaded
      let receiptPath = null;
      if (req.file) {
        receiptPath = `/uploads/receipts/${req.file.filename}`;
      }

      // Validate required fields
      if (!category || !description || !amount || !date) {
        return res.status(400).json({
          success: false,
          message: 'Kategori, deskripsi, jumlah, dan tanggal wajib diisi'
        });
      }

      // Validate status
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status tidak valid',
          validStatuses
        });
      }

      // Create project cost
      const projectCost = await prisma.projectCost.create({
        data: {
          projectId: parseInt(projectId),
          category,
          description,
          amount: parseFloat(amount),
          date: new Date(date),
          status,
          receipt: receiptPath
        }
      });

      res.status(201).json({
        success: true,
        message: 'Biaya proyek berhasil ditambahkan',
        data: projectCost
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error saat menambahkan biaya proyek',
        error: error.message 
      });
    }
  }
);

/**
 * @route   PUT /api/projects/:projectId/costs/:costId
 * @desc    Update project cost
 * @access  Private
 */
router.put(
  '/:projectId/costs/:costId',
  authenticate,
  upload.single('receipt'),
  async (req, res) => {
    try {
      const { projectId, costId } = req.params;
      const { category, description, amount, date, status } = req.body;

      // Check if cost exists and belongs to the project
      const existingCost = await prisma.projectCost.findFirst({
        where: {
          id: parseInt(costId),
          projectId: parseInt(projectId)
        }
      });

      if (!existingCost) {
        return res.status(404).json({
          success: false,
          message: 'Biaya proyek tidak ditemukan'
        });
      }

      // Process receipt file if uploaded
      let receiptPath = existingCost.receipt;
      if (req.file) {
        // Delete old receipt if exists
        if (existingCost.receipt) {
          const oldPath = path.join(__dirname, '../../../', existingCost.receipt);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        receiptPath = `/uploads/receipts/${req.file.filename}`;
      }

      // Validate status
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status tidak valid',
          validStatuses
        });
      }

      // Update project cost
      const updatedCost = await prisma.projectCost.update({
        where: { id: parseInt(costId) },
        data: {
          category,
          description,
          amount: amount ? parseFloat(amount) : undefined,
          date: date ? new Date(date) : undefined,
          status,
          receipt: receiptPath
        }
      });

      res.json({
        success: true,
        message: 'Biaya proyek berhasil diperbarui',
        data: updatedCost
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error saat memperbarui biaya proyek',
        error: error.message 
      });
    }
  }
);

/**
 * @route   DELETE /api/projects/:projectId/costs/:costId
 * @desc    Delete project cost
 * @access  Private
 */
router.delete('/:projectId/costs/:costId', authenticate, async (req, res) => {
  try {
    const { projectId, costId } = req.params;

    // Check if cost exists and belongs to the project
    const existingCost = await prisma.projectCost.findFirst({
      where: {
        id: parseInt(costId),
        projectId: parseInt(projectId)
      }
    });

    if (!existingCost) {
      return res.status(404).json({
        success: false,
        message: 'Biaya proyek tidak ditemukan'
      });
    }

    // Delete receipt file if exists
    if (existingCost.receipt) {
      const filePath = path.join(__dirname, '../../../', existingCost.receipt);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete project cost
    await prisma.projectCost.delete({
      where: { id: parseInt(costId) }
    });

    res.json({
      success: true,
      message: 'Biaya proyek berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghapus biaya proyek',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/projects/:projectId/costs/:costId/receipt
 * @desc    Upload receipt for a project cost
 * @access  Private
 */
router.post(
  '/:projectId/costs/:costId/receipt',
  authenticate,
  upload.single('receipt'),
  async (req, res) => {
    try {
      const { projectId, costId } = req.params;

      // Check if cost exists and belongs to the project
      const existingCost = await prisma.projectCost.findFirst({
        where: {
          id: parseInt(costId),
          projectId: parseInt(projectId)
        }
      });

      if (!existingCost) {
        return res.status(404).json({
          success: false,
          message: 'Biaya proyek tidak ditemukan'
        });
      }

      // Validate file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Tidak ada file yang diunggah'
        });
      }

      // Process receipt file
      const receiptPath = `/uploads/receipts/${req.file.filename}`;

      // Delete old receipt if exists
      if (existingCost.receipt) {
        const oldPath = path.join(__dirname, '../../../', existingCost.receipt);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Update project cost with new receipt path
      const updatedCost = await prisma.projectCost.update({
        where: { id: parseInt(costId) },
        data: {
          receipt: receiptPath
        }
      });

      res.json({
        success: true,
        message: 'Receipt berhasil diunggah',
        data: {
          receiptPath
        }
      });
    } catch (error) {
      console.error('Error uploading receipt:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error saat mengunggah receipt',
        error: error.message 
      });
    }
  }
);

/**
 * @route   DELETE /api/projects/:projectId/costs/:costId/receipt
 * @desc    Delete receipt for a project cost
 * @access  Private
 */
router.delete(
  '/:projectId/costs/:costId/receipt',
  authenticate,
  async (req, res) => {
    try {
      const { projectId, costId } = req.params;

      // Check if cost exists and belongs to the project
      const existingCost = await prisma.projectCost.findFirst({
        where: {
          id: parseInt(costId),
          projectId: parseInt(projectId)
        }
      });

      if (!existingCost) {
        return res.status(404).json({
          success: false,
          message: 'Biaya proyek tidak ditemukan'
        });
      }

      // Check if receipt exists
      if (!existingCost.receipt) {
        return res.status(404).json({
          success: false,
          message: 'Tidak ada receipt untuk biaya ini'
        });
      }

      // Delete receipt file
      const filePath = path.join(__dirname, '../../../', existingCost.receipt);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Update project cost to remove receipt path
      const updatedCost = await prisma.projectCost.update({
        where: { id: parseInt(costId) },
        data: {
          receipt: null
        }
      });

      res.json({
        success: true,
        message: 'Receipt berhasil dihapus'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error saat menghapus receipt',
        error: error.message 
      });
    }
  }
);

module.exports = router; 