import * as React from 'react';
import { 
    DetailsList, 
    IColumn, 
    IDetailsListProps, 
    SelectionMode,
    IObjectWithKey,
    DetailsRow,
    IDetailsRowProps,
    IDetailsRowStyles,
    CommandBar,
    ICommandBarItemProps,
    MessageBar,
    MessageBarType
} from '@fluentui/react';
import { InlineEditor } from './InlineEditor';
import { DragFillManager, DragFillHandle, useDragFill } from './DragFillManager';

export interface EditableGridProps extends Omit<IDetailsListProps, 'items' | 'columns'> {
    items: any[];
    columns: IColumn[];
    onCellEdit?: (item: any, columnKey: string, newValue: any) => void;
    onCommitChanges?: (changes: EditChange[]) => void;
    onCancelChanges?: () => void;
    enableInlineEditing?: boolean;
    enableDragFill?: boolean;
    readOnlyColumns?: string[];
    getAvailableValues?: (columnKey: string) => string[];
}

export interface EditChange {
    itemId: string;
    columnKey: string;
    oldValue: any;
    newValue: any;
    rowIndex: number;
}

interface CellEditState {
    itemId: string;
    columnKey: string;
    isEditing: boolean;
}

interface PendingChanges {
    [itemId: string]: {
        [columnKey: string]: any;
    };
}

export const EditableGrid: React.FC<EditableGridProps> = ({
    items,
    columns,
    onCellEdit,
    onCommitChanges,
    onCancelChanges,
    enableInlineEditing = true,
    enableDragFill = true,
    readOnlyColumns = [],
    getAvailableValues,
    ...detailsListProps
}) => {
    const [editingCell, setEditingCell] = React.useState<CellEditState | null>(null);
    const [pendingChanges, setPendingChanges] = React.useState<PendingChanges>({});
    const [hasChanges, setHasChanges] = React.useState(false);

    // Track items with pending changes for visual feedback
    const itemsWithChanges = React.useMemo(() => {
        return items.map(item => {
            const itemId = item.key || item.id || item.getRecordId?.();
            const changes = pendingChanges[itemId];
            if (changes) {
                return { ...item, ...changes, _hasChanges: true };
            }
            return { ...item, _hasChanges: false };
        });
    }, [items, pendingChanges]);

    const handleCellEdit = React.useCallback((item: any, columnKey: string, newValue: any) => {
        const itemId = item.key || item.id || item.getRecordId?.();
        if (!itemId) return;

        // Update pending changes
        setPendingChanges(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [columnKey]: newValue
            }
        }));

        setHasChanges(true);

        // Call external handler if provided
        if (onCellEdit) {
            onCellEdit(item, columnKey, newValue);
        }

        // Exit edit mode
        setEditingCell(null);
    }, [onCellEdit]);

    const handleDragFill = React.useCallback((
        startCell: { row: number; column: string },
        endCell: { row: number; column: string },
        value: any
    ) => {
        if (!enableDragFill) return;

        const startRow = Math.min(startCell.row, endCell.row);
        const endRow = Math.max(startCell.row, endCell.row);
        const columnKey = startCell.column;

        // Apply the value to all cells in the range
        for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
            if (rowIndex < items.length) {
                const item = items[rowIndex];
                handleCellEdit(item, columnKey, value);
            }
        }
    }, [enableDragFill, items, handleCellEdit]);

    const handleCommitChanges = React.useCallback(() => {
        if (!onCommitChanges || !hasChanges) return;

        const changes: EditChange[] = [];
        Object.entries(pendingChanges).forEach(([itemId, itemChanges]) => {
            const item = items.find(i => (i.key || i.id || i.getRecordId?.()) === itemId);
            if (item) {
                const rowIndex = items.indexOf(item);
                Object.entries(itemChanges).forEach(([columnKey, newValue]) => {
                    const oldValue = item[columnKey];
                    if (oldValue !== newValue) {
                        changes.push({
                            itemId,
                            columnKey,
                            oldValue,
                            newValue,
                            rowIndex
                        });
                    }
                });
            }
        });

        onCommitChanges(changes);
        setPendingChanges({});
        setHasChanges(false);
    }, [onCommitChanges, hasChanges, pendingChanges, items]);

    const handleCancelChanges = React.useCallback(() => {
        setPendingChanges({});
        setHasChanges(false);
        setEditingCell(null);

        if (onCancelChanges) {
            onCancelChanges();
        }
    }, [onCancelChanges]);

    const commandBarItems: ICommandBarItemProps[] = React.useMemo(() => {
        if (!hasChanges) return [];

        return [
            {
                key: 'commit',
                text: 'Commit Changes',
                iconProps: { iconName: 'Save' },
                onClick: handleCommitChanges,
                buttonStyles: {
                    root: { backgroundColor: '#107c10', color: 'white' },
                    rootHovered: { backgroundColor: '#0e6e0e' }
                }
            },
            {
                key: 'cancel',
                text: 'Cancel Changes',
                iconProps: { iconName: 'Cancel' },
                onClick: handleCancelChanges,
                buttonStyles: {
                    root: { backgroundColor: '#d13438', color: 'white' },
                    rootHovered: { backgroundColor: '#b52b30' }
                }
            }
        ];
    }, [hasChanges, handleCommitChanges, handleCancelChanges]);

    const enhancedColumns = React.useMemo(() => {
        return columns.map(column => ({
            ...column,
            onRender: (item: any, index?: number) => {
                const itemId = item.key || item.id || item.getRecordId?.();
                const columnKey = column.fieldName || column.key;
                const isReadOnly = readOnlyColumns.includes(columnKey);
                const isCurrentlyEditing = editingCell?.itemId === itemId && editingCell?.columnKey === columnKey;
                
                // Get the current value (from pending changes or original item)
                const currentValue = pendingChanges[itemId]?.[columnKey] ?? item[columnKey];
                
                if (!enableInlineEditing || isReadOnly) {
                    // Read-only cell
                    return (
                        <div className={`grid-cell ${item._hasChanges ? 'has-changes' : ''}`}>
                            {column.onRender ? column.onRender(item, index, column) : currentValue}
                        </div>
                    );
                }

                return (
                    <EditableGridCell
                        item={item}
                        column={column}
                        rowIndex={index || 0}
                        value={currentValue}
                        isEditing={isCurrentlyEditing}
                        onStartEdit={() => setEditingCell({ itemId, columnKey, isEditing: true })}
                        onCommitEdit={(newValue) => handleCellEdit(item, columnKey, newValue)}
                        onCancelEdit={() => setEditingCell(null)}
                        availableValues={getAvailableValues?.(columnKey)}
                        hasChanges={item._hasChanges}
                        enableDragFill={enableDragFill}
                    />
                );
            }
        }));
    }, [columns, readOnlyColumns, enableInlineEditing, editingCell, pendingChanges, handleCellEdit, getAvailableValues, enableDragFill]);

    const onRenderRow = React.useCallback((props?: IDetailsRowProps) => {
        if (!props) return null;

        const customStyles: Partial<IDetailsRowStyles> = {
            root: {
                backgroundColor: props.item._hasChanges ? '#fff4ce' : undefined, // Light yellow for changed rows
            }
        };

        return <DetailsRow {...props} styles={customStyles} />;
    }, []);

    return (
        <DragFillManager onDragFill={handleDragFill}>
            <div className="editable-grid-container">
                {hasChanges && (
                    <MessageBar messageBarType={MessageBarType.info} isMultiline={false}>
                        You have unsaved changes. Click "Commit Changes" to save or "Cancel Changes" to discard.
                    </MessageBar>
                )}
                
                <CommandBar
                    items={commandBarItems}
                    styles={{
                        root: {
                            padding: 0,
                            backgroundColor: 'transparent',
                            borderBottom: hasChanges ? '1px solid #edebe9' : 'none'
                        }
                    }}
                />

                <DetailsList
                    {...detailsListProps}
                    items={itemsWithChanges}
                    columns={enhancedColumns}
                    onRenderRow={onRenderRow}
                    selectionMode={SelectionMode.none} // Disable selection to avoid conflicts with editing
                />
            </div>
        </DragFillManager>
    );
};

