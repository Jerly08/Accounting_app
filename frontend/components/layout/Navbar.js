import React from 'react';
import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  Stack,
  Collapse,
  Icon,
  Link,
  Popover,
  PopoverTrigger,
  PopoverContent,
  useColorModeValue,
  useBreakpointValue,
  useDisclosure,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from '@chakra-ui/react';
import {
  HamburgerIcon,
  CloseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@chakra-ui/icons';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import { useRouter } from 'next/router';

const Navbar = ({ onOpen, isMobileView, toggleMobileView }) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <Box
      bg={useColorModeValue('white', 'gray.800')}
      color={useColorModeValue('gray.600', 'white')}
      borderBottom={1}
      borderStyle={'solid'}
      borderColor={useColorModeValue('gray.200', 'gray.900')}
      px={4}
      position="sticky"
      top="0"
      zIndex="sticky"
    >
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        <IconButton
          display={{ base: 'flex', md: 'none' }}
          onClick={onOpen}
          variant="outline"
          aria-label="open menu"
          icon={<HamburgerIcon />}
        />

        <Box display={{ base: 'none', md: 'flex' }}></Box>
        
        <Flex alignItems={'center'}>
          <Stack direction={'row'} spacing={7}>
            <Menu>
              <MenuButton
                as={Button}
                rounded={'full'}
                variant={'link'}
                cursor={'pointer'}
                minW={0}>
                <Flex align="center">
                  <Avatar
                    size={'sm'}
                    name={user?.name || 'User'}
                  />
                  <Text ml="2" display={{ base: 'none', md: 'flex' }}>
                    {user?.name || 'User'}
                  </Text>
                </Flex>
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FiUser />}>Profile</MenuItem>
                <MenuItem icon={<FiSettings />} onClick={() => router.push('/settings')}>Settings</MenuItem>
                <MenuDivider />
                <MenuItem icon={<FiLogOut />} onClick={logout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </Stack>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Navbar; 