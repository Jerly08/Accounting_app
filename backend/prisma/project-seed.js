const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data untuk 10 proyek yang terhubung dengan client dan COA
// Projects akan diperbarui dengan client ID yang benar setelah kita mengambil data client
const projectTemplates = [
  {
    projectCode: 'BOR-2024-001',
    name: 'Boring Test Gedung Perkantoran CBD Jakarta',
    description: 'Pengujian tanah untuk konstruksi gedung perkantoran 30 lantai di area CBD Jakarta',
    clientName: 'PT Pembangunan Jaya',
    startDate: new Date('2024-01-10'),
    endDate: new Date('2024-03-15'),
    totalValue: 450000000,
    status: 'completed',
    progress: 100.00
  },
  {
    projectCode: 'SON-2024-002',
    name: 'Sondir Perumahan Grand Residence Phase 2',
    description: 'Pengujian sondir untuk proyek perumahan mewah di kawasan Serpong',
    clientName: 'PT Konstruksi Maju Bersama',
    startDate: new Date('2024-02-05'),
    endDate: new Date('2024-04-20'),
    totalValue: 380000000,
    status: 'completed',
    progress: 100.00
  },
  {
    projectCode: 'BOR-2024-003',
    name: 'Boring & Sondir Jembatan Cisadane Extension',
    description: 'Pengujian tanah untuk perpanjangan jembatan Cisadane di Tangerang',
    clientName: 'Dinas PU Kota Surabaya',
    startDate: new Date('2024-03-01'),
    endDate: null,
    totalValue: 525000000,
    status: 'ongoing',
    progress: 75.50
  },
  {
    projectCode: 'BOR-2024-004',
    name: 'Boring Test Mall Central Park Extension',
    description: 'Boring test untuk perluasan mall Central Park di Jakarta Barat',
    clientName: 'PT Graha Properti Indonesia',
    startDate: new Date('2024-03-15'),
    endDate: null,
    totalValue: 410000000,
    status: 'ongoing',
    progress: 60.25
  },
  {
    projectCode: 'SON-2024-005',
    name: 'Sondir Apartemen Green Residence',
    description: 'Pengujian sondir untuk proyek apartemen 25 lantai di Bekasi',
    clientName: 'PT Ciputra Development Tbk',
    startDate: new Date('2024-04-01'),
    endDate: null,
    totalValue: 385000000,
    status: 'ongoing',
    progress: 45.75
  },
  {
    projectCode: 'BOR-2024-006',
    name: 'Boring Test Pabrik Semen Gresik',
    description: 'Pengujian tanah untuk ekspansi pabrik semen di Gresik',
    clientName: 'PT Semen Indonesia (Persero) Tbk',
    startDate: new Date('2024-04-15'),
    endDate: null,
    totalValue: 560000000,
    status: 'ongoing',
    progress: 30.00
  },
  {
    projectCode: 'SON-2024-007',
    name: 'Sondir Jalan Tol Cikampek-Purwakarta',
    description: 'Pengujian sondir untuk pembangunan jalan tol Cikampek-Purwakarta',
    clientName: 'PT Jasa Marga (Persero) Tbk',
    startDate: new Date('2024-05-01'),
    endDate: null,
    totalValue: 675000000,
    status: 'ongoing',
    progress: 25.50
  },
  {
    projectCode: 'BOR-2024-008',
    name: 'Boring Test Gedung RSUD Bandung',
    description: 'Pengujian tanah untuk gedung baru RSUD Bandung',
    clientName: 'Dinas PUPR Provinsi Jawa Barat',
    startDate: new Date('2024-05-15'),
    endDate: null,
    totalValue: 495000000,
    status: 'ongoing',
    progress: 20.00
  },
  {
    projectCode: 'SON-2024-009',
    name: 'Sondir Perumahan Podomoro City',
    description: 'Pengujian sondir untuk proyek perumahan Podomoro City',
    clientName: 'PT Agung Podomoro Land Tbk',
    startDate: new Date('2024-06-01'),
    endDate: null,
    totalValue: 320000000,
    status: 'ongoing',
    progress: 15.75
  },
  {
    projectCode: 'BOR-2024-010',
    name: 'Boring & Sondir Pembangkit Listrik Suralaya',
    description: 'Pengujian tanah untuk perluasan pembangkit listrik di Suralaya',
    clientName: 'PT PLN (Persero)',
    startDate: new Date('2024-06-15'),
    endDate: null,
    totalValue: 750000000,
    status: 'ongoing',
    progress: 10.25
  }
];

