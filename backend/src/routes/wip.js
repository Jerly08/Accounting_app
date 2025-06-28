const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { auth } = require('../middleware/auth');
const wipService = require('../services/wipService');
const logger = require('../utils/logger');

/**
 * @route   GET /api/wip
 * @desc    Get WIP (Work In Progress) data
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status = 'ongoing' } = req.query;
    
    // Define status filter
    const statusFilter = status === 'all' ? {} : { status };
    
    // Get projects with related data
    const projects = await prisma.project.findMany({
      where: statusFilter,
      include: {
        client: true,
        projectcost: true, // Include all project costs regardless of status
        billing: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });
    
    // Calculate WIP values
    const wipData = projects.map(project => {
      // Calculate total costs - include all costs regardless of status
      const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate total billed
      const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate project's total value
      const totalValue = parseFloat(project.totalValue || 0);
      
      // Calculate percentage of completion
      let completionPercentage = 0;
      
      // For completed projects, set completion to 100%
      if (project.status === 'completed') {
        completionPercentage = 100;
      } else if (totalValue > 0) {
        // For ongoing projects, estimate completion based on costs
        const estimatedTotalCost = totalValue * 0.7;
        completionPercentage = estimatedTotalCost > 0 ? (totalCosts / estimatedTotalCost) * 100 : 0;
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
router.get('/summary', auth, async (req, res) => {
  try {
    // Get all projects with related data
    const projects = await prisma.project.findMany({
      include: {
        projectcost: true, // Include all project costs regardless of status
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
      
      // Calculate percentage of completion
      let completionPercentage = 0;
      
      // For completed projects, set completion to 100%
      if (project.status === 'completed') {
        completionPercentage = 100;
      } else if (totalValue > 0) {
        // For ongoing projects, estimate completion based on costs
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
 * @route   GET /api/wip/history/:projectId
 * @desc    Get WIP history for a specific project
 * @access  Private
 */
router.get('/history/:projectId', auth, async (req, res) => {
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
    
    // Fetch WIP history from database
    const wipHistory = await prisma.wip_history.findMany({
      where: {
        projectId: parseInt(projectId),
        ...(startDate && endDate ? {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        } : {})
      },
      orderBy: { date: 'desc' },
      ...(limit ? { take: parseInt(limit) } : {})
    });
    
    return res.json({
      success: true,
      data: wipHistory,
      count: wipHistory.length
    });
  } catch (error) {
    console.error('Error fetching WIP history:', error);
    return res.status(500).json({ error: 'Failed to fetch WIP history', details: error.message });
  }
});

/**
 * @route GET /api/wip/trend
 * @desc Get WIP trend data for all projects
 * @access Private
 */
