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
    counterAccountCode: '',
    projectId: '',
    description: '',
    amount: '',
    notes: '',
    createCounterEntry: true // For automatic counter transactions
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
        counterAccountCode: transaction.counterAccountCode || '',
        projectId: transaction.projectId ? transaction.projectId.toString() : '',
        description: transaction.description || '',
        amount: transaction.amount ? transaction.amount.toString() : '',
        notes: transaction.notes || '',
        createCounterEntry: true
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
        counterAccountCode: '',
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
    // Remove any non-numeric characters
    let numericValue = value.toString().replace(/[^\d]/g, '');
    
    // Ensure it's not empty or zero
    if (numericValue === '' || parseInt(numericValue) === 0) {
      numericValue = '';
    }
    
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

  // Suggest counter account when primary account changes
  useEffect(() => {
    const fetchSuggestedCounterAccount = async () => {
      if (!formData.accountCode || !formData.createCounterEntry || !token || !isAuthenticated) {
        return;
      }
      
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/transactions/suggest-counter/${formData.accountCode}?type=${formData.type}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (response.data.success && response.data.data) {
          // Only set the counter account if it's not already set
          if (!formData.counterAccountCode) {
            setFormData(prev => ({
              ...prev,
              counterAccountCode: response.data.data.accountCode
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching suggested counter account:', error);
        // Don't show error toast as this is a background operation
      }
    };
    
    fetchSuggestedCounterAccount();
  }, [formData.accountCode, formData.type, formData.createCounterEntry, token, isAuthenticated]);

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
    
    if (!formData.amount || formData.amount === '0' || parseInt(formData.amount) <= 0) {
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
        notes: formData.notes || undefined,
        createCounterEntry: formData.createCounterEntry,
        counterAccountCode: formData.counterAccountCode || undefined
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
          description: formData.createCounterEntry 
            ? 'Double-entry transaction successfully created' 
            : 'Transaction successfully created',
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
              {errors.type && <FormErrorMessage>{errors.type}</FormErrorMessage>}
            </FormControl>
            
            {/* Date Selection */}
            <FormControl isRequired isInvalid={!!errors.date}>
              <FormLabel>Transaction Date</FormLabel>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
              />
              {errors.date && <FormErrorMessage>{errors.date}</FormErrorMessage>}
            </FormControl>
            
            {/* Account Selection */}
            <FormControl isRequired isInvalid={!!errors.accountCode}>
              <FormLabel>Account</FormLabel>
              <Select
                name="accountCode"
                placeholder="Select account"
                value={formData.accountCode}
                onChange={handleChange}
              >
                {renderAccountOptions()}
              </Select>
              {errors.accountCode && <FormErrorMessage>{errors.accountCode}</FormErrorMessage>}
              <FormHelperText>
                Select the account for this transaction
              </FormHelperText>
            </FormControl>
            
            {/* Double Entry Option */}
            <FormControl>
              <FormLabel>Double-Entry Accounting</FormLabel>
              <RadioGroup 
                value={formData.createCounterEntry.toString()} 
                onChange={(value) => handleRadioChange('createCounterEntry', value)}
              >
                <Stack direction="row" spacing={5}>
                  <Radio value="true">
                    <Badge colorScheme="blue" px={2} py={1}>Enable</Badge>
                  </Radio>
                  <Radio value="false">
                    <Badge colorScheme="gray" px={2} py={1}>Disable</Badge>
                  </Radio>
                </Stack>
              </RadioGroup>
              <FormHelperText>
                Enable to automatically create counter-entry for proper double-entry accounting
              </FormHelperText>
            </FormControl>
            
            {/* Counter Account Selection - Only shown when double entry is enabled */}
            {formData.createCounterEntry && (
              <FormControl isInvalid={!!errors.counterAccountCode}>
                <FormLabel>Counter Account (Optional)</FormLabel>
                <Select
                  name="counterAccountCode"
                  placeholder="Select counter account (auto-suggested if empty)"
                  value={formData.counterAccountCode}
                  onChange={handleChange}
                >
                  {accounts.map((account) => (
                    <option key={account.code} value={account.code}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </Select>
                {errors.counterAccountCode && <FormErrorMessage>{errors.counterAccountCode}</FormErrorMessage>}
                <FormHelperText>
                  Select the counter account for double-entry (will be auto-suggested if left empty)
                </FormHelperText>
              </FormControl>
            )}
            
            {/* Project Selection */}
            <FormControl isInvalid={!!errors.projectId}>
              <FormLabel>Project (Optional)</FormLabel>
              <Select
                name="projectId"
                placeholder="Select project"
                value={formData.projectId}
                onChange={handleChange}
              >
                <option value="">No Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectCode} - {project.name}
                  </option>
                ))}
              </Select>
              {errors.projectId && <FormErrorMessage>{errors.projectId}</FormErrorMessage>}
            </FormControl>
            
            {/* Description */}
            <FormControl isRequired isInvalid={!!errors.description}>
              <FormLabel>Description</FormLabel>
              <Input
                name="description"
                placeholder="Transaction description"
                value={formData.description}
                onChange={handleChange}
              />
              {errors.description && <FormErrorMessage>{errors.description}</FormErrorMessage>}
            </FormControl>
            
            {/* Amount */}
            <FormControl isRequired isInvalid={!!errors.amount}>
              <FormLabel>Amount</FormLabel>
              <InputGroup>
                <InputLeftAddon>Rp</InputLeftAddon>
                <Input
                  name="amount"
                  placeholder="0"
                  value={formData.amount ? formData.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ''}
                  onChange={(e) => handleNumberChange('amount', e.target.value)}
                  borderLeftRadius={0}
                />
              </InputGroup>
              {errors.amount && <FormErrorMessage>{errors.amount}</FormErrorMessage>}
              <FormHelperText>Enter amount without decimal points</FormHelperText>
            </FormControl>
            
            {/* Notes */}
            <FormControl isInvalid={!!errors.notes}>
              <FormLabel>Notes (Optional)</FormLabel>
              <Textarea
                name="notes"
                placeholder="Additional notes"
                value={formData.notes}
                onChange={handleChange}
              />
              {errors.notes && <FormErrorMessage>{errors.notes}</FormErrorMessage>}
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
            loadingText="Submitting"
          >
            {transaction ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TransactionForm; 