/**
 * Script sederhana untuk memeriksa balance sheet
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('===== CHECKING BALANCE SHEET =====');
    
    // 1. Get all accounts
    const accounts = await prisma.chartofaccount.findMany();
    console.log(`Found ${accounts.length} accounts`);
    
    // 2. Get all fixed assets
    const fixedAssets = await prisma.fixedasset.findMany();
    console.log(`Found ${fixedAssets.length} fixed assets`);
    
    // 3. Calculate total fixed assets
    let totalFixedAssets = 0;
    for (const asset of fixedAssets) {
      totalFixedAssets += parseFloat(asset.bookValue);
      console.log(`Asset: ${asset.assetName}, Book Value: ${asset.bookValue}`);
    }
    console.log(`Total Fixed Assets: ${totalFixedAssets}`);
    
    // 4. Get all asset accounts
    const assetAccounts = accounts.filter(account => 
      account.type === 'Aktiva' || account.type === 'Aset' || account.type === 'Aset Tetap'
    );
    console.log(`Found ${assetAccounts.length} asset accounts`);
    
    // 5. Calculate total asset accounts balance
    let totalAssetAccountsBalance = 0;
    for (const account of assetAccounts) {
      const transactions = await prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      for (const tx of transactions) {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance += parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance -= parseFloat(tx.amount);
        }
      }
      
      console.log(`Account: ${account.code} - ${account.name}, Balance: ${accountBalance}`);
      totalAssetAccountsBalance += accountBalance;
    }
    console.log(`Total Asset Accounts Balance: ${totalAssetAccountsBalance}`);
    
    // 6. Get all contra asset accounts
    const contraAssetAccounts = accounts.filter(account => account.type === 'Kontra Aset');
    console.log(`Found ${contraAssetAccounts.length} contra asset accounts`);
    
    // 7. Calculate total contra asset accounts balance
    let totalContraAssetBalance = 0;
    for (const account of contraAssetAccounts) {
      const transactions = await prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      for (const tx of transactions) {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance += parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance -= parseFloat(tx.amount);
        }
      }
      
      console.log(`Contra Asset: ${account.code} - ${account.name}, Balance: ${accountBalance}`);
      totalContraAssetBalance += accountBalance;
    }
    console.log(`Total Contra Asset Balance: ${totalContraAssetBalance}`);
    
    // 8. Get all liability accounts
    const liabilityAccounts = accounts.filter(account => 
      account.type === 'Kewajiban' || account.type === 'Hutang'
    );
    console.log(`Found ${liabilityAccounts.length} liability accounts`);
    
    // 9. Calculate total liability accounts balance
    let totalLiabilityBalance = 0;
    for (const account of liabilityAccounts) {
      const transactions = await prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      for (const tx of transactions) {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance -= parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance += parseFloat(tx.amount);
        }
      }
      
      console.log(`Liability: ${account.code} - ${account.name}, Balance: ${accountBalance}`);
      totalLiabilityBalance += accountBalance;
    }
    console.log(`Total Liability Balance: ${totalLiabilityBalance}`);
    
    // 10. Get all equity accounts
    const equityAccounts = accounts.filter(account => 
      account.type === 'Ekuitas' || account.type === 'Modal'
    );
    console.log(`Found ${equityAccounts.length} equity accounts`);
    
    // 11. Calculate total equity accounts balance
    let totalEquityBalance = 0;
    for (const account of equityAccounts) {
      const transactions = await prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      for (const tx of transactions) {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance -= parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance += parseFloat(tx.amount);
        }
      }
      
      console.log(`Equity: ${account.code} - ${account.name}, Balance: ${accountBalance}`);
      totalEquityBalance += accountBalance;
    }
    console.log(`Total Equity Balance: ${totalEquityBalance}`);
    
    // 12. Calculate net income
    const revenueAccounts = accounts.filter(account => account.type === 'Pendapatan');
    const expenseAccounts = accounts.filter(account => account.type === 'Beban');
    
    let totalRevenueBalance = 0;
    for (const account of revenueAccounts) {
      const transactions = await prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      for (const tx of transactions) {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance -= parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance += parseFloat(tx.amount);
        }
      }
      
      totalRevenueBalance += accountBalance;
    }
    
    let totalExpenseBalance = 0;
    for (const account of expenseAccounts) {
      const transactions = await prisma.transaction.findMany({
        where: { accountCode: account.code }
      });
      
      let accountBalance = 0;
      for (const tx of transactions) {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          accountBalance += parseFloat(tx.amount);
        } else if (isCreditType) {
          accountBalance -= parseFloat(tx.amount);
        }
      }
      
      totalExpenseBalance += accountBalance;
    }
    
    const netIncome = totalRevenueBalance - totalExpenseBalance;
    console.log(`Total Revenue: ${totalRevenueBalance}`);
    console.log(`Total Expense: ${totalExpenseBalance}`);
    console.log(`Net Income: ${netIncome}`);
    
    // 13. Calculate balance sheet equation
    const totalAssets = totalAssetAccountsBalance + totalFixedAssets + totalContraAssetBalance;
    const totalLiabilitiesAndEquity = totalLiabilityBalance + totalEquityBalance + netIncome;
    
    console.log('\n===== BALANCE SHEET EQUATION =====');
    console.log(`Total Assets: ${totalAssets}`);
    console.log(`Total Liabilities and Equity: ${totalLiabilitiesAndEquity}`);
    console.log(`Difference: ${totalAssets - totalLiabilitiesAndEquity}`);
    console.log(`Is Balanced: ${Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01}`);
    
  } catch (error) {
    console.error('Error checking balance sheet:', error);
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