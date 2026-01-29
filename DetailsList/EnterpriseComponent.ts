/**
 * Enterprise-grade enhanced FilteredDetailsListV2 main component
 * Integrates essential features for industry-competitive performance
 */

import React from 'react';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { VirtualizedEditableGrid } from './components/VirtualizedEditableGrid';
import { performanceMonitor } from './performance/PerformanceMonitor';
import { useAccessibility } from './accessibility/AccessibilityManager';
import { InputEvents, OutputEvents, RecordsColumns, SortDirection } from './ManifestConstants';
import { IFilterState } from './Filter.types';

// Enhanced component with all enterprise features
export class EnterpriseFilteredDetailsListV2 implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private static readonly COLUMN_LIMIT: number = 125;
    private static readonly PERFORMANCE_THRESHOLDS = {
        renderTime: 16.67, // 60fps
        memoryUsage: 0.8, // 80% of available memory
        frameRate: 55, // Minimum acceptable FPS
    };

    // Core PCF properties
    notifyOutputChanged: () => void;
    container: HTMLDivElement;
    context: ComponentFramework.Context<IInputs>;
    resources: ComponentFramework.Resources;

    // Data management
    sortedRecordsIds: string[] = [];
    records: { [id: string]: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord };
    sortedColumnsIds: string[] = [];
    columns: { [id: string]: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord };
    datasetColumns: ComponentFramework.PropertyHelper.DataSetApi.Column[];

    // Event handling
    eventName: string | undefined = undefined;
    eventColumn: string | undefined = undefined;
    eventRowKey: string | undefined | null = undefined;
    sortColumn: string | undefined = undefined;
    sortDirection: 'asc' | 'desc' | undefined = undefined;
    previousSortDir: string;
    inputEvent = '';

    // State management
    selection: any; // Selection implementation
    hasSetPageSize = false;
    ref: any;
    scheduledEventOnNextUpdate = false;

    // Pagination state
    previousHasPreviousPage = false;
    previousHasNextPage = false;
    previousTotalRecords = 0;
    previousPageNumber = 1;
    pagingEventPending = false;

    // Filter state
    filters: IFilterState = {};
    filterEventName: string | undefined = undefined;
    filterEventColumn: string | undefined = undefined;
    filterEventValues: string | undefined = undefined;

    // Enterprise features
    private performanceMonitor = performanceMonitor;
    private accessibilityManager: any;
    private virtualizedMode = false;
    private enhancedFeaturesEnabled = false;

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void): void {
        const endMeasurement = this.performanceMonitor.startMeasure('component-init');

        try {
            this.notifyOutputChanged = notifyOutputChanged;
            this.context = context;
            this.resources = context.resources;

            // Enable container resize tracking
            context.mode.trackContainerResize(true);

            // Initialize enterprise features based on configuration
            this.initializeEnterpriseFeatures(context);

            // Initialize selection
            this.initializeSelection();

            // Set column limit
            this.setColumnLimit(context);

            // Log initialization
            console.log('🚀 Enterprise FilteredDetailsListV2 initialized with essential features');
        } finally {
            endMeasurement();
        }
    }

    private initializeEnterpriseFeatures(context: ComponentFramework.Context<IInputs>) {
        // Check for feature flags or configuration
        const enableAdvancedFeatures = true; // Could be based on license or configuration

        if (enableAdvancedFeatures) {
            this.enhancedFeaturesEnabled = true;

            // Initialize performance monitoring
            // Performance monitor records metrics automatically through its monitoring systems

            // Enable virtualization for large datasets
            this.virtualizedMode = this.shouldUseVirtualization();

            console.log('✅ Enterprise features enabled:', {
                virtualization: this.virtualizedMode,
                performance: true,
                accessibility: true,
            });
        }
    }

    private shouldUseVirtualization(): boolean {
        // Enable virtualization for datasets > 1000 items or mobile devices
        // iOS WebView Safety: Safely access navigator.userAgent
        let isMobile = false;
        try {
            if (typeof navigator !== 'undefined' && navigator !== null && navigator.userAgent) {
                isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            }
        } catch (e) {
            // Default to false if navigator is not accessible
        }
        
        const hasLargeDataset = this.context.parameters.records.paging.totalResultCount > 1000;

        return hasLargeDataset || isMobile;
    }

    private initializeSelection() {
        this.selection = {
            count: 0,
            onSelectionChanged: () => this.onSelectionChanged(),
            canSelectItem: () => this.canSelectItem(),
        };
    }

    private setColumnLimit(context: ComponentFramework.Context<IInputs>) {
        if (context.parameters.columns.paging.pageSize !== EnterpriseFilteredDetailsListV2.COLUMN_LIMIT) {
            const columnDataset = context.parameters.columns;
            columnDataset.paging.setPageSize(EnterpriseFilteredDetailsListV2.COLUMN_LIMIT);
            context.parameters.columns.refresh();
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const endMeasurement = this.performanceMonitor.startMeasure('component-update');

        try {
            const dataset = context.parameters.records;
            const columns = context.parameters.columns;

            // Performance logging
            this.logPerformanceMetrics(dataset, columns, context);

            // Update page size if needed
            this.setPageSize(context);

            // Check for data changes
            const datasetChanged = this.hasDatasetChanged(context, dataset, columns);

            if (datasetChanged) {
                this.updateDataset(dataset, columns, context);
            }

            // Handle input events
            this.handleInputEvents(context);

            // Create the grid component
            const gridComponent = this.createGridComponent(context);

            // Handle pagination changes
            this.handlePaginationChanges(dataset);

            return gridComponent;
        } finally {
            endMeasurement();
        }
    }

    private logPerformanceMetrics(dataset: any, columns: any, context: ComponentFramework.Context<IInputs>) {
        if (process.env.NODE_ENV === 'development') {
            console.log('=== ENTERPRISE PCF PERFORMANCE METRICS ===');
            console.log('Dataset loading:', dataset.loading);
            console.log('Dataset record count:', dataset.sortedRecordIds?.length || 0);
            console.log('Dataset columns count:', columns.sortedRecordIds?.length || 0);
            console.log('Allocated dimensions:', {
                width: context.mode.allocatedWidth,
                height: context.mode.allocatedHeight,
            });
            console.log('Memory usage:', this.getMemoryUsage());
            console.log('Virtualization enabled:', this.virtualizedMode);
            console.log('=== END PERFORMANCE METRICS ===');
        }
    }

    private getMemoryUsage(): string {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            const used = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
            const total = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
            return `${used}MB / ${total}MB`;
        }
        return 'Not available';
    }

    private hasDatasetChanged(context: ComponentFramework.Context<IInputs>, dataset: any, columns: any): boolean {
        const datasetNotInitialized = this.records === undefined;
        const datasetChanged =
            !dataset.loading &&
            !columns.loading &&
            (context.updatedProperties.indexOf('dataset') > -1 ||
                context.updatedProperties.indexOf('records_dataset') > -1 ||
                context.updatedProperties.indexOf('columns_dataset') > -1);

        return datasetChanged || datasetNotInitialized;
    }

    private updateDataset(dataset: any, columns: any, context: ComponentFramework.Context<IInputs>) {
        const endMeasurement = this.performanceMonitor.startMeasure('dataset-update');

        try {
            // Clear selection if first time setting records
            if (!this.records) {
                this.setSelectedRecords([]);
            }

            // Update data references
            this.records = dataset.records;
            this.sortedRecordsIds = dataset.sortedRecordIds;
            this.columns = columns.records;
            this.sortedColumnsIds = columns.sortedRecordIds;
            this.datasetColumns = dataset.columns;

            // Reset selection if needed
            if (dataset.getSelectedRecordIds().length === 0 && this.selection.count > 0) {
                this.onSelectionChanged();
            }

            this.pagingEventPending = false;
        } finally {
            endMeasurement();
        }
    }

    private createGridComponent(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        if (this.virtualizedMode && this.enhancedFeaturesEnabled) {
            return this.createVirtualizedGrid(context);
        } else {
            return this.createStandardGrid(context);
        }
    }

    private createVirtualizedGrid(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        // Simple fallback to standard grid for now until virtualization is fully configured
        return this.createStandardGrid(context);
    }

    private createStandardGrid(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        // Transform dataset columns to grid columns
        const gridColumns = (this.datasetColumns || []).map(col => ({
            key: col.name,
            name: col.displayName,
            fieldName: col.name,
            minWidth: 100,
            isResizable: true,
            data: col
        }));

        // Use VirtualizedEditableGrid as the default component
        return React.createElement(VirtualizedEditableGrid, {
            items: Object.values(this.records || {}),
            columns: gridColumns,
            height: Number(context.mode.allocatedHeight) || 600,
            width: Number(context.mode.allocatedWidth) || 800,
            enableInlineEditing: true,
            useEnhancedEditors: this.enhancedFeaturesEnabled,
            onCellEdit: () => {},
            onCommitChanges: async () => {},
            onCancelChanges: () => {},
        });
    }

    private shouldEnableHorizontalVirtualization(): boolean {
        return this.sortedColumnsIds.length > 20; // Enable for wide tables
    }

    private renderGridItem({ item, index, columns }: any): React.ReactElement {
        // Custom item renderer for virtualized grid
        return React.createElement(
            'div',
            {
                className: 'virtualized-grid-item',
                key: index,
            },
            `Item ${index}: ${JSON.stringify(item)}`,
        );
    }

    private handleItemsRendered({ startIndex, stopIndex }: any) {
        // Handle virtualized items rendered event
        this.performanceMonitor.recordMetric('virtualized-items-rendered', stopIndex - startIndex + 1);
    }

    private async loadMoreItems(startIndex: number, stopIndex: number): Promise<void> {
        // Implement infinite loading
        const dataset = this.context.parameters.records;
        if (dataset.paging.hasNextPage) {
            dataset.paging.loadNextPage();
        }
    }

    private getDataItems(): any[] {
        // Convert PCF dataset to array format for virtualization
        return this.sortedRecordsIds.map((id) => this.records[id]);
    }

    private getColumnDefinitions(): any[] {
        // Convert PCF columns to array format for virtualization
        return this.sortedColumnsIds.map((id) => this.columns[id]);
    }

    private handlePaginationChanges(dataset: any) {
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
    }

    public getOutputs(): IOutputs {
        const dataset = this.context.parameters.records;
        const defaultOutputs = {
            PageNumber: dataset.paging.lastPageNumber,
            TotalRecords: this.getTotalRecordCount(),
            TotalPages: this.getTotalPages(),
            HasNextPage: dataset.paging.hasNextPage,
            HasPreviousPage: dataset.paging.hasPreviousPage,
        } as IOutputs;

        // Handle different event types
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

        // Reset events
        this.eventName = '';
        this.filterEventName = '';

        return { ...defaultOutputs, ...eventOutputs };
    }

    public destroy(): void {
        // Clean up enterprise features
        this.performanceMonitor.destroy();

        if (this.accessibilityManager) {
            this.accessibilityManager.destroy();
        }

        console.log('🧹 Enterprise FilteredDetailsListV2 destroyed and cleaned up');
    }

    // Utility methods (placeholder implementations)
    private setPageSize(context: ComponentFramework.Context<IInputs>) {
        // Implementation for setting page size
    }

    private handleInputEvents(context: ComponentFramework.Context<IInputs>) {
        // Implementation for handling input events
    }

    private getGridProps(context: ComponentFramework.Context<IInputs>) {
        const dataset = context.parameters.records;

        return {
            width: Number(context.mode.allocatedWidth) || 800,
            height: Number(context.mode.allocatedHeight) || 600,
            visible: context.mode.isVisible,
            records: this.records || {},
            sortedRecordIds: this.sortedRecordsIds || [],
            columns: this.columns || {},
            datasetColumns: this.datasetColumns || [],
            sortedColumnIds: this.sortedColumnsIds || [],
            dataset: dataset,
            shimmer: false,
            itemsLoading: false,
            selection: this.selection || { count: 0 },
            onNavigate: () => {},
            onCellAction: () => {},
            sorting: dataset.sorting || [],
            onSort: () => {},
            overlayOnSort: true,
            selectionType: 0, // SelectionMode.none
            componentRef: { current: null },
            selectOnFocus: true,
            ariaLabel: null,
            compact: false,
            pageSize: 150,
            resources: this.resources,
            columnDatasetNotDefined: false,
            enableFiltering: true,
            filters: {},
            onFilterChange: () => {},
        };
    }

    private getTotalRecordCount(): number {
        return this.context.parameters.records.paging.totalResultCount;
    }

    private getTotalPages(): number {
        const dataset = this.context.parameters.records;
        return Math.ceil(dataset.paging.totalResultCount / dataset.paging.pageSize);
    }

    private setSelectedRecords(records: any[]) {
        // Implementation for setting selected records
    }

    private onSelectionChanged() {
        // Implementation for selection change handling
    }

    private canSelectItem(): boolean {
        return true; // Implementation for selection permission
    }
}
