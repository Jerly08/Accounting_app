/**
 * Script untuk memperbaiki data balance sheet
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('===== BALANCE SHEET DATA FIX =====');
    
    // 1. Perbaiki akun kontra aset dengan saldo positif
    console.log('\n1. Fixing Contra Asset Accounts with positive balance...');
    
    const contraAssetAccount = await prisma.chartofaccount.findUnique({
      where: { code: '1601' }
    });
    
    if (contraAssetAccount) {
      console.log(`Found contra asset account: ${contraAssetAccount.code} - ${contraAssetAccount.name}`);
      
      // Get transactions for this account
      const transactions = await prisma.transaction.findMany({
        where: { accountCode: '1601' }
      });
      
      console.log(`Found ${transactions.length} transactions for account 1601`);
      
      // Find transactions with incorrect type
      const incorrectTransactions = transactions.filter(tx => 
        tx.type === 'debit' || tx.type === 'expense' || tx.type === 'WIP_INCREASE'
      );
      
      if (incorrectTransactions.length > 0) {
        console.log(`Found ${incorrectTransactions.length} transactions with incorrect type`);
        
        // Fix each transaction by changing type from debit to credit or expense to income
        for (const tx of incorrectTransactions) {
          let newType = tx.type;
          
          if (tx.type === 'debit') newType = 'credit';
          else if (tx.type === 'expense') newType = 'income';
          else if (tx.type === 'WIP_INCREASE') newType = 'WIP_DECREASE';
          
          console.log(`Updating transaction ${tx.id} from type ${tx.type} to ${newType}`);
          
          await prisma.transaction.update({
            where: { id: tx.id },
            data: { type: newType }
          });
        }
        
        console.log('Contra asset transactions fixed');
      } else {
        console.log('No incorrect transactions found for contra asset account');
      }
    }
    
    // 2. Perbaiki duplikasi aset tetap
    console.log('\n2. Fixing Fixed Asset duplication...');
    
    // Approach: We'll update the balance sheet service to exclude fixed asset accounts (15xx)
    // This has already been implemented in the balanceSheet.js service
    
    console.log('Fixed asset duplication fixed by excluding fixed asset accounts (15xx) from total assets');
    console.log('Using only fixedasset table for fixed asset values');
    
    // 3. Perbaiki duplikasi WIP
    console.log('\n3. Fixing WIP duplication...');
    
    // Approach: We'll update the balance sheet service to exclude WIP account (1301)
    // This has already been implemented in the balanceSheet.js service
    
    console.log('WIP duplication fixed by excluding WIP account (1301) from total assets');
    console.log('Using only calculated WIP from projects');
    
    console.log('\n===== FIX COMPLETE =====');
    console.log('Please restart the server to apply the changes');
    
  } catch (error) {
    console.error('Error fixing balance sheet data:', error);
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