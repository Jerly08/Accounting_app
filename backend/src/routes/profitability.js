const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const profitabilityService = require('../services/profitability');

/**
 * @route   GET /api/profitability
 * @desc    Get profitability data for all projects
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await profitabilityService.getAllProjectsProfitability();
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data profitabilitas proyek',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/profitability/summary
 * @desc    Get profitability summary
 * @access  Private
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const result = await profitabilityService.getProfitabilitySummary();
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil ringkasan profitabilitas',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/profitability/:projectId
 * @desc    Get profitability data for a specific project
 * @access  Private
 */
router.get('/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await profitabilityService.getProjectProfitability(projectId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data profitabilitas proyek',
      error: error.message 
    });
  }
});

module.exports = router; 