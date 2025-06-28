import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  useColorModeValue,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  HStack,
} from '@chakra-ui/react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const WipCashflowProjection = ({ formatCurrency }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectionData, setProjectionData] = useState([]);
  const [viewMode, setViewMode] = useState('chart');
  const [projectionPeriod, setProjectionPeriod] = useState('6months');
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const tableBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  
  useEffect(() => {
    fetchProjectionData();
  }, [projectionPeriod]);
  
  const fetchProjectionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Make API call to get projection data
      const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
        withCredentials: true,
      });
      
      const response = await api.get('/api/wip/projections', {
        params: { period: projectionPeriod }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setProjectionData(response.data);
      } else {
        // If no data, use sample data for demonstration
        setProjectionData(getSampleData());
      }
    } catch (error) {
      console.error('Error fetching WIP projection data:', error);
      setError('Failed to load WIP cashflow projection data. Please try again later.');
      setProjectionData(getSampleData());
    } finally {
      setLoading(false);
    }
  };
  
  const getSampleData = () => {
    // Generate sample data if API fails
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    return Array(6).fill().map((_, index) => {
      const monthIndex = (currentMonth + index) % 12;
      const monthName = months[monthIndex];
      
      return {
        month: monthName,
        expectedBillings: Math.random() * 1200000 + 800000,
        expectedCollections: Math.random() * 1000000 + 700000,
        wipConversion: Math.random() * 40 + 60, // percentage between 60% and 100%
      };
    });
  };
  
  const handleViewModeChange = (e) => {
    setViewMode(e.target.value);
  };
  
  const handlePeriodChange = (e) => {
    setProjectionPeriod(e.target.value);
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
          {payload[0]?.payload?.wipConversion && (
            <Text color="purple.500" fontWeight="medium" mt={1}>
              WIP Conversion: {payload[0].payload.wipConversion.toFixed(1)}%
            </Text>
          )}
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
        <Heading size="md">WIP Cashflow Projection</Heading>
        <HStack spacing={3}>
          <Select size="sm" value={projectionPeriod} onChange={handlePeriodChange} width="140px">
            <option value="3months">Next 3 Months</option>
            <option value="6months">Next 6 Months</option>
            <option value="12months">Next 12 Months</option>
          </Select>
          <Select size="sm" value={viewMode} onChange={handleViewModeChange} width="120px">
            <option value="chart">Chart View</option>
            <option value="table">Table View</option>
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
      ) : viewMode === 'chart' ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={projectionData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => formatCurrency(value).substring(0, 5)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="expectedBillings" name="Expected Billings" fill="#3182CE" />
            <Bar dataKey="expectedCollections" name="Expected Collections" fill="#38A169" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Box overflowX="auto" maxH="300px" overflowY="auto">
          <Table variant="simple" size="sm">
            <Thead bg={tableBg}>
              <Tr>
                <Th>Month</Th>
                <Th isNumeric>Expected Billings</Th>
                <Th isNumeric>Expected Collections</Th>
                <Th isNumeric>WIP Conversion %</Th>
              </Tr>
            </Thead>
            <Tbody>
              {projectionData.map((item, index) => (
                <Tr key={index} borderBottom="1px solid" borderColor={borderColor}>
                  <Td fontWeight="medium">{item.month}</Td>
                  <Td isNumeric color="blue.500">{formatCurrency(item.expectedBillings)}</Td>
                  <Td isNumeric color="green.500">{formatCurrency(item.expectedCollections)}</Td>
                  <Td isNumeric>{item.wipConversion.toFixed(1)}%</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default WipCashflowProjection; 