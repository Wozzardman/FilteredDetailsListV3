/**
 * VirtualizedEditableGrid - ULTIMATE PURE VIRTUALIZATION
 * Always-on virtualization for META/Google competitive performance
 * Handles millions of records with sub-60fps rendering and real-time editing
 * ZERO FALLBACKS - PURE PERFORMANCE
 */

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { IColumn } from '@fluentui/react/lib/DetailsList';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { InlineEditor } from './InlineEditor';
import { EnhancedInlineEditor } from './EnhancedInlineEditor';
import { EnterpriseChangeManager } from '../services/EnterpriseChangeManager';
import { performanceMonitor } from '../performance/PerformanceMonitor';
import { VirtualizedFilterDropdown, FilterValue } from './VirtualizedFilterDropdown';
import { ExcelLikeColumnFilter } from './ExcelLikeColumnFilter';
import { ColumnEditorMapping } from '../types/ColumnEditor.types';
import { IGridColumn } from '../Component.types';
import { IFilterState, FilterOperators, FilterTypes } from '../Filter.types';
import { HeaderSelectionCheckbox, RowSelectionCheckbox } from './SelectionCheckbox';
import '../css/VirtualizedEditableGrid.css';

// Helper functions for PCF EntityRecord compatibility
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

const setPCFValue = (item: any, columnKey: string, value: any): void => {
    // For PCF EntityRecords, we can't directly set values - this would be handled by the parent component
    // For now, we'll use the property access fallback
    if (item && typeof item.setValue === 'function') {
        try {
            item.setValue(columnKey, value);
        } catch (e) {
            // Fallback to property access
            item[columnKey] = value;
        }
    } else {
        item[columnKey] = value;
    }
};

// Helper function to format cell values based on data type
const formatCellValue = (value: any, dataType?: string, getColumnDataType?: (columnKey: string) => 'text' | 'number' | 'date' | 'boolean' | 'choice', columnKey?: string): string => {
    if (value === null || value === undefined) {
        return '';
    }

    // Determine if this is a date column
    const isDateColumn = dataType === 'date' || 
                        (getColumnDataType && columnKey && ['date'].includes(getColumnDataType(columnKey)));

    // Format dates properly
    if (isDateColumn) {
        if (value instanceof Date) {
            // Format as MM/DD/YYYY for better readability
            return value.toLocaleDateString();
        } else if (typeof value === 'string') {
            // Try to parse string as date
            const parsedDate = new Date(value);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toLocaleDateString();
            }
        }
    }

    // For non-date values, use string conversion
    return String(value);
};

export interface VirtualizedEditableGridProps {
    items: any[];
    columns: IGridColumn[];
    height: number | string;
    width?: number | string;
    onCellEdit?: (itemId: string, columnKey: string, newValue: any) => void;
    onCommitChanges?: (changes: any[]) => Promise<void>;
    onCancelChanges?: () => void;
    enableInlineEditing?: boolean;
    enableDragFill?: boolean;
    enableColumnFilters?: boolean;
    enableCascadingFilters?: boolean;
    readOnlyColumns?: string[];
    getAvailableValues?: (columnKey: string) => Array<{value: any, displayValue: string, count: number}> | string[];
    getColumnDataType?: (columnKey: string) => 'text' | 'number' | 'date' | 'boolean' | 'choice';
    changeManager?: EnterpriseChangeManager;
    rowHeight?: number;
    overscan?: number;
    enableMemoryPooling?: boolean;
    enablePrefetching?: boolean;
    enablePerformanceMonitoring?: boolean;
    onItemClick?: (item: any, index: number) => void;
    onItemDoubleClick?: (item: any, index: number) => void;
    enableExcelFiltering?: boolean;
    onColumnFilter?: (columnKey: string, filterValues: any[]) => void;
    currentFilters?: Map<string, any[]>;
    // Enhanced Editor Configuration
    columnEditorMapping?: ColumnEditorMapping;
    useEnhancedEditors?: boolean;
    
    // Excel Clipboard properties
    enableExcelClipboard?: boolean;
    clipboardService?: any; // ExcelClipboardService instance
    onClipboardOperation?: (operation: 'copy' | 'paste', data?: any) => void;
    
    // Selection mode props
    enableSelectionMode?: boolean;
    selectedItems?: Set<string>;
    selectAllState?: 'none' | 'some' | 'all';
    onItemSelection?: (itemId: string) => void;
    onSelectAll?: () => void;
    onClearAllSelections?: () => void;
    
    // Text sizing properties
    headerTextSize?: number; // Font size for column headers in px
    columnTextSize?: number; // Font size for column data in px
    
    // Row styling properties
    alternateRowColor?: string; // Color for alternating rows
}

export interface VirtualizedEditableGridRef {
    commitAllChanges: () => Promise<void>;
    cancelAllChanges: () => void;
    getPendingChangesCount: () => number;
}

interface EditingState {
    itemIndex: number;
    columnKey: string;
    originalValue: any;
}

