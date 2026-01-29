import { IExportOptions } from '../types/Advanced.types';
import { saveAs } from 'file-saver';

// LAZY LOADING: These libraries use eval/Function which violates CSP on iOS Power Apps
// They are now loaded dynamically only when export functions are called
// This prevents the app from crashing on initialization
let XLSX: any = null;
let ExcelJS: any = null;
let jsPDF: any = null;
let autoTable: any = null;

// Lazy loader functions - use require() for compatibility with es2015 module format
const loadXLSX = (): any => {
    if (!XLSX) {
        try {
            XLSX = require('xlsx');
        } catch (e) {
            console.warn('XLSX library could not be loaded:', e);
            throw new Error('Excel export is not available in this environment');
        }
    }
    return XLSX;
};

const loadExcelJS = (): any => {
    if (!ExcelJS) {
        try {
            ExcelJS = require('exceljs');
        } catch (e) {
            console.warn('ExcelJS library could not be loaded:', e);
            throw new Error('Excel export is not available in this environment');
        }
    }
    return ExcelJS;
};

const loadJsPDF = (): any => {
    if (!jsPDF) {
        try {
            const jsPDFModule = require('jspdf');
            jsPDF = jsPDFModule.default || jsPDFModule;
            const autoTableModule = require('jspdf-autotable');
            autoTable = autoTableModule.default || autoTableModule;
        } catch (e) {
            console.warn('jsPDF library could not be loaded:', e);
            throw new Error('PDF export is not available in this environment');
        }
    }
    return { jsPDF, autoTable };
};

// Helper function for PCF EntityRecord compatibility
const getPCFValue = (item: any, columnKey: string): any => {
    if (item && typeof item.getValue === 'function') {
        try {
            return item.getValue(columnKey);
        } catch (e) {
            return null;
        }
    }
    return item[columnKey];
};

// Helper function to get all available column keys from PCF EntityRecord or regular object
const getPCFKeys = (item: any, customColumns?: string[]): string[] => {
    // If custom columns are provided, use them
    if (customColumns && customColumns.length > 0) {
        return customColumns;
    }
    
    if (item && typeof item.getValue === 'function') {
        // For PCF EntityRecords, we need to use a different approach
        // Try to get keys from the item's attributes or use known column structure
        if (item.getColumnInfo) {
            return item.getColumnInfo().map((col: any) => col.Name);
        }
        // Fallback: try common PCF EntityRecord methods
        if (item._columns) {
            return Object.keys(item._columns);
        }
        // Last resort: use Object.keys but filter out methods
        return Object.keys(item).filter(key => 
            typeof item[key] !== 'function' && 
            !key.startsWith('_') &&
            key !== 'getValue' && 
            key !== 'setValue'
        );
    }
    return Object.keys(item);
};

/**
 * Advanced Data Export Service with multiple format support
 */
export class DataExportService {
    private static instance: DataExportService;

    public static getInstance(): DataExportService {
        if (!DataExportService.instance) {
            DataExportService.instance = new DataExportService();
        }
        return DataExportService.instance;
    }

    /**
     * Export data to the specified format
     */
    public async exportData(data: any[], options: IExportOptions): Promise<void> {
        if (!data || data.length === 0) {
            throw new Error('No data to export');
        }

        const exportData = this.prepareExportData(data, options);
        const filename = options.fileName || this.generateFilename(options.format);

        switch (options.format) {
            case 'CSV':
                await this.exportToCSV(exportData, filename, options);
                break;
            case 'Excel':
                await this.exportToExcel(exportData, filename, options);
                break;
            case 'PDF':
                await this.exportToPDF(exportData, filename, options);
                break;
            case 'JSON':
                await this.exportToJSON(exportData, filename, options);
                break;
            default:
                throw new Error(`Unsupported export format: ${options.format}`);
        }
    }

    /**
     * Prepare data for export based on options
     */
    private prepareExportData(data: any[], options: IExportOptions): any[] {
        let exportData = [...data];

        // Limit rows if specified
        if (options.maxRows && options.maxRows > 0) {
            exportData = exportData.slice(0, options.maxRows);
        }

        // Filter columns if specified
        if (options.customColumns && options.customColumns.length > 0) {
            exportData = exportData.map((row) => {
                const filteredRow: any = {};
                options.customColumns!.forEach((column) => {
                    const value = getPCFValue(row, column);
                    if (value !== undefined) {
                        filteredRow[column] = value;
                    }
                });
                return filteredRow;
            });
        }

        return exportData;
    }

