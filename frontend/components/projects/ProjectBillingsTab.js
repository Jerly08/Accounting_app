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
  Progress,
  HStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiMoreVertical, 
  FiDownload,
  FiDollarSign,
  FiCreditCard,
  FiFileText
} from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import EmptyState from '../common/EmptyState';
import BillingForm from './BillingForm';

// Payment status colors
const STATUS_COLORS = {
  'paid': 'green',
  'pending': 'orange',
  'overdue': 'red',
  'partial': 'yellow',
  'cancelled': 'gray',
};

const ProjectBillingsTab = ({ projectId }) => {
  const [billings, setBillings] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBilling, setSelectedBilling] = useState(null);
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

  // Calculate billing percentage
  const calculatePercentage = (billing) => {
    if (!project || !project.totalValue) return 0;
    return ((parseFloat(billing.amount) / parseFloat(project.totalValue)) * 100).toFixed(1);
  };

  // Fetch project details and billings
  const fetchProjectData = async () => {
    if (!projectId || !token || !isAuthenticated) {
      setLoading(false);
      if (!projectId) {
        setError('Project ID is missing');
      } else {
        setError('You must be logged in to view project billings');
      }
      return;
    }

    try {
      setLoading(true);
      
      // Fetch project details
      const projectResponse = await axios.get(`/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setProject(projectResponse.data.data || projectResponse.data);
      
      // Fetch project billings
      const billingsResponse = await axios.get(`/api/billings/project/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setBillings(billingsResponse.data.data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching project data:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError('Failed to load project billings. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && token && isAuthenticated) {
      fetchProjectData();
    }
  }, [projectId, token, isAuthenticated]);

  // Calculate billing stats
  const calculateBillingStats = () => {
    if (!billings.length) {
      return {
        totalBilled: 0,
        totalPaid: 0,
        percentageBilled: 0,
        percentagePaid: 0,
      };
    }

    const totalBilled = billings.reduce((sum, billing) => sum + (parseFloat(billing.amount) || 0), 0);
    const totalPaid = billings
      .filter(billing => billing.status === 'paid')
      .reduce((sum, billing) => sum + (parseFloat(billing.amount) || 0), 0);
    
    const percentageBilled = project?.totalValue 
      ? (totalBilled / parseFloat(project.totalValue)) * 100 
      : 0;
    
    const percentagePaid = project?.totalValue 
      ? (totalPaid / parseFloat(project.totalValue)) * 100 
      : 0;

    return {
      totalBilled: totalBilled,
      totalPaid: totalPaid,
      percentageBilled: percentageBilled.toFixed(1),
      percentagePaid: percentagePaid.toFixed(1),
    };
  };

  const stats = calculateBillingStats();

  // Handle delete billing
  const handleDeleteBilling = async (billingId) => {
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

    if (window.confirm('Are you sure you want to delete this billing? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/billings/${billingId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        toast({
          title: 'Success',
          description: 'Billing deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        fetchProjectData();
      } catch (error) {
        console.error('Error deleting billing:', error);
        
        const errorMessage = error.response?.data?.message || 'Failed to delete billing';
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
    fetchProjectData();
    onClose();
  };

  // Open form to add/edit billing
  const handleEditBilling = (billing = null) => {
    setSelectedBilling(billing);
    onOpen();
  };

  // Generate/view invoice
  const handleGenerateInvoice = (billing) => {
    // Placeholder for invoice generation - in a real app, this would generate and open a PDF
    toast({
      title: 'Invoice Generation',
      description: 'This feature is not implemented yet. It would generate a PDF invoice.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Mark billing as paid
  const handleMarkAsPaid = async (billing) => {
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

    try {
      await axios.put(
        `/api/billings/${billing.id}/status`,
        { status: 'paid' },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      toast({
        title: 'Success',
        description: 'Billing marked as paid',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      fetchProjectData();
    } catch (error) {
      console.error('Error updating billing status:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to update billing status';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading project billings..." />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <Box>
      <Flex 
        justify="space-between" 
        align={{ base: 'start', md: 'center' }} 
        direction={{ base: 'column', md: 'row' }}
        mb={6}
        gap={4}
      >
        <Box>
          <Text fontSize="lg" fontWeight="bold">Project Billings</Text>
          <HStack spacing={4} mt={1}>
            <Text color="gray.600">
              Billed: {formatCurrency(stats.totalBilled)} ({stats.percentageBilled}%)
            </Text>
            <Text color="gray.600">
              Paid: {formatCurrency(stats.totalPaid)} ({stats.percentagePaid}%)
            </Text>
          </HStack>
          <Box mt={3} w={{ base: '100%', md: '300px' }}>
            <Progress 
              value={stats.percentageBilled} 
              colorScheme="blue" 
              size="sm" 
              borderRadius="full"
              mb={1}
            />
            <Flex justify="space-between" fontSize="xs">
              <Text>0%</Text>
              <Text>Progress</Text>
              <Text>100%</Text>
            </Flex>
          </Box>
        </Box>
        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="teal" 
          onClick={() => handleEditBilling()}
          isDisabled={!project}
        >
          Add Billing
        </Button>
      </Flex>

      {billings.length === 0 ? (
        <EmptyState
          title="No billings created yet"
          message="Start by creating your first billing for this project."
          actionText="Add Billing"
          onAction={() => handleEditBilling()}
        />
      ) : (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Billing Date</Th>
                <Th>Description</Th>
                <Th isNumeric>Amount</Th>
                <Th isNumeric>Percentage</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {billings.map((billing) => (
                <Tr key={billing.id}>
                  <Td>{formatDate(billing.billingDate)}</Td>
                  <Td maxW="300px" isTruncated>{billing.description || `Billing #${billing.id}`}</Td>
                  <Td isNumeric fontWeight="semibold">{formatCurrency(billing.amount)}</Td>
                  <Td isNumeric>{calculatePercentage(billing)}%</Td>
                  <Td>
                    <Badge 
                      colorScheme={STATUS_COLORS[billing.status] || 'gray'}
                    >
                      {billing.status.charAt(0).toUpperCase() + billing.status.slice(1)}
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
                          onClick={() => handleEditBilling(billing)}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem 
                          icon={<FiFileText />} 
                          onClick={() => handleGenerateInvoice(billing)}
                        >
                          Generate Invoice
                        </MenuItem>
                        {billing.status !== 'paid' && (
                          <MenuItem 
                            icon={<FiCreditCard />} 
                            onClick={() => handleMarkAsPaid(billing)}
                          >
                            Mark as Paid
                          </MenuItem>
                        )}
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          color="red.500"
                          onClick={() => handleDeleteBilling(billing.id)}
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

      {/* Billing Form Modal */}
      {isOpen && (
        <BillingForm
          isOpen={isOpen}
          onClose={onClose}
          projectId={projectId}
          projectTotalValue={project?.totalValue}
          billing={selectedBilling}
          onSubmitSuccess={handleFormSuccess}
        />
      )}
    </Box>
  );
};

export default ProjectBillingsTab; 