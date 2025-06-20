import axios from 'axios';

// Create axios instance with default config
const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to inject auth token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle expired token or unauthorized access
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (typeof window !== 'undefined') {
        // If unauthorized, redirect to login page (but avoid infinite loops)
        const isLoginPage = window.location.pathname === '/login';
        if (!isLoginPage) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to fetch data with pagination
export const fetchWithPagination = async (url, params = {}) => {
  try {
    const response = await axiosClient.get(url, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
};

// Helper function to get a single item by id
export const fetchById = async (url, id) => {
  try {
    const response = await axiosClient.get(`${url}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching item from ${url}/${id}:`, error);
    throw error;
  }
};

// Helper function to create an item
export const createItem = async (url, data) => {
  try {
    const response = await axiosClient.post(url, data);
    return response.data;
  } catch (error) {
    console.error(`Error creating item at ${url}:`, error);
    throw error;
  }
};

// Helper function to update an item
export const updateItem = async (url, id, data) => {
  try {
    const response = await axiosClient.put(`${url}/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating item at ${url}/${id}:`, error);
    throw error;
  }
};

// Helper function to delete an item
export const deleteItem = async (url, id) => {
  try {
    const response = await axiosClient.delete(`${url}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting item at ${url}/${id}:`, error);
    throw error;
  }
};

export default axiosClient; 