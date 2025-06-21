/**
 * Balance Sheet Service
 * Service untuk menghasilkan laporan neraca keuangan
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
        balance: 0
      };
    });
    
    // Process transactions to calculate account balances
    transactions.forEach(transaction => {
      const { accountCode, type, amount } = transaction;
      const account = accounts.find(a => a.code === accountCode);
      
      if (account) {
        // Apply accounting rules based on account type and transaction type
        // For assets: Debit increases, Credit decreases
        // For liabilities and equity: Debit decreases, Credit increases
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(type);
        
        if (account.type === 'Aset' || account.type === 'asset') {
          if (isDebitType) {
            accountBalances[accountCode].balance += parseFloat(amount);
          } else if (isCreditType) {
            accountBalances[accountCode].balance -= parseFloat(amount);
          }
        } else { // liability or equity (Kewajiban atau Ekuitas)
          if (isDebitType) {
            accountBalances[accountCode].balance -= parseFloat(amount);
          } else if (isCreditType) {
            accountBalances[accountCode].balance += parseFloat(amount);
          }
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
        
        // WIP value = costs - billings (if positive)
        const wipValue = Math.max(0, totalCosts - totalBilled);
        totalWIP += wipValue;
        
        return {
          id: project.id,
          projectCode: project.projectCode,
          name: project.name,
          costs: totalCosts,
          billed: totalBilled,
          wipValue: wipValue
        };
      })
      .filter(item => item.wipValue > 0); // Only include positive WIP
    
    // 8. Group accounts by type and category
    const assets = Object.values(accountBalances)
      .filter(account => account.type === 'Aset' || account.type === 'asset')
      .reduce((acc, asset) => {
        const category = asset.category || 'Other Assets';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(asset);
        return acc;
      }, {});
    
    const liabilities = Object.values(accountBalances)
      .filter(account => account.type === 'Kewajiban' || account.type === 'liability')
      .reduce((acc, liability) => {
        const category = liability.category || 'Other Liabilities';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(liability);
        return acc;
      }, {});
    
    const equity = Object.values(accountBalances)
      .filter(account => account.type === 'Ekuitas' || account.type === 'equity');
    
    // 9. Calculate totals
    const totalAccountAssets = Object.values(assets)
      .flat()
      .reduce((sum, asset) => sum + asset.balance, 0);
    
    const totalLiabilities = Object.values(liabilities)
      .flat()
      .reduce((sum, liability) => sum + liability.balance, 0);
    
    const totalEquity = equity.reduce((sum, eq) => sum + eq.balance, 0);
    
    // Add WIP and Fixed Assets to total assets
    const totalAssets = totalAccountAssets + totalFixedAssets + totalWIP;
    
    // 10. Return formatted balance sheet data
    return {
      success: true,
      data: {
        date: reportDate.toISOString().split('T')[0],
        assets: {
          ...assets,
          'Fixed Assets': fixedAssetItems,
          'Work In Progress': wipItems.length > 0 ? wipItems : undefined
        },
        liabilities,
        equity,
        summary: {
          totalAssets,
          totalAccountAssets,
          totalFixedAssets,
          totalWIP,
          totalLiabilities,
          totalEquity,
          isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
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
      totalEquity: current.totalEquity - previous.totalEquity
    };
    
    const percentChanges = {
      totalAssets: previous.totalAssets !== 0 ? 
        ((current.totalAssets - previous.totalAssets) / previous.totalAssets) * 100 : 0,
      totalLiabilities: previous.totalLiabilities !== 0 ?
        ((current.totalLiabilities - previous.totalLiabilities) / previous.totalLiabilities) * 100 : 0,
      totalEquity: previous.totalEquity !== 0 ?
        ((current.totalEquity - previous.totalEquity) / previous.totalEquity) * 100 : 0
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