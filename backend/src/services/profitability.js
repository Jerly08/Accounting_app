/**
 * Profitability Service
 * Service untuk menghitung laba rugi proyek
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Menghitung metrik profitabilitas untuk satu proyek
 * @param {Object} project - Objek proyek dengan costs, billings, dan transactions
 * @returns {Object} - Metrik profitabilitas
 */
const calculateProjectProfitability = (project) => {
  // Hitung total biaya dari projectcosts
  const totalCosts = project.projectcost 
    ? project.projectcost.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0) 
    : 0;
  
  // Hitung total penagihan
  const totalBilled = project.billing
    ? project.billing.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0) 
    : 0;
    
  // Hitung total transaksi biaya tambahan (jika ada)
  // Filter transaksi yang relevan dengan biaya proyek (misalnya tipe = 'EXPENSE')
  const additionalCosts = project.transaction
    ? project.transaction
        .filter(transaction => ['EXPENSE', 'WIP_INCREASE'].includes(transaction.type))
        .reduce((sum, transaction) => sum + parseFloat(transaction.amount || 0), 0)
    : 0;
    
  // Hitung total penerimaan dari transaksi (jika ada)
  const additionalRevenue = project.transaction
    ? project.transaction
        .filter(transaction => ['REVENUE', 'WIP_DECREASE'].includes(transaction.type))
        .reduce((sum, transaction) => sum + parseFloat(transaction.amount || 0), 0)
    : 0;
  
  // Total biaya aktual termasuk transaksi tambahan
  const actualCosts = totalCosts + additionalCosts;
  
  // Total penerimaan aktual termasuk transaksi tambahan
  const actualBilled = totalBilled + additionalRevenue;
  
  // Nilai total proyek
  const totalValue = parseFloat(project.totalValue || 0);
  
  // Hitung laba kotor (revenue - costs)
  const grossProfit = actualBilled - actualCosts;
  
  // Hitung margin laba (terhadap nilai proyek)
  const profitMargin = totalValue > 0 ? (grossProfit / totalValue) * 100 : 0;
  
  // Hitung rasio biaya terhadap nilai proyek
  const costRatio = totalValue > 0 ? (actualCosts / totalValue) * 100 : 0;
  
  // Hitung persentase penyelesaian (gunakan field progress jika ada, atau hitung dari penagihan)
  const completion = project.progress 
    ? parseFloat(project.progress || 0) 
    : (totalValue > 0 ? (actualBilled / totalValue) * 100 : 0);
  
  // Hitung nilai WIP (Work In Progress) = biaya - penagihan
  const wipValue = actualCosts - actualBilled;
  
  // Hitung ROI (Return on Investment) = profit / biaya
  const roi = actualCosts > 0 ? (grossProfit / actualCosts) * 100 : 0;
  
  return {
    totalCosts: actualCosts,
    totalBilled: actualBilled,
    directCosts: totalCosts,
    indirectCosts: additionalCosts,
    directBillings: totalBilled,
    indirectRevenue: additionalRevenue,
    grossProfit,
    profitMargin: parseFloat(profitMargin.toFixed(2)),
    costRatio: parseFloat(costRatio.toFixed(2)),
    completion: parseFloat(completion.toFixed(2)),
    wipValue,
    roi: parseFloat(roi.toFixed(2)),
    isCompleted: project.status === 'completed',
    isProfitable: grossProfit > 0
  };
};

/**
 * Mendapatkan data profitabilitas untuk semua proyek
 * @returns {Promise<Array>} - Array proyek dengan data profitabilitas
 */
