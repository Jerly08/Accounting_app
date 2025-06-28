const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all fixed assets data...');

  try {
    // Delete all records from the fixedasset table
    const deletedCount = await prisma.fixedasset.deleteMany({});
    
    console.log(`Successfully deleted ${deletedCount.count} fixed assets.`);
    console.log('Fixed assets table has been cleared.');
  } catch (error) {
    console.error('Error clearing fixed assets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 