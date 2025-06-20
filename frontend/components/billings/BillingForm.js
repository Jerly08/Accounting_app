import { useState, useEffect, useRef } from 'react';
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
  InputGroup,
  InputRightElement,
  IconButton,
  Image,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX, FiCheck, FiDownload } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const BillingForm = ({ 
  isOpen, 
  onClose, 
  projectId, 
  billing, 
  onSubmitSuccess,
  projects = []
}) => {
  // Initial form data
  const initialFormData = {
    projectId: projectId || '',
    billingDate: new Date().toISOString().split('T')[0],
    percentage: '',
    amount: '',
    description: '',
    status: 'unpaid',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [percentageMode, setPercentageMode] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [projectTotalValue, setProjectTotalValue] = useState(0);
  const fileInputRef = useRef(null);
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
      setFormData({
        projectId: billing.projectId?.toString() || projectId?.toString() || '',
        billingDate: billing.billingDate ? new Date(billing.billingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        percentage: billing.percentage ? billing.percentage.toString() : '',
        amount: billing.amount ? billing.amount.toString() : '',
        description: billing.description || '',
        status: billing.status || 'unpaid',
        dueDate: billing.dueDate ? new Date(billing.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      
      if (billing.invoice) {
        setCurrentInvoice(billing.invoice);
      }
      
      // Set percentage mode based on whether percentage is provided
      setPercentageMode(!!billing.percentage);
    } else {
      // Reset form when adding new billing
      setFormData({
        ...initialFormData,
        projectId: projectId || '',
      });
      setCurrentInvoice(null);
    }
    
    // Reset file state
    setSelectedFile(null);
    setFilePreview('');
    setErrors({});
  }, [billing, projectId, isOpen]);

  // Fetch project details when project changes
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!formData.projectId || !token || !isAuthenticated) return;
      
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${formData.projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (response.data.success && response.data.data) {
          const project = response.data.data;
          setProjectTotalValue(parseFloat(project.totalValue));
          
          // If in percentage mode, update amount based on percentage
          if (percentageMode && formData.percentage) {
            const calculatedAmount = (parseFloat(formData.percentage) / 100) * parseFloat(project.totalValue);
            setFormData(prev => ({
              ...prev,
              amount: calculatedAmount.toFixed(0)
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
      }
    };
    
    fetchProjectDetails();
  }, [formData.projectId, token, isAuthenticated, percentageMode, formData.percentage]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }
    
    if (!formData.billingDate) {
      newErrors.billingDate = 'Billing date is required';
    }
    
    if (percentageMode) {
      if (!formData.percentage) {
        newErrors.percentage = 'Percentage is required';
      } else if (isNaN(parseFloat(formData.percentage)) || parseFloat(formData.percentage) <= 0 || parseFloat(formData.percentage) > 100) {
        newErrors.percentage = 'Percentage must be between 0 and 100';
      }
    }
    
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    
    if (!formData.status) {
      newErrors.status = 'Status is required';
    } else if (!['unpaid', 'partially_paid', 'paid'].includes(formData.status)) {
      newErrors.status = 'Status must be unpaid, partially_paid, or paid';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      console.error('Form validation errors:', newErrors);
    }
    
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
    
    // If project changes, reset percentage and amount
    if (name === 'projectId') {
      setFormData(prev => ({
        ...prev,
        percentage: '',
        amount: '',
      }));
    }
  };

  // Handle number input change
  const handleNumberChange = (name, value) => {
    // Ensure value is a valid number
    let parsedValue = value;
    
    // Remove non-numeric characters except decimals
    parsedValue = parsedValue.toString().replace(/[^\d.]/g, '');
    
    // Ensure it's a valid number
    if (parsedValue && !isNaN(parseFloat(parsedValue))) {
      parsedValue = parseFloat(parsedValue).toString();
    }
    
    setFormData({
      ...formData,
      [name]: parsedValue,
    });
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
    
    // Update amount or percentage based on mode
    if (name === 'percentage' && percentageMode && projectTotalValue > 0) {
      const calculatedAmount = (parseFloat(parsedValue) / 100) * projectTotalValue;
      setFormData(prev => ({
        ...prev,
        amount: calculatedAmount.toFixed(0)
      }));
    } else if (name === 'amount' && !percentageMode && projectTotalValue > 0) {
      const calculatedPercentage = (parseFloat(parsedValue) / projectTotalValue) * 100;
      setFormData(prev => ({
        ...prev,
        percentage: calculatedPercentage.toFixed(2)
      }));
    }
  };

  // Toggle between percentage and amount mode
  const togglePercentageMode = () => {
    setPercentageMode(!percentageMode);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Check file type (images, PDFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image (JPEG, PNG, GIF) or PDF',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      // Show an icon for non-image files
      setFilePreview('');
    }
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clear current invoice
  const clearCurrentInvoice = () => {
    setCurrentInvoice(null);
    // Enable user to upload a new invoice after clearing the current one
    setSelectedFile(null);
    setFilePreview('');
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
      // Create form data for file upload
      const formDataObj = new FormData();
      formDataObj.append('projectId', formData.projectId);
      formDataObj.append('billingDate', formData.billingDate);
      formDataObj.append('percentage', formData.percentage || '');
      formDataObj.append('amount', formData.amount);
      formDataObj.append('description', formData.description || '');
      formDataObj.append('status', formData.status);
      formDataObj.append('dueDate', formData.dueDate || '');
      
      if (selectedFile) {
        formDataObj.append('invoice', selectedFile);
      }
      
      let response;
      
      if (billing && billing.id) {
        // Update existing billing
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/billings/${billing.id}`,
          formDataObj,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else {
        // Create new billing
        response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/billings`,
          formDataObj,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      
      if (response.data.success) {
        // Only show success toast when creating a new billing, not when updating
        if (!billing) {
          toast({
            title: 'Success',
            description: 'Billing created successfully',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
        
        if (onSubmitSuccess) {
          onSubmitSuccess(response.data.data);
        }
        
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to save billing');
      }
    } catch (error) {
      console.error('Error saving billing:', error);
      
      let errorMessage = 'Failed to save billing';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 413) {
          errorMessage = 'The invoice file is too large. Please use a smaller file.';
        } else if (error.response.status === 401) {
          errorMessage = 'Your session has expired. Please login again.';
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message;
      }
      
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

  // Render file preview based on type
  const renderFilePreview = () => {
    if (!currentInvoice) return null;
    
    // Check if it's an image
    const isImage = currentInvoice.match(/\.(jpeg|jpg|png|gif)$/i);
    
    // Construct proper URL for invoice
    const invoiceUrl = currentInvoice.startsWith('http') 
      ? currentInvoice 
      : `${process.env.NEXT_PUBLIC_API_URL}${currentInvoice}`;
    
    console.log('Rendered invoice URL:', invoiceUrl);
    
    return (
      <Box mt={2} p={2} borderWidth="1px" borderRadius="md">
        <HStack justifyContent="space-between">
          {isImage ? (
            <Image 
              src={invoiceUrl}
              alt="Invoice"
              boxSize="100px"
              objectFit="cover"
              borderRadius="md"
            />
          ) : (
            <HStack>
              <FiFile size={24} />
              <Text>Invoice document</Text>
            </HStack>
          )}
          <HStack>
            <IconButton
              icon={<FiDownload />}
              size="sm"
              aria-label="Download file"
              onClick={() => window.open(invoiceUrl, '_blank')}
            />
            <IconButton
              icon={<FiX />}
              size="sm"
              aria-label="Remove file"
              onClick={clearCurrentInvoice}
            />
          </HStack>
        </HStack>
      </Box>
    );
  };

  // Get selected project name
  const getSelectedProjectName = () => {
    if (!formData.projectId) return 'Select a project';
    const project = projects.find(p => p.id.toString() === formData.projectId.toString());
    return project ? project.name : 'Unknown project';
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{billing ? 'Edit Invoice' : 'Create New Invoice'}</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={errors.projectId}>
                <FormLabel>Project</FormLabel>
                <Select
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleChange}
                  placeholder="Select project"
                  isDisabled={!!billing} // Disable if editing existing billing
                  isRequired
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id.toString()}>
                      {project.name} ({formatCurrency(project.totalValue)})
                    </option>
                  ))}
                </Select>
                {projectTotalValue > 0 && (
                  <FormHelperText>
                    Project Total Value: {formatCurrency(projectTotalValue)}
                  </FormHelperText>
                )}
                <FormErrorMessage>{errors.projectId}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.billingDate}>
                <FormLabel>Billing Date</FormLabel>
                <Input
                  name="billingDate"
                  type="date"
                  value={formData.billingDate}
                  onChange={handleChange}
                  isRequired
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
                  isRequired
                />
                <FormErrorMessage>{errors.dueDate}</FormErrorMessage>
              </FormControl>

              <Flex width="100%" justifyContent="space-between" alignItems="center">
                <Text>Calculate by:</Text>
                <Button 
                  size="sm" 
                  onClick={togglePercentageMode}
                  colorScheme={percentageMode ? "blue" : "gray"}
                  variant={percentageMode ? "solid" : "outline"}
                  mr={2}
                >
                  Percentage
                </Button>
                <Button 
                  size="sm" 
                  onClick={togglePercentageMode}
                  colorScheme={!percentageMode ? "blue" : "gray"}
                  variant={!percentageMode ? "solid" : "outline"}
                >
                  Amount
                </Button>
              </Flex>

              {percentageMode && (
                <FormControl isInvalid={errors.percentage}>
                  <FormLabel>Percentage of Project Value</FormLabel>
                  <HStack spacing={4}>
                    <NumberInput
                      min={1}
                      max={100}
                      step={1}
                      value={formData.percentage}
                      onChange={(value) => handleNumberChange('percentage', value)}
                      flex="1"
                    >
                      <NumberInputField placeholder="Enter percentage" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Text>%</Text>
                  </HStack>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={parseFloat(formData.percentage) || 0}
                    onChange={(value) => handleNumberChange('percentage', value)}
                    mt={2}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <FormErrorMessage>{errors.percentage}</FormErrorMessage>
                </FormControl>
              )}

              <FormControl isInvalid={errors.amount}>
                <FormLabel>Amount</FormLabel>
                <NumberInput
                  min={1}
                  precision={0}
                  step={1000}
                  value={formData.amount}
                  onChange={(value) => handleNumberChange('amount', value)}
                  isDisabled={percentageMode}
                  isRequired
                >
                  <NumberInputField placeholder="Enter amount" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <FormHelperText>
                  {formatCurrency(formData.amount)}
                </FormHelperText>
                <FormErrorMessage>{errors.amount}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter billing description or notes"
                  rows={3}
                />
              </FormControl>

              <FormControl isInvalid={errors.status}>
                <FormLabel>Status</FormLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  isRequired
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                </Select>
                <FormErrorMessage>{errors.status}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Invoice Document</FormLabel>
                {renderFilePreview()}
                
                {selectedFile && (
                  <Box mt={2} p={2} borderWidth="1px" borderRadius="md">
                    <HStack justifyContent="space-between">
                      <HStack>
                        {selectedFile.type.startsWith('image/') ? (
                          <Image
                            src={filePreview}
                            alt="File preview"
                            boxSize="40px"
                            objectFit="cover"
                            borderRadius="md"
                          />
                        ) : (
                          <FiFile size={24} />
                        )}
                        <VStack align="start" spacing={0}>
                          <Text>{selectedFile.name}</Text>
                          <Text fontSize="xs" color="gray.500">{(selectedFile.size / 1024).toFixed(2)} KB</Text>
                        </VStack>
                      </HStack>
                      <IconButton
                        icon={<FiX />}
                        size="sm"
                        aria-label="Remove file"
                        onClick={clearSelectedFile}
                      />
                    </HStack>
                  </Box>
                )}
                
                {!selectedFile && !currentInvoice && (
                  <Button 
                    leftIcon={<FiUpload />} 
                    onClick={() => fileInputRef.current.click()}
                    variant="outline"
                    width="100%"
                    isDisabled={isUploadingFile}
                  >
                    Upload Invoice
                  </Button>
                )}
                
                <Input
                  id="file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  display="none"
                />
                
                <FormHelperText>
                  Upload invoice document (max 5MB, image or PDF)
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={onClose} variant="ghost" isDisabled={isSubmitting || isUploadingFile}>
              Cancel
            </Button>
            <Button 
              colorScheme="teal" 
              type="submit" 
              isLoading={isSubmitting || isUploadingFile}
              loadingText={isUploadingFile ? "Uploading" : "Saving"}
              isDisabled={isUploadingFile}
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