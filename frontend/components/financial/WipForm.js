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
  Textarea,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import { FiInfo } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const WipForm = ({ 
  isOpen, 
  onClose, 
  project, 
  onSubmitSuccess 
}) => {
  // Initial form data
  const initialFormData = {
    projectId: '',
    progress: 0,
    totalCosts: 0,
    totalBilled: 0,
    wipValue: 0,
    notes: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (project) {
      setFormData({
        projectId: project.id || '',
        progress: project.progress || 0,
        totalCosts: project.totalCosts || 0,
        totalBilled: project.totalBilled || 0,
        wipValue: project.wipValue || 0,
        notes: project.notes || '',
      });
    } else {
      // Reset form when adding new WIP entry
      setFormData(initialFormData);
    }
    
    setErrors({});
  }, [project, isOpen]);

  // Calculate WIP value when costs or billed amounts change
  useEffect(() => {
    const costs = parseFloat(formData.totalCosts) || 0;
    const billed = parseFloat(formData.totalBilled) || 0;
    
    // WIP value = Total Costs - Total Billed
    const calculatedWipValue = costs - billed;
    
    setFormData(prev => ({
      ...prev,
      wipValue: calculatedWipValue
    }));
  }, [formData.totalCosts, formData.totalBilled]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectId) {
      newErrors.projectId = 'Project ID is required';
    }
    
    if (formData.progress < 0 || formData.progress > 100) {
      newErrors.progress = 'Progress must be between 0 and 100';
    }
    
    if (formData.totalCosts < 0) {
      newErrors.totalCosts = 'Total costs cannot be negative';
    }
    
    if (formData.totalBilled < 0) {
      newErrors.totalBilled = 'Total billed cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle number input changes
  const handleNumberChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
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
    
    setIsSubmitting(true);
    
    try {
      let response;
      const wipData = {
        projectId: formData.projectId,
        progress: parseFloat(formData.progress),
        costs: parseFloat(formData.totalCosts),
        billed: parseFloat(formData.totalBilled),
        wipValue: parseFloat(formData.wipValue),
        notes: formData.notes,
      };
      
      if (project && project.id) {
        // Update existing WIP
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/wip/${project.id}`,
          wipData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } else {
        // Create new WIP
        response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/wip`,
          wipData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: project ? 'WIP updated successfully' : 'WIP created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        if (onSubmitSuccess) {
          onSubmitSuccess(response.data.data);
        }
        
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to save WIP data');
      }
    } catch (error) {
      console.error('Error saving WIP data:', error);
      
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to save WIP data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {project ? 'Update WIP Data' : 'Add WIP Data'}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!!errors.progress}>
              <FormLabel>Project Progress (%)</FormLabel>
              <HStack>
                <NumberInput
                  value={formData.progress}
                  onChange={(value) => handleNumberChange('progress', value)}
                  min={0}
                  max={100}
                  step={1}
                  w="100px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Slider
                  flex="1"
                  value={formData.progress}
                  onChange={(value) => handleNumberChange('progress', value)}
                  min={0}
                  max={100}
                  step={1}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <Text width="60px" textAlign="right">{formData.progress}%</Text>
              </HStack>
              {errors.progress && <FormErrorMessage>{errors.progress}</FormErrorMessage>}
              <FormHelperText>
                Project completion percentage based on your assessment
              </FormHelperText>
            </FormControl>
            
            <FormControl isInvalid={!!errors.totalCosts}>
              <FormLabel>Total Costs</FormLabel>
              <NumberInput
                value={formData.totalCosts}
                onChange={(value) => handleNumberChange('totalCosts', value)}
                min={0}
                step={1000}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {errors.totalCosts && <FormErrorMessage>{errors.totalCosts}</FormErrorMessage>}
              <FormHelperText>
                Total costs incurred for this project: {formatCurrency(formData.totalCosts)}
              </FormHelperText>
            </FormControl>
            
            <FormControl isInvalid={!!errors.totalBilled}>
              <FormLabel>Total Billed</FormLabel>
              <NumberInput
                value={formData.totalBilled}
                onChange={(value) => handleNumberChange('totalBilled', value)}
                min={0}
                step={1000}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {errors.totalBilled && <FormErrorMessage>{errors.totalBilled}</FormErrorMessage>}
              <FormHelperText>
                Total amount billed to the client: {formatCurrency(formData.totalBilled)}
              </FormHelperText>
            </FormControl>
            
            <FormControl isInvalid={!!errors.wipValue}>
              <FormLabel>
                WIP Value 
                <Tooltip label="WIP Value = Total Costs - Total Billed">
                  <span> <Icon as={FiInfo} boxSize={4} color="gray.500" /></span>
                </Tooltip>
              </FormLabel>
              <NumberInput
                value={formData.wipValue}
                onChange={(value) => handleNumberChange('wipValue', value)}
                min={0}
                step={1000}
                isReadOnly
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {errors.wipValue && <FormErrorMessage>{errors.wipValue}</FormErrorMessage>}
              <FormHelperText>
                Automatically calculated: Total Costs ({formatCurrency(formData.totalCosts)}) - Total Billed ({formatCurrency(formData.totalBilled)}) = {formatCurrency(formData.wipValue)}
              </FormHelperText>
            </FormControl>
            
            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any notes about this WIP entry..."
                rows={3}
              />
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
          >
            {project ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default WipForm; 