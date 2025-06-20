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
} from '@chakra-ui/react';
import { FiDownload, FiFileText, FiFilePlus, FiSettings, FiInfo } from 'react-icons/fi';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Reusable Export Button Component
 * 
 * @param {Object} props
 * @param {Array} props.data - Data to export
 * @param {string} props.filename - Filename without extension
 * @param {Function} props.onExport - Callback function when export is completed
 * @param {Function} props.pdfConfig - Config for PDF export (optional)
 * @param {boolean} props.isDisabled - Whether the button is disabled
 * @param {string} props.buttonText - Text to display on the button
 */
const ExportButton = ({
  data,
  filename = 'export',
  onExport,
  pdfConfig = {},
  isDisabled = false,
  buttonText = 'Export',
  tooltipText = 'Export data to various formats',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(null);
  const toast = useToast();

  const defaultPdfConfig = {
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    title: filename,
    ...pdfConfig,
  };

  const handleExport = async (format) => {
    if (!data || data.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'There is no data available to export',
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

      // Add timestamp to filename
      const timestamp = new Date().toISOString().split('T')[0];
      const fullFilename = `${filename}_${timestamp}`;

      switch (format) {
        case 'xlsx':
          exportedFile = exportToExcel(data, `${fullFilename}.xlsx`);
          break;
        case 'csv':
          exportedFile = exportToCsv(data, `${fullFilename}.csv`);
          break;
        case 'pdf':
          exportedFile = exportToPdf(data, `${fullFilename}.pdf`, defaultPdfConfig);
          break;
        case 'json':
          exportedFile = exportToJson(data, `${fullFilename}.json`);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      if (onExport) {
        onExport(format, exportedFile);
      }

      toast({
        title: 'Export Successful',
        description: `Data has been exported as ${format.toUpperCase()}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'An error occurred during export',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const exportToExcel = (data, filename) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(blob, filename);
    return blob;
  };

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

  const exportToPdf = (data, filename, config) => {
    const { orientation, unit, format, title } = config;
    
    // Create PDF document
    const doc = new jsPDF(orientation, unit, format);
    
    // Add title
    doc.setFontSize(14);
    doc.text(title, 40, 40);
    
    // Prepare data for table
    const headers = Object.keys(data[0]);
    const rows = data.map(row => Object.values(row));
    
    // Create table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 60,
      margin: { top: 50 },
      styles: { overflow: 'linebreak', cellWidth: 'auto' },
      columnStyles: { 0: { cellWidth: 'auto' } },
    });
    
    // Save PDF
    doc.save(filename);
    return doc;
  };

  const exportToJson = (data, filename) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    saveAs(blob, filename);
    return blob;
  };

  return (
    <Popover trigger="hover" placement="top" gutter={10}>
      <PopoverTrigger>
        <Box>
          <Menu>
            <MenuButton
              as={Button}
              leftIcon={isExporting ? <Spinner size="sm" /> : <FiDownload />}
              colorScheme="teal"
              variant="outline"
              size="sm"
              isLoading={isExporting}
              loadingText={`Exporting ${exportType?.toUpperCase()}`}
              isDisabled={isDisabled || isExporting}
            >
              {buttonText}
            </MenuButton>
            <MenuList zIndex={10}>
              <MenuItem 
                icon={<Icon as={FiFilePlus} />} 
                onClick={() => handleExport('xlsx')}
                isDisabled={isExporting}
              >
                <HStack spacing={2} align="center">
                  <Text>Excel (.xlsx)</Text>
                </HStack>
              </MenuItem>
              <MenuItem 
                icon={<Icon as={FiFileText} />} 
                onClick={() => handleExport('csv')}
                isDisabled={isExporting}
              >
                <HStack spacing={2} align="center">
                  <Text>CSV (.csv)</Text>
                </HStack>
              </MenuItem>
              <MenuItem 
                icon={<Icon as={FiFileText} />} 
                onClick={() => handleExport('pdf')}
                isDisabled={isExporting}
              >
                <HStack spacing={2} align="center">
                  <Text>PDF (.pdf)</Text>
                </HStack>
              </MenuItem>
              <MenuItem 
                icon={<Icon as={FiSettings} />} 
                onClick={() => handleExport('json')}
                isDisabled={isExporting}
              >
                <HStack spacing={2} align="center">
                  <Text>JSON (.json)</Text>
                </HStack>
              </MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </PopoverTrigger>
      <PopoverContent width="220px">
        <PopoverArrow />
        <PopoverBody>
          <HStack>
            <Icon as={FiInfo} color="blue.500" />
            <Text fontSize="sm">{tooltipText}</Text>
          </HStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default ExportButton; 