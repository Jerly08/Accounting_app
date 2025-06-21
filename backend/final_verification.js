/**
 * Script untuk verifikasi final balance sheet
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const balanceSheetService = require('./src/services/balanceSheet');

async function main() {
  try {
    console.log('===== FINAL BALANCE SHEET VERIFICATION =====');
    
    // Generate balance sheet untuk tanggal hari ini
    const today = new Date().toISOString().split('T')[0];
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
    
    // Verifikasi balance sheet seimbang
    const difference = summary.totalAssets - summary.totalLiabilitiesAndEquity;
    console.log(`\nDifference: ${difference}`);
    console.log(`Is Balanced: ${summary.isBalanced}`);
    
    if (summary.isBalanced) {
      console.log('\n✅ BALANCE SHEET IS BALANCED!');
    } else {
      console.log('\n❌ BALANCE SHEET IS NOT BALANCED!');
    }
    
    // Tampilkan informasi debug
    console.log('\n===== DEBUG INFORMATION =====');
    console.log(`Original Total Fixed Assets: ${summary.debugInfo.totalFixedAssets}`);
    console.log(`Adjusted Total Fixed Assets: ${summary.debugInfo.adjustedTotalFixedAssets}`);
    console.log(`Adjustment Made: ${summary.debugInfo.adjustedTotalFixedAssets - summary.debugInfo.totalFixedAssets}`);
    console.log(`Original Difference: ${summary.debugInfo.difference}`);
    console.log(`Adjusted Difference: ${summary.debugInfo.adjustedDifference}`);
    
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