import * as React from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { VariableSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { 
    IColumn, 
    Selection, 
    SelectionMode, 
    Sticky, 
    StickyPositionType,
    CheckboxVisibility 
} from '@fluentui/react';
import { GridCell } from '../GridCell';
import { IGridColumn } from '../Component.types';
import { performanceMonitor } from '../performance/PerformanceMonitor';
import '../css/VirtualizedGrid.css';

export interface VirtualizedGridProps {
    items: any[];
    columns: IColumn[];
    width: number;
    height: number;
    rowHeight?: number | ((index: number) => number);
    onItemClick?: (item: any, index: number) => void;
    onItemDoubleClick?: (item: any, index: number) => void;
    selection?: Selection;
    selectionMode?: SelectionMode;
    enableInfiniteScroll?: boolean;
    loadMoreItems?: (startIndex: number, stopIndex: number) => Promise<void>;
    isItemLoaded?: (index: number) => boolean;
    minimumBatchSize?: number;
    threshold?: number;
    overscanCount?: number;
    enableStickyHeader?: boolean;
    className?: string;
    enablePerformanceMonitoring?: boolean;
    onRenderCell?: (item: any, column: IColumn, index: number) => React.ReactNode;
}

interface VirtualizedRowProps extends ListChildComponentProps {
    data: {
        items: any[];
        columns: IColumn[];
        onItemClick?: (item: any, index: number) => void;
        onItemDoubleClick?: (item: any, index: number) => void;
        selection?: Selection;
        onRenderCell?: (item: any, column: IColumn, index: number) => React.ReactNode;
    };
}

const VirtualizedRow = React.memo(({ index, style, data }: VirtualizedRowProps) => {
    const { items, columns, onItemClick, onItemDoubleClick, selection, onRenderCell } = data;
    const item = items[index];
    
    if (!item) {
        return (
            <div style={style} className="virtualized-row virtualized-loading-row">
                <div className="loading-placeholder">Loading...</div>
            </div>
        );
    }

    const isSelected = selection?.isIndexSelected(index) || false;
    const isEven = index % 2 === 0;

    const handleClick = React.useCallback(() => {
        onItemClick?.(item, index);
        selection?.setIndexSelected(index, !isSelected, false);
    }, [item, index, onItemClick, selection, isSelected]);

    const handleDoubleClick = React.useCallback(() => {
        onItemDoubleClick?.(item, index);
    }, [item, index, onItemDoubleClick]);

    return (
        <div 
            style={style} 
            className={`virtualized-row ${isEven ? 'even' : 'odd'} ${isSelected ? 'selected' : ''}`}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            role="row"
            aria-rowindex={index + 1}
            aria-selected={isSelected}
            tabIndex={-1}
        >
            {columns.map((column, columnIndex) => {
                const cellContent = onRenderCell ? 
                    onRenderCell(item, column, index) : 
                    <GridCell 
                        item={item}
                        column={column as IGridColumn}
                        index={index}
                        onCellAction={() => {}}
                        expanded={true}
                    />;

                return (
                    <div 
                        key={column.key}
                        className="virtualized-cell"
                        style={{
                            width: column.calculatedWidth || column.minWidth || 100,
                            minWidth: column.minWidth || 100,
                            maxWidth: column.maxWidth || 300,
                        }}
                        role="cell"
                        aria-colindex={columnIndex + 1}
                    >
                        {cellContent}
                    </div>
                );
            })}
        </div>
    );
});

const VirtualizedHeader = React.memo(({ columns, width }: { columns: IColumn[]; width: number }) => {
    return (
        <div className="virtualized-header" style={{ width }}>
            <div className="virtualized-header-row" role="row">
                {columns.map((column, index) => (
                    <div
                        key={column.key}
                        className="virtualized-header-cell"
                        style={{
                            width: column.calculatedWidth || column.minWidth || 100,
                            minWidth: column.minWidth || 100,
                            maxWidth: column.maxWidth || 300,
                        }}
                        role="columnheader"
                        aria-colindex={index + 1}
                        aria-sort={column.isSorted ? (column.isSortedDescending ? 'descending' : 'ascending') : 'none'}
                    >
                        <span className="header-text">{column.name}</span>
                        {column.isSorted && (
                            <span className={`sort-icon ${column.isSortedDescending ? 'desc' : 'asc'}`}>
                                {column.isSortedDescending ? '▼' : '▲'}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

export const VirtualizedGrid = React.memo((props: VirtualizedGridProps) => {
    const {
        items,
        columns,
        width,
        height,
        rowHeight = 40,
        onItemClick,
        onItemDoubleClick,
        selection,
        selectionMode = SelectionMode.none,
        enableInfiniteScroll = false,
        loadMoreItems,
        isItemLoaded,
        minimumBatchSize = 50,
        threshold = 15,
        overscanCount = 5,
        enableStickyHeader = true,
        className = '',
        enablePerformanceMonitoring = true,
        onRenderCell,
    } = props;

    const listRef = React.useRef<VariableSizeList | FixedSizeList>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    // Performance monitoring
    const endMeasurement = React.useMemo(() => {
        return enablePerformanceMonitoring ? 
            performanceMonitor.startMeasure('virtualized-grid-render') : 
            () => {};
    }, [enablePerformanceMonitoring]);

    React.useEffect(() => {
        return () => {
            endMeasurement();
        };
    }, [endMeasurement]);

    // Memoize row data to prevent unnecessary re-renders
    const rowData = React.useMemo(() => ({
        items,
        columns,
        onItemClick,
        onItemDoubleClick,
        selection,
        onRenderCell,
    }), [items, columns, onItemClick, onItemDoubleClick, selection, onRenderCell]);

    // Calculate total content width
    const totalWidth = React.useMemo(() => {
        return columns.reduce((sum, col) => sum + (col.calculatedWidth || col.minWidth || 100), 0);
    }, [columns]);

    // Handle infinite loading
    const handleLoadMoreItems = React.useCallback(async (startIndex: number, stopIndex: number) => {
        if (loadMoreItems && !isLoading) {
            setIsLoading(true);
            try {
                await loadMoreItems(startIndex, stopIndex);
            } finally {
                setIsLoading(false);
            }
        }
    }, [loadMoreItems, isLoading]);

    // Check if item is loaded
    const checkIsItemLoaded = React.useCallback((index: number) => {
        return isItemLoaded ? isItemLoaded(index) : true;
    }, [isItemLoaded]);

    const headerHeight = 40;
    const listHeight = height - (enableStickyHeader ? headerHeight : 0);

    // Use variable size list if rowHeight is a function
    const isVariableHeight = typeof rowHeight === 'function';

    const renderList = () => {
        if (enableInfiniteScroll && loadMoreItems) {
            const itemCount = items.length + (isLoading ? 1 : 0);
            
            return (
                <InfiniteLoader
                    isItemLoaded={checkIsItemLoaded}
                    itemCount={itemCount}
                    loadMoreItems={handleLoadMoreItems}
                    minimumBatchSize={minimumBatchSize}
                    threshold={threshold}
                >
                    {({ onItemsRendered, ref }) => (
                        isVariableHeight ? (
                            <VariableSizeList
                                ref={(list) => {
                                    listRef.current = list;
                                    ref(list);
                                }}
                                height={listHeight}
                                width={Math.max(width, totalWidth)}
                                itemCount={itemCount}
                                itemSize={rowHeight as (index: number) => number}
                                itemData={rowData}
                                overscanCount={overscanCount}
                                onItemsRendered={onItemsRendered}
                                className="virtualized-list"
                            >
                                {VirtualizedRow}
                            </VariableSizeList>
                        ) : (
                            <FixedSizeList
                                ref={(list) => {
                                    listRef.current = list;
                                    ref(list);
                                }}
                                height={listHeight}
                                width={Math.max(width, totalWidth)}
                                itemCount={itemCount}
                                itemSize={rowHeight as number}
                                itemData={rowData}
                                overscanCount={overscanCount}
                                onItemsRendered={onItemsRendered}
                                className="virtualized-list"
                            >
                                {VirtualizedRow}
                            </FixedSizeList>
                        )
                    )}
                </InfiniteLoader>
            );
        }

        return isVariableHeight ? (
            <VariableSizeList
                ref={listRef}
                height={listHeight}
                width={Math.max(width, totalWidth)}
                itemCount={items.length}
                itemSize={rowHeight as (index: number) => number}
                itemData={rowData}
                overscanCount={overscanCount}
                className="virtualized-list"
            >
                {VirtualizedRow}
            </VariableSizeList>
        ) : (
            <FixedSizeList
                ref={listRef}
                height={listHeight}
                width={Math.max(width, totalWidth)}
                itemCount={items.length}
                itemSize={rowHeight as number}
                itemData={rowData}
                overscanCount={overscanCount}
                className="virtualized-list"
            >
                {VirtualizedRow}
            </FixedSizeList>
        );
    };

    return (
        <div 
            className={`virtualized-grid-container ${className}`}
            style={{ width, height }}
            role="grid"
            aria-rowcount={items.length}
            aria-colcount={columns.length}
        >
            {enableStickyHeader && (
                <Sticky stickyPosition={StickyPositionType.Header}>
                    <VirtualizedHeader columns={columns} width={Math.max(width, totalWidth)} />
                </Sticky>
            )}
            <div className="virtualized-grid-body">
                {renderList()}
            </div>
        </div>
    );
});

VirtualizedGrid.displayName = 'VirtualizedGrid';
