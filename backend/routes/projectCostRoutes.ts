import express from 'express';
import projectCostController from '../controllers/projectCostController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET all project costs
router.get('/', projectCostController.getAllProjectCosts);

// GET a single project cost by ID
router.get('/:id', projectCostController.getProjectCostById);

// POST create a new project cost
router.post('/', projectCostController.createProjectCost);

// PUT update a project cost
router.put('/:id', projectCostController.updateProjectCost);

// DELETE a project cost
router.delete('/:id', projectCostController.deleteProjectCost);

// PATCH update project cost status
router.patch('/:id/status', projectCostController.updateProjectCostStatus);

export default router; 