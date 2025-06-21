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
    
    // 1. Get all accounts
    const accounts = await prisma.chartofaccount.findMany();
    
    // 2. Get all transactions within the period
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
    
    // Get all cashflow categories
    const cashflowCategories = await prisma.cashflow_category.findMany();
    const cashflowCategoryMap = {};
    cashflowCategories.forEach(category => {
      cashflowCategoryMap[category.accountCode] = category;
    });
    
    // 3. Get project billings within the period
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
    
    // 4. Get project costs within the period
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
    
    // 5. Get fixed asset transactions within the period
    const fixedAssetTransactions = await prisma.fixedasset.findMany({
      where: {
        acquisitionDate: {
          gte: startDateObj,
          lte: endDateObj
        }
      }
    });
    
    // 6. Classify transactions into cash flow categories
    const operatingActivities = [];
    const investingActivities = [];
    const financingActivities = [];
    
    // Process regular transactions
    transactions.forEach(transaction => {
      const { type, amount, description, date, chartofaccount, project } = transaction;
      const parsedAmount = parseFloat(amount);
      
      // Determine cash flow category based on account type and transaction details
      if (chartofaccount) {
        const cashFlowItem = {
          date: date,
          description: description,
          amount: parsedAmount,
          accountCode: chartofaccount.code,
          accountName: chartofaccount.name,
          project: project ? { id: project.id, name: project.name } : null
        };
        
        // Check if the account has a cashflow category assigned
        const cashflowCategory = cashflowCategoryMap[chartofaccount.code];
        if (cashflowCategory) {
          const category = cashflowCategory.category;
          
          // Directly classify based on cashflow category
          if (category === 'operating') {
            operatingActivities.push({
              ...cashFlowItem,
              amount: ['income', 'credit'].includes(type) ? parsedAmount : -parsedAmount
            });
            return; // Skip the rest of the logic
          } else if (category === 'investing') {
            investingActivities.push({
              ...cashFlowItem,
              amount: ['income', 'credit'].includes(type) ? parsedAmount : -parsedAmount
            });
            return; // Skip the rest of the logic
          } else if (category === 'financing') {
            financingActivities.push({
              ...cashFlowItem,
              amount: ['income', 'credit'].includes(type) ? parsedAmount : -parsedAmount
            });
            return; // Skip the rest of the logic
          }
        }
        
        // If no cashflow category or fallback needed, classify based on account type
        switch (chartofaccount.type) {
          case 'asset':
            // Fixed assets are investing activities
            if (chartofaccount.category === 'Fixed Assets') {
              investingActivities.push({
                ...cashFlowItem,
                // For assets: purchase is negative cash flow, sale is positive
                amount: ['expense', 'debit', 'WIP_INCREASE'].includes(type) ? -parsedAmount : parsedAmount
              });
            } 
            // Cash and cash equivalents are operating activities
            else if (chartofaccount.category === 'Cash' || chartofaccount.category === 'Bank') {
              operatingActivities.push({
                ...cashFlowItem,
                amount: ['income', 'credit', 'REVENUE'].includes(type) ? parsedAmount : -parsedAmount
              });
            }
            break;
            
          case 'liability':
          case 'Kewajiban': // Add support for Indonesian type
            // Short-term liabilities are operating activities
            if (chartofaccount.category === 'Current Liabilities' || chartofaccount.category === 'Hutang Lancar') {
              operatingActivities.push({
                ...cashFlowItem,
                amount: ['expense', 'debit'].includes(type) ? -parsedAmount : parsedAmount
              });
            } 
            // Long-term liabilities are financing activities
            else if (chartofaccount.category === 'Hutang' || chartofaccount.code.startsWith('2')) {
              financingActivities.push({
                ...cashFlowItem,
                // For liabilities: increase is positive cash flow, decrease is negative
                amount: ['income', 'credit'].includes(type) ? parsedAmount : -parsedAmount
              });
            }
            break;
            
          case 'equity':
          case 'Ekuitas': // Add support for Indonesian type
            // Equity transactions are financing activities
            financingActivities.push({
              ...cashFlowItem,
              // For equity: increase is positive cash flow, decrease is negative
              amount: ['income', 'credit'].includes(type) ? parsedAmount : -parsedAmount
            });
            break;
            
          case 'revenue':
            // Revenue is operating activity
            operatingActivities.push({
              ...cashFlowItem,
              amount: parsedAmount
            });
            break;
            
          case 'expense':
            // Expense is operating activity
            operatingActivities.push({
              ...cashFlowItem,
              amount: -parsedAmount
            });
            break;
            
          default:
            // Default to operating activities
            operatingActivities.push({
              ...cashFlowItem,
              amount: ['income', 'credit', 'REVENUE'].includes(type) ? parsedAmount : -parsedAmount
            });
        }
      }
    });
    
    // Process project billings (operating activities)
    billings.forEach(billing => {
      const { billingDate, amount, percentage, status, project } = billing;
      operatingActivities.push({
        date: billingDate,
        description: `Billing for project ${project.name} (${percentage}%)`,
        amount: parseFloat(amount),
        accountCode: null,
        accountName: 'Project Billing',
        project: { id: project.id, name: project.name }
      });
    });
    
    // Process project costs (operating activities)
    projectCosts.forEach(cost => {
      const { date, amount, category, description, project } = cost;
      operatingActivities.push({
        date: date,
        description: `${category}: ${description}`,
        amount: -parseFloat(amount),
        accountCode: null,
        accountName: 'Project Cost',
        project: { id: project.id, name: project.name }
      });
    });
    
    // Process fixed asset acquisitions (investing activities)
    fixedAssetTransactions.forEach(asset => {
      const { acquisitionDate, assetName, value } = asset;
      investingActivities.push({
        date: acquisitionDate,
        description: `Acquisition of ${assetName}`,
        amount: -parseFloat(value),
        accountCode: null,
        accountName: 'Fixed Asset',
        project: null
      });
    });
    
    // 7. Calculate totals
    const totalOperating = operatingActivities.reduce((sum, item) => sum + item.amount, 0);
    const totalInvesting = investingActivities.reduce((sum, item) => sum + item.amount, 0);
    const totalFinancing = financingActivities.reduce((sum, item) => sum + item.amount, 0);
    const netCashFlow = totalOperating + totalInvesting + totalFinancing;
    
    // 8. Group operating activities by type
    const operatingByType = {
      'Revenue': operatingActivities.filter(item => item.amount > 0),
      'Expenses': operatingActivities.filter(item => item.amount < 0)
    };
    
    // 9. Return formatted cash flow data
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
          netCashFlow
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
    
    if (!currentCashFlow.success || !previousCashFlow.success) {
      return {
        success: false,
        message: 'Failed to generate comparative cash flow',
        error: currentCashFlow.error || previousCashFlow.error
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