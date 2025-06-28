const express = require('express');

const router = express.Router();

const { PrismaClient } = require('@prisma/client');

const { auth, authorize } = require('../middleware/auth');

const { exportTransactionsToExcel, handleExportError } = require('../utils/exportHelper');



const prisma = new PrismaClient();



/**

 * @route   GET /api/transactions

 * @desc    Get all transactions with optional filtering

 * @access  Private

 */

router.get('/', auth, async (req, res) => {

  try {

    const { type, accountCode, projectId, startDate, endDate, limit, page } = req.query;

    const pageNumber = parseInt(page) || 1;

    const pageSize = parseInt(limit) || 1000;

    const skip = (pageNumber - 1) * pageSize;



    // Build filter conditions

    let where = {};

    

    if (type) {

      // Map Indonesian types to English if needed

      if (type === 'Pendapatan') {

        where.type = { in: ['income', 'Pendapatan'] };

      } else if (type === 'Beban') {

        where.type = { in: ['expense', 'Beban'] };

      } else if (type === 'income') {

        where.type = { in: ['income', 'Pendapatan'] };

      } else if (type === 'expense') {

        where.type = { in: ['expense', 'Beban'] };

      } else {

        where.type = type;

      }

    }



    if (accountCode) {

      where.accountCode = accountCode;

    }



    if (projectId) {

      if (projectId === 'null') {

        // Filter for transactions with no project

        where.projectId = null;

      } else {

        where.projectId = parseInt(projectId);

      }

    }



    // Date range filter

    if (startDate || endDate) {

      where.date = {};

      if (startDate) {

        where.date.gte = new Date(startDate);

      }

      if (endDate) {

        where.date.lte = new Date(endDate);

      }

    }



    // Get transactions with pagination

    const transactions = await prisma.transaction.findMany({

      where,

      skip,

      take: pageSize,

      orderBy: [

        { date: 'desc' }

      ],

      include: {

        chartofaccount: true,

        project: {

          select: {

            id: true,

            projectCode: true,

            name: true

          }

        }

      }

    });



    // Get total count for pagination

    const total = await prisma.transaction.count({ where });



    // Get total amount by type

    const totalIncome = await prisma.transaction.aggregate({

      where: {

        ...where,

        type: { in: ['income', 'Pendapatan'] }

      },

      _sum: {

        amount: true

      }

    });



    const totalExpense = await prisma.transaction.aggregate({

      where: {

        ...where,

        type: { in: ['expense', 'Beban'] }

      },

      _sum: {

        amount: true

      }

    });



    res.json({

      success: true,

      data: transactions,

      summary: {

        totalIncome: totalIncome._sum.amount || 0,

        totalExpense: totalExpense._sum.amount || 0,

        netAmount: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0)

      },

      pagination: {

        page: pageNumber,

        pageSize,

        total,

        totalPages: Math.ceil(total / pageSize)

      }

    });

  } catch (error) {

    res.status(500).json({ 

      success: false, 

      message: 'Error saat mengambil data transaksi',

      error: error.message 

    });

  }

});



/**

 * @route   GET /api/transactions/:id

 * @desc    Get single transaction by ID

 * @access  Private

 */

router.get('/:id', auth, async (req, res) => {

  try {

    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({

      where: { id: parseInt(id) },

      include: {

        chartofaccount: true,

        project: {

          select: {

            id: true,

            projectCode: true,

            name: true,

            client: {

              select: {

                id: true,

                name: true

              }

            }

          }

        }

      }

    });



    if (!transaction) {

      return res.status(404).json({ 

        success: false, 

        message: 'Transaksi tidak ditemukan' 

      });

    }



    res.json({

      success: true,

      data: transaction

    });

  } catch (error) {

    res.status(500).json({ 

      success: false, 

      message: 'Error saat mengambil data transaksi',

      error: error.message 

    });

  }

});



/**

 * @route   GET /api/transactions/project/:projectId

 * @desc    Get transactions for a specific project

 * @access  Private

 */

