/**
 * Depreciation Service
 * Service untuk menghitung penyusutan aset tetap secara otomatis
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');
const { calculateDepreciation } = require('../utils/depreciation');

/**
 * Menghitung penyusutan aset tetap menggunakan metode garis lurus (straight line)
 * @param {Object} asset - Objek aset tetap
 * @returns {Object} - Nilai penyusutan dan nilai buku terbaru
 */
const calculateStraightLineDepreciation = (asset) => {
  const acquisitionDate = new Date(asset.acquisitionDate);
  const currentDate = new Date();
  
  // Hitung umur aset dalam tahun (dengan desimal)
  const ageInYears = (currentDate - acquisitionDate) / (1000 * 60 * 60 * 24 * 365);
  
  // Hitung nilai penyusutan tahunan
  const annualDepreciation = asset.value / asset.usefulLife;
  
  // Hitung akumulasi penyusutan (terbatas pada masa manfaat)
  const totalDepreciation = Math.min(ageInYears, asset.usefulLife) * annualDepreciation;
  
  // Pastikan nilai penyusutan tidak melebihi nilai aset
  const accumulatedDepreciation = Math.min(asset.value, Math.max(0, totalDepreciation));
  
  // Hitung nilai buku
  const bookValue = asset.value - accumulatedDepreciation;
  
  return {
    accumulatedDepreciation: parseFloat(accumulatedDepreciation.toFixed(2)),
    bookValue: parseFloat(bookValue.toFixed(2)),
    depreciationRate: parseFloat((100 / asset.usefulLife).toFixed(2)),
    annualDepreciation: parseFloat(annualDepreciation.toFixed(2)),
    ageInYears: parseFloat(ageInYears.toFixed(2)),
    remainingYears: parseFloat(Math.max(0, asset.usefulLife - ageInYears).toFixed(2))
  };
};

/**
 * Update depreciation for all assets
 * This function is meant to be run as a scheduled job
 */
const updateAllAssetsDepreciation = async () => {
  try {
    logger.info('Starting automatic depreciation update for all assets');
    
    // Get all active fixed assets
    const assets = await prisma.fixedAsset.findMany({
      where: {
        // Only include assets that are not fully depreciated
        bookValue: {
          gt: 0
        }
      }
    });
    
    logger.info(`Found ${assets.length} assets to process for depreciation`);
    
    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
      details: []
    };
    
    // Process each asset
    for (const asset of assets) {
      try {
        results.processed++;
        
        // Calculate current depreciation
        const currentDate = new Date();
        const depreciation = calculateDepreciation(
          asset.value,
          asset.acquisitionDate,
          asset.usefulLife,
          currentDate
        );
        
        // Only update if the calculated depreciation is different from the stored one
        if (Math.abs(depreciation.accumulatedDepreciation - asset.accumulatedDepreciation) > 0.01) {
          // Update the asset with new depreciation values
          await prisma.fixedAsset.update({
            where: {
              id: asset.id
            },
            data: {
              accumulatedDepreciation: depreciation.accumulatedDepreciation,
              bookValue: depreciation.bookValue
            }
          });
          
          results.updated++;
          results.details.push({
            assetId: asset.id,
            assetName: asset.assetName,
            previousAccumulatedDepreciation: asset.accumulatedDepreciation,
            newAccumulatedDepreciation: depreciation.accumulatedDepreciation,
            previousBookValue: asset.bookValue,
            newBookValue: depreciation.bookValue
          });
          
          logger.info(`Updated depreciation for asset ${asset.assetName} (ID: ${asset.id})`);
        }
      } catch (error) {
        results.errors++;
        logger.error(`Error updating depreciation for asset ${asset.id}`, { error: error.message });
      }
    }
    
    logger.info('Completed automatic depreciation update', { results });
    return results;
  } catch (error) {
    logger.error('Failed to update asset depreciation', { error: error.message });
    throw error;
  }
};

/**
 * Record monthly depreciation for all eligible assets
 * This creates accounting entries for depreciation
 * @param {Date} depreciationDate - The date to record depreciation for (defaults to current date)
 */
