import React from 'react';
import {
  Box,
  Flex,
  VStack,
  Icon,
  Text,
  Divider,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  useColorModeValue,
  IconButton,
  CloseButton,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiHome,
  FiUsers,
  FiFileText,
  FiFolder,
  FiDollarSign,
  FiBarChart2,
  FiSettings,
  FiDatabase,
  FiTruck,
  FiCreditCard,
  FiActivity,
  FiBox,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

// Navigation items with grouping
const NavItems = [
  { 
    heading: "Dashboard", 
    items: [
      { name: 'Dashboard', icon: FiHome, path: '/' }
    ]
  },
  {
    heading: "Master Data",
    items: [
      { name: 'Clients', icon: FiUsers, path: '/clients' },
      { name: 'Chart of Accounts', icon: FiFileText, path: '/accounts' }
    ]
  },
  {
    heading: "Project Management",
    items: [
      { name: 'Projects', icon: FiFolder, path: '/projects' },
      { name: 'Project Costs', icon: FiDollarSign, path: '/project-costs' }
    ]
  },
  {
    heading: "Financial",
    items: [
      { name: 'Billings', icon: FiFileText, path: '/billings' },
      { name: 'Transactions', icon: FiCreditCard, path: '/financial/transactions' },
      { name: 'Fixed Assets', icon: FiTruck, path: '/financial/fixed-assets' },
      { name: 'WIP Management', icon: FiActivity, path: '/financial/wip' }
    ]
  },
  {
    heading: "Reports",
    items: [
      { name: 'Financial Reports', icon: FiBarChart2, path: '/reports' }
    ]
  },
  {
    heading: "Settings",
    items: [
      { name: 'Settings', icon: FiSettings, path: '/settings' },
      { name: 'User Management', icon: FiUsers, path: '/users', admin: true }
    ]
  }
];

// Navigation item component
const NavItem = ({ icon, children, path, active }) => {
  return (
    <Box as="a" href={path} _hover={{ textDecoration: 'none' }}>
      <Flex
        align="center"
        px="4"
        py="3"
        cursor="pointer"
        role="group"
        fontSize="sm"
        fontWeight={active ? "bold" : "normal"}
        color={active ? "teal.500" : "gray.600"}
        bg={active ? "teal.50" : "transparent"}
        _hover={{
          bg: 'teal.50',
          color: 'teal.500',
        }}
        borderRadius="md"
        transition="all 0.2s"
      >
        {icon && <Icon mr="3" fontSize="16" as={icon} />}
        {children}
      </Flex>
    </Box>
  );
};

// Navigation group component
const NavGroup = ({ heading, children }) => {
  return (
    <Box>
      <Text
        px="3"
        fontSize="xs"
        fontWeight="semibold"
        textTransform="uppercase"
        color="gray.500"
        letterSpacing="wider"
        mt="5"
        mb="2"
      >
        {heading}
      </Text>
      <VStack spacing="1" align="stretch">
        {children}
      </VStack>
    </Box>
  );
};

// Sidebar component
const Sidebar = ({ isOpen, onClose, ...rest }) => {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const SidebarContent = (props) => (
    <Box
      bg={useColorModeValue('white', 'gray.900')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
      {...props}
    >
      <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
        <Box>
          {/* Kosong, tulisan "Accounting App" dihilangkan */}
        </Box>
        <CloseButton display={{ base: 'flex', md: 'none' }} onClick={onClose} />
      </Flex>
      <Divider />
      <Box overflowY="auto" h="calc(100vh - 80px)" px="3" py="2">
        {NavItems.map((group) => (
          <NavGroup key={group.heading} heading={group.heading}>
            {group.items
              .filter(item => !item.admin || (item.admin && isAdmin))
              .map((item) => (
                <NavItem 
                  key={item.name} 
                  icon={item.icon} 
                  path={item.path}
                  active={router.pathname === item.path}
                >
                  {item.name}
                </NavItem>
              ))}
          </NavGroup>
        ))}
      </Box>
    </Box>
  );

  return (
    <>
      <SidebarContent display={{ base: 'none', md: 'block' }} {...rest} />
      <Drawer
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        returnFocusOnClose={false}
        onOverlayClick={onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <SidebarContent />
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default Sidebar; 