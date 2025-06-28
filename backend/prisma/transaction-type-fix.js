/**
 * Transaction Type Fix
 * 
 * Script untuk memperbaiki tipe transaksi yang tidak konsisten.
 * Mengubah "credit" menjadi "income" dan "debit" menjadi "expense" untuk transaksi penyeimbang balance sheet.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting transaction type fix process...');
  
  try {
    // 1. Temukan transaksi penyeimbang dengan tipe "credit"
    console.log('Finding credit transactions...');
    
    const creditTransactions = await prisma.transaction.findMany({
      where: {
        type: 'credit',
        notes: {
          contains: 'Transaksi penyeimbang balance sheet'
        }
      }
    });
    
    console.log(`Found ${creditTransactions.length} credit transactions to fix`);
    
    // 2. Ubah tipe "credit" menjadi "income"
    for (const transaction of creditTransactions) {
      console.log(`Updating transaction ID ${transaction.id} from "credit" to "income"`);
      
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          type: 'income',
          updatedAt: new Date()
        }
      });
    }
    
    // 3. Temukan transaksi penyeimbang dengan tipe "debit"
    console.log('Finding debit transactions...');
    
    const debitTransactions = await prisma.transaction.findMany({
      where: {
        type: 'debit',
        notes: {
          contains: 'Transaksi penyeimbang balance sheet'
        }
      }
    });
    
    console.log(`Found ${debitTransactions.length} debit transactions to fix`);
    
    // 4. Ubah tipe "debit" menjadi "expense"
    for (const transaction of debitTransactions) {
      console.log(`Updating transaction ID ${transaction.id} from "debit" to "expense"`);
      
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          type: 'expense',
          updatedAt: new Date()
        }
      });
    }
    
    // 5. Periksa transaksi koreksi jika ada
    console.log('Checking for correction transactions...');
    
    const correctionTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          {
            type: 'credit',
            description: {
              contains: 'Koreksi Modal'
            }
          },
          {
            type: 'debit',
            description: {
              contains: 'Koreksi Saldo Bank'
            }
          }
        ]
      }
    });
    
    console.log(`Found ${correctionTransactions.length} correction transactions to fix`);
    
    // 6. Ubah tipe transaksi koreksi
    for (const transaction of correctionTransactions) {
      const newType = transaction.type === 'credit' ? 'income' : 'expense';
      console.log(`Updating correction transaction ID ${transaction.id} from "${transaction.type}" to "${newType}"`);
      
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          type: newType,
          updatedAt: new Date()
        }
      });
    }
    
    console.log('Transaction type fix completed successfully!');
    
  } catch (error) {
    console.error('Error in transaction type fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 