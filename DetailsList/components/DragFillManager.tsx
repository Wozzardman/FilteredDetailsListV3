import * as React from 'react';

// Multi-column row data for drag fill
export interface RowFillData {
    row: number;
    values: Map<string, any>; // columnKey -> value
}

export interface DragFillManagerProps {
    onDragFill?: (
        startCell: { row: number; column: string },
        endCell: { row: number; column: string },
        value: any,
        fillType: 'copy' | 'series' | 'pattern',
    ) => void;
    // New callback for multi-column row drag fill
    onRowDragFill?: (
        startRow: number,
        endRow: number,
        sourceRowValues: Map<string, any>,
        columns: string[],
        fillType: 'copy' | 'series' | 'pattern',
    ) => void;
    children: React.ReactNode;
    enableSmartFill?: boolean;
    enablePatternDetection?: boolean;
}

export interface DragFillHandle {
    row: number;
    column: string;
    value: any;
    onStartDragFill: (row: number, column: string, value: any) => void;
}

export interface RowDragFillHandle {
    row: number;
    rowValues: Map<string, any>;
    columns: string[];
    onStartRowDragFill: (row: number, rowValues: Map<string, any>, columns: string[]) => void;
}

export interface DragFillData {
    startRow: number;
    startColumn: string;
    endRow: number;
    endColumn: string;
    sourceValue: any;
    fillType: 'copy' | 'series' | 'pattern';
    predictedValues?: any[];
}

export interface RowDragFillData {
    startRow: number;
    endRow: number;
    sourceRowValues: Map<string, any>;
    columns: string[];
    fillType: 'copy' | 'series' | 'pattern';
}

