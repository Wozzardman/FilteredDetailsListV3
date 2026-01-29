import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as React from 'react';
import {
    IAdvancedFilter,
    IFilterPreset,
    ISortState,
    IPaginationState,
    IPerformanceMetrics,
    IExportOptions,
    IAggregationConfig,
} from '../types/Advanced.types';

// Mobile-safe performance.now() helper
const safeNow = (): number => {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
};

// Main Grid Store Interface
interface IGridStore {
    // Data State
    originalData: any[];
    filteredData: any[];
    displayData: any[];

    // Filter State
    filters: Record<string, any>;
    advancedFilters: IAdvancedFilter[];
    filterPresets: IFilterPreset[];
    activePreset?: string;

    // Sort State
    sorting: ISortState;

    // Pagination State
    pagination: IPaginationState;

    // UI State
    isLoading: boolean;
    selectedRows: Set<string>;
    expandedGroups: Set<string>;
    columnVisibility: Record<string, boolean>;

    // Performance Metrics
    performance: IPerformanceMetrics;

    // Export State
    exportInProgress: boolean;
    lastExport?: { date: Date; format: string; recordCount: number };

    // Aggregation State
    aggregations: Record<string, IAggregationConfig>;
    aggregationResults: Record<string, any>;

    // Actions
    setData: (data: any[]) => void;
    applyFilter: (columnName: string, filter: any) => void;
    applyAdvancedFilter: (filter: IAdvancedFilter) => void;
    clearFilters: () => void;
    clearAllFilters: () => void;

    // Sort Actions
    setSorting: (sorting: ISortState) => void;
    addSort: (column: string, direction: 'asc' | 'desc') => void;
    clearSorting: () => void;

    // Pagination Actions
    setPagination: (pagination: Partial<IPaginationState>) => void;
    setCurrentPage: (page: number) => void;
    setPageSize: (size: number) => void;

    // Selection Actions
    toggleRowSelection: (rowId: string) => void;
    selectAllRows: () => void;
    clearSelection: () => void;
    setSelectedRows: (rowIds: string[]) => void;

    // Column Actions
    toggleColumnVisibility: (columnKey: string) => void;
    setColumnVisibility: (visibility: Record<string, boolean>) => void;

    // Performance Actions
    updatePerformanceMetrics: (metrics: Partial<IPerformanceMetrics>) => void;

    // Export Actions
    exportData: (options: IExportOptions) => Promise<void>;

    // Preset Actions
    saveFilterPreset: (preset: Omit<IFilterPreset, 'id' | 'createdDate'>) => void;
    loadFilterPreset: (presetId: string) => void;
    deleteFilterPreset: (presetId: string) => void;

    // Aggregation Actions
    addAggregation: (columnKey: string, config: IAggregationConfig) => void;
    removeAggregation: (columnKey: string) => void;
    updateAggregationResults: () => void;

    // Utility Actions
    refresh: () => void;
    reset: () => void;
}

