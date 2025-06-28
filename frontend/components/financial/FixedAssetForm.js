import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  InputGroup,
  InputLeftAddon,
  useToast,
  Divider,
  Text,
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
  Checkbox,
  Switch,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Heading,
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// Predefined asset categories
const ASSET_CATEGORIES = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'building', label: 'Building' },
  { value: 'land', label: 'Land' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'other', label: 'Other' }
];

const FixedAssetForm = ({ 
  isOpen, 
  onClose, 
  asset = null, 
  onSubmitSuccess 
}) => {
  const initialFormData = {
    assetName: '',
    category: 'equipment', // Default category
    acquisitionDate: new Date().toISOString().split('T')[0],
    value: '',
    usefulLife: '',
    description: '',
    location: '',
    assetTag: '',
    accumulatedDepreciation: '0',
    bookValue: '0',
    // New fields for accounting integration
    fixedAssetAccountCode: '',
    paymentAccountCode: '1102', // Default to Bank BCA
    createAccountingEntry: true,
    transactionDescription: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepreciationFields, setShowDepreciationFields] = useState(false);
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [fixedAssetAccounts, setFixedAssetAccounts] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);

  // Fetch accounts on component mount
  useEffect(() => {
    if (token && isAuthenticated) {
      fetchAccounts();
    }
  }, [token, isAuthenticated]);

  // Fetch chart of accounts
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

        // Filter fixed asset accounts (15xx)
        const assetAccounts = allAccounts.filter(account => 
          account.code.startsWith('15')
        );
        setFixedAssetAccounts(assetAccounts);

        // Filter payment accounts (cash and bank accounts)
        const cashBankAccounts = allAccounts.filter(account => 
          account.code.startsWith('11') && 
          (account.category === 'Asset' || account.category === 'Cash' || account.category === 'Bank')
        );
        setPaymentAccounts(cashBankAccounts);

        // Set default fixed asset account based on category
        if (formData.category && assetAccounts.length > 0) {
          const defaultAccount = getDefaultFixedAssetAccount(formData.category, assetAccounts);
          setFormData(prev => ({
            ...prev,
            fixedAssetAccountCode: defaultAccount
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chart of accounts',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Get default fixed asset account based on category
  const getDefaultFixedAssetAccount = (category, accounts) => {
    if (!accounts || accounts.length === 0) return '';

    // Map category to account code pattern
    const categoryMapping = {
      'equipment': ['1501', '1502'],  // Mesin Boring, Mesin Sondir
      'vehicle': ['1503'],           // Kendaraan Operasional
      'building': ['1505'],          // Bangunan Kantor
      'furniture': ['1504'],         // Peralatan Kantor
    };

    const codePatterns = categoryMapping[category] || ['1501']; // Default to Mesin Boring
    
    // Find matching account
    for (const pattern of codePatterns) {
      const matchingAccount = accounts.find(account => account.code === pattern);
      if (matchingAccount) return matchingAccount.code;
    }

    // If no match found, return first fixed asset account
    return accounts[0].code;
  };

  // Set form data when editing an existing asset
  useEffect(() => {
    if (asset) {
      // Format date from ISO string to YYYY-MM-DD for input
      const formattedDate = asset.acquisitionDate 
        ? new Date(asset.acquisitionDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      setFormData({
        assetName: asset.assetName || '',
        category: asset.category || 'equipment',
        acquisitionDate: formattedDate,
        value: asset.value ? asset.value.toString() : '',
        usefulLife: asset.usefulLife ? asset.usefulLife.toString() : '',
        description: asset.description || '',
        location: asset.location || '',
        assetTag: asset.assetTag || '',
        accumulatedDepreciation: asset.accumulatedDepreciation ? asset.accumulatedDepreciation.toString() : '0',
        bookValue: asset.bookValue ? asset.bookValue.toString() : '0',
        // Accounting fields are disabled when editing
        fixedAssetAccountCode: '',
        paymentAccountCode: '1102',
        createAccountingEntry: false,
        transactionDescription: `Adjustment for ${asset.assetName}`,
      });
      
      // Show depreciation fields when editing
      setShowDepreciationFields(true);
    } else {
      setFormData({
        ...initialFormData,
        transactionDescription: 'Purchase of fixed asset'
      });
      setShowDepreciationFields(false);
    }
    
    setErrors({});
  }, [asset]);

  // Update fixed asset account when category changes
  useEffect(() => {
    if (formData.category && fixedAssetAccounts.length > 0) {
      const defaultAccount = getDefaultFixedAssetAccount(formData.category, fixedAssetAccounts);
      setFormData(prev => ({
        ...prev,
        fixedAssetAccountCode: defaultAccount
      }));
    }
  }, [formData.category, fixedAssetAccounts]);

  // Calculate book value when value or accumulated depreciation changes
  useEffect(() => {
    if (formData.value && formData.accumulatedDepreciation) {
      const value = parseFloat(formData.value) || 0;
      const accumulatedDepreciation = parseFloat(formData.accumulatedDepreciation) || 0;
      const bookValue = Math.max(0, value - accumulatedDepreciation);
      
      setFormData(prev => ({
        ...prev,
        bookValue: bookValue.toString()
      }));
    }
  }, [formData.value, formData.accumulatedDepreciation]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }

    // Update transaction description when asset name changes
    if (name === 'assetName' && !asset) {
      setFormData(prev => ({
        ...prev,
        transactionDescription: `Purchase of fixed asset: ${value}`
      }));
    }
  };

  // Handle number input changes
  const handleNumberChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  // Toggle depreciation fields
  const toggleDepreciationFields = () => {
    setShowDepreciationFields(!showDepreciationFields);
    
    // Reset depreciation fields when hiding
    if (showDepreciationFields) {
      setFormData(prev => ({
        ...prev,
        accumulatedDepreciation: '0',
        bookValue: prev.value
      }));
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.assetName || formData.assetName.trim() === '') {
      newErrors.assetName = 'Asset name is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.acquisitionDate) {
      newErrors.acquisitionDate = 'Acquisition date is required';
    }
    
    if (!formData.value || isNaN(Number(formData.value)) || Number(formData.value) <= 0) {
      newErrors.value = 'Value must be a positive number';
    }
    
    if (!formData.usefulLife || isNaN(Number(formData.usefulLife)) || Number(formData.usefulLife) <= 0) {
      newErrors.usefulLife = 'Useful life must be a positive number';
    }
    
    if (showDepreciationFields) {
      if (isNaN(Number(formData.accumulatedDepreciation)) || Number(formData.accumulatedDepreciation) < 0) {
        newErrors.accumulatedDepreciation = 'Accumulated depreciation must be a non-negative number';
      }
      
      if (Number(formData.accumulatedDepreciation) > Number(formData.value)) {
        newErrors.accumulatedDepreciation = 'Accumulated depreciation cannot exceed the asset value';
      }
    }

    // Validate accounting fields if creating accounting entry
    if (formData.createAccountingEntry && !asset) {
      if (!formData.fixedAssetAccountCode) {
        newErrors.fixedAssetAccountCode = 'Fixed asset account is required';
      }
      
      if (!formData.paymentAccountCode) {
        newErrors.paymentAccountCode = 'Payment account is required';
      }
      
      if (!formData.transactionDescription || formData.transactionDescription.trim() === '') {
        newErrors.transactionDescription = 'Transaction description is required';
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
        description: 'Please check the form for errors.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to perform this action.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Prepare data for submission
    const assetData = {
      assetName: formData.assetName,
      category: formData.category,
      acquisitionDate: formData.acquisitionDate,
      value: parseFloat(formData.value),
      usefulLife: parseInt(formData.usefulLife),
      description: formData.description,
      location: formData.location,
      assetTag: formData.assetTag,
      accumulatedDepreciation: parseFloat(formData.accumulatedDepreciation),
      bookValue: parseFloat(formData.bookValue),
    };

    // Add accounting data if creating entry
    if (formData.createAccountingEntry && !asset) {
      assetData.accounting = {
        fixedAssetAccountCode: formData.fixedAssetAccountCode,
        paymentAccountCode: formData.paymentAccountCode,
        transactionDescription: formData.transactionDescription
      };
    }
    
    try {
      let response;
      
      if (asset) {
        // Update existing asset
        response = await axios.put(
          `/api/assets/${asset.id}`,
          assetData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        // Create new asset
        response = await axios.post(
          '/api/assets',
          assetData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: asset ? 'Asset updated successfully' : 'Asset created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Reset form
        setFormData(initialFormData);
        setErrors({});
        
        // Close modal and notify parent
        onClose();
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to save asset',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving asset:', error);
      
      let errorMessage = 'Failed to save asset';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get account name by code
  const getAccountName = (code) => {
    const account = accounts.find(acc => acc.code === code);
    return account ? `${account.name} (${account.code})` : code;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{asset ? 'Edit Fixed Asset' : 'Add New Fixed Asset'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={errors.assetName}>
              <FormLabel>Asset Name</FormLabel>
              <Input
                name="assetName"
                value={formData.assetName}
                onChange={handleChange}
                placeholder="Enter asset name"
              />
              {errors.assetName && <FormErrorMessage>{errors.assetName}</FormErrorMessage>}
            </FormControl>

            <FormControl isRequired isInvalid={errors.category}>
              <FormLabel>Category</FormLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                {ASSET_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Select>
              {errors.category && <FormErrorMessage>{errors.category}</FormErrorMessage>}
            </FormControl>

            <FormControl isRequired isInvalid={errors.acquisitionDate}>
              <FormLabel>Acquisition Date</FormLabel>
              <Input
                name="acquisitionDate"
                type="date"
                value={formData.acquisitionDate}
                onChange={handleChange}
              />
              {errors.acquisitionDate && <FormErrorMessage>{errors.acquisitionDate}</FormErrorMessage>}
            </FormControl>

            <FormControl isRequired isInvalid={errors.value}>
              <FormLabel>Value</FormLabel>
              <InputGroup>
                <InputLeftAddon>Rp</InputLeftAddon>
                <NumberInput
                  min={0}
                  value={formData.value}
                  onChange={(value) => handleNumberChange('value', value)}
                  width="100%"
                >
                  <NumberInputField borderLeftRadius={0} placeholder="Enter asset value" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </InputGroup>
              {errors.value && <FormErrorMessage>{errors.value}</FormErrorMessage>}
            </FormControl>

            <FormControl isRequired isInvalid={errors.usefulLife}>
              <FormLabel>Useful Life (years)</FormLabel>
              <NumberInput
                min={1}
                value={formData.usefulLife}
                onChange={(value) => handleNumberChange('usefulLife', value)}
              >
                <NumberInputField placeholder="Enter useful life in years" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {errors.usefulLife && <FormErrorMessage>{errors.usefulLife}</FormErrorMessage>}
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter description (optional)"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Location</FormLabel>
              <Input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter location (optional)"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Asset Tag</FormLabel>
              <Input
                name="assetTag"
                value={formData.assetTag}
                onChange={handleChange}
                placeholder="Enter asset tag (optional)"
              />
            </FormControl>

            <Box>
              <Button
                size="sm"
                onClick={toggleDepreciationFields}
                colorScheme={showDepreciationFields ? "blue" : "gray"}
                variant="outline"
                mb={2}
              >
                {showDepreciationFields ? "Hide Depreciation Fields" : "Show Depreciation Fields"}
              </Button>

              {showDepreciationFields && (
                <VStack spacing={4} align="stretch" mt={2} p={4} bg="gray.50" borderRadius="md">
                  <FormControl isInvalid={errors.accumulatedDepreciation}>
                    <FormLabel>Accumulated Depreciation</FormLabel>
                    <InputGroup>
                      <InputLeftAddon>Rp</InputLeftAddon>
                      <NumberInput
                        min={0}
                        max={parseFloat(formData.value) || 0}
                        value={formData.accumulatedDepreciation}
                        onChange={(value) => handleNumberChange('accumulatedDepreciation', value)}
                        width="100%"
                      >
                        <NumberInputField borderLeftRadius={0} />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </InputGroup>
                    {errors.accumulatedDepreciation && <FormErrorMessage>{errors.accumulatedDepreciation}</FormErrorMessage>}
                  </FormControl>

                  <FormControl>
                    <FormLabel>Book Value</FormLabel>
                    <InputGroup>
                      <InputLeftAddon>Rp</InputLeftAddon>
                      <Input
                        value={formatCurrency(formData.bookValue).replace('Rp ', '')}
                        isReadOnly
                        bg="gray.100"
                      />
                    </InputGroup>
                    <FormHelperText>Calculated automatically (Value - Accumulated Depreciation)</FormHelperText>
                  </FormControl>
                </VStack>
              )}
            </Box>

            {/* Accounting Integration Section - Only show for new assets */}
            {!asset && (
              <Accordion allowToggle defaultIndex={[0]} mt={4}>
                <AccordionItem>
                  <h2>
                    <AccordionButton>
                      <Box as="span" flex='1' textAlign='left'>
                        <Heading size="sm">Accounting Integration</Heading>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                  </h2>
                  <AccordionPanel pb={4}>
                    <VStack spacing={4} align="stretch">
                      <FormControl display="flex" alignItems="center">
                        <FormLabel htmlFor="create-accounting" mb="0">
                          Create accounting entry
                        </FormLabel>
                        <Switch
                          id="create-accounting"
                          isChecked={formData.createAccountingEntry}
                          onChange={() => setFormData(prev => ({
                            ...prev,
                            createAccountingEntry: !prev.createAccountingEntry
                          }))}
                        />
                      </FormControl>

                      {formData.createAccountingEntry && (
                        <>
                          <Alert status="info" borderRadius="md">
                            <AlertIcon />
                            This will create double-entry accounting transactions for this fixed asset
                          </Alert>

                          <FormControl isRequired isInvalid={errors.fixedAssetAccountCode}>
                            <FormLabel>Fixed Asset Account (Debit)</FormLabel>
                            <Select
                              name="fixedAssetAccountCode"
                              value={formData.fixedAssetAccountCode}
                              onChange={handleChange}
                            >
                              <option value="">Select account</option>
                              {fixedAssetAccounts.map(account => (
                                <option key={account.code} value={account.code}>
                                  {account.name} ({account.code})
                                </option>
                              ))}
                            </Select>
                            {errors.fixedAssetAccountCode && <FormErrorMessage>{errors.fixedAssetAccountCode}</FormErrorMessage>}
                          </FormControl>

                          <FormControl isRequired isInvalid={errors.paymentAccountCode}>
                            <FormLabel>Payment Account (Credit)</FormLabel>
                            <Select
                              name="paymentAccountCode"
                              value={formData.paymentAccountCode}
                              onChange={handleChange}
                            >
                              <option value="">Select account</option>
                              {paymentAccounts.map(account => (
                                <option key={account.code} value={account.code}>
                                  {account.name} ({account.code})
                                </option>
                              ))}
                            </Select>
                            {errors.paymentAccountCode && <FormErrorMessage>{errors.paymentAccountCode}</FormErrorMessage>}
                          </FormControl>

                          <FormControl isRequired isInvalid={errors.transactionDescription}>
                            <FormLabel>Transaction Description</FormLabel>
                            <Input
                              name="transactionDescription"
                              value={formData.transactionDescription}
                              onChange={handleChange}
                              placeholder="Enter transaction description"
                            />
                            {errors.transactionDescription && <FormErrorMessage>{errors.transactionDescription}</FormErrorMessage>}
                          </FormControl>

                          <Box p={3} bg="gray.50" borderRadius="md">
                            <Text fontWeight="bold">Transaction Preview:</Text>
                            <Text mt={2}>Debit: {getAccountName(formData.fixedAssetAccountCode)} {formData.value ? formatCurrency(formData.value) : ''}</Text>
                            <Text>Credit: {getAccountName(formData.paymentAccountCode)} {formData.value ? formatCurrency(formData.value) : ''}</Text>
                          </Box>
                        </>
                      )}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText={asset ? "Updating..." : "Saving..."}
          >
            {asset ? 'Update Asset' : 'Save Asset'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FixedAssetForm; 