router.get('/project/:projectId', auth, async (req, res) => {

  try {

    const { projectId } = req.params;

    const { type } = req.query;



    // Build filter conditions

    let where = { 

      projectId: parseInt(projectId) 

    };

    

    if (type) {

      where.type = type;

    }



    // Get all transactions for the project

    const transactions = await prisma.transaction.findMany({

      where,

      orderBy: [

        { date: 'desc' }

      ],

      include: {

        chartofaccount: true

      }

    });



    // Get totals by type

    const totalIncome = await prisma.transaction.aggregate({

      where: {

        projectId: parseInt(projectId),

        type: { in: ['income', 'Pendapatan'] }

      },

      _sum: {

        amount: true

      }

    });



    const totalExpense = await prisma.transaction.aggregate({

      where: {

        projectId: parseInt(projectId),

        type: { in: ['expense', 'Beban'] }

      },

      _sum: {

        amount: true

      }

    });



    res.json({

      success: true,

      data: transactions,

      summary: {

        totalIncome: totalIncome._sum.amount || 0,

        totalExpense: totalExpense._sum.amount || 0,

        netAmount: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0)

      }

    });

  } catch (error) {

    res.status(500).json({ 

      success: false, 

      message: 'Error saat mengambil data transaksi proyek',

      error: error.message 

    });

  }

});



/**

 * @route   GET /api/transactions/account/:accountCode

 * @desc    Get transactions for a specific account

 * @access  Private

 */

router.get('/account/:accountCode', auth, async (req, res) => {

  try {

    const { accountCode } = req.params;

    const { startDate, endDate } = req.query;



    // Build filter conditions

    let where = { 

      accountCode 

    };

    

    // Date range filter

    if (startDate || endDate) {

      where.date = {};

      if (startDate) {

        where.date.gte = new Date(startDate);

      }

      if (endDate) {

        where.date.lte = new Date(endDate);

      }

    }



    // Get all transactions for the account

    const transactions = await prisma.transaction.findMany({

      where,

      orderBy: [

        { date: 'desc' }

      ],

      include: {

        project: {

          select: {

            id: true,

            projectCode: true,

            name: true

          }

        }

      }

    });



    // Get total

    const total = await prisma.transaction.aggregate({

      where,

      _sum: {

        amount: true

      }

    });



    res.json({

      success: true,

      data: transactions,

      summary: {

        totalAmount: total._sum.amount || 0

      }

    });

  } catch (error) {

    res.status(500).json({ 

      success: false, 

      message: 'Error saat mengambil data transaksi akun',

      error: error.message 

    });

  }

});



/**

 * @route   GET /api/transactions/account/:code

 * @desc    Get transactions by account code and calculate balance

 * @access  Private

 */

router.get('/account/:code', auth, async (req, res) => {

  try {

    const { code } = req.params;

    const { limit = 50, page = 1 } = req.query;

    

    const pageNumber = parseInt(page);

    const pageSize = parseInt(limit);

    const skip = (pageNumber - 1) * pageSize;

    

    // Check if account exists

    const account = await prisma.chartofaccount.findUnique({

      where: { code }

    });

    

    if (!account) {

      return res.status(404).json({

        success: false,

        message: 'Account not found'

      });

    }

    

    // Get transactions for this account with pagination

    const transactions = await prisma.transaction.findMany({

      where: { accountCode: code },

      orderBy: { date: 'desc' },

      skip,

      take: pageSize,

      include: {

        project: {

          select: {

            name: true,

            projectCode: true

          }

        }

      }

    });

    

    // Get total count for pagination

    const totalTransactions = await prisma.transaction.count({

      where: { accountCode: code }

    });

    

    // Calculate account balance from all transactions

    const allTransactions = await prisma.transaction.findMany({

      where: { accountCode: code },

      select: {

        amount: true,

        type: true

      }

    });

    

    let balance = 0;

    

    // Calculate balance based on account type and transaction type

    allTransactions.forEach(transaction => {

      const amount = parseFloat(transaction.amount);

      

      // For asset accounts:

      // - Debit increases the balance

      // - Credit decreases the balance

      // For liability and equity accounts:

      // - Credit increases the balance

      // - Debit decreases the balance

      // For income accounts:

      // - Credit increases the balance

      // - Debit decreases the balance

      // For expense accounts:

      // - Debit increases the balance

      // - Credit decreases the balance

      

      if (['Aktiva', 'Aset Tetap', 'Beban'].includes(account.type)) {

        if (transaction.type === 'debit') {

          balance += amount;

        } else {

          balance -= amount;

        }

      } else {

        // For Pendapatan, Kontra Aset, and other types

        if (transaction.type === 'credit') {

          balance += amount;

        } else {

          balance -= amount;

        }

      }

    });

    

    res.json({

      success: true,

      data: {

        account,

        transactions,

        balance,

        pagination: {

          page: pageNumber,

          pageSize,

          total: totalTransactions,

          totalPages: Math.ceil(totalTransactions / pageSize)

        }

      }

    });

  } catch (error) {

    console.error('Error fetching account transactions:', error);

    res.status(500).json({

      success: false,

      message: 'Error fetching account transactions',

      error: error.message

    });

  }

});



