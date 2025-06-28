const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import the Prisma client utility
const { testConnection, connect } = require('./utils/prisma');

// Import logger
const logger = require('./utils/logger');
const { developmentLogger, productionLogger } = require('./middleware/requestLogger');

// Import routes
const clientRoutes = require('./routes/clients');
const accountRoutes = require('./routes/accounts');
const chartOfAccountsRoutes = require('./routes/chartofaccounts');
const projectRoutes = require('./routes/projects');
const billingRoutes = require('./routes/billings');
const assetRoutes = require('./routes/assets');
const transactionRoutes = require('./routes/transactions');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const wipRoutes = require('./routes/wip');
const profitabilityRoutes = require('./routes/profitability');
const settingsRoutes = require('./routes/settings');
const balanceSheetRoutes = require('./routes/balanceSheet');
const cashFlowRoutes = require('./routes/cashFlow');
const reportsRoutes = require('./routes/reports');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Konfigurasi CORS yang lebih spesifik
const corsOptions = {
  origin: function(origin, callback) {
    // Allow all origins during development
    // In production, you should restrict this to specific origins
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`, {
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Gunakan logger berdasarkan environment
if (NODE_ENV === 'production') {
  app.use(productionLogger);
  logger.info('Server running in production mode');
} else {
  app.use(developmentLogger);
  logger.info('Server running in development mode');
}

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/chartofaccounts', chartOfAccountsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/billings', billingRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/wip', wipRoutes);
app.use('/api/profitability', profitabilityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/balance-sheet', balanceSheetRoutes);
app.use('/api/cash-flow', cashFlowRoutes);
app.use('/api/reports', reportsRoutes);

// Apply WIP monitoring middleware after routes to avoid conflicts
app.use((req, res, next) => {
  // Mencatat rute yang dipanggil untuk debugging jika bukan GET request
  if (req.method !== 'GET') {
    logger.info('WIP Monitor detecting a change', {
      path: req.originalUrl,
      method: req.method
    });
    
    // Jika ada perubahan pada project, cost, atau billing, kita bisa memproses WIP update di sini
    if (
      req.method === 'POST' || 
      req.method === 'PUT' || 
      req.method === 'PATCH'
    ) {
      if (
        req.originalUrl.includes('/api/projects') || 
        req.originalUrl.includes('/api/costs') || 
        req.originalUrl.includes('/api/billings')
      ) {
        logger.info('Change detected that may affect WIP calculations', {
          endpoint: req.originalUrl
        });
        
        // Di sini kita bisa memanggil service untuk update WIP jika diperlukan
        // Untuk saat ini, kita hanya mencatat perubahannya
      }
    }
  }
  
  // Lanjut ke middleware berikutnya
  next();
});

// Test endpoint untuk memeriksa koneksi
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Cron job untuk menjalankan perhitungan penyusutan aset tetap secara otomatis
// Ini akan dijalankan setiap hari pada jam 00:00
const cron = require('node-cron');
const depreciationService = require('./services/depreciation');

// Daily depreciation update - runs every day at midnight
cron.schedule('0 0 * * *', async () => {
  logger.info('Running automatic depreciation calculation...');
  try {
    const result = await depreciationService.updateAllAssetsDepreciation();
    logger.info('Depreciation calculation completed', { result });
  } catch (error) {
    logger.error('Error running depreciation calculation', { error: error.message });
  }
});

// Monthly depreciation recording with accounting entries - runs on the 1st of each month
cron.schedule('0 0 1 * *', async () => {
  logger.info('Running monthly depreciation recording with accounting entries...');
  try {
    const result = await depreciationService.recordMonthlyDepreciation();
    logger.info('Monthly depreciation recording completed', { result });
  } catch (error) {
    logger.error('Error running monthly depreciation recording', { error: error.message });
  }
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Test database connection before starting the server
async function startServer() {
  try {
    // Test database connection
    await testConnection();
    
    // Explicitly establish connection
    await connect();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server berjalan pada port ${PORT}`, { 
        port: PORT, 
        environment: NODE_ENV,
        corsOrigins: corsOptions.origin
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer(); 