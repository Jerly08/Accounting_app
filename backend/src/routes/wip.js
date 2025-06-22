const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');
const wipService = require('../services/wipService');
const logger = require('../utils/logger');

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

/**
 * @route GET /api/wip/history/:projectId
 * @desc Get WIP history for a specific project
 */
router.get('/history/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate, limit } = req.query;
    
    // Validate project ID
    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const options = {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined
    };
    
    const wipHistory = await wipService.getWipHistory(parseInt(projectId), options);
    
    return res.json(wipHistory);
  } catch (error) {
    logger.error(`Error fetching WIP history: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch WIP history', details: error.message });
  }
});

/**
 * @route GET /api/wip/trend
 * @desc Get WIP trend data for all projects
 */
router.get('/trend', async (req, res) => {
  try {
    const { startDate, endDate, interval } = req.query;
    
    const options = {
      startDate,
      endDate,
      interval
    };
    
    const trendData = await wipService.getWipTrendData(options);
    
    return res.json(trendData);
  } catch (error) {
    logger.error(`Error fetching WIP trend data: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch WIP trend data', details: error.message });
  }
});

/**
 * @route GET /api/wip/aging
 * @desc Get WIP aging analysis
 */
router.get('/aging', async (req, res) => {
  try {
    const agingAnalysis = await wipService.getWipAgingAnalysis();
    
    return res.json(agingAnalysis);
  } catch (error) {
    logger.error(`Error fetching WIP aging analysis: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch WIP aging analysis', details: error.message });
  }
});

/**
 * @route GET /api/wip/cashflow-projection
 * @desc Get WIP to cash flow projection
 */
router.get('/cashflow-projection', async (req, res) => {
  try {
    const { months = 3 } = req.query;
    const monthsCount = parseInt(months);
    
    // Get all active projects with WIP
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['ongoing', 'planned'] }
      },
      include: {
        billing: true,
        projectcost: true,
        wip_history: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });
    
    // Generate monthly projections for the next X months
    const today = new Date();
    const projections = [];
    
    for (let i = 0; i < monthsCount; i++) {
      const projectionDate = new Date(today);
      projectionDate.setMonth(today.getMonth() + i + 1);
      projectionDate.setDate(0); // Last day of the month
      
      const monthlyProjection = {
        date: projectionDate,
        month: `${projectionDate.getFullYear()}-${String(projectionDate.getMonth() + 1).padStart(2, '0')}`,
        expectedBillings: 0,
        expectedWipReduction: 0,
        projects: []
      };
      
      // Calculate expected billings and WIP reduction for each project
      projects.forEach(project => {
        // Skip completed projects
        if (project.status === 'completed') return;
        
        // Get current WIP value
        const currentWip = project.wip_history.length > 0 ? 
          Number(project.wip_history[0].wipValue) : 0;
        
        if (currentWip <= 0) return; // Skip if no positive WIP
        
        // Calculate expected billing based on project timeline and WIP value
        const projectStart = new Date(project.startDate);
        const projectEnd = project.endDate ? new Date(project.endDate) : null;
        
        // If project end date exists and is before the projection date
        if (projectEnd && projectEnd <= projectionDate) {
          // Project should be completed by this month, bill all remaining WIP
          const expectedBilling = currentWip;
          
          monthlyProjection.expectedBillings += expectedBilling;
          monthlyProjection.expectedWipReduction += expectedBilling;
          
          monthlyProjection.projects.push({
            id: project.id,
            name: project.name,
            currentWip,
            expectedBilling,
            expectedWipReduction: expectedBilling,
            completionExpected: true
          });
        } else {
          // Project ongoing, estimate billing based on progress rate
          // Calculate average monthly progress
          const progressRate = project.progress / 
            (Math.max(1, Math.floor((today - projectStart) / (1000 * 60 * 60 * 24 * 30))));
          
          // Estimate billing for this month based on progress rate and WIP
          const expectedBilling = Math.min(
            currentWip,
            Number(project.totalValue) * (progressRate / 100)
          );
          
          monthlyProjection.expectedBillings += expectedBilling;
          monthlyProjection.expectedWipReduction += expectedBilling;
          
          monthlyProjection.projects.push({
            id: project.id,
            name: project.name,
            currentWip,
            expectedBilling,
            expectedWipReduction: expectedBilling,
            completionExpected: false
          });
        }
      });
      
      projections.push(monthlyProjection);
    }
    
    return res.json({
      projections,
      totalProjects: projects.length,
      totalCurrentWip: projects.reduce((sum, project) => {
        return sum + (project.wip_history.length > 0 ? Number(project.wip_history[0].wipValue) : 0);
      }, 0)
    });
  } catch (error) {
    logger.error(`Error generating WIP cash flow projection: ${error.message}`);
    return res.status(500).json({ error: 'Failed to generate WIP cash flow projection', details: error.message });
  }
});

/**
 * @route GET /api/wip/risk-analysis
 * @desc Get WIP risk analysis
 */
router.get('/risk-analysis', async (req, res) => {
  try {
    // Get latest WIP history entry for each project
    const latestWipEntries = await prisma.$queryRaw`
      SELECT wh.*, p.name as projectName, p.totalValue, p.status, c.name as clientName
      FROM wip_history wh
      INNER JOIN (
        SELECT projectId, MAX(date) as maxDate
        FROM wip_history
        GROUP BY projectId
      ) latest ON wh.projectId = latest.projectId AND wh.date = latest.maxDate
      INNER JOIN project p ON wh.projectId = p.id
      INNER JOIN client c ON p.clientId = c.id
    `;
    
    // Group projects by risk category
    const riskCategories = {
      low: { projects: [], totalWipValue: 0 },
      medium: { projects: [], totalWipValue: 0 },
      high: { projects: [], totalWipValue: 0 },
      critical: { projects: [], totalWipValue: 0 }
    };
    
    // Process each entry
    latestWipEntries.forEach(entry => {
      const wipValue = Number(entry.wipValue);
      const project = {
        id: entry.projectId,
        name: entry.projectName,
        clientName: entry.clientName,
        wipValue,
        riskScore: entry.riskScore,
        ageInDays: entry.ageInDays,
        status: entry.status,
        totalValue: Number(entry.totalValue),
        wipPercentage: (wipValue / Number(entry.totalValue)) * 100
      };
      
      // Determine risk category
      if (entry.riskScore < 20) {
        riskCategories.low.projects.push(project);
        riskCategories.low.totalWipValue += wipValue;
      } else if (entry.riskScore < 50) {
        riskCategories.medium.projects.push(project);
        riskCategories.medium.totalWipValue += wipValue;
      } else if (entry.riskScore < 75) {
        riskCategories.high.projects.push(project);
        riskCategories.high.totalWipValue += wipValue;
      } else {
        riskCategories.critical.projects.push(project);
        riskCategories.critical.totalWipValue += wipValue;
      }
    });
    
    // Calculate total WIP and percentages
    const totalWipValue = Object.values(riskCategories).reduce(
      (sum, category) => sum + category.totalWipValue, 0
    );
    
    Object.keys(riskCategories).forEach(category => {
      riskCategories[category].percentage = totalWipValue ? 
        (riskCategories[category].totalWipValue / totalWipValue) * 100 : 0;
      riskCategories[category].projectCount = riskCategories[category].projects.length;
    });
    
    return res.json({
      riskCategories,
      totalWipValue,
      totalProjects: latestWipEntries.length
    });
  } catch (error) {
    logger.error(`Error fetching WIP risk analysis: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch WIP risk analysis', details: error.message });
  }
});

/**
 * @route   GET /api/wip/analysis/by-age
 * @desc    Get WIP analysis data by age
 * @access  Private
 */
router.get('/analysis/by-age', authenticate, async (req, res) => {
  try {
    // Get all projects with WIP values
    const projects = await prisma.project.findMany({
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
    
    // Calculate WIP values and age
    let totalWip = 0;
    const wipByAge = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0
    };
    
    projects.forEach(project => {
      // Calculate total costs
      const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate total billed
      const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate project's total value
      const totalValue = parseFloat(project.totalValue || 0);
      
      // Calculate percentage of completion based on costs
      let completionPercentage = 0;
      if (totalValue > 0) {
        // Estimate total cost as 70% of project value (standard cost ratio for this industry)
        const estimatedTotalCost = totalValue * 0.7;
        completionPercentage = estimatedTotalCost > 0 ? (totalCosts / estimatedTotalCost) * 100 : 0;
        completionPercentage = Math.min(completionPercentage, 100);
      }
      
      // Calculate earned value based on percentage of completion
      const earnedValue = (completionPercentage / 100) * totalValue;
      
      // Calculate WIP value using earned value method
      const wipValue = earnedValue - totalBilled;
      
      // Calculate age in days
      const today = new Date();
      const startDate = new Date(project.startDate);
      const ageInDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
      
      // Add to total WIP
      totalWip += wipValue;
      
      // Add to appropriate age bucket
      if (ageInDays <= 30) {
        wipByAge['0-30'] += wipValue;
      } else if (ageInDays <= 60) {
        wipByAge['31-60'] += wipValue;
      } else if (ageInDays <= 90) {
        wipByAge['61-90'] += wipValue;
      } else {
        wipByAge['90+'] += wipValue;
      }
    });
    
    // Format response
    const response = [
      { 
        age: '0-30 days', 
        amount: wipByAge['0-30'], 
        percent: totalWip !== 0 ? (wipByAge['0-30'] / totalWip) * 100 : 0 
      },
      { 
        age: '31-60 days', 
        amount: wipByAge['31-60'], 
        percent: totalWip !== 0 ? (wipByAge['31-60'] / totalWip) * 100 : 0 
      },
      { 
        age: '61-90 days', 
        amount: wipByAge['61-90'], 
        percent: totalWip !== 0 ? (wipByAge['61-90'] / totalWip) * 100 : 0 
      },
      { 
        age: '90+ days', 
        amount: wipByAge['90+'], 
        percent: totalWip !== 0 ? (wipByAge['90+'] / totalWip) * 100 : 0 
      }
    ];
    
    res.json(response);
  } catch (error) {
    console.error('WIP analysis by age error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WIP analysis by age',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/wip/analysis/trends
 * @desc    Get WIP trend analysis data
 * @access  Private
 */
router.get('/analysis/trends', authenticate, async (req, res) => {
  try {
    // Get current WIP total
    const currentWipResponse = await prisma.project.findMany({
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
    
    // Calculate current total WIP
    let currentWip = 0;
    currentWipResponse.forEach(project => {
      // Calculate total costs
      const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate total billed
      const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate project's total value
      const totalValue = parseFloat(project.totalValue || 0);
      
      // Calculate percentage of completion based on costs
      let completionPercentage = 0;
      if (totalValue > 0) {
        // Estimate total cost as 70% of project value (standard cost ratio for this industry)
        const estimatedTotalCost = totalValue * 0.7;
        completionPercentage = estimatedTotalCost > 0 ? (totalCosts / estimatedTotalCost) * 100 : 0;
        completionPercentage = Math.min(completionPercentage, 100);
      }
      
      // Calculate earned value based on percentage of completion
      const earnedValue = (completionPercentage / 100) * totalValue;
      
      // Calculate WIP value using earned value method
      const wipValue = earnedValue - totalBilled;
      
      // Add to total WIP
      currentWip += wipValue;
    });
    
    // Try to get previous month's WIP from history
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Check if we have WIP history records
    const wipHistoryExists = await prisma.wip_history.count();
    
    let previousWip = 0;
    let changePercentage = 0;
    
    if (wipHistoryExists > 0) {
      // Get WIP history from one month ago
      const previousWipHistory = await prisma.wip_history.findMany({
        where: {
          date: {
            gte: oneMonthAgo,
            lte: new Date(oneMonthAgo.getFullYear(), oneMonthAgo.getMonth(), oneMonthAgo.getDate() + 7)
          }
        },
        orderBy: {
          date: 'desc'
        },
        take: 1
      });
      
      if (previousWipHistory.length > 0) {
        previousWip = parseFloat(previousWipHistory[0].wipValue);
      } else {
        // If no history found, estimate previous WIP as 85% of current
        previousWip = currentWip * 0.85;
      }
    } else {
      // If no history at all, estimate previous WIP as 85% of current
      previousWip = currentWip * 0.85;
    }
    
    // Calculate change percentage
    if (previousWip !== 0) {
      changePercentage = ((currentWip - previousWip) / previousWip) * 100;
    } else if (currentWip > 0) {
      changePercentage = 100; // If previous was 0 and current is positive, 100% increase
    } else {
      changePercentage = 0;
    }
    
    res.json({
      previousMonth: previousWip,
      currentMonth: currentWip,
      changePercentage: changePercentage
    });
  } catch (error) {
    console.error('WIP trends analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WIP trends analysis',
      error: error.message
    });
  }
});

module.exports = router; 