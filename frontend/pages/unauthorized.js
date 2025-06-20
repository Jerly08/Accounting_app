import React from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { WarningTwoIcon } from '@chakra-ui/icons';

const Unauthorized = () => {
  const router = useRouter();

  return (
    <Flex
      minH={'100vh'}
      align={'center'}
      justify={'center'}
      bg={useColorModeValue('gray.50', 'gray.800')}>
      <Box
        textAlign="center"
        py={10}
        px={6}
        borderRadius="lg"
        bg={useColorModeValue('white', 'gray.700')}
        boxShadow="lg"
        maxW="md"
      >
        <WarningTwoIcon boxSize={'50px'} color={'orange.300'} />
        <Heading as="h2" size="xl" mt={6} mb={2}>
          Access Denied
        </Heading>
        <Text color={'gray.500'} mb={6}>
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </Text>

        <Button
          colorScheme="teal"
          onClick={() => router.push('/')}
          mb={2}
          width="full"
        >
          Go to Dashboard
        </Button>
        
        <Button
          variant="outline"
          colorScheme="teal"
          onClick={() => router.back()}
          width="full"
        >
          Go Back
        </Button>
      </Box>
    </Flex>
  );
};

export default Unauthorized; 