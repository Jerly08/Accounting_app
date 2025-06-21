const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Check transactions for account 1602
    const transactions1602 = await prisma.transaction.findMany({
      where: { accountCode: '1602' },
      orderBy: { date: 'asc' }
    });
    
    console.log('Transactions for account 1602 (Akumulasi Penyusutan Mesin Sondir):');
    console.log(JSON.stringify(transactions1602, null, 2));
    
    // Calculate balance for account 1602
    let balance1602 = 0;
    transactions1602.forEach(transaction => {
      const { type, amount } = transaction;
      const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(type);
      const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(type);
      
      // For contra assets: debit decreases (makes more positive), credit increases (makes more negative)
      if (isDebitType) {
        balance1602 += parseFloat(amount);
      } else if (isCreditType) {
        balance1602 -= parseFloat(amount);
      }
    });
    
    console.log('Current balance for account 1602:', balance1602);
    console.log('This balance should be negative for a contra asset account.');
    
    // Check if there are any problematic transactions
    if (balance1602 > 0) {
      console.log('\nProblematic transactions detected. Consider fixing with:');
      console.log(`
      // Example fix (to be run in a migration or script):
      await prisma.transaction.updateMany({
        where: { 
          accountCode: '1602',
          type: 'income'  // or the problematic transaction type
        },
        data: {
          type: 'expense'  // change to appropriate type
        }
      });
      `);
    }
  } catch (error) {
    console.error('Error checking transactions:', error);
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