export const DragFillManager: React.FC<DragFillManagerProps> = ({ 
    onDragFill,
    onRowDragFill, 
    children, 
    enableSmartFill = true,
    enablePatternDetection = true 
}) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [isRowDragging, setIsRowDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState<{ row: number; column: string; value: any } | null>(null);
    const [rowDragStart, setRowDragStart] = React.useState<{ row: number; rowValues: Map<string, any>; columns: string[] } | null>(null);
    const [dragEnd, setDragEnd] = React.useState<{ row: number; column: string } | null>(null);
    const [rowDragEnd, setRowDragEnd] = React.useState<number | null>(null);
    const [dragOverCells, setDragOverCells] = React.useState<Set<string>>(new Set());
    const [dragOverRows, setDragOverRows] = React.useState<Set<number>>(new Set());
    const [fillPreview, setFillPreview] = React.useState<Map<string, any>>(new Map());
    const [fillType, setFillType] = React.useState<'copy' | 'series' | 'pattern'>('copy');

    const startDragFill = React.useCallback((row: number, column: string, value: any) => {
        setIsDragging(true);
        setIsRowDragging(false);
        setDragStart({ row, column, value });
        setDragEnd({ row, column });
        setDragOverCells(new Set([`${row}-${column}`]));
        setFillType('copy'); // Default fill type

        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }, []);

    // Start row-based drag fill (entire row/multiple columns)
    const startRowDragFill = React.useCallback((row: number, rowValues: Map<string, any>, columns: string[]) => {
        setIsRowDragging(true);
        setIsDragging(false);
        setRowDragStart({ row, rowValues, columns });
        setRowDragEnd(row);
        setDragOverRows(new Set([row]));
        setFillType('copy'); // Default fill type for rows

        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }, []);

    const updateDragFill = React.useCallback(
        (row: number, column: string) => {
            if (!isDragging || !dragStart) return;

            setDragEnd({ row, column });

            // Calculate all cells in the drag range
            const startRow = Math.min(dragStart.row, row);
            const endRow = Math.max(dragStart.row, row);
            const newDragOverCells = new Set<string>();
            const newFillPreview = new Map<string, any>();

            // For now, only support single-column drag fill
            if (column === dragStart.column) {
                const range = Math.abs(endRow - startRow) + 1;
                const direction = row > dragStart.row ? 1 : -1;
                
                // Determine fill type and generate preview values
                const { fillType: detectedFillType, values } = determineFillType(
                    dragStart.value,
                    range,
                    direction,
                    enableSmartFill,
                    enablePatternDetection
                );
                
                setFillType(detectedFillType);

                for (let r = startRow; r <= endRow; r++) {
                    const cellKey = `${r}-${column}`;
                    newDragOverCells.add(cellKey);
                    
                    // Calculate preview value for this cell
                    const index = r - startRow;
                    if (index < values.length) {
                        newFillPreview.set(cellKey, values[index]);
                    }
                }
            }

            setDragOverCells(newDragOverCells);
            setFillPreview(newFillPreview);
        },
        [isDragging, dragStart, enableSmartFill, enablePatternDetection],
    );

    // Update row drag fill - tracks which rows are being dragged over
    const updateRowDragFill = React.useCallback(
        (row: number) => {
            if (!isRowDragging || !rowDragStart) return;

            setRowDragEnd(row);

            // Calculate all rows in the drag range
            const startRow = Math.min(rowDragStart.row, row);
            const endRow = Math.max(rowDragStart.row, row);
            const newDragOverRows = new Set<number>();
            const newFillPreview = new Map<string, any>();

            for (let r = startRow; r <= endRow; r++) {
                newDragOverRows.add(r);
                
                // Generate preview values for each column in the row
                rowDragStart.columns.forEach((columnKey) => {
                    const sourceValue = rowDragStart.rowValues.get(columnKey);
                    const cellKey = `${r}-${columnKey}`;
                    newFillPreview.set(cellKey, sourceValue);
                });
            }

            setDragOverRows(newDragOverRows);
            setFillPreview(newFillPreview);
        },
        [isRowDragging, rowDragStart],
    );

    const endDragFill = React.useCallback(() => {
        if (!isDragging || !dragStart || !dragEnd || !onDragFill) {
            setIsDragging(false);
            setDragStart(null);
            setDragEnd(null);
            setDragOverCells(new Set());
            setFillPreview(new Map());
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            return;
        }

        // Only trigger if we actually dragged to different cells
        if (dragStart.row !== dragEnd.row || dragStart.column !== dragEnd.column) {
            onDragFill(
                { row: dragStart.row, column: dragStart.column },
                { row: dragEnd.row, column: dragEnd.column },
                dragStart.value,
                fillType,
            );
        }

        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        setDragOverCells(new Set());
        setFillPreview(new Map());
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    }, [isDragging, dragStart, dragEnd, onDragFill, fillType]);

    // End row drag fill
    const endRowDragFill = React.useCallback(() => {
        if (!isRowDragging || !rowDragStart || rowDragEnd === null || !onRowDragFill) {
            setIsRowDragging(false);
            setRowDragStart(null);
            setRowDragEnd(null);
            setDragOverRows(new Set());
            setFillPreview(new Map());
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            return;
        }

        // Only trigger if we actually dragged to different rows
        if (rowDragStart.row !== rowDragEnd) {
            onRowDragFill(
                rowDragStart.row,
                rowDragEnd,
                rowDragStart.rowValues,
                rowDragStart.columns,
                fillType,
            );
        }

        setIsRowDragging(false);
        setRowDragStart(null);
        setRowDragEnd(null);
        setDragOverRows(new Set());
        setFillPreview(new Map());
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    }, [isRowDragging, rowDragStart, rowDragEnd, onRowDragFill, fillType]);

    // Handle mouse events globally during single-cell drag
    React.useEffect(() => {
        if (!isDragging) return;

        const handleMouseUp = () => {
            endDragFill();
        };

        const handleMouseLeave = () => {
            endDragFill();
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isDragging, endDragFill]);

    // Handle mouse events globally during row drag
    React.useEffect(() => {
        if (!isRowDragging) return;

        const handleMouseUp = () => {
            endRowDragFill();
        };

        const handleMouseLeave = () => {
            endRowDragFill();
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isRowDragging, endRowDragFill]);

    const contextValue = React.useMemo(
        () => ({
            isDragging,
            isRowDragging,
            dragStart,
            rowDragStart,
            dragEnd,
            rowDragEnd,
            dragOverCells,
            dragOverRows,
            fillPreview,
            fillType,
            startDragFill,
            startRowDragFill,
            updateDragFill,
            updateRowDragFill,
            endDragFill,
            endRowDragFill,
        }),
        [isDragging, isRowDragging, dragStart, rowDragStart, dragEnd, rowDragEnd, dragOverCells, dragOverRows, fillPreview, fillType, startDragFill, startRowDragFill, updateDragFill, updateRowDragFill, endDragFill, endRowDragFill],
    );

    return <DragFillContext.Provider value={contextValue}>{children}</DragFillContext.Provider>;
};

export interface DragFillContextType {
    isDragging: boolean;
    isRowDragging: boolean;
    dragStart: { row: number; column: string; value: any } | null;
    rowDragStart: { row: number; rowValues: Map<string, any>; columns: string[] } | null;
    dragEnd: { row: number; column: string } | null;
    rowDragEnd: number | null;
    dragOverCells: Set<string>;
    dragOverRows: Set<number>;
    fillPreview: Map<string, any>;
    fillType: 'copy' | 'series' | 'pattern';
    startDragFill: (row: number, column: string, value: any) => void;
    startRowDragFill: (row: number, rowValues: Map<string, any>, columns: string[]) => void;
    updateDragFill: (row: number, column: string) => void;
    updateRowDragFill: (row: number) => void;
    endDragFill: () => void;
    endRowDragFill: () => void;
}

export const DragFillContext = React.createContext<DragFillContextType>({
    isDragging: false,
    isRowDragging: false,
    dragStart: null,
    rowDragStart: null,
    dragEnd: null,
    rowDragEnd: null,
    dragOverCells: new Set(),
    dragOverRows: new Set(),
    fillPreview: new Map(),
    fillType: 'copy',
    startDragFill: () => {},
    startRowDragFill: () => {},
    updateDragFill: () => {},
    updateRowDragFill: () => {},
    endDragFill: () => {},
    endRowDragFill: () => {},
});

export const useDragFill = () => {
    const context = React.useContext(DragFillContext);
    if (!context) {
        throw new Error('useDragFill must be used within a DragFillManager');
    }
    return context;
};

export interface DragFillHandleProps {
    row: number;
    column: string;
    value: any;
    className?: string;
}

export const DragFillHandle: React.FC<DragFillHandleProps> = ({ row, column, value, className }) => {
    const { startDragFill, fillType, isDragging } = useDragFill();

    const handleMouseDown = React.useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            startDragFill(row, column, value);
        },
        [row, column, value, startDragFill],
    );

    return (
        <div
            className={`drag-fill-handle ${className || ''} ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
            title={`Drag to fill cells (${fillType})`}
            style={{
                cursor: isDragging ? 'crosshair' : 'grab',
            }}
        />
    );
};

// Row Drag Fill Handle - for copying entire rows
export interface RowDragFillHandleProps {
    row: number;
    rowValues: Map<string, any>;
    columns: string[];
    className?: string;
}

export const RowDragFillHandle: React.FC<RowDragFillHandleProps> = ({ row, rowValues, columns, className }) => {
    const { startRowDragFill, fillType, isRowDragging } = useDragFill();

    const handleMouseDown = React.useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            startRowDragFill(row, rowValues, columns);
        },
        [row, rowValues, columns, startRowDragFill],
    );

    return (
        <div
            className={`row-drag-fill-handle ${className || ''} ${isRowDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
            title={`Drag to copy row to other rows (${fillType})`}
            style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                backgroundColor: '#0078d4',
                border: '2px solid white',
                borderRadius: '2px',
                cursor: isRowDragging ? 'crosshair' : 'grab',
                opacity: 0,
                transition: 'opacity 0.15s ease',
                zIndex: 10,
            }}
        />
    );
};

