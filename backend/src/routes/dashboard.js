const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const prisma = new PrismaClient();

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard summary data
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching dashboard data...');
    
    // Prepare default data structure
    const dashboardData = {
      projects: {
        total: 0,
        ongoing: 0,
        planned: 0,
        completed: 0,
        cancelled: 0,
        recentProjects: []
      },
      financial: {
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        recentTransactions: [],
        // New fields for Financial Overview Dashboard
        cashPosition: 0,
        accountsReceivable: {
          total: 0,
          aging: {
            current: 0,
            lessThan30: 0,
            thirtyToSixty: 0,
            sixtyToNinety: 0,
            overNinety: 0
          }
        },
        revenueExpenseTrend: []
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
        wipProjects: 0,
        // New fields for WIP analysis
        wipTrend: [],
        projectsWithWip: [],
        projectedCashflow: []
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
      dashboardData.projects.ongoing = await prisma.project.count({
        where: {
          status: 'ongoing',
        },
      }) || 0;
      dashboardData.projects.planned = await prisma.project.count({
        where: {
          status: 'planned',
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
      
      // Get cash position (sum of all cash and bank accounts)
      const cashAccounts = await prisma.chartofaccount.findMany({
        where: {
          OR: [
            { category: 'Cash' },
            { category: 'Bank' }
          ]
        }
      });
      
      let cashPosition = 0;
      if (cashAccounts.length > 0) {
        const cashAccountCodes = cashAccounts.map(account => account.code);
        const cashTransactions = await prisma.transaction.groupBy({
          by: ['accountCode'],
          where: {
            accountCode: {
              in: cashAccountCodes
            }
          },
          _sum: {
            amount: true
          }
        });
        
        cashPosition = cashTransactions.reduce((total, account) => {
          // For cash accounts, income is positive, expense is negative
          return total + parseFloat(account._sum.amount || 0);
        }, 0);
      }
      dashboardData.financial.cashPosition = cashPosition;
      
      // Get accounts receivable aging
      const currentDate = new Date();
      const unpaidBillings = await prisma.billing.findMany({
        where: {
          status: {
            in: ['unpaid', 'partially_paid']
          }
        },
        include: {
          project: true
        }
      });
      
      let totalReceivables = 0;
      let currentReceivables = 0;
      let lessThan30 = 0;
      let thirtyToSixty = 0;
      let sixtyToNinety = 0;
      let overNinety = 0;
      
      unpaidBillings.forEach(billing => {
        const amount = parseFloat(billing.amount || 0);
        totalReceivables += amount;
        
        const billingDate = new Date(billing.billingDate);
        const daysDifference = Math.floor((currentDate - billingDate) / (1000 * 60 * 60 * 24));
        
        if (daysDifference <= 0) {
          currentReceivables += amount;
        } else if (daysDifference < 30) {
          lessThan30 += amount;
        } else if (daysDifference < 60) {
          thirtyToSixty += amount;
        } else if (daysDifference < 90) {
          sixtyToNinety += amount;
        } else {
          overNinety += amount;
        }
      });
      
      dashboardData.financial.accountsReceivable = {
        total: totalReceivables,
        aging: {
          current: currentReceivables,
          lessThan30: lessThan30,
          thirtyToSixty: thirtyToSixty,
          sixtyToNinety: sixtyToNinety,
          overNinety: overNinety
        }
      };
      
      // Get revenue and expense trend for last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);
      
      const financialTransactions = await prisma.transaction.findMany({
        where: {
          date: {
            gte: sixMonthsAgo
          },
          type: {
            in: ['income', 'expense']
          }
        }
      });
      
      // Group by month and type
      const monthlyData = {};
      financialTransactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const type = transaction.type;
        const amount = parseFloat(transaction.amount || 0);
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { income: 0, expense: 0 };
        }
        
        monthlyData[monthYear][type] += amount;
      });
      
      // Convert to array and sort by month
      const revenueExpenseTrend = Object.keys(monthlyData)
        .sort()
        .map(monthYear => ({
          month: monthYear,
          income: monthlyData[monthYear].income,
          expense: monthlyData[monthYear].expense,
          net: monthlyData[monthYear].income - monthlyData[monthYear].expense
        }));
      
      dashboardData.financial.revenueExpenseTrend = revenueExpenseTrend;
      
      console.log('Financial data fetched successfully');
    } catch (error) {
      console.error('Error fetching financial data:', error);
      // Continue with default values
    }

    try {
      // Get WIP data
      console.log('Fetching WIP data...');
      
      // Define sixMonthsAgo for WIP data
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);
      
      // Get WIP value from wip_history
      const wipHistory = await prisma.wip_history.findMany({
        where: {
          date: {
            gte: sixMonthsAgo
          }
        },
        include: {
          project: true
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      // Count projects with WIP
      const projectsWithWip = await prisma.project.findMany({
        where: {
          status: 'ongoing',
          wip_history: {
            some: {}
          }
        }
      });
      
      dashboardData.wip.wipProjects = projectsWithWip.length;
      
      // Get latest WIP value for each project
      const latestWipByProject = {};
      wipHistory.forEach(wip => {
        const projectId = wip.projectId;
        if (!latestWipByProject[projectId] || new Date(wip.date) > new Date(latestWipByProject[projectId].date)) {
          latestWipByProject[projectId] = wip;
        }
      });
      
      // Calculate total WIP value
      dashboardData.wip.totalWipValue = Object.values(latestWipByProject).reduce((total, wip) => {
        return total + parseFloat(wip.wipValue || 0);
      }, 0);
      
      // Get WIP trend data (monthly)
      const monthlyWipData = {};
      wipHistory.forEach(wip => {
        const date = new Date(wip.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyWipData[monthYear]) {
          monthlyWipData[monthYear] = {
            month: new Date(date.getFullYear(), date.getMonth(), 1),
            wipValue: 0,
            earnedValue: 0,
            billedValue: 0
          };
        }
        
        monthlyWipData[monthYear].wipValue += parseFloat(wip.wipValue || 0);
        monthlyWipData[monthYear].earnedValue += parseFloat(wip.earnedValue || 0);
        monthlyWipData[monthYear].billedValue += parseFloat(wip.billedValue || 0);
      });
      
      // Convert to array and sort by month
      dashboardData.wip.wipTrend = Object.values(monthlyWipData).sort((a, b) => {
        return new Date(a.month) - new Date(b.month);
      });
      
      // Get top projects with WIP
      dashboardData.wip.projectsWithWip = Object.values(latestWipByProject)
        .sort((a, b) => parseFloat(b.wipValue || 0) - parseFloat(a.wipValue || 0))
        .slice(0, 5)
        .map(wip => ({
          projectId: wip.projectId,
          projectName: wip.project?.name || 'Unknown Project',
          wipValue: parseFloat(wip.wipValue || 0),
          earnedValue: parseFloat(wip.earnedValue || 0),
          billedValue: parseFloat(wip.billedValue || 0)
        }));
      
      // Get projected cashflow from WIP
      const projectedCashflow = await prisma.wip_cashflow_projection.findMany({
        where: {
          projectionDate: {
            gte: new Date()
          }
        },
        include: {
          project: true
        },
        orderBy: {
          projectionDate: 'asc'
        },
        take: 5
      });
      
      dashboardData.wip.projectedCashflow = projectedCashflow.map(projection => ({
        projectId: projection.projectId,
        projectName: projection.project?.name || 'Unknown Project',
        projectionDate: projection.projectionDate,
        expectedBilling: parseFloat(projection.expectedBilling || 0),
        expectedWipReduction: parseFloat(projection.expectedWipReduction || 0),
        probability: projection.probability
      }));
      
      console.log('WIP data fetched successfully');
    } catch (error) {
      console.error('Error fetching WIP data:', error);
      // Continue with default values
    }

    try {
      // Get billings summary
      console.log('Fetching billings data...');
      dashboardData.billings.recentBillings = await prisma.billing.findMany({
        include: {
          project: true,
        },
        orderBy: {
          billingDate: 'desc',
        },
        take: 5,
      }) || [];

      const billingStats = await prisma.billing.aggregate({
        _sum: {
          amount: true,
        },
      });

      dashboardData.billings.totalBilled = (billingStats && billingStats._sum && billingStats._sum.amount) || 0;

      const paidBillings = await prisma.billing.aggregate({
        where: {
          status: 'paid',
        },
        _sum: {
          amount: true,
        },
      });

      dashboardData.billings.totalPaid = (paidBillings && paidBillings._sum && paidBillings._sum.amount) || 0;
      dashboardData.billings.totalUnpaid = dashboardData.billings.totalBilled - dashboardData.billings.totalPaid;
      
      console.log('Billings data fetched successfully');
    } catch (error) {
      console.error('Error fetching billings data:', error);
      // Continue with default values
    }

    try {
      // Get assets summary
      console.log('Fetching assets data...');
      
      // Get fixed assets count
      const assetsCount = await prisma.fixedAsset.count();
      dashboardData.assets.totalAssets = assetsCount;
      
      // Get assets total value
      const assetsValue = await prisma.fixedAsset.aggregate({
        _sum: {
          value: true,
          accumulatedDepreciation: true,
          bookValue: true
        }
      });
      
      if (assetsValue && assetsValue._sum) {
        dashboardData.assets.totalValue = parseFloat(assetsValue._sum.value || 0);
        dashboardData.assets.totalDepreciation = parseFloat(assetsValue._sum.accumulatedDepreciation || 0);
        dashboardData.assets.bookValue = parseFloat(assetsValue._sum.bookValue || 0);
      }
      
      console.log('Assets data fetched successfully');
    } catch (error) {
      console.error('Error fetching assets data:', error);
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
    
    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Error in dashboard route:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
});

module.exports = router; 