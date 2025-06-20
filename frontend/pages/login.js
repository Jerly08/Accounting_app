import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useColorModeValue,
  Link,
  FormErrorMessage,
  Alert,
  AlertIcon,
  InputGroup,
  InputRightElement,
  IconButton,
  useToast,
  Code,
  Divider,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Redirect if already logged in
  if (isAuthenticated && !loading) {
    router.push('/');
    return null;
  }

  const validateForm = () => {
    let isValid = true;

    // Reset errors
    setUsernameError('');
    setPasswordError('');

    // Validate username
    if (!username) {
      setUsernameError('Username is required');
      isValid = false;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call login function from AuthContext
      await login(username, password);
      
      // Show success toast
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      // Router will redirect automatically due to isAuthenticated state change
      router.push('/');
    } catch (err) {
      // Error is already set in AuthContext, but we can show a toast here if needed
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast({
        title: 'Login failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setUsername('admin');
    setPassword('admin123');
  };

  return (
    <Flex
      minH={'100vh'}
      align={'center'}
      justify={'center'}
      bg={useColorModeValue('gray.50', 'gray.800')}>
      <Stack spacing={8} mx={'auto'} maxW={'lg'} py={12} px={6}>
        <Stack align={'center'}>
          <Heading fontSize={'4xl'}>Sign in to your account</Heading>
          <Text fontSize={'lg'} color={'gray.600'}>
            to enjoy all of our accounting features ✌️
          </Text>
        </Stack>
        <Box
          rounded={'lg'}
          bg={useColorModeValue('white', 'gray.700')}
          boxShadow={'lg'}
          p={8}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
              
              <Box mb={4} p={3} bg="blue.50" borderRadius="md">
                <Text fontSize="sm" color="blue.700" fontWeight="medium">
                  Demo Credentials
                </Text>
                <Text fontSize="sm" mt={1}>
                  Username: <Code>admin</Code>
                </Text>
                <Text fontSize="sm">
                  Password: <Code>admin123</Code>
                </Text>
                <Button 
                  size="sm" 
                  colorScheme="blue" 
                  variant="outline" 
                  mt={2} 
                  onClick={fillDemoCredentials}
                >
                  Fill Demo Credentials
                </Button>
              </Box>
              
              <Divider />
              
              <FormControl id="username" isInvalid={!!usernameError}>
                <FormLabel>Username</FormLabel>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <FormErrorMessage>{usernameError}</FormErrorMessage>
              </FormControl>
              <FormControl id="password" isInvalid={!!passwordError}>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <InputRightElement h={'full'}>
                    <IconButton
                      variant={'ghost'}
                      onClick={() => setShowPassword(!showPassword)}
                      icon={showPassword ? <ViewIcon /> : <ViewOffIcon />}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>{passwordError}</FormErrorMessage>
              </FormControl>
              <Stack spacing={10}>
                <Stack
                  direction={{ base: 'column', sm: 'row' }}
                  align={'start'}
                  justify={'space-between'}>
                  <Link color={'teal.400'}>Forgot password?</Link>
                </Stack>
                <Button
                  bg={'teal.400'}
                  color={'white'}
                  _hover={{
                    bg: 'teal.500',
                  }}
                  type="submit"
                  isLoading={loading || isSubmitting}
                  loadingText="Signing in">
                  Sign in
                </Button>
              </Stack>
              <Stack pt={6}>
                <Text align={'center'}>
                  Don't have an account?{' '}
                  <Link 
                    color="teal.400" 
                    onClick={() => router.push('/register')}
                    cursor="pointer"
                  >
                    Sign up
                  </Link>
                </Text>
              </Stack>
            </Stack>
          </form>
        </Box>
      </Stack>
    </Flex>
  );
};

export default LoginPage; 