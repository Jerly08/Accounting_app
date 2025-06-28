const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Deleting all billings...');
  
  // Menghapus semua data billings
  const deleteResult = await prisma.billing.deleteMany({});
  
  console.log(`Deleted ${deleteResult.count} billings from database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 