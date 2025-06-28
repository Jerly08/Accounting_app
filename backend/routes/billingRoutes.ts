import express from 'express';
import billingController from '../controllers/billingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET all billings
router.get('/', billingController.getAllBillings);

// GET a single billing by ID
router.get('/:id', billingController.getBillingById);

// POST create a new billing
router.post('/', billingController.createBilling);

// PUT update a billing
router.put('/:id', billingController.updateBilling);

// DELETE a billing
router.delete('/:id', billingController.deleteBilling);

// PATCH update billing status
router.patch('/:id/status', billingController.updateBillingStatus);

export default router; 