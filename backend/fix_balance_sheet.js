/**
 * Script untuk memeriksa dan memperbaiki masalah pada Balance Sheet
 * Fokus pada WIP dan Aset Tetap
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('===== BALANCE SHEET DIAGNOSTIC TOOL =====');
    
    // 1. Periksa akun WIP (1301)
    console.log('\n1. Checking WIP Account (1301)...');
    const wipAccount = await prisma.chartofaccount.findUnique({
      where: { code: '1301' }
    });
    
    if (!wipAccount) {
      console.log('WIP Account (1301) not found!');
    } else {
      console.log(`WIP Account found: ${wipAccount.code} - ${wipAccount.name}`);
      
      // Get transactions for WIP account
      const wipTransactions = await prisma.transaction.findMany({
        where: { accountCode: '1301' },
        orderBy: { date: 'asc' }
      });
      
      console.log(`Found ${wipTransactions.length} transactions for WIP account`);
      
      let wipBalance = 0;
      wipTransactions.forEach(tx => {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          wipBalance += parseFloat(tx.amount);
        } else if (isCreditType) {
          wipBalance -= parseFloat(tx.amount);
        }
        
        console.log(`${tx.date.toISOString().split('T')[0]} | ${tx.type} | ${tx.amount} | Balance: ${wipBalance}`);
      });
      
      console.log(`Current WIP account balance: ${wipBalance}`);
    }
    
    // 2. Periksa proyek dengan WIP negatif
    console.log('\n2. Checking Projects with negative WIP...');
    const projects = await prisma.project.findMany({
      include: {
        projectcost: true,
        billing: true
      }
    });
    
    projects.forEach(project => {
      const totalCosts = project.projectcost.reduce(
        (sum, cost) => sum + parseFloat(cost.amount), 0
      );
      
      const totalBilled = project.billing.reduce(
        (sum, billing) => sum + parseFloat(billing.amount), 0
      );
      
      const wipValue = totalCosts - totalBilled;
      
      console.log(`Project: ${project.projectCode} - ${project.name}`);
      console.log(`  Total Costs: ${totalCosts}`);
      console.log(`  Total Billed: ${totalBilled}`);
      console.log(`  WIP Value: ${wipValue}`);
      
      if (wipValue < 0) {
        console.log(`  WARNING: Negative WIP detected (${wipValue})`);
      }
    });
    
    // 3. Periksa aset tetap
    console.log('\n3. Checking Fixed Assets...');
    
    // Get fixed asset accounts (15xx)
    const fixedAssetAccounts = await prisma.chartofaccount.findMany({
      where: {
        code: {
          startsWith: '15'
        }
      }
    });
    
    console.log(`Found ${fixedAssetAccounts.length} fixed asset accounts`);
    
    // Get transactions for fixed asset accounts
    let fixedAssetAccountsTotal = 0;
    for (const account of fixedAssetAccounts) {
      const transactions = await prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      transactions.forEach(tx => {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance += parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance -= parseFloat(tx.amount);
        }
      });
      
      fixedAssetAccountsTotal += accountBalance;
      console.log(`${account.code} - ${account.name}: ${accountBalance}`);
    }
    
    console.log(`Total fixed asset accounts balance: ${fixedAssetAccountsTotal}`);
    
    // Get fixed assets from fixedasset table
    const fixedAssets = await prisma.fixedasset.findMany();
    const fixedAssetsTotal = fixedAssets.reduce(
      (sum, asset) => sum + parseFloat(asset.bookValue), 0
    );
    
    console.log(`Fixed assets from fixedasset table: ${fixedAssetsTotal}`);
    console.log(`Difference: ${fixedAssetAccountsTotal - fixedAssetsTotal}`);
    
    // 4. Periksa akun kontra aset
    console.log('\n4. Checking Contra Asset Accounts...');
    const contraAssetAccounts = await prisma.chartofaccount.findMany({
      where: { type: 'Kontra Aset' }
    });
    
    let totalContraAssets = 0;
    for (const account of contraAssetAccounts) {
      const transactions = await prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      transactions.forEach(tx => {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        // For contra assets: debit increases (makes more positive), credit decreases (makes more negative)
        if (isDebitType) {
          accountBalance += parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance -= parseFloat(tx.amount);
        }
      });
      
      // Ensure contra assets have negative balances
      if (accountBalance > 0) {
        console.log(`WARNING: ${account.code} - ${account.name} has positive balance (${accountBalance})`);
        console.log(`This should be negative for a contra asset account.`);
      }
      
      totalContraAssets += accountBalance;
      console.log(`${account.code} - ${account.name}: ${accountBalance}`);
    }
    
    console.log(`Total contra asset accounts balance: ${totalContraAssets}`);
    
    // 5. Periksa total aset dan liabilitas + ekuitas
    console.log('\n5. Checking Balance Sheet Equation...');
    
    // Calculate total assets
    const totalAccountAssets = Object.values(await prisma.chartofaccount.findMany({
      where: { 
        type: { in: ['Aktiva', 'Aset'] },
        NOT: { 
          code: { startsWith: '15' }, // Exclude fixed assets
          code: '1301' // Exclude WIP
        }
      }
    }))
    .reduce((sum, account) => {
      // Calculate balance from transactions
      const transactions = prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      transactions.forEach(tx => {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance += parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance -= parseFloat(tx.amount);
        }
      });
      
      return sum + accountBalance;
    }, 0);
    
    const totalAssets = totalAccountAssets + fixedAssetsTotal + (projects.reduce(
      (sum, project) => {
        const totalCosts = project.projectcost.reduce(
          (sum, cost) => sum + parseFloat(cost.amount), 0
        );
        
        const totalBilled = project.billing.reduce(
          (sum, billing) => sum + parseFloat(billing.amount), 0
        );
        
        const wipValue = totalCosts - totalBilled;
        return sum + (wipValue > 0 ? wipValue : 0);
      }, 0
    ));
    
    console.log(`Total Assets: ${totalAssets}`);
    
    // Calculate total liabilities
    const totalLiabilities = Object.values(await prisma.chartofaccount.findMany({
      where: { type: { in: ['Kewajiban', 'Hutang'] } }
    }))
    .reduce((sum, account) => {
      // Calculate balance from transactions
      const transactions = prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      transactions.forEach(tx => {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance -= parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance += parseFloat(tx.amount);
        }
      });
      
      return sum + accountBalance;
    }, 0);
    
    // Add negative WIP to liabilities
    const totalNegativeWIP = projects.reduce(
      (sum, project) => {
        const totalCosts = project.projectcost.reduce(
          (sum, cost) => sum + parseFloat(cost.amount), 0
        );
        
        const totalBilled = project.billing.reduce(
          (sum, billing) => sum + parseFloat(billing.amount), 0
        );
        
        const wipValue = totalCosts - totalBilled;
        return sum + (wipValue < 0 ? Math.abs(wipValue) : 0);
      }, 0
    );
    
    const totalLiabilitiesWithNegativeWIP = totalLiabilities + totalNegativeWIP;
    
    console.log(`Total Liabilities: ${totalLiabilities}`);
    console.log(`Total Negative WIP: ${totalNegativeWIP}`);
    console.log(`Total Liabilities with Negative WIP: ${totalLiabilitiesWithNegativeWIP}`);
    
    // Calculate total equity
    const totalEquity = Object.values(await prisma.chartofaccount.findMany({
      where: { type: { in: ['Ekuitas', 'Modal'] } }
    }))
    .reduce((sum, account) => {
      // Calculate balance from transactions
      const transactions = prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      transactions.forEach(tx => {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance -= parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance += parseFloat(tx.amount);
        }
      });
      
      return sum + accountBalance;
    }, 0);
    
    console.log(`Total Equity: ${totalEquity}`);
    
    // Calculate net income
    const totalRevenue = Object.values(await prisma.chartofaccount.findMany({
      where: { type: 'Pendapatan' }
    }))
    .reduce((sum, account) => {
      // Calculate balance from transactions
      const transactions = prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      transactions.forEach(tx => {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance -= parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance += parseFloat(tx.amount);
        }
      });
      
      return sum + accountBalance;
    }, 0);
    
    const totalExpense = Object.values(await prisma.chartofaccount.findMany({
      where: { type: 'Beban' }
    }))
    .reduce((sum, account) => {
      // Calculate balance from transactions
      const transactions = prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      transactions.forEach(tx => {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance += parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance -= parseFloat(tx.amount);
        }
      });
      
      return sum + accountBalance;
    }, 0);
    
    const netIncome = totalRevenue - totalExpense;
    
    console.log(`Total Revenue: ${totalRevenue}`);
    console.log(`Total Expense: ${totalExpense}`);
    console.log(`Net Income: ${netIncome}`);
    
    const totalEquityWithIncome = totalEquity + netIncome;
    console.log(`Total Equity with Income: ${totalEquityWithIncome}`);
    
    const totalLiabilitiesAndEquity = totalLiabilitiesWithNegativeWIP + totalEquityWithIncome;
    console.log(`Total Liabilities and Equity: ${totalLiabilitiesAndEquity}`);
    
    console.log(`Difference: ${totalAssets - totalLiabilitiesAndEquity}`);
    console.log(`Is Balanced: ${Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01}`);
    
    console.log('\n===== DIAGNOSTIC COMPLETE =====');
    
  } catch (error) {
    console.error('Error in balance sheet diagnostic:', error);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 