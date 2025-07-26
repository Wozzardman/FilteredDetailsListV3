import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    DetailsList,
    IColumn,
    SelectionMode,
    DetailsListLayoutMode,
    ConstrainMode,
    IDetailsHeaderProps,
    IRenderFunction,
    IDetailsColumnRenderTooltipProps,
    CommandBar,
    ICommandBarItemProps,
    Panel,
    PanelType,
    MessageBar,
    MessageBarType,
    ProgressIndicator,
    Spinner,
    SpinnerSize,
} from '@fluentui/react';

import { useGridStore } from '../store/GridStore';
import {
    useAdvancedFiltering,
    useDataExport,
    usePerformanceMonitoring,
    useTheme,
    useAccessibility,
} from '../hooks/AdvancedHooks';
// import { VirtualizedGrid } from './VirtualizedGrid'; // Removed - using UnifiedGrid instead
import { AdvancedFilterBuilder, FilterSummary } from './AdvancedFilterBuilder';
import { DataExportService } from '../services/DataExportService';
import { pluginManager } from '../plugins/PluginManager';
import {
    IFilteredDetailsListProps,
    IAdvancedFilter,
    IExportOptions,
    IGridConfiguration,
} from '../types/Advanced.types';

// Enterprise features
import { performanceMonitor } from '../performance/PerformanceMonitor';
// import { AdvancedVirtualizedGrid } from '../virtualization/AdvancedVirtualization';
import { CollaborationEngine } from '../collaboration/CollaborationEngine';
import { AIEngine, useAIInsights } from '../ai/AIEngine';
import { AccessibilityManager } from '../accessibility/AccessibilityManager';

interface IEnhancedGridProps extends IFilteredDetailsListProps {
    data: any[];
    columns: IColumn[];
    configuration?: IGridConfiguration;
    onSelectionChanged?: (selectedItems: any[]) => void;
    onFilterChanged?: (filters: any) => void;
    onSortChanged?: (sorting: any) => void;
    onDataChanged?: (data: any[]) => void;
    enableVirtualization?: boolean;
    enableAdvancedFiltering?: boolean;
    enableDataExport?: boolean;
    enablePlugins?: boolean;
    plugins?: string[];
    
    // Size properties
    width?: number;
    height?: number;
    
    // Enterprise features
    enablePerformanceMonitoring?: boolean;
    enableAIInsights?: boolean;
    enableCollaboration?: boolean;
    enableAdvancedVirtualization?: boolean;
}

