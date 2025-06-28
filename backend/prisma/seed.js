const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

// Buat instance PrismaClient baru langsung di sini
const prisma = new PrismaClient({
  log: ['error', 'warn', 'info', 'query'],
});

// Data Settings
const settings = {
  companyName: "PT. Boring & Sondir Indonesia",
  companyAddress: "Jl. Teknik Sipil No. 123, Jakarta Selatan 12960",
  companyPhone: "021-12345678",
  companyEmail: "info@boringsondir.id",
  taxNumber: "123.456.789.0-000.000",
  currency: "IDR",
  currencySymbol: "Rp",
  invoicePrefix: "INV",
  projectPrefix: "PRJ",
  fiscalYearStart: "01-01",
  vatRate: 11,
  defaultPaymentTerms: 30,
  reminderDays: 7,
  boringDefaultRate: 3500000,
  sondirDefaultRate: 2000000,
  enableUserRoles: true,
  allowClientPortal: false,
  enableTwoFactor: false,
  enableAutomaticBackup: true,
  backupFrequency: "daily",
};

// Data Chart of Accounts
const chartOfAccounts = [
  // Pendapatan
  { code: '4001', name: 'Pendapatan Jasa Boring', type: 'Pendapatan' },
  { code: '4002', name: 'Pendapatan Jasa Sondir', type: 'Pendapatan' },
  { code: '4003', name: 'Pendapatan Jasa Konsultasi', type: 'Pendapatan' },
  
  // Beban
  { code: '5101', name: 'Beban Proyek - Material', type: 'Beban' },
  { code: '5102', name: 'Beban Proyek - Tenaga Kerja', type: 'Beban' },
  { code: '5103', name: 'Beban Proyek - Sewa Peralatan', type: 'Beban' },
  { code: '5104', name: 'Beban Proyek - Transportasi', type: 'Beban' },
  { code: '5105', name: 'Beban Proyek - Lain-lain', type: 'Beban' },
  { code: '6101', name: 'Beban Operasional Kantor', type: 'Beban' },
  { code: '6102', name: 'Beban Gaji & Tunjangan', type: 'Beban' },
  { code: '6103', name: 'Beban Listrik & Air', type: 'Beban' },
  { code: '6104', name: 'Beban Internet & Telekomunikasi', type: 'Beban' },
  { code: '6105', name: 'Beban Penyusutan', type: 'Beban' },
  
  // Aktiva
  { code: '1201', name: 'Piutang Usaha', type: 'Aktiva' },
  { code: '1101', name: 'Kas', type: 'Aktiva' },
  { code: '1102', name: 'Bank BCA', type: 'Aktiva' },
  { code: '1103', name: 'Bank Mandiri', type: 'Aktiva' },
  { code: '1301', name: 'Pekerjaan Dalam Proses (WIP)', type: 'Aktiva' },
  
  // Aset Tetap
  { code: '1501', name: 'Mesin Boring', type: 'Aset Tetap' },
  { code: '1502', name: 'Mesin Sondir', type: 'Aset Tetap' },
  { code: '1503', name: 'Kendaraan Operasional', type: 'Aset Tetap' },
  { code: '1504', name: 'Peralatan Kantor', type: 'Aset Tetap' },
  { code: '1505', name: 'Bangunan Kantor', type: 'Aset Tetap' },
  
  // Kontra Aset
  { code: '1601', name: 'Akumulasi Penyusutan Mesin Boring', type: 'Kontra Aset' },
  { code: '1602', name: 'Akumulasi Penyusutan Mesin Sondir', type: 'Kontra Aset' },
  { code: '1603', name: 'Akumulasi Penyusutan Kendaraan', type: 'Kontra Aset' },
  { code: '1604', name: 'Akumulasi Penyusutan Peralatan Kantor', type: 'Kontra Aset' },
  { code: '1605', name: 'Akumulasi Penyusutan Bangunan', type: 'Kontra Aset' },
];

