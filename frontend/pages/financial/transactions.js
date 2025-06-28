import { useState, useEffect, useCallback, useRef } from 'react';
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
  InputRightElement,
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
  useBreakpointValue,
  Card, 
  CardBody,
  CardHeader,
  CardFooter,
  Divider,
  ButtonGroup,
  Checkbox,
  useDisclosure as useAlertDialogDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { FiSearch, FiEdit, FiTrash2, FiMoreVertical, FiFilter, FiPlus, FiX } from 'react-icons/fi';
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
  'transfer': 'blue',
  'Pendapatan': 'green',
  'Beban': 'red',
  'Pengeluaran': 'red',
  'Penerimaan': 'green',
  'Akumulasi Penyusutan': 'purple',
  'Kontra Aset': 'purple',
  'Aset Tetap': 'blue',
  'Beban Penyusutan': 'red',
  'Expenditure': 'red',
  'DEBIT': 'blue',
  'CREDIT': 'orange',
};

// Transaction type labels
const TYPE_LABELS = {
  'income': 'Income',
  'expense': 'Expense',
  'transfer': 'Transfer',
  'Pendapatan': 'Income',
  'Beban': 'Expense',
  'Pengeluaran': 'Expenditure',
  'Penerimaan': 'Receipt',
  'Akumulasi Penyusutan': 'Accumulated Depreciation',
  'Kontra Aset': 'Contra Asset',
  'Aset Tetap': 'Fixed Asset',
  'Beban Penyusutan': 'Depreciation Expense',
  'Expenditure': 'Expenditure',
  'DEBIT': 'DEBIT',
  'CREDIT': 'CREDIT',
};

