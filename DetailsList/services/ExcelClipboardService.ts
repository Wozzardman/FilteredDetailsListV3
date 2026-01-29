/**
 * Excel Clipboard Service - Handle copy/paste with Excel format preservation
 * Supports HTML table format, TSV, and structured data
 */

export interface ExcelClipboardData {
    html?: string;
    text?: string;
    data?: any[][];
    headers?: string[];
    formats?: {
        [key: string]: {
            type: 'text' | 'number' | 'date' | 'currency' | 'percentage';
            format?: string;
            style?: React.CSSProperties;
        };
    };
}

export interface ClipboardPasteResult {
    success: boolean;
    data?: any[][];
    headers?: string[];
    rowCount: number;
    columnCount: number;
    formats?: ExcelClipboardData['formats'];
    error?: string;
}

export class ExcelClipboardService {
    private static instance: ExcelClipboardService;

    public static getInstance(): ExcelClipboardService {
        if (!ExcelClipboardService.instance) {
            ExcelClipboardService.instance = new ExcelClipboardService();
        }
        return ExcelClipboardService.instance;
    }

    /**
     * Copy data to clipboard in Excel-compatible format
     * Power Apps-compatible implementation with iOS WebView safety
     */
    public async copyToClipboard(data: any[], columns: any[], includeHeaders: boolean = true): Promise<boolean> {
        try {
            // iOS WebView Safety: ClipboardItem is NOT supported on iOS Safari/WebView
            // This can cause crashes on iOS Power Apps mobile app
            // Check for ClipboardItem constructor availability before using it
            const hasClipboardItem = typeof ClipboardItem !== 'undefined';
            
            // Check if modern clipboard API is available, not blocked, and ClipboardItem is supported
            if (hasClipboardItem && navigator.clipboard && navigator.clipboard.write && this.isClipboardAPIAllowed()) {
                const clipboardData = this.prepareClipboardData(data, columns, includeHeaders);
                
                try {
                    const clipboardItems = [];
                    
                    // Add HTML format (for Excel rich formatting)
                    if (clipboardData.html) {
                        clipboardItems.push(new ClipboardItem({
                            'text/html': new Blob([clipboardData.html], { type: 'text/html' })
                        }));
                    }
                    
                    // Add plain text (TSV format for Excel compatibility)
                    if (clipboardData.text) {
                        clipboardItems.push(new ClipboardItem({
                            'text/plain': new Blob([clipboardData.text], { type: 'text/plain' })
                        }));
                    }

                    await navigator.clipboard.write(clipboardItems);
                    console.log('📋 Data copied to clipboard with Excel formatting');
                    return true;
                } catch (clipboardError) {
                    // ClipboardItem may fail on iOS even if it exists - fallback to legacy
                    console.warn('ClipboardItem failed (likely iOS WebView), using fallback:', clipboardError);
                    return this.copyToClipboardLegacy(data, columns, includeHeaders);
                }
            } else {
                console.warn('Modern Clipboard API not available in Power Apps context, using fallback');
                return this.copyToClipboardLegacy(data, columns, includeHeaders);
            }
        } catch (error) {
            console.error('Clipboard copy failed:', error);
            // Fallback to legacy method
            return this.copyToClipboardLegacy(data, columns, includeHeaders);
        }
    }

    /**
     * Check if clipboard API is allowed in current context
     */
    private isClipboardAPIAllowed(): boolean {
        try {
            // Test if clipboard API is actually accessible (not just defined)
            // In Power Apps, this might be blocked even if navigator.clipboard exists
            return typeof navigator.clipboard.write === 'function' && 
                   typeof navigator.clipboard.read === 'function' &&
                   !this.isPowerAppsContext();
        } catch {
            return false;
        }
    }

