import { useState } from 'react';
import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
  useToast,
} from '@chakra-ui/react';
import { FiDownload, FiFileText, FiFilePlus } from 'react-icons/fi';
import { utils, write } from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const WIPExportButton = ({ data = [] }) => {
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  // Helper function to format date
  const formatDate = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  };

  // Export to Excel
  const exportToExcel = () => {
    if (data.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no WIP records to export.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsExporting(true);

    try {
      // Create workbook and worksheet
      const wb = utils.book_new();
      const ws = utils.json_to_sheet(data);

      // Add worksheet to workbook
      utils.book_append_sheet(wb, ws, 'WIP Data');

      // Generate Excel file
      const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Save file
      saveAs(blob, `wip-data-${formatDate()}.xlsx`);

      toast({
        title: 'Export successful',
        description: 'WIP data has been exported to Excel.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export WIP data to Excel.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (data.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no WIP records to export.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsExporting(true);

    try {
      // Create workbook and worksheet
      const wb = utils.book_new();
      const ws = utils.json_to_sheet(data);

      // Add worksheet to workbook
      utils.book_append_sheet(wb, ws, 'WIP Data');

      // Generate CSV file
      const csvOutput = utils.sheet_to_csv(ws);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      
      // Save file
      saveAs(blob, `wip-data-${formatDate()}.csv`);

      toast({
        title: 'Export successful',
        description: 'WIP data has been exported to CSV.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export WIP data to CSV.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    if (data.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no WIP records to export.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsExporting(true);

    try {
      // Create PDF document
      const doc = new jsPDF('landscape');
      
      // Add title
      doc.setFontSize(16);
      doc.text('Work In Progress (WIP) Report', 14, 15);
      
      // Add date
      doc.setFontSize(10);
      const today = new Date().toLocaleDateString();
      doc.text(`Generated on: ${today}`, 14, 22);
      
      // Format data for table
      const tableHeaders = Object.keys(data[0]);
      const tableData = data.map(item => Object.values(item));
      
      // Add table
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { top: 30 },
      });
      
      // Save PDF
      doc.save(`wip-report-${formatDate()}.pdf`);

      toast({
        title: 'Export successful',
        description: 'WIP data has been exported to PDF.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export WIP data to PDF.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Menu>
      <MenuButton
        as={Button}
        leftIcon={<FiDownload />}
        colorScheme="teal"
        variant="outline"
        isLoading={isExporting}
        loadingText="Exporting..."
      >
        Export
      </MenuButton>
      <MenuList>
        <MenuItem 
          icon={<Icon as={FiFilePlus} />} 
          onClick={exportToExcel}
        >
          Export to Excel
        </MenuItem>
        <MenuItem 
          icon={<Icon as={FiFileText} />} 
          onClick={exportToCSV}
        >
          Export to CSV
        </MenuItem>
        <MenuItem 
          icon={<Icon as={FiFileText} />} 
          onClick={exportToPDF}
        >
          Export to PDF
        </MenuItem>
      </MenuList>
    </Menu>
  );
};

export default WIPExportButton; 