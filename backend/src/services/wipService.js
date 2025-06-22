const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

/**
 * Calculate WIP value for a project using the Earned Value Method
 * @param {Object} project - Project object with costs, billing, and totalValue
 * @returns {Object} - WIP calculation result
 */
const calculateWipValue = (project) => {
  // Calculate total costs
  const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
  
  // Calculate total billed
  const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
  
  // Calculate project's total value
  const totalValue = parseFloat(project.totalValue || 0);
  
  // Calculate percentage of completion based on costs vs expected total cost
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
  
  return {
    totalCosts,
    totalBilled,
    completionPercentage,
    earnedValue,
    wipValue
  };
};

/**
 * Record WIP accounting transaction
 * @param {number} projectId - Project ID
 * @param {number} wipValue - WIP value to record
 * @param {string} notes - Transaction notes
 * @returns {Promise<Object>} - Created transaction
 */
const recordWipTransaction = async (projectId, wipValue, notes) => {
  try {
    // Find WIP account code from chart of accounts
    const wipAccount = await prisma.chartofaccount.findFirst({
      where: {
        OR: [
          { name: { contains: 'Work In Progress' } },
          { name: { contains: 'WIP' } },
          { code: '1301' },
          { code: '1302' }
        ]
      }
    });
    
    if (!wipAccount) {
      throw new Error('WIP account not found in chart of accounts');
    }
    
    // Get project details for reference
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Record the WIP transaction
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(),
        type: wipValue > 0 ? 'WIP_INCREASE' : 'WIP_DECREASE',
        accountCode: wipAccount.code,
        description: `WIP adjustment for project ${project.projectCode || project.name}`,
        amount: Math.abs(wipValue),
        projectId: projectId,
        notes: notes || `WIP value updated. Earned Value Method calculation.`,
        updatedAt: new Date()
      }
    });
    
    return transaction;
  } catch (error) {
    console.error('Error recording WIP transaction:', error);
    throw error;
  }
};

/**
 * Update project progress based on WIP calculation
 * @param {number} projectId - Project ID
 * @param {number} completionPercentage - Calculated completion percentage
 * @returns {Promise<Object>} - Updated project
 */
const updateProjectProgress = async (projectId, completionPercentage) => {
  try {
    // Determine appropriate project status based on progress
    let newStatus = 'ongoing';
    if (completionPercentage >= 100) {
      newStatus = 'completed';
    } else if (completionPercentage <= 0) {
      newStatus = 'planned';
    }
    
    // Update project with progress information and status
    const updatedProject = await prisma.project.update({
      where: {
        id: projectId
      },
      data: {
        status: newStatus,
        progress: completionPercentage,
        description: `Progress: ${completionPercentage.toFixed(2)}%`,
        updatedAt: new Date()
      }
    });
    
    return updatedProject;
  } catch (error) {
    console.error('Error updating project progress:', error);
    throw error;
  }
};

/**
 * Record WIP history for a project
 * @param {number} projectId - The project ID
 * @param {object} wipData - The WIP data
 * @returns {Promise<object>} - The created WIP history record
 */
