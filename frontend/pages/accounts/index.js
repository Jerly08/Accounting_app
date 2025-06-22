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
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiSearch,
  FiFilter,
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

const AccountsPage = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [accounts, setAccounts] = useState([]);  // Initiate as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);
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

  // Safely filter accounts using optional chaining and fallback to empty array
  const filteredAccounts = (accounts || []).filter(account => {
    if (!account) return false;
    
    const matchesSearch = 
      (account.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (account.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesType = !filterType || account.type === filterType;
    
    return matchesSearch && matchesType;
  });

  if (loading) {
    return <LoadingSpinner text="Loading accounts..." />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Chart of Accounts
        </Heading>
        {isAdmin && (
          <Button 
            leftIcon={<FiPlus />} 
            colorScheme="teal" 
            onClick={addNewAccount}
          >
            Add New Account
          </Button>
        )}
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

      <Flex mb={6} direction={{ base: 'column', md: 'row' }} gap={4}>
        <InputGroup flex="2">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search by code or name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        
        <Select 
          placeholder="Filter by type" 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          flex="1"
          maxW={{ base: 'full', md: '200px' }}
        >
          {ACCOUNT_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
      </Flex>

      {filteredAccounts.length === 0 ? (
        <EmptyState
          title="No accounts found"
          message={searchTerm || filterType ? "Try adjusting your search filters." : "Click the 'Add New Account' button to create your first account."}
          actionText={!searchTerm && !filterType ? "Add New Account" : null}
          onAction={!searchTerm && !filterType ? addNewAccount : null}
        />
      ) : (
        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Account Code</Th>
                <Th>Account Name</Th>
                <Th>Type</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredAccounts.map((account) => (
                <Tr key={account.code}>
                  <Td fontFamily="mono" fontWeight="semibold">{account.code}</Td>
                  <Td>{account.name}</Td>
                  <Td>
                    <Badge colorScheme={TYPE_COLORS[account.type] || 'gray'}>
                      {account.type}
                    </Badge>
                  </Td>
                  <Td>
                    {isAdmin ? (
                      <HStack spacing={2}>
                        <IconButton
                          aria-label="Edit account"
                          icon={<FiEdit />}
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleEdit(account)}
                        />
                        <IconButton
                          aria-label="Delete account"
                          icon={<FiTrash2 />}
                          size="sm"
                          colorScheme="red"
                          onClick={() => handleDelete(account.code)}
                        />
                      </HStack>
                    ) : (
                      <Text fontSize="sm" color="gray.500">No actions available</Text>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <AccountForm 
        isOpen={isOpen} 
        onClose={onClose} 
        account={selectedAccount}
        onSubmitSuccess={handleFormSubmit}
        accountTypes={ACCOUNT_TYPES}
      />
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedAccountsPage = () => (
  <ProtectedRoute>
    <AccountsPage />
  </ProtectedRoute>
);

export default ProtectedAccountsPage; 