const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Deleting all project costs...');
  
  // Menghapus semua data project costs
  const deleteResult = await prisma.projectcost.deleteMany({});
  
  console.log(`Deleted ${deleteResult.count} project costs from database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 