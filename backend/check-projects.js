const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking projects...');
    const projects = await prisma.project.findMany();
    console.table(projects.map(p => ({ 
      id: p.id, 
      name: p.name, 
      clientId: p.clientId, 
      status: p.status,
      totalValue: p.totalValue.toString()
    })));

    console.log('\nChecking clients...');
    const clients = await prisma.client.findMany();
    console.table(clients.map(c => ({ 
      id: c.id, 
      name: c.name, 
      email: c.email 
    })));

    // Check for projects with invalid clientIds
    console.log('\nChecking for projects with invalid clientIds...');
    const clientIds = new Set(clients.map(c => c.id));
    const invalidProjects = projects.filter(p => !clientIds.has(p.clientId));
    
    if (invalidProjects.length > 0) {
      console.log('Found projects with invalid clientIds:');
      console.table(invalidProjects.map(p => ({ 
        id: p.id, 
        name: p.name, 
        clientId: p.clientId 
      })));
    } else {
      console.log('All projects have valid clientIds.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 