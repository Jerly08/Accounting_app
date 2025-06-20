const { PrismaClient } = require('@prisma/client');

// Create a single PrismaClient instance and export it
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Connect to the database explicitly
async function connect() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection established explicitly');
    return true;
  } catch (error) {
    console.error('❌ Failed to explicitly connect to database:', error);
    return false;
  }
}

// Test database connection on startup
async function testConnection() {
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successfully established');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1); // Exit if cannot connect to database
    return false;
  }
}

// Disconnect from the database
async function disconnect() {
  await prisma.$disconnect();
  console.log('Database disconnected');
}

// Handle app shutdown
process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});

module.exports = {
  prisma,
  connect,
  disconnect,
  testConnection,
}; 