/**

 * Helper function to create recurring transactions

 * @param {Object} transactionData - Base transaction data

 * @param {String} frequency - Frequency of recurrence (daily, weekly, monthly, quarterly, yearly)

 * @param {Number} count - Number of occurrences

 * @returns {Array} Array of transaction data objects with calculated dates

 */

const generateRecurringTransactions = (transactionData, frequency, count) => {

  const transactions = [];

  const startDate = new Date(transactionData.date);

  

  // Create the specified number of transactions

  for (let i = 0; i < count; i++) {

    // Clone the transaction data

    const newTransaction = { ...transactionData };

    

    // Calculate the date for this occurrence

    if (i > 0) { // Skip the first one as it uses the original date

      const newDate = new Date(startDate);

      

      switch (frequency) {

        case 'daily':

          newDate.setDate(startDate.getDate() + i);

          break;

        case 'weekly':

          newDate.setDate(startDate.getDate() + (i * 7));

          break;

        case 'monthly':

          newDate.setMonth(startDate.getMonth() + i);

          break;

        case 'quarterly':

          newDate.setMonth(startDate.getMonth() + (i * 3));

          break;

        case 'yearly':

          newDate.setFullYear(startDate.getFullYear() + i);

          break;

        default:

          newDate.setMonth(startDate.getMonth() + i);

      }

      

      newTransaction.date = newDate;

    }

    

    // Add occurrence number to notes

    if (count > 1) {

      const occurrenceNote = `Occurrence ${i + 1}/${count}`;

      newTransaction.notes = newTransaction.notes 

        ? `${newTransaction.notes} (${occurrenceNote})` 

        : occurrenceNote;

    }

    

    transactions.push(newTransaction);

  }

  

  return transactions;

};



/**

 * @route   POST /api/transactions

 * @desc    Create new transaction

 * @access  Private

 */

