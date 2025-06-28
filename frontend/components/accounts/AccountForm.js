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
  Checkbox,
  Divider,
  HStack,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { FiInfo } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const ACCOUNT_TYPES = ['Pendapatan', 'Beban', 'Aktiva', 'Aset Tetap', 'Kontra Aset'];
const CASHFLOW_CATEGORIES = ['Income', 'Expense', 'Asset', 'Fixed Asset', 'Contra Asset', 'Other'];
const SUBCATEGORIES = {
  'Income': ['Sales', 'Service', 'Interest', 'Other Income'],
  'Expense': ['Operating', 'Administrative', 'Marketing', 'Financial', 'Other Expense'],
  'Asset': ['Cash', 'Bank', 'Receivable', 'Inventory', 'Other Asset'],
  'Fixed Asset': ['Building', 'Land', 'Equipment', 'Vehicle', 'Other Fixed Asset'],
  'Contra Asset': ['Accumulated Depreciation', 'Allowance for Bad Debt', 'Other Contra'],
  'Other': ['Miscellaneous'],
};

const AccountForm = ({ isOpen, onClose, account, onSubmitSuccess, accountTypes = ACCOUNT_TYPES }) => {
  const initialFormData = {
    code: '',
    name: '',
    type: '',
    category: '',
    subcategory: '',
    isCurrentAsset: true,
    isCurrentLiability: true,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  const toast = useToast();
  const { token, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (account) {
      setFormData({
        code: account.code || '',
        name: account.name || '',
        type: account.type || '',
        category: account.category || '',
        subcategory: account.subcategory || '',
        isCurrentAsset: account.isCurrentAsset !== false,
        isCurrentLiability: account.isCurrentLiability !== false,
      });
      setIsEditMode(true);
      
      // Set available subcategories based on selected category
      if (account.category) {
        setAvailableSubcategories(SUBCATEGORIES[account.category] || []);
      }
    } else {
      setFormData(initialFormData);
      setIsEditMode(false);
      setAvailableSubcategories([]);
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
    
    if (!formData.category) {
      newErrors.category = 'Cashflow category is required';
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
    
    // Special handling for category to update subcategories
    if (name === 'category') {
      setAvailableSubcategories(SUBCATEGORIES[value] || []);
      // Reset subcategory when category changes
      setFormData({
        ...formData,
        [name]: value,
        subcategory: '',
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
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
  
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
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
      const dataToSubmit = {
        name: formData.name,
        type: formData.type,
        category: formData.category,
        subcategory: formData.subcategory,
        isCurrentAsset: formData.isCurrentAsset,
        isCurrentLiability: formData.isCurrentLiability
      };
      
      if (!isEditMode) {
        dataToSubmit.code = formData.code;
      }
      
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
        
        await axios.post(apiUrl, dataToSubmit, config);
        
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
      
      // Extract error message from API response if available
      const errorMessage = error.response?.data?.message || 'Failed to save account';
      
      setSubmitError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isEditMode ? 'Edit Account' : 'Add New Account'}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {submitError && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <AlertTitle mr={2}>Error!</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!!errors.code} isDisabled={isEditMode}>
              <FormLabel htmlFor="code">Account Code</FormLabel>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Enter 4-digit account code"
                isDisabled={isEditMode || isCheckingCode}
              />
              <FormErrorMessage>{errors.code}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!errors.name}>
              <FormLabel htmlFor="name">Account Name</FormLabel>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter account name"
              />
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!errors.type}>
              <FormLabel htmlFor="type">Account Type</FormLabel>
              <Select
                id="type"
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
            
            <Divider my={2} />
            
            <Box>
              <Text fontWeight="medium" mb={2}>Cashflow Categorization</Text>
            </Box>
            
            <FormControl isInvalid={!!errors.category}>
              <FormLabel htmlFor="category">
                <HStack>
                  <Text>Cashflow Category</Text>
                  <Tooltip label="This category is used for cashflow reporting">
                    <IconButton
                      aria-label="Info about cashflow categories"
                      icon={<FiInfo />}
                      size="xs"
                      variant="ghost"
                    />
                  </Tooltip>
                </HStack>
              </FormLabel>
              <Select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="Select cashflow category"
              >
                {CASHFLOW_CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              <FormErrorMessage>{errors.category}</FormErrorMessage>
            </FormControl>
            
            <FormControl>
              <FormLabel htmlFor="subcategory">Subcategory</FormLabel>
              <Select
                id="subcategory"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
                placeholder="Select subcategory"
                isDisabled={!formData.category}
              >
                {availableSubcategories.map(subcategory => (
                  <option key={subcategory} value={subcategory}>{subcategory}</option>
                ))}
              </Select>
            </FormControl>
            
            <Divider my={2} />
            
            <Box>
              <Text fontWeight="medium" mb={2}>Additional Properties</Text>
            </Box>
            
            <FormControl>
              <Checkbox
                name="isCurrentAsset"
                isChecked={formData.isCurrentAsset}
                onChange={handleCheckboxChange}
              >
                Is Current Asset
              </Checkbox>
            </FormControl>
            
            <FormControl>
              <Checkbox
                name="isCurrentLiability"
                isChecked={formData.isCurrentLiability}
                onChange={handleCheckboxChange}
              >
                Is Current Liability
              </Checkbox>
            </FormControl>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText={isEditMode ? "Updating..." : "Creating..."}
          >
            {isEditMode ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AccountForm; 