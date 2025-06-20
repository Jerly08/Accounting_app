import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Heading,
  Button,
  Flex,
  useToast,
} from '@chakra-ui/react';
import { FiArrowLeft } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';
import BillingForm from '../../../components/billings/BillingForm';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';

const EditBillingPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [billing, setBilling] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();

  // Fetch billing details and projects
  const fetchData = async () => {
    if (!id || !token || !isAuthenticated) return;

    try {
      setLoading(true);
      
      // Fetch billing details
      const billingResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/billings/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setBilling(billingResponse.data.data);
      
      // Fetch projects for reference
      const projectsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setProjects(projectsResponse.data.data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else if (error.response?.status === 404) {
        setError('Billing not found');
      } else {
        setError('Failed to load data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && token && isAuthenticated) {
      fetchData();
    }
  }, [id, token, isAuthenticated]);

  // Handle successful form submission
  const handleFormSuccess = () => {
    toast({
      title: 'Success',
      description: 'Billing updated successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    
    // Navigate back to billing detail page
    router.push(`/billings/${id}`);
  };

  // Go back to billing detail
  const handleGoBack = () => {
    router.push(`/billings/${id}`);
  };

  if (loading) {
    return <LoadingSpinner text="Loading billing data..." />;
  }

  if (error) {
    return (
      <Box p={4}>
        <Button leftIcon={<FiArrowLeft />} onClick={handleGoBack} mb={4}>
          Back to Billing
        </Button>
        <ErrorAlert message={error} />
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Edit Invoice #{billing?.id.toString().padStart(5, '0')}
        </Heading>
        <Button leftIcon={<FiArrowLeft />} onClick={handleGoBack}>
          Cancel
        </Button>
      </Flex>

      {billing && (
        <BillingForm
          isOpen={true}
          onClose={handleGoBack}
          projectId={billing.projectId}
          billing={billing}
          onSubmitSuccess={handleFormSuccess}
          projects={projects}
        />
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedEditBillingPage = () => (
  <ProtectedRoute>
    <EditBillingPage />
  </ProtectedRoute>
);

export default ProtectedEditBillingPage; 