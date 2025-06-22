const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Seeding projects...');
    
    // First, check if we have any clients
    const clients = await prisma.client.findMany();
    
    if (clients.length === 0) {
      console.log('No clients found. Creating a client first...');
      
      // Create a client if none exists
      const client = await prisma.client.create({
        data: {
          name: 'PT Pembangunan Jaya',
          phone: '021-5555-1234',
          email: 'contact@pembangunanjaya.com',
          address: 'Jl. Sudirman No. 123, Jakarta',
          updatedAt: new Date()
        }
      });
      
      console.log(`Created client: ${client.name} (ID: ${client.id})`);
      clients.push(client);
    }
    
    // Use the first client as the default client
    const clientId = clients[0].id;
    
    // Check if projects already exist
    const existingProjects = await prisma.project.findMany();
    
    if (existingProjects.length > 0) {
      console.log('Projects already exist. Updating client IDs...');
      
      // Update existing projects to use the valid client ID
      for (const project of existingProjects) {
        await prisma.project.update({
          where: { id: project.id },
          data: { clientId }
        });
        console.log(`Updated project: ${project.name} (ID: ${project.id}) to use client ID: ${clientId}`);
      }
    } else {
      console.log('No projects found. Creating sample projects...');
      
      // Create sample projects
      const projects = [
        {
          projectCode: 'PRJ-001',
          name: 'Boring & Sondir Jembatan Tol',
          clientId,
          startDate: new Date('2025-01-15'),
          totalValue: 350000000,
          status: 'ongoing',
          updatedAt: new Date(),
          description: 'Soil investigation for toll bridge project',
          progress: 25.00
        },
        {
          projectCode: 'PRJ-002',
          name: 'Sondir Apartemen Grand Residence',
          clientId,
          startDate: new Date('2025-02-01'),
          totalValue: 225000000,
          status: 'ongoing',
          updatedAt: new Date(),
          description: 'Cone penetration test for apartment complex',
          progress: 15.00
        },
        {
          projectCode: 'PRJ-003',
          name: 'Boring Test Gedung Perkantoran CBD',
          clientId,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-15'),
          totalValue: 175000000,
          status: 'completed',
          updatedAt: new Date(),
          description: 'Soil boring for CBD office building',
          progress: 100.00
        }
      ];
      
      for (const projectData of projects) {
        const project = await prisma.project.create({
          data: projectData
        });
        console.log(`Created project: ${project.name} (ID: ${project.id})`);
      }
    }
    
    // Add a billing entry to the completed project
    const completedProject = await prisma.project.findFirst({
      where: { status: 'completed' }
    });
    
    if (completedProject) {
      const existingBilling = await prisma.billing.findFirst({
        where: { projectId: completedProject.id }
      });
      
      if (!existingBilling) {
        await prisma.billing.create({
          data: {
            projectId: completedProject.id,
            billingDate: new Date('2025-03-10'),
            percentage: 40.00,
            amount: 70000000,
            status: 'paid',
            updatedAt: new Date(),
            invoice: 'INV-2025-001'
          }
        });
        console.log(`Added billing entry to project: ${completedProject.name}`);
      }
    }
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 