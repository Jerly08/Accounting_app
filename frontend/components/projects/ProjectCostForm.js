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
  Input,
  Select,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  HStack,
  Box,
  Text,
  Icon,
  useToast,
  FormHelperText,
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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Flex,
  Tooltip,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX, FiCheck, FiDownload, FiBook, FiInfo } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// Default cost categories if not provided as props
const DEFAULT_CATEGORIES = {
  'material': { label: 'Material', color: 'blue' },
  'labor': { label: 'Labor', color: 'green' },
  'equipment': { label: 'Equipment', color: 'purple' },
  'rental': { label: 'Rental', color: 'orange' },
  'services': { label: 'Services', color: 'teal' },
  'other': { label: 'Other', color: 'gray' },
};

// Map categories to account codes
const CATEGORY_TO_ACCOUNT = {
  'material': { code: '5101', name: 'Beban Proyek - Material' },
  'labor': { code: '5102', name: 'Beban Proyek - Tenaga Kerja' },
  'equipment': { code: '5103', name: 'Beban Proyek - Sewa Peralatan' },
  'rental': { code: '5103', name: 'Beban Proyek - Sewa Peralatan' },
  'services': { code: '5105', name: 'Beban Proyek - Lain-lain' },
  'other': { code: '5105', name: 'Beban Proyek - Lain-lain' },
};