export const EnhancedGrid: React.FC<IEnhancedGridProps> = ({
    data,
    columns,
    configuration,
    onSelectionChanged,
    onFilterChanged,
    onSortChanged,
    onDataChanged,
    enableFiltering = true,
    enableVirtualization = true,
    enableAdvancedFiltering = true,
    enableDataExport = true,
    enablePlugins = true,
    plugins = [],
    
    // Size properties
    width,
    height,
    
    // Enterprise features
    enablePerformanceMonitoring = true,
    enableAIInsights = false,
    enableCollaboration = false,
    enableAdvancedVirtualization = true,
    ...props
}) => {
    // State management
    const {
        filteredData,
        displayData,
        filters,
        advancedFilters,
        sorting,
        pagination,
        selectedRows,
        isLoading,
        performance,
        setData,
        applyFilter,
        applyAdvancedFilter,
        setSorting,
        setPagination,
        selectAllRows,
        clearSelection,
        exportData,
    } = useGridStore();

    // Local state
    const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);
    const [showPluginPanel, setShowPluginPanel] = useState(false);
    const [currentColumns, setCurrentColumns] = useState<IColumn[]>(columns);

    // Custom hooks
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const { exportInProgress, exportData: exportDataHook } = useDataExport();
    const { metrics, startMeasurement } = usePerformanceMonitoring();
    const { announce, handleKeyDown } = useAccessibility();

    // Enterprise feature hooks
    const columnNames = useMemo(() => columns.map(col => col.fieldName || col.key), [columns]);
    const aiInsights = enableAIInsights ? useAIInsights(data, columnNames) : null;
    
    // Enterprise feature refs
    const collaborationEngineRef = useRef<CollaborationEngine | null>(null);
    const accessibilityManagerRef = useRef<AccessibilityManager | null>(null);

    // Refs
    const gridRef = useRef<HTMLDivElement>(null);
    const exportService = useMemo(() => DataExportService.getInstance(), []);

    // Update columns when prop changes
    useEffect(() => {
        console.log('🔄 COLUMNS UPDATE:', { 
            newColumnsLength: columns?.length || 0,
            currentColumnsLength: currentColumns?.length || 0,
            newColumns: columns?.map(c => c.fieldName || c.key || c.name),
            hasChanged: JSON.stringify(columns) !== JSON.stringify(currentColumns)
        });
        
        if (columns && columns.length > 0) {
            setCurrentColumns(columns);
        }
    }, [columns]);

    // Initialize data
    useEffect(() => {
        console.log('Enhanced Grid data initialization:', { 
            hasData: !!data, 
            dataLength: data?.length || 0, 
            sampleData: data?.slice(0, 2) 
        });
        
        if (data && data.length > 0) {
            console.log('Setting data in GridStore:', data.length, 'items');
            setData(data);
            onDataChanged?.(data);
        } else {
            console.log('No data to set in GridStore');
        }
    }, [data, setData, onDataChanged]);

    // Plugin initialization
    useEffect(() => {
        if (enablePlugins) {
            // Create a default theme object that matches ICustomTheme interface
            const defaultTheme = {
                palette: {
                    primary: isDarkMode ? '#0078d4' : '#0078d4',
                    secondary: isDarkMode ? '#6c757d' : '#6c757d',
                    background: isDarkMode ? '#1e1e1e' : '#ffffff',
                    surface: isDarkMode ? '#2d2d2d' : '#f8f9fa',
                    error: '#d13438',
                    warning: '#ff8c00',
                    success: '#107c10',
                    info: '#0078d4',
                    text: {
                        primary: isDarkMode ? '#ffffff' : '#323130',
                        secondary: isDarkMode ? '#e1e1e1' : '#605e5c',
                        disabled: isDarkMode ? '#a19f9d' : '#a19f9d',
                    },
                },
                typography: {
                    fontFamily: '"Segoe UI", sans-serif',
                    fontSize: {
                        small: '12px',
                        medium: '14px',
                        large: '16px',
                    },
                    fontWeight: {
                        normal: 400,
                        medium: 500,
                        bold: 600,
                    },
                },
                spacing: {
                    xs: '4px',
                    sm: '8px',
                    md: '12px',
                    lg: '16px',
                    xl: '24px',
                },
                borderRadius: {
                    small: '2px',
                    medium: '4px',
                    large: '6px',
                },
                shadows: {
                    small: '0 1px 2px rgba(0, 0, 0, 0.08)',
                    medium: '0 4px 8px rgba(0, 0, 0, 0.12)',
                    large: '0 8px 16px rgba(0, 0, 0, 0.16)',
                },
            };

            const gridContext = {
                data: filteredData,
                columns: currentColumns,
                filters,
                sorting,
                pagination,
                theme: defaultTheme,
                performance: metrics,
                updateData: setData,
                updateFilters: (newFilters: any) => {
                    Object.entries(newFilters).forEach(([column, filter]) => {
                        applyFilter(column, filter);
                    });
                },
                updateSorting: setSorting,
                exportData: async (options: IExportOptions) => {
                    await exportService.exportData(filteredData, options);
                },
            };

            pluginManager.initialize(gridContext);

            // Register built-in plugins if specified
            plugins.forEach((pluginName) => {
                // Plugin registration would happen here
                console.log(`Loading plugin: ${pluginName}`);
            });
        }

        return () => {
            if (enablePlugins) {
                pluginManager.destroy();
            }
        };
    }, [enablePlugins, plugins, filteredData, currentColumns, filters, sorting, pagination]);

    // Enterprise features initialization
    useEffect(() => {
        const endMeasurement = enablePerformanceMonitoring 
            ? performanceMonitor.startMeasure('enhanced-grid-init')
            : () => {};

        try {
            // Initialize Collaboration Engine
            if (enableCollaboration && !collaborationEngineRef.current) {
                const currentUser = {
                    id: 'current-user',
                    name: 'Current User',
                    email: 'user@example.com',
                    color: '#0078d4',
                    isOnline: true,
                };
                collaborationEngineRef.current = new CollaborationEngine(currentUser);
                console.log('🤝 Collaboration engine initialized');
            }

            // Initialize Accessibility Manager
            if (!accessibilityManagerRef.current) {
                accessibilityManagerRef.current = new AccessibilityManager({
                    announceChanges: true,
                    enableKeyboardNavigation: true,
                    enableHighContrast: true,
                    supportScreenReaders: true,
                    enableReducedMotion: false,
                    fontSize: 'medium',
                    colorScheme: 'auto',
                    language: 'en',
                });
                console.log('♿ Accessibility manager initialized');
            }

            // Performance monitoring setup
            if (enablePerformanceMonitoring) {
                performanceMonitor.startMeasure('grid-render-time');
                console.log('📊 Performance monitoring active');
            }

            // AI insights setup
            if (enableAIInsights && aiInsights) {
                console.log('🤖 AI insights active - insights available:', aiInsights.insights?.length || 0);
            }
        } finally {
            endMeasurement();
        }

        return () => {
            // Cleanup enterprise features
            if (collaborationEngineRef.current) {
                collaborationEngineRef.current.destroy();
                collaborationEngineRef.current = null;
            }
            if (accessibilityManagerRef.current) {
                accessibilityManagerRef.current.destroy();
                accessibilityManagerRef.current = null;
            }
        };
    }, [enableCollaboration, enableAIInsights, enablePerformanceMonitoring, aiInsights]);

    // Command bar items
    const commandBarItems: ICommandBarItemProps[] = useMemo(() => {
        const items: ICommandBarItemProps[] = [];

        if (enableAdvancedFiltering) {
            items.push({
                key: 'advancedFilter',
                text: 'Advanced Filter',
                iconProps: { iconName: 'Filter' },
                onClick: () => setShowAdvancedFilter(true),
                disabled: isLoading,
            });
        }

        if (enableDataExport) {
            items.push({
                key: 'export',
                text: 'Export',
                iconProps: { iconName: 'Download' },
                onClick: () => setShowExportDialog(true),
                disabled: isLoading || filteredData.length === 0,
            });
        }

        items.push({
            key: 'selectAll',
            text: 'Select All',
            iconProps: { iconName: 'SelectAll' },
            onClick: selectAllRows,
            disabled: isLoading || filteredData.length === 0,
        });

        items.push({
            key: 'clearSelection',
            text: 'Clear Selection',
            iconProps: { iconName: 'Clear' },
            onClick: clearSelection,
            disabled: selectedRows.size === 0,
        });

        // Add Grid Tools button for plugin panel
        if (enablePlugins) {
            items.push({
                key: 'gridTools',
                text: 'Grid Tools',
                iconProps: { iconName: 'Settings' },
                onClick: () => setShowPluginPanel(true),
                disabled: isLoading,
            });

            // Add plugin toolbar components
            const pluginComponents = pluginManager.renderPluginComponents('toolbar');
            pluginComponents.forEach((component, index) => {
                items.push({
                    key: `plugin-${index}`,
                    onRender: () => component,
                });
            });
        }

        return items;
    }, [
        enableAdvancedFiltering,
        enableDataExport,
        enablePlugins,
        isLoading,
        filteredData.length,
        selectedRows.size,
        selectAllRows,
        clearSelection,
        setShowPluginPanel,
    ]);

    const commandBarFarItems: ICommandBarItemProps[] = useMemo(() => {
        const items: ICommandBarItemProps[] = [];

        items.push({
            key: 'theme',
            text: isDarkMode ? 'Light Mode' : 'Dark Mode',
            iconProps: { iconName: isDarkMode ? 'Sunny' : 'ClearNight' },
            onClick: toggleTheme,
        });

        items.push({
            key: 'performance',
            text: 'Performance',
            iconProps: { iconName: 'SpeedHigh' },
            onClick: () => setShowPerformanceMetrics(!showPerformanceMetrics),
        });

        return items;
    }, [isDarkMode, toggleTheme, showPerformanceMetrics]);

    // Handle advanced filter apply
    const handleAdvancedFilterApply = useCallback(
        (filter: IAdvancedFilter) => {
            applyAdvancedFilter(filter);
            onFilterChanged?.(filter);
            announce(`Advanced filter applied: ${filter.name || 'Unnamed filter'}`);
        },
        [applyAdvancedFilter, onFilterChanged, announce],
    );

    // Handle export
    const handleExport = useCallback(
        async (options: IExportOptions) => {
            try {
                const endMeasurement = startMeasurement('export');
                await exportService.exportData(filteredData, options);
                endMeasurement();
                announce(`Data exported successfully as ${options.format}`);
            } catch (error) {
                console.error('Export failed:', error);
                announce('Export failed. Please try again.');
            }
        },
        [filteredData, exportService, startMeasurement, announce],
    );

    // Enhanced column rendering with data quality indicators
    const enhancedColumns: IColumn[] = useMemo(() => {
        return currentColumns.map((column) => ({
            ...column,
            onRenderHeader: (headerProps, defaultRender) => {
                const hasFilter = filters[column.key];
                const dataQuality = calculateColumnQuality(filteredData, column.key);

                return (
                    <div className="enhanced-column-header">
                        {defaultRender?.(headerProps)}
                        {hasFilter && <span className="filter-indicator">🔍</span>}
                        <div className={`data-quality-indicator ${dataQuality.level}`}>{dataQuality.score}%</div>
                    </div>
                );
            },
            onColumnClick: (ev, clickedColumn) => {
                const newSorting = {
                    column: clickedColumn.key,
                    direction: (sorting.column === clickedColumn.key && sorting.direction === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc',
                };
                setSorting(newSorting);
                onSortChanged?.(newSorting);
            },
        }));
    }, [currentColumns, filters, filteredData, sorting, setSorting, onSortChanged]);

    // Render content based on configuration
    const renderGridContent = () => {
        console.log('Enhanced Grid render state:', {
            isLoading,
            enableVirtualization,
            filteredDataLength: filteredData?.length || 0,
            displayDataLength: displayData?.length || 0,
            hasFilteredData: filteredData && filteredData.length > 0,
            sampleFilteredItem: filteredData?.[0],
            sampleDisplayItem: displayData?.[0]
        });

        console.log('=== ENHANCED GRID RENDER CONDITIONS ===');
        console.log('isLoading:', isLoading);
        console.log('enableVirtualization:', enableVirtualization);
        console.log('filteredData.length:', filteredData.length);
        console.log('filteredData sample:', filteredData.slice(0, 2));
        console.log('=== END CONDITIONS ===');

        if (isLoading) {
            return (
                <div className="grid-loading">
                    <Spinner size={SpinnerSize.large} label="Loading data..." />
                </div>
            );
        }

        if (enableVirtualization && filteredData.length > 0) {
            console.log('✅ USING VIRTUALIZED GRID - conditions met');
            console.log('Using VirtualizedGrid with:', { 
                itemCount: filteredData.length, 
                columnCount: enhancedColumns.length,
                sampleItem: filteredData[0],
                sampleColumn: enhancedColumns[0]
            });
            
            // Calculate total width from columns
            const totalWidth = enhancedColumns.reduce((sum, col) => 
                sum + (col.calculatedWidth || col.minWidth || 100), 0
            );
            
            // Use AdvancedVirtualization if enabled, otherwise fallback to VirtualizedGrid
            // Temporarily disabled due to React compatibility issues
            /*
            if (false && enableAdvancedVirtualization) {
                return (
                    <AdvancedVirtualizedGrid
                        items={filteredData}
                        columns={enhancedColumns}
                        width={totalWidth > 0 ? Math.min(totalWidth, window.innerWidth - 100) : window.innerWidth - 100}
                        height={600}
                        estimatedItemSize={50}
                        overscanCount={10}
                        useVariableSize={true}
                        enableInfiniteLoading={false}
                        enableHorizontalVirtualization={enhancedColumns.length > 8}
                        enablePersistentScrollPosition={true}
                        scrollKey="enhanced-grid"
                        renderItem={({ index, style, data }: { index: number; style: React.CSSProperties; data: any }) => {
                            const item = data.items[index];
                            const isSelected = false; // TODO: implement selection
                            
                            return (
                                <div
                                    className="virtualized-row"
                                    data-style={JSON.stringify(style)}
                                    data-selected={isSelected}
                                    onClick={() => data.onItemClick?.(item, index)}
                                    onMouseEnter={() => data.onItemHover?.(item, index)}
                                >
                                    {data.columns.map((column: IColumn, colIndex: number) => (
                                        <div
                                            key={column.key}
                                            className="virtualized-cell"
                                            data-column={column.key}
                                            data-width={column.calculatedWidth || column.minWidth || 100}
                                        >
                                            {column.onRender 
                                                ? column.onRender(item, index, column)
                                                : item[column.fieldName || column.key] || ''
                                            }
                                        </div>
                                    ))}
                                </div>
                            );
                        }}
                        renderHeader={() => (
                            <div className="virtualized-header-row">
                                {enhancedColumns.map((column) => (
                                    <div
                                        key={column.key}
                                        className="virtualized-header-cell"
                                        data-column={column.key}
                                        data-width={column.calculatedWidth || column.minWidth || 100}
                                    >
                                        {column.name}
                                    </div>
                                ))}
                            </div>
                        )}
                        onItemsRendered={(params: any) => {
                            // Track performance metrics
                            performanceEndMeasure();
                        }}
                    />
                );
            }
                        items={filteredData}
                        columns={enhancedColumns}
                        width={totalWidth > 0 ? Math.min(totalWidth, window.innerWidth - 100) : window.innerWidth - 100}
                        height={600}
                        estimatedItemSize={50}
                        overscanCount={10}
                        useVariableSize={true}
                        enableInfiniteLoading={false}
                        enableHorizontalVirtualization={enhancedColumns.length > 8}
                        enablePersistentScrollPosition={true}
                        scrollKey="enhanced-grid"
                        renderItem={({ index, style, data }: { index: number; style: React.CSSProperties; data: any }) => {
                            const item = data.items[index];
                            const isSelected = false; // TODO: implement selection
                            
                            return (
                                <div
                                    className="virtualized-row"
                                    data-style={JSON.stringify(style)}
                                    data-selected={isSelected}
                                    onClick={() => data.onItemClick?.(item, index)}
                                    onMouseEnter={() => data.onItemHover?.(item, index)}
                                >
                                    {data.columns.map((column: IColumn, colIndex: number) => (
                                        <div
                                            key={column.key}
                                            className="virtualized-cell"
                                            data-column={column.key}
                                            data-width={column.calculatedWidth || column.minWidth || 100}
                                        >
                                            {column.onRender 
                                                ? column.onRender(item, index, column)
                                                : item[column.fieldName || column.key] || ''
                                            }
                                        </div>
                                    ))}
                                </div>
                            );
                        }}
                        renderHeader={() => (
                            <div className="virtualized-header-row">
                                {enhancedColumns.map((column) => (
                                    <div
                                        key={column.key}
                                        className="virtualized-header-cell"
                                        data-column={column.key}
                                        data-width={column.calculatedWidth || column.minWidth || 100}
                                    >
                                        {column.name}
                                    </div>
                                ))}
                            </div>
                        )}
                        onItemsRendered={(params: any) => {
                            // Track performance metrics
                            performanceEndMeasure();
                        }}
                    />
                );
            }
            */
            
            return (
                <DetailsList
                    items={filteredData}
                    columns={enhancedColumns}
                    onItemInvoked={(item: any) => {
                        // Handle item invoked
                        console.log('Item invoked:', item);
                    }}
                    className="enhanced-details-list"
                    selectionMode={SelectionMode.multiple}
                    setKey="enhanced-grid"
                    layoutMode={DetailsListLayoutMode.justified}
                    isHeaderVisible={true}
                />
            );
        }

        console.log('Using fallback DetailsList with:', { 
            itemCount: displayData.length, 
            columnCount: enhancedColumns.length,
            sampleItem: displayData[0],
            sampleColumn: enhancedColumns[0]
        });

        return (
            <DetailsList
                items={displayData}
                columns={enhancedColumns}
                selectionMode={SelectionMode.multiple}
                layoutMode={DetailsListLayoutMode.justified}
                constrainMode={ConstrainMode.unconstrained}
                onActiveItemChanged={(item, index) => {
                    // Handle active item change
                    console.log('Active item changed:', item, index);
                }}
                onItemInvoked={(item) => {
                    // Handle item invoked (double-click)
                    console.log('Item invoked:', item);
                }}
                className="enhanced-details-list"
            />
        );
    };

    return (
        <div
            ref={gridRef}
            className={`jvt-enhanced-grid ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
            data-theme={isDarkMode ? 'dark' : 'light'}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* Performance Metrics */}
            {showPerformanceMetrics && (
                <div className="performance-badge">
                    Render: {metrics.renderTime.toFixed(2)}ms | Filter: {metrics.filterTime.toFixed(2)}ms | Memory:{' '}
                    {(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
                </div>
            )}

            {/* Command Bar */}
            <CommandBar items={commandBarItems} farItems={commandBarFarItems} className="enhanced-command-bar" />

            {/* Active Filters Summary */}
            {advancedFilters.length > 0 && (
                <FilterSummary
                    filters={advancedFilters}
                    onEditFilter={(filter: any) => {
                        // Handle edit filter
                        setShowAdvancedFilter(true);
                    }}
                    onRemoveFilter={(filterId: string) => {
                        // Handle remove filter
                        console.log('Remove filter:', filterId);
                    }}
                    onClearAll={() => {
                        // Handle clear all filters
                        console.log('Clear all filters');
                    }}
                />
            )}

            {/* Export Progress */}
            {exportInProgress && (
                <ProgressIndicator
                    label="Exporting data..."
                    description="Please wait while your data is being exported."
                />
            )}

            {/* Main Grid Content */}
            <div className="enhanced-grid-content">{renderGridContent()}</div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="enhanced-pagination">
                    <span>
                        Showing {pagination.currentPage * pagination.pageSize - pagination.pageSize + 1} to{' '}
                        {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of{' '}
                        {pagination.totalItems} items
                    </span>
                    {/* Pagination controls would go here */}
                </div>
            )}

            {/* Plugin Sidebar */}
            {enablePlugins && (
                <Panel
                    isOpen={showPluginPanel}
                    onDismiss={() => setShowPluginPanel(false)}
                    type={PanelType.smallFixedNear}
                    headerText="Grid Tools"
                    isLightDismiss={true}
                    className="plugin-sidebar"
                    closeButtonAriaLabel="Close Grid Tools panel"
                >
                    {pluginManager.renderPluginComponents('sidebar')}
                </Panel>
            )}

            {/* Advanced Filter Dialog */}
            <AdvancedFilterBuilder
                isOpen={showAdvancedFilter}
                onDismiss={() => setShowAdvancedFilter(false)}
                onApply={handleAdvancedFilterApply}
                columns={currentColumns}
            />

            {/* Export Dialog */}
            <Panel
                isOpen={showExportDialog}
                onDismiss={() => setShowExportDialog(false)}
                type={PanelType.medium}
                headerText="Export Data"
                closeButtonAriaLabel="Close export dialog"
            >
                <ExportDialog
                    data={filteredData}
                    columns={currentColumns}
                    onExport={handleExport}
                    onCancel={() => setShowExportDialog(false)}
                />
            </Panel>
        </div>
    );
};

// Export Dialog Component
interface IExportDialogProps {
    data: any[];
    columns: IColumn[];
    onExport: (options: IExportOptions) => void;
    onCancel: () => void;
}

const ExportDialog: React.FC<IExportDialogProps> = ({ data, columns, onExport, onCancel }) => {
    const [exportOptions, setExportOptions] = useState<IExportOptions>({
        format: 'CSV',
        includeHeaders: true,
        includeFilters: false,
        maxRows: undefined,
        fileName: 'export',
    });

    const exportService = DataExportService.getInstance();
    const supportedFormats = exportService.getSupportedFormats();
    const estimatedSize = exportService.estimateFileSize(data, exportOptions.format);

    const handleExport = () => {
        onExport(exportOptions);
        onCancel();
    };

    return (
        <div className="export-dialog">
            <div className="export-options">
                <h3>Export Options</h3>

                <div className="format-selection">
                    <label>Format:</label>
                    {supportedFormats.map((format) => (
                        <div key={format.format} className="export-format-option">
                            <input
                                type="radio"
                                id={format.format}
                                name="format"
                                value={format.format}
                                checked={exportOptions.format === format.format}
                                onChange={(e) =>
                                    setExportOptions((prev) => ({
                                        ...prev,
                                        format: e.target.value as any,
                                    }))
                                }
                            />
                            <label htmlFor={format.format}>
                                {format.description} (.{format.extension})
                            </label>
                        </div>
                    ))}
                </div>

                <div className="export-settings">
                    <label>
                        <input
                            type="checkbox"
                            checked={exportOptions.includeHeaders}
                            onChange={(e) =>
                                setExportOptions((prev) => ({
                                    ...prev,
                                    includeHeaders: e.target.checked,
                                }))
                            }
                        />
                        Include Headers
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={exportOptions.includeFilters}
                            onChange={(e) =>
                                setExportOptions((prev) => ({
                                    ...prev,
                                    includeFilters: e.target.checked,
                                }))
                            }
                        />
                        Include Filter Information
                    </label>

                    <label>
                        Max Rows:
                        <input
                            type="number"
                            value={exportOptions.maxRows || ''}
                            onChange={(e) =>
                                setExportOptions((prev) => ({
                                    ...prev,
                                    maxRows: e.target.value ? parseInt(e.target.value) : undefined,
                                }))
                            }
                            placeholder="All rows"
                        />
                    </label>

                    <label>
                        File Name:
                        <input
                            type="text"
                            value={exportOptions.fileName}
                            onChange={(e) =>
                                setExportOptions((prev) => ({
                                    ...prev,
                                    fileName: e.target.value,
                                }))
                            }
                        />
                    </label>
                </div>

                <div className="export-info">
                    <p>Records to export: {exportOptions.maxRows || data.length}</p>
                    <p>Estimated file size: {estimatedSize}</p>
                </div>

                <div className="export-actions">
                    <button onClick={onCancel}>Cancel</button>
                    <button onClick={handleExport} className="primary">
                        Export
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper function to calculate column data quality
function calculateColumnQuality(data: any[], columnKey: string): { score: number; level: string } {
    if (!data || data.length === 0) {
        return { score: 0, level: 'low' };
    }

    const values = data.map((item) => item[columnKey]).filter((v) => v != null);
    const completeness = values.length / data.length;
    const uniqueness = new Set(values).size / values.length;

    const score = Math.round(((completeness + uniqueness) / 2) * 100);

    let level = 'low';
    if (score >= 80) level = 'high';
    else if (score >= 60) level = 'medium';

    return { score, level };
}
