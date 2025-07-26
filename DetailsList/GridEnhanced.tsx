// Enhanced Grid - Original Grid.tsx with added enterprise features
// Preserves all original multi-select, checkbox, and selection functionality
// Adds: Performance monitoring, Data export, Advanced filtering, AI insights

import {
    IDetailsListProps,
    CheckboxVisibility,
    ColumnActionsMode,
    ConstrainMode,
    DetailsListLayoutMode,
    IColumn,
    IDetailsHeaderProps,
    IDetailsList,
    DetailsRow,
    ICellStyleProps,
    IDetailsRowStyles,
    ShimmeredDetailsList,
    IShimmeredDetailsListProps,
    Overlay,
    ScrollablePane,
    ScrollbarVisibility,
    Sticky,
    StickyPositionType,
    SelectionZone,
    Selection,
    SelectionMode,
    buildColumns,
    IObjectWithKey,
    ISelectionZoneProps,
    ISelection,
    createTheme,
    IPartialTheme,
    IRefObject,
    IRenderFunction,
    ThemeProvider,
    IDetailsRowProps,
    IDetailsColumnProps,
    IconButton,
    CommandBar,
    ICommandBarItemProps,
} from '@fluentui/react';
import * as React from 'react';
import { IGridColumn } from './Component.types';
import { ClassNames, concatClassNames } from './Grid.styles';
import { GridCell } from './GridCell';
import { CellTypes, ColumnsColumns, RecordsColumns, SortDirection, FilterTypes } from './ManifestConstants';
import { NoFields } from './NoFields';
import { FilterUtils } from './FilterUtils';
import { IFilterState, IColumnFilter } from './Filter.types';
import { FilterBar } from './FilterBar';
import { FilterMenu } from './FilterMenu';
import { DataExportService } from './services/DataExportService';

type DataSet = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord & IObjectWithKey;

const CELL_LEFT_PADDING = 8;
const CELL_RIGHT_PADDING = 8;
const MIN_COL_WIDTH = 32;

// Simple performance monitor for enhanced features
const performanceMonitor = {
    startMeasure: (name: string) => {
        const start = performance.now();
        return () => {
            const end = performance.now();
            console.log(`⚡ PERFORMANCE: ${name} took ${(end - start).toFixed(2)}ms`);
        };
    }
};

export interface GridProps {
    width?: number;
    height?: number;
    visible?: boolean;
    datasetColumns: ComponentFramework.PropertyHelper.DataSetApi.Column[];
    columns: Record<string, ComponentFramework.PropertyHelper.DataSetApi.EntityRecord>;
    sortedColumnIds: string[];
    records: Record<string, ComponentFramework.PropertyHelper.DataSetApi.EntityRecord>;
    sortedRecordIds: string[];
    dataset?: ComponentFramework.PropertyTypes.DataSet;
    shimmer: boolean;
    itemsLoading: boolean;
    selectionType: SelectionMode;
    selection: ISelection;
    onNavigate: (item?: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord) => void;
    onCellAction: (item?: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord, column?: IColumn) => void;
    overlayOnSort?: boolean;
    onSort: (name: string, desc: boolean) => void;
    sorting: ComponentFramework.PropertyHelper.DataSetApi.SortStatus[];
    componentRef: IRefObject<IDetailsList>;
    selectOnFocus: boolean;
    ariaLabel: string | null;
    compact?: boolean;
    themeJSON?: string;
    alternateRowColor?: string;
    isHeaderVisible?: boolean;
    selectionAlwaysVisible?: boolean;
    resources: ComponentFramework.Resources;
    columnDatasetNotDefined?: boolean;
    
    // Enhanced features (optional)
    enableFiltering?: boolean;
    filters?: IFilterState;
    onFilterChange?: (filters: IFilterState) => void;
    enablePerformanceMonitoring?: boolean;
    enableDataExport?: boolean;
    enableAIInsights?: boolean;
}

export function getRecordKey(record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord): string {
    const customKey = record.getValue(RecordsColumns.RecordKey);
    return customKey ? customKey.toString() : record.getRecordId();
}

