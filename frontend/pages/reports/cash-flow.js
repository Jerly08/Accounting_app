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
  FormControl,
  FormLabel,
  Stack,
  Skeleton,
  Card,
  CardBody,
  VStack,
  Input,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiFilter } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import CashFlowExportButton from '../../components/common/CashFlowExportButton';
import api from '../../config/api';
import React from 'react';
import moment from 'moment';
import { FaArrowLeft, FaFileExport } from 'react-icons/fa';

const CashFlowPage = () => {
  const router = useRouter();
  const [cashFlowData, setCashFlowData] = useState({
    operating: { activities: [] },
    investing: { activities: [] },
    financing: { activities: [] },
    summary: {
      totalOperating: 0,
      totalInvesting: 0,
      totalFinancing: 0,
      netCashFlow: 0
    },
    period: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');

  // Replace the existing totals state declaration with a useState hook
  const [totals, setTotals] = useState({
    totalOperating: 0,
    totalInvesting: 0,
    totalFinancing: 0,
    netCashFlow: 0
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

  // Fetch cash flow data
  const fetchCashFlowData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching cash flow data for period: ${startDate} to ${endDate}`);
      const response = await api.get('/api/cash-flow', {
        params: {
          startDate: startDate,
          endDate: endDate
        }
      });

      console.log('API Response:', response);

      if (response.status === 200) {
        console.log('Cash flow data:', response.data);
        
        let data;
        // Check if response has the expected structure
        if (response.data && response.data.data) {
          console.log('Setting cash flow data from response.data.data');
          data = response.data.data;
        } else {
          console.log('Setting cash flow data from response.data');
          data = response.data;
        }
        
        // Ensure data has the correct structure
        const safeData = {
          operating: data.operating || { activities: [] },
          investing: data.investing || { activities: [] },
          financing: data.financing || { activities: [] },
          summary: data.summary || {
            totalOperating: 0,
            totalInvesting: 0,
            totalFinancing: 0,
            netCashFlow: 0
          },
          period: data.period || '',
        };
        
        setCashFlowData(safeData);
        setTotals(calculateTotalsFromData(safeData));
      }
    } catch (err) {
      console.error('Error fetching cash flow data:', err);
      setError('Failed to fetch cash flow data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlowData();
  }, [startDate, endDate]);

  // Update the calculateTotals function to return the values instead of using setTotals directly
  const calculateTotalsFromData = (data) => {
    if (!data || !data.summary) {
      return {
        totalOperating: 0,
        totalInvesting: 0,
        totalFinancing: 0,
        netCashFlow: 0
      };
    }
    
    // Safely extract values with defaults
    const totalOperating = data.summary.totalOperating || 0;
    const totalInvesting = data.summary.totalInvesting || 0;
    const totalFinancing = data.summary.totalFinancing || 0;
    const netCashFlow = data.summary.netCashFlow || 0;
    
    return { totalOperating, totalInvesting, totalFinancing, netCashFlow };
  };

  // Handle date change
  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
  };
  
  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
  };

  // Handle export completion
  const handleExportComplete = (format, file, option) => {
    console.log(`Export completed in ${format} format with option: ${option}`);
    // Notifikasi dihapus karena sudah ditangani oleh CashFlowExportButton
  };

  // Go back to reports page
  const goBack = () => {
    router.push('/reports');
  };

  // Render operating activities
  const renderOperatingActivities = () => {
    if (!cashFlowData.operating || !cashFlowData.operating.activities || cashFlowData.operating.activities.length === 0) {
      return (
        <Box p={4} textAlign="center">
          <Text>No operating activities recorded for the selected period.</Text>
        </Box>
      );
    }
    
    return (
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>Date</Th>
            <Th>Description</Th>
            <Th>Account</Th>
            <Th isNumeric>Amount</Th>
          </Tr>
        </Thead>
        <Tbody>
          {cashFlowData.operating.activities.map((activity, index) => (
            <Tr key={`operating-${index}`}>
              <Td>{formatDate(activity.date)}</Td>
              <Td>{activity.description}</Td>
              <Td>{activity.accountName}</Td>
              <Td isNumeric color={activity.amount >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(activity.amount)}
              </Td>
            </Tr>
          ))}
          <Tr fontWeight="bold" bg="gray.50">
            <Td colSpan={3}>Total Operating Activities</Td>
            <Td isNumeric color={totals.totalOperating >= 0 ? 'green.500' : 'red.500'}>
              {formatCurrency(totals.totalOperating)}
            </Td>
          </Tr>
        </Tbody>
      </Table>
    );
  };

  // Render investing activities
  const renderInvestingActivities = () => {
    if (!cashFlowData.investing || !cashFlowData.investing.activities || cashFlowData.investing.activities.length === 0) {
      return (
        <Box p={4} textAlign="center">
          <Text>No investing activities recorded for the selected period.</Text>
        </Box>
      );
    }
    
    return (
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>Date</Th>
            <Th>Description</Th>
            <Th>Account</Th>
            <Th isNumeric>Amount</Th>
          </Tr>
        </Thead>
        <Tbody>
          {cashFlowData.investing.activities.map((activity, index) => (
            <Tr key={`investing-${index}`}>
              <Td>{formatDate(activity.date)}</Td>
              <Td>{activity.description}</Td>
              <Td>{activity.accountName}</Td>
              <Td isNumeric color={activity.amount >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(activity.amount)}
              </Td>
            </Tr>
          ))}
          <Tr fontWeight="bold" bg="gray.50">
            <Td colSpan={3}>Total Investing Activities</Td>
            <Td isNumeric color={totals.totalInvesting >= 0 ? 'green.500' : 'red.500'}>
              {formatCurrency(totals.totalInvesting)}
            </Td>
          </Tr>
        </Tbody>
      </Table>
    );
  };

  // Render financing activities
  const renderFinancingActivities = () => {
    if (!cashFlowData.financing || !cashFlowData.financing.activities || cashFlowData.financing.activities.length === 0) {
      return (
        <Box p={4} textAlign="center">
          <Text>No financing activities recorded for the selected period.</Text>
        </Box>
      );
    }
    
    return (
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>Date</Th>
            <Th>Description</Th>
            <Th>Account</Th>
            <Th isNumeric>Amount</Th>
          </Tr>
        </Thead>
        <Tbody>
          {cashFlowData.financing.activities.map((activity, index) => (
            <Tr key={`financing-${index}`}>
              <Td>{formatDate(activity.date)}</Td>
              <Td>{activity.description}</Td>
              <Td>{activity.accountName}</Td>
              <Td isNumeric color={activity.amount >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(activity.amount)}
              </Td>
            </Tr>
          ))}
          <Tr fontWeight="bold" bg="gray.50">
            <Td colSpan={3}>Total Financing Activities</Td>
            <Td isNumeric color={totals.totalFinancing >= 0 ? 'green.500' : 'red.500'}>
              {formatCurrency(totals.totalFinancing)}
            </Td>
          </Tr>
        </Tbody>
      </Table>
    );
  };

  // Render summary section
  const renderSummary = () => {
    return (
      <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
        <Heading size="md" mb={4}>Cash Flow Summary</Heading>
        <Table variant="simple" size="sm">
          <Tbody>
            <Tr>
              <Td fontWeight="bold">Cash Flow from Operating Activities</Td>
              <Td isNumeric color={totals.totalOperating >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(totals.totalOperating)}
              </Td>
            </Tr>
            <Tr>
              <Td fontWeight="bold">Cash Flow from Investing Activities</Td>
              <Td isNumeric color={totals.totalInvesting >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(totals.totalInvesting)}
              </Td>
            </Tr>
            <Tr>
              <Td fontWeight="bold">Cash Flow from Financing Activities</Td>
              <Td isNumeric color={totals.totalFinancing >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(totals.totalFinancing)}
              </Td>
            </Tr>
            <Tr fontWeight="bold" fontSize="lg">
              <Td>Net Cash Flow</Td>
              <Td isNumeric color={totals.netCashFlow >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(totals.netCashFlow)}
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    );
  };

  // Helper function to format date range for display
  const formatDateRange = (start, end) => {
    return `${moment(start).format('MMM D, YYYY')} - ${moment(end).format('MMM D, YYYY')}`;
  };

  return (
    <Box p={4}>
      <Flex 
        direction={{ base: 'column', md: 'row' }} 
        justify="space-between" 
        align={{ base: 'flex-start', md: 'center' }} 
        mb={6}
      >
        <Flex align="center" mb={{ base: 4, md: 0 }}>
          <IconButton
            icon={<FaArrowLeft />}
            onClick={goBack}
            mr={2}
            aria-label="Back"
            size="md"
            variant="outline"
          />
          <Heading size="lg">Cash Flow Statement</Heading>
        </Flex>
        
        <Flex align="center" wrap="wrap" gap={2}>
          <FormControl maxW="180px">
            <Input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              size="sm"
            />
          </FormControl>
          <Text>to</Text>
          <FormControl maxW="180px">
            <Input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              size="sm"
            />
          </FormControl>
          
          <CashFlowExportButton 
            startDate={startDate}
            endDate={endDate}
            onExportComplete={handleExportComplete}
          />
        </Flex>
      </Flex>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <Stack spacing={4}>
          <Skeleton height="40px" />
          <Skeleton height="200px" />
          <Skeleton height="200px" />
          <Skeleton height="200px" />
        </Stack>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
            <Stat p={4} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md" bg={cardBg}>
              <StatLabel>Operating Cash Flow</StatLabel>
              <StatNumber color={totals.totalOperating >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(totals.totalOperating)}
              </StatNumber>
            </Stat>
            <Stat p={4} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md" bg={cardBg}>
              <StatLabel>Investing Cash Flow</StatLabel>
              <StatNumber color={totals.totalInvesting >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(totals.totalInvesting)}
              </StatNumber>
            </Stat>
            <Stat p={4} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md" bg={cardBg}>
              <StatLabel>Financing Cash Flow</StatLabel>
              <StatNumber color={totals.totalFinancing >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(totals.totalFinancing)}
              </StatNumber>
            </Stat>
            <Stat p={4} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md" bg={cardBg}>
              <StatLabel>Net Cash Flow</StatLabel>
              <StatNumber color={totals.netCashFlow >= 0 ? 'green.500' : 'red.500'}>
                {formatCurrency(totals.netCashFlow)}
              </StatNumber>
              <StatHelpText>
                {totals.netCashFlow >= 0 ? (
                  <StatArrow type="increase" />
                ) : (
                  <StatArrow type="decrease" />
                )}
                Period: {formatDateRange(startDate, endDate)}
              </StatHelpText>
            </Stat>
          </SimpleGrid>

          <Tabs variant="enclosed" colorScheme="blue">
            <TabList>
              <Tab>Operating Activities</Tab>
              <Tab>Investing Activities</Tab>
              <Tab>Financing Activities</Tab>
              <Tab>Summary</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>{renderOperatingActivities()}</TabPanel>
              <TabPanel>{renderInvestingActivities()}</TabPanel>
              <TabPanel>{renderFinancingActivities()}</TabPanel>
              <TabPanel>{renderSummary()}</TabPanel>
            </TabPanels>
          </Tabs>
        </>
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedCashFlowPage = () => (
  <ProtectedRoute>
    <CashFlowPage />
  </ProtectedRoute>
);

export default ProtectedCashFlowPage; 