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
  FormErrorMessage,
  FormHelperText,
  Input,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  InputGroup,
  InputLeftAddon,
  Textarea,
  useToast,
  Divider,
  Text,
  Box,
  Alert,
  AlertIcon,
  HStack,
  Radio,
  RadioGroup,
  Stack,
  Badge,
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const TransactionForm = ({ 
  isOpen, 
  onClose, 
  transaction = null, 
  onSubmitSuccess,
  accounts = [],
  projects = []
}) => {
  const initialFormData = {
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    accountCode: '',
    projectId: '',
    description: '',
    amount: '',
    notes: '',
    createCounterTransaction: true // For automatic counter transactions
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountsByType, setAccountsByType] = useState({
    income: [],
    expense: [],
    asset: [],
    liability: []
  });
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();

  // Group accounts by type
  useEffect(() => {
    const grouped = {
      income: accounts.filter(acc => acc.type === 'Pendapatan'),
      expense: accounts.filter(acc => acc.type === 'Beban'),
      asset: accounts.filter(acc => acc.type === 'Aktiva' || acc.type === 'Aset Tetap'),
      liability: accounts.filter(acc => acc.type === 'Kewajiban')
    };
    setAccountsByType(grouped);
  }, [accounts]);

  // Set form data when editing an existing transaction
  useEffect(() => {
    if (transaction) {
      // Format date from ISO string to YYYY-MM-DD for input
      const formattedDate = transaction.date 
        ? new Date(transaction.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      setFormData({
        date: formattedDate,
        type: transaction.type || 'expense',
        accountCode: transaction.accountCode || '',
        projectId: transaction.projectId ? transaction.projectId.toString() : '',
        description: transaction.description || '',
        amount: transaction.amount ? transaction.amount.toString() : '',
        notes: transaction.notes || '',
        createCounterTransaction: true
      });
    } else {
      setFormData(initialFormData);
    }
    
    setErrors({});
  }, [transaction, isOpen]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for transaction type change
    if (name === 'type') {
      // Reset account selection when changing transaction type
      setFormData({ 
        ...formData, 
        [name]: value, 
        accountCode: '',
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  // Handle radio button changes
  const handleRadioChange = (name, value) => {
    setFormData({ ...formData, [name]: value === 'true' });
  };

  // Handle number input changes
  const handleNumberChange = (name, value) => {
    // Remove non-numeric characters
    const numericValue = value.toString().replace(/[^\d]/g, '');
    setFormData({ ...formData, [name]: numericValue });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get account name by code
  const getAccountName = (code) => {
    const account = accounts.find(a => a.code === code);
    return account ? account.name : '';
  };

  // Generate transaction description based on type and selected accounts
  const generateDescription = () => {
    if (!formData.accountCode) return '';
    
    const accountName = getAccountName(formData.accountCode);
    
    if (formData.type === 'income') {
      return `Receipt to ${accountName}`;
    }
    
    if (formData.type === 'expense') {
      return `Payment from ${accountName}`;
    }
    
    return '';
  };

  // Suggest description when account changes
  useEffect(() => {
    if (formData.accountCode && !transaction) {
      const suggestedDesc = generateDescription();
      if (suggestedDesc && !formData.description) {
        setFormData(prev => ({
          ...prev,
          description: suggestedDesc
        }));
      }
    }
  }, [formData.accountCode, formData.type]);

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.date) {
      newErrors.date = 'Transaction date is required';
    }
    
    if (!formData.type) {
      newErrors.type = 'Transaction type is required';
    }
    
    if (!formData.accountCode) {
      newErrors.accountCode = 'Account is required';
    }
    
    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Transaction description is required';
    }
    
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors',
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
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const transactionData = {
        date: formData.date,
        type: formData.type,
        accountCode: formData.accountCode,
        description: formData.description,
        amount: parseFloat(formData.amount),
        projectId: formData.projectId ? parseInt(formData.projectId) : null,
        notes: formData.notes || undefined
      };
      
      let response;
      
      if (transaction) {
        // Update existing transaction
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${transaction.id}`,
          transactionData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        toast({
          title: 'Success',
          description: 'Transaction successfully updated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new transaction
        response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/transactions`,
          transactionData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        toast({
          title: 'Success',
          description: 'Transaction successfully created',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      if (onSubmitSuccess) {
        onSubmitSuccess(response.data);
      }
      
      // Reset form after successful submission if creating new transaction
      if (!transaction) {
        setFormData({
          ...initialFormData,
          type: formData.type, // Keep the selected transaction type
          projectId: formData.projectId, // Keep the selected project
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting transaction:', error);
      
      if (error.response?.status === 401) {
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please login again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else if (error.response?.data?.errors) {
        // Set validation errors from API
        const apiErrors = {};
        error.response.data.errors.forEach(err => {
          apiErrors[err.field] = err.message;
        });
        setErrors(apiErrors);
        
        toast({
          title: 'Validation Error',
          description: 'Please check the form for errors',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to submit transaction';
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

  // Render account options based on transaction type
  const renderAccountOptions = () => {
    let filteredAccounts = [];
    
    if (formData.type === 'income') {
      // For income, show asset accounts first (where money is received)
      filteredAccounts = [...accountsByType.asset, ...accountsByType.income];
    } else if (formData.type === 'expense') {
      // For expense, show expense accounts first
      filteredAccounts = [...accountsByType.expense, ...accountsByType.asset];
    }
    
    return filteredAccounts.map((account) => (
      <option key={account.code} value={account.code}>
        {account.code} - {account.name}
      </option>
    ));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {transaction ? 'Edit Transaction' : 'Add New Transaction'}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} as="form" onSubmit={handleSubmit}>
            {/* Transaction Type Selection */}
            <FormControl isRequired isInvalid={!!errors.type}>
              <FormLabel>Transaction Type</FormLabel>
              <RadioGroup 
                value={formData.type} 
                onChange={(value) => handleChange({ target: { name: 'type', value } })}
              >
                <Stack direction="row" spacing={5}>
                  <Radio value="income">
                    <Badge colorScheme="green" px={2} py={1}>Income</Badge>
                  </Radio>
                  <Radio value="expense">
                    <Badge colorScheme="red" px={2} py={1}>Expense</Badge>
                  </Radio>
                </Stack>
              </RadioGroup>
              <FormErrorMessage>{errors.type}</FormErrorMessage>
            </FormControl>
            
            <FormControl isRequired isInvalid={!!errors.date}>
              <FormLabel>Date</FormLabel>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
              />
              <FormErrorMessage>{errors.date}</FormErrorMessage>
            </FormControl>
            
            <FormControl isRequired isInvalid={!!errors.accountCode}>
              <FormLabel>Account</FormLabel>
              <Select
                name="accountCode"
                value={formData.accountCode}
                onChange={handleChange}
                placeholder="Select account"
              >
                {renderAccountOptions()}
              </Select>
              <FormErrorMessage>{errors.accountCode}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!errors.projectId}>
              <FormLabel>Project (Optional)</FormLabel>
              <Select
                name="projectId"
                value={formData.projectId || ''}
                onChange={handleChange}
                placeholder="Select project"
              >
                <option value="">No Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id.toString()}>
                    {project.projectCode} - {project.name}
                  </option>
                ))}
              </Select>
              <FormErrorMessage>{errors.projectId}</FormErrorMessage>
              <FormHelperText>
                Link this transaction to a specific project
              </FormHelperText>
            </FormControl>
            
            <FormControl isRequired isInvalid={!!errors.description}>
              <FormLabel>Description</FormLabel>
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter transaction description"
              />
              <FormErrorMessage>{errors.description}</FormErrorMessage>
            </FormControl>
            
            <FormControl isRequired isInvalid={!!errors.amount}>
              <FormLabel>Amount</FormLabel>
              <InputGroup>
                <InputLeftAddon>Rp</InputLeftAddon>
                <NumberInput
                  min={0}
                  value={formData.amount}
                  onChange={(valueString) => handleNumberChange('amount', valueString)}
                  width="100%"
                >
                  <NumberInputField
                    name="amount"
                    placeholder="Enter amount"
                    borderLeftRadius={0}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </InputGroup>
              <FormHelperText>
                {formData.amount ? formatCurrency(formData.amount) : ''}
              </FormHelperText>
              <FormErrorMessage>{errors.amount}</FormErrorMessage>
            </FormControl>
            
            <FormControl>
              <FormLabel>Notes (Optional)</FormLabel>
              <Textarea
                name="notes"
                value={formData.notes || ''}
                onChange={handleChange}
                placeholder="Enter additional notes (optional)"
                rows={3}
              />
            </FormControl>
            
            {!transaction && (
              <FormControl>
                <FormLabel>Create Balancing Transaction</FormLabel>
                <RadioGroup 
                  value={formData.createCounterTransaction.toString()} 
                  onChange={(value) => handleRadioChange('createCounterTransaction', value)}
                >
                  <Stack direction="row" spacing={5}>
                    <Radio value="true">Yes</Radio>
                    <Radio value="false">No</Radio>
                  </Stack>
                </RadioGroup>
                <FormHelperText>
                  {formData.type === 'income' 
                    ? 'Automatically create corresponding income transaction' 
                    : 'Automatically create corresponding expense transaction'}
                </FormHelperText>
              </FormControl>
            )}
            
            {formData.createCounterTransaction && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  {formData.type === 'income' 
                    ? 'Income transaction will be automatically created to balance this transaction.' 
                    : 'Expense transaction will be automatically created to balance this transaction.'}
                </Text>
              </Alert>
            )}
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="outline" mr={3} onClick={onClose}>
            Cancel
          </Button>
          {!transaction && (
            <Button 
              variant="outline" 
              colorScheme="gray" 
              mr={3} 
              onClick={() => setFormData({
                ...initialFormData,
                type: formData.type,
                projectId: formData.projectId
              })}
              isDisabled={isSubmitting}
            >
              Reset
            </Button>
          )}
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Saving..."
          >
            {transaction ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TransactionForm; 