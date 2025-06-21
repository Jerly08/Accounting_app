import { useState, useEffect, useCallback } from 'react';
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
  Spinner,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useDisclosure,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ClientForm from '../../components/clients/ClientForm';

// Demo data for fallback
const demoClients = [
  { id: 'demo-1', name: 'Demo Client 1', email: 'demo1@example.com', phone: '123-456-7890' },
  { id: 'demo-2', name: 'Demo Client 2', email: 'demo2@example.com', phone: '123-456-7891' },
];

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  // Cache management
  const [dataFetched, setDataFetched] = useState(false);
  
  // Function to fetch clients data
  const fetchClients = useCallback(async (showLoadingState = true) => {
    // Don't fetch if we're still checking authentication
    if (authLoading) {
      console.log('Auth is still loading, delaying client fetch');
      return;
    }
    
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      console.log('Not authenticated, cannot fetch clients');
      setError('Please log in to view clients');
      setLoading(false);
      return;
    }
    
    if (showLoadingState) {
      setLoading(true);
    }
    
    try {
      console.log('Fetching clients data...');
      const response = await axios.get('/api/clients');
      handleClientResponse(response);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients. Please try again.');
      
      // Use demo data as fallback
      console.log('Using demo client data as fallback');
      setClients(demoClients);
      
      toast({
        title: 'Error loading clients',
        description: err.message || 'Please try refreshing the page',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, toast]);
  
  // Handle client data response
  const handleClientResponse = (response) => {
    console.log('Client data received:', response.status);
    
    if (response.data && Array.isArray(response.data)) {
      setClients(response.data);
      setDataFetched(true);
      setError(null);
    } else if (response.data && response.data.clients && Array.isArray(response.data.clients)) {
      setClients(response.data.clients);
      setDataFetched(true);
      setError(null);
    } else {
      console.error('Invalid client data format:', response.data);
      setError('Received invalid client data format');
      // Use demo data as fallback
      setClients(demoClients);
    }
  };

  // Initial data fetch when component mounts and auth is ready
  useEffect(() => {
    // Only fetch when auth state is determined
    if (!authLoading) {
      if (isAuthenticated && !dataFetched) {
        console.log('Auth ready, fetching clients data');
        fetchClients();
      } else if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
      }
    }
  }, [isAuthenticated, authLoading, dataFetched, fetchClients, router]);
  
  // Set a safety timeout to prevent infinite loading state
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (loading) {
        console.log('Safety timeout triggered - forcing loading state to complete');
        setLoading(false);
        if (clients.length === 0) {
          setClients(demoClients);
          setError('Loading timed out. Showing demo data.');
        }
      }
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(safetyTimer);
  }, [loading, clients.length]);

  const handleAddClient = () => {
    setSelectedClient(null); // Reset selected client
    onOpen(); // Open the form modal
  };

  const handleEditClient = (id) => {
    const clientToEdit = clients.find(client => client.id === id);
    if (clientToEdit) {
      setSelectedClient(clientToEdit);
      onOpen();
    } else {
      toast({
        title: 'Error',
        description: 'Client not found',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleFormSubmit = () => {
    onClose(); // Close the modal
    fetchClients(true); // Refresh the client list
  };

  const handleDeleteClient = async (id) => {
    try {
      await axios.delete(`/api/clients/${id}`);
      setClients(clients.filter(client => client.id !== id));
      toast({
        title: 'Client deleted',
        description: 'The client has been successfully deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Clients</Heading>
        <Button colorScheme="green" onClick={handleAddClient}>
          Add Client
        </Button>
      </Flex>

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Flex justify="center" align="center" height="300px">
          <Spinner size="xl" />
        </Flex>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {clients.length > 0 ? (
              clients.map((client) => (
                <Tr key={client.id}>
                  <Td>{client.name}</Td>
                  <Td>{client.email}</Td>
                  <Td>{client.phone}</Td>
                  <Td>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      mr={2}
                      onClick={() => handleEditClient(client.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      onClick={() => handleDeleteClient(client.id)}
                    >
                      Delete
                    </Button>
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={4} textAlign="center">
                  No clients found
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      )}

      {/* Client Form Modal */}
      <ClientForm
        isOpen={isOpen}
        onClose={onClose}
        client={selectedClient}
        onSubmit={handleFormSubmit}
      />
    </Box>
  );
} 