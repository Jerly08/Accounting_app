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
router.get('/:id', authenticate, async (req, res) => {
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
router.post('/', authenticate, async (req, res) => {
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
router.put('/:id', authenticate, async (req, res) => {
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
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            projectcost: true,
            billing: true,
            transaction: true
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
      existingProject._count.projectcost > 0 ||
      existingProject._count.billing > 0 ||
      existingProject._count.transaction > 0
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
 * @route   GET /api/projects/:id/costs
 * @desc    Get project costs
 * @access  Private
 */
router.get('/:id/costs', authenticate, async (req, res) => {
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
 * @desc    Add project cost
 * @access  Private
 */
router.post('/:id/costs', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      category, 
      description, 
      amount, 
      date, 
      status = 'pending',
      receipt
    } = req.body;

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proyek tidak ditemukan' 
      });
    }

    // Validate required fields
    if (!category || !description || !amount || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kategori, deskripsi, jumlah, dan tanggal wajib diisi' 
      });
    }

    // Create project cost
    const projectCost = await prisma.projectcost.create({
      data: {
        projectId: parseInt(id),
        category,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        status,
        receipt,
        updatedAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Biaya proyek berhasil ditambahkan',
      data: projectCost
    });
  } catch (error) {
    console.error('Error adding project cost:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menambahkan biaya proyek',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/projects/:id/costs/:costId
 * @desc    Update project cost
 * @access  Private
 */
router.put('/:id/costs/:costId', authenticate, async (req, res) => {
  try {
    const { id, costId } = req.params;
    const { 
      category, 
      description, 
      amount, 
      date, 
      status,
      receipt
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

    // Update project cost
    const updatedCost = await prisma.projectcost.update({
      where: { id: parseInt(costId) },
      data: {
        category,
        description,
        amount: amount ? parseFloat(amount) : undefined,
        date: date ? new Date(date) : undefined,
        status,
        receipt,
        updatedAt: new Date()
      }
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
 * @route   DELETE /api/projects/:id/costs/:costId
 * @desc    Delete project cost
 * @access  Private
 */
router.delete('/:id/costs/:costId', authenticate, async (req, res) => {
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

    // Delete project cost
    await prisma.projectcost.delete({
      where: { id: parseInt(costId) }
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
 * @route   PUT /api/projects/:id/costs/:costId/approve
 * @desc    Approve project cost
 * @access  Private (Admin only)
 */
router.put('/:id/costs/:costId/approve', authenticate, authorize(['admin']), async (req, res) => {
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

    // Update cost status to approved
    const updatedCost = await prisma.projectcost.update({
      where: { id: parseInt(costId) },
      data: {
        status: 'approved',
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Biaya proyek berhasil disetujui',
      data: updatedCost
    });
  } catch (error) {
    console.error('Error approving project cost:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menyetujui biaya proyek',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/projects/:id/costs/:costId/reject
 * @desc    Reject project cost
 * @access  Private (Admin only)
 */
router.put('/:id/costs/:costId/reject', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id, costId } = req.params;
    const { rejectionReason } = req.body;
    
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

    // Update cost status to rejected
    const updatedCost = await prisma.projectcost.update({
      where: { id: parseInt(costId) },
      data: {
        status: 'rejected',
        description: rejectionReason ? 
          `${existingCost.description} [REJECTED: ${rejectionReason}]` : 
          existingCost.description,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Biaya proyek berhasil ditolak',
      data: updatedCost
    });
  } catch (error) {
    console.error('Error rejecting project cost:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menolak biaya proyek',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/projects/:id/billings
 * @desc    Get billings for a specific project (compatibility route)
 * @access  Private
 */
router.get('/:id/billings', authenticate, async (req, res) => {
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