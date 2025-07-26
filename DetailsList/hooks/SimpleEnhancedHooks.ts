// Simplified working version without external dependencies for now
import * as React from 'react';
import { IColumn } from '@fluentui/react';

// Basic interfaces
export interface ISimplifiedGridState {
    data: any[];
    filteredData: any[];
    filters: Record<string, any>;
    selectedRows: Set<string>;
    isLoading: boolean;
}

export interface ISimplifiedGridActions {
    setData: (data: any[]) => void;
    applyFilter: (column: string, filter: any) => void;
    clearFilters: () => void;
    selectRow: (rowKey: string) => void;
    clearSelection: () => void;
}

// Simple state management without external dependencies
class SimpleGridStore {
    private state: ISimplifiedGridState = {
        data: [],
        filteredData: [],
        filters: {},
        selectedRows: new Set(),
        isLoading: false,
    };

    private listeners: Set<() => void> = new Set();

    getState = () => ({ ...this.state });

    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    private notify = () => {
        this.listeners.forEach((listener) => listener());
    };

    setData = (data: any[]) => {
        this.state = {
            ...this.state,
            data,
            filteredData: this.applyFilters(data, this.state.filters),
        };
        this.notify();
    };

    applyFilter = (column: string, filter: any) => {
        const filters = { ...this.state.filters };
        if (filter && filter !== '') {
            filters[column] = filter;
        } else {
            delete filters[column];
        }

        this.state = {
            ...this.state,
            filters,
            filteredData: this.applyFilters(this.state.data, filters),
        };
        this.notify();
    };

    private applyFilters = (data: any[], filters: Record<string, any>): any[] => {
        if (Object.keys(filters).length === 0) return data;

        return data.filter((item) => {
            return Object.entries(filters).every(([column, filter]) => {
                const value = item[column];
                if (value == null) return false;

                const stringValue = value.toString().toLowerCase();
                const filterValue = filter.toString().toLowerCase();
                return stringValue.includes(filterValue);
            });
        });
    };

    clearFilters = () => {
        this.state = {
            ...this.state,
            filters: {},
            filteredData: [...this.state.data],
        };
        this.notify();
    };

    selectRow = (rowKey: string) => {
        const selectedRows = new Set(this.state.selectedRows);
        if (selectedRows.has(rowKey)) {
            selectedRows.delete(rowKey);
        } else {
            selectedRows.add(rowKey);
        }

        this.state = {
            ...this.state,
            selectedRows,
        };
        this.notify();
    };

    clearSelection = () => {
        this.state = {
            ...this.state,
            selectedRows: new Set(),
        };
        this.notify();
    };
}

// Global store instance
const gridStore = new SimpleGridStore();

// React hook to use the store
export const useSimpleGridStore = () => {
    const [state, setState] = React.useState(gridStore.getState());

    React.useEffect(() => {
        const unsubscribe = gridStore.subscribe(() => {
            setState(gridStore.getState());
        });
        return () => {
            // If unsubscribe returns a boolean, convert to proper cleanup
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, []);

    const actions: ISimplifiedGridActions = React.useMemo(
        () => ({
            setData: gridStore.setData,
            applyFilter: gridStore.applyFilter,
            clearFilters: gridStore.clearFilters,
            selectRow: gridStore.selectRow,
            clearSelection: gridStore.clearSelection,
        }),
        [],
    );

    return { ...state, ...actions };
};

// Simple enhanced features hook
export const useEnhancedFeatures = () => {
    const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
    const [performanceMetrics, setPerformanceMetrics] = React.useState({
        renderTime: 0,
        filterTime: 0,
        itemCount: 0,
    });

    const toggleTheme = React.useCallback(() => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    const updateMetrics = React.useCallback((metrics: Partial<typeof performanceMetrics>) => {
        setPerformanceMetrics((prev) => ({ ...prev, ...metrics }));
    }, []);

    const exportToCSV = React.useCallback((data: any[], filename = 'export') => {
        if (!data || data.length === 0) return;

        const keys = Object.keys(data[0]);
        const csvContent = [
            keys.join(','), // Header
            ...data.map((row) =>
                keys
                    .map((key) => {
                        const value = row[key];
                        // Handle values that might contain commas or quotes
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value || '';
                    })
                    .join(','),
            ),
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }, []);

    return {
        theme,
        toggleTheme,
        performanceMetrics,
        updateMetrics,
        exportToCSV,
    };
};

// Quality calculation helper
export const calculateDataQuality = (data: any[], column: string) => {
    if (!data || data.length === 0) return { score: 0, level: 'unknown' };

    const values = data.map((item) => item[column]).filter((v) => v != null && v !== '');
    const completeness = values.length / data.length;
    const uniqueness = new Set(values).size / values.length;

    const score = Math.round(((completeness + uniqueness) / 2) * 100);

    let level = 'low';
    if (score >= 80) level = 'high';
    else if (score >= 60) level = 'medium';

    return { score, level };
};
