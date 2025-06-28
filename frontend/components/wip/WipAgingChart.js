import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  useColorModeValue,
  Spinner,
  List,
  ListItem,
} from '@chakra-ui/react';
import axios from 'axios';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const WipAgingChart = ({ formatCurrency }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agingData, setAgingData] = useState([]);
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  
  // Color scheme for aging categories
  const COLORS = ['#38A169', '#4299E1', '#ECC94B', '#E53E3E'];
  
  useEffect(() => {
    fetchAgingData();
  }, []);
  
  const fetchAgingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Make API call to get aging data
      const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
        withCredentials: true,
      });
      
      const response = await api.get('/api/wip/analysis/by-age');
      
      if (response.data && Array.isArray(response.data)) {
        setAgingData(response.data);
      } else {
        // If no data, use sample data for demonstration
        setAgingData(getSampleData());
      }
    } catch (error) {
      console.error('Error fetching WIP aging data:', error);
      setError('Failed to load WIP aging data. Please try again later.');
      setAgingData(getSampleData());
    } finally {
      setLoading(false);
    }
  };
  
  const getSampleData = () => {
    return [
      { age: '0-30 days', amount: 1500000, percent: 40 },
      { age: '31-60 days', amount: 1000000, percent: 30 },
      { age: '61-90 days', amount: 750000, percent: 20 },
      { age: '90+ days', amount: 350000, percent: 10 },
    ];
  };
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          bg={cardBg}
          p={3}
          borderRadius="md"
          shadow="md"
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontWeight="bold" mb={1}>{data.age}</Text>
          <Text>Amount: {formatCurrency(data.amount)}</Text>
          <Text>Percentage: {data.percent}%</Text>
        </Box>
      );
    }
    return null;
  };
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
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
      <Heading size="md" mb={4}>WIP Aging Analysis</Heading>
      
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
        <Flex direction={{ base: 'column', md: 'row' }} h="300px">
          <Box flex="2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={agingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          
          <Box flex="1" pl={{ base: 0, md: 4 }} mt={{ base: 4, md: 0 }}>
            <List spacing={3}>
              {agingData.map((item, index) => (
                <ListItem key={index} display="flex" alignItems="center">
                  <Box
                    w="12px"
                    h="12px"
                    borderRadius="sm"
                    bg={COLORS[index % COLORS.length]}
                    mr={2}
                  />
                  <Text color={textColor} fontSize="sm">
                    {item.age}: {formatCurrency(item.amount)} ({item.percent}%)
                  </Text>
                </ListItem>
              ))}
            </List>
          </Box>
        </Flex>
      )}
    </Box>
  );
};

export default WipAgingChart; 