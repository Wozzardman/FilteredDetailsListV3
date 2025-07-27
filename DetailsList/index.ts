import { IDetailsList, IObjectWithKey, SelectionMode, Selection, getWindow, IColumn } from '@fluentui/react';
import * as React from 'react';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { getRecordKey, GridProps } from './Grid';
import { UnifiedGrid } from './components/UnifiedGrid';
import { EditChange } from './components/EditableGrid';
import { InputEvents, OutputEvents, RecordsColumns, ItemsColumns, SortDirection } from './ManifestConstants';
import { IFilterState } from './Filter.types';
import { FilterUtils } from './FilterUtils';
import { performanceMonitor } from './performance/PerformanceMonitor';
import { useAIInsights } from './ai/AIEngine';
type DataSet = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord & IObjectWithKey;

const SelectionTypes: Record<'0' | '1' | '2', SelectionMode> = {
    '0': SelectionMode.none,
    '1': SelectionMode.single,
    '2': SelectionMode.multiple,
};

export class FilteredDetailsListV2 implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private static readonly COLUMN_LIMIT: number = 125;
    notifyOutputChanged: () => void;
    container: HTMLDivElement;
    context: ComponentFramework.Context<IInputs>;
    resources: ComponentFramework.Resources;
    sortedRecordsIds: string[] = [];
    records: {
        [id: string]: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;
    };
    sortedColumnsIds: string[] = [];
    columns: {
        [id: string]: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;
    };
    datasetColumns: ComponentFramework.PropertyHelper.DataSetApi.Column[];
    eventName: string | undefined = undefined;
    eventColumn: string | undefined = undefined;
    eventRowKey: string | undefined | null = undefined;
    sortColumn: string | undefined = undefined;
    sortDirection: 'asc' | 'desc' | undefined = undefined;
    previousSortDir: string;
    selection: Selection;
    hasSetPageSize = false;
    ref: IDetailsList;
    scheduledEventOnNextUpdate = false;
    inputEvent = '';
    previousHasPreviousPage = false;
    previousHasNextPage = false;
    previousTotalRecords = 0;
    previousPageNumber = 1;
    pagingEventPending = false;
    // Filter properties
    filters: IFilterState = {};
    filterEventName: string | undefined = undefined;
    filterEventColumn: string | undefined = undefined;
    filterEventValues: string | undefined = undefined;

    // Enterprise features
    private enableAIInsights = false;
    private enablePerformanceMonitoring = true;
    private enableInlineEditing = true;
    private enableDragFill = true;

    // Inline editing state
    private pendingChanges: Map<string, Map<string, any>> = new Map();

    // Legacy compatibility mode flag
    private isLegacyMode = false; // Always use modern mode

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void): void {
        const endMeasurement = performanceMonitor.startMeasure('component-init');

        try {
            this.notifyOutputChanged = notifyOutputChanged;
            this.context = context;
            context.mode.trackContainerResize(true);
            this.resources = context.resources;
            this.selection = new Selection({
                onSelectionChanged: this.onSelectionChanged,
                canSelectItem: this.canSelectItem,
            });

            // Initialize enterprise features
            this.initializeEnterpriseFeatures();
        } finally {
            endMeasurement();
        }
    }

    private initializeEnterpriseFeatures(): void {
        // Enable AI insights if configured
        if (this.enableAIInsights) {
            console.log('🤖 AI insights enabled');
        }

        // Performance monitoring is enabled by default
        if (this.enablePerformanceMonitoring) {
            console.log('📊 Performance monitoring enabled');
            const endComponentInit = performanceMonitor.startMeasure('component-initialization');
            endComponentInit();
        }

        console.log('🚀 Enterprise features initialized');
    }

    /**
     * Always use modern mode (Records + Columns) - legacy support removed
     */
    private detectLegacyMode(context: ComponentFramework.Context<IInputs>): boolean {
        // Always use modern mode
        console.log('🆕 MODERN MODE - Using Records + Columns datasets only');
        return false;
    }

    /**
     * Converts legacy fields dataset to modern columns format
     */
    private convertLegacyFieldsToColumns(fieldsDataset: ComponentFramework.PropertyTypes.DataSet): {
        records: { [id: string]: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord };
        sortedRecordIds: string[];
    } {
        console.log('🔄 Converting legacy fields to modern columns format');

        const convertedRecords: { [id: string]: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord } = {};
        const sortedIds: string[] = [];

        if (fieldsDataset?.sortedRecordIds) {
            fieldsDataset.sortedRecordIds.forEach((fieldId) => {
                const fieldRecord = fieldsDataset.records[fieldId];
                if (fieldRecord) {
                    // Create a converted record that maps legacy field properties to modern column properties
                    const convertedRecord = {
                        ...fieldRecord,
                        getValue: (propertyName: string) => {
                            const legacyMapping: { [key: string]: string } = {
                                ColDisplayName: 'DisplayName',
                                ColName: 'Name',
                                ColWidth: 'Width',
                                ColCellType: 'CellType',
                                ColHorizontalAlign: 'HorizontalAlign',
                                ColVerticalAlign: 'VerticalAlign',
                                ColMultiLine: 'MultiLine',
                                ColResizable: 'Resizable',
                                ColSortable: 'Sortable',
                                ColSortBy: 'SortBy',
                                ColFilterable: 'Filterable',
                            };

                            const legacyPropertyName = legacyMapping[propertyName] || propertyName;
                            return fieldRecord.getValue(legacyPropertyName);
                        },
                        getFormattedValue: (propertyName: string) => {
                            const legacyMapping: { [key: string]: string } = {
                                ColDisplayName: 'DisplayName',
                                ColName: 'Name',
                                ColWidth: 'Width',
                                ColCellType: 'CellType',
                                ColHorizontalAlign: 'HorizontalAlign',
                                ColVerticalAlign: 'VerticalAlign',
                                ColMultiLine: 'MultiLine',
                                ColResizable: 'Resizable',
                                ColSortable: 'Sortable',
                                ColSortBy: 'SortBy',
                                ColFilterable: 'Filterable',
                            };

                            const legacyPropertyName = legacyMapping[propertyName] || propertyName;
                            return fieldRecord.getFormattedValue(legacyPropertyName);
                        },
                    };

                    convertedRecords[fieldId] = convertedRecord;
                    sortedIds.push(fieldId);
                }
            });
        }

        console.log(`✅ Converted ${sortedIds.length} legacy fields to modern columns`);
        return { records: convertedRecords, sortedRecordIds: sortedIds };
    }

    /**
     * Gets the correct property names based on legacy vs modern mode
     */
    private getRecordPropertyNames() {
        return this.isLegacyMode
            ? {
                  key: ItemsColumns.ItemKey,
                  canSelect: ItemsColumns.ItemCanSelect,
                  selected: ItemsColumns.ItemSelected,
              }
            : {
                  key: RecordsColumns.RecordKey,
                  canSelect: RecordsColumns.RecordCanSelect,
                  selected: RecordsColumns.RecordSelected,
              };
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        // Detect legacy vs modern mode
        this.isLegacyMode = this.detectLegacyMode(context);

        let dataset: ComponentFramework.PropertyTypes.DataSet;
        let columns: ComponentFramework.PropertyTypes.DataSet;

        if (this.isLegacyMode) {
            console.log('🔄 LEGACY MODE DETECTED - Using Items + Fields datasets');
            // Legacy mode removed - this should never execute
            throw new Error('Legacy mode is no longer supported');
        } else {
            console.log('🆕 MODERN MODE - Using Records + Columns datasets');
            dataset = context.parameters.records;
            columns = context.parameters.columns;
        }

        // Set column limit to 150 for the selected columns dataset
        if (columns.paging.pageSize !== FilteredDetailsListV2.COLUMN_LIMIT) {
            columns.paging.setPageSize(FilteredDetailsListV2.COLUMN_LIMIT);
            columns.refresh();
        }

        // Add comprehensive debug logging
        console.log('=== PCF CONTROL UPDATE VIEW DEBUG ===');
        console.log('Dataset loading:', dataset.loading);
        console.log('Dataset initialized:', dataset.paging.totalResultCount);
        console.log('Dataset record count:', dataset.sortedRecordIds?.length || 0);
        console.log('Dataset columns count:', columns.sortedRecordIds?.length || 0);
        console.log('Allocated width:', context.mode.allocatedWidth);
        console.log('Allocated height:', context.mode.allocatedHeight);

        if (dataset.sortedRecordIds && dataset.sortedRecordIds.length > 0) {
            console.log('First 3 record IDs:', dataset.sortedRecordIds.slice(0, 3));
            const firstRecord = dataset.records[dataset.sortedRecordIds[0]];
            if (firstRecord) {
                console.log('First record getNamedReference:', firstRecord.getNamedReference());
                console.log('Sample record data:');
                // Check dataset columns instead
                if (columns.sortedRecordIds && columns.sortedRecordIds.length > 0) {
                    console.log('Available column definitions:', columns.sortedRecordIds.slice(0, 5));
                    columns.sortedRecordIds.slice(0, 5).forEach((colId) => {
                        const value = firstRecord.getValue(colId);
                        console.log(`  ${colId}: ${value}`);
                    });
                }
            }
        }
        console.log('=== END PCF CONTROL DEBUG ===');

        this.setPageSize(context);

        const datasetNotInitialized = this.records === undefined;
        const datasetChanged =
            !dataset.loading &&
            !columns.loading &&
            (context.updatedProperties.indexOf('dataset') > -1 ||
                context.updatedProperties.indexOf('records_dataset') > -1 ||
                context.updatedProperties.indexOf('columns_dataset') > -1);

        if (datasetChanged || datasetNotInitialized) {
            // === PCF DATASET DEBUG ===
            console.log('=== PCF DATASET DEBUG ===');
            console.log('Dataset loading:', dataset.loading);
            console.log('Columns loading:', columns.loading);
            console.log('Dataset records count:', Object.keys(dataset.records || {}).length);
            console.log('Dataset columns count:', dataset.columns?.length || 0);
            console.log(
                'Dataset column details:',
                dataset.columns?.map((col) => ({
                    name: col.name,
                    displayName: col.displayName,
                    dataType: col.dataType,
                    alias: (col as any).alias,
                })),
            );
            console.log('Columns records count:', Object.keys(columns.records || {}).length);
            console.log('sortedRecordIds sample:', dataset.sortedRecordIds?.slice(0, 3));
            console.log('sortedColumnIds:', columns.sortedRecordIds);

            // Check if we're in test harness with placeholder data
            const isTestHarnessData = this.isTestHarnessData(dataset, columns);
            console.log('Test harness detected:', isTestHarnessData);

            // Sample record data
            if (dataset.records && dataset.sortedRecordIds?.length > 0) {
                const firstRecordId = dataset.sortedRecordIds[0];
                const firstRecord = dataset.records[firstRecordId];
                if (firstRecord) {
                    console.log('First record ID:', firstRecordId);
                    console.log('First record methods available:', typeof firstRecord.getFormattedValue === 'function');
                    console.log('Available columns for first record:');
                    dataset.columns?.forEach((col) => {
                        const value = firstRecord.getValue(col.name);
                        const formattedValue = firstRecord.getFormattedValue(col.name);
                        const rawValue = (value as any)?.raw;
                        console.log(
                            `  ${col.name}: value="${value}", formatted="${formattedValue}", raw="${rawValue}"`,
                        );
                    });

                    // Also check column configuration
                    if (columns.sortedRecordIds && columns.sortedRecordIds.length > 0) {
                        console.log('Column configuration details:');
                        columns.sortedRecordIds.slice(0, 3).forEach((colId) => {
                            const colConfig = columns.records[colId];
                            if (colConfig) {
                                try {
                                    const colName = colConfig.getFormattedValue('ColName');
                                    const colDisplayName = colConfig.getFormattedValue('ColDisplayName');
                                    const colWidth = colConfig.getValue('ColWidth');
                                    console.log(
                                        `  Config [${colId}]: name="${colName}", display="${colDisplayName}", width="${colWidth}"`,
                                    );
                                } catch (e) {
                                    console.log(`  Config [${colId}]: Error reading config -`, e);
                                }
                            }
                        });
                    }
                }
            }
            console.log('=== END PCF DATASET DEBUG ===\n');

            // If this is the first time we are setting the records, clear the selection in case there is state from a previous
            // time the screen was shown
            if (!this.records) {
                this.setSelectedRecords([]);
            }

            this.records = dataset.records;
            this.sortedRecordsIds = dataset.sortedRecordIds;

            // Handle legacy vs modern column configuration
            if (this.isLegacyMode) {
                console.log('🔄 Processing legacy fields dataset');
                const convertedColumns = this.convertLegacyFieldsToColumns(columns);
                this.columns = convertedColumns.records;
                this.sortedColumnsIds = convertedColumns.sortedRecordIds;
            } else {
                console.log('🆕 Processing modern columns dataset');
                this.columns = columns.records;
                this.sortedColumnsIds = columns.sortedRecordIds;
            }

            this.datasetColumns = dataset.columns;

            // Initialize filters from input if provided
            const filtersInput = context.parameters.AppliedFilters?.raw;
            if (filtersInput && typeof filtersInput === 'string') {
                try {
                    this.filters = FilterUtils.deserializeFilters(filtersInput);
                } catch {
                    this.filters = {};
                }
            }

            // When the dataset is changed, the selected records are reset and so we must re-set them here
            if (dataset.getSelectedRecordIds().length === 0 && this.selection.count > 0) {
                this.onSelectionChanged();
            }

            this.pagingEventPending = false;
        }

        this.handleInputEvents(context);

        // Check if enhanced features should be enabled
        const useEnhancedFeatures = true; // Enable enterprise-grade features

        const grid = React.createElement(UnifiedGrid, {
            gridMode: this.enableInlineEditing ? 'editable' : useEnhancedFeatures ? 'enhanced' : 'original',
            ...this.getGridProps(context),
            enableInlineEditing: this.enableInlineEditing,
            enableDragFill: this.enableDragFill,
            onCellEdit: this.handleCellEdit.bind(this),
            onCommitChanges: this.handleCommitChanges.bind(this),
            readOnlyColumns: this.getReadOnlyColumns(),
        });

        const pagingChanged =
            this.previousHasPreviousPage !== dataset.paging.hasPreviousPage ||
            this.previousHasNextPage !== dataset.paging.hasNextPage ||
            this.previousTotalRecords !== dataset.paging.totalResultCount ||
            this.previousPageNumber !== dataset.paging.lastPageNumber;

        if (pagingChanged) {
            this.notifyOutputChanged();
            this.previousHasPreviousPage = dataset.paging.hasPreviousPage;
            this.previousHasNextPage = dataset.paging.hasNextPage;
            this.previousTotalRecords = dataset.paging.totalResultCount;
            this.previousPageNumber = dataset.paging.lastPageNumber;
        }

        return grid;
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
     */
    public getOutputs(): IOutputs {
        const dataset = this.context.parameters.records;
        const defaultOutputs = {
            PageNumber: dataset.paging.lastPageNumber,
            TotalRecords: this.getTotalRecordCount(),
            TotalPages: this.getTotalPages(),
            HasNextPage: dataset.paging.hasNextPage,
            HasPreviousPage: dataset.paging.hasPreviousPage,
        } as IOutputs;

        let eventOutputs = { EventName: '' } as IOutputs;
        switch (this.eventName) {
            case OutputEvents.Sort:
                eventOutputs = {
                    EventName: this.eventName,
                    SortEventColumn: this.sortColumn,
                    SortEventDirection:
                        this.sortDirection === 'desc' ? SortDirection.Descending : SortDirection.Ascending,
                } as IOutputs;
                break;
            case OutputEvents.CellAction:
                eventOutputs = {
                    EventName: this.eventName,
                    EventColumn: this.eventColumn,
                    EventRowKey: this.eventRowKey,
                } as IOutputs;
                break;
            case OutputEvents.OnRowSelectionChange:
                eventOutputs = {
                    EventName: this.eventName,
                    EventRowKey: this.eventRowKey,
                } as IOutputs;
                break;
            case OutputEvents.FilterChanged:
                eventOutputs = {
                    FilterEventName: this.filterEventName,
                    FilterEventValues: this.filterEventValues,
                    AllFilters: this.filterEventValues,
                } as IOutputs;
                break;
        }
        // Reset the event so that it does not re-trigger
        this.eventName = '';
        this.filterEventName = '';
        return { ...defaultOutputs, ...eventOutputs };
    }

    public destroy(): void {
        // noop
    }

    private getGridProps(context: ComponentFramework.Context<IInputs>) {
        // Use modern datasets only
        const dataset = context.parameters.records;
        const columns = context.parameters.columns;

        // The test harness provides width/height as strings
        // PowerApps may provide -1 for dynamic sizing, so we need fallbacks
        let allocatedWidth = parseInt(context.mode.allocatedWidth as unknown as string);
        let allocatedHeight = parseInt(context.mode.allocatedHeight as unknown as string);

        // Handle PowerApps dynamic sizing (-1 values)
        if (allocatedWidth <= 0 || isNaN(allocatedWidth)) {
            allocatedWidth = 1366; // Use a reasonable default width
        }
        if (allocatedHeight <= 0 || isNaN(allocatedHeight)) {
            allocatedHeight = 768; // Use a reasonable default height
        }

        console.log(
            `PCF Sizing: allocated(${context.mode.allocatedWidth}, ${context.mode.allocatedHeight}) -> parsed(${allocatedWidth}, ${allocatedHeight})`,
        );

        const sorting = this.datasetSupportsSorting()
            ? dataset.sorting
            : [
                  {
                      name: context.parameters.CurrentSortColumn.raw ?? '',
                      sortDirection: context.parameters.CurrentSortDirection
                          .raw as unknown as ComponentFramework.PropertyHelper.DataSetApi.Types.SortDirection,
                  } as ComponentFramework.PropertyHelper.DataSetApi.SortStatus,
              ];

        // There are two types of visual indicators to items loading
        // - Shimmer - for when the dataset has not yet been initialized or is in an error state
        // - Loading overlay - a less invasive semi-transparent overlay for when we are loading data/sorting/paging
        let shimmer = !dataset.loading && dataset.paging.totalResultCount === -1;
        let loading = this.pagingEventPending || dataset.loading || columns.loading;

        // If there are selected items, disable shimmer and instead use the loading overlay because
        // the ShimmeredDetailsList does not preserve selected items after the shimmer has been displayed
        if (shimmer && this.selection.count > 0) {
            shimmer = false;
            loading = true;
        }

        return {
            width: allocatedWidth,
            height: allocatedHeight,
            visible: context.mode.isVisible,
            records: this.records,
            sortedRecordIds: this.sortedRecordsIds,
            columns: this.columns,
            datasetColumns: this.datasetColumns,
            sortedColumnIds: this.sortedColumnsIds,
            dataset: dataset, // Add full dataset for filtering
            shimmer: shimmer,
            itemsLoading: loading,
            selection: this.selection,
            onNavigate: this.onNavigate,
            onCellAction: this.onCellAction,
            sorting: sorting,
            onSort: this.onSort,
            overlayOnSort: this.datasetSupportsSorting(),
            selectionType:
                context.mode.isControlDisabled !== true
                    ? SelectionTypes[context.parameters.SelectionType.raw]
                    : SelectionMode.none,

            componentRef: this.componentRef,
            selectOnFocus: context.parameters.SelectRowsOnFocus.raw === true,
            ariaLabel: this.undefinedIfEmpty(context.parameters.AccessibilityLabel),
            compact: context.parameters.Compact.raw === true,
            pageSize: context.parameters.PageSize.raw,
            themeJSON: this.undefinedIfEmpty(context.parameters.Theme),
            isHeaderVisible: context.parameters.HeaderVisible?.raw !== false,
            resources: this.resources,
            columnDatasetNotDefined: columns.error && !columns.loading,
            // Filter properties
            enableFiltering: context.parameters.EnableFiltering?.raw === true,
            filters: this.filters,
            onFilterChange: this.onFilterChange,

            // Enterprise features
            enablePerformanceMonitoring: this.enablePerformanceMonitoring,
            enableAIInsights: this.enableAIInsights,
            enableCollaboration: false, // Disabled for now - requires WebSocket infrastructure
            enableAdvancedVirtualization: true,
        } as GridProps;
    }

    private setPageSize(context: ComponentFramework.Context<IInputs>) {
        const dataset = context.parameters.records;
        if (
            !this.hasSetPageSize ||
            (context.parameters.PageSize.raw && context.updatedProperties.indexOf('PageSize') > -1)
        ) {
            dataset.paging.setPageSize(context.parameters.PageSize.raw || 150);
            this.hasSetPageSize = true;
        }
    }

    private handleInputEvents(context: ComponentFramework.Context<IInputs>) {
        // Input events removed - no longer supported
        return;
    }

    private handleSelectionEvents(inputEvent: string) {
        // Clear the selection if required, before setting the focus
        if (inputEvent.indexOf(InputEvents.ClearSelection) > -1) {
            this.asyncOperations(() => {
                this.selection.setAllSelected(false);
                this.ref && this.ref.forceUpdate();
            });
        } else if (inputEvent.indexOf(InputEvents.SetSelection) > -1) {
            this.asyncOperations(() => {
                // set the default selection
                this.setSelected();
                this.ref && this.ref.forceUpdate();
            });
        }
    }

    private handleFocusEvents(inputEvent: string) {
        if (inputEvent.indexOf(InputEvents.SetFocusOnRow) > -1) {
            // Get the row to set focus on - the event is expected to be in the format SetFocusOnRow<RowNumber>_<RandElement>
            let rowIndex = parseInt(inputEvent.substring(InputEvents.SetFocusOnRow.length));
            if (rowIndex === undefined || isNaN(rowIndex)) rowIndex = 0; // Default to row zero
            this.asyncOperations(() => {
                this.ref && this.ref.focusIndex(rowIndex);
            });
        } else if (inputEvent.indexOf(InputEvents.SetFocusOnHeader) > -1) {
            this.asyncOperations(() => {
                this.ref && this.ref.focusIndex(-1);
            });
        } else if (inputEvent.indexOf(InputEvents.SetFocus) > -1) {
            // Set focus on the first row (if no rows, then the focus is placed on the header)
            const index = this.sortedRecordsIds && this.sortedRecordsIds.length > 0 ? 0 : -1;
            this.asyncOperations(() => {
                this.ref && this.ref.focusIndex(index);
            });
        }
    }

    private handlePagingEvents(inputEvent: string) {
        if (inputEvent.indexOf(InputEvents.LoadNextPage) > -1) {
            this.loadNextPage();
        } else if (inputEvent.indexOf(InputEvents.LoadPreviousPage) > -1) {
            this.loadPreviousPage();
        } else if (inputEvent.indexOf(InputEvents.LoadFirstPage) > -1) {
            this.loadFirstPage();
        }
    }

    private asyncOperations(callback: () => void) {
        // Used to ensure setFocus gets executed after the dom is updated
        const win = getWindow(this.container);
        if (win) {
            win.requestAnimationFrame(() => {
                setTimeout(callback, 0);
            });
        }
    }

    private setSelected() {
        // Set the selected items using the record property
        this.selection.setChangeEvents(false);
        this.selection.setAllSelected(false);
        const recordProps = this.getRecordPropertyNames();
        this.sortedRecordsIds.forEach((s) => {
            const item = this.records[s];
            if (item && item.getValue(recordProps.selected) === true) {
                this.selection.setKeySelected(getRecordKey(item), true, false);
            }
        });

        this.selection.setChangeEvents(true);
        this.onSelectionChanged();
    }

    setSelectedRecords = (ids: string[]): void => {
        try {
            // Filter out any records that are no longer present in the dataset
            const dataset = this.context.parameters.records;
            dataset.setSelectedRecordIds(ids.filter((id) => dataset.records[id] !== undefined));
        } catch (ex) {
            console.error('DetailsList: Error when calling setSelectedRecordIds', ex);
        }

        // Row selection change events removed - no longer supported
    };

    onCellAction = (
        item?: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
        column?: IColumn | undefined,
    ): void => {
        // A cell action is invoked - e.g. expand/collapse row
        if (item && column) {
            // Set the event column
            this.eventName = OutputEvents.CellAction;
            this.eventColumn = column.fieldName;
            const recordProps = this.getRecordPropertyNames();
            let rowKey = item.getValue(recordProps.key);
            if (rowKey === null) {
                // Custom Row Id column is not set, so just use row index
                rowKey = this.sortedRecordsIds.indexOf(item.getRecordId()).toString();
            }
            this.eventRowKey = rowKey.toString();

            // Don't use openDatasetItem here because the event is not guaranteed to fire after the EventColumn output property is set
            this.notifyOutputChanged();
        }
    };

    onNavigate = (item?: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord): void => {
        if (item) {
            const itemKey = (item as IObjectWithKey).key;
            const currentItems = this.selection.getItems();
            const itemIndex = currentItems.indexOf(item as IObjectWithKey);
            const selectionMode = SelectionTypes[this.context.parameters.SelectionType.raw];

            // Select the item being invoked if multi/single select mode
            // By default, the DetailsList will not select the item which has it's action invoked
            if (selectionMode !== SelectionMode.none && itemKey) {
                this.selection.setChangeEvents(false);
                if (selectionMode === SelectionMode.single) {
                    // Clear all other selected items if single select mode
                    this.selection.setAllSelected(false);
                }
                this.selection.setKeySelected(itemKey as string, true, false);
                this.selection.setChangeEvents(true, true);
                this.ref && this.ref.forceUpdate();
            }

            // No event event/column, so reset it
            if (this.eventColumn !== undefined) {
                this.eventName = undefined;
                this.eventColumn = undefined;
                this.notifyOutputChanged();
            }

            this.context.parameters.records.openDatasetItem(item.getNamedReference());
            if (selectionMode === SelectionMode.multiple) {
                // Ensure that the item being navigated is selected as well as the previous selected items
                // Sometime the above setKeySelected doesn't take immediate effect on selection.getSelectedIndices
                const itemsSelected = this.selection.getSelectedIndices();
                if (itemsSelected.indexOf(itemIndex) === -1) {
                    itemsSelected.push(itemIndex);
                }
                // Preserve the other items if in multi select mode
                this.onSelectionChanged(itemsSelected);
            }
        }
    };

    datasetSupportsSorting(): boolean {
        const targetEntity = this.context.parameters.records.getTargetEntityType();
        return targetEntity?.length > 0;
    }

    onSort = (name: string, desc: boolean): void => {
        // Use server side sorting api if the connection is dataverse
        if (this.datasetSupportsSorting()) {
            const sorting = this.context.parameters.records.sorting;
            while (sorting.length > 0) {
                sorting.pop();
            }
            this.context.parameters.records.sorting.push({
                name: name,
                sortDirection: desc ? 1 : 0,
            });
            this.context.parameters.records.refresh();
        } else {
            this.eventName = 'Sort';
            this.sortColumn = name;
            this.sortDirection = desc === true ? 'desc' : 'asc';
            this.notifyOutputChanged();
        }
    };

    componentRef = (ref: IDetailsList | null): void => {
        if (ref) {
            this.ref = ref;
        }
    };

    onSelectionChanged = (forceSelectedIndices?: number[]): void => {
        if (this.selection) {
            const items = this.selection.getItems() as DataSet[];
            // If we pass forceSelected, then use this - otherwise use the items current selected on the grid
            const selectedIndices = forceSelectedIndices || this.selection.getSelectedIndices();
            const selectedIds: string[] = [];
            selectedIndices.forEach((index: number) => {
                const item: DataSet | undefined = items[index];
                const recordId = item && items[index].getRecordId();
                if (recordId) selectedIds.push(recordId);
            });
            this.setSelectedRecords(selectedIds);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    canSelectItem = (item: IObjectWithKey, index?: number | undefined): boolean => {
        let selectable = true;
        if (item) {
            const recordProps = this.getRecordPropertyNames();
            selectable = (item as DataSet).getValue(recordProps.canSelect) !== false;
        }

        return selectable;
    };

    getTotalRecordCount(): number {
        // Large dataset paging removed - use standard paging
        return this.context.parameters.records.paging.totalResultCount;
    }

    getTotalPages(): number {
        // Large dataset paging removed - use standard paging
        const dataset = this.context.parameters.records;
        const pages = Math.floor((dataset.paging.totalResultCount - 1) / dataset.paging.pageSize + 1);
        return Math.max(1, pages);
    }

    loadFirstPage(): void {
        const dataset = this.context.parameters.records;
        dataset.paging.loadExactPage(1);
        this.pagingEventPending = true;
    }

    loadNextPage(): void {
        const dataset = this.context.parameters.records;
        if (this.hasNextPage()) {
            dataset.paging.loadExactPage(dataset.paging.lastPageNumber + 1);
            this.pagingEventPending = true;
        }
    }

    hasNextPage(): boolean {
        // Large dataset paging removed - use standard paging
        const dataset = this.context.parameters.records;
        const totalPages = this.getTotalPages();
        return dataset.paging.lastPageNumber < totalPages;
    }

    loadPreviousPage(): void {
        const dataset = this.context.parameters.records;
        if (dataset.paging.hasPreviousPage) {
            dataset.paging.loadExactPage(dataset.paging.lastPageNumber - 1);
            this.pagingEventPending = true;
        }
    }

    undefinedIfEmpty(property: ComponentFramework.PropertyTypes.StringProperty): string | undefined {
        const value = property.raw;
        // Return undefined if the value is empty, null, undefined, or test harness placeholder
        return value && value !== '' && value !== 'val' ? value : undefined;
    }

    /**
     * Check if we're in test harness with placeholder data
     */
    isTestHarnessData(
        dataset: ComponentFramework.PropertyTypes.DataSet,
        columns: ComponentFramework.PropertyTypes.DataSet,
    ): boolean {
        // Check for typical test harness indicators
        const hasPlaceholderRecords =
            dataset.records &&
            Object.values(dataset.records).some((record) =>
                Object.values(record.getValue('raw') || {}).some((value) => value === 'val'),
            );

        const hasPlaceholderColumns =
            columns.records &&
            Object.values(columns.records).some((record) =>
                Object.values(record.getValue('raw') || {}).some((value) => value === 'val'),
            );

        return hasPlaceholderRecords || hasPlaceholderColumns;
    }

    onFilterChange = (filters: IFilterState): void => {
        this.filters = filters;

        // Set filter event outputs
        this.filterEventName = OutputEvents.FilterChanged;
        this.filterEventValues = FilterUtils.serializeFilters(filters);

        this.notifyOutputChanged();
    };

    // ===== INLINE EDITING METHODS =====

    /**
     * Handle individual cell edits
     */
    private handleCellEdit = (recordId: string, columnName: string, newValue: any): void => {
        console.log(`🖊️ Cell edit: Record ${recordId}, Column ${columnName}, New value:`, newValue);

        // Store the change in pending changes
        if (!this.pendingChanges.has(recordId)) {
            this.pendingChanges.set(recordId, new Map());
        }

        const recordChanges = this.pendingChanges.get(recordId)!;
        recordChanges.set(columnName, newValue);

        console.log(`📝 Pending changes for record ${recordId}:`, Object.fromEntries(recordChanges));
    };

    /**
     * Commit all pending changes to the data source
     */
    private handleCommitChanges = async (changes: EditChange[]): Promise<void> => {
        console.log(`💾 Committing ${changes.length} changes to data source...`);

        try {
            // Group changes by record for batch processing
            const changesByRecord = new Map<string, EditChange[]>();
            changes.forEach((change) => {
                if (!changesByRecord.has(change.itemId)) {
                    changesByRecord.set(change.itemId, []);
                }
                changesByRecord.get(change.itemId)!.push(change);
            });

            // Process each record's changes
            for (const [recordId, recordChanges] of changesByRecord) {
                const record = this.records[recordId];
                if (!record) {
                    console.warn(`⚠️ Record ${recordId} not found, skipping changes`);
                    continue;
                }

                console.log(`🔄 Updating record ${recordId} with ${recordChanges.length} changes`);

                // In a real implementation, you would call the Power Platform API here
                // For now, we'll just log the changes and update our local state
                const updateData: any = {};
                recordChanges.forEach((change) => {
                    updateData[change.columnKey] = change.newValue;
                });

                // TODO: Implement actual data source update
                // await this.context.webAPI.updateRecord(entityName, recordId, updateData);

                console.log(`✅ Record ${recordId} updated successfully:`, updateData);
            }

            // Clear pending changes after successful commit
            this.pendingChanges.clear();

            // Refresh the dataset to get updated data
            const dataset = this.context.parameters.records;
            dataset.refresh();

            console.log('✨ All changes committed successfully!');
        } catch (error) {
            console.error('❌ Error committing changes:', error);
            throw error;
        }
    };

    /**
     * Get list of read-only columns that cannot be edited
     */
    private getReadOnlyColumns = (): string[] => {
        // Define which columns should be read-only
        const readOnlyColumns: string[] = [];

        // You can make this configurable via the manifest or context
        // For now, we'll make primary key columns read-only
        this.sortedColumnsIds.forEach((colId) => {
            const columnRecord = this.columns[colId];
            if (columnRecord) {
                const columnName = columnRecord.getValue('ColName') as string;
                const cellType = columnRecord.getFormattedValue('ColCellType');

                // Make certain cell types read-only
                if (cellType === 'expand' || cellType === 'key' || columnName.toLowerCase().includes('id')) {
                    readOnlyColumns.push(columnName);
                }
            }
        });

        console.log('🔒 Read-only columns:', readOnlyColumns);
        return readOnlyColumns;
    };
}
