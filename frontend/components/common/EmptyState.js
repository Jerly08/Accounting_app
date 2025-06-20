import { Box, Text, Icon, Button, VStack } from '@chakra-ui/react';
import { FiInbox } from 'react-icons/fi';

const EmptyState = ({
  title = 'No data found',
  message = 'There are no items to display',
  icon = FiInbox,
  actionText,
  onAction,
  py = 10
}) => {
  return (
    <Box textAlign="center" py={py}>
      <VStack spacing={4}>
        <Icon as={icon} boxSize="50px" color="gray.400" />
        <Text fontSize="lg" fontWeight="medium">
          {title}
        </Text>
        <Text color="gray.500">
          {message}
        </Text>
        {actionText && onAction && (
          <Button
            colorScheme="teal"
            size="md"
            onClick={onAction}
          >
            {actionText}
          </Button>
        )}
      </VStack>
    </Box>
  );
};

export default EmptyState; 