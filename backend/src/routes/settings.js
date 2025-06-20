const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { prisma } = require('../utils/prisma');
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

// Middleware untuk memastikan pengguna memiliki akses
const checkSettingsAccess = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'admin' && !user.role.includes('manager'))) {
      logger.warn('Unauthorized settings access attempt', { userId: user?.userId, role: user?.role });
      return res.status(403).json({ message: 'Akses tidak diizinkan. Hanya admin dan manager yang dapat mengakses pengaturan.' });
    }
    next();
  } catch (error) {
    logger.error('Error checking settings access', { error: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Mendapatkan pengaturan aplikasi
router.get('/', authenticate, async (req, res) => {
  try {
    // Coba ambil data dari database menggunakan Prisma
    let settings;
    
    try {
      settings = await prisma.setting.findFirst();
      logger.debug('Settings retrieved from database', { found: !!settings });
    } catch (prismaError) {
      logger.error('Prisma error when retrieving settings', { error: prismaError.message });
      // Jika terjadi error pada Prisma, gunakan data default
      return res.status(200).json(defaultSettings);
    }
    
    if (!settings) {
      try {
        // Buat default settings jika belum ada
        logger.info('Creating default settings in database');
        settings = await prisma.setting.create({
          data: {
            companyName: defaultSettings.companyName,
            companyAddress: defaultSettings.companyAddress,
            companyPhone: defaultSettings.companyPhone,
            companyEmail: defaultSettings.companyEmail,
            taxNumber: defaultSettings.taxNumber,
            currency: defaultSettings.currency,
            currencySymbol: defaultSettings.currencySymbol,
            invoicePrefix: defaultSettings.invoicePrefix,
            projectPrefix: defaultSettings.projectPrefix,
            fiscalYearStart: defaultSettings.fiscalYearStart,
            vatRate: defaultSettings.vatRate,
            defaultPaymentTerms: defaultSettings.defaultPaymentTerms,
            reminderDays: defaultSettings.reminderDays,
            boringDefaultRate: defaultSettings.boringDefaultRate,
            sondirDefaultRate: defaultSettings.sondirDefaultRate,
            enableUserRoles: defaultSettings.enableUserRoles,
            allowClientPortal: defaultSettings.allowClientPortal,
            enableTwoFactor: defaultSettings.enableTwoFactor,
            enableAutomaticBackup: defaultSettings.enableAutomaticBackup,
            backupFrequency: defaultSettings.backupFrequency
          }
        });
        logger.info('Default settings created successfully');
      } catch (createError) {
        logger.error('Error creating default settings', { error: createError.message });
        // Jika gagal membuat settings, gunakan data default
        return res.status(200).json(defaultSettings);
      }
    }
    
    return res.status(200).json(settings);
  } catch (error) {
    logger.error('Error fetching settings', { error: error.message });
    // Dalam kasus error apapun, kembalikan default settings
    return res.status(200).json(defaultSettings);
  }
});

// Memperbarui pengaturan aplikasi
router.put('/', authenticate, checkSettingsAccess, async (req, res) => {
  try {
    const {
      companyName, companyAddress, companyPhone, companyEmail, taxNumber,
      currency, currencySymbol, invoicePrefix, projectPrefix, fiscalYearStart, vatRate,
      defaultPaymentTerms, reminderDays, boringDefaultRate, sondirDefaultRate,
      enableUserRoles, allowClientPortal,
      enableTwoFactor, enableAutomaticBackup, backupFrequency
    } = req.body;

    // Validasi data yang diperlukan
    if (!companyName) {
      logger.warn('Settings update attempted without company name', { userId: req.user.userId });
      return res.status(400).json({ message: 'Nama perusahaan harus diisi' });
    }

    // Persiapkan data untuk update
    const updateData = {
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      taxNumber,
      currency: currency || defaultSettings.currency,
      currencySymbol: currencySymbol || defaultSettings.currencySymbol,
      invoicePrefix: invoicePrefix || defaultSettings.invoicePrefix,
      projectPrefix: projectPrefix || defaultSettings.projectPrefix,
      fiscalYearStart: fiscalYearStart || defaultSettings.fiscalYearStart,
      vatRate: vatRate ? parseFloat(vatRate) : defaultSettings.vatRate,
      defaultPaymentTerms: defaultPaymentTerms ? parseInt(defaultPaymentTerms) : defaultSettings.defaultPaymentTerms,
      reminderDays: reminderDays ? parseInt(reminderDays) : defaultSettings.reminderDays,
      boringDefaultRate: boringDefaultRate ? parseFloat(boringDefaultRate) : defaultSettings.boringDefaultRate,
      sondirDefaultRate: sondirDefaultRate ? parseFloat(sondirDefaultRate) : defaultSettings.sondirDefaultRate,
      enableUserRoles: enableUserRoles !== undefined ? enableUserRoles : defaultSettings.enableUserRoles,
      allowClientPortal: allowClientPortal !== undefined ? allowClientPortal : defaultSettings.allowClientPortal,
      enableTwoFactor: enableTwoFactor !== undefined ? enableTwoFactor : defaultSettings.enableTwoFactor,
      enableAutomaticBackup: enableAutomaticBackup !== undefined ? enableAutomaticBackup : defaultSettings.enableAutomaticBackup,
      backupFrequency: backupFrequency || defaultSettings.backupFrequency,
      lastUpdated: new Date(),
      updatedBy: req.user.userId
    };

    let settings;

    try {
      // Cari setting yang sudah ada
      const existingSetting = await prisma.setting.findFirst();

      if (existingSetting) {
        // Update jika sudah ada
        logger.debug('Updating existing settings', { id: existingSetting.id });
        settings = await prisma.setting.update({
          where: { id: existingSetting.id },
          data: updateData
        });
      } else {
        // Buat baru jika belum ada
        logger.debug('Creating new settings');
        settings = await prisma.setting.create({
          data: updateData
        });
      }
      
      logger.info('Settings updated successfully', { updatedBy: req.user.userId });
      return res.status(200).json({
        message: 'Pengaturan berhasil disimpan',
        settings
      });
      
    } catch (prismaError) {
      logger.error('Prisma error during settings update', { 
        error: prismaError.message,
        userId: req.user.userId
      });
      
      // Return updated data meski tidak disimpan ke database
      const fallbackSettings = { ...defaultSettings, ...updateData };
      
      return res.status(200).json({
        message: 'Pengaturan diperbarui (namun belum disimpan ke database karena error)',
        settings: fallbackSettings,
        error: prismaError.message
      });
    }
    
  } catch (error) {
    logger.error('Error updating settings', { error: error.message });
    return res.status(500).json({ 
      message: 'Terjadi kesalahan saat menyimpan pengaturan',
      error: error.message
    });
  }
});

module.exports = router; 