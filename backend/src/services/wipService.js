const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');
const doubleEntryService = require('./doubleEntryService');

/**
 * Calculate WIP value for a project using the Earned Value Method
 * @param {Object} project - Project object with costs, billing, and totalValue
 * @returns {Object} - WIP calculation result
 */
const calculateWipValue = (project) => {
  // Calculate total costs - include all costs regardless of status (approved, pending, paid, unpaid, rejected)
  const totalCosts = project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0);
  
  // Calculate total billed
  const totalBilled = project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);
  
  // Calculate project's total value
  const totalValue = parseFloat(project.totalValue || 0);
  
  // For completed projects, use actual progress value or 100%
  let completionPercentage = 0;
  
  if (project.status === 'completed') {
    // For completed projects, set completion to 100%
    completionPercentage = 100;
  } else if (totalValue > 0) {
    // For ongoing projects, estimate completion based on costs
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
  
  // Log for debugging
  console.log(`WIP calculation for project ${project.id}:`, {
    status: project.status,
    totalCosts,
    totalBilled,
    totalValue,
    completionPercentage,
    earnedValue,
    wipValue,
    costCount: project.projectcost.length
  });
  
  return {
    totalCosts,
    totalBilled,
    completionPercentage,
    earnedValue,
    wipValue
  };
};

/**
 * Create double-entry accounting transaction for WIP
 * @param {number} projectId - Project ID
 * @param {number} wipValue - WIP value to record
 * @param {string} notes - Transaction notes
 * @returns {Promise<Object>} - Created transactions
 */
