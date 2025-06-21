import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Text,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Progress,
  Link,
  Button,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  FiFolder,
  FiDollarSign,
  FiTruck,
  FiUsers,
  FiActivity,
  FiFileText,
  FiArrowRight,
  FiCreditCard,
  FiPieChart,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';

// Status colors for badges
const STATUS_COLORS = {
  'ongoing': 'green',
  'completed': 'blue',
  'cancelled': 'red',
  'unpaid': 'red',
  'partially_paid': 'orange',
  'paid': 'green',
};

const DashboardPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    projects: {
      total: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
      recentProjects: []
    },
    financial: {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      recentTransactions: []
    },
    billings: {
      totalBilled: 0,
      totalPaid: 0,
      totalUnpaid: 0,
      recentBillings: []
    },
    assets: {
      totalAssets: 0,
      totalValue: 0,
      totalDepreciation: 0,
      bookValue: 0
    },
    wip: {
      totalWipValue: 0,
      wipProjects: 0
    },
    clients: {
      totalClients: 0
    }
  });
  
  const { token, isAuthenticated } = useAuth();
  const cardBg = useColorModeValue('white', 'gray.700');

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

  // Fungsi untuk navigasi
  const navigateTo = (path) => {
    router.push(path);
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to view the dashboard');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching dashboard data from API...');
      
      // Fetch dashboard summary data
      const response = await axios.get(
        `/api/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000, // 10 seconds timeout
        }
      );
      
      console.log('Dashboard API response received:', response.status);
      
      // Ensure we have default values if data is missing
      const defaultDashboardData = {
        projects: {
          total: 0,
          active: 0,
          completed: 0,
          cancelled: 0,
          recentProjects: [],
        },
        financial: {
          totalIncome: 0,
          totalExpense: 0,
          netIncome: 0,
          recentTransactions: [],
        },
        billings: {
          totalBilled: 0,
          totalPaid: 0,
          totalUnpaid: 0,
          recentBillings: [],
        },
        assets: {
          totalAssets: 0,
          totalValue: 0,
          totalDepreciation: 0,
          bookValue: 0,
        },
        wip: {
          totalWipValue: 0,
          wipProjects: 0,
        },
        clients: {
          totalClients: 0,
        },
      };
      
      // Merge the response data with default values
      const mergedData = {
        ...defaultDashboardData,
        ...(response.data && response.data.data ? response.data.data : {}),
      };
      
      // Ensure nested objects have default values
      mergedData.projects = { ...defaultDashboardData.projects, ...(mergedData.projects || {}) };
      mergedData.financial = { ...defaultDashboardData.financial, ...(mergedData.financial || {}) };
      mergedData.billings = { ...defaultDashboardData.billings, ...(mergedData.billings || {}) };
      mergedData.assets = { ...defaultDashboardData.assets, ...(mergedData.assets || {}) };
      mergedData.wip = { ...defaultDashboardData.wip, ...(mergedData.wip || {}) };
      mergedData.clients = { ...defaultDashboardData.clients, ...(mergedData.clients || {}) };
      
      // Ensure arrays are always arrays
      if (!Array.isArray(mergedData.projects.recentProjects)) {
        mergedData.projects.recentProjects = [];
      }
      if (!Array.isArray(mergedData.financial.recentTransactions)) {
        mergedData.financial.recentTransactions = [];
      }
      if (!Array.isArray(mergedData.billings.recentBillings)) {
        mergedData.billings.recentBillings = [];
      }
      
      setDashboardData(mergedData);
      setError(null);
      
      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Set default empty dashboard data on error
      setDashboardData({
        projects: { total: 0, active: 0, completed: 0, cancelled: 0, recentProjects: [] },
        financial: { totalIncome: 0, totalExpense: 0, netIncome: 0, recentTransactions: [] },
        billings: { totalBilled: 0, totalPaid: 0, totalUnpaid: 0, recentBillings: [] },
        assets: { totalAssets: 0, totalValue: 0, totalDepreciation: 0, bookValue: 0 },
        wip: { totalWipValue: 0, wipProjects: 0 },
        clients: { totalClients: 0 },
      });
      
      // Detailed error handling
      if (error.code === 'ECONNABORTED') {
        setError('Connection timeout. Server is taking too long to respond.');
      } else if (!error.response) {
        setError('Network error. Please check your connection and try again.');
      } else if (error.response.status === 401) {
        setError('Your session has expired. Please login again.');
      } else if (error.response.status === 500) {
        setError('Server error. The team has been notified.');
      } else {
        setError(`Failed to load dashboard data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchDashboardData();
    }
  }, [token, isAuthenticated]);

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <Box p={4}>
      <Heading as="h1" size="lg" mb={6}>
        Dashboard
      </Heading>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={8}>
        <Stat
          p={4}
          shadow="md"
          borderRadius="lg"
          bg={cardBg}
          borderLeft="4px solid"
          borderLeftColor="teal.400"
        >
          <Flex justify="space-between">
            <Box>
              <StatLabel>Active Projects</StatLabel>
              <StatNumber>{dashboardData.projects.active}</StatNumber>
              <StatHelpText>
                {dashboardData.projects.total} total projects
              </StatHelpText>
            </Box>
            <Box p={2} bg="teal.50" borderRadius="lg" alignSelf="center">
              <Icon as={FiFolder} boxSize="24px" color="teal.400" />
            </Box>
          </Flex>
        </Stat>

        <Stat
          p={4}
          shadow="md"
          borderRadius="lg"
          bg={cardBg}
          borderLeft="4px solid"
          borderLeftColor="green.400"
        >
          <Flex justify="space-between">
            <Box>
              <StatLabel>Total Income</StatLabel>
              <StatNumber>{formatCurrency(dashboardData.financial.totalIncome)}</StatNumber>
              <StatHelpText>
                <StatArrow type={dashboardData.financial.netIncome >= 0 ? 'increase' : 'decrease'} />
                {formatCurrency(Math.abs(dashboardData.financial.netIncome))} {dashboardData.financial.netIncome >= 0 ? 'profit' : 'loss'}
              </StatHelpText>
            </Box>
            <Box p={2} bg="green.50" borderRadius="lg" alignSelf="center">
              <Icon as={FiDollarSign} boxSize="24px" color="green.400" />
            </Box>
          </Flex>
        </Stat>

        <Stat
          p={4}
          shadow="md"
          borderRadius="lg"
          bg={cardBg}
          borderLeft="4px solid"
          borderLeftColor="blue.400"
        >
          <Flex justify="space-between">
            <Box>
              <StatLabel>Unpaid Billings</StatLabel>
              <StatNumber>{formatCurrency(dashboardData.billings.totalUnpaid)}</StatNumber>
              <StatHelpText>
                {formatCurrency(dashboardData.billings.totalBilled)} total billed
              </StatHelpText>
            </Box>
            <Box p={2} bg="blue.50" borderRadius="lg" alignSelf="center">
              <Icon as={FiFileText} boxSize="24px" color="blue.400" />
            </Box>
          </Flex>
        </Stat>

        <Stat
          p={4}
          shadow="md"
          borderRadius="lg"
          bg={cardBg}
          borderLeft="4px solid"
          borderLeftColor="purple.400"
        >
          <Flex justify="space-between">
            <Box>
              <StatLabel>WIP Value</StatLabel>
              <StatNumber>{formatCurrency(dashboardData.wip.totalWipValue)}</StatNumber>
              <StatHelpText>
                {dashboardData.wip.wipProjects} ongoing projects
              </StatHelpText>
            </Box>
            <Box p={2} bg="purple.50" borderRadius="lg" alignSelf="center">
              <Icon as={FiActivity} boxSize="24px" color="purple.400" />
            </Box>
          </Flex>
        </Stat>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} mb={8}>
        {/* Recent Projects */}
        <Box bg={cardBg} p={4} borderRadius="lg" shadow="md">
          <Flex justify="space-between" align="center" mb={4}>
            <Heading as="h2" size="md">
              Recent Projects
            </Heading>
            <Button 
              variant="ghost" 
              rightIcon={<FiArrowRight />} 
              size="sm"
              onClick={() => navigateTo('/projects')}
            >
              View All
            </Button>
          </Flex>
          
          {dashboardData.projects.recentProjects.length === 0 ? (
            <Text>No projects found</Text>
          ) : (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Project</Th>
                  <Th>Client</Th>
                  <Th>Status</Th>
                  <Th isNumeric>Value</Th>
                </Tr>
              </Thead>
              <Tbody>
                {dashboardData.projects.recentProjects.map((project) => (
                  <Tr key={project.id}>
                    <Td>
                      <Link 
                        color="blue.500" 
                        fontWeight="medium"
                        onClick={() => navigateTo(`/projects/${project.id}`)}
                        cursor="pointer"
                      >
                        {project.name}
                      </Link>
                    </Td>
                    <Td>{project.client?.name || 'N/A'}</Td>
                    <Td>
                      <Badge colorScheme={STATUS_COLORS[project.status] || 'gray'}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </Badge>
                    </Td>
                    <Td isNumeric>{formatCurrency(project.totalValue)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        {/* Recent Billings */}
        <Box bg={cardBg} p={4} borderRadius="lg" shadow="md">
          <Flex justify="space-between" align="center" mb={4}>
            <Heading as="h2" size="md">
              Recent Billings
            </Heading>
            <Button 
              variant="ghost" 
              rightIcon={<FiArrowRight />} 
              size="sm"
              onClick={() => navigateTo('/billings')}
            >
              View All
            </Button>
          </Flex>
          
          {dashboardData.billings.recentBillings.length === 0 ? (
            <Text>No billings found</Text>
          ) : (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Project</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {dashboardData.billings.recentBillings.map((billing) => (
                  <Tr key={billing.id}>
                    <Td>{formatDate(billing.billingDate)}</Td>
                    <Td>
                      <Link 
                        color="blue.500"
                        onClick={() => navigateTo(`/projects/${billing.projectId}`)}
                        cursor="pointer"
                      >
                        {billing.project?.name || 'N/A'}
                      </Link>
                    </Td>
                    <Td isNumeric>{formatCurrency(billing.amount)}</Td>
                    <Td>
                      <Badge colorScheme={STATUS_COLORS[billing.status] || 'gray'}>
                        {billing.status.replace('_', ' ').charAt(0).toUpperCase() + billing.status.replace('_', ' ').slice(1)}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
        {/* Recent Transactions */}
        <Box bg={cardBg} p={4} borderRadius="lg" shadow="md">
          <Flex justify="space-between" align="center" mb={4}>
            <Heading as="h2" size="md">
              Recent Transactions
            </Heading>
            <Button 
              variant="ghost" 
              rightIcon={<FiArrowRight />} 
              size="sm"
              onClick={() => navigateTo('/financial/transactions')}
            >
              View All
            </Button>
          </Flex>
          
          {dashboardData.financial.recentTransactions.length === 0 ? (
            <Text>No transactions found</Text>
          ) : (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Type</Th>
                  <Th isNumeric>Amount</Th>
                </Tr>
              </Thead>
              <Tbody>
                {dashboardData.financial.recentTransactions.map((transaction) => (
                  <Tr key={transaction.id}>
                    <Td>{formatDate(transaction.date)}</Td>
                    <Td maxW="200px" isTruncated>{transaction.description}</Td>
                    <Td>
                      <Badge 
                        colorScheme={
                          transaction.type === 'income' ? 'green' : 
                          transaction.type === 'expense' ? 'red' : 'blue'
                        }
                      >
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </Badge>
                    </Td>
                    <Td 
                      isNumeric 
                      color={
                        transaction.type === 'income' ? 'green.500' : 
                        transaction.type === 'expense' ? 'red.500' : 'inherit'
                      }
                    >
                      {formatCurrency(transaction.amount)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        {/* Fixed Assets Summary */}
        <Box bg={cardBg} p={4} borderRadius="lg" shadow="md">
          <Flex justify="space-between" align="center" mb={4}>
            <Heading as="h2" size="md">
              Fixed Assets Summary
            </Heading>
            <Button 
              variant="ghost" 
              rightIcon={<FiArrowRight />} 
              size="sm"
              onClick={() => navigateTo('/financial/fixed-assets')}
            >
              View All
            </Button>
          </Flex>
          
          <SimpleGrid columns={2} spacing={4} mb={4}>
            <Stat>
              <StatLabel>Total Assets</StatLabel>
              <StatNumber>{dashboardData.assets.totalAssets}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Total Value</StatLabel>
              <StatNumber>{formatCurrency(dashboardData.assets.totalValue)}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Accumulated Depreciation</StatLabel>
              <StatNumber color="red.500">
                {formatCurrency(dashboardData.assets.totalDepreciation)}
              </StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Book Value</StatLabel>
              <StatNumber color="blue.500">
                {formatCurrency(dashboardData.assets.bookValue)}
              </StatNumber>
            </Stat>
          </SimpleGrid>
          
          <Box mt={4}>
            <Text fontWeight="medium" mb={2}>Depreciation Progress</Text>
            <Progress 
              value={(dashboardData.assets.totalDepreciation / dashboardData.assets.totalValue) * 100} 
              size="lg" 
              colorScheme="orange" 
              borderRadius="md"
            />
            <Flex justify="space-between" mt={1}>
              <Text fontSize="sm">
                {((dashboardData.assets.totalDepreciation / dashboardData.assets.totalValue) * 100).toFixed(1)}% Depreciated
              </Text>
              <Text fontSize="sm">
                {formatCurrency(dashboardData.assets.bookValue)} Remaining
              </Text>
            </Flex>
          </Box>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedDashboardPage = () => (
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
);

export default ProtectedDashboardPage; 