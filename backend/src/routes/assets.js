const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const depreciationService = require('../services/depreciation');

const prisma = new PrismaClient();

/**
 * @route   GET /api/assets
 * @desc    Get all fixed assets with optional filtering
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category, limit, page } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Build filter conditions
    let where = {};
    if (search) {
      where = {
        assetName: {
          contains: search
        }
      };
    }
    
    // Add category filter if provided
    if (category) {
      where = {
        ...where,
        category
      };
    }

    // Get assets with pagination
    const assets = await prisma.fixedAsset.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { acquisitionDate: 'desc' }
      ]
    });

    // Get total count for pagination
    const total = await prisma.fixedAsset.count({ where });

    // Get total value and depreciation
    const totalValues = await prisma.fixedAsset.aggregate({
      _sum: {
        value: true,
        accumulatedDepreciation: true,
        bookValue: true
      }
    });

    res.json({
      success: true,
      data: assets,
      summary: {
        totalAssetValue: totalValues._sum.value || 0,
        totalAccumulatedDepreciation: totalValues._sum.accumulatedDepreciation || 0,
        totalBookValue: totalValues._sum.bookValue || 0
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
      message: 'Error saat mengambil data aset tetap',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/assets/:id
 * @desc    Get single fixed asset by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await prisma.fixedAsset.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asset) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aset tetap tidak ditemukan' 
      });
    }

    // Calculate additional info
    const currentDate = new Date();
    const acquisitionDate = new Date(asset.acquisitionDate);
    const ageInYears = (currentDate - acquisitionDate) / (1000 * 60 * 60 * 24 * 365);
    const remainingYears = Math.max(0, asset.usefulLife - ageInYears);
    
    // Add to response
    const assetWithDetails = {
      ...asset,
      details: {
        ageInYears: parseFloat(ageInYears.toFixed(2)),
        remainingYears: parseFloat(remainingYears.toFixed(2)),
        depreciationRate: (100 / asset.usefulLife).toFixed(2) + '%',
        annualDepreciation: parseFloat((asset.value / asset.usefulLife).toFixed(2))
      }
    };

    res.json({
      success: true,
      data: assetWithDetails
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data aset tetap',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assets
 * @desc    Create new fixed asset
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { assetName, category, acquisitionDate, value, usefulLife } = req.body;
    
    // Validate required fields
    if (!assetName || !acquisitionDate || !value || !usefulLife) {
      return res.status(400).json({
        success: false,
        message: 'Nama aset, tanggal perolehan, nilai, dan masa manfaat wajib diisi'
      });
    }

    // Validate category if provided
    const validCategories = ['equipment', 'vehicle', 'building', 'land', 'furniture', 'other'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Kategori aset tidak valid',
        validCategories
      });
    }

    // Convert to appropriate types
    const assetValue = parseFloat(value);
    const assetUsefulLife = parseInt(usefulLife);

    // Validate numeric values
    if (isNaN(assetValue) || assetValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nilai aset harus berupa angka positif'
      });
    }

    if (isNaN(assetUsefulLife) || assetUsefulLife <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Masa manfaat harus berupa angka positif'
      });
    }

    // Calculate accumulated depreciation and book value
    const acquisitionDateObj = new Date(acquisitionDate);
    const currentDate = new Date();
    const ageInYears = (currentDate - acquisitionDateObj) / (1000 * 60 * 60 * 24 * 365);
    const depreciation = Math.min(ageInYears, assetUsefulLife) * (assetValue / assetUsefulLife);
    const accumulatedDepreciation = Math.min(assetValue, Math.max(0, depreciation));
    const bookValue = assetValue - accumulatedDepreciation;

    // Create fixed asset
    const asset = await prisma.fixedAsset.create({
      data: {
        assetName,
        category: category || "equipment", // Default to equipment if not provided
        acquisitionDate: acquisitionDateObj,
        value: assetValue,
        usefulLife: assetUsefulLife,
        accumulatedDepreciation,
        bookValue
      }
    });

    res.status(201).json({
      success: true,
      message: 'Aset tetap berhasil ditambahkan',
      data: asset
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menambahkan aset tetap',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/assets/:id
 * @desc    Update fixed asset
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { assetName, category, acquisitionDate, value, usefulLife } = req.body;

    // Check if asset exists
    const existingAsset = await prisma.fixedAsset.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: 'Aset tetap tidak ditemukan'
      });
    }

    // Validate category if provided
    const validCategories = ['equipment', 'vehicle', 'building', 'land', 'furniture', 'other'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Kategori aset tidak valid',
        validCategories
      });
    }

    // Prepare update data
    const updateData = {};
    
    if (assetName) {
      updateData.assetName = assetName;
    }
    
    if (category) {
      updateData.category = category;
    }

    if (acquisitionDate) {
      updateData.acquisitionDate = new Date(acquisitionDate);
    }

    // Convert to appropriate types if provided
    let assetValue = undefined;
    let assetUsefulLife = undefined;

    if (value) {
      assetValue = parseFloat(value);
      if (isNaN(assetValue) || assetValue <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Nilai aset harus berupa angka positif'
        });
      }
      updateData.value = assetValue;
    }

    if (usefulLife) {
      assetUsefulLife = parseInt(usefulLife);
      if (isNaN(assetUsefulLife) || assetUsefulLife <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Masa manfaat harus berupa angka positif'
        });
      }
      updateData.usefulLife = assetUsefulLife;
    }

    // Recalculate depreciation if any value affecting it has changed
    if (acquisitionDate || value || usefulLife) {
      const acquisitionDateObj = updateData.acquisitionDate || existingAsset.acquisitionDate;
      const valueToUse = assetValue || existingAsset.value;
      const usefulLifeToUse = assetUsefulLife || existingAsset.usefulLife;
      
      const currentDate = new Date();
      const ageInYears = (currentDate - acquisitionDateObj) / (1000 * 60 * 60 * 24 * 365);
      const depreciation = Math.min(ageInYears, usefulLifeToUse) * (valueToUse / usefulLifeToUse);
      updateData.accumulatedDepreciation = Math.min(valueToUse, Math.max(0, depreciation));
      updateData.bookValue = valueToUse - updateData.accumulatedDepreciation;
    }

    // Update fixed asset
    const updatedAsset = await prisma.fixedAsset.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Aset tetap berhasil diperbarui',
      data: updatedAsset
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui aset tetap',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assets/:id/depreciate
 * @desc    Apply depreciation to a fixed asset
 * @access  Private
 */
