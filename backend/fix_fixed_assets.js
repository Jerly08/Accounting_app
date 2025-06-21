const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Get all fixed asset accounts (15xx)
    const fixedAssetAccounts = await prisma.chartofaccount.findMany({
      where: {
        code: {
          startsWith: '15'
        }
      }
    });
    
    console.log('Fixed Asset Accounts:');
    console.log(JSON.stringify(fixedAssetAccounts, null, 2));
    
    // 2. Get all fixed assets from fixedasset table
    const fixedAssets = await prisma.fixedasset.findMany();
    
    console.log('\nFixed Assets:');
    console.log(JSON.stringify(fixedAssets, null, 2));
    
    // 3. Check for duplicate fixed assets
    console.log('\nPotential Duplicates:');
    fixedAssets.forEach(asset => {
      const matchingAccounts = fixedAssetAccounts.filter(account => 
        account.name.toLowerCase().includes(asset.assetName.toLowerCase()) ||
        asset.assetName.toLowerCase().includes(account.name.toLowerCase())
      );
      
      if (matchingAccounts.length > 0) {
        console.log(`Possible duplicate: ${asset.assetName} (${asset.bookValue}) with accounts:`);
        matchingAccounts.forEach(account => {
          console.log(`  - ${account.code}: ${account.name}`);
        });
      }
    });
    
    // 4. Calculate total fixed assets from both sources
    const totalFromAccounts = await prisma.transaction.aggregate({
      _sum: {
        amount: true
      },
      where: {
        accountCode: {
          startsWith: '15'
        },
        type: {
          in: ['debit', 'expense', 'WIP_INCREASE']
        }
      }
    });
    
    const totalFromFixedAssets = fixedAssets.reduce((sum, asset) => sum + parseFloat(asset.bookValue), 0);
    
    console.log('\nTotal Fixed Assets:');
    console.log(`From accounts: ${totalFromAccounts._sum.amount || 0}`);
    console.log(`From fixedasset table: ${totalFromFixedAssets}`);
    console.log(`Difference: ${(totalFromAccounts._sum.amount || 0) - totalFromFixedAssets}`);
    
    console.log('\nRecommendation:');
    console.log('To avoid duplication, the balanceSheet.js service has been updated to exclude fixed asset accounts (15xx) from the calculation of total assets, and instead use only the fixedasset table data.');
  } catch (error) {
    console.error('Error checking fixed assets:', error);
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