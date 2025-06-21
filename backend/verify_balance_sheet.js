/**
 * Script untuk memverifikasi balance sheet setelah perbaikan
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const balanceSheetService = require('./src/services/balanceSheet');

async function main() {
  try {
    console.log('===== BALANCE SHEET VERIFICATION =====');
    
    // Ambil tanggal hari ini
    const today = new Date().toISOString().split('T')[0];
    
    // Generate balance sheet untuk tanggal hari ini
    console.log(`Generating balance sheet for ${today}...`);
    const balanceSheet = await balanceSheetService.generateBalanceSheet(today);
    
    if (!balanceSheet.success) {
      console.error('Failed to generate balance sheet:', balanceSheet.message);
      return;
    }
    
    const { summary } = balanceSheet.data;
    
    console.log('\n===== BALANCE SHEET SUMMARY =====');
    console.log(`Total Assets: ${summary.totalAssets}`);
    console.log(`  - Total Account Assets: ${summary.totalAccountAssets}`);
    console.log(`  - Total Fixed Assets: ${summary.totalFixedAssets}`);
    console.log(`  - Total WIP: ${summary.totalWIP}`);
    console.log(`  - Total Contra Assets: ${summary.totalContraAssets}`);
    
    console.log(`\nTotal Liabilities: ${summary.totalLiabilities}`);
    console.log(`  - Total Negative WIP: ${summary.totalNegativeWIP}`);
    
    console.log(`\nTotal Equity: ${summary.totalEquity}`);
    console.log(`Net Income: ${summary.netIncome}`);
    console.log(`Total Equity with Income: ${summary.totalEquityWithIncome}`);
    
    console.log(`\nTotal Liabilities and Equity: ${summary.totalLiabilitiesAndEquity}`);
    console.log(`\nDifference: ${summary.debugInfo.difference}`);
    console.log(`Is Balanced: ${summary.isBalanced}`);
    
    if (summary.isBalanced) {
      console.log('\n✅ BALANCE SHEET IS BALANCED!');
    } else {
      console.log('\n❌ BALANCE SHEET IS NOT BALANCED!');
      console.log('Please check the following potential issues:');
      
      // Check for issues with contra assets
      if (summary.debugInfo.contraAssetDetails) {
        const positiveContraAssets = summary.debugInfo.contraAssetDetails.filter(item => item.balance > 0);
        if (positiveContraAssets.length > 0) {
          console.log('\n1. Contra assets with positive balances:');
          positiveContraAssets.forEach(item => {
            console.log(`   - ${item.code}: ${item.name} = ${item.balance}`);
          });
          console.log('   Contra assets should have negative balances.');
        }
      }
      
      // Check for issues with fixed assets
      const fixedAssetDifference = summary.debugInfo.fixedAssetAccountsTotal - summary.totalFixedAssets;
      if (Math.abs(fixedAssetDifference) > 0.01) {
        console.log('\n2. Fixed asset discrepancy:');
        console.log(`   - Fixed asset accounts total: ${summary.debugInfo.fixedAssetAccountsTotal}`);
        console.log(`   - Fixed assets from table: ${summary.totalFixedAssets}`);
        console.log(`   - Difference: ${fixedAssetDifference}`);
        console.log('   This may indicate duplication in fixed asset values.');
      }
      
      // Check for issues with WIP
      if (summary.debugInfo.wipAccountBalance > 0 && summary.totalWIP > 0) {
        console.log('\n3. WIP duplication:');
        console.log(`   - WIP account balance: ${summary.debugInfo.wipAccountBalance}`);
        console.log(`   - Calculated WIP: ${summary.totalWIP}`);
        console.log('   This may indicate duplication in WIP values.');
      }
    }
    
    // Verify the schema structure
    console.log('\n===== SCHEMA VERIFICATION =====');
    
    // Check account categories
    const accountCategories = await prisma.$queryRaw`
      SELECT DISTINCT category FROM chartofaccount WHERE category IS NOT NULL
    `;
    
    console.log('\nAccount Categories:');
    accountCategories.forEach(cat => {
      console.log(`- ${cat.category}`);
    });
    
    // Check account types
    const accountTypes = await prisma.$queryRaw`
      SELECT DISTINCT type FROM chartofaccount
    `;
    
    console.log('\nAccount Types:');
    accountTypes.forEach(type => {
      console.log(`- ${type.type}`);
    });
    
    console.log('\n===== VERIFICATION COMPLETE =====');
    
  } catch (error) {
    console.error('Error in balance sheet verification:', error);
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