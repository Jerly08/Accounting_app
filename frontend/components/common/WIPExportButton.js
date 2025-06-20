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
  FiBarChart2,
  FiGrid,
  FiDollarSign,
  FiPieChart
} from 'react-icons/fi';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * WIP Export Button Component
 * 
 * @param {Object} props
 * @param {Array} props.wipProjects - WIP projects data
 * @param {Object} props.summary - Summary of WIP totals
 * @param {string} props.status - Current project status filter
 * @param {Function} props.formatCurrency - Function to format currency
 * @param {Function} props.formatPercentage - Function to format percentage
 * @param {Function} props.onExport - Callback function when export is completed
 * @param {boolean} props.isDisabled - Whether the button is disabled
 */
const WIPExportButton = ({
  wipProjects = [],
  summary = {},
  status = 'all',
  formatCurrency = (val) => val.toString(),
  formatPercentage = (val) => val.toString(),
  onExport,
  isDisabled = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(null);
  const [exportOption, setExportOption] = useState('all');
  const toast = useToast();

  // Prepare file name based on status
  const getFileName = () => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const statusText = status === 'all' ? 'all' : status;
    return `wip_report_${statusText}_${today}`;
  };

  // Prepare project data for export
  const prepareProjectData = () => {
    return wipProjects.map(project => ({
      'Project ID': project.id,
      'Project Code': project.projectCode || 'N/A',
      'Project Name': project.name,
      'Client': project.client?.name || 'N/A',
      'Status': project.status,
      'Start Date': project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A',
      'End Date': project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A',
      'Total Value': project.totalValue,
      'Total Value (Formatted)': formatCurrency(project.totalValue),
      'Costs to Date': project.costs,
      'Costs to Date (Formatted)': formatCurrency(project.costs),
      'Billed to Date': project.billed,
      'Billed to Date (Formatted)': formatCurrency(project.billed),
      'WIP Value': project.wipValue,
      'WIP Value (Formatted)': formatCurrency(project.wipValue),
      'Completion (%)': project.completion || 0,
      'Completion (Formatted)': formatPercentage(project.completion || 0)
    }));
  };

  // Prepare summary data for export
  const prepareSummaryData = () => {
    return [
      {
        'Category': 'Summary',
        'Metric': 'Total Projects',
        'Value': summary.totalProjects,
        'Value (Formatted)': summary.totalProjects.toString()
      },
      {
        'Category': 'Summary',
        'Metric': 'Projects with WIP Values',
        'Value': summary.projectsWithWip,
        'Value (Formatted)': summary.projectsWithWip.toString()
      },
      {
        'Category': 'Summary',
        'Metric': 'Total Costs',
        'Value': summary.totalCosts,
        'Value (Formatted)': formatCurrency(summary.totalCosts)
      },
      {
        'Category': 'Summary',
        'Metric': 'Total Billed',
        'Value': summary.totalBilled,
        'Value (Formatted)': formatCurrency(summary.totalBilled)
      },
      {
        'Category': 'Summary',
        'Metric': 'Total WIP',
        'Value': summary.totalWip,
        'Value (Formatted)': formatCurrency(summary.totalWip)
      }
    ];
  };

  // Prepare data for export based on option
  const prepareExportData = (option) => {
    switch (option) {
      case 'projects':
        return prepareProjectData();
      case 'summary':
        return prepareSummaryData();
      case 'all':
      default:
        // Create combined data with a separator field
        const projectData = prepareProjectData();
        const summaryData = prepareSummaryData();
        
        // Only add a separator if both arrays have data
        if (projectData.length > 0 && summaryData.length > 0) {
          return [...summaryData, ...projectData];
        } else if (projectData.length > 0) {
          return projectData;
        } else {
          return summaryData;
        }
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
    const workbook = XLSX.utils.book_new();
    
    if (option === 'all') {
      // Create separate worksheets for summary and projects
      const summaryData = prepareSummaryData();
      const projectData = prepareProjectData();
      
      if (summaryData.length > 0) {
        const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Ringkasan WIP');
      }
      
      if (projectData.length > 0) {
        const projectWorksheet = XLSX.utils.json_to_sheet(projectData);
        XLSX.utils.book_append_sheet(workbook, projectWorksheet, 'Proyek WIP');
      }
    } else {
      // Single worksheet for the specific option
      const worksheet = XLSX.utils.json_to_sheet(data);
      const sheetName = option === 'projects' ? 'Proyek WIP' : 'Ringkasan WIP';
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
    
    // Add metadata
    workbook.Props = {
      Title: `Laporan WIP - ${status.toUpperCase()}`,
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
    const orientation = option === 'projects' ? 'landscape' : 'portrait';
    const unit = 'pt';
    const format = 'a4';
    
    const doc = new jsPDF(orientation, unit, format);
    
    // Add title and status
    doc.setFontSize(16);
    const title = `Laporan Work In Progress (WIP)`;
    const subtitle = `Status Proyek: ${status.toUpperCase()}`;
    
    doc.text(title, 40, 40);
    doc.setFontSize(12);
    doc.text(subtitle, 40, 60);
    
    // Add filtering info
    if (option !== 'all') {
      const filterText = option === 'projects' ? 'Hanya Data Proyek' : 'Hanya Ringkasan';
      doc.text(`Filter: ${filterText}`, 40, 80);
    }
    
    // Add date generated
    const generatedDate = `Dibuat pada: ${new Date().toLocaleDateString('id-ID', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}`;
    doc.text(generatedDate, 40, 100);
    
    let yPos = 120;
    
    // If option is 'all' or 'summary', add summary table
    if (option === 'all' || option === 'summary') {
      const summaryData = prepareSummaryData();
      if (summaryData.length > 0) {
        doc.setFontSize(14);
        doc.text('Ringkasan WIP', 40, yPos);
        yPos += 20;
        
        // Extract columns for summary table
        const summaryHeaders = ['Metric', 'Value (Formatted)'];
        const summaryRows = summaryData.map(row => [row['Metric'], row['Value (Formatted)']]);
        
        // Create summary table
        doc.autoTable({
          head: [summaryHeaders],
          body: summaryRows,
          startY: yPos,
          styles: { fontSize: 10 },
          margin: { top: 10 }
        });
        
        // Update position after summary table
        yPos = doc.lastAutoTable.finalY + 30;
      }
    }
    
    // If option is 'all' or 'projects', add projects table
    if (option === 'all' || option === 'projects') {
      const projectData = prepareProjectData();
      if (projectData.length > 0) {
        // If we already added summary and there's not enough space for title + table, add new page
        const remainingSpace = doc.internal.pageSize.height - yPos;
        if (option === 'all' && remainingSpace < 150) {
          doc.addPage();
          yPos = 40;
        }
        
        doc.setFontSize(14);
        doc.text('Data Proyek WIP', 40, yPos);
        yPos += 20;
        
        // Select columns for project table based on orientation
        const projectHeaders = orientation === 'landscape' 
          ? ['Project Name', 'Client', 'Status', 'Total Value (Formatted)', 'Costs to Date (Formatted)', 'Billed to Date (Formatted)', 'WIP Value (Formatted)', 'Completion (Formatted)']
          : ['Project Name', 'Total Value (Formatted)', 'WIP Value (Formatted)', 'Completion (Formatted)'];
        
        // Map data for selected columns
        const projectRows = projectData.map(row => {
          if (orientation === 'landscape') {
            return [
              row['Project Name'], 
              row['Client'], 
              row['Status'], 
              row['Total Value (Formatted)'], 
              row['Costs to Date (Formatted)'], 
              row['Billed to Date (Formatted)'], 
              row['WIP Value (Formatted)'],
              row['Completion (Formatted)']
            ];
          } else {
            return [
              row['Project Name'], 
              row['Total Value (Formatted)'], 
              row['WIP Value (Formatted)'],
              row['Completion (Formatted)']
            ];
          }
        });
        
        // Create projects table
        doc.autoTable({
          head: [projectHeaders],
          body: projectRows,
          startY: yPos,
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: orientation === 'landscape' ? 'auto' : 130 }
          },
          didDrawPage: (data) => {
            // Add footer with page numbers
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            doc.text(`Halaman ${data.pageNumber}`, data.settings.margin.left, pageHeight - 10);
          }
        });
      }
    }
    
    // Save PDF
    doc.save(filename);
    return doc;
  };

  // JSON export
  const exportToJson = (data, filename) => {
    // Prepare data structure with metadata
    const jsonData = {
      report: 'WIP Report',
      status: status,
      generated_at: new Date().toISOString(),
      summary: {
        totalProjects: summary.totalProjects,
        projectsWithWip: summary.projectsWithWip,
        totalCosts: summary.totalCosts,
        totalBilled: summary.totalBilled,
        totalWip: summary.totalWip,
        formattedTotalCosts: formatCurrency(summary.totalCosts),
        formattedTotalBilled: formatCurrency(summary.totalBilled),
        formattedTotalWip: formatCurrency(summary.totalWip)
      },
      projects: wipProjects.map(project => ({
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        client: project.client?.name || 'N/A',
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        totalValue: project.totalValue,
        costs: project.costs,
        billed: project.billed,
        wipValue: project.wipValue,
        completion: project.completion || 0,
        formattedTotalValue: formatCurrency(project.totalValue),
        formattedCosts: formatCurrency(project.costs),
        formattedBilled: formatCurrency(project.billed),
        formattedWipValue: formatCurrency(project.wipValue),
        formattedCompletion: formatPercentage(project.completion || 0)
      }))
    };
    
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    saveAs(blob, filename);
    return blob;
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
              
              <MenuGroup title="Export Opsi Khusus">
                <MenuItem 
                  icon={<Icon as={FiBarChart2} />} 
                  onClick={() => handleExport('xlsx', 'projects')}
                  isDisabled={isExporting || wipProjects.length === 0}
                >
                  <HStack justify="space-between" width="100%">
                    <Text>Hanya Data Proyek</Text>
                    <Badge colorScheme={wipProjects.length > 0 ? "green" : "red"}>
                      {wipProjects.length > 0 ? `${wipProjects.length} Proyek` : "Kosong"}
                    </Badge>
                  </HStack>
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FiPieChart} />} 
                  onClick={() => handleExport('pdf', 'summary')}
                  isDisabled={isExporting}
                >
                  <Text>Hanya Ringkasan (PDF)</Text>
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FiDollarSign} />} 
                  onClick={() => handleExport('xlsx', 'summary')}
                  isDisabled={isExporting}
                >
                  <Text>Hanya Ringkasan (Excel)</Text>
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
              Export laporan WIP untuk proyek dengan status {status.toUpperCase()}. 
              Pilih format atau kategori spesifik untuk diexport.
            </Text>
          </HStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default WIPExportButton; 