// Data Clients
const clients = [
  {
    name: 'PT Pembangunan Jaya',
    phone: '021-5551234',
    email: 'contact@pembangunanjaya.com',
    address: 'Jl. Gatot Subroto No. 123, Jakarta Selatan'
  },
  {
    name: 'PT Konstruksi Maju Bersama',
    phone: '021-6667890',
    email: 'info@kmb-konstruksi.co.id',
    address: 'Jl. Sudirman Kav. 45, Jakarta Pusat'
  },
  {
    name: 'PT Karya Bangun Sejahtera',
    phone: '022-4445678',
    email: 'kbs@karyabangun.com',
    address: 'Jl. Asia Afrika No. 78, Bandung'
  },
  {
    name: 'Dinas PU Kota Surabaya',
    phone: '031-3334455',
    email: 'dpu@surabaya.go.id',
    address: 'Jl. Jimerto No. 25-27, Surabaya'
  },
  {
    name: 'PT Graha Properti Indonesia',
    phone: '021-7778899',
    email: 'contact@gpi.co.id',
    address: 'Jl. TB Simatupang No. 45, Jakarta Selatan'
  }
];

// Data Projects
const projects = [
  {
    projectCode: 'BOR-2023-001',
    name: 'Boring Test Gedung Perkantoran CBD',
    clientId: 1, // PT Pembangunan Jaya
    startDate: new Date('2023-02-15'),
    endDate: new Date('2023-04-30'),
    totalValue: 175000000,
    status: 'completed'
  },
  {
    projectCode: 'SON-2023-002',
    name: 'Sondir Apartemen Grand Residence',
    clientId: 2, // PT Konstruksi Maju Bersama
    startDate: new Date('2023-03-10'),
    endDate: new Date('2023-05-20'),
    totalValue: 225000000,
    status: 'completed'
  },
  {
    projectCode: 'BOR-2023-003',
    name: 'Boring & Sondir Jembatan Cisadane',
    clientId: 4, // Dinas PU Kota Surabaya
    startDate: new Date('2023-06-01'),
    endDate: new Date('2023-08-15'),
    totalValue: 350000000,
    status: 'completed'
  },
  {
    projectCode: 'BOR-2023-004',
    name: 'Boring Test Mall Central Park',
    clientId: 5, // PT Graha Properti Indonesia
    startDate: new Date('2023-09-01'),
    endDate: null,
    totalValue: 275000000,
    status: 'ongoing'
  },
  {
    projectCode: 'SON-2023-005',
    name: 'Sondir Perumahan Green Valley',
    clientId: 3, // PT Karya Bangun Sejahtera
    startDate: new Date('2023-10-15'),
    endDate: null,
    totalValue: 185000000,
    status: 'ongoing'
  },
  {
    projectCode: 'BOR-2024-001',
    name: 'Boring & Sondir Gedung RSUD',
    clientId: 4, // Dinas PU Kota Surabaya
    startDate: new Date('2024-01-10'),
    endDate: null,
    totalValue: 320000000,
    status: 'ongoing'
  }
];

// Data Project Costs
const generateProjectCosts = (projects) => {
  const costs = [];
  const categories = ['material', 'labor', 'equipment', 'transportation', 'other'];
  const statusOptions = ['approved', 'pending', 'approved'];
  
  projects.forEach(project => {
    // Jumlah biaya bervariasi per proyek
    const numCosts = project.status === 'completed' ? 8 : 4;
    
    for (let i = 0; i < numCosts; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      let description = '';
      let amount = 0;
      
      switch (category) {
        case 'material':
          description = ['Pembelian Bahan Boring', 'Material Sondir', 'Semen dan Agregat', 'Pipa PVC'][Math.floor(Math.random() * 4)];
          amount = Math.floor(Math.random() * 20000000) + 5000000;
          break;
        case 'labor':
          description = ['Upah Pekerja Lapangan', 'Honor Tim Surveyor', 'Gaji Operator Alat', 'Upah Lembur'][Math.floor(Math.random() * 4)];
          amount = Math.floor(Math.random() * 15000000) + 8000000;
          break;
        case 'equipment':
          description = ['Sewa Alat Berat', 'Sewa Generator', 'Perawatan Mesin Boring', 'Sewa Pompa Air'][Math.floor(Math.random() * 4)];
          amount = Math.floor(Math.random() * 25000000) + 10000000;
          break;
        case 'transportation':
          description = ['Transportasi Alat ke Lokasi', 'BBM Operasional', 'Sewa Truk Pengangkut', 'Biaya Pengiriman Material'][Math.floor(Math.random() * 4)];
          amount = Math.floor(Math.random() * 8000000) + 3000000;
          break;
        default:
          description = ['Perizinan', 'Konsumsi Tim', 'Akomodasi', 'Biaya Tak Terduga'][Math.floor(Math.random() * 4)];
          amount = Math.floor(Math.random() * 5000000) + 2000000;
      }
      
      // Tanggal biaya
      const projectStartDate = new Date(project.startDate);
      const dayOffset = Math.floor(Math.random() * 30) + 1;
      const costDate = new Date(projectStartDate);
      costDate.setDate(costDate.getDate() + dayOffset);
      
      // Status biaya
      const status = project.status === 'completed' ? 'approved' : statusOptions[Math.floor(Math.random() * statusOptions.length)];
      
      costs.push({
        projectId: project.id,
        category,
        description,
        amount,
        date: costDate,
        status
      });
    }
  });
  
  return costs;
};

