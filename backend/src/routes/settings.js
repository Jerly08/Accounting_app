const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prismaUtil = require('../utils/prisma');
const prisma = prismaUtil.prisma;
const logger = require('../utils/logger');

// Default settings sebagai fallback jika ada error
const defaultSettings = {
  id: 1,
  companyName: "PT. Boring & Sondir Indonesia",
  companyAddress: "Jl. Teknik Sipil No. 123, Jakarta",
  companyPhone: "021-12345678",
  companyEmail: "info@boringsondir.id",
  taxNumber: "123.456.789.0-000.000",
  currency: "IDR",
  currencySymbol: "Rp",
  invoicePrefix: "INV",
  projectPrefix: "PRJ",
  fiscalYearStart: "01-01",
  vatRate: 11,
  defaultPaymentTerms: 30,
  reminderDays: 7,
  boringDefaultRate: 3500000,
  sondirDefaultRate: 2000000,
  enableUserRoles: true,
  allowClientPortal: false,
  enableTwoFactor: false,
  enableAutomaticBackup: true,
  backupFrequency: "daily",
  lastUpdated: new Date(),
  updatedBy: null
};

// Middleware to check if user has access to settings
const checkSettingsAccess = (req, res, next) => {
  // For now, allow all authenticated users to access settings
  // In the future, we may want to restrict this to admins only
  next();
};

/**
 * @route   GET /api/settings
 * @desc    Get application settings
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    // Get all settings
    const settings = await prisma.setting.findFirst({
      where: { id: 1 } // Ambil setting dengan ID 1
    });
    
    if (!settings) {
      return res.json({
        success: true,
        data: {} // Return empty object if no settings found
      });
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil pengaturan',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/settings
 * @desc    Update application settings
 * @access  Private
 */
router.put('/', auth, checkSettingsAccess, async (req, res) => {
  try {
    const settingsData = req.body;
    
    if (!settingsData || typeof settingsData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings data'
      });
    }
    
    // Check if settings exist
    let settings = await prisma.setting.findFirst({
      where: { id: 1 }
    });
    
    let result;
    if (settings) {
      // Update existing settings
      result = await prisma.setting.update({
        where: { id: 1 },
        data: settingsData
      });
    } else {
      // Create new settings
      result = await prisma.setting.create({
        data: {
          ...settingsData,
          id: 1 // Force ID to be 1
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Pengaturan berhasil diperbarui',
      data: result
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui pengaturan',
      error: error.message 
    });
  }
});

module.exports = router; 