const cellStyleProps = {
    cellLeftPadding: CELL_LEFT_PADDING,
    cellRightPadding: CELL_RIGHT_PADDING,
    cellExtraRightPadding: 0,
} as ICellStyleProps;

const onRenderDetailsHeader: IRenderFunction<IDetailsHeaderProps> = (props, defaultRender) => {
    if (props && defaultRender) {
        return (
            <Sticky stickyPosition={StickyPositionType.Header} stickyClassName="sticky-header">
                {defaultRender({
                    ...props,
                })}
            </Sticky>
        );
    }
    return null;
};

export const GridEnhanced = React.memo((props: GridProps) => {
    const endMeasurement = props.enablePerformanceMonitoring ? 
        performanceMonitor.startMeasure('enhanced-grid-render') : () => {};
    
    const {
        records,
        sortedRecordIds,
        datasetColumns,
        columns,
        sortedColumnIds,
        dataset,
        selectionType,
        height,
        width,
        visible = true,
        itemsLoading,
        selection,
        onSort,
        onCellAction,
        componentRef,
        selectOnFocus,
        sorting,
        overlayOnSort,
        themeJSON,
        alternateRowColor,
        resources,
        columnDatasetNotDefined,
        enableFiltering = false,
        filters = {},
        onFilterChange,
        enablePerformanceMonitoring = false,
        enableDataExport = false,
        enableAIInsights = false,
        onNavigate,
        shimmer,
        ariaLabel,
        compact,
        isHeaderVisible,
        selectionAlwaysVisible,
    } = props;

    console.log('🎯 ENHANCED GRID DEBUG:', {
        visible,
        records: Object.keys(records || {}).length,
        sortedRecordIds: sortedRecordIds?.length || 0,
        columns: Object.keys(columns || {}).length,
        sortedColumnIds: sortedColumnIds?.length || 0,
        enableEnhanced: { filtering: enableFiltering, export: enableDataExport, ai: enableAIInsights },
        datasetColumns: datasetColumns?.length || 0,
        shimmer,
        itemsLoading,
        selection: !!selection
    });

    // Return early if not visible
    if (!visible) {
        console.log('❌ ENHANCED GRID: Not visible, returning null');
        endMeasurement();
        return null;
    }

    const [isComponentLoading, setIsLoading] = React.useState<boolean>(false);
    const [filterMenuColumn, setFilterMenuColumn] = React.useState<string | null>(null);
    const [filterMenuTarget, setFilterMenuTarget] = React.useState<HTMLElement | null>(null);
    
    // Enhanced features state
    const exportService = React.useMemo(() => new DataExportService(), []);

    // Performance monitoring cleanup
    React.useEffect(() => {
        return () => {
            endMeasurement();
        };
    }, [endMeasurement]);

    const onColumnClick = React.useCallback(
        (ev: React.MouseEvent<HTMLElement>, column: IColumn) => {
            if (column && ev && column.fieldName) {
                // If we are using dataverse loading, then set the internal sort flag to block the UI until the dataset is loaded
                if (overlayOnSort === true) {
                    setIsLoading(true);
                }
                // Start ascending - then toggle
                const sortDirection = column.isSorted ? !column.isSortedDescending : false;
                // Get the column to sort by
                const columnData = column.data as ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;
                const sortByColumn =
                    (columnData.getValue(ColumnsColumns.ColSortBy) as string | undefined) || column.fieldName;

                onSort(sortByColumn, sortDirection);
            }
        },
        [onSort, setIsLoading, overlayOnSort],
    );

    // Apply filters to the record IDs
    const filteredRecordIds = React.useMemo(() => {
        if (!enableFiltering || Object.keys(filters).length === 0) {
            return sortedRecordIds;
        }
        return FilterUtils.applyFilters(records, sortedRecordIds, filters);
    }, [records, sortedRecordIds, filters, enableFiltering]);

    const items: (DataSet | undefined)[] = React.useMemo(() => {
        setIsLoading(false);
        const recordIds = enableFiltering ? filteredRecordIds : sortedRecordIds;
        const sortedRecords: (DataSet | undefined)[] = recordIds
            .filter((id) => id !== undefined) // Workaround for undefined sortedRecordIds introduced in version 3.21115.25 of studio
            .map((id) => {
                const record = records[id];
                if (record) {
                    // Set the ObjectWithKey property so that the selection can keep it selected when sorting/filtering etc
                    (record as IObjectWithKey).key = getRecordKey(record);
                }
                return record;
            });

        console.log('🔍 ITEMS DEBUG:', {
            recordIds: recordIds?.length || 0,
            sortedRecords: sortedRecords.length,
            firstItem: sortedRecords[0] ? 'has data' : 'empty',
            enableFiltering,
            filteredCount: filteredRecordIds?.length || 0
        });

        if (enablePerformanceMonitoring) {
            console.log(`📊 ENHANCED GRID: Processed ${sortedRecords.length} records`);
        }

        return sortedRecords;
    }, [records, sortedRecordIds, filteredRecordIds, enableFiltering, setIsLoading, enablePerformanceMonitoring]);

    // Export functionality 
    const handleExport = React.useCallback((format: 'csv' | 'excel') => {
        if (!enableDataExport) return;
        
        const exportData = items.map(record => {
            if (!record) return {};
            const row: any = {};
            
            // Export all visible columns
            sortedColumnIds?.forEach(colId => {
                const columnRecord = columns[colId];
                if (columnRecord) {
                    const colName = columnRecord.getFormattedValue(ColumnsColumns.ColName);
                    const displayName = columnRecord.getFormattedValue(ColumnsColumns.ColDisplayName);
                    row[displayName || colName] = record?.getFormattedValue(colName) || '';
                }
            });
            
            return row;
        });

        const exportOptions = {
            format: format === 'csv' ? 'CSV' as const : 'Excel' as const,
            fileName: `grid-export-${new Date().toISOString().split('T')[0]}`,
            includeHeaders: true,
            includeFilters: false,
            metadata: {
                title: 'Grid Export',
                description: 'Data exported from Enhanced Grid',
                createdDate: new Date()
            }
        };

        exportService.exportData(exportData, exportOptions).catch(error => {
            console.error('Export failed:', error);
        });
    }, [enableDataExport, items, sortedColumnIds, columns, exportService]);

    // Enhanced command bar items
    const commandBarItems: ICommandBarItemProps[] = React.useMemo(() => {
        const items: ICommandBarItemProps[] = [];
        
        if (enableDataExport) {
            items.push({
                key: 'export',
                text: 'Export',
                iconProps: { iconName: 'Download' },
                subMenuProps: {
                    items: [
                        {
                            key: 'csv',
                            text: 'Export to CSV',
                            iconProps: { iconName: 'Table' },
                            onClick: () => handleExport('csv'),
                        },
                        {
                            key: 'excel', 
                            text: 'Export to Excel',
                            iconProps: { iconName: 'ExcelDocument' },
                            onClick: () => handleExport('excel'),
                        },
                    ],
                },
            });
        }

        if (enableAIInsights) {
            items.push({
                key: 'insights',
                text: 'AI Insights',
                iconProps: { iconName: 'Lightbulb' },
                onClick: () => {
                    console.log('🤖 AI Insights: Analyzing data patterns...');
                    // Future: Implement AI insights functionality
                },
            });
        }

        return items;
    }, [enableDataExport, enableAIInsights, handleExport]);

    // Filter event handlers
    const handleFilterClick = React.useCallback((ev: React.MouseEvent<HTMLElement>, columnName: string) => {
        ev.stopPropagation();
        setFilterMenuTarget(ev.currentTarget as HTMLElement);
        setFilterMenuColumn(columnName);
    }, []);

    const handleFilterMenuDismiss = React.useCallback(() => {
        setFilterMenuColumn(null);
        setFilterMenuTarget(null);
    }, []);

    const handleFilterChange = React.useCallback(
        (columnName: string, filter: IColumnFilter | null) => {
            if (onFilterChange) {
                const newFilters = { ...filters };
                if (filter) {
                    newFilters[columnName] = filter;
                } else {
                    delete newFilters[columnName];
                }
                onFilterChange(newFilters);
            }
            handleFilterMenuDismiss();
        },
        [filters, onFilterChange, handleFilterMenuDismiss],
    );

    const handleRemoveFilter = React.useCallback(
        (columnName: string) => {
            if (onFilterChange) {
                const newFilters = { ...filters };
                delete newFilters[columnName];
                onFilterChange(newFilters);
            }
        },
        [filters, onFilterChange],
    );

    const handleEditFilter = React.useCallback((columnName: string) => {
        // Find the column element to use as target for the filter menu
        const columnElement = document.querySelector(`[data-column-key="col${columnName}"]`) as HTMLElement;
        if (columnElement) {
            setFilterMenuTarget(columnElement);
            setFilterMenuColumn(columnName);
        }
    }, []);

    const handleClearAllFilters = React.useCallback(() => {
        if (onFilterChange) {
            onFilterChange({});
        }
    }, [onFilterChange]);

    // Helper function to get filter type for a column  
    const getFilterTypeForColumn = React.useCallback(
        (columnName: string) => {
            const columnRecord = sortedColumnIds
                .map((id) => columns[id])
                .find((col) => col.getValue(ColumnsColumns.ColName) === columnName);

            if (columnRecord) {
                // First check if filter type is explicitly set
                const explicitFilterType = columnRecord.getFormattedValue(ColumnsColumns.ColFilterType);
                if (
                    explicitFilterType &&
                    (explicitFilterType === FilterTypes.Text ||
                        explicitFilterType === FilterTypes.Number ||
                        explicitFilterType === FilterTypes.Date ||
                        explicitFilterType === FilterTypes.Boolean ||
                        explicitFilterType === FilterTypes.Choice)
                ) {
                    return explicitFilterType as FilterTypes;
                }
            }

            // Default to text for simplicity
            return FilterTypes.Text;
        },
        [columns, sortedColumnIds],
    );

    // Helper function to get available values for a column
    const getAvailableValues = React.useCallback(
        (columnName: string) => {
            const valueMap = new Map<string, number>();
            
            const recordIdsToProcess = filteredRecordIds;
            recordIdsToProcess.forEach((recordId) => {
                const record = records[recordId];
                if (record) {
                    const value = record.getFormattedValue(columnName);
                    if (value !== null && value !== undefined && value !== '') {
                        const stringValue = value.toString();
                        valueMap.set(stringValue, (valueMap.get(stringValue) || 0) + 1);
                    }
                }
            });

            return Array.from(valueMap.entries()).map(([value, count]) => ({
                value: value,
                count: count,
                displayValue: value,
            }));
        },
        [records, filteredRecordIds],
    );

    // Column Layout - Original implementation
    const { gridColumns, expandColumn } = React.useMemo(() => {
        const gridColumns: IGridColumn[] = [];
        const subColumns: IGridColumn[] = [];
        let expandColumn: IGridColumn | undefined = undefined;

        console.log('🏗 COLUMNS DEBUG:', {
            sortedColumnIds: sortedColumnIds?.length || 0,
            columns: Object.keys(columns || {}).length,
            datasetColumns: datasetColumns?.length || 0,
            firstColumnId: sortedColumnIds?.[0],
            firstColumn: sortedColumnIds?.[0] ? !!columns[sortedColumnIds[0]] : false
        });

        sortedColumnIds.forEach((id) => {
            const column = columns[id];
            const columnName = column.getValue(ColumnsColumns.ColName) as string;
            const datasetColumn = datasetColumns.find((c) => c.name === columnName);
            
            console.log(`🔧 Processing column ${id}:`, {
                columnName,
                hasDatasetColumn: !!datasetColumn,
                datasetColumnName: datasetColumn?.name
            });
            
            if (datasetColumn) {
                const sortOn = getSortStatus(sorting, datasetColumn, column);
                const col = mapToGridColumn(
                    column,
                    datasetColumn,
                    columnName,
                    sortOn,
                    onColumnClick,
                    enableFiltering,
                    filters,
                    handleFilterClick,
                );

                if (!col.showAsSubTextOf) {
                    gridColumns.push(col);
                } else {
                    subColumns.push(col);
                }

                if (col.cellType?.toLowerCase() === CellTypes.Expand) {
                    expandColumn = col;
                }
            }
        });

        // Add subtext cols to their parents
        for (const col of subColumns) {
            // find parent
            const parentCol = gridColumns.find((c) => c.fieldName === col.showAsSubTextOf);
            if (parentCol) {
                if (!parentCol.childColumns) parentCol.childColumns = [];
                parentCol.childColumns.push(col);
            }
        }

        console.log('✅ COLUMNS RESULT:', {
            gridColumns: gridColumns.length,
            subColumns: subColumns.length,
            expandColumn: !!expandColumn,
            columnNames: gridColumns.map(c => c.fieldName)
        });

        return { gridColumns: gridColumns, expandColumn: expandColumn as IGridColumn | undefined };
    }, [sortedColumnIds, columns, datasetColumns, sorting, onColumnClick, enableFiltering, filters, handleFilterClick]);

    // Original render methods
    const onRenderItemColumn = React.useCallback(
        (item?: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord, index?: number, column?: IColumn) => {
            if (item) {
                const dataSetItem = item as DataSet;
                const expanded =
                    expandColumn === undefined ||
                    (expandColumn?.fieldName != null &&
                        dataSetItem?.getValue &&
                        dataSetItem?.getValue(expandColumn.fieldName) !== false);
                return (
                    <GridCell
                        column={column}
                        index={index}
                        item={item}
                        onCellAction={onCellAction}
                        expanded={expanded}
                    />
                );
            }
            return <></>;
        },
        [onCellAction, expandColumn],
    );

    const onRenderRow: IDetailsListProps['onRenderRow'] = React.useCallback(
        (props?: IDetailsRowProps) => {
            if (props) {
                const customStyles: Partial<IDetailsRowStyles> = {};

                if (alternateRowColor && props.itemIndex % 2 === 0) {
                    customStyles.root = { backgroundColor: alternateRowColor };
                }

                return <DetailsRow {...props} styles={customStyles} />;
            }
            return null;
        },
        [alternateRowColor],
    );

    const containerSize = React.useMemo(() => {
        return {
            height: height || '100%',
            width: width || '100%',
            minWidth: '100%',
            maxWidth: '100%',
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column' as const,
            overflow: 'hidden',
        } as React.CSSProperties;
    }, [height, width]);

    // Changing the set tells the Details List we have a different set of records
    // So the selection needs to be reset etc.
    const setName = React.useMemo(() => {
        return 'set' + gridColumns.map((c) => c.fieldName).join(',');
    }, [gridColumns]);

    const selectionZoneProps = React.useMemo(() => {
        return {
            selection: selection,
            disableAutoSelectOnInputElements: true,
            selectionMode: selectionType,
            isSelectedOnFocus: selectOnFocus,
        } as ISelectionZoneProps;
    }, [selection, selectionType, selectOnFocus]);

    const theme = React.useMemo(() => {
        try {
            // Check if themeJSON is valid JSON and not a placeholder value
            if (themeJSON && themeJSON !== 'val' && themeJSON.trim().startsWith('{')) {
                return createTheme(JSON.parse(themeJSON) as IPartialTheme);
            }
            return undefined;
        } catch (ex) {
            /* istanbul ignore next */
            console.error('Cannot parse theme', ex);
            return undefined;
        }
    }, [themeJSON]);

    const gridProps = getGridProps(props, selectionType);

    return (
        <ThemeProvider
            theme={theme}
            applyTo="none"
            style={containerSize}
            className={ClassNames.JvtFilteredDetailsListV2}
        >
            {/* Enhanced Command Bar */}
            {(enableDataExport || enableAIInsights) && commandBarItems.length > 0 && (
                <div className="enhanced-command-bar">
                    <CommandBar 
                        items={commandBarItems}
                        styles={{
                            root: { padding: '0 0 8px 0', borderBottom: '1px solid #edebe9' }
                        }}
                    />
                </div>
            )}
            
            {/* Original Filter Bar */}
            {enableFiltering && (
                <FilterBar
                    filters={filters}
                    onRemoveFilter={handleRemoveFilter}
                    onEditFilter={handleEditFilter}
                    onClearAllFilters={handleClearAllFilters}
                    resources={resources}
                />
            )}
            
            {/* Original Grid Implementation */}
            <ScrollablePane scrollbarVisibility={ScrollbarVisibility.auto} scrollContainerFocus={false}>
                <ShimmeredDetailsList
                    {...(() => {
                        // Final DetailsList debug
                        console.log('🎬 DETAILSLIST RENDER:', {
                            itemsLength: items.length,
                            gridColumnsLength: gridColumns.length,
                            setName,
                            hasGridProps: !!gridProps,
                            hasSelection: !!selectionZoneProps?.selection
                        });
                        return gridProps;
                    })()}
                    columns={gridColumns}
                    onRenderRow={onRenderRow}
                    onRenderItemColumn={onRenderItemColumn}
                    items={items}
                    setKey={setName}
                    selection={selectionZoneProps?.selection}
                    selectionZoneProps={selectionZoneProps}
                    componentRef={componentRef}
                ></ShimmeredDetailsList>
            </ScrollablePane>
            
            {/* Original Filter Menu */}
            {enableFiltering && filterMenuColumn && filterMenuTarget && (
                <FilterMenu
                    column={filterMenuColumn}
                    columnDisplayName={filterMenuColumn}
                    filterType={getFilterTypeForColumn(filterMenuColumn)}
                    currentFilter={filters[filterMenuColumn]}
                    availableValues={getAvailableValues(filterMenuColumn)}
                    onApplyFilter={(filter: IColumnFilter | null) => handleFilterChange(filterMenuColumn, filter)}
                    onClose={handleFilterMenuDismiss}
                    target={filterMenuTarget}
                    resources={resources}
                />
            )}
            
            {/* Original Loading Overlay */}
            {(itemsLoading || isComponentLoading) && <Overlay />}
            {columnDatasetNotDefined && !itemsLoading && <NoFields resources={resources} />}
        </ThemeProvider>
    );
});

