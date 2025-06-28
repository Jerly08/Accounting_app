const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const cashFlowService = require('../services/cashFlow');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @route   GET /api/cash-flow
 * @desc    Get cash flow data for a specific period
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
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
router.get('/comparative', auth, async (req, res) => {
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
router.get('/debug', auth, async (req, res) => {
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
router.get('/debug-financing', auth, async (req, res) => {
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

/**
 * @route   GET /api/cash-flow/debug-cash
 * @desc    Debug endpoint to check cash transactions
 * @access  Private
 */
router.get('/debug-cash', auth, async (req, res) => {
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
    
    // Define cash/bank accounts (1101-1105)
    const cashBankAccountCodes = ['1101', '1102', '1103', '1104', '1105'];
    
    // Get all cash transactions within the period
    const cashTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDateObj,
          lte: endDateObj
        },
        accountCode: {
          in: cashBankAccountCodes
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
    
    // Process transactions for better understanding
    const processedTransactions = cashTransactions.map(transaction => {
      const { id, type, amount, description, date, accountCode, chartofaccount, project } = transaction;
      const parsedAmount = parseFloat(amount);
      const isInflow = type === 'DEBIT' || type === 'debit';
      const cashFlowAmount = isInflow ? parsedAmount : -parsedAmount;
      
      return {
        id,
        date: date.toISOString(),
        description,
        accountCode,
        accountName: chartofaccount ? chartofaccount.name : 'Unknown',
        type,
        originalAmount: parsedAmount,
        cashFlowAmount,
        isInflow,
        project: project ? { id: project.id, name: project.name } : null
      };
    });
    
    // Calculate totals
    const totalInflow = processedTransactions
      .filter(t => t.isInflow)
      .reduce((sum, t) => sum + t.cashFlowAmount, 0);
      
    const totalOutflow = processedTransactions
      .filter(t => !t.isInflow)
      .reduce((sum, t) => sum + t.cashFlowAmount, 0);
      
    const netCashFlow = totalInflow + totalOutflow;
    
    res.json({
      success: true,
      data: {
        period: {
          startDate: startDateObj.toISOString().split('T')[0],
          endDate: endDateObj.toISOString().split('T')[0]
        },
        transactions: processedTransactions,
        summary: {
          count: processedTransactions.length,
          totalInflow,
          totalOutflow,
          netCashFlow
        }
      }
    });
  } catch (error) {
    console.error('Debug cash error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during debug',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/cash-flow/debug-transactions
 * @desc    Debug endpoint to check cash transactions in detail
 * @access  Private
 */
router.get('/debug-transactions', auth, async (req, res) => {
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
    
    // Define cash/bank accounts (1101-1105)
    const cashBankAccountCodes = ['1101', '1102', '1103', '1104', '1105'];
    
    // Get all cash transactions within the period
    const cashTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDateObj,
          lte: endDateObj
        },
        accountCode: {
          in: cashBankAccountCodes
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
    
    // Process transactions for better understanding
    const processedTransactions = cashTransactions.map(transaction => {
      const { id, type, amount, description, date, accountCode, chartofaccount, project } = transaction;
      const parsedAmount = parseFloat(amount);
      const isInflow = type === 'DEBIT' || type === 'debit';
      const cashFlowAmount = isInflow ? parsedAmount : -parsedAmount;
      
      return {
        id,
        date: date.toISOString().split('T')[0],
        description,
        accountCode,
        accountName: chartofaccount ? chartofaccount.name : 'Unknown',
        type,
        originalAmount: parsedAmount,
        cashFlowAmount,
        isInflow,
        project: project ? { id: project.id, name: project.name } : null
      };
    });
    
    // Group by account
    const transactionsByAccount = {};
    processedTransactions.forEach(transaction => {
      if (!transactionsByAccount[transaction.accountCode]) {
        transactionsByAccount[transaction.accountCode] = {
          accountName: transaction.accountName,
          transactions: [],
          totalInflow: 0,
          totalOutflow: 0
        };
      }
      
      const account = transactionsByAccount[transaction.accountCode];
      account.transactions.push(transaction);
      
      if (transaction.isInflow) {
        account.totalInflow += transaction.cashFlowAmount;
      } else {
        account.totalOutflow += transaction.cashFlowAmount;
      }
    });
    
    // Calculate totals
    const totalInflow = processedTransactions
      .filter(t => t.isInflow)
      .reduce((sum, t) => sum + t.cashFlowAmount, 0);
      
    const totalOutflow = processedTransactions
      .filter(t => !t.isInflow)
      .reduce((sum, t) => sum + t.cashFlowAmount, 0);
      
    const netCashFlow = totalInflow + totalOutflow;
    
    res.json({
      success: true,
      data: {
        period: {
          startDate: startDateObj.toISOString().split('T')[0],
          endDate: endDateObj.toISOString().split('T')[0]
        },
        summary: {
          count: processedTransactions.length,
          totalInflow,
          totalOutflow,
          netCashFlow
        },
        transactionsByAccount,
        transactions: processedTransactions
      }
    });
  } catch (error) {
    console.error('Debug transactions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during debug',
      error: error.message 
    });
  }
});

module.exports = router; 