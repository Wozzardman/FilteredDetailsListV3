import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BehaviorSubject, debounceTime } from 'rxjs';
import { IColumn } from '@fluentui/react';
import '../css/VirtualizationEngine.css';

// Enterprise-grade performance monitoring
export class PerformanceMetrics {
    private renderTimes: number[] = [];
    private scrollEvents = new BehaviorSubject<{ scrollTop: number; timestamp: number }>({
        scrollTop: 0,
        timestamp: Date.now(),
    });
    private memoryUsage: number[] = [];

    startMeasurement(): { end: () => number } {
        const start = performance.now();
        return {
            end: () => {
                const duration = performance.now() - start;
                this.renderTimes.push(duration);
                if (this.renderTimes.length > 100) {
                    this.renderTimes = this.renderTimes.slice(-50);
                }
                return duration;
            },
        };
    }

    trackScrollPerformance(scrollTop: number) {
        this.scrollEvents.next({ scrollTop, timestamp: Date.now() });
    }

    getMetrics() {
        const avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
        const p95RenderTime = this.renderTimes.sort((a, b) => a - b)[Math.floor(this.renderTimes.length * 0.95)];

        // Memory usage tracking (if available)
        const memInfo = (performance as any).memory;
        if (memInfo) {
            this.memoryUsage.push(memInfo.usedJSHeapSize);
        }

        return {
            avgRenderTime: avgRenderTime || 0,
            p95RenderTime: p95RenderTime || 0,
            renderCount: this.renderTimes.length,
            memoryTrend: this.memoryUsage.slice(-10),
            currentMemory: memInfo?.usedJSHeapSize || 0,
        };
    }
}

// Advanced virtualization configuration
export interface VirtualizationConfig {
    itemHeight: number | ((index: number) => number);
    overscan: number;
    enableScrollDebounce: boolean;
    scrollDebounceMs: number;
    bufferSize: number;
    recycleThreshold: number;
    enableInfiniteLoading: boolean;
    loadMoreThreshold: number;
}

