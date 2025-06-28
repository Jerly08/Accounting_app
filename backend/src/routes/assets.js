const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth, authorize } = require('../middleware/auth');
const depreciationService = require('../services/depreciation');
const doubleEntryService = require('../services/doubleEntryService');
const logger = require('../utils/logger');
const prismaUtil = require('../utils/prisma');

const prisma = prismaUtil.prisma;

/**
 * @route   GET /api/assets
 * @desc    Get all fixed assets with optional filtering
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { search, category, status, limit, page } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Build filter conditions
    let where = {};
    if (search) {
      where = {
        OR: [
          { assetName: { contains: search } },
          { category: { contains: search } }
        ]
      };
    }

    if (category) {
      where.category = category;
    }

    // Get assets with pagination
    const assets = await prisma.fixedAsset.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { acquisitionDate: 'desc' }
      ]
    });

    // Get total count for pagination
    const total = await prisma.fixedAsset.count({ where });

    // Get total value
    const totalValue = await prisma.fixedAsset.aggregate({
      where,
      _sum: {
        value: true
      }
    });

    // Calculate current values and add to response
    const assetsWithCurrentValue = assets.map(asset => {
      const currentValue = asset.bookValue;
      const depreciationToDate = parseFloat(asset.value.toString()) - parseFloat(asset.bookValue.toString());

      return {
        ...asset,
        currentValue,
        depreciationToDate
      };
    });

    res.json({
      success: true,
      data: assetsWithCurrentValue,
      summary: {
        totalValue: totalValue._sum.value || 0
      },
      pagination: {
        page: pageNumber,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data aset tetap',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/assets/:id
 * @desc    Get single asset by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await prisma.fixedAsset.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asset) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aset tidak ditemukan' 
      });
    }

    // Calculate current value
    const currentValue = asset.bookValue;
    const depreciationToDate = parseFloat(asset.value.toString()) - parseFloat(asset.bookValue.toString());

    const assetWithCurrentValue = {
      ...asset,
      currentValue,
      depreciationToDate
    };

    res.json({
      success: true,
      data: assetWithCurrentValue
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data aset',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assets
 * @desc    Create new fixed asset with double-entry transactions
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { assetName, category, acquisitionDate, value, usefulLife, description, location, assetTag } = req.body;
    
    // Validate required fields
    if (!assetName || !acquisitionDate || !value || !usefulLife) {
      return res.status(400).json({
        success: false,
        message: 'Nama aset, tanggal perolehan, nilai, dan masa manfaat wajib diisi'
      });
    }

    // Validate category if provided
    const validCategories = ['equipment', 'vehicle', 'building', 'land', 'furniture', 'other'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Kategori aset tidak valid',
        validCategories
      });
    }

    // Convert to appropriate types
    const assetValue = parseFloat(value);
    const assetUsefulLife = parseInt(usefulLife);

    // Validate numeric values
    if (isNaN(assetValue) || assetValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nilai aset harus berupa angka positif'
      });
    }

    if (isNaN(assetUsefulLife) || assetUsefulLife <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Masa manfaat harus berupa angka positif'
      });
    }

    // Calculate accumulated depreciation and book value
    const acquisitionDateObj = new Date(acquisitionDate);
    const currentDate = new Date();
    const ageInYears = (currentDate - acquisitionDateObj) / (1000 * 60 * 60 * 24 * 365);
    const depreciation = Math.min(ageInYears, assetUsefulLife) * (assetValue / assetUsefulLife);
    const accumulatedDepreciation = Math.min(assetValue, Math.max(0, depreciation));
    const bookValue = assetValue - accumulatedDepreciation;

    // Gunakan transaksi database untuk memastikan semua operasi berhasil atau gagal bersama-sama
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Buat catatan aset tetap
      const asset = await prisma.fixedAsset.create({
        data: {
          assetName,
          category: category || "equipment", // Default to equipment if not provided
          acquisitionDate: acquisitionDateObj,
          value: assetValue,
          usefulLife: assetUsefulLife,
          accumulatedDepreciation,
          bookValue,
          updatedAt: new Date()
        }
      });

      // 2. Tentukan kode akun aset tetap berdasarkan kategori
      let fixedAssetAccountCode;
      switch(category) {
        case 'equipment':
          fixedAssetAccountCode = '1501'; // Mesin Boring (sebagai contoh untuk equipment)
          break;
        case 'vehicle':
          fixedAssetAccountCode = '1503'; // Kendaraan Operasional
          break;
        case 'building':
          fixedAssetAccountCode = '1505'; // Bangunan Kantor
          break;
        case 'office':
          fixedAssetAccountCode = '1504'; // Peralatan Kantor
          break;
        default:
          fixedAssetAccountCode = '1501'; // Default ke Mesin Boring
      }

      // 3. Buat transaksi debit ke akun aset tetap
      const debitTransaction = await prisma.transaction.create({
        data: {
          date: acquisitionDateObj,
          type: 'Aset Tetap',
          accountCode: fixedAssetAccountCode,
          description: `Pembelian aset tetap: ${assetName}`,
          amount: assetValue,
          notes: description || `Kategori: ${category}, Lokasi: ${location || 'N/A'}, Tag: ${assetTag || 'N/A'}`,
          updatedAt: new Date()
        }
      });

      // 4. Buat transaksi kredit ke akun kas/bank (default ke Bank BCA)
      const creditTransaction = await prisma.transaction.create({
        data: {
          date: acquisitionDateObj,
          type: 'Pengeluaran',
          accountCode: '1102', // Bank BCA
          description: `Pembayaran untuk aset tetap: ${assetName}`,
          amount: -assetValue, // Nilai negatif untuk kredit
          notes: `Referensi ke pembelian aset tetap ID: ${asset.id}`,
          updatedAt: new Date()
        }
      });

      // 5. Jika ada penyusutan, buat entri penyusutan
      if (accumulatedDepreciation > 0) {
        // Tentukan kode akun akumulasi penyusutan berdasarkan kategori
        let accDepreciationAccountCode;
        switch(category) {
          case 'equipment':
            accDepreciationAccountCode = '1601'; // Akumulasi Penyusutan Mesin Boring
            break;
          case 'vehicle':
            accDepreciationAccountCode = '1603'; // Akumulasi Penyusutan Kendaraan
            break;
          case 'building':
            accDepreciationAccountCode = '1605'; // Akumulasi Penyusutan Bangunan
            break;
          case 'office':
            accDepreciationAccountCode = '1604'; // Akumulasi Penyusutan Peralatan Kantor
            break;
          default:
            accDepreciationAccountCode = '1601'; // Default ke Akumulasi Penyusutan Mesin Boring
        }

        // Buat transaksi debit ke beban penyusutan
        const depreciationDebitTransaction = await prisma.transaction.create({
          data: {
            date: currentDate,
            type: 'Beban',
            accountCode: '6105', // Beban Penyusutan
            description: `Penyusutan aset: ${assetName}`,
            amount: accumulatedDepreciation,
            notes: `Penyusutan otomatis untuk aset tetap ID: ${asset.id}`,
            updatedAt: new Date()
          }
        });

        // Buat transaksi kredit ke akumulasi penyusutan
        const depreciationCreditTransaction = await prisma.transaction.create({
          data: {
            date: currentDate,
            type: 'Akumulasi Penyusutan',
            accountCode: accDepreciationAccountCode,
            description: `Akumulasi penyusutan: ${assetName}`,
            amount: -accumulatedDepreciation, // Nilai negatif untuk kredit
            notes: `Penyusutan otomatis untuk aset tetap ID: ${asset.id}`,
            updatedAt: new Date()
          }
        });
      }

      return {
        asset,
        debitTransaction,
        creditTransaction
      };
    });

    res.status(201).json({
      success: true,
      message: 'Aset tetap berhasil ditambahkan dengan pencatatan double-entry',
      data: result.asset,
      transactions: {
        debit: result.debitTransaction,
        credit: result.creditTransaction
      }
    });
  } catch (error) {
    console.error('Error adding fixed asset:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menambahkan aset tetap',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/assets/:id
 * @desc    Update fixed asset with double-entry transactions for adjustments
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { assetName, category, acquisitionDate, value, usefulLife, description, location, assetTag } = req.body;

    // Check if asset exists
    const existingAsset = await prisma.fixedAsset.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: 'Aset tetap tidak ditemukan'
      });
    }

    // Validate category if provided
    const validCategories = ['equipment', 'vehicle', 'building', 'land', 'furniture', 'other'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Kategori aset tidak valid',
        validCategories
      });
    }

    // Prepare update data
    const updateData = {};
    
    if (assetName) {
      updateData.assetName = assetName;
    }
    
    if (category) {
      updateData.category = category;
    }

    if (acquisitionDate) {
      updateData.acquisitionDate = new Date(acquisitionDate);
    }
    
    // Always add updatedAt field
    updateData.updatedAt = new Date();

    // Convert to appropriate types if provided
    let assetValue = undefined;
    let assetUsefulLife = undefined;

    if (value) {
      assetValue = parseFloat(value);
      if (isNaN(assetValue) || assetValue <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Nilai aset harus berupa angka positif'
        });
      }
      updateData.value = assetValue;
    }

    if (usefulLife) {
      assetUsefulLife = parseInt(usefulLife);
      if (isNaN(assetUsefulLife) || assetUsefulLife <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Masa manfaat harus berupa angka positif'
        });
      }
      updateData.usefulLife = assetUsefulLife;
    }

    // Recalculate depreciation if any value affecting it has changed
    const acquisitionDateObj = updateData.acquisitionDate || existingAsset.acquisitionDate;
    const valueToUse = assetValue || existingAsset.value;
    const usefulLifeToUse = assetUsefulLife || existingAsset.usefulLife;
    
    const currentDate = new Date();
    const ageInYears = (currentDate - acquisitionDateObj) / (1000 * 60 * 60 * 24 * 365);
    const depreciation = Math.min(ageInYears, usefulLifeToUse) * (valueToUse / usefulLifeToUse);
    updateData.accumulatedDepreciation = Math.min(valueToUse, Math.max(0, depreciation));
    updateData.bookValue = valueToUse - updateData.accumulatedDepreciation;

    // Gunakan transaksi database untuk memastikan semua operasi berhasil atau gagal bersama-sama
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Update aset tetap
      const updatedAsset = await prisma.fixedAsset.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      // 2. Jika nilai aset berubah, buat transaksi penyesuaian
      const transactions = [];
      if (assetValue && assetValue !== existingAsset.value) {
        const valueDifference = assetValue - existingAsset.value;
        
        // Tentukan kode akun aset tetap berdasarkan kategori
        let fixedAssetAccountCode;
        const categoryToUse = category || existingAsset.category;
        
        switch(categoryToUse) {
          case 'equipment':
            fixedAssetAccountCode = '1501'; // Mesin Boring
            break;
          case 'vehicle':
            fixedAssetAccountCode = '1503'; // Kendaraan Operasional
            break;
          case 'building':
            fixedAssetAccountCode = '1505'; // Bangunan Kantor
            break;
          case 'office':
            fixedAssetAccountCode = '1504'; // Peralatan Kantor
            break;
          default:
            fixedAssetAccountCode = '1501'; // Default ke Mesin Boring
        }

        if (valueDifference > 0) {
          // Jika nilai bertambah, buat transaksi debit ke aset tetap dan kredit ke kas/bank
          const debitTransaction = await prisma.transaction.create({
            data: {
              date: currentDate,
              type: 'Aset Tetap',
              accountCode: fixedAssetAccountCode,
              description: `Penyesuaian nilai aset tetap: ${updatedAsset.assetName}`,
              amount: valueDifference,
              notes: `Penambahan nilai aset tetap ID: ${updatedAsset.id}`,
              updatedAt: new Date()
            }
          });
          transactions.push(debitTransaction);

          const creditTransaction = await prisma.transaction.create({
            data: {
              date: currentDate,
              type: 'Pengeluaran',
              accountCode: '1102', // Bank BCA
              description: `Pembayaran untuk penyesuaian aset tetap: ${updatedAsset.assetName}`,
              amount: -valueDifference, // Nilai negatif untuk kredit
              notes: `Penambahan nilai aset tetap ID: ${updatedAsset.id}`,
              updatedAt: new Date()
            }
          });
          transactions.push(creditTransaction);
        } else if (valueDifference < 0) {
          // Jika nilai berkurang, buat transaksi debit ke kas/bank dan kredit ke aset tetap
          const debitTransaction = await prisma.transaction.create({
            data: {
              date: currentDate,
              type: 'Penerimaan',
              accountCode: '1102', // Bank BCA
              description: `Pengembalian dari penyesuaian aset tetap: ${updatedAsset.assetName}`,
              amount: -valueDifference, // Nilai positif karena valueDifference negatif
              notes: `Pengurangan nilai aset tetap ID: ${updatedAsset.id}`,
              updatedAt: new Date()
            }
          });
          transactions.push(debitTransaction);

          const creditTransaction = await prisma.transaction.create({
            data: {
              date: currentDate,
              type: 'Aset Tetap',
              accountCode: fixedAssetAccountCode,
              description: `Penyesuaian nilai aset tetap: ${updatedAsset.assetName}`,
              amount: valueDifference, // Nilai negatif untuk kredit
              notes: `Pengurangan nilai aset tetap ID: ${updatedAsset.id}`,
              updatedAt: new Date()
            }
          });
          transactions.push(creditTransaction);
        }
      }

      // 3. Jika ada perubahan pada penyusutan, buat transaksi penyesuaian
      if (updateData.accumulatedDepreciation !== existingAsset.accumulatedDepreciation) {
        const depreciationDifference = updateData.accumulatedDepreciation - existingAsset.accumulatedDepreciation;
        
        if (depreciationDifference !== 0) {
          // Tentukan kode akun akumulasi penyusutan berdasarkan kategori
          let accDepreciationAccountCode;
          const categoryToUse = category || existingAsset.category;
          
          switch(categoryToUse) {
            case 'equipment':
              accDepreciationAccountCode = '1601'; // Akumulasi Penyusutan Mesin Boring
              break;
            case 'vehicle':
              accDepreciationAccountCode = '1603'; // Akumulasi Penyusutan Kendaraan
              break;
            case 'building':
              accDepreciationAccountCode = '1605'; // Akumulasi Penyusutan Bangunan
              break;
            case 'office':
              accDepreciationAccountCode = '1604'; // Akumulasi Penyusutan Peralatan Kantor
              break;
            default:
              accDepreciationAccountCode = '1601'; // Default ke Akumulasi Penyusutan Mesin Boring
          }

          // Buat transaksi debit ke beban penyusutan
          const depreciationDebitTransaction = await prisma.transaction.create({
            data: {
              date: currentDate,
              type: 'Beban',
              accountCode: '6105', // Beban Penyusutan
              description: `Penyesuaian penyusutan aset: ${updatedAsset.assetName}`,
              amount: depreciationDifference,
              notes: `Penyesuaian penyusutan untuk aset tetap ID: ${updatedAsset.id}`,
              updatedAt: new Date()
            }
          });
          transactions.push(depreciationDebitTransaction);

          // Buat transaksi kredit ke akumulasi penyusutan
          const depreciationCreditTransaction = await prisma.transaction.create({
            data: {
              date: currentDate,
              type: 'Akumulasi Penyusutan',
              accountCode: accDepreciationAccountCode,
              description: `Penyesuaian akumulasi penyusutan: ${updatedAsset.assetName}`,
              amount: -depreciationDifference, // Nilai negatif untuk kredit
              notes: `Penyesuaian penyusutan untuk aset tetap ID: ${updatedAsset.id}`,
              updatedAt: new Date()
            }
          });
          transactions.push(depreciationCreditTransaction);
        }
      }

      return {
        updatedAsset,
        transactions
      };
    });

    res.json({
      success: true,
      message: 'Aset tetap berhasil diperbarui dengan pencatatan double-entry',
      data: result.updatedAsset,
      transactions: result.transactions
    });
  } catch (error) {
    console.error('Error updating fixed asset:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui aset tetap',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assets/:id/depreciate
 * @desc    Apply depreciation to a fixed asset with double-entry transactions
 * @access  Private
 */
