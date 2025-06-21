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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { FiDownload, FiArrowLeft, FiCalendar, FiFilter } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import ExportButton from '../../components/common/ExportButton';
import api from '../../config/api';

const BalanceSheetPage = () => {
  const router = useRouter();
  const [balanceSheet, setBalanceSheet] = useState({
    assets: [],
    liabilities: [],
    equity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Fetch balance sheet data
  const fetchBalanceSheet = async () => {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to view the balance sheet');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Use the dedicated balance sheet API
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/balance-sheet`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            date: selectedDate
          }
        }
      );
      
      if (response.data.success) {
        setBalanceSheet(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to load balance sheet data');
      }
    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError('Failed to load balance sheet data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchBalanceSheet();
    }
  }, [token, isAuthenticated, selectedDate]);

  // Calculate totals
  const calculateTotals = () => {
    if (!balanceSheet || !balanceSheet.summary) {
      return {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        netIncome: 0,
        totalEquityWithIncome: 0,
        totalLiabilitiesAndEquity: 0,
        isBalanced: true
      };
    }
    
    // Use summary data from the API
    const { 
      totalAssets, 
      totalLiabilities, 
      totalEquity, 
      netIncome, 
      totalEquityWithIncome,
      totalLiabilitiesAndEquity, 
      isBalanced,
      totalNegativeWIP,
      totalContraAssets
    } = balanceSheet.summary;
    
    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      netIncome: netIncome || 0,
      totalNegativeWIP: totalNegativeWIP || 0,
      totalContraAssets: totalContraAssets || 0,
      totalEquityWithIncome: totalEquityWithIncome || (totalEquity + (netIncome || 0)),
      totalLiabilitiesAndEquity: totalLiabilitiesAndEquity || (totalLiabilities + totalEquity + (netIncome || 0)),
      isBalanced
    };
  };
  
  const totals = calculateTotals();

  // Handle date change
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // Prepare data for export
  const prepareExportData = () => {
    // Assets data
    const assetsData = Object.entries(balanceSheet.assets).flatMap(([category, assets]) => 
      assets.map(asset => ({
        Section: 'Assets',
        Category: category,
        AccountCode: asset.code || '',
        AccountName: asset.name,
        Balance: asset.balance || asset.bookValue || asset.wipValue || 0,
        'Balance (Formatted)': formatCurrency(asset.balance || asset.bookValue || asset.wipValue || 0)
      }))
    );
    
    // Liabilities data
    const liabilitiesData = Object.entries(balanceSheet.liabilities).flatMap(([category, liabilities]) => 
      liabilities.map(liability => ({
        Section: 'Liabilities',
        Category: category,
        AccountCode: liability.code || '',
        AccountName: liability.name,
        Balance: liability.balance,
        'Balance (Formatted)': formatCurrency(liability.balance)
      }))
    );
    
    // Equity data
    const equityData = balanceSheet.equity.map(equity => ({
      Section: 'Equity',
      Category: 'Equity',
      AccountCode: equity.code,
      AccountName: equity.name,
      Balance: equity.balance,
      'Balance (Formatted)': formatCurrency(equity.balance)
    }));
    
    // Summary rows
    const summaryData = [
      {
        Section: 'Summary',
        Category: 'Total',
        AccountCode: '',
        AccountName: 'Total Assets',
        Balance: totals.totalAssets,
        'Balance (Formatted)': formatCurrency(totals.totalAssets)
      },
      {
        Section: 'Summary',
        Category: 'Total',
        AccountCode: '',
        AccountName: 'Total Liabilities',
        Balance: totals.totalLiabilities,
        'Balance (Formatted)': formatCurrency(totals.totalLiabilities)
      },
      {
        Section: 'Summary',
        Category: 'Total',
        AccountCode: '',
        AccountName: 'Total Equity',
        Balance: totals.totalEquity,
        'Balance (Formatted)': formatCurrency(totals.totalEquity)
      },
      {
        Section: 'Summary',
        Category: 'Total',
        AccountCode: '',
        AccountName: 'Net Income',
        Balance: totals.netIncome,
        'Balance (Formatted)': formatCurrency(totals.netIncome)
      },
      {
        Section: 'Summary',
        Category: 'Total',
        AccountCode: '',
        AccountName: 'Total Equity with Income',
        Balance: totals.totalEquityWithIncome,
        'Balance (Formatted)': formatCurrency(totals.totalEquityWithIncome)
      },
      {
        Section: 'Summary',
        Category: 'Total',
        AccountCode: '',
        AccountName: 'Total Liabilities and Equity',
        Balance: totals.totalLiabilitiesAndEquity,
        'Balance (Formatted)': formatCurrency(totals.totalLiabilitiesAndEquity)
      }
    ];
    
    return [...assetsData, ...liabilitiesData, ...equityData, ...summaryData];
  };

  // Handle export completion
  const handleExportComplete = (format, file) => {
    console.log(`Balance sheet export completed in ${format} format`);
  };

  // Go back to reports page
  const goBack = () => {
    router.push('/reports');
  };

  // Render asset categories and accounts
  const renderAssets = () => {
    if (!balanceSheet.assets) return null;
    
    return Object.entries(balanceSheet.assets).map(([category, assets]) => (
      <Box key={category} mb={4}>
        <Heading as="h3" size="sm" mb={2} color="gray.600">
          {category}
        </Heading>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Account</Th>
              <Th isNumeric>Balance</Th>
            </Tr>
          </Thead>
          <Tbody>
            {Array.isArray(assets) ? (
              assets.map(asset => (
                <Tr key={asset.code || asset.id}>
                  <Td>{asset.name}</Td>
                  <Td isNumeric>{formatCurrency(asset.balance || asset.bookValue || asset.wipValue || 0)}</Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={2}>No data available</Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    ));
  };

  // Render liability categories and accounts
  const renderLiabilities = () => {
    if (!balanceSheet.liabilities) return null;
    
    return Object.entries(balanceSheet.liabilities).map(([category, liabilities]) => (
      <Box key={category} mb={4}>
        <Heading as="h3" size="sm" mb={2} color="gray.600">
          {category}
        </Heading>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Account</Th>
              <Th isNumeric>Balance</Th>
            </Tr>
          </Thead>
          <Tbody>
            {liabilities.map(liability => (
              <Tr key={liability.code}>
                <Td>{liability.name}</Td>
                <Td isNumeric>{formatCurrency(liability.balance)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    ));
  };

  // Render equity accounts
  const renderEquity = () => {
    if (!balanceSheet.equity || balanceSheet.equity.length === 0) return null;
    
    return (
      <Box mb={4}>
        <Heading as="h3" size="sm" mb={2} color="gray.600">
          Equity
        </Heading>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Account</Th>
              <Th isNumeric>Balance</Th>
            </Tr>
          </Thead>
          <Tbody>
            {balanceSheet.equity.map(equity => (
              <Tr key={equity.code}>
                <Td>{equity.name}</Td>
                <Td isNumeric>{formatCurrency(equity.balance)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
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
            Balance Sheet
          </Heading>
        </HStack>
        <HStack spacing={2}>
          <ExportButton 
            data={prepareExportData()}
            filename={`balance_sheet_${selectedDate}`}
            onExport={handleExportComplete}
            isDisabled={loading || !!error || (!balanceSheet.assets && !balanceSheet.liabilities && !balanceSheet.equity)}
            tooltipText="Export balance sheet to various formats"
            buttonText="Export"
            pdfConfig={{
              orientation: 'portrait',
              title: `Balance Sheet (As of ${selectedDate})`
            }}
          />
          <Button 
            leftIcon={<FiCalendar />} 
            colorScheme="blue" 
            variant="outline"
            size="sm"
          >
            {selectedDate}
          </Button>
        </HStack>
      </Flex>

      {/* Date Selection */}
      <Box mb={6} p={4} bg={cardBg} borderRadius="md" shadow="sm">
        <Flex direction={{ base: 'column', md: 'row' }} align={{ base: 'flex-start', md: 'center' }}>
          <Text fontWeight="medium" mr={4} mb={{ base: 2, md: 0 }}>
            Balance Sheet as of:
          </Text>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #e2e8f0',
              maxWidth: '200px'
            }}
          />
        </Flex>
      </Box>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Assets</StatLabel>
          <StatNumber>{formatCurrency(totals.totalAssets)}</StatNumber>
          <StatHelpText>Including Fixed Assets & WIP</StatHelpText>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Liabilities</StatLabel>
          <StatNumber>{formatCurrency(totals.totalLiabilities)}</StatNumber>
          {totals.totalNegativeWIP > 0 && (
            <StatHelpText>Includes {formatCurrency(totals.totalNegativeWIP)} advance payments</StatHelpText>
          )}
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Equity</StatLabel>
          <StatNumber>{formatCurrency(totals.totalEquity)}</StatNumber>
          <StatHelpText>Excluding Net Income</StatHelpText>
        </Stat>
      </SimpleGrid>
      
      {/* Net Income and Total Equity with Income Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Net Income</StatLabel>
          <StatNumber>{formatCurrency(totals.netIncome)}</StatNumber>
          <StatHelpText>
            {totals.netIncome >= 0 ? (
              <StatArrow type="increase" />
            ) : (
              <StatArrow type="decrease" />
            )}
            {totals.netIncome >= 0 ? 'Profit' : 'Loss'}
          </StatHelpText>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Equity with Income</StatLabel>
          <StatNumber>{formatCurrency(totals.totalEquityWithIncome)}</StatNumber>
          <StatHelpText>Equity + Net Income</StatHelpText>
        </Stat>

        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Liabilities and Equity</StatLabel>
          <StatNumber>{formatCurrency(totals.totalLiabilitiesAndEquity)}</StatNumber>
          <StatHelpText>Should equal Total Assets</StatHelpText>
        </Stat>
      </SimpleGrid>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading balance sheet data..." />
      ) : (
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Assets</Tab>
            <Tab>Liabilities</Tab>
            <Tab>Equity</Tab>
            <Tab>Summary</Tab>
          </TabList>

          <TabPanels>
            {/* Assets Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>Assets</Heading>
                {renderAssets()}
                <Flex justify="space-between" mt={4} p={2} bg="gray.50" _dark={{ bg: "gray.600" }} borderRadius="md">
                  <Text fontWeight="bold">Total Assets</Text>
                  <Text fontWeight="bold">{formatCurrency(totals.totalAssets)}</Text>
                </Flex>
              </Box>
            </TabPanel>

            {/* Liabilities Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>Liabilities</Heading>
                {renderLiabilities()}
                <Flex justify="space-between" mt={4} p={2} bg="gray.50" _dark={{ bg: "gray.600" }} borderRadius="md">
                  <Text fontWeight="bold">Total Liabilities</Text>
                  <Text fontWeight="bold">{formatCurrency(totals.totalLiabilities)}</Text>
                </Flex>
              </Box>
            </TabPanel>

            {/* Equity Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>Equity</Heading>
                {renderEquity()}
                <Flex justify="space-between" mt={4} p={2} bg="gray.50" _dark={{ bg: "gray.600" }} borderRadius="md">
                  <Text fontWeight="bold">Total Equity</Text>
                  <Text fontWeight="bold">{formatCurrency(totals.totalEquity)}</Text>
                </Flex>
              </Box>
            </TabPanel>

            {/* Summary Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>Balance Sheet Summary</Heading>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Category</Th>
                      <Th isNumeric>Amount</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td fontWeight="bold">Total Assets</Td>
                      <Td isNumeric>{formatCurrency(totals.totalAssets)}</Td>
                    </Tr>
                    <Tr>
                      <Td pl={8}>Total Account Assets</Td>
                      <Td isNumeric>{formatCurrency(balanceSheet.summary.totalAccountAssets)}</Td>
                    </Tr>
                    <Tr>
                      <Td pl={8}>Total Fixed Assets</Td>
                      <Td isNumeric>{formatCurrency(balanceSheet.summary.totalFixedAssets)}</Td>
                    </Tr>
                    {balanceSheet.summary.totalWIP > 0 && (
                      <Tr>
                        <Td pl={8}>Total Work In Progress</Td>
                        <Td isNumeric>{formatCurrency(balanceSheet.summary.totalWIP)}</Td>
                      </Tr>
                    )}
                    {balanceSheet.summary.totalContraAssets !== 0 && (
                      <Tr>
                        <Td pl={8}>Total Accumulated Depreciation</Td>
                        <Td isNumeric>{formatCurrency(balanceSheet.summary.totalContraAssets)}</Td>
                      </Tr>
                    )}
                    <Tr>
                      <Td fontWeight="bold">Total Liabilities</Td>
                      <Td isNumeric>{formatCurrency(totals.totalLiabilities)}</Td>
                    </Tr>
                    {totals.totalNegativeWIP > 0 && (
                      <Tr>
                        <Td pl={8}>Advance from Customers (Negative WIP)</Td>
                        <Td isNumeric>{formatCurrency(totals.totalNegativeWIP)}</Td>
                      </Tr>
                    )}
                    <Tr>
                      <Td fontWeight="bold">Total Equity</Td>
                      <Td isNumeric>{formatCurrency(totals.totalEquity)}</Td>
                    </Tr>
                    <Tr>
                      <Td fontWeight="bold">Net Income</Td>
                      <Td isNumeric>{formatCurrency(totals.netIncome)}</Td>
                    </Tr>
                    <Tr>
                      <Td fontWeight="bold">Total Equity with Income</Td>
                      <Td isNumeric>{formatCurrency(totals.totalEquityWithIncome)}</Td>
                    </Tr>
                  </Tbody>
                </Table>
                <Divider my={4} />
                <Flex justify="space-between" p={2} bg="blue.50" _dark={{ bg: "blue.800" }} borderRadius="md">
                  <Text fontWeight="bold">Total Liabilities and Equity</Text>
                  <Text fontWeight="bold">{formatCurrency(totals.totalLiabilitiesAndEquity)}</Text>
                </Flex>
                {Math.abs(totals.totalAssets - totals.totalLiabilitiesAndEquity) > 0.01 ? (
                  <Alert status="warning" mt={4} borderRadius="md">
                    <AlertIcon />
                    <Text>
                      Balance sheet is not balanced. Difference: {formatCurrency(totals.totalAssets - totals.totalLiabilitiesAndEquity)}
                    </Text>
                  </Alert>
                ) : (
                  <Alert status="success" mt={4} borderRadius="md">
                    <AlertIcon />
                    <Text>
                      Balance sheet is balanced.
                    </Text>
                  </Alert>
                )}
                
                {/* Remove Debug Information Section */}
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedBalanceSheetPage = () => (
  <ProtectedRoute>
    <BalanceSheetPage />
  </ProtectedRoute>
);

export default ProtectedBalanceSheetPage; 