async function recordWipHistory(projectId, wipData) {
  try {
    const { wipValue, earnedValue, totalCost, progress, totalBilled } = wipData;
    
    // Get project to calculate age
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { startDate: true }
    });
    
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    
    const today = new Date();
    const startDate = new Date(project.startDate);
    const ageInDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    
    // Calculate risk score based on WIP age and value
    // Risk factors: 
    // 1. Age (older WIP is riskier)
    // 2. WIP value as percentage of total project value
    // 3. Negative WIP (overbilled) is less risky than positive WIP (underbilled)
    const riskScore = calculateWipRiskScore(wipValue, totalCost, ageInDays);
    
    // Record WIP history with proper handling of null/undefined values
    const wipHistory = await prisma.wip_history.create({
      data: {
        projectId,
        date: today,
        wipValue: wipValue || 0,
        earnedValue: earnedValue || 0,
        billedValue: totalBilled || 0,
        totalCost: totalCost || 0,
        progress: progress || 0,
        riskScore,
        ageInDays
      }
    });
    
    logger.info(`Recorded WIP history for project ${projectId}`);
    return wipHistory;
  } catch (error) {
    logger.error(`Error recording WIP history: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate WIP risk score based on various factors
 * @param {number} wipValue - The WIP value
 * @param {number} totalCost - The total cost
 * @param {number} ageInDays - Age of the project in days
 * @returns {number} - Risk score from 0 (low risk) to 100 (high risk)
 */
function calculateWipRiskScore(wipValue, totalCost, ageInDays) {
  // Base risk starts at 0
  let riskScore = 0;
  
  // Age factor: 0-30 days (0 points), 31-60 days (10 points), 61-90 days (20 points), 90+ days (30 points)
  if (ageInDays <= 30) {
    riskScore += 0;
  } else if (ageInDays <= 60) {
    riskScore += 10;
  } else if (ageInDays <= 90) {
    riskScore += 20;
  } else {
    riskScore += 30;
  }
  
  // WIP value factor: WIP as percentage of total cost
  // <10% (0 points), 10-20% (10 points), 20-30% (20 points), >30% (40 points)
  const wipPercentage = (wipValue / totalCost) * 100;
  if (wipPercentage < 10) {
    riskScore += 0;
  } else if (wipPercentage < 20) {
    riskScore += 10;
  } else if (wipPercentage < 30) {
    riskScore += 20;
  } else {
    riskScore += 40;
  }
  
  // Negative WIP factor (overbilled): Reduces risk
  if (wipValue < 0) {
    riskScore = Math.max(0, riskScore - 20);
  }
  
  // Cap risk score at 100
  return Math.min(100, riskScore);
}

/**
 * Get WIP aging analysis for all projects
 * @returns {Promise<object>} - WIP aging analysis
 */
async function getWipAgingAnalysis() {
  try {
    // Get latest WIP history entry for each project
    const latestWipEntries = await prisma.$queryRaw`
      SELECT wh.*
      FROM wip_history wh
      INNER JOIN (
        SELECT projectId, MAX(date) as maxDate
        FROM wip_history
        GROUP BY projectId
      ) latest ON wh.projectId = latest.projectId AND wh.date = latest.maxDate
    `;
    
    // Calculate aging buckets
    const agingBuckets = {
      '0-30': { count: 0, value: 0 },
      '31-60': { count: 0, value: 0 },
      '61-90': { count: 0, value: 0 },
      '90+': { count: 0, value: 0 }
    };
    
    // Calculate total WIP
    let totalWipValue = 0;
    
    // Process each entry
    latestWipEntries.forEach(entry => {
      totalWipValue += Number(entry.wipValue);
      
      // Determine bucket
      if (entry.ageInDays <= 30) {
        agingBuckets['0-30'].count++;
        agingBuckets['0-30'].value += Number(entry.wipValue);
      } else if (entry.ageInDays <= 60) {
        agingBuckets['31-60'].count++;
        agingBuckets['31-60'].value += Number(entry.wipValue);
      } else if (entry.ageInDays <= 90) {
        agingBuckets['61-90'].count++;
        agingBuckets['61-90'].value += Number(entry.wipValue);
      } else {
        agingBuckets['90+'].count++;
        agingBuckets['90+'].value += Number(entry.wipValue);
      }
    });
    
    // Calculate percentages
    Object.keys(agingBuckets).forEach(bucket => {
      agingBuckets[bucket].percentage = totalWipValue ? 
        (agingBuckets[bucket].value / totalWipValue) * 100 : 0;
    });
    
    return {
      agingBuckets,
      totalWipValue,
      totalProjects: latestWipEntries.length
    };
  } catch (error) {
    logger.error(`Error getting WIP aging analysis: ${error.message}`);
    throw error;
  }
}

/**
 * Get WIP history for a project
 * @param {number} projectId - The project ID
 * @param {object} options - Options for filtering
 * @returns {Promise<Array>} - WIP history entries
 */
async function getWipHistory(projectId, options = {}) {
  try {
    const { startDate, endDate, limit } = options;
    
    const where = { projectId };
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    const wipHistory = await prisma.wip_history.findMany({
      where,
      orderBy: { date: 'asc' },
      ...(limit ? { take: limit } : {})
    });
    
    return wipHistory;
  } catch (error) {
    logger.error(`Error getting WIP history: ${error.message}`);
    throw error;
  }
}

/**
 * Get WIP trend data for all projects
 * @param {object} options - Options for filtering
 * @returns {Promise<Array>} - WIP trend data
 */
async function getWipTrendData(options = {}) {
  try {
    const { startDate, endDate, interval = 'day' } = options;
    
    let dateFormat;
    let dateGroupBy;
    
    // Determine date format and grouping based on interval
    switch (interval) {
      case 'week':
        dateFormat = '%Y-%u'; // Year-Week
        dateGroupBy = 'YEARWEEK(date, 1)';
        break;
      case 'month':
        dateFormat = '%Y-%m'; // Year-Month
        dateGroupBy = 'DATE_FORMAT(date, "%Y-%m")';
        break;
      case 'quarter':
        dateFormat = '%Y-Q%q'; // Year-Quarter
        dateGroupBy = 'CONCAT(YEAR(date), "-Q", QUARTER(date))';
        break;
      default: // day
        dateFormat = '%Y-%m-%d'; // Year-Month-Day
        dateGroupBy = 'DATE(date)';
    }
    
    // Query to get WIP trend data
    const trendData = await prisma.$queryRaw`
      SELECT 
        ${dateGroupBy} as periodKey,
        DATE_FORMAT(MIN(date), ${dateFormat}) as period,
        SUM(wipValue) as totalWipValue,
        SUM(earnedValue) as totalEarnedValue,
        SUM(billedValue) as totalBilledValue,
        COUNT(DISTINCT projectId) as projectCount
      FROM wip_history
      WHERE date BETWEEN ${startDate ? new Date(startDate) : new Date(0)} AND ${endDate ? new Date(endDate) : new Date()}
      GROUP BY periodKey
      ORDER BY MIN(date) ASC
    `;
    
    return trendData;
  } catch (error) {
    logger.error(`Error getting WIP trend data: ${error.message}`);
    throw error;
  }
}

/**
 * Process WIP for a project - calculate, record transaction, update progress
 * @param {number} projectId - Project ID
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} - WIP processing result
 */
const processProjectWip = async (projectId, notes = '') => {
  try {
    // Get project with related data
    const project = await prisma.project.findUnique({
      where: {
        id: projectId
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
      throw new Error('Project not found');
    }
    
    // Calculate WIP value
    const wipCalculation = calculateWipValue(project);
    
    // Record transaction if WIP value is significant
    let transaction = null;
    if (Math.abs(wipCalculation.wipValue) > 0.01) {
      transaction = await recordWipTransaction(projectId, wipCalculation.wipValue, notes);
    }
    
    // Record WIP history
    await recordWipHistory(projectId, wipCalculation);
    
    // Update project progress
    const updatedProject = await updateProjectProgress(projectId, wipCalculation.completionPercentage);
    
    return {
      success: true,
      project: updatedProject,
      wipCalculation,
      transaction
    };
  } catch (error) {
    logger.error(`Error processing project WIP: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  calculateWipValue,
  recordWipTransaction,
  updateProjectProgress,
  processProjectWip,
  recordWipHistory,
  getWipAgingAnalysis,
  getWipHistory,
  getWipTrendData
}; 