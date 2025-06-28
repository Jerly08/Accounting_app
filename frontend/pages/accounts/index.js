import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  HStack,
  Flex,
  useDisclosure,
  InputGroup,
  InputLeftElement,
  Select,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Badge,
  useToast,
  AlertTitle,
  AlertDescription,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stack,
  Tooltip,
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiSearch,
  FiFilter,
  FiEye,
  FiDollarSign,
  FiList,
  FiDownload,
} from 'react-icons/fi';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import AccountForm from '../../components/accounts/AccountForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';

const ACCOUNT_TYPES = ['Pendapatan', 'Beban', 'Aktiva', 'Aset Tetap', 'Kontra Aset'];
const TYPE_COLORS = {
  'Pendapatan': 'green',
  'Beban': 'red',
  'Aktiva': 'blue',
  'Aset Tetap': 'purple',
  'Kontra Aset': 'orange',
};

// Tambahkan kategori cashflow untuk filtering
const CASHFLOW_CATEGORIES = ['Income', 'Expense', 'Asset', 'Fixed Asset', 'Contra Asset', 'Other'];

const AccountsPage = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isDrawerOpen, 
    onOpen: onDrawerOpen, 
    onClose: onDrawerClose 
  } = useDisclosure();
  const [accounts, setAccounts] = useState([]);  // Initiate as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState(''); // Tambahkan filter kategori
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const [sortField, setSortField] = useState('code'); // Default sort by code
  const [sortDirection, setSortDirection] = useState('asc'); // Default ascending
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [accountBalance, setAccountBalance] = useState(0);
  const toast = useToast();
  const router = useRouter();
  const { token, isAuthenticated, isAdmin } = useAuth();

  const fetchAccounts = async () => {
    // Don't attempt to fetch if no token available
    if (!token || !isAuthenticated) {
      console.log('No token or not authenticated, skipping fetch');
      setLoading(false);
      setError('You must be logged in to view accounts');
      return;
    }
    
    try {
      setLoading(true);
      setFetchAttempts(prev => prev + 1);
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      console.log('Fetching accounts from:', `${process.env.NEXT_PUBLIC_API_URL}/api/accounts`);
      
      const response = await axios.get('/api/accounts', config);
      
      console.log('Account fetch response:', response.data);
      
      // Handle the expected API response format
      if (response.data && response.data.success && response.data.data) {
        console.log('Found accounts in response.data.data');
        setAccounts(response.data.data);
        setError(null);
      } else if (response.data && Array.isArray(response.data)) {
        console.log('Response data is directly an array');
        setAccounts(response.data);
        setError(null);
      } else if (response.data && response.data.accounts && Array.isArray(response.data.accounts)) {
        console.log('Found accounts array in response.data.accounts');
        setAccounts(response.data.accounts);
        setError(null);
      } else {
        console.warn('Unexpected API response format:', response.data);
        setAccounts([]);
        setError('Received unexpected data format from the server');
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Error response details:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      setError('Failed to load chart of accounts. Please try again later.');
      toast({
        title: 'Error',
        description: 'Failed to load chart of accounts',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      console.log('Token available, fetching accounts');
      fetchAccounts();
    }
  }, [token, isAuthenticated]);

  const handleEdit = (account) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Error',
        description: 'You do not have permission to edit accounts.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setSelectedAccount(account);
    onOpen();
  };

  const handleDelete = async (code) => {
    if (!token || !isAuthenticated) {
      toast({
        title: 'Authentication Error',
        description: 'You need to be logged in to perform this action.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (!isAdmin) {
      toast({
        title: 'Permission Error',
        description: 'You do not have permission to delete accounts.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this account? This action cannot be undone and may affect transactions using this account.')) {
      try {
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };

        console.log('Deleting account with code:', code);
        await axios.delete(`/api/accounts/${code}`, config);
        
        toast({
          title: 'Success',
          description: 'Account deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        fetchAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
        const errorMessage = error.response?.data?.message || 'Failed to delete account';
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleFormSubmit = () => {
    onClose();
    setSelectedAccount(null);
    fetchAccounts();
  };

  const addNewAccount = () => {
    if (!isAdmin) {
      toast({
        title: 'Permission Error',
        description: 'You do not have permission to add accounts.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setSelectedAccount(null);
    onOpen();
  };

  // Tambahkan fungsi sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Safely filter accounts using optional chaining and fallback to empty array
  const filteredAccounts = (accounts || []).filter(account => {
    if (!account) return false;
    
    const matchesSearch = 
      (account.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (account.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      // Tambahkan pencarian pada kategori dan subkategori
      (account.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (account.subcategory?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesType = !filterType || account.type === filterType;
    
    // Tambahkan filter berdasarkan kategori
    const matchesCategory = !filterCategory || account.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  }).sort((a, b) => {
    // Implementasi sorting
    let valueA = a[sortField] || '';
    let valueB = b[sortField] || '';
    
    // Handle numeric sorting for code
    if (sortField === 'code') {
      valueA = valueA.toString();
      valueB = valueB.toString();
    }
    
    if (sortDirection === 'asc') {
      return valueA.localeCompare(valueB);
    } else {
      return valueB.localeCompare(valueA);
    }
  });

  // Fungsi untuk melihat detail akun dan transaksinya
  const viewAccountDetails = async (account) => {
    setSelectedAccount(account);
    setLoadingTransactions(true);
    setAccountTransactions([]);
    
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      // Fetch transactions for this account
      const response = await axios.get(`/api/transactions/account/${account.code}`, config);
      
      if (response.data && response.data.success) {
        setAccountTransactions(response.data.data.transactions || []);
        setAccountBalance(response.data.data.balance || 0);
      } else {
        setAccountTransactions([]);
        setAccountBalance(0);
        toast({
          title: 'Warning',
          description: 'Could not load transactions for this account',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fetching account transactions:', error);
      setAccountTransactions([]);
      setAccountBalance(0);
      toast({
        title: 'Error',
        description: 'Failed to load account transactions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingTransactions(false);
      onDrawerOpen();
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Export account data to CSV
  const exportAccountsToCSV = () => {
    if (!accounts.length) {
      toast({
        title: 'No Data',
        description: 'There are no accounts to export',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Create CSV content
    const headers = ['Code', 'Name', 'Type', 'Category', 'Subcategory'];
    const csvContent = [
      headers.join(','),
      ...filteredAccounts.map(account => [
        account.code,
        `"${account.name.replace(/"/g, '""')}"`, // Escape quotes in CSV
        account.type,
        account.category || '',
        account.subcategory || ''
      ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chart_of_accounts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Export Successful',
      description: 'Chart of accounts exported to CSV',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  if (loading) {
    return <LoadingSpinner text="Loading accounts..." />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <ProtectedRoute>
      <Box p={4}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading as="h1" size="xl">Chart of Accounts</Heading>
          <HStack spacing={3}>
            <Tooltip label="Export to CSV">
              <IconButton
                aria-label="Export accounts"
                icon={<FiDownload />}
                onClick={exportAccountsToCSV}
                colorScheme="green"
              />
            </Tooltip>
            {isAdmin && (
              <Button 
                leftIcon={<FiPlus />} 
                colorScheme="blue" 
                onClick={addNewAccount}
              >
                Add New Account
              </Button>
            )}
          </HStack>
        </Flex>

        {!isAdmin && (
          <Alert status="info" mb={6}>
            <AlertIcon />
            <Box>
              <AlertTitle>Limited Access</AlertTitle>
              <AlertDescription>
                You are viewing the chart of accounts in read-only mode. Admin privileges are required to add, edit, or delete accounts.
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Search and Filter Controls */}
        <Flex 
          direction={{ base: "column", md: "row" }} 
          mb={6} 
          gap={4}
          flexWrap="wrap"
        >
          <InputGroup maxW={{ base: "100%", md: "300px" }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          
          <Select 
            placeholder="Filter by Type" 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            maxW={{ base: "100%", md: "200px" }}
          >
            <option value="">All Types</option>
            {ACCOUNT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
          
          {/* Tambahkan filter kategori */}
          <Select 
            placeholder="Filter by Category" 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            maxW={{ base: "100%", md: "200px" }}
          >
            <option value="">All Categories</option>
            {CASHFLOW_CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </Select>
        </Flex>

        {/* Error and Loading States */}
        {error && <ErrorAlert message={error} />}
        
        {loading ? (
          <LoadingSpinner />
        ) : accounts.length === 0 ? (
          <EmptyState 
            title="No accounts found" 
            message="There are no accounts in the system yet. Add your first account to get started."
            icon={<FiSearch size="40" />}
            actionLabel={isAdmin ? "Add Account" : null}
            onAction={isAdmin ? addNewAccount : null}
          />
        ) : (
          <Box overflowX="auto">
            <Table variant="simple" size="md">
              <Thead>
                <Tr>
                  <Th 
                    cursor="pointer" 
                    onClick={() => handleSort('code')}
                  >
                    Code {sortField === 'code' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th 
                    cursor="pointer" 
                    onClick={() => handleSort('name')}
                  >
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th>Type</Th>
                  {/* Tambahkan kolom kategori dan subkategori */}
                  <Th>Category</Th>
                  <Th>Subcategory</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredAccounts.map(account => (
                  <Tr key={account.code}>
                    <Td fontWeight="bold">{account.code}</Td>
                    <Td>{account.name}</Td>
                    <Td>
                      <Badge colorScheme={TYPE_COLORS[account.type] || 'gray'}>
                        {account.type}
                      </Badge>
                    </Td>
                    {/* Tampilkan kategori dan subkategori */}
                    <Td>
                      {account.category ? (
                        <Badge colorScheme="teal">{account.category}</Badge>
                      ) : '-'}
                    </Td>
                    <Td>{account.subcategory || '-'}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Tooltip label="View account details">
                          <IconButton
                            aria-label="View account details"
                            icon={<FiEye />}
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            onClick={() => viewAccountDetails(account)}
                          />
                        </Tooltip>
                        <IconButton
                          aria-label="Edit account"
                          icon={<FiEdit />}
                          size="sm"
                          onClick={() => handleEdit(account)}
                          isDisabled={!isAdmin}
                        />
                        <IconButton
                          aria-label="Delete account"
                          icon={<FiTrash2 />}
                          size="sm"
                          colorScheme="red"
                          onClick={() => handleDelete(account.code)}
                          isDisabled={!isAdmin}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Account Form Modal */}
        <AccountForm
          isOpen={isOpen}
          onClose={onClose}
          account={selectedAccount}
          onSubmitSuccess={handleFormSubmit}
        />
        
        {/* Account Details Drawer */}
        <Drawer
          isOpen={isDrawerOpen}
          placement="right"
          onClose={onDrawerClose}
          size="md"
        >
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerHeader borderBottomWidth="1px">
              Account Details
            </DrawerHeader>

            <DrawerBody>
              {selectedAccount && (
                <Box>
                  <Stat mb={4}>
                    <StatLabel fontSize="md">Account</StatLabel>
                    <StatNumber>{selectedAccount.code} - {selectedAccount.name}</StatNumber>
                    <StatHelpText>
                      <HStack>
                        <Badge colorScheme={TYPE_COLORS[selectedAccount.type] || 'gray'}>
                          {selectedAccount.type}
                        </Badge>
                        {selectedAccount.category && (
                          <Badge colorScheme="teal">{selectedAccount.category}</Badge>
                        )}
                      </HStack>
                    </StatHelpText>
                  </Stat>
                  
                  <Stat mb={6} p={4} borderWidth="1px" borderRadius="md" bg="blue.50">
                    <StatLabel fontSize="md">Current Balance</StatLabel>
                    <StatNumber fontSize="2xl" color={accountBalance >= 0 ? "green.500" : "red.500"}>
                      {formatCurrency(accountBalance)}
                    </StatNumber>
                    <StatHelpText>
                      Based on all transactions
                    </StatHelpText>
                  </Stat>
                  
                  <Tabs variant="enclosed" colorScheme="blue">
                    <TabList>
                      <Tab><HStack><FiList /><Text>Recent Transactions</Text></HStack></Tab>
                      <Tab><HStack><FiDollarSign /><Text>Account Info</Text></HStack></Tab>
                    </TabList>
                    <TabPanels>
                      <TabPanel>
                        {loadingTransactions ? (
                          <Center py={8}>
                            <Spinner />
                          </Center>
                        ) : accountTransactions.length === 0 ? (
                          <Center py={8}>
                            <Stack align="center">
                              <Text color="gray.500">No transactions found for this account</Text>
                            </Stack>
                          </Center>
                        ) : (
                          <Table size="sm" variant="simple">
                            <Thead>
                              <Tr>
                                <Th>Date</Th>
                                <Th>Description</Th>
                                <Th isNumeric>Amount</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {accountTransactions.map(transaction => (
                                <Tr key={transaction.id}>
                                  <Td>{new Date(transaction.date).toLocaleDateString()}</Td>
                                  <Td>{transaction.description}</Td>
                                  <Td isNumeric color={transaction.type === 'credit' ? "green.500" : "red.500"}>
                                    {formatCurrency(transaction.amount)}
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        )}
                      </TabPanel>
                      <TabPanel>
                        <Stack spacing={4}>
                          <Box>
                            <Text fontWeight="bold">Account Code</Text>
                            <Text>{selectedAccount.code}</Text>
                          </Box>
                          <Box>
                            <Text fontWeight="bold">Account Name</Text>
                            <Text>{selectedAccount.name}</Text>
                          </Box>
                          <Box>
                            <Text fontWeight="bold">Account Type</Text>
                            <Badge colorScheme={TYPE_COLORS[selectedAccount.type] || 'gray'}>
                              {selectedAccount.type}
                            </Badge>
                          </Box>
                          <Box>
                            <Text fontWeight="bold">Cashflow Category</Text>
                            <Text>{selectedAccount.category || '-'}</Text>
                          </Box>
                          <Box>
                            <Text fontWeight="bold">Subcategory</Text>
                            <Text>{selectedAccount.subcategory || '-'}</Text>
                          </Box>
                          <Box>
                            <Text fontWeight="bold">Current Asset</Text>
                            <Text>{selectedAccount.isCurrentAsset ? 'Yes' : 'No'}</Text>
                          </Box>
                          <Box>
                            <Text fontWeight="bold">Current Liability</Text>
                            <Text>{selectedAccount.isCurrentLiability ? 'Yes' : 'No'}</Text>
                          </Box>
                        </Stack>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </Box>
              )}
            </DrawerBody>

            <DrawerFooter borderTopWidth="1px">
              <Button variant="outline" mr={3} onClick={onDrawerClose}>
                Close
              </Button>
              {isAdmin && (
                <Button colorScheme="blue" onClick={() => {
                  onDrawerClose();
                  handleEdit(selectedAccount);
                }}>
                  Edit Account
                </Button>
              )}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </Box>
    </ProtectedRoute>
  );
};

// Wrap with ProtectedRoute
const ProtectedAccountsPage = () => (
  <ProtectedRoute>
    <AccountsPage />
  </ProtectedRoute>
);

export default ProtectedAccountsPage; 