router.post('/', auth, async (req, res) => {

  try {

    const { 

      date, 

      type, 

      accountCode, 

      description, 

      amount, 

      projectId, 

      notes,

      counterAccountCode, 

      createCounterEntry = true,

      isRecurring = false,

      recurringFrequency,

      recurringCount

    } = req.body;

    

    // Validate required fields

    if (!date || !type || !accountCode || !description || !amount) {

      return res.status(400).json({

        success: false,

        message: 'Tanggal, tipe, kode akun, deskripsi, dan jumlah wajib diisi'

      });

    }



    // Validate account exists

    const account = await prisma.chartofaccount.findUnique({

      where: { code: accountCode }

    });



    if (!account) {

      return res.status(404).json({

        success: false,

        message: 'Akun tidak ditemukan'

      });

    }



    // Validate project if provided

    if (projectId) {

      const project = await prisma.project.findUnique({

        where: { id: parseInt(projectId) }

      });



      if (!project) {

        return res.status(404).json({

          success: false,

          message: 'Proyek tidak ditemukan'

        });

      }

    }



    // Validate transaction type

    const validTypes = ['income', 'expense', 'transfer', 'Pendapatan', 'Beban'];

    if (!validTypes.includes(type)) {

      return res.status(400).json({

        success: false,

        message: 'Tipe transaksi tidak valid',

        validTypes

      });

    }

    

    // Validate recurring parameters if applicable

    if (isRecurring) {

      const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

      if (!recurringFrequency || !validFrequencies.includes(recurringFrequency)) {

        return res.status(400).json({

          success: false,

          message: 'Frekuensi berulang tidak valid',

          validFrequencies

        });

      }

      

      if (!recurringCount || recurringCount < 1 || recurringCount > 60) {

        return res.status(400).json({

          success: false,

          message: 'Jumlah pengulangan harus antara 1 dan 60'

        });

      }

    }



    // Import double entry service

    const doubleEntryService = require('../services/doubleEntryService');



    // If double-entry accounting is enabled

    if (createCounterEntry) {

      // Validate counter account if provided

      if (counterAccountCode) {

        const counterAccount = await prisma.chartofaccount.findUnique({

          where: { code: counterAccountCode }

        });



        if (!counterAccount) {

          return res.status(404).json({

            success: false,

            message: 'Akun lawan tidak ditemukan'

          });

        }

      } else {

        // Auto-suggest counter account if not provided

        try {

          const suggestedCounterCode = await doubleEntryService.suggestCounterAccount(accountCode, type);

          counterAccountCode = suggestedCounterCode;

        } catch (error) {

          console.error('Error suggesting counter account:', error);

          return res.status(500).json({

            success: false,

            message: 'Gagal menyarankan akun lawan',

            error: error.message

          });

        }

      }



      // Create primary transaction data

      const primaryTransaction = {

        date,

        type,

        accountCode,

        description,

        amount: parseFloat(amount),

        projectId: projectId ? parseInt(projectId) : null,

        notes

      };



      try {

        // Handle recurring transactions

        if (isRecurring && recurringCount > 1) {

          // Generate recurring transactions

          const recurringTransactions = generateRecurringTransactions(

            primaryTransaction,

            recurringFrequency,

            recurringCount

          );

          

          // Create all transactions in a batch

          const createdTransactions = [];

          

          for (const transaction of recurringTransactions) {

            // Generate counter transaction

            const counterTransaction = await doubleEntryService.generateCounterTransaction(

              transaction, 

              counterAccountCode

            );

            

            // Create both transactions in a single database transaction

            const result = await doubleEntryService.createDoubleEntryTransaction(

              transaction,

              counterTransaction

            );

            

            createdTransactions.push(result);

          }

          

          return res.status(201).json({

            success: true,

            message: `${recurringCount} transaksi berulang berhasil ditambahkan`,

            data: {

              count: createdTransactions.length,

              transactions: createdTransactions.map(t => ({

                primary: { id: t.primary.id, date: t.primary.date },

                counter: { id: t.counter.id, date: t.counter.date }

              }))

            }

          });

        } else {

          // Create single transaction pair

          // Generate counter transaction

          const counterTransaction = await doubleEntryService.generateCounterTransaction(

            primaryTransaction, 

            counterAccountCode

          );



          // Create both transactions in a single database transaction

          const result = await doubleEntryService.createDoubleEntryTransaction(

            primaryTransaction,

            counterTransaction

          );



          return res.status(201).json({

            success: true,

            message: 'Transaksi ganda berhasil ditambahkan',

            data: {

              primary: result.primary,

              counter: result.counter

            }

          });

        }

      } catch (error) {

        console.error('Error creating double-entry transaction:', error);

        return res.status(500).json({

          success: false,

          message: 'Gagal menambahkan transaksi ganda',

          error: error.message

        });

      }

    } else {

      // Handle recurring single transactions

      if (isRecurring && recurringCount > 1) {

        // Create transaction data object

        const transactionData = {

          date: new Date(date),

          type,

          accountCode,

          description,

          amount: parseFloat(amount),

          projectId: projectId ? parseInt(projectId) : null,

          notes: notes || undefined,

          updatedAt: new Date()

        };

        

        // Generate recurring transactions

        const recurringTransactions = generateRecurringTransactions(

          transactionData,

          recurringFrequency,

          recurringCount

        );

        

        // Create all transactions in a batch

        const createdTransactions = await prisma.$transaction(

          recurringTransactions.map(transaction => 

            prisma.transaction.create({ data: transaction })

          )

        );

        

        return res.status(201).json({

          success: true,

          message: `${recurringCount} transaksi berulang berhasil ditambahkan`,

          data: {

            count: createdTransactions.length,

            transactions: createdTransactions.map(t => ({

              id: t.id,

              date: t.date

            }))

          }

        });

      } else {

        // Create single transaction (legacy mode)

        const transaction = await prisma.transaction.create({

          data: {

            date: new Date(date),

            type,

            accountCode,

            description,

            amount: parseFloat(amount),

            projectId: projectId ? parseInt(projectId) : null,

            notes: notes || undefined,

            updatedAt: new Date()

          },

          include: {

            chartofaccount: true,

            project: projectId ? {

              select: {

                projectCode: true,

                name: true

              }

            } : undefined

          }

        });



        return res.status(201).json({

          success: true,

          message: 'Transaksi berhasil ditambahkan',

          data: transaction

        });

      }

    }

  } catch (error) {

    res.status(500).json({ 

      success: false, 

      message: 'Error saat menambahkan transaksi',

      error: error.message 

    });

  }

});



