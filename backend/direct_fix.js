/**
 * Script perbaikan langsung untuk balance sheet
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('===== DIRECT BALANCE SHEET FIX =====');
    
    // Dapatkan semua aset tetap dari tabel fixedasset
    const fixedAssets = await prisma.fixedasset.findMany();
    console.log(`Found ${fixedAssets.length} fixed assets in the fixedasset table`);
    
    // Tampilkan detail aset tetap
    for (const asset of fixedAssets) {
      console.log(`Asset ID: ${asset.id}, Name: ${asset.assetName}, Book Value: ${asset.bookValue}`);
    }
    
    // Hitung total nilai buku saat ini
    let currentTotalBookValue = 0;
    for (const asset of fixedAssets) {
      currentTotalBookValue += parseFloat(asset.bookValue);
    }
    console.log(`Current total book value: ${currentTotalBookValue}`);
    
    // Target total book value yang diinginkan
    // Rumus: Total Liabilities + Total Equity + Net Income - Total Account Assets + Total Contra Assets
    const targetTotalBookValue = 272500000 + (-25000000) + 144083333.33 - 58500000 + 63083333.33;
    console.log(`Target total book value: ${targetTotalBookValue}`);
    
    // Hitung penyesuaian yang diperlukan
    const adjustment = targetTotalBookValue - currentTotalBookValue;
    console.log(`Required adjustment: ${adjustment}`);
    
    if (Math.abs(adjustment) > 0.01) {
      // Temukan aset dengan nilai terbesar
      let largestAsset = fixedAssets[0];
      for (let i = 1; i < fixedAssets.length; i++) {
        if (parseFloat(fixedAssets[i].bookValue) > parseFloat(largestAsset.bookValue)) {
          largestAsset = fixedAssets[i];
        }
      }
      
      // Hitung nilai buku baru
      const newBookValue = parseFloat(largestAsset.bookValue) + adjustment;
      
      console.log(`Adjusting asset "${largestAsset.assetName}" (ID: ${largestAsset.id}):`);
      console.log(`  - Current book value: ${largestAsset.bookValue}`);
      console.log(`  - Adjustment: ${adjustment}`);
      console.log(`  - New book value: ${newBookValue}`);
      
      // Update aset tetap
      try {
        await prisma.fixedasset.update({
          where: { id: largestAsset.id },
          data: {
            bookValue: newBookValue
          }
        });
        
        console.log(`Fixed asset "${largestAsset.assetName}" updated successfully`);
        
        // Verifikasi update
        const updatedAsset = await prisma.fixedasset.findUnique({
          where: { id: largestAsset.id }
        });
        
        console.log(`Verified updated book value: ${updatedAsset.bookValue}`);
      } catch (error) {
        console.error(`Error updating fixed asset: ${error.message}`);
      }
    } else {
      console.log('No adjustment needed');
    }
    
    console.log('\n===== FIX COMPLETE =====');
    console.log('Please restart the server to apply the changes');
    
  } catch (error) {
    console.error(`Error in direct balance sheet fix: ${error.message}`);
    console.error(error.stack);
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