const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth, authorize } = require('../middleware/auth');
const statusTransitionService = require('../services/statusTransitionService');
const doubleEntryService = require('../services/doubleEntryService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   GET /api/projects
 * @desc    Get all projects with optional filtering
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
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
            projectcost: true,
            billing: true
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
    console.error('Error fetching projects:', error);
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
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: true,
        projectcost: {
          orderBy: {
            date: 'desc'
          }
        },
        billing: {
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
    const totalCosts = project.projectcost.reduce(
      (sum, cost) => sum + parseFloat(cost.amount.toString()), 
      0
    );
    
    const totalBilled = project.billing.reduce(
      (sum, billing) => sum + parseFloat(billing.amount.toString()),
      0
    );
    
    const totalPaid = project.billing
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
router.post('/', auth, async (req, res) => {
  try {
    const { 
      projectCode, 
      name,
      description,
      clientId, 
      startDate, 
      endDate, 
      totalValue,
      progress = 0,
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
    const validStatuses = ['ongoing', 'completed', 'cancelled', 'planned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid',
        validStatuses
      });
    }

    // Validate progress
    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress harus antara 0 dan 100'
      });
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        projectCode,
        name,
        description,
        clientId: parseInt(clientId),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        totalValue: parseFloat(totalValue),
        progress: parseFloat(progress),
        status,
        updatedAt: new Date()
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
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating project with ID: ${id}`);
    console.log('Full request body:', JSON.stringify(req.body, null, 2));

    const { 
      name, 
      description,
      clientId, 
      startDate, 
      endDate, 
      totalValue,
      progress, 
      status
    } = req.body;

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingProject) {
      console.log(`Project with ID ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Proyek tidak ditemukan' 
      });
    }

    console.log('Existing project:', JSON.stringify(existingProject, null, 2));

    // Validate required fields
    if (!name) {
      console.log('Missing required field: name');
      return res.status(400).json({
        success: false,
        message: 'Nama proyek wajib diisi'
      });
    }

    // Validate status
    const validStatuses = ['ongoing', 'completed', 'cancelled', 'planned'];
    if (status && !validStatuses.includes(status)) {
      console.log(`Invalid status: ${status}`);
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid',
        validStatuses
      });
    }

    // Validate progress if provided
    if (progress !== undefined && (progress < 0 || progress > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Progress harus antara 0 dan 100'
      });
    }

    // Prepare update data
    const updateData = {
      name,
      description: description === '' ? null : description,
      clientId: clientId ? parseInt(clientId) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : endDate === null ? null : undefined,
      totalValue: totalValue ? parseFloat(totalValue) : undefined,
      status,
      updatedAt: new Date()
    };

    // Add progress to update data if provided
    if (progress !== undefined) {
      updateData.progress = parseFloat(progress);
    }

    console.log('Update data:', JSON.stringify(updateData, null, 2));

    try {
      // Update project
      const updatedProject = await prisma.project.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      console.log('Project updated successfully:', JSON.stringify(updatedProject, null, 2));

      res.json({
        success: true,
        message: 'Proyek berhasil diperbarui',
        data: updatedProject
      });
    } catch (updateError) {
      console.error('Error during update operation:', updateError);
      throw updateError;
    }
  } catch (error) {
    console.error('Error updating project:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Proyek tidak ditemukan'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui proyek',
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private (Admin only)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Log user info for debugging
    console.log('Delete project request:', {
      projectId: id,
      userId: req.user.id,
      userRole: req.user.role,
      username: req.user.username
    });

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

    // Delete project - related data will be deleted automatically due to cascade delete in schema
    await prisma.project.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Proyek berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
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
 * @route   GET /api/projects/:id/costs
 * @desc    Get project costs
 * @access  Private
 */
router.get('/:id/costs', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { search, category, status, limit, page } = req.query;
    
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Build filter conditions
    let where = {
      projectId: parseInt(id)
    };

    if (search) {
      where = {
        ...where,
        description: {
          contains: search
        }
      };
    }

    if (category) {
      where = {
        ...where,
        category
      };
    }

    if (status) {
      where = {
        ...where,
        status
      };
    }

    // Get costs with pagination
    const costs = await prisma.projectcost.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { date: 'desc' }
      ]
    });

    // Get total count for pagination
    const total = await prisma.projectcost.count({ where });
    
    // Get total amount
    const totalAmount = await prisma.projectcost.aggregate({
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
    console.error('Error fetching project costs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data biaya proyek',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/projects/:id/costs
 * @desc    Add new cost to project
 * @access  Private
 */
router.post('/:id/costs', auth, upload.single('receipt'), async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description, amount, date, status, notes } = req.body;
    const userId = req.user?.userId || null;
    
    // Process file upload if present
    let receiptFilename = null;
    if (req.file) {
      receiptFilename = `/uploads/receipts/${req.file.filename}`;
    }
    
    // Validate inputs
    if (!category || !description || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Kategori, deskripsi, jumlah, dan tanggal wajib diisi'
      });
    }
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project tidak ditemukan'
      });
    }
    
    // Create project cost
    const newCost = await prisma.projectcost.create({
      data: {
        projectId: parseInt(id),
        category,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        status: status || 'pending',
        receipt: receiptFilename,
        createJournalEntry: true, // Enable journal entries by default
        updatedAt: new Date()
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
    await doubleEntryService.recordProjectCostStatusHistory(
      newCost.id,
      'pending', // Initial status is always 'pending'
      newCost.status,
      userId,
      notes
    );
    
    // Create journal entries if status is not pending
    if (newCost.status !== 'pending' && newCost.createJournalEntry) {
      try {
        const journalResult = await doubleEntryService.createJournalEntryForProjectCost(newCost);
        logger.info('Journal entries created for new project cost', { 
          costId: newCost.id, 
          status: newCost.status,
          result: journalResult ? 'success' : 'no entries created'
        });
      } catch (journalError) {
        logger.error('Failed to create journal entries for new project cost', { 
          costId: newCost.id, 
          error: journalError.message 
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Biaya proyek berhasil ditambahkan',
      data: newCost
    });
  } catch (error) {
    logger.error('Error creating project cost', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error saat menambahkan biaya proyek',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/projects/:id/costs/:costId
 * @desc    Update project cost details (not status)
 * @access  Private
 */
router.put('/:id/costs/:costId', auth, upload.single('receipt'), async (req, res) => {
  try {
    const { id, costId } = req.params;
    const { 
      projectId,
      category, 
      description, 
      amount, 
      date, 
      billingId,
      createJournalEntry
    } = req.body;

    // Check if cost exists and belongs to the project
    const existingCost = await prisma.projectcost.findFirst({
      where: { 
        id: parseInt(costId),
        projectId: parseInt(id)
      }
    });

    if (!existingCost) {
      return res.status(404).json({ 
        success: false, 
        message: 'Biaya proyek tidak ditemukan' 
      });
    }

    // Only allow editing if status is unpaid
    if (existingCost.status !== 'unpaid') {
      return res.status(403).json({
        success: false,
        message: 'Hanya biaya proyek dengan status "unpaid" yang dapat diubah'
      });
    }

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proyek tidak ditemukan' 
      });
    }

    // Process receipt file if uploaded
    let receiptPath = undefined;
    if (req.file) {
      receiptPath = `/uploads/receipts/${req.file.filename}`;
      
      // Delete old receipt file if it exists
      if (existingCost.receipt) {
        const oldFilePath = path.join(__dirname, '../../../', existingCost.receipt);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    // Prepare update data
    let updateData = {
      updatedAt: new Date()
    };

    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (date !== undefined) updateData.date = new Date(date);
    if (receiptPath !== undefined) updateData.receipt = receiptPath;
    if (createJournalEntry !== undefined) {
      updateData.createJournalEntry = createJournalEntry === true || createJournalEntry === 'true';
    }

    // Update project cost
    const updatedCost = await prisma.projectcost.update({
      where: { id: parseInt(costId) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Biaya proyek berhasil diperbarui',
      data: updatedCost
    });
  } catch (error) {
    console.error('Error updating project cost:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui biaya proyek',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/projects/:id/costs/:costId/status
 * @desc    Update project cost status
 * @access  Private
 */
router.put('/:id/costs/:costId/status', auth, async (req, res) => {
  try {
    const { id, costId } = req.params;
    const { status, notes, cashAccount } = req.body;
    const userId = req.user?.userId || null;
    
    // Validate status
    const validStatuses = ['pending', 'unpaid', 'paid', 'rejected', 'cancelled', 'planned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Status tidak valid. Status harus salah satu dari: ${validStatuses.join(', ')}`
      });
    }
    
    // Get current project cost
    const currentCost = await prisma.projectcost.findUnique({
      where: { id: parseInt(costId) },
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
    
    if (!currentCost) {
      return res.status(404).json({ success: false, message: 'Biaya proyek tidak ditemukan' });
    }
    
    // Don't update if status is the same
    if (currentCost.status === status) {
      return res.json({
        success: true,
        message: 'Status tidak berubah',
        data: currentCost
      });
    }
    
    const oldStatus = currentCost.status;
    
    // Update cost status
    const updatedCost = await prisma.projectcost.update({
      where: { id: parseInt(costId) },
      data: {
        status,
        updatedAt: new Date()
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
    
    // Record status history
    await doubleEntryService.recordProjectCostStatusHistory(
      parseInt(costId),
      oldStatus,
      status,
      userId,
      notes
    );
    
    // Create journal entries based on the new status
    if (updatedCost.createJournalEntry) {
      try {
        const journalResult = await doubleEntryService.createJournalEntryForProjectCost(updatedCost, oldStatus);
        logger.info('Journal entries created for project cost', { 
          costId, 
          status, 
          result: journalResult ? 'success' : 'no entries created'
        });
      } catch (journalError) {
        logger.error('Failed to create journal entries', { 
          costId, 
          error: journalError.message 
        });
        // We continue even if journal entry creation fails
      }
    }
    
    res.json({
      success: true,
      message: `Status biaya proyek berhasil diubah menjadi ${status}`,
      data: updatedCost
    });
  } catch (error) {
    logger.error('Error updating project cost status', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Error saat update status biaya proyek',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/projects/:id/costs/:costId/history
 * @desc    Get project cost status history
 * @access  Private
 */
router.get('/:id/costs/:costId/history', auth, async (req, res) => {
  try {
    const { costId } = req.params;
    
    const history = await statusTransitionService.getProjectCostStatusHistory(costId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil riwayat status biaya proyek',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/projects/:id/costs/:costId
 * @desc    Delete project cost
 * @access  Private
 */
router.delete('/:id/costs/:costId', auth, async (req, res) => {
  try {
    const { id, costId } = req.params;

    // Check if cost exists and belongs to the project
    const existingCost = await prisma.projectcost.findFirst({
      where: { 
        id: parseInt(costId),
        projectId: parseInt(id)
      }
    });

    if (!existingCost) {
      return res.status(404).json({ 
        success: false, 
        message: 'Biaya proyek tidak ditemukan' 
      });
    }

    // Only allow deletion if status is unpaid
    if (existingCost.status !== 'unpaid') {
      return res.status(403).json({
        success: false,
        message: 'Hanya biaya proyek dengan status "unpaid" yang dapat dihapus'
      });
    }

    // Find existing transactions related to this project cost
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        projectId: parseInt(id),
        notes: {
          contains: `Project cost ID: ${costId}`
        }
      }
    });

    // Delete found transactions and project cost in a transaction
    await prisma.$transaction(async (prisma) => {
      // Delete transactions
      for (const transaction of existingTransactions) {
        await prisma.transaction.delete({
          where: { id: transaction.id }
        });
      }

      // Delete project cost
      await prisma.projectcost.delete({
        where: { id: parseInt(costId) }
      });
    });

    res.json({
      success: true,
      message: 'Biaya proyek berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting project cost:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghapus biaya proyek',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/projects/:id/billings
 * @desc    Get billings for a specific project (compatibility route)
 * @access  Private
 */
router.get('/:id/billings', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    // Build filter conditions
    let where = { 
      projectId: parseInt(id) 
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
      where: { id: parseInt(id) },
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

module.exports = router; 