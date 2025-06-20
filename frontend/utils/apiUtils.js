import axios from 'axios';

/**
 * Utility class untuk membantu diagnosa koneksi API
 */
class ApiUtils {
  /**
   * Mengecek koneksi ke API server
   * @param {string} baseUrl - Base URL API (opsional)
   * @returns {Promise<Object>} - Status koneksi
   */
  static async checkApiConnection(baseUrl = null) {
    try {
      const url = baseUrl || axios.defaults.baseURL || 'http://localhost:5000';
      console.log(`Checking API connection to: ${url}/api/health`);
      
      const startTime = Date.now();
      const response = await axios.get(`${url}/api/health`, { timeout: 10000 });
      const endTime = Date.now();
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        responseTime: endTime - startTime,
        message: 'API connection successful'
      };
    } catch (error) {
      console.error('API connection check failed:', error);
      
      let errorDetails = {
        success: false,
        message: 'API connection failed',
        error: error.message
      };
      
      if (error.response) {
        // Server merespons dengan status error
        errorDetails = {
          ...errorDetails,
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        };
      } else if (error.request) {
        // Request dibuat tapi tidak ada response
        errorDetails = {
          ...errorDetails,
          request: true,
          message: 'No response from server'
        };
      }
      
      return errorDetails;
    }
  }
  
  /**
   * Mengecek token dan autentikasi
   * @param {string} token - JWT token
   * @returns {Promise<Object>} - Status token
   */
  static async verifyToken(token) {
    if (!token) {
      return {
        success: false,
        message: 'No token provided'
      };
    }
    
    try {
      const url = axios.defaults.baseURL || 'http://localhost:5000';
      const response = await axios.get(`${url}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        message: 'Token is valid'
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      
      let errorDetails = {
        success: false,
        message: 'Token verification failed',
        error: error.message
      };
      
      if (error.response) {
        errorDetails = {
          ...errorDetails,
          status: error.response.status,
          data: error.response.data
        };
        
        // Token tidak valid/expired
        if (error.response.status === 401) {
          errorDetails.message = 'Token is invalid or expired';
        }
      }
      
      return errorDetails;
    }
  }
  
  /**
   * Memeriksa semua endpoint API penting
   * @returns {Promise<Object>} - Status untuk semua endpoint
   */
  static async checkAllEndpoints() {
    const url = axios.defaults.baseURL || 'http://localhost:5000';
    const endpoints = [
      '/api/health',
      '/api/settings',
      '/api/dashboard'
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Checking endpoint: ${url}${endpoint}`);
        const response = await axios.get(`${url}${endpoint}`, { 
          timeout: 5000,
          validateStatus: false // untuk menerima status code apapun
        });
        
        results[endpoint] = {
          success: response.status >= 200 && response.status < 300,
          status: response.status,
          message: `Status code: ${response.status}`
        };
      } catch (error) {
        results[endpoint] = {
          success: false,
          error: error.message,
          message: 'Request failed'
        };
      }
    }
    
    return results;
  }
  
  /**
   * Mendapatkan informasi konfigurasi axios
   * @returns {Object} - Konfigurasi axios
   */
  static getAxiosConfig() {
    return {
      baseURL: axios.defaults.baseURL,
      timeout: axios.defaults.timeout,
      headers: axios.defaults.headers.common
    };
  }
}

export default ApiUtils; 