/**

 * @route   PUT /api/transactions/:id

 * @desc    Update transaction

 * @access  Private

 */

router.put('/:id', auth, async (req, res) => {

  try {

    const { id } = req.params;

    const { 

      date, 

      type, 

      accountCode, 

      description, 

      amount, 

      projectId,

      notes,

      updateCounterEntry = true 

    } = req.body;



    // Check if transaction exists

    const existingTransaction = await prisma.transaction.findUnique({

      where: { id: parseInt(id) }

    });



    if (!existingTransaction) {

      return res.status(404).json({

        success: false,

        message: 'Transaksi tidak ditemukan'

      });

    }



    // Validate account if changed

    if (accountCode) {

      const account = await prisma.chartofaccount.findUnique({

        where: { code: accountCode }

      });



      if (!account) {

        return res.status(404).json({

          success: false,

          message: 'Akun tidak ditemukan'

        });

      }

    }



    // Validate project if provided

    if (projectId) {

      const project = await prisma.project.findUnique({

        where: { id: parseInt(projectId) }

      });



      if (!project) {

        return res.status(404).json({

          success: false,

          message: 'Proyek tidak ditemukan'

        });

      }

    }



    // Validate transaction type

    const validTypes = ['income', 'expense', 'transfer', 'Pendapatan', 'Beban'];

    if (type && !validTypes.includes(type)) {

      return res.status(400).json({

        success: false,

        message: 'Tipe transaksi tidak valid',

        validTypes

      });

    }



    // Import double entry service if needed

    const doubleEntryService = require('../services/doubleEntryService');
    


    // Check if this is part of a double-entry transaction

    let result;
    

    if (updateCounterEntry) {

      try {

        // Find the counter transaction

        const counterTransaction = await doubleEntryService.findCounterTransaction(parseInt(id));
        

        if (counterTransaction) {

          // Prepare update data for primary transaction

          const primaryTransactionUpdate = {

            date: date || undefined,

            type: type || undefined,

            accountCode: accountCode || undefined,

            description: description || undefined,

            amount: amount || undefined,

            projectId: projectId,

            notes: notes || undefined

          };
          

          // Generate counter transaction update data

          let counterAccountCode = counterTransaction.accountCode;

          if (accountCode) {

            // If primary account changed, suggest a new counter account

            try {

              counterAccountCode = await doubleEntryService.suggestCounterAccount(accountCode, type || existingTransaction.type);

            } catch (error) {

              console.error('Error suggesting new counter account:', error);

              // Keep existing counter account if suggestion fails

              counterAccountCode = counterTransaction.accountCode;

            }

          }
          

          // Determine counter type based on primary type

          let counterType = counterTransaction.type;

          if (type) {

            // If primary type changed, adjust counter type accordingly

            counterType = type === 'income' ? 'expense' : 'income';

          }
          

          // Prepare update data for counter transaction

          const counterTransactionUpdate = {

            date: date || undefined,

            type: counterType,

            accountCode: counterAccountCode,

            description: `Counter entry for: ${description || existingTransaction.description}`,

            amount: amount || undefined,

            projectId: projectId,

            notes: `Counter transaction for ${accountCode || existingTransaction.accountCode}`

          };
          

          // Update both transactions in a transaction

          result = await doubleEntryService.updateDoubleEntryTransaction(

            parseInt(id),

            counterTransaction.id,

            primaryTransactionUpdate,

            counterTransactionUpdate

          );
          

          return res.json({

            success: true,

            message: 'Transaksi ganda berhasil diperbarui',

            data: {

              primary: result.primary,

              counter: result.counter

            }

          });

        } else {

          console.log('No counter transaction found, updating single transaction');

        }

      } catch (error) {

        console.error('Error updating double-entry transaction:', error);

        // Fall back to regular update if double-entry update fails

      }

    }
    

    // If not double-entry or counter not found, update single transaction

    const updatedTransaction = await prisma.transaction.update({

      where: { id: parseInt(id) },

      data: {

        date: date ? new Date(date) : undefined,

        type,

        accountCode,

        description,

        amount: amount ? parseFloat(amount) : undefined,

        projectId: projectId ? parseInt(projectId) : projectId === null ? null : undefined,

        notes,

        updatedAt: new Date()

      }

    });



    res.json({

      success: true,

      message: 'Transaksi berhasil diperbarui',

      data: updatedTransaction

    });

  } catch (error) {

    res.status(500).json({ 

      success: false, 

      message: 'Error saat memperbarui transaksi',

      error: error.message 

    });

  }

});



