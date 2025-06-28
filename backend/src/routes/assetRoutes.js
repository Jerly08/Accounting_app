const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Get all fixed assets
router.get('/', assetController.getAllAssets);

// Get a single fixed asset by ID
router.get('/:id', assetController.getAssetById);

// Create a new fixed asset
router.post('/', assetController.createAsset);

// Update an existing fixed asset
router.put('/:id', assetController.updateAsset);

// Delete a fixed asset
router.delete('/:id', assetController.deleteAsset);

// Calculate depreciation for an asset
router.get('/:id/depreciation', assetController.calculateAssetDepreciation);

// Record depreciation for an asset
router.post('/:id/depreciation', assetController.recordDepreciation);

// Get depreciation schedule for an asset
router.get('/:id/schedule', assetController.getDepreciationSchedule);

module.exports = router; 