// Data untuk contoh transaksi proyek
const generateProjectTransactions = (projectId, projectCode, totalValue, progress) => {
  // Transaksi dibuat berdasarkan status progress proyek
  const transactions = [];
  const isCompleted = progress >= 100;
  
  // Pendapatan (Revenue)
  if (progress >= 30) {
    // Jika progress 30% atau lebih, tambahkan pendapatan (pembayaran pertama)
    transactions.push({
      projectId,
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 hari yang lalu
      type: 'Pendapatan',
      accountCode: '4001', // Pendapatan Jasa Boring
      description: `Pendapatan Tahap 1 - ${projectCode}`,
      amount: totalValue * 0.3, // 30% dari nilai total
      notes: 'Pembayaran termin pertama'
    });
  }
  
  if (progress >= 60) {
    // Jika progress 60% atau lebih, tambahkan pendapatan (pembayaran kedua)
    transactions.push({
      projectId,
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 hari yang lalu
      type: 'Pendapatan',
      accountCode: '4001', // Pendapatan Jasa Boring
      description: `Pendapatan Tahap 2 - ${projectCode}`,
      amount: totalValue * 0.3, // 30% dari nilai total
      notes: 'Pembayaran termin kedua'
    });
  }
  
  if (isCompleted) {
    // Jika proyek selesai, tambahkan pendapatan akhir
    transactions.push({
      projectId,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 hari yang lalu
      type: 'Pendapatan',
      accountCode: '4001', // Pendapatan Jasa Boring
      description: `Pendapatan Tahap Akhir - ${projectCode}`,
      amount: totalValue * 0.4, // 40% dari nilai total
      notes: 'Pembayaran termin akhir'
    });
  }
  
  // Beban (Expense)
  // Beban Material
  transactions.push({
    projectId,
    date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 hari yang lalu
    type: 'Beban',
    accountCode: '5101', // Beban Proyek - Material
    description: `Pembelian Material - ${projectCode}`,
    amount: totalValue * 0.2, // 20% dari nilai total
    notes: 'Pembelian material proyek'
  });
  
  // Beban Tenaga Kerja
  transactions.push({
    projectId,
    date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 hari yang lalu
    type: 'Beban',
    accountCode: '5102', // Beban Proyek - Tenaga Kerja
    description: `Upah Tenaga Kerja - ${projectCode}`,
    amount: totalValue * 0.15, // 15% dari nilai total
    notes: 'Pembayaran upah pekerja proyek'
  });
  
  // Beban Sewa Peralatan
  transactions.push({
    projectId,
    date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 hari yang lalu
    type: 'Beban',
    accountCode: '5103', // Beban Proyek - Sewa Peralatan
    description: `Sewa Peralatan - ${projectCode}`,
    amount: totalValue * 0.1, // 10% dari nilai total
    notes: 'Sewa peralatan boring dan sondir'
  });
  
  // Beban Transportasi
  transactions.push({
    projectId,
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 hari yang lalu
    type: 'Beban',
    accountCode: '5104', // Beban Proyek - Transportasi
    description: `Transportasi - ${projectCode}`,
    amount: totalValue * 0.05, // 5% dari nilai total
    notes: 'Biaya transportasi peralatan dan personel'
  });
  
  return transactions;
};

async function main() {
  console.log(`Start seeding projects...`);
  
  // Dapatkan data client yang ada
  const clients = await prisma.client.findMany();
  console.log(`Found ${clients.length} existing clients`);
  
  // Buat mapping nama client ke ID client
  const clientMap = {};
  clients.forEach(client => {
    clientMap[client.name] = client.id;
  });
  
  console.log("Client mapping:", clientMap);
  
  // Dapatkan data proyek yang sudah ada
  const existingProjects = await prisma.project.findMany();
  console.log(`Found ${existingProjects.length} existing projects`);
  
  // Kumpulkan kode-kode proyek yang sudah ada
  const existingProjectCodes = existingProjects.map(project => project.projectCode);
  
  // Konversi template proyek menjadi data proyek dengan client ID yang valid
  const projects = [];
  for (const template of projectTemplates) {
    const clientId = clientMap[template.clientName];
    if (!clientId) {
      console.log(`Warning: Client "${template.clientName}" not found in database, skipping project ${template.projectCode}`);
      continue;
    }
    
    projects.push({
      ...template,
      clientId
    });
  }
  
  console.log(`Prepared ${projects.length} projects with valid client IDs`);
  
  // Array untuk menyimpan transaksi yang akan dibuat
  let transactionsToCreate = [];
  
  // Iterasi untuk setiap proyek dalam data
  for (const projectData of projects) {
    try {
      // Cek apakah proyek sudah ada (berdasarkan kode)
      if (existingProjectCodes.includes(projectData.projectCode)) {
        console.log(`Project with code ${projectData.projectCode} already exists, skipping.`);
        continue;
      }
      
      // Hapus properti clientName yang tidak diperlukan
      const { clientName, ...dataToCreate } = projectData;
      
      // Tambahkan tanggal updatedAt
      const dataWithDate = {
        ...dataToCreate,
        updatedAt: new Date()
      };
      
      // Buat proyek baru
      const newProject = await prisma.project.create({
        data: dataWithDate
      });
      console.log(`Created project with ID: ${newProject.id} - ${newProject.name}`);
      
      // Generate transaksi untuk proyek ini
      const projectTransactions = generateProjectTransactions(
        newProject.id,
        newProject.projectCode,
        parseFloat(newProject.totalValue),
        parseFloat(newProject.progress)
      );
      
      // Tambahkan ke array transaksi
      transactionsToCreate = [...transactionsToCreate, ...projectTransactions];
    } catch (error) {
      console.error(`Error processing project ${projectData.projectCode}:`, error);
    }
  }
  
  // Buat transaksi
  console.log(`Creating ${transactionsToCreate.length} transactions...`);
  for (const transactionData of transactionsToCreate) {
    try {
      // Tambahkan tanggal updatedAt
      const dataWithDate = {
        ...transactionData,
        updatedAt: new Date()
      };
      
      const newTransaction = await prisma.transaction.create({
        data: dataWithDate
      });
      console.log(`Created transaction for project ID ${newTransaction.projectId}: ${newTransaction.description}`);
    } catch (error) {
      console.error(`Error creating transaction:`, error);
    }
  }
  
  console.log(`Seeding projects completed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 