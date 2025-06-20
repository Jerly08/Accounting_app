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
  Input,
  Select,
  Textarea,
  NumberInput,
  NumberInputField,
  VStack,
  HStack,
  Box,
  Text,
  Icon,
  useToast,
  FormHelperText,
  InputGroup,
  InputRightElement,
  IconButton,
  Image,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX, FiCheck, FiDownload } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// Default cost categories if not provided as props
const DEFAULT_CATEGORIES = {
  'material': { label: 'Material', color: 'blue' },
  'labor': { label: 'Labor', color: 'green' },
  'equipment': { label: 'Equipment', color: 'purple' },
  'rental': { label: 'Rental', color: 'orange' },
  'services': { label: 'Services', color: 'teal' },
  'other': { label: 'Other', color: 'gray' },
};

const ProjectCostForm = ({ 
  isOpen, 
  onClose, 
  projectId, 
  cost, 
  onSubmitSuccess,
  categories = DEFAULT_CATEGORIES,
  projects = []
}) => {
  // Initial form data
  const initialFormData = {
    projectId: projectId || '',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
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
    if (cost) {
      setFormData({
        projectId: cost.projectId?.toString() || projectId?.toString() || '',
        category: cost.category || '',
        description: cost.description || '',
        amount: cost.amount ? cost.amount.toString() : '',
        date: cost.date ? new Date(cost.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: cost.status || 'pending',
      });
      
      if (cost.receipt) {
        setCurrentReceipt(cost.receipt);
      }
    } else {
      // When adding new cost, set default category if none was provided
      setFormData({
        ...initialFormData,
        projectId: projectId || '',
        category: initialFormData.category || Object.keys(categories)[0] || '',
      });
      setCurrentReceipt(null);
    }
    
    // Reset file state
    setSelectedFile(null);
    setFilePreview('');
    setErrors({});
  }, [cost, projectId, isOpen, categories]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.description || !formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      // Validate date format
      try {
        new Date(formData.date);
      } catch (e) {
        newErrors.date = 'Invalid date format';
      }
    }
    
    if (!formData.status) {
      newErrors.status = 'Status is required';
    } else if (!['pending', 'approved', 'rejected'].includes(formData.status)) {
      newErrors.status = 'Status must be pending, approved, or rejected';
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
    
    // Check file type (images, PDFs, docs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image (JPEG, PNG, GIF), PDF, or document',
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

  // Clear current receipt
  const clearCurrentReceipt = () => {
    setCurrentReceipt(null);
    // Enable user to upload a new receipt after clearing the current one
    setSelectedFile(null);
    setFilePreview('');
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
      // Store projectId in a separate variable before removing it from costData
      const projectIdForUrl = formData.projectId;
      
      // Remove projectId from cost data as it's part of the URL
      const { projectId: projectIdValue, ...costDataWithoutProjectId } = formData;
      
      // Ensure numeric fields are properly converted
      const amountValue = parseFloat(formData.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Amount must be a positive number');
      }
      
      // Ensure date is properly formatted
      const dateObj = new Date(formData.date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date format');
      }
      
      const costData = {
        category: formData.category || '', // Ensure we don't send undefined
        description: (formData.description || '').trim(), // Ensure we don't send undefined and trim
        amount: amountValue,
        date: dateObj.toISOString().split('T')[0],
        status: formData.status || 'pending'
      };
      
      // Final validation before sending to API
      if (!costData.category) {
        throw new Error('Category is required');
      }
      
      if (!costData.description) {
        throw new Error('Description is required');
      }
      
      // Log the entire payload for debugging
      console.log('Submitting cost data:', {
        url: `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectIdForUrl}/costs${cost ? `/${cost.id}` : ''}`,
        method: cost ? 'PUT' : 'POST',
        payload: costData,
        rawFormData: formData // Log the original form data for comparison
      });
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      
      let response;
      let costId;
      let newReceipt = null;
      
      if (cost) {
        // Update existing cost
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectIdForUrl}/costs/${cost.id}`,
          costData,
          config
        );
        
        costId = cost.id;
        newReceipt = response.data?.data?.receipt;
      } else {
        // Create new cost
        response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectIdForUrl}/costs`,
          costData,
          config
        );
        
        console.log('Create cost response:', response.data);
        
        const responseData = response.data?.data || response.data;
        costId = responseData?.id;
        newReceipt = responseData?.receipt;
        
        if (!costId) {
          console.error('No cost ID returned from API. Full response:', response.data);
          throw new Error('Failed to get cost ID from server response');
        }
      }
      
      // If we have a receipt from the server response, update the current receipt state
      if (newReceipt) {
        setCurrentReceipt(newReceipt);
      }
      
      // Handle file upload if there's a new file or receipt was cleared
      if (costId) {
        if (selectedFile) {
          // Upload new file
          const formDataForFile = new FormData();
          formDataForFile.append('receipt', selectedFile);
          
          try {
            console.log('Uploading receipt for cost ID:', costId);
            setIsUploadingFile(true);
            
            const uploadConfig = {
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`,
              },
            };
            
            const uploadResponse = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectIdForUrl}/costs/${costId}/receipt`,
              formDataForFile,
              uploadConfig
            );
            
            console.log('Upload receipt response:', uploadResponse.data);
            // Set the current receipt to the newly uploaded one
            if (uploadResponse.data?.data?.receiptPath) {
              setCurrentReceipt(uploadResponse.data.data.receiptPath);
            }
          } catch (uploadError) {
            console.error('Error uploading receipt:', uploadError);
            
            // Log more details about the error
            if (uploadError.response) {
              console.error('Response status:', uploadError.response.status);
              console.error('Response data:', uploadError.response.data);
            }
            
            // Still show success for the cost, but warning for the receipt
            toast({
              title: 'Warning',
              description: 'Cost saved but failed to upload receipt: ' + 
                (uploadError.response?.data?.message || uploadError.message || 'Unknown error'),
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
          } finally {
            setIsUploadingFile(false);
          }
        } else if (cost?.receipt && !currentReceipt) {
          // Receipt was cleared, delete it
          try {
            await axios.delete(
              `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectIdForUrl}/costs/${costId}/receipt`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
          } catch (deleteError) {
            console.error('Error deleting receipt:', deleteError);
            // Still show success for the cost, but warning for the receipt deletion
            toast({
              title: 'Warning',
              description: 'Cost saved but failed to remove receipt: ' + 
                (deleteError.response?.data?.message || deleteError.message || 'Unknown error'),
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
          }
        }
      }
      
      toast({
        title: 'Success',
        description: cost ? 'Cost updated successfully' : 'Cost added successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving project cost:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
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
        onClose();
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to save project cost';
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

  // Render file preview based on type
  const renderFilePreview = () => {
    if (!currentReceipt) return null;
    
    // Check if it's an image
    const isImage = currentReceipt.match(/\.(jpeg|jpg|png|gif)$/i);
    
    // Construct proper URL for receipt
    const receiptUrl = currentReceipt.startsWith('http') 
      ? currentReceipt 
      : `${process.env.NEXT_PUBLIC_API_URL}${currentReceipt}`;
    
    console.log('Rendered receipt URL:', receiptUrl);
    
    return (
      <Box mt={2} p={2} borderWidth="1px" borderRadius="md">
        <HStack justifyContent="space-between">
          {isImage ? (
            <Image 
              src={receiptUrl}
              alt="Receipt"
              boxSize="100px"
              objectFit="cover"
              borderRadius="md"
            />
          ) : (
            <HStack>
              <FiFile size={24} />
              <Text>Receipt document</Text>
            </HStack>
          )}
          <HStack>
            <IconButton
              icon={<FiDownload />}
              size="sm"
              aria-label="Download file"
              onClick={() => window.open(receiptUrl, '_blank')}
            />
            <IconButton
              icon={<FiX />}
              size="sm"
              aria-label="Remove file"
              onClick={clearCurrentReceipt}
            />
          </HStack>
        </HStack>
      </Box>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{cost ? 'Edit Cost' : 'Add New Cost'}</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              {!projectId && projects.length > 0 && (
                <FormControl isInvalid={errors.projectId}>
                  <FormLabel>Project</FormLabel>
                  <Select
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleChange}
                    placeholder="Select project"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id.toString()}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                  <FormErrorMessage>{errors.projectId}</FormErrorMessage>
                </FormControl>
              )}

              <FormControl isInvalid={errors.category}>
                <FormLabel>Category</FormLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Select category"
                  isRequired
                >
                  {Object.entries(categories).map(([value, { label }]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.category}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.description}>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter cost description"
                  rows={3}
                  isRequired
                />
                <FormErrorMessage>{errors.description}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.amount}>
                <FormLabel>Amount</FormLabel>
                <NumberInput
                  min={1}
                  precision={0}
                  step={1000}
                  value={formData.amount}
                  onChange={(value) => handleNumberChange('amount', value)}
                  isRequired
                >
                  <NumberInputField placeholder="Enter amount" />
                </NumberInput>
                <FormErrorMessage>{errors.amount}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.date}>
                <FormLabel>Date</FormLabel>
                <Input
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  isRequired
                />
                <FormErrorMessage>{errors.date}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.status}>
                <FormLabel>Status</FormLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  isRequired
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Select>
                <FormErrorMessage>{errors.status}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Receipt/Attachment</FormLabel>
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
                
                {!selectedFile && !currentReceipt && (
                  <Button 
                    leftIcon={<FiUpload />} 
                    onClick={() => fileInputRef.current.click()}
                    variant="outline"
                    width="100%"
                    isDisabled={isUploadingFile}
                  >
                    Upload Receipt
                  </Button>
                )}
                
                <Input
                  id="file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,application/pdf,.doc,.docx"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  display="none"
                />
                
                <FormHelperText>
                  Upload receipt or supporting document (max 5MB, image, PDF, or document)
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
              {cost ? 'Update' : 'Add'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default ProjectCostForm; 