import { IExportOptions } from '../types/Advanced.types';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
const jsPDF = require('jspdf');
const autoTable = require('jspdf-autotable');

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
                    if (row.hasOwnProperty(column)) {
                        filteredRow[column] = row[column];
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

        const headers = Object.keys(data[0]);
        const csvRows: string[] = [];

        // Add headers if specified
        if (options.includeHeaders !== false) {
            csvRows.push(headers.join(','));
        }

        // Add data rows
        data.forEach((row) => {
            const values = headers.map((header) => {
                const value = row[header];

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
     * Export to Excel format
     */
    private async exportToExcel(data: any[], filename: string, options: IExportOptions): Promise<void> {
        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Create main data worksheet
        const worksheet = XLSX.utils.json_to_sheet(data, {
            header: options.customColumns || undefined,
            skipHeader: options.includeHeaders === false,
        });

        // Add data worksheet
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

        // Add metadata worksheet if specified
        if (options.metadata) {
            const metadataSheet = this.createMetadataWorksheet(XLSX, options.metadata, data.length);
            XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');
        }

        // Add summary worksheet with statistics
        const summarySheet = this.createSummaryWorksheet(XLSX, data);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // Style the worksheets
        this.styleExcelWorksheet(worksheet, data);

        // Generate and save file
        const excelBuffer = XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
            cellStyles: true,
        });

        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        saveAs(blob, this.ensureFileExtension(filename, 'xlsx'));
    }

    /**
     * Export to PDF format
     */
    private async exportToPDF(data: any[], filename: string, options: IExportOptions): Promise<void> {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for better table display

        // Add title and metadata
        this.addPDFHeader(doc, options);

        if (data.length === 0) {
            doc.text('No data to display', 20, 40);
            doc.save(this.ensureFileExtension(filename, 'pdf'));
            return;
        }

        const headers = Object.keys(data[0]);
        const tableData = data.map((row) =>
            headers.map((header) => {
                const value = row[header];
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

        autoTable(doc, tableConfig);

        // Add footer with export info
        this.addPDFFooter(doc, data.length);

        doc.save(this.ensureFileExtension(filename, 'pdf'));
    }

    /**
     * Export to JSON format
     */
    private async exportToJSON(data: any[], filename: string, options: IExportOptions): Promise<void> {
        const exportObject = {
            metadata: {
                exportDate: new Date().toISOString(),
                recordCount: data.length,
                format: 'JSON',
                ...options.metadata,
            },
            data: data,
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
    private createSummaryWorksheet(XLSX: any, data: any[]): any {
        if (data.length === 0) {
            return XLSX.utils.aoa_to_sheet([['No data available']]);
        }

        const headers = Object.keys(data[0]);
        const summaryData = [
            ['Column Statistics'],
            ['Column', 'Type', 'Non-null Count', 'Unique Values', 'Sample Values'],
            ...headers.map((header) => {
                const values = data.map((row) => row[header]).filter((v) => v != null);
                const uniqueValues = new Set(values);
                const sampleValues = Array.from(uniqueValues).slice(0, 3).join(', ');
                const dataType = this.inferDataType(values);

                return [header, dataType, values.length, uniqueValues.size, sampleValues];
            }),
        ];

        return XLSX.utils.aoa_to_sheet(summaryData);
    }

    /**
     * Style Excel worksheet
     */
    private styleExcelWorksheet(worksheet: any, data: any[]): void {
        const range = worksheet['!ref'];
        if (!range) return;

        // Add auto-filter
        worksheet['!autofilter'] = { ref: range };

        // Set column widths
        const headers = Object.keys(data[0] || {});
        worksheet['!cols'] = headers.map((header) => {
            const maxLength = Math.max(
                header.length,
                ...data.slice(0, 100).map((row) => {
                    const value = row[header];
                    return value ? value.toString().length : 0;
                }),
            );
            return { width: Math.min(Math.max(maxLength + 2, 10), 50) };
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
            const values = data.slice(0, 50).map((row) => row[header]);
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
