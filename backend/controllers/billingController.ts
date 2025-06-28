import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import accountingService from '../services/accountingService';

const prisma = new PrismaClient();

// Get all billings
export const getAllBillings = async (req: Request, res: Response) => {
  try {
    const billings = await prisma.billing.findMany({
      include: {
        project: {
          include: {
            client: true,
          },
        },
        statusHistory: {
          orderBy: {
            changedAt: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    res.json(billings);
  } catch (error) {
    console.error('Error fetching billings:', error);
    res.status(500).json({ message: 'Error fetching billings', error });
  }
};

// Get a single billing by ID
export const getBillingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const billing = await prisma.billing.findUnique({
      where: { id: Number(id) },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        statusHistory: {
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    });
    
    if (!billing) {
      return res.status(404).json({ message: 'Billing not found' });
    }
    
    res.json(billing);
  } catch (error) {
    console.error('Error fetching billing:', error);
    res.status(500).json({ message: 'Error fetching billing', error });
  }
};

// Create a new billing
export const createBilling = async (req: Request, res: Response) => {
  try {
    const { projectId, billingDate, percentage, amount, status, invoice, createJournalEntry = true } = req.body;
    
    const parsedDate = new Date(billingDate);
    
    const billing = await prisma.billing.create({
      data: {
        projectId: Number(projectId),
        billingDate: parsedDate,
        percentage: percentage,
        amount: amount,
        status: status || 'pending',
        invoice,
        createJournalEntry,
        updatedAt: new Date(),
      },
    });
    
    // Record initial status history
    await accountingService.recordBillingStatusHistory(
      billing.id,
      'pending', // Initial status is always 'pending'
      billing.status,
      req.body.userId || null
    );
    
    // Create journal entries if status is not pending
    if (billing.status !== 'pending' && createJournalEntry) {
      await accountingService.createJournalEntryForBilling(billing);
    }
    
    res.status(201).json(billing);
  } catch (error) {
    console.error('Error creating billing:', error);
    res.status(500).json({ message: 'Error creating billing', error });
  }
};

// Update a billing
export const updateBilling = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { projectId, billingDate, percentage, amount, status, invoice, createJournalEntry } = req.body;
    
    // First get the current billing to check status change
    const currentBilling = await prisma.billing.findUnique({
      where: { id: Number(id) },
    });
    
    if (!currentBilling) {
      return res.status(404).json({ message: 'Billing not found' });
    }
    
    const oldStatus = currentBilling.status;
    const parsedDate = billingDate ? new Date(billingDate) : undefined;
    
    // Update the billing
    const updatedBilling = await prisma.billing.update({
      where: { id: Number(id) },
      data: {
        projectId: projectId !== undefined ? Number(projectId) : undefined,
        billingDate: parsedDate,
        percentage: percentage !== undefined ? percentage : undefined,
        amount: amount !== undefined ? amount : undefined,
        status: status !== undefined ? status : undefined,
        invoice: invoice !== undefined ? invoice : undefined,
        createJournalEntry: createJournalEntry !== undefined ? createJournalEntry : undefined,
        updatedAt: new Date(),
      },
    });
    
    // Record status history if status changed
    if (oldStatus !== updatedBilling.status) {
      await accountingService.recordBillingStatusHistory(
        updatedBilling.id,
        oldStatus,
        updatedBilling.status,
        req.body.userId || null,
        req.body.notes
      );
      
      // Handle journal entries based on status change
      if (updatedBilling.createJournalEntry) {
        await accountingService.createJournalEntryForBilling(updatedBilling, oldStatus);
      }
    }
    
    res.json(updatedBilling);
  } catch (error) {
    console.error('Error updating billing:', error);
    res.status(500).json({ message: 'Error updating billing', error });
  }
};

// Delete a billing
export const deleteBilling = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Delete associated journal entries first
    await accountingService.deleteJournalEntries('Billing', Number(id));
    
    // Then delete the billing
    const billing = await prisma.billing.delete({
      where: { id: Number(id) },
    });
    
    res.json({ message: 'Billing deleted successfully', billing });
  } catch (error) {
    console.error('Error deleting billing:', error);
    res.status(500).json({ message: 'Error deleting billing', error });
  }
};

// Update billing status
export const updateBillingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, userId, notes } = req.body;
    
    // Get current billing
    const currentBilling = await prisma.billing.findUnique({
      where: { id: Number(id) },
    });
    
    if (!currentBilling) {
      return res.status(404).json({ message: 'Billing not found' });
    }
    
    const oldStatus = currentBilling.status;
    
    // Update status
    const updatedBilling = await prisma.billing.update({
      where: { id: Number(id) },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
    
    // Record status change in history
    await accountingService.recordBillingStatusHistory(
      updatedBilling.id,
      oldStatus,
      status,
      userId || null,
      notes
    );
    
    // Create or update journal entries based on new status
    if (updatedBilling.createJournalEntry) {
      await accountingService.createJournalEntryForBilling(updatedBilling, oldStatus);
    }
    
    res.json(updatedBilling);
  } catch (error) {
    console.error('Error updating billing status:', error);
    res.status(500).json({ message: 'Error updating billing status', error });
  }
};

export default {
  getAllBillings,
  getBillingById,
  createBilling,
  updateBilling,
  deleteBilling,
  updateBillingStatus,
}; 