const createWipDoubleEntryTransaction = async (projectId, wipValue, notes) => {
  try {
    // Find WIP account code (Pekerjaan Dalam Proses)
    const wipAccount = await prisma.chartofaccount.findFirst({
      where: {
        OR: [
          { name: { contains: 'Work In Progress' } },
          { name: { contains: 'WIP' } },
          { name: { contains: 'Pekerjaan Dalam Proses' } },
          { code: '1301' }
        ]
      }
    });
    
    if (!wipAccount) {
      throw new Error('WIP account not found in chart of accounts');
    }
    
    // Find Laba Ditahan account code
    const retainedEarningsAccount = await prisma.chartofaccount.findFirst({
      where: {
        OR: [
          { name: { contains: 'Retained Earnings' } },
          { name: { contains: 'Laba Ditahan' } },
          { code: '3102' }
        ]
      }
    });
    
    if (!retainedEarningsAccount) {
      throw new Error('Retained Earnings account not found in chart of accounts');
    }
    
    // Get project details for reference
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Determine transaction type and accounts based on WIP value
    // If WIP is positive: Debit WIP, Credit Retained Earnings
    // If WIP is negative (overbilling): Debit Retained Earnings, Credit WIP
    const isPositiveWip = wipValue >= 0;
    const absWipValue = Math.abs(wipValue);
    
    // Create primary transaction data
    const primaryTransaction = {
      date: new Date(),
      // If WIP is positive, debit WIP account (income type)
      // If WIP is negative, debit Retained Earnings (income type)
      type: 'income',
      accountCode: isPositiveWip ? wipAccount.code : retainedEarningsAccount.code,
      description: `WIP adjustment for project ${project.projectCode || project.name}`,
      amount: absWipValue,
      projectId: projectId,
      notes: notes || `WIP value updated. Earned Value Method calculation.`
    };
    
    // Create counter transaction data
    const counterTransaction = {
      date: new Date(),
      // If WIP is positive, credit Retained Earnings (expense type)
      // If WIP is negative, credit WIP account (expense type)
      type: 'expense',
      accountCode: isPositiveWip ? retainedEarningsAccount.code : wipAccount.code,
      description: `Counter entry for: WIP adjustment for project ${project.projectCode || project.name}`,
      amount: absWipValue,
      projectId: projectId,
      notes: `Counter transaction for WIP adjustment`
    };
    
    // Create double-entry transaction
    const result = await doubleEntryService.createDoubleEntryTransaction(
      primaryTransaction,
      counterTransaction
    );
    
    return result;
  } catch (error) {
    logger.error(`Error creating WIP double-entry transaction: ${error.message}`);
    throw error;
  }
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
    // Use double-entry accounting for WIP transactions
    const transactions = await createWipDoubleEntryTransaction(projectId, wipValue, notes);
    return transactions;
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

/**
 * Update WIP automatically when project costs or billings change
 * @param {number} projectId - Project ID
 * @param {string} triggerType - What triggered the update (COST or BILLING)
 * @returns {Promise<Object>} - Updated WIP data
 */
const updateWipAutomatically = async (projectId, triggerType = 'COST') => {
  try {
    console.log(`Auto-updating WIP for project ${projectId} triggered by ${triggerType}`);
    
    // Process WIP for the project
    return await processProjectWip(projectId);
  } catch (error) {
    console.error(`Error updating WIP automatically for project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Create a WIP notification
 * @param {number} projectId - The project ID
 * @param {object} notificationData - Notification data
 * @returns {Promise<object>} - The created notification
 */
async function createWipNotification(projectId, notificationData) {
  try {
    const notification = await prisma.wip_notification.create({
      data: {
        projectId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        level: notificationData.level || 'info',
        metadata: notificationData.metadata || {}
      }
    });
    
    logger.info(`Created WIP notification for project ${projectId}: ${notificationData.title}`);
    return notification;
  } catch (error) {
    logger.error(`Error creating WIP notification: ${error.message}`);
    throw error;
  }
}

/**
 * Check WIP thresholds and create notifications if needed
 * @param {number} projectId - The project ID
 * @returns {Promise<object>} - Results of the threshold checks
 */
async function checkWipThresholds(projectId) {
  try {
    // Get the latest WIP history entry for the project
    const latestWipEntry = await prisma.wip_history.findFirst({
      where: { projectId },
      orderBy: { date: 'desc' },
      take: 1
    });
    
    if (!latestWipEntry) {
      return { success: false, message: 'No WIP history found for this project' };
    }
    
    // Get active thresholds
    const activeThresholds = await prisma.wip_threshold.findMany({
      where: { isActive: true }
    });
    
    if (!activeThresholds.length) {
      return { success: true, message: 'No active thresholds found', triggered: 0 };
    }
    
    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return { success: false, message: 'Project not found' };
    }
    
    // Check each threshold
    let triggeredCount = 0;
    const notifications = [];
    
    for (const threshold of activeThresholds) {
      let isTriggered = false;
      let comparisonValue;
      
      // Get the value to compare based on the metric type
      switch (threshold.metricType) {
        case 'VALUE':
          comparisonValue = Number(latestWipEntry.wipValue);
          break;
        case 'PERCENTAGE':
          comparisonValue = (Number(latestWipEntry.wipValue) / Number(project.totalValue)) * 100;
          break;
        case 'AGE':
          comparisonValue = latestWipEntry.ageInDays;
          break;
        case 'RISK_SCORE':
          comparisonValue = latestWipEntry.riskScore;
          break;
        default:
          comparisonValue = Number(latestWipEntry.wipValue);
      }
      
      // Check if threshold is triggered based on operator
      const thresholdValue = Number(threshold.thresholdValue);
      switch (threshold.operator) {
        case 'GT':
          isTriggered = comparisonValue > thresholdValue;
          break;
        case 'LT':
          isTriggered = comparisonValue < thresholdValue;
          break;
        case 'EQ':
          isTriggered = comparisonValue === thresholdValue;
          break;
        case 'GTE':
          isTriggered = comparisonValue >= thresholdValue;
          break;
        case 'LTE':
          isTriggered = comparisonValue <= thresholdValue;
          break;
        default:
          isTriggered = false;
      }
      
      // Create notification if threshold is triggered
      if (isTriggered) {
        triggeredCount++;
        
        try {
          const notification = await createWipNotification(projectId, {
            type: 'WIP_THRESHOLD',
            title: `WIP Threshold Alert: ${threshold.name}`,
            message: `Project "${project.name}" has triggered the ${threshold.name} threshold. ${threshold.description || ''}`,
            level: 'warning',
            metadata: {
              thresholdId: threshold.id,
              thresholdName: threshold.name,
              metricType: threshold.metricType,
              operator: threshold.operator,
              thresholdValue,
              actualValue: comparisonValue
            }
          });
          
          notifications.push(notification);
        } catch (error) {
          logger.error(`Error creating threshold notification: ${error.message}`);
          // Continue checking other thresholds even if notification fails
        }
      }
    }
    
    return {
      success: true,
      triggered: triggeredCount,
      notifications,
      projectId,
      projectName: project.name
    };
  } catch (error) {
    logger.error(`Error checking WIP thresholds: ${error.message}`);
    throw error;
  }
}

/**
 * Delete WIP accounting transaction with double-entry principle
 * @param {number} projectId - Project ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteWipDoubleEntryTransaction = async (projectId) => {
  try {
    // Find WIP account code
    const wipAccount = await prisma.chartofaccount.findFirst({
      where: {
        OR: [
          { name: { contains: 'Work In Progress' } },
          { name: { contains: 'WIP' } },
          { name: { contains: 'Pekerjaan Dalam Proses' } },
          { code: '1301' }
        ]
      }
    });
    
    if (!wipAccount) {
      throw new Error('WIP account not found in chart of accounts');
    }
    
    // Find recent WIP transactions for this project
    const wipTransactions = await prisma.transaction.findMany({
      where: {
        projectId: projectId,
        accountCode: wipAccount.code,
        description: {
          contains: 'WIP adjustment'
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 2 // Get the most recent transactions
    });
    
    if (wipTransactions.length === 0) {
      logger.info(`No recent WIP transactions found for project ${projectId}`);
      return false;
    }
    
    // For each transaction, find and delete its counter transaction
    for (const transaction of wipTransactions) {
      // Find counter transaction
      const counterTransaction = await doubleEntryService.findCounterTransaction(transaction.id);
      
      if (counterTransaction) {
        // Delete counter transaction
        await prisma.transaction.delete({
          where: { id: counterTransaction.id }
        });
        
        // Delete primary transaction
        await prisma.transaction.delete({
          where: { id: transaction.id }
        });
        
        logger.info(`Deleted WIP transaction ${transaction.id} and counter transaction ${counterTransaction.id}`);
      } else {
        // Delete just the primary transaction if counter not found
        await prisma.transaction.delete({
          where: { id: transaction.id }
        });
        
        logger.info(`Deleted WIP transaction ${transaction.id} (counter transaction not found)`);
      }
    }
    
    return true;
  } catch (error) {
    logger.error(`Error deleting WIP double-entry transaction: ${error.message}`);
    throw error;
  }
};

/**
 * Delete WIP transaction for a project
 * @param {number} projectId - Project ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteWipTransaction = async (projectId) => {
  try {
    // Use double-entry accounting to delete WIP transactions
    const result = await deleteWipDoubleEntryTransaction(projectId);
    return result;
  } catch (error) {
    console.error('Error deleting WIP transaction:', error);
    throw error;
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
  getWipTrendData,
  updateWipAutomatically,
  createWipNotification,
  checkWipThresholds,
  deleteWipTransaction,
  createWipDoubleEntryTransaction
}; 
