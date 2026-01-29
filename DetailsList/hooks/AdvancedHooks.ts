import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGridStore } from '../store/GridStore';
// LAZY LOADING: Export libraries use eval/Function which violates CSP on iOS Power Apps
// saveAs can be loaded at top level as it's CSP-safe
const saveAs = require('file-saver').saveAs;

// Lazy-loaded library references
let XLSX: any = null;
let jsPDF: any = null;
let autoTable: any = null;

// Lazy loader functions to avoid CSP violations on iOS
// These use require() which is synchronous but deferred until first call
const loadXLSX = (): any => {
    if (!XLSX) {
        try {
            XLSX = require('xlsx');
        } catch (e) {
            console.warn('XLSX library could not be loaded:', e);
            throw new Error('Excel export is not available in this environment');
        }
    }
    return XLSX;
};

const loadJsPDF = (): { jsPDF: any; autoTable: any } => {
    if (!jsPDF) {
        try {
            const jsPDFModule = require('jspdf');
            jsPDF = jsPDFModule.default || jsPDFModule;
            const autoTableModule = require('jspdf-autotable');
            autoTable = autoTableModule.default || autoTableModule;
        } catch (e) {
            console.warn('jsPDF library could not be loaded:', e);
            throw new Error('PDF export is not available in this environment');
        }
    }
    return { jsPDF, autoTable };
};

import {
    IAdvancedFilter,
    IFilterPreset,
    IPerformanceMetrics,
    IVirtualizationConfig,
    IExportOptions,
} from '../types/Advanced.types';

// Advanced Filtering Hook
export const useAdvancedFiltering = (data: any[], config?: any) => {
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [advancedFilters, setAdvancedFilters] = useState<IAdvancedFilter[]>([]);
    const [filteredData, setFilteredData] = useState(data);
    const [filterSuggestions, setFilterSuggestions] = useState<any[]>([]);

    const applyFilter = useCallback((columnName: string, filter: any) => {
        setFilters((prev) => ({ ...prev, [columnName]: filter }));
    }, []);

    const applyAdvancedFilter = useCallback((filter: IAdvancedFilter) => {
        setAdvancedFilters((prev) => [...prev, filter]);
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({});
        setAdvancedFilters([]);
    }, []);

    const generateFilterSuggestions = useCallback(
        (columnName: string, value: string) => {
            if (!value || value.length < 2) {
                setFilterSuggestions([]);
                return;
            }

            const column = data.map((item) => item[columnName]).filter(Boolean);
            const suggestions = [...new Set(column)]
                .filter((item) => item.toString().toLowerCase().includes(value.toLowerCase()))
                .slice(0, 10);

            setFilterSuggestions(suggestions);
        },
        [data],
    );

    useEffect(() => {
        let result = [...data];

        // Apply basic filters
        Object.entries(filters).forEach(([column, filter]) => {
            if (!filter || (Array.isArray(filter.value) && filter.value.length === 0)) return;

            result = result.filter((item) => {
                const value = item[column];
                switch (filter.type) {
                    case 'choice':
                        return Array.isArray(filter.value) ? filter.value.includes(value) : value === filter.value;
                    case 'text':
                        return value && value.toString().toLowerCase().includes(filter.value.toLowerCase());
                    case 'number':
                        return value === filter.value;
                    default:
                        return true;
                }
            });
        });

        // Apply advanced filters
        advancedFilters.forEach((filter) => {
            result = result.filter((item) => evaluateAdvancedFilter(item, filter));
        });

        setFilteredData(result);
    }, [data, filters, advancedFilters]);

    return {
        filters,
        advancedFilters,
        filteredData,
        filterSuggestions,
        applyFilter,
        applyAdvancedFilter,
        clearFilters,
        generateFilterSuggestions,
    };
};

// Virtualization Hook
export const useVirtualization = (items: any[], config: IVirtualizationConfig) => {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const itemHeight = typeof config.itemHeight === 'function' ? config.itemHeight : () => config.itemHeight as number;

    const totalHeight = useMemo(() => {
        return items.reduce((total, _, index) => total + itemHeight(index), 0);
    }, [items, itemHeight]);

    const visibleItems = useMemo(() => {
        const container = containerRef.current;
        if (!container) return items.slice(0, 10);

        const containerHeight = container.clientHeight;
        const startIndex = Math.floor(scrollTop / itemHeight(0));
        const endIndex = Math.min(
            startIndex + Math.ceil(containerHeight / itemHeight(0)) + config.overscanCount,
            items.length,
        );

        setVisibleRange({ start: startIndex, end: endIndex });
        return items.slice(startIndex, endIndex);
    }, [items, scrollTop, itemHeight, config.overscanCount]);

    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(event.currentTarget.scrollTop);
    }, []);

    const scrollToIndex = useCallback(
        (index: number) => {
            if (!containerRef.current) return;

            const offset = items.slice(0, index).reduce((total, _, i) => total + itemHeight(i), 0);
            containerRef.current.scrollTop = offset;
        },
        [items, itemHeight],
    );

    return {
        containerRef,
        visibleItems,
        visibleRange,
        totalHeight,
        handleScroll,
        scrollToIndex,
    };
};

