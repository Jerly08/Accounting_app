import axios from 'axios';

// Konfigurasi default Axios
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

console.log('Initializing API with URL:', API_URL);

// Buat instance axios dengan konfigurasi default
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk menambahkan token ke header
api.interceptors.request.use(
  (config) => {
    // Ambil token dari localStorage jika ada
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Jika token ada, tambahkan ke header Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      hasToken: !!token
    });
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor untuk handling response
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      method: response.config.method
    });
    return response;
  },
  (error) => {
    // Log detailed error information
    console.error('API Response Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    
    // Handle unauthorized errors (401)
    if (error.response && error.response.status === 401) {
      // Redirect ke halaman login jika di client-side
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Set default axios baseURL for other imports
axios.defaults.baseURL = API_URL;

export default api; 