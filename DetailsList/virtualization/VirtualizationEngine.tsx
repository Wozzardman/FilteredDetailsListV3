import * as React from 'react';
import { FixedSizeGrid as Grid, VariableSizeGrid } from 'react-window';
import { areEqual } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { IColumn } from '@fluentui/react';
import memoizeOne from 'memoize-one';

export interface VirtualizationConfig {
    enableVirtualization: boolean;
    rowHeight: number | ((index: number) => number);
    columnWidth: number | ((index: number) => number);
    overscanRowCount: number;
    overscanColumnCount: number;
    useVariableSize: boolean;
    enableScrollSync: boolean;
    bufferSize: number;
    estimatedRowHeight: number;
    estimatedColumnWidth: number;
}

export interface VirtualizedCellProps {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
    data: {
        items: any[];
        columns: IColumn[];
        onCellClick?: (item: any, column: IColumn) => void;
        onCellEdit?: (item: any, columnKey: string, newValue: any) => void;
        readOnlyColumns?: string[];
        getRowId: (item: any) => string;
    };
}

// Memoized cell component for optimal performance
const VirtualizedCell = React.memo<VirtualizedCellProps>(({ columnIndex, rowIndex, style, data }) => {
    const { items, columns, onCellClick, onCellEdit, readOnlyColumns = [], getRowId } = data;
    
    // Header row
    if (rowIndex === 0) {
        const column = columns[columnIndex];
        return (
            <div
                style={{
                    ...style,
                    backgroundColor: '#f3f2f1',
                    borderBottom: '1px solid #e1dfdd',
                    borderRight: '1px solid #e1dfdd',
                    padding: '8px 12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '12px',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                }}
                title={column?.name}
            >
                {column?.name || ''}
            </div>
        );
    }

    // Data row
    const item = items[rowIndex - 1];
    const column = columns[columnIndex];
    
    if (!item || !column) {
        return <div style={style} />;
    }

    const cellValue = item[column.key] || '';
    const isReadOnly = readOnlyColumns.includes(column.key);
    const rowId = getRowId(item);

    const handleCellClick = React.useCallback(() => {
        if (onCellClick) {
            onCellClick(item, column);
        }
    }, [item, column, onCellClick]);

    return (
        <div
            style={{
                ...style,
                borderBottom: '1px solid #e1dfdd',
                borderRight: '1px solid #e1dfdd',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                cursor: !isReadOnly ? 'pointer' : 'default',
                backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#faf9f8',
                fontSize: '13px',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
            }}
            onClick={handleCellClick}
            title={cellValue?.toString() || ''}
            data-row-id={rowId}
            data-column-key={column.key}
        >
            {cellValue?.toString() || ''}
        </div>
    );
}, areEqual);

VirtualizedCell.displayName = 'VirtualizedCell';

export interface VirtualizationEngineProps {
    items: any[];
    columns: IColumn[];
    config: VirtualizationConfig;
    onCellClick?: (item: any, column: IColumn) => void;
    onCellEdit?: (item: any, columnKey: string, newValue: any) => void;
    readOnlyColumns?: string[];
    getRowId: (item: any) => string;
    height: number;
    width: number;
}

export const VirtualizationEngine = React.memo<VirtualizationEngineProps>((props) => {
    const {
        items,
        columns,
        config,
        onCellClick,
        onCellEdit,
        readOnlyColumns,
        getRowId,
        height,
        width
    } = props;

    // Memoize the data object to prevent unnecessary re-renders
    const cellData = React.useMemo(() => ({
        items,
        columns,
        onCellClick,
        onCellEdit,
        readOnlyColumns,
        getRowId
    }), [items, columns, onCellClick, onCellEdit, readOnlyColumns, getRowId]);

    // Calculate dynamic row heights if variable size is enabled
    const getRowHeight = React.useCallback((index: number) => {
        if (index === 0) return 32; // Header height
        
        if (typeof config.rowHeight === 'function') {
            return config.rowHeight(index - 1);
        }
        return typeof config.rowHeight === 'number' ? config.rowHeight : config.estimatedRowHeight;
    }, [config.rowHeight, config.estimatedRowHeight]);

    // Calculate dynamic column widths
    const getColumnWidth = React.useCallback((index: number) => {
        const column = columns[index];
        if (!column) return config.estimatedColumnWidth;

        if (typeof config.columnWidth === 'function') {
            return config.columnWidth(index);
        }
        
        // Auto-calculate based on column content
        if (column.calculatedWidth) return column.calculatedWidth;
        if (column.minWidth) return Math.max(column.minWidth, 120);
        
        return typeof config.columnWidth === 'number' ? config.columnWidth : 150;
    }, [columns, config.columnWidth, config.estimatedColumnWidth]);

    const rowCount = items.length + 1; // +1 for header
    const columnCount = columns.length;

    if (!config.enableVirtualization || items.length < 50) {
        // Fallback to non-virtualized rendering for small datasets
        return (
            <div style={{ height, width, overflow: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
                    {/* Render all cells directly for small datasets */}
                    {Array.from({ length: rowCount }, (_, rowIndex) =>
                        Array.from({ length: columnCount }, (_, columnIndex) => (
                            <VirtualizedCell
                                key={`${rowIndex}-${columnIndex}`}
                                rowIndex={rowIndex}
                                columnIndex={columnIndex}
                                style={{}}
                                data={cellData}
                            />
                        ))
                    )}
                </div>
            </div>
        );
    }

    // Use variable size grid for dynamic heights/widths
    if (config.useVariableSize) {
        return (
            <VariableSizeGrid
                height={height}
                width={width}
                rowCount={rowCount}
                columnCount={columnCount}
                rowHeight={getRowHeight}
                columnWidth={getColumnWidth}
                overscanRowCount={config.overscanRowCount}
                overscanColumnCount={config.overscanColumnCount}
                itemData={cellData}
                style={{ outline: 'none' }}
            >
                {VirtualizedCell}
            </VariableSizeGrid>
        );
    }

    // Use fixed size grid for better performance with uniform cells
    const fixedRowHeight = typeof config.rowHeight === 'number' ? config.rowHeight : config.estimatedRowHeight;
    const fixedColumnWidth = typeof config.columnWidth === 'number' ? config.columnWidth : config.estimatedColumnWidth;

    return (
        <Grid
            height={height}
            width={width}
            rowCount={rowCount}
            columnCount={columnCount}
            rowHeight={fixedRowHeight}
            columnWidth={fixedColumnWidth}
            overscanRowCount={config.overscanRowCount}
            overscanColumnCount={config.overscanColumnCount}
            itemData={cellData}
            style={{ outline: 'none' }}
        >
            {VirtualizedCell}
        </Grid>
    );
});

VirtualizationEngine.displayName = 'VirtualizationEngine';

// Auto-sizing wrapper for responsive behavior
export const AutoSizedVirtualizationEngine: React.FC<Omit<VirtualizationEngineProps, 'height' | 'width'>> = (props) => {
    return (
        <AutoSizer>
            {({ height, width }) => (
                <VirtualizationEngine
                    {...props}
                    height={height}
                    width={width}
                />
            )}
        </AutoSizer>
    );
};