/**
 * Smart fill type detection and value generation
 */
function determineFillType(
    sourceValue: any,
    range: number,
    direction: number,
    enableSmartFill: boolean,
    enablePatternDetection: boolean
): { fillType: 'copy' | 'series' | 'pattern'; values: any[] } {
    const values: any[] = [];
    
    if (!enableSmartFill) {
        // Simple copy fill
        for (let i = 0; i < range; i++) {
            values.push(sourceValue);
        }
        return { fillType: 'copy', values };
    }

    // Try to detect pattern or series
    if (typeof sourceValue === 'number') {
        // Numeric series
        for (let i = 0; i < range; i++) {
            values.push(sourceValue + (i * direction));
        }
        return { fillType: 'series', values };
    }

    if (typeof sourceValue === 'string') {
        // Try to detect string patterns
        const numberMatch = sourceValue.match(/(\D*)(\d+)(\D*)/);
        if (numberMatch && enablePatternDetection) {
            const [, prefix, numberStr, suffix] = numberMatch;
            const number = parseInt(numberStr, 10);
            
            for (let i = 0; i < range; i++) {
                const newNumber = number + (i * direction);
                values.push(`${prefix}${newNumber}${suffix}`);
            }
            return { fillType: 'pattern', values };
        }

        // Date patterns
        const date = tryParseDate(sourceValue);
        if (date && enablePatternDetection) {
            for (let i = 0; i < range; i++) {
                const newDate = new Date(date);
                newDate.setDate(date.getDate() + (i * direction));
                values.push(formatDate(newDate));
            }
            return { fillType: 'series', values };
        }

        // Month/Day patterns
        const monthPattern = detectMonthPattern(sourceValue);
        if (monthPattern && enablePatternDetection) {
            for (let i = 0; i < range; i++) {
                values.push(generateMonthSequence(sourceValue, i * direction));
            }
            return { fillType: 'pattern', values };
        }

        const dayPattern = detectDayPattern(sourceValue);
        if (dayPattern && enablePatternDetection) {
            for (let i = 0; i < range; i++) {
                values.push(generateDaySequence(sourceValue, i * direction));
            }
            return { fillType: 'pattern', values };
        }
    }

    // Boolean toggle
    if (typeof sourceValue === 'boolean') {
        let current = sourceValue;
        for (let i = 0; i < range; i++) {
            values.push(current);
            current = !current; // Toggle for each cell
        }
        return { fillType: 'pattern', values };
    }

    // Default to copy
    for (let i = 0; i < range; i++) {
        values.push(sourceValue);
    }
    return { fillType: 'copy', values };
}

