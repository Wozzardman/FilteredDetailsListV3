import * as React from 'react';
import { IColumn, SelectionMode, ISelection, MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import { Grid, GridProps } from '../Grid';
import { EditableGrid, EditChange } from './EditableGrid';
import { GridEnhanced } from '../GridEnhanced';
import { IFilterState } from '../Filter.types';
import { performanceMonitor } from '../performance/PerformanceMonitor';
import '../css/EditableGrid.css';
import '../css/UnifiedGrid.css';

export interface UnifiedGridProps extends GridProps {
    // Inline editing features
    enableInlineEditing?: boolean;
    enableDragFill?: boolean;
    onCellEdit?: (recordId: string, columnName: string, newValue: any) => void;
    onCommitChanges?: (changes: EditChange[]) => void;
    readOnlyColumns?: string[];

    // Grid mode selection
    gridMode?: 'original' | 'enhanced' | 'editable';
    useEnhancedFeatures?: boolean;
}

export const UnifiedGrid = React.memo((props: UnifiedGridProps) => {
    const {
        gridMode = 'enhanced',
        enableInlineEditing = false,
        enableDragFill = false,
        onCellEdit,
        onCommitChanges,
        readOnlyColumns = [],
        useEnhancedFeatures = true,
        records,
        sortedRecordIds,
        datasetColumns,
        columns,
        sortedColumnIds,
        dataset,
        height,
        width,
        itemsLoading,
        resources,
        enableFiltering = false,
        filters = {},
        onFilterChange,
        enablePerformanceMonitoring = false,
        ...gridProps
    } = props;

    const [isProcessingChanges, setIsProcessingChanges] = React.useState(false);

    // Performance monitoring
    const endMeasurement = enablePerformanceMonitoring
        ? performanceMonitor.startMeasure('unified-grid-render')
        : () => {};

    React.useEffect(() => {
        return () => {
            endMeasurement();
        };
    }, [endMeasurement]);

    // Convert PCF data to items for EditableGrid
    const items = React.useMemo(() => {
        if (!records || !sortedRecordIds) return [];

        return sortedRecordIds
            .filter((id) => id !== undefined)
            .map((id) => {
                const record = records[id];
                if (record) {
                    const item: any = {
                        key: record.getRecordId(),
                        id: record.getRecordId(),
                        getRecordId: () => record.getRecordId(),
                    };

                    // Add all column values
                    sortedColumnIds?.forEach((colId) => {
                        const columnRecord = columns?.[colId];
                        if (columnRecord) {
                            const columnName = columnRecord.getValue('ColName') as string;
                            if (columnName) {
                                item[columnName] = record.getFormattedValue(columnName);
                                item[`${columnName}_raw`] = record.getValue(columnName);
                            }
                        }
                    });

                    return item;
                }
                return null;
            })
            .filter((item) => item !== null);
    }, [records, sortedRecordIds, sortedColumnIds, columns]);

    // Convert PCF columns to IColumn format
    const editableColumns = React.useMemo(() => {
        if (!sortedColumnIds || !columns) return [];

        return sortedColumnIds
            .map((colId) => {
                const columnRecord = columns[colId];
                if (!columnRecord) return null;

                const columnName = columnRecord.getValue('ColName') as string;
                const displayName = columnRecord.getFormattedValue('ColDisplayName') || columnName;
                const width = (columnRecord.getValue('ColWidth') as number) || 150;
                const cellType = columnRecord.getFormattedValue('ColCellType');
                const isResizable = columnRecord.getValue('ColResizable') === true;

                const column: IColumn = {
                    key: `col-${colId}`,
                    name: displayName,
                    fieldName: columnName,
                    minWidth: Math.min(50, width),
                    maxWidth: width,
                    isResizable,
                    data: {
                        cellType,
                        columnRecord,
                    },
                };

                return column;
            })
            .filter((col) => col !== null) as IColumn[];
    }, [sortedColumnIds, columns]);

    // Inline editing handlers
    const handleCellEdit = React.useCallback(
        (item: any, columnKey: string, newValue: any) => {
            if (onCellEdit) {
                onCellEdit(item.key || item.id, columnKey, newValue);
            }
        },
        [onCellEdit],
    );

    const handleCommitChanges = React.useCallback(
        async (changes: EditChange[]) => {
            if (!onCommitChanges) return;

            setIsProcessingChanges(true);
            try {
                await onCommitChanges(changes);
            } finally {
                setIsProcessingChanges(false);
            }
        },
        [onCommitChanges],
    );

    // Get available values for dropdown fields
    const getAvailableValues = React.useCallback(
        (columnKey: string) => {
            if (!records) return [];

            const values = new Set<string>();
            Object.values(records).forEach((record) => {
                const value = record.getFormattedValue(columnKey);
                if (value && value !== '') {
                    values.add(value.toString());
                }
            });
            return Array.from(values).sort();
        },
        [records],
    );

    if (itemsLoading) {
        return (
            <div className="unified-grid-container">
                <div className="unified-grid-loading">
                    <Spinner size={SpinnerSize.large} label="Loading data..." />
                </div>
            </div>
        );
    }

    // Processing changes overlay
    if (isProcessingChanges) {
        return (
            <div className="unified-grid-container">
                <MessageBar messageBarType={MessageBarType.info}>
                    <Spinner size={SpinnerSize.small} style={{ marginRight: '8px' }} />
                    Processing changes...
                </MessageBar>
            </div>
        );
    }

    // Render based on grid mode
    switch (gridMode) {
        case 'editable':
            if (enableInlineEditing) {
                return (
                    <div className="unified-grid-editable-container">
                        <EditableGrid
                            items={items}
                            columns={editableColumns}
                            onCellEdit={handleCellEdit}
                            onCommitChanges={handleCommitChanges}
                            enableInlineEditing={enableInlineEditing}
                            enableDragFill={enableDragFill}
                            readOnlyColumns={readOnlyColumns}
                            getAvailableValues={getAvailableValues}
                            checkboxVisibility={2} // Hidden
                            selectionMode={SelectionMode.none}
                            isHeaderVisible={gridProps.isHeaderVisible}
                            compact={gridProps.compact}
                        />
                    </div>
                );
            }
        // Fall through to enhanced mode if inline editing is disabled

        case 'enhanced':
            if (useEnhancedFeatures) {
                return (
                    <GridEnhanced
                        {...gridProps}
                        records={records}
                        sortedRecordIds={sortedRecordIds}
                        datasetColumns={datasetColumns}
                        columns={columns}
                        sortedColumnIds={sortedColumnIds}
                        dataset={dataset}
                        height={height}
                        width={width}
                        itemsLoading={itemsLoading}
                        resources={resources}
                        enableFiltering={enableFiltering}
                        filters={filters}
                        onFilterChange={onFilterChange}
                        enablePerformanceMonitoring={enablePerformanceMonitoring}
                    />
                );
            }
        // Fall through to original mode if enhanced features are disabled

        case 'original':
        default:
            return (
                <Grid
                    {...gridProps}
                    records={records}
                    sortedRecordIds={sortedRecordIds}
                    datasetColumns={datasetColumns}
                    columns={columns}
                    sortedColumnIds={sortedColumnIds}
                    dataset={dataset}
                    height={height}
                    width={width}
                    itemsLoading={itemsLoading}
                    resources={resources}
                    enableFiltering={enableFiltering}
                    filters={filters}
                    onFilterChange={onFilterChange}
                    enablePerformanceMonitoring={enablePerformanceMonitoring}
                />
            );
    }
});

UnifiedGrid.displayName = 'UnifiedGrid';
