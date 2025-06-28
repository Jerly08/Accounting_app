/**
 * Double Entry Accounting Service
 * Provides functions to handle double-entry accounting transactions
 */
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Create a balanced double-entry transaction
 * @param {Object} primaryTransaction - Primary transaction data
 * @param {Object} counterTransaction - Counter transaction data
 * @returns {Promise<Object>} - Created transactions
 */
const createDoubleEntryTransaction = async (primaryTransaction, counterTransaction) => {
  try {
    // Start a transaction to ensure both entries are created or none
    const result = await prisma.$transaction(async (prisma) => {
      // Create the primary transaction
      const primary = await prisma.transaction.create({
        data: {
          date: new Date(primaryTransaction.date),
          type: primaryTransaction.type,
          accountCode: primaryTransaction.accountCode,
          description: primaryTransaction.description,
          amount: parseFloat(primaryTransaction.amount),
          projectId: primaryTransaction.projectId ? parseInt(primaryTransaction.projectId) : null,
          notes: primaryTransaction.notes || undefined,
          updatedAt: new Date()
        },
        include: {
          chartofaccount: true,
          project: primaryTransaction.projectId ? {
            select: {
              projectCode: true,
              name: true
            }
          } : undefined
        }
      });

      // Create the counter transaction
      const counter = await prisma.transaction.create({
        data: {
          date: new Date(counterTransaction.date),
          // Opposite type to maintain balance
          type: counterTransaction.type,
          accountCode: counterTransaction.accountCode,
          description: counterTransaction.description,
          amount: parseFloat(counterTransaction.amount),
          projectId: counterTransaction.projectId ? parseInt(counterTransaction.projectId) : null,
          notes: counterTransaction.notes || 'Counter transaction',
          updatedAt: new Date()
        },
        include: {
          chartofaccount: true,
          project: counterTransaction.projectId ? {
            select: {
              projectCode: true,
              name: true
            }
          } : undefined
        }
      });

      return { primary, counter };
    });

    return result;
  } catch (error) {
    console.error('Error creating double-entry transaction:', error);
    throw error;
  }
};

/**
 * Update a balanced double-entry transaction
 * @param {number} primaryId - ID of the primary transaction
 * @param {number} counterId - ID of the counter transaction
 * @param {Object} primaryTransactionUpdate - Primary transaction update data
 * @param {Object} counterTransactionUpdate - Counter transaction update data
 * @returns {Promise<Object>} - Updated transactions
 */
const updateDoubleEntryTransaction = async (primaryId, counterId, primaryTransactionUpdate, counterTransactionUpdate) => {
  try {
    // Validate that both transactions exist
    const primaryExists = await prisma.transaction.findUnique({
      where: { id: primaryId }
    });
    
    const counterExists = await prisma.transaction.findUnique({
      where: { id: counterId }
    });
    
    if (!primaryExists || !counterExists) {
      throw new Error('One or both transactions not found');
    }
    
    // Start a transaction to ensure both entries are updated or none
    const result = await prisma.$transaction(async (prisma) => {
      // Update the primary transaction
      const primary = await prisma.transaction.update({
        where: { id: primaryId },
        data: {
          date: primaryTransactionUpdate.date ? new Date(primaryTransactionUpdate.date) : undefined,
          type: primaryTransactionUpdate.type,
          accountCode: primaryTransactionUpdate.accountCode,
          description: primaryTransactionUpdate.description,
          amount: primaryTransactionUpdate.amount ? parseFloat(primaryTransactionUpdate.amount) : undefined,
          projectId: primaryTransactionUpdate.projectId ? parseInt(primaryTransactionUpdate.projectId) : primaryTransactionUpdate.projectId === null ? null : undefined,
          notes: primaryTransactionUpdate.notes,
          updatedAt: new Date()
        },
        include: {
          chartofaccount: true,
          project: primaryTransactionUpdate.projectId ? {
            select: {
              projectCode: true,
              name: true
            }
          } : undefined
        }
      });

      // Update the counter transaction
      const counter = await prisma.transaction.update({
        where: { id: counterId },
        data: {
          date: counterTransactionUpdate.date ? new Date(counterTransactionUpdate.date) : undefined,
          type: counterTransactionUpdate.type,
          accountCode: counterTransactionUpdate.accountCode,
          description: counterTransactionUpdate.description,
          amount: counterTransactionUpdate.amount ? parseFloat(counterTransactionUpdate.amount) : undefined,
          projectId: counterTransactionUpdate.projectId ? parseInt(counterTransactionUpdate.projectId) : counterTransactionUpdate.projectId === null ? null : undefined,
          notes: counterTransactionUpdate.notes,
          updatedAt: new Date()
        },
        include: {
          chartofaccount: true,
          project: counterTransactionUpdate.projectId ? {
            select: {
              projectCode: true,
              name: true
            }
          } : undefined
        }
      });

      return { primary, counter };
    });

    return result;
  } catch (error) {
    console.error('Error updating double-entry transaction:', error);
    throw error;
  }
};

