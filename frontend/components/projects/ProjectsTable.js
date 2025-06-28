import React, { useState } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Badge,
  Text,
  Flex,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  Select,
  Tooltip,
  Progress,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { FiMoreVertical, FiSearch, FiEye, FiEdit, FiRefreshCw } from 'react-icons/fi';
import { format } from 'date-fns';

const ProjectsTable = ({ projects, formatCurrency, onRecalculateWip }) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('projectCode');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Handle sort
  const handleSort = (field) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  // Filter and sort projects
  const filteredProjects = projects
    .filter(project => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        (project.projectCode?.toLowerCase().includes(searchLower)) ||
        (project.name?.toLowerCase().includes(searchLower)) ||
        (project.client?.name?.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle nested fields
      if (sortField === 'clientName') {
        aValue = a.client?.name || '';
        bValue = b.client?.name || '';
      }
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortOrder === 'asc' 
          ? aValue.getTime() - bValue.getTime() 
          : bValue.getTime() - aValue.getTime();
      }
      
      // Handle strings
      aValue = aValue?.toString() || '';
      bValue = bValue?.toString() || '';
      
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    });
  
  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'ongoing':
        return 'blue';
      case 'completed':
        return 'green';
      case 'cancelled':
        return 'red';
      case 'on hold':
        return 'orange';
      default:
        return 'gray';
    }
  };
  
  // Format date
  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yyyy');
    } catch (error) {
      return '-';
    }
  };
  
  // View project details
  const viewProject = (projectId) => {
    router.push(`/projects/${projectId}`);
  };
  
  // Edit project
  const editProject = (projectId) => {
    router.push(`/projects/${projectId}/edit`);
  };
  
  // Recalculate WIP for a specific project
  const handleRecalculateWip = (projectId) => {
    if (onRecalculateWip) {
      onRecalculateWip(projectId);
    }
  };
  
  return (
    <Box 
      bg={bgColor} 
      borderRadius="md" 
      shadow="sm"
      overflowX="auto"
    >
      <Box p={4} borderBottom="1px solid" borderColor={borderColor}>
        <HStack spacing={4} justify="space-between">
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          
          <HStack>
            <Text fontSize="sm">Sort by:</Text>
            <Select 
              size="sm" 
              width="150px"
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field);
                setSortOrder(order);
              }}
            >
              <option value="projectCode-asc">Code (A-Z)</option>
              <option value="projectCode-desc">Code (Z-A)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="clientName-asc">Client (A-Z)</option>
              <option value="clientName-desc">Client (Z-A)</option>
              <option value="wipValue-desc">WIP (High-Low)</option>
              <option value="wipValue-asc">WIP (Low-High)</option>
              <option value="progress-desc">Progress (High-Low)</option>
              <option value="progress-asc">Progress (Low-High)</option>
            </Select>
          </HStack>
        </HStack>
      </Box>
      
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th onClick={() => handleSort('projectCode')} cursor="pointer">
              Project Code
              {sortField === 'projectCode' && (
                <Text as="span" ml={1}>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Text>
              )}
            </Th>
            <Th onClick={() => handleSort('name')} cursor="pointer">
              Name
              {sortField === 'name' && (
                <Text as="span" ml={1}>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Text>
              )}
            </Th>
            <Th onClick={() => handleSort('clientName')} cursor="pointer">
              Client
              {sortField === 'clientName' && (
                <Text as="span" ml={1}>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Text>
              )}
            </Th>
            <Th onClick={() => handleSort('progress')} cursor="pointer">
              Progress
              {sortField === 'progress' && (
                <Text as="span" ml={1}>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Text>
              )}
            </Th>
            <Th onClick={() => handleSort('totalCost')} cursor="pointer">
              Total Cost
              {sortField === 'totalCost' && (
                <Text as="span" ml={1}>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Text>
              )}
            </Th>
            <Th onClick={() => handleSort('billedAmount')} cursor="pointer">
              Billed
              {sortField === 'billedAmount' && (
                <Text as="span" ml={1}>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Text>
              )}
            </Th>
            <Th onClick={() => handleSort('wipValue')} cursor="pointer">
              <Tooltip label="Work In Progress = (Progress × Total Value) - Total Billed">
                <Box>
                  WIP Value
                  {sortField === 'wipValue' && (
                    <Text as="span" ml={1}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Text>
                  )}
                </Box>
              </Tooltip>
            </Th>
            <Th onClick={() => handleSort('status')} cursor="pointer">
              Status
              {sortField === 'status' && (
                <Text as="span" ml={1}>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Text>
              )}
            </Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredProjects.length === 0 ? (
            <Tr>
              <Td colSpan={9} textAlign="center" py={4}>
                <Text color="gray.500">No projects found</Text>
              </Td>
            </Tr>
          ) : (
            filteredProjects.map((project) => (
              <Tr key={project.id}>
                <Td fontWeight="medium">{project.projectCode}</Td>
                <Td>{project.name}</Td>
                <Td>{project.client?.name || '-'}</Td>
                <Td>
                  <Box>
                    <Flex align="center" justify="space-between" mb={1}>
                      <Text fontSize="xs">{project.progress || 0}%</Text>
                    </Flex>
                    <Progress 
                      value={project.progress || 0} 
                      size="xs" 
                      colorScheme="green" 
                      borderRadius="full"
                    />
                  </Box>
                </Td>
                <Td isNumeric>{formatCurrency(project.costs || project.totalCost || 0)}</Td>
                <Td isNumeric>{formatCurrency(project.billed || project.billedAmount || 0)}</Td>
                <Td>
                  {project.status === 'completed' && Math.abs(project.wipValue || 0) > 0 ? (
                    <Tooltip label="This completed project has a non-zero WIP value. This may indicate a billing discrepancy that should be addressed.">
                      <Box color="red.500" fontWeight="bold">
                        {formatCurrency(project.wipValue || 0)}
                        <Text as="span" ml={1}>⚠️</Text>
                      </Box>
                    </Tooltip>
                  ) : (
                    <Text
                      color={
                        project.wipValue > 0
                          ? 'green.500'
                          : project.wipValue < 0
                          ? 'red.500'
                          : 'gray.500'
                      }
                    >
                      {formatCurrency(project.wipValue || 0)}
                    </Text>
                  )}
                </Td>
                <Td>
                  <Badge colorScheme={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </Td>
                <Td>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<FiMoreVertical />}
                      variant="ghost"
                      size="sm"
                      aria-label="Actions"
                    />
                    <MenuList>
                      <MenuItem icon={<FiEye />} onClick={() => viewProject(project.id)}>
                        View Details
                      </MenuItem>
                      <MenuItem icon={<FiEdit />} onClick={() => editProject(project.id)}>
                        Edit Project
                      </MenuItem>
                      <MenuItem 
                        icon={<FiRefreshCw />} 
                        onClick={() => handleRecalculateWip(project.id)}
                      >
                        Recalculate WIP
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
      
      <Box p={4} borderTop="1px solid" borderColor={borderColor}>
        <Text fontSize="sm" color="gray.500">
          Showing {filteredProjects.length} of {projects.length} projects
        </Text>
      </Box>
    </Box>
  );
};

export default ProjectsTable; 