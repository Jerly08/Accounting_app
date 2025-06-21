const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const balanceSheetService = require('../services/balanceSheet');

/**
 * @route   GET /api/balance-sheet
 * @desc    Get balance sheet data for a specific date
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    const result = await balanceSheetService.generateBalanceSheet(date);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data neraca',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/balance-sheet/comparative
 * @desc    Get comparative balance sheet data between two dates
 * @access  Private
 */
router.get('/comparative', authenticate, async (req, res) => {
  try {
    const { currentDate, previousDate } = req.query;
    
    if (!currentDate || !previousDate) {
      return res.status(400).json({
        success: false,
        message: 'Kedua tanggal (currentDate dan previousDate) harus disediakan'
      });
    }
    
    const result = await balanceSheetService.generateComparativeBalanceSheet(
      currentDate,
      previousDate
    );
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data neraca komparatif',
      error: error.message 
    });
  }
});

module.exports = router; 