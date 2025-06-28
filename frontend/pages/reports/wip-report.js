import { useState, useEffect } from 'react';
import { useRef, useCallback } from 'react';

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
  AlertTitle,
  AlertDescription,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  HStack,
  Divider,
  IconButton,
  useColorModeValue,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  List,
  ListItem,
  ListIcon,
  UnorderedList,
  Grid,
  GridItem,
  Spinner,
} from '@chakra-ui/react';

import { useRouter } from 'next/router';

import { FiArrowLeft, FiInfo, FiRefreshCw } from 'react-icons/fi';

import { useAuth } from '../../context/AuthContext';

import ProtectedRoute from '../../components/auth/ProtectedRoute';

import LoadingSpinner from '../../components/common/LoadingSpinner';

import ErrorAlert from '../../components/common/ErrorAlert';

import EmptyState from '../../components/common/EmptyState';

import WIPExportButton from '../../components/common/WIPExportButton';

import WipTrendChart from '../../components/wip/WipTrendChart';

import WipAgingChart from '../../components/wip/WipAgingChart';

import WipCashflowProjection from '../../components/wip/WipCashflowProjection';

import WipRiskAnalysis from '../../components/wip/WipRiskAnalysis';

import { format } from 'date-fns';

import api from '../../config/api';

import React from 'react';

import { FaSync } from 'react-icons/fa';

import ProjectsTable from '../../components/projects/ProjectsTable';