/**
 * Generate a counter transaction based on account types
 * @param {Object} primaryTransaction - Primary transaction data
 * @param {Object} primaryAccount - Primary account data
 * @param {Object} counterAccount - Counter account data
 * @returns {Object} - Counter transaction data
 */
const generateCounterTransaction = async (primaryTransaction, counterAccountCode) => {
  try {
    // Get primary account details
    const primaryAccount = await prisma.chartofaccount.findUnique({
      where: { code: primaryTransaction.accountCode }
    });
    
    if (!primaryAccount) {
      throw new Error('Primary account not found');
    }
    
    // Get counter account details
    const counterAccount = await prisma.chartofaccount.findUnique({
      where: { code: counterAccountCode }
    });
    
    if (!counterAccount) {
      throw new Error('Counter account not found');
    }
    
    // Determine the appropriate transaction type for the counter entry
    let counterType;
    
    // For asset accounts
    if (primaryAccount.type === 'asset' || primaryAccount.type === 'Aktiva' || primaryAccount.type === 'Aset' || primaryAccount.type === 'Aset Tetap') {
      // If primary is a debit (increase in asset), counter should be a credit
      if (primaryTransaction.type === 'income' || primaryTransaction.type === 'debit') {
        counterType = 'expense';
      } else {
        counterType = 'income';
      }
    } 
    // For liability and equity accounts
    else if (primaryAccount.type === 'liability' || primaryAccount.type === 'equity' || 
             primaryAccount.type === 'Kewajiban' || primaryAccount.type === 'Hutang' || 
             primaryAccount.type === 'Ekuitas' || primaryAccount.type === 'Modal') {
      // If primary is a credit (increase in liability/equity), counter should be a debit
      if (primaryTransaction.type === 'income' || primaryTransaction.type === 'credit') {
        counterType = 'expense';
      } else {
        counterType = 'income';
      }
    }
    // For revenue accounts
    else if (primaryAccount.type === 'revenue' || primaryAccount.type === 'Pendapatan') {
      // Revenue increase (credit) should have a debit counter
      if (primaryTransaction.type === 'income') {
        counterType = 'expense';
      } else {
        counterType = 'income';
      }
    }
    // For expense accounts
    else if (primaryAccount.type === 'expense' || primaryAccount.type === 'Beban') {
      // Expense increase (debit) should have a credit counter
      if (primaryTransaction.type === 'expense') {
        counterType = 'income';
      } else {
        counterType = 'expense';
      }
    }
    // Default case
    else {
      counterType = primaryTransaction.type === 'income' ? 'expense' : 'income';
    }
    
    // Create counter transaction with opposite type
    return {
      date: primaryTransaction.date,
      type: counterType,
      accountCode: counterAccountCode,
      description: `Counter entry for: ${primaryTransaction.description}`,
      amount: primaryTransaction.amount,
      projectId: primaryTransaction.projectId,
      notes: `Counter transaction for ${primaryAccount.name} (${primaryAccount.code})`
    };
  } catch (error) {
    console.error('Error generating counter transaction:', error);
    throw error;
  }
};

/**
 * Suggest appropriate counter account based on transaction type and primary account
 * @param {string} primaryAccountCode - Primary account code
 * @param {string} transactionType - Transaction type (income/expense)
 * @returns {Promise<string>} - Suggested counter account code
 */
