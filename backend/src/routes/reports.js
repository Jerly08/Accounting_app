const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const { generateBalanceSheet, generateComparativeBalanceSheet } = require('../services/balanceSheet');

const prisma = new PrismaClient();

/**
 * @route   GET /api/reports/balance-sheet
 * @desc    Generate balance sheet report
 * @access  Private
 */
router.get('/balance-sheet', auth, async (req, res) => {
  try {
    const { date } = req.query;
    
    // Generate balance sheet
    const balanceSheet = await generateBalanceSheet(date);
    
    if (!balanceSheet.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate balance sheet',
        error: balanceSheet.error
      });
    }
    
    return res.json(balanceSheet);
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating balance sheet',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reports/balance-check
 * @desc    Check if balance sheet is balanced
 * @access  Private
 */
router.get('/balance-check', auth, async (req, res) => {
  try {
    const { date } = req.query;
    
    // Import balance sheet service
    const { generateBalanceSheet } = require('../services/balanceSheet');
    
    // Generate balance sheet
    const balanceSheet = await generateBalanceSheet(date);
    
    if (!balanceSheet.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate balance sheet',
        error: balanceSheet.error
      });
    }
    
    // Check if balance sheet is balanced
    const { totalAssets, totalLiabilitiesAndEquity, difference, isBalanced } = balanceSheet.data.summary;
    
    return res.json({
      success: true,
      data: {
        date: balanceSheet.data.date,
        totalAssets,
        totalLiabilitiesAndEquity,
        difference,
        isBalanced,
        message: isBalanced 
          ? 'Balance sheet is balanced' 
          : 'Balance sheet is not balanced. Please check your transactions.'
      }
    });
  } catch (error) {
    console.error('Error checking balance sheet balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking balance sheet balance',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reports/comparative-balance-sheet
 * @desc    Generate comparative balance sheet report
 * @access  Private
 */
router.get('/comparative-balance-sheet', auth, async (req, res) => {
  try {
    const { currentDate, previousDate } = req.query;
    
    if (!currentDate || !previousDate) {
      return res.status(400).json({
        success: false,
        message: 'Both currentDate and previousDate are required'
      });
    }
    
    // Generate comparative balance sheet
    const comparativeBalanceSheet = await generateComparativeBalanceSheet(currentDate, previousDate);
    
    if (!comparativeBalanceSheet.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate comparative balance sheet',
        error: comparativeBalanceSheet.error
      });
    }
    
    return res.json(comparativeBalanceSheet);
  } catch (error) {
    console.error('Error generating comparative balance sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating comparative balance sheet',
      error: error.message
    });
  }
});

module.exports = router; 