/**

 * @route   DELETE /api/transactions/:id

 * @desc    Delete transaction

 * @access  Private

 */

router.delete('/:id', auth, async (req, res) => {

  try {

    const { id } = req.params;



    // Check if transaction exists

    const existingTransaction = await prisma.transaction.findUnique({

      where: { id: parseInt(id) }

    });



    if (!existingTransaction) {

      return res.status(404).json({

        success: false,

        message: 'Transaksi tidak ditemukan'

      });

    }



    // Delete transaction

    await prisma.transaction.delete({

      where: { id: parseInt(id) }

    });



    res.json({

      success: true,

      message: 'Transaksi berhasil dihapus'

    });

  } catch (error) {

    res.status(500).json({ 

      success: false, 

      message: 'Error saat menghapus transaksi',

      error: error.message 

    });

  }

});



/**

 * @route   GET /api/transactions/export

 * @desc    Export transactions to Excel

 * @access  Private

 */

router.get('/export', auth, async (req, res) => {

  try {

    console.log('Starting export process with query params:', req.query);

    

    // Extract filter parameters

    const { type, accountCode, projectId, startDate, endDate } = req.query;

    

    // Build filter object for database query

    const filter = {};

    

    if (type) {

      filter.type = type;

    }

    

    if (accountCode) {

      filter.accountCode = accountCode;

    }

    

    if (projectId) {

      if (projectId === 'null') {

        // Filter for transactions with no project

        filter.projectId = null;

      } else {

        try {

          filter.projectId = parseInt(projectId);

        } catch (error) {

          console.error('Error parsing projectId:', error);

          // Skip this filter if parsing fails

        }

      }

    }

    

    // Date range filter using Prisma syntax

    if (startDate || endDate) {

      filter.date = {};

      if (startDate) {

        try {

          filter.date.gte = new Date(startDate);

        } catch (error) {

          console.error('Error parsing startDate:', error);

          // Use a default date if parsing fails

          filter.date.gte = new Date(0); // Jan 1, 1970

        }

      }

      if (endDate) {

        try {

          filter.date.lte = new Date(endDate);

        } catch (error) {

          console.error('Error parsing endDate:', error);

          // Use current date if parsing fails

          filter.date.lte = new Date();

        }

      }

    }

    

    console.log('Fetching transactions with filter:', JSON.stringify(filter));

    

    // Fetch transactions with related data

    let transactions = [];

    try {

      transactions = await prisma.transaction.findMany({

        where: filter,

        orderBy: {

          date: 'desc'

        },

        include: {

          chartofaccount: true,

          project: {

            include: {

              client: true

            }

          }

        }

      });

      

      console.log(`Found ${transactions.length} transactions`);

    } catch (dbError) {

      console.error('Database error when fetching transactions:', dbError);

      return res.status(500).json({ 

        success: false, 

        message: 'Database error when fetching transactions',

        error: dbError.message 

      });

    }

    

    if (!transactions || transactions.length === 0) {

      return res.status(200).json({

        success: true,

        message: 'No transactions found for the specified filters',

        data: []

      });

    }

    

    // Get filter names for Excel report

    let accountName = null;

    let projectName = null;

    

    if (accountCode) {

      try {

        const account = await prisma.chartofaccount.findUnique({

          where: { code: accountCode }

        });

        accountName = account?.name;

      } catch (error) {

        console.error('Error fetching account name:', error);

      }

    }

    

    if (projectId && projectId !== 'null') {

      try {

        const project = await prisma.project.findUnique({

          where: { id: parseInt(projectId) }

        });

        projectName = project?.name;

      } catch (error) {

        console.error('Error fetching project name:', error);

      }

    } else if (projectId === 'null') {

      projectName = 'No Project';

    }

    

    console.log('Generating Excel file');

    

    // Generate Excel file

    let excelBuffer;

    try {

      excelBuffer = await exportTransactionsToExcel(transactions, {

        filters: {

          type,

          accountName,

          projectName,

          startDate,

          endDate

        }

      });

      

      console.log('Excel file generated successfully');

    } catch (excelError) {

      console.error('Error generating Excel:', excelError);

      return res.status(500).json({ 

        success: false, 

        message: 'Error generating Excel file',

        error: excelError.message 

      });

    }

    

    if (!excelBuffer) {

      console.error('Excel buffer is null or undefined');

      return res.status(500).json({ 

        success: false, 

        message: 'Failed to generate Excel buffer'

      });

    }

    

    // Set response headers for Excel download

    try {

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      res.setHeader('Content-Disposition', `attachment; filename=financial_transactions_${new Date().toISOString().split('T')[0]}.xlsx`);

      

      console.log('Sending Excel file to client');

      

      // Send the Excel file

      return res.status(200).send(excelBuffer);

    } catch (responseError) {

      console.error('Error sending response:', responseError);

      return res.status(500).json({ 

        success: false, 

        message: 'Error sending Excel file',

        error: responseError.message 

      });

    }

    

  } catch (error) {

    console.error('Unexpected error in exportTransactions:', error);

    return res.status(500).json({ 

      success: false, 

      message: 'Unexpected error during export',

      error: error.message 

    });

  }

});



