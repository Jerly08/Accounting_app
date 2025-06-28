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
  Text,
  HStack,
  Stack,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Progress,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Tooltip,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  FormLabel,
} from '@chakra-ui/react';
import { FiSearch, FiArrowRight, FiFilter, FiEdit, FiPlus, FiMoreVertical, FiInfo } from 'react-icons/fi';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import WipForm from '../../components/financial/WipForm';
import WIPExportButton from '../../components/financial/WIPExportButton';

const WipPage = () => {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ongoing');
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();
  const [totals, setTotals] = useState({
    totalCosts: 0,
    totalBilled: 0,
    totalWip: 0
  });

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
  const formatPercentage = (value) => {
    return `${parseFloat(value).toFixed(1)}%`;
  };

  // Fetch WIP data
  const fetchWipData = async () => {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to view WIP data');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      // Fetch WIP data
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/wip?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Ensure all projects have a progress value and calculate additional metrics
      const projectsWithDefaults = (response.data.data || []).map(project => {
        const totalCosts = project.costs !== undefined ? project.costs : 0;
        const totalBilled = project.billed !== undefined ? project.billed : 0;
        const totalValue = parseFloat(project.totalValue || 0);
        
        // Calculate WIP value (costs - billed)
        const wipValue = totalCosts - totalBilled;
        
        // Calculate billing percentage (billed / costs * 100)
        const billingPercentage = totalCosts > 0 ? (totalBilled / totalCosts) * 100 : 0;
        
        // Calculate financial progress (billed / total value * 100)
        const financialProgress = totalValue > 0 ? (totalBilled / totalValue) * 100 : 0;
        
        // Calculate cost efficiency (costs / (total value * progress/100))
        const expectedCost = totalValue * (project.progress / 100);
        const costEfficiency = expectedCost > 0 ? (totalCosts / expectedCost) * 100 : 0;
        
        return {
          ...project,
          progress: project.progress !== undefined ? project.progress : 0,
          totalCosts: totalCosts,
          totalBilled: totalBilled,
          wipValue: wipValue,
          billingPercentage: billingPercentage,
          financialProgress: financialProgress,
          costEfficiency: costEfficiency
        };
      });
      
      setProjects(projectsWithDefaults);
      calculateTotals(projectsWithDefaults);
      setError(null);
    } catch (error) {
      console.error('Error fetching WIP data:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else if (error.response?.data?.message) {
        setError(`Failed to load WIP data: ${error.response.data.message}`);
      } else if (error.message) {
        setError(`Error: ${error.message}`);
      } else {
        setError('Failed to load WIP data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchWipData();
    }
  }, [token, isAuthenticated, statusFilter]);

  // Filter projects based on search term
  const filteredProjects = projects.filter((project) => {
    return searchTerm === '' || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.client?.name && project.client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (project.projectCode && project.projectCode.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Calculate totals
  const totalProjectValue = filteredProjects.reduce((sum, project) => sum + parseFloat(project.totalValue || 0), 0);
  const totalCosts = filteredProjects.reduce((sum, project) => sum + parseFloat(project.totalCosts || 0), 0);
  const totalBilled = filteredProjects.reduce((sum, project) => sum + parseFloat(project.totalBilled || 0), 0);
  const totalWipValue = filteredProjects.reduce((sum, project) => sum + parseFloat(project.wipValue || 0), 0);
  
  // Calculate average billing percentage
  const avgBillingPercentage = totalCosts > 0 ? (totalBilled / totalCosts) * 100 : 0;

  // Reset filters
  const resetFilters = () => {
    setStatusFilter('ongoing');
    setSearchTerm('');
  };

  // Handle edit WIP
  const handleEditWip = (project = null) => {
    setSelectedProject(project);
    onOpen();
  };

  // Handle form success
  const handleFormSuccess = () => {
    fetchWipData();
  };

  // Prepare export data
  const prepareExportData = () => {
    return filteredProjects.map(project => ({
      'Project Code': project.projectCode || '',
      'Project Name': project.name || '',
      'Client': project.client?.name || '',
      'Status': project.status || '',
      'Progress (%)': project.progress || 0,
      'Total Value': project.totalValue || 0,
      'Total Costs': project.totalCosts || 0,
      'Total Billed': project.totalBilled || 0,
      'WIP Value': project.wipValue || 0,
      'Billing Percentage (%)': project.billingPercentage || 0,
    }));
  };

  const calculateTotals = (projects) => {
    const totalCosts = projects.reduce((sum, project) => sum + parseFloat(project.totalCosts || 0), 0);
    const totalBilled = projects.reduce((sum, project) => sum + parseFloat(project.totalBilled || 0), 0);
    const totalWip = projects.reduce((sum, project) => sum + parseFloat(project.wipValue || 0), 0);
    
    console.log('WIP Summary:', { totalCosts, totalBilled, totalWip, projectCount: projects.length });
    
    setTotals({ totalCosts, totalBilled, totalWip });
  };

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          WIP Management
        </Heading>
        <HStack spacing={3}>
          <WIPExportButton data={prepareExportData()} />
          <Button 
            leftIcon={<FiPlus />} 
            colorScheme="blue"
            onClick={() => handleEditWip()}
          >
            Add WIP Entry
          </Button>
        </HStack>
      </Flex>

      {/* Filters */}
      <Box mb={5} p={4} borderWidth="1px" borderRadius="lg" bg="white">
        <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'flex-start', md: 'center' }} wrap="wrap" gap={3}>
          <HStack mb={{ base: 2, md: 0 }}>
            <FormLabel htmlFor="status-filter" mb={0}>Status:</FormLabel>
            <Select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              w={{ base: 'full', md: '150px' }}
            >
              <option value="">All</option>
              <option value="ongoing">Ongoing</option>
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </HStack>

          <InputGroup maxW={{ md: '300px' }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Button 
            variant="outline" 
            onClick={resetFilters}
            size="md"
          >
            Reset Filters
          </Button>
        </Flex>
      </Box>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 5 }} spacing={4} mb={6}>
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Project Value</StatLabel>
          <StatNumber>{formatCurrency(totalProjectValue)}</StatNumber>
        </Stat>
        
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel display="flex" alignItems="center">
            Total Costs
            <Tooltip label="Includes all project costs with status 'approved', 'pending', 'paid', 'unpaid', and 'rejected'">
              <span><Icon as={FiInfo} ml={1} boxSize={3} color="gray.500" /></span>
            </Tooltip>
          </StatLabel>
          <StatNumber>{formatCurrency(totalCosts)}</StatNumber>
        </Stat>
        
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Billed</StatLabel>
          <StatNumber>{formatCurrency(totalBilled)}</StatNumber>
        </Stat>
        
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel display="flex" alignItems="center">
            WIP Value
            <Tooltip label="WIP Value = Earned Value - Amount Billed. Earned Value is calculated as Project Value × Completion Percentage.">
              <span><Icon as={FiInfo} ml={1} boxSize={3} color="gray.500" /></span>
            </Tooltip>
          </StatLabel>
          <StatNumber color={totalWipValue >= 0 ? "purple.500" : "red.500"}>
            {formatCurrency(totalWipValue)}
          </StatNumber>
        </Stat>
        
        <Stat bg="white" p={4} borderRadius="md" shadow="sm">
          <StatLabel display="flex" alignItems="center">
            Billing Percentage
            <Tooltip label="Percentage of costs that have been billed">
              <span><Icon as={FiInfo} ml={1} boxSize={3} color="gray.500" /></span>
            </Tooltip>
          </StatLabel>
          <StatNumber color={avgBillingPercentage >= 100 ? "green.500" : "orange.500"}>
            {formatPercentage(avgBillingPercentage)}
          </StatNumber>
        </Stat>
      </SimpleGrid>

      {/* WIP Table */}
      <Box bg="white" p={4} borderRadius="md" shadow="sm" overflowX="auto">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorAlert message={error} />
        ) : filteredProjects.length === 0 ? (
          <EmptyState 
            title="No WIP Data Found" 
            message="There are no WIP entries matching your filters."
          />
        ) : (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Project</Th>
                <Th>Client</Th>
                <Th>Status</Th>
                <Th>Progress</Th>
                <Th isNumeric>Total Value</Th>
                <Th isNumeric>Total Costs</Th>
                <Th isNumeric>Total Billed</Th>
                <Th isNumeric>
                  <Tooltip label="WIP Value = Earned Value - Amount Billed. Earned Value is calculated as Project Value × Completion Percentage.">
                    <span>WIP Value <Icon as={FiInfo} boxSize={3} /></span>
                  </Tooltip>
                </Th>
                <Th isNumeric>
                  <Tooltip label="Percentage of costs that have been billed">
                    <span>Billing % <Icon as={FiInfo} boxSize={3} /></span>
                  </Tooltip>
                </Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredProjects.map((project) => (
                <Tr key={project.id}>
                  <Td>
                    <Text fontWeight="medium">{project.name}</Text>
                    <Text fontSize="sm" color="gray.500">{project.projectCode}</Text>
                  </Td>
                  <Td>{project.client?.name || 'N/A'}</Td>
                  <Td>
                    <Badge colorScheme={
                      project.status === 'ongoing' ? 'green' : 
                      project.status === 'completed' ? 'blue' : 
                      project.status === 'planned' ? 'purple' :
                      project.status === 'cancelled' ? 'red' : 'gray'
                    }>
                      {project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : 'N/A'}
                    </Badge>
                  </Td>
                  <Td>
                    <Box>
                      <Flex align="center" mb={1}>
                        <Text mr={2}>{formatPercentage(project.progress)}</Text>
                        <Badge colorScheme={
                          project.progress < 30 ? 'red' : 
                          project.progress < 70 ? 'orange' : 
                          'green'
                        }>
                          {project.progress < 30 ? 'Early' : 
                           project.progress < 70 ? 'Mid' : 
                           project.progress < 100 ? 'Late' : 'Complete'}
                        </Badge>
                      </Flex>
                      <Progress 
                        value={project.progress} 
                        size="sm" 
                        colorScheme={
                          project.progress < 30 ? 'red' : 
                          project.progress < 70 ? 'orange' : 
                          'green'
                        }
                        borderRadius="md"
                      />
                    </Box>
                  </Td>
                  <Td isNumeric>{formatCurrency(project.totalValue || 0)}</Td>
                  <Td isNumeric>{formatCurrency(project.totalCosts || 0)}</Td>
                  <Td isNumeric>{formatCurrency(project.totalBilled || 0)}</Td>
                  <Td isNumeric>
                    <Text 
                      fontWeight="medium" 
                      color={project.wipValue >= 0 ? "purple.600" : "red.600"}
                    >
                      {formatCurrency(project.wipValue || 0)}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <Badge colorScheme={
                      project.billingPercentage >= 100 ? 'green' :
                      project.billingPercentage >= 75 ? 'teal' :
                      project.billingPercentage >= 50 ? 'blue' :
                      project.billingPercentage >= 25 ? 'orange' : 'red'
                    }>
                      {formatPercentage(project.billingPercentage)}
                    </Badge>
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
                          onClick={() => handleEditWip(project)}
                        >
                          Edit WIP
                        </MenuItem>
                        <MenuItem 
                          icon={<FiArrowRight />}
                          onClick={() => router.push(`/projects/${project.id}`)}
                        >
                          View Project
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>

      {/* WIP Form Modal */}
      <WipForm
        isOpen={isOpen}
        onClose={onClose}
        project={selectedProject}
        onSubmitSuccess={handleFormSuccess}
      />
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedWipPage = () => (
  <ProtectedRoute>
    <WipPage />
  </ProtectedRoute>
);

export default ProtectedWipPage; 