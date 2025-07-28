/**
 * High-Performance Data Grid Virtualization
 * Meta/Google-inspired performance for massive datasets
 * Compatible with React 16.x and TypeScript
 */

import * as React from 'react';
import { IColumn } from '@fluentui/react';
import { performanceMonitor } from '../performance/PerformanceMonitor';
import './EnterpriseVirtualization.css';

export interface VirtualGridConfig {
    itemHeight: number;
    overscanCount: number;
    enableInfiniteLoading: boolean;
    chunkSize: number;
    preloadDistance: number;
}

export interface VirtualGridProps {
    items: any[];
    columns: IColumn[];
    height: number;
    width: number;
    config: VirtualGridConfig;
    onItemsRendered?: (visibleRange: { startIndex: number; endIndex: number }) => void;
    onLoadMore?: (startIndex: number, stopIndex: number) => Promise<void>;
    onRowClick?: (item: any, index: number) => void;
    onRowDoubleClick?: (item: any, index: number) => void;
    selectedIndices?: Set<number>;
    className?: string;
    onColumnClick?: (column: IColumn, index: number) => void;
}

interface VirtualGridState {
    scrollTop: number;
    isScrolling: boolean;
    visibleStartIndex: number;
    visibleEndIndex: number;
}

// Row component optimized for performance
const VirtualRow: React.FC<{
    index: number;
    item: any;
    columns: IColumn[];
    style: React.CSSProperties;
    isSelected: boolean;
    isEven: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
}> = React.memo(({ index, item, columns, style, isSelected, isEven, onClick, onDoubleClick }) => {
    const rowClassName = React.useMemo(() => {
        const classes = ['enterprise-virtual-row'];
        if (isSelected) classes.push('selected');
        if (isEven) classes.push('even');
        else classes.push('odd');
        return classes.join(' ');
    }, [isSelected, isEven]);

    return (
        <div
            className={rowClassName}
            style={style}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            role="row"
            aria-rowindex={index + 2} // +2 because header is row 1, data starts at row 2
            aria-selected={isSelected}
        >
            {columns.map((column, colIndex) => {
                const cellValue = item[column.fieldName || column.key];
                const cellKey = `${index}-${colIndex}`;

                return (
                    <div
                        key={cellKey}
                        className="enterprise-virtual-cell"
                        style={{
                            width: column.calculatedWidth || column.minWidth || 100,
                            minWidth: column.minWidth || 100,
                            maxWidth: column.maxWidth || 300,
                        }}
                        role="gridcell"
                        aria-colindex={colIndex + 1}
                    >
                        {column.onRender ? column.onRender(item, index, column) : cellValue}
                    </div>
                );
            })}
        </div>
    );
});

VirtualRow.displayName = 'VirtualRow';

// Header component
const VirtualHeader: React.FC<{
    columns: IColumn[];
    onColumnClick?: (column: IColumn, index: number) => void;
}> = React.memo(({ columns, onColumnClick }) => {
    return (
        <div className="enterprise-virtual-header" role="row">
            {columns.map((column, index) => (
                <div
                    key={column.key}
                    className="enterprise-virtual-header-cell"
                    style={{
                        width: column.calculatedWidth || column.minWidth || 100,
                        minWidth: column.minWidth || 100,
                        maxWidth: column.maxWidth || 300,
                    }}
                    onClick={() => onColumnClick?.(column, index)}
                    role="columnheader"
                    aria-colindex={index + 1}
                    aria-sort={column.isSorted ? (column.isSortedDescending ? 'descending' : 'ascending') : 'none'}
                    tabIndex={0}
                >
                    {column.name}
                    {column.isSorted && <span className="sort-indicator">{column.isSortedDescending ? ' DESC' : ' ASC'}</span>}
                </div>
            ))}
        </div>
    );
});

VirtualHeader.displayName = 'VirtualHeader';

// Main Virtual Grid Component
export class HighPerformanceVirtualGrid extends React.PureComponent<VirtualGridProps, VirtualGridState> {
    private containerRef = React.createRef<HTMLDivElement>();
    private scrollElementRef = React.createRef<HTMLDivElement>();
    private isScrolling = false;
    private scrollingResetTimeoutId: number | null = null;

    constructor(props: VirtualGridProps) {
        super(props);

        this.state = {
            scrollTop: 0,
            isScrolling: false,
            visibleStartIndex: 0,
            visibleEndIndex: Math.min(
                Math.ceil(props.height / props.config.itemHeight) + props.config.overscanCount,
                props.items.length - 1,
            ),
        };
    }

    componentDidMount() {
        this.attachScrollListener();
    }

    componentWillUnmount() {
        this.detachScrollListener();
        if (this.scrollingResetTimeoutId !== null) {
            clearTimeout(this.scrollingResetTimeoutId);
        }
    }

    componentDidUpdate(prevProps: VirtualGridProps) {
        if (prevProps.items.length !== this.props.items.length || prevProps.height !== this.props.height) {
            this.updateVisibleRange();
        }
    }

    private attachScrollListener = () => {
        const scrollElement = this.scrollElementRef.current;
        if (scrollElement) {
            scrollElement.addEventListener('scroll', this.handleScroll, { passive: true });
        }
    };

    private detachScrollListener = () => {
        const scrollElement = this.scrollElementRef.current;
        if (scrollElement) {
            scrollElement.removeEventListener('scroll', this.handleScroll);
        }
    };

