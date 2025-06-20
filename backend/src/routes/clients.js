const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { prisma } = require('../utils/prisma');

/**
 * @route   GET /api/clients
 * @desc    Get all clients with optional filtering
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, limit, page } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Build filter conditions
    let where = {};
    if (search) {
      where = {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } }
        ]
      };
    }

    // Get clients with pagination
    const clients = await prisma.client.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { projects: true }
        }
      }
    });

    // Get total count for pagination
    const total = await prisma.client.count({ where });

    res.json({
      success: true,
      data: clients,
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
      message: 'Error saat mengambil data klien',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/clients/:id
 * @desc    Get single client by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: {
        projects: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
            totalValue: true
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Klien tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data klien',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/clients
 * @desc    Create new client
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nama klien wajib diisi' 
      });
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email,
        address
      }
    });

    res.status(201).json({
      success: true,
      message: 'Klien berhasil ditambahkan',
      data: client
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menambahkan klien',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/clients/:id
 * @desc    Update client
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingClient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Klien tidak ditemukan' 
      });
    }

    // Update client
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        name,
        phone,
        email,
        address
      }
    });

    res.json({
      success: true,
      message: 'Data klien berhasil diperbarui',
      data: updatedClient
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui klien',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/clients/:id
 * @desc    Delete client
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: {
        projects: true
      }
    });

    if (!existingClient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Klien tidak ditemukan' 
      });
    }

    // Check if client has projects
    if (existingClient.projects.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Klien ini memiliki proyek terkait dan tidak dapat dihapus'
      });
    }

    // Delete client
    await prisma.client.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Klien berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghapus klien',
      error: error.message 
    });
  }
});

module.exports = router; 