/**
 * VirtualizedFilterDropdown - Ultra-fast Excel-like filtering
 * Handles thousands of unique values with zero load time using virtualization
 */

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
    Callout, 
    SearchBox, 
    Checkbox, 
    DefaultButton, 
    PrimaryButton,
    Stack,
    Text,
    DirectionalHint,
    FocusTrapZone
} from '@fluentui/react';

export interface FilterValue {
    value: any;
    displayText: string;
    count: number;
}

export interface VirtualizedFilterDropdownProps {
    isOpen: boolean;
    target: HTMLElement | null;
    columnKey: string;
    columnName: string;
    allValues: FilterValue[];
    selectedValues: Set<any>;
    onSelectionChange: (selectedValues: Set<any>) => void;
    onApply: () => void;
    onClose: () => void;
    maxHeight?: number;
}

export const VirtualizedFilterDropdown: React.FC<VirtualizedFilterDropdownProps> = ({
    isOpen,
    target,
    columnKey,
    columnName,
    allValues,
    selectedValues,
    onSelectionChange,
    onApply,
    onClose,
    maxHeight = 400
}) => {
    const [searchText, setSearchText] = React.useState('');
    const parentRef = React.useRef<HTMLDivElement>(null);

    // Filter values based on search text
    const filteredValues = React.useMemo(() => {
        if (!searchText.trim()) return allValues;
        const search = searchText.toLowerCase();
        return allValues.filter(item => 
            item.displayText.toLowerCase().includes(search)
        );
    }, [allValues, searchText]);

    // VIRTUALIZED LIST - Handles thousands of filter values instantly
    const virtualizer = useVirtualizer({
        count: filteredValues.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 32, // Height of each filter item
        overscan: 5,
    });

    // Toggle individual value
    const toggleValue = React.useCallback((value: any) => {
        const newSelection = new Set(selectedValues);
        if (newSelection.has(value)) {
            newSelection.delete(value);
        } else {
            newSelection.add(value);
        }
        onSelectionChange(newSelection);
    }, [selectedValues, onSelectionChange]);

    // Select all filtered values
    const selectAll = React.useCallback(() => {
        const newSelection = new Set(selectedValues);
        filteredValues.forEach(item => newSelection.add(item.value));
        onSelectionChange(newSelection);
    }, [filteredValues, selectedValues, onSelectionChange]);

    // Clear all selections
    const clearAll = React.useCallback(() => {
        onSelectionChange(new Set());
    }, [onSelectionChange]);

    // Render virtual filter item
    const renderFilterItem = (virtualRow: any) => {
        const item = filteredValues[virtualRow.index];
        const isSelected = selectedValues.has(item.value);
        
        return (
            <div
                key={virtualRow.key}
                className="filter-item"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    cursor: 'pointer',
                    background: isSelected ? '#e3f2fd' : 'transparent',
                    gap: '6px',
                    overflow: 'hidden'
                }}
                onClick={() => toggleValue(item.value)}
            >
                <Checkbox
                    checked={isSelected}
                    onChange={() => toggleValue(item.value)}
                    styles={{
                        root: { 
                            marginRight: 0,
                            flexShrink: 0
                        },
                        checkbox: { width: 16, height: 16 }
                    }}
                />
                <Text 
                    variant="small" 
                    style={{ 
                        flex: 1, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '12px',
                        marginRight: '4px'
                    }}
                >
                    {item.displayText}
                </Text>
                <Text 
                    variant="tiny" 
                    style={{ 
                        color: '#666', 
                        minWidth: '20px',
                        maxWidth: '50px',
                        textAlign: 'center',
                        fontSize: '10px',
                        backgroundColor: '#f3f2f1',
                        padding: '1px 4px',
                        borderRadius: '6px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {item.count}
                </Text>
            </div>
        );
    };

    if (!isOpen || !target) return null;

    return (
        <Callout
            target={target}
            onDismiss={onClose}
            directionalHint={DirectionalHint.bottomLeftEdge}
            isBeakVisible={false}
            styles={{
                root: { zIndex: 9999 },
                calloutMain: { 
                    minWidth: 400, 
                    maxWidth: 450,
                    maxHeight: maxHeight + 120,
                    border: '1px solid #e1e5e9',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }
            }}
        >
            <FocusTrapZone>
                <div className="virtualized-filter-dropdown">
                    {/* Header */}
                    <div className="filter-header" style={{ 
                        padding: 12, 
                        borderBottom: '1px solid #e1e5e9',
                        background: '#f8f9fa'
                    }}>
                        <Text variant="medium" style={{ fontWeight: 600 }}>
                            Filter by {columnName}
                        </Text>
                        <Text variant="small" style={{ color: '#666', marginTop: 4 }}>
                            {filteredValues.length} of {allValues.length} items
                        </Text>
                    </div>

                    {/* Search */}
                    <div style={{ padding: 12, borderBottom: '1px solid #e1e5e9' }}>
                        <SearchBox
                            placeholder="Search values..."
                            value={searchText}
                            onChange={(_, value) => setSearchText(value || '')}
                            styles={{ root: { fontSize: 14 } }}
                        />
                    </div>

                    {/* Select All / Clear All */}
                    <div style={{ 
                        padding: '8px 12px', 
                        borderBottom: '1px solid #e1e5e9',
                        background: '#fafbfc'
                    }}>
                        <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center">
                            <Checkbox
                                label="Select All"
                                checked={selectedValues.size === filteredValues.length && filteredValues.length > 0}
                                indeterminate={selectedValues.size > 0 && selectedValues.size < filteredValues.length}
                                onChange={selectAll}
                                styles={{
                                    root: { flex: 1 },
                                    label: { fontSize: 14, fontWeight: 500 }
                                }}
                            />
                            <DefaultButton 
                                text="Clear All" 
                                onClick={clearAll}
                                styles={{ root: { minWidth: 80, height: 28 } }}
                            />
                        </Stack>
                    </div>

                    {/* VIRTUALIZED FILTER VALUES - Ultra-fast for thousands of items */}
                    <div
                        ref={parentRef}
                        className="filter-values-container"
                        style={{
                            height: Math.min(maxHeight, filteredValues.length * 32),
                            overflow: 'auto',
                            position: 'relative'
                        }}
                    >
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map(renderFilterItem)}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ 
                        padding: 12, 
                        borderTop: '1px solid #e1e5e9',
                        background: '#f8f9fa'
                    }}>
                        <Stack horizontal tokens={{ childrenGap: 8 }}>
                            <PrimaryButton
                                text="Apply Filter"
                                onClick={onApply}
                                styles={{ root: { flex: 1 } }}
                            />
                            <DefaultButton
                                text="Cancel"
                                onClick={onClose}
                                styles={{ root: { minWidth: 80 } }}
                            />
                        </Stack>
                    </div>
                </div>
            </FocusTrapZone>
        </Callout>
    );
};

export default VirtualizedFilterDropdown;
