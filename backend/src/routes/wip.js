const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');
const wipService = require('../services/wipService');

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
        projectcost: {
          where: {
            status: {
              in: ['approved', 'pending']
            }
          }
        },
        billing: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });
    
    // Calculate WIP values
    const wipData = projects.map(project => {
      // Calculate total costs
      const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate total billed
      const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate project's total value
      const totalValue = parseFloat(project.totalValue || 0);
      
      // Calculate percentage of completion based on costs vs expected total cost
      // If total value is 0, default to 0 to avoid division by zero
      let completionPercentage = 0;
      
      if (totalValue > 0) {
        // Estimate total cost as 70% of project value (standard cost ratio for this industry)
        const estimatedTotalCost = totalValue * 0.7;
        completionPercentage = estimatedTotalCost > 0 ? (totalCosts / estimatedTotalCost) * 100 : 0;
        
        // Cap at 100%
        completionPercentage = Math.min(completionPercentage, 100);
      }
      
      // Calculate earned value based on percentage of completion
      const earnedValue = (completionPercentage / 100) * totalValue;
      
      // Calculate WIP value using the earned value method
      // WIP = Earned Value - Amount Billed
      const wipValue = earnedValue - totalBilled;
      
      // Use the stored progress field from the project model, or calculated completion if not available
      const progress = project.progress ? parseFloat(project.progress) : completionPercentage;
      
      return {
        id: project.id,
        name: project.name,
        projectCode: project.projectCode,
        client: project.client,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        totalValue: totalValue,
        costs: totalCosts,
        billed: totalBilled,
        earnedValue: earnedValue,
        completionPercentage: completionPercentage,
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
    // Get all projects with related data
    const projects = await prisma.project.findMany({
      include: {
        projectcost: {
          where: {
            status: {
              in: ['approved', 'pending']
            }
          }
        },
        billing: true
      }
    });
    
    // Calculate summary data
    let totalProjects = projects.length;
    let projectsWithWip = 0;
    let totalCosts = 0;
    let totalBilled = 0;
    let totalWip = 0;
    let totalEarnedValue = 0;
    
    projects.forEach(project => {
      // Calculate project costs
      const projectCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate project billings
      const projectBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate project's total value
      const totalValue = parseFloat(project.totalValue || 0);
      
      // Calculate percentage of completion based on costs
      let completionPercentage = 0;
      if (totalValue > 0) {
        // Estimate total cost as 70% of project value (standard cost ratio for this industry)
        const estimatedTotalCost = totalValue * 0.7;
        completionPercentage = estimatedTotalCost > 0 ? (projectCosts / estimatedTotalCost) * 100 : 0;
        completionPercentage = Math.min(completionPercentage, 100);
      }
      
      // Calculate earned value based on percentage of completion
      const earnedValue = (completionPercentage / 100) * totalValue;
      
      // Calculate project WIP using earned value method
      const projectWip = earnedValue - projectBilled;
      
      // Add to totals
      totalCosts += projectCosts;
      totalBilled += projectBilled;
      totalWip += projectWip;
      totalEarnedValue += earnedValue;
      
      // Count projects with non-zero WIP
      if (Math.abs(projectWip) > 0.01) {
        projectsWithWip++;
      }
    });
    
    res.json({
      totalProjects,
      projectsWithWip,
      totalCosts,
      totalBilled,
      totalEarnedValue,
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
        projectcost: {
          where: {
            status: {
              in: ['approved', 'pending']
            }
          }
        },
        billing: true
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
    project.projectcost.forEach(cost => {
      const category = cost.category || 'Other';
      if (!costsByCategory[category]) {
        costsByCategory[category] = 0;
      }
      costsByCategory[category] += parseFloat(cost.amount || 0);
    });
    
    // Calculate total costs
    const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
    
    // Calculate total billed
    const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
    
    // Calculate WIP value (costs - billed)
    const wipValue = totalCosts - totalBilled;
    
    // Use the stored progress field from the project model
    const progress = project.progress ? parseFloat(project.progress) : 0;
    
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
    
    // Validate required fields
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    // Validate data types and values
    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100'
      });
    }
    
    if (costs < 0) {
      return res.status(400).json({
        success: false,
        message: 'Costs cannot be negative'
      });
    }
    
    if (billed < 0) {
      return res.status(400).json({
        success: false,
        message: 'Billed amount cannot be negative'
      });
    }
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: {
        id: parseInt(projectId)
      },
      include: {
        projectcost: {
          where: {
            status: {
              in: ['approved', 'pending']
            }
          }
        },
        billing: true
      }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Calculate actual costs from project costs
    const actualCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
    
    // Calculate actual billed from billings
    const actualBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
    
    // Check if costs and billed amounts match the calculated values
    if (Math.abs(costs - actualCosts) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Costs do not match the sum of project costs',
        expectedCosts: actualCosts,
        providedCosts: costs
      });
    }
    
    if (Math.abs(billed - actualBilled) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Billed amount does not match the sum of billings',
        expectedBilled: actualBilled,
        providedBilled: billed
      });
    }
    
    // Validate WIP value calculation
    const calculatedWipValue = costs - billed;
    if (Math.abs(wipValue - calculatedWipValue) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'WIP value does not match costs minus billed amount',
        expectedWipValue: calculatedWipValue,
        providedWipValue: wipValue
      });
    }
    
    // Determine appropriate project status based on progress
    let newStatus = project.status;
    if (progress >= 100) {
      newStatus = 'completed';
    } else if (progress > 0) {
      newStatus = 'ongoing';
    } else {
      newStatus = 'planned';
    }
    
    // Update project with progress information and status
    const updatedProject = await prisma.project.update({
      where: {
        id: parseInt(projectId)
      },
      data: {
        status: newStatus,
        progress: progress,
        description: `Progress: ${progress}%`,
        updatedAt: new Date()
      }
    });
    
    // Create a transaction record for accounting purposes if WIP value is significant
    if (Math.abs(wipValue) > 0) {
      try {
        // Find WIP account code from chart of accounts
        const wipAccount = await prisma.chartofaccount.findFirst({
          where: {
            name: {
              contains: 'Work In Progress'
            }
          }
        });
        
        if (wipAccount) {
          // Record the WIP transaction
          await prisma.transaction.create({
            data: {
              date: new Date(),
              type: wipValue > 0 ? 'WIP_INCREASE' : 'WIP_DECREASE',
              accountCode: wipAccount.code,
              description: `WIP adjustment for project ${project.projectCode}`,
              amount: Math.abs(wipValue),
              projectId: parseInt(projectId),
              notes: notes || `WIP value updated. Progress: ${progress}%`,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      } catch (transactionError) {
        console.error('Error recording WIP transaction:', transactionError);
        // Continue even if transaction recording fails
      }
    }
    
    // Return updated WIP data
    res.json({
      success: true,
      message: 'WIP data created successfully',
      data: {
        id: updatedProject.id,
        name: updatedProject.name,
        projectCode: project.projectCode,
        status: newStatus,
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
    
    // Validate data types and values
    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100'
      });
    }
    
    if (costs < 0) {
      return res.status(400).json({
        success: false,
        message: 'Costs cannot be negative'
      });
    }
    
    if (billed < 0) {
      return res.status(400).json({
        success: false,
        message: 'Billed amount cannot be negative'
      });
    }
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: {
        id: parseInt(projectId)
      },
      include: {
        projectcost: {
          where: {
            status: {
              in: ['approved', 'pending']
            }
          }
        },
        billing: true
      }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Calculate actual costs from project costs
    const actualCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
    
    // Calculate actual billed from billings
    const actualBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
    
    // Validate WIP value calculation
    const calculatedWipValue = costs - billed;
    if (Math.abs(wipValue - calculatedWipValue) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'WIP value does not match costs minus billed amount',
        expectedWipValue: calculatedWipValue,
        providedWipValue: wipValue
      });
    }
    
    // Determine appropriate project status based on progress
    let newStatus = project.status;
    if (progress >= 100) {
      newStatus = 'completed';
    } else if (progress > 0) {
      newStatus = 'ongoing';
    } else {
      newStatus = 'planned';
    }
    
    // Update project with progress information and status
    const updatedProject = await prisma.project.update({
      where: {
        id: parseInt(projectId)
      },
      data: {
        status: newStatus,
        progress: progress,
        description: `Progress: ${progress}%`,
        updatedAt: new Date()
      }
    });
    
    // Create a transaction record for accounting purposes if WIP value changed
    const previousWipValue = actualCosts - actualBilled;
    if (Math.abs(wipValue - previousWipValue) > 0.01) {
      try {
        // Find WIP account code from chart of accounts
        const wipAccount = await prisma.chartofaccount.findFirst({
          where: {
            name: {
              contains: 'Work In Progress'
            }
          }
        });
        
        if (wipAccount) {
          // Record the WIP transaction for the difference
          const wipDifference = wipValue - previousWipValue;
          await prisma.transaction.create({
            data: {
              date: new Date(),
              type: wipDifference > 0 ? 'WIP_INCREASE' : 'WIP_DECREASE',
              accountCode: wipAccount.code,
              description: `WIP adjustment for project ${project.projectCode}`,
              amount: Math.abs(wipDifference),
              projectId: parseInt(projectId),
              notes: notes || `WIP value updated. Progress: ${progress}%`,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      } catch (transactionError) {
        console.error('Error recording WIP transaction:', transactionError);
        // Continue even if transaction recording fails
      }
    }
    
    // Return updated WIP data
    res.json({
      success: true,
      message: 'WIP data updated successfully',
      data: {
        id: updatedProject.id,
        name: updatedProject.name,
        projectCode: project.projectCode,
        status: newStatus,
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

/**
 * @route   POST /api/wip/recalculate/:projectId
 * @desc    Recalculate WIP for a specific project
 * @access  Private
 */
router.post('/recalculate/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { notes } = req.body;
    
    // Validate projectId
    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({
        success: false,
        message: 'Valid Project ID is required'
      });
    }
    
    // Process WIP for the project
    const result = await wipService.processProjectWip(parseInt(projectId), notes);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to recalculate WIP',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'WIP recalculated successfully',
      data: {
        project: result.project,
        wipCalculation: result.wipCalculation,
        transaction: result.transaction
      }
    });
  } catch (error) {
    console.error('WIP recalculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate WIP',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/wip/recalculate-all
 * @desc    Recalculate WIP for all active projects
 * @access  Private
 */
router.post('/recalculate-all', authenticate, async (req, res) => {
  try {
    // Get all active projects
    const projects = await prisma.project.findMany({
      where: {
        status: {
          in: ['ongoing', 'planned']
        }
      },
      select: {
        id: true,
        name: true,
        projectCode: true
      }
    });
    
    if (!projects || projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active projects found'
      });
    }
    
    // Process WIP for each project
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const project of projects) {
      try {
        const result = await wipService.processProjectWip(project.id, 'Batch WIP recalculation');
        results.push({
          projectId: project.id,
          projectName: project.name,
          success: result.success,
          wipValue: result.wipCalculation?.wipValue || 0,
          error: result.error
        });
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        results.push({
          projectId: project.id,
          projectName: project.name,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: `WIP recalculated for ${successCount} projects. ${errorCount} errors.`,
      data: {
        totalProjects: projects.length,
        successCount,
        errorCount,
        results
      }
    });
  } catch (error) {
    console.error('WIP batch recalculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate WIP for projects',
      error: error.message
    });
  }
});

module.exports = router; 