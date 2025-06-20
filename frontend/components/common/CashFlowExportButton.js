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
  cashFlowData,
  totals,
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
    const prepareActivityData = (activities, categoryName) => {
      return activities.flatMap(category => 
        category.transactions.map(transaction => ({
          Category: categoryName,
          SubCategory: category.category,
          Date: formatDate(transaction.date),
          Description: transaction.description,
          Account: transaction.account,
          Amount: transaction.amount,
          'Amount (Formatted)': formatCurrency(transaction.amount)
        }))
      );
    };

    // Prepare summary data
    const prepareSummaryData = () => {
      return [
        {
          Category: 'Summary',
          SubCategory: 'Operating Activities',
          Date: '',
          Description: 'Total Operating Activities',
          Account: '',
          Amount: totals.operatingTotal,
          'Amount (Formatted)': formatCurrency(totals.operatingTotal)
        },
        {
          Category: 'Summary',
          SubCategory: 'Investing Activities',
          Date: '',
          Description: 'Total Investing Activities',
          Account: '',
          Amount: totals.investingTotal,
          'Amount (Formatted)': formatCurrency(totals.investingTotal)
        },
        {
          Category: 'Summary',
          SubCategory: 'Financing Activities',
          Date: '',
          Description: 'Total Financing Activities',
          Account: '',
          Amount: totals.financingTotal,
          'Amount (Formatted)': formatCurrency(totals.financingTotal)
        },
        {
          Category: 'Summary',
          SubCategory: 'Net Cash Flow',
          Date: '',
          Description: 'Net Cash Flow',
          Account: '',
          Amount: totals.netCashFlow,
          'Amount (Formatted)': formatCurrency(totals.netCashFlow)
        }
      ];
    };

    // Switch based on export option
    switch (option) {
      case 'operating':
        return prepareActivityData(cashFlowData.operating, 'Operating');
      case 'investing':
        return prepareActivityData(cashFlowData.investing, 'Investing');
      case 'financing':
        return prepareActivityData(cashFlowData.financing, 'Financing');
      case 'summary':
        return prepareSummaryData();
      case 'all':
      default:
        return [
          ...prepareActivityData(cashFlowData.operating, 'Operating'),
          ...prepareActivityData(cashFlowData.investing, 'Investing'),
          ...prepareActivityData(cashFlowData.financing, 'Financing'),
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
    // Configure PDF document
    const orientation = 'landscape';
    const unit = 'pt';
    const format = 'a4';
    
    const doc = new jsPDF(orientation, unit, format);
    
    // Add title and date range
    doc.setFontSize(16);
    const title = `Laporan Arus Kas`;
    const subtitle = `Periode: ${formatDate(startDate)} - ${formatDate(endDate)}`;
    
    doc.text(title, 40, 40);
    doc.setFontSize(12);
    doc.text(subtitle, 40, 60);
    
    // Add filtering info
    if (option !== 'all') {
      const filterText = option === 'operating' ? 'Hanya Aktivitas Operasi' :
                        option === 'investing' ? 'Hanya Aktivitas Investasi' :
                        option === 'financing' ? 'Hanya Aktivitas Pendanaan' : 'Hanya Ringkasan';
      doc.text(`Filter: ${filterText}`, 40, 80);
    }
    
    // Add date generated
    const generatedDate = `Dibuat pada: ${new Date().toLocaleDateString('id-ID', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}`;
    doc.text(generatedDate, 40, 100);
    
    // Prepare data for table
    const headers = Object.keys(data[0]);
    const rows = data.map(row => Object.values(row));
    
    // Create table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 120,
      styles: { overflow: 'linebreak', cellWidth: 'auto' },
      columnStyles: { 0: { cellWidth: 'auto' } },
      didDrawPage: (data) => {
        // Add footer with page numbers
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(`Halaman ${data.pageNumber}`, data.settings.margin.left, pageHeight - 10);
      }
    });
    
    // Add summary at the end
    if (option === 'all' || option === 'summary') {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Ringkasan Arus Kas', 40, 40);
      
      // Add summary table
      doc.autoTable({
        head: [['Kategori', 'Jumlah']],
        body: [
          ['Aktivitas Operasi', formatCurrency(totals.operatingTotal)],
          ['Aktivitas Investasi', formatCurrency(totals.investingTotal)],
          ['Aktivitas Pendanaan', formatCurrency(totals.financingTotal)],
          ['Arus Kas Bersih', formatCurrency(totals.netCashFlow)]
        ],
        startY: 60,
        styles: { fontSize: 12 }
      });
    }
    
    // Save PDF
    doc.save(filename);
    return doc;
  };

  // JSON export
  const exportToJson = (data, filename) => {
    // Include metadata
    const jsonData = {
      report: 'Cash Flow Report',
      period: {
        startDate,
        endDate,
        formattedStartDate: formatDate(startDate),
        formattedEndDate: formatDate(endDate)
      },
      summary: {
        operatingTotal: totals.operatingTotal,
        investingTotal: totals.investingTotal,
        financingTotal: totals.financingTotal,
        netCashFlow: totals.netCashFlow,
        formattedOperatingTotal: formatCurrency(totals.operatingTotal),
        formattedInvestingTotal: formatCurrency(totals.investingTotal),
        formattedFinancingTotal: formatCurrency(totals.financingTotal),
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
    if (category === 'operating') return cashFlowData.operating.length > 0;
    if (category === 'investing') return cashFlowData.investing.length > 0;
    if (category === 'financing') return cashFlowData.financing.length > 0;
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