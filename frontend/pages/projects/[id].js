import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Heading,
  Text,
  Flex,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  GridItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  useToast,
  Spinner,
  Divider,
  HStack,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useDisclosure,
} from '@chakra-ui/react';
import { FiEdit, FiCalendar, FiDollarSign, FiUser, FiClock, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import ProjectForm from '../../components/projects/ProjectForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import ProjectCostsTab from '../../components/projects/ProjectCostsTab';
import BillingsTab from '../../components/projects/BillingsTab';
import ProjectReportsTab from '../../components/projects/ProjectReportsTab';

// Status colors for badges
const statusColors = {
  ongoing: 'green',
  completed: 'blue',
  cancelled: 'red',
};

const ProjectDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
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
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Calculate project duration in days
  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Not available';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} days`;
  };

  // Fetch project details
  const fetchProjectDetails = async () => {
    if (!id || !token || !isAuthenticated) {
      if (!id) {
        setError('Project ID is missing');
      } else {
        setError('You must be logged in to view project details');
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const response = await axios.get(`/api/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setProject(response.data.data || response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching project details:', error);
      
      if (error.response?.status === 404) {
        setError('Project not found');
      } else if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else {
        setError('Failed to load project details. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission success
  const handleFormSuccess = () => {
    fetchProjectDetails();
    onClose();
  };

  useEffect(() => {
    if (id && token && isAuthenticated) {
      fetchProjectDetails();
    }
  }, [id, token, isAuthenticated]);

  // Handle edit button click
  const handleEditClick = () => {
    if (project) {
      onOpen();
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    router.push('/projects');
  };

  if (loading) {
    return <LoadingSpinner text="Loading project details..." />;
  }

  if (error) {
    return (
      <Box p={4}>
        <ErrorAlert message={error} />
        <Button mt={4} onClick={handleBackClick}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box p={4}>
        <Alert status="warning">
          <AlertIcon />
          <AlertTitle>Project Not Found</AlertTitle>
          <AlertDescription>The requested project could not be found.</AlertDescription>
        </Alert>
        <Button mt={4} onClick={handleBackClick}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Button variant="outline" onClick={handleBackClick}>
          Back to Projects
        </Button>
        <Button leftIcon={<FiEdit />} colorScheme="blue" onClick={handleEditClick}>
          Edit Project
        </Button>
      </Flex>

      <Box mb={6}>
        <Flex 
          justify="space-between" 
          align={{ base: 'start', md: 'center' }} 
          direction={{ base: 'column', md: 'row' }}
          mb={2}
        >
          <Heading as="h1" size="lg">
            {project.name}
          </Heading>
          <Badge 
            colorScheme={statusColors[project.status] || 'gray'} 
            fontSize="md" 
            px={3}
            py={1}
            borderRadius="md"
            mt={{ base: 2, md: 0 }}
          >
            {project.status === 'ongoing' ? 'Active' : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </Badge>
        </Flex>
        <Text color="gray.600" fontSize="md">
          Project Code: {project.projectCode}
        </Text>
      </Box>

      <Grid 
        templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
        gap={4}
        mb={8}
      >
        <GridItem>
          <Stat
            px={4}
            py={3}
            shadow="base"
            borderWidth="1px"
            borderRadius="md"
            bg="white"
          >
            <Flex align="center" mb={2}>
              <Icon as={FiDollarSign} color="green.500" mr={2} />
              <StatLabel>Total Value</StatLabel>
            </Flex>
            <StatNumber fontSize="xl">{formatCurrency(project.totalValue)}</StatNumber>
          </Stat>
        </GridItem>
        
        <GridItem>
          <Stat
            px={4}
            py={3}
            shadow="base"
            borderWidth="1px"
            borderRadius="md"
            bg="white"
          >
            <Flex align="center" mb={2}>
              <Icon as={FiCalendar} color="blue.500" mr={2} />
              <StatLabel>Duration</StatLabel>
            </Flex>
            <StatNumber fontSize="xl">
              {calculateDuration(project.startDate, project.endDate)}
            </StatNumber>
            <StatHelpText>
              {formatDate(project.startDate)} - {formatDate(project.endDate)}
            </StatHelpText>
          </Stat>
        </GridItem>
        
        <GridItem>
          <Stat
            px={4}
            py={3}
            shadow="base"
            borderWidth="1px"
            borderRadius="md"
            bg="white"
          >
            <Flex align="center" mb={2}>
              <Icon as={FiUser} color="purple.500" mr={2} />
              <StatLabel>Client</StatLabel>
            </Flex>
            <StatNumber fontSize="xl" isTruncated>
              {project.client?.name || 'N/A'}
            </StatNumber>
          </Stat>
        </GridItem>
        
        <GridItem>
          <Stat
            px={4}
            py={3}
            shadow="base"
            borderWidth="1px"
            borderRadius="md"
            bg="white"
          >
            <Flex align="center" mb={2}>
              <Icon as={FiClock} color="orange.500" mr={2} />
              <StatLabel>Progress</StatLabel>
            </Flex>
            <StatNumber fontSize="xl">
              {project.status === 'completed' ? '100%' : 'In Progress'}
            </StatNumber>
          </Stat>
        </GridItem>
      </Grid>

      {project.description && (
        <Box mb={6} p={4} borderWidth="1px" borderRadius="md" bg="white">
          <Heading as="h3" size="md" mb={2}>
            Project Description
          </Heading>
          <Text>{project.description}</Text>
        </Box>
      )}

      <Divider my={6} />

      <Tabs isLazy colorScheme="teal" variant="enclosed">
        <TabList>
          <Tab>Costs</Tab>
          <Tab>Billings</Tab>
          <Tab>Reports</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <ProjectCostsTab projectId={id} />
          </TabPanel>
          <TabPanel>
            <BillingsTab projectId={id} />
          </TabPanel>
          <TabPanel>
            <ProjectReportsTab projectId={id} />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Project Form Modal */}
      {isOpen && (
        <ProjectForm
          isOpen={isOpen}
          onClose={onClose}
          project={project}
          onSubmitSuccess={handleFormSuccess}
        />
      )}
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedProjectDetailPage = () => (
  <ProtectedRoute>
    <ProjectDetailPage />
  </ProtectedRoute>
);

export default ProtectedProjectDetailPage; 