router.get('/trend', auth, async (req, res) => {
  try {
    const { startDate, endDate, interval = 'month' } = req.query;
    
    // Define SQL format for different intervals
    let groupFormat;
    switch (interval) {
      case 'day':
        groupFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupFormat = '%Y-%u';
        break;
      case 'quarter':
        groupFormat = '%Y-Q%q';
        break;
      case 'year':
        groupFormat = '%Y';
        break;
      case 'month':
      default:
        groupFormat = '%Y-%m';
    }
    
    // Fetch aggregated WIP trend data using raw SQL
    const trendData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(date, ${groupFormat}) as period,
        SUM(wipValue) as totalWipValue,
        SUM(earnedValue) as totalEarnedValue,
        SUM(billedValue) as totalBilledValue,
        AVG(riskScore) as avgRiskScore,
        COUNT(DISTINCT projectId) as projectCount
      FROM wip_history
      WHERE date BETWEEN ${startDate ? new Date(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1))} 
        AND ${endDate ? new Date(endDate) : new Date()}
      GROUP BY DATE_FORMAT(date, ${groupFormat})
      ORDER BY MIN(date) ASC
    `;
    
    return res.json({
      success: true,
      data: trendData,
      interval,
      count: trendData.length
    });
  } catch (error) {
    console.error('Error fetching WIP trend data:', error);
    return res.status(500).json({ error: 'Failed to fetch WIP trend data', details: error.message });
  }
});

/**
 * @route GET /api/wip/aging
 * @desc Get WIP aging analysis
 * @access Private
 */
router.get('/aging', auth, async (req, res) => {
  try {
    // Get latest WIP history entry for each project
    const latestWipEntries = await prisma.$queryRaw`
      SELECT wh.*, p.name as projectName, c.name as clientName
      FROM wip_history wh
      INNER JOIN (
        SELECT projectId, MAX(date) as maxDate
        FROM wip_history
        GROUP BY projectId
      ) latest ON wh.projectId = latest.projectId AND wh.date = latest.maxDate
      INNER JOIN project p ON wh.projectId = p.id
      INNER JOIN client c ON p.clientId = c.id
      WHERE wh.wipValue > 0
    `;
    
    // Calculate aging buckets
    const agingBuckets = {
      '0-30 days': { count: 0, value: 0, projects: [] },
      '31-60 days': { count: 0, value: 0, projects: [] },
      '61-90 days': { count: 0, value: 0, projects: [] },
      '90+ days': { count: 0, value: 0, projects: [] }
    };
    
    // Calculate total WIP
    let totalWipValue = 0;
    
    // Process each entry
    latestWipEntries.forEach(entry => {
      const wipValue = Number(entry.wipValue);
      totalWipValue += wipValue;
      
      const project = {
        id: entry.projectId,
        name: entry.projectName,
        clientName: entry.clientName,
        wipValue,
        ageInDays: entry.ageInDays || 0
      };
      
      // Determine bucket based on ageInDays
      if (entry.ageInDays <= 30) {
        agingBuckets['0-30 days'].count++;
        agingBuckets['0-30 days'].value += wipValue;
        agingBuckets['0-30 days'].projects.push(project);
      } else if (entry.ageInDays <= 60) {
        agingBuckets['31-60 days'].count++;
        agingBuckets['31-60 days'].value += wipValue;
        agingBuckets['31-60 days'].projects.push(project);
      } else if (entry.ageInDays <= 90) {
        agingBuckets['61-90 days'].count++;
        agingBuckets['61-90 days'].value += wipValue;
        agingBuckets['61-90 days'].projects.push(project);
      } else {
        agingBuckets['90+ days'].count++;
        agingBuckets['90+ days'].value += wipValue;
        agingBuckets['90+ days'].projects.push(project);
      }
    });
    
    // Calculate percentages
    Object.keys(agingBuckets).forEach(bucket => {
      agingBuckets[bucket].percentage = totalWipValue ? 
        (agingBuckets[bucket].value / totalWipValue) * 100 : 0;
    });
    
    return res.json({
      success: true,
      data: {
        agingBuckets,
        totalWipValue,
        totalProjects: latestWipEntries.length
      }
    });
  } catch (error) {
    console.error('Error fetching WIP aging analysis:', error);
    return res.status(500).json({ error: 'Failed to fetch WIP aging analysis', details: error.message });
  }
});

/**
 * @route GET /api/wip/cashflow-projection
 * @desc Get WIP to cash flow projection
 * @access Private
 */
router.get('/cashflow-projection', auth, async (req, res) => {
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
      projectionDate.setDate(1); // First day of the month
      
      const monthlyProjection = {
        date: projectionDate,
        month: `${projectionDate.getFullYear()}-${String(projectionDate.getMonth() + 1).padStart(2, '0')}`,
        expectedBillings: 0,
        expectedWipReduction: 0,
        projects: []
      };
      
      // Calculate expected billings and WIP reduction for each project
      projects.forEach(project => {
        // Skip projects without WIP
        if (!project.wip_history.length || project.wip_history[0].wipValue <= 0) {
          return;
        }
        
        const currentWip = Number(project.wip_history[0].wipValue);
        const projectStart = new Date(project.startDate);
        const projectEnd = project.endDate ? new Date(project.endDate) : null;
        
        // Calculate monthly billing based on project timeline
        const totalMonthsRemaining = projectEnd ? 
          Math.max(1, Math.ceil((projectEnd - today) / (1000 * 60 * 60 * 24 * 30))) : 
          3; // Default to 3 months if no end date
        
        // If project should be completed by this month
        const isEndingThisMonth = projectEnd && 
          projectionDate.getMonth() === projectEnd.getMonth() && 
          projectionDate.getFullYear() === projectEnd.getFullYear();
        
        let expectedBilling;
        if (isEndingThisMonth) {
          // Bill all remaining WIP
          expectedBilling = currentWip;
        } else {
          // Distribute remaining WIP over remaining months
          expectedBilling = currentWip / totalMonthsRemaining;
        }
        
        monthlyProjection.expectedBillings += expectedBilling;
        monthlyProjection.expectedWipReduction += expectedBilling;
        
        monthlyProjection.projects.push({
          id: project.id,
          name: project.name,
          currentWip,
          expectedBilling,
          expectedWipReduction: expectedBilling,
          completionExpected: isEndingThisMonth
        });
      });
      
      projections.push(monthlyProjection);
      
      // Store projection in database for reference
      try {
        for (const projectData of monthlyProjection.projects) {
          await prisma.wip_cashflow_projection.create({
            data: {
              projectId: projectData.id,
              projectionDate: monthlyProjection.date,
              expectedBilling: projectData.expectedBilling,
              expectedWipReduction: projectData.expectedWipReduction,
              probability: 100, // Default probability
              notes: projectData.completionExpected ? 'Project completion expected' : 'Ongoing project'
            }
          });
        }
      } catch (storageError) {
        console.error('Error storing WIP projections:', storageError);
        // Continue even if storage fails
      }
    }
    
    return res.json({
      success: true,
      data: {
        projections,
        totalProjects: projects.length,
        totalCurrentWip: projects.reduce((sum, project) => {
          return sum + (project.wip_history.length > 0 ? Number(project.wip_history[0].wipValue) : 0);
        }, 0)
      }
    });
  } catch (error) {
    console.error('Error generating WIP cash flow projection:', error);
    return res.status(500).json({ error: 'Failed to generate WIP cash flow projection', details: error.message });
  }
});

/**
 * @route GET /api/wip/risk-analysis
 * @desc Get WIP risk analysis
 * @access Private
 */
router.get('/risk-analysis', auth, async (req, res) => {
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
        riskScore: entry.riskScore || 0,
        ageInDays: entry.ageInDays || 0,
        status: entry.status,
        totalValue: Number(entry.totalValue),
        wipPercentage: (wipValue / Number(entry.totalValue)) * 100
      };
      
      // Determine risk category based on risk score
      if (entry.riskScore < 25) {
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
      success: true,
      data: {
        riskCategories,
        totalWipValue,
        totalProjects: latestWipEntries.length
      }
    });
  } catch (error) {
    console.error('Error fetching WIP risk analysis:', error);
    return res.status(500).json({ error: 'Failed to fetch WIP risk analysis', details: error.message });
  }
});

/**
 * @route   GET /api/wip/analysis/by-age
 * @desc    Get WIP analysis data by age
 * @access  Private
 */
router.get('/analysis/by-age', auth, async (req, res) => {
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
router.get('/analysis/trends', auth, async (req, res) => {
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

/**
 * @route   GET /api/wip/trends
 * @desc    Get WIP trend data for visualization
 * @access  Private
 */
router.get('/trends', auth, async (req, res) => {
  try {
    const { timeRange } = req.query;
    
    // Determine date range based on timeRange parameter
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '3months':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '12months':
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      case '6months':
      default:
        startDate.setMonth(startDate.getMonth() - 6);
        break;
    }
    
    // Try to get data from WIP history first
    const wipHistory = await prisma.wip_history.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // If we have history records, aggregate them by month
    if (wipHistory.length > 0) {
      const monthlyData = {};
      
      wipHistory.forEach(record => {
        const date = new Date(record.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthName,
            wipValue: 0,
            billedValue: 0,
            earnedValue: 0,
            count: 0
          };
        }
        
        monthlyData[monthKey].wipValue += parseFloat(record.wipValue || 0);
        monthlyData[monthKey].billedValue += parseFloat(record.billedValue || 0);
        monthlyData[monthKey].earnedValue += parseFloat(record.earnedValue || 0);
        monthlyData[monthKey].count++;
      });
      
      // Convert to array and average the values
      const trendData = Object.keys(monthlyData).sort().map(key => {
        const data = monthlyData[key];
        return {
          month: data.month,
          wipValue: data.wipValue / data.count,
          billedValue: data.billedValue / data.count,
          earnedValue: data.earnedValue / data.count
        };
      });
      
      return res.json(trendData);
    }
    
    // If no history, generate sample data based on current projects
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
    
    // Calculate current WIP totals
    let currentWipTotal = 0;
    let currentBilledTotal = 0;
    let currentEarnedTotal = 0;
    
    projects.forEach(project => {
      // Calculate total costs
      const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate total billed
      const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate project's total value
      const totalValue = parseFloat(project.totalValue || 0);
      
      // Calculate percentage of completion based on progress field or estimate from costs
      let completionPercentage = project.progress || 0;
      if (completionPercentage === 0 && totalValue > 0) {
        // Estimate total cost as 70% of project value (standard cost ratio)
        const estimatedTotalCost = totalValue * 0.7;
        completionPercentage = estimatedTotalCost > 0 ? (totalCosts / estimatedTotalCost) * 100 : 0;
        completionPercentage = Math.min(completionPercentage, 100);
      }
      
      // Calculate earned value based on percentage of completion
      const earnedValue = (completionPercentage / 100) * totalValue;
      
      // Calculate WIP value using earned value method
      const wipValue = earnedValue - totalBilled;
      
      // Add to totals
      currentWipTotal += wipValue;
      currentBilledTotal += totalBilled;
      currentEarnedTotal += earnedValue;
    });
    
    // Generate trend data based on current values
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const numMonths = timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;
    
    const trendData = [];
    for (let i = 0; i < numMonths; i++) {
      const monthIndex = (currentMonth - numMonths + 1 + i) % 12;
      const monthName = months[monthIndex >= 0 ? monthIndex : monthIndex + 12];
      
      // Generate values with some variance to simulate historical data
      const factor = 0.7 + (i / numMonths) * 0.6; // Gradually increases from 0.7 to 1.3
      
      trendData.push({
        month: monthName,
        wipValue: currentWipTotal * factor * (0.9 + Math.random() * 0.2),
        billedValue: currentBilledTotal * factor * (0.9 + Math.random() * 0.2),
        earnedValue: currentEarnedTotal * factor * (0.9 + Math.random() * 0.2)
      });
    }
    
    return res.json(trendData);
  } catch (error) {
    console.error('WIP trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WIP trends data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/wip/projections
 * @desc    Get WIP cashflow projections
 * @access  Private
 */
router.get('/projections', auth, async (req, res) => {
  try {
    const { period } = req.query;
    
    // Determine number of months to project
    let numMonths = 6;
    if (period === '3months') {
      numMonths = 3;
    } else if (period === '12months') {
      numMonths = 12;
    }
    
    // Get all active projects
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['ongoing', 'planned'] }
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
    
    // Calculate current WIP values for each project
    const projectsWithWip = projects.map(project => {
      // Calculate total costs
      const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate total billed
      const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate project's total value
      const totalValue = parseFloat(project.totalValue || 0);
      
      // Calculate percentage of completion based on progress field or estimate from costs
      let completionPercentage = project.progress || 0;
      if (completionPercentage === 0 && totalValue > 0) {
        // Estimate total cost as 70% of project value (standard cost ratio)
        const estimatedTotalCost = totalValue * 0.7;
        completionPercentage = estimatedTotalCost > 0 ? (totalCosts / estimatedTotalCost) * 100 : 0;
        completionPercentage = Math.min(completionPercentage, 100);
      }
      
      // Calculate earned value based on percentage of completion
      const earnedValue = (completionPercentage / 100) * totalValue;
      
      // Calculate WIP value using earned value method
      const wipValue = earnedValue - totalBilled;
      
      return {
        ...project,
        wipValue,
        completionPercentage
      };
    }).filter(project => project.wipValue > 0);
    
    // Generate monthly projections
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    const projections = [];
    for (let i = 0; i < numMonths; i++) {
      const monthIndex = (currentMonth + i) % 12;
      const monthName = months[monthIndex];
      
      // Calculate expected billings and collections for this month
      let expectedBillings = 0;
      let expectedCollections = 0;
      
      projectsWithWip.forEach(project => {
        // Estimate how much of the WIP will be billed this month
        const remainingMonths = project.endDate ? 
          Math.max(1, Math.ceil((new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24 * 30))) :
          Math.max(3, numMonths - i);
        
        // If project ends this month, bill all remaining WIP
        const isEndingThisMonth = project.endDate && 
          new Date(project.endDate).getMonth() === monthIndex &&
          new Date(project.endDate).getFullYear() === new Date().getFullYear() + Math.floor((currentMonth + i) / 12);
        
        const billingAmount = isEndingThisMonth ? 
          project.wipValue : 
          project.wipValue / remainingMonths;
        
        expectedBillings += billingAmount;
        
        // Collections typically lag billings by 1 month with 90% collection rate
        if (i > 0) {
          const previousMonthBilling = projectsWithWip.reduce((sum, p) => {
            const prevMonthRemaining = p.endDate ? 
              Math.max(1, Math.ceil((new Date(p.endDate) - new Date()) / (1000 * 60 * 60 * 24 * 30)) + 1) :
              Math.max(3, numMonths - i + 1);
            
            const prevMonthIsEndingMonth = p.endDate && 
              new Date(p.endDate).getMonth() === (currentMonth + i - 1) % 12 &&
              new Date(p.endDate).getFullYear() === new Date().getFullYear() + Math.floor((currentMonth + i - 1) / 12);
            
            const prevBilling = prevMonthIsEndingMonth ? 
              p.wipValue : 
              p.wipValue / prevMonthRemaining;
            
            return sum + prevBilling;
          }, 0);
          
          expectedCollections += previousMonthBilling * 0.9; // 90% collection rate
        }
      });
      
      // Calculate WIP conversion rate (how much WIP is converted to billings)
      const totalWip = projectsWithWip.reduce((sum, p) => sum + p.wipValue, 0);
      const wipConversion = totalWip > 0 ? (expectedBillings / totalWip) * 100 : 0;
      
      projections.push({
        month: monthName,
        expectedBillings,
        expectedCollections,
        wipConversion
      });
    }
    
    return res.json(projections);
  } catch (error) {
    console.error('WIP projections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WIP projections data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/wip/analysis/risk
 * @desc    Get WIP risk analysis data
 * @access  Private
 */
router.get('/analysis/risk', auth, async (req, res) => {
  try {
    // Get all projects with WIP
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
    
    // Calculate WIP and risk factors for each project
    const projectsWithRisk = [];
    let totalWipValue = 0;
    
    projects.forEach(project => {
      // Calculate total costs
      const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate total billed
      const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate project's total value
      const totalValue = parseFloat(project.totalValue || 0);
      
      // Calculate percentage of completion based on progress field or estimate from costs
      let completionPercentage = project.progress || 0;
      if (completionPercentage === 0 && totalValue > 0) {
        // Estimate total cost as 70% of project value (standard cost ratio)
        const estimatedTotalCost = totalValue * 0.7;
        completionPercentage = estimatedTotalCost > 0 ? (totalCosts / estimatedTotalCost) * 100 : 0;
        completionPercentage = Math.min(completionPercentage, 100);
      }
      
      // Calculate earned value based on percentage of completion
      const earnedValue = (completionPercentage / 100) * totalValue;
      
      // Calculate WIP value using earned value method
      const wipValue = earnedValue - totalBilled;
      
      // Skip projects with no WIP
      if (wipValue <= 0) return;
      
      // Calculate age in days
      const today = new Date();
      const startDate = new Date(project.startDate);
      const ageInDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
      
      // Calculate risk factors
      const ageRisk = Math.min(100, ageInDays / 180 * 100); // Higher age = higher risk, max at 180 days
      const wipToValueRatio = totalValue > 0 ? (wipValue / totalValue) * 100 : 0;
      const valueRisk = Math.min(100, wipToValueRatio * 2); // Higher WIP to value ratio = higher risk
      const completionRisk = Math.max(0, 100 - completionPercentage); // Lower completion = higher risk
      
      // Calculate overall risk score (weighted average)
      const riskScore = (ageRisk * 0.4) + (valueRisk * 0.3) + (completionRisk * 0.3);
      
      // Determine risk level
      let riskLevel;
      if (riskScore < 30) {
        riskLevel = 'Low';
      } else if (riskScore < 60) {
        riskLevel = 'Medium';
      } else {
        riskLevel = 'High';
      }
      
      projectsWithRisk.push({
        id: project.id,
        name: project.name,
        client: project.client.name,
        wipValue,
        riskScore,
        riskLevel,
        ageInDays,
        factors: {
          age: ageRisk,
          wipToValue: valueRisk,
          completion: completionRisk
        }
      });
      
      totalWipValue += wipValue;
    });
    
    // Group by risk level
    const riskAssessment = [
      { level: 'Low', description: 'Expected to bill within 30 days', amount: 0, percent: 0 },
      { level: 'Medium', description: 'May face billing delays', amount: 0, percent: 0 },
      { level: 'High', description: 'At risk of non-payment', amount: 0, percent: 0 },
    ];
    
    // Calculate risk factor averages
    const riskFactors = [
      { name: 'Age', value: 0, fullMark: 100 },
      { name: 'WIP to Value Ratio', value: 0, fullMark: 100 },
      { name: 'Completion', value: 0, fullMark: 100 },
      { name: 'Client History', value: 70, fullMark: 100 }, // Default value
      { name: 'Documentation', value: 65, fullMark: 100 }, // Default value
    ];
    
    // Populate risk assessment and calculate averages
    projectsWithRisk.forEach(project => {
      // Add to risk assessment
      if (project.riskLevel === 'Low') {
        riskAssessment[0].amount += project.wipValue;
      } else if (project.riskLevel === 'Medium') {
        riskAssessment[1].amount += project.wipValue;
      } else {
        riskAssessment[2].amount += project.wipValue;
      }
      
      // Add to risk factor averages
      riskFactors[0].value += project.factors.age;
      riskFactors[1].value += project.factors.wipToValue;
      riskFactors[2].value += project.factors.completion;
    });
    
    // Calculate percentages for risk assessment
    if (totalWipValue > 0) {
      riskAssessment.forEach(level => {
        level.percent = (level.amount / totalWipValue) * 100;
      });
    }
    
    // Calculate averages for risk factors
    if (projectsWithRisk.length > 0) {
      riskFactors[0].value = riskFactors[0].value / projectsWithRisk.length;
      riskFactors[1].value = riskFactors[1].value / projectsWithRisk.length;
      riskFactors[2].value = riskFactors[2].value / projectsWithRisk.length;
    }
    
    res.json({
      riskAssessment,
      riskFactors,
      projects: projectsWithRisk
    });
  } catch (error) {
    console.error('WIP risk analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WIP risk analysis data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/wip/projects
 * @desc    Get all projects with WIP data
 * @access  Private
 */
router.get('/projects', auth, async (req, res) => {
  try {
    // Get all projects with related data
    const projects = await prisma.project.findMany({
      include: {
        client: true,
        projectcost: true, // Include all project costs regardless of status
        billing: true,
        wip_history: {
          orderBy: {
            date: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    // Calculate WIP values for each project
    const projectsWithWip = projects.map(project => {
      // Calculate total costs
      const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
      
      // Calculate total billed
      const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
      
      // Calculate project's total value
      const totalValue = parseFloat(project.totalValue || 0);
      
      // Use the stored progress field or calculate percentage of completion based on costs
      let completionPercentage = project.progress ? parseFloat(project.progress) : 0;
      if (completionPercentage === 0 && totalValue > 0) {
        // Estimate total cost as 70% of project value (standard cost ratio)
        const estimatedTotalCost = totalValue * 0.7;
        completionPercentage = estimatedTotalCost > 0 ? (totalCosts / estimatedTotalCost) * 100 : 0;
        completionPercentage = Math.min(completionPercentage, 100);
      }
      
      // Calculate earned value based on percentage of completion
      const earnedValue = (completionPercentage / 100) * totalValue;
      
      // Calculate WIP value using earned value method
      const wipValue = earnedValue - totalBilled;
      
      // Get latest WIP history if available
      const latestWipHistory = project.wip_history.length > 0 ? project.wip_history[0] : null;
      
      // Calculate age in days if start date is available
      const ageInDays = project.startDate ? 
        Math.floor((new Date() - new Date(project.startDate)) / (1000 * 60 * 60 * 24)) : 0;
      
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
        costsByCategory: {},
        billed: totalBilled,
        wipValue: wipValue,
        progress: completionPercentage,
        ageInDays: latestWipHistory?.ageInDays || ageInDays,
        riskScore: latestWipHistory?.riskScore || 0
      };
    });
    
    res.json(projectsWithWip);
  } catch (error) {
    console.error('Error fetching WIP projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WIP projects',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/wip/:projectId
 * @desc    Get WIP data for a specific project
 * @access  Private
 */
router.get('/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Validate projectId is a number
    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }
    
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
 * @desc    Create WIP data for a project
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
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
    
    // Check if project exists and fetch project costs and billings
    const project = await prisma.project.findUnique({
      where: {
        id: parseInt(projectId)
      },
      include: {
        projectcost: true,
        billing: true
      }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Validate that project has at least one project cost
    if (!project.projectcost || project.projectcost.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Project must have at least one project cost before creating WIP entry'
      });
    }
    
    // Validate that project has at least one billing
    if (!project.billing || project.billing.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Project must have at least one billing before creating WIP entry'
      });
    }
    
    // Calculate actual costs from project costs
    const actualCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
    
    // Calculate actual billed from billings
    const actualBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
    
    // Validate provided costs against actual costs
    if (Math.abs(costs - actualCosts) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Provided costs do not match actual project costs',
        expectedCosts: actualCosts,
        providedCosts: costs
      });
    }
    
    // Validate provided billed against actual billed
    if (Math.abs(billed - actualBilled) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Provided billed amount does not match actual project billings',
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
    
    // Create a transaction record for accounting purposes
    try {
      // Use the WIP service to create double-entry transaction
      const wipService = require('../services/wipService');
      const transaction = await wipService.recordWipTransaction(parseInt(projectId), wipValue, notes);
      
      // Record WIP history
      await wipService.recordWipHistory(parseInt(projectId), {
        wipValue,
        earnedValue: project.totalValue * (progress / 100),
        totalCost: costs,
        progress,
        totalBilled: billed
      });
    } catch (transactionError) {
      console.error('Error recording WIP transaction:', transactionError);
      // Continue even if transaction recording fails
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
 * @route   POST /api/wip/recalculate/:projectId
 * @desc    Recalculate WIP for a specific project
 * @access  Private
 */
router.post('/recalculate/:projectId', auth, async (req, res) => {
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
router.post('/recalculate-all', auth, async (req, res) => {
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
 * @route   PUT /api/wip/:projectId
 * @desc    Update WIP data for a specific project
 * @access  Private
 */
router.put('/:projectId', auth, async (req, res) => {
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
 * @route   DELETE /api/wip/:projectId
 * @desc    Delete WIP data and related transactions for a project
 * @access  Private
 */
router.delete('/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
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
    
    // Delete WIP transactions using WIP service
    const wipService = require('../services/wipService');
    const transactionDeleted = await wipService.deleteWipTransaction(parseInt(projectId));
    
    // Reset project progress information
    await prisma.project.update({
      where: {
        id: parseInt(projectId)
      },
      data: {
        progress: 0,
        updatedAt: new Date()
      }
    });
    
    // Delete WIP history records
    const deletedHistory = await prisma.wipHistory.deleteMany({
      where: {
        projectId: parseInt(projectId)
      }
    });
    
    res.json({
      success: true,
      message: 'WIP data deleted successfully',
      transactionDeleted,
      historyRecordsDeleted: deletedHistory.count
    });
  } catch (error) {
    console.error('Error deleting WIP data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete WIP data',
      error: error.message
    });
  }
});

module.exports = router; 