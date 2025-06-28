import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Text,
  VStack,
  HStack,
  Divider,
  Flex,
  Spacer,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  InputGroup,
  InputLeftAddon,
  Switch,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
} from '@chakra-ui/react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const FixedAssetDepreciation = ({ asset, onClose, onSuccess, isOpen }) => {
  const { token } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [depreciationData, setDepreciationData] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [accumulatedDepreciationAccounts, setAccumulatedDepreciationAccounts] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    depreciationAmount: '',
    depreciationDate: new Date().toISOString().split('T')[0],
    createAccountingEntry: true,
    expenseAccountCode: '6101', // Default to Depreciation Expense
    accumulatedDepreciationAccountCode: '1599', // Default to Accumulated Depreciation
  });

  const [errors, setErrors] = useState({});

  // Fetch depreciation data when component mounts
  useEffect(() => {
    if (asset && token && isOpen) {
      fetchDepreciationData();
      fetchDepreciationSchedule();
      fetchAccounts();
    }
  }, [asset, token, isOpen]);

  // Fetch current depreciation data
  const fetchDepreciationData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/assets/${asset.id}/depreciation`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setDepreciationData(response.data.data);
        
        // Set default depreciation amount to monthly depreciation
        setFormData(prev => ({
          ...prev,
          depreciationAmount: response.data.data.depreciationInfo.monthlyDepreciation.toFixed(2)
        }));
      }
    } catch (error) {
      console.error('Error fetching depreciation data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch depreciation data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch depreciation schedule
  const fetchDepreciationSchedule = async () => {
    try {
      const response = await axios.get(`/api/assets/${asset.id}/schedule`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        // The API now returns the schedule directly, not nested in a schedule property
        setSchedule(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching depreciation schedule:', error);
      // Initialize with empty array to prevent mapping errors
      setSchedule([]);
    }
  };

  // Fetch accounts for dropdown
  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/accounts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        const allAccounts = response.data.data || [];
        setAccounts(allAccounts);

        // Filter expense accounts (6xxx)
        const expenseAccts = allAccounts.filter(account => 
          account.code.startsWith('6')
        );
        setExpenseAccounts(expenseAccts);

        // Filter accumulated depreciation accounts with broader criteria
        // Include accounts that:
        // 1. Start with 15 or 16 (common for accumulated depreciation)
        // 2. OR have "accumulated" or "akumulasi" in the name (case insensitive)
        // 3. OR have "depreciation" or "penyusutan" in the name (case insensitive)
        const accumulatedDepAccts = allAccounts.filter(account => {
          const name = account.name.toLowerCase();
          return account.code.startsWith('15') || 
                 account.code.startsWith('16') || 
                 name.includes('accumulated') || 
                 name.includes('akumulasi') || 
                 name.includes('depreciation') || 
                 name.includes('penyusutan');
        });
        
        // If no accounts match the criteria, include at least the default account (1599)
        if (accumulatedDepAccts.length === 0) {
          // Add a default option
          accumulatedDepAccts.push({
            id: 'default',
            code: '1599',
            name: 'Accumulated Depreciation'
          });
        }
        
        setAccumulatedDepreciationAccounts(accumulatedDepAccts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      // Provide at least one default option even if API fails
      setAccumulatedDepreciationAccounts([{
        id: 'default',
        code: '1599',
        name: 'Accumulated Depreciation'
      }]);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle number input changes
  const handleNumberChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Toggle accounting entry creation
  const toggleAccountingEntry = () => {
    setFormData(prev => ({
      ...prev,
      createAccountingEntry: !prev.createAccountingEntry
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.depreciationAmount || isNaN(Number(formData.depreciationAmount)) || Number(formData.depreciationAmount) <= 0) {
      newErrors.depreciationAmount = 'Depreciation amount must be a positive number';
    }

    if (!formData.depreciationDate) {
      newErrors.depreciationDate = 'Depreciation date is required';
    }

    if (formData.createAccountingEntry) {
      if (!formData.expenseAccountCode) {
        newErrors.expenseAccountCode = 'Expense account is required';
      }

      if (!formData.accumulatedDepreciationAccountCode) {
        newErrors.accumulatedDepreciationAccountCode = 'Accumulated depreciation account is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await axios.post(
        `/api/assets/${asset.id}/depreciation`,
        {
          depreciationAmount: Number(formData.depreciationAmount),
          depreciationDate: formData.depreciationDate,
          createAccountingEntry: formData.createAccountingEntry,
          expenseAccountCode: formData.expenseAccountCode,
          accumulatedDepreciationAccountCode: formData.accumulatedDepreciationAccountCode,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Depreciation recorded successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Call success callback
        if (onSuccess) {
          onSuccess(response.data.data);
        }

        // Close modal
        onClose();
      }
    } catch (error) {
      console.error('Error recording depreciation:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to record depreciation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Get account name by code
  const getAccountName = (code) => {
    const account = accounts.find(acc => acc.code === code);
    return account ? `${account.name} (${account.code})` : code;
  };

  // Calculate depreciation progress percentage
  const calculateDepreciationProgress = () => {
    if (!depreciationData) return 0;
    
    // Use the depreciationProgress from the API response if available
    if (depreciationData.depreciationInfo && 
        depreciationData.depreciationInfo.depreciationProgress !== undefined) {
      return depreciationData.depreciationInfo.depreciationProgress;
    }
    
    // Fallback calculation
    return (asset.accumulatedDepreciation / asset.value) * 100;
  };

  // Make sure onClose is defined
  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  if (!asset || !depreciationData) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="xl" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Asset Depreciation</ModalHeader>
          <ModalCloseButton onClick={handleClose} />
          <ModalBody>
            <Text>Loading depreciation data...</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Asset Depreciation: {asset.assetName}</ModalHeader>
        <ModalCloseButton onClick={handleClose} />
        <ModalBody>
          <Tabs variant="enclosed">
            <TabList>
              <Tab>Overview</Tab>
              <Tab>Record Depreciation</Tab>
              <Tab>Depreciation Schedule</Tab>
            </TabList>

            <TabPanels>
              {/* Overview Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Card>
                    <CardHeader>
                      <Heading size="md">Asset Information</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <Flex>
                          <Text fontWeight="bold">Asset Name:</Text>
                          <Spacer />
                          <Text>{asset.assetName}</Text>
                        </Flex>
                        <Flex>
                          <Text fontWeight="bold">Category:</Text>
                          <Spacer />
                          <Text>{asset.category}</Text>
                        </Flex>
                        <Flex>
                          <Text fontWeight="bold">Acquisition Date:</Text>
                          <Spacer />
                          <Text>{formatDate(asset.acquisitionDate)}</Text>
                        </Flex>
                        <Flex>
                          <Text fontWeight="bold">Original Value:</Text>
                          <Spacer />
                          <Text>{formatCurrency(asset.value)}</Text>
                        </Flex>
                        <Flex>
                          <Text fontWeight="bold">Useful Life:</Text>
                          <Spacer />
                          <Text>{asset.usefulLife} years</Text>
                        </Flex>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <Heading size="md">Depreciation Status</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <Flex>
                          <Text fontWeight="bold">Accumulated Depreciation:</Text>
                          <Spacer />
                          <Text>{formatCurrency(asset.accumulatedDepreciation)}</Text>
                        </Flex>
                        <Flex>
                          <Text fontWeight="bold">Current Book Value:</Text>
                          <Spacer />
                          <Text>{formatCurrency(asset.bookValue)}</Text>
                        </Flex>
                        <Flex>
                          <Text fontWeight="bold">Depreciation Progress:</Text>
                          <Spacer />
                          <Text>{calculateDepreciationProgress().toFixed(1)}%</Text>
                        </Flex>
                        <Progress 
                          value={calculateDepreciationProgress()} 
                          colorScheme={calculateDepreciationProgress() >= 75 ? "red" : "blue"}
                          size="sm" 
                          borderRadius="md"
                        />
                        <Flex>
                          <Text fontWeight="bold">Monthly Depreciation:</Text>
                          <Spacer />
                          <Text>{formatCurrency(depreciationData.depreciationInfo.monthlyDepreciation)}</Text>
                        </Flex>
                        <Flex>
                          <Text fontWeight="bold">Yearly Depreciation:</Text>
                          <Spacer />
                          <Text>{formatCurrency(depreciationData.depreciationInfo.annualDepreciation)}</Text>
                        </Flex>
                        <Flex>
                          <Text fontWeight="bold">Remaining Life:</Text>
                          <Spacer />
                          <Text>
                            {Math.floor(depreciationData.depreciationInfo.remainingMonths / 12)} years 
                            ({depreciationData.depreciationInfo.remainingMonths} months)
                          </Text>
                        </Flex>
                        <Flex>
                          <Text fontWeight="bold">Status:</Text>
                          <Spacer />
                          <Badge colorScheme={asset.bookValue <= 0 ? "red" : "green"}>
                            {asset.bookValue <= 0 ? "Fully Depreciated" : "Active"}
                          </Badge>
                        </Flex>
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
              </TabPanel>

              {/* Record Depreciation Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Alert status="info">
                    <AlertIcon />
                    Record depreciation for this asset. This will update the accumulated depreciation and book value.
                  </Alert>

                  <form onSubmit={handleSubmit}>
                    <VStack spacing={4} align="stretch">
                      <FormControl isRequired isInvalid={errors.depreciationAmount}>
                        <FormLabel>Depreciation Amount</FormLabel>
                        <InputGroup>
                          <InputLeftAddon>Rp</InputLeftAddon>
                          <NumberInput
                            min={0}
                            max={asset.bookValue}
                            value={formData.depreciationAmount}
                            onChange={(value) => handleNumberChange('depreciationAmount', value)}
                            width="100%"
                          >
                            <NumberInputField borderLeftRadius={0} />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </InputGroup>
                        {errors.depreciationAmount && <FormErrorMessage>{errors.depreciationAmount}</FormErrorMessage>}
                      </FormControl>

                      <FormControl isRequired isInvalid={errors.depreciationDate}>
                        <FormLabel>Depreciation Date</FormLabel>
                        <Input
                          type="date"
                          name="depreciationDate"
                          value={formData.depreciationDate}
                          onChange={handleChange}
                        />
                        {errors.depreciationDate && <FormErrorMessage>{errors.depreciationDate}</FormErrorMessage>}
                      </FormControl>

                      <Divider my={2} />

                      <FormControl display="flex" alignItems="center">
                        <FormLabel htmlFor="create-accounting" mb="0">
                          Create accounting entry
                        </FormLabel>
                        <Switch
                          id="create-accounting"
                          isChecked={formData.createAccountingEntry}
                          onChange={toggleAccountingEntry}
                        />
                      </FormControl>

                      {formData.createAccountingEntry && (
                        <>
                          <FormControl isRequired isInvalid={errors.expenseAccountCode}>
                            <FormLabel>Depreciation Expense Account (Debit)</FormLabel>
                            <Select
                              name="expenseAccountCode"
                              value={formData.expenseAccountCode}
                              onChange={handleChange}
                            >
                              <option value="">Select account</option>
                              {expenseAccounts.map(account => (
                                <option key={account.code} value={account.code}>
                                  {account.name} ({account.code})
                                </option>
                              ))}
                            </Select>
                            {errors.expenseAccountCode && <FormErrorMessage>{errors.expenseAccountCode}</FormErrorMessage>}
                          </FormControl>

                          <FormControl isRequired isInvalid={errors.accumulatedDepreciationAccountCode}>
                            <FormLabel>Accumulated Depreciation Account (Credit)</FormLabel>
                            <Select
                              name="accumulatedDepreciationAccountCode"
                              value={formData.accumulatedDepreciationAccountCode}
                              onChange={handleChange}
                            >
                              <option value="">Select account</option>
                              {accumulatedDepreciationAccounts.map(account => (
                                <option key={account.code} value={account.code}>
                                  {account.name} ({account.code})
                                </option>
                              ))}
                            </Select>
                            {errors.accumulatedDepreciationAccountCode && <FormErrorMessage>{errors.accumulatedDepreciationAccountCode}</FormErrorMessage>}
                          </FormControl>

                          <Box p={3} bg="gray.50" borderRadius="md">
                            <Text fontWeight="bold">Transaction Preview:</Text>
                            <Text mt={2}>Debit: {getAccountName(formData.expenseAccountCode)} {formatCurrency(formData.depreciationAmount)}</Text>
                            <Text>Credit: {getAccountName(formData.accumulatedDepreciationAccountCode)} {formatCurrency(formData.depreciationAmount)}</Text>
                          </Box>
                        </>
                      )}

                      <Button
                        mt={4}
                        colorScheme="blue"
                        type="submit"
                        isLoading={isLoading}
                        loadingText="Recording..."
                        isDisabled={asset.bookValue <= 0}
                      >
                        Record Depreciation
                      </Button>

                      {asset.bookValue <= 0 && (
                        <Alert status="warning">
                          <AlertIcon />
                          This asset is fully depreciated. No further depreciation can be recorded.
                        </Alert>
                      )}
                    </VStack>
                  </form>
                </VStack>
              </TabPanel>

              {/* Depreciation Schedule Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Depreciation Schedule</Heading>
                  <Text>Straight-line depreciation schedule for the asset's useful life.</Text>

                  <Box overflowX="auto">
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Year</Th>
                          <Th>Beginning Value</Th>
                          <Th isNumeric>Annual Depreciation</Th>
                          <Th isNumeric>Accumulated</Th>
                          <Th isNumeric>Ending Value</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {schedule && schedule.length > 0 ? (
                          schedule.map((item, index) => (
                            <Tr key={index}>
                              <Td>{item.year}</Td>
                              <Td isNumeric>{formatCurrency(item.beginningValue)}</Td>
                              <Td isNumeric>{formatCurrency(item.annualDepreciation)}</Td>
                              <Td isNumeric>{formatCurrency(item.accumulatedDepreciation)}</Td>
                              <Td isNumeric>{formatCurrency(item.endingValue)}</Td>
                            </Tr>
                          ))
                        ) : (
                          <Tr>
                            <Td colSpan={5} textAlign="center">No schedule data available</Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FixedAssetDepreciation; 