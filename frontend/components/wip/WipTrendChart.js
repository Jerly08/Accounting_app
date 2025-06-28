import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  useColorModeValue,
  Spinner,
  Select,
  HStack,
} from '@chakra-ui/react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const WipTrendChart = ({ formatCurrency }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [timeRange, setTimeRange] = useState('6months');
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const axisColor = useColorModeValue('gray.500', 'gray.400');
  
  useEffect(() => {
    fetchTrendData();
  }, [timeRange]);
  
  const fetchTrendData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Make API call to get trend data
      const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
        withCredentials: true,
      });
      
      const response = await api.get('/api/wip/trends', {
        params: { timeRange }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setTrendData(response.data);
      } else {
        // If no data, use sample data for demonstration
        setTrendData(getSampleData());
      }
    } catch (error) {
      console.error('Error fetching WIP trend data:', error);
      setError('Failed to load WIP trend data. Please try again later.');
      setTrendData(getSampleData());
    } finally {
      setLoading(false);
    }
  };
  
  const getSampleData = () => {
    // Generate sample data if API fails
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    return Array(6).fill().map((_, index) => {
      const monthIndex = (currentMonth - 5 + index) % 12;
      const monthName = months[monthIndex >= 0 ? monthIndex : monthIndex + 12];
      return {
        month: monthName,
        wipValue: Math.random() * 1000000 + 500000,
        billedValue: Math.random() * 800000 + 400000,
        earnedValue: Math.random() * 1200000 + 600000,
      };
    });
  };
  
  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
  };
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          bg={cardBg}
          p={3}
          borderRadius="md"
          shadow="md"
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontWeight="bold" mb={1}>{label}</Text>
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
  
  return (
    <Box
      bg={cardBg}
      p={4}
      borderRadius="md"
      shadow="sm"
      h="400px"
      position="relative"
    >
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="md">WIP Trend Analysis</Heading>
        <HStack>
          <Text fontSize="sm">Time Range:</Text>
          <Select size="sm" value={timeRange} onChange={handleTimeRangeChange} width="150px">
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </Select>
        </HStack>
      </Flex>
      
      {loading ? (
        <Flex justifyContent="center" alignItems="center" h="300px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : error ? (
        <Flex justifyContent="center" alignItems="center" h="300px" flexDirection="column">
          <Text color="red.500" mb={2}>{error}</Text>
          <Text fontSize="sm">Showing sample data for demonstration</Text>
        </Flex>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={trendData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fill: axisColor }}
            />
            <YAxis
              tick={{ fill: axisColor }}
              tickFormatter={(value) => formatCurrency(value).substring(0, 5)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="wipValue"
              name="WIP Value"
              stroke="#3182CE"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="billedValue"
              name="Billed Value"
              stroke="#38A169"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="earnedValue"
              name="Earned Value"
              stroke="#DD6B20"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
};

export default WipTrendChart; 