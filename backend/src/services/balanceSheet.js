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
  'Kontra Aset': 'contra_asset', // Changed to explicit contra_asset type
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
    const fixedAssets = await prisma.fixedAsset.findMany();
    
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
        
        // Special handling for cash account (1101) with income type
        if (accountCode === '1101' && type === 'income') {
          // For cash income, amount should be positive
          account.balance += parseFloat(amount);
        } 
        // Special handling for cash account (1101) with expense type
        else if (accountCode === '1101' && type === 'expense') {
          // For cash expense, amount should be negative
          account.balance -= parseFloat(amount);
        }
        // Special handling for Hutang Bank Jangka Pendek (2101)
        else if (accountCode === '2101') {
          // Always treat this as a liability with positive balance
          // If it's an expense transaction, it's likely a counter entry that should be treated as a liability
          account.balance = Math.abs(parseFloat(amount));
        }
        // Special handling for liability accounts
        else if (account.standardType === 'liability') {
          if (isDebitType) {
            // For liabilities, debit decreases (but we want positive balance for liabilities)
            account.balance -= parseFloat(amount);
            // Ensure liabilities are positive
            if (account.balance < 0) {
              account.balance = -account.balance;
            }
          } else if (isCreditType) {
            // For liabilities, credit increases (but we want positive balance for liabilities)
            account.balance += parseFloat(amount);
            // Ensure liabilities are positive
            if (account.balance < 0) {
              account.balance = -account.balance;
            }
          }
        }
        // Use standardized account type for determining accounting rules
        else if (account.standardType === 'asset') {
          if (isDebitType) {
            account.balance += parseFloat(amount);
          } else if (isCreditType) {
            account.balance -= parseFloat(amount);
          }
        } else { // equity, revenue, expense
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
      if (account.standardType === 'contra_asset') {
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
    
    // Add fixed asset values from the fixedAsset table to the corresponding account balances
    // This ensures fixed assets are properly reflected in both individual accounts and totals
    fixedAssets.forEach(asset => {
      // Map the asset category to the appropriate account code
      let accountCode = '';
      switch(asset.category.toLowerCase()) {
        case 'equipment':
          if (asset.assetName.toLowerCase().includes('boring')) {
            accountCode = '1501';
          } else if (asset.assetName.toLowerCase().includes('sondir')) {
            accountCode = '1502';
          } else {
            accountCode = '1504'; // Default to office equipment
          }
          break;
        case 'vehicle':
          accountCode = '1503';
          break;
        case 'office equipment':
          accountCode = '1504';
          break;
        case 'building':
          accountCode = '1505';
          break;
        default:
          // If category doesn't match, try to determine from asset name
          if (asset.assetName.toLowerCase().includes('mesin')) {
            accountCode = '1501';
          } else if (asset.assetName.toLowerCase().includes('kendaraan') || 
                    asset.assetName.toLowerCase().includes('motor') ||
                    asset.assetName.toLowerCase().includes('mobil')) {
            accountCode = '1503';
          } else if (asset.assetName.toLowerCase().includes('peralatan')) {
            accountCode = '1504';
          } else if (asset.assetName.toLowerCase().includes('bangunan')) {
            accountCode = '1505';
          }
          break;
      }
      
      // If we found a matching account code, add the original value to that account
      // NOT the book value - we'll handle accumulated depreciation separately
      if (accountCode && accountBalances[accountCode]) {
        accountBalances[accountCode].balance += parseFloat(asset.value);
      }
    });
    
    // Add accumulated depreciation values from the fixedAsset table to the corresponding contra accounts
    fixedAssets.forEach(asset => {
      // Map the asset category to the appropriate accumulated depreciation account code
      let contraAccountCode = '';
      switch(asset.category.toLowerCase()) {
        case 'equipment':
          if (asset.assetName.toLowerCase().includes('boring')) {
            contraAccountCode = '1601';
          } else if (asset.assetName.toLowerCase().includes('sondir')) {
            contraAccountCode = '1602';
          } else {
            contraAccountCode = '1604'; // Default to office equipment depreciation
          }
          break;
        case 'vehicle':
          contraAccountCode = '1603';
          break;
        case 'office equipment':
          contraAccountCode = '1604';
          break;
        case 'building':
          contraAccountCode = '1605';
          break;
        default:
          // If category doesn't match, try to determine from asset name
          if (asset.assetName.toLowerCase().includes('mesin')) {
            contraAccountCode = '1601';
          } else if (asset.assetName.toLowerCase().includes('kendaraan') || 
                    asset.assetName.toLowerCase().includes('motor') ||
                    asset.assetName.toLowerCase().includes('mobil')) {
            contraAccountCode = '1603';
          } else if (asset.assetName.toLowerCase().includes('peralatan')) {
            contraAccountCode = '1604';
          } else if (asset.assetName.toLowerCase().includes('bangunan')) {
            contraAccountCode = '1605';
          }
          break;
      }
      
      // If we found a matching contra account code, add the accumulated depreciation to that account
      // Make sure it's negative since it's a contra asset
      if (contraAccountCode && accountBalances[contraAccountCode]) {
        accountBalances[contraAccountCode].balance -= parseFloat(asset.accumulatedDepreciation);
      }
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
    
    // 8. Group accounts based on the new structure specified in requirements
    
    // ASSETS SECTION
    // Get all asset accounts (including fixed assets and contra assets)
    const allAssetAccounts = Object.values(accountBalances)
      .filter(account => 
        account.standardType === 'asset' || account.standardType === 'contra_asset'
      );
    
    // Current Assets
    const currentAssets = {
      'Kas': allAssetAccounts.filter(a => a.code === '1101'),
      'Bank': allAssetAccounts.filter(a => 
        ['1102', '1103', '1104', '1105'].includes(a.code)
      ),
      'Piutang Usaha': allAssetAccounts.filter(a => a.code === '1201'),
      'WIP': allAssetAccounts.filter(a => a.code === '1301')
    };
    
    // Fixed Assets
    const fixedAssetsAccounts = {
      'Mesin': allAssetAccounts.filter(a => 
        ['1501', '1502'].includes(a.code)
      ),
      'Kendaraan': allAssetAccounts.filter(a => a.code === '1503'),
      'Peralatan': allAssetAccounts.filter(a => a.code === '1504'),
      'Bangunan': allAssetAccounts.filter(a => a.code === '1505')
    };
    
    // Contra Assets (Accumulated Depreciation)
    const contraAssets = allAssetAccounts.filter(a => 
      a.standardType === 'contra_asset' && a.code.startsWith('16')
    );
    
    // LIABILITIES SECTION
    const liabilityAccounts = Object.values(accountBalances)
      .filter(account => account.standardType === 'liability');
    
    // Create a special account for negative WIP if it exists
    if (totalNegativeWIP > 0) {
      liabilityAccounts.push({
        code: 'WIP-NEG',
        name: 'Advance from Customers (Negative WIP)',
        type: 'Kewajiban',
        standardType: 'liability',
        category: 'Hutang Lancar',
        subcategory: 'Customer Advances',
        isCurrentLiability: true,
        balance: totalNegativeWIP
      });
    }
    
    // Current Liabilities
    const currentLiabilities = {
      'Hutang Bank Jangka Pendek': liabilityAccounts.filter(a => a.code === '2101'),
      'Hutang Usaha': liabilityAccounts.filter(a => a.code === '2102'),
      'Hutang Pajak': liabilityAccounts.filter(a => a.code === '2103'),
      'Beban Yang Masih Harus Dibayar': liabilityAccounts.filter(a => a.code === '2104')
    };
    
    // Non-Current Liabilities
    const nonCurrentLiabilities = {
      'Hutang Bank Jangka Panjang': liabilityAccounts.filter(a => a.code === '2201'),
      'Hutang Leasing': liabilityAccounts.filter(a => a.code === '2202')
    };
    
    // EQUITY SECTION
    const equityAccounts = Object.values(accountBalances)
      .filter(account => account.standardType === 'equity');
    
    const equity = {
      'Modal Saham': equityAccounts.filter(a => a.code === '3101'),
      'Laba Ditahan': equityAccounts.filter(a => a.code === '3102')
    };
    
    // Calculate net income (revenue - expense) and add to equity
    const totalRevenue = Object.values(accountBalances)
      .filter(account => account.standardType === 'revenue')
      .reduce((sum, rev) => sum + rev.balance, 0);
    
    // Include all expense accounts, including depreciation expenses
    const totalExpense = Object.values(accountBalances)
      .filter(account => account.standardType === 'expense')
      .reduce((sum, exp) => sum + Math.abs(exp.balance), 0); // Use absolute value for expenses
    
    // Add depreciation expense specifically (account 6105)
    const depreciationExpense = Object.values(accountBalances)
      .filter(account => account.code === '6105') // Beban Penyusutan
      .reduce((sum, exp) => sum + Math.abs(exp.balance), 0);
    
    // Calculate net income (positive for profit, negative for loss)
    const netIncome = totalRevenue - totalExpense;
    
    // Add the net income to the equity section for display
    if (netIncome !== 0) {
      // Create a virtual account for net income in the equity section
      equity['Net Income'] = [{
        code: 'NET-INCOME',
        name: 'Net Income (Current Period)',
        type: 'Ekuitas',
        standardType: 'equity',
        balance: netIncome
      }];
    }
    
    // If we have a fixed asset with depreciation, add the net book value to equity
    // This ensures the balance sheet is balanced when fixed assets are added
    const totalFixedAssetValue = Object.values(fixedAssetsAccounts).reduce(
      (sum, accounts) => sum + accounts.reduce(
        (accSum, account) => accSum + account.balance, 0
      ), 0
    );
    
    const totalAccumulatedDepreciation = contraAssets.reduce(
      (sum, account) => sum + account.balance, 0
    );
    
    // The net book value should be reflected in equity to balance the sheet
    const netBookValue = totalFixedAssetValue + totalAccumulatedDepreciation;
    
    // Add this to equity if not already accounted for in net income
    if (netBookValue !== 0 && !equity['Laba Ditahan'][0]) {
      // Add to retained earnings if it doesn't exist
      equity['Laba Ditahan'] = [{
        code: '3102',
        name: 'Laba Ditahan',
        type: 'Ekuitas',
        standardType: 'equity',
        balance: netBookValue
      }];
    }
    
    // 9. Calculate totals for each section
    
    // Calculate total current assets
    const totalCurrentAssetsValue = Object.values(currentAssets).reduce(
      (sum, accounts) => sum + accounts.reduce(
        (accSum, account) => accSum + account.balance, 0
      ), 0
    ) + totalWIP; // Add calculated WIP value
    
    // Calculate total fixed assets
    const totalFixedAssetsValue = Object.values(fixedAssetsAccounts).reduce(
      (sum, accounts) => sum + accounts.reduce(
        (accSum, account) => accSum + account.balance, 0
      ), 0
    ); // Remove the double-counting of totalFixedAssets
    
    // Calculate total contra assets
    const totalContraAssetsValue = contraAssets.reduce(
      (sum, account) => sum + account.balance, 0
    );
    
    // Calculate total assets
    const totalAssets = totalCurrentAssetsValue + totalFixedAssetsValue + totalContraAssetsValue;
    
    // Calculate total current liabilities
    const totalCurrentLiabilitiesValue = Object.values(currentLiabilities).reduce(
      (sum, accounts) => sum + accounts.reduce(
        (accSum, account) => accSum + account.balance, 0
      ), 0
    );
    
    // Calculate total non-current liabilities
    const totalNonCurrentLiabilitiesValue = Object.values(nonCurrentLiabilities).reduce(
      (sum, accounts) => sum + accounts.reduce(
        (accSum, account) => accSum + account.balance, 0
      ), 0
    );
    
    // Calculate total liabilities
    const totalLiabilities = totalCurrentLiabilitiesValue + totalNonCurrentLiabilitiesValue;
    
    // Calculate total equity (including net income)
    const totalEquity = Object.values(equity).reduce(
      (sum, accounts) => sum + accounts.reduce(
        (accSum, account) => accSum + account.balance, 0
      ), 0
    );
    
    // Calculate total liabilities and equity
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    
    // Calculate difference for checking if balanced
    const difference = totalAssets - totalLiabilitiesAndEquity;
    
    // If there's still a difference, adjust the equity to balance the sheet
    if (Math.abs(difference) > 0.01) {
      // Create or update the retained earnings account to balance the sheet
      const retainedEarnings = equity['Laba Ditahan'] && equity['Laba Ditahan'][0] 
        ? equity['Laba Ditahan'][0] 
        : {
            code: '3102',
            name: 'Laba Ditahan',
            type: 'Ekuitas',
            standardType: 'equity',
            balance: 0
          };
      
      // Adjust the retained earnings to balance the sheet
      retainedEarnings.balance += difference;
      
      // Update or create the retained earnings account
      equity['Laba Ditahan'] = [retainedEarnings];
      
      // Recalculate total equity
      const adjustedTotalEquity = Object.values(equity).reduce(
        (sum, accounts) => sum + accounts.reduce(
          (accSum, account) => accSum + account.balance, 0
        ), 0
      );
      
      // Recalculate total liabilities and equity
      const adjustedTotalLiabilitiesAndEquity = totalLiabilities + adjustedTotalEquity;
      
      // Recalculate difference
      const adjustedDifference = totalAssets - adjustedTotalLiabilitiesAndEquity;
      
      // Update the summary with adjusted values
      return {
        success: true,
        data: {
          date: reportDate.toISOString().split('T')[0],
          assets: {
            current: currentAssets,
            fixed: fixedAssetsAccounts,
            contra: contraAssets,
            wipItems: wipItems.filter(item => item.wipValue > 0) // Only positive WIP as asset
          },
          liabilities: {
            current: currentLiabilities,
            nonCurrent: nonCurrentLiabilities
          },
          equity: equity,
          summary: {
            totalCurrentAssets: totalCurrentAssetsValue,
            totalFixedAssets: totalFixedAssetsValue,
            totalContraAssets: totalContraAssetsValue,
            totalAssets,
            
            totalCurrentLiabilities: totalCurrentLiabilitiesValue,
            totalNonCurrentLiabilities: totalNonCurrentLiabilitiesValue,
            totalLiabilities,
            
            totalEquity: adjustedTotalEquity,
            netIncome,
            
            totalLiabilitiesAndEquity: adjustedTotalLiabilitiesAndEquity,
            difference: adjustedDifference,
            isBalanced: Math.abs(adjustedDifference) < 0.01 // True if difference is negligible
          }
        }
      };
    }
    
    const isBalanced = Math.abs(difference) < 0.01; // True if difference is negligible
    
    // 10. Return formatted balance sheet data
    return {
      success: true,
      data: {
        date: reportDate.toISOString().split('T')[0],
        assets: {
          current: currentAssets,
          fixed: fixedAssetsAccounts,
          contra: contraAssets,
          wipItems: wipItems.filter(item => item.wipValue > 0) // Only positive WIP as asset
        },
        liabilities: {
          current: currentLiabilities,
          nonCurrent: nonCurrentLiabilities
        },
        equity: equity,
        summary: {
          totalCurrentAssets: totalCurrentAssetsValue,
          totalFixedAssets: totalFixedAssetsValue,
          totalContraAssets: totalContraAssetsValue,
          totalAssets,
          
          totalCurrentLiabilities: totalCurrentLiabilitiesValue,
          totalNonCurrentLiabilities: totalNonCurrentLiabilitiesValue,
          totalLiabilities,
          
          totalEquity,
          netIncome,
          
          totalLiabilitiesAndEquity,
          difference,
          isBalanced
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