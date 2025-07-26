import * as React from 'react';
import { GridStoreProvider } from '../store/GridStore';
import { EnhancedGrid } from './EnhancedGrid';
import { GridProps } from '../Grid';
import { IColumn } from '@fluentui/react';
import { IGridConfiguration } from '../types/Advanced.types';

// Mapping PCF props to Enhanced Grid props
interface IEnhancedGridWrapperProps extends GridProps {
    useEnhancedFeatures?: boolean;
    configuration?: IGridConfiguration;
}

export const EnhancedGridWrapper: React.FC<IEnhancedGridWrapperProps> = ({
    useEnhancedFeatures = true,
    configuration,
    records,
    sortedRecordIds,
    datasetColumns,
    columns,
    sortedColumnIds,
    ...gridProps
}) => {
    // Transform PCF data to Enhanced Grid format
    const transformedData = React.useMemo(() => {
        console.log('=== DATA TRANSFORMATION DEBUG ===');
        console.log('records:', records ? `${Object.keys(records).length} records` : 'no records');
        console.log('sortedRecordIds:', sortedRecordIds);
        console.log('sortedRecordIds length:', sortedRecordIds?.length || 0);
        console.log('columns object keys:', columns ? Object.keys(columns) : 'no columns');
        console.log('datasetColumns:', datasetColumns);
        console.log('datasetColumns length:', datasetColumns?.length || 0);
        
        if (records && Object.keys(records).length > 0) {
            const firstRecordId = Object.keys(records)[0];
            const firstRecord = records[firstRecordId];
            console.log('First record sample:', firstRecordId);
            console.log('First record available columns:', Object.keys(columns || {}));
            console.log('First record column values:');
            Object.keys(columns || {}).forEach(colId => {
                const value = firstRecord?.getValue(colId);
                console.log(`  ${colId}: ${value} (raw: ${(value as any)?.raw})`);
            });
        }
        
        // 🚨 IMPROVED DATA DETECTION - Handle async loading properly
        const hasRecords = records && Object.keys(records).length > 0;
        const hasRecordIds = sortedRecordIds && sortedRecordIds.length > 0;
        const hasRealData = hasRecords && hasRecordIds;
        
        // Also check if we have columns configured (this means PowerApps is connected)
        const hasColumnsConfigured = (datasetColumns && datasetColumns.length > 0) || (columns && Object.keys(columns).length > 0);
        
        console.log('=== DATA DETECTION START ===');
        console.log('sortedRecordIds.length:', sortedRecordIds?.length || 0);
        console.log('records keys length:', records ? Object.keys(records).length : 0);
        console.log('datasetColumns length:', datasetColumns?.length || 0);
        console.log('columns keys:', columns ? Object.keys(columns) : []);
        console.log('hasRecords:', hasRecords);
        console.log('hasRecordIds:', hasRecordIds);
        console.log('hasColumnsConfigured:', hasColumnsConfigured);
        console.log('hasRealData evaluation:', hasRealData);
        console.log('=== DATA DETECTION END ===');

        // If we have columns configured but no data yet, return empty array but don't log error
        // This handles the async loading case where columns load before data
        if (!hasRealData) {
            if (hasColumnsConfigured) {
                console.log('⏳ COLUMNS CONFIGURED - waiting for data to load...');
            } else {
                console.log('❌ NO REAL DATA OR COLUMNS - returning empty array');
            }
            return [];
        }

        const result = sortedRecordIds
            .map((recordId) => {
                const record = records[recordId];
                if (!record) return null;

                // Transform PCF record to plain object
                const item: any = {
                    key: recordId,
                    id: recordId,
                };

                // Add column values using actual dataset columns if available
                if (datasetColumns && datasetColumns.length > 0) {
                    datasetColumns.forEach((datasetColumn) => {
                        const value = record.getValue(datasetColumn.name);
                        const processedValue = (value as any)?.raw || value;
                        
                        // Store value under the dataset column name
                        item[datasetColumn.name] = processedValue;
                        item[datasetColumn.alias || datasetColumn.name] = processedValue;
                    });
                } else {
                    // Fallback to column configuration if no dataset columns
                    Object.keys(columns).forEach((columnId) => {
                        const columnInfo = columns[columnId];
                        const value = record.getValue(columnId);
                        const processedValue = (value as any)?.raw || value;
                        
                        // Store value under the column ID
                        item[columnId] = processedValue;
                        
                        // Also try to get column name from column configuration
                        try {
                            const columnName = columnInfo.getFormattedValue('ColName') || columnId;
                            item[columnName] = processedValue;
                        } catch (e) {
                            // Ignore errors accessing column info
                        }
                    });
                }

                return item;
            })
            .filter(Boolean);
            
        console.log('Transformed data sample (first 2 items):', result.slice(0, 2));
        console.log('=== END DATA DEBUG ===\n');
        return result;
    }, [records, sortedRecordIds, columns, datasetColumns]);

    // Transform PCF columns to Enhanced Grid columns
    const transformedColumns: IColumn[] = React.useMemo(() => {
        console.log('=== COLUMN TRANSFORMATION DEBUG ===');
        console.log('datasetColumns (full objects):', datasetColumns);
        console.log('datasetColumns length:', datasetColumns?.length || 0);
        console.log('sortedColumnIds:', sortedColumnIds);
        console.log('sortedColumnIds length:', sortedColumnIds?.length || 0);
        console.log('columns object:', columns);
        console.log('columns object keys:', columns ? Object.keys(columns) : []);
        
        // 🚨 PRIORITY 1: Use datasetColumns if available (this is the real PowerApps data structure)
        if (datasetColumns && datasetColumns.length > 0) {
            console.log('✅ Using datasetColumns for column transformation');
            
            // Filter out system columns and focus on business data columns
            const businessColumns = datasetColumns.filter(column => {
                const name = column.name || '';
                // Skip system columns
                return !['RecordKey', 'RecordCanSelect', 'RecordSelected'].includes(name) && 
                       name !== '' && 
                       name !== 'null';
            });
            
            console.log(`Found ${businessColumns.length} business columns out of ${datasetColumns.length} total columns`);
            
            const result = businessColumns.map((column, index) => {
                // Use the column name directly - this should match the export CSV headers
                const columnName = column.name || `column_${index}`;
                const displayName = column.displayName || column.name || `Column ${index + 1}`;
                
                console.log(`Column [${index}]: ${columnName} -> ${displayName}`);
                
                return {
                    key: columnName,
                    name: displayName,
                    fieldName: columnName, // This must match the data property names
                    minWidth: 100,
                    maxWidth: 300,
                    calculatedWidth: 150,
                    isResizable: true,
                    isSorted: false,
                    isSortedDescending: false,
                    data: column,
                    onRender: (item, index, col) => {
                        // Access data using the actual column name
                        const value = item[columnName] || '';
                        console.log(`Rendering businessColumn cell [${index}][${columnName}]: value="${value}"`);
                        return value;
                    },
                } as IColumn;
            });
            
            console.log('✅ Business columns transformation complete:', result.length, 'columns');
            return result;
        }
        
        // 🚨 PRIORITY 2: Use sortedColumnIds + columns configuration 
        if (sortedColumnIds && sortedColumnIds.length > 0 && columns) {
            console.log('⚠️ Using sortedColumnIds + columns configuration');
            const derivedColumns = sortedColumnIds.map((columnId, index) => {
                const columnConfig = columns[columnId];
                
                // Try to get column properties from configuration
                let columnName = columnId;
                let displayName = columnId;
                let width = 150;
                
                try {
                    columnName = columnConfig?.getFormattedValue('ColName') || columnId;
                    displayName = columnConfig?.getFormattedValue('ColDisplayName') || columnName;
                    width = columnConfig?.getValue('ColWidth') as number || 150;
                } catch (e) {
                    console.log(`Could not get config for column ${columnId}:`, e);
                }
                
                console.log(`Creating column [${index}] from columnId "${columnId}":`, {
                    columnName,
                    displayName,
                    width
                });
                
                return {
                    key: columnId,
                    name: displayName,
                    fieldName: columnName,
                    minWidth: 50,
                    maxWidth: width > 0 ? width : 150,
                    calculatedWidth: width > 0 ? width : 150,
                    isResizable: true,
                    isSorted: false,
                    isSortedDescending: false,
                    onRender: (item: any, index?: number) => {
                        const value = item[columnName] || item[columnId] || '';
                        console.log(`Rendering config cell [${index}][${columnId}]: fieldName="${columnName}", value="${value}"`);
                        return value;
                    }
                } as IColumn;
            });
            
            console.log('✅ sortedColumnIds transformation complete:', derivedColumns.length, 'columns');
            return derivedColumns;
        }
        
        // 🚨 FALLBACK: No columns available
        console.log('❌ NO COLUMNS AVAILABLE - creating empty array');
        return [];
    }, [datasetColumns, sortedColumnIds, columns]);

    // Default configuration
    const defaultConfiguration: IGridConfiguration = {
        appearance: {
            theme: 'auto' as const,
            density: 'comfortable' as const,
            animations: true,
        },
        performance: {
            virtualScrolling: true,
            debounceMs: 300,
            maxCacheSize: 1000,
            enableMemoization: true,
            lazyLoading: true,
        },
        features: {
            filtering: {
                enabled: true,
                advanced: true,
                presets: true,
                suggestions: true,
            },
            sorting: {
                enabled: true,
                multiColumn: true,
            },
            export: {
                enabled: true,
                formats: ['CSV', 'Excel', 'PDF', 'JSON'],
                maxRows: 50000,
            },
            aggregation: {
                enabled: true,
                functions: ['sum', 'avg', 'count', 'min', 'max'],
            },
            dataQuality: {
                enabled: true,
                realTime: true,
                showWarnings: true,
            },
        },
        accessibility: {
            screenReader: true,
            keyboardNavigation: true,
            highContrast: true,
            fontSize: 'medium' as const,
        },
        plugins: {
            enabled: ['dataQuality', 'performanceMonitor', 'exportEnhancer'],
            configuration: {},
        },
    };

    const mergedConfiguration = {
        ...defaultConfiguration,
        ...configuration,
    };

    if (!useEnhancedFeatures) {
        // Fallback to original Grid implementation
        const { Grid } = require('../Grid');
        return React.createElement(Grid, gridProps);
    }

    return (
        <GridStoreProvider>
            <EnhancedGrid
                data={transformedData}
                columns={transformedColumns}
                configuration={mergedConfiguration}
                enableVirtualization={mergedConfiguration.performance.virtualScrolling}
                enableAdvancedFiltering={mergedConfiguration.features.filtering.advanced}
                enableDataExport={mergedConfiguration.features.export.enabled}
                enablePlugins={mergedConfiguration.plugins.enabled.length > 0}
                plugins={mergedConfiguration.plugins.enabled}
                onSelectionChanged={(selectedItems) => {
                    // Handle selection change
                    console.log('Selection changed:', selectedItems);
                }}
                onFilterChanged={(filters) => {
                    // Handle filter change
                    if (gridProps.onFilterChange && typeof filters === 'object') {
                        gridProps.onFilterChange(filters);
                    }
                }}
                onSortChanged={(sorting) => {
                    // Handle sort change
                    if (gridProps.onSort && sorting) {
                        gridProps.onSort(sorting.column, sorting.direction === 'desc');
                    }
                }}
                onDataChanged={(data) => {
                    // Handle data change
                    console.log('Data changed:', data.length, 'items');
                }}
                {...gridProps}
            />
        </GridStoreProvider>
    );
};

// Export for backward compatibility
export { EnhancedGrid } from './EnhancedGrid';
