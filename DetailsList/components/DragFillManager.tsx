import * as React from 'react';

export interface DragFillManagerProps {
    onDragFill?: (
        startCell: { row: number; column: string },
        endCell: { row: number; column: string },
        value: any,
    ) => void;
    children: React.ReactNode;
}

export interface DragFillHandle {
    row: number;
    column: string;
    value: any;
    onStartDragFill: (row: number, column: string, value: any) => void;
}

export const DragFillManager: React.FC<DragFillManagerProps> = ({ onDragFill, children }) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState<{ row: number; column: string; value: any } | null>(null);
    const [dragEnd, setDragEnd] = React.useState<{ row: number; column: string } | null>(null);
    const [dragOverCells, setDragOverCells] = React.useState<Set<string>>(new Set());

    const startDragFill = React.useCallback((row: number, column: string, value: any) => {
        setIsDragging(true);
        setDragStart({ row, column, value });
        setDragEnd({ row, column });
        setDragOverCells(new Set([`${row}-${column}`]));

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

            // For now, only support single-column drag fill
            if (column === dragStart.column) {
                for (let r = startRow; r <= endRow; r++) {
                    newDragOverCells.add(`${r}-${column}`);
                }
            }

            setDragOverCells(newDragOverCells);
        },
        [isDragging, dragStart],
    );

    const endDragFill = React.useCallback(() => {
        if (!isDragging || !dragStart || !dragEnd || !onDragFill) {
            setIsDragging(false);
            setDragStart(null);
            setDragEnd(null);
            setDragOverCells(new Set());
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
            );
        }

        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        setDragOverCells(new Set());
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    }, [isDragging, dragStart, dragEnd, onDragFill]);

    // Handle mouse events globally during drag
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

    const contextValue = React.useMemo(
        () => ({
            isDragging,
            dragStart,
            dragEnd,
            dragOverCells,
            startDragFill,
            updateDragFill,
            endDragFill,
        }),
        [isDragging, dragStart, dragEnd, dragOverCells, startDragFill, updateDragFill, endDragFill],
    );

    return <DragFillContext.Provider value={contextValue}>{children}</DragFillContext.Provider>;
};

export interface DragFillContextType {
    isDragging: boolean;
    dragStart: { row: number; column: string; value: any } | null;
    dragEnd: { row: number; column: string } | null;
    dragOverCells: Set<string>;
    startDragFill: (row: number, column: string, value: any) => void;
    updateDragFill: (row: number, column: string) => void;
    endDragFill: () => void;
}

export const DragFillContext = React.createContext<DragFillContextType>({
    isDragging: false,
    dragStart: null,
    dragEnd: null,
    dragOverCells: new Set(),
    startDragFill: () => {},
    updateDragFill: () => {},
    endDragFill: () => {},
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
    const { startDragFill } = useDragFill();

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
            className={`drag-fill-handle ${className || ''}`}
            onMouseDown={handleMouseDown}
            title="Drag to fill cells"
        />
    );
};