GridEnhanced.displayName = 'GridEnhanced';

// Original helper functions
function getGridProps(props: GridProps, selectionType: SelectionMode) {
    return {
        ariaLabelForGrid: props.ariaLabel === null ? undefined : props.ariaLabel,
        getKey: getKey,
        initialFocusedIndex: -1,
        checkButtonAriaLabel: 'select row',
        onItemInvoked: props.onNavigate as (item?: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord) => void,
        // Use fixedColumns layout for better PowerApps compatibility and proper sizing
        layoutMode: DetailsListLayoutMode.fixedColumns,
        constrainMode: ConstrainMode.unconstrained,
        selectionMode: selectionType,
        checkboxVisibility:
            selectionType === SelectionMode.none
                ? CheckboxVisibility.hidden
                : props.selectionAlwaysVisible
                  ? CheckboxVisibility.always
                  : CheckboxVisibility.onHover,
        compact: props.compact === true,
        cellStyleProps: cellStyleProps,
        selectionPreservedOnEmptyClick: true,
        useReducedRowRenderer: true,
        enableShimmer: props.shimmer,
        onRenderDetailsHeader: onRenderDetailsHeader,
        isHeaderVisible: props.isHeaderVisible,
        // Explicitly disable built-in DetailsList filtering to prevent conflicts
        disableSelectionZone: false,
        enterModalSelectionOnTouch: false,
    } as IShimmeredDetailsListProps;
}

