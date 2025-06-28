const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fungsi untuk menghasilkan data penagihan (billing) berdasarkan proyek
const generateBillings = (project) => {
  const billings = [];
  const { id, projectCode, totalValue, startDate, status, progress } = project;
  
  // Logika penagihan berdasarkan status dan progress proyek
  if (status === 'completed') {
    // Untuk proyek yang sudah selesai, buat 3 penagihan (100%)
    
    // Penagihan pertama (30%)
    const firstBillingDate = new Date(startDate);
    firstBillingDate.setDate(firstBillingDate.getDate() + 14); // 14 hari setelah mulai
    
    billings.push({
      projectId: id,
      billingDate: firstBillingDate,
      percentage: 30.00,
      amount: totalValue * 0.3,
      status: 'paid',
      invoice: `INV-${projectCode}-001`,
      updatedAt: new Date()
    });
    
    // Penagihan kedua (30%)
    const secondBillingDate = new Date(startDate);
    secondBillingDate.setDate(secondBillingDate.getDate() + 45); // 45 hari setelah mulai
    
    billings.push({
      projectId: id,
      billingDate: secondBillingDate,
      percentage: 30.00,
      amount: totalValue * 0.3,
      status: 'paid',
      invoice: `INV-${projectCode}-002`,
      updatedAt: new Date()
    });
    
    // Penagihan ketiga (40%)
    const thirdBillingDate = new Date(startDate);
    thirdBillingDate.setDate(thirdBillingDate.getDate() + 75); // 75 hari setelah mulai
    
    billings.push({
      projectId: id,
      billingDate: thirdBillingDate,
      percentage: 40.00,
      amount: totalValue * 0.4,
      status: 'paid',
      invoice: `INV-${projectCode}-003`,
      updatedAt: new Date()
    });
  } 
  else if (status === 'ongoing') {
    // Untuk proyek yang sedang berjalan, buat penagihan berdasarkan progress
    
    if (progress >= 30) {
      // Penagihan pertama jika progress minimal 30%
      const firstBillingDate = new Date(startDate);
      firstBillingDate.setDate(firstBillingDate.getDate() + 14); // 14 hari setelah mulai
      
      billings.push({
        projectId: id,
        billingDate: firstBillingDate,
        percentage: 30.00,
        amount: totalValue * 0.3,
        status: 'paid', // Sudah dibayar karena progress sudah melewati 30%
        invoice: `INV-${projectCode}-001`,
        updatedAt: new Date()
      });
    }
    
    if (progress >= 60) {
      // Penagihan kedua jika progress minimal 60%
      const secondBillingDate = new Date(startDate);
      secondBillingDate.setDate(secondBillingDate.getDate() + 45); // 45 hari setelah mulai
      
      billings.push({
        projectId: id,
        billingDate: secondBillingDate,
        percentage: 30.00,
        amount: totalValue * 0.3,
        status: 'paid', // Sudah dibayar karena progress sudah melewati 60%
        invoice: `INV-${projectCode}-002`,
        updatedAt: new Date()
      });
    }
    
    if (progress >= 90 && progress < 100) {
      // Penagihan ketiga jika progress mendekati selesai tapi belum 100%
      const thirdBillingDate = new Date(startDate);
      thirdBillingDate.setDate(thirdBillingDate.getDate() + 75); // 75 hari setelah mulai
      
      billings.push({
        projectId: id,
        billingDate: thirdBillingDate,
        percentage: 40.00,
        amount: totalValue * 0.4,
        status: 'unpaid', // Belum dibayar karena proyek belum selesai
        invoice: `INV-${projectCode}-003`,
        updatedAt: new Date()
      });
    }
    
    // Untuk proyek yang baru dimulai tapi belum mencapai progress 30%
    if (progress < 30) {
      // Jadwalkan penagihan pertama
      const plannedBillingDate = new Date(startDate);
      plannedBillingDate.setDate(plannedBillingDate.getDate() + 14); // 14 hari setelah mulai
      
      // Jika tanggal penagihan yang direncanakan sudah lewat, buat penagihan pending
      if (plannedBillingDate <= new Date()) {
        billings.push({
          projectId: id,
          billingDate: plannedBillingDate,
          percentage: 30.00,
          amount: totalValue * 0.3,
          status: 'unpaid', // Belum dibayar karena progress belum mencapai 30%
          invoice: `INV-${projectCode}-001`,
          updatedAt: new Date()
        });
      }
    }
  }
  
  return billings;
};

async function main() {
  console.log(`Start seeding billings...`);
  
  // Dapatkan semua proyek yang ada
  const projects = await prisma.project.findMany();
  console.log(`Found ${projects.length} projects to generate billings for`);
  
  // Dapatkan semua billing yang sudah ada
  const existingBillings = await prisma.billing.findMany();
  console.log(`Found ${existingBillings.length} existing billings`);
  
  // Kelompokkan billing berdasarkan projectId
  const billingsPerProject = {};
  existingBillings.forEach(billing => {
    if (!billingsPerProject[billing.projectId]) {
      billingsPerProject[billing.projectId] = [];
    }
    billingsPerProject[billing.projectId].push(billing);
  });
  
  // Buat kumpulan billing untuk semua proyek
  let allBillings = [];
  
  for (const project of projects) {
    // Cek apakah proyek sudah memiliki billing
    const existingProjectBillings = billingsPerProject[project.id] || [];
    
    if (existingProjectBillings.length > 0) {
      console.log(`Project ${project.projectCode} already has ${existingProjectBillings.length} billings, skipping.`);
      continue;
    }
    
    // Generate billing untuk proyek ini
    const projectBillings = generateBillings(project);
    
    console.log(`Generated ${projectBillings.length} billings for project ${project.projectCode}`);
    allBillings = [...allBillings, ...projectBillings];
  }
  
  console.log(`Total billings to create: ${allBillings.length}`);
  
  // Buat billing di database
  let createdCount = 0;
  for (const billing of allBillings) {
    try {
      const newBilling = await prisma.billing.create({
        data: billing
      });
      createdCount++;
      
      if (createdCount % 5 === 0) {
        console.log(`Created ${createdCount} billings so far...`);
      }
    } catch (error) {
      console.error(`Error creating billing: ${error.message}`);
    }
  }
  
  console.log(`Seeding completed. Created ${createdCount} billings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 