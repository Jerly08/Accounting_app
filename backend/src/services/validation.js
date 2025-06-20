/**
 * Validation Service
 * Service untuk validasi data dan error handling
 */

/**
 * Validasi data proyek
 * @param {Object} projectData - Data proyek
 * @returns {Object} - Hasil validasi
 */
const validateProject = (projectData) => {
  const errors = {};
  
  // Validasi nama proyek
  if (!projectData.name || projectData.name.trim() === '') {
    errors.name = 'Nama proyek wajib diisi';
  }
  
  // Validasi kode proyek
  if (!projectData.projectCode || projectData.projectCode.trim() === '') {
    errors.projectCode = 'Kode proyek wajib diisi';
  }
  
  // Validasi client ID
  if (!projectData.clientId) {
    errors.clientId = 'Client wajib dipilih';
  }
  
  // Validasi tanggal mulai
  if (!projectData.startDate) {
    errors.startDate = 'Tanggal mulai wajib diisi';
  }
  
  // Validasi nilai proyek
  if (!projectData.totalValue || isNaN(Number(projectData.totalValue)) || Number(projectData.totalValue) <= 0) {
    errors.totalValue = 'Nilai proyek harus berupa angka positif';
  }
  
  // Validasi status
  if (!projectData.status) {
    errors.status = 'Status proyek wajib dipilih';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validasi data biaya proyek
 * @param {Object} costData - Data biaya proyek
 * @returns {Object} - Hasil validasi
 */
const validateProjectCost = (costData) => {
  const errors = {};
  
  // Validasi project ID
  if (!costData.projectId) {
    errors.projectId = 'Proyek wajib dipilih';
  }
  
  // Validasi kategori
  if (!costData.category || costData.category.trim() === '') {
    errors.category = 'Kategori biaya wajib diisi';
  }
  
  // Validasi deskripsi
  if (!costData.description || costData.description.trim() === '') {
    errors.description = 'Deskripsi biaya wajib diisi';
  }
  
  // Validasi jumlah
  if (!costData.amount || isNaN(Number(costData.amount)) || Number(costData.amount) <= 0) {
    errors.amount = 'Jumlah biaya harus berupa angka positif';
  }
  
  // Validasi tanggal
  if (!costData.date) {
    errors.date = 'Tanggal biaya wajib diisi';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validasi data penagihan
 * @param {Object} billingData - Data penagihan
 * @returns {Object} - Hasil validasi
 */
const validateBilling = (billingData) => {
  const errors = {};
  
  // Validasi project ID
  if (!billingData.projectId) {
    errors.projectId = 'Proyek wajib dipilih';
  }
  
  // Validasi tanggal penagihan
  if (!billingData.billingDate) {
    errors.billingDate = 'Tanggal penagihan wajib diisi';
  }
  
  // Validasi persentase
  if (billingData.percentage !== undefined) {
    if (isNaN(Number(billingData.percentage)) || Number(billingData.percentage) <= 0 || Number(billingData.percentage) > 100) {
      errors.percentage = 'Persentase harus berupa angka antara 0 dan 100';
    }
  }
  
  // Validasi jumlah
  if (!billingData.amount || isNaN(Number(billingData.amount)) || Number(billingData.amount) <= 0) {
    errors.amount = 'Jumlah penagihan harus berupa angka positif';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validasi data aset tetap
 * @param {Object} assetData - Data aset tetap
 * @returns {Object} - Hasil validasi
 */
const validateFixedAsset = (assetData) => {
  const errors = {};
  
  // Validasi nama aset
  if (!assetData.assetName || assetData.assetName.trim() === '') {
    errors.assetName = 'Nama aset wajib diisi';
  }
  
  // Validasi tanggal perolehan
  if (!assetData.acquisitionDate) {
    errors.acquisitionDate = 'Tanggal perolehan wajib diisi';
  }
  
  // Validasi nilai aset
  if (!assetData.value || isNaN(Number(assetData.value)) || Number(assetData.value) <= 0) {
    errors.value = 'Nilai aset harus berupa angka positif';
  }
  
  // Validasi masa manfaat
  if (!assetData.usefulLife || isNaN(Number(assetData.usefulLife)) || Number(assetData.usefulLife) <= 0) {
    errors.usefulLife = 'Masa manfaat harus berupa angka positif';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validasi data transaksi
 * @param {Object} transactionData - Data transaksi
 * @returns {Object} - Hasil validasi
 */
const validateTransaction = (transactionData) => {
  const errors = {};
  
  // Validasi tanggal
  if (!transactionData.date) {
    errors.date = 'Tanggal transaksi wajib diisi';
  }
  
  // Validasi tipe
  if (!transactionData.type || !['debit', 'credit'].includes(transactionData.type)) {
    errors.type = 'Tipe transaksi harus debit atau credit';
  }
  
  // Validasi kode akun
  if (!transactionData.accountCode || transactionData.accountCode.trim() === '') {
    errors.accountCode = 'Kode akun wajib diisi';
  }
  
  // Validasi deskripsi
  if (!transactionData.description || transactionData.description.trim() === '') {
    errors.description = 'Deskripsi transaksi wajib diisi';
  }
  
  // Validasi jumlah
  if (!transactionData.amount || isNaN(Number(transactionData.amount)) || Number(transactionData.amount) <= 0) {
    errors.amount = 'Jumlah transaksi harus berupa angka positif';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Format error response
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default error message
 * @returns {Object} - Formatted error response
 */
const formatErrorResponse = (error, defaultMessage = 'Terjadi kesalahan pada server') => {
  console.error(error);
  
  // Check if it's a Prisma error
  if (error.code && error.code.startsWith('P')) {
    // Handle Prisma specific errors
    switch (error.code) {
      case 'P2002':
        return {
          success: false,
          message: 'Data dengan nilai yang sama sudah ada',
          error: `Duplicate entry for ${error.meta?.target?.join(', ')}`
        };
      case 'P2003':
        return {
          success: false,
          message: 'Data yang direferensikan tidak ditemukan',
          error: error.message
        };
      case 'P2025':
        return {
          success: false,
          message: 'Data tidak ditemukan',
          error: error.message
        };
      default:
        return {
          success: false,
          message: 'Database error',
          error: error.message
        };
    }
  }
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    return {
      success: false,
      message: 'Validasi gagal',
      errors: error.errors
    };
  }
  
  // Handle authentication errors
  if (error.name === 'AuthenticationError') {
    return {
      success: false,
      message: 'Autentikasi gagal',
      error: error.message
    };
  }
  
  // Handle authorization errors
  if (error.name === 'AuthorizationError') {
    return {
      success: false,
      message: 'Anda tidak memiliki izin untuk melakukan operasi ini',
      error: error.message
    };
  }
  
  // Default error response
  return {
    success: false,
    message: defaultMessage,
    error: error.message
  };
};

module.exports = {
  validateProject,
  validateProjectCost,
  validateBilling,
  validateFixedAsset,
  validateTransaction,
  formatErrorResponse
}; 