const suggestCounterAccount = async (primaryAccountCode, transactionType) => {
  try {
    // Get primary account details
    const primaryAccount = await prisma.chartofaccount.findUnique({
      where: { code: primaryAccountCode }
    });
    
    if (!primaryAccount) {
      throw new Error('Account not found');
    }
    
    // Cash and bank accounts
    const cashAccounts = ['1101', '1102', '1103', '1104'];
    
    // For cash/bank transactions, suggest appropriate counter accounts
    if (cashAccounts.includes(primaryAccountCode)) {
      // Cash inflow (income) - suggest revenue account
      if (transactionType === 'income') {
        const revenueAccount = await prisma.chartofaccount.findFirst({
          where: {
            OR: [
              { type: 'revenue' },
              { type: 'Pendapatan' }
            ]
          }
        });
        return revenueAccount ? revenueAccount.code : '4001';
      } 
      // Cash outflow (expense) - suggest expense account
      else {
        const expenseAccount = await prisma.chartofaccount.findFirst({
          where: {
            OR: [
              { type: 'expense' },
              { type: 'Beban' }
            ]
          }
        });
        return expenseAccount ? expenseAccount.code : '6001';
      }
    } 
    // For revenue accounts, suggest cash/bank
    else if (primaryAccount.type === 'revenue' || primaryAccount.type === 'Pendapatan') {
      return '1101'; // Default to Cash
    }
    // For expense accounts, suggest cash/bank
    else if (primaryAccount.type === 'expense' || primaryAccount.type === 'Beban') {
      return '1101'; // Default to Cash
    }
    // For asset accounts, suggest appropriate counter based on transaction type
    else if (primaryAccount.type === 'asset' || primaryAccount.type === 'Aktiva' || 
             primaryAccount.type === 'Aset' || primaryAccount.type === 'Aset Tetap') {
      if (transactionType === 'income') {
        // Asset increase - suggest liability or equity
        const liabilityAccount = await prisma.chartofaccount.findFirst({
          where: {
            OR: [
              { type: 'liability' },
              { type: 'Kewajiban' },
              { type: 'Hutang' }
            ]
          }
        });
        return liabilityAccount ? liabilityAccount.code : '2001';
      } else {
        // Asset decrease - suggest expense
        const expenseAccount = await prisma.chartofaccount.findFirst({
          where: {
            OR: [
              { type: 'expense' },
              { type: 'Beban' }
            ]
          }
        });
        return expenseAccount ? expenseAccount.code : '6001';
      }
    }
    // For liability accounts, suggest cash or asset
    else if (primaryAccount.type === 'liability' || primaryAccount.type === 'Kewajiban' || primaryAccount.type === 'Hutang') {
      return '1101'; // Default to Cash
    }
    // For equity accounts, suggest cash
    else if (primaryAccount.type === 'equity' || primaryAccount.type === 'Ekuitas' || primaryAccount.type === 'Modal') {
      return '1101'; // Default to Cash
    }
    
    // Default to cash account
    return '1101';
  } catch (error) {
    console.error('Error suggesting counter account:', error);
    throw error;
  }
};

/**
 * Find the counter transaction for a given transaction
 * @param {number} transactionId - ID of the transaction
 * @returns {Promise<Object|null>} - Counter transaction or null if not found
 */
const findCounterTransaction = async (transactionId) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Find transactions created at the same time (within 1 second)
    const potentialCounters = await prisma.transaction.findMany({
      where: {
        id: { not: transactionId },
        createdAt: {
          gte: new Date(transaction.createdAt.getTime() - 1000),
          lte: new Date(transaction.createdAt.getTime() + 1000)
        },
        amount: transaction.amount // Same amount
      }
    });
    
    // Look for a transaction with opposite type and matching description pattern
    return potentialCounters.find(t => 
      ((transaction.type === 'income' && t.type === 'expense') || 
       (transaction.type === 'expense' && t.type === 'income')) &&
      (t.description.includes('Counter entry for') || 
       t.notes.includes('Counter transaction for'))
    ) || null;
  } catch (error) {
    console.error('Error finding counter transaction:', error);
    throw error;
  }
};

/**
 * Creates a journal entry (two transactions - debit and credit)
 */