// Enterprise Virtualization Hook
export const useEnterpriseVirtualization = (items: any[], config: Partial<VirtualizationConfig> = {}) => {
    const [metrics] = React.useState(() => new PerformanceMetrics());
    const [isLoading, setIsLoading] = React.useState(false);
    const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set());

    const defaultConfig: VirtualizationConfig = {
        itemHeight: 42,
        overscan: 5,
        enableScrollDebounce: true,
        scrollDebounceMs: 16,
        bufferSize: 10,
        recycleThreshold: 1000,
        enableInfiniteLoading: false,
        loadMoreThreshold: 10,
        ...config,
    };

    // Selection management
    const handleSelectionChange = React.useCallback((key: string, selected: boolean) => {
        setSelectedKeys((prev) => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(key);
            } else {
                newSet.delete(key);
            }
            return newSet;
        });
    }, []);

    // Load more data for infinite scrolling
    const loadMoreData = React.useCallback(async (startIndex: number, stopIndex: number): Promise<void> => {
        setIsLoading(true);
        try {
            // This would typically be an API call
            await new Promise((resolve) => setTimeout(resolve, 100));
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        config: defaultConfig,
        metrics,
        isLoading,
        selectedKeys,
        handleSelectionChange,
        loadMoreData,
    };
};

// High-performance TanStack Virtual implementation
export const UltraVirtualizedList: React.FC<{
    items: any[];
    columns: IColumn[];
    height: number;
    estimateSize?: (index: number) => number;
    onRenderItemColumn?: (item: any, index: number, column: IColumn) => React.ReactNode;
    enableSelection?: boolean;
    onSelectionChange?: (selectedKeys: Set<string>) => void;
    config?: Partial<VirtualizationConfig>;
}> = ({
    items,
    columns,
    height,
    estimateSize = () => 42,
    onRenderItemColumn,
    enableSelection = false,
    onSelectionChange,
    config = {},
}) => {
    const parentRef = React.useRef<HTMLDivElement>(null);
    const { selectedKeys, handleSelectionChange, metrics } = useEnterpriseVirtualization(items, config);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize,
        overscan: 5,
    });

    // Notify parent of selection changes
    React.useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedKeys);
        }
    }, [selectedKeys, onSelectionChange]);

    // Performance monitoring
    React.useEffect(() => {
        const measurement = metrics.startMeasurement();
        return () => {
            measurement.end();
        };
    });

    const handleRowClick = React.useCallback(
        (item: any, index: number) => {
            if (enableSelection) {
                const key = item.key || `row-${index}`;
                const isSelected = selectedKeys.has(key);
                handleSelectionChange(key, !isSelected);
            }
        },
        [enableSelection, selectedKeys, handleSelectionChange],
    );

    return (
        <div ref={parentRef} className="ultra-virtualized-container">
            <div className="ultra-virtualized-content">
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const item = items[virtualItem.index];
                    if (!item) return null;

                    const key = item.key || `row-${virtualItem.index}`;
                    const isSelected = selectedKeys.has(key);

                    return (
                        <div
                            key={String(virtualItem.key)}
                            className={`ultra-virtualized-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleRowClick(item, virtualItem.index)}
                            role="row"
                            aria-selected={isSelected ? 'true' : 'false'}
                            tabIndex={0}
                        >
                            {columns.map((column) => (
                                <div key={column.key} className="ultra-virtualized-cell" role="gridcell">
                                    {onRenderItemColumn
                                        ? onRenderItemColumn(item, virtualItem.index, column)
                                        : item[column.fieldName || column.key]}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Native React virtualization for maximum compatibility
export const NativeVirtualizedList: React.FC<{
    items: any[];
    columns: IColumn[];
    height: number;
    itemHeight?: number;
    onRenderItemColumn?: (item: any, index: number, column: IColumn) => React.ReactNode;
    enableSelection?: boolean;
    onSelectionChange?: (selectedKeys: Set<string>) => void;
}> = ({ items, columns, height, itemHeight = 42, onRenderItemColumn, enableSelection = false, onSelectionChange }) => {
    const [scrollTop, setScrollTop] = React.useState(0);
    const { selectedKeys, handleSelectionChange, metrics } = useEnterpriseVirtualization(items);

    const containerRef = React.useRef<HTMLDivElement>(null);

    // Calculate visible range
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + Math.ceil(height / itemHeight) + 1, items.length);

    // Visible items with buffer
    const visibleItems = React.useMemo(() => {
        const buffer = 5;
        const start = Math.max(0, startIndex - buffer);
        const end = Math.min(items.length, endIndex + buffer);

        return items.slice(start, end).map((item, index) => ({
            item,
            index: start + index,
        }));
    }, [items, startIndex, endIndex]);

    const handleScroll = React.useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            const newScrollTop = e.currentTarget.scrollTop;
            setScrollTop(newScrollTop);
            metrics.trackScrollPerformance(newScrollTop);
        },
        [metrics],
    );

    // Notify parent of selection changes
    React.useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedKeys);
        }
    }, [selectedKeys, onSelectionChange]);

    const handleRowClick = React.useCallback(
        (item: any, index: number) => {
            if (enableSelection) {
                const key = item.key || `row-${index}`;
                const isSelected = selectedKeys.has(key);
                handleSelectionChange(key, !isSelected);
            }
        },
        [enableSelection, selectedKeys, handleSelectionChange],
    );

    return (
        <div ref={containerRef} className="native-virtualized-container" onScroll={handleScroll}>
            <div className="native-virtualized-content">
                {visibleItems.map(({ item, index }) => {
                    const key = item.key || `row-${index}`;
                    const isSelected = selectedKeys.has(key);

                    return (
                        <div
                            key={key}
                            className={`native-virtualized-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleRowClick(item, index)}
                            role="row"
                            aria-selected={isSelected ? 'true' : 'false'}
                            tabIndex={0}
                        >
                            {columns.map((column) => (
                                <div key={column.key} className="native-virtualized-cell" role="gridcell">
                                    {onRenderItemColumn
                                        ? onRenderItemColumn(item, index, column)
                                        : item[column.fieldName || column.key]}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Adaptive virtualization that chooses the best implementation
export const AdaptiveVirtualizedGrid: React.FC<{
    items: any[];
    columns: IColumn[];
    height: number;
    width?: number;
    onRenderItemColumn?: (item: any, index: number, column: IColumn) => React.ReactNode;
    enableSelection?: boolean;
    onSelectionChange?: (selectedKeys: Set<string>) => void;
    config?: Partial<VirtualizationConfig>;
}> = (props) => {
    const { items } = props;

    // Choose virtualization strategy based on data size and device capabilities
    const virtualizationStrategy = React.useMemo(() => {
        const itemCount = items.length;
        const isLargeDataset = itemCount > 1000;
        const isMobile = window.innerWidth < 768;
        const hasAdvancedFeatures = 'IntersectionObserver' in window;

        if (isLargeDataset && hasAdvancedFeatures && !isMobile) {
            return 'ultra'; // TanStack Virtual for best performance
        } else {
            return 'native'; // Native React for better compatibility
        }
    }, [items.length]);

    if (virtualizationStrategy === 'ultra') {
        return <UltraVirtualizedList {...props} />;
    }

    return <NativeVirtualizedList {...props} />;
};