// Performance Monitoring Hook
export const usePerformanceMonitoring = () => {
    const [metrics, setMetrics] = useState<IPerformanceMetrics>({
        renderTime: 0,
        filterTime: 0,
        memoryUsage: 0,
        dataSize: 0,
        virtualizedRows: 0,
        userInteractions: [],
        timestamp: new Date(),
    });

    const startMeasurement = useCallback((operation: string) => {
        const safeNow = () => typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
        const startTime = safeNow();
        return () => {
            const endTime = safeNow();
            const duration = endTime - startTime;

            setMetrics((prev) => ({
                ...prev,
                [operation === 'render' ? 'renderTime' : 'filterTime']: duration,
                userInteractions: [
                    ...prev.userInteractions.slice(-50), // Keep last 50 interactions
                    {
                        type: operation as any,
                        duration,
                        timestamp: new Date(),
                        metadata: {},
                    },
                ],
                timestamp: new Date(),
            }));
        };
    }, []);

    const measureMemoryUsage = useCallback(() => {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            setMetrics((prev) => ({
                ...prev,
                memoryUsage: memory.usedJSHeapSize,
                timestamp: new Date(),
            }));
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(measureMemoryUsage, 5000);
        return () => clearInterval(interval);
    }, [measureMemoryUsage]);

    return {
        metrics,
        startMeasurement,
        measureMemoryUsage,
    };
};

// Data Export Hook
export const useDataExport = () => {
    const [exportInProgress, setExportInProgress] = useState(false);
    const [lastExport, setLastExport] = useState<any>(null);

    const exportToCSV = useCallback(async (data: any[], filename: string = 'export.csv') => {
        setExportInProgress(true);
        try {
            if (data.length === 0) return;

            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map((row) =>
                    headers
                        .map((header) => {
                            const value = row[header];
                            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
                        })
                        .join(','),
                ),
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, filename);

            setLastExport({
                date: new Date(),
                format: 'CSV',
                recordCount: data.length,
                filename,
            });
        } finally {
            setExportInProgress(false);
        }
    }, []);

    const exportToExcel = useCallback(async (data: any[], filename: string = 'export.xlsx') => {
        setExportInProgress(true);
        try {
            // Lazy load XLSX to avoid CSP issues on iOS
            const XLSXLib = loadXLSX();
            
            const worksheet = XLSXLib.utils.json_to_sheet(data);
            const workbook = XLSXLib.utils.book_new();
            XLSXLib.utils.book_append_sheet(workbook, worksheet, 'Data');

            const excelBuffer = XLSXLib.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            saveAs(blob, filename);

            setLastExport({
                date: new Date(),
                format: 'Excel',
                recordCount: data.length,
                filename,
            });
        } catch (e) {
            console.error('Excel export failed:', e);
            throw e;
        } finally {
            setExportInProgress(false);
        }
    }, []);

    const exportToPDF = useCallback(async (data: any[], filename: string = 'export.pdf') => {
        setExportInProgress(true);
        try {
            // Lazy load jsPDF to avoid CSP issues on iOS
            const { jsPDF: jsPDFLib, autoTable: autoTableLib } = loadJsPDF();
            
            // Create jsPDF instance with proper constructor
            const doc = new (jsPDFLib as any)();

            if (data.length === 0) return;

            const headers = Object.keys(data[0]);
            const rows = data.map((row) => headers.map((header) => row[header]));

            // Use autoTable with proper call
            (autoTableLib as any)(doc, {
                head: [headers],
                body: rows,
                startY: 20,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] },
            });

            doc.save(filename);

            setLastExport({
                date: new Date(),
                format: 'PDF',
                recordCount: data.length,
                filename,
            });
        } finally {
            setExportInProgress(false);
        }
    }, []);

    const exportData = useCallback(
        async (data: any[], options: IExportOptions) => {
            const dataToExport = options.maxRows ? data.slice(0, options.maxRows) : data;
            const filename = options.fileName || `export_${Date.now()}`;

            switch (options.format) {
                case 'CSV':
                    await exportToCSV(dataToExport, `${filename}.csv`);
                    break;
                case 'Excel':
                    await exportToExcel(dataToExport, `${filename}.xlsx`);
                    break;
                case 'PDF':
                    await exportToPDF(dataToExport, `${filename}.pdf`);
                    break;
                case 'JSON':
                    const jsonBlob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
                    saveAs(jsonBlob, `${filename}.json`);
                    break;
            }
        },
        [exportToCSV, exportToExcel, exportToPDF],
    );

    return {
        exportInProgress,
        lastExport,
        exportData,
        exportToCSV,
        exportToExcel,
        exportToPDF,
    };
};