async function createJournalEntry(
  date,
  description,
  debitAccountCode,
  creditAccountCode,
  amount,
  projectId = null
) {
  const now = new Date();
  
  // Start a transaction to ensure both entries are created or none
  return await prisma.$transaction(async (tx) => {
    // Create debit entry
    const debitEntry = await tx.transaction.create({
      data: {
        date,
        type: 'DEBIT',
        accountCode: debitAccountCode,
        description,
        amount,
        projectId,
        updatedAt: now,
      },
    });

    // Create credit entry
    const creditEntry = await tx.transaction.create({
      data: {
        date,
        type: 'CREDIT',
        accountCode: creditAccountCode,
        description,
        amount,
        projectId,
        updatedAt: now,
      },
    });

    logger.info('Journal entry created', { 
      description, 
      amount: amount.toString(),
      debitAccount: debitAccountCode, 
      creditAccount: creditAccountCode
    });

    return { debitEntry, creditEntry };
  });
}

/**
 * Find related journal entries for a billing or project cost
 */
async function findRelatedJournalEntries(entityType, entityId) {
  // Format description to search for
  const searchPattern = `${entityType} #${entityId}:`;

  return await prisma.transaction.findMany({
    where: {
      description: {
        startsWith: searchPattern,
      },
    },
  });
}

/**
 * Delete journal entries related to a specific entity
 */
async function deleteJournalEntries(entityType, entityId) {
  const entries = await findRelatedJournalEntries(entityType, entityId);
  
  if (entries.length > 0) {
    const entryIds = entries.map(entry => entry.id);
    
    logger.info('Deleting journal entries', { 
      entityType, 
      entityId, 
      count: entries.length 
    });
    
    return await prisma.transaction.deleteMany({
      where: {
        id: {
          in: entryIds,
        },
      },
    });
  }
  
  return { count: 0 };
}

/**
 * Creates journal entries for billing status changes
 */
async function createJournalEntryForBilling(billing, oldStatus) {
  // Skip journal entry creation if flag is disabled
  if (!billing.createJournalEntry) {
    return null;
  }
  
  const { id, projectId, billingDate, amount, status } = billing;
  
  // Get project details for better description
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  
  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }
  
  // Determine revenue account based on project name or code
  let revenueAccount = '4001'; // Default to Boring Service
  if (project.name.toLowerCase().includes('sondir')) {
    revenueAccount = '4002'; // Sondir Service
  } else if (project.name.toLowerCase().includes('konsultasi')) {
    revenueAccount = '4003'; // Consultation Service
  }
  
  // Common description prefix
  const descriptionPrefix = `Billing #${id}: ${project.name} (${project.projectCode})`;

  try {
    // If status is changing to unpaid: DR Piutang Usaha, CR Pendapatan Jasa
    if (status === 'unpaid') {
      // Check if entries already exist
      const existingEntries = await findRelatedJournalEntries('Billing', id);
      if (existingEntries.length > 0) {
        // If we have existing entries for this billing, delete them first
        await deleteJournalEntries('Billing', id);
      }
      
      return await createJournalEntry(
        billingDate,
        `${descriptionPrefix} - Invoice Created`,
        '1201', // Piutang Usaha
        revenueAccount, // Pendapatan Jasa (based on project type)
        amount,
        projectId
      );
    }
    
    // If status is changing to paid: DR Kas/Bank, CR Piutang Usaha
    else if (status === 'paid') {
      // Default cash account
      const cashAccount = '1101'; // Kas
      
      return await createJournalEntry(
        new Date(), // Current date for payment
        `${descriptionPrefix} - Payment Received`,
        cashAccount, // Kas
        '1201', // Piutang Usaha
        amount,
        projectId
      );
    }
    
    // If status is changing to rejected: Delete all journal entries
    else if (status === 'rejected') {
      return await deleteJournalEntries('Billing', id);
    }
  } catch (error) {
    logger.error('Error creating journal entry for billing:', error);
    throw error;
  }
  
  return null;
}

/**
 * Creates journal entries for project cost status changes
 */
