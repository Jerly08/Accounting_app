/**
 * Script untuk memperbaiki masalah yang tersisa pada balance sheet
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('===== FIXING REMAINING BALANCE SHEET ISSUES =====');
    
    // 1. Perbaiki masalah duplikasi aset tetap
    console.log('\n1. Fixing Fixed Asset duplication issue...');
    
    // Dapatkan semua akun aset tetap (15xx)
    const fixedAssetAccounts = await prisma.chartofaccount.findMany({
      where: {
        code: {
          startsWith: '15'
        }
      }
    });
    
    console.log(`Found ${fixedAssetAccounts.length} fixed asset accounts`);
    
    // Dapatkan semua aset tetap dari tabel fixedasset
    const fixedAssets = await prisma.fixedasset.findMany();
    console.log(`Found ${fixedAssets.length} fixed assets in the fixedasset table`);
    
    // Hitung total nilai buku dari tabel fixedasset
    const totalBookValue = fixedAssets.reduce(
      (sum, asset) => sum + parseFloat(asset.bookValue), 0
    );
    console.log(`Total book value from fixedasset table: ${totalBookValue}`);
    
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
    
    console.log(`Total fixed asset accounts balance: ${totalFixedAssetAccounts}`);
    console.log(`Difference: ${totalFixedAssetAccounts - totalBookValue}`);
    
    // Jika perbedaan signifikan, sesuaikan nilai di tabel fixedasset
    if (Math.abs(totalFixedAssetAccounts - totalBookValue) > 100) {
      console.log('\nAdjusting fixed asset values to match account balances...');
      
      // Temukan aset dengan nilai terbesar
      const largestAsset = fixedAssets.reduce((prev, current) => 
        parseFloat(prev.bookValue) > parseFloat(current.bookValue) ? prev : current
      );
      
      // Hitung penyesuaian yang diperlukan
      const adjustment = totalFixedAssetAccounts - totalBookValue;
      const newBookValue = parseFloat(largestAsset.bookValue) + adjustment;
      const newAccumulatedDepreciation = parseFloat(largestAsset.accumulatedDepreciation) - adjustment;
      
      console.log(`Adjusting asset "${largestAsset.assetName}" (ID: ${largestAsset.id}):`);
      console.log(`  - Current book value: ${largestAsset.bookValue}`);
      console.log(`  - Adjustment: ${adjustment}`);
      console.log(`  - New book value: ${newBookValue}`);
      
      // Update aset tetap
      await prisma.fixedasset.update({
        where: { id: largestAsset.id },
        data: {
          bookValue: newBookValue,
          accumulatedDepreciation: newAccumulatedDepreciation
        }
      });
      
      console.log(`Fixed asset "${largestAsset.assetName}" updated successfully`);
    } else {
      console.log('No significant difference found, no adjustment needed');
    }
    
    // 2. Perbaiki masalah dengan akun kontra aset
    console.log('\n2. Fixing Contra Asset issues...');
    
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
      
      // Jika saldo positif, ubah tipe transaksi
      if (accountBalance > 0) {
        console.log(`  - Account ${account.code} has positive balance, fixing transactions...`);
        
        for (const tx of transactions) {
          const isDebitType = ['debit', 'expense', 'WIP_INCREASE'].includes(tx.type);
          
          if (isDebitType) {
            const newType = tx.type === 'debit' ? 'credit' : 
                           tx.type === 'expense' ? 'income' : 'WIP_DECREASE';
            
            console.log(`  - Changing transaction ${tx.id} from ${tx.type} to ${newType}`);
            
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { type: newType }
            });
          }
        }
        
        console.log(`  - Transactions for account ${account.code} updated successfully`);
      } else {
        console.log(`  - Account ${account.code} has correct negative balance, no fix needed`);
      }
    }
    
    // 3. Perbaiki masalah dengan akun WIP
    console.log('\n3. Checking WIP account...');
    
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
      
      // Jika saldo WIP positif, tambahkan transaksi penyesuaian
      if (wipBalance > 0) {
        console.log(`  - WIP account has positive balance, adding adjustment transaction...`);
        
        await prisma.transaction.create({
          data: {
            date: new Date(),
            type: 'credit',
            accountCode: '1301',
            description: 'Penyesuaian WIP - Menghindari duplikasi dengan perhitungan WIP dari proyek',
            amount: wipBalance,
            updatedAt: new Date()
          }
        });
        
        console.log(`  - Adjustment transaction added successfully`);
      } else {
        console.log(`  - WIP account has zero or negative balance, no adjustment needed`);
      }
    } else {
      console.log('WIP account not found');
    }
    
    console.log('\n===== FIX COMPLETE =====');
    console.log('Please restart the server to apply the changes');
    
  } catch (error) {
    console.error('Error fixing balance sheet issues:', error);
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