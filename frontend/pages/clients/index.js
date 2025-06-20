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
  useToast,
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiSearch,
  FiPhone,
  FiMail,
  FiHome
} from 'react-icons/fi';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import ClientForm from '../../components/clients/ClientForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';

const ClientsPage = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const toast = useToast();
  const router = useRouter();
  const { token, user, isAuthenticated } = useAuth();

  // Fungsi untuk mendapatkan URL API yang sesuai
  const getApiUrl = (endpoint) => {
    // Jika endpoint sudah diawali dengan '/', hapus '/' di awal
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    
    // Jika process.env.NEXT_PUBLIC_API_URL tersedia, gunakan itu sebagai baseURL
    if (process.env.NEXT_PUBLIC_API_URL) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      // Pastikan ada '/' di antara baseUrl dan endpoint
      const separator = baseUrl.endsWith('/') ? '' : '/';
      return `${baseUrl}${separator}${cleanEndpoint}`;
    }
    
    // Jika tidak, gunakan endpoint relatif (axios.defaults.baseURL akan digunakan)
    return `/${cleanEndpoint}`;
  };

  const fetchClients = async () => {
    // Don't attempt to fetch if no token available
    if (!token || !isAuthenticated) {
      console.log('No token or not authenticated, skipping fetch');
      setLoading(false);
      setError('You must be logged in to view clients');
      return;
    }
    
    // Prevent multiple fetch attempts running simultaneously
    if (loading && fetchAttempts > 0) {
      console.log('Already loading, skipping duplicate fetch');
      return;
    }
    
    try {
      setLoading(true);
      setFetchAttempts(prev => prev + 1);
      
      console.log(`Fetch attempt ${fetchAttempts + 1} with baseURL:`, axios.defaults.baseURL);
      
      // Ensure we're sending the latest token
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      // Menggunakan URL yang tepat
      console.log('Fetching clients directly from /api/clients');
      
      const response = await axios.get('/api/clients', config);
      
      console.log('Raw client fetch response:', response);
      console.log('Client data:', response.data);
      
      // Penanganan berbagai kemungkinan format data
      if (response.data && response.data.clients && Array.isArray(response.data.clients)) {
        console.log('Found clients array in response.data.clients');
        setClients(response.data.clients);
        setError(null);
      } else if (Array.isArray(response.data)) {
        console.log('Response data is directly an array');
        setClients(response.data);
        setError(null);
      } else if (response.data && typeof response.data === 'object') {
        console.log('Response data is an object, looking for arrays');
        // Cari array dalam objek respon
        const arrayProps = Object.keys(response.data).filter(key => 
          Array.isArray(response.data[key])
        );
        
        if (arrayProps.length > 0) {
          console.log(`Found array in property: ${arrayProps[0]}`);
          setClients(response.data[arrayProps[0]]);
          setError(null);
        } else {
          console.log('No arrays found in response object, using empty array');
          setClients([]);
        }
      } else {
        console.warn('Unexpected API response format, using empty array');
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      
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
      
      // If we get a 401 and haven't tried too many times, retry once
      if (error.response?.status === 401 && fetchAttempts < 2) {
        console.log(`Retrying after 401 error (attempt ${fetchAttempts})`);
        
        // We don't want to trigger fetchClients directly to avoid potential loops
        // We'll let the authentication process handle re-fetching
        setError('Authentication error. Trying to reconnect...');
        return;
      }
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError(`Failed to load clients: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we have a token and are authenticated and not currently loading
    if (token && isAuthenticated) {
      console.log('Token available, fetching clients');
      // Reset fetch attempts counter when we have a valid token/auth state
      setFetchAttempts(0);
      fetchClients();
    }
  }, [token, isAuthenticated]); // Explicitly don't include fetchClients to avoid loops

  // Separate effect to track authentication changes during session
  useEffect(() => {
    // If we lose authentication during the session, handle it
    if (!isAuthenticated && fetchAttempts > 0) {
      console.log('Authentication lost during session');
      setError('Your session has expired. Please login again.');
      setLoading(false);
    }
  }, [isAuthenticated, fetchAttempts]);

  const handleEdit = (client) => {
    setSelectedClient(client);
    onOpen();
  };

  const handleDelete = async (id) => {
    // Don't proceed if not authenticated or no token
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
    
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };

        const apiUrl = getApiUrl(`api/clients/${id}`);
        console.log('Deleting client from:', apiUrl);
        
        await axios.delete(apiUrl, config);
        
        toast({
          title: 'Success',
          description: 'Client deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Refresh client list
        fetchClients();
      } catch (error) {
        console.error('Error deleting client:', error);
        
        // If authentication error, show appropriate message
        if (error.response?.status === 401) {
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please login again.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to delete client',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      }
    }
  };

  const handleFormSubmit = () => {
    onClose();
    setSelectedClient(null);
    fetchClients();
  };

  const addNewClient = () => {
    setSelectedClient(null);
    onOpen();
  };

  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    
    return (
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.phone && client.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Clients
        </Heading>
        <Button
          colorScheme="teal"
          leftIcon={<FiPlus />}
          onClick={addNewClient}
          isDisabled={!isAuthenticated}
        >
          Add Client
        </Button>
      </Flex>

      <InputGroup mb={6} maxW="500px">
        <InputLeftElement pointerEvents="none">
          <FiSearch color="gray.300" />
        </InputLeftElement>
        <Input
          placeholder="Search clients by name, email or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading clients..." />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          title="No clients found"
          message={searchTerm ? 'Try adjusting your search filters.' : 'Click the "Add Client" button to create your first client.'}
          actionText={!searchTerm ? "Add Client" : null}
          onAction={!searchTerm ? addNewClient : null}
        />
      ) : (
        <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Address</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredClients.map((client) => (
                <Tr key={client.id}>
                  <Td fontWeight="medium">{client.name}</Td>
                  <Td>
                    <HStack>
                      <FiPhone size={14} />
                      <Text>{client.phone || 'N/A'}</Text>
                    </HStack>
                  </Td>
                  <Td>
                    <HStack>
                      <FiMail size={14} />
                      <Text>{client.email || 'N/A'}</Text>
                    </HStack>
                  </Td>
                  <Td>
                    <HStack>
                      <FiHome size={14} />
                      <Text noOfLines={1} maxW="250px">
                        {client.address || 'N/A'}
                      </Text>
                    </HStack>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="Edit client"
                        icon={<FiEdit />}
                        size="sm"
                        colorScheme="blue"
                        onClick={() => handleEdit(client)}
                      />
                      <IconButton
                        aria-label="Delete client"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDelete(client.id)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <ClientForm 
        isOpen={isOpen} 
        onClose={onClose} 
        client={selectedClient}
        onSubmitSuccess={handleFormSubmit}
      />
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedClientsPage = () => (
  <ProtectedRoute>
    <ClientsPage />
  </ProtectedRoute>
);

export default ProtectedClientsPage; 