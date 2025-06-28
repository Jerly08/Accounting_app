const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateDepreciation } = require('../utils/depreciation');

// Get all fixed assets
exports.getAllAssets = async (req, res) => {
  try {
    const assets = await prisma.fixedAsset.findMany({
      orderBy: {
        acquisitionDate: 'desc',
      },
    });

    return res.json({
      success: true,
      data: assets,
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assets',
      error: error.message,
    });
  }
};

// Get a single fixed asset by ID
exports.getAssetById = async (req, res) => {
  const { id } = req.params;

  try {
    const asset = await prisma.fixedAsset.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    return res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch asset',
      error: error.message,
    });
  }
};

// Create a new fixed asset
exports.createAsset = async (req, res) => {
  const {
    assetName,
    category,
    acquisitionDate,
    value,
    usefulLife,
    description,
    location,
    assetTag,
    accumulatedDepreciation = 0,
    bookValue,
    accounting, // New field for accounting integration
  } = req.body;

  try {
    // Create the fixed asset
    const asset = await prisma.fixedAsset.create({
      data: {
        assetName,
        category,
        acquisitionDate: new Date(acquisitionDate),
        value,
        usefulLife,
        description,
        location,
        assetTag,
        accumulatedDepreciation,
        bookValue: bookValue || value - accumulatedDepreciation,
      },
    });

    // If accounting data is provided, create a double-entry transaction
    if (accounting && accounting.fixedAssetAccountCode && accounting.paymentAccountCode) {
      // Get the accounts
      const fixedAssetAccount = await prisma.account.findUnique({
        where: { code: accounting.fixedAssetAccountCode },
      });

      const paymentAccount = await prisma.account.findUnique({
        where: { code: accounting.paymentAccountCode },
      });

      if (!fixedAssetAccount || !paymentAccount) {
        console.error('One or more accounts not found');
        return res.status(400).json({
          success: false,
          message: 'One or more accounts not found',
        });
      }

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          date: new Date(acquisitionDate),
          description: accounting.transactionDescription || `Purchase of fixed asset: ${assetName}`,
          type: 'Asset Purchase',
          amount: value,
          entries: {
            create: [
              // Debit entry (Fixed Asset account)
              {
                accountId: fixedAssetAccount.id,
                type: 'debit',
                amount: value,
                description: `Acquisition of ${assetName}`,
              },
              // Credit entry (Payment account)
              {
                accountId: paymentAccount.id,
                type: 'credit',
                amount: value,
                description: `Payment for ${assetName}`,
              },
            ],
          },
          metadata: {
            assetId: asset.id,
            assetName: assetName,
            category: category,
          },
        },
        include: {
          entries: {
            include: {
              account: true,
            },
          },
        },
      });

      // Return the asset with transaction info
      return res.status(201).json({
        success: true,
        data: asset,
        transaction: transaction,
        message: 'Asset created with accounting entries',
      });
    }

    // If no accounting data, just return the asset
    return res.status(201).json({
      success: true,
      data: asset,
      message: 'Asset created successfully',
    });
  } catch (error) {
    console.error('Error creating asset:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create asset',
      error: error.message,
    });
  }
};

// Update an existing fixed asset
exports.updateAsset = async (req, res) => {
  const { id } = req.params;
  const {
    assetName,
    category,
    acquisitionDate,
    value,
    usefulLife,
    description,
    location,
    assetTag,
    accumulatedDepreciation,
    bookValue,
  } = req.body;

  try {
    const asset = await prisma.fixedAsset.update({
      where: {
        id: parseInt(id),
      },
      data: {
        assetName,
        category,
        acquisitionDate: new Date(acquisitionDate),
        value,
        usefulLife,
        description,
        location,
        assetTag,
        accumulatedDepreciation,
        bookValue: bookValue || value - accumulatedDepreciation,
      },
    });

    return res.json({
      success: true,
      data: asset,
      message: 'Asset updated successfully',
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update asset',
      error: error.message,
    });
  }
};

// Delete a fixed asset
exports.deleteAsset = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the asset exists
    const existingAsset = await prisma.fixedAsset.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    // Delete the asset
    await prisma.fixedAsset.delete({
      where: {
        id: parseInt(id),
      },
    });

    return res.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete asset',
      error: error.message,
    });
  }
};

