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
  Progress,
} from '@chakra-ui/react';
import { FiSearch, FiEdit, FiTrash2, FiMoreVertical, FiPlus } from 'react-icons/fi';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import FixedAssetForm from '../../components/financial/FixedAssetForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';

const FixedAssetsPage = () => {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
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

  // Calculate depreciation percentage
  const calculateDepreciationPercentage = (value, accumulatedDepreciation) => {
    if (!value || value === 0) return 0;
    const percentage = (accumulatedDepreciation / value) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Get formatted category name
  const getCategoryName = (categoryValue) => {
    if (!categoryValue) return 'N/A';
    
    const categoryMap = {
      'equipment': 'Equipment',
      'vehicle': 'Vehicle',
      'building': 'Building',
      'land': 'Land',
      'furniture': 'Furniture',
      'other': 'Other'
    };
    
    return categoryMap[categoryValue] || categoryValue.charAt(0).toUpperCase() + categoryValue.slice(1);
  };

  // Fetch fixed assets
  const fetchAssets = async () => {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to view fixed assets');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      
      // Fetch fixed assets
      const response = await axios.get(
        `/api/assets?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setAssets(response.data.data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching fixed assets:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError('Failed to load fixed assets. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchAssets();
    }
  }, [token, isAuthenticated, categoryFilter]);

  // Filter assets based on search term
  const filteredAssets = assets.filter((asset) => {
    return searchTerm === '' || 
      asset.assetName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calculate totals
  const totalValue = filteredAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);
  const totalAccumulatedDepreciation = filteredAssets.reduce(
    (sum, asset) => sum + parseFloat(asset.accumulatedDepreciation), 0
  );
  const totalBookValue = filteredAssets.reduce(
    (sum, asset) => sum + parseFloat(asset.bookValue), 0
  );

  // Handle delete asset
  const handleDelete = async (assetId) => {
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

    if (window.confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/assets/${assetId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        toast({
          title: 'Success',
          description: 'Asset deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Refresh the assets list
        fetchAssets();
      } catch (error) {
        console.error('Error deleting asset:', error);
        
        if (error.response?.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please login again.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        } else {
          const errorMessage = error.response?.data?.message || 'Failed to delete asset';
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

  // Open form to add/edit asset
  const handleEditAsset = (asset = null) => {
    setSelectedAsset(asset);
    onOpen();
  };

  // Handle successful form submission
  const handleFormSuccess = () => {
    fetchAssets();
    onClose();
  };

  // Reset filters
  const resetFilters = () => {
    setCategoryFilter('');
    setSearchTerm('');
  };

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Fixed Assets Management
        </Heading>
        <Button 
          colorScheme="teal" 
          leftIcon={<FiPlus />}
          onClick={() => handleEditAsset()}
          isDisabled={!isAuthenticated}
        >
          Add Asset
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
              placeholder="Search asset names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Select
            placeholder="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            maxW={{ md: '200px' }}
          >
            <option value="">All categories</option>
            <option value="equipment">Equipment</option>
            <option value="vehicle">Vehicle</option>
            <option value="building">Building</option>
            <option value="land">Land</option>
            <option value="furniture">Furniture</option>
            <option value="other">Other</option>
          </Select>

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
          <StatLabel>Total Acquisition Value</StatLabel>
          <StatNumber>{formatCurrency(totalValue)}</StatNumber>
        </Stat>
        
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Accumulated Depreciation</StatLabel>
          <StatNumber color="red.500">{formatCurrency(totalAccumulatedDepreciation)}</StatNumber>
        </Stat>
        
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Book Value</StatLabel>
          <StatNumber color="blue.500">{formatCurrency(totalBookValue)}</StatNumber>
        </Stat>
      </SimpleGrid>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading fixed assets..." />
      ) : filteredAssets.length === 0 ? (
        <EmptyState 
          title="No fixed assets found" 
          message={searchTerm || categoryFilter ? 
            'Try adjusting your search filters.' : 
            'Click the "Add Asset" button to register your first fixed asset.'}
          actionText={!searchTerm && !categoryFilter ? "Add Asset" : null}
          onAction={!searchTerm && !categoryFilter ? () => handleEditAsset() : null}
        />
      ) : (
        <Box overflowX="auto">
          <Table variant="simple" bg="white" shadow="sm">
            <Thead>
              <Tr>
                <Th>Asset Name</Th>
                <Th>Category</Th>
                <Th>Acquisition Date</Th>
                <Th isNumeric>Value</Th>
                <Th>Useful Life</Th>
                <Th isNumeric>Accumulated Depreciation</Th>
                <Th isNumeric>Book Value</Th>
                <Th>Depreciation</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredAssets.map((asset) => (
                <Tr key={asset.id}>
                  <Td fontWeight="medium">{asset.assetName}</Td>
                  <Td>
                    <Badge>
                      {getCategoryName(asset.category)}
                    </Badge>
                  </Td>
                  <Td>{formatDate(asset.acquisitionDate)}</Td>
                  <Td isNumeric>{formatCurrency(asset.value)}</Td>
                  <Td>{asset.usefulLife} years</Td>
                  <Td isNumeric color="red.500">{formatCurrency(asset.accumulatedDepreciation)}</Td>
                  <Td isNumeric fontWeight="semibold">{formatCurrency(asset.bookValue)}</Td>
                  <Td width="150px">
                    <Box>
                      <Progress 
                        value={calculateDepreciationPercentage(asset.value, asset.accumulatedDepreciation)} 
                        size="sm" 
                        colorScheme="orange" 
                        borderRadius="full"
                      />
                      <Text fontSize="xs" mt={1} textAlign="right">
                        {calculateDepreciationPercentage(asset.value, asset.accumulatedDepreciation).toFixed(1)}%
                      </Text>
                    </Box>
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
                          onClick={() => handleEditAsset(asset)}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          color="red.500"
                          onClick={() => handleDelete(asset.id)}
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

      {/* Fixed Asset Form Modal */}
      {isOpen && (
        <FixedAssetForm
          isOpen={isOpen}
          onClose={onClose}
          asset={selectedAsset}
          onSubmitSuccess={handleFormSuccess}
        />
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedFixedAssetsPage = () => (
  <ProtectedRoute>
    <FixedAssetsPage />
  </ProtectedRoute>
);

export default ProtectedFixedAssetsPage; 