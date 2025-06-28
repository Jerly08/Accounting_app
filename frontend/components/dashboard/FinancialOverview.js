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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiCalendar, 
  FiClock,
  FiAlertCircle
} from 'react-icons/fi';
import dynamic from 'next/dynamic';

// Import chart components with dynamic loading to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const FinancialOverview = ({ financialData, wipData }) => {
  const [timeRange, setTimeRange] = useState('6m'); // 6m, 3m, 1m
  
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
      month: 'short',
    }).format(date);
  };
  
  // Filter data based on selected time range
  const filterDataByTimeRange = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    const now = new Date();
    const months = timeRange === '6m' ? 6 : timeRange === '3m' ? 3 : 1;
    const cutoffDate = new Date(now.setMonth(now.getMonth() - months));
    
    return data.filter(item => {
      const itemDate = new Date(item.month);
      return itemDate >= cutoffDate;
    });
  };
  
  // Prepare revenue vs expense chart data
  const revenueExpenseData = {
    series: [
      {
        name: 'Revenue',
        data: (filterDataByTimeRange(financialData?.revenueExpenseTrend || []))
          .map(item => ({ x: formatDate(item.month), y: item.income }))
      },
      {
        name: 'Expenses',
        data: (filterDataByTimeRange(financialData?.revenueExpenseTrend || []))
          .map(item => ({ x: formatDate(item.month), y: item.expense }))
      },
      {
        name: 'Net Income',
        data: (filterDataByTimeRange(financialData?.revenueExpenseTrend || []))
          .map(item => ({ x: formatDate(item.month), y: item.net }))
      }
    ],
    options: {
      chart: {
        type: 'area',
        height: 350,
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
        width: [3, 3, 2],
        dashArray: [0, 0, 5]
      },
      colors: ['#4299E1', '#F56565', '#48BB78'],
      fill: {
        type: 'gradient',
        gradient: {
          opacityFrom: 0.6,
          opacityTo: 0.1,
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: {
          colors: chartTextColor
        }
      },
      xaxis: {
        type: 'category',
        labels: {
          style: {
            colors: chartTextColor
          }
        }
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
  
  // Prepare WIP trend chart data
  const wipTrendData = {
    series: [
      {
        name: 'WIP Value',
        data: (filterDataByTimeRange(wipData?.wipTrend || []))
          .map(item => ({ x: formatDate(item.month), y: item.wipValue }))
      },
      {
        name: 'Earned Value',
        data: (filterDataByTimeRange(wipData?.wipTrend || []))
          .map(item => ({ x: formatDate(item.month), y: item.earnedValue }))
      },
      {
        name: 'Billed Value',
        data: (filterDataByTimeRange(wipData?.wipTrend || []))
          .map(item => ({ x: formatDate(item.month), y: item.billedValue }))
      }
    ],
    options: {
      chart: {
        type: 'line',
        height: 350,
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
        width: [3, 3, 3],
        dashArray: [0, 5, 0]
      },
      colors: ['#805AD5', '#38B2AC', '#F6AD55'],
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: {
          colors: chartTextColor
        }
      },
      xaxis: {
        type: 'category',
        labels: {
          style: {
            colors: chartTextColor
          }
        }
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
  
  // Prepare accounts receivable aging chart data
  const receivablesAgingData = {
    series: [
      financialData?.accountsReceivable?.aging?.current || 0,
      financialData?.accountsReceivable?.aging?.lessThan30 || 0,
      financialData?.accountsReceivable?.aging?.thirtyToSixty || 0,
      financialData?.accountsReceivable?.aging?.sixtyToNinety || 0,
      financialData?.accountsReceivable?.aging?.overNinety || 0
    ],
    options: {
      chart: {
        type: 'donut',
        background: chartBg,
      },
      labels: ['Current', '< 30 days', '30-60 days', '60-90 days', '> 90 days'],
      colors: ['#68D391', '#4299E1', '#F6AD55', '#F6E05E', '#FC8181'],
      legend: {
        position: 'bottom',
        labels: {
          colors: chartTextColor
        }
      },
      tooltip: {
        y: {
          formatter: function (value) {
            return formatCurrency(value);
          }
        }
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Receivables',
                formatter: function (w) {
                  return formatCurrency(w.globals.seriesTotals.reduce((a, b) => a + b, 0));
                }
              }
            }
          }
        }
      }
    }
  };
  
  // Prepare projected cashflow chart
  const projectedCashflowData = {
    series: [{
      name: 'Expected Billing',
      data: (wipData?.projectedCashflow || []).map(item => ({
        x: formatDate(item.projectionDate),
        y: item.expectedBilling,
        fillColor: '#4299E1'
      }))
    }],
    options: {
      chart: {
        type: 'bar',
        height: 350,
        background: chartBg,
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded'
        },
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: (wipData?.projectedCashflow || []).map(item => formatDate(item.projectionDate)),
        labels: {
          style: {
            colors: chartTextColor
          }
        }
      },
      yaxis: {
        title: {
          text: 'Amount (IDR)',
          style: {
            color: chartTextColor
          }
        },
        labels: {
          formatter: function (value) {
            return formatCurrency(value).split(',')[0];
          },
          style: {
            colors: chartTextColor
          }
        }
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: function (value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };
  
  // Calculate net income percentage change
  const calculateNetIncomeChange = () => {
    const trend = financialData?.revenueExpenseTrend || [];
    if (trend.length < 2) return { percentage: 0, isPositive: true };
    
    const lastMonth = trend[trend.length - 1];
    const previousMonth = trend[trend.length - 2];
    
    if (!lastMonth || !previousMonth) return { percentage: 0, isPositive: true };
    
    const lastNet = lastMonth.net;
    const previousNet = previousMonth.net;
    
    if (previousNet === 0) return { percentage: 0, isPositive: lastNet >= 0 };
    
    const change = ((lastNet - previousNet) / Math.abs(previousNet)) * 100;
    return {
      percentage: Math.abs(change).toFixed(1),
      isPositive: change >= 0
    };
  };
  
  const netIncomeChange = calculateNetIncomeChange();
  
  return (
    <Box mb={8}>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="lg" fontWeight="bold" color={textColor}>
          Financial Overview
        </Heading>
        <Flex>
          <Button 
            size="sm" 
            variant={timeRange === '1m' ? 'solid' : 'outline'} 
            onClick={() => setTimeRange('1m')}
            mr={2}
          >
            1M
          </Button>
          <Button 
            size="sm" 
            variant={timeRange === '3m' ? 'solid' : 'outline'} 
            onClick={() => setTimeRange('3m')}
            mr={2}
          >
            3M
          </Button>
          <Button 
            size="sm" 
            variant={timeRange === '6m' ? 'solid' : 'outline'} 
            onClick={() => setTimeRange('6m')}
          >
            6M
          </Button>
        </Flex>
      </Flex>
      
      {/* Key Financial Metrics */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <Box p={4} bg={cardBg} borderRadius="lg" boxShadow="sm" border="1px" borderColor={borderColor}>
          <Flex align="center" mb={2}>
            <Box p={2} bg="blue.50" borderRadius="md" mr={3}>
              <FiDollarSign size={20} color="#4299E1" />
            </Box>
            <Text fontWeight="medium" color="gray.500">Cash Position</Text>
          </Flex>
          <Stat>
            <StatNumber fontSize="2xl">{formatCurrency(financialData?.cashPosition || 0)}</StatNumber>
          </Stat>
        </Box>
        
        <Box p={4} bg={cardBg} borderRadius="lg" boxShadow="sm" border="1px" borderColor={borderColor}>
          <Flex align="center" mb={2}>
            <Box p={2} bg={financialData?.netIncome >= 0 ? "green.50" : "red.50"} borderRadius="md" mr={3}>
              {financialData?.netIncome >= 0 ? 
                <FiTrendingUp size={20} color="#48BB78" /> : 
                <FiTrendingDown size={20} color="#F56565" />
              }
            </Box>
            <Text fontWeight="medium" color="gray.500">Net Income</Text>
          </Flex>
          <Stat>
            <StatNumber fontSize="2xl">{formatCurrency(financialData?.netIncome || 0)}</StatNumber>
            <StatHelpText>
              <StatArrow type={netIncomeChange.isPositive ? 'increase' : 'decrease'} />
              {netIncomeChange.percentage}%
            </StatHelpText>
          </Stat>
        </Box>
        
        <Box p={4} bg={cardBg} borderRadius="lg" boxShadow="sm" border="1px" borderColor={borderColor}>
          <Flex align="center" mb={2}>
            <Box p={2} bg="purple.50" borderRadius="md" mr={3}>
              <FiCalendar size={20} color="#805AD5" />
            </Box>
            <Text fontWeight="medium" color="gray.500">WIP Value</Text>
          </Flex>
          <Stat>
            <StatNumber fontSize="2xl">{formatCurrency(wipData?.totalWipValue || 0)}</StatNumber>
            <StatHelpText>
              {wipData?.wipProjects || 0} active projects
            </StatHelpText>
          </Stat>
        </Box>
        
        <Box p={4} bg={cardBg} borderRadius="lg" boxShadow="sm" border="1px" borderColor={borderColor}>
          <Flex align="center" mb={2}>
            <Box p={2} bg="orange.50" borderRadius="md" mr={3}>
              <FiClock size={20} color="#ED8936" />
            </Box>
            <Text fontWeight="medium" color="gray.500">Accounts Receivable</Text>
          </Flex>
          <Stat>
            <StatNumber fontSize="2xl">{formatCurrency(financialData?.accountsReceivable?.total || 0)}</StatNumber>
            <StatHelpText>
              <Badge colorScheme="red" mr={1}>
                {formatCurrency(financialData?.accountsReceivable?.aging?.overNinety || 0)} overdue
              </Badge>
            </StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>
      
      <Tabs variant="enclosed" colorScheme="blue" mb={6}>
        <TabList>
          <Tab>Revenue vs Expenses</Tab>
          <Tab>WIP Analysis</Tab>
          <Tab>Receivables Aging</Tab>
          <Tab>Projected Cashflow</Tab>
        </TabList>
        
        <TabPanels>
          {/* Revenue vs Expenses Tab */}
          <TabPanel>
            <Box p={4} bg={cardBg} borderRadius="lg" boxShadow="sm" border="1px" borderColor={borderColor}>
              <Heading size="md" mb={4}>Revenue vs Expenses Trend</Heading>
              {financialData?.revenueExpenseTrend && financialData.revenueExpenseTrend.length > 0 ? (
                <Chart 
                  options={revenueExpenseData.options} 
                  series={revenueExpenseData.series} 
                  type="area" 
                  height={350} 
                />
              ) : (
                <Flex justify="center" align="center" h="350px">
                  <Text color="gray.500">No data available for the selected period</Text>
                </Flex>
              )}
            </Box>
          </TabPanel>
          
          {/* WIP Analysis Tab */}
          <TabPanel>
            <Box p={4} bg={cardBg} borderRadius="lg" boxShadow="sm" border="1px" borderColor={borderColor}>
              <Heading size="md" mb={4}>WIP Trend Analysis</Heading>
              {wipData?.wipTrend && wipData.wipTrend.length > 0 ? (
                <Chart 
                  options={wipTrendData.options} 
                  series={wipTrendData.series} 
                  type="line" 
                  height={350} 
                />
              ) : (
                <Flex justify="center" align="center" h="350px">
                  <Text color="gray.500">No WIP trend data available</Text>
                </Flex>
              )}
              
              {/* Top Projects with WIP */}
              <Divider my={4} />
              <Heading size="sm" mb={3}>Top Projects with WIP</Heading>
              
              {wipData?.projectsWithWip && wipData.projectsWithWip.length > 0 ? (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {wipData.projectsWithWip.map((project, index) => (
                    <Box 
                      key={project.id} 
                      p={3} 
                      borderRadius="md" 
                      bg={useColorModeValue('gray.50', 'gray.700')}
                      border="1px"
                      borderColor={borderColor}
                    >
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="medium">{project.name}</Text>
                        <Badge>{project.progress.toFixed(0)}%</Badge>
                      </Flex>
                      <Text fontSize="sm" color="gray.500" mb={2}>
                        {project.client} • {project.projectCode}
                      </Text>
                      <Flex justify="space-between">
                        <Text fontSize="sm">WIP Value:</Text>
                        <Text fontSize="sm" fontWeight="bold">
                          {formatCurrency(project.wipValue)}
                        </Text>
                      </Flex>
                    </Box>
                  ))}
                </SimpleGrid>
              ) : (
                <Text color="gray.500">No projects with WIP data available</Text>
              )}
            </Box>
          </TabPanel>
          
          {/* Receivables Aging Tab */}
          <TabPanel>
            <Box p={4} bg={cardBg} borderRadius="lg" boxShadow="sm" border="1px" borderColor={borderColor}>
              <Heading size="md" mb={4}>Accounts Receivable Aging</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box>
                  {financialData?.accountsReceivable ? (
                    <Chart 
                      options={receivablesAgingData.options} 
                      series={receivablesAgingData.series} 
                      type="donut" 
                      height={350} 
                    />
                  ) : (
                    <Flex justify="center" align="center" h="350px">
                      <Text color="gray.500">No receivables data available</Text>
                    </Flex>
                  )}
                </Box>
                
                <Box>
                  <Heading size="sm" mb={4}>Aging Summary</Heading>
                  
                  <SimpleGrid columns={2} spacing={4}>
                    <Box>
                      <Text color="gray.500" fontSize="sm">Current</Text>
                      <Text fontWeight="bold" fontSize="lg">
                        {formatCurrency(financialData?.accountsReceivable?.aging?.current || 0)}
                      </Text>
                    </Box>
                    
                    <Box>
                      <Text color="gray.500" fontSize="sm">Less than 30 days</Text>
                      <Text fontWeight="bold" fontSize="lg">
                        {formatCurrency(financialData?.accountsReceivable?.aging?.lessThan30 || 0)}
                      </Text>
                    </Box>
                    
                    <Box>
                      <Text color="gray.500" fontSize="sm">30 to 60 days</Text>
                      <Text fontWeight="bold" fontSize="lg">
                        {formatCurrency(financialData?.accountsReceivable?.aging?.thirtyToSixty || 0)}
                      </Text>
                    </Box>
                    
                    <Box>
                      <Text color="gray.500" fontSize="sm">60 to 90 days</Text>
                      <Text fontWeight="bold" fontSize="lg">
                        {formatCurrency(financialData?.accountsReceivable?.aging?.sixtyToNinety || 0)}
                      </Text>
                    </Box>
                    
                    <Box>
                      <Text color="gray.500" fontSize="sm">Over 90 days</Text>
                      <Flex align="center">
                        <Text fontWeight="bold" fontSize="lg" color="red.500">
                          {formatCurrency(financialData?.accountsReceivable?.aging?.overNinety || 0)}
                        </Text>
                        {(financialData?.accountsReceivable?.aging?.overNinety || 0) > 0 && (
                          <Box ml={2} color="red.500">
                            <FiAlertCircle />
                          </Box>
                        )}
                      </Flex>
                    </Box>
                    
                    <Box>
                      <Text color="gray.500" fontSize="sm">Total Receivables</Text>
                      <Text fontWeight="bold" fontSize="lg">
                        {formatCurrency(financialData?.accountsReceivable?.total || 0)}
                      </Text>
                    </Box>
                  </SimpleGrid>
                  
                  {(financialData?.accountsReceivable?.aging?.overNinety || 0) > 0 && (
                    <Box mt={4} p={3} bg="red.50" borderRadius="md">
                      <Flex align="center">
                        <Box color="red.500" mr={2}>
                          <FiAlertCircle />
                        </Box>
                        <Text color="red.700" fontWeight="medium">
                          Action needed: {formatCurrency(financialData?.accountsReceivable?.aging?.overNinety)} overdue for more than 90 days
                        </Text>
                      </Flex>
                    </Box>
                  )}
                </Box>
              </SimpleGrid>
            </Box>
          </TabPanel>
          
          {/* Projected Cashflow Tab */}
          <TabPanel>
            <Box p={4} bg={cardBg} borderRadius="lg" boxShadow="sm" border="1px" borderColor={borderColor}>
              <Heading size="md" mb={4}>Projected Cashflow from WIP</Heading>
              {wipData?.projectedCashflow && wipData.projectedCashflow.length > 0 ? (
                <Chart 
                  options={projectedCashflowData.options} 
                  series={projectedCashflowData.series} 
                  type="bar" 
                  height={350} 
                />
              ) : (
                <Flex justify="center" align="center" h="350px">
                  <Text color="gray.500">No projected cashflow data available</Text>
                </Flex>
              )}
              
              {/* Projected Cashflow Details */}
              {wipData?.projectedCashflow && wipData.projectedCashflow.length > 0 && (
                <>
                  <Divider my={4} />
                  <Heading size="sm" mb={3}>Upcoming Projected Cashflow</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    {wipData.projectedCashflow.slice(0, 6).map((projection, index) => (
                      <Box 
                        key={index} 
                        p={3} 
                        borderRadius="md" 
                        bg={useColorModeValue('gray.50', 'gray.700')}
                        border="1px"
                        borderColor={borderColor}
                      >
                        <Text fontWeight="medium">{projection.projectName}</Text>
                        <Text fontSize="sm" color="gray.500" mb={2}>
                          {new Date(projection.projectionDate).toLocaleDateString('id-ID')}
                        </Text>
                        <Flex justify="space-between">
                          <Text fontSize="sm">Expected Billing:</Text>
                          <Text fontSize="sm" fontWeight="bold">
                            {formatCurrency(projection.expectedBilling)}
                          </Text>
                        </Flex>
                        <Flex justify="space-between" mt={1}>
                          <Text fontSize="sm">Probability:</Text>
                          <Badge colorScheme={projection.probability > 70 ? "green" : projection.probability > 40 ? "yellow" : "red"}>
                            {projection.probability}%
                          </Badge>
                        </Flex>
                      </Box>
                    ))}
                  </SimpleGrid>
                </>
              )}
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default FinancialOverview; 