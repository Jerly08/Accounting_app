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
      
      // Fetch accounts
      const accountsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/accounts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );
      
      // Fetch transactions
      const transactionsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            date_before: selectedDate
          }
        }
      );
      
      // Process data to create balance sheet
      const accounts = accountsResponse.data.data;
      const transactions = transactionsResponse.data.data;
      
      // Group accounts by type
      const assets = accounts.filter(account => account.type === 'asset');
      const liabilities = accounts.filter(account => account.type === 'liability');
      const equity = accounts.filter(account => account.type === 'equity');
      
      // Calculate balances for each account
      const calculateAccountBalance = (accountCode) => {
        return transactions
          .filter(transaction => transaction.accountCode === accountCode)
          .reduce((balance, transaction) => {
            // Debit increases assets, decreases liabilities and equity
            // Credit decreases assets, increases liabilities and equity
            const account = accounts.find(a => a.code === accountCode);
            const amount = parseFloat(transaction.amount || 0);
            
            if (account) {
              if (account.type === 'asset') {
                return balance + (transaction.type === 'debit' ? amount : -amount);
              } else {
                return balance + (transaction.type === 'credit' ? amount : -amount);
              }
            }
            return balance;
          }, 0);
      };
      
      // Add balances to accounts
      const assetsWithBalances = assets.map(account => ({
        ...account,
        balance: calculateAccountBalance(account.code)
      }));
      
      const liabilitiesWithBalances = liabilities.map(account => ({
        ...account,
        balance: calculateAccountBalance(account.code)
      }));
      
      const equityWithBalances = equity.map(account => ({
        ...account,
        balance: calculateAccountBalance(account.code)
      }));
      
      // Group assets by category
      const groupedAssets = assetsWithBalances.reduce((acc, asset) => {
        const category = asset.category || 'Other Assets';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(asset);
        return acc;
      }, {});
      
      // Group liabilities by category
      const groupedLiabilities = liabilitiesWithBalances.reduce((acc, liability) => {
        const category = liability.category || 'Other Liabilities';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(liability);
        return acc;
      }, {});
      
      // Update state with processed data
      setBalanceSheet({
        assets: groupedAssets,
        liabilities: groupedLiabilities,
        equity: equityWithBalances,
        date: selectedDate
      });
      
      setError(null);
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
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    // Calculate total assets
    Object.values(balanceSheet.assets).forEach(category => {
      category.forEach(asset => {
        totalAssets += asset.balance;
      });
    });
    
    // Calculate total liabilities
    Object.values(balanceSheet.liabilities).forEach(category => {
      category.forEach(liability => {
        totalLiabilities += liability.balance;
      });
    });
    
    // Calculate total equity
    balanceSheet.equity.forEach(equity => {
      totalEquity += equity.balance;
    });
    
    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity
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
        AccountCode: asset.code,
        AccountName: asset.name,
        Balance: asset.balance,
        'Balance (Formatted)': formatCurrency(asset.balance)
      }))
    );
    
    // Liabilities data
    const liabilitiesData = Object.entries(balanceSheet.liabilities).flatMap(([category, liabilities]) => 
      liabilities.map(liability => ({
        Section: 'Liabilities',
        Category: category,
        AccountCode: liability.code,
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
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Liabilities</StatLabel>
          <StatNumber>{formatCurrency(totals.totalLiabilities)}</StatNumber>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Equity</StatLabel>
          <StatNumber>{formatCurrency(totals.totalEquity)}</StatNumber>
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
                <Accordion allowMultiple defaultIndex={[0]}>
                  {Object.entries(balanceSheet.assets).map(([category, assets]) => (
                    <AccordionItem key={category}>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left" fontWeight="medium">
                            {category}
                          </Box>
                          <Text mr={4}>
                            {formatCurrency(assets.reduce((sum, asset) => sum + asset.balance, 0))}
                          </Text>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Account Code</Th>
                              <Th>Account Name</Th>
                              <Th isNumeric>Balance</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {assets.map((asset) => (
                              <Tr key={asset.code}>
                                <Td>{asset.code}</Td>
                                <Td>{asset.name}</Td>
                                <Td isNumeric>{formatCurrency(asset.balance)}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
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
                <Accordion allowMultiple defaultIndex={[0]}>
                  {Object.entries(balanceSheet.liabilities).map(([category, liabilities]) => (
                    <AccordionItem key={category}>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left" fontWeight="medium">
                            {category}
                          </Box>
                          <Text mr={4}>
                            {formatCurrency(liabilities.reduce((sum, liability) => sum + liability.balance, 0))}
                          </Text>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Account Code</Th>
                              <Th>Account Name</Th>
                              <Th isNumeric>Balance</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {liabilities.map((liability) => (
                              <Tr key={liability.code}>
                                <Td>{liability.code}</Td>
                                <Td>{liability.name}</Td>
                                <Td isNumeric>{formatCurrency(liability.balance)}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
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
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Account Code</Th>
                      <Th>Account Name</Th>
                      <Th isNumeric>Balance</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {balanceSheet.equity.map((equity) => (
                      <Tr key={equity.code}>
                        <Td>{equity.code}</Td>
                        <Td>{equity.name}</Td>
                        <Td isNumeric>{formatCurrency(equity.balance)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
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
                      <Td fontWeight="bold">Total Liabilities</Td>
                      <Td isNumeric>{formatCurrency(totals.totalLiabilities)}</Td>
                    </Tr>
                    <Tr>
                      <Td fontWeight="bold">Total Equity</Td>
                      <Td isNumeric>{formatCurrency(totals.totalEquity)}</Td>
                    </Tr>
                  </Tbody>
                </Table>
                <Divider my={4} />
                <Flex justify="space-between" p={2} bg="blue.50" _dark={{ bg: "blue.800" }} borderRadius="md">
                  <Text fontWeight="bold">Total Liabilities and Equity</Text>
                  <Text fontWeight="bold">{formatCurrency(totals.totalLiabilitiesAndEquity)}</Text>
                </Flex>
                {Math.abs(totals.totalAssets - totals.totalLiabilitiesAndEquity) > 0.01 && (
                  <Alert status="warning" mt={4} borderRadius="md">
                    <AlertIcon />
                    <Text>
                      Balance sheet is not balanced. Difference: {formatCurrency(totals.totalAssets - totals.totalLiabilitiesAndEquity)}
                    </Text>
                  </Alert>
                )}
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