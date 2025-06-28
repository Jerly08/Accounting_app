const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data untuk chart of accounts sesuai tabel yang diberikan dengan category dan subcategory yang diisi
const chartOfAccounts = [
  { code: '1101', name: 'Kas', type: 'Aktiva', category: 'Asset', subcategory: 'Cash' },
  { code: '1102', name: 'Bank BCA', type: 'Aktiva', category: 'Asset', subcategory: 'Bank' },
  { code: '1103', name: 'Bank Mandiri', type: 'Aktiva', category: 'Asset', subcategory: 'Bank' },
  { code: '1104', name: 'Bank BNI', type: 'Aktiva', category: 'Asset', subcategory: 'Bank' },
  { code: '1105', name: 'Bank BRI', type: 'Aktiva', category: 'Asset', subcategory: 'Bank' },
  { code: '1201', name: 'Piutang Usaha', type: 'Aktiva', category: 'Asset', subcategory: 'Receivable' },
  { code: '1301', name: 'Pekerjaan Dalam Proses (WIP)', type: 'Aktiva', category: 'Asset', subcategory: 'Work In Progress' },
  { code: '1501', name: 'Mesin Boring', type: 'Aset Tetap', category: 'Fixed Asset', subcategory: 'Equipment' },
  { code: '1502', name: 'Mesin Sondir', type: 'Aset Tetap', category: 'Fixed Asset', subcategory: 'Equipment' },
  { code: '1503', name: 'Kendaraan Operasional', type: 'Aset Tetap', category: 'Fixed Asset', subcategory: 'Vehicle' },
  { code: '1504', name: 'Peralatan Kantor', type: 'Aset Tetap', category: 'Fixed Asset', subcategory: 'Office Equipment' },
  { code: '1505', name: 'Bangunan Kantor', type: 'Aset Tetap', category: 'Fixed Asset', subcategory: 'Building' },
  { code: '1601', name: 'Akumulasi Penyusutan Mesin Boring', type: 'Kontra Aset', category: 'Contra Asset', subcategory: 'Accumulated Depreciation' },
  { code: '1602', name: 'Akumulasi Penyusutan Mesin Sondir', type: 'Kontra Aset', category: 'Contra Asset', subcategory: 'Accumulated Depreciation' },
  { code: '1603', name: 'Akumulasi Penyusutan Kendaraan', type: 'Kontra Aset', category: 'Contra Asset', subcategory: 'Accumulated Depreciation' },
  { code: '1604', name: 'Akumulasi Penyusutan Peralatan Kantor', type: 'Kontra Aset', category: 'Contra Asset', subcategory: 'Accumulated Depreciation' },
  { code: '1605', name: 'Akumulasi Penyusutan Bangunan', type: 'Kontra Aset', category: 'Contra Asset', subcategory: 'Accumulated Depreciation' },
  { code: '2101', name: 'Hutang Bank Jangka Pendek', type: 'Kewajiban', category: 'Hutang Lancar', subcategory: 'Bank Loan' },
  { code: '2102', name: 'Hutang Usaha', type: 'Kewajiban', category: 'Hutang Lancar', subcategory: 'Trade Payable' },
  { code: '2103', name: 'Hutang Pajak', type: 'Kewajiban', category: 'Hutang Lancar', subcategory: 'Tax Payable' },
  { code: '2104', name: 'Beban Yang Masih Harus Dibayar', type: 'Kewajiban', category: 'Hutang Lancar', subcategory: 'Accrued Expense' },
  { code: '2201', name: 'Hutang Bank Jangka Panjang', type: 'Kewajiban', category: 'Hutang Jangka Panjang', subcategory: 'Bank Loan' },
  { code: '2202', name: 'Hutang Leasing', type: 'Kewajiban', category: 'Hutang Jangka Panjang', subcategory: 'Leasing' },
  { code: '3101', name: 'Modal Saham', type: 'Ekuitas', category: 'Modal', subcategory: 'Share Capital' },
  { code: '3102', name: 'Laba Ditahan', type: 'Ekuitas', category: 'Modal', subcategory: 'Retained Earnings' },
  { code: '4001', name: 'Pendapatan Jasa Boring', type: 'Pendapatan', category: 'Revenue', subcategory: 'Boring Service' },
  { code: '4002', name: 'Pendapatan Jasa Sondir', type: 'Pendapatan', category: 'Revenue', subcategory: 'Sondir Service' },
  { code: '4003', name: 'Pendapatan Jasa Konsultasi', type: 'Pendapatan', category: 'Revenue', subcategory: 'Consultation Service' },
  { code: '5101', name: 'Beban Proyek - Material', type: 'Beban', category: 'Project Expense', subcategory: 'Material' },
  { code: '5102', name: 'Beban Proyek - Tenaga Kerja', type: 'Beban', category: 'Project Expense', subcategory: 'Labor' },
  { code: '5103', name: 'Beban Proyek - Sewa Peralatan', type: 'Beban', category: 'Project Expense', subcategory: 'Equipment Rental' },
  { code: '5104', name: 'Beban Proyek - Transportasi', type: 'Beban', category: 'Project Expense', subcategory: 'Transportation' },
  { code: '5105', name: 'Beban Proyek - Lain-lain', type: 'Beban', category: 'Project Expense', subcategory: 'Other' },
  { code: '6101', name: 'Beban Operasional Kantor', type: 'Beban', category: 'Operational Expense', subcategory: 'Office' },
  { code: '6102', name: 'Beban Gaji & Tunjangan', type: 'Beban', category: 'Operational Expense', subcategory: 'Salary & Benefit' },
  { code: '6103', name: 'Beban Listrik & Air', type: 'Beban', category: 'Operational Expense', subcategory: 'Utility' },
  { code: '6104', name: 'Beban Internet & Telekomunikasi', type: 'Beban', category: 'Operational Expense', subcategory: 'Communication' },
  { code: '6105', name: 'Beban Penyusutan', type: 'Beban', category: 'Operational Expense', subcategory: 'Depreciation' }
];

async function main() {
  console.log(`Start seeding chart of accounts...`);
  
  // Dapatkan data chart of accounts yang sudah ada
  const existingAccounts = await prisma.chartofaccount.findMany();
  console.log(`Found ${existingAccounts.length} existing accounts`);
  
  // Kumpulkan kode-kode akun yang sudah ada
  const existingAccountCodes = existingAccounts.map(account => account.code);
  
  // Iterasi untuk setiap akun dalam data
  for (const accountData of chartOfAccounts) {
    try {
      // Cek apakah akun sudah ada (berdasarkan kode)
      if (existingAccountCodes.includes(accountData.code)) {
        // Update akun yang sudah ada
        const updatedAccount = await prisma.chartofaccount.update({
          where: { code: accountData.code },
          data: {
            name: accountData.name,
            type: accountData.type,
            category: accountData.category,
            subcategory: accountData.subcategory,
            updatedAt: new Date()
          }
        });
        console.log(`Updated account: ${updatedAccount.code} - ${updatedAccount.name}`);
      } else {
        // Buat akun baru jika belum ada
        const newAccount = await prisma.chartofaccount.create({
          data: {
            ...accountData,
            updatedAt: new Date()
          }
        });
        console.log(`Created account: ${newAccount.code} - ${newAccount.name}`);
      }
    } catch (error) {
      console.error(`Error processing account ${accountData.code}:`, error);
    }
  }
  
  console.log(`Seeding chart of accounts completed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 