// Calculate depreciation for an asset
exports.calculateAssetDepreciation = async (req, res) => {
  const { id } = req.params;
  const { toDate } = req.query;

  try {
    const asset = await prisma.fixedAsset.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    const calculationDate = toDate ? new Date(toDate) : new Date();
    const depreciation = calculateDepreciation(
      asset.value,
      asset.acquisitionDate,
      asset.usefulLife,
      calculationDate
    );

    return res.json({
      success: true,
      data: {
        asset,
        depreciation: {
          accumulatedDepreciation: depreciation.accumulatedDepreciation,
          bookValue: depreciation.bookValue,
          depreciationPerYear: depreciation.depreciationPerYear,
          depreciationPerMonth: depreciation.depreciationPerMonth,
          monthsElapsed: depreciation.monthsElapsed,
          yearsElapsed: depreciation.yearsElapsed,
          remainingMonths: depreciation.remainingMonths,
          remainingYears: depreciation.remainingYears,
          isFullyDepreciated: depreciation.isFullyDepreciated,
        },
      },
    });
  } catch (error) {
    console.error('Error calculating depreciation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate depreciation',
      error: error.message,
    });
  }
};

// Record depreciation for a specific period
exports.recordDepreciation = async (req, res) => {
  const { id } = req.params;
  const { 
    depreciationAmount, 
    depreciationDate,
    createAccountingEntry = false,
    expenseAccountCode,
    accumulatedDepreciationAccountCode
  } = req.body;

  try {
    // Get the asset
    const asset = await prisma.fixedAsset.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    // Update the asset with new depreciation values
    const newAccumulatedDepreciation = asset.accumulatedDepreciation + depreciationAmount;
    const newBookValue = Math.max(0, asset.value - newAccumulatedDepreciation);

    const updatedAsset = await prisma.fixedAsset.update({
      where: {
        id: parseInt(id),
      },
      data: {
        accumulatedDepreciation: newAccumulatedDepreciation,
        bookValue: newBookValue,
      },
    });

    // Create accounting entries if requested
    let transaction = null;
    if (createAccountingEntry && expenseAccountCode && accumulatedDepreciationAccountCode) {
      // Get the accounts
      const expenseAccount = await prisma.account.findUnique({
        where: { code: expenseAccountCode },
      });

      const accumulatedDepreciationAccount = await prisma.account.findUnique({
        where: { code: accumulatedDepreciationAccountCode },
      });

      if (!expenseAccount || !accumulatedDepreciationAccount) {
        return res.status(400).json({
          success: false,
          message: 'One or more accounts not found',
          data: updatedAsset,
        });
      }

      // Create transaction
      transaction = await prisma.transaction.create({
        data: {
          date: new Date(depreciationDate || new Date()),
          description: `Depreciation for ${asset.assetName}`,
          type: 'Depreciation',
          amount: depreciationAmount,
          entries: {
            create: [
              // Debit entry (Depreciation Expense account)
              {
                accountId: expenseAccount.id,
                type: 'debit',
                amount: depreciationAmount,
                description: `Depreciation expense for ${asset.assetName}`,
              },
              // Credit entry (Accumulated Depreciation account)
              {
                accountId: accumulatedDepreciationAccount.id,
                type: 'credit',
                amount: depreciationAmount,
                description: `Accumulated depreciation for ${asset.assetName}`,
              },
            ],
          },
          metadata: {
            assetId: asset.id,
            assetName: asset.assetName,
            depreciationRecord: true,
          },
        },
        include: {
          entries: {
            include: {
              account: true,
            },
          },
        },
      });
    }

    return res.json({
      success: true,
      data: updatedAsset,
      transaction: transaction,
      message: 'Depreciation recorded successfully',
    });
  } catch (error) {
    console.error('Error recording depreciation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record depreciation',
      error: error.message,
    });
  }
};

// Get depreciation schedule for an asset
exports.getDepreciationSchedule = async (req, res) => {
  const { id } = req.params;

  try {
    const asset = await prisma.fixedAsset.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    // Generate depreciation schedule
    const schedule = [];
    const acquisitionDate = new Date(asset.acquisitionDate);
    const depreciationPerYear = asset.value / asset.usefulLife;
    const depreciationPerMonth = depreciationPerYear / 12;
    
    let accumulatedDepreciation = 0;
    let bookValue = asset.value;
    
    // Generate schedule for each year
    for (let year = 0; year < asset.usefulLife; year++) {
      const yearDepreciation = Math.min(depreciationPerYear, bookValue);
      accumulatedDepreciation += yearDepreciation;
      bookValue = asset.value - accumulatedDepreciation;
      
      // Ensure book value doesn't go below zero
      if (bookValue < 0) bookValue = 0;
      
      schedule.push({
        year: year + 1,
        date: new Date(acquisitionDate.getFullYear() + year, acquisitionDate.getMonth(), acquisitionDate.getDate()),
        depreciation: yearDepreciation,
        accumulatedDepreciation,
        bookValue,
      });
      
      // If fully depreciated, stop
      if (bookValue === 0) break;
    }

    return res.json({
      success: true,
      data: {
        asset,
        schedule,
        depreciationMethod: 'Straight Line',
        depreciationPerYear,
        depreciationPerMonth,
      },
    });
  } catch (error) {
    console.error('Error generating depreciation schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate depreciation schedule',
      error: error.message,
    });
  }
}; 