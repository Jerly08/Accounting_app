const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script untuk menambahkan data liabilities (kewajiban) ke database
 * dan memastikan integrasi dengan Balance Sheet
 */
async function main() {
  try {
    console.log('Starting liability seeding process...');
    
    // 1. Pastikan akun-akun kewajiban sudah ada di Chart of Accounts
    const liabilityAccounts = [
      { code: '2101', name: 'Hutang Bank Jangka Pendek', type: 'Kewajiban', category: 'Hutang Lancar' },
      { code: '2102', name: 'Hutang Usaha', type: 'Kewajiban', category: 'Hutang Lancar' },
      { code: '2103', name: 'Hutang Pajak', type: 'Kewajiban', category: 'Hutang Lancar' },
      { code: '2104', name: 'Beban Yang Masih Harus Dibayar', type: 'Kewajiban', category: 'Hutang Lancar' },
      { code: '2201', name: 'Hutang Bank Jangka Panjang', type: 'Kewajiban', category: 'Hutang Jangka Panjang' },
      { code: '2202', name: 'Hutang Leasing', type: 'Kewajiban', category: 'Hutang Jangka Panjang' },
    ];
    
    // Periksa dan tambahkan akun-akun kewajiban jika belum ada
    for (const account of liabilityAccounts) {
      const existingAccount = await prisma.chartofaccount.findUnique({
        where: { code: account.code }
      });
      
      if (!existingAccount) {
        console.log(`Adding liability account: ${account.code} - ${account.name}`);
        
        // Tambahkan kategori cashflow terlebih dahulu
        await prisma.cashflow_category.create({
          data: {
            accountCode: account.code,
            category: account.code.startsWith('21') ? 'operating' : 'financing',
            subcategory: account.code.startsWith('21') ? 'current_liabilities' : 'long_term_debt',
            updatedAt: new Date()
          }
        });
        
        // Tambahkan akun ke chart of accounts
        await prisma.chartofaccount.create({
          data: {
            code: account.code,
            name: account.name,
            type: account.type,
            category: account.category,
            updatedAt: new Date()
          }
        });
      } else {
        console.log(`Liability account already exists: ${account.code} - ${existingAccount.name}`);
        
        // Update category jika perlu
        if (existingAccount.category !== account.category) {
          await prisma.chartofaccount.update({
            where: { code: account.code },
            data: { 
              category: account.category,
              updatedAt: new Date()
            }
          });
          console.log(`Updated category for account ${account.code} to ${account.category}`);
        }
        
        // Periksa dan update cashflow category jika perlu
        const existingCashflowCategory = await prisma.cashflow_category.findFirst({
          where: { accountCode: account.code }
        });
        
        if (existingCashflowCategory) {
          const expectedCategory = account.code.startsWith('21') ? 'operating' : 'financing';
          const expectedSubcategory = account.code.startsWith('21') ? 'current_liabilities' : 'long_term_debt';
          
          if (existingCashflowCategory.category !== expectedCategory || 
              existingCashflowCategory.subcategory !== expectedSubcategory) {
            await prisma.cashflow_category.update({
              where: { id: existingCashflowCategory.id },
              data: {
                category: expectedCategory,
                subcategory: expectedSubcategory,
                updatedAt: new Date()
              }
            });
            console.log(`Updated cashflow category for account ${account.code}`);
          }
        }
      }
    }
    
    // 2. Buat transaksi untuk hutang usaha (accounts payable)
    console.log('Creating accounts payable transactions...');
    
    // Periksa apakah transaksi sudah ada
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        accountCode: '2102',
        description: { contains: 'Hutang Usaha - Supplier Material' }
      }
    });
    
    if (!existingTransaction) {
      // Tanggal transaksi
      const transactionDate = new Date();
      transactionDate.setDate(transactionDate.getDate() - 15); // 15 hari yang lalu
      
      // Transaksi hutang usaha
      await prisma.transaction.create({
        data: {
          date: transactionDate,
          type: 'income', // Meningkatkan kewajiban
          accountCode: '2102', // Hutang Usaha
          description: 'Hutang Usaha - Supplier Material',
          amount: 45000000, // 45 juta
          projectId: null,
          notes: 'Pembelian material proyek secara kredit',
          updatedAt: new Date()
        }
      });
      
      // Transaksi counter untuk persediaan atau aset
      await prisma.transaction.create({
        data: {
          date: transactionDate,
          type: 'income', // Meningkatkan aset
          accountCode: '1301', // Pekerjaan Dalam Proses
          description: 'Pembelian Material Proyek',
          amount: 45000000, // 45 juta
          projectId: null,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
      
      console.log('Created accounts payable transactions');
    } else {
      console.log('Accounts payable transactions already exist, skipping creation');
    }
    
    // 3. Buat transaksi untuk hutang pajak
    console.log('Creating tax liability transactions...');
    
    const existingTaxTransaction = await prisma.transaction.findFirst({
      where: {
        accountCode: '2103',
        description: { contains: 'Hutang Pajak PPN' }
      }
    });
    
    if (!existingTaxTransaction) {
      // Tanggal transaksi
      const taxTransactionDate = new Date();
      taxTransactionDate.setDate(taxTransactionDate.getDate() - 10); // 10 hari yang lalu
      
      // Transaksi hutang pajak
      await prisma.transaction.create({
        data: {
          date: taxTransactionDate,
          type: 'income', // Meningkatkan kewajiban
          accountCode: '2103', // Hutang Pajak
          description: 'Hutang Pajak PPN',
          amount: 15000000, // 15 juta
          projectId: null,
          notes: 'PPN keluaran yang belum disetor',
          updatedAt: new Date()
        }
      });
      
      console.log('Created tax liability transactions');
    } else {
      console.log('Tax liability transactions already exist, skipping creation');
    }
    
    // 4. Buat transaksi untuk beban yang masih harus dibayar
    console.log('Creating accrued expenses transactions...');
    
    const existingAccruedExpense = await prisma.transaction.findFirst({
      where: {
        accountCode: '2104',
        description: { contains: 'Beban Gaji' }
      }
    });
    
    if (!existingAccruedExpense) {
      // Tanggal transaksi
      const accrualDate = new Date();
      accrualDate.setDate(accrualDate.getDate() - 5); // 5 hari yang lalu
      
      // Transaksi beban yang masih harus dibayar
      await prisma.transaction.create({
        data: {
          date: accrualDate,
          type: 'income', // Meningkatkan kewajiban
          accountCode: '2104', // Beban Yang Masih Harus Dibayar
          description: 'Beban Gaji Yang Masih Harus Dibayar',
          amount: 22500000, // 22.5 juta
          projectId: null,
          notes: 'Akrual gaji karyawan akhir bulan',
          updatedAt: new Date()
        }
      });
      
      // Transaksi counter untuk beban
      await prisma.transaction.create({
        data: {
          date: accrualDate,
          type: 'expense', // Meningkatkan beban
          accountCode: '6102', // Beban Gaji & Tunjangan
          description: 'Beban Gaji & Tunjangan',
          amount: 22500000, // 22.5 juta
          projectId: null,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
      
      console.log('Created accrued expenses transactions');
    } else {
      console.log('Accrued expenses transactions already exist, skipping creation');
    }
    
    // 5. Pastikan transaksi hutang bank jangka panjang sudah ada
    // (Transaksi ini sudah dibuat di cashflow-seed.js)
    const existingLoanTransaction = await prisma.transaction.findFirst({
      where: {
        accountCode: '2201',
        description: { contains: 'Penerimaan Pinjaman Bank' }
      }
    });
    
    if (!existingLoanTransaction) {
      console.log('No long-term loan transactions found. Creating sample transaction...');
      
      // Tanggal transaksi
      const loanDate = new Date();
      loanDate.setMonth(loanDate.getMonth() - 1); // 1 bulan yang lalu
      
      // Transaksi penerimaan pinjaman
      await prisma.transaction.create({
        data: {
          date: loanDate,
          type: 'income', // Meningkatkan kewajiban
          accountCode: '2201', // Hutang Bank Jangka Panjang
          description: 'Penerimaan Pinjaman Bank',
          amount: 200000000, // 200 juta
          projectId: null,
          notes: 'Pinjaman untuk ekspansi usaha',
          updatedAt: new Date()
        }
      });
      
      // Transaksi counter untuk kas/bank
      await prisma.transaction.create({
        data: {
          date: loanDate,
          type: 'income', // Meningkatkan aset
          accountCode: '1102', // Bank BCA
          description: 'Penerimaan Dana Pinjaman Bank',
          amount: 200000000, // 200 juta
          projectId: null,
          notes: 'Counter transaction',
          updatedAt: new Date()
        }
      });
      
      console.log('Created long-term loan transactions');
    } else {
      console.log('Long-term loan transactions already exist');
    }
    
    console.log('Liability seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding liability data:', error);
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