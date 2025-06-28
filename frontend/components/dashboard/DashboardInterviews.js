import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  Divider,
  Badge,
  Button,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Stack,
  Progress,
  Tooltip,
} from '@chakra-ui/react';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiCalendar, 
  FiClock,
  FiAlertCircle,
  FiFolder,
  FiUsers,
  FiPieChart,
  FiActivity,
  FiArrowRight,
  FiInfo
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

// Import chart components with dynamic loading to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const DashboardInterviews = ({ dashboardData }) => {
  const router = useRouter();
  
  // Color scheme
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.100');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const positiveColor = useColorModeValue('green.500', 'green.300');
  const negativeColor = useColorModeValue('red.500', 'red.300');
  const chartBg = useColorModeValue('#FFF', '#2D3748');
  const chartTextColor = useColorModeValue('#333', '#EDF2F7');
  
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
  
  // Format percentage
  const formatPercentage = (value) => {
    return `${value}%`;
  };

  // Navigation function
  const navigateTo = (path) => {
    router.push(path);
  };
  
  // Project status colors
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'ongoing':
        return 'green';
      case 'completed':
        return 'blue';
      case 'cancelled':
        return 'red';
      case 'pending':
        return 'orange';
      default:
        return 'gray';
    }
  };

  // Billing status colors
  const getBillingStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'green';
      case 'unpaid':
        return 'red';
      case 'partially_paid':
        return 'orange';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  };
  
  // Prepare WIP trend chart data if available
  const wipTrendData = {
    series: [
      {
        name: 'WIP Value',
        data: (dashboardData?.wip?.wipTrend || [])
          .map(item => ({ x: formatDate(item.month), y: item.wipValue }))
      }
    ],
    options: {
      chart: {
        type: 'area',
        height: 250,
        toolbar: {
          show: false,
        },
        background: chartBg,
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      colors: ['#805AD5'],
      fill: {
        type: 'gradient',
        gradient: {
          opacityFrom: 0.6,
          opacityTo: 0.1,
        }
      },
      xaxis: {
        type: 'category',
        labels: {
          style: {
            colors: chartTextColor
          },
          rotate: -45,
          rotateAlways: false,
          hideOverlappingLabels: true,
          maxHeight: 50
        },
        tickPlacement: 'on'
      },
      yaxis: {
        labels: {
          formatter: function (value) {
            return formatCurrency(value).split(',')[0];
          },
          style: {
            colors: chartTextColor
          }
        },
      },
      tooltip: {
        x: {
          format: 'MMM yyyy'
        },
        y: {
          formatter: function (value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Dashboard Interviews
      </Heading>
      
      {/* Top Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={8}>
        <Card bg={cardBg} shadow="md" borderRadius="lg">
          <CardHeader pb={0}>
            <Flex align="center" justify="space-between">
              <Heading size="md">Proyek</Heading>
              <Icon as={FiFolder} boxSize={6} color="blue.500" />
            </Flex>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={2} spacing={4}>
              <Stat>
                <StatLabel>Total Proyek</StatLabel>
                <StatNumber>{dashboardData?.projects?.total || 0}</StatNumber>
                <StatHelpText>
                  <Flex align="center">
                    <Text color="green.500" mr={1}>{dashboardData?.projects?.active || 0}</Text>
                    <Text fontSize="sm">aktif</Text>
                  </Flex>
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Selesai</StatLabel>
                <StatNumber>{dashboardData?.projects?.completed || 0}</StatNumber>
                <StatHelpText>
                  <Flex align="center">
                    <Text color="red.500" mr={1}>{dashboardData?.projects?.cancelled || 0}</Text>
                    <Text fontSize="sm">dibatalkan</Text>
                  </Flex>
                </StatHelpText>
              </Stat>
            </SimpleGrid>
          </CardBody>
          <CardFooter pt={0}>
            <Button 
              rightIcon={<FiArrowRight />} 
              colorScheme="blue" 
              variant="ghost" 
              size="sm"
              onClick={() => navigateTo('/projects')}
            >
              Lihat Semua Proyek
            </Button>
          </CardFooter>
        </Card>
        
        <Card bg={cardBg} shadow="md" borderRadius="lg">
          <CardHeader pb={0}>
            <Flex align="center" justify="space-between">
              <Heading size="md">Billing</Heading>
              <Icon as={FiDollarSign} boxSize={6} color="green.500" />
            </Flex>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={2} spacing={4}>
              <Stat>
                <StatLabel>Total Billing</StatLabel>
                <StatNumber>{formatCurrency(dashboardData?.billings?.totalBilled || 0)}</StatNumber>
                <StatHelpText>
                  <Flex align="center">
                    <Text color="green.500" mr={1}>{formatCurrency(dashboardData?.billings?.totalPaid || 0)}</Text>
                    <Text fontSize="sm">dibayar</Text>
                  </Flex>
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Belum Dibayar</StatLabel>
                <StatNumber color="red.500">{formatCurrency(dashboardData?.billings?.totalUnpaid || 0)}</StatNumber>
                <StatHelpText>
                  <Text fontSize="sm">perlu tindakan</Text>
                </StatHelpText>
              </Stat>
            </SimpleGrid>
          </CardBody>
          <CardFooter pt={0}>
            <Button 
              rightIcon={<FiArrowRight />} 
              colorScheme="green" 
              variant="ghost" 
              size="sm"
              onClick={() => navigateTo('/billings')}
            >
              Lihat Semua Billing
            </Button>
          </CardFooter>
        </Card>
        
        <Card bg={cardBg} shadow="md" borderRadius="lg">
          <CardHeader pb={0}>
            <Flex align="center" justify="space-between">
              <Heading size="md">WIP</Heading>
              <Icon as={FiActivity} boxSize={6} color="purple.500" />
            </Flex>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={2} spacing={4}>
              <Stat>
                <StatLabel>Total WIP</StatLabel>
                <StatNumber>{formatCurrency(dashboardData?.wip?.totalWipValue || 0)}</StatNumber>
                <StatHelpText>
                  <Flex align="center">
                    <Text color="purple.500" mr={1}>{dashboardData?.wip?.wipProjects || 0}</Text>
                    <Text fontSize="sm">proyek</Text>
                  </Flex>
                </StatHelpText>
              </Stat>
              <Box>
                <Text fontWeight="medium" mb={1}>Tren WIP</Text>
                {typeof window !== 'undefined' && dashboardData?.wip?.wipTrend?.length > 0 ? (
                  <Box height="80px">
                    <Chart
                      options={wipTrendData.options}
                      series={wipTrendData.series}
                      type="area"
                      height={80}
                    />
                  </Box>
                ) : (
                  <Text fontSize="sm" color="gray.500">Tidak ada data</Text>
                )}
              </Box>
            </SimpleGrid>
          </CardBody>
          <CardFooter pt={0}>
            <Button 
              rightIcon={<FiArrowRight />} 
              colorScheme="purple" 
              variant="ghost" 
              size="sm"
              onClick={() => navigateTo('/financial/wip')}
            >
              Lihat WIP Management
            </Button>
          </CardFooter>
        </Card>
      </SimpleGrid>
      
      {/* Recent Projects */}
      <Card bg={cardBg} shadow="md" borderRadius="lg" mb={8}>
        <CardHeader>
          <Flex justify="space-between" align="center">
            <Heading size="md">Proyek Terbaru</Heading>
            <Button 
              rightIcon={<FiArrowRight />} 
              colorScheme="blue" 
              variant="ghost" 
              size="sm"
              onClick={() => navigateTo('/projects')}
            >
              Lihat Semua
            </Button>
          </Flex>
        </CardHeader>
        <CardBody>
          {dashboardData?.projects?.recentProjects?.length === 0 ? (
            <Text>Tidak ada proyek ditemukan</Text>
          ) : (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Proyek</Th>
                  <Th>Klien</Th>
                  <Th>Nilai</Th>
                  <Th>Progress</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(dashboardData?.projects?.recentProjects || []).map((project) => (
                  <Tr key={project.id}>
                    <Td fontWeight="medium">{project.name}</Td>
                    <Td>{project.client?.name || 'N/A'}</Td>
                    <Td>{formatCurrency(project.totalValue)}</Td>
                    <Td>
                      <Flex align="center">
                        <Progress 
                          value={project.progress * 100} 
                          size="sm" 
                          colorScheme="blue" 
                          flex="1" 
                          mr={2}
                          borderRadius="full"
                        />
                        <Text fontSize="xs">{formatPercentage(project.progress * 100)}</Text>
                      </Flex>
                    </Td>
                    <Td>
                      <Badge colorScheme={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>
      
      {/* Recent Billings */}
      <Card bg={cardBg} shadow="md" borderRadius="lg">
        <CardHeader>
          <Flex justify="space-between" align="center">
            <Heading size="md">Billing Terbaru</Heading>
            <Button 
              rightIcon={<FiArrowRight />} 
              colorScheme="green" 
              variant="ghost" 
              size="sm"
              onClick={() => navigateTo('/billings')}
            >
              Lihat Semua
            </Button>
          </Flex>
        </CardHeader>
        <CardBody>
          {dashboardData?.billings?.recentBillings?.length === 0 ? (
            <Text>Tidak ada billing ditemukan</Text>
          ) : (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Tanggal</Th>
                  <Th>Proyek</Th>
                  <Th>Jumlah</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(dashboardData?.billings?.recentBillings || []).map((billing) => (
                  <Tr key={billing.id}>
                    <Td>{formatDate(billing.billingDate)}</Td>
                    <Td fontWeight="medium">{billing.project?.name || 'N/A'}</Td>
                    <Td>{formatCurrency(billing.amount)}</Td>
                    <Td>
                      <Badge colorScheme={getBillingStatusColor(billing.status)}>
                        {billing.status}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </Box>
  );
};

export default DashboardInterviews; 