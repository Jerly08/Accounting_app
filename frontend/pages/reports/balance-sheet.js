import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tfoot,
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
  Card,
  CardHeader,
  CardBody,
  AlertTitle,
  AlertDescription,
  FormControl,
  Input,
  Center,
  Spinner,
  OrderedList,
  ListItem,
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
  const [previousYearBalanceSheet, setPreviousYearBalanceSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showComparison, setShowComparison] = useState(false);
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');

  // Add state for balance status
  const [balanceStatus, setBalanceStatus] = useState({
    isBalanced: true,
    difference: 0,
    message: ''
  });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate previous year date
  const getPreviousYearDate = (date) => {
    const currentDate = new Date(date);
    currentDate.setFullYear(currentDate.getFullYear() - 1);
    return currentDate.toISOString().split('T')[0];
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
      
      let response;
      let errorDetails = '';
      
      try {
        // Try the new endpoint first
        response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/reports/balance-sheet`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              date: selectedDate
            }
          }
        );
      } catch (newEndpointError) {
        console.log('New endpoint failed, trying legacy endpoint...', newEndpointError.message);
        
        if (newEndpointError.response?.data?.error) {
          errorDetails = `: ${newEndpointError.response.data.error}`;
        }
        
        try {
          // If that fails, try the legacy endpoint
          response = await axios.get(
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
        } catch (legacyEndpointError) {
          console.error('Both endpoints failed:', legacyEndpointError);
          
          if (legacyEndpointError.response?.data?.error) {
            errorDetails = `: ${legacyEndpointError.response.data.error}`;
          }
          
          throw legacyEndpointError; // Re-throw to be caught by the outer catch
        }
      }
      
      if (response.data.success) {
        setBalanceSheet(response.data.data);
        setError(null);
        
        try {
          // Check balance status
          const checkBalanceResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/reports/balance-check${selectedDate ? `?date=${selectedDate}` : ''}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          if (checkBalanceResponse.data.success) {
            setBalanceStatus({
              isBalanced: checkBalanceResponse.data.data.isBalanced,
              difference: checkBalanceResponse.data.data.difference,
              message: checkBalanceResponse.data.data.message
            });
          }
        } catch (checkError) {
          console.error('Error checking balance status:', checkError);
          // Don't fail the whole operation for this
        }
        
        // If comparison is enabled, fetch previous year data
        if (showComparison) {
          const previousYearDate = getPreviousYearDate(selectedDate);
          
          try {
            const previousYearResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_API_URL}/api/reports/balance-sheet`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                params: {
                  date: previousYearDate
                }
              }
            );
            
            if (previousYearResponse.data.success) {
              setPreviousYearBalanceSheet(previousYearResponse.data.data);
            }
          } catch (error) {
            console.error('Error fetching previous year balance sheet:', error);
            // Don't set error state for this, just log it
            setPreviousYearBalanceSheet(null);
          }
        } else {
          setPreviousYearBalanceSheet(null);
        }
      } else {
        setError(response.data.message || 'Failed to load balance sheet data');
      }
    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
      
      let errorMessage = 'Failed to load balance sheet data';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please login again.';
      } else if (error.response?.status === 500) {
        errorMessage = `Server error while generating balance sheet${errorDetails}. Please contact support.`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = `Error: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      setError(errorMessage);
      
      // Set empty balance sheet to prevent null reference errors in the UI
      setBalanceSheet({
        assets: { current: {}, nonCurrent: {} },
        liabilities: { current: {}, nonCurrent: {} },
        equity: {},
        summary: {}
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchBalanceSheet();
    }
  }, [token, isAuthenticated, selectedDate, showComparison]);

  // Calculate percentage change
  const calculatePercentChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Format percentage
  const formatPercentage = (percentage) => {
    if (percentage === null) return 'N/A';
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  // Handle date change
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // Toggle comparison
  const toggleComparison = () => {
    setShowComparison(!showComparison);
  };

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
        isBalanced: true,
        totalNegativeWIP: 0,
        totalContraAssets: 0,
        totalCurrentAssets: 0,
        totalNonCurrentAssets: 0,
        totalCurrentLiabilities: 0,
        totalNonCurrentLiabilities: 0,
        totalFixedAssets: 0,
        totalWIP: 0
      };
    }
    
    // Use summary data from the API
    const { 
      totalAssets = 0, 
      totalLiabilities = 0, 
      totalEquity = 0, 
      netIncome = 0, 
      totalEquityWithIncome = 0,
      totalLiabilitiesAndEquity = 0, 
      isBalanced = true,
      totalNegativeWIP = 0,
      totalContraAssets = 0,
      totalCurrentAssets = 0,
      totalNonCurrentAssets = 0,
      totalCurrentLiabilities = 0,
      totalNonCurrentLiabilities = 0,
      totalFixedAssets = 0,
      totalWIP = 0
    } = balanceSheet.summary;
    
    return {
      totalAssets: totalAssets || 0,
      totalLiabilities: totalLiabilities || 0,
      totalEquity: totalEquity || 0,
      netIncome: netIncome || 0,
      totalNegativeWIP: totalNegativeWIP || 0,
      totalContraAssets: totalContraAssets || 0,
      totalCurrentAssets: totalCurrentAssets || 0,
      totalNonCurrentAssets: totalNonCurrentAssets || 0,
      totalCurrentLiabilities: totalCurrentLiabilities || 0,
      totalNonCurrentLiabilities: totalNonCurrentLiabilities || 0,
      totalFixedAssets: totalFixedAssets || 0,
      totalWIP: totalWIP || 0,
      totalEquityWithIncome: totalEquityWithIncome || (totalEquity + (netIncome || 0)),
      totalLiabilitiesAndEquity: totalLiabilitiesAndEquity || (totalLiabilities + totalEquity + (netIncome || 0)),
      isBalanced: isBalanced || false
    };
  };
  
  const totals = calculateTotals();

  // Prepare data for export
  const prepareExportData = () => {
    if (!balanceSheet || !balanceSheet.assets || !balanceSheet.liabilities || !balanceSheet.equity) {
      return [];
    }
    
    // Assets data
    const assetsData = [];
    try {
      // Current Assets
      if (balanceSheet.assets.current) {
        Object.entries(balanceSheet.assets.current).forEach(([category, accounts]) => {
          if (Array.isArray(accounts)) {
            accounts.forEach(account => {
            assetsData.push({
              Section: 'Assets',
                Category: 'Current Assets',
                SubCategory: category,
                AccountCode: account.code || '',
                AccountName: account.name || '',
                Balance: account.balance || 0,
                'Balance (Formatted)': formatCurrency(account.balance || 0)
            });
          });
          }
        });
      }
      
      // Fixed Assets
      if (balanceSheet.assets.fixed) {
        Object.entries(balanceSheet.assets.fixed).forEach(([category, accounts]) => {
          if (Array.isArray(accounts)) {
            accounts.forEach(account => {
                assetsData.push({
                  Section: 'Assets',
                Category: 'Fixed Assets',
                SubCategory: category,
                AccountCode: account.code || '',
                AccountName: account.name || '',
                Balance: account.balance || 0,
                'Balance (Formatted)': formatCurrency(account.balance || 0)
                });
              });
          }
        });
      }
      
      // Contra Assets
      if (balanceSheet.assets.contra && Array.isArray(balanceSheet.assets.contra)) {
        balanceSheet.assets.contra.forEach(account => {
          assetsData.push({
            Section: 'Assets',
            Category: 'Contra Assets',
            SubCategory: 'Accumulated Depreciation',
            AccountCode: account.code || '',
            AccountName: account.name || '',
            Balance: account.balance || 0,
            'Balance (Formatted)': formatCurrency(account.balance || 0)
            });
          });
        }
      
      // WIP Items
      if (balanceSheet.assets.wipItems && Array.isArray(balanceSheet.assets.wipItems)) {
        balanceSheet.assets.wipItems.forEach(item => {
          assetsData.push({
            Section: 'Assets',
            Category: 'Current Assets',
            SubCategory: 'Work In Progress',
            AccountCode: item.projectCode || '',
            AccountName: item.name || '',
            Balance: item.wipValue || 0,
            'Balance (Formatted)': formatCurrency(item.wipValue || 0)
          });
        });
      }
    } catch (error) {
      console.error('Error processing assets for export:', error);
    }
    
    // Liabilities data
    const liabilitiesData = [];
    try {
      // Current Liabilities
      if (balanceSheet.liabilities.current) {
        Object.entries(balanceSheet.liabilities.current).forEach(([category, accounts]) => {
          if (Array.isArray(accounts)) {
            accounts.forEach(account => {
            liabilitiesData.push({
              Section: 'Liabilities',
                Category: 'Current Liabilities',
                SubCategory: category,
                AccountCode: account.code || '',
                AccountName: account.name || '',
                Balance: account.balance || 0,
                'Balance (Formatted)': formatCurrency(account.balance || 0)
            });
          });
          }
        });
      }
      
      // Non-Current Liabilities
      if (balanceSheet.liabilities.nonCurrent) {
        Object.entries(balanceSheet.liabilities.nonCurrent).forEach(([category, accounts]) => {
          if (Array.isArray(accounts)) {
            accounts.forEach(account => {
                liabilitiesData.push({
                  Section: 'Liabilities',
                Category: 'Non-Current Liabilities',
                SubCategory: category,
                AccountCode: account.code || '',
                AccountName: account.name || '',
                Balance: account.balance || 0,
                'Balance (Formatted)': formatCurrency(account.balance || 0)
            });
          });
        }
      });
      }
    } catch (error) {
      console.error('Error processing liabilities for export:', error);
    }
    
    // Equity data
    const equityData = [];
    try {
      if (balanceSheet.equity) {
        Object.entries(balanceSheet.equity).forEach(([category, accounts]) => {
          if (Array.isArray(accounts)) {
            accounts.forEach(account => {
            equityData.push({
              Section: 'Equity',
                Category: 'Equity',
                SubCategory: category,
                AccountCode: account.code || '',
                AccountName: account.name || '',
                Balance: account.balance || 0,
                'Balance (Formatted)': formatCurrency(account.balance || 0)
            });
          });
          }
        });
        
        // Add Net Income
        if (balanceSheet.summary && balanceSheet.summary.netIncome !== undefined) {
          equityData.push({
            Section: 'Equity',
            Category: 'Equity',
            SubCategory: 'Net Income',
            AccountCode: '',
            AccountName: 'Net Income (Current Period)',
            Balance: balanceSheet.summary.netIncome || 0,
            'Balance (Formatted)': formatCurrency(balanceSheet.summary.netIncome || 0)
          });
        }
      }
    } catch (error) {
      console.error('Error processing equity for export:', error);
    }
    
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
      },
      {
        Section: 'Summary',
        Category: 'Balance Status',
        AccountCode: '',
        AccountName: balanceStatus.isBalanced ? '✅ Seimbang' : '❌ Tidak Seimbang',
        Balance: balanceStatus.isBalanced ? 0 : Math.abs((balanceSheet.summary && balanceSheet.summary.difference) || 0),
        'Balance (Formatted)': balanceStatus.isBalanced ? '-' : formatCurrency(Math.abs((balanceSheet.summary && balanceSheet.summary.difference) || 0))
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
    if (!balanceSheet || !balanceSheet.assets) {
      return <EmptyState message="No asset data available" />;
    }

    // Add default empty objects for each destructured property
    const { 
      current = {}, 
      fixed = {}, 
      contra = [], 
      wipItems = [] 
    } = balanceSheet.assets;
    
    const { 
      totalCurrentAssets = 0, 
      totalFixedAssets = 0, 
      totalContraAssets = 0, 
      totalAssets = 0 
    } = balanceSheet.summary || {};
    
    return (
      <Box>
        <Heading as="h3" size="md" mb={4} color="blue.600">
          1. ASSETS (Aset)
          </Heading>
          
        {/* Current Assets Section */}
        <Box ml={4} mb={6}>
          <Heading as="h4" size="sm" mb={3}>
            Current Assets
              </Heading>
              
          <Table size="sm" variant="simple" mb={4}>
                    <Thead>
              <Tr bg="gray.50">
                        <Th>Account</Th>
                        <Th isNumeric>Balance</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
              {/* Kas */}
              {current['Kas'] && current['Kas'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{current['Kas'][0].name} ({current['Kas'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(current['Kas'][0].balance)}</Td>
                </Tr>
              )}

              {/* Bank */}
              {current['Bank'] && current['Bank'].length > 0 && (
                <>
                  <Tr>
                    <Td fontWeight="medium" colSpan={2}>Bank:</Td>
                  </Tr>
                  {current['Bank'].map(account => (
                    <Tr key={account.code}>
                      <Td pl={8}>{account.name} ({account.code})</Td>
                      <Td isNumeric>{formatCurrency(account.balance)}</Td>
                        </Tr>
                      ))}
                </>
              )}

              {/* Piutang Usaha */}
              {current['Piutang Usaha'] && current['Piutang Usaha'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{current['Piutang Usaha'][0].name} ({current['Piutang Usaha'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(current['Piutang Usaha'][0].balance)}</Td>
                </Tr>
              )}

              {/* WIP */}
              {current['WIP'] && current['WIP'].length > 0 ? (
                <Tr>
                  <Td fontWeight="medium">{current['WIP'][0].name} ({current['WIP'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(current['WIP'][0].balance)}</Td>
                </Tr>
              ) : wipItems && wipItems.length > 0 ? (
                <Tr>
                  <Td fontWeight="medium">Pekerjaan Dalam Proses (WIP)</Td>
                  <Td isNumeric>{formatCurrency(wipItems.reduce((sum, item) => sum + item.wipValue, 0))}</Td>
                </Tr>
              ) : null}
                    </Tbody>
                    <Tfoot>
              <Tr bg="blue.50">
                <Td fontWeight="bold">Total Current Assets</Td>
                <Td isNumeric fontWeight="bold">{formatCurrency(totalCurrentAssets)}</Td>
                      </Tr>
                    </Tfoot>
                  </Table>
                </Box>

        {/* Fixed Assets Section */}
        <Box ml={4} mb={6}>
          <Heading as="h4" size="sm" mb={3}>
            Fixed Assets
          </Heading>
          
          <Table size="sm" variant="simple" mb={4}>
                    <Thead>
              <Tr bg="gray.50">
                        <Th>Account</Th>
                        <Th isNumeric>Balance</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
              {/* Mesin */}
              {fixed['Mesin'] && fixed['Mesin'].length > 0 && (
                <>
                  <Tr>
                    <Td fontWeight="medium" colSpan={2}>Mesin:</Td>
                        </Tr>
                  {fixed['Mesin'].map(account => (
                    <Tr key={account.code}>
                      <Td pl={8}>{account.name} ({account.code})</Td>
                      <Td isNumeric>{formatCurrency(account.balance)}</Td>
                      </Tr>
                  ))}
                </>
              )}

              {/* Kendaraan */}
              {fixed['Kendaraan'] && fixed['Kendaraan'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{fixed['Kendaraan'][0].name} ({fixed['Kendaraan'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(fixed['Kendaraan'][0].balance)}</Td>
                </Tr>
              )}

              {/* Peralatan */}
              {fixed['Peralatan'] && fixed['Peralatan'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{fixed['Peralatan'][0].name} ({fixed['Peralatan'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(fixed['Peralatan'][0].balance)}</Td>
                  </Tr>
              )}

              {/* Bangunan */}
              {fixed['Bangunan'] && fixed['Bangunan'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{fixed['Bangunan'][0].name} ({fixed['Bangunan'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(fixed['Bangunan'][0].balance)}</Td>
                    </Tr>
              )}
                </Tbody>
                <Tfoot>
              <Tr bg="blue.50">
                <Td fontWeight="bold">Total Fixed Assets</Td>
                <Td isNumeric fontWeight="bold">{formatCurrency(totalFixedAssets)}</Td>
                  </Tr>
                </Tfoot>
              </Table>
            </Box>

        {/* Contra Assets Section */}
        <Box ml={4} mb={6}>
          <Heading as="h4" size="sm" mb={3}>
            Contra Assets (Accumulated Depreciation)
              </Heading>

          <Table size="sm" variant="simple" mb={4}>
                <Thead>
              <Tr bg="gray.50">
                <Th>Account</Th>
                <Th isNumeric>Balance</Th>
                  </Tr>
                </Thead>
                <Tbody>
              {contra && contra.length > 0 ? (
                contra.map(account => (
                  <Tr key={account.code}>
                    <Td fontWeight="medium">{account.name} ({account.code})</Td>
                    <Td isNumeric color="red.500">{formatCurrency(account.balance)}</Td>
                    </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={2}>No contra assets found</Td>
                </Tr>
              )}
                </Tbody>
                <Tfoot>
              <Tr bg="blue.50">
                <Td fontWeight="bold">Total Contra Assets</Td>
                <Td isNumeric fontWeight="bold" color="red.500">{formatCurrency(totalContraAssets)}</Td>
                  </Tr>
                </Tfoot>
              </Table>
        </Box>
        
        {/* Total Assets */}
        <Box bg="blue.100" p={3} borderRadius="md">
          <Flex justifyContent="space-between" alignItems="center">
            <Text fontWeight="bold">TOTAL ASSETS</Text>
            <Text fontWeight="bold">{formatCurrency(totalAssets)}</Text>
          </Flex>
        </Box>
      </Box>
    );
  };

  // Render liability categories and accounts
  const renderLiabilities = () => {
    if (!balanceSheet || !balanceSheet.liabilities) {
      return <EmptyState message="No liability data available" />;
    }

    // Add default empty objects for each destructured property
    const { current = {}, nonCurrent = {} } = balanceSheet.liabilities;
    
    const { 
      totalCurrentLiabilities = 0, 
      totalNonCurrentLiabilities = 0, 
      totalLiabilities = 0 
    } = balanceSheet.summary || {};
    
    return (
      <Box mt={8}>
        <Heading as="h3" size="md" mb={4} color="orange.600">
          2. LIABILITIES (Kewajiban)
          </Heading>
          
        {/* Current Liabilities Section */}
        <Box ml={4} mb={6}>
          <Heading as="h4" size="sm" mb={3}>
            Current Liabilities
              </Heading>
              
          <Table size="sm" variant="simple" mb={4}>
                    <Thead>
              <Tr bg="gray.50">
                        <Th>Account</Th>
                        <Th isNumeric>Balance</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
              {/* Hutang Bank Jangka Pendek */}
              {current['Hutang Bank Jangka Pendek'] && current['Hutang Bank Jangka Pendek'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{current['Hutang Bank Jangka Pendek'][0].name} ({current['Hutang Bank Jangka Pendek'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(current['Hutang Bank Jangka Pendek'][0].balance)}</Td>
                        </Tr>
              )}

              {/* Hutang Usaha */}
              {current['Hutang Usaha'] && current['Hutang Usaha'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{current['Hutang Usaha'][0].name} ({current['Hutang Usaha'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(current['Hutang Usaha'][0].balance)}</Td>
                </Tr>
              )}

              {/* Hutang Pajak */}
              {current['Hutang Pajak'] && current['Hutang Pajak'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{current['Hutang Pajak'][0].name} ({current['Hutang Pajak'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(current['Hutang Pajak'][0].balance)}</Td>
                </Tr>
              )}

              {/* Beban Yang Masih Harus Dibayar */}
              {current['Beban Yang Masih Harus Dibayar'] && current['Beban Yang Masih Harus Dibayar'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{current['Beban Yang Masih Harus Dibayar'][0].name} ({current['Beban Yang Masih Harus Dibayar'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(current['Beban Yang Masih Harus Dibayar'][0].balance)}</Td>
                </Tr>
              )}
                    </Tbody>
                    <Tfoot>
              <Tr bg="orange.50">
                <Td fontWeight="bold">Total Current Liabilities</Td>
                <Td isNumeric fontWeight="bold">{formatCurrency(totalCurrentLiabilities)}</Td>
                      </Tr>
                    </Tfoot>
                  </Table>
                </Box>

        {/* Non-Current Liabilities Section */}
        <Box ml={4} mb={6}>
          <Heading as="h4" size="sm" mb={3}>
            Non-Current Liabilities
          </Heading>
          
          <Table size="sm" variant="simple" mb={4}>
                      <Thead>
              <Tr bg="gray.50">
                          <Th>Account</Th>
                          <Th isNumeric>Balance</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
              {/* Hutang Bank Jangka Panjang */}
              {nonCurrent['Hutang Bank Jangka Panjang'] && nonCurrent['Hutang Bank Jangka Panjang'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{nonCurrent['Hutang Bank Jangka Panjang'][0].name} ({nonCurrent['Hutang Bank Jangka Panjang'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(nonCurrent['Hutang Bank Jangka Panjang'][0].balance)}</Td>
                          </Tr>
              )}

              {/* Hutang Leasing */}
              {nonCurrent['Hutang Leasing'] && nonCurrent['Hutang Leasing'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{nonCurrent['Hutang Leasing'][0].name} ({nonCurrent['Hutang Leasing'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(nonCurrent['Hutang Leasing'][0].balance)}</Td>
                </Tr>
              )}
                      </Tbody>
                      <Tfoot>
              <Tr bg="orange.50">
                <Td fontWeight="bold">Total Non-Current Liabilities</Td>
                <Td isNumeric fontWeight="bold">{formatCurrency(totalNonCurrentLiabilities)}</Td>
                        </Tr>
                      </Tfoot>
                    </Table>
                  </Box>

        {/* Total Liabilities */}
        <Box bg="orange.100" p={3} borderRadius="md">
          <Flex justifyContent="space-between" alignItems="center">
            <Text fontWeight="bold">TOTAL LIABILITIES</Text>
            <Text fontWeight="bold">{formatCurrency(totalLiabilities)}</Text>
                </Flex>
              </Box>
        </Box>
    );
  };

  // Render equity accounts
  const renderEquity = () => {
    if (!balanceSheet || !balanceSheet.equity) {
      return <EmptyState message="No equity data available" />;
    }

    // Add default empty object for equity
    const equity = balanceSheet.equity || {};
    const { totalEquity = 0, netIncome = 0 } = balanceSheet.summary || {};
    
    return (
      <Box mt={8}>
        <Heading as="h3" size="md" mb={4} color="green.600">
          3. EQUITY (Ekuitas)
        </Heading>
        
        <Box ml={4} mb={6}>
          <Table size="sm" variant="simple" mb={4}>
                  <Thead>
              <Tr bg="gray.50">
                      <Th>Account</Th>
                      <Th isNumeric>Balance</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
              {/* Modal Saham */}
              {equity['Modal Saham'] && equity['Modal Saham'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{equity['Modal Saham'][0].name} ({equity['Modal Saham'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(equity['Modal Saham'][0].balance)}</Td>
                      </Tr>
              )}

              {/* Laba Ditahan */}
              {equity['Laba Ditahan'] && equity['Laba Ditahan'].length > 0 && (
                <Tr>
                  <Td fontWeight="medium">{equity['Laba Ditahan'][0].name} ({equity['Laba Ditahan'][0].code})</Td>
                  <Td isNumeric>{formatCurrency(equity['Laba Ditahan'][0].balance)}</Td>
                </Tr>
              )}

              {/* Net Income */}
              <Tr>
                <Td fontWeight="medium">Net Income (Current Period)</Td>
                <Td isNumeric>{formatCurrency(netIncome)}</Td>
              </Tr>
                  </Tbody>
                  <Tfoot>
              <Tr bg="green.50">
                <Td fontWeight="bold">TOTAL EQUITY</Td>
                <Td isNumeric fontWeight="bold">{formatCurrency(totalEquity)}</Td>
                    </Tr>
                  </Tfoot>
                </Table>
              </Box>
          </Box>
    );
  };

  // Add this function to render the balance status
  const renderBalanceStatus = () => {
    if (!balanceSheet || !balanceSheet.summary) {
      return null;
    }

    // Add default values for summary properties
    const { 
      totalAssets = 0, 
      totalLiabilitiesAndEquity = 0, 
      isBalanced = true, 
      difference = 0 
    } = balanceSheet.summary;

    return (
      <Box mt={8} p={4} borderWidth={1} borderRadius="md" borderColor={isBalanced ? "green.300" : "red.300"} bg={isBalanced ? "green.50" : "red.50"}>
        <Heading as="h3" size="md" mb={4}>
          Final Calculation
          </Heading>
        
        <Table size="md" variant="simple">
          <Tbody>
            <Tr>
              <Td fontWeight="bold">Total Assets</Td>
              <Td isNumeric fontWeight="bold">{formatCurrency(totalAssets)}</Td>
            </Tr>
            <Tr>
              <Td fontWeight="bold">Total Liabilities + Equity</Td>
              <Td isNumeric fontWeight="bold">{formatCurrency(totalLiabilitiesAndEquity)}</Td>
            </Tr>
          </Tbody>
        </Table>
        
        <Flex mt={4} justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold">Status:</Text>
          {isBalanced ? (
            <Badge colorScheme="green" p={2} fontSize="md">✅ Seimbang</Badge>
          ) : (
            <Badge colorScheme="red" p={2} fontSize="md">❌ Tidak Seimbang (Difference: {formatCurrency(Math.abs(difference))})</Badge>
          )}
        </Flex>
      </Box>
    );
  };

  return (
    <ProtectedRoute>
    <Box p={4}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading as="h1" size="xl">Balance Sheet</Heading>
        <HStack>
          <IconButton
            icon={<FiArrowLeft />}
            onClick={goBack}
              aria-label="Go back"
            variant="outline"
            />
            <Input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              width="auto"
              mr={2}
            />
            <Button 
              leftIcon={<FiFilter />}
              onClick={toggleComparison}
              colorScheme={showComparison ? "blue" : "gray"}
              variant={showComparison ? "solid" : "outline"}
            >
              {showComparison ? "Hide Comparison" : "Show Comparison"}
            </Button>
            <ExportButton
              data={prepareExportData()}
              filename={`balance-sheet-${selectedDate}`}
              onComplete={handleExportComplete}
            />
          </HStack>
        </Flex>

      {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorAlert message={error} />
        ) : (
          <Box>
            <Card mb={6}>
              <CardHeader bg="gray.50" py={3}>
                <Heading size="md">Balance Sheet as of {new Date(selectedDate).toLocaleDateString()}</Heading>
              </CardHeader>
              <CardBody>
                {renderAssets()}
                {renderLiabilities()}
                {renderEquity()}
                {renderBalanceStatus()}
              </CardBody>
            </Card>
              </Box>
        )}
                    </Box>
    </ProtectedRoute>
  );
};

// Wrap with ProtectedRoute
const ProtectedBalanceSheetPage = () => (
  <ProtectedRoute>
    <BalanceSheetPage />
  </ProtectedRoute>
);

export default ProtectedBalanceSheetPage; 