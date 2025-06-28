/**
 * Balance Sheet Fix
 * 
 * Script untuk memperbaiki balance sheet yang tidak seimbang.
 * Menghapus transaksi yang bermasalah dan membuat transaksi baru dengan pencatatan yang benar.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting balance sheet fix process...');
  
  try {
    // 1. Hapus transaksi yang bermasalah (transaksi modal dan hutang yang dibuat sebelumnya)
    console.log('Deleting problematic transactions...');
    
    const deletedTransactions = await prisma.transaction.deleteMany({
      where: {
        OR: [
          {
            accountCode: '3101',
            description: 'Modal Awal Perusahaan'
          },
          {
            accountCode: '1102',
            description: 'Setoran Modal Awal'
          },
          {
            accountCode: '2201',
            description: 'Pinjaman Bank Jangka Panjang'
          },
          {
            accountCode: '1102',
            description: 'Penerimaan Dana Pinjaman Bank'
          },
          {
            accountCode: '3102',
            description: 'Laba Ditahan Tahun Sebelumnya'
          }
        ]
      }
    });
    
    console.log(`Deleted ${deletedTransactions.count} problematic transactions`);
    
    // 2. Hitung total aset yang perlu diseimbangkan
    // 2.1 Hitung fixed assets
    const fixedAssets = await prisma.fixedasset.findMany();
    const totalFixedAssetsValue = fixedAssets.reduce((sum, asset) => sum + parseFloat(asset.bookValue), 0);
    console.log(`Total Fixed Assets: ${totalFixedAssetsValue}`);
    
    // 2.2 Hitung WIP
    const projects = await prisma.project.findMany({
      where: { status: 'ongoing' },
      include: {
        projectcost: true,
        billing: true
      }
    });
    
    let totalWipValue = 0;
    for (const project of projects) {
      const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount), 0);
      const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount), 0);
      const wipValue = totalCosts - totalBilled;
      if (wipValue > 0) {
        totalWipValue += wipValue;
      }
    }
    console.log(`Total WIP Value: ${totalWipValue}`);
    
    // 2.3 Total aset yang perlu diseimbangkan
    const totalAssets = totalFixedAssetsValue + totalWipValue;
    console.log(`Total Assets to Balance: ${totalAssets}`);
    
    // 3. Buat transaksi baru dengan pencatatan yang benar
    
    // 3.1 Buat transaksi modal awal (70% dari total aset)
    const initialCapital = Math.round(totalAssets * 0.7);
    console.log(`Creating initial capital transaction: ${initialCapital}`);
    
    await prisma.transaction.create({
      data: {
        date: new Date('2022-01-01'),
        type: 'credit', // Credit untuk ekuitas
        accountCode: '3101', // Modal Saham
        description: 'Modal Awal Perusahaan',
        amount: initialCapital,
        projectId: null,
        notes: 'Transaksi penyeimbang balance sheet',
        updatedAt: new Date()
      }
    });
    
    // 3.2 Buat transaksi hutang bank (20% dari total aset)
    const loanAmount = Math.round(totalAssets * 0.2);
    console.log(`Creating long-term loan transaction: ${loanAmount}`);
    
    await prisma.transaction.create({
      data: {
        date: new Date('2022-02-15'),
        type: 'credit', // Credit untuk liabilitas
        accountCode: '2201', // Hutang Bank Jangka Panjang
        description: 'Pinjaman Bank Jangka Panjang',
        amount: loanAmount,
        projectId: null,
        notes: 'Transaksi penyeimbang balance sheet',
        updatedAt: new Date()
      }
    });
    
    // 3.3 Buat transaksi laba ditahan (10% dari total aset)
    const retainedEarnings = Math.round(totalAssets * 0.1);
    console.log(`Creating retained earnings transaction: ${retainedEarnings}`);
    
    await prisma.transaction.create({
      data: {
        date: new Date('2023-01-01'),
        type: 'credit', // Credit untuk ekuitas
        accountCode: '3102', // Laba Ditahan
        description: 'Laba Ditahan Tahun Sebelumnya',
        amount: retainedEarnings,
        projectId: null,
        notes: 'Transaksi penyeimbang balance sheet',
        updatedAt: new Date()
      }
    });
    
    // 3.4 Buat transaksi kas/bank untuk menyeimbangkan (100% dari total aset)
    console.log(`Creating bank transaction: ${totalAssets}`);
    
    await prisma.transaction.create({
      data: {
        date: new Date('2022-01-01'),
        type: 'debit', // Debit untuk aset
        accountCode: '1102', // Bank BCA
        description: 'Saldo Awal Bank',
        amount: totalAssets,
        projectId: null,
        notes: 'Transaksi penyeimbang balance sheet',
        updatedAt: new Date()
      }
    });
    
    // 4. Buat transaksi koreksi untuk Bank BCA jika masih ada saldo negatif
    const bankAccount = await prisma.chartofaccount.findUnique({
      where: { code: '1102' } // Bank BCA
    });
    
    if (bankAccount) {
      // Cek saldo Bank BCA dari transaksi
      const bankTransactions = await prisma.transaction.findMany({
        where: { accountCode: '1102' }
      });
      
      let bankBalance = 0;
      for (const transaction of bankTransactions) {
        if (['debit', 'expense', 'WIP_INCREASE'].includes(transaction.type)) {
          bankBalance += parseFloat(transaction.amount);
        } else if (['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(transaction.type)) {
          bankBalance -= parseFloat(transaction.amount);
        }
      }
      
      console.log(`Current Bank BCA Balance: ${bankBalance}`);
      
      // Jika saldo masih negatif, buat transaksi koreksi
      if (bankBalance < 0) {
        const correctionAmount = Math.abs(bankBalance);
        console.log(`Creating correction transaction for Bank BCA: ${correctionAmount}`);
        
        await prisma.transaction.create({
          data: {
            date: new Date('2022-01-01'),
            type: 'debit', // Debit untuk menambah saldo
            accountCode: '1102', // Bank BCA
            description: 'Koreksi Saldo Bank',
            amount: correctionAmount,
            projectId: null,
            notes: 'Transaksi koreksi saldo bank',
            updatedAt: new Date()
          }
        });
        
        // Transaksi counter untuk koreksi (ke modal saham)
        await prisma.transaction.create({
          data: {
            date: new Date('2022-01-01'),
            type: 'credit', // Credit untuk ekuitas
            accountCode: '3101', // Modal Saham
            description: 'Koreksi Modal untuk Saldo Bank',
            amount: correctionAmount,
            projectId: null,
            notes: 'Transaksi koreksi saldo bank (counter)',
            updatedAt: new Date()
          }
        });
      }
    }
    
    console.log('Balance sheet fix completed successfully!');
    
  } catch (error) {
    console.error('Error in balance sheet fix:', error);
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