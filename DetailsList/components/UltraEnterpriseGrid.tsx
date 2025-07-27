/**
 * Ultra Enterprise Grid - Final Integration Component
 * Meta/Google-competitive enterprise grid with all advanced features
 */

import * as React from 'react';
import { IColumn } from '@fluentui/react';
import { UltraVirtualizedGrid, useUltraVirtualization } from '../virtualization/UltraVirtualizationEngine';
import { EnterpriseChangeManager, IChangeRecord } from '../services/EnterpriseChangeManager';
import { useDragFill } from '../components/DragFillManager';
import '../css/UltraVirtualization.css';

export interface UltraEnterpriseGridProps {
    items: any[];
    columns: IColumn[];
    width?: number;
    height?: number;
    
    // Enterprise features
    enableVirtualization?: boolean;
    enableInlineEditing?: boolean;
    enableDragFill?: boolean;
    enableChangeManagement?: boolean;
    enablePerformanceMonitoring?: boolean;
    
    // Event handlers
    onSelectionChanged?: (selectedItems: any[]) => void;
    onItemInvoked?: (item: any) => void;
    onCellEdit?: (item: any, column: IColumn, newValue: any) => void;
    onChangesCommitted?: (changes: IChangeRecord[]) => void;
    onChangesCancelled?: () => void;
    
    // Power Apps integration
    commitTrigger?: boolean;
    cancelTrigger?: boolean;
    onPendingChangesUpdate?: (pendingChanges: string, hasChanges: boolean, changeCount: number) => void;
}

export const UltraEnterpriseGrid: React.FC<UltraEnterpriseGridProps> = ({
    items,
    columns,
    width = 800,
    height = 600,
    enableVirtualization = true,
    enableInlineEditing = true,
    enableDragFill = true,
    enableChangeManagement = true,
    enablePerformanceMonitoring = false,
    onSelectionChanged,
    onItemInvoked,
    onCellEdit,
    onChangesCommitted,
    onChangesCancelled,
    commitTrigger = false,
    cancelTrigger = false,
    onPendingChangesUpdate,
}) => {
    const [selectedIndices, setSelectedIndices] = React.useState<Set<number>>(new Set());
    const [changeManager] = React.useState(() => new EnterpriseChangeManager());
    
    // Ultra virtualization hook
    const {
        performanceMetrics,
        isOptimized,
        shouldVirtualize,
        recommendedConfig,
        onPerformanceUpdate
    } = useUltraVirtualization(items, {
        itemHeight: 40,
        overscan: 10,
        enableMemoryPooling: true,
        enablePrefetching: true,
        enableAdaptiveRendering: true,
    });

    // Drag fill hook
    const {
        isDragging,
        dragStart,
        dragEnd,
        startDragFill,
        updateDragFill,
        endDragFill,
    } = useDragFill();

    const handleDragFillComplete = (startCell: any, endCell: any, fillData: any) => {
        // Apply drag fill changes through change manager
        fillData.forEach(({ rowIndex, columnKey, value }: { rowIndex: number; columnKey: string; value: any }) => {
            const item = items[rowIndex];
            if (item && changeManager) {
                changeManager.addChange(
                    item.key || item.id || rowIndex.toString(),
                    columnKey,
                    item[columnKey],
                    value
                );
            }
        });
    };

    // Handle commit/cancel triggers from Power Apps
    React.useEffect(() => {
        if (commitTrigger && changeManager) {
            const handleCommit = async () => {
                try {
                    const changes = changeManager.getPendingChanges();
                    await changeManager.commitAllChanges();
                    onChangesCommitted?.(changes);
                } catch (error) {
                    console.error('Error committing changes:', error);
                }
            };
            handleCommit();
        }
    }, [commitTrigger, changeManager, onChangesCommitted]);

    React.useEffect(() => {
        if (cancelTrigger && changeManager) {
            changeManager.cancelAllChanges();
            onChangesCancelled?.();
        }
    }, [cancelTrigger, changeManager, onChangesCancelled]);

    // Update pending changes for Power Apps
    React.useEffect(() => {
        if (changeManager && onPendingChangesUpdate) {
            const changes = changeManager.getPendingChanges();
            const serializedChanges = changeManager.getChangesSerialized();
            onPendingChangesUpdate(
                serializedChanges,
                changes.length > 0,
                changes.length
            );
        }
    }, [changeManager, onPendingChangesUpdate]);

    // Selection handling
    const handleSelectionChange = React.useCallback((newSelectedIndices: Set<number>) => {
        setSelectedIndices(newSelectedIndices);
        const selectedItems = Array.from(newSelectedIndices).map(index => items[index]);
        onSelectionChanged?.(selectedItems);
    }, [items, onSelectionChanged]);

    // Row click handling
    const handleRowClick = React.useCallback((item: any, index: number) => {
        // Toggle selection
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        handleSelectionChange(newSelection);
    }, [selectedIndices, handleSelectionChange]);

    // Row double click handling
    const handleRowDoubleClick = React.useCallback((item: any, index: number) => {
        onItemInvoked?.(item);
    }, [onItemInvoked]);

    // Cell edit handling
    const handleCellEdit = React.useCallback((item: any, column: IColumn, newValue: any) => {
        if (enableChangeManagement && changeManager) {
            // Add change to change manager
            changeManager.addChange(
                item.key || item.id || item.toString(),
                column.key,
                item[column.fieldName || column.key],
                newValue
            );
        } else {
            // Direct edit without change management
            onCellEdit?.(item, column, newValue);
        }
    }, [enableChangeManagement, changeManager, onCellEdit]);

    // Render appropriate grid based on configuration
    if (enableVirtualization && shouldVirtualize) {
        return (
            <UltraVirtualizedGrid
                items={items}
                columns={columns}
                width={width}
                height={height}
                config={recommendedConfig}
                selectedIndices={selectedIndices}
                onSelectionChange={handleSelectionChange}
                onRowClick={handleRowClick}
                onRowDoubleClick={handleRowDoubleClick}
                onCellEdit={enableInlineEditing ? handleCellEdit : undefined}
                changeManager={enableChangeManagement ? changeManager : undefined}
                enableInlineEditing={enableInlineEditing}
                enableDragFill={enableDragFill}
                onPerformanceUpdate={enablePerformanceMonitoring ? onPerformanceUpdate : undefined}
                enablePerformanceMonitoring={enablePerformanceMonitoring}
            />
        );
    }

    // Fallback to standard DetailsList for smaller datasets
    return (
        <div 
            className="ultra-enterprise-grid-fallback" 
            data-width={width} 
            data-height={height}
        >
            <div className="fallback-message">
                Using standard grid for {items.length} items
                {!shouldVirtualize && ' (virtualization not needed)'}
            </div>
            {/* Standard DetailsList implementation would go here */}
        </div>
    );
};

export default UltraEnterpriseGrid;
