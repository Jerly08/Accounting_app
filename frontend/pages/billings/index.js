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
  HStack,
  Stack,
  FormControl,
  FormLabel,
  Tooltip,
} from '@chakra-ui/react';
import { FiSearch, FiEdit, FiTrash2, FiMoreVertical, FiFilter, FiPlus, FiDownload, FiEye, FiInfo, FiRefreshCw } from 'react-icons/fi';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import BillingForm from '../../components/billings/BillingForm';
import BillingStatusModal from '../../components/billings/BillingStatusModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import { InfoOutlineIcon } from '@chakra-ui/icons';

// Payment status colors
const STATUS_COLORS = {
  'pending': 'yellow',
  'unpaid': 'orange',
  'paid': 'green',
  'rejected': 'red',
};

const BillingsPage = () => {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isStatusModalOpen, 
    onOpen: onStatusModalOpen, 
    onClose: onStatusModalClose 
  } = useDisclosure();
  const [billings, setBillings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [billingForStatusChange, setBillingForStatusChange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
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

  // Fetch billings and projects
  const fetchData = async () => {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to view billings');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (projectFilter) params.append('projectId', projectFilter);
      if (startDateFilter) params.append('startDate', startDateFilter);
      if (endDateFilter) params.append('endDate', endDateFilter);
      
      // Fetch billings
      const billingsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/billings?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setBillings(billingsResponse.data.data || []);
      
      // Fetch projects for filter dropdown
      const projectsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setProjects(projectsResponse.data.data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError('Failed to load data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchData();
    }
  }, [token, isAuthenticated, statusFilter, projectFilter, startDateFilter, endDateFilter]);

  // Filter billings based on search term
  const filteredBillings = billings.filter((billing) => {
    const projectName = billing.project?.name || '';
    const clientName = billing.project?.client?.name || '';
    const projectCode = billing.project?.projectCode || '';
    
    return searchTerm === '' || 
      projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projectCode.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calculate total amount
  const totalAmount = filteredBillings.reduce((sum, billing) => sum + parseFloat(billing.amount), 0);
  
  // Calculate total unpaid amount
  const totalUnpaidAmount = filteredBillings
    .filter(billing => billing.status === 'unpaid' || billing.status === 'partially_paid')
    .reduce((sum, billing) => sum + parseFloat(billing.amount), 0);

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

        // Refresh the billings list
        fetchData();
      } catch (error) {
        console.error('Error deleting billing:', error);
        
        if (error.response?.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please login again.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        } else {
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
    }
  };

  // Open form to add/edit billing
  const handleEditBilling = (billing = null) => {
    setSelectedBilling(billing);
    onOpen();
  };

  // Handle successful form submission
  const handleFormSuccess = () => {
    fetchData();
    onClose();
  };

  // Handle view invoice
  const handleViewInvoice = (billing) => {
    if (billing.invoice) {
      // Open invoice in new tab
      window.open(`${process.env.NEXT_PUBLIC_API_URL}/uploads/invoices/${billing.invoice}`, '_blank');
    } else {
      toast({
        title: 'Invoice Not Available',
        description: 'This billing does not have an invoice attached.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle status change
  const handleStatusChange = (billing) => {
    // Check if status can be changed
    if (billing.status === 'paid' || billing.status === 'rejected') {
      toast({
        title: 'Status Tidak Dapat Diubah',
        description: `Tagihan dengan status "${billing.status}" tidak dapat diubah lagi.`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setBillingForStatusChange(billing);
    onStatusModalOpen();
  };

  // Handle successful status change
  const handleStatusChangeSuccess = () => {
    fetchData();
    onStatusModalClose();
  };

  // Navigate to project detail
  const handleProjectClick = (projectId) => {
    router.push(`/projects/${projectId}`);
  };

  // Reset filters
  const resetFilters = () => {
    setStatusFilter('');
    setProjectFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearchTerm('');
  };

  // Add this to the table header row
  const renderBillingTable = () => {
    return (
      <Table variant="simple" size="sm">
        <Thead bg="gray.50">
          <Tr>
            <Th>Project</Th>
            <Th>Date</Th>
            <Th isNumeric>Amount</Th>
            <Th isNumeric>%</Th>
            <Th>Status</Th>
            <Th>
              <HStack spacing={1}>
                <Text>Actions</Text>
                <Tooltip 
                  label="Billings automatically create journal entries in the financial system" 
                  placement="top"
                >
                  <InfoOutlineIcon boxSize={3} color="gray.500" />
                </Tooltip>
              </HStack>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {/* ... existing code ... */}
        </Tbody>
      </Table>
    );
  };

  // Update the status badge to include accounting information
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Tooltip label="Status awal, belum ada transaksi keuangan">
            <Badge colorScheme="yellow">Pending</Badge>
          </Tooltip>
        );
      case 'paid':
        return (
          <Tooltip label="Jurnal: Debit Kas/Bank, Kredit Piutang Usaha">
            <Badge colorScheme="green">Paid</Badge>
          </Tooltip>
        );
      case 'unpaid':
        return (
          <Tooltip label="Jurnal: Debit Piutang Usaha, Kredit Pendapatan">
            <Badge colorScheme="orange">Unpaid</Badge>
          </Tooltip>
        );
      case 'rejected':
        return (
          <Tooltip label="Jurnal dibatalkan/dibalik">
            <Badge colorScheme="red">Rejected</Badge>
          </Tooltip>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Billing Management
        </Heading>
        <Button 
          colorScheme="teal" 
          leftIcon={<FiPlus />}
          onClick={() => handleEditBilling()}
          isDisabled={!isAuthenticated || projects.length === 0}
        >
          Create Invoice
        </Button>
      </Flex>

      {/* Filters */}
      <Box mb={6} p={4} bg="white" borderRadius="md" shadow="sm">
        <Heading as="h3" size="sm" mb={4}>Filters</Heading>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4} mb={4}>
          <InputGroup maxW={{ md: '300px' }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search projects or clients..."
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
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
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
        </Stack>

        <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="flex-end">
          <FormControl maxW={{ md: '200px' }}>
            <FormLabel fontSize="sm">Start Date</FormLabel>
            <Input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
            />
          </FormControl>

          <FormControl maxW={{ md: '200px' }}>
            <FormLabel fontSize="sm">End Date</FormLabel>
            <Input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
            />
          </FormControl>

          <Button 
            variant="outline" 
            onClick={resetFilters}
            size="md"
          >
            Reset Filters
          </Button>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <Flex mb={6} gap={4} flexWrap="wrap">
        <Box bg="white" p={4} borderRadius="md" shadow="sm" flex="1" minW={{ base: "100%", md: "250px" }}>
          <Text color="gray.500" fontSize="sm">Total Invoices</Text>
          <Text fontSize="2xl" fontWeight="bold">{filteredBillings.length}</Text>
        </Box>
        
        <Box bg="white" p={4} borderRadius="md" shadow="sm" flex="1" minW={{ base: "100%", md: "250px" }}>
          <Text color="gray.500" fontSize="sm">Total Amount</Text>
          <Text fontSize="2xl" fontWeight="bold">{formatCurrency(totalAmount)}</Text>
        </Box>
        
        <Box bg="white" p={4} borderRadius="md" shadow="sm" flex="1" minW={{ base: "100%", md: "250px" }}>
          <Text color="gray.500" fontSize="sm">Unpaid Amount</Text>
          <Text fontSize="2xl" fontWeight="bold" color="red.500">{formatCurrency(totalUnpaidAmount)}</Text>
        </Box>
      </Flex>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading billing data..." />
      ) : filteredBillings.length === 0 ? (
        <EmptyState 
          title="No billings found" 
          message={searchTerm || statusFilter || projectFilter || startDateFilter || endDateFilter ? 
            'Try adjusting your search filters.' : 
            'Click the "Create Invoice" button to create your first billing.'}
          actionText={!searchTerm && !statusFilter && !projectFilter && !startDateFilter && !endDateFilter ? "Create Invoice" : null}
          onAction={!searchTerm && !statusFilter && !projectFilter && !startDateFilter && !endDateFilter ? () => handleEditBilling() : null}
        />
      ) : (
        <Box overflowX="auto">
          <Table variant="simple" bg="white" shadow="sm">
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Project</Th>
                <Th>Client</Th>
                <Th>Percentage</Th>
                <Th isNumeric>Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredBillings.map((billing) => (
                <Tr key={billing.id}>
                  <Td>{formatDate(billing.billingDate)}</Td>
                  <Td>
                    <Button 
                      variant="link" 
                      color="blue.500" 
                      onClick={() => handleProjectClick(billing.projectId)}
                    >
                      {billing.project?.name || 'N/A'}
                    </Button>
                  </Td>
                  <Td>{billing.project?.client?.name || 'N/A'}</Td>
                  <Td>{formatPercentage(billing.percentage)}</Td>
                  <Td isNumeric fontWeight="semibold">{formatCurrency(billing.amount)}</Td>
                  <Td>
                    {getStatusBadge(billing.status)}
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
                          onClick={() => handleViewInvoice(billing)}
                          isDisabled={!billing.invoice}
                        >
                          View Invoice
                        </MenuItem>
                        <MenuItem 
                          icon={<FiRefreshCw />} 
                          onClick={() => handleStatusChange(billing)}
                          isDisabled={billing.status === 'paid' || billing.status === 'rejected'}
                        >
                          Ubah Status
                        </MenuItem>
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
          projectId={selectedBilling?.projectId}
          billing={selectedBilling}
          onSubmitSuccess={handleFormSuccess}
          projects={projects}
        />
      )}

      {/* Billing Status Modal */}
      {isStatusModalOpen && (
        <BillingStatusModal
          isOpen={isStatusModalOpen}
          onClose={onStatusModalClose}
          billing={billingForStatusChange}
          onStatusChange={handleStatusChangeSuccess}
        />
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedBillingsPage = () => (
  <ProtectedRoute>
    <BillingsPage />
  </ProtectedRoute>
);

export default ProtectedBillingsPage; 