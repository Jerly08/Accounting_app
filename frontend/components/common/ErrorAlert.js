import { Alert, AlertIcon, AlertTitle, AlertDescription, Box } from '@chakra-ui/react';

const ErrorAlert = ({ 
  title = 'Error', 
  message, 
  mb = 4, 
  status = 'error' 
}) => {
  if (!message) return null;
  
  return (
    <Alert status={status} variant="left-accent" borderRadius="md" mb={mb}>
      <AlertIcon />
      <Box>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Box>
    </Alert>
  );
};

export default ErrorAlert; 