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
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  keyframes,
} from '@chakra-ui/react';
import { FiSearch, FiEdit, FiTrash2, FiMoreVertical, FiFilter, FiPlus } from 'react-icons/fi';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import TransactionForm from '../../components/financial/TransactionForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import ExportButton from '../../components/common/ExportButton';

// Animation keyframes
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

// Transaction type colors
const TYPE_COLORS = {
  'income': 'green',
  'expense': 'red',
};

// Transaction type labels
const TYPE_LABELS = {
  'income': 'Income',
  'expense': 'Expense',
};

const TransactionsPage = () => {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
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

  // Fetch transactions and reference data
  const fetchData = async () => {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to view transactions');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (accountFilter) params.append('accountCode', accountFilter);
      if (projectFilter) params.append('projectId', projectFilter);
      if (startDateFilter) params.append('startDate', startDateFilter);
      if (endDateFilter) params.append('endDate', endDateFilter);
      
      // Fetch transactions
      const transactionsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transactions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setTransactions(transactionsResponse.data.data || []);
      
      // Fetch accounts for filter dropdown
      const accountsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/accounts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setAccounts(accountsResponse.data.data || []);
      
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
  }, [token, isAuthenticated, typeFilter, accountFilter, projectFilter, startDateFilter, endDateFilter]);

  // Filter transactions based on search term and also remove 'transfer' type
  const filteredTransactions = transactions.filter((transaction) => {
    const description = transaction.description || '';
    const accountName = transaction.account?.name || '';
    const projectName = transaction.project?.name || '';
    
    // Filter out 'transfer' type transactions
    if (transaction.type === 'transfer') {
      return false;
    }
    
    return searchTerm === '' || 
      description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projectName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(transaction => transaction.type === 'income')
    .reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
  
  const totalExpense = filteredTransactions
    .filter(transaction => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
  
  const netCashFlow = totalIncome - totalExpense;

  // Handle delete transaction
  const handleDelete = async (transactionId) => {
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

    if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      try {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${transactionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        toast({
          title: 'Success',
          description: 'Transaction successfully deleted',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Refresh the transactions list
        fetchData();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        
        if (error.response?.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please login again.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        } else {
          const errorMessage = error.response?.data?.message || 'Failed to delete transaction';
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

  // Open form to add/edit transaction
  const handleEditTransaction = (transaction = null) => {
    setSelectedTransaction(transaction);
    onOpen();
  };

  // Handle successful form submission
  const handleFormSuccess = (responseData) => {
    console.log('Transaction form submitted successfully:', responseData);
    // Refresh the transactions list
    fetchData();
  };

  // Get account name by code
  const getAccountName = (accountCode) => {
    const account = accounts.find(a => a.code === accountCode);
    return account ? account.name : 'N/A';
  };

  // Get project name by id
  const getProjectName = (projectId) => {
    // If transaction has a project object, use that directly
    if (typeof projectId === 'object' && projectId !== null) {
      return projectId.name || 'N/A';
    }
    
    // If no projectId, return N/A
    if (!projectId) return 'N/A';
    
    // Otherwise, look up the project by ID
    const numericProjectId = parseInt(projectId);
    const project = projects.find(p => p.id === numericProjectId);
    return project ? project.name : 'N/A';
  };

  // Reset filters
  const resetFilters = () => {
    setTypeFilter('');
    setAccountFilter('');
    setProjectFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearchTerm('');
  };

  // Render transaction type badge with proper label
  const renderTypeBadge = (type) => {
    const color = TYPE_COLORS[type] || 'gray';
    const label = TYPE_LABELS[type] || type;
    
    return (
      <Badge colorScheme={color} px={2} py={1} borderRadius="md">
        {label}
      </Badge>
    );
  };

  // Render type filter options
  const renderTypeFilterOptions = () => {
    return (
      <>
        <option value="">All Types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </>
    );
  };

  // Prepare data for export
  const prepareExportData = () => {
    return filteredTransactions.map(transaction => ({
      'Date': transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A',
      'Type': TYPE_LABELS[transaction.type] || transaction.type,
      'Description': transaction.description || '',
      'Account': getAccountName(transaction.accountCode),
      'Project': transaction.projectId ? getProjectName(transaction.projectId) : 'No Project',
      'Amount': transaction.amount,
      'Amount (Formatted)': formatCurrency(transaction.amount),
      'Notes': transaction.notes || ''
    }));
  };

  // Handle export completion
  const handleExportComplete = (format, file) => {
    console.log(`Transaction export completed in ${format} format`);
  };

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Financial Transactions
        </Heading>
        <HStack>
          <ExportButton 
            data={prepareExportData()}
            filename="financial_transactions"
            onExport={handleExportComplete}
            isDisabled={loading || !!error || filteredTransactions.length === 0}
            tooltipText="Export transaction data to various formats"
            buttonText="Export"
            pdfConfig={{
              orientation: 'landscape',
              title: 'Financial Transactions'
            }}
          />
          <Button 
            colorScheme="teal" 
            leftIcon={<FiPlus />}
            onClick={() => handleEditTransaction()}
            isDisabled={!isAuthenticated || loading}
          >
            Add Transaction
          </Button>
        </HStack>
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
              placeholder="Search descriptions or accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Select
            placeholder="Filter by type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            maxW={{ md: '200px' }}
          >
            {renderTypeFilterOptions()}
          </Select>

          <Select
            placeholder="Filter by account"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            maxW={{ md: '200px' }}
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.code} value={account.code}>{account.name}</option>
            ))}
          </Select>

          <Select
            placeholder="Filter by project"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            maxW={{ md: '200px' }}
          >
            <option value="">All projects</option>
            <option value="none">No Project</option>
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
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Income</StatLabel>
          <StatNumber color="green.500">{formatCurrency(totalIncome)}</StatNumber>
        </Stat>
        
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Expense</StatLabel>
          <StatNumber color="red.500">{formatCurrency(totalExpense)}</StatNumber>
        </Stat>
        
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Net Cash Flow</StatLabel>
          <StatNumber color={netCashFlow >= 0 ? "green.500" : "red.500"}>
            {formatCurrency(netCashFlow)}
          </StatNumber>
          <StatHelpText>
            <StatArrow type={netCashFlow >= 0 ? "increase" : "decrease"} />
            {netCashFlow >= 0 ? "Positive" : "Negative"} balance
          </StatHelpText>
        </Stat>
      </SimpleGrid>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading transactions..." />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState 
          title="No transactions found" 
          message={searchTerm || typeFilter || accountFilter || projectFilter || startDateFilter || endDateFilter ? 
            'Try adjusting your search filters.' : 
            'Click the "Add Transaction" button to create your first transaction.'}
          actionText={!searchTerm && !typeFilter && !accountFilter && !projectFilter && !startDateFilter && !endDateFilter ? "Add Transaction" : null}
          onAction={!searchTerm && !typeFilter && !accountFilter && !projectFilter && !startDateFilter && !endDateFilter ? () => handleEditTransaction() : null}
        />
      ) : (
        <Box overflowX="auto">
          <Table variant="simple" bg="white" shadow="sm">
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Account</Th>
                <Th>Project</Th>
                <Th>Type</Th>
                <Th isNumeric>Amount</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredTransactions.map((transaction) => (
                <Tr key={transaction.id}>
                  <Td>{formatDate(transaction.date)}</Td>
                  <Td maxW="300px" isTruncated>
                    {transaction.description}
                    {transaction.notes && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {transaction.notes}
                      </Text>
                    )}
                    {transaction.isCounterTransaction && (
                      <Badge size="sm" colorScheme="purple" ml={2}>
                        Auto
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    {getAccountName(transaction.accountCode)}
                  </Td>
                  <Td>{getProjectName(transaction.project || transaction.projectId)}</Td>
                  <Td>
                    {renderTypeBadge(transaction.type)}
                  </Td>
                  <Td isNumeric fontWeight="medium" color={
                    transaction.type === 'income' ? 'green.600' : 
                    transaction.type === 'expense' ? 'red.600' : 'blue.600'
                  }>
                    {formatCurrency(transaction.amount)}
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
                          onClick={() => handleEditTransaction(transaction)}
                          isDisabled={transaction.isCounterTransaction}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          color="red.500"
                          onClick={() => handleDelete(transaction.id)}
                          isDisabled={transaction.isCounterTransaction}
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

      {/* Transaction Form Modal */}
      {isOpen && (
        <TransactionForm
          isOpen={isOpen}
          onClose={onClose}
          transaction={selectedTransaction}
          onSubmitSuccess={handleFormSuccess}
          accounts={accounts}
          projects={projects}
        />
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedTransactionsPage = () => (
  <ProtectedRoute>
    <TransactionsPage />
  </ProtectedRoute>
);

export default ProtectedTransactionsPage; 