    /**
     * Detect if running in Power Apps context where some APIs are restricted
     * iOS WebView Safety: All checks are wrapped in try-catch
     */
    private isPowerAppsContext(): boolean {
        try {
            // iOS WebView Safety: Check for window and document availability
            if (typeof window === 'undefined' || window === null) {
                return true; // Assume restricted context if window is not available
            }
            
            if (typeof document === 'undefined' || document === null) {
                return true; // Assume restricted context if document is not available
            }
            
            // Check for Power Apps specific indicators
            const hasPowerAppsWindow = !!(
                (window as any).PowerApps ||
                (window as any).PowerAppsPortal
            );
            
            // Safely check for DOM elements
            let hasPowerAppsDom = false;
            try {
                hasPowerAppsDom = !!(
                    document.querySelector('.PowerAppsPortal') ||
                    document.querySelector('[data-control-name]')
                );
            } catch (e) {
                // DOM query failed - assume Power Apps context
                hasPowerAppsDom = true;
            }
            
            // Check user agent
            const isPowerAppsUserAgent = typeof navigator !== 'undefined' && 
                                          typeof navigator.userAgent === 'string' && 
                                          navigator.userAgent.includes('PowerApps');
            
            return hasPowerAppsWindow || hasPowerAppsDom || isPowerAppsUserAgent;
        } catch {
            return true; // Assume restricted context on any error
        }
    }

    /**
     * Paste data from clipboard with Excel format detection
     * Power Apps-compatible implementation
     */
    public async pasteFromClipboard(): Promise<ClipboardPasteResult> {
        try {
            // Check if modern clipboard API is available and not blocked
            if (navigator.clipboard && navigator.clipboard.read && this.isClipboardAPIAllowed()) {
                const clipboardItems = await navigator.clipboard.read();
                
                for (const item of clipboardItems) {
                    // Try HTML first (Excel rich format)
                    if (item.types.includes('text/html')) {
                        const htmlBlob = await item.getType('text/html');
                        const html = await htmlBlob.text();
                        const result = this.parseHTMLClipboard(html);
                        if (result.success) {
                            console.log('📋 Pasted HTML data from clipboard (Excel format)');
                            return result;
                        }
                    }
                    
                    // Fall back to plain text
                    if (item.types.includes('text/plain')) {
                        const textBlob = await item.getType('text/plain');
                        const text = await textBlob.text();
                        const result = this.parseTextClipboard(text);
                        if (result.success) {
                            console.log('📋 Pasted text data from clipboard');
                            return result;
                        }
                    }
                }

                return { success: false, rowCount: 0, columnCount: 0, error: 'No compatible data found in clipboard' };
            } else {
                console.warn('Modern Clipboard API not available in Power Apps context, using fallback');
                return this.pasteFromClipboardLegacy();
            }
        } catch (error) {
            console.error('❌ Error pasting from clipboard:', error);
            return this.pasteFromClipboardLegacy();
        }
    }

    /**
     * Prepare clipboard data in multiple formats
     */
    private prepareClipboardData(data: any[], columns: any[], includeHeaders: boolean): ExcelClipboardData {
        const headers = includeHeaders ? columns.map(col => col.name || col.key) : [];
        const rows = data.map(item => columns.map(col => this.getCellValue(item, col.key || col.fieldName)));
        
        // Create HTML table with styling
        const html = this.createHTMLTable(headers, rows, columns);
        
        // Create TSV (Tab-separated values) for Excel compatibility
        const tsvData = includeHeaders ? [headers, ...rows] : rows;
        const text = tsvData.map(row => row.join('\t')).join('\n');
        
        return {
            html,
            text,
            data: tsvData,
            headers: includeHeaders ? headers : undefined,
            formats: this.extractColumnFormats(columns)
        };
    }