router.post('/:id/depreciate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;

    // Default to current date if not provided
    const depreciationDate = date ? new Date(date) : new Date();

    // Check if asset exists
    const asset = await prisma.fixedAsset.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Aset tetap tidak ditemukan'
      });
    }

    // Calculate appropriate depreciation
    const acquisitionDate = new Date(asset.acquisitionDate);
    const ageInYears = (depreciationDate - acquisitionDate) / (1000 * 60 * 60 * 24 * 365);
    const depreciation = Math.min(ageInYears, asset.usefulLife) * (asset.value / asset.usefulLife);
    const newAccumulatedDepreciation = Math.min(asset.value, Math.max(0, depreciation));
    const newBookValue = asset.value - newAccumulatedDepreciation;

    // Update asset with new depreciation values
    const updatedAsset = await prisma.fixedAsset.update({
      where: { id: parseInt(id) },
      data: {
        accumulatedDepreciation: newAccumulatedDepreciation,
        bookValue: newBookValue
      }
    });

    res.json({
      success: true,
      message: 'Penyusutan aset berhasil diperbarui',
      data: updatedAsset,
      depreciation: {
        previousAccumulatedDepreciation: asset.accumulatedDepreciation,
        newAccumulatedDepreciation,
        depreciationAmount: newAccumulatedDepreciation - asset.accumulatedDepreciation,
        previousBookValue: asset.bookValue,
        newBookValue
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui penyusutan aset',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/assets/:id
 * @desc    Delete fixed asset
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if asset exists
    const existingAsset = await prisma.fixedAsset.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: 'Aset tetap tidak ditemukan'
      });
    }

    // Delete asset
    await prisma.fixedAsset.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Aset tetap berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghapus aset tetap',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assets/:id/calculate-depreciation
 * @desc    Calculate and update depreciation for a single asset
 * @access  Private
 */
router.post('/:id/calculate-depreciation', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Calculate and update depreciation
    const result = await depreciationService.updateAssetDepreciation(id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghitung penyusutan aset',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assets/calculate-all-depreciation
 * @desc    Calculate and update depreciation for all assets
 * @access  Private (Admin only)
 */
router.post('/calculate-all-depreciation', authenticate, authorize(['admin']), async (req, res) => {
  try {
    // Calculate and update depreciation for all assets
    const result = await depreciationService.updateAllAssetsDepreciation();
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghitung penyusutan semua aset',
      error: error.message 
    });
  }
});

module.exports = router; 