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
      Object.entries(balanceSheet.assets || {}).forEach(([category, assets]) => {
        if (Array.isArray(assets)) {
          // Handle array-style assets (like Fixed Assets, WIP)
          assets.forEach(asset => {
            assetsData.push({
              Section: 'Assets',
              Category: category,
              AccountCode: asset.code || '',
              AccountName: asset.name || '',
              Balance: asset.balance || asset.bookValue || asset.wipValue || 0,
              'Balance (Formatted)': formatCurrency(asset.balance || asset.bookValue || asset.wipValue || 0)
            });
          });
        } else if (typeof assets === 'object') {
          // Handle nested structure (current/nonCurrent)
          Object.entries(assets).forEach(([subCategory, subCategoryAssets]) => {
            Object.entries(subCategoryAssets).forEach(([subSubCategory, accounts]) => {
              accounts.forEach(asset => {
                assetsData.push({
                  Section: 'Assets',
                  Category: `${category} - ${subCategory}`,
                  SubCategory: subSubCategory,
                  AccountCode: asset.code || '',
                  AccountName: asset.name || '',
                  Balance: asset.balance || 0,
                  'Balance (Formatted)': formatCurrency(asset.balance || 0)
                });
              });
            });
          });
        }
      });
    } catch (error) {
      console.error('Error processing assets for export:', error);
    }
    
    // Liabilities data
    const liabilitiesData = [];
    try {
      Object.entries(balanceSheet.liabilities || {}).forEach(([category, liabilities]) => {
        if (Array.isArray(liabilities)) {
          // Handle array-style liabilities
          liabilities.forEach(liability => {
            liabilitiesData.push({
              Section: 'Liabilities',
              Category: category,
              AccountCode: liability.code || '',
              AccountName: liability.name || '',
              Balance: liability.balance || 0,
              'Balance (Formatted)': formatCurrency(liability.balance || 0)
            });
          });
        } else if (typeof liabilities === 'object') {
          // Handle nested structure (current/nonCurrent)
          Object.entries(liabilities).forEach(([subCategory, subCategoryLiabilities]) => {
            Object.entries(subCategoryLiabilities).forEach(([subSubCategory, accounts]) => {
              accounts.forEach(liability => {
                liabilitiesData.push({
                  Section: 'Liabilities',
                  Category: `${category} - ${subCategory}`,
                  SubCategory: subSubCategory,
                  AccountCode: liability.code || '',
                  AccountName: liability.name || '',
                  Balance: liability.balance || 0,
                  'Balance (Formatted)': formatCurrency(liability.balance || 0)
                });
              });
            });
          });
        }
      });
    } catch (error) {
      console.error('Error processing liabilities for export:', error);
    }
    
    // Equity data
    const equityData = [];
    try {
      Object.entries(balanceSheet.equity || {}).forEach(([category, subcategories]) => {
        Object.entries(subcategories).forEach(([subcategory, equities]) => {
          equities.forEach(equity => {
            equityData.push({
              Section: 'Equity',
              Category: category,
              SubCategory: subcategory,
              AccountCode: equity.code || '',
              AccountName: equity.name || '',
              Balance: equity.balance || 0,
              'Balance (Formatted)': formatCurrency(equity.balance || 0)
            });
          });
        });
      });
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
    if (!balanceSheet || !balanceSheet.assets) return null;
    
    return (
      <>
        {/* Current Assets */}
        <Box mb={6}>
          <Heading as="h3" size="md" mb={3} color="blue.600" borderBottom="1px" borderColor="gray.200" pb={2}>
            Current Assets
          </Heading>
          
          {balanceSheet.assets.current && Object.entries(balanceSheet.assets.current).map(([category, subcategories]) => (
            <Box key={category} mb={4}>
              <Heading as="h4" size="sm" mb={2} color="gray.600">
                {category}
              </Heading>
              
              {Object.entries(subcategories).map(([subcategory, accounts]) => (
                <Box key={`${category}-${subcategory}`} mb={3} ml={4}>
                  {subcategory !== 'General' && (
                    <Text fontWeight="medium" color="gray.500" mb={1}>
                      {subcategory}
                    </Text>
                  )}
                  
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Account</Th>
                        <Th isNumeric>Balance</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {accounts.map(account => (
                        <Tr key={account.code || `account-${Math.random()}`}>
                          <Td>{account.name}</Td>
                          <Td isNumeric>{formatCurrency(account.balance || 0)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                    <Tfoot>
                      <Tr bg="gray.50">
                        <Td fontWeight="semibold">{subcategory !== 'General' ? `Subtotal - ${subcategory}` : `Subtotal - ${category}`}</Td>
                        <Td isNumeric fontWeight="semibold">
                          {formatCurrency(accounts.reduce((sum, account) => sum + (account.balance || 0), 0))}
                        </Td>
                      </Tr>
                    </Tfoot>
                  </Table>
                </Box>
              ))}
              
              <Flex justify="space-between" mt={2} p={2} bg="gray.100" borderRadius="md">
                <Text fontWeight="bold">Total {category}</Text>
                <Text fontWeight="bold">
                  {formatCurrency(
                    Object.values(subcategories).reduce(
                      (sum, accounts) => sum + accounts.reduce((accSum, account) => accSum + (account.balance || 0), 0), 0
                    )
                  )}
                </Text>
              </Flex>
            </Box>
          ))}
          
          {/* Show total current assets */}
          {balanceSheet.summary && (
            <Flex justify="space-between" mt={4} p={3} bg="blue.50" borderRadius="md">
              <Text fontWeight="bold">Total Current Assets</Text>
              <Text fontWeight="bold">{formatCurrency(balanceSheet.summary.totalCurrentAssets || 0)}</Text>
            </Flex>
          )}
        </Box>
        
        {/* Non-Current Assets */}
        <Box mb={6}>
          <Heading as="h3" size="md" mb={3} color="blue.600" borderBottom="1px" borderColor="gray.200" pb={2}>
            Non-Current Assets
          </Heading>
          
          {balanceSheet.assets.nonCurrent && Object.entries(balanceSheet.assets.nonCurrent).map(([category, subcategories]) => (
            <Box key={category} mb={4}>
              <Heading as="h4" size="sm" mb={2} color="gray.600">
                {category}
              </Heading>
              
              {Object.entries(subcategories).map(([subcategory, accounts]) => (
                <Box key={`${category}-${subcategory}`} mb={3} ml={4}>
                  {subcategory !== 'General' && (
                    <Text fontWeight="medium" color="gray.500" mb={1}>
                      {subcategory}
                    </Text>
                  )}
                  
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Account</Th>
                        <Th isNumeric>Balance</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {accounts.map(account => (
                        <Tr key={account.code || `account-${Math.random()}`}>
                          <Td>{account.name}</Td>
                          <Td isNumeric>{formatCurrency(account.balance || 0)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                    <Tfoot>
                      <Tr bg="gray.50">
                        <Td fontWeight="semibold">{subcategory !== 'General' ? `Subtotal - ${subcategory}` : `Subtotal - ${category}`}</Td>
                        <Td isNumeric fontWeight="semibold">
                          {formatCurrency(accounts.reduce((sum, account) => sum + (account.balance || 0), 0))}
                        </Td>
                      </Tr>
                    </Tfoot>
                  </Table>
                </Box>
              ))}
              
              <Flex justify="space-between" mt={2} p={2} bg="gray.100" borderRadius="md">
                <Text fontWeight="bold">Total {category}</Text>
                <Text fontWeight="bold">
                  {formatCurrency(
                    Object.values(subcategories).reduce(
                      (sum, accounts) => sum + accounts.reduce((accSum, account) => accSum + (account.balance || 0), 0), 0
                    )
                  )}
                </Text>
              </Flex>
            </Box>
          ))}
          
          {/* Fixed Assets */}
          {balanceSheet.assets && balanceSheet.assets['Fixed Assets'] && balanceSheet.assets['Fixed Assets'].length > 0 && (
            <Box mb={4}>
              <Heading as="h4" size="sm" mb={2} color="gray.600">
                Fixed Assets
              </Heading>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Asset</Th>
                    <Th isNumeric>Book Value</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {balanceSheet.assets['Fixed Assets'].map(asset => (
                    <Tr key={asset.id || `asset-${Math.random()}`}>
                      <Td>{asset.name}</Td>
                      <Td isNumeric>{formatCurrency(asset.bookValue || 0)}</Td>
                    </Tr>
                  ))}
                </Tbody>
                <Tfoot>
                  <Tr bg="gray.50">
                    <Td fontWeight="semibold">Total Fixed Assets</Td>
                    <Td isNumeric fontWeight="semibold">
                      {formatCurrency(balanceSheet.summary && balanceSheet.summary.totalFixedAssets ? balanceSheet.summary.totalFixedAssets : 0)}
                    </Td>
                  </Tr>
                </Tfoot>
              </Table>
            </Box>
          )}
          
          {/* Work In Progress */}
          {balanceSheet.assets && balanceSheet.assets['Work In Progress'] && balanceSheet.assets['Work In Progress'].length > 0 && (
            <Box mb={4}>
              <Heading as="h4" size="sm" mb={2} color="gray.600">
                Work In Progress
              </Heading>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Project</Th>
                    <Th isNumeric>WIP Value</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {balanceSheet.assets['Work In Progress'].map(wip => (
                    <Tr key={wip.id || `wip-${Math.random()}`}>
                      <Td>{wip.name}</Td>
                      <Td isNumeric>{formatCurrency(wip.wipValue || 0)}</Td>
                    </Tr>
                  ))}
                </Tbody>
                <Tfoot>
                  <Tr bg="gray.50">
                    <Td fontWeight="semibold">Total Work In Progress</Td>
                    <Td isNumeric fontWeight="semibold">
                      {formatCurrency(balanceSheet.summary && balanceSheet.summary.totalWIP ? balanceSheet.summary.totalWIP : 0)}
                    </Td>
                  </Tr>
                </Tfoot>
              </Table>
            </Box>
          )}
          
          {/* Show total non-current assets */}
          {balanceSheet.summary && (
            <Flex justify="space-between" mt={4} p={3} bg="blue.50" borderRadius="md">
              <Text fontWeight="bold">Total Non-Current Assets</Text>
              <Text fontWeight="bold">{formatCurrency(
                (balanceSheet.summary.totalNonCurrentAssets || 0) + 
                (balanceSheet.summary.totalFixedAssets || 0) + 
                (balanceSheet.summary.totalWIP || 0)
              )}</Text>
            </Flex>
          )}
        </Box>
        
        {/* Total Assets */}
        {balanceSheet.summary && (
          <Flex justify="space-between" mt={4} p={3} bg="blue.100" borderRadius="md">
            <Text fontWeight="bold" fontSize="lg">TOTAL ASSETS</Text>
            <Text fontWeight="bold" fontSize="lg">{formatCurrency(balanceSheet.summary.totalAssets || 0)}</Text>
          </Flex>
        )}
      </>
    );
  };

  // Render liability categories and accounts
  const renderLiabilities = () => {
    if (!balanceSheet || !balanceSheet.liabilities) return null;
    
    return (
      <>
        {/* Current Liabilities */}
        <Box mb={6}>
          <Heading as="h3" size="md" mb={3} color="blue.600" borderBottom="1px" borderColor="gray.200" pb={2}>
            Current Liabilities
          </Heading>
          
          {balanceSheet.liabilities.current && Object.entries(balanceSheet.liabilities.current).map(([category, subcategories]) => (
            <Box key={category} mb={4}>
              <Heading as="h4" size="sm" mb={2} color="gray.600">
                {category}
              </Heading>
              
              {Object.entries(subcategories).map(([subcategory, liabilities]) => (
                <Box key={`${category}-${subcategory}`} mb={3} ml={4}>
                  {subcategory !== 'General' && (
                    <Text fontWeight="medium" color="gray.500" mb={1}>
                      {subcategory}
                    </Text>
                  )}
                  
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Account</Th>
                        <Th isNumeric>Balance</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {liabilities.map(liability => (
                        <Tr key={liability.code || `liability-${Math.random()}`}>
                          <Td>{liability.name}</Td>
                          <Td isNumeric>{formatCurrency(liability.balance || 0)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                    <Tfoot>
                      <Tr bg="gray.50">
                        <Td fontWeight="semibold">{subcategory !== 'General' ? `Subtotal - ${subcategory}` : `Subtotal - ${category}`}</Td>
                        <Td isNumeric fontWeight="semibold">
                          {formatCurrency(liabilities.reduce((sum, liability) => sum + (liability.balance || 0), 0))}
                        </Td>
                      </Tr>
                    </Tfoot>
                  </Table>
                </Box>
              ))}
              
              <Flex justify="space-between" mt={2} p={2} bg="gray.100" borderRadius="md">
                <Text fontWeight="bold">Total {category}</Text>
                <Text fontWeight="bold">
                  {formatCurrency(
                    Object.values(subcategories).reduce(
                      (sum, liabilities) => sum + liabilities.reduce((accSum, liability) => accSum + (liability.balance || 0), 0), 0
                    )
                  )}
                </Text>
              </Flex>
            </Box>
          ))}
          
          {/* Show total current liabilities */}
          {balanceSheet.summary && (
            <Flex justify="space-between" mt={4} p={3} bg="red.50" borderRadius="md">
              <Text fontWeight="bold">Total Current Liabilities</Text>
              <Text fontWeight="bold">{formatCurrency(balanceSheet.summary.totalCurrentLiabilities || 0)}</Text>
            </Flex>
          )}
        </Box>
        
        {/* Non-Current Liabilities */}
        <Box mb={6}>
          <Heading as="h3" size="md" mb={3} color="blue.600" borderBottom="1px" borderColor="gray.200" pb={2}>
            Non-Current Liabilities
          </Heading>
          
          {balanceSheet.liabilities.nonCurrent && Object.entries(balanceSheet.liabilities.nonCurrent).length > 0 ? (
            Object.entries(balanceSheet.liabilities.nonCurrent).map(([category, subcategories]) => (
              <Box key={category} mb={4}>
                <Heading as="h4" size="sm" mb={2} color="gray.600">
                  {category}
                </Heading>
                
                {Object.entries(subcategories).map(([subcategory, liabilities]) => (
                  <Box key={`${category}-${subcategory}`} mb={3} ml={4}>
                    {subcategory !== 'General' && (
                      <Text fontWeight="medium" color="gray.500" mb={1}>
                        {subcategory}
                      </Text>
                    )}
                    
                    <Table size="sm" variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Account</Th>
                          <Th isNumeric>Balance</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {liabilities.map(liability => (
                          <Tr key={liability.code || `liability-${Math.random()}`}>
                            <Td>{liability.name}</Td>
                            <Td isNumeric>{formatCurrency(liability.balance || 0)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                      <Tfoot>
                        <Tr bg="gray.50">
                          <Td fontWeight="semibold">{subcategory !== 'General' ? `Subtotal - ${subcategory}` : `Subtotal - ${category}`}</Td>
                          <Td isNumeric fontWeight="semibold">
                            {formatCurrency(liabilities.reduce((sum, liability) => sum + (liability.balance || 0), 0))}
                          </Td>
                        </Tr>
                      </Tfoot>
                    </Table>
                  </Box>
                ))}
                
                <Flex justify="space-between" mt={2} p={2} bg="gray.100" borderRadius="md">
                  <Text fontWeight="bold">Total {category}</Text>
                  <Text fontWeight="bold">
                    {formatCurrency(
                      Object.values(subcategories).reduce(
                        (sum, liabilities) => sum + liabilities.reduce((accSum, liability) => accSum + (liability.balance || 0), 0), 0
                      )
                    )}
                  </Text>
                </Flex>
              </Box>
            ))
          ) : (
            <Text color="gray.500" fontStyle="italic">No non-current liabilities</Text>
          )}
          
          {/* Show total non-current liabilities */}
          {balanceSheet.summary && (
            <Flex justify="space-between" mt={4} p={3} bg="red.50" borderRadius="md">
              <Text fontWeight="bold">Total Non-Current Liabilities</Text>
              <Text fontWeight="bold">{formatCurrency(balanceSheet.summary.totalNonCurrentLiabilities || 0)}</Text>
            </Flex>
          )}
        </Box>
        
        {/* Total Liabilities */}
        {balanceSheet.summary && (
          <Flex justify="space-between" mt={4} p={3} bg="red.100" borderRadius="md">
            <Text fontWeight="bold" fontSize="lg">TOTAL LIABILITIES</Text>
            <Text fontWeight="bold" fontSize="lg">{formatCurrency(balanceSheet.summary.totalLiabilities || 0)}</Text>
          </Flex>
        )}
      </>
    );
  };

  // Render equity accounts
  const renderEquity = () => {
    if (!balanceSheet.equity) return null;
    
    return (
      <>
        <Heading as="h3" size="md" mb={3} color="blue.600" borderBottom="1px" borderColor="gray.200" pb={2}>
          Equity
        </Heading>
        
        {Object.entries(balanceSheet.equity).map(([category, subcategories]) => (
          <Box key={category} mb={4}>
            <Heading as="h4" size="sm" mb={2} color="gray.600">
              {category}
            </Heading>
            
            {Object.entries(subcategories).map(([subcategory, equities]) => (
              <Box key={`${category}-${subcategory}`} mb={3} ml={4}>
                {subcategory !== 'General' && (
                  <Text fontWeight="medium" color="gray.500" mb={1}>
                    {subcategory}
                  </Text>
                )}
                
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Account</Th>
                      <Th isNumeric>Balance</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {equities.map(equity => (
                      <Tr key={equity.code}>
                        <Td>{equity.name}</Td>
                        <Td isNumeric>{formatCurrency(equity.balance)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                  <Tfoot>
                    <Tr bg="gray.50">
                      <Td fontWeight="semibold">{subcategory !== 'General' ? `Subtotal - ${subcategory}` : `Subtotal - ${category}`}</Td>
                      <Td isNumeric fontWeight="semibold">
                        {formatCurrency(equities.reduce((sum, equity) => sum + equity.balance, 0))}
                      </Td>
                    </Tr>
                  </Tfoot>
                </Table>
              </Box>
            ))}
            
            <Flex justify="space-between" mt={2} p={2} bg="gray.100" borderRadius="md">
              <Text fontWeight="bold">Total {category}</Text>
              <Text fontWeight="bold">
                {formatCurrency(
                  Object.values(subcategories).reduce(
                    (sum, equities) => sum + equities.reduce((accSum, equity) => accSum + equity.balance, 0), 0
                  )
                )}
              </Text>
            </Flex>
          </Box>
        ))}
        
        {/* Net Income */}
        <Box mb={4}>
          <Heading as="h4" size="sm" mb={2} color="gray.600">
            Net Income
          </Heading>
          <Flex justify="space-between" p={3} 
            bg={balanceSheet.summary && balanceSheet.summary.netIncome >= 0 ? "green.50" : "red.50"} 
            borderRadius="md"
          >
            <Text fontWeight="bold">Net Income for Period</Text>
            <Text fontWeight="bold">
              {formatCurrency(balanceSheet.summary && balanceSheet.summary.netIncome ? balanceSheet.summary.netIncome : 0)}
            </Text>
          </Flex>
        </Box>
        
        {/* Total Equity */}
        {balanceSheet.summary && (
          <Flex justify="space-between" mt={4} p={3} bg="green.100" borderRadius="md">
            <Text fontWeight="bold" fontSize="lg">TOTAL EQUITY WITH INCOME</Text>
            <Text fontWeight="bold" fontSize="lg">
              {formatCurrency(balanceSheet.summary.totalEquityWithIncome || 0)}
            </Text>
          </Flex>
        )}
      </>
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

      {/* Date Selection and Comparison Toggle */}
      <Box mb={6} p={4} bg={cardBg} borderRadius="md" shadow="sm">
        <Flex direction={{ base: 'column', md: 'row' }} align={{ base: 'flex-start', md: 'center' }} justify="space-between">
          <Flex align="center" mb={{ base: 3, md: 0 }}>
            <Text fontWeight="medium" mr={4}>
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
          
          <Flex align="center">
            <Text fontWeight="medium" mr={4}>
              Compare with previous year:
            </Text>
            <Button 
              size="sm" 
              colorScheme={showComparison ? "green" : "gray"}
              onClick={toggleComparison}
            >
              {showComparison ? "Enabled" : "Disabled"}
            </Button>
          </Flex>
        </Flex>
        
        {showComparison && previousYearBalanceSheet && (
          <Alert status="info" mt={4} borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Comparison Mode</AlertTitle>
              <AlertDescription>
                Comparing current data ({selectedDate}) with previous year ({getPreviousYearDate(selectedDate)})
              </AlertDescription>
            </Box>
          </Alert>
        )}
      </Box>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Assets</StatLabel>
          <StatNumber>{formatCurrency(totals.totalAssets)}</StatNumber>
          {showComparison && previousYearBalanceSheet && (
            <StatHelpText>
              <StatArrow type={totals.totalAssets >= (previousYearBalanceSheet.summary.totalAssets || 0) ? "increase" : "decrease"} />
              {formatPercentage(calculatePercentChange(
                totals.totalAssets,
                previousYearBalanceSheet.summary.totalAssets
              ))}
              {" from previous year"}
            </StatHelpText>
          )}
          {!showComparison && (
            <StatHelpText>Including Fixed Assets & WIP</StatHelpText>
          )}
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Liabilities</StatLabel>
          <StatNumber>{formatCurrency(totals.totalLiabilities)}</StatNumber>
          {showComparison && previousYearBalanceSheet && (
            <StatHelpText>
              <StatArrow type={totals.totalLiabilities <= (previousYearBalanceSheet.summary.totalLiabilities || 0) ? "increase" : "decrease"} />
              {formatPercentage(calculatePercentChange(
                totals.totalLiabilities,
                previousYearBalanceSheet.summary.totalLiabilities
              ))}
              {" from previous year"}
            </StatHelpText>
          )}
          {!showComparison && totals.totalNegativeWIP > 0 && (
            <StatHelpText>Includes {formatCurrency(totals.totalNegativeWIP)} advance payments</StatHelpText>
          )}
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Equity</StatLabel>
          <StatNumber>{formatCurrency(totals.totalEquity)}</StatNumber>
          {showComparison && previousYearBalanceSheet && (
            <StatHelpText>
              <StatArrow type={totals.totalEquity >= (previousYearBalanceSheet.summary.totalEquity || 0) ? "increase" : "decrease"} />
              {formatPercentage(calculatePercentChange(
                totals.totalEquity,
                previousYearBalanceSheet.summary.totalEquity
              ))}
              {" from previous year"}
            </StatHelpText>
          )}
          {!showComparison && (
            <StatHelpText>Excluding Net Income</StatHelpText>
          )}
        </Stat>
      </SimpleGrid>
      
      {/* Net Income and Total Equity with Income Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Net Income</StatLabel>
          <StatNumber>{formatCurrency(totals.netIncome)}</StatNumber>
          <StatHelpText>
            {showComparison && previousYearBalanceSheet ? (
              <>
                <StatArrow type={totals.netIncome >= (previousYearBalanceSheet.summary.netIncome || 0) ? "increase" : "decrease"} />
                {formatPercentage(calculatePercentChange(
                  totals.netIncome,
                  previousYearBalanceSheet.summary.netIncome
                ))}
                {" from previous year"}
              </>
            ) : (
              <>
                <StatArrow type={totals.netIncome >= 0 ? "increase" : "decrease"} />
                {totals.netIncome >= 0 ? 'Profit' : 'Loss'}
              </>
            )}
          </StatHelpText>
        </Stat>
        
        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Equity with Income</StatLabel>
          <StatNumber>{formatCurrency(totals.totalEquityWithIncome)}</StatNumber>
          {showComparison && previousYearBalanceSheet && (
            <StatHelpText>
              <StatArrow type={totals.totalEquityWithIncome >= (previousYearBalanceSheet.summary.totalEquityWithIncome || 0) ? "increase" : "decrease"} />
              {formatPercentage(calculatePercentChange(
                totals.totalEquityWithIncome,
                previousYearBalanceSheet.summary.totalEquityWithIncome
              ))}
              {" from previous year"}
            </StatHelpText>
          )}
          {!showComparison && (
            <StatHelpText>Equity + Net Income</StatHelpText>
          )}
        </Stat>

        <Stat bg={cardBg} p={4} borderRadius="md" shadow="sm">
          <StatLabel>Total Liabilities and Equity</StatLabel>
          <StatNumber>{formatCurrency(totals.totalLiabilitiesAndEquity)}</StatNumber>
          {showComparison && previousYearBalanceSheet && (
            <StatHelpText>
              <StatArrow type={totals.totalLiabilitiesAndEquity >= (previousYearBalanceSheet.summary.totalLiabilitiesAndEquity || 0) ? "increase" : "decrease"} />
              {formatPercentage(calculatePercentChange(
                totals.totalLiabilitiesAndEquity,
                previousYearBalanceSheet.summary.totalLiabilitiesAndEquity
              ))}
              {" from previous year"}
            </StatHelpText>
          )}
          {!showComparison && (
            <StatHelpText>Should equal Total Assets</StatHelpText>
          )}
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
              </Box>
            </TabPanel>

            {/* Liabilities Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>Liabilities</Heading>
                {renderLiabilities()}
              </Box>
            </TabPanel>

            {/* Equity Tab */}
            <TabPanel>
              <Box bg={cardBg} p={4} borderRadius="md" shadow="sm">
                <Heading size="md" mb={4}>Equity</Heading>
                {renderEquity()}
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
                      <Td isNumeric>{formatCurrency(balanceSheet.summary && balanceSheet.summary.totalAccountAssets ? balanceSheet.summary.totalAccountAssets : 0)}</Td>
                    </Tr>
                    <Tr>
                      <Td pl={8}>Total Fixed Assets</Td>
                      <Td isNumeric>{formatCurrency(balanceSheet.summary && balanceSheet.summary.totalFixedAssets ? balanceSheet.summary.totalFixedAssets : 0)}</Td>
                    </Tr>
                    {balanceSheet.summary && balanceSheet.summary.totalWIP > 0 && (
                      <Tr>
                        <Td pl={8}>Total Work In Progress</Td>
                        <Td isNumeric>{formatCurrency(balanceSheet.summary.totalWIP)}</Td>
                      </Tr>
                    )}
                    {balanceSheet.summary && balanceSheet.summary.totalContraAssets !== 0 && (
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
                    <Tr>
                      <Td fontWeight="bold">Total Liabilities and Equity</Td>
                      <Td isNumeric>{formatCurrency(totals.totalLiabilitiesAndEquity)}</Td>
                    </Tr>
                    {balanceSheet.summary && balanceSheet.summary.difference && Math.abs(balanceSheet.summary.difference) > 0.01 && (
                      <Tr bgColor="yellow.50">
                        <Td fontWeight="bold" color="orange.600">Difference (Out of Balance)</Td>
                        <Td isNumeric color="orange.600">{formatCurrency(Math.abs(balanceSheet.summary.difference))}</Td>
                      </Tr>
                    )}
                    <Tr>
                      <Td fontWeight="bold">Balance Status</Td>
                      <Td isNumeric>
                        <Badge 
                          colorScheme={balanceStatus.isBalanced ? "green" : "orange"}
                          p={1}
                        >
                          {balanceStatus.isBalanced ? "BALANCED" : "NOT BALANCED"}
                        </Badge>
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
                <Divider my={4} />
                <Flex justify="space-between" p={2} bg={balanceStatus.isBalanced ? "blue.50" : "yellow.50"} _dark={{ bg: balanceStatus.isBalanced ? "blue.800" : "yellow.800" }} borderRadius="md">
                  <Text fontWeight="bold">Total Liabilities and Equity</Text>
                  <Text fontWeight="bold">{formatCurrency(totals.totalLiabilitiesAndEquity)}</Text>
                </Flex>
                {!balanceStatus.isBalanced ? (
                  <Alert status="warning" mt={4} borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Balance Sheet Not Balanced</AlertTitle>
                      <AlertDescription>
                        There is a difference of {formatCurrency(Math.abs(balanceStatus.difference))} 
                        between assets and liabilities + equity. Please check your transactions and ensure proper double-entry accounting.
                      </AlertDescription>
                    </Box>
                  </Alert>
                ) : (
                  <Alert status="success" mt={4} borderRadius="md">
                    <AlertIcon />
                    <Text>
                      Balance sheet is properly balanced using double-entry accounting.
                    </Text>
                  </Alert>
                )}
                
                {/* Guidance for unbalanced sheets */}
                {!balanceStatus.isBalanced && (
                  <Alert status="info" mt={4} borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>How to Fix Unbalanced Sheets</AlertTitle>
                      <AlertDescription>
                        <OrderedList spacing={1} mt={2}>
                          <ListItem>Use the double-entry transaction feature when adding new transactions</ListItem>
                          <ListItem>Review recent transactions for missing counter entries</ListItem>
                          <ListItem>Ensure all cash transactions have corresponding entries in revenue, expense, asset, liability, or equity accounts</ListItem>
                          <ListItem>Check for transactions with incorrect account types or amounts</ListItem>
                        </OrderedList>
                      </AlertDescription>
                    </Box>
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