const ProjectCostForm = ({ 
  isOpen, 
  onClose, 
  projectId, 
  cost, 
  onSubmitSuccess,
  categories = DEFAULT_CATEGORIES,
  projects = []
}) => {
  // Initial form data
  const initialFormData = {
    projectId: projectId || '',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    receipt: '',
    billingId: '',
    createJournalEntry: true,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [billings, setBillings] = useState([]);
  const [loadingBillings, setLoadingBillings] = useState(false);
  const [accountPreview, setAccountPreview] = useState({
    debit: { code: '', name: '' },
    credit: { code: '', name: '' }
  });
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
    approved: 'Disetujui, siap untuk dicatat sebagai biaya',
    unpaid: 'Biaya tercatat, belum dibayar',
    paid: 'Pembayaran telah dilakukan',
    rejected: 'Biaya ditolak'
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
    if (cost) {
      setFormData({
        projectId: cost.projectId?.toString() || projectId?.toString() || '',
        category: cost.category || '',
        description: cost.description || '',
        amount: cost.amount ? cost.amount.toString() : '',
        date: cost.date ? new Date(cost.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        receipt: cost.receipt || '',
        billingId: '',
        createJournalEntry: true, // Default to true for existing costs too
      });
      
      if (cost.receipt) {
        setCurrentReceipt(cost.receipt);
      }
    } else {
      // When adding new cost, set default category if none was provided
      setFormData({
        ...initialFormData,
        projectId: projectId || '',
        category: initialFormData.category || Object.keys(categories)[0] || '',
      });
      setCurrentReceipt(null);
    }
    
    // Reset file state
    setSelectedFile(null);
    setFilePreview('');
    setErrors({});
  }, [cost, projectId, isOpen, categories]);

  // Fetch billings for the selected project
  useEffect(() => {
    const fetchBillings = async () => {
      if (!formData.projectId || !token || !isAuthenticated) return;
      
      try {
        setLoadingBillings(true);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${formData.projectId}/billings`, 
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (response.data.success) {
          setBillings(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching billings:', error);
      } finally {
        setLoadingBillings(false);
      }
    };
    
    fetchBillings();
  }, [formData.projectId, token, isAuthenticated]);

  // Update account preview when form data changes
  useEffect(() => {
    if (!formData.category) return;
    
    // Get expense account based on category
    const expenseAccount = CATEGORY_TO_ACCOUNT[formData.category] || CATEGORY_TO_ACCOUNT.other;
    
    // Determine counter account based on billing status
    let counterAccount = { code: '2102', name: 'Hutang Usaha' }; // Default to accounts payable
    
    if (formData.billingId) {
      const selectedBilling = billings.find(b => b.id.toString() === formData.billingId);
      if (selectedBilling && selectedBilling.status === 'paid') {
        counterAccount = { code: '1101', name: 'Kas' }; // Use cash for paid billings
      }
    }
    
    setAccountPreview({
      debit: expenseAccount,
      credit: counterAccount
    });
  }, [formData.category, formData.billingId, billings]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectId) {
      newErrors.projectId = 'Proyek wajib dipilih';
    }
    
    if (!formData.category) {
      newErrors.category = 'Kategori wajib dipilih';
    }
    
    if (!formData.description) {
      newErrors.description = 'Deskripsi wajib diisi';
    }
    
    if (!formData.amount) {
      newErrors.amount = 'Jumlah wajib diisi';
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Jumlah harus lebih besar dari 0';
    }
    
    if (!formData.date) {
      newErrors.date = 'Tanggal wajib diisi';
    } else {
      // Validate date format
      try {
        new Date(formData.date);
      } catch (e) {
        newErrors.date = 'Format tanggal tidak valid';
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
  };

  // Handle switch toggle
  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
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
    
    // Check file type (images, PDFs, docs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image (JPEG, PNG, GIF), PDF, or document',
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

  // Clear current receipt
  const clearCurrentReceipt = () => {
    setCurrentReceipt(null);
    // Enable user to upload a new receipt after clearing the current one
    setSelectedFile(null);
    setFilePreview('');
  };

  // Handle submit
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
      formDataToSend.append('category', formData.category);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('date', formData.date);
      formDataToSend.append('createJournalEntry', formData.createJournalEntry);
      
      if (formData.billingId) {
        formDataToSend.append('billingId', formData.billingId);
      }
      
      if (selectedFile) {
        formDataToSend.append('receipt', selectedFile);
      }
      
      let response;
      
      if (cost && cost.id) {
        // Update existing project cost
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${formData.projectId}/costs/${cost.id}`,
          formDataToSend,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else {
        // Create new project cost
        response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${formData.projectId}/costs`,
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
          title: cost ? 'Biaya proyek berhasil diperbarui' : 'Biaya proyek berhasil ditambahkan',
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
      console.error('Error submitting project cost:', error);
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
    if (!currentReceipt) return null;
    
    // Check if it's an image
    const isImage = currentReceipt.match(/\.(jpeg|jpg|png|gif)$/i);
    
    // Construct proper URL for receipt
    const receiptUrl = currentReceipt.startsWith('http') 
      ? currentReceipt 
      : `${process.env.NEXT_PUBLIC_API_URL}${currentReceipt}`;
    
    console.log('Rendered receipt URL:', receiptUrl);
    
    return (
      <Box mt={2} p={2} borderWidth="1px" borderRadius="md">
        <HStack justifyContent="space-between">
          {isImage ? (
            <Image 
              src={receiptUrl}
              alt="Receipt"
              boxSize="100px"
              objectFit="cover"
              borderRadius="md"
            />
          ) : (
            <HStack>
              <FiFile size={24} />
              <Text>Receipt document</Text>
            </HStack>
          )}
          <HStack>
            <IconButton
              icon={<FiDownload />}
              size="sm"
              aria-label="Download file"
              onClick={() => window.open(receiptUrl, '_blank')}
            />
            <IconButton
              icon={<FiX />}
              size="sm"
              aria-label="Remove file"
              onClick={clearCurrentReceipt}
            />
          </HStack>
        </HStack>
      </Box>
    );
  };

  // Render status badge when editing
  const renderStatusBadge = () => {
    if (!cost || !cost.status) return null;
    
    return (
      <Flex align="center" mb={4}>
        <Text fontWeight="bold" mr={2}>Status:</Text>
        <Tooltip label={statusDescriptions[cost.status]}>
          <Badge colorScheme={statusColors[cost.status]} fontSize="0.9em" p={1} borderRadius="md">
            {cost.status.toUpperCase()}
          </Badge>
        </Tooltip>
        <Tooltip label="Status tidak dapat diubah langsung dari form ini. Gunakan tombol aksi di halaman daftar biaya proyek.">
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
        <ModalHeader>{cost ? 'Edit Biaya Proyek' : 'Tambah Biaya Proyek'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              {/* Display status badge when editing */}
              {cost && renderStatusBadge()}

              {/* Project selection */}
              <FormControl isRequired isInvalid={errors.projectId}>
                <FormLabel>Proyek</FormLabel>
                <Select
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleChange}
                  placeholder="Pilih proyek"
                  isDisabled={!!cost} // Disable if editing
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id.toString()}>
                      {project.projectCode} - {project.name}
                    </option>
                  ))}
                </Select>
                {errors.projectId && <FormErrorMessage>{errors.projectId}</FormErrorMessage>}
              </FormControl>

              {/* Category */}
              <FormControl isRequired isInvalid={errors.category}>
                <FormLabel>Kategori</FormLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Pilih kategori"
                  isDisabled={cost && cost.status !== 'pending'}
                >
                  {Object.entries(categories).map(([value, { label }]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                {errors.category && <FormErrorMessage>{errors.category}</FormErrorMessage>}
              </FormControl>

              {/* Description */}
              <FormControl isRequired isInvalid={errors.description}>
                <FormLabel>Deskripsi</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Masukkan deskripsi biaya"
                  isDisabled={cost && cost.status !== 'pending'}
                />
                {errors.description && <FormErrorMessage>{errors.description}</FormErrorMessage>}
              </FormControl>

              {/* Amount */}
              <FormControl isRequired isInvalid={errors.amount}>
                <FormLabel>Jumlah</FormLabel>
                <NumberInput
                  value={formData.amount}
                  onChange={(value) => handleNumberChange('amount', value)}
                  min={0}
                  precision={0}
                  isDisabled={cost && cost.status !== 'pending'}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                {errors.amount && <FormErrorMessage>{errors.amount}</FormErrorMessage>}
              </FormControl>

              {/* Date */}
              <FormControl isRequired isInvalid={errors.date}>
                <FormLabel>Tanggal</FormLabel>
                <Input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  isDisabled={cost && cost.status !== 'pending'}
                />
                {errors.date && <FormErrorMessage>{errors.date}</FormErrorMessage>}
              </FormControl>

              {/* Receipt upload */}
              <FormControl>
                <FormLabel>Upload Bukti</FormLabel>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept="image/jpeg,image/png,application/pdf"
                  disabled={cost && cost.status !== 'pending'}
                />
                <Flex>
                  <Button
                    leftIcon={<FiUpload />}
                    onClick={() => fileInputRef.current.click()}
                    isLoading={isUploadingFile}
                    isDisabled={(cost && cost.status !== 'pending') || isUploadingFile}
                  >
                    Pilih File
                  </Button>
                  {(selectedFile || currentReceipt) && (
                    <Button
                      ml={2}
                      colorScheme="red"
                      variant="outline"
                      leftIcon={<FiX />}
                      onClick={selectedFile ? clearSelectedFile : clearCurrentReceipt}
                      isDisabled={cost && cost.status !== 'pending'}
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
                  onChange={handleSwitchChange}
                  colorScheme="blue"
                  isDisabled={cost && cost.status !== 'pending'}
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
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Account</Th>
                        <Th>Debit</Th>
                        <Th>Credit</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td>
                          <Text fontWeight="medium">{accountPreview.debit.code}</Text>
                          <Text fontSize="sm">{accountPreview.debit.name}</Text>
                        </Td>
                        <Td color="green.600" fontWeight="medium">
                          {formData.amount ? formatCurrency(formData.amount) : '-'}
                        </Td>
                        <Td>-</Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <Text fontWeight="medium">{accountPreview.credit.code}</Text>
                          <Text fontSize="sm">{accountPreview.credit.name}</Text>
                        </Td>
                        <Td>-</Td>
                        <Td color="red.600" fontWeight="medium">
                          {formData.amount ? formatCurrency(formData.amount) : '-'}
                        </Td>
                      </Tr>
                    </Tbody>
                  </Table>
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
            isDisabled={cost && cost.status !== 'pending'}
          >
            {cost ? 'Perbarui' : 'Simpan'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProjectCostForm; 