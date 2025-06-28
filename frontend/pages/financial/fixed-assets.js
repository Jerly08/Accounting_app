import { useState, useEffect, useRef } from 'react';
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
  Checkbox,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Container,
  VStack,
  Spacer,
  Tooltip,
} from '@chakra-ui/react';
import { FiSearch, FiEdit, FiTrash2, FiMoreVertical, FiPlus, FiChevronLeft, FiChevronRight, FiCalendar, FiDownload } from 'react-icons/fi';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import FixedAssetForm from '../../components/financial/FixedAssetForm';
import FixedAssetDepreciation from '../../components/financial/FixedAssetDepreciation';
import { formatCurrency } from '../../utils/formatters';
import { CSVLink } from 'react-csv';

const FixedAssetsPage = () => {
  const { isAuthenticated, token } = useAuth();
  const toast = useToast();
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [deleteAssetId, setDeleteAssetId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState('acquisitionDate');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modal controls
  const {
    isOpen: isFormOpen,
    onOpen: onFormOpen,
    onClose: onFormClose,
  } = useDisclosure();

  const {
    isOpen: isDepreciationOpen,
    onOpen: onDepreciationOpen,
    onClose: onDepreciationClose,
  } = useDisclosure();

  const {
    isOpen: isDeleteAlertOpen,
    onOpen: onDeleteAlertOpen,
    onClose: onDeleteAlertClose,
  } = useDisclosure();

  const cancelRef = useRef();

  // Fetch assets when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchAssets();
    }
  }, [isAuthenticated]);

  // Fetch assets from API
  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/assets', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
      });

      if (response.data.success) {
        setAssets(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch assets',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle asset form submission success
  const handleFormSuccess = () => {
    fetchAssets();
  };

  // Open asset form for editing
  const handleEditAsset = (asset) => {
    setSelectedAsset(asset);
    onFormOpen();
  };

  // Open depreciation modal
  const handleOpenDepreciation = (asset) => {
    setSelectedAsset(asset);
    onDepreciationOpen();
  };

  // Confirm asset deletion
  const handleDeleteConfirm = (assetId) => {
    setDeleteAssetId(assetId);
    onDeleteAlertOpen();
  };

  // Delete asset
  const handleDeleteAsset = async () => {
    try {
      const response = await axios.delete(`/api/assets/${deleteAssetId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Asset deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchAssets();
      }
      } catch (error) {
        console.error('Error deleting asset:', error);
          toast({
            title: 'Error',
        description: error.response?.data?.message || 'Failed to delete asset',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
    } finally {
      onDeleteAlertClose();
      setDeleteAssetId(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Get category label
  const getCategoryName = (category) => {
    const categories = {
      equipment: 'Equipment',
      vehicle: 'Vehicle',
      building: 'Building',
      land: 'Land',
      furniture: 'Furniture',
      other: 'Other',
    };
    return categories[category] || category;
  };

  // Get badge color based on asset status
  const getAssetStatusColor = (asset) => {
    if (!asset) return 'gray';
    
    // If book value is 0 or very small, consider it fully depreciated
    if (asset.bookValue <= 0.01) return 'red';
    
    // Calculate depreciation percentage
    const depreciationPercentage = (asset.accumulatedDepreciation / asset.value) * 100;
    
    if (depreciationPercentage >= 90) return 'orange';
    if (depreciationPercentage >= 75) return 'yellow';
    if (depreciationPercentage >= 50) return 'green';
    return 'blue';
  };

  // Get asset status label
  const getAssetStatusLabel = (asset) => {
    if (!asset) return 'Unknown';
    
    if (asset.bookValue <= 0.01) return 'Fully Depreciated';
    
    const depreciationPercentage = (asset.accumulatedDepreciation / asset.value) * 100;
    
    if (depreciationPercentage >= 90) return 'Near End of Life';
    if (depreciationPercentage >= 75) return 'Advanced Depreciation';
    if (depreciationPercentage >= 50) return 'Half Depreciated';
    if (depreciationPercentage > 0) return 'Active';
    return 'New';
  };

  // Handle sort change
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort assets
  const filteredAssets = assets
    .filter((asset) => {
      // Apply search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm || 
        asset.assetName.toLowerCase().includes(searchLower) ||
        asset.description?.toLowerCase().includes(searchLower) ||
        asset.location?.toLowerCase().includes(searchLower) ||
        asset.assetTag?.toLowerCase().includes(searchLower);
      
      // Apply category filter
      const matchesCategory = !categoryFilter || asset.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Apply sorting
      let comparison = 0;
      
      switch (sortField) {
        case 'assetName':
          comparison = a.assetName.localeCompare(b.assetName);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'acquisitionDate':
          comparison = new Date(a.acquisitionDate) - new Date(b.acquisitionDate);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'bookValue':
          comparison = a.bookValue - b.bookValue;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Prepare CSV data for export
  const csvData = [
    ['Asset Name', 'Category', 'Acquisition Date', 'Original Value', 'Accumulated Depreciation', 'Book Value', 'Useful Life (years)', 'Location', 'Asset Tag', 'Description'],
    ...filteredAssets.map((asset) => [
      asset.assetName,
      getCategoryName(asset.category),
      formatDate(asset.acquisitionDate),
      asset.value,
      asset.accumulatedDepreciation,
      asset.bookValue,
      asset.usefulLife,
      asset.location || '',
      asset.assetTag || '',
      asset.description || '',
    ]),
  ];

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Flex alignItems="center" justifyContent="space-between" wrap="wrap" gap={4}>
          <Heading as="h1" size="xl">Fixed Assets</Heading>
          
          <HStack spacing={4}>
            <Button 
              leftIcon={<FiPlus />}
              colorScheme="blue"
              onClick={() => {
                setSelectedAsset(null);
                onFormOpen();
              }}
            >
              Add Asset
            </Button>
            
            <CSVLink
              data={csvData}
              filename="fixed-assets.csv"
              className="hidden"
              id="download-csv"
            >
              Download CSV
            </CSVLink>
            
            <Tooltip label="Export to CSV">
              <IconButton
                icon={<FiDownload />}
                aria-label="Export to CSV"
                onClick={() => document.getElementById('download-csv').click()}
              />
            </Tooltip>
        </HStack>
      </Flex>

        <Flex direction={{ base: 'column', md: 'row' }} gap={4} mb={4}>
          <InputGroup maxW={{ base: '100%', md: '300px' }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Select
            placeholder="All Categories"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            maxW={{ base: '100%', md: '200px' }}
          >
            <option value="">All Categories</option>
            <option value="equipment">Equipment</option>
            <option value="vehicle">Vehicle</option>
            <option value="building">Building</option>
            <option value="land">Land</option>
            <option value="furniture">Furniture</option>
            <option value="other">Other</option>
          </Select>
        </Flex>
        
          <Box overflowX="auto">
          <Table variant="simple">
              <Thead>
                <Tr>
                <Th 
                  cursor="pointer" 
                  onClick={() => handleSort('assetName')}
                >
                  Asset Name {sortField === 'assetName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Th>
                <Th 
                  cursor="pointer" 
                  onClick={() => handleSort('category')}
                >
                  Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Th>
                <Th 
                  cursor="pointer" 
                  onClick={() => handleSort('acquisitionDate')}
                >
                  Acquisition Date {sortField === 'acquisitionDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Th>
                <Th 
                  isNumeric 
                  cursor="pointer" 
                  onClick={() => handleSort('value')}
                >
                  Original Value {sortField === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th isNumeric>Accumulated Depreciation</Th>
                <Th 
                  isNumeric 
                  cursor="pointer" 
                  onClick={() => handleSort('bookValue')}
                >
                  Book Value {sortField === 'bookValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                </Th>
                <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={8} textAlign="center">Loading...</Td>
                </Tr>
              ) : filteredAssets.length === 0 ? (
                <Tr>
                  <Td colSpan={8} textAlign="center">No assets found</Td>
                </Tr>
              ) : (
                filteredAssets.map((asset) => (
                  <Tr key={asset.id}>
                    <Td>{asset.assetName}</Td>
                    <Td>{getCategoryName(asset.category)}</Td>
                    <Td>{formatDate(asset.acquisitionDate)}</Td>
                    <Td isNumeric>{formatCurrency(asset.value)}</Td>
                    <Td isNumeric>{formatCurrency(asset.accumulatedDepreciation)}</Td>
                    <Td isNumeric>{formatCurrency(asset.bookValue)}</Td>
                    <Td>
                      <Badge colorScheme={getAssetStatusColor(asset)}>
                        {getAssetStatusLabel(asset)}
                      </Badge>
                    </Td>
                    <Td>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<FiMoreVertical />}
                          variant="ghost"
                          size="sm"
                          aria-label="Actions"
                        />
                        <MenuList>
                          <MenuItem 
                            icon={<FiEdit />} 
                            onClick={() => handleEditAsset(asset)}
                          >
                            Edit Asset
                          </MenuItem>
                          <MenuItem 
                            icon={<FiCalendar />} 
                            onClick={() => handleOpenDepreciation(asset)}
                          >
                            Manage Depreciation
                          </MenuItem>
                          <MenuItem 
                            icon={<FiTrash2 />} 
                            onClick={() => handleDeleteConfirm(asset.id)}
                            color="red.500"
                          >
                            Delete Asset
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))
              )}
              </Tbody>
            </Table>
          </Box>
          
        <Box>
          <Text>
            Total Assets: {filteredAssets.length}
          </Text>
          <Text>
            Total Original Value: {formatCurrency(
              filteredAssets.reduce((sum, asset) => {
                // Safely parse the asset value
                const value = parseFloat(asset.value);
                return isNaN(value) ? sum : sum + value;
              }, 0)
            )}
          </Text>
          <Text>
            Total Book Value: {formatCurrency(
              filteredAssets.reduce((sum, asset) => {
                // Safely parse the book value
                const bookValue = parseFloat(asset.bookValue);
                return isNaN(bookValue) ? sum : sum + bookValue;
              }, 0)
            )}
          </Text>
        </Box>
      </VStack>

      {/* Asset Form Modal */}
        <FixedAssetForm
        isOpen={isFormOpen}
        onClose={onFormClose}
          asset={selectedAsset}
          onSubmitSuccess={handleFormSuccess}
        />

      {/* Depreciation Modal */}
      <FixedAssetDepreciation
        asset={selectedAsset}
        onClose={onDepreciationClose}
        isOpen={isDepreciationOpen}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Asset
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this asset? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteAlertClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteAsset} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
};

export default FixedAssetsPage; 