// Debounce function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
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
  const [debitCreditFilter, setDebitCreditFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 1000,
    total: 0,
    totalPages: 0
  });
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  
  // Alert dialog for batch delete
  const { isOpen: isDeleteAlertOpen, onOpen: onDeleteAlertOpen, onClose: onDeleteAlertClose } = useAlertDialogDisclosure();
  const cancelRef = useRef();

  // Detect mobile view
  const isMobile = useBreakpointValue({ base: true, md: false });

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
  const fetchData = async (page = pagination.page) => {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to view transactions');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', 1);
      params.append('limit', 1000);
      if (typeFilter) params.append('type', typeFilter);
      if (accountFilter) params.append('accountCode', accountFilter);
      if (projectFilter) {
        if (projectFilter === 'null') {
          // For 'No Project' selection, send null projectId to the backend
          params.append('projectId', 'null');
        } else {
          params.append('projectId', projectFilter);
        }
      }
      if (startDateFilter) params.append('startDate', startDateFilter);
      if (endDateFilter) params.append('endDate', endDateFilter);
      if (debitCreditFilter) params.append('debitCredit', debitCreditFilter);
      
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
      setPagination({
        page: 1,
        pageSize: 1000,
        total: transactionsResponse.data.pagination.total,
        totalPages: 1
      });
      
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

  // Debounced filter changes
  const debouncedFetchData = useCallback(
    debounce(() => {
      fetchData(1); // Reset to page 1 when filters change
    }, 500), // 500ms delay
    [token, isAuthenticated, typeFilter, accountFilter, projectFilter, startDateFilter, endDateFilter, debitCreditFilter]
  );

  // Handle search term changes with debounce
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    // Don't need to call fetchData here, useEffect will handle it
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      debouncedFetchData();
    }
  }, [token, isAuthenticated, typeFilter, accountFilter, projectFilter, startDateFilter, endDateFilter, debitCreditFilter, debouncedFetchData]);

  // Filter transactions based on search term and debit/credit filter
  const filteredTransactions = transactions.filter((transaction) => {
    const description = transaction.description || '';
    const accountName = transaction.account?.name || '';
    const projectName = transaction.project?.name || '';
    
    // Apply debit/credit filter if set
    if (debitCreditFilter && transaction.type !== debitCreditFilter) {
      return false;
    }
    
    return searchTerm === '' || 
      description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projectName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  // Delete transaction
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
    setDebitCreditFilter('');
  };

  // Render transaction type badge with proper label and color
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
        <option value="transfer">Transfer</option>
        <option value="Pendapatan">Pendapatan (Income)</option>
        <option value="Beban">Beban (Expense)</option>
        <option value="Pengeluaran">Pengeluaran (Expenditure)</option>
        <option value="Penerimaan">Penerimaan (Receipt)</option>
        <option value="Akumulasi Penyusutan">Akumulasi Penyusutan (Accumulated Depreciation)</option>
        <option value="Kontra Aset">Kontra Aset (Contra Asset)</option>
        <option value="Aset Tetap">Aset Tetap (Fixed Asset)</option>
        <option value="Beban Penyusutan">Beban Penyusutan (Depreciation Expense)</option>
        <option value="Expenditure">Expenditure</option>
      </>
    );
  };

  // Prepare data for export
  const prepareExportData = () => {
    return filteredTransactions.map(transaction => ({
      'Date': transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A',
      'Type': TYPE_LABELS[transaction.type] || transaction.type,
      'DEBIT/CREDIT': transaction.type === 'DEBIT' ? 'DEBIT' : 'CREDIT',
      'Description': transaction.description || '',
      'Account': getAccountName(transaction.accountCode),
      'Project': transaction.projectId ? getProjectName(transaction.projectId) : 'No Project',
      'Amount': transaction.amount,
      'Formatted Amount': formatCurrency(transaction.amount),
      'Notes': transaction.notes || ''
    }));
  };

  // Handle export completion
  const handleExportComplete = (format, file) => {
    console.log(`Transaction export completed in ${format} format`);
  };

  // Handle select all transactions
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(t => t.id));
    }
    setIsAllSelected(!isAllSelected);
  };
  
  // Handle select single transaction
  const handleSelectTransaction = (transactionId) => {
    if (selectedTransactions.includes(transactionId)) {
      setSelectedTransactions(selectedTransactions.filter(id => id !== transactionId));
      setIsAllSelected(false);
    } else {
      setSelectedTransactions([...selectedTransactions, transactionId]);
      if (selectedTransactions.length + 1 === filteredTransactions.length) {
        setIsAllSelected(true);
      }
    }
  };
  
  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedTransactions.length === 0) return;
    
    setBatchActionLoading(true);
    try {
      // Create promises for all delete operations
      const deletePromises = selectedTransactions.map(id => 
        axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );
      
      // Execute all delete operations
      await Promise.all(deletePromises);
      
      toast({
        title: 'Success',
        description: `${selectedTransactions.length} transactions successfully deleted`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reset selection and refresh data
      setSelectedTransactions([]);
      setIsAllSelected(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting transactions:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to delete some transactions',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setBatchActionLoading(false);
      onDeleteAlertClose();
    }
  };

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Financial Transactions
        </Heading>
        <HStack>
          {selectedTransactions.length > 0 && (
            <Button 
              colorScheme="red" 
              leftIcon={<FiTrash2 />}
              onClick={onDeleteAlertOpen}
              isLoading={batchActionLoading}
              loadingText="Deleting..."
            >
              Delete Selected ({selectedTransactions.length})
            </Button>
          )}
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
      <Box mb={6}>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="flex-end">
          <FormControl flex="1">
            <FormLabel htmlFor="search">Search</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray.300" />
              </InputLeftElement>
              <Input
                id="search"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </InputGroup>
          </FormControl>

          <FormControl flex="1">
            <FormLabel htmlFor="type-filter">Type</FormLabel>
            <Select 
              id="type-filter" 
              value={typeFilter} 
              onChange={handleFilterChange(setTypeFilter)}
              placeholder="All Types"
            >
              {renderTypeFilterOptions()}
            </Select>
          </FormControl>

          <FormControl flex="1">
            <FormLabel htmlFor="account-filter">Account</FormLabel>
            <Select 
              id="account-filter" 
              value={accountFilter} 
              onChange={handleFilterChange(setAccountFilter)}
              placeholder="All Accounts"
            >
              <option value="">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.code} value={account.code}>
                  {account.code} - {account.name}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl flex="1">
            <FormLabel htmlFor="project-filter">Project</FormLabel>
            <Select 
              id="project-filter" 
              value={projectFilter} 
              onChange={handleFilterChange(setProjectFilter)}
              placeholder="All Projects"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode} - {project.name}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl flex="1">
            <FormLabel htmlFor="start-date-filter">Start Date</FormLabel>
            <Input
              id="start-date-filter"
              type="date"
              value={startDateFilter}
              onChange={handleFilterChange(setStartDateFilter)}
            />
          </FormControl>

          <FormControl flex="1">
            <FormLabel htmlFor="end-date-filter">End Date</FormLabel>
            <Input
              id="end-date-filter"
              type="date"
              value={endDateFilter}
              onChange={handleFilterChange(setEndDateFilter)}
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
        <>
          {isMobile ? (
            // Mobile card view
            <Box>
              {filteredTransactions.map((transaction) => (
                <Card key={transaction.id} mb={4} borderLeft="4px solid" 
                  borderLeftColor={
                    transaction.type === 'DEBIT' ? 'blue.500' :
                    transaction.type === 'CREDIT' ? 'orange.500' :
                    TYPE_COLORS[transaction.type] ? `${TYPE_COLORS[transaction.type]}.500` : 'gray.500'
                  }>
                  <CardHeader pb={2}>
                    <Flex justify="space-between" align="center">
                      <Flex align="center">
                        <Checkbox 
                          mr={2}
                          isChecked={selectedTransactions.includes(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                          colorScheme="teal"
                        />
                        <Box>
                          <Text fontWeight="bold">{formatDate(transaction.date)}</Text>
                          <Text fontSize="sm" color="gray.600">{getAccountName(transaction.accountCode)}</Text>
                        </Box>
                      </Flex>
                      <Stack>
                        {renderTypeBadge(transaction.type)}
                        <Badge 
                          colorScheme={transaction.type === 'DEBIT' ? 'blue' : 'orange'} 
                          variant="outline"
                          fontSize="xs"
                        >
                          {transaction.type === 'DEBIT' ? 'DEBIT' : 'CREDIT'}
                        </Badge>
                      </Stack>
                    </Flex>
                  </CardHeader>
                  <Divider />
                  <CardBody py={3}>
                    <Text fontWeight="medium">{transaction.description}</Text>
                    {transaction.notes && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {transaction.notes}
                      </Text>
                    )}
                    <Flex justify="space-between" mt={2} align="center">
                      <Text fontSize="sm">
                        {transaction.project ? getProjectName(transaction.project || transaction.projectId) : 'No Project'}
                      </Text>
                      <Text fontWeight="bold" fontSize="lg" color={
                        transaction.type === 'DEBIT' ? 'blue.600' : 
                        transaction.type === 'CREDIT' ? 'orange.600' :
                        TYPE_COLORS[transaction.type] ? `${TYPE_COLORS[transaction.type]}.600` : 'gray.600'
                      }>
                        {formatCurrency(transaction.amount)}
                      </Text>
                    </Flex>
                  </CardBody>
                  <Divider />
                  <CardFooter pt={2} pb={2}>
                    <ButtonGroup spacing={2} width="100%" justifyContent="flex-end">
                      <Button
                        leftIcon={<FiEdit />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditTransaction(transaction)}
                        isDisabled={transaction.isCounterTransaction}
                      >
                        Edit
                      </Button>
                      <Button
                        leftIcon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleDelete(transaction.id)}
                        isDisabled={transaction.isCounterTransaction}
                      >
                        Delete
                      </Button>
                    </ButtonGroup>
                  </CardFooter>
                </Card>
              ))}
            </Box>
          ) : (
            // Desktop table view
            <Box overflowX="auto">
              <Table variant="simple" bg="white" shadow="sm">
                <Thead>
                  <Tr>
                    <Th width="40px">
                      <Checkbox 
                        isChecked={isAllSelected}
                        onChange={handleSelectAll}
                        colorScheme="teal"
                      />
                    </Th>
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
                      <Td>
                        <Checkbox 
                          isChecked={selectedTransactions.includes(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                          colorScheme="teal"
                        />
                      </Td>
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
                        {/* Show both transaction type and DEBIT/CREDIT status */}
                        <Stack>
                          {renderTypeBadge(transaction.type)}
                          <Badge 
                            colorScheme={transaction.type === 'DEBIT' ? 'blue' : 'orange'} 
                            variant="outline"
                            fontSize="xs"
                          >
                            {transaction.type === 'DEBIT' ? 'DEBIT' : 'CREDIT'}
                          </Badge>
                        </Stack>
                      </Td>
                      <Td isNumeric fontWeight="medium" color={
                        transaction.type === 'DEBIT' ? 'blue.600' : 
                        transaction.type === 'CREDIT' ? 'orange.600' :
                        TYPE_COLORS[transaction.type] ? `${TYPE_COLORS[transaction.type]}.600` : 'gray.600'
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
          
          {/* Pagination Controls */}
          <Flex justify="center" mt={6} align="center">
            <Text fontSize="sm" color="gray.600">
              Showing all {filteredTransactions.length} transactions
            </Text>
          </Flex>
        </>
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
      
      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete {selectedTransactions.length} Transactions
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {selectedTransactions.length} selected transactions? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteAlertClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleBatchDelete} 
                ml={3}
                isLoading={batchActionLoading}
                loadingText="Deleting..."
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
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