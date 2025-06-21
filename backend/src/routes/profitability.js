const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const profitabilityService = require('../services/profitability');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @route   GET /api/profitability
 * @desc    Get profitability data for all projects
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await profitabilityService.getAllProjectsProfitability();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data profitabilitas',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/profitability/summary
 * @desc    Get profitability summary
 * @access  Private
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const result = await profitabilityService.getProfitabilitySummary();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil ringkasan profitabilitas',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/profitability/report
 * @desc    Get detailed profitability report with filters
 * @access  Private
 */
router.get('/report', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, status, clientId } = req.query;
    
    // Build filter conditions
    let where = {};
    
    if (startDate) {
      where.startDate = {
        gte: new Date(startDate)
      };
    }
    
    if (endDate) {
      where.endDate = {
        lte: new Date(endDate)
      };
    }
    
    if (status) {
      where.status = status;
    }
    
    if (clientId) {
      where.clientId = parseInt(clientId);
    }
    
    // Get projects with filters
    const projects = await prisma.project.findMany({
      where,
      include: {
        client: true,
        projectcost: true,
        billing: true,
        transaction: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });
    
    // Calculate profitability for each project
    const projectsWithProfitability = projects.map(project => {
      const profitabilityMetrics = profitabilityService.calculateProjectProfitability(project);
      
      // Simplify the response for the report
      return {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        client: project.client?.name,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        totalValue: parseFloat(project.totalValue),
        costs: profitabilityMetrics.totalCosts,
        billed: profitabilityMetrics.totalBilled,
        profit: profitabilityMetrics.grossProfit,
        profitMargin: profitabilityMetrics.profitMargin,
        completion: profitabilityMetrics.completion,
        isProfitable: profitabilityMetrics.isProfitable
      };
    });
    
    // Calculate summary metrics
    const totalValue = projects.reduce((sum, project) => sum + parseFloat(project.totalValue || 0), 0);
    const totalCosts = projectsWithProfitability.reduce((sum, project) => sum + project.costs, 0);
    const totalBilled = projectsWithProfitability.reduce((sum, project) => sum + project.billed, 0);
    const totalProfit = totalBilled - totalCosts;
    const overallProfitMargin = totalValue > 0 ? (totalProfit / totalValue) * 100 : 0;
    const profitableProjects = projectsWithProfitability.filter(project => project.isProfitable).length;
    
    res.json({
      success: true,
      data: projectsWithProfitability,
      summary: {
        totalProjects: projects.length,
        profitableProjects,
        unprofitableProjects: projects.length - profitableProjects,
        totalValue,
        totalCosts,
        totalBilled,
        totalProfit,
        profitMargin: parseFloat(overallProfitMargin.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error generating profitability report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saat membuat laporan profitabilitas',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/profitability/:projectId
 * @desc    Get profitability data for a specific project
 * @access  Private
 */
router.get('/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await profitabilityService.getProjectProfitability(projectId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saat mengambil data profitabilitas proyek',
      error: error.message 
    });
  }
});

module.exports = router; 