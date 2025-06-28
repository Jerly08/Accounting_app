/**
 * Status Transition Service
 * Provides functions to handle status transitions and double-entry accounting
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const doubleEntryService = require('./doubleEntryService');
const logger = require('../utils/logger');

// Valid status transitions
const VALID_TRANSITIONS = {
  'pending': ['unpaid', 'rejected'],
  'unpaid': ['paid', 'rejected'],
  'paid': [],
  'rejected': []
};

// Status that require journal entries
const JOURNAL_STATUSES = ['unpaid', 'paid'];

/**
 * Handle project cost status transition
 * @param {number} projectCostId - Project cost ID
 * @param {string} newStatus - New status
 * @param {number} userId - User ID making the change
 * @param {string} notes - Notes for the status change
 * @param {string} cashAccount - Cash/bank account code for paid status (optional)
 * @returns {Promise<Object>} - Updated project cost
 */
const handleProjectCostStatusTransition = async (projectCostId, newStatus, userId, notes = '', cashAccount = '1102') => {
  try {
    // Get current project cost
    const projectCost = await prisma.projectcost.findUnique({
      where: { id: parseInt(projectCostId) },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true
          }
        }
      }
    });

    if (!projectCost) {
      throw new Error('Project cost not found');
    }

    const oldStatus = projectCost.status;

    // Validate status transition
    if (!VALID_TRANSITIONS[oldStatus] || !VALID_TRANSITIONS[oldStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }

    // Check for existing transactions to prevent duplicates
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        notes: {
          contains: `Project cost ID: ${projectCost.id}`
        }
      }
    });

    // Handle journal entries based on status
    let journalResult = null;

    // Case 1: Moving to 'unpaid' - Create initial journal entries
    if (newStatus === 'unpaid' && oldStatus === 'pending' && projectCost.createJournalEntry) {
      // Check if transactions already exist for this project cost to prevent duplicates
      const hasExistingTransactions = existingTransactions.some(
        t => !t.notes.includes('REVERSAL') && !t.notes.includes('Payment for')
      );

      if (!hasExistingTransactions) {
        // Create primary transaction (Debit to Expense)
        const primaryTransaction = {
          date: new Date(),
          type: 'expense', // Debit to Expense account
          accountCode: getExpenseAccountByCategory(projectCost.category),
          description: `Project Cost: ${projectCost.description} for ${projectCost.project.name}`,
          amount: parseFloat(projectCost.amount.toString()),
          projectId: projectCost.projectId,
          notes: `Project cost ID: ${projectCost.id}`
        };

        // Generate counter transaction (Credit to Accounts Payable)
        const counterTransaction = await doubleEntryService.generateCounterTransaction(
          primaryTransaction,
          '2102' // Hutang Usaha
        );

        // Create the double-entry transaction
        journalResult = await doubleEntryService.createDoubleEntryTransaction(
          primaryTransaction,
          counterTransaction
        );
      } else {
        logger.info(`Skipping transaction creation for project cost ID ${projectCost.id} - transactions already exist`);
      }
    }
    // Case 2: Moving to 'paid' from 'unpaid' - Create payment journal entries
    else if (newStatus === 'paid' && oldStatus === 'unpaid' && projectCost.createJournalEntry) {
      // Check if payment transactions already exist to prevent duplicates
      const hasExistingPaymentTransactions = existingTransactions.some(
        t => t.notes.includes('Payment for project cost ID')
      );

      if (!hasExistingPaymentTransactions) {
        // Create primary transaction (Debit to Accounts Payable)
        const primaryTransaction = {
          date: new Date(),
          type: 'expense', // Debit to Accounts Payable
          accountCode: '2102', // Hutang Usaha
          description: `Payment for project cost: ${projectCost.description}`,
          amount: parseFloat(projectCost.amount.toString()),
          projectId: projectCost.projectId,
          notes: `Payment for project cost ID: ${projectCost.id}`
        };

        // Generate counter transaction (Credit to Cash/Bank)
        const counterTransaction = await doubleEntryService.generateCounterTransaction(
          primaryTransaction,
          cashAccount // Bank/Cash account
        );

        // Create the double-entry transaction
        journalResult = await doubleEntryService.createDoubleEntryTransaction(
          primaryTransaction,
          counterTransaction
        );
      } else {
        logger.info(`Skipping payment transaction creation for project cost ID ${projectCost.id} - payment transactions already exist`);
      }
    }
    // Case 3: Moving to 'rejected' - Reverse journal entries if needed
    else if (newStatus === 'rejected' && projectCost.createJournalEntry) {
      // Filter out transactions that have already been reversed
      const transactionsToReverse = existingTransactions.filter(
        t => !t.notes.includes('REVERSAL') && !t.notes.includes('Reversal of')
      );

      if (transactionsToReverse.length > 0) {
        // Create reversal entries
        for (const transaction of transactionsToReverse) {
          // Check if this transaction has already been reversed
          const hasReversal = existingTransactions.some(
            t => t.notes.includes(`Reversal of transaction ID: ${transaction.id}`)
          );

          if (!hasReversal) {
            // Create reversal transaction with opposite type
            const reversalTransaction = {
              date: new Date(),
              type: transaction.type === 'expense' ? 'income' : 'expense',
              accountCode: transaction.accountCode,
              description: `REVERSAL: ${transaction.description}`,
              amount: parseFloat(transaction.amount.toString()),
              projectId: transaction.projectId,
              notes: `Reversal of transaction ID: ${transaction.id} due to rejection`
            };

            // Generate counter transaction
            const counterTransaction = await doubleEntryService.generateCounterTransaction(
              reversalTransaction,
              transaction.type === 'expense' ? '2102' : getExpenseAccountByCategory(projectCost.category)
            );

            // Create the double-entry transaction
            await doubleEntryService.createDoubleEntryTransaction(
              reversalTransaction,
              counterTransaction
            );
          }
        }
      }
    }

    // Update project cost status
    const updatedProjectCost = await prisma.$transaction(async (prisma) => {
      // Update project cost
      const updated = await prisma.projectcost.update({
        where: { id: parseInt(projectCostId) },
        data: {
          status: newStatus,
          updatedAt: new Date()
        }
      });

      // Create status history record
      await prisma.projectcost_status_history.create({
        data: {
          projectCostId: parseInt(projectCostId),
          oldStatus,
          newStatus,
          changedAt: new Date(),
          changedBy: userId || null,
          notes
        }
      });

      return updated;
    });

    return {
      success: true,
      data: updatedProjectCost,
      journalEntries: journalResult
    };
  } catch (error) {
    logger.error('Error in project cost status transition:', error);
    throw error;
  }
};

