import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  VStack,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// Fungsi untuk mendapatkan URL API yang sesuai
const getApiUrl = (endpoint) => {
  // Jika endpoint sudah diawali dengan '/', hapus '/' di awal
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Jika process.env.NEXT_PUBLIC_API_URL tersedia, gunakan itu sebagai baseURL
  if (process.env.NEXT_PUBLIC_API_URL) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    // Pastikan ada '/' di antara baseUrl dan endpoint
    const separator = baseUrl.endsWith('/') ? '' : '/';
    return `${baseUrl}${separator}${cleanEndpoint}`;
  }
  
  // Jika tidak, gunakan endpoint relatif (axios.defaults.baseURL akan digunakan)
  return `/${cleanEndpoint}`;
};

const ClientForm = ({ isOpen, onClose, client, onSubmit }) => {
  const initialFormData = {
    name: '',
    phone: '',
    email: '',
    address: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const { token, isAuthenticated } = useAuth();

  // Check authentication status
  useEffect(() => {
    if (isOpen && (!token || !isAuthenticated)) {
      toast({
        title: 'Authentication Error',
        description: 'Your session has expired. Please login again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      onClose(); // Close the modal if not authenticated
    }
  }, [isOpen, token, isAuthenticated, toast, onClose]);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [client, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{8,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!token || !isAuthenticated) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to perform this action',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      onClose(); // Close the modal as the user is not authenticated
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      
      if (client) {
        // Update existing client
        console.log('Updating client with ID:', client.id);
        const apiUrl = getApiUrl(`api/clients/${client.id}`);
        console.log('PUT request to:', apiUrl);
        
        await axios.put(apiUrl, formData, config);
        
        toast({
          title: 'Success',
          description: 'Client updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new client
        console.log('Creating new client');
        const apiUrl = getApiUrl('api/clients');
        console.log('POST request to:', apiUrl);
        
        await axios.post(apiUrl, formData, config);
        
        toast({
          title: 'Success',
          description: 'Client created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      if (onSubmit) {
        onSubmit();
      }
      
      onClose(); // Close modal on success
    } catch (error) {
      console.error('Error saving client:', error);
      
      // Detailed error logging for debugging
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      // Check if error is due to authentication
      if (error.response?.status === 401) {
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please login again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        onClose(); // Close the modal as authentication failed
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to save client';
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{client ? 'Edit Client' : 'Add New Client'}</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={errors.name}>
                <FormLabel>Name</FormLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter client name"
                />
                <FormErrorMessage>{errors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.phone}>
                <FormLabel>Phone</FormLabel>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
                <FormErrorMessage>{errors.phone}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.email}>
                <FormLabel>Email</FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.address}>
                <FormLabel>Address</FormLabel>
                <Textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter full address"
                  rows={3}
                />
                <FormErrorMessage>{errors.address}</FormErrorMessage>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button 
              colorScheme="teal" 
              type="submit" 
              isLoading={isSubmitting}
              loadingText="Saving"
            >
              {client ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default ClientForm; 