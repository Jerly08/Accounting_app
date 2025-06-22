/**
 * Balance Sheet Service
 * Service untuk menghasilkan laporan neraca keuangan
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Map Indonesian account types to standard types
 */
const accountTypeMap = {
  'Aktiva': 'asset',
  'Aset': 'asset',
  'Aset Tetap': 'asset',
  'Kontra Aset': 'asset', // This is a contra asset, but still an asset account
  'Kewajiban': 'liability',
  'Hutang': 'liability',
  'Ekuitas': 'equity',
  'Modal': 'equity',
  'Pendapatan': 'revenue',
  'Beban': 'expense'
};

/**
 * Menghasilkan data neraca keuangan pada tanggal tertentu
 * @param {string} date - Tanggal neraca (YYYY-MM-DD)
 * @returns {Promise<Object>} - Data neraca keuangan
 */
const generateBalanceSheet = async (date) => {
  try {
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(23, 59, 59, 999); // Set to end of day
    
    // 1. Get all accounts
    const accounts = await prisma.chartofaccount.findMany({
      orderBy: {
        code: 'asc'
      }
    });
    
    // 2. Get all transactions up to the report date
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          lte: reportDate
        }
      },
      include: {
        chartofaccount: true
      }
    });
    
    // 3. Get all fixed assets
    const fixedAssets = await prisma.fixedasset.findMany();
    
    // 4. Get all projects with WIP values
    const projects = await prisma.project.findMany({
      where: {
        startDate: {
          lte: reportDate
        }
      },
      include: {
        projectcost: {
          where: {
            date: {
              lte: reportDate
            }
          }
        },
        billing: {
          where: {
            billingDate: {
              lte: reportDate
            }
          }
        }
      }
    });
    
    // 5. Calculate account balances from transactions
    const accountBalances = {};
    accounts.forEach(account => {
      accountBalances[account.code] = {
        ...account,
        standardType: accountTypeMap[account.type] || account.type,
        balance: 0
      };
    });
    
    // Process transactions to calculate account balances
    transactions.forEach(transaction => {
      const { accountCode, type, amount } = transaction;
      const account = accountBalances[accountCode];
      
      if (account) {
        // Apply accounting rules based on account type and transaction type
        // For assets: Debit increases, Credit decreases
        // For liabilities and equity: Debit decreases, Credit increases
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(type);
        
        // Use standardized account type for determining accounting rules
        if (account.standardType === 'asset') {
          if (isDebitType) {
            account.balance += parseFloat(amount);
          } else if (isCreditType) {
            account.balance -= parseFloat(amount);
          }
        } else { // liability, equity, revenue, expense
          if (isDebitType) {
            account.balance -= parseFloat(amount);
          } else if (isCreditType) {
            account.balance += parseFloat(amount);
          }
        }
      }
    });
    
    // Special handling for contra asset accounts (they have negative balances)
    accounts.forEach(account => {
      if (account.type === 'Kontra Aset') {
        // Ensure contra assets have negative balances (they reduce the value of assets)
        if (accountBalances[account.code].balance > 0) {
          accountBalances[account.code].balance = -accountBalances[account.code].balance;
        }
      }
    });
    
    // 6. Add fixed assets to the balance sheet
    let totalFixedAssets = 0;
    const fixedAssetItems = fixedAssets.map(asset => {
      totalFixedAssets += parseFloat(asset.bookValue);
      return {
        id: asset.id,
        name: asset.assetName,
        category: asset.category,
        acquisitionDate: asset.acquisitionDate,
        originalValue: parseFloat(asset.value),
        accumulatedDepreciation: parseFloat(asset.accumulatedDepreciation),
        bookValue: parseFloat(asset.bookValue)
      };
    });
    
    // 7. Calculate WIP (Work In Progress) for ongoing projects
    let totalWIP = 0;
    let totalNegativeWIP = 0; // Track negative WIP separately (this is actually a liability)
    const wipItems = projects
      .filter(project => project.status === 'ongoing')
      .map(project => {
        // Calculate total costs
        const totalCosts = project.projectcost.reduce(
          (sum, cost) => sum + parseFloat(cost.amount), 0
        );
        
        // Calculate total billed
        const totalBilled = project.billing.reduce(
          (sum, billing) => sum + parseFloat(billing.amount), 0
        );
        
        // WIP value = costs - billings
        const wipValue = totalCosts - totalBilled;
        
        // Handle positive and negative WIP separately
        if (wipValue > 0) {
          totalWIP += wipValue;
        } else {
          totalNegativeWIP += Math.abs(wipValue); // Store as positive for liabilities
        }
        
        return {
          id: project.id,
          projectCode: project.projectCode,
          name: project.name,
          costs: totalCosts,
          billed: totalBilled,
          wipValue: wipValue
        };
      });
    
    // 8. Group accounts by standardized type and current/non-current status
    // Filter out fixed asset accounts (15xx) to avoid duplication with fixedasset table
    // Also filter out WIP account (1301) to avoid duplication with calculated WIP
    // Also filter out contra asset accounts (16xx) to handle them separately
    const assetAccountsWithoutFixedAssetsAndWIP = Object.values(accountBalances)
      .filter(account => 
        account.standardType === 'asset' && 
        !account.code.startsWith('15') && 
        !account.code.startsWith('16') && 
        account.code !== '1301'
      );
    
    // Handle contra asset accounts separately
    const contraAssetAccounts = Object.values(accountBalances)
      .filter(account => account.code.startsWith('16'));
    
    // Calculate total contra assets
    const totalContraAssets = contraAssetAccounts.reduce(
      (sum, account) => sum + account.balance, 0
    );
    
    // Group assets by current/non-current and then by category/subcategory
    const currentAssets = assetAccountsWithoutFixedAssetsAndWIP
      .filter(asset => asset.isCurrentAsset === true || asset.isCurrentAsset === null)
      .reduce((acc, asset) => {
        const category = asset.category || 'Other Current Assets';
        const subcategory = asset.subcategory || 'General';
        
        if (!acc[category]) {
          acc[category] = {};
        }
        
        if (!acc[category][subcategory]) {
          acc[category][subcategory] = [];
        }
        
        acc[category][subcategory].push(asset);
        return acc;
      }, {});
    
    const nonCurrentAssets = assetAccountsWithoutFixedAssetsAndWIP
      .filter(asset => asset.isCurrentAsset === false)
      .reduce((acc, asset) => {
        const category = asset.category || 'Other Non-Current Assets';
        const subcategory = asset.subcategory || 'General';
        
        if (!acc[category]) {
          acc[category] = {};
        }
        
        if (!acc[category][subcategory]) {
          acc[category][subcategory] = [];
        }
        
        acc[category][subcategory].push(asset);
        return acc;
      }, {});
    
    // Add contra assets to the assets object
    if (contraAssetAccounts.length > 0) {
      if (!nonCurrentAssets['Accumulated Depreciation']) {
        nonCurrentAssets['Accumulated Depreciation'] = {};
      }
      nonCurrentAssets['Accumulated Depreciation']['General'] = contraAssetAccounts;
    }
    
    // Add negative WIP as a liability (Advance from customers)
    const liabilityAccounts = Object.values(accountBalances)
      .filter(account => account.standardType === 'liability');
    
    // Create a special account for negative WIP if it exists
    if (totalNegativeWIP > 0) {
      liabilityAccounts.push({
        code: 'WIP-NEG',
        name: 'Advance from Customers (Negative WIP)',
        type: 'Kewajiban',
        standardType: 'liability',
        category: 'Current Liabilities',
        subcategory: 'Customer Advances',
        isCurrentLiability: true,
        balance: totalNegativeWIP
      });
    }
    
    // Group liabilities by current/non-current and then by category/subcategory
    const currentLiabilities = liabilityAccounts
      .filter(liability => liability.isCurrentLiability === true || liability.isCurrentLiability === null)
      .reduce((acc, liability) => {
        const category = liability.category || 'Other Current Liabilities';
        const subcategory = liability.subcategory || 'General';
        
        if (!acc[category]) {
          acc[category] = {};
        }
        
        if (!acc[category][subcategory]) {
          acc[category][subcategory] = [];
        }
        
        acc[category][subcategory].push(liability);
        return acc;
      }, {});
    
    const nonCurrentLiabilities = liabilityAccounts
      .filter(liability => liability.isCurrentLiability === false)
      .reduce((acc, liability) => {
        const category = liability.category || 'Other Non-Current Liabilities';
        const subcategory = liability.subcategory || 'General';
        
        if (!acc[category]) {
          acc[category] = {};
        }
        
        if (!acc[category][subcategory]) {
          acc[category][subcategory] = [];
        }
        
        acc[category][subcategory].push(liability);
        return acc;
      }, {});
    
    // Group equity accounts by category/subcategory
    const equityByCategory = Object.values(accountBalances)
      .filter(account => account.standardType === 'equity')
      .reduce((acc, equity) => {
        const category = equity.category || 'Equity';
        const subcategory = equity.subcategory || 'General';
        
        if (!acc[category]) {
          acc[category] = {};
        }
        
        if (!acc[category][subcategory]) {
          acc[category][subcategory] = [];
        }
        
        acc[category][subcategory].push(equity);
        return acc;
      }, {});
    
    // 9. Calculate totals
    const totalAccountAssets = assetAccountsWithoutFixedAssetsAndWIP.reduce(
      (sum, asset) => sum + asset.balance, 0
    );
    
    // Calculate total liabilities
    const totalLiabilities = liabilityAccounts.reduce(
      (sum, liability) => sum + liability.balance, 0
    );
    
    // Calculate total equity
    const totalEquity = Object.keys(equityByCategory).reduce((sum, categoryKey) => {
      const category = equityByCategory[categoryKey];
      return sum + Object.values(category).reduce((catSum, subcategory) => {
        return catSum + subcategory.reduce((subSum, account) => subSum + account.balance, 0);
      }, 0);
    }, 0);
    
    // Calculate net income (revenue - expense) and add to equity
    const totalRevenue = Object.values(accountBalances)
      .filter(account => account.standardType === 'revenue')
      .reduce((sum, rev) => sum + rev.balance, 0);
    const totalExpense = Object.values(accountBalances)
      .filter(account => account.standardType === 'expense')
      .reduce((sum, exp) => sum + exp.balance, 0);
    const netIncome = totalRevenue - totalExpense;
    
    // Add WIP and Fixed Assets to total assets, and include contra assets
    const totalAssets = totalAccountAssets + totalFixedAssets + totalWIP + totalContraAssets;
    
    // Add net income to equity for balance sheet equation
    const totalEquityWithIncome = totalEquity + netIncome;
    
    // Calculate total liabilities and equity
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquityWithIncome;
    
    // Calculate difference for debugging
    const difference = totalAssets - totalLiabilitiesAndEquity;
    
    // Calculate debug information internally but don't include in response
    const debugInfo = {
      totalAccountAssets,
      totalFixedAssets,
      totalWIP,
      totalContraAssets,
      totalLiabilities,
      totalEquity,
      netIncome,
      totalEquityWithIncome,
      totalLiabilitiesAndEquity,
      difference,
      fixedAssetAccountsTotal: Object.values(accountBalances)
        .filter(account => account.code.startsWith('15'))
        .reduce((sum, account) => sum + account.balance, 0),
      wipAccountBalance: Object.values(accountBalances)
        .find(account => account.code === '1301')?.balance || 0,
      contraAssetDetails: contraAssetAccounts.map(account => ({
        code: account.code,
        name: account.name,
        balance: account.balance
      }))
    };
    
    // Log debug information to server console if needed
    if (Math.abs(difference) > 0.01) {
      console.log('Balance Sheet Debug Information:', JSON.stringify(debugInfo, null, 2));
    }
    
    // 10. Return formatted balance sheet data without debug info
    return {
      success: true,
      data: {
        date: reportDate.toISOString().split('T')[0],
        assets: {
          current: currentAssets,
          nonCurrent: nonCurrentAssets,
          'Fixed Assets': fixedAssetItems,
          'Work In Progress': wipItems.filter(item => item.wipValue > 0) // Only positive WIP as asset
        },
        liabilities: {
          current: currentLiabilities,
          nonCurrent: nonCurrentLiabilities
        },
        equity: equityByCategory,
        summary: {
          totalAssets,
          totalCurrentAssets: Object.values(currentAssets).reduce((sum, category) => {
            return sum + Object.values(category).reduce((catSum, subcategory) => {
              return catSum + subcategory.reduce((subSum, account) => subSum + account.balance, 0);
            }, 0);
          }, 0),
          totalNonCurrentAssets: Object.values(nonCurrentAssets).reduce((sum, category) => {
            return sum + Object.values(category).reduce((catSum, subcategory) => {
              return catSum + subcategory.reduce((subSum, account) => subSum + account.balance, 0);
            }, 0);
          }, 0),
          totalAccountAssets,
          totalFixedAssets,
          totalWIP,
          totalContraAssets,
          totalNegativeWIP,
          totalCurrentLiabilities: Object.values(currentLiabilities).reduce((sum, category) => {
            return sum + Object.values(category).reduce((catSum, subcategory) => {
              return catSum + subcategory.reduce((subSum, account) => subSum + account.balance, 0);
            }, 0);
          }, 0),
          totalNonCurrentLiabilities: Object.values(nonCurrentLiabilities).reduce((sum, category) => {
            return sum + Object.values(category).reduce((catSum, subcategory) => {
              return catSum + subcategory.reduce((subSum, account) => subSum + account.balance, 0);
            }, 0);
          }, 0),
          totalLiabilities,
          totalEquity,
          netIncome,
          totalEquityWithIncome,
          totalLiabilitiesAndEquity,
          difference,
          isBalanced: Math.abs(difference) < 0.01 // True if difference is negligible
        }
      }
    };
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    return {
      success: false,
      message: 'Failed to generate balance sheet',
      error: error.message
    };
  }
};

