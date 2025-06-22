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
  Select,
  useToast,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const ACCOUNT_TYPES = ['Pendapatan', 'Beban', 'Aktiva', 'Aset Tetap', 'Kontra Aset'];

const AccountForm = ({ isOpen, onClose, account, onSubmitSuccess, accountTypes = ACCOUNT_TYPES }) => {
  const initialFormData = {
    code: '',
    name: '',
    type: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const toast = useToast();
  const { token, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (account) {
      setFormData({
        code: account.code || '',
        name: account.name || '',
        type: account.type || '',
      });
      setIsEditMode(true);
    } else {
      setFormData(initialFormData);
      setIsEditMode(false);
    }
    setErrors({});
    setSubmitError('');
  }, [account, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.code.trim()) {
      newErrors.code = 'Account code is required';
    } else if (!/^\d{4}$/.test(formData.code.trim())) {
      newErrors.code = 'Account code must be a 4-digit number';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    }
    
    if (!formData.type) {
      newErrors.type = 'Account type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if account code already exists
  const checkAccountCodeExists = async (code) => {
    if (!token || !isAuthenticated) return false;
    
    try {
      setIsCheckingCode(true);
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      
      const response = await axios.get(`/api/accounts/${code}`, config);
      
      // If we get a successful response, the account exists
      return response.data && response.data.success;
    } catch (error) {
      // If we get a 404, the account doesn't exist (which is what we want)
      if (error.response && error.response.status === 404) {
        return false;
      }
      // For any other error, we'll assume it doesn't exist to allow the user to try
      console.error('Error checking account code:', error);
      return false;
    } finally {
      setIsCheckingCode(false);
    }
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
    
    // Clear submit error when any field changes
    if (submitError) {
      setSubmitError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Show toast for validation errors
      toast({
        title: 'Validation Error',
        description: 'Please correct the errors in the form before submitting.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
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
    
    if (!isAdmin) {
      toast({
        title: 'Permission Error',
        description: 'You do not have permission to perform this action',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      onClose(); // Close the modal as the user does not have admin privileges
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // If creating a new account, check if code already exists
      if (!isEditMode) {
        const codeExists = await checkAccountCodeExists(formData.code);
        if (codeExists) {
          const errorMsg = 'This account code is already in use. Please use a different code.';
          setErrors({
            ...errors,
            code: errorMsg
          });
          setSubmitError(errorMsg);
          
          toast({
            title: 'Validation Error',
            description: errorMsg,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          
          setIsSubmitting(false);
          return;
        }
      }
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      
      // Prepare data for submission
      // For updates, only send name and type as code is part of the URL
      const dataToSubmit = isEditMode ? { name: formData.name, type: formData.type } : formData;
      
      if (isEditMode) {
        // Update existing account
        console.log('Updating account with code:', account.code);
        const apiUrl = `/api/accounts/${account.code}`;
        console.log('PUT request to:', apiUrl, 'with data:', dataToSubmit);
        
        await axios.put(apiUrl, dataToSubmit, config);
        
        toast({
          title: 'Success',
          description: 'Account updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new account
        console.log('Creating new account with data:', formData);
        const apiUrl = '/api/accounts';
        console.log('POST request to:', apiUrl);
        
        await axios.post(apiUrl, formData, config);
        
        toast({
          title: 'Success',
          description: 'Account created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      onClose(); // Close the modal after successful submission
    } catch (error) {
      console.error('Error saving account:', error);
      
      let errorMsg = 'Failed to save account. Please try again.';
      
      // Detailed error logging for debugging
      if (error.response) {
        console.error('Error response:', error.response);
        
        // Handle specific error cases
        if (error.response.status === 400) {
          if (error.response.data && error.response.data.message === 'Kode akun sudah digunakan') {
            errorMsg = 'This account code is already in use. Please use a different code.';
            setErrors({
              ...errors,
              code: errorMsg
            });
          } else {
            errorMsg = error.response.data?.message || 'Failed to save account. Please check your input.';
          }
        } else {
          errorMsg = 'An error occurred while saving the account. Please try again.';
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMsg = 'No response from server. Please check your connection and try again.';
      } else {
        console.error('Error setting up request:', error.message);
        errorMsg = 'Error setting up request. Please try again.';
      }
      
      setSubmitError(errorMsg);
      
      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEditMode ? 'Edit Account' : 'Add New Account'}</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              {submitError && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {submitError}
                </Alert>
              )}
              
              <FormControl isInvalid={errors.code} isDisabled={isEditMode}>
                <FormLabel>Account Code</FormLabel>
                <Input
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Enter 4-digit account code"
                />
                <FormErrorMessage>{errors.code}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.name}>
                <FormLabel>Account Name</FormLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter account name"
                />
                <FormErrorMessage>{errors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.type}>
                <FormLabel>Account Type</FormLabel>
                <Select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="Select account type"
                >
                  {accountTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.type}</FormErrorMessage>
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
              isLoading={isSubmitting || isCheckingCode}
              loadingText={isCheckingCode ? "Checking" : "Saving"}
              isDisabled={isCheckingCode}
            >
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default AccountForm; 