/**
 * Handle billing status transition
 * @param {number} billingId - Billing ID
 * @param {string} newStatus - New status
 * @param {number} userId - User ID making the change
 * @param {string} notes - Notes for the status change
 * @param {string} cashAccount - Cash/bank account code for paid status (optional)
 * @returns {Promise<Object>} - Updated billing
 */
const handleBillingStatusTransition = async (billingId, newStatus, userId, notes = '', cashAccount = '1102') => {
  try {
    // Get current billing
    const billing = await prisma.billing.findUnique({
      where: { id: parseInt(billingId) },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true
          }
        }
      }
    });

    if (!billing) {
      throw new Error('Billing not found');
    }

    const oldStatus = billing.status;

    // Validate status transition
    if (!VALID_TRANSITIONS[oldStatus] || !VALID_TRANSITIONS[oldStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }

    // Check for existing transactions to prevent duplicates
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        notes: {
          contains: `Billing ID: ${billing.id}`
        }
      }
    });

    // Handle journal entries based on status
    let journalResult = null;

    // Case 1: Moving to 'unpaid' - Create initial journal entries
    if (newStatus === 'unpaid' && oldStatus === 'pending' && billing.createJournalEntry) {
      // Check if transactions already exist for this billing to prevent duplicates
      const hasExistingTransactions = existingTransactions.some(
        t => !t.notes.includes('REVERSAL') && !t.notes.includes('Payment for')
      );

      if (!hasExistingTransactions) {
        // Create primary transaction (Debit to Accounts Receivable)
        const primaryTransaction = {
          date: new Date(),
          type: 'debit', // Debit to Accounts Receivable
          accountCode: '1201', // Piutang Usaha
          description: `Invoice for project ${billing.project.projectCode} - ${billing.project.name}`,
          amount: parseFloat(billing.amount.toString()),
          projectId: billing.projectId,
          notes: `Billing ID: ${billing.id}`
        };

        // Generate counter transaction (Credit to Revenue)
        const counterTransaction = await doubleEntryService.generateCounterTransaction(
          primaryTransaction,
          '4001' // Pendapatan Jasa Boring
        );

        // Create the double-entry transaction
        journalResult = await doubleEntryService.createDoubleEntryTransaction(
          primaryTransaction,
          counterTransaction
        );
      } else {
        logger.info(`Skipping transaction creation for billing ID ${billing.id} - transactions already exist`);
      }
    }
    // Case 2: Moving to 'paid' from 'unpaid' - Create payment journal entries
    else if (newStatus === 'paid' && oldStatus === 'unpaid' && billing.createJournalEntry) {
      // Check if payment transactions already exist to prevent duplicates
      const hasExistingPaymentTransactions = existingTransactions.some(
        t => t.notes.includes('Payment for Billing ID')
      );

      if (!hasExistingPaymentTransactions) {
        // Create primary transaction (Debit to Cash/Bank)
        const primaryTransaction = {
          date: new Date(),
          type: 'debit', // Debit to Cash/Bank
          accountCode: cashAccount, // Gunakan akun kas/bank yang dipilih
          description: `Payment received for invoice ${billing.project.projectCode} - ${billing.project.name}`,
          amount: parseFloat(billing.amount.toString()),
          projectId: billing.projectId,
          notes: `Payment for Billing ID: ${billing.id}`
        };

        // Generate counter transaction (Credit to Accounts Receivable)
        const counterTransaction = await doubleEntryService.generateCounterTransaction(
          primaryTransaction,
          '1201' // Piutang Usaha
        );

        // Create the double-entry transaction
        journalResult = await doubleEntryService.createDoubleEntryTransaction(
          primaryTransaction,
          counterTransaction
        );
      } else {
        logger.info(`Skipping payment transaction creation for billing ID ${billing.id} - payment transactions already exist`);
      }
    }
    // Case 3: Moving to 'rejected' - Reverse journal entries if needed
    else if (newStatus === 'rejected' && billing.createJournalEntry) {
      // Filter out transactions that have already been reversed
      const transactionsToReverse = existingTransactions.filter(
        t => !t.notes.includes('REVERSAL') && !t.notes.includes('Reversal of')
      );

      if (transactionsToReverse.length > 0) {
        // Create reversal entries
        for (const transaction of transactionsToReverse) {
          // Check if this transaction has already been reversed
          const hasReversal = existingTransactions.some(
            t => t.notes.includes(`Reversal of transaction ID: ${transaction.id}`)
          );

          if (!hasReversal) {
            // Create reversal transaction with opposite type
            const reversalTransaction = {
              date: new Date(),
              type: transaction.type === 'debit' ? 'expense' : 'debit',
              accountCode: transaction.accountCode,
              description: `REVERSAL: ${transaction.description}`,
              amount: parseFloat(transaction.amount.toString()),
              projectId: transaction.projectId,
              notes: `Reversal of transaction ID: ${transaction.id} due to rejection`
            };

            // Generate counter transaction
            const counterTransaction = await doubleEntryService.generateCounterTransaction(
              reversalTransaction,
              transaction.type === 'debit' ? '4001' : '1201'
            );

            // Create the double-entry transaction
            await doubleEntryService.createDoubleEntryTransaction(
              reversalTransaction,
              counterTransaction
            );
          }
        }
      }
    }

    // Update billing status
    const updatedBilling = await prisma.$transaction(async (prisma) => {
      // Update billing
      const updated = await prisma.billing.update({
        where: { id: parseInt(billingId) },
        data: {
          status: newStatus,
          updatedAt: new Date()
        }
      });

      // Create status history record
      await prisma.billing_status_history.create({
        data: {
          billingId: parseInt(billingId),
          oldStatus,
          newStatus,
          changedAt: new Date(),
          changedBy: userId || null,
          notes
        }
      });

      return updated;
    });

    return {
      success: true,
      data: updatedBilling,
      journalEntries: journalResult
    };
  } catch (error) {
    logger.error('Error in billing status transition:', error);
    throw error;
  }
};

