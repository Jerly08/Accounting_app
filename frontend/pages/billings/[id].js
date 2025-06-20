import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  Badge,
  Stack,
  Grid,
  GridItem,
  Divider,
  HStack,
  VStack,
  Image,
  useToast,
  IconButton,
} from '@chakra-ui/react';
import { FiArrowLeft, FiDownload, FiEdit, FiPrinter } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

// Payment status colors
const STATUS_COLORS = {
  'unpaid': 'red',
  'partially_paid': 'orange',
  'paid': 'green',
};

const BillingDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Format percentage
  const formatPercentage = (percentage) => {
    return `${percentage}%`;
  };

  // Fetch billing details
  const fetchBillingDetails = async () => {
    if (!id || !token || !isAuthenticated) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/billings/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setBilling(response.data.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching billing details:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else if (error.response?.status === 404) {
        setError('Billing not found');
      } else {
        setError('Failed to load billing details. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && token && isAuthenticated) {
      fetchBillingDetails();
    }
  }, [id, token, isAuthenticated]);

  // Handle view invoice
  const handleViewInvoice = () => {
    if (billing?.invoice) {
      const invoiceUrl = billing.invoice.startsWith('http') 
        ? billing.invoice 
        : `${process.env.NEXT_PUBLIC_API_URL}${billing.invoice}`;
      window.open(invoiceUrl, '_blank');
    } else {
      toast({
        title: 'No Invoice',
        description: 'This billing does not have an invoice attached',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle edit billing
  const handleEditBilling = () => {
    router.push(`/billings/edit/${id}`);
  };

  // Handle print invoice
  const handlePrintInvoice = () => {
    // Generate a printable version of the invoice
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        title: 'Popup Blocked',
        description: 'Please allow popups for this site to print the invoice',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    const projectName = billing.project?.name || 'Unknown Project';
    const clientName = billing.project?.client?.name || 'Unknown Client';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${projectName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .company-info {
              font-weight: bold;
            }
            .invoice-title {
              text-align: center;
              margin: 20px 0;
              font-size: 24px;
              font-weight: bold;
            }
            .invoice-details {
              margin-bottom: 30px;
            }
            .client-info {
              margin-bottom: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .amount-row {
              font-weight: bold;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
            }
            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="company-info">
              <div>PT. Boring & Sondir</div>
              <div>Jl. Contoh No. 123</div>
              <div>Jakarta, Indonesia</div>
              <div>Phone: (021) 123-4567</div>
              <div>Email: info@boring-sondir.com</div>
            </div>
            <div>
              <h1>INVOICE</h1>
              <div>Invoice #: INV-${billing.id.toString().padStart(5, '0')}</div>
              <div>Date: ${formatDate(billing.billingDate)}</div>
              <div>Due Date: ${formatDate(billing.dueDate)}</div>
            </div>
          </div>
          
          <div class="client-info">
            <h3>Bill To:</h3>
            <div>${clientName}</div>
            <div>${billing.project?.client?.address || ''}</div>
            <div>Phone: ${billing.project?.client?.phone || 'N/A'}</div>
            <div>Email: ${billing.project?.client?.email || 'N/A'}</div>
          </div>
          
          <div class="invoice-details">
            <h3>Project Details:</h3>
            <div>Project: ${projectName}</div>
            <div>Project Code: ${billing.project?.projectCode || 'N/A'}</div>
            <div>Status: ${billing.status.replace('_', ' ').charAt(0).toUpperCase() + billing.status.replace('_', ' ').slice(1)}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Percentage</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${billing.description || `Payment for Project: ${projectName}`}</td>
                <td>${formatPercentage(billing.percentage)}</td>
                <td>${formatCurrency(billing.amount)}</td>
              </tr>
              <tr class="amount-row">
                <td colspan="2" style="text-align: right;">Total:</td>
                <td>${formatCurrency(billing.amount)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <button onclick="window.print()">Print Invoice</button>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Go back to billings list
  const handleGoBack = () => {
    router.push('/billings');
  };

  if (loading) {
    return <LoadingSpinner text="Loading billing details..." />;
  }

  if (error) {
    return (
      <Box p={4}>
        <Button leftIcon={<FiArrowLeft />} onClick={handleGoBack} mb={4}>
          Back to Billings
        </Button>
        <ErrorAlert message={error} />
      </Box>
    );
  }

  if (!billing) {
    return (
      <Box p={4}>
        <Button leftIcon={<FiArrowLeft />} onClick={handleGoBack} mb={4}>
          Back to Billings
        </Button>
        <ErrorAlert message="Billing not found" />
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Button leftIcon={<FiArrowLeft />} onClick={handleGoBack}>
          Back to Billings
        </Button>
        <HStack spacing={2}>
          <Button 
            leftIcon={<FiPrinter />} 
            colorScheme="blue" 
            onClick={handlePrintInvoice}
          >
            Print Invoice
          </Button>
          {billing.invoice && (
            <Button 
              leftIcon={<FiDownload />} 
              colorScheme="teal" 
              onClick={handleViewInvoice}
            >
              View Invoice
            </Button>
          )}
          <Button 
            leftIcon={<FiEdit />} 
            onClick={handleEditBilling}
          >
            Edit
          </Button>
        </HStack>
      </Flex>

      <Box bg="white" p={6} borderRadius="md" shadow="md">
        <Flex justify="space-between" align="start" mb={6}>
          <Box>
            <Heading as="h1" size="lg" mb={2}>
              Invoice #{billing.id.toString().padStart(5, '0')}
            </Heading>
            <Badge 
              colorScheme={STATUS_COLORS[billing.status] || 'gray'}
              fontSize="md"
              px={2}
              py={1}
            >
              {billing.status.replace('_', ' ').charAt(0).toUpperCase() + billing.status.replace('_', ' ').slice(1)}
            </Badge>
          </Box>
          <VStack align="flex-end" spacing={1}>
            <Text fontWeight="bold">Date: {formatDate(billing.billingDate)}</Text>
            <Text>Due Date: {formatDate(billing.dueDate)}</Text>
          </VStack>
        </Flex>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mb={6}>
          <GridItem>
            <Box bg="gray.50" p={4} borderRadius="md">
              <Text fontWeight="bold" mb={2}>Bill To:</Text>
              <Text>{billing.project?.client?.name || 'N/A'}</Text>
              <Text>{billing.project?.client?.address || 'N/A'}</Text>
              <Text>Phone: {billing.project?.client?.phone || 'N/A'}</Text>
              <Text>Email: {billing.project?.client?.email || 'N/A'}</Text>
            </Box>
          </GridItem>
          <GridItem>
            <Box bg="gray.50" p={4} borderRadius="md">
              <Text fontWeight="bold" mb={2}>Project Details:</Text>
              <Text>Project: {billing.project?.name || 'N/A'}</Text>
              <Text>Project Code: {billing.project?.projectCode || 'N/A'}</Text>
              <Text>Total Project Value: {formatCurrency(billing.project?.totalValue || 0)}</Text>
            </Box>
          </GridItem>
        </Grid>

        <Box mb={6}>
          <Heading as="h3" size="md" mb={4}>
            Billing Details
          </Heading>
          <Box bg="gray.50" p={4} borderRadius="md">
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4}>
              <Box>
                <Text fontWeight="bold">Percentage:</Text>
                <Text fontSize="xl">{formatPercentage(billing.percentage)}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold">Amount:</Text>
                <Text fontSize="xl" fontWeight="bold">{formatCurrency(billing.amount)}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold">Created:</Text>
                <Text>{formatDate(billing.createdAt)}</Text>
              </Box>
            </Grid>
          </Box>
        </Box>

        {billing.description && (
          <Box mb={6}>
            <Heading as="h3" size="md" mb={2}>
              Description
            </Heading>
            <Box bg="gray.50" p={4} borderRadius="md">
              <Text>{billing.description}</Text>
            </Box>
          </Box>
        )}

        {billing.invoice && (
          <Box mb={6}>
            <Heading as="h3" size="md" mb={2}>
              Invoice Document
            </Heading>
            <Box bg="gray.50" p={4} borderRadius="md">
              <HStack>
                <Button 
                  leftIcon={<FiDownload />} 
                  onClick={handleViewInvoice}
                >
                  View Invoice Document
                </Button>
              </HStack>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedBillingDetailPage = () => (
  <ProtectedRoute>
    <BillingDetailPage />
  </ProtectedRoute>
);

export default ProtectedBillingDetailPage; 