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
  Select,
  Spinner,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useDisclosure,
  CloseButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { FiInfo, FiPlusCircle } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import React from 'react';

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

  // Initial project cost form data
  const initialCostData = {
    category: 'labor',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [costData, setCostData] = useState(initialCostData);
  const [errors, setErrors] = useState({});
  const [costErrors, setCostErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingCost, setIsAddingCost] = useState(false);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectData, setSelectedProjectData] = useState(null);
  const [showAddCostForm, setShowAddCostForm] = useState(false);
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();
  const router = useRouter();

  // Add state for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelRef = React.useRef();

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

  // Fetch available projects when creating a new WIP entry
  useEffect(() => {
    const fetchProjects = async () => {
      if (!project && isOpen && token) {
        try {
          setLoadingProjects(true);
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/projects`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          setAvailableProjects(response.data.data || []);
        } catch (error) {
          console.error('Error fetching projects:', error);
          toast({
            title: 'Error',
            description: 'Failed to load projects. Please try again.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        } finally {
          setLoadingProjects(false);
        }
      }
    };

    fetchProjects();
  }, [isOpen, project, token, toast]);

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
      setSelectedProjectData(project);
    } else {
      // Reset form when adding new WIP entry
      setFormData(initialFormData);
      setSelectedProjectData(null);
    }
    
    setErrors({});
  }, [project, isOpen]);

  // Fetch project details when a project is selected
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!project && formData.projectId && token) {
        try {
          setLoadingProjects(true);
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/wip/${formData.projectId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          if (response.data.data) {
            const projectData = response.data.data;
            setSelectedProjectData(projectData);
            
            // Update form with actual project data
            setFormData(prev => ({
              ...prev,
              progress: projectData.progress || 0,
              totalCosts: projectData.costs || 0,
              totalBilled: projectData.billed || 0,
              wipValue: projectData.wipValue || 0,
            }));
            
            // Show add cost form if no costs exist
            if (projectData.costs === 0) {
              setShowAddCostForm(true);
            } else {
              setShowAddCostForm(false);
            }
          }
        } catch (error) {
          console.error('Error fetching project details:', error);
          toast({
            title: 'Error',
            description: 'Failed to load project details. Please try again.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          
          // Reset project selection on error
          setFormData(prev => ({
            ...prev,
            projectId: '',
          }));
          setSelectedProjectData(null);
        } finally {
          setLoadingProjects(false);
        }
      }
    };

    fetchProjectDetails();
  }, [formData.projectId, project, token, toast]);

  // Calculate WIP value when costs or billed amounts change
  useEffect(() => {
    const costs = parseFloat(formData.totalCosts) || 0;
    const billed = parseFloat(formData.totalBilled) || 0;
    
    // Reset billed to 0 if costs are 0 to avoid negative WIP
    if (costs === 0 && billed > 0) {
      setFormData(prev => ({
        ...prev,
        totalBilled: 0,
        wipValue: 0
      }));
      
      // Set error message
      setErrors(prev => ({
        ...prev,
        totalBilled: 'Cannot bill when there are no costs'
      }));
      return;
    }
    
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
      newErrors.projectId = 'Project selection is required';
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

    // Validasi tambahan: jika costs adalah 0, maka billed juga harus 0
    if (formData.totalCosts === 0 && formData.totalBilled > 0) {
      newErrors.totalBilled = 'Total billed cannot be greater than 0 when total costs are 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Cost form validation
  const validateCostForm = () => {
    const newErrors = {};
    
    if (!costData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!costData.description) {
      newErrors.description = 'Description is required';
    }
    
    if (costData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }
    
    if (!costData.date) {
      newErrors.date = 'Date is required';
    }
    
    setCostErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle cost form field changes
  const handleCostChange = (e) => {
    const { name, value } = e.target;
    setCostData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (costErrors[name]) {
      setCostErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle number input changes
  const handleNumberChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle cost number input changes
  const handleCostNumberChange = (name, value) => {
    setCostData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (costErrors[name]) {
      setCostErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  // Handle adding a project cost
  const handleAddCost = async () => {
    if (!validateCostForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please check the cost form for errors',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsAddingCost(true);
    
    try {
      const costPayload = {
        category: costData.category,
        description: costData.description,
        amount: parseFloat(costData.amount),
        date: new Date(costData.date).toISOString(),
        status: costData.status,
      };
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${formData.projectId}/costs`,
        costPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      toast({
        title: 'Success',
        description: 'Project cost added successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reset cost form
      setCostData(initialCostData);
      
      // Refresh project data to get updated costs
      if (formData.projectId) {
        try {
          const projectResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/wip/${formData.projectId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          if (projectResponse.data.data) {
            const projectData = projectResponse.data.data;
            setSelectedProjectData(projectData);
            
            // Update form with new project data
            setFormData(prev => ({
              ...prev,
              totalCosts: projectData.costs || 0,
              wipValue: (projectData.costs || 0) - (projectData.billed || 0),
            }));
            
            // Hide the cost form if costs are now greater than 0
            if (projectData.costs > 0) {
              setShowAddCostForm(false);
            }
          }
        } catch (error) {
          console.error('Error refreshing project data:', error);
        }
      }
    } catch (error) {
      console.error('Error adding project cost:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add project cost',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAddingCost(false);
    }
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
    
    // Validasi tambahan untuk WIP negatif
    const wipValue = parseFloat(formData.wipValue);
    if (wipValue < 0 && formData.totalCosts === 0) {
      toast({
        title: 'Validation Error',
        description: 'Cannot create WIP with zero costs and non-zero billing. Please add project costs first.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setErrors(prev => ({
        ...prev,
        totalCosts: 'Project must have costs before billing can be recorded'
      }));
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
      
      // Check if WIP value is negative (over-billing situation)
      if (wipData.wipValue < 0) {
        const confirmOverBilling = window.confirm(
          'Warning: The WIP value is negative, indicating over-billing relative to costs. ' +
          'This may require accounting attention. Do you want to proceed?'
        );
        
        if (!confirmOverBilling) {
          setIsSubmitting(false);
          return;
        }
      }
      
      // Check if progress percentage is inconsistent with financial data
      const totalValue = selectedProjectData ? parseFloat(selectedProjectData.totalValue || 0) : 0;
      const financialProgress = totalValue > 0 ? (wipData.billed / totalValue) * 100 : 0;
      
      if (Math.abs(wipData.progress - financialProgress) > 20) {
        const confirmProgressDiscrepancy = window.confirm(
          `Warning: The manual progress (${wipData.progress.toFixed(1)}%) differs significantly ` +
          `from the financial progress (${financialProgress.toFixed(1)}%) based on billing. ` +
          'This discrepancy may require review. Do you want to proceed?'
        );
        
        if (!confirmProgressDiscrepancy) {
          setIsSubmitting(false);
          return;
        }
      }
      
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
      
      toast({
        title: 'Success',
        description: response.data.message || 'WIP data saved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Call success callback
      if (onSubmitSuccess) {
        onSubmitSuccess(response.data.data);
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error submitting WIP data:', error);
      
      // Handle specific validation errors from backend
      if (error.response?.status === 400) {
        const errorMessage = error.response.data.message || 'Validation error';
        
        // Check for specific validation errors
        if (error.response.data.expectedCosts !== undefined) {
          setFormData(prev => ({
            ...prev,
            totalCosts: error.response.data.expectedCosts
          }));
          
          toast({
            title: 'Validation Error',
            description: `${errorMessage}. The form has been updated with the correct costs.`,
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        } else if (error.response.data.expectedBilled !== undefined) {
          setFormData(prev => ({
            ...prev,
            totalBilled: error.response.data.expectedBilled
          }));
          
          toast({
            title: 'Validation Error',
            description: `${errorMessage}. The form has been updated with the correct billed amount.`,
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        } else if (error.response.data.expectedWipValue !== undefined) {
          setFormData(prev => ({
            ...prev,
            wipValue: error.response.data.expectedWipValue
          }));
          
          toast({
            title: 'Validation Error',
            description: `${errorMessage}. The form has been updated with the correct WIP value.`,
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        } else if (errorMessage.includes('project cost')) {
          // Handle missing project costs
          toast({
            title: 'Project Costs Required',
            description: 'You must add at least one project cost before creating a WIP entry. Would you like to add a cost now?',
            status: 'error',
            duration: 8000,
            isClosable: true,
            render: ({ onClose }) => (
              <Box p={3} bg="red.600" borderRadius="md" color="white">
                <Flex justifyContent="space-between">
                  <Box>
                    <Text fontWeight="bold">Project Costs Required</Text>
                    <Text mt={1}>You must add at least one project cost before creating a WIP entry.</Text>
                  </Box>
                  <CloseButton size="sm" onClick={onClose} />
                </Flex>
                <Button 
                  mt={3} 
                  colorScheme="whiteAlpha" 
                  size="sm" 
                  onClick={() => {
                    setShowAddCostForm(true);
                    onClose();
                  }}
                >
                  Add Project Cost
                </Button>
              </Box>
            )
          });
        } else if (errorMessage.includes('billing')) {
          // Handle missing billings
          toast({
            title: 'Project Billing Required',
            description: 'You must add at least one billing entry before creating a WIP entry.',
            status: 'error',
            duration: 8000,
            isClosable: true,
            render: ({ onClose }) => (
              <Box p={3} bg="red.600" borderRadius="md" color="white">
                <Flex justifyContent="space-between">
                  <Box>
                    <Text fontWeight="bold">Project Billing Required</Text>
                    <Text mt={1}>You must add at least one billing entry before creating a WIP entry.</Text>
                  </Box>
                  <CloseButton size="sm" onClick={onClose} />
                </Flex>
                <Button 
                  mt={3} 
                  colorScheme="whiteAlpha" 
                  size="sm" 
                  onClick={() => {
                    onClose();
                    // Redirect to billing page for this project
                    if (formData.projectId) {
                      router.push(`/projects/${formData.projectId}/billing`);
                    }
                  }}
                >
                  Go to Billing
                </Button>
              </Box>
            )
          });
        } else if (errorMessage.includes('costs') && errorMessage.includes('billed')) {
          // Handle WIP validation errors related to costs and billed amounts
          toast({
            title: 'WIP Calculation Error',
            description: errorMessage,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          
          // Set error on the appropriate field
          if (formData.totalCosts === 0) {
            setErrors(prev => ({
              ...prev,
              totalCosts: 'Project must have costs before billing can be recorded'
            }));
          }
        } else {
          toast({
            title: 'Validation Error',
            description: errorMessage,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to save WIP data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle WIP deletion
  const handleDeleteWip = async () => {
    if (!project || !project.id) {
      toast({
        title: 'Error',
        description: 'No project selected',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/wip/${project.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      toast({
        title: 'Success',
        description: response.data.message || 'WIP data deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Call success callback
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      // Close the dialogs
      setIsDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      console.error('Error deleting WIP data:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete WIP data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {project ? 'Update WIP Data' : 'Add WIP Data'}
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Project Selection (only for new WIP entries) */}
              {!project && (
                <FormControl isRequired isInvalid={!!errors.projectId}>
                  <FormLabel>Select Project</FormLabel>
                  <Select
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleChange}
                    placeholder="Select a project"
                    isDisabled={loadingProjects}
                  >
                    {availableProjects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.projectCode})
                      </option>
                    ))}
                  </Select>
                  {errors.projectId && <FormErrorMessage>{errors.projectId}</FormErrorMessage>}
                  {loadingProjects && (
                    <Box mt={2} display="flex" alignItems="center">
                      <Spinner size="sm" mr={2} />
                      <Text fontSize="sm">Loading project data...</Text>
                    </Box>
                  )}
                </FormControl>
              )}
              
              {/* Project Info (when selected) */}
              {selectedProjectData && (
                <Box p={3} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">{selectedProjectData.name}</Text>
                  <Text fontSize="sm">Code: {selectedProjectData.projectCode}</Text>
                  <Text fontSize="sm">
                    Total Value: {formatCurrency(selectedProjectData.totalValue || 0)}
                  </Text>
                  {selectedProjectData.client && (
                    <Text fontSize="sm">Client: {selectedProjectData.client.name}</Text>
                  )}
                </Box>
              )}
              
              {/* Add Project Cost Form (when no costs exist) */}
              {showAddCostForm && selectedProjectData && (
                <>
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box flex="1">
                      <AlertTitle>No Project Costs Found</AlertTitle>
                      <AlertDescription>
                        This project has no costs recorded. Add at least one cost entry to create WIP data.
                      </AlertDescription>
                    </Box>
                  </Alert>
                  
                  <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
                    <Text fontWeight="bold" mb={3}>Add Project Cost</Text>
                    
                    <VStack spacing={3} align="stretch">
                      <FormControl isRequired isInvalid={!!costErrors.category}>
                        <FormLabel>Category</FormLabel>
                        <Select
                          name="category"
                          value={costData.category}
                          onChange={handleCostChange}
                        >
                          <option value="labor">Labor</option>
                          <option value="material">Material</option>
                          <option value="equipment">Equipment</option>
                          <option value="subcontractor">Subcontractor</option>
                          <option value="overhead">Overhead</option>
                          <option value="other">Other</option>
                        </Select>
                        {costErrors.category && <FormErrorMessage>{costErrors.category}</FormErrorMessage>}
                      </FormControl>
                      
                      <FormControl isRequired isInvalid={!!costErrors.description}>
                        <FormLabel>Description</FormLabel>
                        <Input
                          name="description"
                          value={costData.description}
                          onChange={handleCostChange}
                          placeholder="Enter cost description"
                        />
                        {costErrors.description && <FormErrorMessage>{costErrors.description}</FormErrorMessage>}
                      </FormControl>
                      
                      <FormControl isRequired isInvalid={!!costErrors.amount}>
                        <FormLabel>Amount</FormLabel>
                        <NumberInput
                          value={costData.amount}
                          onChange={(value) => handleCostNumberChange('amount', value)}
                          min={0}
                          step={1000}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                        {costErrors.amount && <FormErrorMessage>{costErrors.amount}</FormErrorMessage>}
                        <FormHelperText>
                          {formatCurrency(costData.amount)}
                        </FormHelperText>
                      </FormControl>
                      
                      <FormControl isRequired isInvalid={!!costErrors.date}>
                        <FormLabel>Date</FormLabel>
                        <Input
                          name="date"
                          type="date"
                          value={costData.date}
                          onChange={handleCostChange}
                        />
                        {costErrors.date && <FormErrorMessage>{costErrors.date}</FormErrorMessage>}
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel>Status</FormLabel>
                        <Select
                          name="status"
                          value={costData.status}
                          onChange={handleCostChange}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </Select>
                      </FormControl>
                      
                      <Button
                        leftIcon={<FiPlusCircle />}
                        colorScheme="blue"
                        variant="outline"
                        onClick={handleAddCost}
                        isLoading={isAddingCost}
                        mt={2}
                      >
                        Add Cost
                      </Button>
                    </VStack>
                  </Box>
                  
                  <Divider my={3} />
                </>
              )}
              
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
                  isReadOnly={selectedProjectData !== null}
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
                  {selectedProjectData && (
                    <Text fontSize="xs" color="gray.500">
                      (This value is calculated from actual project costs and cannot be edited directly)
                    </Text>
                  )}
                  <Text fontSize="xs" color={formData.totalCosts === 0 ? "red.500" : "gray.500"}>
                    {formData.totalCosts === 0 ? 
                      "Warning: Project must have costs before billing can be recorded" : 
                      "Costs must be recorded before billing for proper WIP calculation"}
                  </Text>
                </FormHelperText>
              </FormControl>
              
              <FormControl isInvalid={!!errors.totalBilled}>
                <FormLabel>Total Billed</FormLabel>
                <NumberInput
                  value={formData.totalBilled}
                  onChange={(value) => handleNumberChange('totalBilled', value)}
                  min={0}
                  step={1000}
                  isReadOnly={selectedProjectData !== null}
                  isDisabled={formData.totalCosts === 0}
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
                  {selectedProjectData && (
                    <Text fontSize="xs" color="gray.500">
                      (This value is calculated from actual project billings and cannot be edited directly)
                    </Text>
                  )}
                  {formData.totalCosts === 0 && (
                    <Text fontSize="xs" color="red.500">
                      Cannot record billing when total costs are zero
                    </Text>
                  )}
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
            {/* Add delete button if editing an existing WIP entry */}
            {project && project.id && (
              <Button 
                colorScheme="red" 
                variant="outline" 
                mr="auto"
                onClick={() => setIsDeleteDialogOpen(true)}
                isDisabled={isSubmitting}
              >
                Delete WIP
              </Button>
            )}
            
            <Button variant="ghost" onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              ml={3} 
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText="Saving"
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Delete confirmation dialog */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete WIP Data
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this WIP data? This will remove all WIP transactions and history for this project.
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteWip} 
                ml={3}
                isLoading={isDeleting}
                loadingText="Deleting"
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default WipForm; 