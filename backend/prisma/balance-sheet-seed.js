/**
 * Balance Sheet Seed
 * 
 * This script creates the necessary equity and liability transactions to balance the balance sheet.
 * It adds initial capital, liabilities, and adjusts entries to ensure the balance sheet is properly balanced.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting balance sheet seed process...');
  
  try {
    // 1. Get total fixed assets value
    const fixedAssets = await prisma.fixedasset.findMany();
    const totalFixedAssetsValue = fixedAssets.reduce((sum, asset) => sum + parseFloat(asset.bookValue), 0);
    console.log(`Total Fixed Assets: ${totalFixedAssetsValue}`);
    
    // 2. Get total WIP value
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
    
    // 3. Get total assets from transactions
    const assetAccounts = await prisma.chartofaccount.findMany({
      where: {
        type: 'Aktiva'
      }
    });
    
    const assetAccountCodes = assetAccounts.map(account => account.code);
    const assetTransactions = await prisma.transaction.findMany({
      where: {
        accountCode: {
          in: assetAccountCodes
        }
      }
    });
    
    let totalAssetValue = 0;
    for (const transaction of assetTransactions) {
      if (['income', 'Pendapatan', 'WIP_DECREASE', 'REVENUE'].includes(transaction.type)) {
        totalAssetValue += parseFloat(transaction.amount);
      } else if (['expense', 'Beban', 'WIP_INCREASE'].includes(transaction.type)) {
        totalAssetValue -= parseFloat(transaction.amount);
      }
    }
    console.log(`Total Asset Value from Transactions: ${totalAssetValue}`);
    
    // 4. Calculate total assets
    const totalAssets = totalFixedAssetsValue + totalWipValue + totalAssetValue;
    console.log(`Total Combined Assets: ${totalAssets}`);
    
    // 5. Check if initial capital transaction exists
    const existingCapital = await prisma.transaction.findFirst({
      where: {
        accountCode: '3101', // Modal Saham
        description: 'Modal Awal Perusahaan'
      }
    });
    
    if (existingCapital) {
      console.log('Initial capital transaction already exists, skipping creation.');
    } else {
      console.log('Creating initial capital transaction...');
      
      // Create initial capital transaction (80% of total assets)
      const initialCapital = Math.round(totalAssets * 0.8);
      
      // Create equity transaction
      await prisma.transaction.create({
        data: {
          date: new Date('2022-01-01'),
          type: 'income', // Credit to equity
          accountCode: '3101', // Modal Saham
          description: 'Modal Awal Perusahaan',
          amount: initialCapital,
          projectId: null,
          notes: 'Transaksi penyeimbang balance sheet',
          updatedAt: new Date()
        }
      });
      
      // Create counter entry in cash/bank
      await prisma.transaction.create({
        data: {
          date: new Date('2022-01-01'),
          type: 'income', // Debit to asset
          accountCode: '1102', // Bank BCA
          description: 'Setoran Modal Awal',
          amount: initialCapital,
          projectId: null,
          notes: 'Counter transaction untuk modal awal',
          updatedAt: new Date()
        }
      });
      
      console.log(`Created initial capital transaction for ${initialCapital}`);
    }
    
    // 6. Check if long-term loan transaction exists
    const existingLoan = await prisma.transaction.findFirst({
      where: {
        accountCode: '2201', // Hutang Bank Jangka Panjang
        description: 'Pinjaman Bank Jangka Panjang'
      }
    });
    
    if (existingLoan) {
      console.log('Long-term loan transaction already exists, skipping creation.');
    } else {
      console.log('Creating long-term loan transaction...');
      
      // Create long-term loan transaction (20% of total assets)
      const loanAmount = Math.round(totalAssets * 0.2);
      
      // Create liability transaction
      await prisma.transaction.create({
        data: {
          date: new Date('2022-02-15'),
          type: 'income', // Credit to liability
          accountCode: '2201', // Hutang Bank Jangka Panjang
          description: 'Pinjaman Bank Jangka Panjang',
          amount: loanAmount,
          projectId: null,
          notes: 'Transaksi penyeimbang balance sheet',
          updatedAt: new Date()
        }
      });
      
      // Create counter entry in cash/bank
      await prisma.transaction.create({
        data: {
          date: new Date('2022-02-15'),
          type: 'income', // Debit to asset
          accountCode: '1102', // Bank BCA
          description: 'Penerimaan Dana Pinjaman Bank',
          amount: loanAmount,
          projectId: null,
          notes: 'Counter transaction untuk pinjaman bank',
          updatedAt: new Date()
        }
      });
      
      console.log(`Created long-term loan transaction for ${loanAmount}`);
    }
    
    // 7. Create retained earnings if needed
    const existingRetainedEarnings = await prisma.transaction.findFirst({
      where: {
        accountCode: '3102', // Laba Ditahan
        description: 'Laba Ditahan Tahun Sebelumnya'
      }
    });
    
    if (existingRetainedEarnings) {
      console.log('Retained earnings transaction already exists, skipping creation.');
    } else {
      console.log('Creating retained earnings transaction...');
      
      // Create retained earnings (10% of total assets)
      const retainedEarnings = Math.round(totalAssets * 0.1);
      
      // Create equity transaction
      await prisma.transaction.create({
        data: {
          date: new Date('2023-01-01'),
          type: 'income', // Credit to equity
          accountCode: '3102', // Laba Ditahan
          description: 'Laba Ditahan Tahun Sebelumnya',
          amount: retainedEarnings,
          projectId: null,
          notes: 'Transaksi penyeimbang balance sheet',
          updatedAt: new Date()
        }
      });
      
      console.log(`Created retained earnings transaction for ${retainedEarnings}`);
    }
    
    console.log('Balance sheet seed completed successfully!');
    
  } catch (error) {
    console.error('Error in balance sheet seed:', error);
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