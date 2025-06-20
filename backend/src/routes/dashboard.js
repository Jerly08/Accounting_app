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
    // Get projects summary
    const projects = await prisma.project.findMany({
      include: {
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    const projectsCount = await prisma.project.count();
    const activeProjectsCount = await prisma.project.count({
      where: {
        status: 'ongoing',
      },
    });
    const completedProjectsCount = await prisma.project.count({
      where: {
        status: 'completed',
      },
    });
    const cancelledProjectsCount = await prisma.project.count({
      where: {
        status: 'cancelled',
      },
    });

    // Get financial summary
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        date: 'desc',
      },
      take: 5,
    });

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

    // Get billings summary
    const billings = await prisma.billing.findMany({
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
    });

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

    // Get assets summary
    const assetsCount = await prisma.fixedAsset.count();
    
    const assetsValue = await prisma.fixedAsset.aggregate({
      _sum: {
        value: true,
      },
    });

    const assetsDepreciation = await prisma.fixedAsset.aggregate({
      _sum: {
        accumulatedDepreciation: true,
      },
    });

    const assetsBookValue = await prisma.fixedAsset.aggregate({
      _sum: {
        bookValue: true,
      },
    });

    // Get WIP summary
    const wipProjects = await prisma.project.count({
      where: {
        status: 'ongoing',
      },
    });

    // Calculate WIP value (total costs of ongoing projects)
    const projectCosts = await prisma.projectCost.aggregate({
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

    // Get clients count
    const clientsCount = await prisma.client.count();

    // Prepare dashboard data
    const dashboardData = {
      projects: {
        total: projectsCount,
        active: activeProjectsCount,
        completed: completedProjectsCount,
        cancelled: cancelledProjectsCount,
        recentProjects: projects,
      },
      financial: {
        totalIncome: incomeTransactions._sum.amount || 0,
        totalExpense: expenseTransactions._sum.amount || 0,
        netIncome: (incomeTransactions._sum.amount || 0) - (expenseTransactions._sum.amount || 0),
        recentTransactions: transactions,
      },
      billings: {
        totalBilled: totalBilledAmount._sum.amount || 0,
        totalPaid: totalPaidAmount._sum.amount || 0,
        totalUnpaid: totalUnpaidAmount._sum.amount || 0,
        recentBillings: billings,
      },
      assets: {
        totalAssets: assetsCount,
        totalValue: assetsValue._sum.value || 0,
        totalDepreciation: assetsDepreciation._sum.accumulatedDepreciation || 0,
        bookValue: assetsBookValue._sum.bookValue || 0,
      },
      wip: {
        totalWipValue: projectCosts._sum.amount || 0,
        wipProjects: wipProjects,
      },
      clients: {
        totalClients: clientsCount,
      },
    };

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router; 