import { IDetailsList, IObjectWithKey, SelectionMode, Selection, IColumn } from '@fluentui/react';
import * as React from 'react';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { getRecordKey } from './Grid';
import { UltimateEnterpriseGrid } from './components/UltimateEnterpriseGrid';
import { LoadingOverlay } from './components/LoadingOverlay';
import { InputEvents, OutputEvents, RecordsColumns, ItemsColumns, SortDirection } from './ManifestConstants';
import { IFilterState } from './Filter.types';
import { FilterUtils } from './FilterUtils';
import { performanceMonitor } from './performance/PerformanceMonitor';
import { AutoUpdateManager, RecordIdentity } from './services/AutoUpdateManager';
import { PowerAppsFxColumnEditorParser } from './services/PowerAppsFxColumnEditorParser';
import { SelectionManager, SelectionState } from './services/SelectionManager';
type DataSet = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord & IObjectWithKey;

// Native Power Apps selection state (similar to ComboBox.SelectedItems)
interface NativeSelectionState {
    selectedItems: Set<string>;
    selectAllState: 'none' | 'some' | 'all';
    selectedCount: number;
}

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
    
    // Add new row functionality
    private enableAddNewRow = false;
    private newRowCounter = 0;
    private newRowTemplate: any = {};
    private newRowCreated: any = null;
    private lastAddNewRowTrigger = '';
    
    // Auto-update manager for record identity and smart updates
    private autoUpdateManager: AutoUpdateManager = new AutoUpdateManager();
    
    // Performance-optimized selection manager
    private selectionManager: SelectionManager = new SelectionManager();
    
    // Native Power Apps selection state (like ComboBox.SelectedItems)
    private isSelectionMode: boolean = false;
    private nativeSelectionState: NativeSelectionState = {
        selectedItems: new Set(),
        selectAllState: 'none',
        selectedCount: 0
    };
    
    // Current change tracking for output properties
    private currentChangedRecordKey: string = '';
    private currentChangedColumn: string = '';
    private currentOldValue: string = '';
    private currentNewValue: string = '';
    private lastCommitTrigger: string = '';
    private lastCancelTrigger: string = '';
    private lastSaveTriggerReset: string = '';
    private lastSaveTimestamp: string = '';
    
    // Button event properties
    private buttonEventName: string = '';
    private buttonEventType: string = '';
    private clickedButtonName: string = '';
    private clickedButtonText: string = '';
    private buttonEventSequence: number = 0;
    
    // Dataset state tracking for cancel detection
    private previousDatasetState: {
        recordCount: number;
        lastRefreshTime: number;
        recordIds: string[];
    } = {
        recordCount: 0,
        lastRefreshTime: 0,
        recordIds: []
    };

    // Legacy compatibility mode flag
    private isLegacyMode = false; // Always use modern mode
    
    // Error state tracking and auto-recovery
    private isInErrorState = false;
    private errorRecoveryTimer: number | null = null;
    private errorRecoveryAttempts = 0;
    private maxRecoveryAttempts = 5;

    // Loading state tracking
    private isLoading = false;
    private loadingMessage = 'Loading...';
    private loadingStartTime = 0;

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void): void {
        const endMeasurement = performanceMonitor.startMeasure('component-init');

        try {
            this.notifyOutputChanged = notifyOutputChanged;
            this.context = context;
            context.mode.trackContainerResize(true);
            this.resources = context.resources;
            
            // Initialize native Power Apps selection (like ComboBox.SelectedItems)
            this.initializeNativeSelection();

            // Initialize enterprise features
            this.initializeEnterpriseFeatures();
        } finally {
            endMeasurement();
        }
    }

    private initializeNativeSelection(): void {
        // Initialize native Power Apps selection (similar to ComboBox.SelectedItems)
        // This uses the built-in PCF dataset selection APIs
        this.updateNativeSelectionState();
        
        // Subscribe to SelectionManager changes with optimized PCF integration
        this.selectionManager.subscribe((state: SelectionState) => {
            this.onSelectionManagerChange(state);
        });
        
        console.log('✅ Native Power Apps selection initialized with performance optimization');
    }

    /**
     * Update native selection state based on Power Apps dataset.getSelectedRecordIds()
     * This works like ComboBox.SelectedItems - Power Apps handles the selection logic
     * Also syncs with SelectionManager for performance optimization
     */
    private updateNativeSelectionState(): void {
        try {
            const dataset = this.context?.parameters?.records;
            if (!dataset) {
                console.log(`⚠️ updateNativeSelectionState: No dataset available`);
                return;
            }

            // Safely get selected IDs, handling undefined/null cases
            const selectedIds = dataset.getSelectedRecordIds() || [];
            
            console.log(`📊 updateNativeSelectionState: selectedIds from dataset:`, selectedIds);
            
            // Update native selection state for compatibility
            this.nativeSelectionState.selectedItems = new Set(selectedIds);
            this.nativeSelectionState.selectedCount = selectedIds.length;
            
            const totalItems = this.sortedRecordsIds?.length || 0;
            if (selectedIds.length === 0) {
                this.nativeSelectionState.selectAllState = 'none';
            } else if (selectedIds.length === totalItems && totalItems > 0) {
                this.nativeSelectionState.selectAllState = 'all';
            } else {
                this.nativeSelectionState.selectAllState = 'some';
            }

            // Sync with SelectionManager if in selection mode for performance optimization
            if (this.isSelectionMode && this.sortedRecordsIds?.length > 0) {
                // Only update SelectionManager if it doesn't match (avoid infinite loops)
                const currentManagerSelection = this.selectionManager.getSelectedItems();
                const areSelectionsSynced = selectedIds.length === currentManagerSelection.length &&
                    selectedIds.every(id => currentManagerSelection.includes(id));
                
                if (!areSelectionsSynced) {
                    this.selectionManager.initialize(this.sortedRecordsIds);
                    // Set selection from Power Apps dataset
                    selectedIds.forEach(id => this.selectionManager.setItemSelection(id, true));
                    console.log(`🔄 SelectionManager synced with Power Apps dataset selection`);
                }
            }
        } catch (error) {
            console.error('❌ Error in updateNativeSelectionState:', error);
            // Initialize with safe defaults
            this.nativeSelectionState = {
                selectedItems: new Set(),
                selectAllState: 'none',
                selectedCount: 0
            };
        }
        
        console.log(`📋 Updated nativeSelectionState:`, {
            selectedCount: this.nativeSelectionState.selectedCount,
            selectAllState: this.nativeSelectionState.selectAllState,
            selectedItems: Array.from(this.nativeSelectionState.selectedItems)
        });
    }

    /**
     * Get the first selected item as a JSON object (for Form Item compatibility)
     * This mimics how the original PowerCAT DetailsList works with .Selected
     */
    private getFirstSelectedItemJson(): string {
        try {
            const dataset = this.context?.parameters?.records;
            if (!dataset) {
                return '{}';
            }

            const selectedIds = dataset.getSelectedRecordIds() || [];
            if (selectedIds.length === 0) {
                return '{}';
            }

            // Get the first selected record
            const firstId = selectedIds[0];
            const record = dataset.records?.[firstId];
            if (!record) {
                return '{}';
            }

            // Return single record data in Power Apps format
            const item: any = {
                recordId: firstId,
            };
            
            // Add all column values to the selected item
            if (this.datasetColumns) {
                this.datasetColumns.forEach(col => {
                    try {
                        item[col.name] = record.getValue(col.name);
                    } catch (e) {
                        item[col.name] = null;
                    }
                });
            }
            
            return JSON.stringify(item);
        } catch (error) {
            console.error('❌ Error in getFirstSelectedItemJson:', error);
            return '{}';
        }
    }

    /**
     * Get selected items in Power Apps format (for internal use only - not exposed as output)
     * Power Apps automatically provides .SelectedItems through dataset selection mechanism
     */
    private getNativeSelectedItemsJson(): string {
        try {
            const dataset = this.context?.parameters?.records;
            if (!dataset) {
                console.log(`⚠️ getNativeSelectedItemsJson: No dataset available`);
                return '[]';
            }

            // Safely get selected IDs, handling undefined/null cases
            const selectedIds = dataset.getSelectedRecordIds() || [];
            
            const selectedItems = selectedIds.map(id => {
                const record = dataset.records?.[id];
                if (!record) return null;
            
                // Return record data in Power Apps format
                const item: any = {
                    recordId: id,
                    // Add all field values
                };
                
                // Add all column values to the selected item
                if (this.datasetColumns) {
                    this.datasetColumns.forEach(col => {
                        try {
                            item[col.name] = record.getValue(col.name);
                        } catch (e) {
                            item[col.name] = null;
                        }
                    });
                }
                
                return item;
            }).filter(item => item !== null);
            
            return JSON.stringify(selectedItems);
        } catch (error) {
            console.error('❌ Error in getNativeSelectedItemsJson:', error);
            return '[]';
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
     * Since metadata columns have been removed, these return null for fallback handling
     */
    private getRecordPropertyNames() {
        return this.isLegacyMode
            ? {
                  key: ItemsColumns.ItemKey,
                  canSelect: ItemsColumns.ItemCanSelect,
                  selected: ItemsColumns.ItemSelected,
              }
            : {
                  key: null, // RecordsColumns.RecordKey - removed from manifest
                  canSelect: null, // RecordsColumns.RecordCanSelect - removed from manifest
                  selected: null, // RecordsColumns.RecordSelected - removed from manifest
              };
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        try {
            // Store context for use in other methods
            this.context = context;
            
            // Detect dataset refresh/cancel operations BEFORE processing other changes
            this.detectDatasetCancel(context);
            
            // Handle selection mode toggle
            this.handleSelectionModeToggle(context);
            
            // Handle commit trigger input
            this.handleCommitTrigger(context);
            
            // Handle SaveTrigger reset
            this.handleSaveTriggerReset(context);
            
            // Handle Add New Row trigger
            this.handleAddNewRowTrigger(context);
            
            // Update native selection state from Power Apps dataset
            if (this.isSelectionMode) {
                this.updateNativeSelectionState();
            }
            
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

        // Validate datasets are available before proceeding
        if (!dataset || !columns) {
            console.warn('⚠️ Dataset or columns not available, returning empty grid');
            return React.createElement(UltimateEnterpriseGrid, {
                items: [],
                columns: [],
                height: 200,
                width: '100%',
                enableVirtualization: false,
                enableInlineEditing: false,
                enableFiltering: false,
                enableExport: false,
                enableSelectionMode: false,
                onCancelChanges: this.handleCancelOperation,
                headerTextSize: context.parameters.HeaderTextSize?.raw || 14,
                columnTextSize: context.parameters.ColumnTextSize?.raw || 13
            });
        }

        // Set column limit to 150 for the selected columns dataset
        if (columns.paging.pageSize !== FilteredDetailsListV2.COLUMN_LIMIT) {
            columns.paging.setPageSize(FilteredDetailsListV2.COLUMN_LIMIT);
            columns.refresh();
        }

        // Clear error state if we reach this point successfully
        if (this.isInErrorState) {
            console.log('✅ Error state cleared - control recovered successfully');
            this.isInErrorState = false;
            this.errorRecoveryAttempts = 0;
            this.clearErrorRecoveryTimer();
        }

        // Handle loading state - show loading overlay instead of error messages
        if (dataset.loading || columns.loading) {
            this.startLoading('Loading data...');
            console.log('📊 Datasets still loading, showing loading overlay');
            
            // Return basic grid structure with loading overlay
            return React.createElement('div', {
                style: {
                    position: 'relative',
                    width: (context.mode.allocatedWidth && context.mode.allocatedWidth > 0) ? context.mode.allocatedWidth : '100%',
                    height: (context.mode.allocatedHeight && context.mode.allocatedHeight > 0) ? context.mode.allocatedHeight : 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--neutralLighterAlt, #faf9f8)',
                    border: '1px solid var(--neutralQuaternaryAlt, #e1dfdd)',
                    borderRadius: '2px'
                }
            }, React.createElement(LoadingOverlay, {
                message: this.loadingMessage,
                isVisible: true,
                theme: context.parameters.Theme?.raw === 'dark' ? 'dark' : 'light'
            }));
        } else {
            // Stop loading when data is ready
            this.stopLoading();
        }

        // Add comprehensive debug logging
        console.log('=== PCF CONTROL UPDATE VIEW DEBUG ===');
        console.log('Dataset loading:', dataset.loading);
        console.log('Dataset initialized:', dataset.paging.totalResultCount);
        console.log('Dataset record count:', dataset.sortedRecordIds?.length || 0);
        console.log('Dataset columns count:', columns.sortedRecordIds?.length || 0);
        console.log('Allocated width:', context.mode.allocatedWidth);
        console.log('Allocated height:', context.mode.allocatedHeight);
        console.log('📐 SIZING DEBUG - Using dimensions:', {
            width: context.mode.allocatedWidth > 0 ? context.mode.allocatedWidth : '100%',
            height: context.mode.allocatedHeight > 0 ? context.mode.allocatedHeight : 400,
            allocatedWidth: context.mode.allocatedWidth,
            allocatedHeight: context.mode.allocatedHeight,
            isSelectionMode: this.isSelectionMode
        });

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

            // Initialize SelectionManager with current dataset items for performance optimization
            if (this.isSelectionMode && this.sortedRecordsIds?.length > 0) {
                this.selectionManager.initialize(this.sortedRecordsIds);
                console.log(`🚀 SelectionManager initialized with ${this.sortedRecordsIds.length} items`);
            }

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

            // Process column definitions from the columns dataset (not the records dataset metadata)
            const processedColumns: any[] = [];
            
            if (columns && columns.sortedRecordIds && columns.sortedRecordIds.length > 0) {
                console.log('🔍 Processing column definitions from columns dataset:', columns.sortedRecordIds.length);
                columns.sortedRecordIds.forEach(colId => {
                    const columnRecord = columns.records[colId];
                    if (columnRecord) {
                        try {
                            const columnName = columnRecord.getFormattedValue('ColName') || columnRecord.getValue('name');
                            const displayName = columnRecord.getFormattedValue('ColDisplayName') || columnRecord.getValue('displayName') || columnName;
                            const dataType = columnRecord.getValue('ColCellType') || columnRecord.getValue('dataType') || 'SingleLine.Text';
                            const defaultColumnWidth = context.parameters.DefaultColumnWidth?.raw || 150;
                            const colWidth = columnRecord.getValue('ColWidth') || defaultColumnWidth; // Use DefaultColumnWidth from manifest as fallback
                            
                            // Get alignment properties
                            const horizontalAlign = columnRecord.getValue('ColHorizontalAlign') || 'start';
                            const verticalAlign = columnRecord.getValue('ColVerticalAlign') || 'center';
                            const headerHorizontalAlign = columnRecord.getValue('ColHeaderHorizontalAlign') || horizontalAlign;
                            const headerVerticalAlign = columnRecord.getValue('ColHeaderVerticalAlign') || verticalAlign;
                            
                            // Get multiline property
                            const isMultiLine = columnRecord.getValue('ColMultiLine') === true;
                            
                            console.log(`🔧 Processing column: ${columnName} (${displayName}) - Width: ${colWidth} (default: ${defaultColumnWidth})`);
                            processedColumns.push({
                                name: columnName,
                                displayName: displayName,
                                dataType: dataType,
                                visualSizeFactor: colWidth, // Use the configured column width
                                horizontalAlign: horizontalAlign,
                                verticalAlign: verticalAlign,
                                headerHorizontalAlign: headerHorizontalAlign,
                                headerVerticalAlign: headerVerticalAlign,
                                isMultiLine: isMultiLine
                            });
                        } catch (e) {
                            console.warn(`⚠️ Error processing column ${colId}:`, e);
                        }
                    }
                });
            } else {
                console.log('⚠️ No columns dataset available, using data columns directly');
                // Use dataset columns directly since metadata columns are no longer defined
                const actualDataColumns = dataset.columns || [];
                actualDataColumns.forEach(col => {
                    console.log(`🔧 Direct column: ${col.name} (${col.displayName})`);
                    processedColumns.push({
                        name: col.name,
                        displayName: col.displayName,
                        dataType: col.dataType,
                        visualSizeFactor: col.visualSizeFactor || 1
                    });
                });
            }

            this.datasetColumns = processedColumns;

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

        // Convert records to items for UltimateEnterpriseGrid
        // Keep the PCF EntityRecord structure intact for proper data type handling
        const items = this.sortedRecordsIds.map(recordId => {
            const record = this.records[recordId];
            if (!record) return null;
            
            // Return the PCF EntityRecord directly with additional properties for grid compatibility
            const enhancedRecord = {
                ...record,
                recordId: recordId,
                key: recordId,
                // Add a getter method for the grid to access values by column name
                getValueByColumn: (columnName: string) => {
                    try {
                        return record.getValue(columnName);
                    } catch (e) {
                        return null;
                    }
                },
                // Add a getter for formatted values (for display)
                getFormattedValueByColumn: (columnName: string) => {
                    try {
                        return record.getFormattedValue(columnName);
                    } catch (e) {
                        return null;
                    }
                }
            };
            
            return enhancedRecord;
        }).filter(item => item !== null);

        // Add new rows from pending changes
        for (const [recordId, changes] of this.pendingChanges.entries()) {
            if (changes.get('isNewRow')) {
                // Create a new row item from the pending changes
                const newRowItem = {
                    recordId: recordId,
                    key: recordId,
                    isNewRow: true,
                    // Add a getter method for the grid to access values by column name
                    getValueByColumn: (columnName: string) => {
                        return changes.get(columnName) || '';
                    },
                    // Add a getter for formatted values (for display)
                    getFormattedValueByColumn: (columnName: string) => {
                        const value = changes.get(columnName);
                        return value ? String(value) : '';
                    },
                    // Add getValue method for compatibility
                    getValue: (columnName: string) => {
                        return changes.get(columnName) || '';
                    },
                    // Add getFormattedValue method for compatibility
                    getFormattedValue: (columnName: string) => {
                        const value = changes.get(columnName);
                        return value ? String(value) : '';
                    },
                    // Add missing PCF EntityRecord methods
                    getRecordId: () => recordId,
                    getNamedReference: () => ({ id: recordId, name: recordId, entityType: '' })
                } as any;
                
                // Add to the beginning of the items array so new rows appear at the top
                items.unshift(newRowItem);
            }
        }
        
        console.log('📋 Enhanced records for grid (preserving data types):', items.slice(0, 1)); // Log first item for debugging
        
        // Convert columns to UltimateEnterpriseGrid format using actual data columns
        const actualDataColumns = dataset.columns || [];
        const metadataColumns = [
            RecordsColumns.RecordKey,
            RecordsColumns.RecordCanSelect,
            RecordsColumns.RecordSelected,
            ItemsColumns.ItemKey,
            ItemsColumns.ItemCanSelect,
            ItemsColumns.ItemSelected
        ];
        
        const gridColumns = actualDataColumns
            .filter(col => !metadataColumns.includes(col.name as any))
            .map(col => {
                // Priority 1: Check if we have column configuration from columns dataset
                const columnConfig = this.datasetColumns?.find(c => c.name === col.name);
                const configuredWidth = columnConfig?.visualSizeFactor;
                
                // Get alignment from column config (if available)
                const horizontalAlign = (columnConfig as any)?.horizontalAlign || 'start';
                const verticalAlign = (columnConfig as any)?.verticalAlign || 'center';
                const headerHorizontalAlign = (columnConfig as any)?.headerHorizontalAlign || horizontalAlign;
                const headerVerticalAlign = (columnConfig as any)?.headerVerticalAlign || verticalAlign;
                const isMultiLine = (columnConfig as any)?.isMultiLine || false;
                
                // Priority 2: Use PCF dataset visualSizeFactor
                const pcfVisualSizeFactor = typeof col.visualSizeFactor === 'number' && !isNaN(col.visualSizeFactor) ? col.visualSizeFactor : 0;
                
                // Priority 3: Use DefaultColumnWidth from manifest
                const defaultWidth = context.parameters.DefaultColumnWidth?.raw || 150;
                
                // Determine final column width with priority order
                let columnWidth = defaultWidth;
                
                // Use configured width from columns dataset if available and reasonable
                if (configuredWidth && configuredWidth > 50 && configuredWidth <= 1000) {
                    columnWidth = configuredWidth;
                    console.log(`📏 Using columns dataset width for ${col.name}: ${columnWidth}`);
                }
                // Fall back to PCF visualSizeFactor if DefaultColumnWidth wasn't explicitly set
                else if (context.parameters.DefaultColumnWidth?.raw === undefined || context.parameters.DefaultColumnWidth?.raw === null) {
                    if (pcfVisualSizeFactor > 50 && pcfVisualSizeFactor <= 500) {
                        columnWidth = pcfVisualSizeFactor;
                        console.log(`📏 Using PCF visualSizeFactor for ${col.name}: ${columnWidth}`);
                    }
                }
                else {
                    console.log(`� Using default width for ${col.name}: ${columnWidth}`);
                }
                
                console.log(`🔧 Final column config: ${col.name} (${col.displayName}) - ConfigWidth: ${configuredWidth}, PCF: ${pcfVisualSizeFactor}, Default: ${defaultWidth}, Final: ${columnWidth}`);
                
                // Check if column resizing is enabled globally and per-column
                const globalResizeEnabled = context.parameters.EnableColumnResizing?.raw ?? true;
                const columnResizable = globalResizeEnabled; // Could be extended to check per-column settings from columns dataset
                
                return {
                    key: col.name,
                    name: col.displayName,
                    fieldName: col.name,
                    minWidth: 50, // Reasonable minimum width for resizing
                    defaultWidth: columnWidth, // Custom property for the intended column width
                    maxWidth: Math.max(columnWidth * 3, 300), // Maximum 3x the default width or 300px minimum
                    isResizable: columnResizable,
                    filterable: true,
                    sortable: true,
                    editable: this.enableInlineEditing,
                    dataType: (col.dataType === 'DateAndTime.DateOnly' ? 'date' : 
                              col.dataType === 'DateAndTime.DateAndTime' ? 'date' : // Map datetime to date for now
                              col.dataType === 'Whole.None' ? 'number' : 
                              col.dataType === 'Decimal' ? 'number' :
                              col.dataType === 'Currency' ? 'number' : // Map currency to number for now
                              col.dataType === 'TwoOptions' ? 'boolean' : 'string') as 'string' | 'number' | 'date' | 'boolean',
                    // Add alignment properties
                    horizontalAligned: horizontalAlign,
                    verticalAligned: verticalAlign,
                    headerHorizontalAligned: headerHorizontalAlign,
                    headerVerticalAligned: headerVerticalAlign,
                    // Add multiline property
                    isMultiline: isMultiLine,
                    // Add PCF-specific properties for proper data access
                    pcfDataType: col.dataType,
                    pcfColumnName: col.name
                };
            });
            
        console.log(`✅ Final grid columns: ${gridColumns.length}`, gridColumns.map(c => c.name));

        // Create a wrapper for handleCellEdit to match the expected signature
        const onCellEditWrapper = (item: any, column: any, newValue: any) => {
            const recordId = getRecordKey(item);
            this.handleCellEdit(recordId, column.fieldName, newValue);
        };

        // Parse column editor configuration from app
        const useEnhancedEditors = context.parameters.UseEnhancedEditors?.raw ?? false;
        let columnEditorMapping: any = {};
        
        if (useEnhancedEditors) {
            // Priority 1: Table-based configuration (new Power Apps native approach)
            const editorConfigDataset = (context.parameters as any).editorConfig;
            if (editorConfigDataset && editorConfigDataset.records) {
                try {
                    const records = editorConfigDataset.records;
                    const recordIds = Object.keys(records);
                    console.log('📊 Processing table-based editor configuration with', recordIds.length, 'records');
                    
                    for (const recordId of recordIds) {
                        const record = records[recordId];
                        const columnKey = record.getValue('ColumnKey') as string;
                        const editorType = record.getValue('EditorType') as string;
                        
                        if (columnKey && editorType) {
                            const config: any = {
                                type: editorType.toLowerCase()
                            };
                            
                            // Map table columns to configuration properties
                            const isRequired = record.getValue('IsRequired');
                            const isReadOnly = record.getValue('IsReadOnly');
                            const placeholder = record.getValue('Placeholder');
                            const minValue = record.getValue('MinValue');
                            const maxValue = record.getValue('MaxValue');
                            const maxLength = record.getValue('MaxLength');
                            const isMultiline = record.getValue('IsMultiline');
                            const validationPattern = record.getValue('ValidationPattern');
                            const patternErrorMessage = record.getValue('PatternErrorMessage');
                            const dropdownOptions = record.getValue('DropdownOptions');
                            const allowDirectTextInput = record.getValue('AllowDirectTextInput');
                            const currencySymbol = record.getValue('CurrencySymbol');
                            const decimalPlaces = record.getValue('DecimalPlaces');
                            const stepValue = record.getValue('StepValue');
                            const showTime = record.getValue('ShowTime');
                            const dateFormat = record.getValue('DateFormat');
                            const maxRating = record.getValue('MaxRating');
                            const allowZeroRating = record.getValue('AllowZeroRating');
                            const showSliderValue = record.getValue('ShowSliderValue');
                            
                            // Apply common properties
                            if (isRequired !== null && isRequired !== undefined) config.isRequired = isRequired;
                            if (isReadOnly !== null && isReadOnly !== undefined) config.isReadOnly = isReadOnly;
                            if (placeholder) config.placeholder = placeholder;
                            if (allowDirectTextInput !== null && allowDirectTextInput !== undefined) config.allowDirectTextInput = allowDirectTextInput;
                            
                            // Apply type-specific configurations
                            if (editorType.toLowerCase() === 'text' || editorType.toLowerCase() === 'email' || editorType.toLowerCase() === 'url' || editorType.toLowerCase() === 'phone') {
                                if (maxLength) config.textConfig = { ...config.textConfig, maxLength };
                                if (isMultiline) config.textConfig = { ...config.textConfig, multiline: isMultiline };
                                if (validationPattern) config.textConfig = { ...config.textConfig, pattern: validationPattern };
                                if (patternErrorMessage) config.textConfig = { ...config.textConfig, patternError: patternErrorMessage };
                            }
                            else if (editorType.toLowerCase() === 'number') {
                                if (minValue !== null && minValue !== undefined) config.numberConfig = { ...config.numberConfig, min: minValue };
                                if (maxValue !== null && maxValue !== undefined) config.numberConfig = { ...config.numberConfig, max: maxValue };
                                if (stepValue !== null && stepValue !== undefined) config.numberConfig = { ...config.numberConfig, step: stepValue };
                            }
                            else if (editorType.toLowerCase() === 'currency') {
                                if (currencySymbol) config.currencyConfig = { ...config.currencyConfig, currencySymbol };
                                if (decimalPlaces !== null && decimalPlaces !== undefined) config.currencyConfig = { ...config.currencyConfig, decimalPlaces };
                                if (minValue !== null && minValue !== undefined) config.currencyConfig = { ...config.currencyConfig, min: minValue };
                                if (maxValue !== null && maxValue !== undefined) config.currencyConfig = { ...config.currencyConfig, max: maxValue };
                            }
                            else if (editorType.toLowerCase() === 'dropdown') {
                                if (dropdownOptions) {
                                    try {
                                        // Support both JSON array and comma-separated values
                                        let options: any[];
                                        if (dropdownOptions.startsWith('[') && dropdownOptions.endsWith(']')) {
                                            options = JSON.parse(dropdownOptions);
                                        } else {
                                            options = dropdownOptions.split(',').map((opt: string) => opt.trim());
                                        }
                                        
                                        // Convert to the expected format
                                        config.dropdownOptions = options.map((opt: any) => {
                                            if (typeof opt === 'string' || typeof opt === 'number') {
                                                return { key: String(opt), text: String(opt) };
                                            }
                                            return opt; // Already in correct format
                                        });
                                    } catch (error) {
                                        console.warn(`⚠️ Error parsing dropdown options for ${columnKey}:`, error);
                                    }
                                }
                            }
                            else if (editorType.toLowerCase() === 'date') {
                                if (showTime !== null && showTime !== undefined) config.dateTimeConfig = { ...config.dateTimeConfig, showTime };
                                if (dateFormat) config.dateTimeConfig = { ...config.dateTimeConfig, format: dateFormat };
                            }
                            else if (editorType.toLowerCase() === 'rating') {
                                if (maxRating) config.ratingConfig = { ...config.ratingConfig, max: maxRating };
                                if (allowZeroRating !== null && allowZeroRating !== undefined) config.ratingConfig = { ...config.ratingConfig, allowZero: allowZeroRating };
                            }
                            else if (editorType.toLowerCase() === 'slider') {
                                if (minValue !== null && minValue !== undefined) config.sliderConfig = { ...config.sliderConfig, min: minValue };
                                if (maxValue !== null && maxValue !== undefined) config.sliderConfig = { ...config.sliderConfig, max: maxValue };
                                if (stepValue !== null && stepValue !== undefined) config.sliderConfig = { ...config.sliderConfig, step: stepValue };
                                if (showSliderValue !== null && showSliderValue !== undefined) config.sliderConfig = { ...config.sliderConfig, showValue: showSliderValue };
                            }
                            
                            columnEditorMapping[columnKey] = config;
                        }
                    }
                    
                    console.log('🎯 Table-based column editor configuration loaded:', columnEditorMapping);
                } catch (error) {
                    console.warn('⚠️ Error processing table-based editor configuration:', error);
                }
            }
            // Priority 2: Power Apps FX formulas (existing implementation)
            else if ((context.parameters as any).ColumnEditorFormulas?.raw) {
                const formulasProperty = (context.parameters as any).ColumnEditorFormulas;
                try {
                    columnEditorMapping = PowerAppsFxColumnEditorParser.parseSimpleFormulaString(
                        formulasProperty.raw
                    );
                    console.log('🚀 Column editor configuration loaded from Power Apps FX formulas:', columnEditorMapping);
                } catch (error) {
                    console.warn('⚠️ Error parsing Power Apps FX formulas:', error);
                }
            }
            // Priority 3: Legacy JSON configuration (backward compatibility)
            else if ((context.parameters as any).ColumnEditorConfig?.raw) {
                try {
                    columnEditorMapping = JSON.parse((context.parameters as any).ColumnEditorConfig.raw);
                    console.log('📝 Column editor configuration loaded from JSON (legacy):', columnEditorMapping);
                } catch (error) {
                    console.warn('⚠️ Invalid column editor configuration JSON:', error);
                }
            }
        }

        // Configure add new row functionality
        this.enableAddNewRow = context.parameters.EnableAddNewRow?.raw ?? false;

        const grid = React.createElement(UltimateEnterpriseGrid, {
            items,
            columns: gridColumns,
            height: (context.mode.allocatedHeight && context.mode.allocatedHeight > 0) ? context.mode.allocatedHeight : 400,
            width: (context.mode.allocatedWidth && context.mode.allocatedWidth > 0) ? context.mode.allocatedWidth : '100%', // Always provide a valid width
            enableVirtualization: true,
            virtualizationThreshold: 100,
            // Mode configuration - Selection mode disables inline editing
            enableInlineEditing: this.isSelectionMode ? false : this.enableInlineEditing,
            enableFiltering: true,
            enableExport: true,
            enableAddNewRow: this.enableAddNewRow,
            enablePerformanceMonitoring: this.enablePerformanceMonitoring,
            enableChangeTracking: !this.isSelectionMode, // Disable change tracking in selection mode
            useEnhancedEditors: this.isSelectionMode ? false : useEnhancedEditors,
            columnEditorMapping: columnEditorMapping,
            
            // Text size configuration from Power Apps properties
            headerTextSize: context.parameters.HeaderTextSize?.raw || 14,
            columnTextSize: context.parameters.ColumnTextSize?.raw || 13,
            
            // Row styling configuration
            alternateRowColor: context.parameters.AlternateRowColor?.raw || undefined,
            
            // Selection mode props - using performance-optimized SelectionManager
            enableSelectionMode: this.isSelectionMode,
            selectedItems: this.isSelectionMode ? this.selectionManager.getSelectionState().selectedItems : this.nativeSelectionState.selectedItems,
            selectAllState: this.isSelectionMode ? this.selectionManager.getSelectionState().selectAllState : this.nativeSelectionState.selectAllState,
            onItemSelection: this.handleItemSelection,
            onSelectAll: this.handleSelectAll,
            onClearAllSelections: this.handleClearAllSelections,
            
            // Excel Clipboard configuration (use fallback values if properties don't exist)
            enableExcelClipboard: (context.parameters as any).EnableExcelClipboard?.raw || false,
            onClipboardOperation: this.handleClipboardOperation,
            
            onCellEdit: onCellEditWrapper,
            onCommitChanges: this.handleSaveButtonClick,
            onCancelChanges: this.handleCancelOperation,
            onAddNewRow: this.handleAddNewRowButtonClick,
            getColumnDataType: (columnKey: string) => {
                const column = gridColumns.find(col => col.key === columnKey);
                const dataType = column?.dataType || 'string';
                // Map the data types to match the expected return types
                if (dataType === 'string') return 'text';
                if (dataType === 'number') return 'number';
                if (dataType === 'date') return 'date';
                if (dataType === 'boolean') return 'boolean';
                return 'text';
            },
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
        } catch (error) {
            console.error('❌ Error in updateView:', error);
            
            // Set error state and start recovery mechanism
            this.isInErrorState = true;
            this.startErrorRecovery();
            
            // If we're in recovery mode, show loading state instead of error
            if (this.errorRecoveryAttempts < this.maxRecoveryAttempts) {
                this.startLoading(`Recovering control... (attempt ${this.errorRecoveryAttempts + 1}/${this.maxRecoveryAttempts})`);
                
                return React.createElement('div', {
                    style: {
                        position: 'relative',
                        width: (context.mode.allocatedWidth && context.mode.allocatedWidth > 0) ? context.mode.allocatedWidth : '100%',
                        height: (context.mode.allocatedHeight && context.mode.allocatedHeight > 0) ? context.mode.allocatedHeight : 400,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--neutralLighterAlt, #faf9f8)',
                        border: '1px solid var(--neutralQuaternaryAlt, #e1dfdd)',
                        borderRadius: '2px'
                    }
                }, React.createElement(LoadingOverlay, {
                    message: this.loadingMessage,
                    isVisible: true,
                    theme: context.parameters.Theme?.raw === 'dark' ? 'dark' : 'light'
                }));
            }
            
            // Only show error fallback grid if recovery has failed
            const recoveryMessage = 'Control configuration error. Please check your settings and try again.';
            
            // Return a fallback grid with minimal configuration to prevent control crash
            const fallbackColumns = [{
                key: 'error',
                name: 'Error Loading Control',
                fieldName: 'error',
                minWidth: 150,
                maxWidth: 600,
                isResizable: true
            }];
            
            const fallbackItems = [{
                key: 'error-row',
                error: recoveryMessage
            }];
            
            return React.createElement(UltimateEnterpriseGrid, {
                items: fallbackItems,
                columns: fallbackColumns,
                height: 200,
                width: '100%',
                enableVirtualization: false,
                enableInlineEditing: false,
                enableFiltering: false,
                enableExport: false,
                enableSelectionMode: false,
                onCancelChanges: this.handleCancelOperation,
                headerTextSize: 14,
                columnTextSize: 13
            });
        }
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
            case 'ButtonEvent':
                eventOutputs = {
                    EventName: this.eventName,
                    ButtonEventName: this.buttonEventName,
                    ButtonEventType: this.buttonEventType,
                    ClickedButtonName: this.clickedButtonName,
                    ClickedButtonText: this.clickedButtonText,
                    ButtonEventSequence: this.buttonEventSequence,
                } as IOutputs;
                break;
        }
        
        // Add change event outputs
        const changeOutputs = {
            ChangedRecordKey: this.currentChangedRecordKey,
            ChangedColumn: this.currentChangedColumn,
            OldValue: this.currentOldValue,
            NewValue: this.currentNewValue,
            HasPendingChanges: this.pendingChanges.size > 0,
            ChangeCount: Array.from(this.pendingChanges.values())
                .reduce((total, recordChanges) => total + recordChanges.size, 0),
            PendingChanges: JSON.stringify(Array.from(this.pendingChanges.entries()).map(([recordId, changes]) => ({
                recordId,
                changes: Object.fromEntries(changes)
            })))
        } as IOutputs;

        // Add auto-update outputs
        const autoUpdateOutputs = {
            AutoUpdateFormula: this.currentChangedRecordKey ? 
                this.autoUpdateManager.generateUpdateFormula(this.currentChangedRecordKey) : '',
            RecordIdentityData: JSON.stringify(this.autoUpdateManager.getPendingChangesSummary()),
            PendingChangesSummary: JSON.stringify(this.autoUpdateManager.getPendingChangesSummary()),
            ValidationErrors: this.currentChangedRecordKey ? 
                JSON.stringify(this.autoUpdateManager.getRowContext(this.currentChangedRecordKey)?.validationErrors || {}) : '{}'
        } as IOutputs;

        // Add selection outputs using native Power Apps APIs - let Power Apps handle .Selected and .SelectedItems natively
        const selectionOutputs = {
            // Remove custom Selected and SelectedItems properties - Power Apps will automatically provide:
            // - dataset.Selected (single selection, direct field access like Gallery.Selected.FieldName)
            // - dataset.SelectedItems (multiple selection, direct field access like Gallery.SelectedItems.FieldName)
            SelectedCount: this.nativeSelectionState.selectedCount,
            SelectAllState: this.nativeSelectionState.selectAllState === 'none' ? '0' : 
                           this.nativeSelectionState.selectAllState === 'some' ? '1' : '2'
        } as IOutputs;
        
        // Add Power Apps integration outputs for enhanced inline editing
        const powerAppsIntegrationOutputs = {
            EditedRecords: JSON.stringify(this.getEditedRecordsForPowerApps()),
            EditedRecordsCount: this.pendingChanges.size,
            PatchFormula: this.generatePatchFormula(),
            ForAllFormula: this.generateForAllFormula(),
            EditedRecordKeys: JSON.stringify(Array.from(this.pendingChanges.keys())),
            
            // Direct Power Apps Patch Integration - separate components for executable formulas
            PatchDataSource: this.getPatchDataSourceName(),
            PatchRecord: this.getPatchRecordReference(),
            PatchChanges: this.getPatchChangesObject(),
            PatchChangesColumn: this.getPatchChangesColumn(),
            PatchChangesValue: this.getPatchChangesValue(),
            SaveTrigger: this.lastSaveTimestamp
        } as any;

        // Add new row outputs
        const newRowOutputs = {
            NewRowCreated: this.newRowCreated ? JSON.stringify(this.newRowCreated) : '',
            NewRowEventType: this.newRowCreated ? 'created' : '',
            NewRowKey: this.newRowCreated ? this.newRowCreated.id : ''
        } as IOutputs;
        
        // Reset the event so that it does not re-trigger
        this.eventName = '';
        this.filterEventName = '';
        
        // Clear new row created event after it's been returned
        if (this.newRowCreated) {
            setTimeout(() => {
                this.newRowCreated = null;
                console.log('🔄 New row created event cleared after output');
            }, 0);
        }
        
        // Immediately reset button event properties after they've been returned
        // This prevents them from persisting across subsequent OnChange events
        if (this.buttonEventName || this.buttonEventType || this.clickedButtonName || this.clickedButtonText) {
            // Reset on next tick to ensure Power Apps gets the current values first
            setTimeout(() => {
                this.buttonEventName = '';
                this.buttonEventType = '';
                this.clickedButtonName = '';
                this.clickedButtonText = '';
                console.log('🔄 Button event properties cleared after output');
            }, 0);
        }
        
        return { ...defaultOutputs, ...eventOutputs, ...changeOutputs, ...autoUpdateOutputs, ...selectionOutputs, ...powerAppsIntegrationOutputs, ...newRowOutputs };
    }

    public destroy(): void {
        // Clean up auto-recovery timer
        this.clearErrorRecoveryTimer();
        
        // Flush any pending SelectionManager updates to ensure Power Apps compatibility
        if (this.selectionManager) {
            this.selectionManager.flushPendingUpdates();
            console.log('🔄 SelectionManager pending updates flushed on destroy');
        }
    }

    /**
     * Start auto-recovery mechanism for error states
     */
    private startErrorRecovery(): void {
        if (this.errorRecoveryTimer || this.errorRecoveryAttempts >= this.maxRecoveryAttempts) {
            return; // Already running or max attempts reached
        }

        console.log(`🔄 Starting error recovery, attempt ${this.errorRecoveryAttempts + 1}/${this.maxRecoveryAttempts}`);
        
        this.errorRecoveryTimer = window.setTimeout(() => {
            this.errorRecoveryAttempts++;
            this.attemptRecovery();
        }, 2000); // Try recovery after 2 seconds
    }

    /**
     * Attempt to recover from error state
     */
    private attemptRecovery(): void {
        try {
            console.log('🔄 Attempting error recovery...');
            
            // Check if the conditions that caused the error are resolved
            const dataset = this.context.parameters.records;
            const columns = this.context.parameters.columns;
            
            if (dataset && columns && !dataset.loading && !columns.loading) {
                console.log('✅ Error conditions resolved, triggering re-render');
                this.isInErrorState = false;
                this.errorRecoveryAttempts = 0;
                this.clearErrorRecoveryTimer();
                
                // Force a re-render by notifying of output changes
                this.notifyOutputChanged();
            } else {
                console.log(`⏳ Error conditions still present, will retry (${this.errorRecoveryAttempts}/${this.maxRecoveryAttempts})`);
                
                if (this.errorRecoveryAttempts < this.maxRecoveryAttempts) {
                    // Schedule next recovery attempt
                    this.startErrorRecovery();
                } else {
                    console.log('❌ Max recovery attempts reached, giving up auto-recovery');
                    this.clearErrorRecoveryTimer();
                }
            }
        } catch (error) {
            console.error('❌ Error during recovery attempt:', error);
            this.clearErrorRecoveryTimer();
        }
    }

    /**
     * Clear the error recovery timer
     */
    private clearErrorRecoveryTimer(): void {
        if (this.errorRecoveryTimer) {
            window.clearTimeout(this.errorRecoveryTimer);
            this.errorRecoveryTimer = null;
        }
    }

    /**
     * Start loading state with optional message
     */
    private startLoading(message: string = 'Loading...'): void {
        this.isLoading = true;
        this.loadingMessage = message;
        this.loadingStartTime = Date.now();
        console.log(`🔄 Loading started: ${message}`);
    }

    /**
     * Stop loading state
     */
    private stopLoading(): void {
        if (this.isLoading) {
            const duration = Date.now() - this.loadingStartTime;
            console.log(`✅ Loading completed in ${duration}ms`);
        }
        this.isLoading = false;
        this.loadingMessage = 'Loading...';
        this.loadingStartTime = 0;
    }

    /**
     * Check if currently in loading state
     */
    private isCurrentlyLoading(): boolean {
        return this.isLoading;
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

    /**
     * Safe window access that avoids cross-origin issues
     */
    private getSafeWindow(): Window | null {
        try {
            // Try to access the current window safely
            return window;
        } catch (e) {
            // If there's a security error, return null
            console.warn('Window access blocked due to cross-origin policy:', e);
            return null;
        }
    }

    private asyncOperations(callback: () => void) {
        // Used to ensure setFocus gets executed after the dom is updated
        const win = this.getSafeWindow();
        if (win && win.requestAnimationFrame) {
            win.requestAnimationFrame(() => {
                setTimeout(callback, 0);
            });
        } else {
            // Fallback for when window access is blocked
            setTimeout(callback, 0);
        }
    }

    private setSelected() {
        // Set the selected items using the record property
        this.selection.setChangeEvents(false);
        this.selection.setAllSelected(false);
        const recordProps = this.getRecordPropertyNames();
        
        // Skip selection if metadata columns are not available
        if (recordProps.selected) {
            this.sortedRecordsIds.forEach((s) => {
                const item = this.records[s];
                if (item && item.getValue(recordProps.selected) === true) {
                    this.selection.setKeySelected(getRecordKey(item), true, false);
                }
            });
        }

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
            let rowKey: string | null = null;
            
            // Try to get row key from metadata column if available
            if (recordProps.key) {
                const keyValue = item.getValue(recordProps.key);
                rowKey = keyValue?.toString() || null;
            }
            
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

    /**
     * Handle SelectionManager state changes with optimized PCF integration
     * This provides debounced updates to improve performance while maintaining Power Apps compatibility
     */
    private onSelectionManagerChange = (state: SelectionState): void => {
        // Update native selection state to match SelectionManager
        this.nativeSelectionState.selectedItems = new Set(state.selectedItems);
        this.nativeSelectionState.selectAllState = state.selectAllState;
        this.nativeSelectionState.selectedCount = state.selectedCount;

        // Convert to array for PCF dataset API
        const selectedIds = Array.from(state.selectedItems);
        
        // Update PCF dataset with debounced selections - maintains Power Apps compatibility
        this.setSelectedRecords(selectedIds);
        
        // Trigger UI update
        this.notifyOutputChanged();
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    canSelectItem = (item: IObjectWithKey, index?: number | undefined): boolean => {
        let selectable = true;
        if (item) {
            const recordProps = this.getRecordPropertyNames();
            // Only check if canSelect property is available
            if (recordProps.canSelect) {
                selectable = (item as DataSet).getValue(recordProps.canSelect) !== false;
            }
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
     * Handle individual cell edits with auto-update tracking
     */
    private handleCellEdit = (recordId: string, columnName: string, newValue: any): void => {
        console.log(`🖊️ Cell edit: Record ${recordId}, Column ${columnName}, New value:`, newValue);

        // Get the original value before making changes
        const dataset = this.context.parameters.records;
        const currentRecord = dataset.records[recordId];
        const oldValue = currentRecord ? currentRecord.getValue(columnName) : '';

        // Ensure record is registered with AutoUpdateManager
        this.ensureRecordRegistered(recordId, currentRecord);

        // Update the field through AutoUpdateManager
        this.autoUpdateManager.updateField(recordId, columnName, newValue);

        // Store the change in pending changes (legacy support)
        if (!this.pendingChanges.has(recordId)) {
            this.pendingChanges.set(recordId, new Map());
        }

        const recordChanges = this.pendingChanges.get(recordId)!;
        recordChanges.set(columnName, newValue);

        // Update current change tracking for output properties
        this.currentChangedRecordKey = recordId;
        this.currentChangedColumn = columnName;
        this.currentOldValue = oldValue ? oldValue.toString() : '';
        this.currentNewValue = newValue ? newValue.toString() : '';

        console.log(`📝 Pending changes for record ${recordId}:`, Object.fromEntries(recordChanges));
        console.log(`🔄 Change event: ${recordId}.${columnName}: ${this.currentOldValue} → ${this.currentNewValue}`);
        
        // Auto-select the edited record for Power Apps .Selected integration
        this.autoSelectEditedRecord(recordId);
        
        // Notify PowerApps of the change
        this.notifyOutputChanged();
    };

    /**
     * Ensure a record is registered with the AutoUpdateManager
     */
    private ensureRecordRegistered = (recordId: string, record: any): void => {
        const context = this.autoUpdateManager.getRowContext(recordId);
        if (context) return; // Already registered

        // Get dataset information
        const dataset = this.context.parameters.records;
        
        // Build original values from current record
        const originalValues: Record<string, any> = {};
        const currentValues: Record<string, any> = {};
        
        if (record) {
            // Get all column values from the record
            const columns = this.context.parameters.columns;
            if (columns && columns.sortedRecordIds) {
                for (const columnId of columns.sortedRecordIds) {
                    try {
                        const value = record.getValue(columnId);
                        originalValues[columnId] = value;
                        currentValues[columnId] = value;
                    } catch (e) {
                        // Skip columns that can't be read
                    }
                }
            }
        }

        // Register the record with smart defaults
        const identity: Partial<RecordIdentity> = {
            recordId,
            entityName: dataset.getTitle() || 'Records',
            primaryKeyField: 'ID',
            dataSourceName: dataset.getTitle() || 'Records',
            originalValues,
            currentValues,
            updateMethod: 'patch',
            requiredFields: [], // You can customize this based on your needs
            fieldValidators: {
                // Add custom validators here
                'VTDate': (value: any) => {
                    if (value && isNaN(Date.parse(value))) {
                        return 'Invalid date format';
                    }
                    return null;
                },
                'Size': (value: any) => {
                    if (value && isNaN(Number(value))) {
                        return 'Must be a valid number';
                    }
                    return null;
                }
            },
            lookupFields: {
                // Define lookup relationships here
                'WeldType': {
                    targetEntity: 'PWeldTypes',
                    targetField: 'ID',
                    displayField: 'PWT'
                }
            }
        };

        this.autoUpdateManager.registerRecord(recordId, identity);
        console.log(`✅ Registered record ${recordId} with AutoUpdateManager`);
    };

    /**
     * Clear current change tracking (call this after processing a change)
     */
    private clearCurrentChange = (): void => {
        this.currentChangedRecordKey = '';
        this.currentChangedColumn = '';
        this.currentOldValue = '';
        this.currentNewValue = '';
    };

    /**
     * Get edited records formatted for Power Apps consumption
     */
    private getEditedRecordsForPowerApps = (): any[] => {
        const editedRecords: any[] = [];
        
        this.pendingChanges.forEach((changes, recordId) => {
            const record: any = { id: recordId };
            changes.forEach((newValue, columnName) => {
                record[columnName] = newValue;
            });
            editedRecords.push(record);
        });
        
        return editedRecords;
    };

    /**
     * Generate Patch formula for Power Apps integration
     */
    private generatePatchFormula = (): string => {
        if (this.pendingChanges.size === 0) {
            return '';
        }

        // Get the actual data source name from multiple potential sources
        const dataset = this.context.parameters.records;
        let dataSourceName = 'DataSource'; // Default fallback
        
        // Method 0: Check for manual override first (highest priority)
        const manualDataSourceName = this.undefinedIfEmpty(this.context.parameters.DataSourceName);
        if (manualDataSourceName) {
            dataSourceName = manualDataSourceName;
            console.log('✅ Using manually configured data source name:', dataSourceName);
        } else {
            // Enhanced data source detection with comprehensive logging
            try {
                console.log('🔍 Starting enhanced data source detection...');
                console.log('📊 Dataset object:', dataset);
                console.log('📋 Dataset properties:', Object.getOwnPropertyNames(dataset));
                console.log('📋 Dataset prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(dataset)));
                
                // Method 1: dataset.getTitle() - Primary method
                if (dataset.getTitle && typeof dataset.getTitle === 'function') {
                    const title = dataset.getTitle();
                    console.log('🎯 Method 1 - getTitle():', title);
                    if (title && title !== '' && title !== 'val') {
                        dataSourceName = title;
                        console.log('✅ Data source from getTitle():', dataSourceName);
                    }
                }

                // Method 2: getTargetEntityType() - For Dataverse connections
                if (!dataSourceName || dataSourceName === 'DataSource') {
                    if (dataset.getTargetEntityType && typeof dataset.getTargetEntityType === 'function') {
                        const entityType = dataset.getTargetEntityType();
                        console.log('🎯 Method 2 - getTargetEntityType():', entityType);
                        if (entityType && entityType !== '') {
                            dataSourceName = entityType;
                            console.log('✅ Data source from getTargetEntityType():', dataSourceName);
                        }
                    }
                }

            // Method 3: Direct entityType property
            if (!dataSourceName || dataSourceName === 'DataSource') {
                const entityType = (dataset as any).entityType;
                console.log('🎯 Method 3 - entityType property:', entityType);
                if (entityType && entityType !== '') {
                    dataSourceName = entityType;
                    console.log('✅ Data source from entityType property:', dataSourceName);
                }
            }

            // Method 4: Extract from getNamedReference()
            if (!dataSourceName || dataSourceName === 'DataSource') {
                if ((dataset as any).getNamedReference && typeof (dataset as any).getNamedReference === 'function') {
                    const namedRef = (dataset as any).getNamedReference();
                    console.log('🎯 Method 4 - getNamedReference():', namedRef);
                    if (namedRef && namedRef.entityType) {
                        dataSourceName = namedRef.entityType;
                        console.log('✅ Data source from getNamedReference().entityType:', dataSourceName);
                    }
                }
            }

            // Method 5: Check context for app-level information
            if (!dataSourceName || dataSourceName === 'DataSource') {
                console.log('🎯 Method 5 - Checking context for app info...');
                console.log('📋 Context properties:', Object.getOwnPropertyNames(this.context));
                
                // Try to find app or page context that might contain the Items property source
                if ((this.context as any).page) {
                    console.log('📄 Page context found:', (this.context as any).page);
                }
                if ((this.context as any).app) {
                    console.log('📱 App context found:', (this.context as any).app);
                }
            }

            // Method 6: Look at first record for more clues
            if (!dataSourceName || dataSourceName === 'DataSource') {
                if (dataset.records && Object.keys(dataset.records).length > 0) {
                    const firstRecordId = Object.keys(dataset.records)[0];
                    const firstRecord = dataset.records[firstRecordId];
                    console.log('🎯 Method 6 - Analyzing first record:', firstRecord);
                    console.log('📋 First record properties:', Object.getOwnPropertyNames(firstRecord));
                    console.log('📋 First record prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(firstRecord)));
                    
                    if (firstRecord && (firstRecord as any).getNamedReference) {
                        const ref = (firstRecord as any).getNamedReference();
                        console.log('🔗 Record named reference:', ref);
                        if (ref && ref.entityType) {
                            dataSourceName = ref.entityType;
                            console.log('✅ Data source from record getNamedReference().entityType:', dataSourceName);
                        }
                    }
                }
            }

            // Final fallback - if still DataSource, try common Power Apps table names
            if (dataSourceName === 'DataSource') {
                console.log('🤔 Still using fallback, checking for common patterns...');
                console.log('💡 Hint: You can manually set the DataSourceName property to override auto-detection');
            }

            } catch (error) {
                console.warn('⚠️ Error during data source detection:', error);
            }
        }
        
        console.log(`📊 Final data source determined: ${dataSourceName}`);
        
        const controlName = 'MyGrid'; // This could be made configurable
        const changes: string[] = [];
        
        // For the current changed record, generate the patch formula
        if (this.currentChangedRecordKey && this.pendingChanges.has(this.currentChangedRecordKey)) {
            const recordChanges = this.pendingChanges.get(this.currentChangedRecordKey);
            if (recordChanges) {
                recordChanges.forEach((newValue, columnName) => {
                    // Escape string values properly for Power Apps
                    const valueStr = typeof newValue === 'string' ? `"${newValue.replace(/"/g, '""')}"` : newValue;
                    changes.push(`${columnName}: ${valueStr}`);
                });
            }
        }

        if (changes.length === 0) {
            return '';
        }

        return `Patch(${dataSourceName}, ${controlName}.Selected, {${changes.join(', ')}})`;
    };

    /**
     * Generate ForAll formula for Power Apps integration
     */
    private generateForAllFormula = (): string => {
        if (this.pendingChanges.size === 0) {
            return '';
        }

        // Get the actual data source name from multiple potential sources (same logic as Patch formula)
        const dataset = this.context.parameters.records;
        let dataSourceName = 'DataSource'; // Default fallback
        
        // Try multiple methods to get the data source name
        try {
            // Method 1: Check if there's a title or name property
            if (dataset.getTitle && dataset.getTitle()) {
                dataSourceName = dataset.getTitle();
            }
            // Method 2: Try to get entity logical name (for Dataverse)
            else if ((dataset as any).getTargetEntityType && (dataset as any).getTargetEntityType()) {
                dataSourceName = (dataset as any).getTargetEntityType();
            }
            // Method 3: Check if we can extract from dataset metadata
            else if ((dataset as any).entityType) {
                dataSourceName = (dataset as any).entityType;
            }
            // Method 4: Look for any indication of table name in the dataset
            else if (dataset.records && Object.keys(dataset.records).length > 0) {
                const firstRecord = dataset.records[Object.keys(dataset.records)[0]];
                if (firstRecord && (firstRecord as any).getNamedReference) {
                    const ref = (firstRecord as any).getNamedReference();
                    if (ref && ref.entityType) {
                        dataSourceName = ref.entityType;
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not detect data source name for ForAll, using default:', error);
        }
        
        const controlName = 'MyGrid'; // This could be made configurable
        const allChanges: string[] = [];
        
        // Get all unique column names being changed
        const changedColumns = new Set<string>();
        this.pendingChanges.forEach((changes) => {
            changes.forEach((_, columnName) => {
                changedColumns.add(columnName);
            });
        });

        // Build the record update object
        const updateFields: string[] = [];
        changedColumns.forEach(columnName => {
            updateFields.push(`${columnName}: ThisRecord.${columnName}_Modified`);
        });

        if (updateFields.length === 0) {
            return '';
        }

        return `ForAll(${controlName}.SelectedItems, Patch(${dataSourceName}, ThisRecord, {${updateFields.join(', ')}}))`;
    };

    /**
     * Auto-select an edited record for Power Apps .Selected integration
     */
    private autoSelectEditedRecord = (recordId: string): void => {
        try {
            const dataset = this.context.parameters.records;
            
            // Check if the record exists in the dataset
            if (!dataset.records[recordId]) {
                console.log(`⚠️ Record ${recordId} not found in dataset for auto-selection`);
                return;
            }

            // Set the record as selected in the dataset
            // This makes it accessible via MyGrid.Selected in Power Apps
            dataset.setSelectedRecordIds([recordId]);
            
            // Update our internal selection state to stay in sync
            this.updateNativeSelectionState();
            
            console.log(`✅ Auto-selected edited record: ${recordId} for Power Apps .Selected integration`);
        } catch (error) {
            console.error('❌ Error auto-selecting edited record:', error);
        }
    };

    /**
     * Handle commit and cancel triggers with auto-update management
     */
    private handleCommitTrigger = (context: ComponentFramework.Context<IInputs>): void => {
        // Handle commit trigger
        const commitTrigger = context.parameters.CommitTrigger?.raw;
        if (commitTrigger && commitTrigger !== this.lastCommitTrigger) {
            // Instead of just clearing changes, trigger the auto-save workflow
            this.executeAutoSave();
            
            this.lastCommitTrigger = commitTrigger;
            this.notifyOutputChanged();
        }

        // Handle cancel trigger
        const cancelTrigger = context.parameters.CancelChangesTrigger?.raw;
        if (cancelTrigger && cancelTrigger !== this.lastCancelTrigger) {
            // Clear all pending changes without committing
            this.pendingChanges.clear();
            this.autoUpdateManager.clearAllChanges();
            this.clearCurrentChange();
            
            // Force a UI refresh to clear any visual pending change indicators
            if (this.ref) {
                this.ref.forceUpdate();
            }
            
            this.lastCancelTrigger = cancelTrigger;
            this.notifyOutputChanged();
        }
    };

    /**
     * Handle SaveTrigger reset input from Power Apps
     */
    private handleSaveTriggerReset = (context: ComponentFramework.Context<IInputs>): void => {
        const resetTrigger = context.parameters.SaveTriggerReset?.raw;
        if (resetTrigger && resetTrigger !== this.lastSaveTriggerReset) {
            console.log('🔄 Resetting SaveTrigger for next use');
            
            // Reset the SaveTrigger so it can be triggered again
            this.lastSaveTimestamp = '';
            this.lastSaveTriggerReset = resetTrigger;
            
            this.notifyOutputChanged();
        }
    };

    /**
     * Handle add new row trigger input from Power Apps
     */
    /**
     * Get new row template with priority order:
     * Priority 1: Table-based configuration (newRowTemplateConfig dataset)
     * Priority 2: JSON string configuration (NewRowTemplate property or column-specific template)
     */
    private getNewRowTemplate = (columnSpecificTemplate?: string): any => {
        let newRowTemplate: any = {};
        
        // Priority 1: Check for table-based configuration
        const templateConfigDataset = (this.context.parameters as any).newRowTemplateConfig;
        if (templateConfigDataset && templateConfigDataset.records) {
            try {
                const records = templateConfigDataset.records;
                const recordIds = Object.keys(records);
                console.log('📊 Processing table-based template configuration with', recordIds.length, 'records');
                
                for (const recordId of recordIds) {
                    const record = records[recordId];
                    const columnName = record.getValue('ColumnName') as string;
                    const defaultValue = record.getValue('DefaultValue') as string;
                    const valueType = record.getValue('ValueType') as string;
                    
                    if (columnName && defaultValue !== null && defaultValue !== undefined) {
                        // Convert value based on type
                        let processedValue: any = defaultValue;
                        
                        if (valueType) {
                            switch (valueType.toLowerCase()) {
                                case 'number':
                                case 'decimal':
                                case 'currency':
                                    processedValue = parseFloat(defaultValue);
                                    if (isNaN(processedValue)) processedValue = 0;
                                    break;
                                case 'integer':
                                case 'whole':
                                    processedValue = parseInt(defaultValue, 10);
                                    if (isNaN(processedValue)) processedValue = 0;
                                    break;
                                case 'boolean':
                                case 'twooptions':
                                    processedValue = defaultValue.toLowerCase() === 'true' || defaultValue === '1';
                                    break;
                                case 'date':
                                case 'datetime':
                                    // Keep as string for now, could be enhanced to parse dates
                                    processedValue = defaultValue;
                                    break;
                                default:
                                    // Keep as string
                                    processedValue = defaultValue;
                                    break;
                            }
                        }
                        
                        newRowTemplate[columnName] = processedValue;
                    }
                }
                
                console.log('🎯 Table-based new row template loaded:', newRowTemplate);
            } catch (error) {
                console.warn('⚠️ Error processing table-based template configuration:', error);
            }
        }
        
        // Priority 2: Fall back to JSON string configuration if table is empty or not provided
        if (Object.keys(newRowTemplate).length === 0) {
            // First try column-specific template if provided
            if (columnSpecificTemplate) {
                try {
                    newRowTemplate = JSON.parse(columnSpecificTemplate);
                    console.log('📝 Column-specific template loaded:', newRowTemplate);
                    return newRowTemplate;
                } catch (error) {
                    console.warn('⚠️ Invalid column-specific template JSON:', error);
                }
            }
            
            // Then try global template
            const newRowTemplateParam = this.context?.parameters?.NewRowTemplate?.raw;
            if (newRowTemplateParam) {
                try {
                    newRowTemplate = JSON.parse(newRowTemplateParam);
                    console.log('📝 Global JSON template loaded:', newRowTemplate);
                } catch (error) {
                    console.warn('⚠️ Invalid NewRowTemplate JSON:', error);
                    newRowTemplate = {};
                }
            }
        }
        
        return newRowTemplate;
    };

    private handleAddNewRowTrigger = (context: ComponentFramework.Context<IInputs>): void => {
        if (!this.enableAddNewRow) {
            return; // Add new row is not enabled
        }

        // Check for add new row trigger from any column
        const columns = context.parameters.columns;
        let triggerFound = false;
        let columnSpecificTemplate: string | undefined;

        if (columns && columns.columns) {
            for (const column of columns.columns) {
                const addNewRowTrigger = (column as any).AddNewRowTrigger?.raw;
                if (addNewRowTrigger && addNewRowTrigger !== this.lastAddNewRowTrigger) {
                    triggerFound = true;
                    this.lastAddNewRowTrigger = addNewRowTrigger;

                    // Get column-specific template if provided
                    columnSpecificTemplate = (column as any).NewRowTemplate?.raw;
                    break; // Use the first trigger found
                }
            }
        }

        if (triggerFound) {
            // Use the helper method to get template with priority order
            const newRowTemplate = this.getNewRowTemplate(columnSpecificTemplate);
            console.log('🆕 Add new row triggered with template:', newRowTemplate);
            this.createNewRow(newRowTemplate);
            this.notifyOutputChanged();
        }
    };

    /**
     * Apply auto-increment logic to template based on table configuration
     */
    private applyAutoIncrementToTemplate = (template: any, incrementIndex: number): void => {
        // Check for table-based configuration with AutoIncrement settings
        const templateConfigDataset = (this.context.parameters as any).newRowTemplateConfig;
        if (templateConfigDataset && templateConfigDataset.records) {
            try {
                const records = templateConfigDataset.records;
                const recordIds = Object.keys(records);
                
                for (const recordId of recordIds) {
                    const record = records[recordId];
                    const columnName = record.getValue('ColumnName') as string;
                    const defaultValue = record.getValue('DefaultValue') as string;
                    const valueType = record.getValue('ValueType') as string;
                    const autoIncrement = record.getValue('AutoIncrement') as boolean;
                    
                    // Only apply auto-increment if the column is configured for it
                    if (columnName && autoIncrement === true && template.hasOwnProperty(columnName)) {
                        let baseValue = template[columnName];
                        
                        // Convert base value to number if it's a string
                        if (typeof baseValue === 'string') {
                            const parsed = parseFloat(baseValue);
                            if (!isNaN(parsed)) {
                                baseValue = parsed;
                            }
                        }
                        
                        // Apply increment based on value type
                        if (typeof baseValue === 'number') {
                            template[columnName] = baseValue + incrementIndex;
                            console.log(`🔢 Auto-increment: ${columnName} = ${template[columnName]} (base: ${baseValue} + ${incrementIndex})`);
                        } else {
                            console.warn(`⚠️ Auto-increment skipped for ${columnName}: base value is not numeric (${typeof baseValue})`);
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ Error applying auto-increment:', error);
            }
        }
    };

    /**
     * Handle add new row button click from the UI
     */
    private handleAddNewRowButtonClick = (count: number = 1): void => {
        if (!this.enableAddNewRow) {
            return; // Add new row is not enabled
        }

        console.log('🆕 Add new row button clicked, creating', count, 'new rows');
        
        // Use the helper method to get template with priority order
        const baseTemplate = this.getNewRowTemplate();

        // Create the specified number of rows with auto-increment support
        for (let i = 0; i < count; i++) {
            // Clone the template for each row to avoid modifying the original
            const rowTemplate = { ...baseTemplate };
            
            // Apply auto-increment logic for each row
            this.applyAutoIncrementToTemplate(rowTemplate, i);
            
            this.createNewRow(rowTemplate);
        }
        
        this.notifyOutputChanged();
    };

    /**
     * Create a new row with the provided template
     */
    private createNewRow = (template: any = {}): void => {
        const dataset = this.context.parameters.records;
        if (!dataset) {
            console.warn('⚠️ Cannot create new row: dataset not available');
            return;
        }

        // Generate a unique temporary ID for the new row
        this.newRowCounter++;
        const tempId = `NEW_ROW_${this.newRowCounter}_${Date.now()}`;

        // Create new row data by merging template with required fields
        const newRowData: any = {
            id: tempId,
            isNewRow: true,
            ...template
        };

        // Get the columns to ensure all required fields are included
        const columns = this.context.parameters.columns;
        if (columns && columns.columns) {
            for (const column of columns.columns) {
                const fieldName = column.name || '';
                if (fieldName && !newRowData.hasOwnProperty(fieldName)) {
                    // Set default value based on column type
                    const dataType = column.dataType || 'SingleLine.Text';
                    switch (dataType) {
                        case 'Whole.None':
                        case 'Decimal':
                        case 'Currency':
                            newRowData[fieldName] = 0;
                            break;
                        case 'TwoOptions':
                            newRowData[fieldName] = false;
                            break;
                        case 'DateAndTime.DateOnly':
                        case 'DateAndTime.DateAndTime':
                            newRowData[fieldName] = null;
                            break;
                        default:
                            newRowData[fieldName] = '';
                            break;
                    }
                }
            }
        }

        console.log('🆕 Creating new row with data:', newRowData);

        // Add the new row to pending changes for tracking
        const changeMap = new Map<string, any>();
        for (const [key, value] of Object.entries(newRowData)) {
            changeMap.set(key, value);
        }
        changeMap.set('isNewRow', true);
        changeMap.set('timestamp', Date.now());
        this.pendingChanges.set(tempId, changeMap);

        // Trigger a refresh to show the new row
        this.notifyOutputChanged();

        // Set new row created output for Power Apps
        this.newRowCreated = {
            id: tempId,
            template: template,
            timestamp: new Date().toISOString()
        };
    };

    /**
     * Detect dataset refresh/cancel operations by monitoring dataset state changes
     */
    private detectDatasetCancel = (context: ComponentFramework.Context<IInputs>): void => {
        const dataset = context.parameters.records;
        const currentTime = Date.now();
        const currentRecordIds = dataset.sortedRecordIds;
        const currentRecordCount = dataset.sortedRecordIds.length;

        // Check if we have pending changes and the dataset has been refreshed
        if (this.pendingChanges.size > 0) {
            // Detect potential cancel scenarios:
            // 1. Record count changed unexpectedly
            // 2. Record IDs order changed significantly 
            // 3. Dataset was refreshed recently (within reasonable time window)
            
            const recordCountChanged = currentRecordCount !== this.previousDatasetState.recordCount;
            const recordIdsChanged = JSON.stringify(currentRecordIds) !== JSON.stringify(this.previousDatasetState.recordIds);
            const timeSinceLastRefresh = currentTime - this.previousDatasetState.lastRefreshTime;
            
            // If dataset state changed and we have pending changes, this might be a cancel operation
            if ((recordCountChanged || recordIdsChanged) && timeSinceLastRefresh > 100) {
                console.log('🔍 Dataset state change detected with pending changes - possible cancel operation');
                console.log('📊 Record count changed:', recordCountChanged, 'IDs changed:', recordIdsChanged);
                
                // Check if all our pending change record IDs still exist in the dataset
                let allRecordsStillExist = true;
                for (const recordId of this.pendingChanges.keys()) {
                    if (!currentRecordIds.includes(recordId)) {
                        allRecordsStillExist = false;
                        break;
                    }
                }
                
                // If records still exist but dataset refreshed, likely a cancel operation
                if (allRecordsStillExist && (recordIdsChanged || timeSinceLastRefresh < 2000)) {
                    console.log('🚫 Cancel operation detected - clearing pending changes');
                    this.handleCancelOperation();
                }
            }
        }
        
        // Update tracking state
        this.previousDatasetState = {
            recordCount: currentRecordCount,
            lastRefreshTime: currentTime,
            recordIds: [...currentRecordIds]
        };
    };

    /**
     * Handle cancel operation - clear all pending changes
     */
    private handleCancelOperation = (): void => {
        console.log('🚫 Executing cancel operation - clearing all pending changes');
        
        // Set button event properties
        this.triggerButtonEvent('Cancel Changes', 'cancel', 'Cancel Changes');
        
        // Clear all pending changes without committing
        this.pendingChanges.clear();
        this.autoUpdateManager.clearAllChanges();
        this.clearCurrentChange();
        
        // Force a UI refresh to clear any visual pending change indicators
        if (this.ref) {
            this.ref.forceUpdate();
        }
        
        // Notify Power Apps of the change
        this.notifyOutputChanged();
        
        console.log('✅ Cancel operation completed - all pending changes cleared');
    };

    /**
     * Execute auto-save workflow when built-in Save Changes button is clicked
     */
    private executeAutoSave = (): void => {
        try {
            // Get all pending changes from AutoUpdateManager
            const pendingChangesSummary = this.autoUpdateManager.getPendingChangesSummary();
            
            if (pendingChangesSummary.totalChanges === 0) {
                console.log('ℹ️ No pending changes to save');
                return;
            }

            console.log(`💾 Auto-saving ${pendingChangesSummary.totalChanges} changes across ${pendingChangesSummary.totalRecords} records`);

            // For each changed record, set it as the current change and trigger PowerApps
            pendingChangesSummary.recordSummaries.forEach((recordSummary, index) => {
                const modifiedFields = this.autoUpdateManager.getModifiedFields(recordSummary.recordId);
                
                if (recordSummary.modifiedFields.length > 0) {
                    // Set the first changed field as current (PowerApps will handle all fields)
                    const firstField = recordSummary.modifiedFields[0];
                    const newValue = modifiedFields[firstField];
                    
                    // Set this as the current change for PowerApps to process
                    this.currentChangedRecordKey = recordSummary.recordId;
                    this.currentChangedColumn = firstField;
                    this.currentNewValue = String(newValue || '');
                    
                    console.log(`📤 Triggering auto-save for record ${recordSummary.recordId}, field ${firstField} = ${this.currentNewValue}`);
                }
            });

            // Clear all pending changes after triggering saves
            this.pendingChanges.clear();
            this.autoUpdateManager.clearAllChanges();
            
        } catch (error) {
            console.error('❌ Error during auto-save:', error);
        }
    };

    /**
     * Handle save button click from UltimateEnterpriseGrid
     * Updates SaveTrigger output property to notify Power Apps
     */
    private handleSaveButtonClick = (): void => {
        try {
            console.log('💾 Save button clicked - triggering SaveTrigger for Power Apps');
            
            // Set button event properties
            this.triggerButtonEvent('Save Changes', 'save', `Save Changes (${this.pendingChanges.size})`);
            
            // Execute the auto-save workflow
            this.executeAutoSave();
            
            // Update SaveTrigger with current timestamp to notify Power Apps
            this.lastSaveTimestamp = Date.now().toString();
            
            // Notify output changed to trigger Power Apps OnChange
            this.notifyOutputChanged();
            
        } catch (error) {
            console.error('❌ Error handling save button click:', error);
        }
    };

    /**
     * Trigger a button event that can be detected in Power Apps OnChange/OnSelect
     * EventName is set to "ButtonEvent" to signal that button properties should be checked.
     * Note: Button event properties are automatically cleared after getOutputs() 
     * to prevent persistence across subsequent OnChange events
     */
    private triggerButtonEvent = (buttonName: string, buttonType: string, buttonText: string): void => {
        console.log(`🔘 Button event: ${buttonName} (${buttonType})`);
        
        // Increment sequence number for proper event ordering
        this.buttonEventSequence++;
        
        // Set EventName to "ButtonEvent" to signal button click detection
        this.eventName = 'ButtonEvent';
        this.buttonEventName = buttonName;
        this.buttonEventType = buttonType;
        this.clickedButtonName = buttonName;
        this.clickedButtonText = buttonText;
    };

    /**
     * Handle mode switching between Grid Edit Mode and Selection Mode
     */
    private handleSelectionModeToggle = (context: ComponentFramework.Context<IInputs>): void => {
        const enableSelectionMode = context.parameters.EnableSelectionMode?.raw;
        const selectionType = context.parameters.SelectionType?.raw;
        
        // Selection mode is enabled when EnableSelectionMode is true AND SelectionType is not None
        const isSelectionModeActive = !!enableSelectionMode && selectionType !== '0';
        
        if (isSelectionModeActive !== this.isSelectionMode) {
            this.isSelectionMode = isSelectionModeActive;
            
            if (this.isSelectionMode) {
                console.log('✅ Selection mode enabled - Grid editing disabled, row selection active');
                console.log(`   Selection type: ${selectionType === '1' ? 'Single' : 'Multiple'}`);
                // Update selection state from native Power Apps APIs
                this.updateNativeSelectionState();
            } else {
                console.log('❌ Grid edit mode enabled - Selection mode disabled, inline editing active');
                // Clear all selections using native Power Apps API
                const dataset = this.context.parameters.records;
                dataset.setSelectedRecordIds([]);
                this.updateNativeSelectionState();
            }
            
            this.notifyOutputChanged();
        }
    };

    /**
     * Handle selection events with performance optimization - ensures Power Apps' native .Selected property works
     */
    private handleItemSelection = (itemId: string): void => {
        console.log(`🔄 handleItemSelection called with itemId: ${itemId}, isSelectionMode: ${this.isSelectionMode}`);
        
        try {
            if (!this.isSelectionMode) {
                console.log(`⚠️ Selection mode not enabled, ignoring selection event`);
                return;
            }

            const selectionType = this.context.parameters.SelectionType?.raw;
            console.log(`📊 Selection type: ${selectionType}, using SelectionManager for performance`);
            
            if (selectionType === '1') {
                // Single selection mode - this enables Power Apps' native .Selected property
                const isCurrentlySelected = this.selectionManager.isItemSelected(itemId);
                if (isCurrentlySelected) {
                    // Deselect all if already selected
                    this.selectionManager.clearAll();
                    console.log(`✅ Deselected item: ${itemId}`);
                } else {
                    // Clear all and select only this item - populates Power Apps' .Selected property
                    this.selectionManager.clearAll();
                    this.selectionManager.setItemSelection(itemId, true);
                    console.log(`✅ Selected item: ${itemId} - Power Apps .Selected should now work`);
                }
            } else {
                // Multiple selection mode with performance optimization
                this.selectionManager.toggleItem(itemId);
                const isSelected = this.selectionManager.isItemSelected(itemId);
                console.log(`✅ Toggled selection for item: ${itemId}, now selected: ${isSelected}`);
            }
            
            console.log(`🚀 Selection updated using performance-optimized SelectionManager`);
        } catch (error) {
            console.error(`❌ Error in handleItemSelection for item ${itemId}:`, error);
        }
    };

    private handleSelectAll = (): void => {
        try {
            if (!this.isSelectionMode) {
                console.log(`⚠️ Selection mode not enabled, ignoring select all`);
                return;
            }

            // Performance optimization: Use SelectionManager's optimized batch operations
            const performanceStart = performance.now();
            
            const stats = this.selectionManager.getSelectionStats();
            console.log(`🚀 Select All using performance-optimized SelectionManager - Current stats:`, stats);
            
            // Use SelectionManager's built-in performance optimization for large datasets
            this.selectionManager.toggleSelectAll();
            
            const performanceEnd = performance.now();
            console.log(`🔄 Select all completed in ${(performanceEnd - performanceStart).toFixed(2)}ms using SelectionManager`);
        } catch (error) {
            console.error('❌ Error in handleSelectAll:', error);
        }
    };

    private handleClearAllSelections = (): void => {
        try {
            if (!this.isSelectionMode) {
                console.log(`⚠️ Selection mode not enabled, ignoring clear all`);
                return;
            }

            // Use SelectionManager's optimized clear operation
            this.selectionManager.clearAll();
            console.log('🗑️ All selections cleared using performance-optimized SelectionManager');
        } catch (error) {
            console.error('❌ Error in handleClearAllSelections:', error);
        }
    };

    /**
     * Handle clipboard operations (copy/paste)
     */
    private handleClipboardOperation = (operation: 'copy' | 'paste', data?: any): void => {
        try {
            console.log(`📋 Clipboard operation: ${operation}`, data);
            
            // Set output properties for Power Apps
            this.eventName = operation === 'copy' ? 'ClipboardCopy' : 'ClipboardPaste';
            this.eventRowKey = data?.targetIndex ? data.targetIndex.toString() : '';
            this.eventColumn = 'ClipboardData';
            
            // Store clipboard data for output
            if (operation === 'paste' && data?.data) {
                this.currentNewValue = JSON.stringify(data.data);
            }
            
            // Trigger output change event
            this.notifyOutputChanged();
        } catch (error) {
            console.error('❌ Error in handleClipboardOperation:', error);
        }
    };

    /**
     * Get data source name for direct Power Apps Patch integration
     */
    private getPatchDataSourceName = (): string => {
        const dataset = this.context.parameters.records;
        
        // Use the same logic as generatePatchFormula for consistency
        const manualDataSourceName = this.undefinedIfEmpty((this.context.parameters as any).DataSourceName);
        if (manualDataSourceName) {
            return manualDataSourceName;
        }
        
        // Auto-detect data source name
        try {
            if (dataset.getTitle && typeof dataset.getTitle === 'function') {
                const title = dataset.getTitle();
                if (title && title !== '' && title !== 'val') {
                    return title;
                }
            }
            
            if (dataset.getTargetEntityType && typeof dataset.getTargetEntityType === 'function') {
                const entityType = dataset.getTargetEntityType();
                if (entityType && entityType !== '') {
                    return entityType;
                }
            }
        } catch (error) {
            console.warn('⚠️ Error detecting data source name:', error);
        }
        
        return 'MasterWeldData'; // Fallback to your known data source
    };

    /**
     * Get record reference for direct Power Apps Patch integration
     */
    private getPatchRecordReference = (): string => {
        // Return the control name + .Selected for the currently edited record
        return 'MyGrid.Selected';
    };

    /**
     * Get changes object for direct Power Apps Patch integration
     */
    private getPatchChangesObject = (): string => {
        if (!this.currentChangedRecordKey || !this.pendingChanges.has(this.currentChangedRecordKey)) {
            return '{}';
        }

        const recordChanges = this.pendingChanges.get(this.currentChangedRecordKey);
        if (!recordChanges) {
            return '{}';
        }

        // Convert changes to Power Apps record format
        const changes: Record<string, any> = {};
        recordChanges.forEach((newValue, columnName) => {
            changes[columnName] = newValue;
        });

        return JSON.stringify(changes);
    };

    private getPatchChangesColumn = (): string => {
        if (!this.currentChangedRecordKey || !this.pendingChanges.has(this.currentChangedRecordKey)) {
            return '';
        }

        const recordChanges = this.pendingChanges.get(this.currentChangedRecordKey);
        if (!recordChanges || recordChanges.size === 0) {
            return '';
        }

        // Return the first changed column name
        const firstColumn = Array.from(recordChanges.keys())[0];
        return firstColumn || '';
    };

    private getPatchChangesValue = (): string => {
        if (!this.currentChangedRecordKey || !this.pendingChanges.has(this.currentChangedRecordKey)) {
            return '';
        }

        const recordChanges = this.pendingChanges.get(this.currentChangedRecordKey);
        if (!recordChanges || recordChanges.size === 0) {
            return '';
        }

        // Return the first changed value
        const firstValue = Array.from(recordChanges.values())[0];
        return firstValue?.toString() || '';
    };

    /**
     * Public method to clear all pending changes - for test harness compatibility
     * This method can be called directly when the test harness Cancel Changes button
     * doesn't properly set the CancelChangesTrigger property
     */
    public clearAllPendingChanges = (): void => {
        console.log('🧹 clearAllPendingChanges called directly (test harness workaround)');
        console.log('📊 Pending changes size before clear:', this.pendingChanges.size);
        
        // Clear all pending changes without committing
        this.pendingChanges.clear();
        this.autoUpdateManager.clearAllChanges();
        this.clearCurrentChange();
        
        console.log('📊 Pending changes size after clear:', this.pendingChanges.size);
        console.log('📊 Pending changes entries after clear:', Array.from(this.pendingChanges.entries()));
        
        // Force a UI refresh to clear any visual pending change indicators
        if (this.ref) {
            this.ref.forceUpdate();
        }
        
        // Notify PCF framework that outputs have changed
        this.notifyOutputChanged();
        
        console.log('🚫 All pending changes cleared via direct method call');
    };
}
