import { Flex, Spinner, Text, Box } from '@chakra-ui/react';

const LoadingSpinner = ({ 
  text = 'Loading...', 
  size = 'xl', 
  height = '200px',
  fullPage = false 
}) => {
  const content = (
    <Flex
      direction="column"
      align="center"
      justify="center"
      h={fullPage ? '100vh' : height}
      w="100%"
    >
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="teal.500"
        size={size}
      />
      {text && (
        <Text mt={4} fontSize="lg" color="gray.600">
          {text}
        </Text>
      )}
    </Flex>
  );

  if (fullPage) {
    return <Box position="fixed" top="0" left="0" right="0" bottom="0" bg="white" zIndex="9999">{content}</Box>;
  }

  return content;
};

export default LoadingSpinner; 