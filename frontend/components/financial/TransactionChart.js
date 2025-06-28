import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Select,
  HStack,
  Text,
  Flex,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  useColorModeValue,
  Badge
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const TransactionChart = ({ startDate, endDate }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line');
  const [interval, setInterval] = useState('day');
  const { token } = useAuth();
  
  // Colors
  const incomeColor = useColorModeValue('green.500', 'green.300');
  const expenseColor = useColorModeValue('red.500', 'red.300');
  const netColor = useColorModeValue('blue.500', 'blue.300');
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  // Format date for display
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    
    // Check if it's a week format (YYYY-Wnn)
    if (dateStr.includes('-W')) {
      const [year, week] = dateStr.split('-W');
      return `Week ${week}, ${year}`;
    }
    
    // Check if it's a month format (YYYY-MM)
    if (dateStr.length === 7) {
      const date = new Date(dateStr + '-01');
      return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    }
    
    // Default daily format
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box bg="white" p={3} borderRadius="md" boxShadow="md">
          <Text fontWeight="bold" mb={2}>{formatDateLabel(label)}</Text>
          {payload.map((entry, index) => (
            <Text key={index} color={entry.color}>
              {entry.name}: {formatCurrency(entry.value)}
            </Text>
          ))}
        </Box>
      );
    }
    return null;
  };
  
  // Fetch chart data
  const fetchChartData = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Skip API call and always use fallback data
      console.log('Skipping API call and using fallback data directly');
      useFallbackData();
    } catch (error) {
      console.error('Error generating fallback data:', error);
      setError('Could not generate chart data');
    } finally {
      setLoading(false);
    }
  };
  
  // Fallback data generator for when API fails
  const useFallbackData = () => {
    // Generate some dummy data for the chart
    const today = new Date();
    const dummyData = [];
    
    // Generate data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      let dateStr;
      if (interval === 'month') {
        dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (interval === 'week') {
        const weekNum = Math.ceil((date.getDate() + date.getDay()) / 7);
        dateStr = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      } else {
        dateStr = date.toISOString().split('T')[0];
      }
      
      dummyData.push({
        date: dateStr,
        income: Math.floor(Math.random() * 5000000),
        expense: Math.floor(Math.random() * 3000000),
        net: 0,
      });
    }
    
    // Calculate net values and cumulative values
    let runningIncome = 0;
    let runningExpense = 0;
    
    dummyData.forEach(entry => {
      entry.net = entry.income - entry.expense;
      
      runningIncome += entry.income;
      runningExpense += entry.expense;
      
      entry.cumulativeIncome = runningIncome;
      entry.cumulativeExpense = runningExpense;
      entry.cumulativeNet = runningIncome - runningExpense;
    });
    
    console.log('Using fallback data');
    setChartData(dummyData);
  };
  
  // Fetch data when component mounts or dependencies change
  useEffect(() => {
    fetchChartData();
  }, [token, startDate, endDate, interval]);
  
  // Handle retry
  const handleRetry = () => {
    fetchChartData();
  };
  
  // Render the appropriate chart based on selected type
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <Box textAlign="center" py={10}>
          <Text>No data available for the selected period</Text>
        </Box>
      );
    }
    
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDateLabel}
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              width={80}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="income" 
              stroke={incomeColor} 
              name="Income" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="expense" 
              stroke={expenseColor} 
              name="Expense" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="net" 
              stroke={netColor} 
              name="Net" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDateLabel}
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              width={80}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="income" name="Income" fill={incomeColor} />
            <Bar dataKey="expense" name="Expense" fill={expenseColor} />
            <Bar dataKey="net" name="Net" fill={netColor} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };
  
  return (
    <Box bg="white" p={4} borderRadius="md" shadow="sm">
      <Flex justify="space-between" align="center" mb={4}>
        <Flex align="center">
          <Heading as="h3" size="md" mr={2}>Transaction Trends</Heading>
          <Badge colorScheme="blue" fontSize="0.8em">Sample Data</Badge>
        </Flex>
        <HStack spacing={2}>
          <Select 
            size="sm" 
            value={interval} 
            onChange={(e) => setInterval(e.target.value)}
            width="120px"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </Select>
          <Select 
            size="sm" 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
            width="120px"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
          </Select>
        </HStack>
      </Flex>
      
      {loading ? (
        <Flex justify="center" align="center" height="400px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : error ? (
        <Box>
          <Alert status="info" borderRadius="md" mb={4}>
            <AlertIcon />
            <Box>
              <AlertTitle>Using sample data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
          {renderChart()}
        </Box>
      ) : (
        <Box>
          <Alert status="info" borderRadius="md" mb={4} display={chartData.length > 0 ? "flex" : "none"}>
            <AlertIcon />
            <Box>
              <AlertTitle>Sample Data</AlertTitle>
              <AlertDescription>
                This chart displays sample data and does not reflect actual transactions.
              </AlertDescription>
            </Box>
          </Alert>
          {renderChart()}
        </Box>
      )}
    </Box>
  );
};

export default TransactionChart; 