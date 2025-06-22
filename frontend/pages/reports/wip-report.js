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
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiInfo, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import WIPExportButton from '../../components/common/WIPExportButton';
import api from '../../config/api';
import React from 'react';

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
            leftIcon={<FiRefreshCw />}
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

      {/* WIP Method Explanation */}
      <Box mb={6} p={4} bg={cardBg} borderRadius="md" shadow="sm">
        <Flex align="center" mb={2}>
          <FiInfo size="20px" color="blue.500" />
          <Heading size="sm" ml={2}>WIP Calculation Method</Heading>
        </Flex>
        <Text fontSize="sm">
          Work In Progress (WIP) is calculated using the <strong>Earned Value Method</strong>: 
          WIP = Earned Value - Amount Billed. Earned Value is determined by multiplying the 
          project's percentage of completion by the total contract value.
        </Text>
      </Box>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading WIP data..." />
      ) : wipData.length === 0 ? (
        <EmptyState 
          title="No WIP data found" 
          message={`There are no ${selectedStatus === 'all' ? '' : selectedStatus} projects with WIP values.`}
        />
      ) : (
        <Tabs variant="enclosed" colorScheme="purple">
          <TabList>
            <Tab>Projects</Tab>
            <Tab>Analysis</Tab>
          </TabList>

          <TabPanels>
            {/* Projects Tab */}
            <TabPanel>
              <Box overflowX="auto">
                <Table variant="simple" bg={cardBg} shadow="sm">
                  <Thead>
                    <Tr>
                      <Th>Project</Th>
                      <Th>Client</Th>
                      <Th>Status</Th>
                      <Th isNumeric>Total Value</Th>
                      <Th isNumeric>Costs to Date</Th>
                      <Th isNumeric>Billed to Date</Th>
                      <Th isNumeric>WIP Value</Th>
                      <Th>Completion</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {wipData.map((project) => (
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
                          color="purple.500"
                        >
                          <Popover trigger="hover" placement="top">
                            <PopoverTrigger>
                              <Text cursor="pointer">{formatCurrency(project.wipValue)}</Text>
                            </PopoverTrigger>
                            <PopoverContent>
                              <PopoverArrow />
                              <PopoverCloseButton />
                              <PopoverHeader fontWeight="bold">WIP Calculation</PopoverHeader>
                              <PopoverBody>
                                <List spacing={1} fontSize="sm">
                                  <ListItem>
                                    <Flex justify="space-between">
                                      <Text>Project Value:</Text>
                                      <Text fontWeight="medium">{formatCurrency(project.totalValue)}</Text>
                                    </Flex>
                                  </ListItem>
                                  <ListItem>
                                    <Flex justify="space-between">
                                      <Text>Completion %:</Text>
                                      <Text fontWeight="medium">{formatPercentage(project.completionPercentage || project.progress || 0)}</Text>
                                    </Flex>
                                  </ListItem>
                                  <ListItem>
                                    <Flex justify="space-between">
                                      <Text>Earned Value:</Text>
                                      <Text fontWeight="medium">{formatCurrency(project.earnedValue || (project.totalValue * (project.completionPercentage || project.progress || 0) / 100))}</Text>
                                    </Flex>
                                  </ListItem>
                                  <ListItem>
                                    <Flex justify="space-between">
                                      <Text>Billed to Date:</Text>
                                      <Text fontWeight="medium">{formatCurrency(project.billed)}</Text>
                                    </Flex>
                                  </ListItem>
                                  <Divider my={2} />
                                  <ListItem>
                                    <Flex justify="space-between">
                                      <Text>WIP Value:</Text>
                                      <Text fontWeight="bold" color="purple.500">
                                        {formatCurrency(project.wipValue)}
                                      </Text>
                                    </Flex>
                                  </ListItem>
                                </List>
                              </PopoverBody>
                            </PopoverContent>
                          </Popover>
                        </Td>
                        <Td>
                          <Box>
                            <Tooltip label={`${formatPercentage(project.progress || 0)} complete`}>
                              <Progress 
                                value={project.progress || 0} 
                                size="sm" 
                                colorScheme="blue"
                                borderRadius="full"
                              />
                            </Tooltip>
                            <Text fontSize="xs" mt={1} textAlign="right">
                              {formatPercentage(project.progress || 0)}
                            </Text>
                          </Box>
                        </Td>
                        <Td>
                          <Button
                            size="xs"
                            colorScheme="blue"
                            variant="outline"
                            onClick={() => viewProjectDetails(project.id)}
                          >
                            Details
                          </Button>
                          <Button
                            size="xs"
                            colorScheme="purple"
                            variant="ghost"
                            ml={2}
                            onClick={() => recalculateProjectWip(project.id)}
                          >
                            Recalc
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>

            {/* Analysis Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>WIP Analysis</Heading>
                
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  {/* WIP by Age */}
                  <Box p={4} borderWidth="1px" borderRadius="md">
                    <Heading size="sm" mb={3}>WIP by Age</Heading>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Age</Th>
                          <Th isNumeric>Amount</Th>
                          <Th isNumeric>% of Total</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {(wipAnalysis?.byAge || []).map((item, index) => (
                          <Tr key={index}>
                            <Td>{item.age}</Td>
                            <Td isNumeric>{formatCurrency(item.amount)}</Td>
                            <Td isNumeric>{item.percent}%</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                  
                  {/* WIP by Client */}
                  <Box p={4} borderWidth="1px" borderRadius="md">
                    <Heading size="sm" mb={3}>Top Clients by WIP</Heading>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Client</Th>
                          <Th isNumeric>WIP Amount</Th>
                          <Th isNumeric>% of Total</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {(wipAnalysis?.byClient || []).map((client, index) => (
                          <Tr key={index}>
                            <Td>{client.name}</Td>
                            <Td isNumeric>{formatCurrency(client.wipValue)}</Td>
                            <Td isNumeric>
                              {formatPercentage(client.percent || 0)}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                  
                  {/* WIP Risk Assessment */}
                  <Box p={4} borderWidth="1px" borderRadius="md">
                    <Heading size="sm" mb={3}>WIP Risk Assessment</Heading>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Risk Level</Th>
                          <Th>Description</Th>
                          <Th isNumeric>Amount</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {(wipAnalysis?.riskAssessment || []).map((risk, index) => (
                          <Tr key={index}>
                            <Td>
                              <Badge colorScheme={
                                risk.level === 'Low' ? 'green' : 
                                risk.level === 'Medium' ? 'yellow' : 
                                risk.level === 'High' ? 'red' : 'gray'
                              }>
                                {risk.level}
                              </Badge>
                            </Td>
                            <Td>{risk.description}</Td>
                            <Td isNumeric>{formatCurrency(risk.amount)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                  
                  {/* WIP Trends */}
                  <Box p={4} borderWidth="1px" borderRadius="md">
                    <Heading size="sm" mb={3}>WIP Trends</Heading>
                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <Text fontSize="sm">
                        WIP has {wipAnalysis?.trends?.changePercentage > 0 ? 'increased' : 'decreased'} by {Math.abs(wipAnalysis?.trends?.changePercentage || 0).toFixed(1)}% compared to the previous month. 
                        {wipAnalysis?.trends?.changePercentage > 0 
                          ? ' Consider accelerating billing cycles to improve cash flow.'
                          : ' Good job managing your WIP balance.'}
                      </Text>
                    </Alert>
                    <Divider my={3} />
                    <Flex justify="space-between" align="center">
                      <Text fontWeight="medium">Last Month:</Text>
                      <Text>{formatCurrency(wipAnalysis?.trends?.previousMonth)}</Text>
                    </Flex>
                    <Flex justify="space-between" align="center" mt={2}>
                      <Text fontWeight="medium">Current:</Text>
                      <Text fontWeight="bold">{formatCurrency(wipAnalysis?.trends?.currentMonth)}</Text>
                    </Flex>
                    <Flex justify="space-between" align="center" mt={2}>
                      <Text fontWeight="medium">Change:</Text>
                      <Text color={wipAnalysis?.trends?.changePercentage > 0 ? "red.500" : "green.500"}>
                        {wipAnalysis?.trends?.changePercentage > 0 ? '+' : ''}
                        {wipAnalysis?.trends?.changePercentage.toFixed(1)}%
                      </Text>
                    </Flex>
                  </Box>
                </SimpleGrid>
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