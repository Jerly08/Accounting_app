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
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  VStack,
  HStack,
  Flex,
  Box,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const BillingForm = ({ 
  isOpen, 
  onClose, 
  projectId, 
  projectTotalValue = 0,
  billing, 
  onSubmitSuccess 
}) => {
  // Initial form data
  const initialFormData = {
    projectId: projectId,
    billingDate: new Date().toISOString().split('T')[0],
    percentage: '',
    amount: '',
    description: '',
    status: 'pending',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [percentageMode, setPercentageMode] = useState(true);
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();

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

  // Set initial form data when editing
  useEffect(() => {
    if (billing) {
      // Calculate percentage from amount if not available
      const percentage = billing.percentage || 
        (projectTotalValue > 0 && billing.amount) ? 
        ((parseFloat(billing.amount) / parseFloat(projectTotalValue)) * 100).toFixed(2) : '';
      
      setFormData({
        projectId: projectId,
        billingDate: billing.billingDate ? new Date(billing.billingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        percentage: percentage,
        amount: billing.amount ? billing.amount.toString() : '',
        description: billing.description || '',
        status: billing.status || 'pending',
        dueDate: billing.dueDate ? new Date(billing.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      
      // Set mode based on which value is likely primary
      setPercentageMode(!!billing.percentage);
    } else {
      setFormData(initialFormData);
      setPercentageMode(true);
    }
    setErrors({});
  }, [billing, projectId, projectTotalValue, isOpen]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.billingDate) {
      newErrors.billingDate = 'Billing date is required';
    }
    
    // Validate either percentage or amount
    if (percentageMode) {
      if (!formData.percentage) {
        newErrors.percentage = 'Percentage is required';
      } else if (isNaN(formData.percentage) || parseFloat(formData.percentage) <= 0 || parseFloat(formData.percentage) > 100) {
        newErrors.percentage = 'Percentage must be between 0 and 100';
      }
    } else {
      if (!formData.amount) {
        newErrors.amount = 'Amount is required';
      } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      }
    }
    
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(formData.dueDate);
      
      if (dueDate < today && formData.status === 'pending') {
        newErrors.dueDate = 'Due date cannot be in the past for pending billings';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
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
    
    // Sync amount and percentage
    if (name === 'percentage' && percentageMode && projectTotalValue > 0) {
      const newAmount = (parseFloat(value) / 100 * parseFloat(projectTotalValue)).toFixed(2);
      if (!isNaN(newAmount)) {
        setFormData(prev => ({
          ...prev,
          percentage: value,
          amount: newAmount,
        }));
      }
    } else if (name === 'amount' && !percentageMode && projectTotalValue > 0) {
      const newPercentage = (parseFloat(value) / parseFloat(projectTotalValue) * 100).toFixed(2);
      if (!isNaN(newPercentage)) {
        setFormData(prev => ({
          ...prev,
          amount: value,
          percentage: newPercentage,
        }));
      }
    }
  };

  // Handle number input change
  const handleNumberChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
    
    // Sync amount and percentage
    if (name === 'percentage' && percentageMode && projectTotalValue > 0) {
      const newAmount = (parseFloat(value) / 100 * parseFloat(projectTotalValue)).toFixed(2);
      if (!isNaN(newAmount)) {
        setFormData(prev => ({
          ...prev,
          percentage: value,
          amount: newAmount,
        }));
      }
    } else if (name === 'amount' && !percentageMode && projectTotalValue > 0) {
      const newPercentage = (parseFloat(value) / parseFloat(projectTotalValue) * 100).toFixed(2);
      if (!isNaN(newPercentage)) {
        setFormData(prev => ({
          ...prev,
          amount: value,
          percentage: newPercentage,
        }));
      }
    }
  };

  // Handle slider change
  const handleSliderChange = (value) => {
    handleNumberChange('percentage', value.toString());
  };

  // Toggle input mode (percentage or amount)
  const toggleInputMode = () => {
    setPercentageMode(!percentageMode);
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

  // Submit form
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
      onClose();
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const billingData = {
        ...formData,
        amount: parseFloat(formData.amount),
        percentage: parseFloat(formData.percentage),
      };
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      
      if (billing) {
        // Update existing billing
        await axios.put(
          `/api/billings/${billing.id}`,
          billingData,
          config
        );
        
        toast({
          title: 'Success',
          description: 'Billing updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new billing
        await axios.post(
          `/api/billings`,
          billingData,
          config
        );
        
        toast({
          title: 'Success',
          description: 'Billing created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving billing:', error);
      
      // Check if error is due to authentication
      if (error.response?.status === 401) {
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please login again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        onClose();
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to save billing';
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{billing ? 'Edit Billing' : 'Add New Billing'}</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={errors.billingDate}>
                <FormLabel>Billing Date</FormLabel>
                <Input
                  name="billingDate"
                  type="date"
                  value={formData.billingDate}
                  onChange={handleChange}
                />
                <FormErrorMessage>{errors.billingDate}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.dueDate}>
                <FormLabel>Due Date</FormLabel>
                <Input
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                />
                <FormErrorMessage>{errors.dueDate}</FormErrorMessage>
              </FormControl>

              <Box width="100%">
                <Flex justify="space-between" align="center" mb={2}>
                  <FormLabel mb={0}>Amount</FormLabel>
                  <Button size="xs" onClick={toggleInputMode}>
                    Switch to {percentageMode ? 'Amount' : 'Percentage'}
                  </Button>
                </Flex>

                {percentageMode ? (
                  <FormControl isInvalid={errors.percentage}>
                    <HStack spacing={4} align="center">
                      <NumberInput
                        min={0}
                        max={100}
                        step={1}
                        value={formData.percentage}
                        onChange={(value) => handleNumberChange('percentage', value)}
                        width="120px"
                      >
                        <NumberInputField placeholder="0%" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <Text>%</Text>
                      <Text ml={2} fontSize="sm" color="gray.600">
                        = {formatCurrency(formData.amount)}
                      </Text>
                    </HStack>

                    <Slider
                      mt={4}
                      min={0}
                      max={100}
                      step={1}
                      value={parseFloat(formData.percentage) || 0}
                      onChange={handleSliderChange}
                      colorScheme="teal"
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb boxSize={6} />
                    </Slider>
                    <FormErrorMessage>{errors.percentage}</FormErrorMessage>
                    <FormHelperText>
                      {projectTotalValue ? `Project total value: ${formatCurrency(projectTotalValue)}` : 'Enter percentage of total project value'}
                    </FormHelperText>
                  </FormControl>
                ) : (
                  <FormControl isInvalid={errors.amount}>
                    <NumberInput
                      min={0}
                      value={formData.amount}
                      onChange={(value) => handleNumberChange('amount', value)}
                    >
                      <NumberInputField placeholder="Enter amount" />
                    </NumberInput>
                    <Text mt={2} fontSize="sm" color="gray.600">
                      = {formData.percentage}% of project value
                    </Text>
                    <FormErrorMessage>{errors.amount}</FormErrorMessage>
                  </FormControl>
                )}
              </Box>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter billing description"
                  rows={3}
                />
              </FormControl>

              <FormControl isInvalid={errors.status}>
                <FormLabel>Status</FormLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
                <FormErrorMessage>{errors.status}</FormErrorMessage>
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
              {billing ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default BillingForm; 