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
import { EnhancedInlineEditor } from './EnhancedInlineEditor';
import { EnterpriseChangeManager } from '../services/EnterpriseChangeManager';
import { performanceMonitor } from '../performance/PerformanceMonitor';
import { VirtualizedFilterDropdown, FilterValue } from './VirtualizedFilterDropdown';
import { ExcelLikeColumnFilter } from './ExcelLikeColumnFilter';
import { ColumnEditorMapping } from '../types/ColumnEditor.types';
import { IGridColumn } from '../Component.types';
import { ColumnVisibilityManager } from '../utils/ColumnVisibilityUtils';
import { IFilterState, FilterOperators, FilterTypes } from '../Filter.types';
import { HeaderSelectionCheckbox, RowSelectionCheckbox } from './SelectionCheckbox';
import { PowerAppsConditionalProcessor } from '../services/PowerAppsConditionalProcessor';
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
const formatCellValue = (value: any, dataType?: string, getColumnDataType?: (columnKey: string) => 'text' | 'number' | 'date' | 'boolean' | 'choice', columnKey?: string, columnEditorMapping?: ColumnEditorMapping): string => {
    if (value === null || value === undefined) {
        return '';
    }

    // Check if this is a percentage column by looking at the editor configuration
    const isPercentageColumn = columnKey && columnEditorMapping && 
                              columnEditorMapping[columnKey] && 
                              columnEditorMapping[columnKey].type === 'percentage';

    // Format percentage values for display (0.85 → "85%")
    if (isPercentageColumn && typeof value === 'number') {
        const percentageValue = (value * 100).toFixed(1);
        // Remove unnecessary decimal places
        const cleanPercentage = percentageValue.endsWith('.0') ? 
                               percentageValue.slice(0, -2) : 
                               percentageValue;
        return `${cleanPercentage}%`;
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
    selectionType?: '0' | '1' | '2'; // 0=None, 1=Single, 2=Multiple
    selectedItems?: Set<string>;
    selectAllState?: 'none' | 'some' | 'all';
    onItemSelection?: (itemId: string) => void;
    onSelectAll?: () => void;
    onClearAllSelections?: () => void;
    
    // Text sizing properties
    headerTextSize?: number; // Font size for column headers in px
    columnTextSize?: number; // Font size for column data in px
    
    // Header text wrapping
    enableHeaderTextWrapping?: boolean; // Whether to wrap header text when it doesn't fit
    
    // Row styling properties
    alternateRowColor?: string; // Color for alternating rows
    
    // Frozen column props (Excel-like freeze panes)
    frozenColumnKeys?: string[]; // Column keys that are initially frozen
    onFrozenColumnsChange?: (frozenKeys: string[]) => void; // Callback when user toggles freeze via context menu
    
    // New row management
    onDeleteNewRow?: (itemId: string) => void; // Callback to delete individual new rows
}

export interface VirtualizedEditableGridRef {
    commitAllChanges: () => Promise<void>;
    cancelAllChanges: () => void;
    getPendingChangesCount: () => number;
    scrollToIndex: (index: number) => void;
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
    selectionType = '2', // Default to Multiple for backward compatibility
    selectedItems = new Set(),
    selectAllState = 'none',
    onItemSelection,
    onSelectAll,
    onClearAllSelections,
    
    // Text sizing props with defaults
    headerTextSize = 14, // Default 14px for headers
    columnTextSize = 13, // Default 13px for column data
    
    // Header text wrapping
    enableHeaderTextWrapping = false, // Default to no wrapping for backward compatibility
    
    // Row styling props
    alternateRowColor,
    
    // Frozen column props
    frozenColumnKeys: initialFrozenColumnKeys = [],
    onFrozenColumnsChange,
    
    // New row management
    onDeleteNewRow,
    
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

    // Frozen columns state - tracks which columns are frozen
    const [frozenColumnKeys, setFrozenColumnKeys] = React.useState<Set<string>>(() => {
        // Initialize from props: both explicitly passed keys and columns with isFrozen=true
        const initial = new Set<string>(initialFrozenColumnKeys);
        columns.forEach(col => {
            if ((col as any).isFrozen) {
                initial.add(col.key || col.fieldName || '');
            }
        });
        return initial;
    });
    
    // Context menu state for freeze/unfreeze
    const [freezeContextMenu, setFreezeContextMenu] = React.useState<{
        visible: boolean;
        x: number;
        y: number;
        columnKey: string;
        columnName: string;
    } | null>(null);

    // Sync frozen column keys when columns prop changes (pick up isFrozen from column config)
    React.useEffect(() => {
        const fromProps = new Set<string>(initialFrozenColumnKeys);
        columns.forEach(col => {
            if ((col as any).isFrozen) {
                fromProps.add(col.key || col.fieldName || '');
            }
        });
        if (fromProps.size > 0) {
            setFrozenColumnKeys(prev => {
                // Merge: keep user-toggled keys, add prop-based keys
                const merged = new Set(prev);
                fromProps.forEach(k => merged.add(k));
                return merged;
            });
        }
    }, [columns, initialFrozenColumnKeys]);

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

    // Auto-fill confirmation state - tracks which new rows are pending auto-fill
    const [pendingAutoFillRows, setPendingAutoFillRows] = React.useState<Set<string>>(new Set());
    const [autoFillInProgress, setAutoFillInProgress] = React.useState<Set<string>>(new Set());

    // Row drag fill state - tracks which rows are being targeted during drag
    const [rowDragFillTargets, setRowDragFillTargets] = React.useState<Set<number>>(new Set());
    const [rowDragFillSource, setRowDragFillSource] = React.useState<number | null>(null);

    // Cell selection state for multi-cell drag fill
    // Format: Set of "rowIndex-columnKey" strings
    const [selectedCells, setSelectedCells] = React.useState<Set<string>>(new Set());
    const [selectionAnchor, setSelectionAnchor] = React.useState<{ row: number; column: string } | null>(null);
    const [isSelecting, setIsSelecting] = React.useState<boolean>(false);
    const [selectionBounds, setSelectionBounds] = React.useState<{
        startRow: number;
        endRow: number;
        startColIndex: number;
        endColIndex: number;
    } | null>(null);

    // Handle mouse up to end selection
    React.useEffect(() => {
        const handleMouseUp = () => {
            setIsSelecting(false);
        };
        
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, []);

    // Clear selection when clicking outside or pressing Escape
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedCells(new Set());
                setSelectionAnchor(null);
                setSelectionBounds(null);
            }
        };
        
        const handleClickOutside = (e: MouseEvent) => {
            // Check if click is outside the grid
            const target = e.target as HTMLElement;
            const isInsideGrid = target.closest('.virtualized-editable-grid-container');
            if (!isInsideGrid && selectedCells.size > 0) {
                setSelectedCells(new Set());
                setSelectionAnchor(null);
                setSelectionBounds(null);
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selectedCells.size]);

    // Helper function to evaluate a single filter condition
    const evaluateCondition = React.useCallback((fieldValue: any, condition: any): boolean => {
        const { operator, value } = condition;
        
        switch (operator) {
            case FilterOperators.IsEmpty:
                return fieldValue == null || fieldValue === '' || fieldValue === undefined || 
                       (typeof fieldValue === 'string' && fieldValue.trim() === '');
            case FilterOperators.IsNotEmpty:
                return fieldValue != null && fieldValue !== '' && fieldValue !== undefined && 
                       !(typeof fieldValue === 'string' && fieldValue.trim() === '');
            case FilterOperators.In:
                // Handle blank values specifically for the In operator
                const isFieldBlank = fieldValue == null || fieldValue === '' || fieldValue === undefined || 
                                   (typeof fieldValue === 'string' && fieldValue.trim() === '');
                
                if (isFieldBlank) {
                    // If field is blank, only match if "(Blanks)" is in the filter values
                    return (value as any[]).includes('(Blanks)');
                }
                
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
                    // Skip "(Blanks)" since we already handled blank field values above
                    if (filterValue === '(Blanks)') return false;
                    
                    let normalizedFilter = filterValue;
                    if (filterValue instanceof Date) {
                        normalizedFilter = filterValue.toDateString();
                    }
                    
                    // Enhanced comparison for text-like numbers (e.g., "01", "02", "03")
                    // Compare both original string values and normalized values
                    const fieldStr = String(normalizedField);
                    const filterStr = String(normalizedFilter);
                    const originalFieldStr = String(fieldValue);
                    
                    return normalizedField === normalizedFilter || 
                           fieldStr === filterStr ||
                           originalFieldStr === filterStr ||
                           fieldStr === String(filterValue) ||
                           originalFieldStr === String(filterValue);
                });
            default:
                return true;
        }
    }, []);

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
    }, [items, columnFilters, evaluateCondition]);

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
            
            // Notify parent component of filter removal
            onColumnFilter?.(columnKey, []);
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
        
        // Notify parent component of filter change
        onColumnFilter?.(columnKey, selectedValues);
    }, [columns, getColumnDataType, onColumnFilter]);

    const handleFilterButtonClick = React.useCallback((columnKey: string, target: HTMLElement) => {
        setActiveFilterColumn(activeFilterColumn === columnKey ? null : columnKey);
        setFilterTargets(prev => ({
            ...prev,
            [columnKey]: target
        }));
    }, [activeFilterColumn]);

    // Auto-fill confirmation handlers
    const handleAutoFillConfirmation = React.useCallback((itemId: string) => {
        // Mark auto-fill as in progress for this item
        setAutoFillInProgress(prev => new Set(prev.add(itemId)));
        
        try {
            // Apply auto-fill for this specific row using the same logic as EnhancedInlineEditor
            const item = filteredItems.find(item => (item.recordId || item.key || item.id) === itemId);
            if (!item || !columnEditorMapping) return;


            // Use PowerAppsConditionalProcessor to determine what values should be applied
            const processor = PowerAppsConditionalProcessor.getInstance();
            
            // Build configurations from the column editor mapping (same as EnhancedInlineEditor)
            const allEditorConfigs: Record<string, { conditional?: any }> = {};
            
            Object.keys(columnEditorMapping).forEach(key => {
                const config = columnEditorMapping[key];
                if (config.conditional) {
                    const conditional = config.conditional as any;
                    if (typeof conditional.dependsOn === 'string') {
                        allEditorConfigs[key] = { conditional: conditional };
                    }
                }
            });

            const dependencies = processor.getDependencies(allEditorConfigs);
            
            // Apply auto-fill for all dependent fields that have RequiresAutoFillConfirmation
            Object.entries(dependencies).forEach(([triggerField, dependentFields]) => {
                if (dependentFields && dependentFields.length > 0) {
                    const triggerValue = getPCFValue(item, triggerField);
                    
                    if (triggerValue) {
                    // iOS WebView Safety: Safely access global data sources
                    let globalDataSources = {};
                    try {
                        if (typeof window !== 'undefined' && window !== null) {
                            globalDataSources = (window as any).PowerAppsDataSources || {};
                        }
                    } catch (e) {
                        // Ignore window access errors on restricted iOS WebView
                    }
                    
                    const context = {
                        currentValues: { ...Object.fromEntries(Object.keys(columnEditorMapping).map(key => [key, getPCFValue(item, key)])), [triggerField]: triggerValue },
                        isNewRecord: false,
                        globalDataSources: globalDataSources
                    };

                    for (const dependentField of dependentFields) {
                        const fieldConfig = columnEditorMapping[dependentField];
                        const requiresConfirmation = fieldConfig?.RequiresAutoFillConfirmation === true;
                        
                        if (requiresConfirmation) {
                            const dependentConfig = allEditorConfigs[dependentField]?.conditional;
                            if (dependentConfig) {
                                const newValue = processor.processConditional(
                                    dependentField,
                                    dependentConfig,
                                    context
                                );

                                if (newValue !== undefined && newValue !== getPCFValue(item, dependentField)) {
                                    
                                    // Get the original value BEFORE making changes
                                    const originalValue = getPCFValue(item, dependentField);
                                    
                                    // Apply the value directly to the item
                                    setPCFValue(item, dependentField, newValue);
                                    
                                    // Track as a change for the grid
                                    const itemIndex = filteredItems.indexOf(item);
                                    const changeKey = getCellKey(itemIndex, dependentField);
                                    
                                    const change = {
                                        itemId,
                                        itemIndex,
                                        columnKey: dependentField,
                                        newValue: newValue,
                                        oldValue: originalValue
                                    };
                                    
                                    setPendingChanges(prev => new Map(prev.set(changeKey, change)));
                                    onCellEdit?.(itemId, dependentField, newValue);
                                }
                            }
                        }
                    }
                }
            }
        });
        
        // Remove this item from pending auto-fill
        setPendingAutoFillRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
        });
        } finally {
            // Always clear the in-progress flag
            setAutoFillInProgress(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
            });
        }
    }, [filteredItems, columnEditorMapping, onCellEdit]);

    const addNewRowForAutoFill = React.useCallback((newItem: any) => {
        // Check if any column requires auto-fill confirmation
        const hasAutoFillColumns = Object.values(columnEditorMapping).some(config => 
            config.RequiresAutoFillConfirmation === true
        );
        
        if (hasAutoFillColumns) {
            // Add to pending auto-fill rows instead of applying immediately
            const itemId = newItem.recordId || newItem.key || newItem.id;
            if (itemId) {
                setPendingAutoFillRows(prev => new Set(prev.add(itemId)));
            }
        }
    }, [columnEditorMapping]);

    // Add an item to pending auto-fill (for field changes that trigger auto-fill requiring confirmation)
    const triggerAutoFillConfirmation = React.useCallback((itemId: string) => {
        // Prevent adding to pending if auto-fill is already in progress for this item
        if (autoFillInProgress.has(itemId)) {
            return;
        }
        
        setPendingAutoFillRows(prev => {
            const newSet = new Set(prev.add(itemId));
            return newSet;
        });
    }, [autoFillInProgress]);

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

    // Auto-fill detection for new rows
    React.useEffect(() => {
        if (!columnEditorMapping) return;
        
        
        // Find new rows that have conditional dependencies with auto-fill confirmation required
        const newRowsNeedingAutoFill = new Set<string>();
        
        filteredItems.forEach(item => {
            if (item.isNewRow) {
                const itemId = item.recordId || item.key || item.id;
                if (itemId) {
                    // Check if any column has conditional dependencies AND requires auto-fill confirmation
                    const hasConditionalDependenciesWithConfirmation = Object.values(columnEditorMapping).some(config => {
                        // Must have RequiresAutoFillConfirmation = true for this column
                        const requiresConfirmation = config.RequiresAutoFillConfirmation === true;
                        
                        if (!requiresConfirmation) return false;
                        
                        // Check for PowerAppsConditionalConfig style (config.conditional.dependsOn)
                        if (config.conditional && 
                            'dependsOn' in config.conditional && 
                            typeof config.conditional.dependsOn === 'string') {
                            return true;
                        }
                        
                        // Check for direct DependsOn property (your column config style)
                        if ('DependsOn' in config && typeof config.DependsOn === 'string') {
                            return true;
                        }
                        
                        // Check for camelCase dependsOn property
                        if ('dependsOn' in config && typeof config.dependsOn === 'string') {
                            return true;
                        }
                        
                        return false;
                    });
                    
                    
                    if (hasConditionalDependenciesWithConfirmation) {
                        newRowsNeedingAutoFill.add(itemId);
                    }
                }
            }
        });
        
        // Update pending auto-fill rows
        setPendingAutoFillRows(prev => {
            const newSet = new Set(prev);
            // Add new rows that need auto-fill
            newRowsNeedingAutoFill.forEach(id => newSet.add(id));
            // Only remove rows that are specifically new rows and no longer exist
            // Don't remove existing rows that may have been added via triggerAutoFillConfirmation
            const currentNewRowIds = new Set(filteredItems.filter(item => item.isNewRow).map(item => item.recordId || item.key || item.id));
            const existingRowIds = new Set(filteredItems.filter(item => !item.isNewRow).map(item => item.recordId || item.key || item.id));
            
            Array.from(newSet).forEach(id => {
                // Only remove if it was a new row that no longer exists
                // Keep existing rows that may have triggered auto-fill via dropdown changes
                if (!currentNewRowIds.has(id) && !existingRowIds.has(id)) {
                    newSet.delete(id);
                }
            });
            return newSet;
        });
    }, [columnEditorMapping, filteredItems]);

    // Header horizontal scroll synchronization - SCROLLLEFT APPROACH
    // Uses scrollLeft sync instead of transform so that position:sticky works on frozen header cells
    React.useEffect(() => {
        const scrollContainer = parentRef.current;
        const headerContainer = headerRef.current;

        if (!scrollContainer || !headerContainer) return;

        let lastScrollLeft = 0;
        let animationId: number | null = null;

        const syncHeaderScroll = () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            
            animationId = requestAnimationFrame(() => {
                if (scrollContainer && headerContainer) {
                    const currentScrollLeft = scrollContainer.scrollLeft;
                    if (Math.abs(currentScrollLeft - lastScrollLeft) > 0.5) {
                        headerContainer.scrollLeft = currentScrollLeft;
                        lastScrollLeft = currentScrollLeft;
                    }
                }
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
        measureElement: enableMemoryPooling ? undefined : (element: any) => {
            return element?.getBoundingClientRect().height || rowHeight;
        },
        scrollToFn: (offset: any, canSmooth: any, instance: any) => {
            // iOS WebView Safety: scrollTo with smooth behavior can cause issues on iOS
            // Use fallback behavior on iOS or when smooth scrolling fails
            try {
                const scrollElement = instance.scrollElement;
                if (scrollElement) {
                    // iOS Safari/WebView may not support smooth scrolling properly
                    // Check if we're on iOS and use instant scroll instead
                    const isIOS = /iPad|iPhone|iPod/.test(navigator?.userAgent || '') || 
                                  (navigator?.platform === 'MacIntel' && navigator?.maxTouchPoints > 1);
                    const duration = canSmooth && enablePrefetching && !isIOS ? 100 : 0;
                    
                    scrollElement.scrollTo({ 
                        top: Math.max(0, offset), 
                        behavior: duration ? 'smooth' : 'auto' 
                    });
                }
            } catch (e) {
                // Fallback for iOS WebView - use direct property assignment
                const scrollElement = instance.scrollElement;
                if (scrollElement) {
                    scrollElement.scrollTop = Math.max(0, offset);
                }
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

    // Convert complex IColumnFilter format to simple format expected by ExcelLikeColumnFilter
    const convertFiltersToSimpleFormat = React.useCallback((filters: IFilterState): Record<string, any[]> => {
        const simpleFilters: Record<string, any[]> = {};
        
        Object.entries(filters).forEach(([columnKey, filter]) => {
            if (!filter?.isActive || !filter.conditions?.length) return;
            
            const selectedValues: any[] = [];
            
            filter.conditions.forEach(condition => {
                if (condition.operator === FilterOperators.IsEmpty) {
                    // Handle blank filter
                    selectedValues.push('(Blanks)');
                } else if (condition.operator === FilterOperators.In && Array.isArray(condition.value)) {
                    // Handle multi-value selection
                    selectedValues.push(...condition.value);
                } else if (condition.operator === FilterOperators.In) {
                    // Handle single value
                    selectedValues.push(condition.value);
                }
            });
            
            if (selectedValues.length > 0) {
                simpleFilters[columnKey] = selectedValues;
            }
        });
        
        return simpleFilters;
    }, []);

    // Create a wrapper for ExcelLikeColumnFilter that returns cascaded filtered values
    const getAvailableValuesForFilter = React.useCallback((columnKey: string) => {
        // Get the original available values
        const availableValuesData = getAvailableValues?.(columnKey) || [];
        
        // Get current filters excluding the column we're calculating for (cascading)
        const otherFilters = convertFiltersToSimpleFormat(columnFilters);
        delete otherFilters[columnKey]; // Remove current column filter to prevent self-filtering
        
        // If there are no other active filters, return original data
        if (Object.keys(otherFilters).length === 0) {
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
        }
        
        // Apply cascading filter: filter the original items by other column filters
        const cascadedData = items.filter(item => {
            return Object.entries(otherFilters).every(([filterColumnKey, filterValues]) => {
                if (!filterValues || filterValues.length === 0) return true;
                
                const itemValue = getPCFValue(item, filterColumnKey);
                
                // Handle blank values
                if (filterValues.includes('(Blanks)')) {
                    const isBlank = itemValue == null || itemValue === '' || itemValue === undefined ||
                                   (typeof itemValue === 'string' && itemValue.trim() === '');
                    if (isBlank) return true;
                }
                
                // Handle regular values (excluding blanks)
                const nonBlankValues = filterValues.filter(v => v !== '(Blanks)');
                if (nonBlankValues.length > 0) {
                    // Normalize values for comparison (same logic as in ExcelLikeColumnFilter)
                    const column = columns.find(col => (col.fieldName || col.key) === filterColumnKey);
                    const dataType = column?.dataType || getColumnDataType?.(filterColumnKey) || 'text';
                    
                    let normalizedItemValue = itemValue;
                    if (dataType === 'date' && itemValue instanceof Date) {
                        normalizedItemValue = itemValue.toDateString();
                    } else if (dataType === 'date' && typeof itemValue === 'string' && !isNaN(Date.parse(itemValue))) {
                        const dateValue = new Date(itemValue);
                        if (!isNaN(dateValue.getTime())) {
                            normalizedItemValue = dateValue.toDateString();
                        }
                    }
                    
                    return nonBlankValues.includes(normalizedItemValue) || nonBlankValues.includes(itemValue);
                }
                
                return false;
            });
        });
        
        // Calculate distinct values and counts from cascaded data
        const valueCountMap = new Map<any, number>();
        let blankCount = 0;
        
        // Find the column configuration to determine data type
        const column = columns.find(col => (col.fieldName || col.key) === columnKey);
        const dataType = column?.dataType || getColumnDataType?.(columnKey) || 'text';
        const isDateColumn = dataType === 'date';
        
        cascadedData.forEach(item => {
            const value = getPCFValue(item, columnKey);
            
            // Count blank values
            if (value == null || value === undefined || value === '' || 
                (typeof value === 'string' && value.trim() === '')) {
                blankCount++;
            } else {
                // Normalize values for proper grouping
                let normalizedValue = value;
                if (isDateColumn && value instanceof Date) {
                    normalizedValue = value.toDateString();
                } else if (isDateColumn && typeof value === 'string') {
                    const parsedDate = new Date(value);
                    if (!isNaN(parsedDate.getTime())) {
                        normalizedValue = parsedDate.toDateString();
                    }
                }
                
                const currentCount = valueCountMap.get(normalizedValue) || 0;
                valueCountMap.set(normalizedValue, currentCount + 1);
            }
        });
        
        // Convert to required format
        const result: Array<{value: any, displayValue: string, count: number}> = [];
        
        // Add blank entry if there are blank values
        if (blankCount > 0) {
            result.push({
                value: '(Blanks)',
                displayValue: '(Blanks)',
                count: blankCount
            });
        }
        
        // Add non-blank values
        Array.from(valueCountMap.entries()).forEach(([value, count]) => {
            let displayValue: string;
            
            if (isDateColumn && value) {
                if (value instanceof Date) {
                    displayValue = value.toLocaleDateString();
                } else if (typeof value === 'string') {
                    const parsedDate = new Date(value);
                    if (!isNaN(parsedDate.getTime())) {
                        displayValue = parsedDate.toLocaleDateString();
                    } else {
                        displayValue = String(value);
                    }
                } else {
                    displayValue = String(value);
                }
            } else {
                displayValue = String(value);
            }
            
            result.push({
                value,
                displayValue,
                count
            });
        });
        
        return result;
    }, [getAvailableValues, columnFilters, items, columns, getColumnDataType]);

    // Create effective columns array including selection column if needed
    const effectiveColumns = React.useMemo(() => {
        // ⚡ LIGHTNING-FAST COLUMN VISIBILITY - Use high-performance manager for 0ms overhead
        const visibilityManager = ColumnVisibilityManager.getInstance();
        let result = visibilityManager.filterVisibleColumns(columns);
        
        const metrics = visibilityManager.getPerformanceMetrics();
        
        // Add selection column at the beginning if enabled
        if (enableSelectionMode) {
            result.unshift({
                key: '__selection__',
                name: '',
                fieldName: '__selection__',
                minWidth: 40,
                maxWidth: 40,
                isResizable: false
            } as IGridColumn);
        }
        
        // Add auto-fill confirmation column and/or delete column after selection column
        const hasNewRows = filteredItems.some(item => item.isNewRow);
        const hasRowsNeedingAutoFill = pendingAutoFillRows.size > 0;
        let insertIndex = enableSelectionMode ? 1 : 0;
        
        // Add auto-fill confirmation column if rows need auto-fill
        if (hasRowsNeedingAutoFill) {
            result.splice(insertIndex, 0, {
                key: '__autofill__',
                name: '',
                fieldName: '__autofill__',
                minWidth: 40,
                maxWidth: 40,
                isResizable: false
            } as IGridColumn);
            insertIndex++; // Increment for next column
        }
        
        // Add delete column if there are new rows (independent of auto-fill)
        if (onDeleteNewRow && hasNewRows) {
            result.splice(insertIndex, 0, {
                key: '__delete__',
                name: '',
                fieldName: '__delete__',
                minWidth: 40,
                maxWidth: 40,
                isResizable: false
            } as IGridColumn);
        }
        
        return result;
    }, [columns, enableSelectionMode, onDeleteNewRow, filteredItems, pendingAutoFillRows]);

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
            
            // Use the column's intended width from our custom property
            if (col.defaultWidth && col.defaultWidth > 0) {
                return col.defaultWidth;
            }
            
            // Fallback to other width properties
            if (col.maxWidth && col.maxWidth > col.minWidth) {
                return col.maxWidth;
            }
            
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

    // ========== FROZEN COLUMN COMPUTATIONS ==========
    // Compute per-column frozen info: whether each column is frozen and its sticky left offset
    const frozenColumnInfo = React.useMemo(() => {
        let cumulativeLeft = 0;
        let lastFrozenIndex = -1;

        // Frozen columns must be contiguous from the left.
        // Walk columns left→right; a column is effectively frozen if either:
        //   • it's a special prefix column (__selection__, __autofill__, __delete__) that
        //     appears before any user data column and there is at least one frozen data column, OR
        //   • its key is in the frozenColumnKeys set.
        // Once we encounter the first non-frozen data column, we stop freezing.
        const info: Array<{ isFrozen: boolean; stickyLeft: number; isLastFrozen: boolean }> = [];
        
        // First pass: determine which columns are frozen
        // Special columns at the beginning are auto-frozen if any data column is frozen
        const hasAnyFrozenDataColumn = effectiveColumns.some(col => {
            const key = col.key || col.fieldName || '';
            return !key.startsWith('__') && frozenColumnKeys.has(key);
        });

        let hitFirstNonFrozenDataColumn = false;

        for (let i = 0; i < effectiveColumns.length; i++) {
            const col = effectiveColumns[i];
            const key = col.key || col.fieldName || '';
            const isSpecialColumn = key.startsWith('__');

            let isFrozen = false;
            if (!hitFirstNonFrozenDataColumn) {
                if (isSpecialColumn) {
                    // Auto-freeze special columns if there are frozen data columns
                    isFrozen = hasAnyFrozenDataColumn;
                } else if (frozenColumnKeys.has(key)) {
                    isFrozen = true;
                } else {
                    // First non-frozen data column – stop freezing from here on
                    hitFirstNonFrozenDataColumn = true;
                    isFrozen = false;
                }
            }

            info.push({ isFrozen, stickyLeft: isFrozen ? cumulativeLeft : 0, isLastFrozen: false });
            if (isFrozen) {
                lastFrozenIndex = i;
            }
            cumulativeLeft += memoizedColumnWidths[i] || 0;
        }

        // Mark the last frozen column for the shadow
        if (lastFrozenIndex >= 0) {
            info[lastFrozenIndex].isLastFrozen = true;
        }

        return info;
    }, [effectiveColumns, frozenColumnKeys, memoizedColumnWidths]);

    // Helper: does this grid currently have any frozen columns?
    const hasFrozenColumns = React.useMemo(
        () => frozenColumnInfo.some(c => c.isFrozen),
        [frozenColumnInfo]
    );

    // Toggle freeze on a column (used by the context menu)
    const toggleFreezeColumn = React.useCallback((columnKey: string) => {
        setFrozenColumnKeys(prev => {
            const next = new Set(prev);
            if (next.has(columnKey)) {
                next.delete(columnKey);
            } else {
                next.add(columnKey);
            }
            onFrozenColumnsChange?.(Array.from(next));
            return next;
        });
    }, [onFrozenColumnsChange]);

    // Unfreeze all columns
    const unfreezeAllColumns = React.useCallback(() => {
        setFrozenColumnKeys(new Set());
        onFrozenColumnsChange?.([]);
    }, [onFrozenColumnsChange]);

    // Close freeze context menu when clicking anywhere
    React.useEffect(() => {
        if (!freezeContextMenu?.visible) return;
        const handleClick = () => setFreezeContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [freezeContextMenu?.visible]);

    // ========== CELL SELECTION HELPERS (depend on effectiveColumns) ==========
    
    // Helper to get column index from column key
    const getColumnIndex = React.useCallback((columnKey: string): number => {
        return effectiveColumns.findIndex(col => (col.fieldName || col.key) === columnKey);
    }, [effectiveColumns]);

    // Helper to check if a cell is the bottom-right of the selection (where the green handle should appear)
    const isBottomRightOfSelection = React.useCallback((rowIndex: number, columnKey: string): boolean => {
        if (selectedCells.size <= 1 || !selectionBounds) return false;
        
        const colIndex = getColumnIndex(columnKey);
        return rowIndex === selectionBounds.endRow && colIndex === selectionBounds.endColIndex;
    }, [selectedCells.size, selectionBounds, getColumnIndex]);

    // Helper to check if a cell is selected
    const isCellSelected = React.useCallback((rowIndex: number, columnKey: string): boolean => {
        return selectedCells.has(`${rowIndex}-${columnKey}`);
    }, [selectedCells]);

    // Update selection bounds when selectedCells changes
    React.useEffect(() => {
        if (selectedCells.size === 0) {
            setSelectionBounds(null);
            return;
        }

        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;

        selectedCells.forEach(cellKey => {
            const [rowStr, ...colParts] = cellKey.split('-');
            const colKey = colParts.join('-'); // Handle column keys with dashes
            const row = parseInt(rowStr);
            const colIndex = getColumnIndex(colKey);
            
            if (!isNaN(row) && colIndex >= 0) {
                minRow = Math.min(minRow, row);
                maxRow = Math.max(maxRow, row);
                minCol = Math.min(minCol, colIndex);
                maxCol = Math.max(maxCol, colIndex);
            }
        });

        if (minRow !== Infinity) {
            setSelectionBounds({
                startRow: minRow,
                endRow: maxRow,
                startColIndex: minCol,
                endColIndex: maxCol
            });
        }
    }, [selectedCells, getColumnIndex]);

    // Handle cell selection on mouse down
    // REQUIRES Ctrl key to be held to start selection (to not interfere with inline editing)
    // CONSTRAINED to single row only - selecting on a different row clears the previous selection
    const handleCellMouseDown = React.useCallback((e: React.MouseEvent, rowIndex: number, columnKey: string) => {
        // Only handle left-click for selection
        if (e.button !== 0) return;
        
        // Don't interfere with editing
        if (editingState) return;
        
        // REQUIRE Ctrl/Cmd key to be held for cell selection (to not interfere with inline editing)
        if (!e.ctrlKey && !e.metaKey) {
            // Regular click without Ctrl - clear any existing selection and don't start new one
            if (selectedCells.size > 0) {
                setSelectedCells(new Set());
                setSelectionAnchor(null);
            }
            return;
        }
        
        const cellKey = `${rowIndex}-${columnKey}`;
        
        // Check if there's an existing selection on a different row
        // If so, clear it and start fresh on this row
        let currentSelectionRow: number | null = null;
        if (selectedCells.size > 0) {
            // Get the row from the first selected cell
            const firstCellKey = selectedCells.values().next().value;
            if (firstCellKey) {
                const [rowStr] = firstCellKey.split('-');
                currentSelectionRow = parseInt(rowStr);
            }
        }
        
        // If clicking on a different row, clear selection and start fresh
        if (currentSelectionRow !== null && currentSelectionRow !== rowIndex) {
            setSelectedCells(new Set([cellKey]));
            setSelectionAnchor({ row: rowIndex, column: columnKey });
            setIsSelecting(true);
            return;
        }
        
        if (e.shiftKey && selectionAnchor) {
            // Ctrl+Shift+click: select range from anchor to current cell (same row only)
            // If anchor is on a different row, just select the current cell
            if (selectionAnchor.row !== rowIndex) {
                setSelectedCells(new Set([cellKey]));
                setSelectionAnchor({ row: rowIndex, column: columnKey });
                return;
            }
            
            const anchorColIndex = getColumnIndex(selectionAnchor.column);
            const currentColIndex = getColumnIndex(columnKey);
            
            const startCol = Math.min(anchorColIndex, currentColIndex);
            const endCol = Math.max(anchorColIndex, currentColIndex);
            
            const newSelection = new Set<string>();
            // Only select cells on the same row
            for (let c = startCol; c <= endCol; c++) {
                const col = effectiveColumns[c];
                if (col) {
                    const colKey = col.fieldName || col.key;
                    // Skip special columns
                    if (colKey !== '__selection__' && colKey !== '__delete__' && colKey !== '__autofill__') {
                        newSelection.add(`${rowIndex}-${colKey}`);
                    }
                }
            }
            setSelectedCells(newSelection);
        } else {
            // Ctrl+click: toggle cell in selection or start new selection (same row only)
            setSelectedCells(prev => {
                const newSet = new Set(prev);
                if (newSet.has(cellKey)) {
                    newSet.delete(cellKey);
                } else {
                    newSet.add(cellKey);
                }
                return newSet;
            });
            setSelectionAnchor({ row: rowIndex, column: columnKey });
            setIsSelecting(true);
        }
    }, [editingState, selectionAnchor, getColumnIndex, effectiveColumns, selectedCells]);

    // Handle mouse move for drag selection (constrained to single row)
    const handleCellMouseEnter = React.useCallback((rowIndex: number, columnKey: string) => {
        if (!isSelecting || !selectionAnchor) return;
        
        // Constrain to same row as anchor - ignore if dragging to a different row
        if (rowIndex !== selectionAnchor.row) return;
        
        const anchorColIndex = getColumnIndex(selectionAnchor.column);
        const currentColIndex = getColumnIndex(columnKey);
        
        const startCol = Math.min(anchorColIndex, currentColIndex);
        const endCol = Math.max(anchorColIndex, currentColIndex);
        
        const newSelection = new Set<string>();
        // Only select cells on the anchor row
        for (let c = startCol; c <= endCol; c++) {
            const col = effectiveColumns[c];
            if (col) {
                const colKey = col.fieldName || col.key;
                // Skip special columns
                if (colKey !== '__selection__' && colKey !== '__delete__' && colKey !== '__autofill__') {
                    newSelection.add(`${selectionAnchor.row}-${colKey}`);
                }
            }
        }
        setSelectedCells(newSelection);
    }, [isSelecting, selectionAnchor, getColumnIndex, effectiveColumns]);

    // ========== END CELL SELECTION HELPERS ==========

    // Helper function to convert alignment values to CSS properties
    const getAlignmentStyles = (horizontalAlign?: string, verticalAlign?: string) => {
        const horizontal = horizontalAlign?.toLowerCase() || 'start';
        const vertical = verticalAlign?.toLowerCase() || 'center';
        
        let justifyContent: string;
        switch (horizontal) {
            case 'center':
                justifyContent = 'center';
                break;
            case 'end':
            case 'right':
                justifyContent = 'flex-end';
                break;
            case 'start':
            case 'left':
            default:
                justifyContent = 'flex-start';
                break;
        }
        
        let alignItems: string;
        switch (vertical) {
            case 'top':
            case 'start':
                alignItems = 'flex-start';
                break;
            case 'bottom':
            case 'end':
                alignItems = 'flex-end';
                break;
            case 'center':
            default:
                alignItems = 'center';
                break;
        }
        
        return { justifyContent, alignItems };
    };

    // Get cell key for change tracking
    const getCellKey = (itemIndex: number, columnKey: string) => `${itemIndex}-${columnKey}`;

    // Start inline editing
    const startEdit = React.useCallback((itemIndex: number, columnKey: string) => {
        if (!enableInlineEditing || readOnlyColumns.includes(columnKey)) return;

        const item = filteredItems[itemIndex];
        const originalValue = getPCFValue(item, columnKey);
        setEditingState({ itemIndex, columnKey, originalValue });
    }, [enableInlineEditing, readOnlyColumns, filteredItems]);

    // Handle conditional item changes
    const handleItemChange = React.useCallback((targetColumnKey: string, newValue: any) => {
        if (!editingState) return;

        const { itemIndex } = editingState;
        const item = filteredItems[itemIndex];
        const itemId = item.key || item.id || item.getRecordId?.() || itemIndex.toString();

        // Get the original value BEFORE updating the item
        const originalValue = getPCFValue(item, targetColumnKey);
        
        // Update the item immediately for conditional logic
        setPCFValue(item, targetColumnKey, newValue);

        // Track as a change if different from original
        if (newValue !== originalValue) {
            const changeKey = getCellKey(itemIndex, targetColumnKey);
            
            // Check if we already have a change for this cell - if so, keep the original oldValue
            const existingChange = pendingChanges.get(changeKey);
            const actualOldValue = existingChange ? existingChange.oldValue : originalValue;
            
            const change = {
                itemId,
                itemIndex,
                columnKey: targetColumnKey,
                newValue,
                oldValue: actualOldValue
            };

            setPendingChanges(prev => new Map(prev.set(changeKey, change)));

            // Notify parent
            onCellEdit?.(itemId, targetColumnKey, newValue);

            // Update change manager
            if (changeManager) {
                changeManager.addChange(itemId, targetColumnKey, originalValue, newValue);
            }
        }
    }, [editingState, filteredItems, onCellEdit, changeManager]);

    // Get all column values for conditional logic
    const getCurrentColumnValues = React.useCallback((targetItem?: any): Record<string, any> => {
        // Use the target item if provided, otherwise fall back to editing state
        let item: any = targetItem;
        
        if (!item && editingState) {
            const { itemIndex } = editingState;
            item = filteredItems[itemIndex];
        }
        
        if (!item) return {};

        const values: Record<string, any> = {};

        columns.forEach(column => {
            if (column.key) {
                // Include pending changes in the current values
                const itemIndex = filteredItems.indexOf(item);
                const cellKey = getCellKey(itemIndex, column.key);
                const pendingChange = pendingChanges.get(cellKey);
                
                values[column.key] = pendingChange ? pendingChange.newValue : getPCFValue(item, column.key);
            }
        });

        return values;
    }, [editingState, filteredItems, columns, pendingChanges]);

    // Commit cell edit
    const commitEdit = React.useCallback((newValue: any) => {
        if (!editingState) return;

        const { itemIndex, columnKey, originalValue } = editingState;
        const item = filteredItems[itemIndex];
        const itemId = item.key || item.id || item.getRecordId?.() || itemIndex.toString();

        const changeKey = getCellKey(itemIndex, columnKey);
        
        // Check if we already have a change for this cell - if so, keep the original oldValue
        const existingChange = pendingChanges.get(changeKey);
        const actualOldValue = existingChange ? existingChange.oldValue : originalValue;
        
        // Only create/update a change if the new value is different from the actual original value
        if (newValue !== actualOldValue) {
            const change = {
                itemId,
                itemIndex,
                columnKey,
                newValue,
                oldValue: actualOldValue
            };

            setPendingChanges(prev => new Map(prev.set(changeKey, change)));

            // Update item in memory for immediate UI feedback
            setPCFValue(item, columnKey, newValue);

            // Notify parent
            onCellEdit?.(itemId, columnKey, newValue);

            // Update change manager
            if (changeManager) {
                changeManager.addChange(itemId, columnKey, actualOldValue, newValue);
            }
        } else {
            // If the new value equals the actual original value, remove any existing change
            if (existingChange) {
                setPendingChanges(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(changeKey);
                    return newMap;
                });
                
                // Revert the item to original value
                setPCFValue(item, columnKey, actualOldValue);
                
                // Note: We don't remove from changeManager since it doesn't track individual
                // cell changes the same way - the main change tracking is via pendingChanges
            }
        }

        setEditingState(null);
    }, [editingState, filteredItems, onCellEdit, changeManager, pendingChanges]);

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
        
        // Create a snapshot of changes to avoid modification during iteration
        const changesToRevert = Array.from(pendingChanges.entries());
        
        // Revert items to original values
        changesToRevert.forEach(([changeKey, change]) => {
            
            // Use filteredItems to match the same array used in drag fill
            const item = filteredItems[change.itemIndex];
            if (item) {
                const currentValue = getPCFValue(item, change.columnKey);
                
                setPCFValue(item, change.columnKey, change.oldValue);
                
                const valueAfterRevert = getPCFValue(item, change.columnKey);
            } else {
                console.warn(`⚠️ Item not found at index ${change.itemIndex} for change ${changeKey}`);
            }
        });

        setPendingChanges(new Map());
        setEditingState(null);

        // Clear auto-fill confirmations since pending changes are being cancelled
        setPendingAutoFillRows(new Set());

        if (changeManager) {
            changeManager.cancelAllChanges();
        }
        
        // Force grid re-render to show reverted values
        setRefreshTrigger(prev => prev + 1);
        
        // Call the parent cancel handler if provided
        if (onCancelChanges) {
            onCancelChanges();
        }
        
    }, [pendingChanges, filteredItems, changeManager, onCancelChanges, setRefreshTrigger, setPendingAutoFillRows]);

    // Expose methods through ref
    React.useImperativeHandle(ref, () => ({
        commitAllChanges,
        cancelAllChanges,
        getPendingChangesCount: () => pendingChanges.size,
        scrollToIndex: (index: number) => {
            // ENTERPRISE-GRADE LIGHTNING-FAST SCROLLING - Google/Meta competitive
            // Zero-overhead virtualized scrolling with performance optimizations
            if (virtualizer && index >= 0 && index < filteredItems.length) {
                // Performance optimization: Use requestAnimationFrame for smooth 60fps scrolling
                requestAnimationFrame(() => {
                    virtualizer.scrollToIndex(index, { 
                        align: 'start',  // Optimal alignment for record visibility
                        behavior: 'smooth'  // Smooth scrolling for premium UX
                    });
                });
            }
        }
    }), [commitAllChanges, cancelAllChanges, pendingChanges.size, virtualizer, filteredItems.length]);

    // Helper: get frozen CSS properties for a cell at the given column index
    const getFrozenCellStyle = React.useCallback((columnIndex: number, bgColor: string): React.CSSProperties => {
        const info = frozenColumnInfo[columnIndex];
        if (!info?.isFrozen) return {};
        return {
            position: 'sticky',
            left: info.stickyLeft,
            zIndex: 3,
            backgroundColor: bgColor,
        };
    }, [frozenColumnInfo]);

    // Helper: get frozen CSS class names for a cell at the given column index
    const getFrozenCellClassName = React.useCallback((columnIndex: number): string => {
        const info = frozenColumnInfo[columnIndex];
        if (!info?.isFrozen) return '';
        return info.isLastFrozen ? 'frozen-column frozen-column-last' : 'frozen-column';
    }, [frozenColumnInfo]);

    // Render virtualized row
    const renderRowContent = React.useCallback((virtualRow: any) => {
        const { index } = virtualRow;
        const item = filteredItems[index];
        if (!item) return null;

        const isEven = index % 2 === 0;
        const isRowDragTarget = rowDragFillTargets.has(index) && index !== rowDragFillSource;
        const isRowDragSource = rowDragFillSource === index;
        const rowClassName = `virtualized-row ${isEven ? 'even' : 'odd'}${isRowDragTarget ? ' row-drag-target' : ''}${isRowDragSource ? ' row-drag-source' : ''}${hasFrozenColumns ? ' has-frozen-columns' : ''}`;
        
        // Determine row background for frozen cell inheritance
        const rowBg = (alternateRowColor && isEven) ? alternateRowColor : (isEven ? '#ffffff' : '#faf9f8');
        
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
                                className={`virtualized-cell selection-cell ${getFrozenCellClassName(columnIndex)}`}
                                style={{
                                    width: memoizedColumnWidths[columnIndex], // Use the same width calculation as header
                                    minWidth: memoizedColumnWidths[columnIndex],
                                    maxWidth: memoizedColumnWidths[columnIndex],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 8px',
                                    boxSizing: 'border-box', // Ensure consistent box model
                                    ...getFrozenCellStyle(columnIndex, rowBg)
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

                    // Special handling for delete column on new rows
                    if (columnKey === '__delete__' && item.isNewRow && onDeleteNewRow) {
                        const itemId = item.recordId || item.key || item.id || index.toString();
                        
                        return (
                            <div
                                key="__delete__"
                                className={`virtualized-cell delete-cell ${getFrozenCellClassName(columnIndex)}`}
                                style={{
                                    width: memoizedColumnWidths[columnIndex],
                                    minWidth: memoizedColumnWidths[columnIndex],
                                    maxWidth: memoizedColumnWidths[columnIndex],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 8px',
                                    boxSizing: 'border-box',
                                    ...getFrozenCellStyle(columnIndex, rowBg)
                                }}
                            >
                                <button
                                    type="button"
                                    className="delete-row-button"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#d13438',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        padding: '4px',
                                        borderRadius: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px'
                                    }}
                                    onClick={() => onDeleteNewRow(itemId)}
                                    title="Delete this new row"
                                    aria-label="Delete this new row"
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    }

                    // Special handling for auto-fill confirmation column
                    if (columnKey === '__autofill__') {
                        const itemId = item.recordId || item.key || item.id || index.toString();
                        const needsAutoFill = pendingAutoFillRows.has(itemId);
                        
                        return (
                            <div
                                key="__autofill__"
                                className={`virtualized-cell autofill-cell ${getFrozenCellClassName(columnIndex)}`}
                                style={{
                                    width: memoizedColumnWidths[columnIndex],
                                    minWidth: memoizedColumnWidths[columnIndex],
                                    maxWidth: memoizedColumnWidths[columnIndex],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 8px',
                                    boxSizing: 'border-box',
                                    ...getFrozenCellStyle(columnIndex, rowBg)
                                }}
                            >
                                {needsAutoFill ? (
                                    <button
                                        type="button"
                                        className="autofill-confirm-button"
                                        style={{
                                            background: '#0078d4',
                                            border: 'none',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            padding: '4px',
                                            borderRadius: '3px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '24px',
                                            height: '24px'
                                        }}
                                        onClick={() => handleAutoFillConfirmation(itemId)}
                                        title="Apply auto-fill values to this row"
                                        aria-label="Apply auto-fill values to this row"
                                    >
                                        ✓
                                    </button>
                                ) : null}
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

                    // Get alignment styles for this column
                    const alignmentStyles = getAlignmentStyles(column.horizontalAligned, column.verticalAligned);

                    const cellStyle: React.CSSProperties = {
                        width: memoizedColumnWidths[columnIndex],
                        minWidth: memoizedColumnWidths[columnIndex],
                        maxWidth: memoizedColumnWidths[columnIndex],
                        height: '100%',
                        padding: '0 8px',
                        display: 'flex',
                        ...alignmentStyles, // Apply column-specific alignment
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: column.isMultiline ? 'normal' : 'nowrap', // Support multiline display
                        cursor: isReadOnly ? 'default' : 'pointer',
                        backgroundColor: hasChanges ? '#fff4ce' : 'transparent',
                        borderLeft: hasChanges ? '3px solid #ffb900' : 'none',
                        position: 'relative',
                        boxSizing: 'border-box', // Ensure consistent box model
                        fontSize: `${columnTextSize}px`, // Apply custom column text size
                        // Frozen column sticky positioning
                        ...getFrozenCellStyle(columnIndex, hasChanges ? '#fff4ce' : rowBg)
                    };

                    if (isEditing && enableInlineEditing) {
                        const editorConfig = columnEditorMapping[columnKey];
                        
                        // Create enhanced column object with current width from resizing
                        const enhancedColumn = {
                            ...column,
                            currentWidth: columnWidthOverrides[columnKey] || memoizedColumnWidths[columnIndex] || column.maxWidth || column.minWidth || 150
                        };
                        
                        return (
                            <div key={columnKey} style={cellStyle}>
                                {useEnhancedEditors && editorConfig ? (
                                    <EnhancedInlineEditor
                                        value={editingState.originalValue}
                                        column={enhancedColumn}
                                        item={item}
                                        editorConfig={editorConfig}
                                        onCommit={commitEdit}
                                        onCancel={cancelEdit}
                                        onItemChange={handleItemChange}
                                        onTriggerAutoFillConfirmation={triggerAutoFillConfirmation}
                                        allColumns={getCurrentColumnValues(item)}
                                        columnEditorMapping={columnEditorMapping}
                                        columnTextSize={columnTextSize}
                                        style={{ width: '100%', border: 'none', background: 'transparent' }}
                                    />
                                ) : (
                                    <EnhancedInlineEditor
                                        value={editingState.originalValue}
                                        column={enhancedColumn}
                                        item={item}
                                        editorConfig={{
                                            type: dataType === 'date' ? 'date' : 
                                                  dataType === 'number' ? 'number' : 
                                                  dataType === 'boolean' ? 'boolean' : 'text',
                                            isReadOnly: isReadOnly,
                                            dropdownOptions: availableValues?.map(val => {
                                                // Handle both string arrays and key-value object arrays
                                                if (typeof val === 'string') {
                                                    return { key: val, text: val, value: val };
                                                } else if (
                                                    val &&
                                                    typeof val === 'object' &&
                                                    'key' in val &&
                                                    'value' in val
                                                ) {
                                                    return { key: (val as any).key, text: (val as any).key, value: (val as any).value };
                                                }
                                                return { key: val, text: val, value: val };
                                            })
                                        }}
                                        onCommit={commitEdit}
                                        onCancel={cancelEdit}
                                        onTriggerAutoFillConfirmation={triggerAutoFillConfirmation}
                                        columnTextSize={columnTextSize}
                                        style={{ width: '100%', border: 'none', background: 'transparent' }}
                                    />
                                )}
                            </div>
                        );
                    }

                    // Check if this cell is selected and if it's the bottom-right of a multi-cell selection
                    // Disable cell selection visuals when selection mode is enabled (row checkboxes take precedence)
                    const isCellInSelection = !enableSelectionMode && isCellSelected(index, columnKey);
                    const showGreenHandle = !enableSelectionMode && isBottomRightOfSelection(index, columnKey);
                    const showBlueHandle = !enableSelectionMode && !showGreenHandle && (!isCellInSelection || selectedCells.size === 1);

                    return (
                        <div
                            key={columnKey}
                            className={`virtualized-cell ${isReadOnly ? 'read-only' : 'editable'}${isCellInSelection ? ' cell-selected' : ''} ${getFrozenCellClassName(columnIndex)}`}
                            style={{
                                ...cellStyle,
                                outline: isCellInSelection ? '2px solid #0078d4' : 'none',
                                outlineOffset: '-2px',
                                zIndex: isCellInSelection ? 1 : (frozenColumnInfo[columnIndex]?.isFrozen ? 3 : 'auto'),
                            }}
                            onClick={(e) => {
                                if (!isReadOnly) {
                                    // If not selecting, start edit on click
                                    if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
                                        startEdit(index, columnKey);
                                    }
                                }
                            }}
                            onMouseDown={(e) => {
                                // Don't handle cell selection when selection mode is enabled (row checkboxes take precedence)
                                if (!isReadOnly && !enableSelectionMode) {
                                    handleCellMouseDown(e, index, columnKey);
                                }
                            }}
                            onMouseEnter={() => {
                                // Don't handle cell selection when selection mode is enabled
                                if (!isReadOnly && !enableSelectionMode && isSelecting) {
                                    handleCellMouseEnter(index, columnKey);
                                }
                            }}
                            title={hasChanges ? `Changed from: ${pendingChanges.get(cellKey)?.oldValue}` : formatCellValue(cellValue, column.dataType, getColumnDataType, columnKey, columnEditorMapping)}
                        >
                            {column.onRender ? 
                                column.onRender(item, index, column) : 
                                formatCellValue(cellValue, column.dataType, getColumnDataType, columnKey, columnEditorMapping)
                            }
                            {/* Blue handle - single cell drag fill */}
                            {!isReadOnly && enableDragFill && !enableSelectionMode && showBlueHandle && (
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
                                        transition: 'opacity 0.15s ease',
                                        zIndex: 10,
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
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
                                            
                                            // Auto-scroll variables
                                            let currentMouseY = 0;
                                            let autoScrollInterval: ReturnType<typeof setInterval> | null = null;
                                            const SCROLL_EDGE_THRESHOLD = 50; // pixels from edge to trigger scroll
                                            const SCROLL_SPEED = 8; // pixels per interval
                                            
                                            const startAutoScroll = () => {
                                                if (autoScrollInterval) return;
                                                autoScrollInterval = setInterval(() => {
                                                    const scrollContainer = parentRef.current;
                                                    if (!scrollContainer) return;
                                                    
                                                    const rect = scrollContainer.getBoundingClientRect();
                                                    const distanceFromBottom = rect.bottom - currentMouseY;
                                                    const distanceFromTop = currentMouseY - rect.top;
                                                    
                                                    if (distanceFromBottom < SCROLL_EDGE_THRESHOLD && distanceFromBottom > 0) {
                                                        // Scroll down
                                                        scrollContainer.scrollTop += SCROLL_SPEED;
                                                    } else if (distanceFromTop < SCROLL_EDGE_THRESHOLD && distanceFromTop > 0) {
                                                        // Scroll up
                                                        scrollContainer.scrollTop -= SCROLL_SPEED;
                                                    }
                                                }, 16); // ~60fps
                                            };
                                            
                                            const stopAutoScroll = () => {
                                                if (autoScrollInterval) {
                                                    clearInterval(autoScrollInterval);
                                                    autoScrollInterval = null;
                                                }
                                            };
                                            
                                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                                // Update current mouse position for auto-scroll
                                                currentMouseY = moveEvent.clientY;
                                                startAutoScroll();
                                                
                                                // Find the target cell based on mouse position
                                                const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                                                if (element && element.closest('.virtualized-row')) {
                                                    const rowElement = element.closest('.virtualized-row') as HTMLElement;
                                                    const targetIndex = parseInt(rowElement.dataset.index || '0');
                                                    
                                                    // PERFORMANCE: Batch all state updates instead of updating per-cell
                                                    // Collect all changes first, then update state once
                                                    const batchedChanges = new Map<string, any>();
                                                    const keysToRemove: string[] = [];
                                                    
                                                    // Mark previous drag fill changes for removal (but preserve original values)
                                                    dragFillChanges.forEach((_, changeKey) => {
                                                        const [indexStr] = changeKey.split('-');
                                                        const index = parseInt(indexStr);
                                                        // Don't remove the starting cell's original change
                                                        if (index !== startIndex) {
                                                            keysToRemove.push(changeKey);
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
                                                                    originalValue = startOriginalValue;
                                                                } else {
                                                                    if (originalValuesSnapshot.has(changeKey)) {
                                                                        originalValue = originalValuesSnapshot.get(changeKey);
                                                                    } else {
                                                                        const existingChange = pendingChanges.get(changeKey);
                                                                        originalValue = existingChange ? existingChange.oldValue : getPCFValue(targetItem, columnKey);
                                                                        originalValuesSnapshot.set(changeKey, originalValue);
                                                                    }
                                                                }
                                                                
                                                                const change = {
                                                                    itemId,
                                                                    itemIndex: i,
                                                                    columnKey,
                                                                    newValue: startValue,
                                                                    oldValue: originalValue
                                                                };
                                                                
                                                                // Collect changes for batched update
                                                                batchedChanges.set(changeKey, change);
                                                                setPCFValue(targetItem, columnKey, startValue);
                                                                dragFillChanges.set(changeKey, change);
                                                            }
                                                        }
                                                    }
                                                    
                                                    // PERFORMANCE: Single batched state update
                                                    setPendingChanges(prev => {
                                                        const newMap = new Map(prev);
                                                        // Remove old keys
                                                        keysToRemove.forEach(key => newMap.delete(key));
                                                        // Add new changes
                                                        batchedChanges.forEach((change, key) => newMap.set(key, change));
                                                        return newMap;
                                                    });
                                                }
                                            };
                                            
                                            const handleMouseUp = () => {
                                                // Stop auto-scrolling
                                                stopAutoScroll();
                                                
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
                            {/* Green handle - multi-cell selection drag fill (appears at bottom-right of selection) */}
                            {!isReadOnly && enableDragFill && !enableSelectionMode && showGreenHandle && (
                                <div 
                                    className="multi-cell-drag-fill-handle"
                                    style={{
                                        position: 'absolute',
                                        bottom: -2,
                                        right: -2,
                                        width: 10,
                                        height: 10,
                                        backgroundColor: '#107c10',
                                        border: '2px solid white',
                                        borderRadius: '2px',
                                        cursor: 'crosshair',
                                        opacity: 1,
                                        zIndex: 20,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        if (!selectionBounds || selectedCells.size === 0) return;
                                        
                                        // Collect values ONLY from actually selected cells (not entire bounding box)
                                        // selectionValues maps rowOffset -> (columnKey -> value)
                                        const selectionValues = new Map<string, Map<string, any>>();
                                        
                                        // Build a map of which columns are actually selected per row
                                        // This respects Ctrl+click non-contiguous selections
                                        const rowColumnsMap = new Map<number, Set<string>>(); // rowIndex -> Set of columnKeys
                                        const allSelectedColumns = new Set<string>(); // All unique columns across selection
                                        
                                        selectedCells.forEach(cellKey => {
                                            const [rowStr, ...colParts] = cellKey.split('-');
                                            const colKey = colParts.join('-'); // Handle column keys with dashes
                                            const rowIndex = parseInt(rowStr);
                                            
                                            // Skip special columns and read-only columns
                                            if (colKey === '__selection__' || colKey === '__delete__' || colKey === '__autofill__' || readOnlyColumns.includes(colKey)) {
                                                return;
                                            }
                                            
                                            if (!rowColumnsMap.has(rowIndex)) {
                                                rowColumnsMap.set(rowIndex, new Set());
                                            }
                                            rowColumnsMap.get(rowIndex)!.add(colKey);
                                            allSelectedColumns.add(colKey);
                                        });
                                        
                                        // Get the sorted row indices to establish the pattern
                                        const sortedRows = Array.from(rowColumnsMap.keys()).sort((a, b) => a - b);
                                        const selectionHeight = sortedRows.length;
                                        
                                        if (selectionHeight === 0) return;
                                        
                                        // Get values for each selected row (only the actually selected columns)
                                        for (let rowOffset = 0; rowOffset < selectionHeight; rowOffset++) {
                                            const sourceRowIndex = sortedRows[rowOffset];
                                            const sourceItem = filteredItems[sourceRowIndex];
                                            const selectedColumnsForRow = rowColumnsMap.get(sourceRowIndex);
                                            
                                            if (sourceItem && selectedColumnsForRow) {
                                                const rowValues = new Map<string, any>();
                                                selectedColumnsForRow.forEach(colKey => {
                                                    rowValues.set(colKey, getPCFValue(sourceItem, colKey));
                                                });
                                                selectionValues.set(rowOffset.toString(), rowValues);
                                            }
                                        }
                                        
                                        const multiCellDragChanges = new Map<string, any>();
                                        const originalValuesSnapshot = new Map<string, any>();
                                        
                                        // Pre-populate with existing pending changes
                                        pendingChanges.forEach((change, changeKey) => {
                                            originalValuesSnapshot.set(changeKey, change.oldValue);
                                        });
                                        
                                        // Set visual feedback
                                        setRowDragFillSource(selectionBounds.startRow);
                                        setRowDragFillTargets(new Set());
                                        
                                        // Auto-scroll variables for multi-cell drag fill
                                        let currentMouseY = 0;
                                        let autoScrollInterval: ReturnType<typeof setInterval> | null = null;
                                        const SCROLL_EDGE_THRESHOLD = 50; // pixels from edge to trigger scroll
                                        const SCROLL_SPEED = 8; // pixels per interval
                                        
                                        const startAutoScroll = () => {
                                            if (autoScrollInterval) return;
                                            autoScrollInterval = setInterval(() => {
                                                const scrollContainer = parentRef.current;
                                                if (!scrollContainer) return;
                                                
                                                const rect = scrollContainer.getBoundingClientRect();
                                                const distanceFromBottom = rect.bottom - currentMouseY;
                                                const distanceFromTop = currentMouseY - rect.top;
                                                
                                                if (distanceFromBottom < SCROLL_EDGE_THRESHOLD && distanceFromBottom > 0) {
                                                    // Scroll down
                                                    scrollContainer.scrollTop += SCROLL_SPEED;
                                                } else if (distanceFromTop < SCROLL_EDGE_THRESHOLD && distanceFromTop > 0) {
                                                    // Scroll up
                                                    scrollContainer.scrollTop -= SCROLL_SPEED;
                                                }
                                            }, 16); // ~60fps
                                        };
                                        
                                        const stopAutoScroll = () => {
                                            if (autoScrollInterval) {
                                                clearInterval(autoScrollInterval);
                                                autoScrollInterval = null;
                                            }
                                        };
                                        
                                        const handleMouseMove = (moveEvent: MouseEvent) => {
                                            // Update current mouse position for auto-scroll
                                            currentMouseY = moveEvent.clientY;
                                            startAutoScroll();
                                            
                                            const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                                            if (element && element.closest('.virtualized-row')) {
                                                const rowElement = element.closest('.virtualized-row') as HTMLElement;
                                                const targetEndRow = parseInt(rowElement.dataset.index || '0');
                                                
                                                // Only fill downward from the selection end
                                                if (targetEndRow <= selectionBounds.endRow) {
                                                    setRowDragFillTargets(new Set());
                                                    return;
                                                }
                                                
                                                // Update visual feedback
                                                const newTargets = new Set<number>();
                                                for (let r = selectionBounds.endRow + 1; r <= targetEndRow; r++) {
                                                    newTargets.add(r);
                                                }
                                                setRowDragFillTargets(newTargets);
                                                
                                                // PERFORMANCE: Batch all state updates
                                                const keysToRemove: string[] = [];
                                                const batchedChanges = new Map<string, any>();
                                                
                                                // Mark previous changes for removal
                                                multiCellDragChanges.forEach((_, changeKey) => {
                                                    const [indexStr] = changeKey.split('-');
                                                    const idx = parseInt(indexStr);
                                                    if (idx > selectionBounds.endRow) {
                                                        keysToRemove.push(changeKey);
                                                    }
                                                });
                                                multiCellDragChanges.clear();
                                                
                                                // Fill with repeating pattern from selection
                                                for (let targetRow = selectionBounds.endRow + 1; targetRow <= targetEndRow; targetRow++) {
                                                    const targetItem = filteredItems[targetRow];
                                                    if (targetItem) {
                                                        const itemId = targetItem.key || targetItem.id || targetItem.getRecordId?.() || targetRow.toString();
                                                        // Calculate which source row in the pattern to use
                                                        const patternIndex = (targetRow - selectionBounds.endRow - 1) % selectionHeight;
                                                        const sourceRowValues = selectionValues.get(patternIndex.toString());
                                                        
                                                        if (sourceRowValues) {
                                                            // Only apply values for columns that were actually selected in this source row
                                                            sourceRowValues.forEach((newValue, colKey) => {
                                                                const changeKey = getCellKey(targetRow, colKey);
                                                                
                                                                let originalValue: any;
                                                                if (originalValuesSnapshot.has(changeKey)) {
                                                                    originalValue = originalValuesSnapshot.get(changeKey);
                                                                } else {
                                                                    const existingChange = pendingChanges.get(changeKey);
                                                                    originalValue = existingChange ? existingChange.oldValue : getPCFValue(targetItem, colKey);
                                                                    originalValuesSnapshot.set(changeKey, originalValue);
                                                                }
                                                                
                                                                const change = {
                                                                    itemId,
                                                                    itemIndex: targetRow,
                                                                    columnKey: colKey,
                                                                    newValue,
                                                                    oldValue: originalValue
                                                                };
                                                                
                                                                // Collect for batched update
                                                                batchedChanges.set(changeKey, change);
                                                                setPCFValue(targetItem, colKey, newValue);
                                                                multiCellDragChanges.set(changeKey, change);
                                                            });
                                                        }
                                                    }
                                                }
                                                
                                                // PERFORMANCE: Single batched state update
                                                setPendingChanges(prev => {
                                                    const newMap = new Map(prev);
                                                    // Remove old keys
                                                    keysToRemove.forEach(key => newMap.delete(key));
                                                    // Add new changes
                                                    batchedChanges.forEach((change, key) => newMap.set(key, change));
                                                    return newMap;
                                                });
                                            }
                                        };
                                        
                                        const handleMouseUp = () => {
                                            // Stop auto-scrolling
                                            stopAutoScroll();
                                            
                                            setRowDragFillSource(null);
                                            setRowDragFillTargets(new Set());
                                            
                                            if (multiCellDragChanges.size > 0 && onCellEdit) {
                                                Array.from(multiCellDragChanges.values()).forEach(change => {
                                                    onCellEdit(change.itemId, change.columnKey, change.newValue);
                                                });
                                            }
                                            
                                            // Clear selection after drag fill
                                            setSelectedCells(new Set());
                                            setSelectionAnchor(null);
                                            setRefreshTrigger(prev => prev + 1);
                                            
                                            document.removeEventListener('mousemove', handleMouseMove);
                                            document.removeEventListener('mouseup', handleMouseUp);
                                        };
                                        
                                        document.addEventListener('mousemove', handleMouseMove);
                                        document.addEventListener('mouseup', handleMouseUp);
                                    }}
                                    title="Drag to copy selected cells to rows below"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }, [filteredItems, columns, memoizedColumnWidths, editingState, pendingChanges, readOnlyColumns, enableInlineEditing, enableDragFill, startEdit, commitEdit, cancelEdit, memoizedAvailableValues, onItemClick, onItemDoubleClick, refreshTrigger, effectiveColumns, enableSelectionMode, onCellEdit, rowDragFillTargets, rowDragFillSource, selectedCells, selectionBounds, isCellSelected, isBottomRightOfSelection, handleCellMouseDown, handleCellMouseEnter, isSelecting, setSelectedCells, setSelectionAnchor, frozenColumnInfo, hasFrozenColumns, getFrozenCellStyle, getFrozenCellClassName]);

    // PERFORMANCE OPTIMIZATION: Create stable render function to prevent unnecessary re-renders
    const renderRow = React.useCallback((virtualRow: any) => {
        return renderRowContent(virtualRow);
    }, [renderRowContent]);

    // Calculate the maximum header height needed across all columns
    const uniformHeaderHeight = React.useMemo(() => {
        if (!enableHeaderTextWrapping) return '48px';
        
        let maxHeight = 20; // Start with minimum height of 20px
        
        // Calculate height needed for each column individually
        effectiveColumns.forEach((col, index) => {
            const headerText = col.name || '';
            
            // Get the actual column width - use the memoized width which handles custom ColWidth properly
            const actualColumnWidth = memoizedColumnWidths[index];
            if (!actualColumnWidth) return; // Skip if no width available
            
            // Check text alignment - center/right aligned text is less likely to wrap naturally
            const headerAlignment = col.headerHorizontalAligned || 'start';
            const isNonLeftAligned = headerAlignment === 'center' || headerAlignment === 'end' || headerAlignment === 'right';
            
            // Account for horizontal padding (20px: 8px left + 12px right) and filter icon space (~20px)
            // For center/right aligned text, be more conservative as wrapping looks worse
            const paddingAndIconSpace = isNonLeftAligned ? 35 : 30;
            const availableTextWidth = Math.max(60, actualColumnWidth - paddingAndIconSpace);
            
            // Conservative character width estimate - use 7px for left-aligned, 8px for center/right
            const charWidth = isNonLeftAligned ? 8 : 7;
            const charsPerLine = Math.floor(availableTextWidth / charWidth);
            const estimatedLines = Math.max(1, Math.ceil(headerText.length / charsPerLine));
            
            // Only add extra height if we're actually wrapping (more than 1 line)
            let columnHeight;
            if (estimatedLines > 1) {
                // Multiple lines: minimal padding + lines * tight line height
                columnHeight = 4 + (estimatedLines * 16);
            } else {
                // Single line: use minimum height
                columnHeight = 20;
            }
            
            // Update max height if this column needs more space
            maxHeight = Math.max(maxHeight, columnHeight);
        });
        
        // Ensure reasonable bounds: minimum 20px, maximum 120px
        return `${Math.max(20, Math.min(120, maxHeight))}px`;
    }, [enableHeaderTextWrapping, effectiveColumns, memoizedColumnWidths]);

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
                height: uniformHeaderHeight // Use calculated height for both wrapped and non-wrapped states
            }}
        >
            {effectiveColumns.map((column, index) => {
                const columnKey = column.key || column.fieldName || index.toString();
                
                // Special handling for selection column
                if (columnKey === '__selection__') {
                    return (
                        <div
                            key="__selection__"
                            className={`virtualized-header-cell selection-header ${getFrozenCellClassName(index)}`}
                            style={{ 
                                width: memoizedColumnWidths[index], // Use the same width calculation as data cells
                                minWidth: memoizedColumnWidths[index],
                                maxWidth: memoizedColumnWidths[index],
                                height: '100%', // Fill the full height of the header container
                                position: frozenColumnInfo[index]?.isFrozen ? 'sticky' : 'relative',
                                left: frozenColumnInfo[index]?.isFrozen ? frozenColumnInfo[index].stickyLeft : undefined,
                                zIndex: frozenColumnInfo[index]?.isFrozen ? 7 : undefined,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#faf9f8',
                                padding: '0 8px', // Match data cell padding exactly
                                boxSizing: 'border-box', // Ensure consistent box model
                                overflow: 'hidden'
                            }}
                        >
                            {/* Only show Select All checkbox for Multiple selection mode (selectionType === '2') */}
                            {selectionType === '2' && (
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
                            )}
                        </div>
                    );
                }

                // Special handling for delete column header (only show if there are new rows)
                if (columnKey === '__delete__') {
                    const hasNewRows = filteredItems.some(item => item.isNewRow);
                    
                    return (
                        <div
                            key="__delete__"
                            className={`virtualized-header-cell delete-header ${getFrozenCellClassName(index)}`}
                            style={{ 
                                width: memoizedColumnWidths[index],
                                minWidth: memoizedColumnWidths[index],
                                maxWidth: memoizedColumnWidths[index],
                                position: frozenColumnInfo[index]?.isFrozen ? 'sticky' : 'relative',
                                left: frozenColumnInfo[index]?.isFrozen ? frozenColumnInfo[index].stickyLeft : undefined,
                                zIndex: frozenColumnInfo[index]?.isFrozen ? 7 : undefined,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#faf9f8',
                                padding: '0 8px',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                opacity: hasNewRows ? 1 : 0.3 // Dim when no new rows
                            }}
                            title={hasNewRows ? "Delete individual new rows" : "No new rows to delete"}
                        >
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                🗑️
                            </span>
                        </div>
                    );
                }

                // Special handling for auto-fill confirmation column header
                if (columnKey === '__autofill__') {
                    const hasRowsNeedingAutoFill = pendingAutoFillRows.size > 0;
                    
                    return (
                        <div
                            key="__autofill__"
                            className={`virtualized-header-cell autofill-header ${getFrozenCellClassName(index)}`}
                            style={{ 
                                width: memoizedColumnWidths[index],
                                minWidth: memoizedColumnWidths[index],
                                maxWidth: memoizedColumnWidths[index],
                                position: frozenColumnInfo[index]?.isFrozen ? 'sticky' : 'relative',
                                left: frozenColumnInfo[index]?.isFrozen ? frozenColumnInfo[index].stickyLeft : undefined,
                                zIndex: frozenColumnInfo[index]?.isFrozen ? 7 : undefined,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#faf9f8',
                                padding: '0 8px',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                opacity: hasRowsNeedingAutoFill ? 1 : 0.6
                            }}
                            title={hasRowsNeedingAutoFill ? "Confirm auto-fill for new rows" : "Auto-fill confirmation"}
                        >
                            <span style={{ fontSize: '12px', color: '#0078d4', fontWeight: 600 }}>
                                Auto Fill
                            </span>
                        </div>
                    );
                }
                
                const hasFilter = columnFilters[column.key]?.isActive && columnFilters[column.key]?.conditions?.length > 0;
                const dataType = getColumnDataType?.(column.key) || 'text';
                
                // Get header alignment styles for this column
                const headerAlignmentStyles = getAlignmentStyles(column.headerHorizontalAligned, column.headerVerticalAligned);
                
                const isFrozenHeader = frozenColumnInfo[index]?.isFrozen;
                
                return (
                    <div
                        key={column.key}
                        className={`virtualized-header-cell ${isResizing === column.key ? 'resizing' : ''} ${getFrozenCellClassName(index)}`}
                        style={{ 
                            width: memoizedColumnWidths[index],
                            minWidth: memoizedColumnWidths[index],
                            maxWidth: memoizedColumnWidths[index],
                            height: '100%', // Fill the full height of the header container
                            position: isFrozenHeader ? 'sticky' : 'relative',
                            left: isFrozenHeader ? frozenColumnInfo[index].stickyLeft : undefined,
                            zIndex: isFrozenHeader ? 7 : undefined,
                            display: 'flex',
                            alignItems: enableHeaderTextWrapping ? 'flex-start' : 'center', // Top align when wrapping
                            justifyContent: 'flex-start',
                            background: '#faf9f8',
                            padding: enableHeaderTextWrapping ? '2px 8px 2px 8px' : '0 8px 0 8px',
                            boxSizing: 'border-box', // Ensure consistent box model
                            overflow: 'hidden'
                        }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setFreezeContextMenu({
                                visible: true,
                                x: e.clientX,
                                y: e.clientY,
                                columnKey: column.key || column.fieldName || '',
                                columnName: column.name || ''
                            });
                        }}
                    >
                        <span 
                            className="virtualized-header-text"
                            style={{ 
                                flex: 1, 
                                fontWeight: 600,
                                fontSize: `${headerTextSize}px`, // Apply custom header text size
                                overflow: 'hidden',
                                textOverflow: enableHeaderTextWrapping ? 'clip' : 'ellipsis',
                                whiteSpace: enableHeaderTextWrapping ? 'normal' : 'nowrap',
                                wordWrap: enableHeaderTextWrapping ? 'break-word' : 'normal',
                                lineHeight: enableHeaderTextWrapping ? 1 : 'normal', // Tight line height for wrapped text
                                textAlign: column.headerHorizontalAligned === 'center' ? 'center' : 
                                          column.headerHorizontalAligned === 'end' ? 'right' : 'left' // Apply text alignment
                            }}
                        >
                            {column.name}
                            {isFrozenHeader && (
                                <span className="frozen-column-indicator" title="Frozen column">
                                    <svg width="11" height="11" viewBox="0 0 16 16" fill="#0078d4" style={{ display: 'block' }}>
                                        <path d="M8 1v3.5L5.5 6 4 4.5 2.5 6 4 7.5 2 9h3.5L8 11.5V15h0V11.5L10.5 9H14l-2-1.5L13.5 6 12 4.5 10.5 6 8 4.5V1z"/>
                                    </svg>
                                </span>
                            )}
                        </span>
                        
                        {/* Filter icon – absolutely positioned at bottom-right so it never overlaps header text */}
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
                                    padding: '1px',
                                    borderRadius: '3px',
                                    backgroundColor: hasFilter ? 'rgba(0, 120, 212, 0.1)' : 'transparent',
                                    border: hasFilter ? '1px solid rgba(0, 120, 212, 0.3)' : '1px solid transparent',
                                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '16px',
                                    height: '16px',
                                    position: 'absolute',
                                    right: '3px',
                                    bottom: '2px',
                                    zIndex: 20,
                                    boxShadow: hasFilter ? '0 1px 3px rgba(0, 120, 212, 0.2)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                    const target = e.target as HTMLElement;
                                    if (!hasFilter) {
                                        target.style.backgroundColor = 'rgba(0, 120, 212, 0.05)';
                                        target.style.borderColor = 'rgba(0, 120, 212, 0.2)';
                                        target.style.transform = 'scale(1.1)';
                                    } else {
                                        target.style.backgroundColor = 'rgba(0, 120, 212, 0.15)';
                                        target.style.transform = 'scale(1.1)';
                                        target.style.boxShadow = '0 3px 6px rgba(0, 120, 212, 0.3)';
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
                                        target.style.boxShadow = '0 1px 3px rgba(0, 120, 212, 0.2)';
                                    }
                                }}
                            >
                                <svg
                                    width="12"
                                    height="12"
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
                                    {hasFilter && (
                                        <circle cx="12" cy="4" r="2" fill="#ff6b35" stroke="white" strokeWidth="0.5" />
                                    )}
                                </svg>
                            </span>
                        )}

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

            {/* Header - Scroll synced with body for frozen column sticky support */}
            <div 
                ref={headerRef}
                className="virtualized-header-container"
                style={{
                    width: '100%',
                    overflowX: 'auto', // Enable scrollLeft sync so position:sticky works on frozen headers
                    overflowY: 'hidden',
                    flexShrink: 0,
                    position: 'relative',
                    scrollbarWidth: 'none', // Hide scrollbar (Firefox)
                    msOverflowStyle: 'none', // Hide scrollbar (IE/Edge)
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
                    currentFilters={convertFiltersToSimpleFormat(columnFilters)}
                    onFilterChange={handleColumnFilterChange}
                    target={filterTargets[activeFilterColumn]}
                    onDismiss={() => setActiveFilterColumn(null)}
                    isOpen={!!activeFilterColumn}
                    getAvailableValues={getAvailableValuesForFilter}
                />
            )}

            {/* Freeze/Unfreeze Column Context Menu */}
            {freezeContextMenu?.visible && (
                <div
                    className="freeze-column-context-menu"
                    style={{ left: freezeContextMenu.x, top: freezeContextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {frozenColumnKeys.has(freezeContextMenu.columnKey) ? (
                        <>
                            <div
                                className="freeze-column-context-menu-item"
                                onClick={() => { toggleFreezeColumn(freezeContextMenu.columnKey); setFreezeContextMenu(null); }}
                            >
                                <span className="menu-icon">🔓</span>
                                Unfreeze "{freezeContextMenu.columnName}"
                            </div>
                            <div
                                className="freeze-column-context-menu-item"
                                onClick={() => { unfreezeAllColumns(); setFreezeContextMenu(null); }}
                            >
                                <span className="menu-icon">🔓</span>
                                Unfreeze All Columns
                            </div>
                        </>
                    ) : (
                        <div
                            className="freeze-column-context-menu-item"
                            onClick={() => { toggleFreezeColumn(freezeContextMenu.columnKey); setFreezeContextMenu(null); }}
                        >
                            <span className="menu-icon">❄️</span>
                            Freeze "{freezeContextMenu.columnName}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

VirtualizedEditableGrid.displayName = 'VirtualizedEditableGrid';

export default VirtualizedEditableGrid;