    /**
     * Export to CSV format
     */
    private async exportToCSV(data: any[], filename: string, options: IExportOptions): Promise<void> {
        if (data.length === 0) return;

        const headers = getPCFKeys(data[0], options.customColumns);
        const csvRows: string[] = [];

        // Add headers if specified
        if (options.includeHeaders !== false) {
            csvRows.push(headers.join(','));
        }

        // Add data rows
        data.forEach((row) => {
            const values = headers.map((header) => {
                const value = getPCFValue(row, header);

                // Handle null/undefined values
                if (value == null) return '';

                // Convert to string and escape quotes
                const stringValue = value.toString();

                // Quote values that contain commas, quotes, or newlines
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }

                return stringValue;
            });

            csvRows.push(values.join(','));
        });

        // Add metadata as comments if specified
        const csvContent = this.addMetadataToCSV(csvRows.join('\n'), options);

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, this.ensureFileExtension(filename, 'csv'));
    }

    /**
     * Export to Excel format using ExcelJS for proper table support
     */
    private async exportToExcel(data: any[], filename: string, options: IExportOptions): Promise<void> {
        // Lazy load ExcelJS to avoid CSP issues on iOS
        const ExcelJSLib = loadExcelJS();
        
        const fieldNames = options.customColumns || getPCFKeys(data[0] || {});
        const displayNames = options.customHeaders || fieldNames;
        
        // Create workbook and worksheet
        const workbook = new ExcelJSLib.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        // Detect date columns
        const dateColumns = new Set<number>();
        fieldNames.forEach((fieldName, colIndex) => {
            const sampleValues = data.slice(0, 10).map(row => getPCFValue(row, fieldName));
            const isDateColumn = sampleValues.some(val => {
                if (!val) return false;
                if (val instanceof Date) return true;
                const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
                return typeof val === 'string' && datePattern.test(val);
            });
            if (isDateColumn) dateColumns.add(colIndex);
        });

        // Add header row
        worksheet.addRow(displayNames);

        // Add data rows
        data.forEach(row => {
            const rowData = fieldNames.map(fieldName => getPCFValue(row, fieldName));
            worksheet.addRow(rowData);
        });

        // Create Excel Table
        worksheet.addTable({
            name: 'DataTable',
            ref: `A1:${this.getColumnLetter(displayNames.length)}${data.length + 1}`,
            headerRow: true,
            totalsRow: false,
            style: {
                theme: 'TableStyleLight9',
                showRowStripes: true,
            },
            columns: displayNames.map(name => ({ name, filterButton: true })),
            rows: data.map(row => fieldNames.map(fieldName => getPCFValue(row, fieldName)))
        });

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FF000000' } }; // Black text
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2EFDA' } // Light green
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
        headerRow.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };

        // Set column widths
        worksheet.columns = displayNames.map((header, index) => {
            const fieldName = fieldNames[index];
            
            // Date columns get fixed width
            if (dateColumns.has(index)) {
                return { width: 14 };
            }
            
            // Calculate width for other columns
            const maxContentLength = Math.max(
                header.length,
                ...data.slice(0, 100).map(row => {
                    const value = getPCFValue(row, fieldName);
                    return value ? value.toString().length : 0;
                })
            );
            const calculatedWidth = maxContentLength * 1.2 + 2;
            return { width: Math.min(Math.max(calculatedWidth, 12), 50) };
        });

        // Generate and save file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        saveAs(blob, this.ensureFileExtension(filename, 'xlsx'));
    }

    /**
     * Get Excel column letter from index (0=A, 1=B, etc.)
     */
    private getColumnLetter(columnIndex: number): string {
        let temp: number;
        let letter = '';
        while (columnIndex > 0) {
            temp = (columnIndex - 1) % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            columnIndex = (columnIndex - temp - 1) / 26;
        }
        return letter;
    }

    /**
     * Export to PDF format
     */
    private async exportToPDF(data: any[], filename: string, options: IExportOptions): Promise<void> {
        // Lazy load jsPDF to avoid CSP issues on iOS
        const { jsPDF: jsPDFLib, autoTable: autoTableLib } = loadJsPDF();
        const doc = new jsPDFLib('l', 'mm', 'a4'); // Landscape orientation for better table display

        // Add title and metadata
        this.addPDFHeader(doc, options);

        if (data.length === 0) {
            doc.text('No data to display', 20, 40);
            doc.save(this.ensureFileExtension(filename, 'pdf'));
            return;
        }

        const headers = getPCFKeys(data[0], options.customColumns);
        const tableData = data.map((row) =>
            headers.map((header) => {
                const value = getPCFValue(row, header);
                return value != null ? value.toString() : '';
            }),
        );

        // Configure table
        const tableConfig = {
            head: options.includeHeaders !== false ? [headers] : undefined,
            body: tableData,
            startY: options.metadata ? 60 : 30,
            styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak',
                cellWidth: 'wrap',
            },
            headStyles: {
                fillColor: [0, 120, 212], // Primary blue
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250],
            },
            columnStyles: this.generateColumnStyles(headers, data),
            margin: { top: 10, right: 10, bottom: 10, left: 10 },
            tableWidth: 'auto',
            showHead: options.includeHeaders !== false,
        };

        autoTableLib(doc, tableConfig);

        // Add footer with export info
        this.addPDFFooter(doc, data.length);

        doc.save(this.ensureFileExtension(filename, 'pdf'));
    }

    /**
     * Export to JSON format
     */
    private async exportToJSON(data: any[], filename: string, options: IExportOptions): Promise<void> {
        // Convert PCF EntityRecords to plain objects for JSON compatibility
        const plainData = data.map(row => {
            const plainRow: any = {};
            const headers = options.customColumns || getPCFKeys(row);
            headers.forEach(header => {
                plainRow[header] = getPCFValue(row, header);
            });
            return plainRow;
        });

        const exportObject = {
            metadata: {
                exportDate: new Date().toISOString(),
                recordCount: plainData.length,
                format: 'JSON',
                ...options.metadata,
            },
            data: plainData,
        };

        const jsonString = JSON.stringify(exportObject, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });

        saveAs(blob, this.ensureFileExtension(filename, 'json'));
    }

    /**
     * Generate filename with timestamp
     */
    private generateFilename(format: string): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        return `export_${timestamp}.${format.toLowerCase()}`;
    }

    /**
     * Ensure filename has correct extension
     */
    private ensureFileExtension(filename: string, extension: string): string {
        const ext = `.${extension}`;
        return filename.endsWith(ext) ? filename : `${filename}${ext}`;
    }

    /**
     * Add metadata to CSV as comments
     */
    private addMetadataToCSV(csvContent: string, options: IExportOptions): string {
        if (!options.metadata) return csvContent;

        const comments = [
            `# Export Date: ${new Date().toISOString()}`,
            '# Format: CSV',
            options.metadata.title ? `# Title: ${options.metadata.title}` : null,
            options.metadata.description ? `# Description: ${options.metadata.description}` : null,
            options.metadata.author ? `# Author: ${options.metadata.author}` : null,
            '',
        ]
            .filter(Boolean)
            .join('\n');

        return comments + csvContent;
    }

    /**
     * Create metadata worksheet for Excel
     */
    private createMetadataWorksheet(XLSX: any, metadata: any, recordCount: number): any {
        const metadataData = [
            ['Property', 'Value'],
            ['Export Date', new Date().toISOString()],
            ['Record Count', recordCount],
            ['Format', 'Excel (XLSX)'],
            ...(metadata.title ? [['Title', metadata.title]] : []),
            ...(metadata.description ? [['Description', metadata.description]] : []),
            ...(metadata.author ? [['Author', metadata.author]] : []),
            ...(metadata.createdDate ? [['Created Date', metadata.createdDate]] : []),
        ];

        return XLSX.utils.aoa_to_sheet(metadataData);
    }

    /**
     * Create summary worksheet for Excel
     */
    private createSummaryWorksheet(XLSX: any, data: any[], options: IExportOptions): any {
        if (data.length === 0) {
            return XLSX.utils.aoa_to_sheet([['No data available']]);
        }

        const headers = getPCFKeys(data[0], options.customColumns);
        const summaryData = [
            ['Column Statistics'],
            ['Column', 'Type', 'Non-null Count', 'Unique Values', 'Sample Values'],
            ...headers.map((header) => {
                const values = data.map((row) => getPCFValue(row, header)).filter((v) => v != null);
                const uniqueValues = new Set(values);
                const sampleValues = Array.from(uniqueValues).slice(0, 3).join(', ');
                const dataType = this.inferDataType(values);

                return [header, dataType, values.length, uniqueValues.size, sampleValues];
            }),
        ];

        return XLSX.utils.aoa_to_sheet(summaryData);
    }

    /**
     * Style Excel worksheet (Legacy method - uses XLSX library)
     * Note: XLSX must be passed in to avoid top-level import that breaks iOS
     */
    private styleExcelWorksheet(XLSXLib: any, worksheet: any, data: any[], options: IExportOptions): void {
        const range = worksheet['!ref'];
        if (!range || !XLSXLib) return;

        const decodedRange = XLSXLib.utils.decode_range(range);
        const fieldNames = options.customColumns || getPCFKeys(data[0] || {});
        const displayNames = options.customHeaders || fieldNames;
        
        // Detect date columns by checking first few rows
        const dateColumns = new Set<number>();
        fieldNames.forEach((fieldName, colIndex) => {
            const sampleValues = data.slice(0, 10).map(row => getPCFValue(row, fieldName));
            const isDateColumn = sampleValues.some(val => {
                if (!val) return false;
                // Check if it's a date string or Date object
                if (val instanceof Date) return true;
                const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/; // MM/DD/YYYY format
                return typeof val === 'string' && datePattern.test(val);
            });
            if (isDateColumn) dateColumns.add(colIndex);
        });

        // Style header row with light green background and bold black text
        for (let col = decodedRange.s.c; col <= decodedRange.e.c; col++) {
            const cellAddress = XLSXLib.utils.encode_cell({ r: 0, c: col });
            if (worksheet[cellAddress]) {
                worksheet[cellAddress].s = {
                    font: { bold: true, color: { rgb: "000000" } }, // Black text
                    fill: { fgColor: { rgb: "E2EFDA" } }, // Light green like Excel example
                    alignment: { horizontal: "left", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                };
            }
        }

        // Create Excel Table
        const tableRef = `A1:${XLSXLib.utils.encode_col(decodedRange.e.c)}${decodedRange.e.r + 1}`;
        worksheet['!autofilter'] = { ref: tableRef };
        
        // Add table definition for proper Excel table
        if (!worksheet['!tables']) worksheet['!tables'] = [];
        worksheet['!tables'].push({
            ref: tableRef,
            name: 'DataTable',
            displayName: 'DataTable',
            headerRowCount: 1,
            totalsRowCount: 0,
            style: {
                theme: 'TableStyleLight9',
                showRowStripes: true
            }
        });

        // Set column widths - special handling for date columns
        worksheet['!cols'] = displayNames.map((header, index) => {
            const fieldName = fieldNames[index];
            
            // Date columns get fixed width of 14
            if (dateColumns.has(index)) {
                return { width: 14 };
            }
            
            // Regular columns - calculate based on content
            const maxContentLength = Math.max(
                header.length,
                ...data.slice(0, 100).map((row) => {
                    const value = getPCFValue(row, fieldName);
                    return value ? value.toString().length : 0;
                }),
            );
            // Add 20% extra width for padding, with min of 12 and max of 50
            const calculatedWidth = maxContentLength * 1.2 + 2;
            return { width: Math.min(Math.max(calculatedWidth, 12), 50) };
        });
    }

    /**
     * Add PDF header with title and metadata
     */
    private addPDFHeader(doc: any, options: IExportOptions): void {
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');

        const title = options.metadata?.title || 'Data Export';
        doc.text(title, 20, 20);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        if (options.metadata?.description) {
            doc.text(options.metadata.description, 20, 30);
        }

        doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, options.metadata?.description ? 40 : 30);
    }

    /**
     * Add PDF footer with export information
     */
    private addPDFFooter(doc: any, recordCount: number): void {
        const pageCount = doc.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(
                `Records: ${recordCount} | Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleString()}`,
                20,
                doc.internal.pageSize.height - 10,
            );
        }
    }

    /**
     * Generate column styles for PDF table
     */
    private generateColumnStyles(headers: string[], data: any[]): any {
        const styles: any = {};

        headers.forEach((header, index) => {
            const values = data.slice(0, 50).map((row) => getPCFValue(row, header));
            const dataType = this.inferDataType(values);

            switch (dataType) {
                case 'number':
                    styles[index] = { halign: 'right', cellWidth: 30 };
                    break;
                case 'date':
                    styles[index] = { halign: 'center', cellWidth: 35 };
                    break;
                case 'boolean':
                    styles[index] = { halign: 'center', cellWidth: 20 };
                    break;
                default:
                    styles[index] = { halign: 'left', cellWidth: 'auto' };
            }
        });

        return styles;
    }

    /**
     * Infer data type from sample values
     */
    private inferDataType(values: any[]): string {
        if (values.length === 0) return 'string';

        const sampleValues = values.filter((v) => v != null).slice(0, 10);

        // Check for numbers
        if (sampleValues.every((v) => !isNaN(Number(v)))) {
            return 'number';
        }

        // Check for dates
        if (sampleValues.every((v) => !isNaN(Date.parse(v)))) {
            return 'date';
        }

        // Check for booleans
        if (
            sampleValues.every(
                (v) => typeof v === 'boolean' || v === 'true' || v === 'false' || v === 'yes' || v === 'no',
            )
        ) {
            return 'boolean';
        }

        return 'string';
    }

    /**
     * Get export progress for large datasets
     */
    public async exportDataWithProgress(
        data: any[],
        options: IExportOptions,
        onProgress?: (progress: number) => void,
    ): Promise<void> {
        const chunkSize = 1000;
        const totalChunks = Math.ceil(data.length / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, data.length);
            const chunk = data.slice(start, end);

            // Process chunk (this is a simplified example)
            await new Promise((resolve) => setTimeout(resolve, 10));

            const progress = ((i + 1) / totalChunks) * 100;
            onProgress?.(progress);
        }

        // Perform actual export
        await this.exportData(data, options);
    }

    /**
     * Validate export options
     */
    public validateExportOptions(options: IExportOptions): string[] {
        const errors: string[] = [];

        if (!options.format) {
            errors.push('Export format is required');
        }

        if (!['CSV', 'Excel', 'PDF', 'JSON'].includes(options.format)) {
            errors.push(`Unsupported format: ${options.format}`);
        }

        if (options.maxRows && options.maxRows < 1) {
            errors.push('Max rows must be greater than 0');
        }

        if (options.fileName && !/^[a-zA-Z0-9_\-\s\.]+$/.test(options.fileName)) {
            errors.push('Invalid filename. Use only letters, numbers, spaces, dots, hyphens, and underscores');
        }

        return errors;
    }

    /**
     * Get supported export formats
     */
    public getSupportedFormats(): Array<{ format: string; description: string; extension: string }> {
        return [
            { format: 'CSV', description: 'Comma Separated Values', extension: 'csv' },
            { format: 'Excel', description: 'Microsoft Excel Spreadsheet', extension: 'xlsx' },
            { format: 'PDF', description: 'Portable Document Format', extension: 'pdf' },
            { format: 'JSON', description: 'JavaScript Object Notation', extension: 'json' },
        ];
    }

    /**
     * Estimate export file size
     */
    public estimateFileSize(data: any[], format: string): string {
        if (data.length === 0) return '0 KB';

        const sampleSize = Math.min(data.length, 100);
        const sampleData = data.slice(0, sampleSize);
        const jsonSize = JSON.stringify(sampleData).length;
        const avgRowSize = jsonSize / sampleSize;
        const totalSize = avgRowSize * data.length;

        let multiplier = 1;
        switch (format) {
            case 'CSV':
                multiplier = 0.6; // CSV is more compact
                break;
            case 'Excel':
                multiplier = 1.2; // Excel has overhead
                break;
            case 'PDF':
                multiplier = 2.5; // PDF is much larger
                break;
            case 'JSON':
                multiplier = 1.1; // JSON has some overhead
                break;
        }

        const estimatedSize = totalSize * multiplier;

        if (estimatedSize < 1024) return `${Math.round(estimatedSize)} B`;
        if (estimatedSize < 1024 * 1024) return `${Math.round(estimatedSize / 1024)} KB`;
        return `${Math.round(estimatedSize / (1024 * 1024))} MB`;
    }
}
