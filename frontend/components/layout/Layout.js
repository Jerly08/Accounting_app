import React, { useState } from 'react';
import { Box, Flex, useDisclosure } from '@chakra-ui/react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isMobileView, setIsMobileView] = useState(false);

  // Toggle for mobile view
  const toggleMobileView = () => {
    setIsMobileView(!isMobileView);
  };

  return (
    <Flex direction="column" h="100vh">
      <Navbar 
        onOpen={onOpen} 
        isMobileView={isMobileView} 
        toggleMobileView={toggleMobileView} 
      />
      <Flex flex="1" overflow="hidden">
        <Sidebar 
          isOpen={isOpen} 
          onClose={onClose} 
          display={{ base: 'none', md: 'block' }} 
        />
        <Box
          flex="1"
          p="4"
          bg="gray.50"
          overflowY="auto"
          transition="margin-left 0.3s"
          ml={{ base: 0, md: '250px' }}
        >
          {children}
        </Box>
      </Flex>
    </Flex>
  );
};

export default Layout; 