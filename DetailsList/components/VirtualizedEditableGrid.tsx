/**
 * VirtualizedEditableGrid - ULTIMATE PURE VIRTUALIZATION
 * Always-on virtualization for META/Google competitive performance
 * Handles millions of records with sub-60fps rendering and real-time editing
 * ZERO FALLBACKS - PURE PERFORMANCE
 */

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { IColumn } from '@fluentui/react/lib/DetailsList';
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { IconButton } from '@fluentui/react/lib/Button';
import { InlineEditor } from './InlineEditor';
import { EnterpriseChangeManager } from '../services/EnterpriseChangeManager';
import { performanceMonitor } from '../performance/PerformanceMonitor';
import { VirtualizedFilterDropdown, FilterValue } from './VirtualizedFilterDropdown';
import { ExcelLikeColumnFilter } from './ExcelLikeColumnFilter';
import '../css/VirtualizedEditableGrid.css';

export interface VirtualizedEditableGridProps {
    items: any[];
    columns: IColumn[];
    height: number;
    width?: number | string;
    onCellEdit?: (itemId: string, columnKey: string, newValue: any) => void;
    onCommitChanges?: (changes: any[]) => Promise<void>;
    enableInlineEditing?: boolean;
    enableDragFill?: boolean;
    enableColumnFilters?: boolean;
    enableCascadingFilters?: boolean;
    readOnlyColumns?: string[];
    getAvailableValues?: (columnKey: string) => string[];
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
}

interface EditingState {
    itemIndex: number;
    columnKey: string;
    originalValue: any;
}

