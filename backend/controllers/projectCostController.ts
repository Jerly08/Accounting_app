import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import accountingService from '../services/accountingService';

const prisma = new PrismaClient();

// Get all project costs
export const getAllProjectCosts = async (req: Request, res: Response) => {
  try {
    const projectCosts = await prisma.projectcost.findMany({
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
    
    res.json(projectCosts);
  } catch (error) {
    console.error('Error fetching project costs:', error);
    res.status(500).json({ message: 'Error fetching project costs', error });
  }
};

// Get a single project cost by ID
export const getProjectCostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const projectCost = await prisma.projectcost.findUnique({
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
    
    if (!projectCost) {
      return res.status(404).json({ message: 'Project cost not found' });
    }
    
    res.json(projectCost);
  } catch (error) {
    console.error('Error fetching project cost:', error);
    res.status(500).json({ message: 'Error fetching project cost', error });
  }
};

// Create a new project cost
export const createProjectCost = async (req: Request, res: Response) => {
  try {
    const { projectId, category, description, amount, date, status, receipt, createJournalEntry = true } = req.body;
    
    const parsedDate = new Date(date);
    
    const projectCost = await prisma.projectcost.create({
      data: {
        projectId: Number(projectId),
        category,
        description,
        amount,
        date: parsedDate,
        status: status || 'pending',
        receipt,
        createJournalEntry,
        updatedAt: new Date(),
      },
    });
    
    // Record initial status history
    await accountingService.recordProjectCostStatusHistory(
      projectCost.id,
      'pending', // Initial status is always 'pending'
      projectCost.status,
      req.body.userId || null
    );
    
    // Create journal entries if status is not pending
    if (projectCost.status !== 'pending' && createJournalEntry) {
      await accountingService.createJournalEntryForProjectCost(projectCost);
    }
    
    res.status(201).json(projectCost);
  } catch (error) {
    console.error('Error creating project cost:', error);
    res.status(500).json({ message: 'Error creating project cost', error });
  }
};

// Update a project cost
export const updateProjectCost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { projectId, category, description, amount, date, status, receipt, createJournalEntry } = req.body;
    
    // First get the current project cost to check status change
    const currentProjectCost = await prisma.projectcost.findUnique({
      where: { id: Number(id) },
    });
    
    if (!currentProjectCost) {
      return res.status(404).json({ message: 'Project cost not found' });
    }
    
    const oldStatus = currentProjectCost.status;
    const parsedDate = date ? new Date(date) : undefined;
    
    // Update the project cost
    const updatedProjectCost = await prisma.projectcost.update({
      where: { id: Number(id) },
      data: {
        projectId: projectId !== undefined ? Number(projectId) : undefined,
        category: category !== undefined ? category : undefined,
        description: description !== undefined ? description : undefined,
        amount: amount !== undefined ? amount : undefined,
        date: parsedDate,
        status: status !== undefined ? status : undefined,
        receipt: receipt !== undefined ? receipt : undefined,
        createJournalEntry: createJournalEntry !== undefined ? createJournalEntry : undefined,
        updatedAt: new Date(),
      },
    });
    
    // Record status history if status changed
    if (oldStatus !== updatedProjectCost.status) {
      await accountingService.recordProjectCostStatusHistory(
        updatedProjectCost.id,
        oldStatus,
        updatedProjectCost.status,
        req.body.userId || null,
        req.body.notes
      );
      
      // Handle journal entries based on status change
      if (updatedProjectCost.createJournalEntry) {
        await accountingService.createJournalEntryForProjectCost(updatedProjectCost, oldStatus);
      }
    }
    
    res.json(updatedProjectCost);
  } catch (error) {
    console.error('Error updating project cost:', error);
    res.status(500).json({ message: 'Error updating project cost', error });
  }
};

// Delete a project cost
export const deleteProjectCost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Delete associated journal entries first
    await accountingService.deleteJournalEntries('ProjectCost', Number(id));
    
    // Then delete the project cost
    const projectCost = await prisma.projectcost.delete({
      where: { id: Number(id) },
    });
    
    res.json({ message: 'Project cost deleted successfully', projectCost });
  } catch (error) {
    console.error('Error deleting project cost:', error);
    res.status(500).json({ message: 'Error deleting project cost', error });
  }
};

// Update project cost status
export const updateProjectCostStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, userId, notes } = req.body;
    
    // Get current project cost
    const currentProjectCost = await prisma.projectcost.findUnique({
      where: { id: Number(id) },
    });
    
    if (!currentProjectCost) {
      return res.status(404).json({ message: 'Project cost not found' });
    }
    
    const oldStatus = currentProjectCost.status;
    
    // Update the project cost status
    const updatedProjectCost = await prisma.projectcost.update({
      where: { id: Number(id) },
      data: {
        status,
        updatedAt: new Date(),
      },
      include: {
        project: true,
      },
    });
    
    // Record status history
    await accountingService.recordProjectCostStatusHistory(
      updatedProjectCost.id,
      oldStatus,
      status,
      userId,
      notes
    );
    
    // Handle journal entries based on status change
    if (updatedProjectCost.createJournalEntry) {
      await accountingService.createJournalEntryForProjectCost(updatedProjectCost, oldStatus);
    }
    
    // Update WIP automatically when project cost status changes
    try {
      // Import wipService dynamically to avoid circular dependency
      const wipService = require('../services/wipService');
      await wipService.updateWipAutomatically(updatedProjectCost.projectId, 'COST');
    } catch (wipError) {
      console.error('Error updating WIP:', wipError);
      // Continue even if WIP update fails
    }
    
    res.json({
      message: 'Project cost status updated successfully',
      projectCost: updatedProjectCost,
    });
  } catch (error) {
    console.error('Error updating project cost status:', error);
    res.status(500).json({ message: 'Error updating project cost status', error });
  }
};

export default {
  getAllProjectCosts,
  getProjectCostById,
  createProjectCost,
  updateProjectCost,
  deleteProjectCost,
  updateProjectCostStatus,
}; 