// Create the store with subscribeWithSelector middleware for performance
export const useGridStore = create<IGridStore>()(
    subscribeWithSelector((set, get) => ({
        // Initial State
        originalData: [],
        filteredData: [],
        displayData: [],
        filters: {},
        advancedFilters: [],
        filterPresets: [],
        sorting: {},
        pagination: {
            currentPage: 1,
            pageSize: 50,
            totalItems: 0,
            totalPages: 0,
            showPageSizeOptions: true,
            pageSizeOptions: [25, 50, 100, 200],
            showQuickJumper: true,
            showTotal: true,
        },
        isLoading: false,
        selectedRows: new Set(),
        expandedGroups: new Set(),
        columnVisibility: {},
        performance: {
            renderTime: 0,
            filterTime: 0,
            memoryUsage: 0,
            dataSize: 0,
            virtualizedRows: 0,
            userInteractions: [],
            timestamp: new Date(),
        },
        exportInProgress: false,
        aggregations: {},
        aggregationResults: {},

        // Data Actions
        setData: (data: any[]) => {
            const startTime = safeNow();

            set((state) => ({
                originalData: data,
                filteredData: data,
                displayData: data.slice(0, state.pagination.pageSize),
                pagination: {
                    ...state.pagination,
                    totalItems: data.length,
                    totalPages: Math.ceil(data.length / state.pagination.pageSize),
                    currentPage: 1,
                },
                performance: {
                    ...state.performance,
                    dataSize: data.length,
                    renderTime: safeNow() - startTime,
                    timestamp: new Date(),
                },
            }));

            // Trigger aggregation update
            get().updateAggregationResults();
        },

        // Filter Actions
        applyFilter: (columnName: string, filter: any) => {
            const startTime = safeNow();

            set((state) => {
                const newFilters = { ...state.filters, [columnName]: filter };
                const filteredData = filterData(state.originalData, newFilters);
                const displayData = paginateData(filteredData, state.pagination);

                return {
                    filters: newFilters,
                    filteredData,
                    displayData,
                    pagination: {
                        ...state.pagination,
                        totalItems: filteredData.length,
                        totalPages: Math.ceil(filteredData.length / state.pagination.pageSize),
                        currentPage: 1,
                    },
                    performance: {
                        ...state.performance,
                        filterTime: safeNow() - startTime,
                        timestamp: new Date(),
                    },
                };
            });

            get().updateAggregationResults();
        },

        applyAdvancedFilter: (filter: IAdvancedFilter) => {
            const startTime = safeNow();

            set((state) => {
                const newAdvancedFilters = [...state.advancedFilters, filter];
                const filteredData = applyAdvancedFilters(state.originalData, newAdvancedFilters);
                const displayData = paginateData(filteredData, state.pagination);

                return {
                    advancedFilters: newAdvancedFilters,
                    filteredData,
                    displayData,
                    pagination: {
                        ...state.pagination,
                        totalItems: filteredData.length,
                        totalPages: Math.ceil(filteredData.length / state.pagination.pageSize),
                        currentPage: 1,
                    },
                    performance: {
                        ...state.performance,
                        filterTime: safeNow() - startTime,
                        timestamp: new Date(),
                    },
                };
            });
        },

        clearFilters: () => {
            set((state) => {
                const displayData = paginateData(state.originalData, state.pagination);

                return {
                    filters: {},
                    filteredData: state.originalData,
                    displayData,
                    pagination: {
                        ...state.pagination,
                        totalItems: state.originalData.length,
                        totalPages: Math.ceil(state.originalData.length / state.pagination.pageSize),
                        currentPage: 1,
                    },
                };
            });

            get().updateAggregationResults();
        },

        clearAllFilters: () => {
            set((state) => {
                const displayData = paginateData(state.originalData, state.pagination);

                return {
                    filters: {},
                    advancedFilters: [],
                    filteredData: state.originalData,
                    displayData,
                    pagination: {
                        ...state.pagination,
                        totalItems: state.originalData.length,
                        totalPages: Math.ceil(state.originalData.length / state.pagination.pageSize),
                        currentPage: 1,
                    },
                };
            });
        },

        // Sort Actions
        setSorting: (sorting: ISortState) => {
            set((state) => {
                const sortedData = sortData(state.filteredData, sorting);
                const displayData = paginateData(sortedData, state.pagination);

                return {
                    sorting,
                    filteredData: sortedData,
                    displayData,
                };
            });
        },

        addSort: (column: string, direction: 'asc' | 'desc') => {
            const currentSorting = get().sorting;
            const newSorting: ISortState = {
                column,
                direction,
                multiSort: currentSorting.multiSort
                    ? [
                          ...currentSorting.multiSort.filter((s) => s.column !== column),
                          { column, direction, priority: currentSorting.multiSort.length + 1 },
                      ]
                    : [{ column, direction, priority: 1 }],
            };

            get().setSorting(newSorting);
        },

        clearSorting: () => {
            get().setSorting({});
        },

        // Pagination Actions
        setPagination: (pagination: Partial<IPaginationState>) => {
            set((state) => {
                const newPagination = { ...state.pagination, ...pagination };
                const displayData = paginateData(state.filteredData, newPagination);

                return {
                    pagination: newPagination,
                    displayData,
                };
            });
        },

        setCurrentPage: (page: number) => {
            get().setPagination({ currentPage: page });
        },

        setPageSize: (size: number) => {
            const newTotalPages = Math.ceil(get().filteredData.length / size);
            get().setPagination({
                pageSize: size,
                totalPages: newTotalPages,
                currentPage: 1,
            });
        },

        // Selection Actions
        toggleRowSelection: (rowId: string) => {
            set((state) => {
                const newSelection = new Set(state.selectedRows);
                if (newSelection.has(rowId)) {
                    newSelection.delete(rowId);
                } else {
                    newSelection.add(rowId);
                }
                return { selectedRows: newSelection };
            });
        },

        selectAllRows: () => {
            set((state) => {
                const allRowIds = state.filteredData.map((_, index) => index.toString());
                return { selectedRows: new Set(allRowIds) };
            });
        },

        clearSelection: () => {
            set({ selectedRows: new Set() });
        },

        setSelectedRows: (rowIds: string[]) => {
            set({ selectedRows: new Set(rowIds) });
        },

        // Column Actions
        toggleColumnVisibility: (columnKey: string) => {
            set((state) => ({
                columnVisibility: {
                    ...state.columnVisibility,
                    [columnKey]: !state.columnVisibility[columnKey],
                },
            }));
        },

        setColumnVisibility: (visibility: Record<string, boolean>) => {
            set({ columnVisibility: visibility });
        },

        // Performance Actions
        updatePerformanceMetrics: (metrics: Partial<IPerformanceMetrics>) => {
            set((state) => ({
                performance: {
                    ...state.performance,
                    ...metrics,
                    timestamp: new Date(),
                },
            }));
        },

        // Export Actions
        exportData: async (options: IExportOptions) => {
            set({ exportInProgress: true });

            try {
                const { filteredData } = get();
                const dataToExport = options.maxRows ? filteredData.slice(0, options.maxRows) : filteredData;

                // This would be implemented with actual export logic
                await exportDataImplementation(dataToExport, options);

                set({
                    lastExport: {
                        date: new Date(),
                        format: options.format,
                        recordCount: dataToExport.length,
                    },
                });
            } finally {
                set({ exportInProgress: false });
            }
        },

        // Preset Actions
        saveFilterPreset: (preset: Omit<IFilterPreset, 'id' | 'createdDate'>) => {
            set((state) => {
                const newPreset: IFilterPreset = {
                    ...preset,
                    id: generateId(),
                    createdDate: new Date(),
                    lastModified: new Date(),
                };

                return {
                    filterPresets: [...state.filterPresets, newPreset],
                };
            });
        },

        loadFilterPreset: (presetId: string) => {
            const preset = get().filterPresets.find((p) => p.id === presetId);
            if (preset) {
                get().applyAdvancedFilter(preset.filters);
                set({ activePreset: presetId });
            }
        },

        deleteFilterPreset: (presetId: string) => {
            set((state) => ({
                filterPresets: state.filterPresets.filter((p) => p.id !== presetId),
                activePreset: state.activePreset === presetId ? undefined : state.activePreset,
            }));
        },

        // Aggregation Actions
        addAggregation: (columnKey: string, config: IAggregationConfig) => {
            set((state) => ({
                aggregations: {
                    ...state.aggregations,
                    [columnKey]: config,
                },
            }));

            get().updateAggregationResults();
        },

        removeAggregation: (columnKey: string) => {
            set((state) => {
                const newAggregations = { ...state.aggregations };
                delete newAggregations[columnKey];

                const newResults = { ...state.aggregationResults };
                delete newResults[columnKey];

                return {
                    aggregations: newAggregations,
                    aggregationResults: newResults,
                };
            });
        },

        updateAggregationResults: () => {
            const { filteredData, aggregations } = get();
            const results: Record<string, any> = {};

            Object.entries(aggregations).forEach(([columnKey, config]) => {
                results[columnKey] = calculateAggregation(filteredData, config);
            });

            set({ aggregationResults: results });
        },

        // Utility Actions
        refresh: () => {
            const { originalData, filters, advancedFilters, sorting, pagination } = get();
            let data = [...originalData];

            // Apply filters
            data = filterData(data, filters);
            data = applyAdvancedFilters(data, advancedFilters);

            // Apply sorting
            data = sortData(data, sorting);

            // Apply pagination
            const displayData = paginateData(data, pagination);

            set({
                filteredData: data,
                displayData,
                pagination: {
                    ...pagination,
                    totalItems: data.length,
                    totalPages: Math.ceil(data.length / pagination.pageSize),
                },
            });

            get().updateAggregationResults();
        },

        reset: () => {
            set({
                originalData: [],
                filteredData: [],
                displayData: [],
                filters: {},
                advancedFilters: [],
                sorting: {},
                pagination: {
                    currentPage: 1,
                    pageSize: 50,
                    totalItems: 0,
                    totalPages: 0,
                    showPageSizeOptions: true,
                    pageSizeOptions: [25, 50, 100, 200],
                    showQuickJumper: true,
                    showTotal: true,
                },
                selectedRows: new Set(),
                expandedGroups: new Set(),
                columnVisibility: {},
                aggregations: {},
                aggregationResults: {},
                activePreset: undefined,
            });
        },
    })),
);

