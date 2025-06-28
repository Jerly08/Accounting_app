import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  useColorModeValue,
  Spinner,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Tooltip,
  HStack,
} from '@chakra-ui/react';
import axios from 'axios';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { FiAlertTriangle, FiInfo } from 'react-icons/fi';

const WipRiskAnalysis = ({ formatCurrency }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [riskData, setRiskData] = useState([]);
  const [riskFactors, setRiskFactors] = useState([]);
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const tableBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  useEffect(() => {
    fetchRiskData();
  }, []);
  
  const fetchRiskData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Make API call to get risk data
      const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
        withCredentials: true,
      });
      
      const response = await api.get('/api/wip/analysis/risk');
      
      if (response.data) {
        if (response.data.riskAssessment && Array.isArray(response.data.riskAssessment)) {
          setRiskData(response.data.riskAssessment);
        } else {
          setRiskData(getSampleRiskData());
        }
        
        if (response.data.riskFactors && Array.isArray(response.data.riskFactors)) {
          setRiskFactors(response.data.riskFactors);
        } else {
          setRiskFactors(getSampleRiskFactors());
        }
      } else {
        setRiskData(getSampleRiskData());
        setRiskFactors(getSampleRiskFactors());
      }
    } catch (error) {
      console.error('Error fetching WIP risk data:', error);
      setError('Failed to load WIP risk analysis data. Please try again later.');
      setRiskData(getSampleRiskData());
      setRiskFactors(getSampleRiskFactors());
    } finally {
      setLoading(false);
    }
  };
  
  const getSampleRiskData = () => {
    return [
      { level: 'Low', description: 'Expected to bill within 30 days', amount: 1500000, percent: 60 },
      { level: 'Medium', description: 'May face billing delays', amount: 750000, percent: 30 },
      { level: 'High', description: 'At risk of non-payment', amount: 250000, percent: 10 },
    ];
  };
  
  const getSampleRiskFactors = () => {
    return [
      { name: 'Age', value: 75, fullMark: 100 },
      { name: 'Client History', value: 60, fullMark: 100 },
      { name: 'Project Complexity', value: 85, fullMark: 100 },
      { name: 'Documentation', value: 50, fullMark: 100 },
      { name: 'Change Orders', value: 70, fullMark: 100 },
    ];
  };
  
  const getRiskBadgeColor = (level) => {
    switch (level.toLowerCase()) {
      case 'low':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'high':
        return 'red';
      default:
        return 'gray';
    }
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
      <Heading size="md" mb={4}>WIP Risk Analysis</Heading>
      
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
          <Box flex="1" pr={{ base: 0, md: 4 }} mb={{ base: 4, md: 0 }}>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Risk Distribution</Text>
            <Table variant="simple" size="sm">
              <Thead bg={tableBg}>
                <Tr>
                  <Th>Risk Level</Th>
                  <Th>Amount</Th>
                  <Th isNumeric>%</Th>
                </Tr>
              </Thead>
              <Tbody>
                {riskData.map((item, index) => (
                  <Tr key={index} borderBottom="1px solid" borderColor={borderColor}>
                    <Td>
                      <HStack>
                        <Badge colorScheme={getRiskBadgeColor(item.level)} px={2} py={0.5}>
                          {item.level}
                        </Badge>
                        <Tooltip label={item.description} placement="top">
                          <Box as="span" cursor="help">
                            <FiInfo size="14px" />
                          </Box>
                        </Tooltip>
                      </HStack>
                    </Td>
                    <Td>{formatCurrency(item.amount)}</Td>
                    <Td isNumeric>{item.percent}%</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            
            <Box mt={4}>
              {riskData.map((item, index) => (
                <Box key={index} mb={2}>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="xs" fontWeight="medium">{item.level}</Text>
                    <Text fontSize="xs">{item.percent}%</Text>
                  </Flex>
                  <Progress 
                    value={item.percent} 
                    colorScheme={getRiskBadgeColor(item.level)}
                    size="sm"
                    borderRadius="full"
                  />
                </Box>
              ))}
            </Box>
          </Box>
          
          <Box flex="1" pl={{ base: 0, md: 4 }}>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Risk Factors Analysis</Text>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={riskFactors}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Risk Score"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </Flex>
      )}
    </Box>
  );
};

export default WipRiskAnalysis; 