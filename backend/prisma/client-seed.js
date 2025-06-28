const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data untuk 20 clients dengan berbagai tipe perusahaan yang relevan dengan industri konstruksi dan geoteknik
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
  },
  {
    name: 'PT Wijaya Karya (Persero) Tbk',
    phone: '021-8082346',
    email: 'info@wika.co.id',
    address: 'Jl. DI Panjaitan Kav. 9-10, Jakarta Timur 13340'
  },
  {
    name: 'PT Adhi Karya (Persero) Tbk',
    phone: '021-8779114',
    email: 'adhikarya@adhi.co.id',
    address: 'Jl. Raya Pasar Minggu KM.18, Jakarta Selatan 12510'
  },
  {
    name: 'PT Total Bangun Persada Tbk',
    phone: '021-5666999',
    email: 'info@totalbp.com',
    address: 'Jl. Letjen S. Parman Kav. 106, Jakarta Barat 11440'
  },
  {
    name: 'PT Waskita Karya (Persero) Tbk',
    phone: '021-8508510',
    email: 'waskita@waskita.co.id',
    address: 'Jl. MT Haryono Kav. 10, Jakarta Timur 13340'
  },
  {
    name: 'Dinas PUPR Provinsi Jawa Barat',
    phone: '022-2503654',
    email: 'pupr@jabarprov.go.id',
    address: 'Jl. Diponegoro No. 22, Bandung 40115'
  },
  {
    name: 'PT Ciputra Development Tbk',
    phone: '021-5678345',
    email: 'investor@ciputra.com',
    address: 'Ciputra World 1, DBS Bank Tower Lt. 39, Jakarta Selatan 12910'
  },
  {
    name: 'PT Semen Indonesia (Persero) Tbk',
    phone: '031-3981732',
    email: 'contact@semenindonesia.com',
    address: 'Jl. Veteran, Gresik 61122, Jawa Timur'
  },
  {
    name: 'PT PP (Persero) Tbk',
    phone: '021-8775478',
    email: 'ptpp@ptpp.co.id',
    address: 'Plaza PP, Jl. TB Simatupang No. 57, Jakarta Selatan 12520'
  },
  {
    name: 'PT Hutama Karya (Persero)',
    phone: '021-8193708',
    email: 'hk@hutamakarya.com',
    address: 'Jl. Letjen MT Haryono Kav. 8, Jakarta Timur 13340'
  },
  {
    name: 'PT Agung Podomoro Land Tbk',
    phone: '021-2900016',
    email: 'info@agungpodomoroland.com',
    address: 'APL Tower, Jl. Letjen S. Parman Kav. 28, Jakarta Barat 11470'
  },
  {
    name: 'PT Summarecon Agung Tbk',
    phone: '021-4523456',
    email: 'corsec@summarecon.com',
    address: 'Plaza Summarecon, Jl. Perintis Kemerdekaan, Jakarta Timur 13210'
  },
  {
    name: 'PT Jasa Marga (Persero) Tbk',
    phone: '021-6519361',
    email: 'jasamarga@jasamarga.co.id',
    address: 'Jl. Jenderal Gatot Subroto No. 54, Jakarta Selatan 12950'
  },
  {
    name: 'PT Pertamina (Persero)',
    phone: '021-3815111',
    email: 'pcc@pertamina.com',
    address: 'Jl. Medan Merdeka Timur No. 1A, Jakarta Pusat 10110'
  },
  {
    name: 'PT PLN (Persero)',
    phone: '021-7251234',
    email: 'pln123@pln.co.id',
    address: 'Jl. Trunojoyo Blok M I/135, Jakarta Selatan 12160'
  },
  {
    name: 'PT Kereta Api Indonesia (Persero)',
    phone: '021-3451545',
    email: 'customer.service@kai.id',
    address: 'Jl. Perintis Kemerdekaan No. 1, Bandung 40117'
  }
];

async function main() {
  console.log(`Start seeding clients...`);
  
  // Dapatkan data client yang sudah ada
  const existingClients = await prisma.client.findMany();
  console.log(`Found ${existingClients.length} existing clients`);
  
  // Filter client yang belum ada (berdasarkan nama)
  const existingClientNames = existingClients.map(client => client.name);
  const newClients = clients.filter(client => !existingClientNames.includes(client.name));
  
  console.log(`Adding ${newClients.length} new clients`);
  
  // Tambahkan tanggal updatedAt untuk setiap klien baru
  const clientsWithDates = newClients.map(client => ({
    ...client,
    updatedAt: new Date()
  }));
  
  // Buat data klien baru
  for (const clientData of clientsWithDates) {
    const client = await prisma.client.create({
      data: clientData
    });
    console.log(`Created client with ID: ${client.id} - ${client.name}`);
  }
  
  console.log(`Seeding clients completed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 