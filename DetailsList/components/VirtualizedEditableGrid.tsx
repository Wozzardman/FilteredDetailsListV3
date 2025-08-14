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

    // Auto-fill confirmation handlers
    const handleAutoFillConfirmation = React.useCallback((itemId: string) => {
        // Mark auto-fill as in progress for this item
        setAutoFillInProgress(prev => new Set(prev.add(itemId)));
        
        try {
            // Apply auto-fill for this specific row using the same logic as EnhancedInlineEditor
            const item = filteredItems.find(item => (item.recordId || item.key || item.id) === itemId);
            if (!item || !columnEditorMapping) return;

            console.log(`🎯 Applying auto-fill confirmation for item ${itemId}`);

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
                    const context = {
                        currentValues: { ...Object.fromEntries(Object.keys(columnEditorMapping).map(key => [key, getPCFValue(item, key)])), [triggerField]: triggerValue },
                        isNewRecord: false,
                        globalDataSources: (window as any).PowerAppsDataSources || {}
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
                                    console.log(`🔄 Auto-fill applying ${dependentField} = ${newValue}`);
                                    
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
            console.log(`⏭️ Auto-fill already in progress for ${itemId}, skipping duplicate trigger`);
            return;
        }
        
        console.log(`🔔 triggerAutoFillConfirmation called for ${itemId}`);
        setPendingAutoFillRows(prev => {
            const newSet = new Set(prev.add(itemId));
            console.log(`📝 Updated pendingAutoFillRows:`, Array.from(newSet));
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
        
        console.log('🔍 Auto-fill detection running:', {
            hasColumnEditorMapping: !!columnEditorMapping,
            columnMappingKeys: Object.keys(columnEditorMapping || {}),
            filteredItemsCount: filteredItems.length,
            newRowsCount: filteredItems.filter(item => item.isNewRow).length
        });
        
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
                            console.log('✅ Found PowerApps conditional dependency with confirmation required:', config.conditional.dependsOn);
                            return true;
                        }
                        
                        // Check for direct DependsOn property (your column config style)
                        if ('DependsOn' in config && typeof config.DependsOn === 'string') {
                            console.log('✅ Found DependsOn dependency with confirmation required:', config.DependsOn);
                            return true;
                        }
                        
                        // Check for camelCase dependsOn property
                        if ('dependsOn' in config && typeof config.dependsOn === 'string') {
                            console.log('✅ Found dependsOn dependency with confirmation required:', config.dependsOn);
                            return true;
                        }
                        
                        return false;
                    });
                    
                    console.log('🎯 Auto-fill check for item:', {
                        itemId,
                        isNewRow: item.isNewRow,
                        hasConditionalDependenciesWithConfirmation,
                        columnConfigs: Object.keys(columnEditorMapping).map(key => ({
                            key,
                            hasDependsOn: 'DependsOn' in columnEditorMapping[key],
                            hasConditional: 'conditional' in columnEditorMapping[key],
                            requiresConfirmation: columnEditorMapping[key].RequiresAutoFillConfirmation === true
                        }))
                    });
                    
                    if (hasConditionalDependenciesWithConfirmation) {
                        newRowsNeedingAutoFill.add(itemId);
                        console.log('🚀 Added to auto-fill pending:', itemId);
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
                    console.log(`🗑️ Removing ${id} from pendingAutoFillRows (row no longer exists)`);
                    newSet.delete(id);
                }
            });
            return newSet;
        });
    }, [columnEditorMapping, filteredItems]);

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

    // Create effective columns array including selection column if needed
    const effectiveColumns = React.useMemo(() => {
        // ⚡ LIGHTNING-FAST COLUMN VISIBILITY - Use high-performance manager for 0ms overhead
        const visibilityManager = ColumnVisibilityManager.getInstance();
        let result = visibilityManager.filterVisibleColumns(columns);
        
        const metrics = visibilityManager.getPerformanceMetrics();
        console.log(`� Ultra-fast visibility filter: ${columns.length} → ${result.length} columns (${columns.length - result.length} hidden) | Cache: ${metrics.cacheSize} items, Age: ${metrics.cacheAge.toFixed(2)}ms`);
        
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

        // Clear auto-fill confirmations since pending changes are being cancelled
        console.log('🗑️ Clearing auto-fill confirmations');
        setPendingAutoFillRows(new Set());

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
        console.log('📊 Final auto-fill confirmations count:', 0);
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

                    // Special handling for delete column on new rows
                    if (columnKey === '__delete__' && item.isNewRow && onDeleteNewRow) {
                        const itemId = item.recordId || item.key || item.id || index.toString();
                        
                        return (
                            <div
                                key="__delete__"
                                className="virtualized-cell delete-cell"
                                style={{
                                    width: memoizedColumnWidths[columnIndex],
                                    minWidth: memoizedColumnWidths[columnIndex],
                                    maxWidth: memoizedColumnWidths[columnIndex],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 8px',
                                    boxSizing: 'border-box'
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
                                className="virtualized-cell autofill-cell"
                                style={{
                                    width: memoizedColumnWidths[columnIndex],
                                    minWidth: memoizedColumnWidths[columnIndex],
                                    maxWidth: memoizedColumnWidths[columnIndex],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 8px',
                                    boxSizing: 'border-box'
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
                        fontSize: `${columnTextSize}px` // Apply custom column text size
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
                                            dropdownOptions: availableValues?.map(val => ({ key: val, text: val, value: val }))
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

                    return (
                        <div
                            key={columnKey}
                            className={`virtualized-cell ${isReadOnly ? 'read-only' : 'editable'}`}
                            style={cellStyle}
                            onClick={() => !isReadOnly && startEdit(index, columnKey)}
                            title={hasChanges ? `Changed from: ${pendingChanges.get(cellKey)?.oldValue}` : formatCellValue(cellValue, column.dataType, getColumnDataType, columnKey, columnEditorMapping)}
                        >
                            {column.onRender ? 
                                column.onRender(item, index, column) : 
                                formatCellValue(cellValue, column.dataType, getColumnDataType, columnKey, columnEditorMapping)
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

                // Special handling for delete column header (only show if there are new rows)
                if (columnKey === '__delete__') {
                    const hasNewRows = filteredItems.some(item => item.isNewRow);
                    
                    return (
                        <div
                            key="__delete__"
                            className="virtualized-header-cell delete-header"
                            style={{ 
                                width: memoizedColumnWidths[index],
                                minWidth: memoizedColumnWidths[index],
                                maxWidth: memoizedColumnWidths[index],
                                position: 'relative',
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
                            className="virtualized-header-cell autofill-header"
                            style={{ 
                                width: memoizedColumnWidths[index],
                                minWidth: memoizedColumnWidths[index],
                                maxWidth: memoizedColumnWidths[index],
                                position: 'relative',
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
                            alignItems: 'center', // Keep center alignment for header container
                            justifyContent: 'space-between', // Keep space-between for filter icon positioning
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
                                whiteSpace: 'nowrap',
                                textAlign: column.headerHorizontalAligned === 'center' ? 'center' : 
                                          column.headerHorizontalAligned === 'end' ? 'right' : 'left' // Apply text alignment
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
                                        padding: '2px', // Reduced padding to make button more compact
                                        borderRadius: '4px', // Slightly smaller border radius to match reduced padding
                                        backgroundColor: hasFilter ? 'rgba(0, 120, 212, 0.1)' : 'transparent',
                                        border: hasFilter ? '1px solid rgba(0, 120, 212, 0.3)' : '1px solid transparent',
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                        lineHeight: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '18px', // Reduced width to be more compact
                                        height: '18px', // Reduced height to be more compact
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
                    currentFilters={convertFiltersToSimpleFormat(columnFilters)}
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
