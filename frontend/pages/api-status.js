import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Text,
  Heading,
  Container,
  VStack,
  HStack,
  Badge,
  Code,
  Divider,
  Alert,
  AlertIcon,
  Spinner,
  List,
  ListItem,
  ListIcon,
  Card,
  CardHeader,
  CardBody,
  Flex,
  useToast
} from '@chakra-ui/react';
import { FiCheck, FiX, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import ApiUtils from '../utils/apiUtils';

const ApiStatusPage = () => {
  const [apiStatus, setApiStatus] = useState(null);
  const [tokenStatus, setTokenStatus] = useState(null);
  const [endpointsStatus, setEndpointsStatus] = useState(null);
  const [axiosConfig, setAxiosConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, token } = useAuth();
  const toast = useToast();

  // Fungsi untuk mengecek konektivitas API
  const checkApiConnection = async () => {
    setIsLoading(true);
    try {
      // Cek koneksi API dasar
      const connectionStatus = await ApiUtils.checkApiConnection();
      setApiStatus(connectionStatus);

      // Cek token jika user terotentikasi
      if (isAuthenticated && token) {
        const tokenCheckResult = await ApiUtils.verifyToken(token);
        setTokenStatus(tokenCheckResult);
      }

      // Cek semua endpoint penting
      const endpoints = await ApiUtils.checkAllEndpoints();
      setEndpointsStatus(endpoints);

      // Dapatkan konfigurasi axios
      const config = ApiUtils.getAxiosConfig();
      setAxiosConfig({
        baseURL: config.baseURL || 'Not set',
        timeout: config.timeout || 'Default',
        headers: config.headers || {}
      });

    } catch (error) {
      console.error('Error checking API status:', error);
      toast({
        title: 'Error',
        description: 'Gagal memeriksa status API',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Jalankan pengecekan saat komponen dimuat
  useEffect(() => {
    checkApiConnection();
  }, []);

  // Render status badge
  const renderStatusBadge = (success) => {
    if (success === null || success === undefined) return null;
    if (success) {
      return <Badge colorScheme='green'>Connected</Badge>;
    }
    return <Badge colorScheme='red'>Failed</Badge>;
  };

  return (
    <Container maxW='container.lg' py={8}>
      <VStack spacing={5} align='stretch'>
        <Flex justify='space-between' align='center'>
          <Heading size='lg'>API Connection Status</Heading>
          <Button
            leftIcon={<FiRefreshCw />}
            colorScheme='blue'
            onClick={checkApiConnection}
            isLoading={isLoading}
            loadingText='Checking...'
          >
            Refresh Status
          </Button>
        </Flex>

        <Divider />

        {/* Status summary */}
        <Card variant="outline">
          <CardHeader bg="gray.50" py={3}>
            <Heading size="md">Connection Summary</Heading>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <Flex justify="center" align="center" py={10}>
                <Spinner mr={3} />
                <Text>Checking API connection...</Text>
              </Flex>
            ) : (
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <Text fontWeight="bold">API Server Status:</Text>
                  <HStack>
                    {renderStatusBadge(apiStatus?.success)}
                    <Text color={apiStatus?.success ? 'green.500' : 'red.500'}>
                      {apiStatus?.message || 'Not checked'}
                    </Text>
                  </HStack>
                </HStack>

                <HStack justify="space-between">
                  <Text fontWeight="bold">Authentication Status:</Text>
                  <HStack>
                    {renderStatusBadge(tokenStatus?.success)}
                    <Text color={tokenStatus?.success ? 'green.500' : 'red.500'}>
                      {isAuthenticated ? (tokenStatus?.message || 'Not checked') : 'Not logged in'}
                    </Text>
                  </HStack>
                </HStack>
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Axios configuration */}
        <Card variant="outline">
          <CardHeader bg="gray.50" py={3}>
            <Heading size="md">Axios Configuration</Heading>
          </CardHeader>
          <CardBody>
            {axiosConfig ? (
              <VStack align="stretch" spacing={2}>
                <HStack>
                  <Text fontWeight="bold" minW="100px">Base URL:</Text>
                  <Code>{axiosConfig.baseURL}</Code>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" minW="100px">Timeout:</Text>
                  <Code>{axiosConfig.timeout}ms</Code>
                </HStack>
                <Text fontWeight="bold">Headers:</Text>
                <Code p={2} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap">
                  {JSON.stringify(axiosConfig.headers, null, 2)}
                </Code>
              </VStack>
            ) : (
              <Text>No configuration data available</Text>
            )}
          </CardBody>
        </Card>

        {/* Endpoints status */}
        <Card variant="outline">
          <CardHeader bg="gray.50" py={3}>
            <Heading size="md">Endpoints Status</Heading>
          </CardHeader>
          <CardBody>
            {endpointsStatus ? (
              <List spacing={3}>
                {Object.entries(endpointsStatus).map(([endpoint, status]) => (
                  <ListItem key={endpoint}>
                    <ListIcon 
                      as={status.success ? FiCheck : FiX} 
                      color={status.success ? 'green.500' : 'red.500'} 
                    />
                    <Text as="span" fontWeight="bold">{endpoint}:</Text>{' '}
                    <Badge colorScheme={status.success ? 'green' : 'red'}>
                      {status.status || 'N/A'}
                    </Badge>{' '}
                    <Text as="span" color="gray.600">{status.message}</Text>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Text>No endpoint data available</Text>
            )}
          </CardBody>
        </Card>

        {/* Troubleshooting guide */}
        <Card variant="outline">
          <CardHeader bg="gray.50" py={3}>
            <Heading size="md">Troubleshooting Guide</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Alert status="info">
                <AlertIcon />
                <Text>
                  If you're experiencing API connection issues, try the following steps:
                </Text>
              </Alert>

              <List spacing={2}>
                <ListItem>
                  <ListIcon as={FiAlertTriangle} color="orange.500" />
                  <Text as="span">Verify backend server is running on port 5000</Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={FiAlertTriangle} color="orange.500" />
                  <Text as="span">Check CORS configuration in backend</Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={FiAlertTriangle} color="orange.500" />
                  <Text as="span">Verify network access between frontend and backend</Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={FiAlertTriangle} color="orange.500" />
                  <Text as="span">Check for browser console errors</Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={FiAlertTriangle} color="orange.500" />
                  <Text as="span">Try clearing localStorage and refreshing</Text>
                </ListItem>
              </List>

              <Box>
                <Button onClick={() => {
                  localStorage.clear();
                  toast({
                    title: 'Storage Cleared',
                    description: 'Local storage has been cleared. Please refresh the page.',
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                  });
                }}>
                  Clear Local Storage
                </Button>
              </Box>
            </VStack>
          </CardBody>
        </Card>

      </VStack>
    </Container>
  );
};

export default ApiStatusPage; 