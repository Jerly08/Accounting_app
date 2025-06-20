import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Text,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  HStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { FiPlus, FiEdit, FiTrash2, FiMoreVertical, FiDownload } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import EmptyState from '../common/EmptyState';
import ProjectCostForm from './ProjectCostForm';

// Cost categories with their colors
const COST_CATEGORIES = {
  'material': { label: 'Material', color: 'blue' },
  'labor': { label: 'Tenaga Kerja', color: 'green' },
  'equipment': { label: 'Peralatan', color: 'purple' },
  'rental': { label: 'Sewa', color: 'orange' },
  'services': { label: 'Jasa', color: 'teal' },
  'other': { label: 'Lainnya', color: 'gray' },
};

// Payment status colors
const STATUS_COLORS = {
  'paid': 'green',
  'pending': 'orange',
  'rejected': 'red',
};

const ProjectCostsTab = ({ projectId }) => {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCost, setSelectedCost] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
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
  const fetchProjectCosts = async () => {
    if (!projectId || !token || !isAuthenticated) {
      setLoading(false);
      if (!projectId) {
        setError('Project ID is missing');
      } else {
        setError('You must be logged in to view project costs');
      }
      return;
    }

    try {
      setLoading(true);
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/costs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setCosts(response.data.data || []);
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
    if (projectId && token && isAuthenticated) {
      fetchProjectCosts();
    }
  }, [projectId, token, isAuthenticated]);

  // Calculate total costs
  const totalCosts = costs.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);

  // Handle delete cost
  const handleDeleteCost = async (costId) => {
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

    if (window.confirm('Are you sure you want to delete this cost entry? This action cannot be undone.')) {
      try {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/costs/${costId}`, {
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
        
        fetchProjectCosts();
      } catch (error) {
        console.error('Error deleting cost entry:', error);
        
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
  };

  // Handle form submission success
  const handleFormSuccess = () => {
    fetchProjectCosts();
    onClose();
  };

  // Open form to add/edit cost
  const handleEditCost = (cost = null) => {
    setSelectedCost(cost);
    onOpen();
  };

  // Handle view receipt/attachment
  const handleViewReceipt = (cost) => {
    if (cost.receipt) {
      const receiptUrl = cost.receipt.startsWith('http') 
        ? cost.receipt 
        : `${process.env.NEXT_PUBLIC_API_URL}${cost.receipt}`;
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

  if (loading) {
    return <LoadingSpinner text="Loading project costs..." />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text fontSize="lg" fontWeight="bold">Project Costs</Text>
          <Text color="gray.600">
            Total: {formatCurrency(totalCosts)}
          </Text>
        </Box>
        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="teal" 
          onClick={() => handleEditCost()}
        >
          Add Cost
        </Button>
      </Flex>

      {costs.length === 0 ? (
        <EmptyState
          title="No costs recorded yet"
          message="Start by adding your first project cost."
          actionText="Add Cost"
          onAction={() => handleEditCost()}
        />
      ) : (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Description</Th>
                <Th isNumeric>Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {costs.map((cost) => (
                <Tr key={cost.id}>
                  <Td>{formatDate(cost.date)}</Td>
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
                          isDisabled={!cost.receipt}
                        >
                          View Receipt
                        </MenuItem>
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          color="red.500"
                          onClick={() => handleDeleteCost(cost.id)}
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

      {/* Cost Form Modal */}
      {isOpen && (
        <ProjectCostForm
          isOpen={isOpen}
          onClose={onClose}
          projectId={projectId}
          cost={selectedCost}
          onSubmitSuccess={handleFormSuccess}
          categories={COST_CATEGORIES}
        />
      )}
    </Box>
  );
};

export default ProjectCostsTab; 