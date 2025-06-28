import { PrismaClient, billing, projectcost } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

/**
 * Creates a journal entry (two transactions - debit and credit)
 */
async function createJournalEntry(
  date: Date,
  description: string,
  debitAccountCode: string,
  creditAccountCode: string,
  amount: Decimal,
  projectId: number | null = null
) {
  const now = new Date();
  
  // Start a transaction to ensure both entries are created or none
  return await prisma.$transaction(async (tx) => {
    // Create debit entry
    const debitEntry = await tx.transaction.create({
      data: {
        date,
        type: 'DEBIT',
        accountCode: debitAccountCode,
        description,
        amount,
        projectId,
        updatedAt: now,
      },
    });

    // Create credit entry
    const creditEntry = await tx.transaction.create({
      data: {
        date,
        type: 'CREDIT',
        accountCode: creditAccountCode,
        description,
        amount,
        projectId,
        updatedAt: now,
      },
    });

    return { debitEntry, creditEntry };
  });
}

/**
 * Find related journal entries for a billing or project cost
 */
async function findRelatedJournalEntries(entityType: string, entityId: number) {
  // Format description to search for
  const searchPattern = `${entityType} #${entityId}:%`;

  return await prisma.transaction.findMany({
    where: {
      description: {
        startsWith: `${entityType} #${entityId}:`,
      },
    },
  });
}

/**
 * Delete journal entries related to a specific entity
 */
export async function deleteJournalEntries(entityType: string, entityId: number) {
  const entries = await findRelatedJournalEntries(entityType, entityId);
  
  if (entries.length > 0) {
    const entryIds = entries.map(entry => entry.id);
    
    return await prisma.transaction.deleteMany({
      where: {
        id: {
          in: entryIds,
        },
      },
    });
  }
  
  return { count: 0 };
}

/**
 * Creates journal entries for billing status changes
 */
export async function createJournalEntryForBilling(billing: billing, oldStatus?: string) {
  // Skip journal entry creation if flag is disabled
  if (!billing.createJournalEntry) {
    return null;
  }
  
  const { id, projectId, billingDate, amount, status } = billing;
  
  // Get project details for better description
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  
  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }
  
  // Determine revenue account based on project name or code
  let revenueAccount = '4001'; // Default to Boring Service
  if (project.name.toLowerCase().includes('sondir')) {
    revenueAccount = '4002'; // Sondir Service
  } else if (project.name.toLowerCase().includes('konsultasi')) {
    revenueAccount = '4003'; // Consultation Service
  }
  
  // Common description prefix
  const descriptionPrefix = `Billing #${id}: ${project.name} (${project.projectCode})`;

  try {
    // If status is changing to unpaid: DR Piutang Usaha, CR Pendapatan Jasa
    if (status === 'unpaid') {
      // Check if entries already exist
      const existingEntries = await findRelatedJournalEntries('Billing', id);
      if (existingEntries.length > 0) {
        // If we have existing entries for this billing, delete them first
        await deleteJournalEntries('Billing', id);
      }
      
      return await createJournalEntry(
        billingDate,
        `${descriptionPrefix} - Invoice Created`,
        '1201', // Piutang Usaha
        revenueAccount, // Pendapatan Jasa (based on project type)
        amount,
        projectId
      );
    }
    
    // If status is changing to paid: DR Kas/Bank, CR Piutang Usaha
    else if (status === 'paid') {
      // Default cash account
      const cashAccount = '1101'; // Kas
      
      return await createJournalEntry(
        new Date(), // Current date for payment
        `${descriptionPrefix} - Payment Received`,
        cashAccount, // Kas
        '1201', // Piutang Usaha
        amount,
        projectId
      );
    }
    
    // If status is changing to rejected: Delete all journal entries
    else if (status === 'rejected') {
      return await deleteJournalEntries('Billing', id);
    }
  } catch (error) {
    console.error('Error creating journal entry for billing:', error);
    throw error;
  }
  
  return null;
}

/**
 * Creates journal entries for project cost status changes
 */
export async function createJournalEntryForProjectCost(projectCost: projectcost, oldStatus?: string) {
  // Skip journal entry creation if flag is disabled
  if (!projectCost.createJournalEntry) {
    return null;
  }
  
  const { id, projectId, date, category, description, amount, status } = projectCost;
  
  // Get project details for better description
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  
  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }
  
  // Determine expense account based on category
  let expenseAccount = '5105'; // Default to Other
  switch (category.toLowerCase()) {
    case 'material':
      expenseAccount = '5101';
      break;
    case 'tenaga kerja':
    case 'labor':
      expenseAccount = '5102';
      break;
    case 'sewa peralatan':
    case 'equipment rental':
      expenseAccount = '5103';
      break;
    case 'transportasi':
    case 'transportation':
      expenseAccount = '5104';
      break;
    default:
      expenseAccount = '5105'; // Other
  }
  
  // Common description prefix
  const descriptionPrefix = `ProjectCost #${id}: ${project.name} (${project.projectCode}) - ${category}`;

  try {
    // If status is changing to unpaid: DR Beban Proyek, CR Hutang Usaha
    if (status === 'unpaid') {
      // Check if entries already exist
      const existingEntries = await findRelatedJournalEntries('ProjectCost', id);
      if (existingEntries.length > 0) {
        // If we have existing entries for this project cost, delete them first
        await deleteJournalEntries('ProjectCost', id);
      }
      
      return await createJournalEntry(
        date,
        `${descriptionPrefix} - Cost Recorded`,
        expenseAccount, // Beban Proyek based on category
        '2102', // Hutang Usaha
        amount,
        projectId
      );
    }
    
    // If status is changing to paid: DR Hutang Usaha, CR Kas/Bank
    else if (status === 'paid') {
      // Default cash account
      const cashAccount = '1101'; // Kas
      
      return await createJournalEntry(
        new Date(), // Current date for payment
        `${descriptionPrefix} - Payment Made`,
        '2102', // Hutang Usaha
        cashAccount, // Kas
        amount,
        projectId
      );
    }
    
    // If status is changing to rejected: Delete all journal entries
    else if (status === 'rejected') {
      return await deleteJournalEntries('ProjectCost', id);
    }
  } catch (error) {
    console.error('Error creating journal entry for project cost:', error);
    throw error;
  }
  
  return null;
}

/**
 * Record status change history for billing
 */
export async function recordBillingStatusHistory(
  billingId: number, 
  oldStatus: string, 
  newStatus: string, 
  changedBy: number | null = null,
  notes: string | null = null
) {
  return await prisma.billing_status_history.create({
    data: {
      billingId,
      oldStatus,
      newStatus,
      changedBy,
      notes
    }
  });
}

/**
 * Record status change history for project cost
 */
export async function recordProjectCostStatusHistory(
  projectCostId: number, 
  oldStatus: string, 
  newStatus: string, 
  changedBy: number | null = null,
  notes: string | null = null
) {
  return await prisma.projectcost_status_history.create({
    data: {
      projectCostId,
      oldStatus,
      newStatus,
      changedBy,
      notes
    }
  });
}

export default {
  createJournalEntryForBilling,
  createJournalEntryForProjectCost,
  recordBillingStatusHistory,
  recordProjectCostStatusHistory,
  deleteJournalEntries
}; 