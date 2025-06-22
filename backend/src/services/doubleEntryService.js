/**
 * Double Entry Accounting Service
 * Provides functions to handle double-entry accounting transactions
 */
const { PrismaClient } = require('@prisma/client');
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

module.exports = {
  createDoubleEntryTransaction,
  generateCounterTransaction,
  suggestCounterAccount
}; 