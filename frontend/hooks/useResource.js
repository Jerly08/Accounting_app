import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import axiosClient, { 
  fetchWithPagination, 
  fetchById, 
  createItem, 
  updateItem, 
  deleteItem 
} from '../utils/axiosClient';

/**
 * Custom hook for managing API resources with CRUD operations
 * @param {string} endpoint - API endpoint for the resource
 * @param {Object} options - Options for the hook
 */
const useResource = (endpoint, options = {}) => {
  const {
    initialFilters = {},
    initialPagination = { page: 1, limit: 10 },
    onSuccess = () => {},
    onError = () => {},
    autoFetch = true
  } = options;

  const [data, setData] = useState([]);
  const [item, setItem] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState(initialPagination);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const toast = useToast();

  // Fetch data with current filters and pagination
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      
      const response = await fetchWithPagination(endpoint, queryParams);
      
      if (response.success) {
        setData(response.data);
        setSummary(response.summary || {});
        
        if (response.pagination) {
          setTotalItems(response.pagination.total || 0);
          setTotalPages(response.pagination.totalPages || 0);
        }
        
        onSuccess(response);
      } else {
        throw new Error(response.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      onError(err);
      
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to fetch data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [endpoint, filters, pagination, onSuccess, onError, toast]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  // Fetch single item by ID
  const fetchItem = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchById(endpoint, id);
      
      if (response.success) {
        setItem(response.data);
        onSuccess(response);
        return response.data;
      } else {
        throw new Error(response.message || `Failed to fetch ${endpoint.replace('/api/', '')}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      onError(err);
      
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || `Failed to fetch ${endpoint.replace('/api/', '')}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, onSuccess, onError, toast]);

  // Create new item
  const create = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await createItem(endpoint, data);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: response.message || 'Item created successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        onSuccess(response);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create item');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      onError(err);
      
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to create item',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, onSuccess, onError, toast]);

  // Update existing item
  const update = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await updateItem(endpoint, id, data);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: response.message || 'Item updated successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        onSuccess(response);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update item');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      onError(err);
      
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to update item',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, onSuccess, onError, toast]);

  // Delete item
  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await deleteItem(endpoint, id);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: response.message || 'Item deleted successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        onSuccess(response);
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete item');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      onError(err);
      
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to delete item',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [endpoint, onSuccess, onError, toast]);

  // Set filters and reset pagination to page 1
  const setResourceFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  }, []);

  // Handle pagination change
  const setPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  // Handle page size change
  const setLimit = useCallback((limit) => {
    setPagination(prev => ({ ...prev, limit, page: 1 })); // Reset to first page when changing limit
  }, []);

  return {
    data,
    item,
    loading,
    error,
    pagination: {
      ...pagination,
      totalItems,
      totalPages,
    },
    summary,
    filters,
    fetchData,
    fetchItem,
    create,
    update,
    remove,
    setFilters: setResourceFilters,
    setPage,
    setLimit,
  };
};

export default useResource; 