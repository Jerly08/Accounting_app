import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Badge,
  Select,
  HStack,
  useToast,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
} from '@chakra-ui/react';
import { FiSearch, FiEdit, FiTrash2, FiMoreVertical, FiFilter, FiFolderPlus } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import ProjectForm from '../../components/projects/ProjectForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';

// Status colors for badges
const statusColors = {
  ongoing: 'green',
  completed: 'blue',
  cancelled: 'red',
};

const ProjectsPage = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch projects from API
  const fetchProjects = async () => {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to view projects');
      setLoading(false);
      return;
    }

    try {
      // Build query parameters
      let queryParams = new URLSearchParams();
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      if (statusFilter) {
        queryParams.append('status', statusFilter);
      }
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setProjects(response.data.data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching projects:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError('Failed to load projects. Please try again later.');
      }
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  };

  // Watch for token and authentication changes
  useEffect(() => {
    if (token && isAuthenticated && !authLoading) {
      fetchProjects();
    }
  }, [token, isAuthenticated, authLoading]);

  // Handle auth loss during session
  useEffect(() => {
    if (!isAuthenticated && !authLoading && hasFetchedOnce) {
      setError('Your session has expired. Please login again.');
    }
  }, [isAuthenticated, authLoading, hasFetchedOnce]);

  // Filter projects based on search term and status filter
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      searchTerm === '' || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle project deletion
  const handleDelete = async (id) => {
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

    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        toast({
          title: 'Success',
          description: 'Project deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Refresh the projects list
        fetchProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        
        // Check if error is due to authentication
        if (error.response?.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please login again.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        } else {
          const errorMessage = error.response?.data?.message || 'Failed to delete project';
          toast({
            title: 'Error',
            description: errorMessage,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      }
    }
  };

  // Open form to add/edit project
  const handleEditProject = (project = null) => {
    setSelectedProject(project);
    onOpen();
  };

  // Handle successful form submission
  const handleFormSuccess = () => {
    fetchProjects();
    onClose();
  };

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Projects
        </Heading>
        <Button 
          colorScheme="teal" 
          leftIcon={<FiFolderPlus />}
          onClick={() => handleEditProject()}
          isDisabled={!isAuthenticated}
        >
          Add Project
        </Button>
      </Flex>

      <Flex mb={6} direction={{ base: 'column', md: 'row' }} gap={4}>
        <InputGroup maxW={{ md: '400px' }}>
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          maxW={{ md: '200px' }}
        >
          <option value="">All</option>
          <option value="ongoing">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Flex>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading projects..." />
      ) : filteredProjects.length === 0 ? (
        <EmptyState 
          title="No projects found" 
          message={searchTerm || statusFilter ? 'Try adjusting your search filters.' : 'Click the "Add Project" button to create your first project.'}
          actionText={!searchTerm && !statusFilter ? "Add Project" : null}
          onAction={!searchTerm && !statusFilter ? () => handleEditProject() : null}
        />
      ) : (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Project Code</Th>
                <Th>Name</Th>
                <Th>Client</Th>
                <Th>Status</Th>
                <Th>Total Value</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredProjects.map((project) => (
                <Tr key={project.id}>
                  <Td fontWeight="medium">{project.projectCode}</Td>
                  <Td>{project.name}</Td>
                  <Td>{project.client?.name || 'N/A'}</Td>
                  <Td>
                    <Badge colorScheme={statusColors[project.status] || 'gray'}>
                      {project.status === 'ongoing' ? 'Active' : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </Td>
                  <Td>{formatCurrency(project.totalValue)}</Td>
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem 
                          icon={<FiEdit />} 
                          onClick={() => handleEditProject(project)}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          color="red.500"
                          onClick={() => handleDelete(project.id)}
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* Project Form Modal */}
      {isOpen && (
        <ProjectForm
          isOpen={isOpen}
          onClose={onClose}
          project={selectedProject}
          onSubmitSuccess={handleFormSuccess}
        />
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedProjectsPage = () => (
  <ProtectedRoute>
    <ProjectsPage />
  </ProtectedRoute>
);

export default ProtectedProjectsPage; 