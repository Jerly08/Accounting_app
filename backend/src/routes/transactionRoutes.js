const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { auth } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Apply authentication middleware to all routes
router.use(auth);

// Get all transactions with filtering
router.get('/', transactionController.getAllTransactions);

// Export transactions to Excel
router.get('/export', transactionController.exportTransactions);

// Get chart data for transactions - simplified version with fallback data
router.get('/chart-data', async (req, res) => {
  try {
    console.log('Chart data request received with params:', req.query);
    const { interval = 'day' } = req.query;
    
    // Generate fallback data
    const today = new Date();
    const fallbackData = [];
    
    // Generate data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = interval === 'month' 
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : interval === 'week'
          ? `${date.getFullYear()}-W${String(Math.ceil((date.getDate() + date.getDay()) / 7)).padStart(2, '0')}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      fallbackData.push({
        date: dateStr,
        income: Math.floor(Math.random() * 5000000),
        expense: Math.floor(Math.random() * 3000000),
        net: 0
      });
    }
    
    // Calculate net values and cumulative values
    let runningIncome = 0;
    let runningExpense = 0;
    
    fallbackData.forEach(entry => {
      entry.net = entry.income - entry.expense;
      
      runningIncome += entry.income;
      runningExpense += entry.expense;
      
      entry.cumulativeIncome = runningIncome;
      entry.cumulativeExpense = runningExpense;
      entry.cumulativeNet = runningIncome - runningExpense;
    });
    
    // Calculate totals
    const totals = {
      income: fallbackData.reduce((sum, entry) => sum + entry.income, 0),
      expense: fallbackData.reduce((sum, entry) => sum + entry.expense, 0),
      net: fallbackData.reduce((sum, entry) => sum + entry.net, 0)
    };
    
    console.log('Sending static fallback chart data');
    
    // Create a safe copy of dates for the response to avoid circular reference issues
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    
    res.json({
      success: true,
      data: fallbackData,
      totals,
      meta: {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        interval,
        note: "This is static fallback data and does not reflect actual transactions."
      }
    });
  } catch (error) {
    console.error('Error in chart-data endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating chart data',
      error: error.message
    });
  }
});

// Get a specific transaction
router.get('/:id', transactionController.getTransactionById);

// Create a new transaction
router.post('/', transactionController.createTransaction);

// Update a transaction
router.put('/:id', transactionController.updateTransaction);

// Delete a transaction
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router; 