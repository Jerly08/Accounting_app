import { useState } from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Text,
  Icon,
  Button,
  VStack,
  HStack,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import {
  FiFileText,
  FiPieChart,
  FiBarChart2,
  FiTrendingUp,
  FiDollarSign,
  FiArrowRight,
} from 'react-icons/fi';
import ProtectedRoute from '../../components/auth/ProtectedRoute';

const ReportsPage = () => {
  const router = useRouter();
  const cardBg = useColorModeValue('white', 'gray.700');
  const cardHoverBg = useColorModeValue('gray.50', 'gray.600');

  // Report categories
  const reportCategories = [
    {
      title: 'Project Profitability',
      description: 'View profit and loss statements for each project',
      icon: FiPieChart,
      path: '/reports/project-profitability',
      color: 'blue.500',
    },
    {
      title: 'Balance Sheet',
      description: 'View your company\'s assets, liabilities, and equity',
      icon: FiBarChart2,
      path: '/reports/balance-sheet',
      color: 'green.500',
    },
    {
      title: 'Cash Flow',
      description: 'Track your cash inflows and outflows over time',
      icon: FiTrendingUp,
      path: '/reports/cash-flow',
      color: 'purple.500',
    },
    {
      title: 'WIP Report',
      description: 'Work in Progress analysis for ongoing projects',
      icon: FiDollarSign,
      path: '/reports/wip-report',
      color: 'orange.500',
    },
  ];

  // Navigate to report page
  const navigateToReport = (path) => {
    router.push(path);
  };

  return (
    <Box p={4}>
      <Heading as="h1" size="lg" mb={6}>
        Financial Reports
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
        {reportCategories.map((category) => (
          <Card 
            key={category.title}
            bg={cardBg}
            shadow="md"
            borderRadius="lg"
            overflow="hidden"
            transition="all 0.3s"
            _hover={{
              transform: 'translateY(-4px)',
              shadow: 'lg',
              bg: cardHoverBg,
              cursor: 'pointer',
            }}
            onClick={() => navigateToReport(category.path)}
          >
            <CardHeader>
              <HStack spacing={4}>
                <Box 
                  p={2} 
                  borderRadius="md" 
                  bg={`${category.color}20`}
                >
                  <Icon as={category.icon} boxSize="24px" color={category.color} />
                </Box>
                <Heading size="md">{category.title}</Heading>
              </HStack>
            </CardHeader>
            <CardBody pt={0}>
              <Text color="gray.600">{category.description}</Text>
            </CardBody>
            <Divider />
            <CardFooter>
              <Button 
                rightIcon={<FiArrowRight />} 
                variant="ghost" 
                colorScheme="blue"
                size="sm"
              >
                View Report
              </Button>
            </CardFooter>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );
};

// Wrap with ProtectedRoute
const ProtectedReportsPage = () => (
  <ProtectedRoute>
    <ReportsPage />
  </ProtectedRoute>
);

export default ProtectedReportsPage; 