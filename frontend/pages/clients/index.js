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
  HStack,
  Text,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ClientForm from '../../components/clients/ClientForm';
import { FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

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
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Function to fetch clients data
  const fetchClients = useCallback(async (page = currentPage, showLoadingState = true) => {
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
      console.log(`Fetching clients data for page ${page}...`);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      // Add pagination parameters
      params.append('page', page);
      params.append('limit', pageSize);
      
      const response = await axios.get(`/api/clients?${params.toString()}`);
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
  }, [isAuthenticated, authLoading, toast, pageSize, searchTerm]);
  
  // Handle client data response
  const handleClientResponse = (response) => {
    console.log('Client data received:', response.status);
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      setClients(response.data.data);
      setDataFetched(true);
      setError(null);
      
      // Update pagination state
      if (response.data.pagination) {
        setCurrentPage(response.data.pagination.page);
        setTotalItems(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
      }
    } else if (response.data && Array.isArray(response.data)) {
      setClients(response.data);
      setDataFetched(true);
      setError(null);
    } else if (response.data && response.data.clients && Array.isArray(response.data.clients)) {
      setClients(response.data.clients);
      setDataFetched(true);
      setError(null);
      
      // Update pagination state
      if (response.data.pagination) {
        setCurrentPage(response.data.pagination.page);
        setTotalItems(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
      }
    } else {
      console.error('Invalid client data format:', response.data);
      setError('Received invalid client data format');
      // Use demo data as fallback
      setClients(demoClients);
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchClients(newPage, true);
  };

  // Initial data fetch when component mounts and auth is ready
  useEffect(() => {
    // Only fetch when auth state is determined
    if (!authLoading) {
      if (isAuthenticated && !dataFetched) {
        console.log('Auth ready, fetching clients data');
        fetchClients(1);
      } else if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
      }
    }
  }, [isAuthenticated, authLoading, dataFetched, fetchClients, router]);
  
  // Refetch when search term changes
  useEffect(() => {
    if (isAuthenticated && dataFetched) {
      const delaySearch = setTimeout(() => {
        // When search term changes, always go back to page 1
        fetchClients(1, false);
      }, 500);
      
      return () => clearTimeout(delaySearch);
    }
  }, [searchTerm, isAuthenticated, fetchClients, dataFetched]);
  
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
    fetchClients(currentPage, true); // Refresh the client list
  };

  const handleDeleteClient = async (id) => {
    try {
      await axios.delete(`/api/clients/${id}`);
      
      toast({
        title: 'Client deleted',
        description: 'The client has been successfully deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the client list
      fetchClients(currentPage, true);
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
  
  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    // Function to render page number button
    const renderPageButton = (pageNum) => (
      <Button
        key={pageNum}
        size="sm"
        colorScheme={currentPage === pageNum ? "blue" : "gray"}
        onClick={() => handlePageChange(pageNum)}
      >
        {pageNum}
      </Button>
    );

    // Function to render ellipsis
    const renderEllipsis = (key) => (
      <Text key={key} mx={2}>...</Text>
    );

    // Determine which page buttons to show
    let pageButtons = [];
    
    // Always show first page
    pageButtons.push(renderPageButton(1));
    
    if (totalPages > 5) {
      // If current page is close to the start
      if (currentPage <= 3) {
        pageButtons.push(renderPageButton(2));
        pageButtons.push(renderPageButton(3));
        pageButtons.push(renderPageButton(4));
        pageButtons.push(renderEllipsis('ellipsis-end'));
      } 
      // If current page is close to the end
      else if (currentPage >= totalPages - 2) {
        pageButtons.push(renderEllipsis('ellipsis-start'));
        pageButtons.push(renderPageButton(totalPages - 3));
        pageButtons.push(renderPageButton(totalPages - 2));
        pageButtons.push(renderPageButton(totalPages - 1));
      } 
      // If current page is in the middle
      else {
        pageButtons.push(renderEllipsis('ellipsis-start'));
        pageButtons.push(renderPageButton(currentPage - 1));
        pageButtons.push(renderPageButton(currentPage));
        pageButtons.push(renderPageButton(currentPage + 1));
        pageButtons.push(renderEllipsis('ellipsis-end'));
      }
      
      // Always show last page
      pageButtons.push(renderPageButton(totalPages));
    } else {
      // If 5 or fewer pages, show all pages
      for (let i = 2; i <= totalPages; i++) {
        pageButtons.push(renderPageButton(i));
      }
    }

    return (
      <Flex justify="center" mt={6} align="center">
        <Button
          size="sm"
          leftIcon={<FiChevronLeft />}
          onClick={() => handlePageChange(currentPage - 1)}
          isDisabled={currentPage === 1}
          mr={2}
        >
          Previous
        </Button>
        
        <HStack spacing={1}>
          {pageButtons}
        </HStack>
        
        <Button
          size="sm"
          rightIcon={<FiChevronRight />}
          onClick={() => handlePageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages}
          ml={2}
        >
          Next
        </Button>
      </Flex>
    );
  };
  
  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Clients</Heading>
        <Button colorScheme="green" onClick={handleAddClient}>
          Add Client
        </Button>
      </Flex>
      
      {/* Search Bar */}
      <Box mb={6} p={4} bg="white" borderRadius="md" shadow="sm">
        <InputGroup maxW="500px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search clients by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </Box>

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
        <>
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
          
          {/* Pagination */}
          {renderPagination()}
          
          {/* Page size selector and summary */}
          {clients.length > 0 && (
            <Flex justify="space-between" align="center" mt={4}>
              <Text fontSize="sm" color="gray.600">
                Showing {clients.length} of {totalItems} clients
              </Text>
              <Select 
                size="sm" 
                width="auto" 
                value={pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value);
                  setPageSize(newSize);
                  setCurrentPage(1); // Reset to first page when changing page size
                  fetchClients(1, true); // Explicitly pass page 1 and show loading state
                }}
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </Select>
            </Flex>
          )}
        </>
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