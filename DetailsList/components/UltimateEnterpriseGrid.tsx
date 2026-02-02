import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { IColumn, SelectionMode, DetailsListLayoutMode, ConstrainMode } from '@fluentui/react';
import { TextField } from '@fluentui/react/lib/TextField';
import { DefaultButton, PrimaryButton, IconButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { ContextualMenu, IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { DetailsList } from '@fluentui/react/lib/DetailsList';
import { UltraVirtualizedGrid, useUltraVirtualization } from '../virtualization/UltraVirtualizationEngine';
import { EnterpriseChangeManager } from '../services/EnterpriseChangeManager';
import { DataExportService } from '../services/DataExportService';
import { IExportOptions } from '../types/Advanced.types';
import { VirtualizedEditableGrid, VirtualizedEditableGridRef } from './VirtualizedEditableGrid';
import { ColumnEditorMapping } from '../types/ColumnEditor.types';
import { HeaderSelectionCheckbox, RowSelectionCheckbox } from './SelectionCheckbox';
import '../css/SelectionMode.css';

export interface IUltimateEnterpriseGridColumn extends IColumn {
    filterable?: boolean;
    sortable?: boolean;
    exportable?: boolean;
    editable?: boolean;
    dataType?: 'string' | 'number' | 'date' | 'boolean';
    validator?: (value: any) => boolean | string;
    formatter?: (value: any) => string;
}

export interface IUltimateEnterpriseGridProps {
    items: any[];
    columns: IUltimateEnterpriseGridColumn[];
    height?: number | string;
    width?: number | string;
    enableVirtualization?: boolean;
    virtualizationThreshold?: number;
    enableInlineEditing?: boolean;
    enableFiltering?: boolean;
    enableExport?: boolean;
    enableAddNewRow?: boolean;
    enablePerformanceMonitoring?: boolean;
    enableChangeTracking?: boolean;
    useEnhancedEditors?: boolean;
    columnEditorMapping?: ColumnEditorMapping;
    onItemsChanged?: (items: any[]) => void;
    onCellEdit?: (item: any, column: IUltimateEnterpriseGridColumn, newValue: any) => void;
    onCommitChanges?: () => void;
    onCancelChanges?: () => void;
    onAddNewRow?: (count: number) => void;
    onDeleteNewRow?: (itemId: string) => void;
    onExport?: (format: 'CSV' | 'Excel' | 'PDF' | 'JSON', data: any[]) => void;
    getColumnDataType?: (columnKey: string) => 'text' | 'number' | 'date' | 'boolean' | 'choice';
    selectionMode?: SelectionMode;
    
    // Selection mode properties
    enableSelectionMode?: boolean;
    selectionType?: '0' | '1' | '2'; // 0=None, 1=Single, 2=Multiple
    selectedItems?: Set<string>;
    selectAllState?: 'none' | 'some' | 'all';
    
    // Text size configuration
    headerTextSize?: number;
    columnTextSize?: number;
    
    // Header text wrapping configuration
    enableHeaderTextWrapping?: boolean;
    
    // Row styling configuration
    alternateRowColor?: string;
    onItemSelection?: (itemId: string) => void;
    onSelectAll?: () => void;
    onClearAllSelections?: () => void;
    
    // Excel Clipboard properties
    enableExcelClipboard?: boolean;
    onClipboardOperation?: (operation: 'copy' | 'paste', data?: any) => void;
    
    // Jump To Navigation properties
    enableJumpTo?: boolean;
    jumpToColumn?: string;
    jumpToColumnDisplayName?: string;
    jumpToValue?: string;
    onJumpToResult?: (result: string, rowIndex: number) => void;
    
    // Width configuration properties
    filterRecordsWidth?: number;
    jumpToWidth?: number;
    
    // Control Bar Visibility
    showControlBar?: boolean;
    
    // Control Bar Text Customization
    addNewRowText?: string;
    totalItemsText?: string;
    filterRecordsText?: string;
    
    // Custom Formula Field Configuration
    showFormulaField?: boolean;
    formulaFieldText?: string;
    formulaFieldExpression?: string;
    
    className?: string;
    theme?: 'light' | 'dark' | 'high-contrast';
    locale?: string;
}

/**
 * UltimateEnterpriseGrid - Meta/Google-competitive ultra-high performance grid
 * Simplified version for build success
 */
export const UltimateEnterpriseGrid: React.FC<IUltimateEnterpriseGridProps> = ({
    items,
    columns,
    height = 600,
    width = '100%',
    enableVirtualization = true,
    virtualizationThreshold = 100,
    enableInlineEditing = true,
    enableFiltering = true,
    enableExport = true,
    enableAddNewRow = false,
    enablePerformanceMonitoring = true,
    enableChangeTracking = true,
    useEnhancedEditors = false,
    columnEditorMapping = {},
    onItemsChanged,
    onCellEdit,
    onCommitChanges,
    onCancelChanges,
    onAddNewRow,
    onDeleteNewRow,
    onExport,
    getColumnDataType,
    selectionMode = SelectionMode.multiple,
    
    // Selection mode props
    enableSelectionMode = false,
    selectionType = '2', // Default to Multiple for backward compatibility
    selectedItems = new Set(),
    selectAllState = 'none',
    onItemSelection,
    onSelectAll,
    onClearAllSelections,
    
    // Excel Clipboard props
    enableExcelClipboard = false,
    onClipboardOperation,
    
    // Jump To Navigation props
    enableJumpTo = false,
    jumpToColumn = '',
    jumpToColumnDisplayName = '',
    jumpToValue = '',
    onJumpToResult,
    
    // Width configuration props
    filterRecordsWidth = 200,
    jumpToWidth = 200,
    
    // Control Bar Visibility
    showControlBar = true,
    
    // Control Bar Text Customization
    addNewRowText = 'Add New Row',
    totalItemsText = 'Total Items:',
    filterRecordsText = 'Search records',
    
    // Custom Formula Field Configuration
    showFormulaField = false,
    formulaFieldText = 'Formula Result:',
    formulaFieldExpression = '',
    
    className = '',
    theme = 'light',
    locale = 'en-US',
    
    // Text sizing props with defaults
    headerTextSize = 14, // Default 14px for headers
    columnTextSize = 13, // Default 13px for column data
    
    // Header text wrapping
    enableHeaderTextWrapping = false, // Default to no wrapping for backward compatibility
    
    // Row styling props
    alternateRowColor
}) => {
    // Ref for grid imperative methods
    const gridRef = React.useRef<VirtualizedEditableGridRef>(null);
    
    // State management
    const [filteredItems, setFilteredItems] = useState<any[]>(items);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [columnFilters, setColumnFilters] = useState<Record<string, any[]>>({});
    const [pendingChangesCount, setPendingChangesCount] = useState<number>(0);
    const [changeManager] = useState(() => new EnterpriseChangeManager());
    const [exportService] = useState(() => DataExportService.getInstance());
    
    // Add New Row dialog state
    const [showAddRowDialog, setShowAddRowDialog] = useState<boolean>(false);
    const [newRowCount, setNewRowCount] = useState<string>('1');
    
    // Jump To navigation state
    const [jumpToSearchValue, setJumpToSearchValue] = useState<string>('');
    const [lastJumpResult, setLastJumpResult] = useState<{ result: string; rowIndex: number } | null>(null);
    
    // Export dropdown state
    const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
    const exportButtonRef = React.useRef<HTMLDivElement>(null);
    
    // Ultra virtualization hook
    const {
        performanceMetrics,
        isOptimized,
        shouldVirtualize
    } = useUltraVirtualization(filteredItems, {
        itemHeight: 40,
        overscan: 10,
        enableMemoryPooling: true,
        enablePrefetching: true,
        enableAdaptiveRendering: true,
    });

    // Update filtered items when props change
    useEffect(() => {
        let result = [...items];
        
        // Apply global filter
        if (globalFilter) {
            const filterLower = globalFilter.toLowerCase();
            result = result.filter(item =>
                columns.some(column => {
                    // Handle PCF EntityRecord objects
                    let value;
                    if (item && typeof item.getValue === 'function') {
                        // PCF EntityRecord - use getValue method
                        try {
                            value = item.getValue(column.fieldName || column.key);
                        } catch (e) {
                            value = null;
                        }
                    } else {
                        // Plain object - use property access
                        value = item[column.fieldName || column.key];
                    }
                    return value && value.toString().toLowerCase().includes(filterLower);
                })
            );
        }
        
        // Apply column filters
                Object.entries(columnFilters).forEach(([columnKey, selectedValues]) => {
            if (selectedValues && selectedValues.length > 0) {
                result = result.filter(item => {
                    let value: any;
                    if (item && typeof item.getValue === 'function') {
                        try {
                            value = item.getValue(columnKey);
                        } catch (e) {
                            value = null;
                        }
                    } else {
                        value = item[columnKey];
                    }
                    
                    // Handle blanks
                    if (selectedValues.includes('(Blanks)') && (value == null || value === undefined || value === '')) {
                        return true;
                    }
                    
                    // Normalize dates for comparison to match VirtualizedEditableGrid logic
                    let normalizedValue: any = value;
                    if (value instanceof Date) {
                        normalizedValue = value.toDateString();
                    } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
                        const dateValue = new Date(value);
                        if (!isNaN(dateValue.getTime())) {
                            normalizedValue = dateValue.toDateString();
                        }
                    }
                    
                    return selectedValues.some((filterValue: any) => {
                        if (filterValue === '(Blanks)') return false; // Already handled above
                        
                        // Normalize filter values for comparison
                        let normalizedFilter: any = filterValue;
                        if (filterValue instanceof Date) {
                            normalizedFilter = filterValue.toDateString();
                        }
                        
                        return normalizedValue === normalizedFilter || 
                               normalizedValue === filterValue ||
                               value === filterValue;
                    });
                });
            }
        });        setFilteredItems(result);
    }, [items, globalFilter, columnFilters, columns]);

    // Handle cell edit
    const handleCellEdit = useCallback((item: any, column: IUltimateEnterpriseGridColumn, newValue: any) => {
        if (enableInlineEditing) {
            onCellEdit?.(item, column, newValue);
            
            if (enableChangeTracking && changeManager) {
                const recordKey = item.key || item.id || item.recordId || 'unknown';
                const columnKey = column.fieldName || column.key;
                
                // Get old value from PCF EntityRecord or plain object
                let oldValue;
                if (item && typeof item.getValue === 'function') {
                    try {
                        oldValue = item.getValue(columnKey);
                    } catch (e) {
                        oldValue = null;
                    }
                } else {
                    oldValue = item[columnKey];
                }
                
                changeManager.addChange(recordKey, columnKey, oldValue, newValue);
                
                // Update pending changes count immediately
                setPendingChangesCount(changeManager.getPendingChanges().length);
            }
        }
    }, [enableInlineEditing, enableChangeTracking, onCellEdit, changeManager]);

    // Get available values for column filters using proper PCF data access pattern
    const getAvailableValues = useCallback((columnKey: string) => {
        // Use a Map to track values and their counts efficiently
        const valueCountMap = new Map<any, number>();
        let blankCount = 0;
        
        // Find the column configuration to determine data type
        const columnConfig = columns.find(col => (col.fieldName || col.key) === columnKey);
        const isDateColumn = columnConfig?.dataType === 'date' || 
                           (getColumnDataType && ['date'].includes(getColumnDataType(columnKey)));
        
        items.forEach(item => {
            let value;
            
            // Handle PCF EntityRecord objects with the new data access pattern
            if (item && typeof item.getValue === 'function') {
                // PCF EntityRecord - use getValue method
                try {
                    value = item.getValue(columnKey);
                } catch (e) {
                    // Fallback to getValueByColumn method if available
                    if (typeof item.getValueByColumn === 'function') {
                        value = item.getValueByColumn(columnKey);
                    } else {
                        value = null;
                    }
                }
            } else {
                // Plain object - use property access
                value = item[columnKey];
            }
            
            // Count blank values (null, undefined, empty string, or just whitespace)
            if (value == null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
                blankCount++;
            } else {
                // For date columns, normalize to date string for proper grouping
                let normalizedValue = value;
                if (isDateColumn && value instanceof Date) {
                    // Use toDateString() to group by date without time
                    normalizedValue = value.toDateString();
                } else if (isDateColumn && typeof value === 'string') {
                    // Try to parse string as date and normalize
                    const parsedDate = new Date(value);
                    if (!isNaN(parsedDate.getTime())) {
                        normalizedValue = parsedDate.toDateString();
                    }
                }
                
                const currentCount = valueCountMap.get(normalizedValue) || 0;
                valueCountMap.set(normalizedValue, currentCount + 1);
            }
        });
        
        // Convert to array of objects with value and count
        const result = Array.from(valueCountMap.entries()).map(([value, count]) => {
            let displayValue: string;
            
            if (isDateColumn && value) {
                // Format dates as short date string (e.g., "7/8/2025")
                if (value instanceof Date) {
                    displayValue = value.toLocaleDateString();
                } else if (typeof value === 'string') {
                    const parsedDate = new Date(value);
                    if (!isNaN(parsedDate.getTime())) {
                        displayValue = parsedDate.toLocaleDateString();
                    } else {
                        displayValue = value;
                    }
                } else {
                    displayValue = value.toString();
                }
            } else {
                displayValue = value?.toString() || '';
            }
            
            return {
                value,
                displayValue,
                count
            };
        });
        
        // Add (Blanks) entry if there are blank values
        if (blankCount > 0) {
            result.unshift({
                value: '(Blanks)',
                displayValue: '(Blanks)',
                count: blankCount
            });
        }
        
        // Sort by display value (but keep blanks at the top)
        const blanksEntry = result.find(item => item.value === '(Blanks)');
        const nonBlanksEntries = result.filter(item => item.value !== '(Blanks)');
        nonBlanksEntries.sort((a, b) => (a.displayValue || '').localeCompare(b.displayValue || ''));
        
        return blanksEntry ? [blanksEntry, ...nonBlanksEntries] : nonBlanksEntries;
    }, [items, columns, getColumnDataType]);

    // Handle export functionality
    const handleExport = useCallback(async (format: 'CSV' | 'Excel' | 'PDF' | 'JSON') => {
        try {
            
            // Create export options with metadata
            const exportOptions: IExportOptions = {
                format,
                includeFilters: true,
                includeHeaders: true,
                customColumns: columns.map(col => col.fieldName || col.key),
                customHeaders: columns.map(col => col.name || col.fieldName || col.key), // Use display names for headers
                maxRows: filteredItems.length, // Export all filtered data
                fileName: `enterprise-grid-export-${new Date().toISOString().slice(0, 10)}`,
                metadata: {
                    title: 'Enterprise Grid Export',
                    description: `Exported ${filteredItems.length} records from Ultra-Performance Grid`,
                    author: 'Enterprise Grid System',
                    createdDate: new Date()
                }
            };

            // Use the real DataExportService to export
            await exportService.exportData(filteredItems, exportOptions);
            
            
            // Call the optional callback
            onExport?.(format, filteredItems);
        } catch (error) {
            console.error(`❌ Export failed:`, error);
            // You could show a toast notification here
        }
    }, [filteredItems, columns, exportService, onExport]);

    // Commit all pending changes
    const handleCommitChanges = useCallback(async () => {
        if (changeManager) {
            try {
                await changeManager.commitAllChanges();
                // Also call the grid method to keep in sync
                if (gridRef.current) {
                    gridRef.current.commitAllChanges();
                }
                setPendingChangesCount(0); // Reset count after commit
                
                // Notify parent component about the save operation
                onCommitChanges?.();
            } catch (error) {
                console.error('Error committing changes:', error);
            }
        }
    }, [changeManager, onCommitChanges]);

    // Cancel all pending changes
    const handleCancelChanges = useCallback(() => {
        if (changeManager) {
            changeManager.cancelAllChanges();
            // Also call the grid method to keep in sync
            if (gridRef.current) {
                gridRef.current.cancelAllChanges();
            }
            setPendingChangesCount(0); // Reset count after cancel
        }
    }, [changeManager]);

    // Jump To navigation handler - reuses the same data access pattern as the filter function
    const handleJumpTo = useCallback((searchValue: string) => {
        if (!searchValue.trim() || !jumpToColumn) {
            setLastJumpResult({ result: 'No search value or column specified', rowIndex: -1 });
            onJumpToResult?.('No search value or column specified', -1);
            return;
        }

        const searchValueLower = searchValue.toLowerCase();

        // Find the item that matches the search value in the specified column
        // Use the same data access pattern as the global filter for consistency
        const matchingIndex = filteredItems.findIndex(item => {
            // Handle PCF EntityRecord objects - same pattern as filter function
            let value;
            if (item && typeof item.getValue === 'function') {
                // PCF EntityRecord - use getValue method
                try {
                    value = item.getValue(jumpToColumn);
                } catch (e) {
                    value = null;
                }
            } else {
                // Plain object - use property access
                value = item[jumpToColumn];
            }
            
            if (value == null) return false;
            
            // Convert to string for comparison (case insensitive)
            const itemValue = value.toString().toLowerCase();
            
            // Exact match or starts with match
            return itemValue === searchValueLower || itemValue.startsWith(searchValueLower);
        });

        if (matchingIndex >= 0) {
            
            // ENTERPRISE-GRADE LIGHTNING-FAST SCROLLING - Google/Meta competitive performance
            // Instant virtualized scrolling with zero performance overhead
            if (gridRef.current?.scrollToIndex) {
                gridRef.current.scrollToIndex(matchingIndex);
            }
            
            // No visual feedback text - just silent navigation with row index for Power Apps integration
            setLastJumpResult({ result: '', rowIndex: matchingIndex });
            onJumpToResult?.('', matchingIndex);
        } else {
            // No visual feedback text - just silent failure indication  
            setLastJumpResult({ result: '', rowIndex: -1 });
            onJumpToResult?.('', -1);
        }
    }, [filteredItems, jumpToColumn, onJumpToResult, gridRef]);

    // Handle Jump To search box change
    const handleJumpToSearch = useCallback((event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        setJumpToSearchValue(newValue || '');
    }, []);

    // Handle Jump To search box enter key
    const handleJumpToKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Enter') {
            handleJumpTo(jumpToSearchValue);
        }
    }, [handleJumpTo, jumpToSearchValue]);

    // Auto-trigger jump when jumpToValue prop changes (for external control)
    useEffect(() => {
        if (jumpToValue && jumpToValue.trim()) {
            handleJumpTo(jumpToValue);
        }
    }, [jumpToValue, handleJumpTo]);

    // Export menu items
    const exportMenuItems: IContextualMenuItem[] = [
        {
            key: 'csv',
            text: 'Export CSV',
            iconProps: { iconName: 'Table' },
            onClick: () => {
                handleExport('CSV');
                setShowExportMenu(false);
            }
        },
        {
            key: 'excel',
            text: 'Export Excel',
            iconProps: { iconName: 'ExcelLogo' },
            onClick: () => {
                handleExport('Excel');
                setShowExportMenu(false);
            }
        }
    ];

    // Add New Row dialog handlers
    const handleShowAddRowDialog = useCallback(() => {
        setShowAddRowDialog(true);
        setNewRowCount('1'); // Reset to default
    }, []);

    const handleCloseAddRowDialog = useCallback(() => {
        setShowAddRowDialog(false);
        setNewRowCount('1');
    }, []);

    const handleAddNewRows = useCallback(() => {
        const count = parseInt(newRowCount, 10);
        if (count > 0 && count <= 1000 && onAddNewRow) { // Limit to 1000 rows max
            onAddNewRow(count);
            handleCloseAddRowDialog();
        }
    }, [newRowCount, onAddNewRow, handleCloseAddRowDialog]);

    const handleRowCountChange = useCallback((event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        setNewRowCount(newValue || '1');
    }, []);

    // Handle column filter changes
    const handleColumnFilterChange = useCallback((columnKey: string, selectedValues: any[]) => {
        setColumnFilters(prev => {
            if (selectedValues.length === 0) {
                // Remove filter if no values selected
                const { [columnKey]: removed, ...rest } = prev;
                return rest;
            } else {
                // Update filter
                return {
                    ...prev,
                    [columnKey]: selectedValues
                };
            }
        });
    }, []);

    // Determine if virtualization should be used
    const shouldUseVirtualization = enableVirtualization && 
        (filteredItems.length >= virtualizationThreshold || shouldVirtualize);

    // Helper function to get field value using established grid data access pattern
    const getFieldValue = useCallback((item: any, fieldName: string) => {
        // Find the column definition for this field (case-insensitive)
        const fieldNameLower = fieldName.toLowerCase();
        const column = columns.find(col => 
            col.key?.toLowerCase() === fieldNameLower || 
            col.fieldName?.toLowerCase() === fieldNameLower ||
            col.name?.toLowerCase() === fieldNameLower ||
            (col.fieldName || col.key)?.toLowerCase() === fieldNameLower
        );
        
        const columnKey = column ? (column.fieldName || column.key) : fieldName;
        
        // Use the same data access pattern that works throughout the grid
        if (item && typeof item.getValue === 'function') {
            try {
                return item.getValue(columnKey);
            } catch (e) {
                return null;
            }
        } else {
            return item[columnKey];
        }
    }, [columns]);

    // Formula evaluation function
    const evaluateFormula = useCallback((expression: string, items: any[]): string => {
        if (!expression || items.length === 0) return '0';
        
        try {
            // Parse common formula patterns
            const upperExpression = expression.toUpperCase().trim();
            
            // Handle SUM(fieldName) - e.g., "SUM(amount)"
            const sumMatch = upperExpression.match(/^SUM\(([^)]+)\)$/);
            if (sumMatch) {
                const fieldName = sumMatch[1].trim();
                const sum = items.reduce((acc, item) => {
                    const fieldValue = getFieldValue(item, fieldName);
                    const value = parseFloat(fieldValue) || 0;
                    return acc + value;
                }, 0);
                return sum.toLocaleString();
            }
            
            // Handle COUNT() or COUNT(condition) - e.g., "COUNT()", "COUNT(status='Active')"
            const countMatch = upperExpression.match(/^COUNT\(([^)]*)\)$/);
            if (countMatch) {
                // Use original expression to preserve case for condition parsing
                const originalCountMatch = expression.match(/^COUNT\(([^)]*)\)$/i);
                const condition = originalCountMatch ? originalCountMatch[1].trim() : '';
                if (!condition) {
                    return items.length.toString();
                } else {
                    // Simple condition parsing like "status='Active'" - preserve original case
                    const condMatch = condition.match(/^([^=<>!]+)(=|!=|<|>|<=|>=)(.+)$/);
                    if (condMatch) {
                        let field = condMatch[1].trim();
                        const operator = condMatch[2];
                        const value = condMatch[3].replace(/['"]/g, '').trim();
                        
                        // Find the actual column name (case-insensitive match)
                        const fieldLower = field.toLowerCase();
                        const matchingColumn = columns.find(col => 
                            col.key?.toLowerCase() === fieldLower || 
                            col.fieldName?.toLowerCase() === fieldLower ||
                            col.name?.toLowerCase() === fieldLower
                        );
                        
                        // Use the actual column field name if found
                        if (matchingColumn) {
                            field = matchingColumn.fieldName || matchingColumn.key;
                        }
                        
                        const count = items.filter(item => {
                            const itemValue = getFieldValue(item, field);
                            const itemValueStr = itemValue?.toString() || '';
                            
                            switch (operator) {
                                case '=': return itemValueStr === value;
                                case '!=': return itemValueStr !== value;
                                case '<': return parseFloat(itemValueStr) < parseFloat(value);
                                case '>': return parseFloat(itemValueStr) > parseFloat(value);
                                case '<=': return parseFloat(itemValueStr) <= parseFloat(value);
                                case '>=': return parseFloat(itemValueStr) >= parseFloat(value);
                                default: return false;
                            }
                        }).length;
                        return count.toString();
                    }
                }
            }
            
            // Handle AVG(fieldName) - e.g., "AVG(score)"
            const avgMatch = upperExpression.match(/^AVG\(([^)]+)\)$/);
            if (avgMatch) {
                const fieldName = avgMatch[1].trim();
                const values = items.map(item => {
                    const fieldValue = getFieldValue(item, fieldName);
                    return parseFloat(fieldValue) || 0;
                }).filter(v => !isNaN(v));
                if (values.length === 0) return '0';
                const average = values.reduce((acc, val) => acc + val, 0) / values.length;
                return average.toFixed(2);
            }
            
            // Handle MIN(fieldName) and MAX(fieldName)
            const minMatch = upperExpression.match(/^MIN\(([^)]+)\)$/);
            if (minMatch) {
                const fieldName = minMatch[1].trim();
                const values = items.map(item => {
                    const fieldValue = getFieldValue(item, fieldName);
                    return parseFloat(fieldValue) || 0;
                }).filter(v => !isNaN(v));
                return values.length > 0 ? Math.min(...values).toString() : '0';
            }
            
            const maxMatch = upperExpression.match(/^MAX\(([^)]+)\)$/);
            if (maxMatch) {
                const fieldName = maxMatch[1].trim();
                const values = items.map(item => {
                    const fieldValue = getFieldValue(item, fieldName);
                    return parseFloat(fieldValue) || 0;
                }).filter(v => !isNaN(v));
                return values.length > 0 ? Math.max(...values).toString() : '0';
            }
            
            return '0';
        } catch (error) {
            return 'Error';
        }
    }, [getFieldValue, getColumnDataType]); // Include helper functions in dependency array

    // Calculate formula result if formula field is enabled - memoized to prevent endless re-evaluation
    const formulaResult = React.useMemo(() => {
        if (!showFormulaField || !formulaFieldExpression) {
            return '';
        }
        
        try {
            const result = evaluateFormula(formulaFieldExpression, filteredItems);
            return result;
        } catch (error) {
            return '0';
        }
    }, [showFormulaField, formulaFieldExpression, filteredItems, evaluateFormula]);

    // Performance metrics display - shows filtered item count
    const performanceDisplay = (
        <div className="performance-metrics" data-theme={theme}>
            <span>{totalItemsText} {filteredItems.length}</span>
        </div>
    );

    // Change tracking display with inline buttons
    const changeTrackingDisplay = enableChangeTracking && pendingChangesCount > 0 ? (
        <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
            <DefaultButton 
                text={`Save Changes (${pendingChangesCount})`}
                onClick={handleCommitChanges}
                primary
                styles={{
                    root: { minHeight: 28, fontSize: 13 },
                    label: { fontWeight: 600 }
                }}
            />
            <DefaultButton 
                text="Cancel Changes"
                onClick={handleCancelChanges}
                styles={{
                    root: { minHeight: 28, fontSize: 13 }
                }}
            />
        </Stack>
    ) : null;

    // Dynamic CSS variables for row styling
    const rowStyleVars = React.useMemo(() => {
        const vars: Record<string, string> = {};
        if (alternateRowColor) {
            vars['--alternate-row-color'] = alternateRowColor;
        }
        return vars;
    }, [alternateRowColor]);

    // Dynamic class name for alternating rows and control bar visibility
    const gridClassName = React.useMemo(() => {
        const classes = [`ultimate-enterprise-grid`, className];
        if (alternateRowColor) {
            classes.push('alternating-rows');
        }
        if (!showControlBar) {
            classes.push('no-control-bar');
        }
        return classes.join(' ');
    }, [className, alternateRowColor, showControlBar]);

    return (
        <div 
            className={gridClassName} 
            data-theme={theme}
            style={{
                ...rowStyleVars,
                width: (typeof width === 'number' && width > 0) ? `${width}px` : (typeof width === 'string' ? width : '100%'),
                height: (typeof height === 'number' && height > 0) ? `${height}px` : (typeof height === 'string' ? height : '400px'),
                maxWidth: (typeof width === 'number' && width > 0) ? `${width}px` : (typeof width === 'string' ? width : '100%'),
                maxHeight: (typeof height === 'number' && height > 0) ? `${height}px` : (typeof height === 'string' ? height : '400px'),
                overflow: 'hidden',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                margin: 0,
                padding: 0
            }}
        >
            {/* Control Bar - Conditionally rendered */}
            {showControlBar && (
                <Stack horizontal tokens={{ childrenGap: 8, padding: 0 }} className="control-bar" verticalAlign="center" wrap>
                    {enableFiltering && (
                        <TextField
                            placeholder={filterRecordsText}
                            value={globalFilter}
                            onChange={(_, value) => setGlobalFilter(value || '')}
                            styles={{
                                root: { width: filterRecordsWidth, minWidth: 'unset', maxWidth: 'unset' },
                                field: { fontSize: 12 }
                            }}
                        />
                    )}
                    
                    {enableJumpTo && jumpToColumn && (
                        <TextField
                            placeholder={`Jump to ${jumpToColumnDisplayName || jumpToColumn}`}
                            value={jumpToSearchValue}
                            onChange={handleJumpToSearch}
                            onKeyPress={handleJumpToKeyPress}
                            styles={{
                                root: { width: jumpToWidth, minWidth: 'unset', maxWidth: 'unset' },
                                field: { fontSize: 12 }
                            }}
                            iconProps={{ iconName: 'Search' }}
                        />
                    )}
                    
                    {enableExport && (
                        <div ref={exportButtonRef}>
                            <IconButton
                                iconProps={{ iconName: 'Download' }}
                                title="Export Data"
                                ariaLabel="Export Data"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                styles={{
                                    root: {
                                        width: 16,
                                        height: 32,
                                        backgroundColor: showExportMenu ? '#f3f2f1' : 'transparent'
                                    }
                                }}
                            />
                            {showExportMenu && (
                                <ContextualMenu
                                    items={exportMenuItems}
                                    target={exportButtonRef.current}
                                    onDismiss={() => setShowExportMenu(false)}
                                    directionalHint={6} // DirectionalHint.bottomLeftEdge
                                />
                            )}
                        </div>
                    )}
                    
                    {enableAddNewRow && (
                        <DefaultButton 
                            text={addNewRowText} 
                            onClick={handleShowAddRowDialog}
                            primary
                            styles={{
                                root: { minHeight: 32, fontSize: 13 },
                                label: { fontWeight: 600 }
                            }}
                        />
                    )}
                    
                    {/* Combined status display */}
                    <Stack horizontal tokens={{ childrenGap: 12 }}>
                        {performanceDisplay}
                        {showFormulaField && formulaFieldExpression && (
                            <div className="formula-field-display" data-theme={theme}>
                                <span>{formulaFieldText} {formulaResult}</span>
                            </div>
                        )}
                        {changeTrackingDisplay}
                    </Stack>
                </Stack>
            )}

            {/* Main Grid - ALWAYS VIRTUALIZED for META/Google Competition */}
            <div 
                className="grid-container"
                style={{
                    width: '100%',
                    flex: 1, // Take remaining height
                    minHeight: 0, // Allow flex shrinking
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    margin: 0,
                    padding: 0
                }}
            >
                <VirtualizedEditableGrid
                    ref={gridRef}
                    items={filteredItems}
                    columns={columns}
                    height="100%" // Let the grid flex with its container
                    width={(typeof width === 'number' && width > 0) ? width : '100%'}
                    enableInlineEditing={enableInlineEditing}
                    enableDragFill={!enableSelectionMode}
                    useEnhancedEditors={useEnhancedEditors}
                    columnEditorMapping={columnEditorMapping}
                    getAvailableValues={getAvailableValues}
                    
                    // Column filter props
                    onColumnFilter={handleColumnFilterChange}
                    
                    // Selection mode props
                    enableSelectionMode={enableSelectionMode}
                    selectionType={selectionType}
                    selectedItems={selectedItems}
                    selectAllState={selectAllState}
                    onItemSelection={onItemSelection}
                    onSelectAll={onSelectAll}
                    onClearAllSelections={onClearAllSelections}
                    onCellEdit={(itemId: string, columnKey: string, newValue: any) => {
                        const item = filteredItems.find(i => (i.key || i.id) === itemId);
                        const column = columns.find(c => (c.fieldName || c.key) === columnKey);
                        if (item && column) {
                            handleCellEdit(item, column, newValue);
                        }
                    }}
                    onCancelChanges={onCancelChanges}
                    onDeleteNewRow={onDeleteNewRow}
                    getColumnDataType={getColumnDataType}
                    changeManager={changeManager}
                    enablePerformanceMonitoring={enablePerformanceMonitoring}
                    rowHeight={42}
                    overscan={10}
                    enableMemoryPooling={true}
                    enablePrefetching={true}
                    
                    // Text sizing props
                    headerTextSize={headerTextSize}
                    columnTextSize={columnTextSize}
                    
                    // Header text wrapping
                    enableHeaderTextWrapping={enableHeaderTextWrapping}
                    
                    // Row styling props
                    alternateRowColor={alternateRowColor}
                    

                />
            </div>
            
            {/* Add New Row Dialog */}
            <Dialog
                hidden={!showAddRowDialog}
                onDismiss={handleCloseAddRowDialog}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Add New Rows',
                    subText: 'How many blank rows would you like to add?'
                }}
                modalProps={{
                    isBlocking: false,
                    styles: { main: { maxWidth: 450 } }
                }}
            >
                <Stack tokens={{ childrenGap: 16 }}>
                    <TextField
                        label="Number of rows"
                        type="number"
                        value={newRowCount}
                        onChange={handleRowCountChange}
                        min={1}
                        max={1000}
                        placeholder="Enter number (1-1000)"
                        styles={{
                            root: { width: '100%' }
                        }}
                    />
                </Stack>
                <DialogFooter>
                    <PrimaryButton 
                        onClick={handleAddNewRows} 
                        text="Add Rows"
                        disabled={!newRowCount || parseInt(newRowCount, 10) < 1 || parseInt(newRowCount, 10) > 1000}
                    />
                    <DefaultButton 
                        onClick={handleCloseAddRowDialog} 
                        text="Cancel" 
                    />
                </DialogFooter>
            </Dialog>
        </div>
    );
};

export default UltimateEnterpriseGrid;