export const VirtualizedEditableGrid = React.forwardRef<VirtualizedEditableGridRef, VirtualizedEditableGridProps>(({
    items = [],
    columns = [],
    height,
    width = '100%',
    onCellEdit,
    onCommitChanges,
    onCancelChanges,
    enableInlineEditing = true,
    enableDragFill = false,
    enableColumnFilters = true,
    enableCascadingFilters = true,
    readOnlyColumns = [],
    getAvailableValues,
    getColumnDataType,
    changeManager,
    rowHeight = 42,
    overscan = 10,
    enableMemoryPooling = true,
    enablePrefetching = true,
    enablePerformanceMonitoring = false,
    onItemClick,
    onItemDoubleClick,
    enableExcelFiltering = true,
    onColumnFilter,
    currentFilters = new Map(),
    columnEditorMapping = {},
    useEnhancedEditors = true,
    
    // Selection mode props
    enableSelectionMode = false,
    selectedItems = new Set(),
    selectAllState = 'none',
    onItemSelection,
    onSelectAll,
    onClearAllSelections,
    
    // Text sizing props with defaults
    headerTextSize = 14, // Default 14px for headers
    columnTextSize = 13, // Default 13px for column data
    
    // Row styling props
    alternateRowColor,
    
    // Excel Clipboard props
    enableExcelClipboard = false,
    clipboardService,
    onClipboardOperation
}, ref) => {
    // Refs for scrolling synchronization - DECLARE FIRST BEFORE ALL OTHER LOGIC
    const parentRef = React.useRef<HTMLDivElement>(null);
    const headerRef = React.useRef<HTMLDivElement>(null);

    const [editingState, setEditingState] = React.useState<EditingState | null>(null);
    const [pendingChanges, setPendingChanges] = React.useState<Map<string, any>>(new Map());
    const [isCommitting, setIsCommitting] = React.useState<boolean>(false);
    const [errorMessage, setErrorMessage] = React.useState<string>('');
    const [dragFillState, setDragFillState] = React.useState<any>(null);
    
    // Force refresh trigger for grid re-rendering
    const [refreshTrigger, setRefreshTrigger] = React.useState<number>(0);

    // Excel-like column filtering state
    const [columnFilters, setColumnFilters] = React.useState<IFilterState>({});
    const [activeFilterColumn, setActiveFilterColumn] = React.useState<string | null>(null);
    const [filterTargets, setFilterTargets] = React.useState<Record<string, HTMLElement | null>>({});
    const [originalItems] = React.useState<any[]>(items);

    // Column resizing state
    const [columnWidthOverrides, setColumnWidthOverrides] = React.useState<Record<string, number>>({});
    const [isResizing, setIsResizing] = React.useState<string | null>(null);
    const [resizeStartX, setResizeStartX] = React.useState<number>(0);
    const [resizeStartWidth, setResizeStartWidth] = React.useState<number>(0);

    // Calculate filtered items based on column filters
    const filteredItems = React.useMemo(() => {
        if (Object.keys(columnFilters).length === 0) return items;

        return items.filter(item => {
            return Object.entries(columnFilters).every(([columnKey, filter]) => {
                if (!filter || !filter.isActive) return true;
                
                const fieldValue = getPCFValue(item, columnKey);
                
                // Evaluate all conditions in the filter
                if (filter.logicalOperator === 'OR') {
                    return filter.conditions.some(condition => evaluateCondition(fieldValue, condition));
                } else {
                    return filter.conditions.every(condition => evaluateCondition(fieldValue, condition));
                }
            });
        });
    }, [items, columnFilters]);

    // Helper function to evaluate a single filter condition
    const evaluateCondition = (fieldValue: any, condition: any): boolean => {
        const { operator, value } = condition;
        
        switch (operator) {
            case FilterOperators.IsEmpty:
                return fieldValue == null || fieldValue === '' || fieldValue === undefined;
            case FilterOperators.IsNotEmpty:
                return fieldValue != null && fieldValue !== '' && fieldValue !== undefined;
            case FilterOperators.In:
                if (fieldValue == null || fieldValue === '' || fieldValue === undefined) return false;
                
                // Normalize the field value for comparison
                let normalizedField = fieldValue;
                if (fieldValue instanceof Date) {
                    normalizedField = fieldValue.toDateString();
                } else if (typeof fieldValue === 'string' && !isNaN(Date.parse(fieldValue))) {
                    const dateValue = new Date(fieldValue);
                    if (!isNaN(dateValue.getTime())) {
                        normalizedField = dateValue.toDateString();
                    }
                }
                
                return (value as any[]).some(filterValue => {
                    let normalizedFilter = filterValue;
                    if (filterValue instanceof Date) {
                        normalizedFilter = filterValue.toDateString();
                    }
                    return normalizedField === normalizedFilter || String(normalizedField) === String(normalizedFilter);
                });
            default:
                return true;
        }
    };

    // Filter handlers
    const handleColumnFilterChange = React.useCallback((columnKey: string, selectedValues: any[]) => {
        // Convert simple value array to proper IFilterState format
        if (selectedValues.length === 0) {
            // Remove filter if no values selected
            setColumnFilters(prev => {
                const newFilters = { ...prev };
                delete newFilters[columnKey];
                return newFilters;
            });
        } else {
            // Create proper filter condition
            const columnDisplayName = columns.find(c => c.key === columnKey)?.name || columnKey;
            const dataType = getColumnDataType?.(columnKey) || 'text';
            
            // Map data type to FilterTypes enum
            const filterType = dataType === 'text' ? FilterTypes.Text :
                              dataType === 'number' ? FilterTypes.Number :
                              dataType === 'date' ? FilterTypes.Date :
                              dataType === 'boolean' ? FilterTypes.Boolean :
                              dataType === 'choice' ? FilterTypes.Choice :
                              FilterTypes.Text;
            
            // Check if filtering for blanks
            const isBlankFilter = selectedValues.includes('(Blanks)');
            const nonBlankValues = selectedValues.filter(v => v !== '(Blanks)');
            
            const conditions: any[] = [];
            
            // Add blank filter condition if selected
            if (isBlankFilter) {
                conditions.push({
                    field: columnKey,
                    operator: FilterOperators.IsEmpty,
                    value: null,
                    displayValue: '(Blanks)'
                });
            }
            
            // Add non-blank values condition if any
            if (nonBlankValues.length > 0) {
                // Normalize values based on data type for proper comparison
                const normalizedValues = nonBlankValues.map(v => {
                    if (dataType === 'date' && v instanceof Date) {
                        return v.toDateString(); // Convert Date objects to date strings
                    }
                    return v;
                });
                
                conditions.push({
                    field: columnKey,
                    operator: FilterOperators.In,
                    value: normalizedValues,
                    displayValue: `In (${normalizedValues.length} values)`
                });
            }
            
            setColumnFilters(prev => ({
                ...prev,
                [columnKey]: {
                    columnName: columnDisplayName,
                    filterType: filterType,
                    conditions: conditions,
                    isActive: true,
                    logicalOperator: 'OR' // Use OR when combining blank and non-blank filters
                }
            }));
        }
    }, [columns, getColumnDataType]);

    const handleFilterButtonClick = React.useCallback((columnKey: string, target: HTMLElement) => {
        setActiveFilterColumn(activeFilterColumn === columnKey ? null : columnKey);
        setFilterTargets(prev => ({
            ...prev,
            [columnKey]: target
        }));
    }, [activeFilterColumn]);

    // Column resizing handlers
    const handleResizeStart = React.useCallback((columnKey: string, startX: number, startWidth: number) => {
        setIsResizing(columnKey);
        setResizeStartX(startX);
        setResizeStartWidth(startWidth);
        document.body.classList.add('resizing-columns');
    }, []);

    const handleResizeMove = React.useCallback((event: MouseEvent) => {
        if (!isResizing) return;
        
        const deltaX = event.clientX - resizeStartX;
        const newWidth = Math.max(50, resizeStartWidth + deltaX); // Minimum 50px
        
        setColumnWidthOverrides(prev => ({
            ...prev,
            [isResizing]: newWidth
        }));
    }, [isResizing, resizeStartX, resizeStartWidth]);

    const handleResizeEnd = React.useCallback(() => {
        setIsResizing(null);
        setResizeStartX(0);
        setResizeStartWidth(0);
        document.body.classList.remove('resizing-columns');
    }, []);

    // Add global mouse event listeners for column resizing
    React.useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            return () => {
                document.removeEventListener('mousemove', handleResizeMove);
                document.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [isResizing, handleResizeMove, handleResizeEnd]);

    // Performance monitoring
    const endMeasurement = React.useMemo(() => 
        enablePerformanceMonitoring ? performanceMonitor.startMeasure('virtualized-editable-grid') : () => {}, 
        [enablePerformanceMonitoring]
    );

    React.useEffect(() => {
        return () => endMeasurement();
    }, [endMeasurement]);

    // Header horizontal scroll synchronization - TRANSFORM APPROACH
    React.useEffect(() => {
        const scrollContainer = parentRef.current;
        const headerContainer = headerRef.current;

        if (!scrollContainer || !headerContainer) return;

        let isScrolling = false;
        let lastScrollLeft = 0;
        let animationId: number | null = null;

        const syncHeaderScroll = () => {
            if (isScrolling) return; // Prevent recursive calls
            
            isScrolling = true;
            
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            
            animationId = requestAnimationFrame(() => {
                if (scrollContainer && headerContainer) {
                    const currentScrollLeft = scrollContainer.scrollLeft;
                    if (Math.abs(currentScrollLeft - lastScrollLeft) > 0.5) { // Only sync if there's meaningful change
                        // Use transform instead of scrollLeft for smoother sync
                        const headerContent = headerContainer.querySelector('.virtualized-header');
                        if (headerContent) {
                            (headerContent as HTMLElement).style.transform = `translateX(-${currentScrollLeft}px)`;
                        }
                        lastScrollLeft = currentScrollLeft;
                    }
                }
                isScrolling = false;
                animationId = null;
            });
        };

        // Add scroll event listener for horizontal sync
        scrollContainer.addEventListener('scroll', syncHeaderScroll, { passive: true });
        
        // Initial sync
        syncHeaderScroll();

        return () => {
            scrollContainer.removeEventListener('scroll', syncHeaderScroll);
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, []);

    // Virtual scrolling container ref
    // PURE VIRTUALIZATION - Always on, META/Google competitive performance
    const virtualizer = useVirtualizer({
        count: filteredItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: overscan,
        // Ultimate performance features for enterprise competition
        measureElement: enableMemoryPooling ? undefined : (element) => {
            return element?.getBoundingClientRect().height || rowHeight;
        },
        scrollToFn: (offset, canSmooth, instance) => {
            const duration = canSmooth && enablePrefetching ? 100 : 0;
            const scrollElement = instance.scrollElement;
            if (scrollElement) {
                scrollElement.scrollTo({ 
                    top: Math.max(0, offset), 
                    behavior: duration ? 'smooth' : 'auto' 
                });
            }
        },
    });

    // PERFORMANCE OPTIMIZATION: Memoize available values to prevent recalculation on scroll
    const memoizedAvailableValues = React.useMemo(() => {
        const cache = new Map<string, string[]>();
        return (columnKey: string) => {
            if (!cache.has(columnKey)) {
                const availableValuesData = getAvailableValues?.(columnKey) || [];
                let displayValues: string[];
                
                // Handle both formats: object array or string array
                if (availableValuesData.length > 0 && typeof availableValuesData[0] === 'object') {
                    displayValues = (availableValuesData as Array<{value: any, displayValue: string, count: number}>)
                        .map(item => item.displayValue);
                } else {
                    displayValues = availableValuesData as string[];
                }
                
                cache.set(columnKey, displayValues);
            }
            return cache.get(columnKey) || [];
        };
    }, [getAvailableValues]);

    // Create a wrapper for ExcelLikeColumnFilter that always returns the object format
    const getAvailableValuesForFilter = React.useCallback((columnKey: string) => {
        const availableValuesData = getAvailableValues?.(columnKey) || [];
        
        // Always return object format for ExcelLikeColumnFilter
        if (availableValuesData.length > 0 && typeof availableValuesData[0] === 'object') {
            return availableValuesData as Array<{value: any, displayValue: string, count: number}>;
        } else {
            // Convert string array to object format
            return (availableValuesData as string[]).map(value => ({
                value,
                displayValue: value,
                count: 1
            }));
        }
    }, [getAvailableValues]);

    // Create effective columns array including selection column if needed
    const effectiveColumns = React.useMemo(() => {
        if (enableSelectionMode) {
            return [
                {
                    key: '__selection__',
                    name: '',
                    fieldName: '__selection__',
                    minWidth: 40,
                    maxWidth: 40,
                    isResizable: false
                } as IGridColumn,
                ...columns
            ];
        }
        return columns;
    }, [columns, enableSelectionMode]);

    // PERFORMANCE OPTIMIZATION: Memoize column widths to prevent recalculation
    const memoizedColumnWidths = React.useMemo(() => {
        return effectiveColumns.map((col, index) => {
            const columnKey = col.key || col.fieldName || index.toString();
            
            // Selection column has fixed width
            if (columnKey === '__selection__') {
                return 40;
            }
            
            // Check if user has manually resized this column
            const overrideWidth = columnWidthOverrides[columnKey];
            if (overrideWidth) {
                return overrideWidth;
            }
            
            // Use the column's configured width as the default
            // Don't constrain to container width - allow horizontal scrolling
            if (col.minWidth && col.minWidth > 0) {
                return col.minWidth;
            }
            
            // Use default width for columns without specific width
            return 150; // Default column width
        });
    }, [effectiveColumns, columnWidthOverrides]);

    // Calculate total grid width for horizontal scrolling
    const totalGridWidth = React.useMemo(() => {
        return memoizedColumnWidths.reduce((sum, width) => sum + width, 0);
    }, [memoizedColumnWidths]);

    // Get cell key for change tracking
    const getCellKey = (itemIndex: number, columnKey: string) => `${itemIndex}-${columnKey}`;

    // Start inline editing
    const startEdit = React.useCallback((itemIndex: number, columnKey: string) => {
        if (!enableInlineEditing || readOnlyColumns.includes(columnKey)) return;

        const item = filteredItems[itemIndex];
        const originalValue = getPCFValue(item, columnKey);
        setEditingState({ itemIndex, columnKey, originalValue });
    }, [enableInlineEditing, readOnlyColumns, filteredItems]);

    // Commit cell edit
    const commitEdit = React.useCallback((newValue: any) => {
        if (!editingState) return;

        const { itemIndex, columnKey, originalValue } = editingState;
        const item = filteredItems[itemIndex];
        const itemId = item.key || item.id || item.getRecordId?.() || itemIndex.toString();

        if (newValue !== originalValue) {
            const changeKey = getCellKey(itemIndex, columnKey);
            const change = {
                itemId,
                itemIndex,
                columnKey,
                newValue,
                oldValue: originalValue
            };

            setPendingChanges(prev => new Map(prev.set(changeKey, change)));

            // Update item in memory for immediate UI feedback
            setPCFValue(item, columnKey, newValue);

            // Notify parent
            onCellEdit?.(itemId, columnKey, newValue);

            // Update change manager
            if (changeManager) {
                changeManager.addChange(itemId, columnKey, originalValue, newValue);
            }
        }

        setEditingState(null);
    }, [editingState, filteredItems, onCellEdit, changeManager]);

    // Cancel edit
    const cancelEdit = React.useCallback(() => {
        setEditingState(null);
    }, []);

    // Commit all changes
    const commitAllChanges = React.useCallback(async () => {
        if (pendingChanges.size === 0 || !onCommitChanges) return;

        setIsCommitting(true);
        setErrorMessage('');

        try {
            const changesArray = Array.from(pendingChanges.values());
            await onCommitChanges(changesArray);
            setPendingChanges(new Map());

            if (changeManager) {
                await changeManager.commitAllChanges();
            }
        } catch (error) {
            setErrorMessage(`Failed to save changes: ${error}`);
        } finally {
            setIsCommitting(false);
        }
    }, [pendingChanges, onCommitChanges, changeManager]);

    // Cancel all changes
    const cancelAllChanges = React.useCallback(() => {
        console.log('🚫 VirtualizedEditableGrid: Starting cancel operation');
        console.log('📊 Pending changes to revert:', pendingChanges.size);
        
        // Create a snapshot of changes to avoid modification during iteration
        const changesToRevert = Array.from(pendingChanges.entries());
        console.log('📸 Created snapshot of changes:', changesToRevert.length);
        
        // Revert items to original values
        changesToRevert.forEach(([changeKey, change]) => {
            console.log(`🔄 Reverting change ${changeKey}:`, {
                itemIndex: change.itemIndex,
                columnKey: change.columnKey,
                currentValue: change.newValue,
                revertingTo: change.oldValue
            });
            
            // Use filteredItems to match the same array used in drag fill
            const item = filteredItems[change.itemIndex];
            if (item) {
                const currentValue = getPCFValue(item, change.columnKey);
                console.log(`📋 Current item value before revert:`, currentValue);
                
                setPCFValue(item, change.columnKey, change.oldValue);
                
                const valueAfterRevert = getPCFValue(item, change.columnKey);
                console.log(`✅ Value after revert:`, valueAfterRevert);
            } else {
                console.warn(`⚠️ Item not found at index ${change.itemIndex} for change ${changeKey}`);
            }
        });

        console.log('🗑️ Clearing pending changes map');
        setPendingChanges(new Map());
        setEditingState(null);

        if (changeManager) {
            console.log('🔄 Calling changeManager.cancelAllChanges()');
            changeManager.cancelAllChanges();
        }
        
        // Force grid re-render to show reverted values
        console.log('🔄 Triggering grid refresh to show reverted values');
        setRefreshTrigger(prev => prev + 1);
        
        // Call the parent cancel handler if provided
        if (onCancelChanges) {
            console.log('📞 Calling parent onCancelChanges handler');
            onCancelChanges();
        }
        
        console.log('✅ VirtualizedEditableGrid: Cancel operation completed successfully');
        console.log('📊 Final pending changes count:', pendingChanges.size);
    }, [pendingChanges, filteredItems, changeManager, onCancelChanges, setRefreshTrigger]);

    // Expose methods through ref
    React.useImperativeHandle(ref, () => ({
        commitAllChanges,
        cancelAllChanges,
        getPendingChangesCount: () => pendingChanges.size
    }), [commitAllChanges, cancelAllChanges, pendingChanges.size]);

    // Render virtualized row
    const renderRowContent = React.useCallback((virtualRow: any) => {
        const { index } = virtualRow;
        const item = filteredItems[index];
        if (!item) return null;

        const isEven = index % 2 === 0;
        const rowClassName = `virtualized-row ${isEven ? 'even' : 'odd'}`;
        
        // Apply alternating row color if specified
        const rowStyle: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            minWidth: `${totalGridWidth}px`, // Ensure minimum width for horizontal scrolling
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e1dfdd',
        };
        
        // Apply alternating row background color for even rows
        if (alternateRowColor && isEven) {
            rowStyle.backgroundColor = alternateRowColor;
        }

        return (
            <div
                key={index}
                className={rowClassName}
                data-index={index}
                style={rowStyle}
                onClick={() => onItemClick?.(item, index)}
                onDoubleClick={() => onItemDoubleClick?.(item, index)}
            >
                {effectiveColumns.map((column, columnIndex) => {
                    const columnKey = column.fieldName || column.key;
                    
                    // Special handling for selection column
                    if (columnKey === '__selection__') {
                        const itemId = item.recordId || item.key || item.id || index.toString();
                        const isSelected = selectedItems.has(itemId);
                        
                        return (
                            <div
                                key="__selection__"
                                className="virtualized-cell selection-cell"
                                style={{
                                    width: memoizedColumnWidths[columnIndex], // Use the same width calculation as header
                                    minWidth: memoizedColumnWidths[columnIndex],
                                    maxWidth: memoizedColumnWidths[columnIndex],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 8px',
                                    boxSizing: 'border-box' // Ensure consistent box model
                                }}
                            >
                                <RowSelectionCheckbox
                                    itemId={itemId}
                                    selected={isSelected}
                                    onToggleSelection={(id) => onItemSelection?.(id)}
                                    rowIndex={index}
                                />
                            </div>
                        );
                    }
                    
                    const cellKey = getCellKey(index, columnKey);
                    const isEditing = editingState?.itemIndex === index && editingState?.columnKey === columnKey;
                    const hasChanges = pendingChanges.has(cellKey);
                    const isReadOnly = readOnlyColumns.includes(columnKey);

                    const cellValue = pendingChanges.get(cellKey)?.newValue ?? getPCFValue(item, columnKey);
                    const dataType = column.data?.dataType || 'string';
                    // PERFORMANCE OPTIMIZATION: Use cached available values to prevent recalculation on scroll
                    const availableValues = memoizedAvailableValues(columnKey);

                    const cellStyle: React.CSSProperties = {
                        width: memoizedColumnWidths[columnIndex],
                        minWidth: memoizedColumnWidths[columnIndex],
                        maxWidth: memoizedColumnWidths[columnIndex],
                        height: '100%',
                        padding: '0 8px',
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: isReadOnly ? 'default' : 'pointer',
                        backgroundColor: hasChanges ? '#fff4ce' : 'transparent',
                        borderLeft: hasChanges ? '3px solid #ffb900' : 'none',
                        position: 'relative',
                        boxSizing: 'border-box', // Ensure consistent box model
                        fontSize: `${columnTextSize}px` // Apply custom column text size
                    };

                    if (isEditing && enableInlineEditing) {
                        const editorConfig = columnEditorMapping[columnKey];
                        
                        return (
                            <div key={columnKey} style={cellStyle}>
                                {useEnhancedEditors && editorConfig ? (
                                    <EnhancedInlineEditor
                                        value={editingState.originalValue}
                                        column={column}
                                        item={item}
                                        editorConfig={editorConfig}
                                        onCommit={commitEdit}
                                        onCancel={cancelEdit}
                                        style={{ width: '100%', border: 'none', background: 'transparent' }}
                                    />
                                ) : (
                                    <InlineEditor
                                        value={editingState.originalValue}
                                        column={column}
                                        dataType={dataType}
                                        availableValues={availableValues}
                                        isReadOnly={isReadOnly}
                                        onCommit={commitEdit}
                                        onCancel={cancelEdit}
                                        style={{ width: '100%', border: 'none', background: 'transparent' }}
                                    />
                                )}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={columnKey}
                            className={`virtualized-cell ${isReadOnly ? 'read-only' : 'editable'}`}
                            style={cellStyle}
                            onClick={() => !isReadOnly && startEdit(index, columnKey)}
                            title={hasChanges ? `Changed from: ${pendingChanges.get(cellKey)?.oldValue}` : formatCellValue(cellValue, column.dataType, getColumnDataType, columnKey)}
                        >
                            {column.onRender ? 
                                column.onRender(item, index, column) : 
                                formatCellValue(cellValue, column.dataType, getColumnDataType, columnKey)
                            }
                            {!isReadOnly && enableDragFill && !enableSelectionMode && (
                                <div 
                                    className="drag-fill-handle"
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        width: 6,
                                        height: 6,
                                        backgroundColor: '#0078d4',
                                        border: '1px solid white',
                                        cursor: 'crosshair',
                                        opacity: 0,
                                        transition: 'opacity 0.15s ease'
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        // Implement basic drag fill functionality
                                        const startDragFill = (startIndex: number, columnKey: string, startValue: any) => {
                                            const dragFillChanges = new Map<string, any>();
                                            
                                            // Capture the original value of the starting cell for potential reversion
                                            const startItem = filteredItems[startIndex];
                                            const startCellKey = getCellKey(startIndex, columnKey);
                                            const existingStartChange = pendingChanges.get(startCellKey);
                                            const startOriginalValue = existingStartChange ? existingStartChange.oldValue : getPCFValue(startItem, columnKey);
                                            
                                            // Map to store original values of ALL cells we might touch during drag fill
                                            // This ensures we don't lose track of original values during the drag operation
                                            const originalValuesSnapshot = new Map<string, any>();
                                            
                                            // Pre-populate with existing pending changes to preserve their original values
                                            pendingChanges.forEach((change, changeKey) => {
                                                originalValuesSnapshot.set(changeKey, change.oldValue);
                                            });
                                            
                                            console.log(`🎯 Drag fill starting from cell ${startCellKey}:`, {
                                                startIndex,
                                                columnKey,
                                                startValue,
                                                startOriginalValue,
                                                hasExistingChange: !!existingStartChange,
                                                existingPendingChanges: pendingChanges.size
                                            });
                                            
                                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                                // Find the target cell based on mouse position
                                                const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                                                if (element && element.closest('.virtualized-row')) {
                                                    const rowElement = element.closest('.virtualized-row') as HTMLElement;
                                                    const targetIndex = parseInt(rowElement.dataset.index || '0');
                                                    
                                                    // Clear previous drag fill changes (but preserve original values)
                                                    dragFillChanges.forEach((_, changeKey) => {
                                                        const [indexStr] = changeKey.split('-');
                                                        const index = parseInt(indexStr);
                                                        // Don't remove the starting cell's original change
                                                        if (index !== startIndex) {
                                                            setPendingChanges(prev => {
                                                                const newMap = new Map(prev);
                                                                newMap.delete(changeKey);
                                                                return newMap;
                                                            });
                                                        }
                                                    });
                                                    dragFillChanges.clear();
                                                    
                                                    // Fill range with the start value
                                                    if (targetIndex !== startIndex) {
                                                        const minIndex = Math.min(startIndex, targetIndex);
                                                        const maxIndex = Math.max(startIndex, targetIndex);
                                                        
                                                        for (let i = minIndex; i <= maxIndex; i++) {
                                                            const targetItem = filteredItems[i];
                                                            if (targetItem) {
                                                                const itemId = targetItem.key || targetItem.id || targetItem.getRecordId?.() || i.toString();
                                                                const changeKey = getCellKey(i, columnKey);
                                                                
                                                                let originalValue: any;
                                                                
                                                                if (i === startIndex) {
                                                                    // For the starting cell, preserve its true original value
                                                                    originalValue = startOriginalValue;
                                                                } else {
                                                                    // For other cells, check our snapshot first, then existing changes, then current value
                                                                    if (originalValuesSnapshot.has(changeKey)) {
                                                                        // Use the original value from our snapshot
                                                                        originalValue = originalValuesSnapshot.get(changeKey);
                                                                    } else {
                                                                        // This is a new cell being touched - capture its current value as original
                                                                        const existingChange = pendingChanges.get(changeKey);
                                                                        originalValue = existingChange ? existingChange.oldValue : getPCFValue(targetItem, columnKey);
                                                                        // Store this original value for future reference
                                                                        originalValuesSnapshot.set(changeKey, originalValue);
                                                                    }
                                                                }
                                                                
                                                                console.log(`🖱️ Drag fill - Cell ${changeKey}:`, {
                                                                    itemIndex: i,
                                                                    columnKey,
                                                                    originalValue,
                                                                    newValue: startValue,
                                                                    isStartCell: i === startIndex,
                                                                    hadSnapshot: originalValuesSnapshot.has(changeKey)
                                                                });
                                                                
                                                                const change = {
                                                                    itemId,
                                                                    itemIndex: i,
                                                                    columnKey,
                                                                    newValue: startValue,
                                                                    oldValue: originalValue
                                                                };
                                                                
                                                                setPendingChanges(prev => new Map(prev.set(changeKey, change)));
                                                                setPCFValue(targetItem, columnKey, startValue);
                                                                dragFillChanges.set(changeKey, change);
                                                            }
                                                        }
                                                    }
                                                }
                                            };
                                            
                                            const handleMouseUp = () => {
                                                // When drag ends, call onCellEdit once for all the changes
                                                if (dragFillChanges.size > 0 && onCellEdit) {
                                                    // Call onCellEdit for all the drag filled changes
                                                    Array.from(dragFillChanges.values()).forEach(change => {
                                                        onCellEdit(change.itemId, change.columnKey, change.newValue);
                                                    });
                                                }
                                                
                                                document.removeEventListener('mousemove', handleMouseMove);
                                                document.removeEventListener('mouseup', handleMouseUp);
                                            };
                                            
                                            document.addEventListener('mousemove', handleMouseMove);
                                            document.addEventListener('mouseup', handleMouseUp);
                                        };
                                        
                                        startDragFill(index, columnKey, cellValue);
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }, [filteredItems, columns, memoizedColumnWidths, editingState, pendingChanges, readOnlyColumns, enableInlineEditing, enableDragFill, startEdit, commitEdit, cancelEdit, memoizedAvailableValues, onItemClick, onItemDoubleClick, refreshTrigger]);

    // PERFORMANCE OPTIMIZATION: Create stable render function to prevent unnecessary re-renders
    const renderRow = React.useCallback((virtualRow: any) => {
        return renderRowContent(virtualRow);
    }, [renderRowContent]);

    // Render header with Excel-like filter buttons and column resizing
    const renderHeader = () => (
        <div 
            className="virtualized-header"
            style={{
                display: 'flex',
                width: '100%',
                minWidth: `${totalGridWidth}px`, // Ensure header matches grid width for horizontal scrolling
                backgroundColor: '#faf9f8',
                borderBottom: '1px solid #e1dfdd',
                position: 'relative',
                top: 0,
                zIndex: 5,
                flexShrink: 0, // Prevent header from shrinking
                height: '48px'
            }}
        >
            {effectiveColumns.map((column, index) => {
                const columnKey = column.key || column.fieldName || index.toString();
                
                // Special handling for selection column
                if (columnKey === '__selection__') {
                    return (
                        <div
                            key="__selection__"
                            className="virtualized-header-cell selection-header"
                            style={{ 
                                width: memoizedColumnWidths[index], // Use the same width calculation as data cells
                                minWidth: memoizedColumnWidths[index],
                                maxWidth: memoizedColumnWidths[index],
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#faf9f8',
                                padding: '0 8px', // Match data cell padding exactly
                                boxSizing: 'border-box', // Ensure consistent box model
                                overflow: 'hidden'
                            }}
                        >
                            <HeaderSelectionCheckbox
                                selectAllState={selectAllState}
                                selectedCount={selectedItems.size}
                                totalCount={filteredItems.length}
                                onToggleSelectAll={() => {
                                    if (selectAllState === 'all') {
                                        onClearAllSelections?.();
                                    } else {
                                        onSelectAll?.();
                                    }
                                }}
                            />
                        </div>
                    );
                }
                
                const hasFilter = columnFilters[column.key]?.isActive && columnFilters[column.key]?.conditions?.length > 0;
                const dataType = getColumnDataType?.(column.key) || 'text';
                
                return (
                    <div
                        key={column.key}
                        className={`virtualized-header-cell ${isResizing === column.key ? 'resizing' : ''}`}
                        style={{ 
                            width: memoizedColumnWidths[index],
                            minWidth: memoizedColumnWidths[index],
                            maxWidth: memoizedColumnWidths[index],
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#faf9f8',
                            padding: '0 12px 0 8px', // More padding on right for filter icon, match data cell left padding
                            boxSizing: 'border-box', // Ensure consistent box model
                            overflow: 'hidden'
                        }}
                    >
                        <span 
                            className="virtualized-header-text"
                            style={{ 
                                flex: 1, 
                                fontWeight: 600,
                                fontSize: `${headerTextSize}px`, // Apply custom header text size
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {column.name}
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 15 }}>
                            {enableColumnFilters && (
                                <span
                                    className={`virtualized-header-filter-icon ${hasFilter ? 'active' : ''}`}
                                    title={`Filter ${column.name}`}
                                    onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                                        const target = e.currentTarget as HTMLElement;
                                        handleFilterButtonClick(columnKey, target);
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        color: hasFilter ? '#0078d4' : '#8a8886',
                                        userSelect: 'none',
                                        padding: '6px',
                                        borderRadius: '6px',
                                        backgroundColor: hasFilter ? 'rgba(0, 120, 212, 0.1)' : 'transparent',
                                        border: hasFilter ? '1px solid rgba(0, 120, 212, 0.3)' : '1px solid transparent',
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                        lineHeight: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        position: 'relative',
                                        zIndex: 20,
                                        boxShadow: hasFilter ? '0 2px 4px rgba(0, 120, 212, 0.2)' : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (!hasFilter) {
                                            target.style.backgroundColor = 'rgba(0, 120, 212, 0.05)';
                                            target.style.borderColor = 'rgba(0, 120, 212, 0.2)';
                                            target.style.transform = 'scale(1.05)';
                                        } else {
                                            target.style.backgroundColor = 'rgba(0, 120, 212, 0.15)';
                                            target.style.transform = 'scale(1.05)';
                                            target.style.boxShadow = '0 4px 8px rgba(0, 120, 212, 0.3)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (!hasFilter) {
                                            target.style.backgroundColor = 'transparent';
                                            target.style.borderColor = 'transparent';
                                            target.style.transform = 'scale(1)';
                                        } else {
                                            target.style.backgroundColor = 'rgba(0, 120, 212, 0.1)';
                                            target.style.transform = 'scale(1)';
                                            target.style.boxShadow = '0 2px 4px rgba(0, 120, 212, 0.2)';
                                        }
                                    }}
                                >
                                    {/* Enhanced Funnel icon with better styling */}
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 16 16"
                                        fill={hasFilter ? '#0078d4' : 'none'}
                                        stroke={hasFilter ? '#0078d4' : '#8a8886'}
                                        strokeWidth="1.5"
                                        style={{ 
                                            display: 'block',
                                            filter: hasFilter ? 'drop-shadow(0 1px 2px rgba(0, 120, 212, 0.3))' : 'none'
                                        }}
                                    >
                                        <path d="M2 3h12l-4 5v4.5a0.5 0.5 0 0 1-0.276 0.447l-2 1A0.5 0.5 0 0 1 7 13.5V8L2 3z" />
                                        {/* Add a dot indicator when filter is active */}
                                        {hasFilter && (
                                            <circle cx="12" cy="4" r="2" fill="#ff6b35" stroke="white" strokeWidth="0.5" />
                                        )}
                                    </svg>
                                </span>
                            )}
                        </div>

                        {/* Column resize handle - Adjusted positioning to avoid filter icon overlap */}
                        {column.isResizable && (
                            <div
                                className="column-resize-handle"
                                style={{
                                    position: 'absolute',
                                    right: '-6px', // Moved slightly outside to prevent overlap
                                    top: 0,
                                    bottom: 0,
                                    width: '8px', // Reduced width to minimize overlap potential
                                    cursor: 'col-resize',
                                    backgroundColor: isResizing === columnKey ? '#0078d4' : 'transparent',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    zIndex: 5, // Lower than filter icon
                                    borderRadius: '2px'
                                }}
                                onMouseDown={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    handleResizeStart(columnKey, e.clientX, memoizedColumnWidths[index]);
                                }}
                                onMouseEnter={(e: React.MouseEvent) => {
                                    if (isResizing !== columnKey) {
                                        (e.target as HTMLElement).style.backgroundColor = 'rgba(0, 120, 212, 0.2)';
                                        (e.target as HTMLElement).style.boxShadow = '0 0 4px rgba(0, 120, 212, 0.3)';
                                    }
                                }}
                                onMouseLeave={(e: React.MouseEvent) => {
                                    if (isResizing !== columnKey) {
                                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                                        (e.target as HTMLElement).style.boxShadow = 'none';
                                    }
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div 
            className="virtualized-editable-grid-container"
            style={{
                width: (typeof width === 'number' && width > 0) ? `${width}px` : (typeof width === 'string' && width ? width : '100%'),
                height: (typeof height === 'number' && height > 0) ? `${height}px` : (typeof height === 'string' && height ? height : '100%'),
                maxWidth: '100%',
                overflow: 'hidden',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                flex: 1 // Allow the grid to flex with its container
            }}
        >
            {/* Error Message */}
            {errorMessage && (
                <MessageBar 
                    messageBarType={MessageBarType.error}
                    onDismiss={() => setErrorMessage('')}
                    styles={{ root: { marginBottom: 8 } }}
                >
                    {errorMessage}
                </MessageBar>
            )}

            {/* Committing Overlay */}
            {isCommitting && (
                <MessageBar messageBarType={MessageBarType.info} styles={{ root: { marginBottom: 8 } }}>
                    <Spinner size={SpinnerSize.small} />
                    Saving changes...
                </MessageBar>
            )}

            {/* Header - FIXED POSITION, no independent scrolling */}
            <div 
                ref={headerRef}
                className="virtualized-header-container"
                style={{
                    width: '100%',
                    overflowX: 'hidden', // CHANGED: No independent scrolling
                    overflowY: 'hidden',
                    flexShrink: 0,
                    position: 'relative'
                }}
            >
                {renderHeader()}
            </div>

            {/* PURE VIRTUALIZED GRID BODY - Always on for META/Google competitive performance */}
            <div 
                ref={parentRef}
                className="virtualized-grid-body"
                style={{
                    flex: 1,
                    overflow: 'auto', // Enable both horizontal and vertical scrolling
                    minHeight: 0,
                    position: 'relative'
                }}
            >
                <div
                    className="virtualized-grid-inner"
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        minWidth: `${totalGridWidth}px`, // Enable horizontal scrolling when columns exceed container
                        position: 'relative',
                    }}
                >
                    {virtualizer.getVirtualItems().map(renderRow)}
                </div>
            </div>

            {/* Excel-like Column Filter */}
            {activeFilterColumn && (
                <ExcelLikeColumnFilter
                    columnKey={activeFilterColumn}
                    columnName={columns.find(c => c.key === activeFilterColumn)?.name || activeFilterColumn}
                    dataType={getColumnDataType?.(activeFilterColumn) || 'text'}
                    allData={originalItems}
                    filteredData={filteredItems}
                    currentFilters={columnFilters}
                    onFilterChange={handleColumnFilterChange}
                    target={filterTargets[activeFilterColumn]}
                    onDismiss={() => setActiveFilterColumn(null)}
                    isOpen={!!activeFilterColumn}
                    getAvailableValues={getAvailableValuesForFilter}
                />
            )}
        </div>
    );
});

VirtualizedEditableGrid.displayName = 'VirtualizedEditableGrid';

export default VirtualizedEditableGrid;
