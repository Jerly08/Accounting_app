/**
 * Depreciation Service
 * Service untuk menghitung penyusutan aset tetap secara otomatis
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
 * Update penyusutan semua aset tetap
 * @returns {Promise<Object>} - Hasil update penyusutan
 */
const updateAllAssetsDepreciation = async () => {
  try {
    // Ambil semua aset tetap
    const assets = await prisma.fixedasset.findMany();
    
    let updatedCount = 0;
    let errors = [];
    
    // Update penyusutan untuk setiap aset
    for (const asset of assets) {
      try {
        const { accumulatedDepreciation, bookValue } = calculateStraightLineDepreciation(asset);
        
        // Update aset dengan nilai penyusutan terbaru
        await prisma.fixedasset.update({
          where: { id: asset.id },
          data: {
            accumulatedDepreciation,
            bookValue,
            updatedAt: new Date()
          }
        });
        
        updatedCount++;
      } catch (error) {
        errors.push({
          assetId: asset.id,
          assetName: asset.assetName,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      updatedCount,
      totalAssets: assets.length,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    console.error('Error updating asset depreciation:', error);
    return {
      success: false,
      message: 'Failed to update asset depreciation',
      error: error.message
    };
  }
};

/**
 * Update penyusutan untuk satu aset tetap berdasarkan ID
 * @param {number} assetId - ID aset tetap
 * @returns {Promise<Object>} - Hasil update penyusutan
 */
const updateAssetDepreciation = async (assetId) => {
  try {
    // Ambil aset tetap berdasarkan ID
    const asset = await prisma.fixedasset.findUnique({
      where: { id: parseInt(assetId) }
    });
    
    if (!asset) {
      return {
        success: false,
        message: 'Asset not found'
      };
    }
    
    // Hitung penyusutan
    const { accumulatedDepreciation, bookValue } = calculateStraightLineDepreciation(asset);
    
    // Update aset dengan nilai penyusutan terbaru
    const updatedAsset = await prisma.fixedasset.update({
      where: { id: asset.id },
      data: {
        accumulatedDepreciation,
        bookValue,
        updatedAt: new Date()
      }
    });
    
    return {
      success: true,
      data: updatedAsset
    };
  } catch (error) {
    console.error('Error updating asset depreciation:', error);
    return {
      success: false,
      message: 'Failed to update asset depreciation',
      error: error.message
    };
  }
};

module.exports = {
  calculateStraightLineDepreciation,
  updateAllAssetsDepreciation,
  updateAssetDepreciation
}; 