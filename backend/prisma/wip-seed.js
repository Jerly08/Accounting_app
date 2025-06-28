// WIP Seed Script - Generates realistic WIP data for presentations
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { addMonths, subMonths, subDays, format } = require('date-fns');

async function main() {
  console.log('Starting WIP seed process...');
  
  // Get all projects
  const projects = await prisma.project.findMany({
    include: {
      client: true,
      projectcost: true,
      billing: true
    }
  });
  
  console.log(`Found ${projects.length} projects to process`);
  
  if (projects.length === 0) {
    console.log('No projects found. Please run the main seed script first.');
    return;
  }
  
  // Clear existing WIP data
  await prisma.wip_history.deleteMany({});
  await prisma.wip_cashflow_projection.deleteMany({});
  console.log('Cleared existing WIP data');
  
  // Create WIP history for each project
  for (const project of projects) {
    console.log(`Processing project: ${project.name}`);
    
    // Calculate total costs and billings
    const totalCosts = project.projectcost.reduce((sum, cost) => sum + Number(cost.amount), 0);
    const totalBilled = project.billing.reduce((sum, bill) => sum + Number(bill.amount), 0);
    
    // Generate WIP history for the last 6 months
    const now = new Date();
    const startDate = subMonths(now, 6);
    
    // Create monthly entries with progressive values
    for (let i = 0; i <= 6; i++) {
      const entryDate = addMonths(startDate, i);
      
      // Calculate progress that increases over time (0% to current progress)
      const progressFactor = i / 6;
      const entryProgress = Math.min(Number(project.progress || 0), progressFactor * 100);
      
      // Calculate earned value based on progress
      const earnedValue = (Number(project.totalValue) * entryProgress) / 100;
      
      // Calculate costs that increase over time
      const entryCosts = totalCosts * progressFactor;
      
      // Calculate billed amount that lags behind earned value
      const billedValue = i < 5 ? earnedValue * 0.7 : totalBilled;
      
      // Calculate WIP value (earned value - billed value)
      const wipValue = Math.max(0, earnedValue - billedValue);
      
      // Calculate risk score (higher for older WIP)
      const riskScore = Math.floor(Math.random() * 10) + (i < 3 ? 0 : 1);
      
      // Calculate age in days (newer entries have lower age)
      const ageInDays = Math.floor((6 - i) * 30 * Math.random() * 0.8);
      
      // Create WIP history entry
      await prisma.wip_history.create({
        data: {
          projectId: project.id,
          date: entryDate,
          wipValue: wipValue,
          earnedValue: earnedValue,
          billedValue: billedValue,
          totalCost: entryCosts,
          progress: entryProgress,
          riskScore: riskScore,
          ageInDays: ageInDays,
          updatedAt: now
        }
      });
      
      console.log(`  Created WIP history for ${format(entryDate, 'yyyy-MM-dd')} with value ${wipValue.toFixed(2)}`);
    }
    
    // Generate WIP cashflow projections for the next 6 months
    for (let i = 1; i <= 6; i++) {
      const projectionDate = addMonths(now, i);
      
      // Calculate expected billing based on project progress and total value
      const remainingValue = Number(project.totalValue) - totalBilled;
      const monthlyBillingFactor = (i / 6) * (1 + Math.random() * 0.4);
      const expectedBilling = Math.min(remainingValue * monthlyBillingFactor, remainingValue);
      
      // Calculate expected WIP reduction
      const latestWipValue = i === 1 ? 
        (Number(project.progress || 0) / 100 * Number(project.totalValue)) - totalBilled :
        expectedBilling * 0.8;
      
      // Calculate probability (decreases with time)
      const probability = Math.max(30, 100 - (i * 10));
      
      // Create WIP cashflow projection
      await prisma.wip_cashflow_projection.create({
        data: {
          projectId: project.id,
          projectionDate: projectionDate,
          expectedBilling: expectedBilling,
          expectedWipReduction: Math.max(0, latestWipValue),
          probability: probability,
          notes: `Projected billing for ${format(projectionDate, 'MMMM yyyy')}`,
          updatedAt: now
        }
      });
      
      console.log(`  Created WIP projection for ${format(projectionDate, 'yyyy-MM-dd')} with expected billing ${expectedBilling.toFixed(2)}`);
    }
  }
  
  // Create additional dummy projects with interesting WIP patterns
  const clients = await prisma.client.findMany();
  
  if (clients.length > 0) {
    // Create a project with high WIP and slow billing
    const highWipProject = await prisma.project.create({
      data: {
        projectCode: 'PRJ-HW001',
        name: 'High WIP Construction Project',
        clientId: clients[0].id,
        startDate: subMonths(new Date(), 8),
        endDate: addMonths(new Date(), 4),
        totalValue: 1500000000, // 1.5 billion
        status: 'ongoing',
        progress: 65.00,
        description: 'Large construction project with significant WIP accumulation',
        updatedAt: new Date()
      }
    });
    
    // Add costs for this project
    await prisma.projectcost.create({
      data: {
        projectId: highWipProject.id,
        category: 'Labor',
        description: 'Construction team labor',
        amount: 450000000,
        date: subMonths(new Date(), 6),
        status: 'approved',
        updatedAt: new Date()
      }
    });
    
    await prisma.projectcost.create({
      data: {
        projectId: highWipProject.id,
        category: 'Materials',
        description: 'Construction materials',
        amount: 380000000,
        date: subMonths(new Date(), 5),
        status: 'approved',
        updatedAt: new Date()
      }
    });
    
    // Add minimal billing for this project
    await prisma.billing.create({
      data: {
        projectId: highWipProject.id,
        billingDate: subMonths(new Date(), 7),
        percentage: 10.00,
        amount: 150000000,
        status: 'paid',
        invoice: 'INV-HW001-1',
        updatedAt: new Date()
      }
    });
    
    // Create WIP history for this high WIP project
    for (let i = 0; i <= 8; i++) {
      const entryDate = subMonths(new Date(), 8 - i);
      const progress = Math.min(65, i * 8);
      const earnedValue = (1500000000 * progress) / 100;
      const billedValue = i <= 1 ? 150000000 : 150000000;
      const wipValue = earnedValue - billedValue;
      
      await prisma.wip_history.create({
        data: {
          projectId: highWipProject.id,
          date: entryDate,
          wipValue: wipValue,
          earnedValue: earnedValue,
          billedValue: billedValue,
          totalCost: 830000000 * (progress / 65),
          progress: progress,
          riskScore: i > 5 ? 8 : 4,
          ageInDays: (8 - i) * 30,
          updatedAt: new Date()
        }
      });
    }
    
    console.log('Created high WIP project with history');
    
    // Create a project with risky WIP
    const riskyWipProject = await prisma.project.create({
      data: {
        projectCode: 'PRJ-RW001',
        name: 'Risky Geotechnical Survey',
        clientId: clients.length > 1 ? clients[1].id : clients[0].id,
        startDate: subMonths(new Date(), 5),
        endDate: addMonths(new Date(), 1),
        totalValue: 750000000,
        status: 'ongoing',
        progress: 85.00,
        description: 'Geotechnical survey with payment disputes',
        updatedAt: new Date()
      }
    });
    
    // Add costs for this project
    await prisma.projectcost.create({
      data: {
        projectId: riskyWipProject.id,
        category: 'Equipment',
        description: 'Survey equipment',
        amount: 250000000,
        date: subMonths(new Date(), 4),
        status: 'approved',
        updatedAt: new Date()
      }
    });
    
    await prisma.projectcost.create({
      data: {
        projectId: riskyWipProject.id,
        category: 'Labor',
        description: 'Field engineers',
        amount: 320000000,
        date: subMonths(new Date(), 3),
        status: 'approved',
        updatedAt: new Date()
      }
    });
    
    // Add minimal billing for this project
    await prisma.billing.create({
      data: {
        projectId: riskyWipProject.id,
        billingDate: subMonths(new Date(), 4),
        percentage: 20.00,
        amount: 150000000,
        status: 'paid',
        invoice: 'INV-RW001-1',
        updatedAt: new Date()
      }
    });
    
    // Create WIP history for this risky project
    for (let i = 0; i <= 5; i++) {
      const entryDate = subMonths(new Date(), 5 - i);
      const progress = Math.min(85, i * 17);
      const earnedValue = (750000000 * progress) / 100;
      const billedValue = 150000000;
      const wipValue = earnedValue - billedValue;
      
      await prisma.wip_history.create({
        data: {
          projectId: riskyWipProject.id,
          date: entryDate,
          wipValue: wipValue,
          earnedValue: earnedValue,
          billedValue: billedValue,
          totalCost: 570000000 * (progress / 85),
          progress: progress,
          riskScore: 9,
          ageInDays: (5 - i) * 30 + 15,
          updatedAt: new Date()
        }
      });
    }
    
    console.log('Created risky WIP project with history');
    
    // Create a project with declining WIP
    const decliningWipProject = await prisma.project.create({
      data: {
        projectCode: 'PRJ-DW001',
        name: 'Well-Managed Soil Testing',
        clientId: clients.length > 2 ? clients[2].id : clients[0].id,
        startDate: subMonths(new Date(), 6),
        endDate: addMonths(new Date(), 1),
        totalValue: 450000000,
        status: 'ongoing',
        progress: 90.00,
        description: 'Soil testing project with regular billing cycles',
        updatedAt: new Date()
      }
    });
    
    // Add costs for this project
    await prisma.projectcost.create({
      data: {
        projectId: decliningWipProject.id,
        category: 'Testing',
        description: 'Laboratory tests',
        amount: 180000000,
        date: subMonths(new Date(), 5),
        status: 'approved',
        updatedAt: new Date()
      }
    });
    
    // Add regular billing for this project
    for (let i = 1; i <= 4; i++) {
      await prisma.billing.create({
        data: {
          projectId: decliningWipProject.id,
          billingDate: subMonths(new Date(), 6 - i),
          percentage: 20.00,
          amount: 90000000,
          status: 'paid',
          invoice: `INV-DW001-${i}`,
          updatedAt: new Date()
        }
      });
    }
    
    // Create WIP history for this declining WIP project
    for (let i = 0; i <= 6; i++) {
      const entryDate = subMonths(new Date(), 6 - i);
      const progress = Math.min(90, i * 15);
      const earnedValue = (450000000 * progress) / 100;
      const billedValue = Math.min(i * 90000000, 360000000);
      const wipValue = Math.max(0, earnedValue - billedValue);
      
      await prisma.wip_history.create({
        data: {
          projectId: decliningWipProject.id,
          date: entryDate,
          wipValue: wipValue,
          earnedValue: earnedValue,
          billedValue: billedValue,
          totalCost: 180000000 * (progress / 90),
          progress: progress,
          riskScore: Math.max(1, 5 - i),
          ageInDays: Math.max(0, (3 - i) * 15),
          updatedAt: new Date()
        }
      });
    }
    
    console.log('Created declining WIP project with history');
  }
  
  console.log('WIP seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 