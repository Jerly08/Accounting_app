const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Kategori biaya proyek yang disesuaikan dengan frontend
const costCategories = [
  'material',      // Material proyek (pipa, semen, dll)
  'labor',         // Tenaga kerja
  'equipment',     // Peralatan (mesin boring, sondir, dll)
  'rental',        // Sewa peralatan atau tempat
  'services',      // Jasa profesional
  'other'          // Biaya lain-lain
];

// Deskripsi untuk setiap kategori biaya
const costDescriptions = {
  material: [
    'Pembelian Pipa PVC',
    'Semen dan Agregat',
    'Material Boring',
    'Material Sondir',
    'Alat Pelindung Diri (APD)',
    'Bahan Bakar untuk Mesin',
    'Material Finishing'
  ],
  labor: [
    'Upah Operator Boring',
    'Upah Operator Sondir',
    'Upah Tenaga Ahli Geoteknik',
    'Upah Tenaga Lapangan',
    'Upah Lembur Tim Lapangan',
    'Upah Supervisor',
    'Upah Asisten Teknis'
  ],
  equipment: [
    'Perawatan Mesin Boring',
    'Perawatan Mesin Sondir',
    'Perawatan Generator',
    'Perawatan Pompa Air',
    'Kalibrasi Alat Ukur',
    'Pembelian Peralatan Baru',
    'Upgrade Peralatan'
  ],
  rental: [
    'Sewa Mesin Boring',
    'Sewa Mesin Sondir',
    'Sewa Generator',
    'Sewa Pompa Air',
    'Sewa Alat Ukur',
    'Sewa Truk Pengangkut',
    'Sewa Kantor Lapangan'
  ],
  services: [
    'Konsultasi Ahli Geoteknik',
    'Konsultasi Ahli Struktur',
    'Jasa Laboratorium Pengujian',
    'Jasa Analisis Data',
    'Jasa Pembuatan Laporan',
    'Jasa Pengurusan Perizinan',
    'Jasa Pengiriman Sampel'
  ],
  other: [
    'Akomodasi Tim Lapangan',
    'Konsumsi Tim Lapangan',
    'Biaya Komunikasi',
    'Biaya Rapat Koordinasi',
    'Biaya Transportasi',
    'Biaya Perizinan',
    'Biaya Tak Terduga'
  ]
};

// Status untuk biaya proyek
const costStatus = ['approved', 'pending', 'rejected'];

