import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Flex,
  Icon,
  Divider,
  Container,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Switch,
  Select,
  useColorModeValue,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import {
  FiUser,
  FiDollarSign,
  FiSettings,
  FiShield,
  FiTool,
  FiUsers,
  FiPrinter,
  FiGlobe,
  FiDatabase,
  FiSave,
  FiRefreshCw,
} from 'react-icons/fi';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

const SettingsPage = () => {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Menggunakan context settings
  const { settings: globalSettings, loading, error, updateSettings, fetchSettings } = useSettings();
  const { user } = useAuth();
  
  // State lokal untuk form settings
  const [formSettings, setFormSettings] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    taxNumber: '',
    currency: 'IDR',
    currencySymbol: 'Rp',
    invoicePrefix: 'INV',
    projectPrefix: 'PRJ',
    fiscalYearStart: '01-01',
    defaultPaymentTerms: 30,
    reminderDays: 7,
    vatRate: 11,
    enableAutomaticBackup: true,
    backupFrequency: 'daily',
    enableUserRoles: true,
    enableTwoFactor: false,
    allowClientPortal: true,
    boringDefaultRate: 3500000,
    sondirDefaultRate: 2000000,
  });
  
  // State untuk status pengiriman form
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update form ketika settings global berubah
  useEffect(() => {
    if (globalSettings) {
      setFormSettings({
        companyName: globalSettings.companyName || '',
        companyAddress: globalSettings.companyAddress || '',
        companyPhone: globalSettings.companyPhone || '',
        companyEmail: globalSettings.companyEmail || '',
        taxNumber: globalSettings.taxNumber || '',
        currency: globalSettings.currency || 'IDR',
        currencySymbol: globalSettings.currencySymbol || 'Rp',
        invoicePrefix: globalSettings.invoicePrefix || 'INV',
        projectPrefix: globalSettings.projectPrefix || 'PRJ',
        fiscalYearStart: globalSettings.fiscalYearStart || '01-01',
        defaultPaymentTerms: globalSettings.defaultPaymentTerms || 30,
        reminderDays: globalSettings.reminderDays || 7,
        vatRate: globalSettings.vatRate || 11,
        enableAutomaticBackup: globalSettings.enableAutomaticBackup ?? true,
        backupFrequency: globalSettings.backupFrequency || 'daily',
        enableUserRoles: globalSettings.enableUserRoles ?? true,
        enableTwoFactor: globalSettings.enableTwoFactor ?? false,
        allowClientPortal: globalSettings.allowClientPortal ?? true,
        boringDefaultRate: globalSettings.boringDefaultRate || 3500000,
        sondirDefaultRate: globalSettings.sondirDefaultRate || 2000000,
      });
    }
  }, [globalSettings]);

  // Handler untuk input field
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormSettings({
      ...formSettings,
      [name]: value,
    });
  };

  // Handler untuk switch
  const handleSwitchChange = (name) => {
    setFormSettings({
      ...formSettings,
      [name]: !formSettings[name],
    });
  };

  // Handler untuk menyimpan settings
  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateSettings(formSettings);
      if (result && result.success) {
        // Settings berhasil diperbarui, UI akan diperbarui melalui effect
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat menyimpan pengaturan.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handler untuk me-refresh settings dari server
  const handleRefreshSettings = () => {
    fetchSettings();
  };
  
  // Cek apakah user memiliki hak akses untuk mengubah settings
  const canEditSettings = user && (user.role === 'admin' || user.role === 'manager');

  if (loading) {
    return (
      <Container maxW="container.xl" py={10} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Memuat pengaturan...</Text>
      </Container>
    );
  }

  if (error && !globalSettings) {
    return (
      <Container maxW="container.xl" py={10}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          leftIcon={<FiRefreshCw />} 
          mt={4} 
          colorScheme="blue" 
          onClick={handleRefreshSettings}
        >
          Muat Ulang
        </Button>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={5}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={4}>Pengaturan Aplikasi</Heading>
          <Text color="gray.500">
            Konfigurasi pengaturan aplikasi untuk kebutuhan perusahaan Anda
          </Text>
        </Box>

        {!canEditSettings && (
          <Alert status="warning" mb={4}>
            <AlertIcon />
            <AlertDescription>
              Anda tidak memiliki hak akses untuk mengubah pengaturan aplikasi.
              Silahkan hubungi administrator.
            </AlertDescription>
          </Alert>
        )}

        <Flex justify="flex-end">
          <Button
            leftIcon={<FiSave />}
            colorScheme="blue"
            onClick={handleSaveSettings}
            isLoading={isSubmitting}
            isDisabled={!canEditSettings}
            loadingText="Menyimpan..."
          >
            Simpan Perubahan
          </Button>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {/* Profil Perusahaan */}
          <Card bg={cardBg} borderColor={borderColor} shadow="md" variant="outline">
            <CardHeader>
              <Flex align="center">
                <Icon as={FiUser} boxSize={5} color="blue.500" mr={3} />
                <Heading size="md">Profil Perusahaan</Heading>
              </Flex>
            </CardHeader>
            <Divider />
            <CardBody>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Nama Perusahaan</FormLabel>
                  <Input 
                    name="companyName"
                    value={formSettings.companyName}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Alamat</FormLabel>
                  <Input 
                    name="companyAddress"
                    value={formSettings.companyAddress}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Nomor Telepon</FormLabel>
                  <Input 
                    name="companyPhone"
                    value={formSettings.companyPhone}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input 
                    name="companyEmail"
                    value={formSettings.companyEmail}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>NPWP</FormLabel>
                  <Input 
                    name="taxNumber"
                    value={formSettings.taxNumber}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Pengaturan Keuangan */}
          <Card bg={cardBg} borderColor={borderColor} shadow="md" variant="outline">
            <CardHeader>
              <Flex align="center">
                <Icon as={FiDollarSign} boxSize={5} color="green.500" mr={3} />
                <Heading size="md">Pengaturan Keuangan</Heading>
              </Flex>
            </CardHeader>
            <Divider />
            <CardBody>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Mata Uang</FormLabel>
                  <Select 
                    name="currency"
                    value={formSettings.currency}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  >
                    <option value="IDR">Rupiah (IDR)</option>
                    <option value="USD">Dollar (USD)</option>
                    <option value="SGD">Singapore Dollar (SGD)</option>
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Simbol Mata Uang</FormLabel>
                  <Input 
                    name="currencySymbol"
                    value={formSettings.currencySymbol}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Awalan Nomor Faktur</FormLabel>
                  <Input 
                    name="invoicePrefix"
                    value={formSettings.invoicePrefix}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Fiscal Year Start Date (DD-MM)</FormLabel>
                  <Input 
                    name="fiscalYearStart"
                    value={formSettings.fiscalYearStart}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Tarif PPN (%)</FormLabel>
                  <Input 
                    name="vatRate"
                    type="number"
                    value={formSettings.vatRate}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Pengaturan Proyek */}
          <Card bg={cardBg} borderColor={borderColor} shadow="md" variant="outline">
            <CardHeader>
              <Flex align="center">
                <Icon as={FiTool} boxSize={5} color="purple.500" mr={3} />
                <Heading size="md">Project Settings</Heading>
              </Flex>
            </CardHeader>
            <Divider my={6} />
            <CardBody>
              <VStack spacing={4} align="stretch">
                <FormControl mb={4}>
                  <FormLabel>Project Code Prefix</FormLabel>
                  <Input 
                    name="projectPrefix"
                    value={formSettings.projectPrefix}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Jatuh Tempo Pembayaran Default (hari)</FormLabel>
                  <Input 
                    name="defaultPaymentTerms"
                    type="number"
                    value={formSettings.defaultPaymentTerms}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Hari Pengingat Pembayaran</FormLabel>
                  <Input 
                    name="reminderDays"
                    type="number"
                    value={formSettings.reminderDays}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Tarif Default Boring (per titik)</FormLabel>
                  <Input 
                    name="boringDefaultRate"
                    type="number"
                    value={formSettings.boringDefaultRate}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Tarif Default Sondir (per titik)</FormLabel>
                  <Input 
                    name="sondirDefaultRate"
                    type="number"
                    value={formSettings.sondirDefaultRate}
                    onChange={handleChange}
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Manajemen Pengguna */}
          <Card bg={cardBg} borderColor={borderColor} shadow="md" variant="outline">
            <CardHeader>
              <Flex align="center">
                <Icon as={FiUsers} boxSize={5} color="orange.500" mr={3} />
                <Heading size="md">Manajemen Pengguna</Heading>
              </Flex>
            </CardHeader>
            <Divider />
            <CardBody>
              <VStack spacing={4} align="stretch">
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">
                    Aktifkan Manajemen Peran Pengguna
                  </FormLabel>
                  <Switch 
                    isChecked={formSettings.enableUserRoles}
                    onChange={() => handleSwitchChange('enableUserRoles')}
                    colorScheme="blue"
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">
                    Aktifkan Portal Klien
                  </FormLabel>
                  <Switch 
                    isChecked={formSettings.allowClientPortal}
                    onChange={() => handleSwitchChange('allowClientPortal')}
                    colorScheme="blue"
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Keamanan */}
          <Card bg={cardBg} borderColor={borderColor} shadow="md" variant="outline">
            <CardHeader>
              <Flex align="center">
                <Icon as={FiShield} boxSize={5} color="red.500" mr={3} />
                <Heading size="md">Pengaturan Keamanan</Heading>
              </Flex>
            </CardHeader>
            <Divider />
            <CardBody>
              <VStack spacing={4} align="stretch">
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">
                    Aktifkan Autentikasi Dua Faktor
                  </FormLabel>
                  <Switch 
                    isChecked={formSettings.enableTwoFactor}
                    onChange={() => handleSwitchChange('enableTwoFactor')}
                    colorScheme="blue"
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">
                    Aktifkan Backup Otomatis
                  </FormLabel>
                  <Switch 
                    isChecked={formSettings.enableAutomaticBackup}
                    onChange={() => handleSwitchChange('enableAutomaticBackup')}
                    colorScheme="blue"
                    isDisabled={!canEditSettings}
                  />
                </FormControl>
                
                {formSettings.enableAutomaticBackup && (
                  <FormControl>
                    <FormLabel>Frekuensi Backup</FormLabel>
                    <Select 
                      name="backupFrequency"
                      value={formSettings.backupFrequency}
                      onChange={handleChange}
                      isDisabled={!canEditSettings}
                    >
                      <option value="daily">Harian</option>
                      <option value="weekly">Mingguan</option>
                      <option value="monthly">Bulanan</option>
                    </Select>
                  </FormControl>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Pengaturan Cetak */}
          <Card bg={cardBg} borderColor={borderColor} shadow="md" variant="outline">
            <CardHeader>
              <Flex align="center">
                <Icon as={FiPrinter} boxSize={5} color="teal.500" mr={3} />
                <Heading size="md">Pengaturan Cetak</Heading>
              </Flex>
            </CardHeader>
            <Divider />
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Text color="gray.500">
                  Pengaturan ini memungkinkan Anda menyesuaikan format cetak untuk faktur, laporan, dan dokumen lainnya.
                </Text>
                <Text>Pengaturan ini akan diimplementasikan pada versi berikutnya.</Text>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>
      </VStack>
    </Container>
  );
};

export default SettingsPage; 