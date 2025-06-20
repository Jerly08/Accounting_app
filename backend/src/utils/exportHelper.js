const ExcelJS = require('exceljs');
const { format } = require('date-fns');
const { id } = require('date-fns/locale');

/**
 * Exports transactions to Excel format
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} options - Export options
 * @returns {Buffer} - Excel file buffer
 */
const exportTransactionsToExcel = async (transactions, options = {}) => {
  try {
    console.log('Starting Excel export with', transactions?.length || 0, 'transactions');
    
    // Ensure transactions is an array and handle null/undefined values
    const safeTransactions = Array.isArray(transactions) ? transactions.filter(t => t !== null && t !== undefined) : [];
    
    console.log('Safe transactions count:', safeTransactions.length);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transaksi Keuangan');
    
    // Add company info and report title
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = options.companyName || 'Aplikasi Akuntansi Proyek';
    worksheet.getCell('A1').font = { size: 14, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    
    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = 'Laporan Transaksi Keuangan';
    worksheet.getCell('A2').font = { size: 12, bold: true };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    
    // Add filter information
    let filterRow = 4;
    if (options.filters) {
      worksheet.getCell(`A${filterRow}`).value = 'Filter:';
      worksheet.getCell(`A${filterRow}`).font = { bold: true };
      
      if (options.filters.startDate && options.filters.endDate) {
        worksheet.getCell(`B${filterRow}`).value = `Period: ${options.filters.startDate} to ${options.filters.endDate}`;
        filterRow++;
      }
      
      if (options.filters.type) {
        const typeMap = {
          income: 'Income',
          expense: 'Expense'
        };
        worksheet.getCell(`B${filterRow}`).value = `Type: ${typeMap[options.filters.type] || options.filters.type}`;
        filterRow++;
      }
      
      if (options.filters.accountName) {
        worksheet.getCell(`B${filterRow}`).value = `Account: ${options.filters.accountName}`;
        filterRow++;
      }
      
      if (options.filters.projectName) {
        worksheet.getCell(`B${filterRow}`).value = `Project: ${options.filters.projectName}`;
        filterRow++;
      }
      
      filterRow += 1; // Add space after filters
    }
    
    // Set headers
    const headerRow = filterRow;
    worksheet.getRow(headerRow).values = [
      'No',
      'Date',
      'Description',
      'Account',
      'Destination Account',
      'Project',
      'Type',
      'Amount',
      'Notes'
    ];
    
    // Style the headers
    worksheet.getRow(headerRow).font = { bold: true };
    worksheet.getRow(headerRow).alignment = { horizontal: 'center' };
    worksheet.getRow(headerRow).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add data rows
    let rowIndex = headerRow + 1;
    
    // Define type mapping once
    const typeMap = {
      income: 'Income',
      expense: 'Expense'
    };
    
    // Process each transaction safely
    safeTransactions.forEach((transaction, index) => {
      try {
        if (!transaction) {
          console.warn('Skipping null transaction at index', index);
          return; // Skip this iteration
        }
        
        // Safely get date
        let formattedDate = '';
        try {
          if (transaction.date) {
            formattedDate = format(new Date(transaction.date), 'dd MMMM yyyy', { locale: id });
          }
        } catch (error) {
          console.error('Error formatting date:', error);
          formattedDate = 'Invalid date';
        }
        
        // Safely get amount
        let amount = 0;
        try {
          amount = transaction.amount ? Number(transaction.amount) : 0;
        } catch (error) {
          console.error('Error parsing amount:', error);
        }
        
        // Safely get account name
        const accountName = transaction.account?.name || '';
        
        // Safely get destination account name
        const destinationAccountName = transaction.destinationAccount?.name || '';
        
        // Safely get project name
        const projectName = transaction.project?.name || '';
        
        // Safely get transaction type
        const transactionType = transaction.type ? (typeMap[transaction.type] || transaction.type) : '';
        
        // Safely get description and notes
        const description = transaction.description || '';
        const notes = transaction.notes || '';
        
        // Add values to worksheet
        worksheet.getRow(rowIndex).values = [
          index + 1,
          formattedDate,
          description,
          accountName,
          destinationAccountName,
          projectName,
          transactionType,
          amount,
          notes
        ];
        
        // Format amount as currency
        const amountCell = worksheet.getCell(`H${rowIndex}`);
        amountCell.numFmt = '#,##0';
        
        // Color-code transaction types
        const typeCell = worksheet.getCell(`G${rowIndex}`);
        if (transaction.type === 'income') {
          typeCell.font = { color: { argb: 'FF008000' } }; // Green
        } else if (transaction.type === 'expense') {
          typeCell.font = { color: { argb: 'FFFF0000' } }; // Red
        }
        
        // Format amount based on transaction type
        if (transaction.type === 'income') {
          amountCell.font = { color: { argb: 'FF008000' } }; // Green
        } else if (transaction.type === 'expense') {
          amountCell.font = { color: { argb: 'FFFF0000' } }; // Red
        }
        
        rowIndex++;
      } catch (rowError) {
        console.error('Error processing row for transaction:', rowError, 'Transaction:', JSON.stringify(transaction));
        // Continue with next transaction
      }
    });
    
    // Add totals
    const totalRow = rowIndex + 1;
    worksheet.getCell(`G${totalRow}`).value = 'Total Income:';
    worksheet.getCell(`G${totalRow}`).font = { bold: true };
    
    // Safely calculate total income
    let totalIncome = 0;
    try {
      totalIncome = safeTransactions
        .filter(t => t && t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount || 0) || 0), 0);
    } catch (error) {
      console.error('Error calculating total income:', error);
    }
    
    worksheet.getCell(`H${totalRow}`).value = totalIncome;
    worksheet.getCell(`H${totalRow}`).numFmt = '#,##0';
    worksheet.getCell(`H${totalRow}`).font = { color: { argb: 'FF008000' }, bold: true };
    
    const expenseRow = totalRow + 1;
    worksheet.getCell(`G${expenseRow}`).value = 'Total Expense:';
    worksheet.getCell(`G${expenseRow}`).font = { bold: true };
    
    // Safely calculate total expense
    let totalExpense = 0;
    try {
      totalExpense = safeTransactions
        .filter(t => t && t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount || 0) || 0), 0);
    } catch (error) {
      console.error('Error calculating total expense:', error);
    }
    
    worksheet.getCell(`H${expenseRow}`).value = totalExpense;
    worksheet.getCell(`H${expenseRow}`).numFmt = '#,##0';
    worksheet.getCell(`H${expenseRow}`).font = { color: { argb: 'FFFF0000' }, bold: true };
    
    const netRow = expenseRow + 1;
    worksheet.getCell(`G${netRow}`).value = 'Net Cash Flow:';
    worksheet.getCell(`G${netRow}`).font = { bold: true };
    
    const netCashFlow = totalIncome - totalExpense;
    
    worksheet.getCell(`H${netRow}`).value = netCashFlow;
    worksheet.getCell(`H${netRow}`).numFmt = '#,##0';
    worksheet.getCell(`H${netRow}`).font = { 
      color: { argb: netCashFlow >= 0 ? 'FF008000' : 'FFFF0000' }, 
      bold: true 
    };
    
    // Add footer with date generated
    const footerRow = netRow + 3;
    worksheet.getCell(`A${footerRow}`).value = `Printed on: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`;
    worksheet.getCell(`A${footerRow}`).font = { italic: true };
    
    // Auto-size columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    // Description column wider
    worksheet.getColumn(3).width = 30;
    
    // Set borders
    for (let i = headerRow; i < rowIndex; i++) {
      worksheet.getRow(i).eachCell({ includeEmpty: true }, cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
    
    console.log('Excel generation completed successfully');
    
    // Generate buffer
    return await workbook.xlsx.writeBuffer();
    
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw new Error(`Failed to generate Excel file: ${error.message}`);
  }
};

/**
 * Error handler for export functionality
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 */
const handleExportError = (error, res) => {
  console.error('Export error:', error);
  
  // Check if headers have already been sent
  if (res.headersSent) {
    console.warn('Headers already sent, cannot send error response');
    try {
      // Try to end the response if possible
      return res.end();
    } catch (endError) {
      console.error('Error ending response:', endError);
      // Nothing more we can do
      return;
    }
  }
  
  try {
    // Try to send a JSON error response
    return res.status(200).json({
      success: false,
      message: 'Failed to export data',
      error: error.message || 'Unknown error'
    });
  } catch (responseError) {
    console.error('Error sending error response:', responseError);
    // Try a simpler response as a last resort
    try {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Export failed: ' + (error.message || 'Unknown error'));
    } catch (finalError) {
      console.error('Final error in error handler:', finalError);
      // Nothing more we can do
    }
  }
};

module.exports = {
  exportTransactionsToExcel,
  handleExportError
}; 