// Generate data biaya untuk sebuah proyek
const generateProjectCosts = (projectId, projectCode, totalValue, startDate, status) => {
  const costs = [];
  
  // Jumlah item biaya bervariasi berdasarkan status proyek
  const numCostItems = status === 'completed' ? 15 : (status === 'ongoing' ? 8 : 3);
  
  // Distribusi kategori biaya (berapa persen dari total value)
  const categoryDistribution = {
    material: 0.25,     // 25% untuk material
    labor: 0.20,        // 20% untuk tenaga kerja
    equipment: 0.15,    // 15% untuk peralatan
    rental: 0.15,       // 15% untuk sewa
    services: 0.15,     // 15% untuk jasa
    other: 0.10         // 10% untuk lain-lain
  };
  
  // Shuffle array untuk randomisasi
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };
  
  // Create shuffled categories for randomness
  const shuffledCategories = shuffleArray([...costCategories]);
  
  // Tanggal proyek
  const projectStartDate = new Date(startDate);
  
  // Counter untuk setiap kategori
  const categoryCounter = {};
  costCategories.forEach(cat => { categoryCounter[cat] = 0; });
  
  // Generate biaya proyek sebanyak numCostItems
  for (let i = 0; i < numCostItems; i++) {
    // Pilih kategori berdasarkan index atau random untuk distribusi yang lebih baik
    const categoryIndex = i % costCategories.length;
    const category = shuffledCategories[categoryIndex];
    
    // Increment counter untuk kategori ini
    categoryCounter[category]++;
    
    // Pilih deskripsi yang belum digunakan untuk kategori ini jika masih ada
    const availableDescriptions = costDescriptions[category];
    const descriptionIndex = (categoryCounter[category] - 1) % availableDescriptions.length;
    const description = availableDescriptions[descriptionIndex];
    
    // Tentukan status biaya (untuk proyek selesai, semua approved)
    const costStatusValue = status === 'completed' ? 
                          'approved' : 
                          costStatus[Math.floor(Math.random() * (status === 'ongoing' ? 2 : 3))]; // Untuk ongoing, jangan gunakan rejected
    
    // Hitung jumlah biaya berdasarkan kategori dan distribusi
    // Untuk simulasi, kita akan acak sedikit dari persentase yang ditentukan
    const basePercentage = categoryDistribution[category];
    const variationPercentage = (Math.random() * 0.02) - 0.01; // -1% to +1% variation
    const adjustedPercentage = basePercentage + variationPercentage;
    
    // Biaya per item (total value * adjusted percentage / jumlah item dalam kategori)
    // Misalnya, jika ada 3 item material dari 25% total, masing-masing sekitar 8.33% dari total
    const itemCountInCategory = Math.ceil(numCostItems * basePercentage);
    const amount = totalValue * adjustedPercentage / (itemCountInCategory || 1);
    
    // Tanggal biaya (random antara tanggal mulai proyek hingga sekarang)
    const today = new Date();
    const dayDiff = Math.floor((today - projectStartDate) / (1000 * 60 * 60 * 24));
    const randomDay = Math.floor(Math.random() * (dayDiff > 0 ? dayDiff : 30)); // Minimum 30 hari
    
    const costDate = new Date(projectStartDate);
    costDate.setDate(costDate.getDate() + randomDay);
    
    // Tambahkan data biaya
    costs.push({
      projectId,
      category,
      description: `${description} - ${projectCode}`,
      amount,
      date: costDate,
      status: costStatusValue,
      receipt: Math.random() > 0.3 ? `receipt-${projectCode}-${i + 1}.pdf` : null, // 70% memiliki receipt
      updatedAt: new Date()
    });
  }
  
  return costs;
};

async function main() {
  console.log(`Start seeding project costs...`);
  
  // Dapatkan semua proyek yang ada
  const projects = await prisma.project.findMany();
  console.log(`Found ${projects.length} projects to generate costs for`);
  
  // Dapatkan semua project costs yang sudah ada
  const existingCosts = await prisma.projectcost.findMany();
  console.log(`Found ${existingCosts.length} existing project costs`);
  
  // Kelompokkan project costs berdasarkan projectId
  const costsPerProject = {};
  existingCosts.forEach(cost => {
    if (!costsPerProject[cost.projectId]) {
      costsPerProject[cost.projectId] = [];
    }
    costsPerProject[cost.projectId].push(cost);
  });
  
  // Buat kumpulan biaya proyek untuk semua proyek
  let allProjectCosts = [];
  
  for (const project of projects) {
    // Cek apakah proyek sudah memiliki costs
    const existingProjectCosts = costsPerProject[project.id] || [];
    
    if (existingProjectCosts.length > 0) {
      console.log(`Project ${project.projectCode} already has ${existingProjectCosts.length} costs, skipping.`);
      continue;
    }
    
    // Generate biaya untuk proyek ini
    const projectCosts = generateProjectCosts(
      project.id,
      project.projectCode,
      parseFloat(project.totalValue),
      project.startDate,
      project.status
    );
    
    console.log(`Generated ${projectCosts.length} costs for project ${project.projectCode}`);
    allProjectCosts = [...allProjectCosts, ...projectCosts];
  }
  
  console.log(`Total project costs to create: ${allProjectCosts.length}`);
  
  // Buat biaya proyek di database
  let createdCount = 0;
  for (const cost of allProjectCosts) {
    try {
      const newCost = await prisma.projectcost.create({
        data: cost
      });
      createdCount++;
      
      if (createdCount % 10 === 0) {
        console.log(`Created ${createdCount} project costs so far...`);
      }
    } catch (error) {
      console.error(`Error creating project cost: ${error.message}`);
    }
  }
  
  console.log(`Seeding completed. Created ${createdCount} project costs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 