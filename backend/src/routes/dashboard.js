const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard summary data
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Fetching dashboard data...');
    
    // Prepare default data structure
    const dashboardData = {
      projects: {
        total: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        recentProjects: []
      },
      financial: {
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        recentTransactions: []
      },
      billings: {
        totalBilled: 0,
        totalPaid: 0,
        totalUnpaid: 0,
        recentBillings: []
      },
      assets: {
        totalAssets: 0,
        totalValue: 0,
        totalDepreciation: 0,
        bookValue: 0
      },
      wip: {
        totalWipValue: 0,
        wipProjects: 0
      },
      clients: {
        totalClients: 0
      }
    };
    
    try {
      // Get projects summary
      console.log('Fetching projects data...');
      dashboardData.projects.recentProjects = await prisma.project.findMany({
        include: {
          client: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }) || [];

      dashboardData.projects.total = await prisma.project.count() || 0;
      dashboardData.projects.active = await prisma.project.count({
        where: {
          status: 'ongoing',
        },
      }) || 0;
      dashboardData.projects.completed = await prisma.project.count({
        where: {
          status: 'completed',
        },
      }) || 0;
      dashboardData.projects.cancelled = await prisma.project.count({
        where: {
          status: 'cancelled',
        },
      }) || 0;
      console.log('Projects data fetched successfully');
    } catch (error) {
      console.error('Error fetching projects data:', error);
      // Continue with default values
    }

    try {
      // Get financial summary
      console.log('Fetching financial data...');
      dashboardData.financial.recentTransactions = await prisma.transaction.findMany({
        orderBy: {
          date: 'desc',
        },
        take: 5,
      }) || [];

      const incomeTransactions = await prisma.transaction.aggregate({
        where: {
          type: 'income',
        },
        _sum: {
          amount: true,
        },
      });

      const expenseTransactions = await prisma.transaction.aggregate({
        where: {
          type: 'expense',
        },
        _sum: {
          amount: true,
        },
      });

      dashboardData.financial.totalIncome = (incomeTransactions && incomeTransactions._sum && incomeTransactions._sum.amount) || 0;
      dashboardData.financial.totalExpense = (expenseTransactions && expenseTransactions._sum && expenseTransactions._sum.amount) || 0;
      dashboardData.financial.netIncome = dashboardData.financial.totalIncome - dashboardData.financial.totalExpense;
      console.log('Financial data fetched successfully');
    } catch (error) {
      console.error('Error fetching financial data:', error);
      // Continue with default values
    }

    try {
      // Get billings summary
      console.log('Fetching billings data...');
      dashboardData.billings.recentBillings = await prisma.billing.findMany({
        include: {
          project: {
            include: {
              client: true,
            },
          },
        },
        orderBy: {
          billingDate: 'desc',
        },
        take: 5,
      }) || [];

      const totalBilledAmount = await prisma.billing.aggregate({
        _sum: {
          amount: true,
        },
      });

      const totalPaidAmount = await prisma.billing.aggregate({
        where: {
          status: 'paid',
        },
        _sum: {
          amount: true,
        },
      });

      const totalUnpaidAmount = await prisma.billing.aggregate({
        where: {
          status: {
            in: ['unpaid', 'partially_paid'],
          },
        },
        _sum: {
          amount: true,
        },
      });

      dashboardData.billings.totalBilled = (totalBilledAmount && totalBilledAmount._sum && totalBilledAmount._sum.amount) || 0;
      dashboardData.billings.totalPaid = (totalPaidAmount && totalPaidAmount._sum && totalPaidAmount._sum.amount) || 0;
      dashboardData.billings.totalUnpaid = (totalUnpaidAmount && totalUnpaidAmount._sum && totalUnpaidAmount._sum.amount) || 0;
      console.log('Billings data fetched successfully');
    } catch (error) {
      console.error('Error fetching billings data:', error);
      // Continue with default values
    }

    try {
      // Get assets summary
      console.log('Fetching assets data...');
      dashboardData.assets.totalAssets = await prisma.fixedasset.count() || 0;
      
      const assetsValue = await prisma.fixedasset.aggregate({
        _sum: {
          value: true,
        },
      });

      const assetsDepreciation = await prisma.fixedasset.aggregate({
        _sum: {
          accumulatedDepreciation: true,
        },
      });

      const assetsBookValue = await prisma.fixedasset.aggregate({
        _sum: {
          bookValue: true,
        },
      });

      dashboardData.assets.totalValue = (assetsValue && assetsValue._sum && assetsValue._sum.value) || 0;
      dashboardData.assets.totalDepreciation = (assetsDepreciation && assetsDepreciation._sum && assetsDepreciation._sum.accumulatedDepreciation) || 0;
      dashboardData.assets.bookValue = (assetsBookValue && assetsBookValue._sum && assetsBookValue._sum.bookValue) || 0;
      console.log('Assets data fetched successfully');
    } catch (error) {
      console.error('Error fetching assets data:', error);
      // Continue with default values
    }

    try {
      // Get WIP summary
      console.log('Fetching WIP data...');
      dashboardData.wip.wipProjects = await prisma.project.count({
        where: {
          status: 'ongoing',
        },
      }) || 0;

      // Calculate WIP value (total costs of ongoing projects)
      const projectCosts = await prisma.projectcost.aggregate({
        where: {
          project: {
            status: 'ongoing',
          },
          status: {
            in: ['approved', 'pending'],
          },
        },
        _sum: {
          amount: true,
        },
      });

      dashboardData.wip.totalWipValue = (projectCosts && projectCosts._sum && projectCosts._sum.amount) || 0;
      console.log('WIP data fetched successfully');
    } catch (error) {
      console.error('Error fetching WIP data:', error);
      // Continue with default values
    }

    try {
      // Get clients count
      console.log('Fetching clients data...');
      dashboardData.clients.totalClients = await prisma.client.count() || 0;
      console.log('Clients data fetched successfully');
    } catch (error) {
      console.error('Error fetching clients data:', error);
      // Continue with default values
    }

    console.log('Dashboard data prepared successfully');
    
    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    
    // Return a basic structure with default values
    const defaultDashboardData = {
      projects: { total: 0, active: 0, completed: 0, cancelled: 0, recentProjects: [] },
      financial: { totalIncome: 0, totalExpense: 0, netIncome: 0, recentTransactions: [] },
      billings: { totalBilled: 0, totalPaid: 0, totalUnpaid: 0, recentBillings: [] },
      assets: { totalAssets: 0, totalValue: 0, totalDepreciation: 0, bookValue: 0 },
      wip: { totalWipValue: 0, wipProjects: 0 },
      clients: { totalClients: 0 },
    };
    
    res.json({
      success: true,
      data: defaultDashboardData,
      message: 'Using default data due to error'
    });
  }
});

module.exports = router; 