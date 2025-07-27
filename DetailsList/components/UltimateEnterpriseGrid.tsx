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
import { VirtualizedEditableGrid } from './VirtualizedEditableGrid';

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
    onItemsChanged?: (items: any[]) => void;
    onCellEdit?: (item: any, column: IUltimateEnterpriseGridColumn, newValue: any) => void;
    onExport?: (format: 'CSV' | 'Excel' | 'PDF' | 'JSON', data: any[]) => void;
    getColumnDataType?: (columnKey: string) => 'text' | 'number' | 'date' | 'boolean' | 'choice';
    selectionMode?: SelectionMode;
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
    onItemsChanged,
    onCellEdit,
    onExport,
    getColumnDataType,
    selectionMode = SelectionMode.multiple,
    className = '',
    theme = 'light',
    locale = 'en-US'
}) => {
    // State management
    const [filteredItems, setFilteredItems] = useState<any[]>(items);
    const [globalFilter, setGlobalFilter] = useState<string>('');
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
            }
        }
    }, [enableInlineEditing, enableChangeTracking, onCellEdit, changeManager]);

    // Get available values for column filters using proper PCF data access pattern
    const getAvailableValues = useCallback((columnKey: string) => {
        const uniqueValues = new Set<string>();
        
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
            
            // Add non-null, non-undefined values to the set
            if (value !== null && value !== undefined && value !== '') {
                const stringValue = value.toString().trim();
                if (stringValue.length > 0) {
                    uniqueValues.add(stringValue);
                }
            }
        });
        
        // Convert to sorted array
        return Array.from(uniqueValues).sort();
    }, [items]);

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
            } catch (error) {
                console.error('Error committing changes:', error);
            }
        }
    }, [changeManager]);

    // Cancel all pending changes
    const handleCancelChanges = useCallback(() => {
        if (changeManager) {
            changeManager.cancelAllChanges();
        }
    }, [changeManager]);

    // Determine if virtualization should be used
    const shouldUseVirtualization = enableVirtualization && 
        (filteredItems.length >= virtualizationThreshold || shouldVirtualize);

    // Performance metrics display
    const performanceDisplay = enablePerformanceMonitoring && performanceMetrics ? (
        <div className="performance-metrics" data-theme={theme}>
            <span>{filteredItems.length} items</span>
            <span>{performanceMetrics.renderTime}ms</span>
            <span>{performanceMetrics.memoryUsage}MB</span>
            <span>{isOptimized ? 'Optimized' : 'Loading'}</span>
        </div>
    ) : null;

    // Change tracking display (status only - no duplicate buttons)
    const pendingChangesCount = changeManager?.getPendingChanges().length || 0;
    const changeTrackingDisplay = enableChangeTracking && pendingChangesCount > 0 ? (
        <div className="change-tracking" data-theme={theme}>
            <span>{pendingChangesCount} pending changes</span>
        </div>
    ) : null;

    return (
        <div 
            className={`ultimate-enterprise-grid ${className}`} 
            data-theme={theme}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
                maxWidth: typeof width === 'number' ? `${width}px` : width,
                maxHeight: typeof height === 'number' ? `${height}px` : height,
                overflow: 'hidden',
                boxSizing: 'border-box'
            }}
        >
            {/* Control Bar */}
            <Stack horizontal tokens={{ childrenGap: 16 }} className="control-bar">
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
                            text="Export PDF" 
                            onClick={() => handleExport('PDF')}
                        />
                        <DefaultButton 
                            text="Export JSON" 
                            onClick={() => handleExport('JSON')}
                        />
                    </Stack>
                )}
                
                {performanceDisplay}
            </Stack>

            {/* Change Tracking Controls */}
            {changeTrackingDisplay}

            {/* Main Grid - ALWAYS VIRTUALIZED for META/Google Competition */}
            <div 
                className="grid-container"
                style={{
                    width: '100%',
                    height: typeof height === 'number' ? `${height - 120}px` : 'calc(100% - 120px)',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                }}
            >
                <VirtualizedEditableGrid
                    items={filteredItems}
                    columns={columns}
                    height={typeof height === 'number' ? height - 120 : 400}
                    width={typeof width === 'number' ? width : '100%'}
                    enableInlineEditing={enableInlineEditing}
                    enableDragFill={true}
                    getAvailableValues={getAvailableValues}
                    onCellEdit={(itemId: string, columnKey: string, newValue: any) => {
                        const item = filteredItems.find(i => (i.key || i.id) === itemId);
                        const column = columns.find(c => (c.fieldName || c.key) === columnKey);
                        if (item && column) {
                            handleCellEdit(item, column, newValue);
                        }
                    }}
                    getColumnDataType={getColumnDataType}
                    changeManager={changeManager}
                    enablePerformanceMonitoring={enablePerformanceMonitoring}
                    rowHeight={42}
                    overscan={10}
                    enableMemoryPooling={true}
                    enablePrefetching={true}
                />
            </div>
        </div>
    );
};

export default UltimateEnterpriseGrid;