router.post('/:id/depreciate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;

    // Default to current date if not provided
    const depreciationDate = date ? new Date(date) : new Date();

    // Check if asset exists
    const asset = await prisma.fixedAsset.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Aset tetap tidak ditemukan'
      });
    }

    // Calculate appropriate depreciation
    const acquisitionDate = new Date(asset.acquisitionDate);
    const ageInYears = (depreciationDate - acquisitionDate) / (1000 * 60 * 60 * 24 * 365);
    const depreciation = Math.min(ageInYears, asset.usefulLife) * (asset.value / asset.usefulLife);
    const newAccumulatedDepreciation = Math.min(asset.value, Math.max(0, depreciation));
    const newBookValue = asset.value - newAccumulatedDepreciation;
    
    // Hitung selisih penyusutan
    const depreciationDifference = newAccumulatedDepreciation - asset.accumulatedDepreciation;
    
    // Jika tidak ada perubahan penyusutan, kembalikan respons tanpa perubahan
    if (depreciationDifference <= 0) {
      return res.json({
        success: true,
        message: 'Tidak ada perubahan penyusutan',
        data: asset
      });
    }

    // Gunakan transaksi database untuk memastikan semua operasi berhasil atau gagal bersama-sama
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Update aset tetap dengan nilai penyusutan baru
      const updatedAsset = await prisma.fixedAsset.update({
        where: { id: parseInt(id) },
        data: {
          accumulatedDepreciation: newAccumulatedDepreciation,
          bookValue: newBookValue,
          updatedAt: new Date()
        }
      });
      
      // 2. Tentukan kode akun akumulasi penyusutan berdasarkan kategori
      let accDepreciationAccountCode;
      
      switch(asset.category) {
        case 'equipment':
          accDepreciationAccountCode = '1601'; // Akumulasi Penyusutan Mesin Boring
          break;
        case 'vehicle':
          accDepreciationAccountCode = '1603'; // Akumulasi Penyusutan Kendaraan
          break;
        case 'building':
          accDepreciationAccountCode = '1605'; // Akumulasi Penyusutan Bangunan
          break;
        case 'office':
          accDepreciationAccountCode = '1604'; // Akumulasi Penyusutan Peralatan Kantor
          break;
        default:
          accDepreciationAccountCode = '1601'; // Default ke Akumulasi Penyusutan Mesin Boring
      }
      
      // 3. Buat transaksi debit ke beban penyusutan
      const depreciationDebitTransaction = await prisma.transaction.create({
        data: {
          date: depreciationDate,
          type: 'Beban',
          accountCode: '6105', // Beban Penyusutan
          description: `Penyusutan aset: ${asset.assetName}`,
          amount: depreciationDifference,
          notes: `Penyusutan manual untuk aset tetap ID: ${asset.id}`,
          updatedAt: new Date()
        }
      });
      
      // 4. Buat transaksi kredit ke akumulasi penyusutan
      const depreciationCreditTransaction = await prisma.transaction.create({
        data: {
          date: depreciationDate,
          type: 'Akumulasi Penyusutan',
          accountCode: accDepreciationAccountCode,
          description: `Akumulasi penyusutan: ${asset.assetName}`,
          amount: -depreciationDifference, // Nilai negatif untuk kredit
          notes: `Penyusutan manual untuk aset tetap ID: ${asset.id}`,
          updatedAt: new Date()
        }
      });
      
      return {
        updatedAsset,
        transactions: [depreciationDebitTransaction, depreciationCreditTransaction]
      };
    });

    res.json({
      success: true,
      message: 'Penyusutan aset berhasil diperbarui dengan pencatatan double-entry',
      data: result.updatedAsset,
      depreciation: {
        previousAccumulatedDepreciation: asset.accumulatedDepreciation,
        newAccumulatedDepreciation,
        depreciationAmount: depreciationDifference,
        previousBookValue: asset.bookValue,
        newBookValue
      },
      transactions: result.transactions
    });
  } catch (error) {
    console.error('Error updating asset depreciation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat memperbarui penyusutan aset',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/assets/:id
 * @desc    Delete fixed asset with double-entry transactions
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if asset exists
    const existingAsset = await prisma.fixedAsset.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: 'Aset tetap tidak ditemukan'
      });
    }

    // Gunakan transaksi database untuk memastikan semua operasi berhasil atau gagal bersama-sama
    await prisma.$transaction(async (prisma) => {
      // 1. Tentukan kode akun aset tetap dan akumulasi penyusutan berdasarkan kategori
      let fixedAssetAccountCode;
      let accDepreciationAccountCode;
      
      switch(existingAsset.category) {
        case 'equipment':
          fixedAssetAccountCode = '1501'; // Mesin Boring
          accDepreciationAccountCode = '1601'; // Akumulasi Penyusutan Mesin Boring
          break;
        case 'vehicle':
          fixedAssetAccountCode = '1503'; // Kendaraan Operasional
          accDepreciationAccountCode = '1603'; // Akumulasi Penyusutan Kendaraan
          break;
        case 'building':
          fixedAssetAccountCode = '1505'; // Bangunan Kantor
          accDepreciationAccountCode = '1605'; // Akumulasi Penyusutan Bangunan
          break;
        case 'office':
          fixedAssetAccountCode = '1504'; // Peralatan Kantor
          accDepreciationAccountCode = '1604'; // Akumulasi Penyusutan Peralatan Kantor
          break;
        default:
          fixedAssetAccountCode = '1501'; // Default ke Mesin Boring
          accDepreciationAccountCode = '1601'; // Default ke Akumulasi Penyusutan Mesin Boring
      }

      const currentDate = new Date();
      const remainingBookValue = existingAsset.bookValue;
      
      // 2. Jika ada nilai buku yang tersisa, buat transaksi untuk menghapus nilai buku
      if (remainingBookValue > 0) {
        // Buat transaksi debit ke beban (kerugian penghapusan aset)
        await prisma.transaction.create({
          data: {
            date: currentDate,
            type: 'Beban',
            accountCode: '6105', // Beban Penyusutan (bisa diganti dengan akun kerugian penghapusan aset jika ada)
            description: `Kerugian penghapusan aset tetap: ${existingAsset.assetName}`,
            amount: remainingBookValue,
            notes: `Penghapusan aset tetap ID: ${existingAsset.id}`,
            updatedAt: new Date()
          }
        });

        // Buat transaksi kredit ke aset tetap (menghapus nilai buku)
        await prisma.transaction.create({
          data: {
            date: currentDate,
            type: 'Aset Tetap',
            accountCode: fixedAssetAccountCode,
            description: `Penghapusan nilai buku aset tetap: ${existingAsset.assetName}`,
            amount: -remainingBookValue, // Nilai negatif untuk kredit
            notes: `Penghapusan aset tetap ID: ${existingAsset.id}`,
            updatedAt: new Date()
          }
        });
      }

      // 3. Jika ada akumulasi penyusutan, buat transaksi untuk menghapus akumulasi penyusutan
      if (existingAsset.accumulatedDepreciation > 0) {
        // Buat transaksi debit ke akumulasi penyusutan (menghapus akumulasi penyusutan)
        await prisma.transaction.create({
          data: {
            date: currentDate,
            type: 'Akumulasi Penyusutan',
            accountCode: accDepreciationAccountCode,
            description: `Penghapusan akumulasi penyusutan: ${existingAsset.assetName}`,
            amount: existingAsset.accumulatedDepreciation, // Nilai positif untuk debit
            notes: `Penghapusan aset tetap ID: ${existingAsset.id}`,
            updatedAt: new Date()
          }
        });

        // Buat transaksi kredit ke aset tetap (menghapus nilai aset yang sudah disusutkan)
        await prisma.transaction.create({
          data: {
            date: currentDate,
            type: 'Aset Tetap',
            accountCode: fixedAssetAccountCode,
            description: `Penghapusan nilai aset tetap yang sudah disusutkan: ${existingAsset.assetName}`,
            amount: -existingAsset.accumulatedDepreciation, // Nilai negatif untuk kredit
            notes: `Penghapusan aset tetap ID: ${existingAsset.id}`,
            updatedAt: new Date()
          }
        });
      }

      // 4. Hapus aset tetap
      await prisma.fixedAsset.delete({
        where: { id: parseInt(id) }
      });
    });

    res.json({
      success: true,
      message: 'Aset tetap berhasil dihapus dengan pencatatan double-entry'
    });
  } catch (error) {
    console.error('Error deleting fixed asset:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghapus aset tetap',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assets/:id/calculate-depreciation
 * @desc    Calculate and update depreciation for a single asset
 * @access  Private
 */
router.post('/:id/calculate-depreciation', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Calculate and update depreciation
    const result = await depreciationService.updateAssetDepreciation(id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghitung penyusutan aset',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assets/calculate-all-depreciation
 * @desc    Calculate and update depreciation for all assets
 * @access  Private (Admin only)
 */
router.post('/calculate-all-depreciation', auth, authorize(['admin']), async (req, res) => {
  try {
    // Calculate and update depreciation for all assets
    const result = await depreciationService.updateAllAssetsDepreciation();
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat menghitung penyusutan semua aset',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/assets/:id/depreciation
 * @desc    Get depreciation history for an asset
 * @access  Private
 */
router.get('/:id/depreciation', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get asset details
    const asset = await prisma.fixedAsset.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!asset) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aset tidak ditemukan' 
      });
    }
    
    // Calculate depreciation info
    const acquisitionDate = new Date(asset.acquisitionDate);
    const currentDate = new Date();
    const valueAmount = parseFloat(asset.value.toString());
    const usefulLifeYears = asset.usefulLife;
    const usefulLifeMonths = usefulLifeYears * 12;
    
    // Calculate monthly depreciation
    const monthlyDepreciation = valueAmount / usefulLifeMonths;
    
    // Calculate age in months
    const ageInMonths = (currentDate.getFullYear() - acquisitionDate.getFullYear()) * 12 + 
      (currentDate.getMonth() - acquisitionDate.getMonth());
    
    // Calculate total depreciation to date (capped at total value)
    const totalDepreciationToDate = Math.min(
      valueAmount,
      asset.accumulatedDepreciation
    );
    
    // Calculate remaining depreciable amount
    const remainingDepreciableAmount = valueAmount - totalDepreciationToDate;
    
    // Calculate remaining useful life in months
    const remainingMonths = Math.max(0, usefulLifeMonths - ageInMonths);
    
    // Calculate percentage depreciated
    const percentageDepreciated = (totalDepreciationToDate / valueAmount) * 100;
    
    res.json({
      success: true,
      data: {
        asset,
        depreciationInfo: {
          acquisitionDate,
          valueAmount,
          usefulLifeYears,
          usefulLifeMonths,
          monthlyDepreciation,
          ageInMonths,
          totalDepreciationToDate,
          remainingDepreciableAmount,
          remainingMonths,
          percentageDepreciated,
          currentBookValue: asset.bookValue
        }
      }
    });
  } catch (error) {
    console.error('Error getting asset depreciation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data depresiasi aset',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/assets/:id/schedule
 * @desc    Get depreciation schedule for an asset
 * @access  Private
 */
router.get('/:id/schedule', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get asset details
    const asset = await prisma.fixedAsset.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!asset) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aset tidak ditemukan' 
      });
    }
    
    // Calculate depreciation schedule
    const schedule = [];
    const acquisitionDate = new Date(asset.acquisitionDate);
    const usefulLifeYears = asset.usefulLife;
    const valueAmount = parseFloat(asset.value.toString());
    const monthlyDepreciation = valueAmount / (usefulLifeYears * 12);
    
    let currentValue = valueAmount;
    let accumulatedDepreciation = 0;
    
    // Generate monthly schedule for the entire useful life
    for (let i = 0; i < usefulLifeYears * 12; i++) {
      const date = new Date(acquisitionDate);
      date.setMonth(date.getMonth() + i);
      
      // For the last month, adjust to ensure we don't depreciate below zero
      const depreciationAmount = i === usefulLifeYears * 12 - 1 
        ? currentValue 
        : monthlyDepreciation;
      
      accumulatedDepreciation += depreciationAmount;
      currentValue -= depreciationAmount;
      
      // Ensure book value doesn't go below zero
      if (currentValue < 0) currentValue = 0;
      
      schedule.push({
        date,
        month: i + 1,
        depreciationAmount,
        accumulatedDepreciation,
        bookValue: currentValue
      });
    }
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error getting depreciation schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil jadwal depresiasi',
      error: error.message 
    });
  }
});

module.exports = router; 