    private handleScroll = () => {
        const scrollElement = this.scrollElementRef.current;
        if (!scrollElement) return;

        const scrollTop = scrollElement.scrollTop;

        // Performance tracking
        const endMeasure = performanceMonitor.startMeasure('scroll-performance');

        this.setState({ scrollTop, isScrolling: true }, () => {
            this.updateVisibleRange();
            endMeasure();
        });

        // Reset scrolling state
        if (this.scrollingResetTimeoutId !== null) {
            clearTimeout(this.scrollingResetTimeoutId);
        }

        this.scrollingResetTimeoutId = window.setTimeout(() => {
            this.setState({ isScrolling: false });
        }, 150) as unknown as number;
    };

    private updateVisibleRange = () => {
        const { items, config, height, onItemsRendered } = this.props;
        const { scrollTop } = this.state;

        const containerHeight = height - 42; // Account for header
        const startIndex = Math.floor(scrollTop / config.itemHeight);
        const visibleCount = Math.ceil(containerHeight / config.itemHeight);

        const visibleStartIndex = Math.max(0, startIndex - config.overscanCount);
        const visibleEndIndex = Math.min(items.length - 1, startIndex + visibleCount + config.overscanCount);

        this.setState({ visibleStartIndex, visibleEndIndex });

        if (onItemsRendered) {
            onItemsRendered({ startIndex: visibleStartIndex, endIndex: visibleEndIndex });
        }

        // Check if we need to load more data
        if (config.enableInfiniteLoading && this.props.onLoadMore) {
            const threshold = config.preloadDistance || 10;
            if (visibleEndIndex >= items.length - threshold) {
                this.props.onLoadMore(items.length, items.length + config.chunkSize);
            }
        }
    };

    private renderRows = () => {
        const { items, columns, config, selectedIndices = new Set(), onRowClick, onRowDoubleClick } = this.props;
        const { visibleStartIndex, visibleEndIndex } = this.state;

        const rows: React.ReactElement[] = [];

        for (let index = visibleStartIndex; index <= visibleEndIndex; index++) {
            if (index >= items.length) break;

            const item = items[index];
            const isSelected = selectedIndices.has(index);
            const isEven = index % 2 === 0;

            const style: React.CSSProperties = {
                position: 'absolute',
                top: index * config.itemHeight,
                left: 0,
                right: 0,
                height: config.itemHeight,
                width: '100%',
            };

            rows.push(
                <VirtualRow
                    key={index}
                    index={index}
                    item={item}
                    columns={columns}
                    style={style}
                    isSelected={isSelected}
                    isEven={isEven}
                    onClick={() => onRowClick?.(item, index)}
                    onDoubleClick={() => onRowDoubleClick?.(item, index)}
                />,
            );
        }

        return rows;
    };

    render() {
        const { items, columns, height, width, config, className = '', onColumnClick } = this.props;
        const { scrollTop } = this.state;

        const totalHeight = items.length * config.itemHeight;
        const containerHeight = height - 42; // Account for header

        return (
            <div
                ref={this.containerRef}
                className={`enterprise-virtualization ${className}`}
                style={{ height, width }}
                role="grid"
                aria-label="Virtual data grid"
                aria-rowcount={items.length + 1} // +1 for header row
                aria-colcount={columns.length}
            >
                <div role="rowgroup">
                    <VirtualHeader columns={columns} onColumnClick={onColumnClick} />
                </div>

                <div
                    ref={this.scrollElementRef}
                    className="enterprise-virtual-scroll-container"
                    style={{
                        height: containerHeight,
                    }}
                    role="rowgroup"
                >
                    <div
                        className="enterprise-virtual-content"
                        style={{
                            height: totalHeight,
                        }}
                    >
                        {this.renderRows()}
                    </div>
                </div>

                {/* Performance overlay (development only) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="virtualization-performance-overlay">
                        Items: {items.length} | Visible: {this.state.visibleEndIndex - this.state.visibleStartIndex + 1}
                    </div>
                )}
            </div>
        );
    }
}

// Factory function for creating optimized configs
export const createOptimizedVirtualConfig = (
    dataSize: number,
    complexity: 'low' | 'medium' | 'high' = 'medium',
): VirtualGridConfig => {
    const baseConfig: VirtualGridConfig = {
        itemHeight: 40,
        overscanCount: 5,
        enableInfiniteLoading: false,
        chunkSize: 100,
        preloadDistance: 15,
    };

    if (dataSize > 100000) {
        // Large dataset optimizations (Meta/Google scale)
        return {
            itemHeight: 36, // Smaller rows for more density
            overscanCount: 15,
            enableInfiniteLoading: true,
            chunkSize: 1000,
            preloadDistance: 50,
        };
    } else if (dataSize > 10000) {
        // Medium dataset optimizations
        return {
            itemHeight: 38,
            overscanCount: 10,
            enableInfiniteLoading: true,
            chunkSize: 500,
            preloadDistance: 25,
        };
    }

    // Small dataset - minimal overhead
    return baseConfig;
};

// Hook for using virtual grid with performance monitoring
export const useVirtualGridPerformance = (items: any[], columns: IColumn[]) => {
    const [metrics, setMetrics] = React.useState({
        renderTime: 0,
        scrollPerformance: 100,
        memoryEstimate: 0,
    });

    const config = React.useMemo(() => createOptimizedVirtualConfig(items.length, 'medium'), [items.length]);

    React.useEffect(() => {
        // Estimate memory usage
        const estimatedMemory = items.length * columns.length * 64; // bytes per cell
        setMetrics((prev) => ({ ...prev, memoryEstimate: estimatedMemory }));
    }, [items.length, columns.length]);

    const trackRender = React.useCallback(() => {
        const endMeasure = performanceMonitor.startMeasure('virtual-grid-render');
        return () => {
            endMeasure();
        };
    }, []);

    return {
        config,
        metrics,
        trackRender,
        isLargeDataset: items.length > 10000,
        recommendedChunkSize: Math.min(Math.max(Math.floor(items.length / 100), 50), 1000),
    };
};
