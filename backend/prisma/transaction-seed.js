const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');

const prisma = new PrismaClient();

// Helper function to generate random date within a range
const randomDate = (start, end) => {
  // Ensure end date is not in the future
  const now = new Date();
  const safeEnd = end > now ? now : end;
  
  return new Date(start.getTime() + Math.random() * (safeEnd.getTime() - start.getTime()));
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Generate random amount within a range
const randomAmount = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper function to format date for MySQL
const formatDateForMySQL = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Main function to seed the database
async function main() {
  try {
    console.log('Starting transaction seed...');
    
    // Get existing accounts, projects
    const accounts = await prisma.chartOfAccount.findMany();
    const projects = await prisma.project.findMany();
    
    if (accounts.length === 0) {
      throw new Error('No accounts found in the database. Please run the main seed script first.');
    }
    
    if (projects.length === 0) {
      throw new Error('No projects found in the database. Please run the main seed script first.');
    }
    
    console.log(`Found ${accounts.length} accounts and ${projects.length} projects.`);
    
    // Filter accounts by type
    const incomeAccounts = accounts.filter(acc => acc.type === 'Pendapatan');
    const expenseAccounts = accounts.filter(acc => acc.type === 'Beban');
    const assetAccounts = accounts.filter(acc => acc.type === 'Aktiva');
    
    console.log(`Filtered accounts: ${incomeAccounts.length} income, ${expenseAccounts.length} expense, ${assetAccounts.length} asset accounts.`);
    
    // Check if we have the necessary accounts
    if (incomeAccounts.length === 0 || expenseAccounts.length === 0 || assetAccounts.length === 0) {
      throw new Error('Missing required account types. Please check your database setup.');
    }
    
    // Find cash and bank accounts
    const cashAccount = assetAccounts.find(acc => acc.code === '1101');
    const bankAccount = assetAccounts.find(acc => acc.code === '1102');
    
    if (!cashAccount || !bankAccount) {
      throw new Error('Cash account (1101) or Bank account (1102) not found. Please check your database setup.');
    }
    
    // Generate transactions using SQL
    console.log('Generating transactions...');
    
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 1, 0, 1); // Start from January 1st of last year
    
    // Generate income transactions
    console.log('Generating income transactions...');
    for (let i = 0; i < 20; i++) {
      const date = randomDate(startDate, today);
      const project = projects[Math.floor(Math.random() * projects.length)];
      const incomeAccount = incomeAccounts[Math.floor(Math.random() * incomeAccounts.length)];
      const assetAccount = Math.random() > 0.5 ? bankAccount : cashAccount;
      const amount = randomAmount(5000000, 20000000);
      const formattedDate = formatDateForMySQL(date);
      const now = formatDateForMySQL(new Date());
      
      // Create income transaction
      await prisma.$executeRaw`
        INSERT INTO Transaction (date, type, accountCode, description, amount, projectId, notes, createdAt, updatedAt)
        VALUES (${formattedDate}, 'income', ${incomeAccount.code}, ${`Pendapatan ${incomeAccount.name} - ${project.name}`}, ${amount}, ${project.id}, ${`Invoice #INV-${format(date, 'yyyyMMdd')}-${i.toString().padStart(3, '0')}`}, ${now}, ${now})
      `;
      
      // Create counter transaction
      await prisma.$executeRaw`
        INSERT INTO Transaction (date, type, accountCode, description, amount, projectId, notes, createdAt, updatedAt)
        VALUES (${formattedDate}, 'income', ${assetAccount.code}, ${`Penerimaan ${incomeAccount.name} - ${project.name}`}, ${amount}, ${project.id}, ${'Counter transaction'}, ${now}, ${now})
      `;
    }
    
    // Generate expense transactions
    console.log('Generating expense transactions...');
    for (let i = 0; i < 30; i++) {
      const date = randomDate(startDate, today);
      const project = i % 3 === 0 ? null : projects[Math.floor(Math.random() * projects.length)];
      const expenseAccount = expenseAccounts[Math.floor(Math.random() * expenseAccounts.length)];
      const assetAccount = Math.random() > 0.5 ? bankAccount : cashAccount;
      const amount = randomAmount(1000000, 10000000);
      const formattedDate = formatDateForMySQL(date);
      const now = formatDateForMySQL(new Date());
      
      // Create expense transaction
      await prisma.$executeRaw`
        INSERT INTO Transaction (date, type, accountCode, description, amount, projectId, notes, createdAt, updatedAt)
        VALUES (${formattedDate}, 'expense', ${expenseAccount.code}, ${`Beban ${expenseAccount.name}${project ? ' - ' + project.name : ''}`}, ${amount}, ${project?.id || null}, ${`Kwitansi #KW-${format(date, 'yyyyMMdd')}-${i.toString().padStart(3, '0')}`}, ${now}, ${now})
      `;
      
      // Create counter transaction
      await prisma.$executeRaw`
        INSERT INTO Transaction (date, type, accountCode, description, amount, projectId, notes, createdAt, updatedAt)
        VALUES (${formattedDate}, 'expense', ${assetAccount.code}, ${`Pembayaran ${expenseAccount.name}${project ? ' - ' + project.name : ''}`}, ${amount}, ${project?.id || null}, ${'Counter transaction'}, ${now}, ${now})
      `;
    }
    
    // Generate additional income/expense transactions to replace transfers
    console.log('Generating additional income/expense transactions...');
    for (let i = 0; i < 10; i++) {
      const date = randomDate(startDate, today);
      const amount = randomAmount(2000000, 15000000);
      const formattedDate = formatDateForMySQL(date);
      const now = formatDateForMySQL(new Date());
      
      if (i % 2 === 0) {
        // Create income transaction
        await prisma.$executeRaw`
          INSERT INTO Transaction (date, type, accountCode, description, amount, projectId, notes, createdAt, updatedAt)
          VALUES (${formattedDate}, 'income', ${bankAccount.code}, ${'Penerimaan Dana Operasional'}, ${amount}, NULL, ${'Additional income transaction'}, ${now}, ${now})
        `;
      } else {
        // Create expense transaction
        await prisma.$executeRaw`
          INSERT INTO Transaction (date, type, accountCode, description, amount, projectId, notes, createdAt, updatedAt)
          VALUES (${formattedDate}, 'expense', ${cashAccount.code}, ${'Operational Fund Expenditure'}, ${amount}, NULL, ${'Additional expense transaction'}, ${now}, ${now})
        `;
      }
    }
    
    console.log('Transaction seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding transactions:', error);
    throw error;
  }
}

// Run the seed function
main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 