const getAllProjectsProfitability = async () => {
  try {
    // Ambil semua proyek dengan costs, billings, dan transactions
    const projects = await prisma.project.findMany({
      include: {
        client: true,
        projectcost: true,
        billing: true,
        transaction: true
      }
    });
    
    // Hitung profitabilitas untuk setiap proyek
    const projectsWithProfitability = projects.map(project => {
      const profitabilityMetrics = calculateProjectProfitability(project);
      
      return {
        ...project,
        profitability: profitabilityMetrics
      };
    });
    
    return {
      success: true,
      data: projectsWithProfitability
    };
  } catch (error) {
    console.error('Error getting projects profitability:', error);
    return {
      success: false,
      message: 'Failed to get projects profitability',
      error: error.message
    };
  }
};

/**
 * Mendapatkan data profitabilitas untuk satu proyek berdasarkan ID
 * @param {number} projectId - ID proyek
 * @returns {Promise<Object>} - Proyek dengan data profitabilitas
 */
const getProjectProfitability = async (projectId) => {
  try {
    // Ambil proyek berdasarkan ID dengan costs, billings, dan transactions
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      include: {
        client: true,
        projectcost: {
          orderBy: {
            date: 'desc'
          }
        },
        billing: {
          orderBy: {
            billingDate: 'desc'
          }
        },
        transaction: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    });
    
    if (!project) {
      return {
        success: false,
        message: 'Project not found'
      };
    }
    
    // Hitung profitabilitas
    const profitabilityMetrics = calculateProjectProfitability(project);
    
    // Group costs by category
    const costsByCategory = {};
    project.projectcost.forEach(cost => {
      const category = cost.category || 'Other';
      if (!costsByCategory[category]) {
        costsByCategory[category] = 0;
      }
      costsByCategory[category] += parseFloat(cost.amount || 0);
    });
    
    // Add profitability and cost breakdown
    const projectWithProfitability = {
      ...project,
      profitability: profitabilityMetrics,
      costBreakdown: costsByCategory
    };
    
    return {
      success: true,
      data: projectWithProfitability
    };
  } catch (error) {
    console.error('Error getting project profitability:', error);
    return {
      success: false,
      message: 'Failed to get project profitability',
      error: error.message
    };
  }
};

/**
 * Mendapatkan ringkasan profitabilitas untuk semua proyek
 * @returns {Promise<Object>} - Ringkasan profitabilitas
 */
const getProfitabilitySummary = async () => {
  try {
    // Ambil semua proyek dengan costs dan billings
    const projects = await prisma.project.findMany({
      include: {
        projectcosts: true,
        billings: true
      }
    });
    
    // Hitung metrik untuk semua proyek
    let totalProjects = projects.length;
    let totalCosts = 0;
    let totalBilled = 0;
    let totalValue = 0;
    let profitableProjects = 0;
    
    projects.forEach(project => {
      const { totalCosts: costs, totalBilled: billed, isProfitable } = calculateProjectProfitability(project);
      
      totalCosts += costs;
      totalBilled += billed;
      totalValue += parseFloat(project.totalValue || 0);
      
      if (isProfitable) {
        profitableProjects++;
      }
    });
    
    // Hitung metrik ringkasan
    const totalProfit = totalBilled - totalCosts;
    const overallProfitMargin = totalBilled > 0 ? (totalProfit / totalBilled) * 100 : 0;
    const profitablePercentage = totalProjects > 0 ? (profitableProjects / totalProjects) * 100 : 0;
    
    return {
      success: true,
      data: {
        totalProjects,
        profitableProjects,
        unprofitableProjects: totalProjects - profitableProjects,
        profitablePercentage: parseFloat(profitablePercentage.toFixed(2)),
        totalCosts,
        totalBilled,
        totalValue,
        totalProfit,
        overallProfitMargin: parseFloat(overallProfitMargin.toFixed(2))
      }
    };
  } catch (error) {
    console.error('Error getting profitability summary:', error);
    return {
      success: false,
      message: 'Failed to get profitability summary',
      error: error.message
    };
  }
};

module.exports = {
  calculateProjectProfitability,
  getAllProjectsProfitability,
  getProjectProfitability,
  getProfitabilitySummary
}; 