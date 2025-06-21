const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { prisma } = require('../utils/prisma');

// Simple in-memory cache for client data
const cache = {
  clients: {
    data: null,
    timestamp: null,
    maxAge: 60000 // 1 minute cache
  }
};

// Helper to check if cache is valid
const isCacheValid = (cacheKey) => {
  if (!cache[cacheKey].data || !cache[cacheKey].timestamp) return false;
  
  const now = Date.now();
  return (now - cache[cacheKey].timestamp) < cache[cacheKey].maxAge;
};

/**
 * @route   GET /api/clients
 * @desc    Get all clients with optional filtering
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('GET /api/clients - Fetching clients');
    const { search, limit, page, noCache } = req.query;
    
    // Check if we can use cached data
    if (!noCache && isCacheValid('clients') && !search) {
      console.log('Using cached client data');
      return res.json(cache.clients.data);
    }
    
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

    // Prepare default response in case of error
    const defaultResponse = {
      success: true,
      data: [],
      pagination: {
        page: pageNumber,
        pageSize,
        total: 0,
        totalPages: 0
      }
    };

    // Get clients with pagination with error handling
    let clients = [];
    try {
      clients = await prisma.client.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { project: true }
          }
        }
      });
      console.log(`Retrieved ${clients.length} clients successfully`);
    } catch (queryError) {
      console.error('Error querying clients:', queryError);
      return res.json(defaultResponse); // Return empty data instead of error 500
    }

    // Get total count for pagination with error handling
    let total = 0;
    try {
      total = await prisma.client.count({ where });
    } catch (countError) {
      console.error('Error counting clients:', countError);
      // Continue with default total = 0
    }

    const response = {
      success: true,
      data: clients,
      clients: clients,
      pagination: {
        page: pageNumber,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
    
    // Update cache if not a filtered search
    if (!search) {
      cache.clients.data = response;
      cache.clients.timestamp = Date.now();
    }

    res.json(response);
  } catch (error) {
    console.error('Unexpected error in clients route:', error);
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
        project: {
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
        address,
        updatedAt: new Date()
      }
    });

    // Invalidate cache
    cache.clients.timestamp = null;

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
        address,
        updatedAt: new Date()
      }
    });

    // Invalidate cache
    cache.clients.timestamp = null;

    res.json({
      success: true,
      message: 'Klien berhasil diperbarui',
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
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

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

    // Check if client has related projects
    const projectCount = await prisma.project.count({
      where: { clientId: parseInt(id) }
    });

    if (projectCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Klien tidak dapat dihapus karena masih memiliki proyek terkait'
      });
    }

    // Delete client
    await prisma.client.delete({
      where: { id: parseInt(id) }
    });

    // Invalidate cache
    cache.clients.timestamp = null;

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

/**
 * @route   GET /api/clients/clear-cache
 * @desc    Clear client cache
 * @access  Private (Admin only)
 */
router.get('/clear-cache', authenticate, authorize('admin'), (req, res) => {
  cache.clients.data = null;
  cache.clients.timestamp = null;
  
  res.json({
    success: true,
    message: 'Client cache cleared successfully'
  });
});

module.exports = router; 