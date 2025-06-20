import axios from 'axios';

// Konfigurasi default Axios
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
    
    console.log('Axios baseURL initialized to:', API_URL);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor untuk handling response
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
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

export default api; 