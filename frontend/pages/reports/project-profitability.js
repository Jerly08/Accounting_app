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
  Select,
  Text,
  Alert,
  AlertIcon,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  Progress,
  HStack,
  Divider,
  IconButton,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { FiDownload, FiArrowLeft, FiPieChart, FiFilter } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import ExportButton from '../../components/common/ExportButton';

const ProjectProfitabilityPage = () => {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState('all');
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const [summary, setSummary] = useState(null);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  // Calculate profitability metrics
  const calculateProfitability = (project) => {
    // Ensure we have valid numbers
    const totalValue = parseFloat(project.totalValue || 0);
    const totalCosts = project.costs || 0;
    const totalBilled = project.billed || 0;
    
    // For construction projects, profit should be calculated against total project value
    // This follows percentage of completion accounting method
    const profit = totalBilled - totalCosts;
    
    // Profit margin in construction is typically calculated against total value
    // This provides a better view of project health than margin against billings
    const profitMargin = totalValue > 0 ? (profit / totalValue) * 100 : 0;
    
    // For construction/engineering projects, use progress-based completion or billing-based if progress is not available
    const completion = project.progress ? parseFloat(project.progress) : (totalValue > 0 ? (totalBilled / totalValue) * 100 : 0);
    
    return {
      profit,
      profitMargin,
      completion,
    };
  };

  // Fetch project profitability data
  const fetchProjectProfitability = async () => {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to view project profitability');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Use the dedicated profitability report endpoint
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profitability/report`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            // You can add filters here if needed
          }
        }
      );
      
      if (response.data.success) {
        // The API now returns pre-calculated profitability metrics
        setProjects(response.data.data);
        
        // Store the summary data for the stats cards
        setSummary(response.data.summary);
      } else {
        setError(response.data.message || 'Failed to load profitability data');
      }
      
    } catch (error) {
      console.error('Error fetching project profitability data:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError('Failed to load project profitability data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchProjectProfitability();
    }
  }, [token, isAuthenticated]);

  // Filter projects based on selection
  const filteredProjects = selectedProject === 'all' 
    ? projects 
    : projects.filter(project => project.id.toString() === selectedProject);

  // Calculate stats for filtered projects (only needed when a specific project is selected)
  const totalValue = selectedProject === 'all' && summary 
    ? summary.totalValue 
    : filteredProjects.reduce((sum, project) => sum + parseFloat(project.totalValue || 0), 0);

  const totalCosts = selectedProject === 'all' && summary
    ? summary.totalCosts
    : filteredProjects.reduce((sum, project) => sum + (project.costs || 0), 0);

  const totalBilled = selectedProject === 'all' && summary
    ? summary.totalBilled
    : filteredProjects.reduce((sum, project) => sum + (project.billed || 0), 0);

  const totalProfit = selectedProject === 'all' && summary
    ? summary.totalProfit
    : filteredProjects.reduce((sum, project) => sum + (project.profit || 0), 0);

  const overallProfitMargin = selectedProject === 'all' && summary
    ? summary.profitMargin
    : (totalValue > 0 ? (totalProfit / totalValue) * 100 : 0);

  // Prepare data for export
  const prepareExportData = () => {
    return filteredProjects.map(project => ({
      'Project Code': project.projectCode || '',
      'Project Name': project.name,
      'Client': project.client?.name || 'N/A',
      'Status': project.status,
      'Start Date': project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A',
      'End Date': project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A',
      'Total Value': project.totalValue,
      'Total Value (Formatted)': formatCurrency(project.totalValue),
      'Total Costs': project.costs,
      'Total Costs (Formatted)': formatCurrency(project.costs),
      'Total Billed': project.billed,
      'Total Billed (Formatted)': formatCurrency(project.billed),
      'Profit': project.profit,
      'Profit (Formatted)': formatCurrency(project.profit),
      'Profit Margin': project.profitMargin,
      'Profit Margin (%)': formatPercentage(project.profitMargin),
      'Progress': project.progress || 0,
      'Progress (%)': formatPercentage(project.progress || 0)
    }));
  };

  // Handle export completion
  const handleExportComplete = (format, file) => {
    console.log(`Project profitability export completed in ${format} format`);
  };

  // Go back to reports page
  const goBack = () => {
    router.push('/reports');
  };

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <HStack>
          <IconButton
            icon={<FiArrowLeft />}
            aria-label="Go back"
            variant="ghost"
            onClick={goBack}
            mr={2}
          />
          <Heading as="h1" size="lg">
            Project Profitability Report
          </Heading>
        </HStack>
        <HStack spacing={2}>
          <ExportButton 
            data={prepareExportData()}
            filename="project_profitability_report"
            onExport={handleExportComplete}
            isDisabled={loading || !!error || filteredProjects.length === 0}
            tooltipText="Export project profitability data to various formats"
            buttonText="Export"
            pdfConfig={{
              orientation: 'landscape',
              title: 'Project Profitability Report'
            }}
          />
          <Button 
            leftIcon={<FiFilter />} 
            colorScheme="blue" 
            variant="outline"
            size="sm"
          >
            Filters
          </Button>
        </HStack>
      </Flex>

      {/* Project Selection */}
      <Box mb={6} p={4} bg={cardBg} borderRadius="md" shadow="sm">
        <Flex direction={{ base: 'column', md: 'row' }} align={{ base: 'flex-start', md: 'center' }}>
          <Text fontWeight="medium" mr={4} mb={{ base: 2, md: 0 }}>
            Select Project:
          </Text>
          <Select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            maxW={{ base: 'full', md: '400px' }}
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id.toString()}>
                {project.name}
              </option>
            ))}
          </Select>
        </Flex>
      </Box>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Project Value</StatLabel>
          <StatNumber>{formatCurrency(totalValue)}</StatNumber>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Costs</StatLabel>
          <StatNumber color="red.500">{formatCurrency(totalCosts)}</StatNumber>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Billed</StatLabel>
          <StatNumber color="blue.500">{formatCurrency(totalBilled)}</StatNumber>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Profit</StatLabel>
          <StatNumber color={totalProfit >= 0 ? "green.500" : "red.500"}>
            {formatCurrency(totalProfit)}
          </StatNumber>
          <StatHelpText>
            <StatArrow type={totalProfit >= 0 ? "increase" : "decrease"} />
            {formatPercentage(overallProfitMargin)} margin
          </StatHelpText>
        </Stat>
      </SimpleGrid>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading project profitability data..." />
      ) : filteredProjects.length === 0 ? (
        <EmptyState 
          title="No projects found" 
          message="There are no projects available for profitability analysis."
        />
      ) : (
        <Box overflowX="auto">
          <Table variant="simple" bg={cardBg} shadow="sm">
            <Thead>
              <Tr>
                <Th>Project</Th>
                <Th>Client</Th>
                <Th>Status</Th>
                <Th isNumeric>Total Value</Th>
                <Th isNumeric>Total Costs</Th>
                <Th isNumeric>Total Billed</Th>
                <Th isNumeric>Profit</Th>
                <Th>Profit Margin</Th>
                <Th>Completion</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredProjects.map((project) => (
                <Tr key={project.id}>
                  <Td fontWeight="medium">{project.name}</Td>
                  <Td>{project.client?.name || 'N/A'}</Td>
                  <Td>
                    <Badge colorScheme={
                      project.status === 'ongoing' ? 'green' : 
                      project.status === 'completed' ? 'blue' : 
                      project.status === 'cancelled' ? 'red' : 'gray'
                    }>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </Td>
                  <Td isNumeric>{formatCurrency(project.totalValue)}</Td>
                  <Td isNumeric color="red.500">{formatCurrency(project.costs)}</Td>
                  <Td isNumeric color="blue.500">{formatCurrency(project.billed)}</Td>
                  <Td 
                    isNumeric 
                    fontWeight="semibold"
                    color={project.profit >= 0 ? "green.500" : "red.500"}
                  >
                    {formatCurrency(project.profit)}
                  </Td>
                  <Td>
                    <Box>
                      <Progress 
                        value={project.profitMargin} 
                        size="sm" 
                        colorScheme={project.profitMargin >= 0 ? "green" : "red"}
                        borderRadius="full"
                      />
                      <Text fontSize="xs" mt={1} textAlign="right">
                        {formatPercentage(project.profitMargin)}
                      </Text>
                    </Box>
                  </Td>
                  <Td>
                    <Box>
                      <Progress 
                        value={project.progress || 0} 
                        size="sm" 
                        colorScheme="blue"
                        borderRadius="full"
                      />
                      <Text fontSize="xs" mt={1} textAlign="right">
                        {formatPercentage(project.progress || 0)}
                      </Text>
                    </Box>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedProjectProfitabilityPage = () => (
  <ProtectedRoute>
    <ProjectProfitabilityPage />
  </ProtectedRoute>
);

export default ProtectedProjectProfitabilityPage; 