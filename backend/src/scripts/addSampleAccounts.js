/**
 * Script to add sample accounts to the database for testing cash flow reports
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting to add sample accounts...');

    // Sample accounts
    const sampleAccounts = [
      // Cash accounts
      {
        code: 'CASH-001',
        name: 'Cash on Hand',
        type: 'asset',
        category: 'Cash',
      },
      {
        code: 'BANK-001',
        name: 'Bank Account',
        type: 'asset',
        category: 'Bank',
      },
      
      // Fixed asset accounts
      {
        code: 'FA-001',
        name: 'Equipment',
        type: 'asset',
        category: 'Fixed Assets',
      },
      
      // Liability accounts
      {
        code: 'CL-001',
        name: 'Accounts Payable',
        type: 'liability',
        category: 'Current Liabilities',
      },
      {
        code: 'LTL-001',
        name: 'Long-term Loan',
        type: 'liability',
        category: 'Long-term Liabilities',
      },
      
      // Equity accounts
      {
        code: 'EQ-001',
        name: 'Common Stock',
        type: 'equity',
        category: 'Equity',
      },
      
      // Revenue accounts
      {
        code: 'REV-001',
        name: 'Sales Revenue',
        type: 'revenue',
        category: 'Revenue',
      },
      
      // Expense accounts
      {
        code: 'EXP-001',
        name: 'Operating Expenses',
        type: 'expense',
        category: 'Expense',
      }
    ];

    // Create accounts
    for (const account of sampleAccounts) {
      // Check if account already exists
      const existingAccount = await prisma.chartofaccount.findUnique({
        where: {
          code: account.code
        }
      });

      if (existingAccount) {
        console.log(`Account ${account.code} already exists, skipping...`);
        continue;
      }

      await prisma.chartofaccount.create({
        data: {
          ...account,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`Added account: ${account.code} - ${account.name} (${account.type}, ${account.category})`);
    }

    console.log('Sample accounts added successfully!');
  } catch (error) {
    console.error('Error adding sample accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 