const { PrismaClient } = require('@prisma/client');
const { exportTransactionsToExcel, handleExportError } = require('../utils/exportHelper');

const prisma = new PrismaClient();

/**
 * Export transactions to Excel
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.exportTransactions = async (req, res) => {
  try {
    console.log('Starting export process with query params:', req.query);
    
    // Extract filter parameters
    const { type, accountCode, projectId, startDate, endDate, export: exportType } = req.query;
    
    // Build filter object for database query
    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (accountCode) {
      filter.accountCode = accountCode;
    }
    
    if (projectId) {
      if (projectId === 'none') {
        filter.projectId = null;
      } else {
        try {
          filter.projectId = parseInt(projectId);
        } catch (error) {
          console.error('Error parsing projectId:', error);
          // Skip this filter if parsing fails
        }
      }
    }
    
    // Date range filter using Prisma syntax
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        try {
          filter.date.gte = new Date(startDate);
        } catch (error) {
          console.error('Error parsing startDate:', error);
          // Use a default date if parsing fails
          filter.date.gte = new Date(0); // Jan 1, 1970
        }
      }
      if (endDate) {
        try {
          filter.date.lte = new Date(endDate);
        } catch (error) {
          console.error('Error parsing endDate:', error);
          // Use current date if parsing fails
          filter.date.lte = new Date();
        }
      }
    }
    
    console.log('Fetching transactions with filter:', JSON.stringify(filter));
    
    // Fetch transactions with related data
    let transactions = [];
    try {
      transactions = await prisma.transaction.findMany({
        where: filter,
        orderBy: {
          date: 'desc'
        },
        include: {
          account: true,
          project: {
            include: {
              client: true
            }
          }
        }
      });
      
      console.log(`Found ${transactions.length} transactions`);
      
      // Verify transaction data structure
      if (transactions.length > 0) {
        console.log('Sample transaction:', JSON.stringify(transactions[0], null, 2));
      }
    } catch (dbError) {
      console.error('Database error when fetching transactions:', dbError);
      return handleExportError(new Error(`Database error: ${dbError.message}`), res);
    }
    
    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No transactions found for the specified filters',
        data: []
      });
    }
    
    // Transform transactions to include destination account if needed
    let transformedTransactions = [];
    try {
      transformedTransactions = await Promise.all(transactions.map(async (transaction) => {
        // Skip null transactions
        if (!transaction) return null;
        
        return transaction;
      }));
      
      console.log('Transactions transformed successfully');
    } catch (transformError) {
      console.error('Error transforming transactions:', transformError);
      // Continue with original transactions if transformation fails
      transformedTransactions = transactions;
    }
    
    // Get filter names for Excel report
    let accountName = null;
    let projectName = null;
    
    if (accountCode) {
      try {
        const account = await prisma.chartOfAccount.findUnique({
          where: { code: accountCode }
        });
        accountName = account?.name;
      } catch (error) {
        console.error('Error fetching account name:', error);
      }
    }
    
    if (projectId && projectId !== 'none') {
      try {
        const project = await prisma.project.findUnique({
          where: { id: parseInt(projectId) }
        });
        projectName = project?.name;
      } catch (error) {
        console.error('Error fetching project name:', error);
      }
    } else if (projectId === 'none') {
      projectName = 'No Project';
    }
    
    console.log('Generating Excel file');
    
    // Generate Excel file
    let excelBuffer;
    try {
      excelBuffer = await exportTransactionsToExcel(transformedTransactions, {
        filters: {
          type,
          accountName,
          projectName,
          startDate,
          endDate
        }
      });
      
      console.log('Excel file generated successfully');
    } catch (excelError) {
      console.error('Error generating Excel:', excelError);
      return handleExportError(excelError, res);
    }
    
    if (!excelBuffer) {
      console.error('Excel buffer is null or undefined');
      return handleExportError(new Error('Failed to generate Excel buffer'), res);
    }
    
    // Set response headers for Excel download
    try {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=financial_transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      console.log('Sending Excel file to client');
      
      // Send the Excel file
      return res.status(200).send(excelBuffer);
    } catch (responseError) {
      console.error('Error sending response:', responseError);
      // Try one more time with a simpler approach
      try {
        return res.end(excelBuffer);
      } catch (finalError) {
        console.error('Final error sending response:', finalError);
        return handleExportError(new Error('Failed to send Excel file'), res);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error in exportTransactions:', error);
    return handleExportError(error, res);
  }
}; 