const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    
    // Update project progress
    const updatedProject = await updateProjectProgress(projectId, wipCalculation.completionPercentage);
    
    return {
      success: true,
      project: updatedProject,
      wipCalculation,
      transaction
    };
  } catch (error) {
    console.error('Error processing project WIP:', error);
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
  processProjectWip
}; 