// Data Billings
const generateBillings = (projects) => {
  const billings = [];
  const statusOptions = ['paid', 'unpaid', 'partially_paid'];
  
  projects.forEach(project => {
    // Jumlah penagihan bervariasi berdasarkan status proyek
    const numBillings = project.status === 'completed' ? 3 : (project.status === 'ongoing' ? 2 : 1);
    const percentagePerBilling = 100 / numBillings;
    
    for (let i = 0; i < numBillings; i++) {
      // Untuk proyek yang sedang berlangsung, tagihan terakhir mungkin belum dibayar
      const status = project.status === 'completed' ? 'paid' : 
                    (i === numBillings - 1 ? statusOptions[Math.floor(Math.random() * 2) + 1] : 'paid');
      
      // Tanggal penagihan
      const projectStartDate = new Date(project.startDate);
      const dayOffset = Math.floor(Math.random() * 30) + (30 * i); // Setiap 30 hari
      const billingDate = new Date(projectStartDate);
      billingDate.setDate(billingDate.getDate() + dayOffset);
      
      // Jumlah penagihan
      const percentage = i === numBillings - 1 ? 
                        (100 - (percentagePerBilling * (numBillings - 1))) : 
                        percentagePerBilling;
      const amount = (project.totalValue * percentage) / 100;
      
      billings.push({
        projectId: project.id,
        billingDate,
        percentage,
        amount,
        status
      });
    }
  });
  
  return billings;
};

// Data Fixed Assets
const fixedAssets = [
  {
    assetName: 'Mesin Boring Tipe XL-500',
    acquisitionDate: new Date('2022-03-15'),
    value: 450000000,
    usefulLife: 10,
    accumulatedDepreciation: 67500000,
    bookValue: 382500000
  },
  {
    assetName: 'Mesin Sondir Hidrolik',
    acquisitionDate: new Date('2022-05-20'),
    value: 375000000,
    usefulLife: 8,
    accumulatedDepreciation: 46875000,
    bookValue: 328125000
  },
  {
    assetName: 'Kendaraan Operasional - Toyota Hilux',
    acquisitionDate: new Date('2021-11-10'),
    value: 320000000,
    usefulLife: 5,
    accumulatedDepreciation: 96000000,
    bookValue: 224000000
  },
  {
    assetName: 'Peralatan Kantor (Komputer & Furnitur)',
    acquisitionDate: new Date('2022-01-05'),
    value: 85000000,
    usefulLife: 4,
    accumulatedDepreciation: 31875000,
    bookValue: 53125000
  },
  {
    assetName: 'Alat Ukur Digital',
    acquisitionDate: new Date('2023-02-28'),
    value: 125000000,
    usefulLife: 5,
    accumulatedDepreciation: 20833333,
    bookValue: 104166667
  }
];