const WIPReportPage = () => {
  const router = useRouter();

  const [wipData, setWipData] = useState([]);

  const [wipSummary, setWipSummary] = useState({
    totalProjects: 0,
    projectsWithWip: 0,
    totalCosts: 0,
    totalBilled: 0,
    totalWip: 0,
  });

  const [wipAnalysis, setWipAnalysis] = useState({
    byAge: [],
    byClient: [],
    riskAssessment: [],
    trends: {
      previousMonth: 0,
      currentMonth: 0,
      changePercentage: 0
    }
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [selectedStatus, setSelectedStatus] = useState('ongoing');

  const [isRecalculating, setIsRecalculating] = useState(false);

  const { token, isAuthenticated } = useAuth();

  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');

  const [projects, setProjects] = useState([]);

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  // Calculate WIP analysis data
  const calculateWipAnalysis = async (summary, projects) => {
    const totalWip = summary?.totalWip || 0;
    
    // For WIP by Client - Calculate from projects data
    const byClient = Object.values(projects.reduce((acc, project) => {
      const clientName = project.client?.name || 'Unknown';
      if (!acc[clientName]) {
        acc[clientName] = { name: clientName, wipValue: 0 };
      }
      acc[clientName].wipValue += project.wipValue || 0;
      return acc;
    }, {}))
      .sort((a, b) => b.wipValue - a.wipValue)
      .slice(0, 5)
      .map(client => ({
        ...client,
        percent: totalWip > 0 ? (client.wipValue / totalWip) * 100 : 0
      }));
    
    // For Risk Assessment - Default calculation
    const riskAssessment = [
      { level: 'Low', description: 'Expected to bill within 30 days', amount: totalWip * 0.6 },
      { level: 'Medium', description: 'May face billing delays', amount: totalWip * 0.3 },
      { level: 'High', description: 'At risk of non-payment', amount: totalWip * 0.1 },
    ];
    
    // Default values for byAge and trends
    let byAge = [
      { age: '0-30 days', amount: totalWip * 0.4, percent: 40 },
      { age: '31-60 days', amount: totalWip * 0.3, percent: 30 },
      { age: '61-90 days', amount: totalWip * 0.2, percent: 20 },
      { age: '90+ days', amount: totalWip * 0.1, percent: 10 },
    ];
    
    let trends = {
      previousMonth: totalWip * 0.85,
      currentMonth: totalWip,
      changePercentage: 15
    };
    
    try {
      // Fetch WIP by age data
      const ageResponse = await api.get('/api/wip/analysis/by-age');
      if (ageResponse.data && Array.isArray(ageResponse.data)) {
        byAge = ageResponse.data;
      }
      
      // Fetch WIP trends data
      const trendsResponse = await api.get('/api/wip/analysis/trends');
      if (trendsResponse.data && trendsResponse.data.previousMonth !== undefined) {
        trends = trendsResponse.data;
      }
    } catch (error) {
      console.error('Error fetching WIP analysis data:', error);
      // Use default values defined above
    }
    
    return { byAge, byClient, riskAssessment, trends };
  };

  // Fetch WIP data
  const fetchWipData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch WIP data
      const response = await api.get(`/api/wip`, {
        params: {
          status: selectedStatus
        }
      });
      
      // Fetch WIP summary
      const summaryResponse = await api.get(`/api/wip/summary`);
      
      // Update state with fetched data
      const wipProjectsData = response.data?.data || [];
      setWipData(wipProjectsData);
      
      const summaryData = summaryResponse.data || {
        totalProjects: 0,
        projectsWithWip: 0,
        totalCosts: 0,
        totalBilled: 0,
        totalWip: 0
      };
      setWipSummary(summaryData);
      
      // Calculate WIP analysis
      const analysisData = await calculateWipAnalysis(summaryData, wipProjectsData);
      setWipAnalysis(analysisData);
    } catch (error) {
      console.error('Error fetching WIP data:', error);
      
      setError('Failed to load WIP data. Please try again later.');
      
      // Set default data for demo purposes only in development
      if (process.env.NODE_ENV === 'development') {
        const demoData = [
          {
            id: 1,
            name: 'Boring Project A',
            client: { name: 'PT. Example' },
            status: 'ongoing',
            totalValue: 100000000,
            costs: 60000000,
            billed: 40000000,
            wipValue: 20000000,
            progress: 40
          },
          {
            id: 2,
            name: 'Sondir Project B',
            client: { name: 'CV. Sample' },
            status: 'ongoing',
            totalValue: 75000000,
            costs: 45000000,
            billed: 30000000,
            wipValue: 15000000,
            progress: 40
          }
        ];
        
        setWipData(demoData);
        
        const demoSummary = {
          totalProjects: 2,
          projectsWithWip: 2,
          totalCosts: 105000000,
          totalBilled: 70000000,
          totalWip: 35000000
        };
        
        setWipSummary(demoSummary);
        
        // Calculate analysis data from demo data
        const analysisData = await calculateWipAnalysis(demoSummary, demoData);
        setWipAnalysis(analysisData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWipData();
  }, [selectedStatus]);

  // Handle status change
  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
  };

  // Handle export completion
  const handleExportComplete = (format, file, option) => {
    console.log(`Export completed in ${format} format with option: ${option}`);
    toast({
      title: 'Ekspor Berhasil',
      description: `Laporan WIP telah diexport dalam format ${format.toUpperCase()}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Go back to reports page
  const goBack = () => {
    router.push('/reports');
  };

  // View project details
  const viewProjectDetails = (projectId) => {
    router.push(`/projects/${projectId}`);
  };

  // Recalculate WIP for all projects
  const recalculateAllWip = async () => {
    try {
      setIsRecalculating(true);
      
      const response = await api.post('/api/wip/recalculate-all');
      
      if (response.status === 200) {
        toast({
          title: 'WIP Recalculated',
          description: `Successfully recalculated WIP for ${response.data?.data?.successCount || 'all'} projects.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Refresh WIP data
        fetchWipData();
      }
    } catch (error) {
      console.error('Error recalculating WIP:', error);
      toast({
        title: 'Recalculation Failed',
        description: error.response?.data?.message || 'Failed to recalculate WIP data.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Recalculate WIP for a specific project
  const recalculateProjectWip = async (projectId) => {
    try {
      const response = await api.post(`/api/wip/recalculate/${projectId}`);
      
      if (response.status === 200) {
        toast({
          title: 'WIP Recalculated',
          description: 'Successfully recalculated WIP for the project.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Refresh WIP data
        fetchWipData();
      }
    } catch (error) {
      console.error('Error recalculating project WIP:', error);
      toast({
        title: 'Recalculation Failed',
        description: error.response?.data?.message || 'Failed to recalculate project WIP data.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Fetch WIP projects
  useEffect(() => {
    const fetchWIPProjects = async () => {
      setLoading(true);
      try {
        const response = await api.get('/api/wip/projects');
        setProjects(response.data);
      } catch (error) {
        console.error('Error fetching WIP projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch WIP projects',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchWIPProjects();
  }, [toast]);

  // Calculate summary statistics
  const calculateSummary = () => {
    if (!projects.length) return { totalWIP: 0, totalProjects: 0, averageWIP: 0 };
    
    const totalWIP = projects.reduce((sum, project) => sum + (project.wipValue || 0), 0);
    const totalProjects = projects.length;
    const averageWIP = totalProjects ? totalWIP / totalProjects : 0;
    
    return { totalWIP, totalProjects, averageWIP };
  };

  const summary = calculateSummary();

  const bgColor = useColorModeValue('white', 'gray.700');

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
            Work In Progress (WIP) Report
          </Heading>
          <Tooltip label="WIP represents the value of work completed but not yet billed to clients">
            <IconButton
              icon={<FiInfo />}
              aria-label="WIP Information"
              variant="ghost"
              size="sm"
            />
          </Tooltip>
        </HStack>
        <HStack>
          <Button
            colorScheme="purple"
            size="sm"
            leftIcon={<FaSync />}
            onClick={recalculateAllWip}
            isLoading={isRecalculating}
            loadingText="Recalculating"
          >
            Recalculate All
          </Button>
          <WIPExportButton
            wipProjects={wipData}
            summary={{
              totalProjects: wipSummary?.totalProjects || 0,
              projectsWithWip: wipSummary?.projectsWithWip || 0,
              totalCosts: wipSummary?.totalCosts || 0,
              totalBilled: wipSummary?.totalBilled || 0,
              totalWip: wipSummary?.totalWip || 0
            }}
            status={selectedStatus}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
            onExport={handleExportComplete}
            isDisabled={loading || !!error || wipData.length === 0}
          />
        </HStack>
      </Flex>

      {/* Status Selection */}
      <Box mb={6} p={4} bg={cardBg} borderRadius="md" shadow="sm">
        <Flex direction={{ base: 'column', md: 'row' }} align={{ base: 'flex-start', md: 'center' }}>
          <Text fontWeight="medium" mr={4} mb={{ base: 2, md: 0 }}>
            Project Status:
          </Text>
          <Select
            value={selectedStatus}
            onChange={handleStatusChange}
            maxW={{ base: 'full', md: '200px' }}
          >
            <option value="ongoing">Ongoing</option>
            <option value="all">All Projects</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Flex>
      </Box>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Projects</StatLabel>
          <StatNumber>{wipSummary?.totalProjects || 0}</StatNumber>
          <StatHelpText>
            Projects with WIP values: {wipSummary?.projectsWithWip || 0}
          </StatHelpText>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Costs</StatLabel>
          <StatNumber color="red.500">{formatCurrency(wipSummary?.totalCosts)}</StatNumber>
          <StatHelpText>
            Costs incurred to date
          </StatHelpText>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Billed</StatLabel>
          <StatNumber color="blue.500">{formatCurrency(wipSummary?.totalBilled)}</StatNumber>
          <StatHelpText>
            Amount billed to clients
          </StatHelpText>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm" borderLeft="4px solid" borderLeftColor="purple.500">
          <StatLabel>Total WIP</StatLabel>
          <StatNumber color="purple.500">{formatCurrency(wipSummary?.totalWip)}</StatNumber>
          <StatHelpText>
            Unbilled work value
          </StatHelpText>
        </Stat>
      </SimpleGrid>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <Flex justify="center" align="center" h="300px">
          <Spinner size="xl" color="purple.500" />
        </Flex>
      ) : wipData.length === 0 ? (
        <EmptyState 
          title="No WIP data found" 
          message={`There are no ${selectedStatus === 'all' ? '' : selectedStatus} projects with WIP values.`}
        />
      ) : (
        <Tabs colorScheme="purple" variant="enclosed-colored">
          <TabList>
            <Tab>Projects</Tab>
            <Tab>Analysis</Tab>
            <Tab>Visualization</Tab>
            <Tab>Projections</Tab>
          </TabList>
          
          <TabPanels>
            {/* Projects Tab */}
            <TabPanel p={0} pt={4}>
              <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={6}>
                <GridItem>
                  <Box bg={bgColor} p={4} borderRadius="md" shadow="sm">
                    <Text fontSize="sm" color="gray.500">Total WIP Value</Text>
                    <Text fontSize="2xl" fontWeight="bold">{formatCurrency(summary.totalWIP)}</Text>
                  </Box>
                </GridItem>
                <GridItem>
                  <Box bg={bgColor} p={4} borderRadius="md" shadow="sm">
                    <Text fontSize="sm" color="gray.500">Total Projects</Text>
                    <Text fontSize="2xl" fontWeight="bold">{summary.totalProjects}</Text>
                  </Box>
                </GridItem>
                <GridItem>
                  <Box bg={bgColor} p={4} borderRadius="md" shadow="sm">
                    <Text fontSize="sm" color="gray.500">Average WIP per Project</Text>
                    <Text fontSize="2xl" fontWeight="bold">{formatCurrency(summary.averageWIP)}</Text>
                  </Box>
                </GridItem>
              </Grid>
              
              <ProjectsTable 
                projects={projects} 
                formatCurrency={formatCurrency}
              />
            </TabPanel>
            
            {/* Analysis Tab */}
            <TabPanel p={0} pt={4}>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                <WipAgingChart formatCurrency={formatCurrency} />
                <WipRiskAnalysis formatCurrency={formatCurrency} />
              </SimpleGrid>
            </TabPanel>
            
            {/* Visualization Tab */}
            <TabPanel p={0} pt={4}>
              <Box mb={6}>
                <WipTrendChart formatCurrency={formatCurrency} />
              </Box>
            </TabPanel>
            
            {/* Projections Tab */}
            <TabPanel p={0} pt={4}>
              <Box mb={6}>
                <WipCashflowProjection formatCurrency={formatCurrency} />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedWIPReportPage = () => (
  <ProtectedRoute>
    <WIPReportPage />
  </ProtectedRoute>
);

export default ProtectedWIPReportPage; 

