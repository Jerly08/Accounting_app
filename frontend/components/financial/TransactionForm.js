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
  Textarea,
  useToast,
  Divider,
  Text,
  Box,
  Alert,
  AlertIcon,
  HStack,
  Radio,
  RadioGroup,
  Stack,
  Badge,
  Switch,
  Collapse,
  Flex,
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const TransactionForm = ({ 
  isOpen, 
  onClose, 
  transaction = null, 
  onSubmitSuccess,
  accounts = [],
  projects = []
}) => {
  const initialFormData = {
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    accountCode: '',
    counterAccountCode: '',
    projectId: '',
    description: '',
    amount: '',
    notes: '',
    createCounterEntry: true, // For automatic counter transactions
    isRecurring: false,
    recurringFrequency: 'monthly',
    recurringCount: '3',
    recurringEndDate: '',
    category: '' // Tambahkan field kategori transaksi
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccountsLoading, setIsAccountsLoading] = useState(false); // Tambahkan state loading
  const [accountsByType, setAccountsByType] = useState({
    income: [],
    expense: [],
    asset: [],
    liability: [],
    contraAsset: [],
    equity: []
  });
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();

  // Group accounts by type
  useEffect(() => {
    try {
      setIsAccountsLoading(true);
      const grouped = {
        income: accounts.filter(acc => acc.type === 'Pendapatan'),
        expense: accounts.filter(acc => acc.type === 'Beban'),
        asset: accounts.filter(acc => acc.type === 'Aktiva' || acc.type === 'Aset Tetap'),
        contraAsset: accounts.filter(acc => acc.type === 'Kontra Aset'),
        liability: accounts.filter(acc => acc.type === 'Kewajiban'),
        equity: accounts.filter(acc => acc.type === 'Ekuitas')
      };
      setAccountsByType(grouped);
    } catch (error) {
      console.error('Error grouping accounts:', error);
    } finally {
      setIsAccountsLoading(false);
    }
  }, [accounts]);

  // Set form data when editing an existing transaction
  useEffect(() => {
    if (transaction) {
      // Format date from ISO string to YYYY-MM-DD for input
      const formattedDate = transaction.date 
        ? new Date(transaction.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      setFormData({
        date: formattedDate,
        type: transaction.type || 'expense',
        accountCode: transaction.accountCode || '',
        counterAccountCode: transaction.counterAccountCode || '',
        projectId: transaction.projectId ? transaction.projectId.toString() : '',
        description: transaction.description || '',
        amount: transaction.amount ? transaction.amount.toString() : '',
        notes: transaction.notes || '',
        createCounterEntry: true,
        isRecurring: transaction.isRecurring || false,
        recurringFrequency: transaction.recurringFrequency || 'monthly',
        recurringCount: transaction.recurringCount || '3',
        recurringEndDate: transaction.recurringEndDate || '',
        category: transaction.category || ''
      });
    } else {
      setFormData(initialFormData);
    }
    
    setErrors({});
  }, [transaction, isOpen]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for transaction type change
    if (name === 'type') {
      // Reset account selection when changing transaction type
      setFormData({ 
        ...formData, 
        [name]: value, 
        accountCode: '',
        counterAccountCode: '',
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  // Handle radio button changes
  const handleRadioChange = (name, value) => {
    setFormData({ ...formData, [name]: value === 'true' });
  };

  // Handle number input changes
  const handleNumberChange = (name, value) => {
    // Remove any non-numeric characters
    let numericValue = value.toString().replace(/[^\d]/g, '');
    
    // Ensure it's not empty or zero
    if (numericValue === '' || parseInt(numericValue) === 0) {
      numericValue = '';
    }
    
    setFormData({ ...formData, [name]: numericValue });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
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

  // Get account name by code
  const getAccountName = (code) => {
    const account = accounts.find(a => a.code === code);
    return account ? account.name : '';
  };

  // Generate transaction description based on type and selected accounts
  const generateDescription = () => {
    if (!formData.accountCode) return '';
    
    const accountName = getAccountName(formData.accountCode);
    
    if (formData.type === 'income') {
      return `Receipt to ${accountName}`;
    }
    
    if (formData.type === 'expense') {
      return `Payment from ${accountName}`;
    }
    
    return '';
  };

  // Suggest description when account changes
  useEffect(() => {
    if (formData.accountCode && !transaction) {
      const suggestedDesc = generateDescription();
      if (suggestedDesc && !formData.description) {
        setFormData(prev => ({
          ...prev,
          description: suggestedDesc
        }));
      }
    }
  }, [formData.accountCode, formData.type]);

  // Suggest counter account based on transaction type and primary account
  const suggestCounterAccount = () => {
    if (!formData.accountCode || !formData.createCounterEntry) {
      return '';
    }
    
    const selectedAccount = accounts.find(acc => acc.code === formData.accountCode);
    if (!selectedAccount) return '';
    
    // Get account type
    const accountType = selectedAccount.type;
    
    // Logic for suggesting counter accounts based on accounting principles
    if (formData.type === 'income') {
      // For income transactions:
      if (accountType === 'Pendapatan') {
        // If primary is income account, suggest an asset account (typically cash/bank)
        const cashAccount = accountsByType.asset.find(acc => acc.code === '1101'); // Kas
        const bankAccount = accountsByType.asset.find(acc => acc.code === '1102'); // Bank BCA
        return cashAccount?.code || bankAccount?.code || (accountsByType.asset[0]?.code || '');
      } else if (accountType === 'Aktiva' || accountType === 'Aset Tetap') {
        // If primary is asset account, suggest an income account
        return accountsByType.income[0]?.code || '';
      }
    } else if (formData.type === 'expense') {
      // For expense transactions:
      if (accountType === 'Beban') {
        // If primary is expense account, suggest an asset account (typically cash/bank)
        const cashAccount = accountsByType.asset.find(acc => acc.code === '1101'); // Kas
        const bankAccount = accountsByType.asset.find(acc => acc.code === '1102'); // Bank BCA
        return cashAccount?.code || bankAccount?.code || (accountsByType.asset[0]?.code || '');
      } else if (accountType === 'Aktiva' || accountType === 'Aset Tetap') {
        // If primary is asset account, suggest an expense account
        return accountsByType.expense[0]?.code || '';
      } else if (accountType === 'Kewajiban') {
        // If primary is liability, suggest an expense account
        return accountsByType.expense[0]?.code || '';
      }
    }
    
    // Default fallback - try to find a logical counter account
    if (accountType === 'Aktiva' || accountType === 'Aset Tetap') {
      return accountsByType.liability[0]?.code || accountsByType.equity[0]?.code || '';
    } else if (accountType === 'Kewajiban') {
      return accountsByType.asset[0]?.code || '';
    } else if (accountType === 'Ekuitas') {
      return accountsByType.asset[0]?.code || '';
    } else if (accountType === 'Kontra Aset') {
      return accountsByType.expense[0]?.code || '';
    }
    
    return '';
  };

  // Update counter account suggestion when account or type changes
  useEffect(() => {
    if (formData.accountCode && formData.createCounterEntry) {
      const suggestedCode = suggestCounterAccount();
      if (suggestedCode && !formData.counterAccountCode) {
        setFormData(prev => ({
          ...prev,
          counterAccountCode: suggestedCode
        }));
      }
    }
  }, [formData.accountCode, formData.type, formData.createCounterEntry, accounts]);

  // Calculate end date based on frequency and count
  const calculateEndDate = () => {
    if (!formData.date || !formData.recurringCount || !formData.recurringFrequency) {
      return '';
    }
    
    const startDate = new Date(formData.date);
    const count = parseInt(formData.recurringCount);
    
    let endDate = new Date(startDate);
    
    switch (formData.recurringFrequency) {
      case 'daily':
        endDate.setDate(startDate.getDate() + count);
        break;
      case 'weekly':
        endDate.setDate(startDate.getDate() + (count * 7));
        break;
      case 'monthly':
        endDate.setMonth(startDate.getMonth() + count);
        break;
      case 'quarterly':
        endDate.setMonth(startDate.getMonth() + (count * 3));
        break;
      case 'yearly':
        endDate.setFullYear(startDate.getFullYear() + count);
        break;
      default:
        endDate.setMonth(startDate.getMonth() + count);
    }
    
    return endDate.toISOString().split('T')[0];
  };

  // Validate form data with improved validations
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.date) {
      newErrors.date = 'Tanggal transaksi wajib diisi';
    }
    
    if (!formData.type) {
      newErrors.type = 'Tipe transaksi wajib dipilih';
    }
    
    if (!formData.accountCode) {
      newErrors.accountCode = 'Akun wajib dipilih';
    }
    
    if (formData.createCounterEntry && !formData.counterAccountCode) {
      newErrors.counterAccountCode = 'Akun lawan wajib dipilih untuk double-entry';
    }
    
    if (formData.createCounterEntry && formData.accountCode === formData.counterAccountCode) {
      newErrors.counterAccountCode = 'Akun lawan harus berbeda dengan akun utama';
    }
    
    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Deskripsi transaksi wajib diisi';
    }
    
    if (!formData.amount || formData.amount === '0' || parseInt(formData.amount) <= 0) {
      newErrors.amount = 'Jumlah harus lebih besar dari 0';
    }
    
    // Validasi spesifik untuk transaksi dengan double-entry
    if (formData.createCounterEntry && formData.accountCode && formData.counterAccountCode) {
      const validationResult = validateAccountCombination();
      if (!validationResult.valid) {
        newErrors.counterAccountCode = validationResult.message;
      }
    }
    
    // Validasi untuk transaksi berulang
    if (formData.isRecurring) {
      if (!formData.recurringFrequency) {
        newErrors.recurringFrequency = 'Frekuensi pengulangan wajib dipilih';
      }
      
      if (!formData.recurringCount || parseInt(formData.recurringCount) <= 0) {
        newErrors.recurringCount = 'Jumlah pengulangan harus lebih besar dari 0';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validasi kombinasi akun berdasarkan COA
  const validateAccountCombination = () => {
    if (!formData.accountCode || !formData.counterAccountCode) return { valid: true };
    
    const account = accounts.find(acc => acc.code === formData.accountCode);
    const counterAccount = accounts.find(acc => acc.code === formData.counterAccountCode);
    
    if (!account || !counterAccount) return { valid: true };
    
    // Validasi untuk transaksi income
    if (formData.type === 'income') {
      // Jika debit bukan aktiva/aset tetap dan kredit bukan pendapatan
      if (
        (account.type !== 'Aktiva' && account.type !== 'Aset Tetap') &&
        counterAccount.type !== 'Pendapatan'
      ) {
        return {
          valid: false,
          message: "Kombinasi tidak lazim: Transaksi pendapatan biasanya mendebit akun Aktiva dan mengkredit akun Pendapatan"
        };
      }
      
      // Jika kredit adalah akun beban
      if (counterAccount.type === 'Beban') {
        return {
          valid: false,
          message: "Kombinasi tidak lazim: Akun Beban tidak seharusnya dikredit dalam transaksi pendapatan"
        };
      }
    }
    
    // Validasi untuk transaksi expense
    if (formData.type === 'expense') {
      // Jika debit bukan beban dan kredit bukan aktiva/aset tetap/kewajiban
      if (
        account.type !== 'Beban' && 
        (counterAccount.type !== 'Aktiva' && 
         counterAccount.type !== 'Aset Tetap' && 
         counterAccount.type !== 'Kewajiban')
      ) {
        return {
          valid: false,
          message: "Kombinasi tidak lazim: Transaksi beban biasanya mendebit akun Beban dan mengkredit akun Aktiva atau Kewajiban"
        };
      }
      
      // Jika kredit adalah akun pendapatan
      if (counterAccount.type === 'Pendapatan') {
        return {
          valid: false,
          message: "Kombinasi tidak lazim: Akun Pendapatan tidak seharusnya dikredit dalam transaksi beban"
        };
      }
    }
    
    return { valid: true };
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
    
    if (!token || !isAuthenticated) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to perform this action',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const transactionData = {
        date: formData.date,
        type: formData.type,
        accountCode: formData.accountCode,
        description: formData.description,
        amount: parseFloat(formData.amount),
        projectId: formData.projectId ? parseInt(formData.projectId) : null,
        notes: formData.notes || undefined,
        createCounterEntry: formData.createCounterEntry,
        counterAccountCode: formData.counterAccountCode || undefined,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
        recurringCount: formData.isRecurring ? parseInt(formData.recurringCount) : undefined,
        recurringEndDate: formData.isRecurring && formData.recurringEndDate ? formData.recurringEndDate : undefined,
        category: formData.category || undefined
      };
      
      let response;
      
      if (transaction) {
        // Update existing transaction
        transactionData.updateCounterEntry = formData.createCounterEntry;
        
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${transaction.id}`,
          transactionData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        toast({
          title: 'Success',
          description: formData.createCounterEntry 
            ? 'Double-entry transaction successfully updated' 
            : 'Transaction successfully updated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new transaction
        response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/transactions`,
          transactionData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        toast({
          title: 'Success',
          description: formData.createCounterEntry 
            ? 'Double-entry transaction successfully created' 
            : 'Transaction successfully created',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      if (onSubmitSuccess) {
        onSubmitSuccess(response.data);
      }
      
      // Reset form after successful submission if creating new transaction
      if (!transaction) {
        setFormData({
          ...initialFormData,
          type: formData.type, // Keep the selected transaction type
          projectId: formData.projectId, // Keep the selected project
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting transaction:', error);
      
      if (error.response?.status === 401) {
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please login again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else if (error.response?.data?.errors) {
        // Set validation errors from API
        const apiErrors = {};
        error.response.data.errors.forEach(err => {
          apiErrors[err.field] = err.message;
        });
        setErrors(apiErrors);
        
        toast({
          title: 'Validation Error',
          description: 'Please check the form for errors',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to submit transaction';
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render account options based on transaction type
  const renderAccountOptions = () => {
    if (isAccountsLoading) {
      return [<option key="loading" value="">Loading accounts...</option>];
    }
    
    let filteredAccounts = [];
    
    if (formData.type === 'income') {
      // For income, show asset accounts first, then income accounts
      filteredAccounts = [
        ...accountsByType.asset, 
        ...accountsByType.income
      ];
    } else if (formData.type === 'expense') {
      // For expense, show expense accounts first, then asset and liability accounts
      filteredAccounts = [
        ...accountsByType.expense, 
        ...accountsByType.asset,
        ...accountsByType.liability
      ];
    } else {
      // For other types or fallback, show all accounts
      filteredAccounts = [
        ...accountsByType.asset,
        ...accountsByType.contraAsset,
        ...accountsByType.liability,
        ...accountsByType.equity,
        ...accountsByType.income,
        ...accountsByType.expense
      ];
    }
    
    if (filteredAccounts.length === 0) {
      return [<option key="none" value="">No accounts available</option>];
    }
    
    return filteredAccounts.map((account) => (
      <option key={account.code} value={account.code}>
        {account.code} - {account.name}
      </option>
    ));
  };

  // Kategori transaksi berdasarkan COA
  const getTransactionCategories = () => {
    if (formData.type === 'income') {
      return [
        { value: 'boring', label: 'Jasa Boring', account: '4001' },
        { value: 'sondir', label: 'Jasa Sondir', account: '4002' },
        { value: 'consultation', label: 'Jasa Konsultasi', account: '4003' },
        { value: 'other_income', label: 'Pendapatan Lainnya', account: '' }
      ];
    } else {
      return [
        { value: 'project_material', label: 'Beban Proyek - Material', account: '5101' },
        { value: 'project_labor', label: 'Beban Proyek - Tenaga Kerja', account: '5102' },
        { value: 'project_equipment', label: 'Beban Proyek - Sewa Peralatan', account: '5103' },
        { value: 'project_transportation', label: 'Beban Proyek - Transportasi', account: '5104' },
        { value: 'project_other', label: 'Beban Proyek - Lain-lain', account: '5105' },
        { value: 'operational', label: 'Beban Operasional Kantor', account: '6101' },
        { value: 'salary', label: 'Beban Gaji & Tunjangan', account: '6102' },
        { value: 'utility', label: 'Beban Listrik & Air', account: '6103' },
        { value: 'communication', label: 'Beban Internet & Telekomunikasi', account: '6104' },
        { value: 'depreciation', label: 'Beban Penyusutan', account: '6105' },
        { value: 'other_expense', label: 'Beban Lainnya', account: '' }
      ];
    }
  };

  // Set account code based on selected category
  useEffect(() => {
    if (formData.category && !transaction) {
      const categories = getTransactionCategories();
      const selectedCategory = categories.find(cat => cat.value === formData.category);
      
      if (selectedCategory && selectedCategory.account && !formData.accountCode) {
        setFormData(prev => ({
          ...prev,
          accountCode: selectedCategory.account
        }));
      }
    }
  }, [formData.category, formData.type]);

  // Template transaksi umum berdasarkan COA
  const applyTemplate = (templateName) => {
    switch(templateName) {
      case 'salaryPayment':
        setFormData({
          ...formData,
          type: 'expense',
          accountCode: '6102', // Beban Gaji & Tunjangan
          counterAccountCode: '1102', // Bank BCA
          description: 'Pembayaran Gaji Karyawan',
          category: 'salary'
        });
        break;
      case 'officeExpense':
        setFormData({
          ...formData,
          type: 'expense',
          accountCode: '6101', // Beban Operasional Kantor
          counterAccountCode: '1101', // Kas
          description: 'Biaya Operasional Kantor',
          category: 'operational'
        });
        break;
      case 'boringService':
        setFormData({
          ...formData,
          type: 'income',
          accountCode: '1102', // Bank BCA
          counterAccountCode: '4001', // Pendapatan Jasa Boring
          description: 'Pendapatan Jasa Boring',
          category: 'boring'
        });
        break;
      case 'sondirService':
        setFormData({
          ...formData,
          type: 'income',
          accountCode: '1102', // Bank BCA
          counterAccountCode: '4002', // Pendapatan Jasa Sondir
          description: 'Pendapatan Jasa Sondir',
          category: 'sondir'
        });
        break;
      case 'projectMaterial':
        setFormData({
          ...formData,
          type: 'expense',
          accountCode: '5101', // Beban Proyek - Material
          counterAccountCode: '1102', // Bank BCA
          description: 'Pembelian Material Proyek',
          category: 'project_material'
        });
        break;
      default:
        break;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {transaction ? 'Edit Transaction' : 'Add New Transaction'}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} as="form" onSubmit={handleSubmit}>
            {/* Transaction Templates */}
            {!transaction && (
              <Box mb={4} w="100%">
                <Text fontWeight="bold" mb={2}>Template Transaksi Umum:</Text>
                <Flex wrap="wrap" gap={2}>
                  <Button size="sm" colorScheme="green" variant="outline" onClick={() => applyTemplate('boringService')}>
                    Jasa Boring
                  </Button>
                  <Button size="sm" colorScheme="green" variant="outline" onClick={() => applyTemplate('sondirService')}>
                    Jasa Sondir
                  </Button>
                  <Button size="sm" colorScheme="red" variant="outline" onClick={() => applyTemplate('salaryPayment')}>
                    Gaji Karyawan
                  </Button>
                  <Button size="sm" colorScheme="red" variant="outline" onClick={() => applyTemplate('officeExpense')}>
                    Biaya Operasional
                  </Button>
                  <Button size="sm" colorScheme="red" variant="outline" onClick={() => applyTemplate('projectMaterial')}>
                    Material Proyek
                  </Button>
                </Flex>
              </Box>
            )}
            
            {/* Transaction Type Selection with improved UI */}
            <FormControl isRequired isInvalid={!!errors.type}>
              <FormLabel>Tipe Transaksi</FormLabel>
              <HStack spacing={4} width="100%">
                <Box 
                  flex={1}
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  borderColor={formData.type === 'income' ? "green.500" : "gray.200"}
                  bg={formData.type === 'income' ? "green.50" : "white"}
                  cursor="pointer"
                  onClick={() => handleChange({ target: { name: 'type', value: 'income' } })}
                  _hover={{ borderColor: 'green.300' }}
                >
                  <VStack>
                    <Badge colorScheme="green" p={2} borderRadius="md" fontSize="md">
                      PENDAPATAN
                    </Badge>
                    <Text fontSize="sm">Penerimaan uang</Text>
                  </VStack>
                </Box>
                
                <Box 
                  flex={1}
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  borderColor={formData.type === 'expense' ? "red.500" : "gray.200"}
                  bg={formData.type === 'expense' ? "red.50" : "white"}
                  cursor="pointer"
                  onClick={() => handleChange({ target: { name: 'type', value: 'expense' } })}
                  _hover={{ borderColor: 'red.300' }}
                >
                  <VStack>
                    <Badge colorScheme="red" p={2} borderRadius="md" fontSize="md">
                      BEBAN
                    </Badge>
                    <Text fontSize="sm">Pengeluaran uang</Text>
                  </VStack>
                </Box>
              </HStack>
              {errors.type && <FormErrorMessage>{errors.type}</FormErrorMessage>}
            </FormControl>
            
            {/* Date Selection */}
            <FormControl isRequired isInvalid={!!errors.date}>
              <FormLabel>Tanggal Transaksi</FormLabel>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
              />
              {errors.date && <FormErrorMessage>{errors.date}</FormErrorMessage>}
            </FormControl>
            
            {/* Transaction Category */}
            <FormControl>
              <FormLabel>Kategori Transaksi</FormLabel>
              <Select
                name="category"
                placeholder="Pilih kategori"
                value={formData.category || ''}
                onChange={handleChange}
              >
                {getTransactionCategories().map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Select>
              <FormHelperText>
                Kategorikan transaksi untuk pelaporan yang lebih baik
              </FormHelperText>
            </FormControl>
            
            {/* Account Selection with loading state */}
            <FormControl isRequired isInvalid={!!errors.accountCode}>
              <FormLabel>Akun {formData.type === 'income' ? '(Debit)' : '(Debit)'}</FormLabel>
              <Select
                name="accountCode"
                placeholder={isAccountsLoading ? "Loading..." : "Pilih akun"}
                value={formData.accountCode}
                onChange={handleChange}
                isDisabled={isAccountsLoading}
              >
                {renderAccountOptions()}
              </Select>
              {errors.accountCode && <FormErrorMessage>{errors.accountCode}</FormErrorMessage>}
              <FormHelperText>
                {formData.type === 'income' 
                  ? 'Untuk transaksi pendapatan, pilih akun kas/bank yang akan bertambah'
                  : 'Untuk transaksi beban, pilih akun beban yang sesuai'}
              </FormHelperText>
            </FormControl>
            
            {/* Double Entry Option */}
            <FormControl>
              <FormLabel>Double-Entry Accounting</FormLabel>
              <HStack spacing={4} width="100%">
                <Box 
                  flex={1}
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  borderColor={formData.createCounterEntry ? "blue.500" : "gray.200"}
                  bg={formData.createCounterEntry ? "blue.50" : "white"}
                  cursor="pointer"
                  onClick={() => handleRadioChange('createCounterEntry', 'true')}
                  _hover={{ borderColor: 'blue.300' }}
                >
                  <VStack>
                    <Text fontWeight="bold">Aktifkan</Text>
                    <Text fontSize="sm">Otomatis membuat entry lawan</Text>
                  </VStack>
                </Box>
                
                <Box 
                  flex={1}
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  borderColor={!formData.createCounterEntry ? "gray.500" : "gray.200"}
                  bg={!formData.createCounterEntry ? "gray.50" : "white"}
                  cursor="pointer"
                  onClick={() => handleRadioChange('createCounterEntry', 'false')}
                  _hover={{ borderColor: 'gray.400' }}
                >
                  <VStack>
                    <Text fontWeight="bold">Non-aktifkan</Text>
                    <Text fontSize="sm">Transaksi tunggal (tidak disarankan)</Text>
                  </VStack>
                </Box>
              </HStack>
              <FormHelperText>
                Aktifkan untuk otomatis membuat counter-entry sesuai prinsip double-entry accounting
              </FormHelperText>
            </FormControl>
            
            {/* Counter Account Selection - Only shown when double entry is enabled */}
            {formData.createCounterEntry && (
              <>
                <FormControl isInvalid={!!errors.counterAccountCode}>
                  <FormLabel>Akun Lawan {formData.type === 'income' ? '(Credit)' : '(Credit)'}</FormLabel>
                  <Select
                    name="counterAccountCode"
                    placeholder={isAccountsLoading ? "Loading..." : "Pilih akun lawan (otomatis disarankan jika kosong)"}
                    value={formData.counterAccountCode}
                    onChange={handleChange}
                    isDisabled={isAccountsLoading}
                  >
                    {accounts.map((account) => (
                      <option key={account.code} value={account.code}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </Select>
                  {errors.counterAccountCode && <FormErrorMessage>{errors.counterAccountCode}</FormErrorMessage>}
                  <FormHelperText>
                    {formData.type === 'income' 
                      ? 'Untuk transaksi pendapatan, pilih akun pendapatan yang sesuai'
                      : 'Untuk transaksi beban, pilih akun kas/bank yang akan berkurang'}
                  </FormHelperText>
                </FormControl>

                {/* Enhanced Transaction Preview */}
                {formData.accountCode && formData.counterAccountCode && formData.amount && (
                  <Box p={4} bg="blue.50" borderRadius="md" mt={2} width="100%">
                    <Flex justify="space-between" mb={2}>
                      <Text fontWeight="bold">Preview Double-Entry:</Text>
                      <Badge colorScheme="blue">Transaksi Seimbang</Badge>
                    </Flex>
                    
                    <Box p={3} bg="white" borderRadius="md" mb={3}>
                      <Text fontWeight="medium">{formData.date || new Date().toISOString().split('T')[0]}</Text>
                      <Divider my={2} />
                      
                      <Flex align="center" mb={2}>
                        <Badge colorScheme="green" mr={2}>DEBIT</Badge>
                        <Box flex={1}>
                          <Text fontWeight="medium">{getAccountName(formData.accountCode)}</Text>
                          <Text fontSize="xs" color="gray.500">{formData.accountCode}</Text>
                        </Box>
                        <Text>{formatCurrency(formData.amount)}</Text>
                      </Flex>
                      
                      <Flex align="center">
                        <Badge colorScheme="red" mr={2}>CREDIT</Badge>
                        <Box flex={1}>
                          <Text fontWeight="medium">{getAccountName(formData.counterAccountCode)}</Text>
                          <Text fontSize="xs" color="gray.500">{formData.counterAccountCode}</Text>
                        </Box>
                        <Text>{formatCurrency(formData.amount)}</Text>
                      </Flex>
                      
                      {formData.description && (
                        <Text fontStyle="italic" fontSize="sm" mt={2} color="gray.600">
                          "{formData.description}"
                        </Text>
                      )}
                    </Box>
                    
                    <Divider my={2} />
                    
                    <Flex justify="space-between">
                      <Box>
                        <Text fontSize="sm" color="gray.600">Dampak pada {getAccountName(formData.accountCode)}:</Text>
                        <Text fontWeight="bold" color={formData.type === 'income' ? "green.500" : "blue.500"}>
                          {formData.type === 'income' ? 'Bertambah' : 'Bertambah'}
                        </Text>
                      </Box>
                      
                      <Box textAlign="right">
                        <Text fontSize="sm" color="gray.600">Dampak pada {getAccountName(formData.counterAccountCode)}:</Text>
                        <Text fontWeight="bold" color="blue.500">
                          Bertambah
                        </Text>
                      </Box>
                    </Flex>
                    
                    {/* Validation Warning */}
                    {validateAccountCombination().valid === false && (
                      <Alert status="warning" mt={3} borderRadius="md">
                        <AlertIcon />
                        {validateAccountCombination().message}
                      </Alert>
                    )}
                  </Box>
                )}
              </>
            )}
            
            {/* Project Selection */}
            <FormControl isInvalid={!!errors.projectId}>
              <FormLabel>Project (Optional)</FormLabel>
              <Select
                name="projectId"
                placeholder="Pilih project"
                value={formData.projectId}
                onChange={handleChange}
              >
                <option value="">Tidak ada Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectCode} - {project.name}
                  </option>
                ))}
              </Select>
              {errors.projectId && <FormErrorMessage>{errors.projectId}</FormErrorMessage>}
            </FormControl>
            
            {/* Description */}
            <FormControl isRequired isInvalid={!!errors.description}>
              <FormLabel>Deskripsi</FormLabel>
              <Input
                name="description"
                placeholder="Deskripsi transaksi"
                value={formData.description}
                onChange={handleChange}
              />
              {errors.description && <FormErrorMessage>{errors.description}</FormErrorMessage>}
            </FormControl>
            
            {/* Amount with improved formatting */}
            <FormControl isRequired isInvalid={!!errors.amount}>
              <FormLabel>Jumlah</FormLabel>
              <InputGroup>
                <InputLeftAddon>Rp</InputLeftAddon>
                <Input
                  name="amount"
                  placeholder="0"
                  value={formData.amount ? formData.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ''}
                  onChange={(e) => {
                    // Remove commas before processing
                    const rawValue = e.target.value.replace(/,/g, '');
                    handleNumberChange('amount', rawValue);
                  }}
                  borderLeftRadius={0}
                  bg={formData.amount ? (formData.type === 'income' ? 'green.50' : 'red.50') : 'white'}
                />
              </InputGroup>
              {errors.amount && <FormErrorMessage>{errors.amount}</FormErrorMessage>}
              <FormHelperText>
                {formData.type === 'income' 
                  ? 'Jumlah pendapatan yang diterima'
                  : 'Jumlah beban yang dikeluarkan'}
              </FormHelperText>
            </FormControl>
            
            {/* Notes */}
            <FormControl isInvalid={!!errors.notes}>
              <FormLabel>Notes (Optional)</FormLabel>
              <Textarea
                name="notes"
                placeholder="Additional notes"
                value={formData.notes}
                onChange={handleChange}
              />
              {errors.notes && <FormErrorMessage>{errors.notes}</FormErrorMessage>}
            </FormControl>
            
            {/* Recurring Transaction Option */}
            <FormControl>
              <FormLabel>Recurring Transaction</FormLabel>
              <Switch
                isChecked={formData.isRecurring}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  isRecurring: e.target.checked,
                  recurringEndDate: e.target.checked ? calculateEndDate() : ''
                })}
                colorScheme="teal"
              />
              <FormHelperText>
                Enable for recurring transactions (creates multiple transactions)
              </FormHelperText>
            </FormControl>
            
            {/* Recurring Transaction Options */}
            <Collapse in={formData.isRecurring} animateOpacity>
              <VStack spacing={4} p={3} bg="gray.50" borderRadius="md" width="100%">
                <FormControl isRequired={formData.isRecurring} isInvalid={!!errors.recurringFrequency}>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    name="recurringFrequency"
                    value={formData.recurringFrequency}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        recurringFrequency: e.target.value,
                        recurringEndDate: calculateEndDate()
                      });
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                  {errors.recurringFrequency && <FormErrorMessage>{errors.recurringFrequency}</FormErrorMessage>}
                </FormControl>
                
                <FormControl isRequired={formData.isRecurring} isInvalid={!!errors.recurringCount}>
                  <FormLabel>Number of Occurrences</FormLabel>
                  <NumberInput
                    min={1}
                    max={60}
                    value={formData.recurringCount}
                    onChange={(valueString) => {
                      setFormData({
                        ...formData,
                        recurringCount: valueString,
                        recurringEndDate: calculateEndDate()
                      });
                    }}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  {errors.recurringCount && <FormErrorMessage>{errors.recurringCount}</FormErrorMessage>}
                  <FormHelperText>
                    How many times this transaction should repeat (max 60)
                  </FormHelperText>
                </FormControl>
                
                <FormControl>
                  <FormLabel>End Date (Calculated)</FormLabel>
                  <Input
                    type="date"
                    name="recurringEndDate"
                    value={formData.recurringEndDate}
                    isReadOnly
                    bg="gray.100"
                  />
                  <FormHelperText>
                    This is the calculated end date based on frequency and count
                  </FormHelperText>
                </FormControl>
              </VStack>
            </Collapse>
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
            loadingText="Submitting"
          >
            {transaction ? 'Update' : formData.isRecurring ? 'Create Series' : 'Create'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TransactionForm; 