/**

 * @route   GET /api/transactions/suggest-counter/:accountCode

 * @desc    Suggest counter account for double-entry accounting

 * @access  Private

 */

router.get('/suggest-counter/:accountCode', auth, async (req, res) => {

  try {

    const { accountCode } = req.params;

    const { type } = req.query;



    if (!accountCode) {

      return res.status(400).json({

        success: false,

        message: 'Account code is required'

      });

    }



    if (!type || !['income', 'expense', 'Pendapatan', 'Beban'].includes(type)) {

      return res.status(400).json({

        success: false,

        message: 'Valid transaction type (income/expense/Pendapatan/Beban) is required'

      });

    }



    // Map Indonesian types to English for the service

    let mappedType = type;

    if (type === 'Pendapatan') {

      mappedType = 'income';

    } else if (type === 'Beban') {

      mappedType = 'expense';

    }



    // Import double entry service

    const doubleEntryService = require('../services/doubleEntryService');



    try {

      const suggestedAccountCode = await doubleEntryService.suggestCounterAccount(accountCode, mappedType);

      

      // Get account details

      const account = await prisma.chartofaccount.findUnique({

        where: { code: suggestedAccountCode }

      });



      if (!account) {

        return res.status(404).json({

          success: false,

          message: 'Suggested account not found'

        });

      }



      return res.json({

        success: true,

        data: {

          accountCode: account.code,

          name: account.name,

          type: account.type

        }

      });

    } catch (error) {

      console.error('Error suggesting counter account:', error);

      return res.status(500).json({

        success: false,

        message: 'Failed to suggest counter account',

        error: error.message

      });

    }

  } catch (error) {

    res.status(500).json({ 

      success: false, 

      message: 'Error saat menyarankan akun lawan',

      error: error.message 

    });

  }

});



/**

 * @route   GET /api/transactions/chart-data

 * @desc    Get transaction data aggregated by date for charts

 * @access  Private

 */

