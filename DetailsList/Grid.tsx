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
    IObjectWithKey,
    ISelectionZoneProps,
    ISelection,
    createTheme,
    IPartialTheme,
    IRefObject,
    IRenderFunction,
    SelectionMode,
    ThemeProvider,
    IDetailsRowProps,
    IDetailsColumnProps,
    IconButton,
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
import { performanceMonitor } from './performance/PerformanceMonitor';

type DataSet = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord & IObjectWithKey;

const CELL_LEFT_PADDING = 8;
const CELL_RIGHT_PADDING = 8;
const MIN_COL_WIDTH = 32;

export interface GridProps {
    width?: number;
    height?: number;
    visible?: boolean;
    datasetColumns: ComponentFramework.PropertyHelper.DataSetApi.Column[];
    columns: Record<string, ComponentFramework.PropertyHelper.DataSetApi.EntityRecord>;
    sortedColumnIds: string[];
    records: Record<string, ComponentFramework.PropertyHelper.DataSetApi.EntityRecord>;
    sortedRecordIds: string[];
    dataset?: ComponentFramework.PropertyTypes.DataSet; // Full dataset for filtering
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
    // Filter properties
    enableFiltering?: boolean;
    filters?: IFilterState;
    onFilterChange?: (filters: IFilterState) => void;

