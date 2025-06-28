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
  Select,
  Textarea,
  useToast,
  Text,
  Badge,
  VStack,
  HStack,
  Box,
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// Status colors
const STATUS_COLORS = {
  'pending': 'yellow',
  'unpaid': 'orange',
  'paid': 'green',
  'rejected': 'red',
};

// Valid transitions
export const VALID_TRANSITIONS = {
  'pending': ['unpaid', 'rejected'],
  'unpaid': ['paid', 'rejected'],
  'paid': [],
  'rejected': []
};

// Cash/Bank accounts
const CASH_ACCOUNTS = [
  { code: '1101', name: 'Kas' },
  { code: '1102', name: 'Bank BCA' },
  { code: '1103', name: 'Bank Mandiri' },
];

const BillingStatusModal = ({ isOpen, onClose, billing, onStatusChange }) => {
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [cashAccount, setCashAccount] = useState('1102'); // Default to Bank BCA
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const toast = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewStatus('');
      setNotes('');
      setCashAccount('1102');
    }
  }, [isOpen]);

  // Get available status options based on current status
  const getStatusOptions = () => {
    if (!billing) return [];
    return VALID_TRANSITIONS[billing.status] || [];
  };

  const handleSubmit = async () => {
    if (!newStatus) {
      toast({
        title: 'Status wajib dipilih',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate cash account if status is paid
    if (newStatus === 'paid' && !cashAccount) {
      toast({
        title: 'Akun kas/bank wajib dipilih',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/billings/${billing.id}/status`,
        { 
          status: newStatus, 
          notes,
          // Untuk status paid, kita perlu menentukan akun kas/bank yang digunakan
          cashAccount: newStatus === 'paid' ? cashAccount : undefined
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast({
          title: 'Status berhasil diubah',
          description: `Status tagihan berhasil diubah ke ${newStatus}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Notify parent component
        if (onStatusChange) {
          onStatusChange(response.data.data);
        }

        onClose();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal mengubah status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Ubah Status Tagihan</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {billing && (
            <VStack spacing={4} align="stretch">
              <HStack>
                <Text fontWeight="bold">Status Saat Ini:</Text>
                <Badge colorScheme={STATUS_COLORS[billing.status]} fontSize="0.9em" p={1}>
                  {billing.status.toUpperCase()}
                </Badge>
              </HStack>

              <FormControl isRequired>
                <FormLabel>Status Baru</FormLabel>
                <Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="" disabled>Pilih status baru</option>
                  {getStatusOptions().map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {/* Cash account selection - only shown when status is paid */}
              {newStatus === 'paid' && (
                <FormControl isRequired>
                  <FormLabel>Akun Kas/Bank</FormLabel>
                  <Select
                    value={cashAccount}
                    onChange={(e) => setCashAccount(e.target.value)}
                  >
                    {CASH_ACCOUNTS.map((account) => (
                      <option key={account.code} value={account.code}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </Select>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Pilih akun kas/bank yang digunakan untuk penerimaan pembayaran
                  </Text>
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Catatan (opsional)</FormLabel>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tambahkan catatan tentang perubahan status ini"
                />
              </FormControl>

              {newStatus === 'rejected' && (
                <Box p={3} bg="red.50" borderRadius="md">
                  <Text fontSize="sm" color="red.600">
                    <strong>Perhatian:</strong> Mengubah status menjadi "Rejected" akan membatalkan semua jurnal yang terkait dengan tagihan ini. Tindakan ini tidak dapat dibatalkan.
                  </Text>
                </Box>
              )}
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Batal
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={!newStatus}
          >
            Simpan
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BillingStatusModal; 