/**
 * Get expense account code based on project cost category
 * @param {string} category - Project cost category
 * @returns {string} - Account code
 */
const getExpenseAccountByCategory = (category) => {
  const categoryMap = {
    'material': '5101', // Beban Proyek - Material
    'labor': '5102',    // Beban Proyek - Tenaga Kerja
    'equipment': '5103', // Beban Proyek - Sewa Peralatan
    'transportation': '5104', // Beban Proyek - Transportasi
    'other': '5105'     // Beban Proyek - Lain-lain
  };

  return categoryMap[category.toLowerCase()] || '5105'; // Default to other
};

/**
 * Get billing history
 * @param {number} billingId - Billing ID
 * @returns {Promise<Array>} - Status history
 */
const getBillingStatusHistory = async (billingId) => {
  try {
    const history = await prisma.billing_status_history.findMany({
      where: {
        billingId: parseInt(billingId)
      },
      orderBy: {
        changedAt: 'desc'
      },
      include: {
        billing: {
          select: {
            id: true,
            amount: true,
            project: {
              select: {
                name: true,
                projectCode: true
              }
            }
          }
        }
      }
    });

    return history;
  } catch (error) {
    logger.error('Error getting billing status history:', error);
    throw error;
  }
};

/**
 * Get project cost history
 * @param {number} projectCostId - Project cost ID
 * @returns {Promise<Array>} - Status history
 */
const getProjectCostStatusHistory = async (projectCostId) => {
  try {
    const history = await prisma.projectcost_status_history.findMany({
      where: {
        projectCostId: parseInt(projectCostId)
      },
      orderBy: {
        changedAt: 'desc'
      },
      include: {
        projectcost: {
          select: {
            id: true,
            amount: true,
            description: true,
            project: {
              select: {
                name: true,
                projectCode: true
              }
            }
          }
        }
      }
    });

    return history;
  } catch (error) {
    logger.error('Error getting project cost status history:', error);
    throw error;
  }
};

module.exports = {
  handleProjectCostStatusTransition,
  handleBillingStatusTransition,
  getBillingStatusHistory,
  getProjectCostStatusHistory,
  VALID_TRANSITIONS,
  JOURNAL_STATUSES
}; 