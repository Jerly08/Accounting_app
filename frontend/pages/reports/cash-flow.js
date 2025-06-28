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
  ButtonGroup,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Code,
  Tooltip,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiFilter, FiCalendar, FiChevronDown, FiInfo } from 'react-icons/fi';
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
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';

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
  const [errorDetails, setErrorDetails] = useState(null);
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

  // Chart colors
  const CHART_COLORS = {
    operating: '#38A169', // green
    investing: '#3182CE', // blue
    financing: '#DD6B20', // orange
    positive: '#38A169', // green
    negative: '#E53E3E', // red
    operatingGradient: ['#38A169', '#9AE6B4'],
    investingGradient: ['#3182CE', '#90CDF4'],
    financingGradient: ['#DD6B20', '#FBD38D'],
  };

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
    setErrorDetails(null);

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
      let errorMessage = 'Failed to fetch cash flow data. Please try again.';
      let details = null;
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = err.response.data?.message || 'Server returned an error response';
        details = {
          status: err.response.status,
          data: err.response.data
        };
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = 'No response received from server. Please check your network connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `Error setting up request: ${err.message}`;
      }
      
      setError(errorMessage);
      setErrorDetails(details);
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

  // Apply quick date filter
  const applyQuickDateFilter = (filter) => {
    const today = new Date();
    let start, end;
    
    switch (filter) {
      case 'today':
        start = end = new Date().toISOString().split('T')[0];
        break;
      case 'yesterday':
        start = end = new Date(today.setDate(today.getDate() - 1)).toISOString().split('T')[0];
        break;
      case 'thisWeek':
        start = new Date(today.setDate(today.getDate() - today.getDay())).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'thisQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'lastYear':
        start = new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
        break;
      default:
        return;
    }
    
    setStartDate(start);
    setEndDate(end);
    
    toast({
      title: "Date range updated",
      description: `Period set to ${formatDateRange(start, end)}`,
      status: "info",
      duration: 3000,
      isClosable: true,
    });
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
    if (!cashFlowData?.operating?.activities?.length) {
      return (
        <Box p={4} bg="white" borderRadius="md" shadow="sm" mb={6}>
          <Heading as="h3" size="md" mb={4}>
            Aktivitas Operasional
          </Heading>
          <Text>Tidak ada aktivitas operasional dalam periode ini.</Text>
        </Box>
      );
    }

    return (
      <Box p={4} bg="white" borderRadius="md" shadow="sm" mb={6}>
        <Heading as="h3" size="md" mb={4}>
          Aktivitas Operasional
        </Heading>
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Tanggal</Th>
              <Th>Deskripsi</Th>
              <Th>Akun</Th>
              <Th>Tipe</Th>
              <Th isNumeric>Jumlah</Th>
            </Tr>
          </Thead>
          <Tbody>
            {cashFlowData.operating.activities.map((item, index) => {
              // Determine if this is an inflow or outflow
              const isInflow = item.amount > 0;
              const displayType = isInflow ? 'DEBIT' : 'CREDIT';
              const displayAmount = Math.abs(item.amount);
              
              return (
                <Tr key={index}>
                  <Td>{formatDate(item.date)}</Td>
                  <Td>{item.description}</Td>
                  <Td>
                    {item.accountCode && (
                      <Tooltip label={item.accountName}>
                        <Badge colorScheme="blue">{item.accountCode}</Badge>
                      </Tooltip>
                    )}
                  </Td>
                  <Td>
                    <Badge colorScheme={isInflow ? 'green' : 'red'}>
                      {displayType}
                    </Badge>
                  </Td>
                  <Td isNumeric>
                    <Text color={isInflow ? 'green.500' : 'red.500'} fontWeight="medium">
                      {isInflow ? '+' : '-'}{formatCurrency(displayAmount)}
                    </Text>
                  </Td>
                </Tr>
              );
            })}
            <Tr fontWeight="bold">
              <Td colSpan={4}>Total Aktivitas Operasional</Td>
              <Td isNumeric>
                <Text color={cashFlowData.operating.total >= 0 ? 'green.500' : 'red.500'}>
                  {cashFlowData.operating.total >= 0 ? '+' : ''}{formatCurrency(cashFlowData.operating.total)}
                </Text>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    );
  };

  // Render investing activities
  const renderInvestingActivities = () => {
    if (!cashFlowData?.investing?.activities?.length) {
      return (
        <Box p={4} bg="white" borderRadius="md" shadow="sm" mb={6}>
          <Heading as="h3" size="md" mb={4}>
            Aktivitas Investasi
          </Heading>
          <Text>Tidak ada aktivitas investasi dalam periode ini.</Text>
        </Box>
      );
    }

    return (
      <Box p={4} bg="white" borderRadius="md" shadow="sm" mb={6}>
        <Heading as="h3" size="md" mb={4}>
          Aktivitas Investasi
        </Heading>
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Tanggal</Th>
              <Th>Deskripsi</Th>
              <Th>Akun</Th>
              <Th>Tipe</Th>
              <Th isNumeric>Jumlah</Th>
            </Tr>
          </Thead>
          <Tbody>
            {cashFlowData.investing.activities.map((item, index) => {
              // Determine if this is an inflow or outflow
              const isInflow = item.amount > 0;
              const displayType = isInflow ? 'DEBIT' : 'CREDIT';
              const displayAmount = Math.abs(item.amount);
              
              return (
                <Tr key={index}>
                  <Td>{formatDate(item.date)}</Td>
                  <Td>{item.description}</Td>
                  <Td>
                    {item.accountCode && (
                      <Tooltip label={item.accountName}>
                        <Badge colorScheme="blue">{item.accountCode}</Badge>
                      </Tooltip>
                    )}
                  </Td>
                  <Td>
                    <Badge colorScheme={isInflow ? 'green' : 'red'}>
                      {displayType}
                    </Badge>
                  </Td>
                  <Td isNumeric>
                    <Text color={isInflow ? 'green.500' : 'red.500'} fontWeight="medium">
                      {isInflow ? '+' : '-'}{formatCurrency(displayAmount)}
                    </Text>
                  </Td>
                </Tr>
              );
            })}
            <Tr fontWeight="bold">
              <Td colSpan={4}>Total Aktivitas Investasi</Td>
              <Td isNumeric>
                <Text color={cashFlowData.investing.total >= 0 ? 'green.500' : 'red.500'}>
                  {cashFlowData.investing.total >= 0 ? '+' : ''}{formatCurrency(cashFlowData.investing.total)}
                </Text>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    );
  };

  // Render financing activities
  const renderFinancingActivities = () => {
    if (!cashFlowData?.financing?.activities?.length) {
      return (
        <Box p={4} bg="white" borderRadius="md" shadow="sm" mb={6}>
          <Heading as="h3" size="md" mb={4}>
            Aktivitas Pendanaan
          </Heading>
          <Text>Tidak ada aktivitas pendanaan dalam periode ini.</Text>
        </Box>
      );
    }

    return (
      <Box p={4} bg="white" borderRadius="md" shadow="sm" mb={6}>
        <Heading as="h3" size="md" mb={4}>
          Aktivitas Pendanaan
        </Heading>
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Tanggal</Th>
              <Th>Deskripsi</Th>
              <Th>Akun</Th>
              <Th>Tipe</Th>
              <Th isNumeric>Jumlah</Th>
            </Tr>
          </Thead>
          <Tbody>
            {cashFlowData.financing.activities.map((item, index) => {
              // Determine if this is an inflow or outflow
              const isInflow = item.amount > 0;
              const displayType = isInflow ? 'DEBIT' : 'CREDIT';
              const displayAmount = Math.abs(item.amount);
              
              return (
                <Tr key={index}>
                  <Td>{formatDate(item.date)}</Td>
                  <Td>{item.description}</Td>
                  <Td>
                    {item.accountCode && (
                      <Tooltip label={item.accountName}>
                        <Badge colorScheme="blue">{item.accountCode}</Badge>
                      </Tooltip>
                    )}
                  </Td>
                  <Td>
                    <Badge colorScheme={isInflow ? 'green' : 'red'}>
                      {displayType}
                    </Badge>
                  </Td>
                  <Td isNumeric>
                    <Text color={isInflow ? 'green.500' : 'red.500'} fontWeight="medium">
                      {isInflow ? '+' : '-'}{formatCurrency(displayAmount)}
                    </Text>
                  </Td>
                </Tr>
              );
            })}
            <Tr fontWeight="bold">
              <Td colSpan={4}>Total Aktivitas Pendanaan</Td>
              <Td isNumeric>
                <Text color={cashFlowData.financing.total >= 0 ? 'green.500' : 'red.500'}>
                  {cashFlowData.financing.total >= 0 ? '+' : ''}{formatCurrency(cashFlowData.financing.total)}
                </Text>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
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
                {totals.totalOperating >= 0 ? '+' : ''}{formatCurrency(totals.totalOperating)}
              </Td>
            </Tr>
            <Tr>
              <Td fontWeight="bold">Cash Flow from Investing Activities</Td>
              <Td isNumeric color={totals.totalInvesting >= 0 ? 'green.500' : 'red.500'}>
                {totals.totalInvesting >= 0 ? '+' : ''}{formatCurrency(totals.totalInvesting)}
              </Td>
            </Tr>
            <Tr>
              <Td fontWeight="bold">Cash Flow from Financing Activities</Td>
              <Td isNumeric color={totals.totalFinancing >= 0 ? 'green.500' : 'red.500'}>
                {totals.totalFinancing >= 0 ? '+' : ''}{formatCurrency(totals.totalFinancing)}
              </Td>
            </Tr>
            <Tr fontWeight="bold" fontSize="lg">
              <Td>Net Cash Flow</Td>
              <Td isNumeric color={totals.netCashFlow >= 0 ? 'green.500' : 'red.500'}>
                {totals.netCashFlow >= 0 ? '+' : ''}{formatCurrency(totals.netCashFlow)}
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    );
  };

  // Render charts
  const renderCharts = () => {
    // Prepare data for charts
    const cashFlowData = [
      { 
        name: 'Operating', 
        value: totals.totalOperating, 
        color: CHART_COLORS.operating,
        gradient: CHART_COLORS.operatingGradient,
        label: 'Operating Activities'
      },
      { 
        name: 'Investing', 
        value: totals.totalInvesting, 
        color: CHART_COLORS.investing,
        gradient: CHART_COLORS.investingGradient,
        label: 'Investing Activities'
      },
      { 
        name: 'Financing', 
        value: totals.totalFinancing, 
        color: CHART_COLORS.financing,
        gradient: CHART_COLORS.financingGradient,
        label: 'Financing Activities'
      },
      { 
        name: 'Net', 
        value: totals.netCashFlow, 
        color: totals.netCashFlow >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative,
        gradient: [
          totals.netCashFlow >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative,
          totals.netCashFlow >= 0 ? '#9AE6B4' : '#FEB2B2'
        ],
        label: 'Net Cash Flow'
      }
    ];
    
    // Custom tooltip formatter for currency
    const currencyTooltipFormatter = (value) => formatCurrency(value);
    
    // Custom bar shape with gradient
    const getBarGradient = (entry, index) => {
      const id = `colorGradient-${entry.name}`;
      const gradientColors = entry.gradient || [entry.color, entry.color];
      
      return (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={gradientColors[0]} stopOpacity={0.8}/>
          <stop offset="95%" stopColor={gradientColors[1]} stopOpacity={0.3}/>
        </linearGradient>
      );
    };

    // Determine if we have any data to show
    const hasData = cashFlowData.some(item => Math.abs(item.value) > 0);
    
    // Custom legend formatter
    const renderLegend = (props) => {
      const { payload } = props;
      
      return (
        <Box display="flex" justifyContent="center" flexWrap="wrap" gap={4} mb={2}>
          {payload.map((entry, index) => (
            <Box 
              key={`legend-${index}`} 
              display="flex" 
              alignItems="center" 
              px={3} 
              py={1} 
              borderRadius="md"
              bg={useColorModeValue('gray.50', 'gray.700')}
              borderLeft={`4px solid ${entry.color}`}
            >
              <Text fontSize="sm" fontWeight="medium">
                {entry.value}: {formatCurrency(cashFlowData[index].value)}
              </Text>
            </Box>
          ))}
        </Box>
      );
    };
    
    return (
      <Box>
        {!hasData ? (
          <Box textAlign="center" p={8} bg={cardBg} borderRadius="md" shadow="sm">
            <Text fontSize="lg" fontWeight="medium" color="gray.500">
              No cash flow data available for the selected period
            </Text>
          </Box>
        ) : (
          <Box p={6} bg={cardBg} borderRadius="md" shadow="sm">
            <Heading size="md" mb={6} textAlign="center">Cash Flow Summary</Heading>
            
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={cashFlowData}
                margin={{ top: 20, right: 30, left: 30, bottom: 40 }}
                barGap={10}
                barSize={60}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <defs>
                  {cashFlowData.map((entry, index) => getBarGradient(entry, index))}
                </defs>
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: '#718096', fontSize: 12 }}
                  tickLine={{ stroke: '#718096' }}
                  axisLine={{ stroke: '#CBD5E0' }}
                  height={60}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  tickFormatter={currencyTooltipFormatter}
                  tick={{ fill: '#718096', fontSize: 12 }}
                  tickLine={{ stroke: '#718096' }}
                  axisLine={{ stroke: '#CBD5E0' }}
                  width={80}
                />
                <RechartsTooltip 
                  formatter={(value, name, props) => {
                    const item = cashFlowData.find(d => d.name === name);
                    return [formatCurrency(value), item?.label || name];
                  }}
                  labelFormatter={() => 'Cash Flow Amount'}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend 
                  content={renderLegend}
                  verticalAlign="top"
                  height={60}
                />
                <Bar 
                  dataKey="value" 
                  name="value" 
                  radius={[6, 6, 0, 0]}
                >
                  {cashFlowData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#colorGradient-${entry.name})`} 
                      stroke={entry.color}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
                {/* Reference line for zero */}
                <ReferenceLine y={0} stroke="#CBD5E0" strokeWidth={1} />
              </BarChart>
            </ResponsiveContainer>
            
            <Box mt={6} p={4} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.700')}>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Cash Flow Analysis:
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontSize="sm">
                    <Badge colorScheme={totals.totalOperating >= 0 ? "green" : "red"} mr={2}>
                      Operating
                    </Badge>
                    {totals.totalOperating >= 0 
                      ? "Positive operating cash flow indicates healthy core business operations." 
                      : "Negative operating cash flow may indicate challenges in core business operations."}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm">
                    <Badge colorScheme={totals.totalInvesting >= 0 ? "green" : "blue"} mr={2}>
                      Investing
                    </Badge>
                    {totals.totalInvesting >= 0 
                      ? "Positive investing cash flow suggests asset sales or investment returns." 
                      : "Negative investing cash flow often indicates capital expenditures for growth."}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm">
                    <Badge colorScheme={totals.totalFinancing >= 0 ? "green" : "orange"} mr={2}>
                      Financing
                    </Badge>
                    {totals.totalFinancing >= 0 
                      ? "Positive financing cash flow indicates capital raising activities." 
                      : "Negative financing cash flow suggests debt repayment or dividends."}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm">
                    <Badge colorScheme={totals.netCashFlow >= 0 ? "green" : "red"} mr={2}>
                      Net Cash Flow
                    </Badge>
                    {totals.netCashFlow >= 0 
                      ? "Positive net cash flow indicates healthy overall liquidity position." 
                      : "Negative net cash flow may indicate potential liquidity challenges."}
                  </Text>
                </Box>
              </SimpleGrid>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  // Helper function to format date range for display
  const formatDateRange = (start, end) => {
    return `${moment(start).format('MMM D, YYYY')} - ${moment(end).format('MMM D, YYYY')}`;
  };

  // Tambahkan komponen informasi Cash Flow setelah filter date
  const renderCashFlowInfo = () => {
    return (
      <Box mb={6} p={4} bg="white" borderRadius="md" shadow="sm">
        <Heading as="h3" size="sm" mb={3}>
          Tentang Laporan Arus Kas
        </Heading>
        <Alert status="info" mb={3} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Laporan Ini Hanya Mencakup Transaksi Kas Aktual</AlertTitle>
            <AlertDescription>
              Laporan arus kas ini hanya mencatat transaksi yang melibatkan akun kas/bank (1101-1105).
            </AlertDescription>
          </Box>
        </Alert>
        <Text mb={2}>
          <strong>Cash Inflow (Positif):</strong> Semua transaksi DEBIT ke akun kas/bank (uang masuk) dicatat sebagai nilai positif (+).
        </Text>
        <Text mb={2}>
          <strong>Cash Outflow (Negatif):</strong> Semua transaksi CREDIT dari akun kas/bank (uang keluar) dicatat sebagai nilai negatif (-).
        </Text>
        <Text mb={2}>
          <strong>Transaksi Non-Kas:</strong> Transaksi yang tidak melibatkan kas/bank secara langsung (seperti piutang, penyusutan, atau pendapatan akrual) tidak tercakup dalam laporan ini.
        </Text>
        <Text mb={2}>
          <strong>Kategori Arus Kas:</strong>
        </Text>
        <Box pl={4}>
          <Text mb={1}>• <strong>Operating:</strong> Aktivitas operasional bisnis sehari-hari</Text>
          <Text mb={1}>• <strong>Investing:</strong> Pembelian atau penjualan aset jangka panjang</Text>
          <Text mb={1}>• <strong>Financing:</strong> Perubahan pada modal dan pinjaman</Text>
        </Box>
        <Alert status="warning" mt={3} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Penting untuk Diperhatikan</AlertTitle>
            <AlertDescription>
              Nilai positif (+) menunjukkan kas masuk (DEBIT), sedangkan nilai negatif (-) menunjukkan kas keluar (CREDIT).
              Tipe transaksi asli (seperti "income", "expense", dll) telah distandarisasi menjadi DEBIT/CREDIT untuk kejelasan.
            </AlertDescription>
          </Box>
        </Alert>
      </Box>
    );
  };

  // Tambahkan fungsi untuk mengakses endpoint debug
  const handleDebugCashFlow = async () => {
    try {
      setDebugLoading(true);
      setDebugError(null);

      const response = await api.get('/api/cash-flow/debug-transactions', {
        params: {
          startDate: startDate,
          endDate: endDate
        }
      });

      if (response.data && response.data.success) {
        setDebugData(response.data.data);
        setShowDebugModal(true);
      } else {
        setDebugError('Failed to fetch debug data');
      }
    } catch (error) {
      console.error('Error fetching debug data:', error);
      setDebugError(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setDebugLoading(false);
    }
  };

  // Tambahkan state untuk debug modal
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState(null);

  // Tambahkan komponen modal untuk menampilkan data debug
  const DebugModal = () => {
    if (!showDebugModal || !debugData) return null;
    
    return (
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(0,0,0,0.7)"
        zIndex="1000"
        p={4}
        overflow="auto"
      >
        <Box
          bg="white"
          borderRadius="md"
          p={4}
          maxWidth="1000px"
          mx="auto"
          my={8}
        >
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md">Cash Flow Debug Data</Heading>
            <Button size="sm" onClick={() => setShowDebugModal(false)}>Close</Button>
          </Flex>
          
          <Box mb={4}>
            <Text fontWeight="bold">Period: {formatDate(debugData.period.startDate)} - {formatDate(debugData.period.endDate)}</Text>
          </Box>
          
          <Box mb={4} p={3} borderWidth="1px" borderRadius="md">
            <Heading size="sm" mb={2}>Summary</Heading>
            <SimpleGrid columns={2} spacing={4}>
              <Stat>
                <StatLabel>Total Cash Inflow</StatLabel>
                <StatNumber color="green.500">{formatCurrency(debugData.summary.totalInflow)}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Total Cash Outflow</StatLabel>
                <StatNumber color="red.500">{formatCurrency(debugData.summary.totalOutflow)}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Net Cash Flow</StatLabel>
                <StatNumber color={debugData.summary.netCashFlow >= 0 ? "green.500" : "red.500"}>
                  {formatCurrency(debugData.summary.netCashFlow)}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Transaction Count</StatLabel>
                <StatNumber>{debugData.summary.count}</StatNumber>
              </Stat>
            </SimpleGrid>
          </Box>
          
          <Box mb={4}>
            <Heading size="sm" mb={2}>Transactions by Account</Heading>
            <Accordion allowMultiple>
              {Object.entries(debugData.transactionsByAccount).map(([accountCode, accountData]) => (
                <AccordionItem key={accountCode}>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Text fontWeight="bold">{accountCode} - {accountData.accountName}</Text>
                    </Box>
                    <Box>
                      <Badge colorScheme="green" mr={2}>
                        In: {formatCurrency(accountData.totalInflow)}
                      </Badge>
                      <Badge colorScheme="red">
                        Out: {formatCurrency(accountData.totalOutflow)}
                      </Badge>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <Table size="sm" variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Date</Th>
                          <Th>Description</Th>
                          <Th>Type</Th>
                          <Th isNumeric>Amount</Th>
                          <Th isNumeric>Cash Flow</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {accountData.transactions.map(tx => (
                          <Tr key={tx.id}>
                            <Td>{formatDate(tx.date)}</Td>
                            <Td>{tx.description}</Td>
                            <Td>
                              <Badge colorScheme={tx.isInflow ? "green" : "red"}>
                                {tx.type}
                              </Badge>
                            </Td>
                            <Td isNumeric>{formatCurrency(tx.originalAmount)}</Td>
                            <Td isNumeric color={tx.cashFlowAmount >= 0 ? "green.500" : "red.500"}>
                              {formatCurrency(tx.cashFlowAmount)}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </Box>
          
          <Box mb={4}>
            <Heading size="sm" mb={2}>All Cash Transactions</Heading>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Account</Th>
                  <Th>Description</Th>
                  <Th>Type</Th>
                  <Th isNumeric>Cash Flow</Th>
                </Tr>
              </Thead>
              <Tbody>
                {debugData.transactions.map(tx => (
                  <Tr key={tx.id}>
                    <Td>{formatDate(tx.date)}</Td>
                    <Td>
                      <Tooltip label={tx.accountName}>
                        <Badge>{tx.accountCode}</Badge>
                      </Tooltip>
                    </Td>
                    <Td>{tx.description}</Td>
                    <Td>
                      <Badge colorScheme={tx.isInflow ? "green" : "red"}>
                        {tx.type}
                      </Badge>
                    </Td>
                    <Td isNumeric color={tx.cashFlowAmount >= 0 ? "green.500" : "red.500"}>
                      {formatCurrency(tx.cashFlowAmount)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Box>
    );
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
        
        <Flex direction={{ base: 'column', md: 'row' }} align="center" gap={3}>
          <HStack spacing={2}>
            <Menu>
              <Tooltip label="Quick date filters">
                <MenuButton as={Button} rightIcon={<FiChevronDown />} size="sm" leftIcon={<FiCalendar />}>
                  Quick Filters
                </MenuButton>
              </Tooltip>
              <MenuList>
                <MenuItem onClick={() => applyQuickDateFilter('today')}>Today</MenuItem>
                <MenuItem onClick={() => applyQuickDateFilter('yesterday')}>Yesterday</MenuItem>
                <MenuItem onClick={() => applyQuickDateFilter('thisWeek')}>This Week</MenuItem>
                <MenuItem onClick={() => applyQuickDateFilter('thisMonth')}>This Month</MenuItem>
                <MenuItem onClick={() => applyQuickDateFilter('lastMonth')}>Last Month</MenuItem>
                <MenuItem onClick={() => applyQuickDateFilter('thisQuarter')}>This Quarter</MenuItem>
                <MenuItem onClick={() => applyQuickDateFilter('thisYear')}>This Year</MenuItem>
                <MenuItem onClick={() => applyQuickDateFilter('lastYear')}>Last Year</MenuItem>
              </MenuList>
            </Menu>
            
            <CashFlowExportButton 
              startDate={startDate}
              endDate={endDate}
              onExportComplete={handleExportComplete}
              cashFlowData={cashFlowData}
              totals={totals}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
            
            <Tooltip label="Debug Cash Flow Transactions">
              <Button
                size="sm"
                leftIcon={<FiInfo />}
                onClick={handleDebugCashFlow}
                isLoading={debugLoading}
                colorScheme="purple"
              >
                Debug
              </Button>
            </Tooltip>
          </HStack>
          
          <HStack spacing={2} mt={{ base: 2, md: 0 }}>
            <FormControl maxW="140px">
              <Input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                size="sm"
              />
            </FormControl>
            <Text>to</Text>
            <FormControl maxW="140px">
              <Input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                size="sm"
              />
            </FormControl>
          </HStack>
        </Flex>
      </Flex>

      {/* Cash Flow Information */}
      {renderCashFlowInfo()}

      {error && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <Text fontWeight="bold">{error}</Text>
            {errorDetails && (
              <Box mt={2} fontSize="sm">
                <Text>Error Details:</Text>
                <Code p={2} mt={1} display="block" whiteSpace="pre" overflowX="auto">
                  {JSON.stringify(errorDetails, null, 2)}
                </Code>
              </Box>
            )}
          </Box>
        </Alert>
      )}

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
                {totals.totalOperating >= 0 ? '+' : ''}{formatCurrency(totals.totalOperating)}
              </StatNumber>
            </Stat>
            <Stat p={4} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md" bg={cardBg}>
              <StatLabel>Investing Cash Flow</StatLabel>
              <StatNumber color={totals.totalInvesting >= 0 ? 'green.500' : 'red.500'}>
                {totals.totalInvesting >= 0 ? '+' : ''}{formatCurrency(totals.totalInvesting)}
              </StatNumber>
            </Stat>
            <Stat p={4} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md" bg={cardBg}>
              <StatLabel>Financing Cash Flow</StatLabel>
              <StatNumber color={totals.totalFinancing >= 0 ? 'green.500' : 'red.500'}>
                {totals.totalFinancing >= 0 ? '+' : ''}{formatCurrency(totals.totalFinancing)}
              </StatNumber>
            </Stat>
            <Stat p={4} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md" bg={cardBg}>
              <StatLabel>Net Cash Flow</StatLabel>
              <StatNumber color={totals.netCashFlow >= 0 ? 'green.500' : 'red.500'}>
                {totals.netCashFlow >= 0 ? '+' : ''}{formatCurrency(totals.netCashFlow)}
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
              <Tab>Charts</Tab>
              <Tab>Operating Activities</Tab>
              <Tab>Investing Activities</Tab>
              <Tab>Financing Activities</Tab>
              <Tab>Summary</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>{renderCharts()}</TabPanel>
              <TabPanel>{renderOperatingActivities()}</TabPanel>
              <TabPanel>{renderInvestingActivities()}</TabPanel>
              <TabPanel>{renderFinancingActivities()}</TabPanel>
              <TabPanel>{renderSummary()}</TabPanel>
            </TabPanels>
          </Tabs>
        </>
      )}

      <DebugModal />
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