async function createJournalEntryForProjectCost(projectCost, oldStatus) {
  // Skip journal entry creation if flag is disabled
  if (!projectCost.createJournalEntry) {
    return null;
  }
  
  const { id, projectId, date, category, description, amount, status } = projectCost;
  
  // Get project details for better description
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  
  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }
  
  // Determine expense account based on category
  let expenseAccount = '5105'; // Default to Other
  switch (category.toLowerCase()) {
    case 'material':
      expenseAccount = '5101';
      break;
    case 'tenaga kerja':
    case 'labor':
      expenseAccount = '5102';
      break;
    case 'sewa peralatan':
    case 'equipment rental':
      expenseAccount = '5103';
      break;
    case 'transportasi':
    case 'transportation':
      expenseAccount = '5104';
      break;
    default:
      expenseAccount = '5105'; // Other
  }
  
  // Common description prefix
  const descriptionPrefix = `ProjectCost #${id}: ${project.name} (${project.projectCode}) - ${category}`;

  try {
    // If status is changing to unpaid: DR Beban Proyek, CR Hutang Usaha
    if (status === 'unpaid') {
      // Check if entries already exist
      const existingEntries = await findRelatedJournalEntries('ProjectCost', id);
      if (existingEntries.length > 0) {
        // If we have existing entries for this project cost, delete them first
        await deleteJournalEntries('ProjectCost', id);
      }
      
      return await createJournalEntry(
        date,
        `${descriptionPrefix} - Cost Recorded`,
        expenseAccount, // Beban Proyek based on category
        '2102', // Hutang Usaha
        amount,
        projectId
      );
    }
    
    // If status is changing to paid: DR Hutang Usaha, CR Kas/Bank
    else if (status === 'paid') {
      // Default cash account
      const cashAccount = '1101'; // Kas
      
      return await createJournalEntry(
        new Date(), // Current date for payment
        `${descriptionPrefix} - Payment Made`,
        '2102', // Hutang Usaha
        cashAccount, // Kas
        amount,
        projectId
      );
    }
    
    // If status is changing to rejected: Delete all journal entries
    else if (status === 'rejected') {
      return await deleteJournalEntries('ProjectCost', id);
    }
  } catch (error) {
    logger.error('Error creating journal entry for project cost:', error);
    throw error;
  }
  
  return null;
}

/**
 * Record status change history for billing
 */
async function recordBillingStatusHistory(
  billingId,
  oldStatus,
  newStatus,
  changedBy = null,
  notes = null
) {
  return await prisma.billing_status_history.create({
    data: {
      billingId,
      oldStatus,
      newStatus,
      changedBy,
      notes
    }
  });
}

/**
 * Record status change history for project cost
 */
async function recordProjectCostStatusHistory(
  projectCostId, 
  oldStatus, 
  newStatus, 
  changedBy = null,
  notes = null
) {
  return await prisma.projectcost_status_history.create({
    data: {
      projectCostId,
      oldStatus,
      newStatus,
      changedBy,
      notes
    }
  });
}

/**
 * Find and delete transactions related to a billing by project code and description
 */
async function findAndDeleteBillingTransactions(billing) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: billing.projectId },
      select: { projectCode: true, name: true }
    });

    if (!project) {
      logger.warn(`Project not found for billing #${billing.id}`);
      return { count: 0 };
    }

    // Find all transactions related to this billing with various search patterns
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          // Search by billing ID
          {
            description: {
              contains: `Billing #${billing.id}:`
            }
          },
          // Search by invoice description with project code
          {
            description: {
              contains: `Invoice for project ${project.projectCode}`
            }
          },
          // Search by counter entry with project code
          {
            description: {
              contains: `Counter entry for: Invoice for project ${project.projectCode}`
            }
          },
          // Search by notes with billing ID
          {
            notes: {
              contains: `Billing ID: ${billing.id}`
            }
          },
          // Search by project name in description
          {
            description: {
              contains: project.name
            },
            date: {
              equals: new Date(billing.billingDate)
            }
          }
        ]
      }
    });

    if (transactions.length > 0) {
      const transactionIds = transactions.map(t => t.id);
      
      logger.info(`Deleting ${transactions.length} transactions related to billing #${billing.id}`, {
        billingId: billing.id,
        projectCode: project.projectCode,
        transactionIds
      });
      
      return await prisma.transaction.deleteMany({
        where: {
          id: {
            in: transactionIds
          }
        }
      });
    }
    
    return { count: 0 };
  } catch (error) {
    logger.error(`Error finding/deleting transactions for billing #${billing.id}`, { error });
    throw error;
  }
}

module.exports = {
  createDoubleEntryTransaction,
  updateDoubleEntryTransaction,
  generateCounterTransaction,
  suggestCounterAccount,
  findCounterTransaction,
  createJournalEntryForBilling,
  createJournalEntryForProjectCost,
  recordBillingStatusHistory,
  recordProjectCostStatusHistory,
  deleteJournalEntries,
  findRelatedJournalEntries,
  findAndDeleteBillingTransactions
}; 