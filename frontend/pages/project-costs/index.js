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
  useToast,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Text,
} from '@chakra-ui/react';
import { FiSearch, FiEdit, FiTrash2, FiMoreVertical, FiFilter, FiPlus, FiDownload } from 'react-icons/fi';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import ProjectCostForm from '../../components/projects/ProjectCostForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';

// Cost categories with their colors
const COST_CATEGORIES = {
  'material': { label: 'Material', color: 'blue' },
  'labor': { label: 'Labor', color: 'green' },
  'equipment': { label: 'Equipment', color: 'purple' },
  'rental': { label: 'Rental', color: 'orange' },
  'services': { label: 'Services', color: 'teal' },
  'other': { label: 'Other', color: 'gray' },
};

// Payment status colors
const STATUS_COLORS = {
  'pending': 'orange',
  'approved': 'green',
  'rejected': 'red',
};

const ProjectCostsPage = () => {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [costs, setCosts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCost, setSelectedCost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Fetch project costs
  const fetchCosts = async () => {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to view project costs');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch all projects first to get project names
      const projectsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const projectsList = projectsResponse.data.data || [];
      setProjects(projectsList);
      
      if (projectsList.length === 0) {
        setCosts([]);
        setLoading(false);
        return;
      }
      
      // Fetch costs for all projects
      const allCostsPromises = projectsList.map(project => 
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${project.id}/costs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );
      
      const costsResponses = await Promise.all(allCostsPromises);
      
      // Combine all costs from different projects
      const allCosts = costsResponses.flatMap((response, index) => {
        const projectCosts = response.data.data || [];
        return projectCosts;
      });
      
      setCosts(allCosts);
      setError(null);
    } catch (error) {
      console.error('Error fetching project costs:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError('Failed to load project costs. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchCosts();
    }
  }, [token, isAuthenticated]);

  // Filter costs based on search term and filters
  const filteredCosts = costs.filter((cost) => {
    const matchesSearch = searchTerm === '' || 
      cost.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === '' || cost.category === categoryFilter;
    
    const matchesProject = projectFilter === '' || 
      cost.projectId.toString() === projectFilter;
    
    const matchesStatus = statusFilter === '' || cost.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesProject && matchesStatus;
  });

  // Get project name by id
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'N/A';
  };

  // Handle delete cost
  const handleDelete = async (costId) => {
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

    if (window.confirm('Are you sure you want to delete this cost entry?')) {
      try {
        // Find the cost to get its projectId
        const costToDelete = costs.find(cost => cost.id === costId);
        
        if (!costToDelete) {
          toast({
            title: 'Error',
            description: 'Cost entry not found',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${costToDelete.projectId}/costs/${costId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        toast({
          title: 'Success',
          description: 'Cost entry deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Refresh the costs list
        fetchCosts();
      } catch (error) {
        console.error('Error deleting cost entry:', error);
        
        if (error.response?.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please login again.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        } else {
          const errorMessage = error.response?.data?.message || 'Failed to delete cost entry';
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

  // Open form to add/edit cost
  const handleEditCost = (cost = null) => {
    setSelectedCost(cost);
    onOpen();
  };

  // Handle successful form submission
  const handleFormSuccess = () => {
    fetchCosts();
    onClose();
  };

  // Handle view receipt/attachment
  const handleViewReceipt = (cost) => {
    if (cost.receipt) {
      const receiptUrl = cost.receipt.startsWith('http') 
        ? cost.receipt 
        : `${process.env.NEXT_PUBLIC_API_URL}${cost.receipt}`;
      console.log('Opening receipt URL:', receiptUrl);
      window.open(receiptUrl, '_blank');
    } else {
      toast({
        title: 'No Receipt',
        description: 'This cost entry does not have a receipt attached',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Navigate to project detail
  const handleProjectClick = (projectId) => {
    router.push(`/projects/${projectId}`);
  };

  // Calculate total filtered costs
  const totalFilteredCosts = filteredCosts.reduce((sum, cost) => sum + parseFloat(cost.amount), 0);

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Project Costs
        </Heading>
        <Button 
          colorScheme="teal" 
          leftIcon={<FiPlus />}
          onClick={() => handleEditCost()}
          isDisabled={!isAuthenticated || projects.length === 0}
        >
          Add Cost
        </Button>
      </Flex>

      <Flex mb={6} direction={{ base: 'column', md: 'row' }} gap={4} wrap="wrap">
        <InputGroup maxW={{ md: '300px' }}>
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        <Select
          placeholder="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          maxW={{ md: '200px' }}
        >
          <option value="">All categories</option>
          {Object.entries(COST_CATEGORIES).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>

        <Select
          placeholder="Filter by project"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          maxW={{ md: '200px' }}
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id.toString()}>{project.name}</option>
          ))}
        </Select>

        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          maxW={{ md: '200px' }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
      </Flex>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading project costs..." />
      ) : filteredCosts.length === 0 ? (
        <EmptyState 
          title="No project costs found" 
          message={searchTerm || categoryFilter || projectFilter || statusFilter ? 
            'Try adjusting your search filters.' : 
            'Click the "Add Cost" button to create your first project cost entry.'}
          actionText={!searchTerm && !categoryFilter && !projectFilter && !statusFilter ? "Add Cost" : null}
          onAction={!searchTerm && !categoryFilter && !projectFilter && !statusFilter ? () => handleEditCost() : null}
        />
      ) : (
        <>
          <Flex justify="flex-end" mb={4}>
            <Text fontWeight="bold">
              Total: {formatCurrency(totalFilteredCosts)}
            </Text>
          </Flex>
          
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Project</Th>
                  <Th>Category</Th>
                  <Th>Description</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredCosts.map((cost) => (
                  <Tr key={cost.id}>
                    <Td>{formatDate(cost.date)}</Td>
                    <Td>
                      <Button 
                        variant="link" 
                        color="blue.500" 
                        onClick={() => handleProjectClick(cost.projectId)}
                      >
                        {getProjectName(cost.projectId)}
                      </Button>
                    </Td>
                    <Td>
                      <Badge 
                        colorScheme={COST_CATEGORIES[cost.category]?.color || 'gray'}
                      >
                        {COST_CATEGORIES[cost.category]?.label || cost.category}
                      </Badge>
                    </Td>
                    <Td maxW="300px" isTruncated>{cost.description}</Td>
                    <Td isNumeric fontWeight="semibold">{formatCurrency(cost.amount)}</Td>
                    <Td>
                      <Badge 
                        colorScheme={STATUS_COLORS[cost.status] || 'gray'}
                      >
                        {cost.status.charAt(0).toUpperCase() + cost.status.slice(1)}
                      </Badge>
                    </Td>
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
                            onClick={() => handleEditCost(cost)}
                          >
                            Edit
                          </MenuItem>
                          <MenuItem 
                            icon={<FiDownload />} 
                            onClick={() => handleViewReceipt(cost)}
                            isDisabled={!cost.attachmentUrl && !cost.receipt}
                          >
                            View Receipt
                          </MenuItem>
                          <MenuItem 
                            icon={<FiTrash2 />} 
                            color="red.500"
                            onClick={() => handleDelete(cost.id)}
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
        </>
      )}

      {/* Project Cost Form Modal */}
      {isOpen && (
        <ProjectCostForm
          isOpen={isOpen}
          onClose={onClose}
          projectId={selectedCost?.projectId || null}
          cost={selectedCost}
          onSubmitSuccess={handleFormSuccess}
          projects={projects}
          categories={COST_CATEGORIES}
        />
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedProjectCostsPage = () => (
  <ProtectedRoute>
    <ProjectCostsPage />
  </ProtectedRoute>
);

export default ProtectedProjectCostsPage; 