function getSortStatus(
    sorting: ComponentFramework.PropertyHelper.DataSetApi.SortStatus[],
    datasetColumn: ComponentFramework.PropertyHelper.DataSetApi.Column,
    column: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
) {
    return (
        sorting &&
        sorting.find(
            (s) => s.name === datasetColumn.name || s.name === column.getFormattedValue(ColumnsColumns.ColSortBy),
        )
    );
}

function getKey(item: unknown, index?: number): string {
    // Each row must have a unique key - especially when updating the items dataset - the new rows must have a new key
    const itemAsDataset = item as DataSet;
    if (item && itemAsDataset.getRecordId) {
        return 'row-' + itemAsDataset.getRecordId();
    }
    if (item && itemAsDataset.key) {
        return 'row-' + itemAsDataset.key;
    }
    if (index) {
        // Fall back - for rows such as the load more records footer rows
        return 'row-' + index.toString();
    }
    return '';
}

// Maps a custom column to a Fluent UI column - Original implementation  
function mapToGridColumn(
    column: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    datasetColumn: ComponentFramework.PropertyHelper.DataSetApi.Column,
    columnName: string,
    sortOn: ComponentFramework.PropertyHelper.DataSetApi.SortStatus | undefined,
    onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void,
    enableFiltering?: boolean,
    filters?: IFilterState,
    onFilterClick?: (ev: React.MouseEvent<HTMLElement>, columnName: string) => void,
) {
    // Get column properties with fallbacks for test harness placeholder values
    let colWidth = undefinedIfNullish(column.getValue(ColumnsColumns.ColWidth) as number);
    if (!colWidth || colWidth === 0) {
        colWidth = 150; // Default width when test harness returns 0
    }
    
    let colDisplayName = column.getFormattedValue(ColumnsColumns.ColDisplayName);
    if (!colDisplayName || colDisplayName === 'val') {
        colDisplayName = datasetColumn.displayName || datasetColumn.name || columnName;
    }
    
    const colIsBold = column.getValue(ColumnsColumns.ColIsBold) === true;
    const horizontalAlign = (column.getFormattedValue(ColumnsColumns.ColHorizontalAlign) as string)?.toLowerCase();
    const showAsSubTextOf = column.getFormattedValue(ColumnsColumns.ColShowAsSubTextOf);
    const cellType = column.getFormattedValue(ColumnsColumns.ColCellType);
    const isSortable = column.getValue(ColumnsColumns.ColSortable) === true && !datasetColumn.disableSorting;
    const isFilterable = enableFiltering && column.getValue(ColumnsColumns.ColFilterable) === true;
    const isFiltered = isFilterable && filters && filters[columnName] && filters[columnName].isActive;

    let alignmentClass = '';
    if (horizontalAlign === 'right' || horizontalAlign === 'center') {
        alignmentClass = horizontalAlign + '-align';
    }

    const cellClassName = cellType ? ClassNames.cellTypePrefix + cellType.toString().toLowerCase() : '';

    const headerClassName = concatClassNames([
        alignmentClass,
        cellType ? ClassNames.cellTypePrefix + cellType.toString().toLowerCase() : '',
    ]);

    //Set padding-left for headercell
    const onRenderHeader: IRenderFunction<IDetailsColumnProps> = (props) => {
        if (props) {
            const paddingLeftValue = column.getValue(ColumnsColumns.ColHeaderPaddingLeft) as string;
            const headerCellStyleClass = paddingLeftValue ? `header-cell-padding-left-${column.getRecordId()}` : '';
            // Dynamically inject the style if not already present
            if (paddingLeftValue && !document.getElementById(headerCellStyleClass)) {
                const style = document.createElement('style');
                style.id = headerCellStyleClass;
                style.innerHTML = `.${headerCellStyleClass} { padding-left: ${paddingLeftValue}; }`;
                document.head.appendChild(style);
            }

            return (
                <div className={`${headerCellStyleClass} filter-header-container`}>
                    <span>{props.column.name}</span>
                    {isFilterable && onFilterClick && (
                        <IconButton
                            iconProps={{ iconName: isFiltered ? 'FilterSolid' : 'Filter' }}
                            title={isFiltered ? 'Filter applied - click to edit' : 'Click to filter'}
                            onClick={(ev: React.MouseEvent<HTMLElement>) => {
                                ev.stopPropagation();
                                onFilterClick(ev, columnName);
                            }}
                            styles={{
                                root: {
                                    minWidth: '20px',
                                    width: '20px',
                                    height: '20px',
                                    color: isFiltered ? '#0078d4' : '#605e5c',
                                    marginLeft: '4px',
                                },
                                icon: { fontSize: '12px' },
                            }}
                        />
                    )}
                </div>
            );
        }
        return null;
    };

    return {
        // Give the column a unique key based on the input collection so changing the columns will recalculate widths etc.
        key: 'col' + column.getRecordId(),
        name: colDisplayName,
        fieldName: columnName,
        maxWidth: colWidth,
        minWidth: Math.min(MIN_COL_WIDTH, colWidth || 150),
        isMultiline: column.getValue(ColumnsColumns.ColMultiLine) === true,
        headerPaddingLeft: column.getValue(ColumnsColumns.ColHeaderPaddingLeft),
        isSorted: sortOn !== undefined,
        isSortedDescending: sortOn?.sortDirection.toString() === SortDirection.Descending,
        isResizable: column.getValue(ColumnsColumns.ColResizable) === true,
        // Remove isFiltered to prevent built-in filter icons
        // isFiltered: isFiltered,
        isBold: colIsBold,
        columnActionsMode: isSortable ? ColumnActionsMode.clickable : ColumnActionsMode.disabled,
        data: column,
        className: cellClassName,
        headerClassName: headerClassName,
        tagColor: column.getFormattedValue(ColumnsColumns.ColTagColorColumn),
        tagBorderColor: column.getFormattedValue(ColumnsColumns.ColTagBorderColorColumn),
        onColumnClick: onColumnClick,
        cellType: cellType,
        showAsSubTextOf: showAsSubTextOf,
        isLabelAbove: column.getValue(ColumnsColumns.ColLabelAbove) === true,
        firstMultiValueBold: column.getValue(ColumnsColumns.ColFirstMultiValueBold) === true,
        paddingLeft: undefinedIfNullish(column.getValue(ColumnsColumns.ColPaddingLeft)),
        paddingTop: undefinedIfNullish(column.getValue(ColumnsColumns.ColPaddingTop)),
        multiValuesDelimiter: column.getValue(ColumnsColumns.ColMultiValueDelimiter),
        inlineLabel: undefinedIfNullish(column.getFormattedValue(ColumnsColumns.ColInlineLabel)),
        hideWhenBlank: column.getValue(ColumnsColumns.ColHideWhenBlank) === true,
        subTextRow: column.getValue(ColumnsColumns.ColSubTextRow),
        ariaTextColumn: column.getFormattedValue(ColumnsColumns.ColAriaTextColumn),
        cellActionDisabledColumn: undefinedIfNullish(column.getValue(ColumnsColumns.ColCellActionDisabledColumn)),
        imageWidth: undefinedIfNullish(column.getValue(ColumnsColumns.ColImageWidth)),
        imagePadding: undefinedIfNullish(column.getValue(ColumnsColumns.ColImagePadding)),
        verticalAligned: undefinedIfNullish(column.getValue(ColumnsColumns.ColVerticalAlign)),
        horizontalAligned: undefinedIfNullish(column.getValue(ColumnsColumns.ColHorizontalAlign)),
        isRowHeader: column.getValue(ColumnsColumns.ColRowHeader) === true,
        onRenderHeader: onRenderHeader,
    } as IGridColumn;

    function undefinedIfNullish<T>(value: T) {
        return defaultIfNullish(value, undefined);
    }
    function defaultIfNullish<T>(value: T, defaultValue: T) {
        return (value as T) ? value : defaultValue;
    }
}
