import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@chakra-ui/react';
import { useAuth } from './AuthContext';

// Membuat context untuk pengaturan
const SettingsContext = createContext();

// Provider component untuk pengaturan
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();
  const { isAuthenticated, token } = useAuth();

  // Mendapatkan pengaturan dari API
  const fetchSettings = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Log untuk debugging
      console.log('Fetching settings with baseURL:', axios.defaults.baseURL);
      console.log('Token available:', !!token);
      
      // Gunakan URL lengkap untuk menghindari masalah dengan baseURL
      const apiUrl = axios.defaults.baseURL || 'http://localhost:5000';
      console.log('Using full API URL:', `${apiUrl}/api/settings`);
      
      const response = await axios.get(`${apiUrl}/api/settings`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Set timeout lebih panjang
        timeout: 30000
      });
      
      if (response.data) {
        console.log('Settings data received:', response.data);
        setSettings(response.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      
      // Log detail error untuk debugging
      if (err.response) {
        // Server merespons dengan status error
        console.error('Error response from server:', {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers
        });
      } else if (err.request) {
        // Request dibuat tapi tidak ada respons
        console.error('No response received:', err.request);
      } else {
        // Error saat setup request
        console.error('Error setting up request:', err.message);
      }
      
      // Set error yang lebih informatif
      const errorMsg = err.message || err.response?.data?.message || 'Gagal memuat pengaturan';
      setError(errorMsg);
      
      toast({
        title: 'Error',
        description: `Gagal memuat pengaturan aplikasi: ${errorMsg}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Memperbarui pengaturan melalui API
  const updateSettings = async (newSettings) => {
    if (!isAuthenticated || !token) {
      toast({
        title: 'Error',
        description: 'Anda harus login untuk memperbarui pengaturan',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const apiUrl = axios.defaults.baseURL || 'http://localhost:5000';
      console.log('Updating settings with URL:', `${apiUrl}/api/settings`);
      
      const response = await axios.put(`${apiUrl}/api/settings`, newSettings, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      if (response.data.settings) {
        setSettings(response.data.settings);
        setError(null);
        toast({
          title: 'Sukses',
          description: 'Pengaturan aplikasi berhasil disimpan',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        return { success: true };
      }
    } catch (err) {
      console.error('Error updating settings:', err);
      
      // Log detail error untuk debugging
      if (err.response) {
        // Server merespons dengan status error
        console.error('Error response from server:', {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers
        });
      } else if (err.request) {
        // Request dibuat tapi tidak ada respons
        console.error('No response received:', err.request);
      } else {
        // Error saat setup request
        console.error('Error setting up request:', err.message);
      }
      
      const errorMsg = err.message || err.response?.data?.message || 'Gagal memperbarui pengaturan';
      setError(errorMsg);
      
      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Mendapatkan nilai pengaturan berdasarkan key
  const getSetting = (key, defaultValue = null) => {
    if (!settings) return defaultValue;
    return settings[key] !== undefined ? settings[key] : defaultValue;
  };

  // Mengambil pengaturan ketika aplikasi dimulai atau pengguna login
  useEffect(() => {
    if (isAuthenticated) {
      // Coba ambil pengaturan dengan delay untuk memastikan token sudah siap
      const timer = setTimeout(() => {
        fetchSettings();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Nilai yang disediakan oleh context
  const value = {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
    getSetting,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook untuk menggunakan context pengaturan
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext; 