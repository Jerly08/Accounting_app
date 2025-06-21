import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Progress,
  Icon,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react';
import { 
  FiDollarSign, 
  FiArrowUp, 
  FiArrowDown, 
  FiFileText, 
  FiDownload,
  FiPieChart,
  FiActivity,
  FiCheckCircle
} from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import EmptyState from '../common/EmptyState';

const ProjectReportsTab = ({ projectId }) => {
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value) => {
    if (!value && value !== 0) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  // Fetch project data for reports
  const fetchProjectReportData = async () => {
    if (!projectId || !token || !isAuthenticated) {
      setLoading(false);
      if (!projectId) {
        setError('Project ID is missing');
      } else {
        setError('You must be logged in to view project reports');
      }
      return;
    }

    try {
      setLoading(true);
      
      // Fetch project details
      const projectResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const projectDetails = projectResponse.data.data || projectResponse.data;
      
      // Fetch project costs
      const costsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/costs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const costs = costsResponse.data.data || [];
      
      // Fetch project billings
      const billingsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/billings/project/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const billings = billingsResponse.data.data || [];
      
      // Combine data and calculate summaries
      const totalCosts = costs.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);
      const totalBilled = billings.reduce((sum, billing) => sum + (parseFloat(billing.amount) || 0), 0);
      const totalPaid = billings
        .filter(billing => billing.status === 'paid')
        .reduce((sum, billing) => sum + (parseFloat(billing.amount) || 0), 0);
      
      // Calculate percentages
      const totalValue = parseFloat(projectDetails.totalValue) || 0;
      const percentageCost = totalValue > 0 ? (totalCosts / totalValue) * 100 : 0;
      const percentageBilled = totalValue > 0 ? (totalBilled / totalValue) * 100 : 0;
      const percentagePaid = totalValue > 0 ? (totalPaid / totalValue) * 100 : 0;
      
      // Calculate profit metrics
      const grossProfit = totalBilled - totalCosts;
      const grossProfitMargin = totalBilled > 0 ? (grossProfit / totalBilled) * 100 : 0;
      
      // Calculate cost by category
      const costsByCategory = {};
      costs.forEach(cost => {
        const category = cost.category || 'other';
        if (!costsByCategory[category]) {
          costsByCategory[category] = 0;
        }
        costsByCategory[category] += parseFloat(cost.amount) || 0;
      });
      
      // Format cost categories for display
      const costCategoriesSummary = Object.entries(costsByCategory).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalCosts > 0 ? (amount / totalCosts) * 100 : 0,
      })).sort((a, b) => b.amount - a.amount);
      
      // Combine all data
      setProjectData({
        project: projectDetails,
        costs,
        billings,
        summary: {
          totalCosts,
          totalBilled,
          totalPaid,
          percentageCost,
          percentageBilled,
          percentagePaid,
          grossProfit,
          grossProfitMargin,
          remainingBudget: totalValue - totalCosts,
          budgetUtilization: totalValue > 0 ? (totalCosts / totalValue) * 100 : 0,
        },
        costCategoriesSummary,
      });
      
      setError(null);
    } catch (error) {
      console.error('Error fetching project report data:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError('Failed to load project report data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && token && isAuthenticated) {
      fetchProjectReportData();
    }
  }, [projectId, token, isAuthenticated]);

  // Handle generate report button
  const handleGenerateReport = () => {
    setGeneratingReport(true);
    
    // Placeholder for report generation - in a real app, this would generate a PDF
    setTimeout(() => {
      setGeneratingReport(false);
      toast({
        title: 'Report Generation',
        description: 'This feature is not implemented yet. It would generate a PDF report.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }, 1500);
  };

  if (loading) {
    return <LoadingSpinner text="Loading project reports..." />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!projectData) {
    return (
      <EmptyState
        title="No project data available"
        message="Unable to load project data for reporting."
      />
    );
  }

  const { summary, costCategoriesSummary } = projectData;

  return (
    <Box>
      <Flex 
        justify="space-between" 
        align={{ base: 'start', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        mb={6}
        gap={4}
      >
        <Heading as="h2" size="md">
          Project Financial Summary
        </Heading>
        <Button 
          leftIcon={<FiFileText />} 
          colorScheme="blue" 
          onClick={handleGenerateReport}
          isLoading={generatingReport}
          loadingText="Generating"
        >
          Generate PDF Report
        </Button>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={8}>
        <Stat
          px={4}
          py={3}
          shadow="base"
          borderWidth="1px"
          borderRadius="md"
          bg="white"
        >
          <Flex align="center">
            <Box flex="1">
              <StatLabel>Total Budget</StatLabel>
              <StatNumber>{formatCurrency(projectData.project.totalValue)}</StatNumber>
              <StatHelpText>
                Project contract value
              </StatHelpText>
            </Box>
            <Icon as={FiDollarSign} boxSize={10} color="green.500" opacity={0.8} />
          </Flex>
        </Stat>
        
        <Stat
          px={4}
          py={3}
          shadow="base"
          borderWidth="1px"
          borderRadius="md"
          bg="white"
        >
          <Flex align="center">
            <Box flex="1">
              <StatLabel>Total Costs</StatLabel>
              <StatNumber>{formatCurrency(summary.totalCosts)}</StatNumber>
              <StatHelpText>
                <StatArrow type={summary.budgetUtilization > 100 ? 'increase' : 'decrease'} />
                {formatPercentage(summary.budgetUtilization)} of budget
              </StatHelpText>
            </Box>
            <Icon as={FiArrowDown} boxSize={10} color="red.500" opacity={0.8} />
          </Flex>
        </Stat>
        
        <Stat
          px={4}
          py={3}
          shadow="base"
          borderWidth="1px"
          borderRadius="md"
          bg="white"
        >
          <Flex align="center">
            <Box flex="1">
              <StatLabel>Gross Profit</StatLabel>
              <StatNumber>{formatCurrency(summary.grossProfit)}</StatNumber>
              <StatHelpText>
                <StatArrow type={summary.grossProfitMargin > 0 ? 'increase' : 'decrease'} />
                {formatPercentage(summary.grossProfitMargin)} margin
              </StatHelpText>
            </Box>
            <Icon 
              as={summary.grossProfit >= 0 ? FiArrowUp : FiArrowDown} 
              boxSize={10} 
              color={summary.grossProfit >= 0 ? "green.500" : "red.500"} 
              opacity={0.8} 
            />
          </Flex>
        </Stat>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
        <Box p={4} borderWidth="1px" borderRadius="md" bg="white">
          <Flex align="center" mb={4}>
            <Icon as={FiActivity} mr={2} color="blue.500" />
            <Heading as="h3" size="sm">
              Budget Utilization
            </Heading>
          </Flex>
          
          <VStack spacing={4} align="stretch">
            <Box>
              <Flex justify="space-between" mb={1}>
                <Text fontSize="sm">Costs: {formatCurrency(summary.totalCosts)}</Text>
                <Text fontSize="sm" fontWeight="bold">
                  {formatPercentage(summary.percentageCost)}
                </Text>
              </Flex>
              <Progress 
                value={summary.percentageCost} 
                colorScheme={summary.percentageCost > 100 ? "red" : "blue"} 
                size="sm" 
                borderRadius="full" 
              />
            </Box>
            
            <Box>
              <Flex justify="space-between" mb={1}>
                <Text fontSize="sm">Billed: {formatCurrency(summary.totalBilled)}</Text>
                <Text fontSize="sm" fontWeight="bold">
                  {formatPercentage(summary.percentageBilled)}
                </Text>
              </Flex>
              <Progress 
                value={summary.percentageBilled} 
                colorScheme="green" 
                size="sm" 
                borderRadius="full" 
              />
            </Box>
            
            <Box>
              <Flex justify="space-between" mb={1}>
                <Text fontSize="sm">Paid: {formatCurrency(summary.totalPaid)}</Text>
                <Text fontSize="sm" fontWeight="bold">
                  {formatPercentage(summary.percentagePaid)}
                </Text>
              </Flex>
              <Progress 
                value={summary.percentagePaid} 
                colorScheme="teal" 
                size="sm" 
                borderRadius="full" 
              />
            </Box>
            
            <Divider />
            
            <Flex justify="space-between">
              <Text>Remaining Budget:</Text>
              <Text fontWeight="bold" color={summary.remainingBudget >= 0 ? "green.500" : "red.500"}>
                {formatCurrency(summary.remainingBudget)}
              </Text>
            </Flex>
          </VStack>
        </Box>
        
        <Box p={4} borderWidth="1px" borderRadius="md" bg="white">
          <Flex align="center" mb={4}>
            <Icon as={FiPieChart} mr={2} color="purple.500" />
            <Heading as="h3" size="sm">
              Cost Breakdown
            </Heading>
          </Flex>
          
          {costCategoriesSummary.length > 0 ? (
            <VStack spacing={3} align="stretch">
              {costCategoriesSummary.map(({ category, amount, percentage }) => (
                <Box key={category}>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                    <Text fontSize="sm">
                      {formatCurrency(amount)} ({formatPercentage(percentage)})
                    </Text>
                  </Flex>
                  <Progress 
                    value={percentage} 
                    size="sm" 
                    borderRadius="full"
                    colorScheme={
                      category === 'material' ? 'blue' :
                      category === 'labor' ? 'green' :
                      category === 'equipment' ? 'purple' :
                      category === 'rental' ? 'orange' :
                      category === 'services' ? 'teal' : 'gray'
                    }
                  />
                </Box>
              ))}
            </VStack>
          ) : (
            <Text color="gray.500" textAlign="center" py={4}>
              No cost data available for breakdown
            </Text>
          )}
        </Box>
      </SimpleGrid>

      <Box p={4} borderWidth="1px" borderRadius="md" bg="white" mb={6}>
        <Flex align="center" mb={4}>
          <Icon as={FiCheckCircle} mr={2} color="green.500" />
          <Heading as="h3" size="sm">
            Billing Status
          </Heading>
        </Flex>
        
        {projectData.billings.length > 0 ? (
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Billing Date</Th>
                <Th isNumeric>Amount</Th>
                <Th isNumeric>% of Total</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {projectData.billings.map((billing) => (
                <Tr key={billing.id}>
                  <Td>{new Date(billing.billingDate).toLocaleDateString('id-ID')}</Td>
                  <Td isNumeric>{formatCurrency(billing.amount)}</Td>
                  <Td isNumeric>
                    {projectData.project.totalValue ? 
                      ((billing.amount / projectData.project.totalValue) * 100).toFixed(1) + '%' : 
                      'N/A'
                    }
                  </Td>
                  <Td>
                    <Badge 
                      colorScheme={
                        billing.status === 'paid' ? 'green' :
                        billing.status === 'pending' ? 'orange' :
                        billing.status === 'overdue' ? 'red' : 'gray'
                      }
                    >
                      {billing.status.charAt(0).toUpperCase() + billing.status.slice(1)}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <Text color="gray.500" textAlign="center" py={4}>
            No billing data available
          </Text>
        )}
      </Box>

      <HStack spacing={4} justify="center">
        <Button leftIcon={<FiDownload />} variant="outline" onClick={handleGenerateReport}>
          Export to Excel
        </Button>
        <Button leftIcon={<FiFileText />} variant="outline" onClick={handleGenerateReport}>
          Generate Invoice
        </Button>
      </HStack>
    </Box>
  );
};

export default ProjectReportsTab; 