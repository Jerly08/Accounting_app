import { useState, useEffect, useRef } from 'react';
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
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  VStack,
  HStack,
  Flex,
  Box,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
  Image,
  Switch,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX, FiCheck, FiDownload, FiInfo } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const BillingForm = ({ 
  isOpen, 
  onClose, 
  projectId, 
  billing, 
  onSubmitSuccess,
  projects = []
}) => {
  // Initial form data
  const initialFormData = {
    projectId: projectId || '',
    billingDate: new Date().toISOString().split('T')[0],
    percentage: '',
    amount: '',
    description: '',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
    createJournalEntry: true,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [percentageMode, setPercentageMode] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [projectTotalValue, setProjectTotalValue] = useState(0);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const fileInputRef = useRef(null);
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();

  // Status badge colors
  const statusColors = {
    pending: 'yellow',
    approved: 'blue',
    unpaid: 'orange',
    paid: 'green',
    rejected: 'red'
  };

  // Status descriptions
  const statusDescriptions = {
    pending: 'Menunggu persetujuan',
    approved: 'Disetujui, siap untuk penagihan',
    unpaid: 'Faktur diterbitkan, menunggu pembayaran',
    paid: 'Pembayaran telah diterima',
    rejected: 'Penagihan ditolak'
  };

  // Check authentication status
  useEffect(() => {
    if (isOpen && (!token || !isAuthenticated)) {
      toast({
        title: 'Authentication Error',
        description: 'Your session has expired. Please login again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      onClose(); // Close the modal if not authenticated
    }
  }, [isOpen, token, isAuthenticated, toast, onClose]);

  // Set initial form data when editing
  useEffect(() => {
    if (billing) {
      setFormData({
        projectId: billing.projectId?.toString() || projectId?.toString() || '',
        billingDate: billing.billingDate ? new Date(billing.billingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        percentage: billing.percentage ? billing.percentage.toString() : '',
        amount: billing.amount ? billing.amount.toString() : '',
        description: billing.description || '',
        dueDate: billing.dueDate ? new Date(billing.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createJournalEntry: billing.createJournalEntry !== undefined ? billing.createJournalEntry : true,
      });
      
      if (billing.invoice) {
        setCurrentInvoice(billing.invoice);
      }
      
      // Set percentage mode based on whether percentage is provided
      setPercentageMode(!!billing.percentage);
    } else {
      // Reset form when adding new billing
      setFormData({
        ...initialFormData,
        projectId: projectId || '',
      });
      setCurrentInvoice(null);
    }
    
    // Reset file state
    setSelectedFile(null);
    setFilePreview('');
    setErrors({});
  }, [billing, projectId, isOpen]);

  // Fetch project details when project changes
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!formData.projectId || !token || !isAuthenticated) return;
      
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${formData.projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (response.data.success && response.data.data) {
          const project = response.data.data;
          setProjectTotalValue(parseFloat(project.totalValue));
          
          // If in percentage mode, update amount based on percentage
          if (percentageMode && formData.percentage) {
            const calculatedAmount = (parseFloat(formData.percentage) / 100) * parseFloat(project.totalValue);
            setFormData(prev => ({
              ...prev,
              amount: calculatedAmount.toFixed(0)
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
      }
    };
    
    fetchProjectDetails();
  }, [formData.projectId, token, isAuthenticated, percentageMode, formData.percentage]);

  // Fetch chart of accounts
  useEffect(() => {
    const fetchChartOfAccounts = async () => {
      if (!token || !isAuthenticated) return;
      
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/chartofaccounts`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (response.data.success && response.data.data) {
          setChartOfAccounts(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching chart of accounts:', error);
        // Don't show error toast, just use default account names
        // Set default chart of accounts for the preview
        setChartOfAccounts([
          { code: '1102', name: 'Bank BCA', type: 'Aktiva' },
          { code: '1201', name: 'Piutang Usaha', type: 'Aktiva' },
          { code: '4001', name: 'Pendapatan Jasa Boring', type: 'Pendapatan' }
        ]);
      }
    };
    
    fetchChartOfAccounts();
  }, [token, isAuthenticated]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectId) {
      newErrors.projectId = 'Proyek wajib dipilih';
    }
    
    if (!formData.billingDate) {
      newErrors.billingDate = 'Tanggal penagihan wajib diisi';
    }
    
    if (percentageMode) {
      if (!formData.percentage) {
        newErrors.percentage = 'Persentase wajib diisi';
      } else if (isNaN(formData.percentage) || parseFloat(formData.percentage) <= 0 || parseFloat(formData.percentage) > 100) {
        newErrors.percentage = 'Persentase harus antara 0 dan 100';
      }
    } else {
      if (!formData.amount) {
        newErrors.amount = 'Jumlah wajib diisi';
      } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
        newErrors.amount = 'Jumlah harus lebih besar dari 0';
      }
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      console.error('Form validation errors:', newErrors);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
    
    // If project changes, reset percentage and amount
    if (name === 'projectId') {
      setFormData(prev => ({
        ...prev,
        percentage: '',
        amount: '',
      }));
    }
  };

  // Handle number input change
  const handleNumberChange = (name, value) => {
    // Ensure value is a valid number
    let parsedValue = value;
    
    // Remove non-numeric characters except decimals
    parsedValue = parsedValue.toString().replace(/[^\d.]/g, '');
    
    // Ensure it's a valid number
    if (parsedValue && !isNaN(parseFloat(parsedValue))) {
      parsedValue = parseFloat(parsedValue).toString();
    }
    
    setFormData({
      ...formData,
      [name]: parsedValue,
    });
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
    
    // Update amount or percentage based on mode
    if (name === 'percentage' && percentageMode && projectTotalValue > 0) {
      const calculatedAmount = (parseFloat(parsedValue) / 100) * projectTotalValue;
      setFormData(prev => ({
        ...prev,
        amount: calculatedAmount.toFixed(0)
      }));
    } else if (name === 'amount' && !percentageMode && projectTotalValue > 0) {
      const calculatedPercentage = (parseFloat(parsedValue) / projectTotalValue) * 100;
      setFormData(prev => ({
        ...prev,
        percentage: calculatedPercentage.toFixed(2)
      }));
    }
  };

  // Toggle between percentage and amount mode
  const togglePercentageMode = () => {
    setPercentageMode(!percentageMode);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Check file type (images, PDFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image (JPEG, PNG, GIF) or PDF',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      // Show an icon for non-image files
      setFilePreview('');
    }
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clear current invoice
  const clearCurrentInvoice = () => {
    setCurrentInvoice(null);
    // Enable user to upload a new invoice after clearing the current one
    setSelectedFile(null);
    setFilePreview('');
  };

  // Handle toggle change
  const handleToggleChange = (e) => {
    setFormData({
      ...formData,
      createJournalEntry: e.target.checked,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Form tidak valid',
        description: 'Mohon periksa kembali data yang dimasukkan',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create form data for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('projectId', formData.projectId);
      formDataToSend.append('billingDate', formData.billingDate);
      
      if (percentageMode) {
        formDataToSend.append('percentage', formData.percentage);
      } else {
        formDataToSend.append('amount', formData.amount);
      }
      
      if (formData.description) {
        formDataToSend.append('description', formData.description);
      }
      
      if (formData.dueDate) {
        formDataToSend.append('dueDate', formData.dueDate);
      }
      
      formDataToSend.append('createJournalEntry', formData.createJournalEntry);
      
      if (selectedFile) {
        formDataToSend.append('invoice', selectedFile);
      }
      
      let response;
      
      if (billing && billing.id) {
        // Update existing billing
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/billings/${billing.id}`,
          formDataToSend,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else {
        // Create new billing
        response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/billings`,
          formDataToSend,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      
      if (response.data.success) {
        toast({
          title: billing ? 'Penagihan berhasil diperbarui' : 'Penagihan berhasil ditambahkan',
          description: response.data.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        if (onSubmitSuccess) {
          onSubmitSuccess(response.data.data);
        }
        
        onClose();
      } else {
        throw new Error(response.data.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error submitting billing:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Terjadi kesalahan',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render file preview based on type
  const renderFilePreview = () => {
    if (!currentInvoice) return null;
    
    // Check if it's an image
    const isImage = currentInvoice.match(/\.(jpeg|jpg|png|gif)$/i);
    
    // Construct proper URL for invoice
    const invoiceUrl = currentInvoice.startsWith('http') 
      ? currentInvoice 
      : `${process.env.NEXT_PUBLIC_API_URL}${currentInvoice}`;
    
    console.log('Rendered invoice URL:', invoiceUrl);
    
    return (
      <Box mt={2} p={2} borderWidth="1px" borderRadius="md">
        <HStack justifyContent="space-between">
          {isImage ? (
            <Image 
              src={invoiceUrl}
              alt="Invoice"
              boxSize="100px"
              objectFit="cover"
              borderRadius="md"
            />
          ) : (
            <HStack>
              <FiFile size={24} />
              <Text>Invoice document</Text>
            </HStack>
          )}
          <HStack>
            <IconButton
              icon={<FiDownload />}
              size="sm"
              aria-label="Download file"
              onClick={() => window.open(invoiceUrl, '_blank')}
            />
            <IconButton
              icon={<FiX />}
              size="sm"
              aria-label="Remove file"
              onClick={clearCurrentInvoice}
            />
          </HStack>
        </HStack>
      </Box>
    );
  };

  // Get selected project name
  const getSelectedProjectName = () => {
    if (!formData.projectId) return 'Select a project';
    const project = projects.find(p => p.id.toString() === formData.projectId.toString());
    return project ? project.name : 'Unknown project';
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
    const account = chartOfAccounts.find(account => account.code === code);
    return account ? account.name : code;
  };

  // Render journal entry preview
  const renderJournalPreview = () => {
    if (!formData.createJournalEntry || !formData.amount || !formData.projectId) {
      return null;
    }

    const amount = parseFloat(formData.amount);
    const isNewBilling = !billing || !billing.id;
    const isStatusChange = billing && billing.status !== formData.status;
    const isChangingToPaid = isStatusChange && formData.status === 'paid';

    return (
      <Box mt={4} p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
        <Text fontWeight="bold" mb={2}>Journal Entry Preview</Text>
        
        {isNewBilling && (
          <>
            <Text fontSize="sm" mb={2}>When creating this billing, the following journal entries will be created:</Text>
            <Table size="sm" variant="simple" mb={3}>
              <Thead>
                <Tr>
                  <Th>Account</Th>
                  <Th>Description</Th>
                  <Th isNumeric>Debit</Th>
                  <Th isNumeric>Credit</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>
                    <Text fontWeight="medium">1201 - {getAccountName('1201')}</Text>
                    <Badge colorScheme="blue" size="sm">Asset</Badge>
                  </Td>
                  <Td fontSize="sm">Invoice for project</Td>
                  <Td isNumeric>{formatCurrency(amount)}</Td>
                  <Td isNumeric>-</Td>
                </Tr>
                <Tr>
                  <Td>
                    <Text fontWeight="medium">4001 - {getAccountName('4001')}</Text>
                    <Badge colorScheme="green" size="sm">Revenue</Badge>
                  </Td>
                  <Td fontSize="sm">Invoice for project</Td>
                  <Td isNumeric>-</Td>
                  <Td isNumeric>{formatCurrency(amount)}</Td>
                </Tr>
              </Tbody>
            </Table>
          </>
        )}

        {isChangingToPaid && (
          <>
            <Text fontSize="sm" mb={2}>When marking this billing as paid, the following journal entries will be created:</Text>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Account</Th>
                  <Th>Description</Th>
                  <Th isNumeric>Debit</Th>
                  <Th isNumeric>Credit</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>
                    <Text fontWeight="medium">1102 - {getAccountName('1102')}</Text>
                    <Badge colorScheme="blue" size="sm">Asset</Badge>
                  </Td>
                  <Td fontSize="sm">Payment received</Td>
                  <Td isNumeric>{formatCurrency(amount)}</Td>
                  <Td isNumeric>-</Td>
                </Tr>
                <Tr>
                  <Td>
                    <Text fontWeight="medium">1201 - {getAccountName('1201')}</Text>
                    <Badge colorScheme="blue" size="sm">Asset</Badge>
                  </Td>
                  <Td fontSize="sm">Payment received</Td>
                  <Td isNumeric>-</Td>
                  <Td isNumeric>{formatCurrency(amount)}</Td>
                </Tr>
              </Tbody>
            </Table>
          </>
        )}

        <Text fontSize="xs" mt={2} color="gray.500">
          Note: These journal entries will automatically maintain the balance in your accounting system.
        </Text>
      </Box>
    );
  };

  const renderStatusBadge = () => {
    if (!billing || !billing.status) return null;
    
    return (
      <Flex align="center" mb={4}>
        <Text fontWeight="bold" mr={2}>Status:</Text>
        <Tooltip label={statusDescriptions[billing.status]}>
          <Badge colorScheme={statusColors[billing.status]} fontSize="0.9em" p={1} borderRadius="md">
            {billing.status.toUpperCase()}
          </Badge>
        </Tooltip>
        <Tooltip label="Status tidak dapat diubah langsung dari form ini. Gunakan tombol aksi di halaman daftar penagihan.">
          <Box ml={2}>
            <FiInfo />
          </Box>
        </Tooltip>
      </Flex>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{billing ? 'Edit Penagihan' : 'Tambah Penagihan'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              {/* Display status badge when editing */}
              {billing && renderStatusBadge()}

              {/* Project selection */}
              <FormControl isRequired isInvalid={errors.projectId}>
                <FormLabel>Proyek</FormLabel>
                <Select
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleChange}
                  placeholder="Pilih proyek"
                  isDisabled={!!billing} // Disable if editing
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectCode} - {project.name}
                    </option>
                  ))}
                </Select>
                {errors.projectId && <FormErrorMessage>{errors.projectId}</FormErrorMessage>}
              </FormControl>

              {/* Billing date */}
              <FormControl isRequired isInvalid={errors.billingDate}>
                <FormLabel>Tanggal Penagihan</FormLabel>
                <Input
                  type="date"
                  name="billingDate"
                  value={formData.billingDate}
                  onChange={handleChange}
                  isDisabled={billing && billing.status !== 'pending'}
                />
                {errors.billingDate && <FormErrorMessage>{errors.billingDate}</FormErrorMessage>}
              </FormControl>

              {/* Due date */}
              <FormControl>
                <FormLabel>Tanggal Jatuh Tempo</FormLabel>
                <Input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  isDisabled={billing && billing.status !== 'pending'}
                />
              </FormControl>

              {/* Percentage/Amount toggle */}
              <FormControl>
                <FormLabel>Mode Input</FormLabel>
                <Flex>
                  <Button
                    size="sm"
                    colorScheme={percentageMode ? 'blue' : 'gray'}
                    onClick={() => setPercentageMode(true)}
                    mr={2}
                    isDisabled={billing && billing.status !== 'pending'}
                  >
                    Persentase
                  </Button>
                  <Button
                    size="sm"
                    colorScheme={!percentageMode ? 'blue' : 'gray'}
                    onClick={() => setPercentageMode(false)}
                    isDisabled={billing && billing.status !== 'pending'}
                  >
                    Jumlah
                  </Button>
                </Flex>
              </FormControl>

              {/* Percentage input */}
              {percentageMode && (
                <FormControl isRequired isInvalid={errors.percentage}>
                  <FormLabel>Persentase</FormLabel>
                  <NumberInput
                    value={formData.percentage}
                    onChange={(value) => handleNumberChange('percentage', value)}
                    min={0}
                    max={100}
                    precision={2}
                    isDisabled={billing && billing.status !== 'pending'}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  {errors.percentage && <FormErrorMessage>{errors.percentage}</FormErrorMessage>}
                  {projectTotalValue > 0 && formData.percentage && (
                    <FormHelperText>
                      Jumlah: {formatCurrency((parseFloat(formData.percentage) / 100) * projectTotalValue)}
                    </FormHelperText>
                  )}
                </FormControl>
              )}

              {/* Amount input */}
              {!percentageMode && (
                <FormControl isRequired isInvalid={errors.amount}>
                  <FormLabel>Jumlah</FormLabel>
                  <NumberInput
                    value={formData.amount}
                    onChange={(value) => handleNumberChange('amount', value)}
                    min={0}
                    precision={0}
                    isDisabled={billing && billing.status !== 'pending'}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  {errors.amount && <FormErrorMessage>{errors.amount}</FormErrorMessage>}
                  {projectTotalValue > 0 && formData.amount && (
                    <FormHelperText>
                      Persentase: {((parseFloat(formData.amount) / projectTotalValue) * 100).toFixed(2)}%
                    </FormHelperText>
                  )}
                </FormControl>
              )}

              {/* Description */}
              <FormControl>
                <FormLabel>Keterangan</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Masukkan keterangan penagihan"
                  isDisabled={billing && billing.status !== 'pending'}
                />
              </FormControl>

              {/* Invoice upload */}
              <FormControl>
                <FormLabel>Upload Invoice</FormLabel>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept="image/jpeg,image/png,application/pdf"
                  disabled={billing && billing.status !== 'pending'}
                />
                <Flex>
                  <Button
                    leftIcon={<FiUpload />}
                    onClick={() => fileInputRef.current.click()}
                    isLoading={isUploadingFile}
                    isDisabled={(billing && billing.status !== 'pending') || isUploadingFile}
                  >
                    Pilih File
                  </Button>
                  {(selectedFile || currentInvoice) && (
                    <Button
                      ml={2}
                      colorScheme="red"
                      variant="outline"
                      leftIcon={<FiX />}
                      onClick={selectedFile ? clearSelectedFile : clearCurrentInvoice}
                      isDisabled={billing && billing.status !== 'pending'}
                    >
                      Hapus
                    </Button>
                  )}
                </Flex>
                {renderFilePreview()}
              </FormControl>

              {/* Journal Entry Toggle */}
              <FormControl display="flex" alignItems="center" mt={4}>
                <FormLabel htmlFor="create-journal" mb="0">
                  Buat Jurnal Akuntansi
                </FormLabel>
                <Switch
                  id="create-journal"
                  isChecked={formData.createJournalEntry}
                  onChange={handleToggleChange}
                  colorScheme="blue"
                  isDisabled={billing && billing.status !== 'pending'}
                />
              </FormControl>

              {/* Journal Entry Preview */}
              {formData.createJournalEntry && formData.amount && (
                <Box mt={4}>
                  <Divider my={2} />
                  <Text fontWeight="bold" mb={2}>
                    Preview Jurnal Akuntansi
                    <Tooltip label="Jurnal akan dibuat saat status berubah menjadi 'unpaid' atau 'paid'">
                      <IconButton
                        icon={<FiInfo />}
                        size="xs"
                        ml={2}
                        aria-label="Info about journal entries"
                        variant="ghost"
                      />
                    </Tooltip>
                  </Text>
                  {renderJournalPreview()}
                </Box>
              )}
            </VStack>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Batal
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit} 
            isLoading={isSubmitting}
            isDisabled={billing && billing.status !== 'pending'}
          >
            {billing ? 'Perbarui' : 'Simpan'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BillingForm; 