    // Enterprise features
    enablePerformanceMonitoring?: boolean;
    enableAIInsights?: boolean;
    enableCollaboration?: boolean;
    enableAdvancedVirtualization?: boolean;
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

export const Grid = React.memo((props: GridProps) => {
    const endMeasurement = performanceMonitor.startMeasure('grid-render');

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
    } = props;

    const [isComponentLoading, setIsLoading] = React.useState<boolean>(false);
    const [filterMenuColumn, setFilterMenuColumn] = React.useState<string | null>(null);
    const [filterMenuTarget, setFilterMenuTarget] = React.useState<HTMLElement | null>(null);

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

        return sortedRecords;
    }, [records, sortedRecordIds, filteredRecordIds, enableFiltering, setIsLoading]);

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
            if (props.onFilterChange) {
                const newFilters = { ...filters };
                if (filter) {
                    newFilters[columnName] = filter;
                } else {
                    delete newFilters[columnName];
                }
                props.onFilterChange(newFilters);
            }
            handleFilterMenuDismiss();
        },
        [filters, props.onFilterChange, handleFilterMenuDismiss],
    );

    const handleRemoveFilter = React.useCallback(
        (columnName: string) => {
            if (props.onFilterChange) {
                const newFilters = { ...filters };
                delete newFilters[columnName];
                props.onFilterChange(newFilters);
            }
        },
        [filters, props.onFilterChange],
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
        if (props.onFilterChange) {
            props.onFilterChange({});
        }
    }, [props.onFilterChange]);

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

            // If no explicit type set, infer from the data
            const datasetColumn = datasetColumns.find((c) => c.name === columnName);
            if (datasetColumn) {
                // Check the PowerApps data type
                const dataType = datasetColumn.dataType;
                switch (dataType) {
                    case 'Whole.None':
                    case 'Currency':
                    case 'FP':
                    case 'Decimal':
                        return FilterTypes.Number;
                    case 'DateAndTime.DateAndTime':
                    case 'DateAndTime.DateOnly':
                        return FilterTypes.Date;
                    case 'TwoOptions':
                        return FilterTypes.Boolean;
                    case 'OptionSet':
                    case 'MultiSelectOptionSet':
                        return FilterTypes.Choice;
                    default:
                        // For text types or unknown, analyze actual data
                        break;
                }
            }

            // Fallback: analyze actual data to infer type
            // Use full dataset if available, otherwise fall back to current page
            const recordsToSample = dataset && dataset.records ? dataset.records : records;
            const sampleValues = Object.values(recordsToSample)
                .slice(0, 20) // Sample first 20 records for better detection
                .map((record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord) =>
                    record.getFormattedValue(columnName),
                )
                .filter((value) => value !== null && value !== undefined && value !== '');

            if (sampleValues.length === 0) {
                return FilterTypes.Text;
            }

            // Check if all values are numbers
            const numericValues = sampleValues.filter((value) => {
                const str = value.toString().replace(/,/g, ''); // Remove commas for number checking
                const num = parseFloat(str);
                return !isNaN(num) && isFinite(num) && /^[-+]?[\d,]*\.?\d*$/.test(str);
            });
            if (numericValues.length === sampleValues.length && sampleValues.length > 0) {
                return FilterTypes.Number;
            }

            // Check if all values are dates
            const dateValues = sampleValues.filter((value) => {
                const str = value.toString();
                // Common date patterns
                const datePatterns = [
                    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY
                    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
                    /^\d{1,2}-\d{1,2}-\d{4}$/, // MM-DD-YYYY
                    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
                ];

                // Check if matches date pattern and can be parsed as valid date
                const matchesPattern = datePatterns.some((pattern) => pattern.test(str));
                const date = new Date(str);
                const isValidDate = !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;

                return matchesPattern && isValidDate;
            });
            if (dateValues.length === sampleValues.length && sampleValues.length > 0) {
                return FilterTypes.Date;
            }

            // Check if all values are boolean-like
            const booleanValues = sampleValues.filter((value) => {
                const val = value.toString().toLowerCase().trim();
                return (
                    val === 'true' ||
                    val === 'false' ||
                    val === 'yes' ||
                    val === 'no' ||
                    val === '1' ||
                    val === '0' ||
                    val === 'on' ||
                    val === 'off' ||
                    val === 'enabled' ||
                    val === 'disabled'
                );
            });
            if (booleanValues.length === sampleValues.length && sampleValues.length > 0) {
                return FilterTypes.Boolean;
            }

            // Check if looks like a choice field (limited distinct values compared to total records)
            const uniqueValues = new Set(sampleValues).size;
            const totalSampleSize = sampleValues.length;
            if (uniqueValues <= 10 && totalSampleSize > uniqueValues * 2) {
                return FilterTypes.Choice;
            }

            // Default to text
            return FilterTypes.Text;
        },
        [columns, sortedColumnIds, datasetColumns, records, dataset],
    );

    // Helper function to get available values for a column
    const getAvailableValues = React.useCallback(
        (columnName: string) => {
            const valueMap = new Map<string, number>();

            // Create a temporary filter set that excludes the current column being filtered
            // This allows cascading filters where other filters affect the available values
            const filtersExcludingCurrent = { ...filters };
            delete filtersExcludingCurrent[columnName];

            // Start with all sorted record IDs (complete dataset)
            let recordIdsToProcess = sortedRecordIds;

            // If there are other active filters, apply them first to get the filtered dataset
            if (Object.keys(filtersExcludingCurrent).length > 0) {
                recordIdsToProcess = FilterUtils.applyFilters(records, sortedRecordIds, filtersExcludingCurrent);
            }

            // Get the records to examine - use all available records, not just current page
            let recordsToExamine = records;

            // If we have access to the full dataset and there are records beyond the current page,
            // we need to get all records from the dataset for proper filtering
            if (dataset && dataset.records) {
                recordsToExamine = dataset.records;
            }

            // Get values from the filtered dataset (or complete dataset if no other filters)
            recordIdsToProcess.forEach((recordId) => {
                const record = recordsToExamine[recordId];
                if (record) {
                    const value = record.getFormattedValue(columnName);
                    if (value !== null && value !== undefined && value !== '') {
                        const stringValue = value.toString();
                        valueMap.set(stringValue, (valueMap.get(stringValue) || 0) + 1);
                    }
                }
            });

            // Convert to array and sort based on filter type
            const filterType = getFilterTypeForColumn(columnName);
            const values = Array.from(valueMap.entries()).map(([value, count]) => ({
                value: value,
                count: count,
                displayValue: value,
            }));

            // Sort based on filter type
            values.sort((a, b) => {
                if (filterType === FilterTypes.Number) {
                    const numA = parseFloat(a.value);
                    const numB = parseFloat(b.value);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                } else if (filterType === FilterTypes.Date) {
                    const dateA = new Date(a.value);
                    const dateB = new Date(b.value);
                    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                        return dateA.getTime() - dateB.getTime();
                    }
                }
                // Default to string sort
                return a.value.localeCompare(b.value);
            });

            return values;
        },
        [records, dataset, sortedRecordIds, filters, getFilterTypeForColumn],
    );

    // Column Layout
    // eslint-disable-next-line sonarjs/cognitive-complexity
    const { gridColumns, expandColumn } = React.useMemo(() => {
        const gridColumns: IGridColumn[] = [];
        const subColumns: IGridColumn[] = [];
        let expandColumn: IGridColumn | undefined = undefined;

        sortedColumnIds.forEach((id) => {
            const column = columns[id];
            const columnName = column.getValue(ColumnsColumns.ColName) as string;
            const datasetColumn = datasetColumns.find((c) => c.name === columnName);
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

        return { gridColumns: gridColumns, expandColumn: expandColumn as IGridColumn | undefined };
    }, [sortedColumnIds, columns, datasetColumns, sorting, onColumnClick]);

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
            {enableFiltering && (
                <FilterBar
                    filters={filters}
                    onRemoveFilter={handleRemoveFilter}
                    onEditFilter={handleEditFilter}
                    onClearAllFilters={handleClearAllFilters}
                    resources={resources}
                />
            )}
            <ScrollablePane scrollbarVisibility={ScrollbarVisibility.auto} scrollContainerFocus={false}>
                <ShimmeredDetailsList
                    {...gridProps}
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
            {(itemsLoading || isComponentLoading) && <Overlay />}
            {columnDatasetNotDefined && !itemsLoading && <NoFields resources={resources} />}
        </ThemeProvider>
    );
});

Grid.displayName = 'Grid';

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

// Maps a custom column to a Fluent UI column
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
                            iconProps={{ iconName: isFiltered ? 'Filter' : 'Filter' }}
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
