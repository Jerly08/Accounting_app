import { useState, useEffect } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import Layout from '../components/layout/Layout';
import axios from 'axios';
import theme from '../styles/theme';
import '../styles/globals.css';

// Configure axios globally before anything else
const configureAxios = () => {
  // Set default base URL for API requests
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  axios.defaults.baseURL = API_URL;
  
  // Set default timeout
  axios.defaults.timeout = 30000; // 30 seconds
  
  // Set default headers
  axios.defaults.headers.common['Content-Type'] = 'application/json';
  
  // Add interceptor to log all requests in development
  axios.interceptors.request.use(request => {
    console.log(`API Request: ${request.method?.toUpperCase() || 'UNKNOWN'} ${request.baseURL}${request.url}`);
    return request;
  }, error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  });
  
  // Add interceptor to log all responses in development
  axios.interceptors.response.use(response => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  }, error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        url: error.config?.url
      });
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser
      console.error('Request was made but no response:', {
        request: error.request,
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  });
  
  console.log('Axios configured with baseURL:', axios.defaults.baseURL);
};

// Initialize axios configuration
configureAxios();

function MyApp({ Component, pageProps, router }) {
  const [mounted, setMounted] = useState(false);

  // After the component is mounted, we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if the current route is login or register page
  const isAuthPage = router.pathname === '/login' || router.pathname === '/register';
  const isUnauthorizedPage = router.pathname === '/unauthorized';

  // Prevent hydration issues by returning null if not mounted
  if (!mounted) {
    return null;
  }

  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <SettingsProvider>
          {isAuthPage || isUnauthorizedPage ? (
            <Component {...pageProps} />
          ) : (
            <Layout>
              <Component {...pageProps} />
            </Layout>
          )}
        </SettingsProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default MyApp; 