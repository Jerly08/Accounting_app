const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const cashFlowService = require('../services/cashFlow');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @route   GET /api/cash-flow
 * @desc    Get cash flow data for a specific period
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }
    
    console.log(`DEBUG: Fetching cash flow for period ${startDate} to ${endDate}`);
    
    // Log tanggal yang digunakan
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    console.log(`DEBUG: Parsed dates: ${startDateObj.toISOString()} to ${endDateObj.toISOString()}`);
    
    const result = await cashFlowService.generateCashFlow(startDate, endDate);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data arus kas',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/cash-flow/comparative
 * @desc    Get comparative cash flow data between two periods
 * @access  Private
 */
router.get('/comparative', authenticate, async (req, res) => {
  try {
    const { currentStartDate, currentEndDate, previousStartDate, previousEndDate } = req.query;
    
    if (!currentStartDate || !currentEndDate || !previousStartDate || !previousEndDate) {
      return res.status(400).json({
        success: false,
        message: 'All date parameters are required (currentStartDate, currentEndDate, previousStartDate, previousEndDate)'
      });
    }
    
    const result = await cashFlowService.generateComparativeCashFlow(
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data arus kas komparatif',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/cash-flow/debug
 * @desc    Debug endpoint to check raw transaction data
 * @access  Private
 */
router.get('/debug', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // Set time to beginning and end of day
    startDateObj.setHours(0, 0, 0, 0);
    endDateObj.setHours(23, 59, 59, 999);
    
    // Get all transactions within the period
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDateObj,
          lte: endDateObj
        }
      },
      include: {
        chartofaccount: true,
        project: true
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Get project billings within the period
    const billings = await prisma.billing.findMany({
      where: {
        billingDate: {
          gte: startDateObj,
          lte: endDateObj
        }
      },
      include: {
        project: true
      }
    });
    
    // Get project costs within the period
    const projectCosts = await prisma.projectcost.findMany({
      where: {
        date: {
          gte: startDateObj,
          lte: endDateObj
        }
      },
      include: {
        project: true
      }
    });
    
    // Get fixed asset transactions within the period
    const fixedAssetTransactions = await prisma.fixedasset.findMany({
      where: {
        acquisitionDate: {
          gte: startDateObj,
          lte: endDateObj
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        period: {
          startDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString()
        },
        counts: {
          transactions: transactions.length,
          billings: billings.length,
          projectCosts: projectCosts.length,
          fixedAssetTransactions: fixedAssetTransactions.length
        },
        transactions,
        billings,
        projectCosts,
        fixedAssetTransactions
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during debug',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/cash-flow/debug-financing
 * @desc    Debug endpoint to check financing transactions
 * @access  Private
 */
router.get('/debug-financing', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // Set time to beginning and end of day
    startDateObj.setHours(0, 0, 0, 0);
    endDateObj.setHours(23, 59, 59, 999);
    
    console.log(`DEBUG: Checking financing transactions for period ${startDateObj.toISOString()} to ${endDateObj.toISOString()}`);
    
    // Get all financing categories
    const financingCategories = await prisma.cashflow_category.findMany({
      where: { category: 'financing' },
      select: { accountCode: true }
    });
    
    const financingAccountCodes = financingCategories.map(cat => cat.accountCode);
    console.log(`DEBUG: Found ${financingAccountCodes.length} financing account codes:`, financingAccountCodes);
    
    // Get transactions for these account codes
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDateObj,
          lte: endDateObj
        },
        accountCode: {
          in: financingAccountCodes
        }
      },
      include: {
        chartofaccount: true,
        project: true
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Also check transactions with specific account codes
    const specificTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDateObj,
          lte: endDateObj
        },
        OR: [
          { accountCode: '2101' },
          { accountCode: '2201' },
          { accountCode: '3101' },
          { accountCode: '3102' }
        ]
      },
      include: {
        chartofaccount: true
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    res.json({
      success: true,
      data: {
        period: {
          startDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString()
        },
        financingCategories,
        financingAccountCodes,
        transactionsCount: transactions.length,
        specificTransactionsCount: specificTransactions.length,
        transactions,
        specificTransactions
      }
    });
  } catch (error) {
    console.error('Debug financing error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during financing debug',
      error: error.message 
    });
  }
});

module.exports = router; 