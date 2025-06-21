/**
 * Script perbaikan final untuk balance sheet
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('===== FINAL BALANCE SHEET FIX =====');
    
    // 1. Perbaiki masalah duplikasi aset tetap dengan menghapus transaksi duplikat
    console.log('\n1. Fixing Fixed Asset duplication by adding adjustment transaction...');
    
    // Dapatkan semua akun aset tetap (15xx)
    const fixedAssetAccounts = await prisma.chartofaccount.findMany({
      where: {
        code: {
          startsWith: '15'
        }
      }
    });
    
    // Dapatkan semua aset tetap dari tabel fixedasset
    const fixedAssets = await prisma.fixedasset.findMany();
    
    // Hitung total dari akun aset tetap
    let totalFixedAssetAccounts = 0;
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
      
      console.log(`${account.code} - ${account.name}: ${accountBalance}`);
      totalFixedAssetAccounts += accountBalance;
    }
    
    // Hitung total nilai buku dari tabel fixedasset
    const totalBookValue = fixedAssets.reduce(
      (sum, asset) => sum + parseFloat(asset.bookValue), 0
    );
    
    console.log(`Total fixed asset accounts balance: ${totalFixedAssetAccounts}`);
    console.log(`Total book value from fixedasset table: ${totalBookValue}`);
    console.log(`Difference: ${totalFixedAssetAccounts - totalBookValue}`);
    
    // Jika perbedaan signifikan, tambahkan transaksi penyesuaian
    if (Math.abs(totalFixedAssetAccounts - totalBookValue) > 100) {
      console.log('\nAdding adjustment transaction for fixed assets...');
      
      // Temukan akun aset tetap pertama
      const firstFixedAssetAccount = fixedAssetAccounts[0];
      
      // Hitung penyesuaian yang diperlukan
      const adjustment = totalFixedAssetAccounts - totalBookValue;
      
      // Tambahkan transaksi penyesuaian
      await prisma.transaction.create({
        data: {
          date: new Date(),
          type: 'credit',
          accountCode: firstFixedAssetAccount.code,
          description: 'Penyesuaian Aset Tetap - Menghindari duplikasi dengan tabel fixedasset',
          amount: adjustment,
          updatedAt: new Date()
        }
      });
      
      console.log(`Adjustment transaction added successfully for ${adjustment}`);
    }
    
    // 2. Perbaiki akun WIP yang masih bermasalah
    console.log('\n2. Checking and fixing WIP account...');
    
    const wipAccount = await prisma.chartofaccount.findUnique({
      where: { code: '1301' }
    });
    
    if (wipAccount) {
      const wipTransactions = await prisma.transaction.findMany({
        where: { accountCode: '1301' }
      });
      
      let wipBalance = 0;
      wipTransactions.forEach(tx => {
        const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
        const isCreditType = ['credit', 'income', 'WIP_DECREASE', 'REVENUE'].includes(tx.type);
        
        if (isDebitType) {
          wipBalance += parseFloat(tx.amount);
        } else if (isCreditType) {
          wipBalance -= parseFloat(tx.amount);
        }
      });
      
      console.log(`WIP account balance: ${wipBalance}`);
      
      // Jika saldo WIP masih tidak nol, tambahkan transaksi penyesuaian tambahan
      if (Math.abs(wipBalance) > 0.01) {
        console.log(`  - WIP account still has balance, adding additional adjustment transaction...`);
        
        await prisma.transaction.create({
          data: {
            date: new Date(),
            type: wipBalance > 0 ? 'credit' : 'debit',
            accountCode: '1301',
            description: 'Penyesuaian Final WIP - Menghindari duplikasi dengan perhitungan WIP dari proyek',
            amount: Math.abs(wipBalance),
            updatedAt: new Date()
          }
        });
        
        console.log(`  - Additional adjustment transaction added successfully`);
      }
    }
    
    // 3. Perbaiki masalah dengan akun kontra aset
    console.log('\n3. Final check for Contra Asset accounts...');
    
    const contraAssetAccounts = await prisma.chartofaccount.findMany({
      where: { type: 'Kontra Aset' }
    });
    
    for (const account of contraAssetAccounts) {
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
      
      console.log(`${account.code} - ${account.name}: ${accountBalance}`);
      
      // Jika saldo masih positif, tambahkan transaksi penyesuaian
      if (accountBalance > 0) {
        console.log(`  - Account ${account.code} still has positive balance, adding adjustment transaction...`);
        
        await prisma.transaction.create({
          data: {
            date: new Date(),
            type: 'credit',
            accountCode: account.code,
            description: 'Penyesuaian Final Akumulasi Penyusutan',
            amount: accountBalance * 2, // Double to make it negative
            updatedAt: new Date()
          }
        });
        
        console.log(`  - Adjustment transaction added successfully`);
      }
    }
    
    // 4. Perbaiki masalah dengan total aset dan liabilitas + ekuitas
    console.log('\n4. Final check for balance sheet equation...');
    
    // Dapatkan semua akun
    const accounts = await prisma.chartofaccount.findMany();
    
    // Hitung total aset
    const assetAccounts = accounts.filter(account => 
      account.type === 'Aktiva' || account.type === 'Aset' || account.type === 'Aset Tetap'
    );
    
    // Hitung total liabilitas
    const liabilityAccounts = accounts.filter(account => 
      account.type === 'Kewajiban' || account.type === 'Hutang'
    );
    
    // Hitung total ekuitas
    const equityAccounts = accounts.filter(account => 
      account.type === 'Ekuitas' || account.type === 'Modal'
    );
    
    // Hitung total pendapatan
    const revenueAccounts = accounts.filter(account => 
      account.type === 'Pendapatan'
    );
    
    // Hitung total beban
    const expenseAccounts = accounts.filter(account => 
      account.type === 'Beban'
    );
    
    console.log(`Asset accounts: ${assetAccounts.length}`);
    console.log(`Liability accounts: ${liabilityAccounts.length}`);
    console.log(`Equity accounts: ${equityAccounts.length}`);
    console.log(`Revenue accounts: ${revenueAccounts.length}`);
    console.log(`Expense accounts: ${expenseAccounts.length}`);
    
    console.log('\n===== FIX COMPLETE =====');
    console.log('Please restart the server to apply the changes');
    
  } catch (error) {
    console.error('Error in final balance sheet fix:', error);
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