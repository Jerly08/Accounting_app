/**
 * Script untuk setup cashflow_category
 * Run dengan: node src/scripts/setupCashflowCategories.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupCashflowCategories() {
  try {
    console.log('Setting up cashflow categories...');
    
    // Get all accounts
    const accounts = await prisma.chartofaccount.findMany();
    console.log(`Found ${accounts.length} accounts in Chart of Accounts`);
    
    // Define cashflow categories based on account codes
    const cashflowCategories = [
      // Cash and Bank accounts - Operating Activities
      { accountCode: '1101', category: 'operating', subcategory: 'cash' }, // Kas
      { accountCode: '1102', category: 'operating', subcategory: 'cash' }, // Bank BCA
      { accountCode: '1103', category: 'operating', subcategory: 'cash' }, // Bank Mandiri
      { accountCode: '1104', category: 'operating', subcategory: 'cash' }, // Bank BNI
      { accountCode: '1105', category: 'operating', subcategory: 'cash' }, // Bank BRI
      
      // Receivables - Operating Activities
      { accountCode: '1201', category: 'operating', subcategory: 'receivable' }, // Piutang Usaha
      
      // Work In Progress - Operating Activities
      { accountCode: '1301', category: 'operating', subcategory: 'wip' }, // Pekerjaan Dalam Proses (WIP)
      
      // Fixed Assets - Investing Activities
      { accountCode: '1501', category: 'investing', subcategory: 'fixed_asset' }, // Mesin Boring
      { accountCode: '1502', category: 'investing', subcategory: 'fixed_asset' }, // Mesin Sondir
      { accountCode: '1503', category: 'investing', subcategory: 'fixed_asset' }, // Kendaraan Operasional
      { accountCode: '1504', category: 'investing', subcategory: 'fixed_asset' }, // Peralatan Kantor
      { accountCode: '1505', category: 'investing', subcategory: 'fixed_asset' }, // Bangunan Kantor
      
      // Accumulated Depreciation - Investing Activities
      { accountCode: '1601', category: 'investing', subcategory: 'depreciation' }, // Akumulasi Penyusutan Mesin Boring
      { accountCode: '1602', category: 'investing', subcategory: 'depreciation' }, // Akumulasi Penyusutan Mesin Sondir
      { accountCode: '1603', category: 'investing', subcategory: 'depreciation' }, // Akumulasi Penyusutan Kendaraan
      { accountCode: '1604', category: 'investing', subcategory: 'depreciation' }, // Akumulasi Penyusutan Peralatan Kantor
      { accountCode: '1605', category: 'investing', subcategory: 'depreciation' }, // Akumulasi Penyusutan Bangunan
      
      // Short-term Liabilities - Operating Activities
      { accountCode: '2101', category: 'operating', subcategory: 'short_term_liability' }, // Hutang Bank Jangka Pendek
      { accountCode: '2102', category: 'operating', subcategory: 'short_term_liability' }, // Hutang Usaha
      { accountCode: '2103', category: 'operating', subcategory: 'short_term_liability' }, // Hutang Pajak
      { accountCode: '2104', category: 'operating', subcategory: 'short_term_liability' }, // Beban Yang Masih Harus Dibayar
      
      // Long-term Liabilities - Financing Activities
      { accountCode: '2201', category: 'financing', subcategory: 'long_term_liability' }, // Hutang Bank Jangka Panjang
      { accountCode: '2202', category: 'financing', subcategory: 'long_term_liability' }, // Hutang Leasing
      
      // Equity - Financing Activities
      { accountCode: '3101', category: 'financing', subcategory: 'equity' }, // Modal Saham
      { accountCode: '3102', category: 'financing', subcategory: 'equity' }, // Laba Ditahan
      
      // Revenue - Operating Activities
      { accountCode: '4001', category: 'operating', subcategory: 'revenue' }, // Pendapatan Jasa Boring
      { accountCode: '4002', category: 'operating', subcategory: 'revenue' }, // Pendapatan Jasa Sondir
      { accountCode: '4003', category: 'operating', subcategory: 'revenue' }, // Pendapatan Jasa Konsultasi
      
      // Project Expenses - Operating Activities
      { accountCode: '5101', category: 'operating', subcategory: 'project_expense' }, // Beban Proyek - Material
      { accountCode: '5102', category: 'operating', subcategory: 'project_expense' }, // Beban Proyek - Tenaga Kerja
      { accountCode: '5103', category: 'operating', subcategory: 'project_expense' }, // Beban Proyek - Sewa Peralatan
      { accountCode: '5104', category: 'operating', subcategory: 'project_expense' }, // Beban Proyek - Transportasi
      { accountCode: '5105', category: 'operating', subcategory: 'project_expense' }, // Beban Proyek - Lain-lain
      
      // Operational Expenses - Operating Activities
      { accountCode: '6101', category: 'operating', subcategory: 'operational_expense' }, // Beban Operasional Kantor
      { accountCode: '6102', category: 'operating', subcategory: 'operational_expense' }, // Beban Gaji & Tunjangan
      { accountCode: '6103', category: 'operating', subcategory: 'operational_expense' }, // Beban Listrik & Air
      { accountCode: '6104', category: 'operating', subcategory: 'operational_expense' }, // Beban Internet & Telekomunikasi
      { accountCode: '6105', category: 'operating', subcategory: 'operational_expense' }, // Beban Penyusutan
    ];
    
    // Create or update cashflow categories
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const category of cashflowCategories) {
      // Check if account code exists in Chart of Accounts
      const accountExists = accounts.some(account => account.code === category.accountCode);
      
      if (!accountExists) {
        console.log(`Skipping category for account code ${category.accountCode} - Account not found in COA`);
        skippedCount++;
        continue;
      }
      
      // Check if category already exists
      const existingCategory = await prisma.cashflow_category.findUnique({
        where: { accountCode: category.accountCode }
      });
      
      if (existingCategory) {
        // Update existing category
        await prisma.cashflow_category.update({
          where: { accountCode: category.accountCode },
          data: {
            category: category.category,
            subcategory: category.subcategory,
            updatedAt: new Date()
          }
        });
        updatedCount++;
      } else {
        // Create new category
        await prisma.cashflow_category.create({
          data: {
            accountCode: category.accountCode,
            category: category.category,
            subcategory: category.subcategory,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        createdCount++;
      }
    }
    
    console.log(`Setup complete: ${createdCount} categories created, ${updatedCount} updated, ${skippedCount} skipped`);
  } catch (error) {
    console.error('Error setting up cashflow categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup function
setupCashflowCategories()
  .then(() => console.log('Setup complete!'))
  .catch(error => console.error('Setup failed:', error)); 