// Data Transactions
const generateTransactions = (projects, billings, costs) => {
  const transactions = [];
  
  // Transaksi dari penagihan (income)
  billings.forEach(billing => {
    if (billing.status === 'paid' || billing.status === 'partially_paid') {
      const project = projects.find(p => p.id === billing.projectId);
      const amount = billing.status === 'paid' ? billing.amount : billing.amount * 0.5;
      
      transactions.push({
        date: new Date(billing.billingDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 hari setelah penagihan
        type: 'income',
        accountCode: Math.random() > 0.5 ? '4001' : '4002', // Pendapatan Jasa Boring atau Sondir
        description: `Pembayaran Invoice ${project.projectCode} - ${project.name}`,
        amount,
        projectId: project.id
      });
      
      // Transaksi kas/bank
      transactions.push({
        date: new Date(billing.billingDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        type: 'income',
        accountCode: Math.random() > 0.3 ? '1102' : '1101', // Bank atau Kas
        description: `Penerimaan Pembayaran ${project.projectCode}`,
        amount,
        projectId: project.id
      });
    }
  });
  
  // Transaksi dari biaya proyek (expense)
  costs.forEach(cost => {
    if (cost.status === 'approved') {
      const project = projects.find(p => p.id === cost.projectId);
      
      // Akun beban berdasarkan kategori
      let accountCode;
      switch (cost.category) {
        case 'material':
          accountCode = '5101';
          break;
        case 'labor':
          accountCode = '5102';
          break;
        case 'equipment':
          accountCode = '5103';
          break;
        case 'transportation':
          accountCode = '5104';
          break;
        default:
          accountCode = '5105';
      }
      
      transactions.push({
        date: cost.date,
        type: 'expense',
        accountCode,
        description: `${cost.description} - ${project.projectCode}`,
        amount: cost.amount,
        projectId: project.id
      });
      
      // Transaksi kas/bank
      transactions.push({
        date: cost.date,
        type: 'expense',
        accountCode: Math.random() > 0.3 ? '1102' : '1101', // Bank atau Kas
        description: `Pembayaran ${cost.description} - ${project.projectCode}`,
        amount: cost.amount,
        projectId: project.id
      });
    }
  });
  
  // Transaksi operasional (non-proyek)
  const operationalExpenses = [
    {
      description: 'Pembayaran Gaji Karyawan',
      accountCode: '6102',
      amount: 45000000,
      date: new Date('2023-03-28')
    },
    {
      description: 'Pembayaran Listrik & Air',
      accountCode: '6103',
      amount: 3500000,
      date: new Date('2023-03-15')
    },
    {
      description: 'Pembayaran Internet & Telepon',
      accountCode: '6104',
      amount: 2800000,
      date: new Date('2023-03-20')
    },
    {
      description: 'Biaya Operasional Kantor',
      accountCode: '6101',
      amount: 5200000,
      date: new Date('2023-03-10')
    },
    {
      description: 'Pembayaran Gaji Karyawan',
      accountCode: '6102',
      amount: 45000000,
      date: new Date('2023-04-28')
    },
    {
      description: 'Pembayaran Listrik & Air',
      accountCode: '6103',
      amount: 3200000,
      date: new Date('2023-04-15')
    }
  ];
  
  operationalExpenses.forEach(expense => {
    transactions.push({
      date: expense.date,
      type: 'expense',
      accountCode: expense.accountCode,
      description: expense.description,
      amount: expense.amount,
      projectId: null
    });
    
    transactions.push({
      date: expense.date,
      type: 'expense',
      accountCode: '1102', // Bank BCA
      description: `Pembayaran untuk ${expense.description}`,
      amount: expense.amount,
      projectId: null
    });
  });
  
  return transactions;
};

async function main() {
  console.log('Seeding database...');
  
  try {
    // Cek tabel yang ada di database
    console.log('Checking database tables...');
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log('Tables in database:', tables);
    
    // Seed Settings
    console.log('Seeding Settings...');
    const existingSetting = await prisma.setting.findFirst();
    
    if (!existingSetting) {
      await prisma.setting.create({
        data: settings
      });
      console.log('Application settings created.');
    } else {
      await prisma.setting.update({
        where: { id: existingSetting.id },
        data: settings
      });
      console.log('Application settings updated.');
    }
    
    try {
      // Seed Chart of Accounts
      console.log('Seeding Chart of Accounts...');
      // Menggunakan queryRaw untuk insert langsung ke tabel chartofaccount
      for (const account of chartOfAccounts) {
        // Cek apakah akun sudah ada
        const existingAccounts = await prisma.$queryRaw`
          SELECT * FROM chartofaccount WHERE code = ${account.code}
        `;
        
        if (existingAccounts.length === 0) {
          // Jika belum ada, buat baru
          await prisma.$executeRaw`
            INSERT INTO chartofaccount (code, name, type, createdAt, updatedAt)
            VALUES (${account.code}, ${account.name}, ${account.type}, NOW(), NOW())
          `;
        }
      }
      console.log(`${chartOfAccounts.length} accounts processed.`);
    } catch (error) {
      console.error('Error seeding Chart of Accounts:', error);
      throw error;
    }

    try {
      // Create users
      console.log('Creating users...');
      // Menggunakan queryRaw untuk insert langsung ke tabel user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Cek apakah user admin sudah ada
      const existingAdmins = await prisma.$queryRaw`
        SELECT * FROM user WHERE email = 'admin@example.com'
      `;
      
      if (existingAdmins.length === 0) {
        // Jika belum ada, buat baru
        await prisma.$executeRaw`
          INSERT INTO user (username, email, password, name, role, createdAt, updatedAt)
          VALUES ('admin', 'admin@example.com', ${hashedPassword}, 'Administrator', 'admin', NOW(), NOW())
        `;
      }
      
      // Create regular user
      const userPassword = await bcrypt.hash('user123', 10);
      
      // Cek apakah user regular sudah ada
      const existingUsers = await prisma.$queryRaw`
        SELECT * FROM user WHERE email = 'user@example.com'
      `;
      
      if (existingUsers.length === 0) {
        // Jika belum ada, buat baru
        await prisma.$executeRaw`
          INSERT INTO user (username, email, password, name, role, createdAt, updatedAt)
          VALUES ('user', 'user@example.com', ${userPassword}, 'Regular User', 'user', NOW(), NOW())
        `;
      }
      
      console.log('Users created.');
    } catch (error) {
      console.error('Error creating users:', error);
      throw error;
    }
    
    try {
      // Seed Clients
      console.log('Seeding Clients...');
      for (const client of clients) {
        const index = clients.indexOf(client) + 1;
        
        // Cek apakah client sudah ada
        const existingClients = await prisma.$queryRaw`
          SELECT * FROM client WHERE id = ${index}
        `;
        
        if (existingClients.length === 0) {
          // Jika belum ada, buat baru
          await prisma.$executeRaw`
            INSERT INTO client (id, name, phone, email, address, createdAt, updatedAt)
            VALUES (${index}, ${client.name}, ${client.phone}, ${client.email}, ${client.address}, NOW(), NOW())
          `;
        }
      }
      console.log(`${clients.length} clients processed.`);
    } catch (error) {
      console.error('Error seeding clients:', error);
      throw error;
    }
    
    try {
      // Seed Projects
      console.log('Seeding Projects...');
      for (const project of projects) {
        // Cek apakah project sudah ada
        const existingProjects = await prisma.$queryRaw`
          SELECT * FROM project WHERE projectCode = ${project.projectCode}
        `;
        
        if (existingProjects.length === 0) {
          // Format tanggal untuk SQL
          const startDate = project.startDate.toISOString().slice(0, 19).replace('T', ' ');
          const endDate = project.endDate ? project.endDate.toISOString().slice(0, 19).replace('T', ' ') : null;
          
          // Jika belum ada, buat baru
          if (endDate) {
            await prisma.$executeRaw`
              INSERT INTO project (projectCode, name, clientId, startDate, endDate, totalValue, status, createdAt, updatedAt)
              VALUES (${project.projectCode}, ${project.name}, ${project.clientId}, ${startDate}, ${endDate}, ${project.totalValue}, ${project.status}, NOW(), NOW())
            `;
          } else {
            await prisma.$executeRaw`
              INSERT INTO project (projectCode, name, clientId, startDate, totalValue, status, createdAt, updatedAt)
              VALUES (${project.projectCode}, ${project.name}, ${project.clientId}, ${startDate}, ${project.totalValue}, ${project.status}, NOW(), NOW())
            `;
          }
        }
      }
      console.log(`${projects.length} projects processed.`);
      
      // Get created projects with IDs
      const createdProjects = await prisma.$queryRaw`SELECT * FROM project`;
      
      // Seed Project Costs - Lewati dulu untuk sementara
      console.log('Skipping Project Costs for now...');
      
      // Seed Billings - Lewati dulu untuk sementara
      console.log('Skipping Billings for now...');
    } catch (error) {
      console.error('Error seeding projects:', error);
      throw error;
    }
    
    try {
      // Seed Fixed Assets
      console.log('Seeding Fixed Assets...');
      // Kita akan menggunakan script terpisah untuk seed fixed assets
      console.log('Fixed assets will be seeded using separate script: npm run seed:fixedassets');
    } catch (error) {
      console.error('Error seeding fixed assets:', error);
      throw error;
    }
    
    // Skipping Transactions
    console.log('Skipping Transactions for now...');
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Seeding failed with error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 