    /**
     * Create HTML table with Excel-compatible styling
     */
    private createHTMLTable(headers: string[], rows: any[][], columns: any[]): string {
        let html = '<table>';
        
        // Add headers with styling
        if (headers.length > 0) {
            html += '<thead><tr>';
            headers.forEach((header, index) => {
                const column = columns[index];
                const style = this.getHeaderStyle(column);
                html += `<th style="${style}">${this.escapeHtml(header)}</th>`;
            });
            html += '</tr></thead>';
        }
        
        // Add data rows with formatting
        html += '<tbody>';
        rows.forEach(row => {
            html += '<tr>';
            row.forEach((cell, index) => {
                const column = columns[index];
                const style = this.getCellStyle(column, cell);
                const formattedValue = this.formatCellValue(cell, column);
                html += `<td style="${style}">${this.escapeHtml(formattedValue)}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        
        return html;
    }

    /**
     * Parse HTML clipboard data (from Excel)
     */
    private parseHTMLClipboard(html: string): ClipboardPasteResult {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const table = doc.querySelector('table');
            
            if (!table) {
                return { success: false, rowCount: 0, columnCount: 0, error: 'No table found in HTML data' };
            }

            const headers: string[] = [];
            const data: any[][] = [];
            const formats: ExcelClipboardData['formats'] = {};

            // Extract headers
            const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
            if (headerRow) {
                const headerCells = headerRow.querySelectorAll('th, td');
                headerCells.forEach((cell, index) => {
                    headers.push(cell.textContent?.trim() || `Column${index + 1}`);
                    formats[`col_${index}`] = this.extractCellFormat(cell as HTMLElement);
                });
            }

            // Extract data rows
            const bodyRows = table.querySelectorAll('tbody tr') || table.querySelectorAll('tr');
            const startIndex = headers.length > 0 ? 1 : 0; // Skip header row if present
            
            for (let i = startIndex; i < bodyRows.length; i++) {
                const row = bodyRows[i];
                const cells = row.querySelectorAll('td, th');
                const rowData: any[] = [];
                
                cells.forEach((cell, cellIndex) => {
                    const value = this.parseCellValue(cell.textContent?.trim() || '', formats[`col_${cellIndex}`]);
                    rowData.push(value);
                });
                
                if (rowData.length > 0) {
                    data.push(rowData);
                }
            }

            return {
                success: true,
                data,
                headers: headers.length > 0 ? headers : undefined,
                rowCount: data.length,
                columnCount: Math.max(...data.map(row => row.length), 0),
                formats
            };
        } catch (error) {
            console.error('Error parsing HTML clipboard:', error);
            return { success: false, rowCount: 0, columnCount: 0, error: 'Failed to parse HTML data' };
        }
    }

    /**
     * Parse plain text clipboard data (TSV/CSV)
     */
    private parseTextClipboard(text: string): ClipboardPasteResult {
        try {
            const lines = text.trim().split('\n');
            if (lines.length === 0) {
                return { success: false, rowCount: 0, columnCount: 0, error: 'No data found' };
            }

            // Auto-detect delimiter (tab, comma, semicolon)
            const delimiter = this.detectDelimiter(lines[0]);
            
            const data: any[][] = [];
            let headers: string[] | undefined;
            
            // Check if first row looks like headers
            const firstRowCells = lines[0].split(delimiter);
            const hasHeaders = this.looksLikeHeaders(firstRowCells);
            
            if (hasHeaders) {
                headers = firstRowCells.map(cell => cell.trim().replace(/"/g, ''));
                lines.splice(0, 1); // Remove header row
            }

            // Parse data rows
            lines.forEach(line => {
                if (line.trim()) {
                    const cells = line.split(delimiter).map(cell => {
                        const cleanCell = cell.trim().replace(/"/g, '');
                        return this.parseValue(cleanCell);
                    });
                    data.push(cells);
                }
            });

            return {
                success: true,
                data,
                headers,
                rowCount: data.length,
                columnCount: Math.max(...data.map(row => row.length), 0)
            };
        } catch (error) {
            console.error('Error parsing text clipboard:', error);
            return { success: false, rowCount: 0, columnCount: 0, error: 'Failed to parse text data' };
        }
    }

    /**
     * Power Apps-compatible clipboard methods (no execCommand or blocked APIs)
     */
    private copyToClipboardLegacy(data: any[], columns: any[], includeHeaders: boolean): boolean {
        try {
            const clipboardData = this.prepareClipboardData(data, columns, includeHeaders);
            
            // Power Apps blocks execCommand, so we'll use an alternative approach
            // Create a visible textarea that user can manually copy from
            const textarea = document.createElement('textarea');
            textarea.value = clipboardData.text || '';
            textarea.style.position = 'fixed';
            textarea.style.top = '10px';
            textarea.style.right = '10px';
            textarea.style.width = '300px';
            textarea.style.height = '100px';
            textarea.style.zIndex = '10000';
            textarea.style.background = 'white';
            textarea.style.border = '2px solid #0078d4';
            textarea.style.borderRadius = '4px';
            textarea.style.padding = '8px';
            textarea.readOnly = true;
            
            document.body.appendChild(textarea);
            textarea.select();
            textarea.focus();
            
            // Show instruction overlay
            const instruction = document.createElement('div');
            instruction.style.position = 'fixed';
            instruction.style.top = '120px';
            instruction.style.right = '10px';
            instruction.style.background = '#0078d4';
            instruction.style.color = 'white';
            instruction.style.padding = '8px 12px';
            instruction.style.borderRadius = '4px';
            instruction.style.zIndex = '10001';
            instruction.style.fontSize = '14px';
            instruction.textContent = 'Press Ctrl+C to copy, then click anywhere to close';
            
            document.body.appendChild(instruction);
            
            // Auto-cleanup after 10 seconds or on click
            const cleanup = () => {
                if (document.body.contains(textarea)) {
                    document.body.removeChild(textarea);
                }
                if (document.body.contains(instruction)) {
                    document.body.removeChild(instruction);
                }
                document.removeEventListener('click', cleanup);
            };
            
            setTimeout(cleanup, 10000);
            document.addEventListener('click', cleanup);
            
            return true; // Return true since we've set up the copy interface
        } catch (error) {
            console.error('Power Apps-compatible clipboard copy failed:', error);
            return false;
        }
    }

    private async pasteFromClipboardLegacy(): Promise<ClipboardPasteResult> {
        return { 
            success: false, 
            rowCount: 0, 
            columnCount: 0, 
            error: 'Use Ctrl+V or the native paste function in Power Apps' 
        };
    }

    // Helper methods
    private getCellValue(item: any, fieldName: string): any {
        return item[fieldName] ?? '';
    }

    private getHeaderStyle(column: any): string {
        return 'font-weight: bold; background-color: #f0f0f0; border: 1px solid #ccc; padding: 4px;';
    }

    private getCellStyle(column: any, value: any): string {
        let style = 'border: 1px solid #ccc; padding: 4px;';
        
        // Add type-specific styling
        if (typeof value === 'number') {
            style += ' text-align: right;';
        } else if (value instanceof Date) {
            style += ' text-align: center;';
        }
        
        return style;
    }

    private formatCellValue(value: any, column: any): string {
        if (value == null) return '';
        if (value instanceof Date) return value.toLocaleDateString();
        if (typeof value === 'number') return value.toString();
        return String(value);
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private extractCellFormat(cell: HTMLElement): any {
        const style = cell.style;
        return {
            type: 'text',
            style: {
                fontWeight: style.fontWeight,
                textAlign: style.textAlign,
                backgroundColor: style.backgroundColor,
                color: style.color
            }
        };
    }

    private parseCellValue(text: string, format?: any): any {
        if (!text) return '';
        
        // Try to parse as number
        const numValue = Number(text.replace(/[,$%]/g, ''));
        if (!isNaN(numValue) && text.match(/^[\d,.$%\-+\s]+$/)) {
            return numValue;
        }
        
        // Try to parse as date
        const dateValue = new Date(text);
        if (!isNaN(dateValue.getTime()) && text.match(/\d/)) {
            return dateValue;
        }
        
        return text;
    }

    private detectDelimiter(line: string): string {
        const delimiters = ['\t', ',', ';', '|'];
        let maxCount = 0;
        let bestDelimiter = '\t';
        
        delimiters.forEach(delimiter => {
            const count = (line.match(new RegExp(delimiter, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                bestDelimiter = delimiter;
            }
        });
        
        return bestDelimiter;
    }

    private looksLikeHeaders(cells: string[]): boolean {
        // Simple heuristic: if most cells don't look like numbers or dates, they're probably headers
        const nonNumericCount = cells.filter(cell => {
            const cleaned = cell.trim().replace(/"/g, '');
            return isNaN(Number(cleaned)) && isNaN(new Date(cleaned).getTime());
        }).length;
        
        return nonNumericCount > cells.length / 2;
    }

    private parseValue(text: string): any {
        if (!text) return '';
        
        // Try number
        const numValue = Number(text);
        if (!isNaN(numValue) && text.match(/^[\d.\-+e]+$/i)) {
            return numValue;
        }
        
        // Try boolean
        if (text.toLowerCase() === 'true') return true;
        if (text.toLowerCase() === 'false') return false;
        
        return text;
    }

    private extractColumnFormats(columns: any[]): ExcelClipboardData['formats'] {
        const formats: ExcelClipboardData['formats'] = {};
        
        columns.forEach((column, index) => {
            formats[`col_${index}`] = {
                type: this.getColumnType(column),
                format: column.format,
                style: column.style
            };
        });
        
        return formats;
    }

    private getColumnType(column: any): 'text' | 'number' | 'date' | 'currency' | 'percentage' {
        const dataType = column.dataType || column.type;
        switch (dataType) {
            case 'number': return 'number';
            case 'date': return 'date';
            case 'currency': return 'currency';
            case 'percentage': return 'percentage';
            default: return 'text';
        }
    }
}