function tryParseDate(value: string): Date | null {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString();
}

function detectMonthPattern(value: string): boolean {
    const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    return months.some(month => value.toLowerCase().includes(month));
}

function detectDayPattern(value: string): boolean {
    const days = [
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
        'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
    ];
    return days.some(day => value.toLowerCase().includes(day));
}

function generateMonthSequence(baseValue: string, offset: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const isShort = baseValue.length <= 3;
    const monthArray = isShort ? shortMonths : months;
    
    const currentIndex = monthArray.findIndex(month => 
        baseValue.toLowerCase().includes(month.toLowerCase())
    );
    
    if (currentIndex === -1) return baseValue;
    
    const newIndex = (currentIndex + offset) % 12;
    const adjustedIndex = newIndex < 0 ? 12 + newIndex : newIndex;
    
    return baseValue.replace(
        new RegExp(monthArray[currentIndex], 'i'),
        monthArray[adjustedIndex]
    );
}

function generateDaySequence(baseValue: string, offset: number): string {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const isShort = baseValue.length <= 3;
    const dayArray = isShort ? shortDays : days;
    
    const currentIndex = dayArray.findIndex(day => 
        baseValue.toLowerCase().includes(day.toLowerCase())
    );
    
    if (currentIndex === -1) return baseValue;
    
    const newIndex = (currentIndex + offset) % 7;
    const adjustedIndex = newIndex < 0 ? 7 + newIndex : newIndex;
    
    return baseValue.replace(
        new RegExp(dayArray[currentIndex], 'i'),
        dayArray[adjustedIndex]
    );
}