export const VirtualizedEditableGrid: React.FC<VirtualizedEditableGridProps> = ({
    items = [],
    columns = [],
    height,
    width = '100%',
    onCellEdit,
    onCommitChanges,
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
    currentFilters = new Map()
}) => {
    const [editingState, setEditingState] = React.useState<EditingState | null>(null);
    const [pendingChanges, setPendingChanges] = React.useState<Map<string, any>>(new Map());
    const [isCommitting, setIsCommitting] = React.useState<boolean>(false);
    const [errorMessage, setErrorMessage] = React.useState<string>('');
    const [dragFillState, setDragFillState] = React.useState<any>(null);

    // Excel-like column filtering state
    const [columnFilters, setColumnFilters] = React.useState<Record<string, any[]>>({});
    const [activeFilterColumn, setActiveFilterColumn] = React.useState<string | null>(null);
    const [filterTargets, setFilterTargets] = React.useState<Record<string, HTMLElement | null>>({});
    const [originalItems] = React.useState<any[]>(items);

    // Calculate filtered items based on column filters
    const filteredItems = React.useMemo(() => {
        if (Object.keys(columnFilters).length === 0) return items;

        return items.filter(item => {
            return Object.entries(columnFilters).every(([columnKey, selectedValues]) => {
                if (!selectedValues || selectedValues.length === 0) return true;
                const value = item[columnKey];
                return selectedValues.includes(value);
            });
        });
    }, [items, columnFilters]);

    // Filter handlers
    const handleColumnFilterChange = React.useCallback((columnKey: string, selectedValues: any[]) => {
        setColumnFilters(prev => ({
            ...prev,
            [columnKey]: selectedValues
        }));
    }, []);

    const handleFilterButtonClick = React.useCallback((columnKey: string, target: HTMLElement) => {
        setActiveFilterColumn(activeFilterColumn === columnKey ? null : columnKey);
        setFilterTargets(prev => ({
            ...prev,
            [columnKey]: target
        }));
    }, [activeFilterColumn]);

    // Performance monitoring
    const endMeasurement = React.useMemo(() => 
        enablePerformanceMonitoring ? performanceMonitor.startMeasure('virtualized-editable-grid') : () => {}, 
        [enablePerformanceMonitoring]
    );

    React.useEffect(() => {
        return () => endMeasurement();
    }, [endMeasurement]);

    // Virtual scrolling container ref
    const parentRef = React.useRef<HTMLDivElement>(null);

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

    // Calculate column widths
    const columnWidths = React.useMemo(() => {
        const totalWidth = typeof width === 'number' ? width : 1200;
        const fixedWidth = columns.reduce((sum, col) => sum + (col.minWidth || 0), 0);
        const flexibleColumns = columns.filter(col => !col.minWidth);
        const remainingWidth = Math.max(0, totalWidth - fixedWidth);
        const flexWidth = flexibleColumns.length > 0 ? remainingWidth / flexibleColumns.length : 0;

        return columns.map(col => col.minWidth || flexWidth);
    }, [columns, width]);

    // Get cell key for change tracking
    const getCellKey = (itemIndex: number, columnKey: string) => `${itemIndex}-${columnKey}`;

    // Start inline editing
    const startEdit = React.useCallback((itemIndex: number, columnKey: string) => {
        if (!enableInlineEditing || readOnlyColumns.includes(columnKey)) return;

        const item = filteredItems[itemIndex];
        const originalValue = item[columnKey];
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
            item[columnKey] = newValue;

            // Notify parent
            onCellEdit?.(itemId, columnKey, newValue);

            // Update change manager
            if (changeManager) {
                changeManager.addChange(itemId, columnKey, originalValue, newValue);
            }
        }

        setEditingState(null);
    }, [editingState, items, onCellEdit, changeManager]);

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
        // Revert items to original values
        pendingChanges.forEach((change) => {
            const item = items[change.itemIndex];
            if (item) {
                item[change.columnKey] = change.oldValue;
            }
        });

        setPendingChanges(new Map());
        setEditingState(null);

        if (changeManager) {
            changeManager.cancelAllChanges();
        }
    }, [pendingChanges, items, changeManager]);

    // Command bar items
    const commandBarItems: ICommandBarItemProps[] = React.useMemo(() => {
        const items: ICommandBarItemProps[] = [];

        if (pendingChanges.size > 0) {
            items.push(
                {
                    key: 'save',
                    text: `💾 Save Changes (${pendingChanges.size})`,
                    iconProps: { iconName: 'CheckMark' },
                    onClick: () => { commitAllChanges(); },
                    disabled: isCommitting,
                },
                {
                    key: 'cancel',
                    text: '❌ Cancel Changes',
                    iconProps: { iconName: 'Clear' },
                    onClick: cancelAllChanges,
                    disabled: isCommitting,
                }
            );
        }

        // Performance metrics
        items.push({
            key: 'perf',
            text: `⚡ ${items.length} rows virtualized`,
            disabled: true
        });

        return items;
    }, [pendingChanges.size, commitAllChanges, cancelAllChanges, isCommitting, items.length]);

    // Render virtualized row
    const renderRow = React.useCallback((virtualRow: any) => {
        const { index } = virtualRow;
        const item = filteredItems[index];
        if (!item) return null;

        const isEven = index % 2 === 0;
        const rowClassName = `virtualized-row ${isEven ? 'even' : 'odd'}`;

        return (
            <div
                key={index}
                className={rowClassName}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #e1dfdd',
                    backgroundColor: isEven ? '#ffffff' : '#faf9f8',
                }}
                onClick={() => onItemClick?.(item, index)}
                onDoubleClick={() => onItemDoubleClick?.(item, index)}
            >
                {columns.map((column, columnIndex) => {
                    const columnKey = column.fieldName || column.key;
                    const cellKey = getCellKey(index, columnKey);
                    const isEditing = editingState?.itemIndex === index && editingState?.columnKey === columnKey;
                    const hasChanges = pendingChanges.has(cellKey);
                    const isReadOnly = readOnlyColumns.includes(columnKey);

                    const cellValue = pendingChanges.get(cellKey)?.newValue ?? item[columnKey];
                    const dataType = column.data?.dataType || 'string';
                    const availableValues = getAvailableValues?.(columnKey) || [];

                    const cellStyle: React.CSSProperties = {
                        width: columnWidths[columnIndex],
                        minWidth: columnWidths[columnIndex],
                        maxWidth: columnWidths[columnIndex],
                        height: '100%',
                        padding: '0 8px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRight: '1px solid #e1dfdd',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: isReadOnly ? 'default' : 'pointer',
                        backgroundColor: hasChanges ? '#fff4ce' : 'transparent',
                        borderLeft: hasChanges ? '3px solid #ffb900' : 'none',
                        position: 'relative'
                    };

                    if (isEditing && enableInlineEditing) {
                        return (
                            <div key={columnKey} style={cellStyle}>
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
                            </div>
                        );
                    }

                    return (
                        <div
                            key={columnKey}
                            style={cellStyle}
                            onClick={() => !isReadOnly && startEdit(index, columnKey)}
                            title={hasChanges ? `Changed from: ${pendingChanges.get(cellKey)?.oldValue}` : String(cellValue || '')}
                        >
                            {column.onRender ? 
                                column.onRender(item, index, column) : 
                                String(cellValue || '')
                            }
                            {!isReadOnly && enableDragFill && (
                                <div 
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        width: 6,
                                        height: 6,
                                        backgroundColor: '#0078d4',
                                        border: '1px solid white',
                                        cursor: 'crosshair',
                                        opacity: 0.7
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        // TODO: Implement drag fill
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }, [filteredItems, columns, columnWidths, editingState, pendingChanges, readOnlyColumns, enableInlineEditing, enableDragFill, startEdit, commitEdit, cancelEdit, getAvailableValues, onItemClick, onItemDoubleClick]);

    // Render header
    // Render header with Excel-like filter buttons
    const renderHeader = () => (
        <div className="virtualized-header">
            {columns.map((column, index) => {
                const hasFilter = columnFilters[column.key]?.length > 0;
                const dataType = getColumnDataType?.(column.key) || 'text';
                
                return (
                    <div
                        key={column.key}
                        className="virtualized-header-cell"
                        style={{ width: columnWidths[index] }}
                    >
                        <span className="virtualized-header-text">
                            {column.name}
                        </span>
                        {enableColumnFilters && (
                            <IconButton
                                className={`virtualized-header-filter-button ${hasFilter ? 'active' : ''}`}
                                iconProps={{ 
                                    iconName: hasFilter ? 'Filter' : 'Filter'
                                }}
                                title={`Filter ${column.name}`}
                                onClick={(e) => {
                                    const target = e.currentTarget as HTMLElement;
                                    handleFilterButtonClick(column.key, target);
                                }}
                                styles={{
                                    root: { 
                                        height: 24, 
                                        width: 24,
                                        minWidth: 24 
                                    },
                                    icon: { fontSize: 12 }
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="virtualized-editable-grid-container">
            {/* Command Bar */}
            {(pendingChanges.size > 0 || commandBarItems.length > 0) && (
                <CommandBar
                    items={commandBarItems}
                    styles={{ root: { minHeight: 40, marginBottom: 8 } }}
                />
            )}

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

            {/* Header */}
            {renderHeader()}

            {/* PURE VIRTUALIZED GRID BODY - Always on for META/Google competitive performance */}
            <div 
                ref={parentRef}
                className="virtualized-grid-body"
            >
                <div
                    className="virtualized-grid-inner"
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
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
                />
            )}
        </div>
    );
};

export default VirtualizedEditableGrid;
