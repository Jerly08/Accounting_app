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
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import { FiPlus, FiEdit, FiTrash2, FiMoreVertical, FiDownload, FiEye } from 'react-icons/fi';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import EmptyState from '../common/EmptyState';
import BillingForm from '../billings/BillingForm';

// Payment status colors
const STATUS_COLORS = {
  'unpaid': 'red',
  'partially_paid': 'orange',
  'paid': 'green',
};

const BillingsTab = ({ projectId }) => {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [billings, setBillings] = useState([]);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
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

  // Format percentage
  const formatPercentage = (percentage) => {
    return `${percentage}%`;
  };

  // Fetch project billings
  const fetchProjectBillings = async () => {
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
      
      // Fetch project details first
      const projectResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setProjectDetails(projectResponse.data.data);
      
      // Fetch billings for the project
      const billingsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/billings/project/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setBillings(billingsResponse.data.data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching project billings:', error);
      
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
      fetchProjectBillings();
    }
  }, [projectId, token, isAuthenticated]);

  // Calculate billing statistics
  const totalBilledAmount = billings.reduce((sum, billing) => sum + parseFloat(billing.amount), 0);
  const totalPaidAmount = billings
    .filter(billing => billing.status === 'paid')
    .reduce((sum, billing) => sum + parseFloat(billing.amount), 0);
  const totalUnpaidAmount = billings
    .filter(billing => billing.status === 'unpaid' || billing.status === 'partially_paid')
    .reduce((sum, billing) => sum + parseFloat(billing.amount), 0);
  
  const projectTotalValue = projectDetails?.totalValue ? parseFloat(projectDetails.totalValue) : 0;
  const billingPercentage = projectTotalValue > 0 ? (totalBilledAmount / projectTotalValue) * 100 : 0;
  const remainingAmount = projectTotalValue - totalBilledAmount;

  // Handle delete billing
  const handleDelete = async (billingId) => {
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
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/billings/${billingId}`, {
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
        
        fetchProjectBillings();
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

  // Open form to add/edit billing
  const handleEditBilling = (billing = null) => {
    setSelectedBilling(billing);
    onOpen();
  };

  // Handle form submission success
  const handleFormSuccess = () => {
    fetchProjectBillings();
    onClose();
  };

  // Handle view invoice
  const handleViewInvoice = (billing) => {
    if (billing.invoice) {
      const invoiceUrl = billing.invoice.startsWith('http') 
        ? billing.invoice 
        : `${process.env.NEXT_PUBLIC_API_URL}${billing.invoice}`;
      window.open(invoiceUrl, '_blank');
    } else {
      toast({
        title: 'No Invoice',
        description: 'This billing does not have an invoice attached',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Navigate to billing detail
  const handleBillingClick = (billingId) => {
    router.push(`/billings/${billingId}`);
  };

  if (loading) {
    return <LoadingSpinner text="Loading project billings..." />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text fontSize="lg" fontWeight="bold">Project Billings</Text>
          <Text color="gray.600">
            Total Billed: {formatCurrency(totalBilledAmount)} of {formatCurrency(projectTotalValue)}
          </Text>
        </Box>
        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="teal" 
          onClick={() => handleEditBilling()}
        >
          Create Invoice
        </Button>
      </Flex>

      {/* Billing Statistics */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Project Value</StatLabel>
          <StatNumber>{formatCurrency(projectTotalValue)}</StatNumber>
        </Stat>
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Billed</StatLabel>
          <StatNumber>{formatCurrency(totalBilledAmount)}</StatNumber>
          <StatHelpText>{formatPercentage(billingPercentage.toFixed(1))}</StatHelpText>
        </Stat>
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Remaining</StatLabel>
          <StatNumber>{formatCurrency(remainingAmount)}</StatNumber>
          <StatHelpText>{formatPercentage((100 - billingPercentage).toFixed(1))}</StatHelpText>
        </Stat>
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Unpaid Amount</StatLabel>
          <StatNumber color="red.500">{formatCurrency(totalUnpaidAmount)}</StatNumber>
        </Stat>
      </SimpleGrid>

      <Box mb={6}>
        <Text mb={2}>Billing Progress</Text>
        <Progress 
          value={billingPercentage} 
          colorScheme="teal" 
          height="24px" 
          borderRadius="md"
        />
        <Flex justify="space-between" mt={1}>
          <Text fontSize="sm">{formatPercentage(billingPercentage.toFixed(1))}</Text>
          <Text fontSize="sm">{formatCurrency(totalBilledAmount)} / {formatCurrency(projectTotalValue)}</Text>
        </Flex>
      </Box>

      {billings.length === 0 ? (
        <EmptyState 
          title="No billings found" 
          message="Create your first invoice for this project."
          actionText="Create Invoice"
          onAction={() => handleEditBilling()}
        />
      ) : (
        <Box overflowX="auto">
          <Table variant="simple" bg="white" shadow="sm">
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Invoice #</Th>
                <Th>Percentage</Th>
                <Th isNumeric>Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {billings.map((billing) => (
                <Tr key={billing.id}>
                  <Td>{formatDate(billing.billingDate)}</Td>
                  <Td>
                    <Button 
                      variant="link" 
                      color="blue.500" 
                      onClick={() => handleBillingClick(billing.id)}
                    >
                      INV-{billing.id.toString().padStart(5, '0')}
                    </Button>
                  </Td>
                  <Td>{formatPercentage(billing.percentage)}</Td>
                  <Td isNumeric fontWeight="semibold">{formatCurrency(billing.amount)}</Td>
                  <Td>
                    <Badge 
                      colorScheme={STATUS_COLORS[billing.status] || 'gray'}
                    >
                      {billing.status.replace('_', ' ').charAt(0).toUpperCase() + billing.status.replace('_', ' ').slice(1)}
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
                          icon={<FiEye />} 
                          onClick={() => handleBillingClick(billing.id)}
                        >
                          View Details
                        </MenuItem>
                        {billing.invoice && (
                          <MenuItem 
                            icon={<FiDownload />} 
                            onClick={() => handleViewInvoice(billing)}
                          >
                            View Invoice
                          </MenuItem>
                        )}
                        <MenuItem 
                          icon={<FiEdit />} 
                          onClick={() => handleEditBilling(billing)}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          color="red.500"
                          onClick={() => handleDelete(billing.id)}
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
          projectTotalValue={projectTotalValue}
          billing={selectedBilling}
          onSubmitSuccess={handleFormSuccess}
        />
      )}
    </Box>
  );
};

export default BillingsTab; 