interface EditableGridCellProps {
    item: any;
    column: IColumn;
    rowIndex: number;
    value: any;
    isEditing: boolean;
    onStartEdit: () => void;
    onCommitEdit: (newValue: any) => void;
    onCancelEdit: () => void;
    availableValues?: string[];
    hasChanges: boolean;
    enableDragFill: boolean;
}

const EditableGridCell: React.FC<EditableGridCellProps> = ({
    item,
    column,
    rowIndex,
    value,
    isEditing,
    onStartEdit,
    onCommitEdit,
    onCancelEdit,
    availableValues,
    hasChanges,
    enableDragFill
}) => {
    const { updateDragFill } = useDragFill();
    const cellRef = React.useRef<HTMLDivElement>(null);

    const handleMouseEnter = React.useCallback(() => {
        updateDragFill(rowIndex, column.fieldName || column.key);
    }, [updateDragFill, rowIndex, column.fieldName, column.key]);

    return (
        <div
            ref={cellRef}
            className={`editable-grid-cell ${hasChanges ? 'has-changes' : ''} ${isEditing ? 'is-editing' : ''}`}
            onMouseEnter={handleMouseEnter}
        >
            <InlineEditor
                value={value}
                cellType={column.data?.cellType}
                column={column}
                rowIndex={rowIndex}
                columnKey={column.fieldName || column.key}
                availableValues={availableValues}
                isEditing={isEditing}
                onStartEdit={onStartEdit}
                onCommitEdit={onCommitEdit}
                onCancelEdit={onCancelEdit}
                className="inline-editor"
            />
            
            {enableDragFill && !isEditing && (
                <DragFillHandle
                    row={rowIndex}
                    column={column.fieldName || column.key}
                    value={value}
                    className="drag-fill-handle"
                />
            )}
        </div>
    );
};
