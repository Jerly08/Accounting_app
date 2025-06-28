import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useToast } from '@chakra-ui/react';

// API URL from environment variables with fallback
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const toast = useToast();
  
  // Token refresh timer
  const tokenRefreshTimer = useRef(null);
  
  // Ensure baseURL is set correctly - this is crucial for fast API responses
  useEffect(() => {
    // Make sure axios baseURL is set correctly
    axios.defaults.baseURL = API_URL;
    console.log('Axios baseURL set to:', axios.defaults.baseURL);
    
    // Set default timeout to be shorter
    axios.defaults.timeout = 5000; // 5 seconds timeout
  }, []);
  
  // Setup axios interceptors for authentication
  useEffect(() => {
    // Add request interceptor
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        // Add token to all requests if available
        const currentToken = localStorage.getItem('token') || token;
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
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
        console.log('Initializing authentication state...');
        setLoading(true);
        
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
          try {
            // Validate that the stored user data is proper JSON
            const parsedUser = JSON.parse(storedUser);
            
            console.log('Found stored credentials, setting auth state');
            console.log('User role from localStorage:', parsedUser.role);
            
            // Set auth state
            setToken(storedToken);
            setUser(parsedUser);
            setIsAuthenticated(true);
            setIsAdmin(parsedUser.role === 'admin');
            
            // Set axios default header for all future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            
            console.log("Auth initialized from localStorage successfully");
            console.log("isAdmin set to:", parsedUser.role === 'admin');
            
            // Verify token is still valid with a quick API call
            try {
              await validateToken(storedToken);
              console.log('Token validated successfully');
            } catch (validationError) {
              console.error('Token validation failed:', validationError);
              clearAuthState();
            }
          } catch (parseError) {
            console.error("Error parsing stored user data:", parseError);
            // Clear invalid storage
            clearAuthState();
          }
        } else {
          console.log('No stored credentials found');
          // Clear state if tokens aren't available
          clearAuthState();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear potentially corrupted storage
        clearAuthState();
      } finally {
        console.log('Auth initialization complete');
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);
  
  // Helper to clear auth state
  const clearAuthState = useCallback(() => {
    console.log('Clearing authentication state');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear any token refresh timers
    if (tokenRefreshTimer.current) {
      clearTimeout(tokenRefreshTimer.current);
      tokenRefreshTimer.current = null;
    }
  }, []);
  
  // Validate token with the server
  const validateToken = async (currentToken) => {
    try {
      console.log('Validating token with server...');
      // Make a lightweight call to verify token
      await axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${currentToken}` },
        timeout: 3000 // Short timeout for this check
      });
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      // If token is invalid, clear auth state
      clearAuthState();
      setError('Your session has expired. Please log in again.');
      return false;
    }
  };

  // Login function
  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      console.log('Attempting login with baseURL:', axios.defaults.baseURL);
      console.log('Login endpoint:', '/api/auth/login');
      console.log('Login credentials:', { username, password: '******' });
      
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      console.log('Login response:', response.status, response.statusText);
      const { token, user } = response.data;
      
      console.log('Login user data:', { ...user, password: undefined });
      console.log('User role from login:', user.role);

      // Save to local storage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Update auth state
      setToken(token);
      setUser(user);
      setIsAuthenticated(true);
      setIsAdmin(user.role === 'admin');
      console.log('isAdmin set after login:', user.role === 'admin');
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
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      console.log('Attempting registration with baseURL:', axios.defaults.baseURL);
      console.log('Register endpoint:', '/api/auth/register');
      console.log('Registration data:', { ...userData, password: '******' });
      
      const response = await axios.post('/api/auth/register', userData);

      console.log('Registration response:', response.status, response.statusText);
      const { token, user } = response.data;

      if (token && user) {
        // Save to local storage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Update auth state
        setToken(token);
        setUser(user);
        setIsAuthenticated(true);
        setIsAdmin(user.role === 'admin');
        setError(null);

        // Set authorization header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        console.log('Registration successful:', user);
        return user; // Return user for components to know registration was successful
      } else {
        // Registration successful but no auto-login
        console.log('Registration successful, but no auto-login token provided');
        return response.data;
      }
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
      throw err; // Re-throw for components to handle
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = async () => {
    try {
      // Call the logout API endpoint to invalidate token
      if (token) {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
      
      // Clear all auth data regardless of API call success
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      
      // Clear all localStorage items related to auth
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.clear(); // Clear all localStorage to prevent any auth data persistence
      
      // Remove authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      // Clear any token refresh timers
      if (tokenRefreshTimer.current) {
        clearTimeout(tokenRefreshTimer.current);
        tokenRefreshTimer.current = null;
      }
      
      // Show toast notification
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      // Force reload the page to clear any in-memory state
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if API call fails
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      localStorage.clear();
      delete axios.defaults.headers.common['Authorization'];
      
      if (tokenRefreshTimer.current) {
        clearTimeout(tokenRefreshTimer.current);
        tokenRefreshTimer.current = null;
      }
      
      window.location.href = '/login';
    }
  };

  // Check if user has a specific role
  const hasRole = useCallback((role) => {
    if (!user) return false;
    return user.role === role || user.role === 'admin';
  }, [user]);
  
  // Check and update admin status with the server
  const checkAdminStatus = useCallback(async () => {
    if (!token || !isAuthenticated) return false;
    
    try {
      console.log('Verifying admin status with server...');
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Check if the response contains user data with role
      if (response.data && response.data.user && response.data.user.role) {
        const serverRole = response.data.user.role;
        console.log('Server verified user role:', serverRole);
        
        // Update context if needed
        if (serverRole === 'admin' && !isAdmin) {
          console.log('Updating context with admin role from server');
          setIsAdmin(true);
          
          // Update user object in context and localStorage
          if (user) {
            const updatedUser = { ...user, role: 'admin' };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        }
        
        return serverRole === 'admin';
      }
      
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }, [token, isAuthenticated, user, isAdmin]);

  // Provide the context value
  const contextValue = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    loading,
    error,
    login,
    logout,
    register,
    validateToken,
    clearAuthState,
    hasRole,
    checkAdminStatus
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 