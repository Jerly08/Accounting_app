const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');

// Initialize PrismaClient with logging
const prisma = new PrismaClient({
  log: ['error', 'warn', 'info', 'query'],
});

// Helper function to format date for MySQL
const formatDateForMySQL = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Helper function to get account names based on code
const getCategoryName = (code) => {
  const categories = {
    '2101': 'Hutang Bank Jangka Pendek',
    '2201': 'Hutang Bank Jangka Panjang',
    '3101': 'Modal Saham',
    '3102': 'Laba Ditahan'
  };
  return categories[code] || `Account ${code}`;
};

// Main seeding function
async function main() {
  try {
    console.log('Starting cashflow categorization and transaction seed...');
    
    // First check if the database already has basic data
    const accountsCount = await prisma.chartofaccount.count();
    if (accountsCount === 0) {
      console.log('No accounts found. Please run the base seed script first.');
      // Let's try to run it
      console.log('Attempting to run the base seed script...');
      try {
        const { execSync } = require('child_process');
        execSync('npm run seed', { stdio: 'inherit' });
        console.log('Base seed completed successfully.');
      } catch (e) {
        console.error('Failed to run the base seed script:', e);
        // Let's check if it partially succeeded
      }
    }
    
    // Check if we have clients
    const clientsCount = await prisma.client.count();
    if (clientsCount === 0) {
      console.log('No clients found, adding sample clients...');
      await addSampleClients();
    }
    
    // Check if we have projects
    const projectsCount = await prisma.project.count();
    if (projectsCount === 0) {
      console.log('No projects found, adding sample projects...');
      await addSampleProjects();
    }
    
    // Now we can proceed with our seed script
    // Define cashflow categories for existing account codes
    const cashflowCategories = [
      // Operating activities
      { accountCode: '4001', category: 'operating', subcategory: 'revenue' }, // Pendapatan Jasa Boring
      { accountCode: '4002', category: 'operating', subcategory: 'revenue' }, // Pendapatan Jasa Sondir
      { accountCode: '4003', category: 'operating', subcategory: 'revenue' }, // Pendapatan Jasa Konsultasi
      { accountCode: '5101', category: 'operating', subcategory: 'project_cost' }, // Beban Proyek - Material
      { accountCode: '5102', category: 'operating', subcategory: 'project_cost' }, // Beban Proyek - Tenaga Kerja
      { accountCode: '5103', category: 'operating', subcategory: 'project_cost' }, // Beban Proyek - Sewa Peralatan
      { accountCode: '5104', category: 'operating', subcategory: 'project_cost' }, // Beban Proyek - Transportasi
      { accountCode: '5105', category: 'operating', subcategory: 'project_cost' }, // Beban Proyek - Lain-lain
      { accountCode: '6101', category: 'operating', subcategory: 'operational_expense' }, // Beban Operasional Kantor
      { accountCode: '6102', category: 'operating', subcategory: 'operational_expense' }, // Beban Gaji & Tunjangan
      { accountCode: '6103', category: 'operating', subcategory: 'operational_expense' }, // Beban Listrik & Air
      { accountCode: '6104', category: 'operating', subcategory: 'operational_expense' }, // Beban Internet & Telekomunikasi
      { accountCode: '1201', category: 'operating', subcategory: 'accounts_receivable' }, // Piutang Usaha
      { accountCode: '1101', category: 'operating', subcategory: 'cash' }, // Kas
      { accountCode: '1102', category: 'operating', subcategory: 'bank' }, // Bank BCA
      { accountCode: '1103', category: 'operating', subcategory: 'bank' }, // Bank Mandiri
      { accountCode: '1301', category: 'operating', subcategory: 'wip' }, // Pekerjaan Dalam Proses (WIP)
      { accountCode: '1302', category: 'operating', subcategory: 'wip' }, // Work In Progress (WIP) - Unbilled
      
      // Investing activities
      { accountCode: '1501', category: 'investing', subcategory: 'fixed_asset' }, // Mesin Boring
      { accountCode: '1502', category: 'investing', subcategory: 'fixed_asset' }, // Mesin Sondir
      { accountCode: '1503', category: 'investing', subcategory: 'fixed_asset' }, // Kendaraan Operasional
      { accountCode: '1504', category: 'investing', subcategory: 'fixed_asset' }, // Peralatan Kantor
      { accountCode: '1505', category: 'investing', subcategory: 'fixed_asset' }, // Bangunan Kantor
      { accountCode: '1601', category: 'investing', subcategory: 'accumulated_depreciation' }, // Akumulasi Penyusutan Mesin Boring
      { accountCode: '1602', category: 'investing', subcategory: 'accumulated_depreciation' }, // Akumulasi Penyusutan Mesin Sondir
      { accountCode: '1603', category: 'investing', subcategory: 'accumulated_depreciation' }, // Akumulasi Penyusutan Kendaraan
      { accountCode: '1604', category: 'investing', subcategory: 'accumulated_depreciation' }, // Akumulasi Penyusutan Peralatan Kantor
      { accountCode: '1605', category: 'investing', subcategory: 'accumulated_depreciation' }, // Akumulasi Penyusutan Bangunan
      { accountCode: '6105', category: 'operating', subcategory: 'depreciation_expense' }, // Beban Penyusutan
    ];
    
    console.log('Setting up cashflow categories...');
    
    // Get the existing chart of accounts
    const existingAccounts = await prisma.chartofaccount.findMany({
      select: { code: true }
    });
    
    const accountCodes = existingAccounts.map(acc => acc.code);
    
    // For each account code, create or update the cashflow_category
    for (const category of cashflowCategories) {
      if (accountCodes.includes(category.accountCode)) {
        // Check if category exists
        const existingCategory = await prisma.cashflow_category.findFirst({
          where: { accountCode: category.accountCode }
        });
        
        if (existingCategory) {
          // Update
          console.log(`Updating category for account ${category.accountCode}`);
          await prisma.cashflow_category.update({
            where: { id: existingCategory.id },
            data: {
              category: category.category,
              subcategory: category.subcategory,
              updatedAt: new Date()
            }
          });
        } else {
          // Create
          console.log(`Creating category for account ${category.accountCode}`);
          await prisma.cashflow_category.create({
            data: {
              accountCode: category.accountCode,
              category: category.category,
              subcategory: category.subcategory,
              updatedAt: new Date()
            }
          });
        }
      } else {
        console.log(`Account ${category.accountCode} not found in chart of accounts. Skipping.`);
      }
    }
    
    // Create additional transactions to impact the cash flow and balance sheet
    console.log('Creating additional financial transactions...');
    
    // Get accounts
    const accounts = await prisma.chartofaccount.findMany();
    if (accounts.length === 0) {
      console.log('No chart of accounts found. Seeding failed.');
      return;
    }
    
    const cashAccount = accounts.find(acc => acc.code === '1101'); // Kas
    const bankAccount = accounts.find(acc => acc.code === '1102'); // Bank BCA
    
    if (!cashAccount || !bankAccount) {
      console.log('Required accounts not found. Seeding failed.');
      return;
    }
    
    // Get projects
    const projects = await prisma.project.findMany();
    if (projects.length === 0) {
      console.log('No projects found. Seeding failed.');
      return;
    }
    
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1); // Start from 3 months ago
    
    // 1. Create fixed asset purchase (investing activity)
    console.log('Adding fixed asset...');
    
    // Check if we already have this fixed asset
    const existingFixedAsset = await prisma.fixedasset.findFirst({
      where: { assetName: 'Mesin Boring Baru' }
    });
    
    let newFixedAsset;
    
    if (existingFixedAsset) {
      console.log('Fixed asset already exists, skipping creation.');
      newFixedAsset = existingFixedAsset;
    } else {
      const fixedAssetDate = new Date(startDate);
      fixedAssetDate.setDate(fixedAssetDate.getDate() + 15);
      
      // Add a new fixed asset to the database
      newFixedAsset = await prisma.fixedasset.create({
        data: {
          assetName: 'Mesin Boring Baru',
          acquisitionDate: fixedAssetDate,
          value: 185000000,
          usefulLife: 60, // 5 years in months
          accumulatedDepreciation: 3083333.33, // (185000000 / 60) * 1 month
          bookValue: 181916666.67, // 185000000 - 3083333.33
          category: 'equipment',
          updatedAt: new Date()
        }
      });
      
      console.log('Creating fixed asset purchase transactions...');
      // Fixed acquisition date variable already exists, use it directly
      
      // Create the fixed asset purchase transaction
      await prisma.transaction.create({
        data: {
          date: fixedAssetDate,
          type: 'expense',
          accountCode: '1501', // Mesin Boring
          description: 'Pembelian Mesin Boring Baru',
          amount: 185000000,
          projectId: null,
          notes: 'Investasi mesin boring baru untuk ekspansi kapasitas',
          updatedAt: new Date()
        }
      });
      
      // Create the counter transaction from bank account
      await prisma.transaction.create({
        data: {
          date: fixedAssetDate,
          type: 'expense',
          accountCode: '1102', // Bank BCA
          description: 'Pembayaran Pembelian Mesin Boring Baru',
          amount: 185000000,
          projectId: null,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
      
      // 2. Create depreciation expense entries (operating activity)
      console.log('Creating depreciation transactions...');
      const depreciationDate = new Date(fixedAssetDate);
      depreciationDate.setMonth(depreciationDate.getMonth() + 1);
      
      // Depreciation expense
      await prisma.transaction.create({
        data: {
          date: depreciationDate,
          type: 'expense',
          accountCode: '6105', // Beban Penyusutan
          description: 'Beban Penyusutan Bulanan Mesin Boring',
          amount: 3083333.33,
          projectId: null,
          notes: 'Penyusutan bulan pertama mesin boring baru',
          updatedAt: new Date()
        }
      });
      
      // Accumulated depreciation (contra asset)
      await prisma.transaction.create({
        data: {
          date: depreciationDate,
          type: 'expense',
          accountCode: '1601', // Akumulasi Penyusutan Mesin Boring
          description: 'Akumulasi Penyusutan Mesin Boring',
          amount: 3083333.33,
          projectId: null,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
    }
    
    // 3. Create project billing and payment (operating activity)
    console.log('Creating project billing and payment transactions...');
    
    // Check if we've already created a billing for this project
    const project = projects[0]; // Use first project
    const existingBilling = await prisma.billing.findFirst({
      where: { 
        projectId: project.id,
        status: 'paid',
        invoice: { startsWith: 'INV-' }
      }
    });
    
    if (existingBilling) {
      console.log('Project billing already exists, skipping creation.');
    } else {
      const billingDate = new Date(today);
      billingDate.setDate(billingDate.getDate() - 45);
      
      // Create a billing record for the project
      const billing = await prisma.billing.create({
        data: {
          projectId: project.id,
          billingDate: billingDate,
          percentage: 40.00,
          amount: project.totalValue * 0.4,
          status: 'paid',
          invoice: `INV-${format(billingDate, 'yyyyMMdd')}-001`,
          updatedAt: new Date()
        }
      });
      
      // Record the revenue transaction
      const paymentDate = new Date(billingDate);
      paymentDate.setDate(paymentDate.getDate() + 7);
      
      // Revenue recognition
      await prisma.transaction.create({
        data: {
          date: billingDate,
          type: 'income',
          accountCode: '4001', // Pendapatan Jasa Boring
          description: `Pendapatan dari Proyek ${project.name}`,
          amount: project.totalValue * 0.4,
          projectId: project.id,
          notes: `Invoice ${billing.invoice}`,
          updatedAt: new Date()
        }
      });
      
      // Accounts receivable initially
      await prisma.transaction.create({
        data: {
          date: billingDate,
          type: 'income',
          accountCode: '1201', // Piutang Usaha
          description: `Piutang dari Proyek ${project.name}`,
          amount: project.totalValue * 0.4,
          projectId: project.id,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
      
      // Payment received a week later
      await prisma.transaction.create({
        data: {
          date: paymentDate,
          type: 'income',
          accountCode: '1102', // Bank BCA
          description: `Pembayaran dari Proyek ${project.name}`,
          amount: project.totalValue * 0.4,
          projectId: project.id,
          notes: `Payment for invoice ${billing.invoice}`,
          updatedAt: new Date()
        }
      });
      
      // Clear accounts receivable
      await prisma.transaction.create({
        data: {
          date: paymentDate,
          type: 'expense',
          accountCode: '1201', // Piutang Usaha
          description: `Pelunasan Piutang dari Proyek ${project.name}`,
          amount: project.totalValue * 0.4,
          projectId: project.id,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
    }
    
    // 4. Create operational expenses (operating activity)
    console.log('Creating operational expense transactions...');
    
    // Check for existing expense transactions to avoid duplicates
    const existingExpense = await prisma.transaction.findFirst({
      where: {
        type: 'expense',
        accountCode: '6101',
        description: { contains: '- Bulanan' }
      }
    });
    
    if (existingExpense) {
      console.log('Operational expense transactions already exist, skipping creation.');
    } else {
      const expenseCategories = [
        { code: '6101', name: 'Beban Operasional Kantor', amount: 7500000 },
        { code: '6102', name: 'Beban Gaji & Tunjangan', amount: 25000000 },
        { code: '6103', name: 'Beban Listrik & Air', amount: 2800000 },
        { code: '6104', name: 'Beban Internet & Telekomunikasi', amount: 1200000 }
      ];
      
      const expenseDate = new Date(today);
      expenseDate.setDate(1); // First day of current month
      
      for (const expense of expenseCategories) {
        // Expense transaction
        await prisma.transaction.create({
          data: {
            date: expenseDate,
            type: 'expense',
            accountCode: expense.code,
            description: `${expense.name} - Bulanan`,
            amount: expense.amount,
            projectId: null,
            notes: `Pengeluaran operasional bulan ${format(expenseDate, 'MMMM yyyy')}`,
            updatedAt: new Date()
          }
        });
        
        // Payment from bank
        await prisma.transaction.create({
          data: {
            date: expenseDate,
            type: 'expense',
            accountCode: '1102', // Bank BCA
            description: `Pembayaran ${expense.name}`,
            amount: expense.amount,
            projectId: null,
            notes: 'Counter transaction',
            updatedAt: new Date()
          }
        });
      }
    }
    
    // 5. Create investing activity transactions for the selected period (April 30, 2025 - June 21, 2025)
    console.log('Creating investing activity transactions...');
    
    // Check if we already have investing transactions for this period
    const existingInvestingTransaction = await prisma.transaction.findFirst({
      where: {
        date: {
          gte: new Date('2025-04-30'),
          lte: new Date('2025-06-21')
        },
        description: { contains: 'Penjualan Mesin Sondir Lama' }
      }
    });
    
    if (existingInvestingTransaction) {
      console.log('Investing transactions for this period already exist, skipping creation.');
    } else {
      // 5.1 Sale of an old fixed asset (cash inflow)
      const saleDate = new Date('2025-05-15');
      
      // Record the sale of the old equipment (decrease fixed asset)
      await prisma.transaction.create({
        data: {
          date: saleDate,
          type: 'expense', // Reducing the asset
          accountCode: '1502', // Mesin Sondir
          description: 'Penjualan Mesin Sondir Lama',
          amount: 75000000, // Original value
          projectId: null,
          notes: 'Penjualan aset tetap yang sudah tidak digunakan',
          updatedAt: new Date()
        }
      });
      
      // Record accumulated depreciation reduction
      await prisma.transaction.create({
        data: {
          date: saleDate,
          type: 'income', // Reducing the contra asset (which increases net assets)
          accountCode: '1602', // Akumulasi Penyusutan Mesin Sondir
          description: 'Pengurangan Akumulasi Penyusutan - Penjualan Mesin Sondir',
          amount: 60000000, // Accumulated depreciation
          projectId: null,
          notes: 'Penyesuaian akumulasi penyusutan untuk aset yang dijual',
          updatedAt: new Date()
        }
      });
      
      // Record cash received (more than book value - gain on sale)
      await prisma.transaction.create({
        data: {
          date: saleDate,
          type: 'income',
          accountCode: '1102', // Bank BCA
          description: 'Penerimaan dari Penjualan Mesin Sondir Lama',
          amount: 25000000, // Sale price
          projectId: null,
          notes: 'Penerimaan kas dari penjualan aset tetap',
          updatedAt: new Date()
        }
      });
      
      // Record gain on sale (if any)
      await prisma.transaction.create({
        data: {
          date: saleDate,
          type: 'income',
          accountCode: '4001', // Using income account for gain
          description: 'Keuntungan Penjualan Aset Tetap',
          amount: 10000000, // Gain on sale
          projectId: null,
          notes: 'Keuntungan dari penjualan mesin sondir lama',
          updatedAt: new Date()
        }
      });
      
      // 5.2 Purchase of new equipment (cash outflow)
      const purchaseDate = new Date('2025-06-05');
      
      // Add a new fixed asset to the database
      const newEquipment = await prisma.fixedasset.create({
        data: {
          assetName: 'Peralatan Laboratorium Baru',
          acquisitionDate: purchaseDate,
          value: 45000000,
          usefulLife: 60, // 5 years in months
          accumulatedDepreciation: 0, // New equipment
          bookValue: 45000000,
          category: 'equipment',
          updatedAt: new Date()
        }
      });
      
      // Create the fixed asset purchase transaction
      await prisma.transaction.create({
        data: {
          date: purchaseDate,
          type: 'expense',
          accountCode: '1504', // Peralatan Kantor
          description: 'Pembelian Peralatan Laboratorium Baru',
          amount: 45000000,
          projectId: null,
          notes: 'Investasi peralatan laboratorium untuk pengujian sampel',
          updatedAt: new Date()
        }
      });
      
      // Create the counter transaction from bank account
      await prisma.transaction.create({
        data: {
          date: purchaseDate,
          type: 'expense',
          accountCode: '1102', // Bank BCA
          description: 'Pembayaran Pembelian Peralatan Laboratorium',
          amount: 45000000,
          projectId: null,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
      
      // 5.3 Investment in marketable securities (cash outflow)
      const investmentDate = new Date('2025-05-20');
      
      // Create the investment transaction
      await prisma.transaction.create({
        data: {
          date: investmentDate,
          type: 'expense',
          accountCode: '1301', // Using WIP account as placeholder for investment
          description: 'Investasi Surat Berharga',
          amount: 50000000,
          projectId: null,
          notes: 'Investasi jangka pendek untuk optimalisasi kas',
          updatedAt: new Date()
        }
      });
      
      // Create the counter transaction from bank account
      await prisma.transaction.create({
        data: {
          date: investmentDate,
          type: 'expense',
          accountCode: '1102', // Bank BCA
          description: 'Pembayaran Investasi Surat Berharga',
          amount: 50000000,
          projectId: null,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
    }
    
    // 6. Create financing activity transactions
    console.log('Creating financing activity transactions...');
    
    // Check if we already have financing transactions
    const existingFinancingTransaction = await prisma.transaction.findFirst({
      where: {
        date: {
          gte: new Date('2025-04-30'),
          lte: new Date('2025-06-21')
        },
        description: { contains: 'Penerimaan Pinjaman Bank' }
      }
    });
    
    if (existingFinancingTransaction) {
      console.log('Financing transactions already exist, skipping creation.');
    } else {
      // Update cashflow categories to include financing activities
      const financingCategories = [
        { accountCode: '2101', category: 'financing', subcategory: 'short_term_debt' }, // Hutang Bank Jangka Pendek
        { accountCode: '2201', category: 'financing', subcategory: 'long_term_debt' }, // Hutang Bank Jangka Panjang
        { accountCode: '3101', category: 'financing', subcategory: 'equity' }, // Modal Saham
        { accountCode: '3102', category: 'financing', subcategory: 'retained_earnings' }, // Laba Ditahan
      ];
      
      // Add financing categories to chart of accounts if they don't exist
      for (const category of financingCategories) {
        // Check if account exists
        const accountExists = await prisma.chartofaccount.findFirst({
          where: { code: category.accountCode }
        });
        
        if (!accountExists) {
          // Create the cashflow category first
          await prisma.cashflow_category.create({
            data: {
              accountCode: category.accountCode,
              category: category.category,
              subcategory: category.subcategory,
              updatedAt: new Date()
            }
          });
          
          // Then create the account that references it
          await prisma.chartofaccount.create({
            data: {
              code: category.accountCode,
              name: getCategoryName(category.accountCode),
              type: category.accountCode.startsWith('2') ? 'Kewajiban' : 'Ekuitas',
              category: category.accountCode.startsWith('2') ? 'Hutang' : 'Modal',
              updatedAt: new Date(),
            }
          });
        } else {
          // Update the cashflow category
          const existingCategory = await prisma.cashflow_category.findFirst({
            where: { accountCode: category.accountCode }
          });
          
          if (existingCategory) {
            await prisma.cashflow_category.update({
              where: { id: existingCategory.id },
              data: {
                category: category.category,
                subcategory: category.subcategory,
                updatedAt: new Date()
              }
            });
          } else {
            await prisma.cashflow_category.create({
              data: {
                accountCode: category.accountCode,
                category: category.category,
                subcategory: category.subcategory,
                updatedAt: new Date()
              }
            });
          }
        }
      }
      
      // 6.1 Bank loan acquisition (cash inflow)
      const loanDate = new Date('2025-05-10');
      
      // Record the loan liability
      await prisma.transaction.create({
        data: {
          date: loanDate,
          type: 'income', // Increasing the liability
          accountCode: '2201', // Hutang Bank Jangka Panjang
          description: 'Penerimaan Pinjaman Bank',
          amount: 200000000,
          projectId: null,
          notes: 'Pinjaman untuk ekspansi usaha',
          updatedAt: new Date()
        }
      });
      
      // Record cash received
      await prisma.transaction.create({
        data: {
          date: loanDate,
          type: 'income',
          accountCode: '1102', // Bank BCA
          description: 'Penerimaan Dana Pinjaman Bank',
          amount: 200000000,
          projectId: null,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
      
      // 6.2 Loan repayment (cash outflow)
      const repaymentDate = new Date('2025-06-10');
      
      // Record principal payment
      await prisma.transaction.create({
        data: {
          date: repaymentDate,
          type: 'expense', // Decreasing the liability
          accountCode: '2201', // Hutang Bank Jangka Panjang
          description: 'Pembayaran Pokok Pinjaman Bank',
          amount: 10000000,
          projectId: null,
          notes: 'Pembayaran angsuran pertama pinjaman',
          updatedAt: new Date()
        }
      });
      
      // Record interest payment
      await prisma.transaction.create({
        data: {
          date: repaymentDate,
          type: 'expense',
          accountCode: '6101', // Using operational expense for interest
          description: 'Pembayaran Bunga Pinjaman Bank',
          amount: 2000000,
          projectId: null,
          notes: 'Bunga pinjaman bulan pertama',
          updatedAt: new Date()
        }
      });
      
      // Record cash paid
      await prisma.transaction.create({
        data: {
          date: repaymentDate,
          type: 'expense',
          accountCode: '1102', // Bank BCA
          description: 'Pembayaran Angsuran Pinjaman Bank',
          amount: 12000000, // Principal + interest
          projectId: null,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
      
      // 6.3 Dividend payment (cash outflow)
      const dividendDate = new Date('2025-05-25');
      
      // Record dividend declaration
      await prisma.transaction.create({
        data: {
          date: dividendDate,
          type: 'expense',
          accountCode: '3102', // Laba Ditahan
          description: 'Pembagian Dividen',
          amount: 25000000,
          projectId: null,
          notes: 'Dividen untuk pemegang saham',
          updatedAt: new Date()
        }
      });
      
      // Record cash paid
      await prisma.transaction.create({
        data: {
          date: dividendDate,
          type: 'expense',
          accountCode: '1102', // Bank BCA
          description: 'Pembayaran Dividen',
          amount: 25000000,
          projectId: null,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
    }
    
    // 7. Create sample cash flow report
    console.log('Creating sample cash flow report...');
    
    // Check if we already have cash flow reports
    const existingReport = await prisma.cashflow_report.findFirst({
      where: {
        startDate: new Date('2025-04-30'),
        endDate: new Date('2025-06-21')
      }
    });
    
    if (!existingReport) {
      await prisma.cashflow_report.create({
        data: {
          startDate: new Date('2025-04-30'),
          endDate: new Date('2025-06-21'),
          reportData: {
            operating: {
              inflows: 300000000,
              outflows: 163000000,
              net: 137000000
            },
            investing: {
              inflows: 75000000,
              outflows: 170000000,
              net: -95000000
            },
            financing: {
              inflows: 200000000,
              outflows: 37000000,
              net: 163000000
            },
            netChange: 205000000,
            beginningBalance: 150000000,
            endingBalance: 355000000
          },
          createdBy: 1,
          updatedAt: new Date(),
          isComparative: false
        }
      });
    }
    
    console.log('Cashflow categorization and transaction seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding cashflow data:', error);
    throw error;
  }
}

// Add sample clients
async function addSampleClients() {
  const clients = [
    {
      name: 'PT Pembangunan Jaya',
      phone: '021-5551234',
      email: 'contact@pembangunanjaya.com',
      address: 'Jl. Gatot Subroto No. 123, Jakarta Selatan',
      updatedAt: new Date()
    },
    {
      name: 'PT Konstruksi Maju Bersama',
      phone: '021-6667890',
      email: 'info@kmb-konstruksi.co.id',
      address: 'Jl. Sudirman Kav. 45, Jakarta Pusat',
      updatedAt: new Date()
    },
    {
      name: 'PT Karya Bangun Sejahtera',
      phone: '022-4445678',
      email: 'kbs@karyabangun.com',
      address: 'Jl. Asia Afrika No. 78, Bandung',
      updatedAt: new Date()
    }
  ];
  
  for (const client of clients) {
    await prisma.client.create({ data: client });
  }
  console.log('Added sample clients.');
}

// Add sample projects
async function addSampleProjects() {
  const clients = await prisma.client.findMany();
  if (clients.length === 0) {
    throw new Error('No clients available to create projects');
  }
  
  const projects = [
    {
      projectCode: 'BOR-2024-001',
      name: 'Boring Test Gedung Perkantoran CBD',
      clientId: clients[0].id,
      startDate: new Date('2024-02-15'),
      endDate: new Date('2024-05-30'),
      totalValue: 175000000,
      status: 'completed',
      updatedAt: new Date()
    },
    {
      projectCode: 'SON-2024-002',
      name: 'Sondir Apartemen Grand Residence',
      clientId: clients[1].id,
      startDate: new Date('2024-03-10'),
      endDate: null,
      totalValue: 225000000,
      status: 'ongoing',
      updatedAt: new Date()
    },
    {
      projectCode: 'BOR-2024-003',
      name: 'Boring & Sondir Jembatan Tol',
      clientId: clients[2].id,
      startDate: new Date('2024-04-01'),
      endDate: null,
      totalValue: 350000000,
      status: 'ongoing',
      updatedAt: new Date()
    }
  ];
  
  for (const project of projects) {
    await prisma.project.create({ data: project });
  }
  console.log('Added sample projects.');
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