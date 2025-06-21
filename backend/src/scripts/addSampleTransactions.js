/**
 * Script to add sample transactions to the database for testing cash flow reports
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting to add sample transactions...');

    // Get a cash account
    const cashAccount = await prisma.chartofaccount.findFirst({
      where: {
        OR: [
          { category: 'Cash' },
          { category: 'Bank' }
        ]
      }
    });

    if (!cashAccount) {
      console.log('No cash account found. Please create a cash account first.');
      return;
    }

    console.log(`Using cash account: ${cashAccount.code} - ${cashAccount.name}`);

    // Get an asset account
    const assetAccount = await prisma.chartofaccount.findFirst({
      where: {
        type: 'asset',
        category: 'Fixed Assets'
      }
    });

    if (!assetAccount) {
      console.log('No asset account found. Please create an asset account first.');
      return;
    }

    console.log(`Using asset account: ${assetAccount.code} - ${assetAccount.name}`);

    // Get a liability account
    const liabilityAccount = await prisma.chartofaccount.findFirst({
      where: {
        type: 'liability'
      }
    });

    if (!liabilityAccount) {
      console.log('No liability account found. Please create a liability account first.');
      return;
    }

    console.log(`Using liability account: ${liabilityAccount.code} - ${liabilityAccount.name}`);

    // Get an equity account
    const equityAccount = await prisma.chartofaccount.findFirst({
      where: {
        type: 'equity'
      }
    });

    if (!equityAccount) {
      console.log('No equity account found. Please create an equity account first.');
      return;
    }

    console.log(`Using equity account: ${equityAccount.code} - ${equityAccount.name}`);

    // Sample transactions for the period April 30, 2025 to June 21, 2025
    const sampleTransactions = [
      // Operating activities
      {
        date: new Date('2025-05-05'),
        type: 'income',
        accountCode: cashAccount.code,
        description: 'Cash sales',
        amount: 5000000,
        notes: 'Sample operating activity'
      },
      {
        date: new Date('2025-05-10'),
        type: 'expense',
        accountCode: cashAccount.code,
        description: 'Office supplies',
        amount: 1000000,
        notes: 'Sample operating activity'
      },
      
      // Investing activities
      {
        date: new Date('2025-05-15'),
        type: 'expense',
        accountCode: assetAccount.code,
        description: 'Purchase of equipment',
        amount: 10000000,
        notes: 'Sample investing activity'
      },
      
      // Financing activities
      {
        date: new Date('2025-06-01'),
        type: 'income',
        accountCode: liabilityAccount.code,
        description: 'Loan received',
        amount: 20000000,
        notes: 'Sample financing activity'
      },
      {
        date: new Date('2025-06-15'),
        type: 'expense',
        accountCode: equityAccount.code,
        description: 'Dividend payment',
        amount: 5000000,
        notes: 'Sample financing activity'
      }
    ];

    // Create transactions
    for (const transaction of sampleTransactions) {
      await prisma.transaction.create({
        data: {
          ...transaction,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`Added transaction: ${transaction.description} - ${transaction.amount}`);
    }

    console.log('Sample transactions added successfully!');
  } catch (error) {
    console.error('Error adding sample transactions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 