// Helper Functions
function filterData(data: any[], filters: Record<string, any>): any[] {
    return data.filter((item) => {
        return Object.entries(filters).every(([column, filter]) => {
            if (!filter || (Array.isArray(filter.value) && filter.value.length === 0)) {
                return true;
            }

            const value = item[column];

            switch (filter.type) {
                case 'choice':
                    return Array.isArray(filter.value) ? filter.value.includes(value) : value === filter.value;
                case 'text':
                    return value && value.toString().toLowerCase().includes(filter.value.toLowerCase());
                case 'number':
                    return value === filter.value;
                case 'date':
                    // Implement date filtering logic
                    return true;
                default:
                    return true;
            }
        });
    });
}

function applyAdvancedFilters(data: any[], filters: IAdvancedFilter[]): any[] {
    return data.filter((item) => {
        return filters.every((filter) => evaluateAdvancedFilter(item, filter));
    });
}

function evaluateAdvancedFilter(item: any, filter: IAdvancedFilter): boolean {
    // Implement advanced filter evaluation logic
    return true; // Placeholder
}

function sortData(data: any[], sorting: ISortState): any[] {
    if (!sorting.column) return data;

    return [...data].sort((a, b) => {
        const aValue = a[sorting.column!];
        const bValue = b[sorting.column!];

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;

        return sorting.direction === 'desc' ? -comparison : comparison;
    });
}

function paginateData(data: any[], pagination: IPaginationState): any[] {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return data.slice(startIndex, endIndex);
}

function calculateAggregation(data: any[], config: IAggregationConfig): any {
    const values = data.map((item) => item[config.column]).filter((v) => v != null);

    switch (config.type) {
        case 'sum':
            return values.reduce((sum, value) => sum + (Number(value) || 0), 0);
        case 'avg':
            return values.length > 0 ? values.reduce((sum, value) => sum + (Number(value) || 0), 0) / values.length : 0;
        case 'count':
            return values.length;
        case 'min':
            return Math.min(...values.map(Number));
        case 'max':
            return Math.max(...values.map(Number));
        case 'custom':
            return config.customFunction ? config.customFunction(values) : null;
        default:
            return null;
    }
}

async function exportDataImplementation(data: any[], options: IExportOptions): Promise<void> {
    // Placeholder for actual export implementation
    console.log(`Exporting ${data.length} records as ${options.format}`);
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Provider Component
interface IGridStoreProviderProps {
    children: React.ReactNode;
}

export const GridStoreProvider: React.FC<IGridStoreProviderProps> = ({ children }) => {
    return React.createElement(React.Fragment, null, children);
};
