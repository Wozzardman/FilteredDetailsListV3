import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { IColumn, SelectionMode, DetailsListLayoutMode, ConstrainMode } from '@fluentui/react';
import { TextField } from '@fluentui/react/lib/TextField';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Stack } from '@fluentui/react/lib/Stack';
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
    enablePerformanceMonitoring?: boolean;
    enableChangeTracking?: boolean;
    useEnhancedEditors?: boolean;
    columnEditorMapping?: ColumnEditorMapping;
    onItemsChanged?: (items: any[]) => void;
    onCellEdit?: (item: any, column: IUltimateEnterpriseGridColumn, newValue: any) => void;
    onCommitChanges?: () => void;
    onCancelChanges?: () => void;
    onExport?: (format: 'CSV' | 'Excel' | 'PDF' | 'JSON', data: any[]) => void;
    getColumnDataType?: (columnKey: string) => 'text' | 'number' | 'date' | 'boolean' | 'choice';
    selectionMode?: SelectionMode;
    
    // Selection mode properties
    enableSelectionMode?: boolean;
    selectedItems?: Set<string>;
    selectAllState?: 'none' | 'some' | 'all';
    
    // Text size configuration
    headerTextSize?: number;
    columnTextSize?: number;
    
    // Row styling configuration
    alternateRowColor?: string;
    onItemSelection?: (itemId: string) => void;
    onSelectAll?: () => void;
    onClearAllSelections?: () => void;
    
    // Excel Clipboard properties
    enableExcelClipboard?: boolean;
    onClipboardOperation?: (operation: 'copy' | 'paste', data?: any) => void;
    
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
    enablePerformanceMonitoring = true,
    enableChangeTracking = true,
    useEnhancedEditors = false,
    columnEditorMapping = {},
    onItemsChanged,
    onCellEdit,
    onCommitChanges,
    onCancelChanges,
    onExport,
    getColumnDataType,
    selectionMode = SelectionMode.multiple,
    
    // Selection mode props
    enableSelectionMode = false,
    selectedItems = new Set(),
    selectAllState = 'none',
    onItemSelection,
    onSelectAll,
    onClearAllSelections,
    
    // Excel Clipboard props
    enableExcelClipboard = false,
    onClipboardOperation,
    
    className = '',
    theme = 'light',
    locale = 'en-US',
    
    // Text sizing props with defaults
    headerTextSize = 14, // Default 14px for headers
    columnTextSize = 13, // Default 13px for column data
    
    // Row styling props
    alternateRowColor
}) => {
    // Ref for grid imperative methods
    const gridRef = React.useRef<VirtualizedEditableGridRef>(null);
    
    // State management
    const [filteredItems, setFilteredItems] = useState<any[]>(items);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [pendingChangesCount, setPendingChangesCount] = useState<number>(0);
    const [changeManager] = useState(() => new EnterpriseChangeManager());
    const [exportService] = useState(() => DataExportService.getInstance());
    
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
        
        setFilteredItems(result);
    }, [items, globalFilter, columns]);

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
            
            // Count occurrences of each value (preserve original data type)
            if (value !== null && value !== undefined) {
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
                displayValue = value?.toString() || '(Blank)';
            }
            
            return {
                value,
                displayValue,
                count
            };
        });
        
        // Sort by display value
        result.sort((a, b) => (a.displayValue || '').localeCompare(b.displayValue || ''));
        
        return result;
    }, [items, columns, getColumnDataType]);

    // Handle export functionality
    const handleExport = useCallback(async (format: 'CSV' | 'Excel' | 'PDF' | 'JSON') => {
        try {
            console.log(`🚀 Starting ${format} export of ${filteredItems.length} items...`);
            
            // Create export options with metadata
            const exportOptions: IExportOptions = {
                format,
                includeFilters: true,
                includeHeaders: true,
                customColumns: columns.map(col => col.fieldName || col.key),
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
            
            console.log(`✅ ${format} export completed successfully!`);
            
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

    // Determine if virtualization should be used
    const shouldUseVirtualization = enableVirtualization && 
        (filteredItems.length >= virtualizationThreshold || shouldVirtualize);

    // Performance metrics display - simplified to show only total items
    const performanceDisplay = (
        <div className="performance-metrics" data-theme={theme}>
            <span>Total Items: {filteredItems.length}</span>
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

    // Dynamic class name for alternating rows
    const gridClassName = React.useMemo(() => {
        const classes = [`ultimate-enterprise-grid`, className];
        if (alternateRowColor) {
            classes.push('alternating-rows');
        }
        return classes.join(' ');
    }, [className, alternateRowColor]);

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
                flexDirection: 'column'
            }}
        >
            {/* Control Bar */}
            <Stack horizontal tokens={{ childrenGap: 16 }} className="control-bar" verticalAlign="center">
                {enableFiltering && (
                    <TextField
                        placeholder="Filter records..."
                        value={globalFilter}
                        onChange={(_, value) => setGlobalFilter(value || '')}
                        styles={{
                            root: { minWidth: 200 },
                            field: { fontSize: 14 }
                        }}
                    />
                )}
                
                {enableExport && (
                    <Stack horizontal tokens={{ childrenGap: 8 }}>
                        <DefaultButton 
                            text="Export CSV" 
                            onClick={() => handleExport('CSV')}
                        />
                        <DefaultButton 
                            text="Export Excel" 
                            onClick={() => handleExport('Excel')}
                        />
                        <DefaultButton 
                            text="Export JSON" 
                            onClick={() => handleExport('JSON')}
                        />
                    </Stack>
                )}
                
                {/* Combined status display */}
                <Stack horizontal tokens={{ childrenGap: 12 }}>
                    {performanceDisplay}
                    {changeTrackingDisplay}
                </Stack>
            </Stack>

            {/* Main Grid - ALWAYS VIRTUALIZED for META/Google Competition */}
            <div 
                className="grid-container"
                style={{
                    width: '100%',
                    flex: 1, // Take remaining height
                    minHeight: 0, // Allow flex shrinking
                    overflow: 'hidden',
                    boxSizing: 'border-box'
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
                    
                    // Selection mode props
                    enableSelectionMode={enableSelectionMode}
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
                    
                    // Row styling props
                    alternateRowColor={alternateRowColor}
                    
                    // Excel Clipboard props
                    enableExcelClipboard={enableExcelClipboard}
                    onClipboardOperation={onClipboardOperation}
                />
            </div>
        </div>
    );
};

export default UltimateEnterpriseGrid;
