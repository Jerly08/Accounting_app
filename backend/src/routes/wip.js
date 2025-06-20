const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/wip
 * @desc    Get WIP (Work In Progress) data
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status = 'ongoing' } = req.query;
    
    // Define status filter
    const statusFilter = status === 'all' ? {} : { status };
    
    // Get projects with related data
    const projects = await prisma.project.findMany({
      where: statusFilter,
      include: {
        client: true,
        projectCosts: {
          where: {
            status: {
              in: ['approved', 'pending']
            }
          }
        },
        billings: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });
    
    // Calculate WIP values
    const wipData = projects.map(project => {
      // Calculate total costs
      const totalCosts = project.projectCosts.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate total billed
      const totalBilled = project.billings.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate WIP value (costs - billed)
      const wipValue = totalCosts - totalBilled;
      
      // Calculate completion percentage
      const totalValue = parseFloat(project.totalValue || 0);
      const progress = totalValue > 0 ? (totalBilled / totalValue) * 100 : 0;
      
      return {
        id: project.id,
        name: project.name,
        client: project.client,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        totalValue: parseFloat(project.totalValue || 0),
        costs: totalCosts,
        billed: totalBilled,
        wipValue: wipValue,
        progress: progress
      };
    });
    
    res.json({
      success: true,
      data: wipData
    });
  } catch (error) {
    console.error('WIP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WIP data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/wip/summary
 * @desc    Get summary of WIP data
 * @access  Private
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    // Get ongoing projects with related data
    const projects = await prisma.project.findMany({
      where: {
        status: 'ongoing'
      },
      include: {
        projectCosts: {
          where: {
            status: {
              in: ['approved', 'pending']
            }
          }
        },
        billings: true
      }
    });
    
    // Calculate summary data
    let totalProjects = projects.length;
    let totalCosts = 0;
    let totalBilled = 0;
    let totalWip = 0;
    
    projects.forEach(project => {
      // Calculate project costs
      const projectCosts = project.projectCosts.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate project billings
      const projectBilled = project.billings.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate project WIP
      const projectWip = projectCosts - projectBilled;
      
      // Add to totals
      totalCosts += projectCosts;
      totalBilled += projectBilled;
      totalWip += projectWip;
    });
    
    res.json({
      totalProjects,
      totalCosts,
      totalBilled,
      totalWip
    });
  } catch (error) {
    console.error('WIP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WIP summary',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/wip/:projectId
 * @desc    Get WIP data for a specific project
 * @access  Private
 */
router.get('/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project with related data
    const project = await prisma.project.findUnique({
      where: {
        id: parseInt(projectId)
      },
      include: {
        client: true,
        projectCosts: {
          where: {
            status: {
              in: ['approved', 'pending']
            }
          }
        },
        billings: true
      }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Calculate total costs by category
    const costsByCategory = {};
    project.projectCosts.forEach(cost => {
      const category = cost.category || 'Other';
      if (!costsByCategory[category]) {
        costsByCategory[category] = 0;
      }
      costsByCategory[category] += parseFloat(cost.amount || 0);
    });
    
    // Calculate total costs
    const totalCosts = project.projectCosts.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
    
    // Calculate total billed
    const totalBilled = project.billings.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
    
    // Calculate WIP value (costs - billed)
    const wipValue = totalCosts - totalBilled;
    
    // Calculate completion percentage
    const totalValue = parseFloat(project.totalValue || 0);
    const progress = totalValue > 0 ? (totalBilled / totalValue) * 100 : 0;
    
    const wipData = {
      id: project.id,
      name: project.name,
      client: project.client,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      totalValue: parseFloat(project.totalValue || 0),
      costs: totalCosts,
      costsByCategory,
      billed: totalBilled,
      wipValue: wipValue,
      progress: progress
    };
    
    res.json({
      success: true,
      data: wipData
    });
  } catch (error) {
    console.error('WIP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WIP data for project',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/wip
 * @desc    Create a new WIP entry or update project WIP data
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, progress, costs, billed, wipValue, notes } = req.body;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: {
        id: parseInt(projectId)
      }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Update project with progress information
    const updatedProject = await prisma.project.update({
      where: {
        id: parseInt(projectId)
      },
      data: {
        // If project is complete (progress is 100%), update status
        status: progress >= 100 ? 'completed' : project.status,
        // Add any additional fields that might be needed
      }
    });
    
    // Return updated WIP data
    res.json({
      success: true,
      message: 'WIP data created successfully',
      data: {
        id: updatedProject.id,
        name: updatedProject.name,
        progress: progress,
        costs: costs,
        billed: billed,
        wipValue: wipValue,
        notes: notes
      }
    });
  } catch (error) {
    console.error('WIP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create WIP data',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/wip/:projectId
 * @desc    Update WIP data for a specific project
 * @access  Private
 */
router.put('/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { progress, costs, billed, wipValue, notes } = req.body;
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: {
        id: parseInt(projectId)
      }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Update project with progress information
    const updatedProject = await prisma.project.update({
      where: {
        id: parseInt(projectId)
      },
      data: {
        // If project is complete (progress is 100%), update status
        status: progress >= 100 ? 'completed' : project.status,
        // Add any additional fields that might be needed
      }
    });
    
    // Return updated WIP data
    res.json({
      success: true,
      message: 'WIP data updated successfully',
      data: {
        id: updatedProject.id,
        name: updatedProject.name,
        progress: progress,
        costs: costs,
        billed: billed,
        wipValue: wipValue,
        notes: notes
      }
    });
  } catch (error) {
    console.error('WIP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update WIP data',
      error: error.message
    });
  }
});

module.exports = router; 