const recordMonthlyDepreciation = async (depreciationDate = new Date()) => {
  try {
    logger.info('Starting monthly depreciation recording');
    
    // Get all active fixed assets
    const assets = await prisma.fixedAsset.findMany({
      where: {
        // Only include assets that are not fully depreciated
        bookValue: {
          gt: 0
        }
      }
    });
    
    logger.info(`Found ${assets.length} assets to process for monthly depreciation`);
    
    const results = {
      processed: 0,
      recorded: 0,
      errors: 0,
      details: []
    };
    
    // Get default depreciation expense and accumulated depreciation accounts
    const depreciationExpenseAccount = await prisma.account.findFirst({
      where: {
        code: '6101' // Depreciation Expense account
      }
    });
    
    const accumulatedDepreciationAccount = await prisma.account.findFirst({
      where: {
        code: '1599' // Accumulated Depreciation account
      }
    });
    
    if (!depreciationExpenseAccount || !accumulatedDepreciationAccount) {
      throw new Error('Default depreciation accounts not found');
    }
    
    // Process each asset
    for (const asset of assets) {
      try {
        results.processed++;
        
        // Calculate monthly depreciation
        const depreciationPerYear = asset.value / asset.usefulLife;
        const depreciationPerMonth = depreciationPerYear / 12;
        
        // Don't depreciate more than the remaining book value
        const depreciationAmount = Math.min(depreciationPerMonth, asset.bookValue);
        
        if (depreciationAmount <= 0) {
          continue; // Skip if no depreciation to record
        }
        
        // Update the asset with new depreciation values
        const newAccumulatedDepreciation = asset.accumulatedDepreciation + depreciationAmount;
        const newBookValue = Math.max(0, asset.value - newAccumulatedDepreciation);
        
        await prisma.fixedAsset.update({
          where: {
            id: asset.id
          },
          data: {
            accumulatedDepreciation: newAccumulatedDepreciation,
            bookValue: newBookValue
          }
        });
        
        // Create accounting transaction for the depreciation
        const transaction = await prisma.transaction.create({
          data: {
            date: depreciationDate,
            description: `Monthly depreciation for ${asset.assetName}`,
            type: 'Depreciation',
            amount: depreciationAmount,
            entries: {
              create: [
                // Debit entry (Depreciation Expense account)
                {
                  accountId: depreciationExpenseAccount.id,
                  type: 'debit',
                  amount: depreciationAmount,
                  description: `Depreciation expense for ${asset.assetName}`
                },
                // Credit entry (Accumulated Depreciation account)
                {
                  accountId: accumulatedDepreciationAccount.id,
                  type: 'credit',
                  amount: depreciationAmount,
                  description: `Accumulated depreciation for ${asset.assetName}`
                }
              ]
            },
            metadata: {
              assetId: asset.id,
              assetName: asset.assetName,
              depreciationRecord: true,
              monthlyDepreciation: true
            }
          }
        });
        
        results.recorded++;
        results.details.push({
          assetId: asset.id,
          assetName: asset.assetName,
          depreciationAmount,
          newAccumulatedDepreciation,
          newBookValue,
          transactionId: transaction.id
        });
        
        logger.info(`Recorded monthly depreciation for asset ${asset.assetName} (ID: ${asset.id})`);
      } catch (error) {
        results.errors++;
        logger.error(`Error recording depreciation for asset ${asset.id}`, { error: error.message });
      }
    }
    
    logger.info('Completed monthly depreciation recording', { results });
    return results;
  } catch (error) {
    logger.error('Failed to record monthly depreciation', { error: error.message });
    throw error;
  }
};

/**
 * Generate a depreciation schedule for an asset
 * @param {Object} asset - The fixed asset object
 * @returns {Array} - Array of yearly depreciation entries
 */
const generateDepreciationSchedule = (asset) => {
  try {
    const acquisitionDate = new Date(asset.acquisitionDate);
    const acquisitionYear = acquisitionDate.getFullYear();
    const acquisitionMonth = acquisitionDate.getMonth();
    const acquisitionDay = acquisitionDate.getDate();
    
    const annualDepreciation = asset.value / asset.usefulLife;
    const schedule = [];
    
    // Calculate first year's depreciation (partial year)
    const firstYearMonths = 12 - acquisitionMonth;
    const firstYearRatio = firstYearMonths / 12;
    const firstYearDepreciation = annualDepreciation * firstYearRatio;
    
    let accumulatedDepreciation = firstYearDepreciation;
    let bookValue = asset.value - firstYearDepreciation;
    
    // Add first year entry
    schedule.push({
      year: acquisitionYear,
      beginningValue: asset.value,
      annualDepreciation: parseFloat(firstYearDepreciation.toFixed(2)),
      accumulatedDepreciation: parseFloat(accumulatedDepreciation.toFixed(2)),
      endingValue: parseFloat(bookValue.toFixed(2)),
      depreciationRatio: parseFloat((firstYearRatio * 100).toFixed(2))
    });
    
    // Calculate remaining years
    for (let i = 1; i < asset.usefulLife; i++) {
      const yearDepreciation = i < asset.usefulLife - 1 
        ? annualDepreciation 
        : Math.min(annualDepreciation, bookValue); // Ensure we don't go below zero
        
      const beginningValue = bookValue;
      accumulatedDepreciation += yearDepreciation;
      bookValue = Math.max(0, bookValue - yearDepreciation);
      
      schedule.push({
        year: acquisitionYear + i,
        beginningValue: parseFloat(beginningValue.toFixed(2)),
        annualDepreciation: parseFloat(yearDepreciation.toFixed(2)),
        accumulatedDepreciation: parseFloat(accumulatedDepreciation.toFixed(2)),
        endingValue: parseFloat(bookValue.toFixed(2)),
        depreciationRatio: 100  // Full year
      });
      
      // If fully depreciated, break
      if (bookValue <= 0) {
        break;
      }
    }
    
    // Add final partial year if needed
    if (bookValue > 0 && schedule.length < asset.usefulLife + 1) {
      const finalYearDepreciation = bookValue;
      accumulatedDepreciation += finalYearDepreciation;
      
      schedule.push({
        year: acquisitionYear + schedule.length,
        beginningValue: parseFloat(bookValue.toFixed(2)),
        annualDepreciation: parseFloat(finalYearDepreciation.toFixed(2)),
        accumulatedDepreciation: parseFloat(accumulatedDepreciation.toFixed(2)),
        endingValue: 0,
        depreciationRatio: parseFloat(((finalYearDepreciation / annualDepreciation) * 100).toFixed(2))
      });
    }
    
    return schedule;
  } catch (error) {
    logger.error('Error generating depreciation schedule', { error: error.message });
    throw error;
  }
};

// Export all functions
module.exports = {
  calculateStraightLineDepreciation,
  updateAllAssetsDepreciation,
  recordMonthlyDepreciation,
  generateDepreciationSchedule
}; 