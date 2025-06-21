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
  useToast,
  Divider,
  Text,
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// Predefined asset categories
const ASSET_CATEGORIES = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'building', label: 'Building' },
  { value: 'land', label: 'Land' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'other', label: 'Other' }
];

const FixedAssetForm = ({ 
  isOpen, 
  onClose, 
  asset = null, 
  onSubmitSuccess 
}) => {
  const initialFormData = {
    assetName: '',
    category: 'equipment', // Default category
    acquisitionDate: new Date().toISOString().split('T')[0],
    value: '',
    usefulLife: '',
    description: '',
    location: '',
    assetTag: '',
    accumulatedDepreciation: '0',
    bookValue: '0',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepreciationFields, setShowDepreciationFields] = useState(false);
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();

  // Set form data when editing an existing asset
  useEffect(() => {
    if (asset) {
      // Format date from ISO string to YYYY-MM-DD for input
      const formattedDate = asset.acquisitionDate 
        ? new Date(asset.acquisitionDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      setFormData({
        assetName: asset.assetName || '',
        category: asset.category || 'equipment',
        acquisitionDate: formattedDate,
        value: asset.value ? asset.value.toString() : '',
        usefulLife: asset.usefulLife ? asset.usefulLife.toString() : '',
        description: asset.description || '',
        location: asset.location || '',
        assetTag: asset.assetTag || '',
        accumulatedDepreciation: asset.accumulatedDepreciation ? asset.accumulatedDepreciation.toString() : '0',
        bookValue: asset.bookValue ? asset.bookValue.toString() : '0',
      });
      
      // Show depreciation fields when editing
      setShowDepreciationFields(true);
    } else {
      setFormData(initialFormData);
      setShowDepreciationFields(false);
    }
    
    setErrors({});
  }, [asset]);

  // Calculate book value when value or accumulated depreciation changes
  useEffect(() => {
    if (formData.value && formData.accumulatedDepreciation) {
      const value = parseFloat(formData.value) || 0;
      const accumulatedDepreciation = parseFloat(formData.accumulatedDepreciation) || 0;
      const bookValue = Math.max(0, value - accumulatedDepreciation);
      
      setFormData(prev => ({
        ...prev,
        bookValue: bookValue.toString()
      }));
    }
  }, [formData.value, formData.accumulatedDepreciation]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  // Handle number input changes
  const handleNumberChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  // Toggle depreciation fields
  const toggleDepreciationFields = () => {
    setShowDepreciationFields(!showDepreciationFields);
    
    // Reset depreciation fields when hiding
    if (showDepreciationFields) {
      setFormData(prev => ({
        ...prev,
        accumulatedDepreciation: '0',
        bookValue: prev.value
      }));
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

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.assetName || formData.assetName.trim() === '') {
      newErrors.assetName = 'Asset name is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.acquisitionDate) {
      newErrors.acquisitionDate = 'Acquisition date is required';
    }
    
    if (!formData.value || isNaN(Number(formData.value)) || Number(formData.value) <= 0) {
      newErrors.value = 'Value must be a positive number';
    }
    
    if (!formData.usefulLife || isNaN(Number(formData.usefulLife)) || Number(formData.usefulLife) <= 0) {
      newErrors.usefulLife = 'Useful life must be a positive number';
    }
    
    if (showDepreciationFields) {
      if (isNaN(Number(formData.accumulatedDepreciation)) || Number(formData.accumulatedDepreciation) < 0) {
        newErrors.accumulatedDepreciation = 'Accumulated depreciation must be a non-negative number';
      }
      
      if (Number(formData.accumulatedDepreciation) > Number(formData.value)) {
        newErrors.accumulatedDepreciation = 'Accumulated depreciation cannot exceed the asset value';
      }
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
        description: 'Please check the form for errors.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to perform this action.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Prepare data for submission
    const assetData = {
      assetName: formData.assetName,
      category: formData.category,
      acquisitionDate: formData.acquisitionDate,
      value: parseFloat(formData.value),
      usefulLife: parseInt(formData.usefulLife),
      description: formData.description,
      location: formData.location,
      assetTag: formData.assetTag,
      accumulatedDepreciation: parseFloat(formData.accumulatedDepreciation),
      bookValue: parseFloat(formData.bookValue),
    };
    
    try {
      let response;
      
      if (asset) {
        // Update existing asset
        response = await axios.put(
          `/api/assets/${asset.id}`,
          assetData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        toast({
          title: 'Asset Updated',
          description: 'The asset has been successfully updated.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        // Create new asset
        response = await axios.post(
          `/api/assets`,
          assetData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        toast({
          title: 'Asset Created',
          description: 'The new asset has been successfully created.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
      
      // Call success callback
      if (onSubmitSuccess) {
        onSubmitSuccess(response.data);
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error submitting asset:', error);
      
      // Display error message
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'An error occurred while submitting the asset.',
        status: 'error',
        duration: 5000,
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
          {asset ? 'Edit Fixed Asset' : 'Add New Fixed Asset'}
        </ModalHeader>
        <ModalCloseButton />
        
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Asset Name */}
              <FormControl isRequired isInvalid={errors.assetName}>
                <FormLabel>Asset Name</FormLabel>
                <Input
                  name="assetName"
                  value={formData.assetName}
                  onChange={handleChange}
                  placeholder="Enter asset name"
                />
                <FormErrorMessage>{errors.assetName}</FormErrorMessage>
              </FormControl>
              
              {/* Category */}
              <FormControl isRequired isInvalid={errors.category}>
                <FormLabel>Category</FormLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Select category"
                >
                  {ASSET_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.category}</FormErrorMessage>
              </FormControl>
              
              {/* Acquisition Date */}
              <FormControl isRequired isInvalid={errors.acquisitionDate}>
                <FormLabel>Acquisition Date</FormLabel>
                <Input
                  name="acquisitionDate"
                  type="date"
                  value={formData.acquisitionDate}
                  onChange={handleChange}
                />
                <FormErrorMessage>{errors.acquisitionDate}</FormErrorMessage>
              </FormControl>
              
              {/* Asset Value */}
              <FormControl isRequired isInvalid={errors.value}>
                <FormLabel>Asset Value</FormLabel>
                <InputGroup>
                  <InputLeftAddon>Rp</InputLeftAddon>
                  <NumberInput
                    min={0}
                    value={formData.value}
                    onChange={(valueString) => handleNumberChange('value', valueString)}
                    width="100%"
                  >
                    <NumberInputField
                      placeholder="Enter asset value"
                      borderLeftRadius={0}
                    />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </InputGroup>
                <FormErrorMessage>{errors.value}</FormErrorMessage>
                <FormHelperText>
                  The original acquisition cost of the asset
                </FormHelperText>
              </FormControl>
              
              {/* Useful Life */}
              <FormControl isRequired isInvalid={errors.usefulLife}>
                <FormLabel>Useful Life (years)</FormLabel>
                <NumberInput
                  min={1}
                  value={formData.usefulLife}
                  onChange={(valueString) => handleNumberChange('usefulLife', valueString)}
                >
                  <NumberInputField placeholder="Enter useful life in years" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <FormErrorMessage>{errors.usefulLife}</FormErrorMessage>
                <FormHelperText>
                  The estimated number of years the asset will be used
                </FormHelperText>
              </FormControl>
              
              {/* Description */}
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter asset description (optional)"
                />
              </FormControl>
              
              {/* Location */}
              <FormControl>
                <FormLabel>Location</FormLabel>
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Enter asset location (optional)"
                />
              </FormControl>
              
              {/* Asset Tag */}
              <FormControl>
                <FormLabel>Asset Tag</FormLabel>
                <Input
                  name="assetTag"
                  value={formData.assetTag}
                  onChange={handleChange}
                  placeholder="Enter asset tag or serial number (optional)"
                />
              </FormControl>
              
              <Divider />
              
              {/* Toggle Depreciation Fields */}
              <Box>
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  onClick={toggleDepreciationFields}
                >
                  {showDepreciationFields
                    ? 'Hide Depreciation Fields'
                    : 'Show Depreciation Fields'}
                </Button>
              </Box>
              
              {/* Depreciation Fields */}
              {showDepreciationFields && (
                <>
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                      Enter the accumulated depreciation for an existing asset.
                      For new assets, this should typically start at 0.
                    </Text>
                  </Alert>
                  
                  <FormControl isInvalid={errors.accumulatedDepreciation}>
                    <FormLabel>Accumulated Depreciation</FormLabel>
                    <InputGroup>
                      <InputLeftAddon>Rp</InputLeftAddon>
                      <NumberInput
                        min={0}
                        max={parseFloat(formData.value) || 0}
                        value={formData.accumulatedDepreciation}
                        onChange={(valueString) =>
                          handleNumberChange('accumulatedDepreciation', valueString)
                        }
                        width="100%"
                      >
                        <NumberInputField
                          placeholder="Enter accumulated depreciation"
                          borderLeftRadius={0}
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </InputGroup>
                    <FormErrorMessage>
                      {errors.accumulatedDepreciation}
                    </FormErrorMessage>
                  </FormControl>
                  
                  <Stat>
                    <StatLabel>Current Book Value</StatLabel>
                    <StatNumber>
                      {formatCurrency(formData.bookValue)}
                    </StatNumber>
                    <StatHelpText>
                      Asset Value - Accumulated Depreciation
                    </StatHelpText>
                  </Stat>
                </>
              )}
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={onClose}
              isDisabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={isSubmitting}
              loadingText="Submitting"
            >
              {asset ? 'Update Asset' : 'Create Asset'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default FixedAssetForm; 