router.get('/chart-data', auth, async (req, res) => {

  try {

    console.log('Chart data request received with params:', req.query);

    const { startDate, endDate, interval = 'day' } = req.query;

    

    // Build date range filter

    let dateFilter = {};

    if (startDate) {

      dateFilter.gte = new Date(startDate);

    } else {

      // Default to last 30 days if no start date provided

      const defaultStartDate = new Date();

      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      dateFilter.gte = defaultStartDate;

    }

    

    if (endDate) {

      dateFilter.lte = new Date(endDate);

    } else {

      // Default to current date if no end date provided

      dateFilter.lte = new Date();

    }

    

    console.log('Fetching transactions with date filter:', dateFilter);

    

    // Get transactions using a simpler approach

    const rawTransactions = await prisma.transaction.findMany({

      where: {

        date: dateFilter,

        type: {

          in: ['income', 'expense', 'Pendapatan', 'Beban']

        }

      },

      select: {

        date: true,

        type: true,

        amount: true

      },

      orderBy: {

        date: 'asc'

      }

    });

    

    console.log(`Retrieved ${rawTransactions.length} transactions`);

    

    // Convert Prisma Decimal objects to plain numbers using JSON serialization

    // This is the safest way to handle Prisma's Decimal type

    const transactions = JSON.parse(JSON.stringify(rawTransactions));

    

    // Process data for chart - group by date

    const dateMap = new Map();

    

    // Format function based on interval

    const getDateKey = (dateObj) => {

      const d = new Date(dateObj);

      if (interval === 'month') {

        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      } else if (interval === 'week') {

        // Simplified week calculation

        const firstDay = new Date(d.getFullYear(), 0, 1);

        const pastDays = Math.floor((d - firstDay) / 86400000);

        const weekNum = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);

        return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

      } else {

        // Default to day

        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      }

    };

    

    // Group transactions by date

    for (const transaction of transactions) {

      try {

        // Make sure date is a proper Date object

        const dateObj = new Date(transaction.date);

        const dateKey = getDateKey(dateObj);

        

        if (!dateMap.has(dateKey)) {

          dateMap.set(dateKey, {

            date: dateKey,

            income: 0,

            expense: 0,

            net: 0

          });

        }

        

        const entry = dateMap.get(dateKey);

        

        // Amount is now a plain number after JSON.parse(JSON.stringify())

        const amount = parseFloat(transaction.amount) || 0;

        

        if (transaction.type === 'income' || transaction.type === 'Pendapatan') {

          entry.income += amount;

        } else if (transaction.type === 'expense' || transaction.type === 'Beban') {

          entry.expense += amount;

        }

        

        entry.net = entry.income - entry.expense;

      } catch (processingError) {

        console.error('Error processing transaction:', processingError);

        // Continue processing other transactions

      }

    }

    

    console.log(`Grouped transactions into ${dateMap.size} date entries`);

    

    // Convert map to array and sort by date

    const chartData = Array.from(dateMap.values()).sort((a, b) => {

      return a.date.localeCompare(b.date);

    });

    

    // Calculate running totals

    let runningIncome = 0;

    let runningExpense = 0;

    

    chartData.forEach(entry => {

      runningIncome += entry.income;

      runningExpense += entry.expense;

      

      entry.cumulativeIncome = runningIncome;

      entry.cumulativeExpense = runningExpense;

      entry.cumulativeNet = runningIncome - runningExpense;

    });

    

    // Calculate totals

    const totals = {

      income: chartData.reduce((sum, entry) => sum + entry.income, 0),

      expense: chartData.reduce((sum, entry) => sum + entry.expense, 0),

      net: chartData.reduce((sum, entry) => sum + entry.net, 0)

    };

    

    console.log('Successfully processed chart data');

    

    res.json({

      success: true,

      data: chartData,

      totals,

      meta: {

        startDate: dateFilter.gte,

        endDate: dateFilter.lte,

        interval

      }

    });

  } catch (error) {

    console.error('Error fetching chart data:', error);

    res.status(500).json({

      success: false,

      message: 'Error fetching chart data',

      error: error.message,

      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined

    });

  }

});



module.exports = router; 
