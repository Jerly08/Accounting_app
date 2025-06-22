import { useState } from 'react';
import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  HStack,
  Text,
  Icon,
  Spinner,
  Box,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  Divider,
  MenuDivider,
  MenuGroup,
  Badge,
} from '@chakra-ui/react';
import { 
  FiDownload, 
  FiFileText, 
  FiFilePlus, 
  FiSettings, 
  FiInfo, 
  FiPieChart, 
  FiBarChart2, 
  FiGrid 
} from 'react-icons/fi';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Cash Flow Export Button Component
 * 
 * @param {Object} props
 * @param {Object} props.cashFlowData - Cash flow data with operating, investing, financing
 * @param {Object} props.totals - Totals for each category and net cash flow
 * @param {string} props.startDate - Start date for the report
 * @param {string} props.endDate - End date for the report
 * @param {Function} props.formatCurrency - Function to format currency
 * @param {Function} props.formatDate - Function to format date
 * @param {Function} props.onExport - Callback function when export is completed
 * @param {boolean} props.isDisabled - Whether the button is disabled
 */
const CashFlowExportButton = ({
  cashFlowData = {
    operating: { activities: [] },
    investing: { activities: [] },
    financing: { activities: [] }
  },
  totals = {
    totalOperating: 0,
    totalInvesting: 0,
    totalFinancing: 0,
    netCashFlow: 0
  },
  startDate,
  endDate,
  formatCurrency = (val) => val.toString(),
  formatDate = (val) => val.toString(),
  onExport,
  isDisabled = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(null);
  const [exportOption, setExportOption] = useState('all');
  const toast = useToast();

  // Prepare file name based on date range
  const getFileName = () => {
    const formattedStartDate = startDate.split('-').join('');
    const formattedEndDate = endDate.split('-').join('');
    return `cash_flow_report_${formattedStartDate}_to_${formattedEndDate}`;
  };

  // Prepare data for export
  const prepareExportData = (option) => {
    // Base data preparation for export
    const prepareActivityData = (activityData, categoryName) => {
      if (!activityData || !activityData.activities || activityData.activities.length === 0) {
        return [];
      }
      
      return activityData.activities.map(activity => ({
        Category: categoryName,
        Date: formatDate(activity.date),
        Description: activity.description,
        Account: activity.accountName || '',
        Amount: activity.amount,
        'Amount (Formatted)': formatCurrency(activity.amount)
      }));
    };

    // Prepare summary data
    const prepareSummaryData = () => {
      return [
        {
          Category: 'Summary',
          Date: '',
          Description: 'Total Operating Activities',
          Account: '',
          Amount: totals.totalOperating || 0,
          'Amount (Formatted)': formatCurrency(totals.totalOperating || 0)
        },
        {
          Category: 'Summary',
          Date: '',
          Description: 'Total Investing Activities',
          Account: '',
          Amount: totals.totalInvesting || 0,
          'Amount (Formatted)': formatCurrency(totals.totalInvesting || 0)
        },
        {
          Category: 'Summary',
          Date: '',
          Description: 'Total Financing Activities',
          Account: '',
          Amount: totals.totalFinancing || 0,
          'Amount (Formatted)': formatCurrency(totals.totalFinancing || 0)
        },
        {
          Category: 'Summary',
          Date: '',
          Description: 'Net Cash Flow',
          Account: '',
          Amount: totals.netCashFlow || 0,
          'Amount (Formatted)': formatCurrency(totals.netCashFlow || 0)
        }
      ];
    };

    // Ensure cashFlowData and its properties exist
    const safeData = {
      operating: cashFlowData?.operating || { activities: [] },
      investing: cashFlowData?.investing || { activities: [] },
      financing: cashFlowData?.financing || { activities: [] }
    };

    // Switch based on export option
    switch (option) {
      case 'operating':
        return prepareActivityData(safeData.operating, 'Operating');
      case 'investing':
        return prepareActivityData(safeData.investing, 'Investing');
      case 'financing':
        return prepareActivityData(safeData.financing, 'Financing');
      case 'summary':
        return prepareSummaryData();
      case 'all':
      default:
        return [
          ...prepareActivityData(safeData.operating, 'Operating'),
          ...prepareActivityData(safeData.investing, 'Investing'),
          ...prepareActivityData(safeData.financing, 'Financing'),
          ...prepareSummaryData()
        ];
    }
  };

  // Export function
  const handleExport = async (format, option = 'all') => {
    setExportOption(option);
    const data = prepareExportData(option);
    
    if (!data || data.length === 0) {
      toast({
        title: 'Tidak Ada Data',
        description: 'Tidak ada data yang tersedia untuk diekspor',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsExporting(true);
    setExportType(format);

    try {
      let exportedFile = null;
      const filename = getFileName();
      const optionSuffix = option !== 'all' ? `_${option}` : '';
      const fullFilename = `${filename}${optionSuffix}`;

      switch (format) {
        case 'xlsx':
          exportedFile = exportToExcel(data, `${fullFilename}.xlsx`, option);
          break;
        case 'csv':
          exportedFile = exportToCsv(data, `${fullFilename}.csv`);
          break;
        case 'pdf':
          exportedFile = exportToPdf(data, `${fullFilename}.pdf`, option);
          break;
        case 'json':
          exportedFile = exportToJson(data, `${fullFilename}.json`);
          break;
        default:
          throw new Error(`Format yang tidak didukung: ${format}`);
      }

      if (onExport) {
        onExport(format, exportedFile, option);
      }

      toast({
        title: 'Ekspor Berhasil',
        description: `Laporan Arus Kas telah diekspor dalam format ${format.toUpperCase()}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Ekspor Gagal',
        description: error.message || 'Terjadi kesalahan saat mengekspor data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Excel export
  const exportToExcel = (data, filename, option) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    // Add sheet name based on option
    const sheetName = option === 'all' ? 'Laporan Arus Kas' : 
                      option === 'operating' ? 'Aktivitas Operasi' :
                      option === 'investing' ? 'Aktivitas Investasi' :
                      option === 'financing' ? 'Aktivitas Pendanaan' : 'Ringkasan';
                      
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Add metadata
    workbook.Props = {
      Title: `Laporan Arus Kas (${formatDate(startDate)} - ${formatDate(endDate)})`,
      Subject: "Laporan Keuangan",
      Author: "Aplikasi Akuntansi Boring & Sondir",
      CreatedDate: new Date()
    };
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(blob, filename);
    return blob;
  };

  // CSV export
  const exportToCsv = (data, filename) => {
    // Convert data to CSV format
    const replacer = (key, value) => value === null ? '' : value;
    const header = Object.keys(data[0]);
    const csv = [
      header.join(','),
      ...data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n');
    
    // Add BOM for Excel UTF-8 compatibility
    const csvContent = '\ufeff' + csv;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    saveAs(blob, filename);
    return blob;
  };

  // PDF export
  const exportToPdf = (data, filename, option) => {
    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Add title
    doc.setFontSize(16);
    doc.text('Cash Flow Report', pageWidth / 2, 20, { align: 'center' });
    
    // Add period
    doc.setFontSize(12);
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, pageWidth / 2, 30, { align: 'center' });
    
    // Add current date
    const currentDate = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(`Generated on: ${currentDate}`, pageWidth / 2, 40, { align: 'center' });
    
    doc.line(20, 45, pageWidth - 20, 45);
    
    let yPos = 55;
    
    // Different content based on option
    if (option === 'all' || option === 'summary') {
      // Add summary table
      doc.setFontSize(14);
      doc.text('Summary', 20, yPos);
      yPos += 10;
      
      doc.autoTable({
        startY: yPos,
        head: [['Category', 'Amount']],
        body: [
          ['Operating Activities', formatCurrency(totals?.totalOperating || 0)],
          ['Investing Activities', formatCurrency(totals?.totalInvesting || 0)],
          ['Financing Activities', formatCurrency(totals?.totalFinancing || 0)],
          ['Net Cash Flow', formatCurrency(totals?.netCashFlow || 0)]
        ],
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [66, 139, 202] },
        footStyles: { fillColor: [66, 139, 202] }
      });
      
      yPos = doc.autoTable.previous.finalY + 15;
    }
    
    // Ensure cashFlowData and its properties exist
    const safeData = {
      operating: cashFlowData?.operating || { activities: [] },
      investing: cashFlowData?.investing || { activities: [] },
      financing: cashFlowData?.financing || { activities: [] }
    };
    
    // Add detailed tables based on option
    const addDetailedTable = (activities, title, startY) => {
      if (!activities || !activities.activities || activities.activities.length === 0) {
        return startY;
      }
      
      doc.setFontSize(14);
      doc.text(title, 20, startY);
      startY += 10;
      
      const tableData = activities.activities.map(activity => [
        formatDate(activity.date),
        activity.description,
        activity.accountName || '',
        formatCurrency(activity.amount)
      ]);
      
      if (tableData.length === 0) {
        doc.setFontSize(10);
        doc.text('No activities recorded for this period.', 20, startY);
        return startY + 10;
      }
      
      doc.autoTable({
        startY: startY,
        head: [['Date', 'Description', 'Account', 'Amount']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [66, 139, 202] },
        footStyles: { fillColor: [66, 139, 202] }
      });
      
      return doc.autoTable.previous.finalY + 15;
    };
    
    if (option === 'all' || option === 'operating') {
      yPos = addDetailedTable(safeData.operating, 'Operating Activities', yPos);
      
      // Add page if needed
      if (yPos > doc.internal.pageSize.height - 50) {
        doc.addPage();
        yPos = 20;
      }
    }
    
    if (option === 'all' || option === 'investing') {
      yPos = addDetailedTable(safeData.investing, 'Investing Activities', yPos);
      
      // Add page if needed
      if (yPos > doc.internal.pageSize.height - 50) {
        doc.addPage();
        yPos = 20;
      }
    }
    
    if (option === 'all' || option === 'financing') {
      yPos = addDetailedTable(safeData.financing, 'Financing Activities', yPos);
    }
    
    // Save the PDF
    doc.save(filename);
    return doc;
  };

  // JSON export
  const exportToJson = (data, filename) => {
    const jsonData = {
      reportType: 'Cash Flow Report',
      period: {
        startDate,
        endDate,
        formattedStartDate: formatDate(startDate),
        formattedEndDate: formatDate(endDate)
      },
      summary: {
        totalOperating: totals.totalOperating,
        totalInvesting: totals.totalInvesting,
        totalFinancing: totals.totalFinancing,
        netCashFlow: totals.netCashFlow,
        formattedTotalOperating: formatCurrency(totals.totalOperating),
        formattedTotalInvesting: formatCurrency(totals.totalInvesting),
        formattedTotalFinancing: formatCurrency(totals.totalFinancing),
        formattedNetCashFlow: formatCurrency(totals.netCashFlow)
      },
      data
    };
    
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    saveAs(blob, filename);
    return blob;
  };

  // Get status of data categories for badge display
  const getCategoryStatus = (category) => {
    if (!cashFlowData) return false;
    
    const safeData = {
      operating: cashFlowData?.operating || { activities: [] },
      investing: cashFlowData?.investing || { activities: [] },
      financing: cashFlowData?.financing || { activities: [] }
    };
    
    if (category === 'operating') {
      return safeData.operating && 
             safeData.operating.activities && 
             safeData.operating.activities.length > 0;
    }
    
    if (category === 'investing') {
      return safeData.investing && 
             safeData.investing.activities && 
             safeData.investing.activities.length > 0;
    }
    
    if (category === 'financing') {
      return safeData.financing && 
             safeData.financing.activities && 
             safeData.financing.activities.length > 0;
    }
    
    return true;
  };

  return (
    <Popover trigger="hover" placement="top" gutter={10}>
      <PopoverTrigger>
        <Box>
          <Menu closeOnSelect={false}>
            <MenuButton
              as={Button}
              leftIcon={isExporting ? <Spinner size="sm" /> : <FiDownload />}
              colorScheme="teal"
              variant="outline"
              size="sm"
              isLoading={isExporting}
              loadingText={`Mengekspor ${exportType?.toUpperCase()}`}
              isDisabled={isDisabled || isExporting}
            >
              Export
            </MenuButton>
            <MenuList zIndex={10}>
              <MenuGroup title="Format Export">
                <MenuItem 
                  icon={<Icon as={FiFilePlus} />} 
                  onClick={() => handleExport('xlsx', 'all')}
                  isDisabled={isExporting}
                >
                  <Text>Excel (.xlsx)</Text>
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FiFileText} />} 
                  onClick={() => handleExport('csv', 'all')}
                  isDisabled={isExporting}
                >
                  <Text>CSV (.csv)</Text>
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FiFileText} />} 
                  onClick={() => handleExport('pdf', 'all')}
                  isDisabled={isExporting}
                >
                  <Text>PDF (.pdf)</Text>
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FiSettings} />} 
                  onClick={() => handleExport('json', 'all')}
                  isDisabled={isExporting}
                >
                  <Text>JSON (.json)</Text>
                </MenuItem>
              </MenuGroup>
              
              <MenuDivider />
              
              <MenuGroup title="Export Berdasarkan Kategori">
                <MenuItem 
                  icon={<Icon as={FiBarChart2} />} 
                  onClick={() => handleExport('xlsx', 'operating')}
                  isDisabled={isExporting || !getCategoryStatus('operating')}
                >
                  <HStack justify="space-between" width="100%">
                    <Text>Aktivitas Operasi</Text>
                    <Badge colorScheme={getCategoryStatus('operating') ? "green" : "red"}>
                      {getCategoryStatus('operating') ? "Ada Data" : "Kosong"}
                    </Badge>
                  </HStack>
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FiBarChart2} />} 
                  onClick={() => handleExport('xlsx', 'investing')}
                  isDisabled={isExporting || !getCategoryStatus('investing')}
                >
                  <HStack justify="space-between" width="100%">
                    <Text>Aktivitas Investasi</Text>
                    <Badge colorScheme={getCategoryStatus('investing') ? "green" : "red"}>
                      {getCategoryStatus('investing') ? "Ada Data" : "Kosong"}
                    </Badge>
                  </HStack>
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FiBarChart2} />} 
                  onClick={() => handleExport('xlsx', 'financing')}
                  isDisabled={isExporting || !getCategoryStatus('financing')}
                >
                  <HStack justify="space-between" width="100%">
                    <Text>Aktivitas Pendanaan</Text>
                    <Badge colorScheme={getCategoryStatus('financing') ? "green" : "red"}>
                      {getCategoryStatus('financing') ? "Ada Data" : "Kosong"}
                    </Badge>
                  </HStack>
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FiGrid} />} 
                  onClick={() => handleExport('xlsx', 'summary')}
                  isDisabled={isExporting}
                >
                  <Text>Hanya Ringkasan</Text>
                </MenuItem>
              </MenuGroup>
            </MenuList>
          </Menu>
        </Box>
      </PopoverTrigger>
      <PopoverContent width="300px">
        <PopoverArrow />
        <PopoverBody>
          <HStack>
            <Icon as={FiInfo} color="blue.500" />
            <Text fontSize="sm">
              Export laporan arus kas periode {formatDate(startDate)} - {formatDate(endDate)} 
              dalam berbagai format. Pilih kategori spesifik atau keseluruhan data.
            </Text>
          </HStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default CashFlowExportButton; 