// Filter Presets Hook
export const useFilterPresets = () => {
    const [presets, setPresets] = useState<IFilterPreset[]>([]);
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const savePreset = useCallback((name: string, description: string, filters: IAdvancedFilter) => {
        const preset: IFilterPreset = {
            id: generateId(),
            name,
            description,
            filters,
            isPublic: false,
            createdBy: 'current-user', // Would come from context
            createdDate: new Date(),
            lastModified: new Date(),
        };

        setPresets((prev) => [...prev, preset]);
        return preset.id;
    }, []);

    const loadPreset = useCallback(
        (presetId: string) => {
            const preset = presets.find((p) => p.id === presetId);
            if (preset) {
                setActivePreset(presetId);
                return preset.filters;
            }
            return null;
        },
        [presets],
    );

    const deletePreset = useCallback(
        (presetId: string) => {
            setPresets((prev) => prev.filter((p) => p.id !== presetId));
            if (activePreset === presetId) {
                setActivePreset(null);
            }
        },
        [activePreset],
    );

    const updatePreset = useCallback((presetId: string, updates: Partial<IFilterPreset>) => {
        setPresets((prev) =>
            prev.map((preset) =>
                preset.id === presetId ? { ...preset, ...updates, lastModified: new Date() } : preset,
            ),
        );
    }, []);

    return {
        presets,
        activePreset,
        savePreset,
        loadPreset,
        deletePreset,
        updatePreset,
    };
};

// Accessibility Hook
export const useAccessibility = (config?: any) => {
    const [announcements, setAnnouncements] = useState<string[]>([]);
    const [focusedElement, setFocusedElement] = useState<string | null>(null);

    const announce = useCallback((message: string) => {
        setAnnouncements((prev) => [...prev.slice(-4), message]); // Keep last 5 announcements
    }, []);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        // Implement keyboard navigation
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                // Navigate to next row
                break;
            case 'ArrowUp':
                event.preventDefault();
                // Navigate to previous row
                break;
            case 'ArrowLeft':
                event.preventDefault();
                // Navigate to previous column
                break;
            case 'ArrowRight':
                event.preventDefault();
                // Navigate to next column
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                // Activate current element
                break;
            case 'Escape':
                // Cancel current operation
                break;
        }
    }, []);

    return {
        announcements,
        focusedElement,
        announce,
        handleKeyDown,
        setFocusedElement,
    };
};

// Data Quality Hook
export const useDataQuality = (data: any[], columns: any[]) => {
    const [quality, setQuality] = useState<any>({});

    useEffect(() => {
        if (!data.length || !columns.length) return;

        const analysis = columns.reduce((acc, column) => {
            const values = data.map((item) => item[column.key]).filter((v) => v != null);
            const uniqueValues = new Set(values);

            acc[column.key] = {
                completeness: (values.length / data.length) * 100,
                uniqueness: (uniqueValues.size / values.length) * 100,
                validity: calculateValidity(values, column.dataType),
                warnings: generateWarnings(values, column),
                suggestions: generateSuggestions(values, column),
            };

            return acc;
        }, {} as any);

        setQuality(analysis);
    }, [data, columns]);

    return quality;
};

// Theme Hook
export const useTheme = () => {
    const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (theme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            setIsDarkMode(mediaQuery.matches);

            const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            setIsDarkMode(theme === 'dark');
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    return {
        theme,
        isDarkMode,
        setTheme,
        toggleTheme,
    };
};

// Helper Functions
function evaluateAdvancedFilter(item: any, filter: IAdvancedFilter): boolean {
    // Implement advanced filter evaluation logic
    return filter.conditions.every((condition) => {
        const value = item[condition.column];

        switch (condition.operator) {
            case 'equals':
                return value === condition.value;
            case 'notEquals':
                return value !== condition.value;
            case 'contains':
                return value && value.toString().toLowerCase().includes(condition.value.toLowerCase());
            case 'greaterThan':
                return Number(value) > Number(condition.value);
            case 'lessThan':
                return Number(value) < Number(condition.value);
            default:
                return true;
        }
    });
}

function calculateValidity(values: any[], dataType: string): number {
    if (!values.length) return 100;

    const validValues = values.filter((value) => {
        switch (dataType) {
            case 'number':
                return !isNaN(Number(value));
            case 'date':
                return !isNaN(Date.parse(value));
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            default:
                return true;
        }
    });

    return (validValues.length / values.length) * 100;
}

function generateWarnings(values: any[], column: any): any[] {
    const warnings = [];

    if (values.length === 0) {
        warnings.push({
            type: 'missing_data',
            severity: 'high',
            message: `Column ${column.name} has no data`,
        });
    }

    return warnings;
}

function generateSuggestions(values: any[], column: any): any[] {
    const suggestions = [];

    if (values.length < 10) {
        suggestions.push({
            type: 'data_quality',
            impact: 'medium',
            description: 'Consider adding more data for better analysis',
        });
    }

    return suggestions;
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