/**
 * Menghasilkan data neraca komparatif untuk dua periode
 * @param {string} currentDate - Tanggal neraca saat ini (YYYY-MM-DD)
 * @param {string} previousDate - Tanggal neraca pembanding (YYYY-MM-DD)
 * @returns {Promise<Object>} - Data neraca komparatif
 */
const generateComparativeBalanceSheet = async (currentDate, previousDate) => {
  try {
    // Generate balance sheets for both dates
    const currentBalanceSheet = await generateBalanceSheet(currentDate);
    const previousBalanceSheet = await generateBalanceSheet(previousDate);
    
    if (!currentBalanceSheet.success || !previousBalanceSheet.success) {
      return {
        success: false,
        message: 'Failed to generate comparative balance sheet',
        error: currentBalanceSheet.error || previousBalanceSheet.error
      };
    }
    
    // Calculate changes and percentages
    const current = currentBalanceSheet.data.summary;
    const previous = previousBalanceSheet.data.summary;
    
    const changes = {
      totalAssets: current.totalAssets - previous.totalAssets,
      totalLiabilities: current.totalLiabilities - previous.totalLiabilities,
      totalEquity: current.totalEquity - previous.totalEquity,
      netIncome: current.netIncome - previous.netIncome,
      totalEquityWithIncome: current.totalEquityWithIncome - previous.totalEquityWithIncome
    };
    
    const percentChanges = {
      totalAssets: previous.totalAssets !== 0 ? 
        ((current.totalAssets - previous.totalAssets) / previous.totalAssets) * 100 : 0,
      totalLiabilities: previous.totalLiabilities !== 0 ?
        ((current.totalLiabilities - previous.totalLiabilities) / previous.totalLiabilities) * 100 : 0,
      totalEquity: previous.totalEquity !== 0 ?
        ((current.totalEquity - previous.totalEquity) / previous.totalEquity) * 100 : 0,
      netIncome: previous.netIncome !== 0 ?
        ((current.netIncome - previous.netIncome) / previous.netIncome) * 100 : 0,
      totalEquityWithIncome: previous.totalEquityWithIncome !== 0 ?
        ((current.totalEquityWithIncome - previous.totalEquityWithIncome) / previous.totalEquityWithIncome) * 100 : 0
    };
    
    return {
      success: true,
      data: {
        currentDate: currentBalanceSheet.data.date,
        previousDate: previousBalanceSheet.data.date,
        current: currentBalanceSheet.data,
        previous: previousBalanceSheet.data,
        changes,
        percentChanges,
        summary: {
          ...current,
          changes,
          percentChanges
        }
      }
    };
  } catch (error) {
    console.error('Error generating comparative balance sheet:', error);
    return {
      success: false,
      message: 'Failed to generate comparative balance sheet',
      error: error.message
    };
  }
};

module.exports = {
  generateBalanceSheet,
  generateComparativeBalanceSheet
}; 