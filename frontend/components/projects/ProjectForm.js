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
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  VStack,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// Initial form data
const initialFormData = {
  projectCode: '',
  name: '',
  description: '',
  clientId: '',
  startDate: '',
  endDate: '',
  status: 'ongoing',
  totalValue: '',
  progress: 0,
};

const ProjectForm = ({ isOpen, onClose, project, onSubmitSuccess }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [clients, setClients] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isCheckingProjectCode, setIsCheckingProjectCode] = useState(false);
  const toast = useToast();
  const { token, isAuthenticated } = useAuth();

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

  // Load clients for dropdown
  useEffect(() => {
    const fetchClients = async () => {
      if (!token || !isAuthenticated) return;
      
      setIsLoadingClients(true);
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/clients`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setClients(response.data.data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
        
        if (error.response?.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please login again.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          onClose();
        }
      } finally {
        setIsLoadingClients(false);
      }
    };

    if (isOpen) {
      fetchClients();
    }
  }, [isOpen, token, isAuthenticated, toast, onClose]);

  // Set initial form data when editing
  useEffect(() => {
    if (project) {
      // Map frontend status to backend status if needed
      let projectStatus = project.status;
      if (projectStatus === 'active') projectStatus = 'ongoing';
      if (projectStatus === 'onhold') projectStatus = 'cancelled';
      
      setFormData({
        projectCode: project.projectCode || '',
        name: project.name || '',
        description: project.description || '',
        clientId: project.clientId?.toString() || '',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        status: projectStatus || 'ongoing',
        totalValue: project.totalValue ? project.totalValue.toString() : '',
        progress: project.progress !== undefined ? project.progress : 0,
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [project, isOpen]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectCode.trim()) {
      newErrors.projectCode = 'Project code is required';
    } else if (!/^[A-Za-z0-9-_]+$/.test(formData.projectCode.trim())) {
      newErrors.projectCode = 'Project code can only contain letters, numbers, dashes, and underscores';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    
    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    } else if (isNaN(parseInt(formData.clientId)) || parseInt(formData.clientId) <= 0) {
      newErrors.clientId = 'Invalid client selection';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }
    
    if (!formData.totalValue) {
      newErrors.totalValue = 'Total value is required';
    } else if (isNaN(formData.totalValue) || parseFloat(formData.totalValue) <= 0) {
      newErrors.totalValue = 'Total value must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if project code already exists
  const checkProjectCodeExists = async (code) => {
    if (!token || !isAuthenticated || !code) return false;
    
    setIsCheckingProjectCode(true);
    try {
      // Get all projects
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const projects = response.data.data || [];
      
      // Check if project code exists in another project
      const exists = projects.some(p => 
        p.projectCode === code && (!project || p.id !== project.id)
      );
      
      if (exists) {
        setErrors(prev => ({
          ...prev,
          projectCode: 'Project code already exists'
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking project code:', error);
      return false;
    } finally {
      setIsCheckingProjectCode(false);
    }
  };

  // Handle project code change with debounce
  const handleProjectCodeChange = async (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      projectCode: value
    }));
    
    // Clear error when field is changed
    setErrors(prev => ({
      ...prev,
      projectCode: undefined
    }));
    
    // Check if project code exists after a short delay
    if (value.trim()) {
      setTimeout(async () => {
        await checkProjectCodeExists(value.trim());
      }, 500);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle project code separately
    if (name === 'projectCode') {
      handleProjectCodeChange(e);
      return;
    }
    
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

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Double check if project code exists for new projects
    if (!project && formData.projectCode.trim()) {
      const exists = await checkProjectCodeExists(formData.projectCode.trim());
      if (exists) {
        return; // Stop form submission if project code exists
      }
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
      // Memformat data dengan benar
      const projectData = {
        projectCode: formData.projectCode.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        clientId: parseInt(formData.clientId),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        totalValue: parseFloat(formData.totalValue),
        status: formData.status,
        progress: parseFloat(formData.progress || 0)
      };
      
      // Log data yang akan dikirim
      console.log('Sending data to server:', projectData);
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      
      if (project) {
        // Update existing project
        try {
          console.log(`Updating project with ID: ${project.id}`);
          console.log('Update data:', projectData);
          
          const response = await axios.put(
            `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${project.id}`,
            projectData,
            config
          );
          
          console.log('Server response for update:', response.data);
          
          toast({
            title: 'Success',
            description: 'Project updated successfully',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        } catch (updateError) {
          console.error('Error updating project:', updateError);
          if (updateError.response) {
            console.error('Error response:', updateError.response.data);
            throw updateError;
          }
        }
      } else {
        // Create new project
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/projects`,
          projectData,
          config
        );
        
        console.log('Server response for create:', response.data);
        
        toast({
          title: 'Success',
          description: 'Project created successfully',
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
      console.error('Error saving project:', error);
      
      let errorMessage = 'Failed to save project';
      
      if (error.response?.data) {
        console.error('Error details:', error.response.data);
        errorMessage = error.response.data.message || errorMessage;
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
        <ModalHeader>{project ? 'Edit Project' : 'Add New Project'}</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={errors.projectCode}>
                <FormLabel>Project Code</FormLabel>
                <Input
                  name="projectCode"
                  value={formData.projectCode}
                  onChange={handleChange}
                  placeholder="Enter project code"
                  isDisabled={project ? true : false}
                />
                <FormErrorMessage>{errors.projectCode}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.name}>
                <FormLabel>Project Name</FormLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter project name"
                />
                <FormErrorMessage>{errors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.clientId}>
                <FormLabel>Client</FormLabel>
                <Select
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  placeholder="Select client"
                  isDisabled={isLoadingClients}
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.clientId}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter project description"
                  rows={3}
                />
              </FormControl>

              <FormControl isInvalid={errors.startDate}>
                <FormLabel>Start Date</FormLabel>
                <Input
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                />
                <FormErrorMessage>{errors.startDate}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>End Date</FormLabel>
                <Input
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl isInvalid={errors.status}>
                <FormLabel>Status</FormLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="ongoing">Active</option>
                  <option value="planned">Planned</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
                <FormErrorMessage>{errors.status}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.totalValue}>
                <FormLabel>Total Value</FormLabel>
                <NumberInput
                  min={0}
                  value={formData.totalValue}
                  onChange={(value) => handleNumberChange('totalValue', value)}
                >
                  <NumberInputField placeholder="Enter total project value" />
                </NumberInput>
                <FormErrorMessage>{errors.totalValue}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Progress (%)</FormLabel>
                <NumberInput
                  min={0}
                  max={100}
                  value={formData.progress}
                  onChange={(value) => handleNumberChange('progress', value)}
                >
                  <NumberInputField placeholder="Enter project progress percentage" />
                </NumberInput>
                <FormErrorMessage>{errors.progress}</FormErrorMessage>
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
              {project ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default ProjectForm; 