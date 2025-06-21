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
    
    // 8. Group accounts by standardized type
    // Filter out fixed asset accounts (15xx) to avoid duplication with fixedasset table
    const assetAccountsWithoutFixedAssets = Object.values(accountBalances)
      .filter(account => account.standardType === 'asset' && !account.code.startsWith('15'));
    
    const assets = assetAccountsWithoutFixedAssets.reduce((acc, asset) => {
      const category = asset.category || 'Other Assets';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(asset);
      return acc;
    }, {});
    
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
        balance: totalNegativeWIP
      });
    }
    
    const liabilities = liabilityAccounts.reduce((acc, liability) => {
      const category = liability.category || 'Other Liabilities';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(liability);
      return acc;
    }, {});
    
    // Filter equity accounts by standardized type
    const equity = Object.values(accountBalances)
      .filter(account => account.standardType === 'equity');
    
    // Get revenue and expense accounts for net income calculation
    const revenue = Object.values(accountBalances)
      .filter(account => account.standardType === 'revenue');
    
    const expense = Object.values(accountBalances)
      .filter(account => account.standardType === 'expense');
    
    // 9. Calculate totals
    const totalAccountAssets = assetAccountsWithoutFixedAssets.reduce(
      (sum, asset) => sum + asset.balance, 0
    );
    
    const totalLiabilities = liabilityAccounts.reduce(
      (sum, liability) => sum + liability.balance, 0
    );
    
    const totalEquity = equity.reduce((sum, eq) => sum + eq.balance, 0);
    
    // Calculate net income (revenue - expense) and add to equity
    const totalRevenue = revenue.reduce((sum, rev) => sum + rev.balance, 0);
    const totalExpense = expense.reduce((sum, exp) => sum + exp.balance, 0);
    const netIncome = totalRevenue - totalExpense;
    
    // Add WIP and Fixed Assets to total assets
    const totalAssets = totalAccountAssets + totalFixedAssets + totalWIP;
    
    // Add net income to equity for balance sheet equation
    const totalEquityWithIncome = totalEquity + netIncome;
    
    // Calculate total liabilities and equity
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquityWithIncome;
    
    // 10. Return formatted balance sheet data
    return {
      success: true,
      data: {
        date: reportDate.toISOString().split('T')[0],
        assets: {
          ...assets,
          'Fixed Assets': fixedAssetItems,
          'Work In Progress': wipItems.filter(item => item.wipValue > 0) // Only positive WIP as asset
        },
        liabilities,
        equity,
        summary: {
          totalAssets,
          totalAccountAssets,
          totalFixedAssets,
          totalWIP,
          totalNegativeWIP,
          totalLiabilities,
          totalEquity,
          netIncome,
          totalEquityWithIncome,
          totalLiabilitiesAndEquity,
          isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01
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