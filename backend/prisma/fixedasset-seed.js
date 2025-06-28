const { PrismaClient } = require('@prisma/client');
const { format, subYears, subMonths } = require('date-fns');

// Initialize PrismaClient with logging
const prisma = new PrismaClient({
  log: ['error', 'warn', 'info', 'query'],
});

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

// Calculate depreciation and book value
const calculateDepreciation = (acquisitionDate, value, usefulLife) => {
  // Special case for land assets which don't depreciate
  if (usefulLife === 0) {
    return {
      accumulatedDepreciation: 0,
      bookValue: value
    };
  }
  
  const currentDate = new Date();
  const ageInYears = (currentDate - acquisitionDate) / (1000 * 60 * 60 * 24 * 365);
  const depreciation = Math.min(ageInYears, usefulLife) * (value / usefulLife);
  const accumulatedDepreciation = Math.min(value, Math.max(0, depreciation));
  const bookValue = value - accumulatedDepreciation;
  
  return {
    accumulatedDepreciation,
    bookValue
  };
};

// Main function to seed the database
async function main() {
  try {
    console.log('Starting fixed asset seed...');
    
    // Define asset categories
    const categories = [
      'equipment',
      'vehicle',
      'building',
      'land',
      'furniture',
      'other'
    ];
    
    // Define sample assets for each category
    const assetTemplates = {
      equipment: [
        { name: 'Laptop Dell XPS 15', value: randomAmount(15000000, 25000000), usefulLife: 4 },
        { name: 'Printer HP LaserJet Pro', value: randomAmount(3000000, 7000000), usefulLife: 5 },
        { name: 'Server Dell PowerEdge', value: randomAmount(30000000, 50000000), usefulLife: 5 },
        { name: 'Mesin Fotokopi Canon', value: randomAmount(12000000, 18000000), usefulLife: 6 },
        { name: 'UPS APC 1500VA', value: randomAmount(2000000, 4000000), usefulLife: 3 },
        { name: 'Proyektor Epson', value: randomAmount(5000000, 10000000), usefulLife: 4 },
        { name: 'Scanner Dokumen Brother', value: randomAmount(1500000, 3000000), usefulLife: 4 }
      ],
      vehicle: [
        { name: 'Toyota Avanza 2019', value: randomAmount(180000000, 220000000), usefulLife: 8 },
        { name: 'Honda PCX 160', value: randomAmount(30000000, 35000000), usefulLife: 6 },
        { name: 'Mitsubishi L300 Pick Up', value: randomAmount(150000000, 180000000), usefulLife: 8 },
        { name: 'Toyota Innova 2020', value: randomAmount(300000000, 350000000), usefulLife: 8 }
      ],
      building: [
        { name: 'Kantor Cabang Surabaya', value: randomAmount(2000000000, 3000000000), usefulLife: 20 },
        { name: 'Gudang Logistik Jakarta', value: randomAmount(1500000000, 2500000000), usefulLife: 20 },
        { name: 'Ruang Server', value: randomAmount(500000000, 800000000), usefulLife: 15 }
      ],
      land: [
        { name: 'Tanah Lokasi Kantor Pusat', value: randomAmount(5000000000, 8000000000), usefulLife: 0 },
        { name: 'Lahan Ekspansi Bandung', value: randomAmount(3000000000, 4000000000), usefulLife: 0 }
      ],
      furniture: [
        { name: 'Meja Kerja (20 unit)', value: randomAmount(40000000, 60000000), usefulLife: 10 },
        { name: 'Kursi Ergonomis (30 unit)', value: randomAmount(45000000, 75000000), usefulLife: 8 },
        { name: 'Lemari Arsip', value: randomAmount(8000000, 15000000), usefulLife: 10 },
        { name: 'Sofa Ruang Tunggu', value: randomAmount(12000000, 20000000), usefulLife: 8 },
        { name: 'Meja Rapat Besar', value: randomAmount(15000000, 25000000), usefulLife: 10 }
      ],
      other: [
        { name: 'Sistem AC Sentral', value: randomAmount(100000000, 150000000), usefulLife: 10 },
        { name: 'Sistem Keamanan CCTV', value: randomAmount(50000000, 80000000), usefulLife: 5 },
        { name: 'Genset 100kVA', value: randomAmount(80000000, 120000000), usefulLife: 10 },
        { name: 'Instalasi Jaringan', value: randomAmount(40000000, 60000000), usefulLife: 8 }
      ]
    };
    
    // Clear existing fixed assets
    console.log('Clearing existing fixed assets...');
    await prisma.fixedasset.deleteMany({});
    
    // Generate assets
    const now = new Date();
    const threeYearsAgo = subYears(now, 3);
    
    console.log('Generating and inserting assets...');
    
    // For each category, create assets
    for (const category of categories) {
      const templates = assetTemplates[category];
      
      for (const template of templates) {
        // Generate acquisition date
        const acquisitionDate = randomDate(threeYearsAgo, now);
        
        // Calculate depreciation
        const { accumulatedDepreciation, bookValue } = calculateDepreciation(
          acquisitionDate, 
          template.value, 
          template.usefulLife
        );
        
        // Create asset
        await prisma.fixedasset.create({
          data: {
            assetName: template.name,
            category,
            acquisitionDate,
            value: template.value,
            usefulLife: template.usefulLife,
            accumulatedDepreciation,
            bookValue,
            createdAt: now,
            updatedAt: now
          }
        });
        
        console.log(`Created asset: ${template.name} (${category})`);
      }
    }
    
    // Add some older assets with more depreciation
    const olderAssets = [
      {
        assetName: 'Komputer Desktop (10 unit)',
        category: 'equipment',
        value: randomAmount(50000000, 70000000),
        usefulLife: 4
      },
      {
        assetName: 'Toyota Hiace 2018',
        category: 'vehicle',
        value: randomAmount(350000000, 400000000),
        usefulLife: 8
      },
      {
        assetName: 'Furnitur Kantor Lama',
        category: 'furniture',
        value: randomAmount(80000000, 100000000),
        usefulLife: 8
      }
    ];
    
    for (const asset of olderAssets) {
      // Generate older acquisition date
      const acquisitionDate = randomDate(subYears(now, 5), subYears(now, 3));
      
      // Calculate depreciation
      const { accumulatedDepreciation, bookValue } = calculateDepreciation(
        acquisitionDate, 
        asset.value, 
        asset.usefulLife
      );
      
      // Create asset
      await prisma.fixedasset.create({
        data: {
          assetName: asset.assetName,
          category: asset.category,
          acquisitionDate,
          value: asset.value,
          usefulLife: asset.usefulLife,
          accumulatedDepreciation,
          bookValue,
          createdAt: now,
          updatedAt: now
        }
      });
      
      console.log(`Created older asset: ${asset.assetName}`);
    }
    
    // Add some very new assets with minimal depreciation
    const newAssets = [
      {
        assetName: 'Laptop MacBook Pro M2',
        category: 'equipment',
        value: randomAmount(25000000, 35000000),
        usefulLife: 4
      },
      {
        assetName: 'Perabotan Kantor Baru',
        category: 'furniture',
        value: randomAmount(100000000, 150000000),
        usefulLife: 10
      }
    ];
    
    for (const asset of newAssets) {
      // Generate recent acquisition date
      const acquisitionDate = randomDate(subMonths(now, 3), now);
      
      // Calculate depreciation
      const { accumulatedDepreciation, bookValue } = calculateDepreciation(
        acquisitionDate, 
        asset.value, 
        asset.usefulLife
      );
      
      // Create asset
      await prisma.fixedasset.create({
        data: {
          assetName: asset.assetName,
          category: asset.category,
          acquisitionDate,
          value: asset.value,
          usefulLife: asset.usefulLife,
          accumulatedDepreciation,
          bookValue,
          createdAt: now,
          updatedAt: now
        }
      });
      
      console.log(`Created new asset: ${asset.assetName}`);
    }
    
    console.log('Fixed asset seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding fixed assets:', error);
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