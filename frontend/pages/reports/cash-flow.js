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

const CashFlowPage = () => {
  const router = useRouter();
  const [cashFlowData, setCashFlowData] = useState({
    operating: [],
    investing: [],
    financing: [],
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
    try {
      setLoading(true);
      setError(null);
      
      // Fetch accounts
      const accountsResponse = await api.get('/api/accounts');
      
      // Fetch transactions within date range
      const transactionsResponse = await api.get('/api/transactions', {
        params: {
          date_after: startDate,
          date_before: endDate
        }
      });
      
      // Process data to create cash flow report
      const accounts = accountsResponse.data.data || [];
      const transactions = transactionsResponse.data.data || [];
      
      // Define cash account types
      const cashAccounts = accounts.filter(account => 
        account.type === 'asset' && 
        (account.category === 'Cash' || account.category === 'Bank')
      );
      
      // Group transactions by activity type
      const operatingActivities = [];
      const investingActivities = [];
      const financingActivities = [];
      
      // Define account categories for each activity type
      const operatingCategories = ['Revenue', 'Expense', 'Accounts Receivable', 'Accounts Payable', 'Inventory'];
      const investingCategories = ['Fixed Assets', 'Investments', 'Intangible Assets'];
      const financingCategories = ['Loans', 'Equity', 'Dividends'];
      
      // Process cash transactions
      transactions.forEach(transaction => {
        const account = accounts.find(a => a.code === transaction.accountCode);
        if (!account) return;
        
        // Skip non-cash transactions
        const isCashTransaction = cashAccounts.some(cashAccount => 
          transaction.accountCode === cashAccount.code || 
          transaction.relatedAccountCode === cashAccount.code
        );
        
        if (!isCashTransaction) return;
        
        const amount = parseFloat(transaction.amount || 0);
        const isInflow = transaction.type === 'credit';
        const flowAmount = isInflow ? amount : -amount;
        
        const category = account.category || 'Other';
        
        // Determine activity type based on account category
        if (operatingCategories.includes(category)) {
          operatingActivities.push({
            date: transaction.date,
            description: transaction.description,
            account: account.name,
            category,
            amount: flowAmount
          });
        } else if (investingCategories.includes(category)) {
          investingActivities.push({
            date: transaction.date,
            description: transaction.description,
            account: account.name,
            category,
            amount: flowAmount
          });
        } else if (financingCategories.includes(category)) {
          financingActivities.push({
            date: transaction.date,
            description: transaction.description,
            account: account.name,
            category,
            amount: flowAmount
          });
        }
      });
      
      // Group by category and calculate totals
      const groupByCategory = (activities) => {
        return activities.reduce((acc, activity) => {
          const category = activity.category;
          if (!acc[category]) {
            acc[category] = {
              category,
              transactions: [],
              total: 0
            };
          }
          
          acc[category].transactions.push(activity);
          acc[category].total += activity.amount;
          
          return acc;
        }, {});
      };
      
      const groupedOperating = groupByCategory(operatingActivities);
      const groupedInvesting = groupByCategory(investingActivities);
      const groupedFinancing = groupByCategory(financingActivities);
      
      // Update state with processed data
      setCashFlowData({
        operating: Object.values(groupedOperating),
        investing: Object.values(groupedInvesting),
        financing: Object.values(groupedFinancing),
        startDate,
        endDate
      });
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      
      setError('Failed to load cash flow data. Please try again later.');
      
      // Set demo data for preview
      setCashFlowData({
        operating: [
          {
            category: 'Revenue',
            transactions: [
              { description: 'Project payment', account: 'Bank BCA', amount: 50000000 },
              { description: 'Service fee', account: 'Cash', amount: 25000000 }
            ],
            total: 75000000
          },
          {
            category: 'Expense',
            transactions: [
              { description: 'Office rent', account: 'Bank BCA', amount: -10000000 },
              { description: 'Salaries', account: 'Bank BCA', amount: -25000000 }
            ],
            total: -35000000
          }
        ],
        investing: [
          {
            category: 'Fixed Assets',
            transactions: [
              { description: 'Equipment purchase', account: 'Bank BCA', amount: -15000000 }
            ],
            total: -15000000
          }
        ],
        financing: [
          {
            category: 'Loans',
            transactions: [
              { description: 'Loan repayment', account: 'Bank BCA', amount: -5000000 }
            ],
            total: -5000000
          }
        ],
        startDate,
        endDate
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlowData();
  }, [startDate, endDate]);

  // Calculate totals
  const calculateTotals = () => {
    const operatingTotal = cashFlowData.operating.reduce((sum, category) => sum + category.total, 0);
    const investingTotal = cashFlowData.investing.reduce((sum, category) => sum + category.total, 0);
    const financingTotal = cashFlowData.financing.reduce((sum, category) => sum + category.total, 0);
    
    return {
      operatingTotal,
      investingTotal,
      financingTotal,
      netCashFlow: operatingTotal + investingTotal + financingTotal
    };
  };
  
  const totals = calculateTotals();

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
    toast({
      title: 'Export Berhasil',
      description: `Data telah diexport dalam format ${format.toUpperCase()}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Go back to reports page
  const goBack = () => {
    router.push('/reports');
  };

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <HStack>
          <IconButton
            icon={<FiArrowLeft />}
            aria-label="Go back"
            variant="ghost"
            onClick={goBack}
            mr={2}
          />
          <Heading as="h1" size="lg">
            Cash Flow Report
          </Heading>
        </HStack>
        <HStack spacing={2}>
          <CashFlowExportButton 
            cashFlowData={cashFlowData}
            totals={totals}
            startDate={startDate}
            endDate={endDate}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onExport={handleExportComplete}
            isDisabled={loading || !!error || (cashFlowData.operating.length === 0 && cashFlowData.investing.length === 0 && cashFlowData.financing.length === 0)}
          />
          <Button 
            leftIcon={<FiFilter />} 
            colorScheme="blue" 
            variant="outline"
            size="sm"
          >
            Filter
          </Button>
        </HStack>
      </Flex>

      {/* Date Range Selection */}
      <Box mb={6} p={4} bg={cardBg} borderRadius="md" shadow="sm">
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align={{ base: 'flex-start', md: 'center' }}>
          <FormControl maxW={{ base: 'full', md: '200px' }}>
            <FormLabel>Start Date:</FormLabel>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                width: '100%'
              }}
            />
          </FormControl>
          
          <FormControl maxW={{ base: 'full', md: '200px' }}>
            <FormLabel>End Date:</FormLabel>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                width: '100%'
              }}
            />
          </FormControl>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Operating Activities</StatLabel>
          <StatNumber color={totals.operatingTotal >= 0 ? 'green.500' : 'red.500'}>
            {formatCurrency(totals.operatingTotal)}
          </StatNumber>
          <StatHelpText>
            <StatArrow type={totals.operatingTotal >= 0 ? 'increase' : 'decrease'} />
            Main business operations
          </StatHelpText>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Investing Activities</StatLabel>
          <StatNumber color={totals.investingTotal >= 0 ? 'green.500' : 'red.500'}>
            {formatCurrency(totals.investingTotal)}
          </StatNumber>
          <StatHelpText>
            <StatArrow type={totals.investingTotal >= 0 ? 'increase' : 'decrease'} />
            Assets & investments
          </StatHelpText>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Financing Activities</StatLabel>
          <StatNumber color={totals.financingTotal >= 0 ? 'green.500' : 'red.500'}>
            {formatCurrency(totals.financingTotal)}
          </StatNumber>
          <StatHelpText>
            <StatArrow type={totals.financingTotal >= 0 ? 'increase' : 'decrease'} />
            Debt & equity
          </StatHelpText>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm" borderLeft="4px solid" borderLeftColor={totals.netCashFlow >= 0 ? 'green.500' : 'red.500'}>
          <StatLabel>Net Cash Flow</StatLabel>
          <StatNumber color={totals.netCashFlow >= 0 ? 'green.500' : 'red.500'}>
            {formatCurrency(totals.netCashFlow)}
          </StatNumber>
          <StatHelpText>
            <StatArrow type={totals.netCashFlow >= 0 ? 'increase' : 'decrease'} />
            Total change in cash
          </StatHelpText>
        </Stat>
      </SimpleGrid>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading cash flow data..." />
      ) : (
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Operating Activities</Tab>
            <Tab>Investing Activities</Tab>
            <Tab>Financing Activities</Tab>
            <Tab>Summary</Tab>
          </TabList>

          <TabPanels>
            {/* Operating Activities Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>Cash Flow from Operating Activities</Heading>
                {cashFlowData.operating.length === 0 ? (
                  <EmptyState 
                    title="No operating activities" 
                    message="There are no operating activities recorded for the selected period."
                  />
                ) : (
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Category</Th>
                        <Th>Description</Th>
                        <Th isNumeric>Amount</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {cashFlowData.operating.map((category, index) => (
                        <React.Fragment key={`operating-${index}`}>
                          <Tr bg="gray.50" _dark={{ bg: "gray.700" }}>
                            <Td colSpan={2} fontWeight="bold">{category.category}</Td>
                            <Td isNumeric fontWeight="bold">{formatCurrency(category.total)}</Td>
                          </Tr>
                          {category.transactions.map((transaction, tIndex) => (
                            <Tr key={`operating-${index}-${tIndex}`}>
                              <Td></Td>
                              <Td>{transaction.description} ({transaction.account})</Td>
                              <Td isNumeric color={transaction.amount >= 0 ? 'green.500' : 'red.500'}>
                                {formatCurrency(transaction.amount)}
                              </Td>
                            </Tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </Tbody>
                    <Thead>
                      <Tr>
                        <Th colSpan={2}>Total Operating Activities</Th>
                        <Th isNumeric color={totals.operatingTotal >= 0 ? 'green.500' : 'red.500'}>
                          {formatCurrency(totals.operatingTotal)}
                        </Th>
                      </Tr>
                    </Thead>
                  </Table>
                )}
              </Box>
            </TabPanel>

            {/* Investing Activities Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>Cash Flow from Investing Activities</Heading>
                {cashFlowData.investing.length === 0 ? (
                  <EmptyState 
                    title="No investing activities" 
                    message="There are no investing activities recorded for the selected period."
                  />
                ) : (
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Category</Th>
                        <Th>Description</Th>
                        <Th isNumeric>Amount</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {cashFlowData.investing.map((category, index) => (
                        <React.Fragment key={`investing-${index}`}>
                          <Tr bg="gray.50" _dark={{ bg: "gray.700" }}>
                            <Td colSpan={2} fontWeight="bold">{category.category}</Td>
                            <Td isNumeric fontWeight="bold">{formatCurrency(category.total)}</Td>
                          </Tr>
                          {category.transactions.map((transaction, tIndex) => (
                            <Tr key={`investing-${index}-${tIndex}`}>
                              <Td></Td>
                              <Td>{transaction.description} ({transaction.account})</Td>
                              <Td isNumeric color={transaction.amount >= 0 ? 'green.500' : 'red.500'}>
                                {formatCurrency(transaction.amount)}
                              </Td>
                            </Tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </Tbody>
                    <Thead>
                      <Tr>
                        <Th colSpan={2}>Total Investing Activities</Th>
                        <Th isNumeric color={totals.investingTotal >= 0 ? 'green.500' : 'red.500'}>
                          {formatCurrency(totals.investingTotal)}
                        </Th>
                      </Tr>
                    </Thead>
                  </Table>
                )}
              </Box>
            </TabPanel>

            {/* Financing Activities Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>Cash Flow from Financing Activities</Heading>
                {cashFlowData.financing.length === 0 ? (
                  <EmptyState 
                    title="No financing activities" 
                    message="There are no financing activities recorded for the selected period."
                  />
                ) : (
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Category</Th>
                        <Th>Description</Th>
                        <Th isNumeric>Amount</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {cashFlowData.financing.map((category, index) => (
                        <React.Fragment key={`financing-${index}`}>
                          <Tr bg="gray.50" _dark={{ bg: "gray.700" }}>
                            <Td colSpan={2} fontWeight="bold">{category.category}</Td>
                            <Td isNumeric fontWeight="bold">{formatCurrency(category.total)}</Td>
                          </Tr>
                          {category.transactions.map((transaction, tIndex) => (
                            <Tr key={`financing-${index}-${tIndex}`}>
                              <Td></Td>
                              <Td>{transaction.description} ({transaction.account})</Td>
                              <Td isNumeric color={transaction.amount >= 0 ? 'green.500' : 'red.500'}>
                                {formatCurrency(transaction.amount)}
                              </Td>
                            </Tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </Tbody>
                    <Thead>
                      <Tr>
                        <Th colSpan={2}>Total Financing Activities</Th>
                        <Th isNumeric color={totals.financingTotal >= 0 ? 'green.500' : 'red.500'}>
                          {formatCurrency(totals.financingTotal)}
                        </Th>
                      </Tr>
                    </Thead>
                  </Table>
                )}
              </Box>
            </TabPanel>

            {/* Summary Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>Cash Flow Summary</Heading>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Activity Type</Th>
                      <Th isNumeric>Amount</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td fontWeight="medium">Cash Flow from Operating Activities</Td>
                      <Td isNumeric color={totals.operatingTotal >= 0 ? 'green.500' : 'red.500'}>
                        {formatCurrency(totals.operatingTotal)}
                      </Td>
                    </Tr>
                    <Tr>
                      <Td fontWeight="medium">Cash Flow from Investing Activities</Td>
                      <Td isNumeric color={totals.investingTotal >= 0 ? 'green.500' : 'red.500'}>
                        {formatCurrency(totals.investingTotal)}
                      </Td>
                    </Tr>
                    <Tr>
                      <Td fontWeight="medium">Cash Flow from Financing Activities</Td>
                      <Td isNumeric color={totals.financingTotal >= 0 ? 'green.500' : 'red.500'}>
                        {formatCurrency(totals.financingTotal)}
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
                <Divider my={4} />
                <Flex justify="space-between" p={3} bg={totals.netCashFlow >= 0 ? "green.50" : "red.50"} 
                  _dark={{ bg: totals.netCashFlow >= 0 ? "green.900" : "red.900" }} 
                  borderRadius="md">
                  <Text fontWeight="bold">Net Increase (Decrease) in Cash</Text>
                  <Text fontWeight="bold" color={totals.netCashFlow >= 0 ? 'green.500' : 'red.500'}>
                    {formatCurrency(totals.netCashFlow)}
                  </Text>
                </Flex>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
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