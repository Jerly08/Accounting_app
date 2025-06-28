/**
 * Cash Flow Service
 * Service untuk menghasilkan laporan arus kas
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Menghasilkan data arus kas untuk periode tertentu
 * @param {string} startDate - Tanggal awal periode (YYYY-MM-DD)
 * @param {string} endDate - Tanggal akhir periode (YYYY-MM-DD)
 * @returns {Promise<Object>} - Data arus kas
 */
const generateCashFlow = async (startDate, endDate) => {
  try {
    const startDateObj = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // Default to first day of current month
    const endDateObj = endDate ? new Date(endDate) : new Date(); // Default to current date
    
    // Set time to beginning and end of day
    startDateObj.setHours(0, 0, 0, 0);
    endDateObj.setHours(23, 59, 59, 999);
    
    // Define cash/bank accounts (1101-1105)
    const cashBankAccountCodes = ['1101', '1102', '1103', '1104', '1105'];
    
    // Get all transactions within the period that involve cash/bank accounts
    let transactions = [];
    try {
      transactions = await prisma.transaction.findMany({
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
      
      console.log(`Found ${transactions.length} cash/bank transactions in period`);
    } catch (error) {
      console.error('Error fetching cash/bank transactions:', error);
      transactions = [];
    }
    
    // Get all cashflow categories for classification
    let cashflowCategoryMap = {};
    try {
      const cashflowCategories = await prisma.cashflow_category.findMany();
      
      // Create a map for easy lookup
      cashflowCategories.forEach(category => {
        cashflowCategoryMap[category.accountCode] = category;
      });
    } catch (error) {
      console.error('Error fetching cashflow categories:', error);
      cashflowCategoryMap = {};
    }
    
    // Classify transactions into cash flow categories
    const operatingActivities = [];
    const investingActivities = [];
    const financingActivities = [];
    
    // Track processed transactions to avoid duplication
    const processedTransactionIds = new Set();
    
    // Process cash/bank transactions
    for (const transaction of transactions) {
      const { id, type, amount, description, date, accountCode, chartofaccount, project } = transaction;
      
      // Skip if already processed
      if (processedTransactionIds.has(id)) continue;
      processedTransactionIds.add(id);
      
      // Parse amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount === 0) continue;
      
      // For cash/bank accounts:
      // DEBIT (money coming in) is positive cash flow
      // CREDIT (money going out) is negative cash flow
      const isDebit = type === 'DEBIT' || type === 'debit' || 
                     type === 'Income' || type === 'income' || 
                     type === 'Penerimaan';
      const isCredit = type === 'CREDIT' || type === 'credit' || 
                      type === 'Expense' || type === 'expense' || 
                      type === 'Pengeluaran';
      
      // Determine if this is a cash inflow or outflow
      let cashFlowAmount;
      if (isDebit) {
        // Cash inflow (DEBIT to cash/bank) is POSITIVE
        cashFlowAmount = Math.abs(parsedAmount);
      } else if (isCredit) {
        // Cash outflow (CREDIT from cash/bank) is NEGATIVE
        cashFlowAmount = -Math.abs(parsedAmount);
      } else {
        // If type is not recognized, try to determine from description
        if (description && (
            description.toLowerCase().includes('receipt') || 
            description.toLowerCase().includes('received') ||
            description.toLowerCase().includes('penerimaan')
          )) {
          cashFlowAmount = Math.abs(parsedAmount); // Likely inflow
        } else if (description && (
            description.toLowerCase().includes('payment') || 
            description.toLowerCase().includes('paid') ||
            description.toLowerCase().includes('pembayaran')
          )) {
          cashFlowAmount = -Math.abs(parsedAmount); // Likely outflow
        } else {
          // Skip transactions with unrecognized type
          console.log(`Skipping transaction ${id} with unrecognized type: ${type}`);
          continue;
        }
      }
      
      const cashFlowItem = {
        date: date,
        description: description,
        amount: cashFlowAmount,
        accountCode: accountCode,
        accountName: chartofaccount ? chartofaccount.name : 'Unknown',
        project: project ? { id: project.id, name: project.name } : null,
        type: type,
        originalType: type // Keep original type for reference
      };
      
      // Determine the category based on description or other factors
      let category = 'operating'; // Default category
      
      // Check description for classification hints
      if (description) {
        const descLower = description.toLowerCase();
        
        // Investing activities
        if (
          descLower.includes('asset') || 
          descLower.includes('equipment') || 
          descLower.includes('purchase of') || 
          descLower.includes('sale of') ||
          descLower.includes('investment') ||
          descLower.includes('fixed asset') ||
          descLower.includes('mesin') ||
          descLower.includes('kendaraan') ||
          descLower.includes('bangunan')
        ) {
          category = 'investing';
        }
        // Financing activities
        else if (
          descLower.includes('loan') || 
          descLower.includes('dividend') || 
          descLower.includes('equity') ||
          descLower.includes('capital') ||
          descLower.includes('share') ||
          descLower.includes('hutang') ||
          descLower.includes('pinjaman') ||
          descLower.includes('modal')
        ) {
          category = 'financing';
        }
      }
      
      // Add to appropriate category
      if (category === 'investing') {
        investingActivities.push(cashFlowItem);
      } else if (category === 'financing') {
        financingActivities.push(cashFlowItem);
      } else {
        operatingActivities.push(cashFlowItem);
      }
    }
    
    // Calculate totals
    const totalOperating = operatingActivities.reduce((sum, item) => sum + item.amount, 0);
    const totalInvesting = investingActivities.reduce((sum, item) => sum + item.amount, 0);
    const totalFinancing = financingActivities.reduce((sum, item) => sum + item.amount, 0);
    const netCashFlow = totalOperating + totalInvesting + totalFinancing;
    
    // Group operating activities by inflow/outflow
    const operatingByType = {
      'Cash Inflows': operatingActivities.filter(item => item.amount > 0),
      'Cash Outflows': operatingActivities.filter(item => item.amount < 0)
    };
    
    // Calculate totals for debugging
    const totalCashInflows = [...operatingActivities, ...investingActivities, ...financingActivities]
      .filter(item => item.amount > 0)
      .reduce((sum, item) => sum + item.amount, 0);
      
    const totalCashOutflows = [...operatingActivities, ...investingActivities, ...financingActivities]
      .filter(item => item.amount < 0)
      .reduce((sum, item) => sum + item.amount, 0);
    
    console.log('Cash Flow Summary:', {
      totalOperating,
      totalInvesting,
      totalFinancing,
      netCashFlow,
      totalCashInflows,
      totalCashOutflows,
      operatingCount: operatingActivities.length,
      investingCount: investingActivities.length,
      financingCount: financingActivities.length
    });
    
    // Return formatted cash flow data
    return {
      success: true,
      data: {
        period: {
          startDate: startDateObj.toISOString().split('T')[0],
          endDate: endDateObj.toISOString().split('T')[0]
        },
        operating: {
          activities: operatingActivities,
          byType: operatingByType,
          total: totalOperating
        },
        investing: {
          activities: investingActivities,
          total: totalInvesting
        },
        financing: {
          activities: financingActivities,
          total: totalFinancing
        },
        summary: {
          totalOperating,
          totalInvesting,
          totalFinancing,
          netCashFlow,
          totalCashInflows,
          totalCashOutflows
        }
      }
    };
  } catch (error) {
    console.error('Error generating cash flow:', error);
    return {
      success: false,
      message: 'Failed to generate cash flow report',
      error: error.message
    };
  }
};

/**
 * Menghasilkan data arus kas komparatif untuk dua periode
 * @param {string} currentStartDate - Tanggal awal periode saat ini (YYYY-MM-DD)
 * @param {string} currentEndDate - Tanggal akhir periode saat ini (YYYY-MM-DD)
 * @param {string} previousStartDate - Tanggal awal periode pembanding (YYYY-MM-DD)
 * @param {string} previousEndDate - Tanggal akhir periode pembanding (YYYY-MM-DD)
 * @returns {Promise<Object>} - Data arus kas komparatif
 */
const generateComparativeCashFlow = async (currentStartDate, currentEndDate, previousStartDate, previousEndDate) => {
  try {
    // Generate cash flow for both periods
    const currentCashFlow = await generateCashFlow(currentStartDate, currentEndDate);
    const previousCashFlow = await generateCashFlow(previousStartDate, previousEndDate);
    
    // Check if both cash flows were generated successfully
    if (!currentCashFlow.success && !previousCashFlow.success) {
      return {
        success: false,
        message: 'Failed to generate both current and previous cash flow reports',
        error: {
          current: currentCashFlow.error,
          previous: previousCashFlow.error
        }
      };
    }
    
    // If one of the cash flows failed, return what we have with a warning
    if (!currentCashFlow.success) {
      return {
        success: false,
        message: 'Failed to generate current period cash flow report',
        error: currentCashFlow.error,
        data: {
          previous: previousCashFlow.data
        }
      };
    }
    
    if (!previousCashFlow.success) {
      return {
        success: false,
        message: 'Failed to generate previous period cash flow report',
        error: previousCashFlow.error,
        data: {
          current: currentCashFlow.data
        }
      };
    }
    
    // Calculate changes and percentages
    const current = currentCashFlow.data.summary;
    const previous = previousCashFlow.data.summary;
    
    const changes = {
      totalOperating: current.totalOperating - previous.totalOperating,
      totalInvesting: current.totalInvesting - previous.totalInvesting,
      totalFinancing: current.totalFinancing - previous.totalFinancing,
      netCashFlow: current.netCashFlow - previous.netCashFlow
    };
    
    const percentChanges = {
      totalOperating: previous.totalOperating !== 0 ? 
        ((current.totalOperating - previous.totalOperating) / Math.abs(previous.totalOperating)) * 100 : 0,
      totalInvesting: previous.totalInvesting !== 0 ? 
        ((current.totalInvesting - previous.totalInvesting) / Math.abs(previous.totalInvesting)) * 100 : 0,
      totalFinancing: previous.totalFinancing !== 0 ? 
        ((current.totalFinancing - previous.totalFinancing) / Math.abs(previous.totalFinancing)) * 100 : 0,
      netCashFlow: previous.netCashFlow !== 0 ? 
        ((current.netCashFlow - previous.netCashFlow) / Math.abs(previous.netCashFlow)) * 100 : 0
    };
    
    return {
      success: true,
      data: {
        current: currentCashFlow.data,
        previous: previousCashFlow.data,
        changes,
        percentChanges
      }
    };
  } catch (error) {
    console.error('Error generating comparative cash flow:', error);
    return {
      success: false,
      message: 'Failed to generate comparative cash flow',
      error: error.message
    };
  }
};

module.exports = {
  generateCashFlow,
  generateComparativeCashFlow
}; 