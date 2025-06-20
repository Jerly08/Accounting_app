import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useToast } from '@chakra-ui/react';

// API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create context
export const AuthContext = createContext();

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }) => {
  // State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const toast = useToast();
  
  // Ensure baseURL is set correctly
  useEffect(() => {
    // Make sure axios baseURL is set correctly
    if (!axios.defaults.baseURL) {
      axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      console.log('Axios baseURL set to:', axios.defaults.baseURL);
    }
  }, []);
  
  // Setup axios interceptors for authentication
  useEffect(() => {
    // Add request interceptor
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        // Add token to all requests if available
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor
    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        // Handle token expiration
        if (error.response?.status === 401 && isAuthenticated) {
          // Only handle 401 errors when user was authenticated
          console.log('Session expired - logging out');
          setError('Your session has expired. Please log in again.');
          logout();
        }
        return Promise.reject(error);
      }
    );

    // Clean up interceptors when component unmounts
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, isAuthenticated]);
  
  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
          try {
            // Validate that the stored user data is proper JSON
            const parsedUser = JSON.parse(storedUser);
            
            // Set auth state
            setToken(storedToken);
            setUser(parsedUser);
            setIsAuthenticated(true);
            
            console.log("Auth initialized from localStorage successfully");
          } catch (parseError) {
            console.error("Error parsing stored user data:", parseError);
            // Clear invalid storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken('');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          // Clear state if tokens aren't available
          setToken('');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear potentially corrupted storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken('');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  // Login function
  const login = async (username, password) => {
    setLoading(true);
    try {
      console.log('Attempting login with baseURL:', axios.defaults.baseURL);
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      const { token, user } = response.data;

      // Save to local storage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Update auth state
      setToken(token);
      setUser(user);
      setIsAuthenticated(true);
      setError(null);

      // Set authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      console.log('Login successful:', user);
      return user; // Return user for components to know login was successful
    } catch (err) {
      console.error('Login error:', err);
      // Full error details for debugging
      if (err.response) {
        console.error('Error response:', {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers
        });
      } else if (err.request) {
        console.error('No response received:', err.request);
      } else {
        console.error('Error setting up request:', err.message);
      }
      
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      setIsAuthenticated(false);
      setToken('');
      setUser(null);
      throw err; // Re-throw for components to handle
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    setLoading(true);
    try {
      console.log('Attempting registration with baseURL:', axios.defaults.baseURL);
      const response = await axios.post('/api/auth/register', userData);
      
      const { token, user } = response.data;
      
      // Save to local storage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update auth state
      setToken(token);
      setUser(user);
      setIsAuthenticated(true);
      setError(null);
      
      // Set authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('Registration successful:', user);
      return user; // Return user for components to know registration was successful
    } catch (err) {
      console.error('Registration error:', err);
      // Full error details for debugging
      if (err.response) {
        console.error('Error response:', {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers
        });
      } else if (err.request) {
        console.error('No response received:', err.request);
      } else {
        console.error('Error setting up request:', err.message);
      }
      
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      setIsAuthenticated(false);
      setToken('');
      setUser(null);
      throw err; // Re-throw for components to handle
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    try {
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Clear auth state
      setToken('');
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    if (!user || !user.roles) {
      return false;
    }
    return user.roles.includes(role);
  };

  // Update profile function
  const updateProfile = async (userData) => {
    setLoading(true);
    try {
      if (!token || !isAuthenticated) {
        throw new Error('You must be logged in to update your profile');
      }

      console.log('Attempting profile update with baseURL:', axios.defaults.baseURL);
      const response = await axios.put(
        '/api/users/profile', 
        userData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const updatedUser = response.data;
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      setError(null);
      
      console.log('Profile updated successfully:', updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('Profile update error:', err);
      // Full error details for debugging
      if (err.response) {
        console.error('Error response:', {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers
        });
      } else if (err.request) {
        console.error('No response received:', err.request);
      } else {
        console.error('Error setting up request:', err.message);
      }
      
      const errorMessage = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
      
      // Handle 401 errors by logging out
      if (err.response?.status === 401) {
        logout();
      }
      
      throw err; // Re-throw for components to handle
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const contextValue = {
    user,
    token,
    loading,
    isAuthenticated,
    error,
    login,
    logout,
    register,
    updateProfile,
    hasRole
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 