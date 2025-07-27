import * as React from 'react';
import { 
    DetailsList, 
    IColumn, 
    SelectionMode, 
    DetailsListLayoutMode, 
    ConstrainMode,
    CheckboxVisibility,
    IDetailsListProps
} from '@fluentui/react/lib/DetailsList';
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { InlineEditor } from './InlineEditor';
import { DragFillManager } from './DragFillManager';
import { EnterpriseChangeManager } from '../services/EnterpriseChangeManager';

export interface EditChange {
    itemId: string;
    columnKey: string;
    newValue: any;
    oldValue?: any;
}

export interface EditableGridProps extends Partial<IDetailsListProps> {
    items: any[];
    columns: IColumn[];
    onCellEdit?: (itemId: string, columnKey: string, newValue: any) => void;
    onCommitChanges?: (changes: EditChange[]) => Promise<void>;
    enableInlineEditing?: boolean;
    enableDragFill?: boolean;
    readOnlyColumns?: string[];
    getAvailableValues?: (columnKey: string) => string[];
    changeManager?: EnterpriseChangeManager;
    enablePerformanceMonitoring?: boolean;
}

interface EditingState {
    itemId: string;
    columnKey: string;
    originalValue: any;
}

export const EditableGrid: React.FC<EditableGridProps> = ({
    items,
    columns,
    onCellEdit,
    onCommitChanges,
    enableInlineEditing = true,
    enableDragFill = false,
    readOnlyColumns = [],
    getAvailableValues,
    changeManager,
    enablePerformanceMonitoring = false,
    selectionMode = SelectionMode.none,
    checkboxVisibility = CheckboxVisibility.hidden,
    layoutMode = DetailsListLayoutMode.fixedColumns,
    constrainMode = ConstrainMode.unconstrained,
    ...otherProps
}) => {
    const [editingState, setEditingState] = React.useState<EditingState | null>(null);
    const [pendingChanges, setPendingChanges] = React.useState<Map<string, EditChange>>(new Map());
    const [isCommitting, setIsCommitting] = React.useState<boolean>(false);
    const [errorMessage, setErrorMessage] = React.useState<string>('');

    const startMeasurement = enablePerformanceMonitoring ? 
        () => console.time('EditableGrid-Render') : 
        () => {};
    const endMeasurement = enablePerformanceMonitoring ? 
        () => console.timeEnd('EditableGrid-Render') : 
        () => {};

    React.useEffect(() => {
        startMeasurement();
        return () => endMeasurement();
    });

    const getCellKey = (itemId: string, columnKey: string) => `${itemId}-${columnKey}`;

    const startEdit = React.useCallback((item: any, column: IColumn) => {
        if (!enableInlineEditing) return;
        
        const itemId = item.key || item.id || item.getRecordId?.();
        const columnKey = column.fieldName || column.key;
        
        if (readOnlyColumns.includes(columnKey)) return;

        const originalValue = item[columnKey];
        setEditingState({ itemId, columnKey, originalValue });
    }, [enableInlineEditing, readOnlyColumns]);

    const commitEdit = React.useCallback((newValue: any) => {
        if (!editingState) return;

        const { itemId, columnKey, originalValue } = editingState;
        
        if (newValue !== originalValue) {
            const changeKey = getCellKey(itemId, columnKey);
            const change: EditChange = {
                itemId,
                columnKey,
                newValue,
                oldValue: originalValue
            };

            setPendingChanges(prev => new Map(prev.set(changeKey, change)));
            
            // Notify parent of the edit
            onCellEdit?.(itemId, columnKey, newValue);
            
            // Update change manager if available
            if (changeManager) {
                changeManager.addChange(itemId, columnKey, originalValue, newValue);
            }
        }

        setEditingState(null);
    }, [editingState, onCellEdit, changeManager]);

    const cancelEdit = React.useCallback(() => {
        setEditingState(null);
    }, []);

    const commitAllChanges = React.useCallback(async () => {
        if (pendingChanges.size === 0 || !onCommitChanges) return;

        setIsCommitting(true);
        setErrorMessage('');

        try {
            const changesArray = Array.from(pendingChanges.values());
            await onCommitChanges(changesArray);
            setPendingChanges(new Map());
            
            if (changeManager) {
                await changeManager.commitAllChanges();
            }
        } catch (error) {
            setErrorMessage(`Failed to save changes: ${error}`);
        } finally {
            setIsCommitting(false);
        }
    }, [pendingChanges, onCommitChanges, changeManager]);

    const cancelAllChanges = React.useCallback(() => {
        setPendingChanges(new Map());
        setEditingState(null);
        
        if (changeManager) {
            changeManager.cancelAllChanges();
        }
    }, [changeManager]);

    const handleDragFill = React.useCallback((
        startCell: { row: number; column: string },
        endCell: { row: number; column: string },
        value: any,
        fillType: 'copy' | 'series' | 'pattern'
    ) => {
        const startRow = Math.min(startCell.row, endCell.row);
        const endRow = Math.max(startCell.row, endCell.row);
        
        for (let row = startRow; row <= endRow; row++) {
            if (row < items.length) {
                const item = items[row];
                const itemId = item.key || item.id || item.getRecordId?.();
                
                if (itemId) {
                    let fillValue = value;
                    
                    if (fillType === 'series' && typeof value === 'number') {
                        fillValue = value + (row - startCell.row);
                    }
                    
                    commitEdit(fillValue);
                }
            }
        }
    }, [items, commitEdit]);

    const enhancedColumns = React.useMemo(() => {
        return columns.map(column => ({
            ...column,
            onRender: (item: any, index?: number) => {
                const itemId = item.key || item.id || item.getRecordId?.();
                const columnKey = column.fieldName || column.key;
                const cellKey = getCellKey(itemId, columnKey);
                const isEditing = editingState?.itemId === itemId && editingState?.columnKey === columnKey;
                const hasChanges = pendingChanges.has(cellKey);
                const isReadOnly = readOnlyColumns.includes(columnKey);
                
                const cellValue = pendingChanges.get(cellKey)?.newValue ?? item[columnKey];
                const dataType = column.data?.dataType || 'string';
                const availableValues = getAvailableValues?.(columnKey) || [];

                const cellClassName = `editable-grid-cell ${hasChanges ? 'has-changes' : ''} ${isEditing ? 'is-editing' : ''} ${isReadOnly ? 'read-only' : ''}`;

                if (isEditing && enableInlineEditing) {
                    return (
                        <div className={cellClassName}>
                            <InlineEditor
                                value={editingState.originalValue}
                                column={column}
                                dataType={dataType}
                                availableValues={availableValues}
                                isReadOnly={isReadOnly}
                                onCommit={commitEdit}
                                onCancel={cancelEdit}
                                className="inline-editor"
                            />
                        </div>
                    );
                }

                return (
                    <div 
                        className={cellClassName}
                        onClick={() => !isReadOnly && startEdit(item, column)}
                        title={hasChanges ? `Changed from: ${pendingChanges.get(cellKey)?.oldValue}` : ''}
                    >
                        {column.onRender ? 
                            column.onRender(item, index, column) : 
                            String(cellValue || '')
                        }
                        {!isReadOnly && enableDragFill && (
                            <div 
                                className="drag-fill-handle"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    // Handle drag fill start
                                }}
                            />
                        )}
                    </div>
                );
            }
        }));
    }, [columns, editingState, pendingChanges, readOnlyColumns, enableInlineEditing, enableDragFill, startEdit, commitEdit, cancelEdit, getAvailableValues]);

    const commandBarItems: ICommandBarItemProps[] = React.useMemo(() => {
        const items: ICommandBarItemProps[] = [];

        if (pendingChanges.size > 0) {
            items.push(
                {
                    key: 'save',
                    text: `Save Changes (${pendingChanges.size})`,
                    iconProps: { iconName: 'CheckMark' },
                    onClick: () => { commitAllChanges(); },
                    disabled: isCommitting,
                },
                {
                    key: 'cancel',
                    text: 'Cancel Changes',
                    iconProps: { iconName: 'Cancel' },
                    onClick: cancelAllChanges,
                    disabled: isCommitting,
                }
            );
        }

        return items;
    }, [pendingChanges.size, commitAllChanges, cancelAllChanges, isCommitting]);

    const gridContent = (
        <DetailsList
            items={items}
            columns={enhancedColumns}
            selectionMode={selectionMode}
            checkboxVisibility={checkboxVisibility}
            layoutMode={layoutMode}
            constrainMode={constrainMode}
            isHeaderVisible={true}
            compact={false}
            {...otherProps}
        />
    );

    return (
        <div className="editable-grid-container">
            {pendingChanges.size > 0 && (
                <CommandBar
                    items={commandBarItems}
                    className="editable-grid-command-bar"
                />
            )}
            
            {errorMessage && (
                <MessageBar 
                    messageBarType={MessageBarType.error}
                    onDismiss={() => setErrorMessage('')}
                >
                    {errorMessage}
                </MessageBar>
            )}
            
            {isCommitting && (
                <MessageBar messageBarType={MessageBarType.info}>
                    <Spinner size={SpinnerSize.small} style={{ marginRight: '8px' }} />
                    Saving changes...
                </MessageBar>
            )}

            {enableDragFill ? (
                <DragFillManager onDragFill={handleDragFill}>
                    {gridContent}
                </DragFillManager>
            ) : (
                gridContent
            )}
        </div>
    );
};

export default EditableGrid;
