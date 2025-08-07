/**
 * ExcelLikeColumnFilter - Virtualized Excel-style column filter
 * - Data type aware sorting
 * - Distinct values with counts
 * - Cascading filter updates
 * - Virtualized for thousands of values with zero load time
 */

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
    Callout, 
    DirectionalHint, 
    IconButton, 
    SearchBox, 
    Checkbox, 
    Text,
    Stack,
    Separator,
    DefaultButton,
    PrimaryButton
} from '@fluentui/react';

// Helper function for PCF EntityRecord compatibility
const getPCFValue = (item: any, columnKey: string): any => {
    if (item && typeof item.getValue === 'function') {
        try {
            return item.getValue(columnKey);
        } catch (e) {
            return null;
        }
    }
    return item[columnKey];
};

export interface IDistinctValue {
    value: any;
    displayValue: string;
    count: number;
    selected: boolean;
}

export interface IExcelLikeColumnFilterProps {
    columnKey: string;
    columnName: string;
    dataType: 'text' | 'number' | 'date' | 'boolean' | 'choice';
    allData: any[];
    filteredData: any[];
    currentFilters: Record<string, any>;
    onFilterChange: (columnKey: string, selectedValues: any[]) => void;
    target: HTMLElement | null;
    onDismiss: () => void;
    isOpen: boolean;
    getAvailableValues?: (columnKey: string) => Array<{value: any, displayValue: string, count: number}>;
}

export const ExcelLikeColumnFilter: React.FC<IExcelLikeColumnFilterProps> = ({
    columnKey,
    columnName,
    dataType,
    allData,
    filteredData,
    currentFilters,
    onFilterChange,
    target,
    onDismiss,
    isOpen,
    getAvailableValues
}) => {
    const [searchTerm, setSearchTerm] = React.useState<string>('');
    const [selectAll, setSelectAll] = React.useState<boolean>(true);
    const [distinctValues, setDistinctValues] = React.useState<IDistinctValue[]>([]);
    const [filteredDistinctValues, setFilteredDistinctValues] = React.useState<IDistinctValue[]>([]);

    // Refs for virtualization
    const listRef = React.useRef<HTMLDivElement>(null);

    // Calculate distinct values with counts - OPTIMIZED with getAvailableValues
    React.useEffect(() => {
        if (!isOpen) return;

        let values: IDistinctValue[];
        
        if (getAvailableValues) {
            // Use the optimized getAvailableValues function for better performance
            const availableValues = getAvailableValues(columnKey);
            const currentColumnFilter = currentFilters[columnKey];
            
            values = availableValues.map(item => ({
                value: item.value,
                displayValue: item.displayValue,
                count: item.count, // Use the actual count from the optimized function
                selected: currentColumnFilter 
                    ? Array.isArray(currentColumnFilter) 
                        ? currentColumnFilter.includes(item.value)
                        : currentColumnFilter === item.value
                    : true
            }));
            
            // Sort based on data type
            values.sort((a, b) => sortByDataType(a.value, b.value, dataType));
        } else {
            // Fallback to original calculation if getAvailableValues not provided
            const otherFilters = { ...currentFilters };
            delete otherFilters[columnKey];
            
            const cascadedData = filterDataByOtherColumns(allData, otherFilters);
            const currentColumnFilter = currentFilters[columnKey];

            // Calculate distinct values from cascaded data
            const valueMap = new Map<any, { count: number; selected: boolean }>();
            let blankCount = 0;
            
            cascadedData.forEach(item => {
                const value = getPCFValue(item, columnKey);
                
                // Check if value is blank/empty
                if (value == null || value === '' || value === undefined) {
                    blankCount++;
                    return;
                }
                
                const normalizedValue = normalizeValue(value, dataType);
                
                if (valueMap.has(normalizedValue)) {
                    valueMap.get(normalizedValue)!.count++;
                } else {
                    const isSelected = currentColumnFilter 
                        ? Array.isArray(currentColumnFilter) 
                            ? currentColumnFilter.includes(normalizedValue)
                            : currentColumnFilter === normalizedValue
                        : true;
                    
                    valueMap.set(normalizedValue, { count: 1, selected: isSelected });
                }
            });

            // Convert to array and sort by data type
            values = Array.from(valueMap.entries()).map(([value, info]) => ({
                value,
                displayValue: formatDisplayValue(value, dataType),
                count: info.count,
                selected: info.selected
            }));
            
            // Add "(Blanks)" option if there are blank values
            if (blankCount > 0) {
                const isBlankSelected = currentColumnFilter 
                    ? Array.isArray(currentColumnFilter) 
                        ? currentColumnFilter.includes('(Blanks)')
                        : currentColumnFilter === '(Blanks)'
                    : true;
                    
                values.unshift({
                    value: '(Blanks)',
                    displayValue: '(Blanks)',
                    count: blankCount,
                    selected: isBlankSelected
                });
            }

            // Sort based on data type (but keep blanks at the top)
            const blanksEntry = values.find(v => v.value === '(Blanks)');
            const nonBlanksEntries = values.filter(v => v.value !== '(Blanks)');
            nonBlanksEntries.sort((a, b) => sortByDataType(a.value, b.value, dataType));
            
            values = blanksEntry ? [blanksEntry, ...nonBlanksEntries] : nonBlanksEntries;
        }

        setDistinctValues(values);
        setSelectAll(values.every(v => v.selected));
    }, [allData, currentFilters, columnKey, dataType, isOpen, getAvailableValues]);

    // Filter distinct values by search term
    React.useEffect(() => {
        if (!searchTerm) {
            setFilteredDistinctValues(distinctValues);
        } else {
            const filtered = distinctValues.filter(v => 
                v.displayValue.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredDistinctValues(filtered);
        }
    }, [distinctValues, searchTerm]);

    // Update Select All checkbox state when filtered values change
    React.useEffect(() => {
        if (searchTerm && filteredDistinctValues.length > 0) {
            // When searching, check if all filtered values are selected
            const allFilteredSelected = filteredDistinctValues.every(v => v.selected);
            setSelectAll(allFilteredSelected);
        } else if (!searchTerm) {
            // When not searching, check if all values are selected
            const allSelected = distinctValues.every(v => v.selected);
            setSelectAll(allSelected);
        }
    }, [filteredDistinctValues, distinctValues, searchTerm]);

    // Virtualized list for thousands of distinct values
    const virtualizer = useVirtualizer({
        count: filteredDistinctValues.length,
        getScrollElement: () => listRef.current,
        estimateSize: () => 32,
        overscan: 5
    });

    // Handle individual value toggle
    const handleValueToggle = React.useCallback((value: any, checked: boolean) => {
        const newValues = distinctValues.map(v => 
            v.value === value ? { ...v, selected: checked } : v
        );
        setDistinctValues(newValues);
        
        // Update selectAll state based on current filtered values
        if (searchTerm) {
            const filteredSelectedStates = filteredDistinctValues.map(fv => 
                newValues.find(v => v.value === fv.value)?.selected || false
            );
            setSelectAll(filteredSelectedStates.every(selected => selected));
        } else {
            const allSelected = newValues.every(v => v.selected);
            const noneSelected = newValues.every(v => !v.selected);
            setSelectAll(allSelected ? true : noneSelected ? false : false);
        }
    }, [distinctValues, filteredDistinctValues, searchTerm]);

    // Handle select all toggle
    const handleSelectAll = React.useCallback((checked: boolean) => {
        if (searchTerm) {
            // When searching, only apply to filtered values
            const filteredValueSet = new Set(filteredDistinctValues.map(v => v.value));
            const newValues = distinctValues.map(v => 
                filteredValueSet.has(v.value) ? { ...v, selected: checked } : v
            );
            setDistinctValues(newValues);
        } else {
            // When not searching, apply to all values
            const newValues = distinctValues.map(v => ({ ...v, selected: checked }));
            setDistinctValues(newValues);
        }
        setSelectAll(checked);
    }, [distinctValues, filteredDistinctValues, searchTerm]);

    // Apply filter
    const handleApplyFilter = React.useCallback(() => {
        const selectedValues = distinctValues.filter(v => v.selected).map(v => v.value);
        onFilterChange(columnKey, selectedValues);
        onDismiss();
    }, [distinctValues, columnKey, onFilterChange, onDismiss]);

    // Clear filter
    const handleClearFilter = React.useCallback(() => {
        onFilterChange(columnKey, []);
        onDismiss();
    }, [columnKey, onFilterChange, onDismiss]);

    if (!isOpen || !target) return null;

    return (
        <Callout
            target={target}
            onDismiss={onDismiss}
            directionalHint={DirectionalHint.bottomLeftEdge}
            isBeakVisible={false}
            className="excel-column-filter-callout"
            styles={{
                root: { width: 300, maxHeight: 400 },
                calloutMain: { padding: 0 }
            }}
        >
            <Stack className="excel-filter-container">
                {/* Header */}
                <Stack 
                    horizontal 
                    horizontalAlign="space-between" 
                    verticalAlign="center"
                    className="excel-filter-header"
                >
                    <Text variant="mediumPlus" style={{ fontWeight: 600 }}>
                        Filter: {columnName}
                    </Text>
                    <IconButton
                        iconProps={{ iconName: 'Clear' }}
                        onClick={onDismiss}
                        title="Close filter"
                    />
                </Stack>

                <Separator />

                {/* Search */}
                <div className="excel-filter-search">
                    <SearchBox
                        placeholder={`Search ${columnName.toLowerCase()}...`}
                        value={searchTerm}
                        onChange={(_, value) => setSearchTerm(value || '')}
                        styles={{ root: { margin: '8px 12px' } }}
                    />
                </div>

                {/* Select All */}
                <div className="excel-filter-select-all">
                    <Checkbox
                        label={`(Select All) - ${filteredDistinctValues.length} items`}
                        checked={selectAll}
                        indeterminate={!selectAll && filteredDistinctValues.some(v => v.selected)}
                        onChange={(_, checked) => handleSelectAll(checked || false)}
                        styles={{ root: { margin: '4px 12px' } }}
                    />
                </div>

                <Separator />

                {/* Virtualized Value List */}
                <div 
                    ref={listRef}
                    className="excel-filter-values"
                    style={{ height: 200, overflow: 'auto' }}
                >
                    <div
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative'
                        }}
                    >
                        {virtualizer.getVirtualItems().map(virtualItem => {
                            const item = filteredDistinctValues[virtualItem.index];
                            return (
                                <div
                                    key={`filter-item-${virtualItem.index}`}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualItem.size}px`,
                                        transform: `translateY(${virtualItem.start}px)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0 12px',
                                        gap: '8px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <Checkbox
                                        checked={item.selected}
                                        onChange={(_, checked) => handleValueToggle(item.value, checked || false)}
                                        styles={{ 
                                            root: { 
                                                marginRight: 0,
                                                flexShrink: 0
                                            },
                                            checkbox: { width: 16, height: 16 }
                                        }}
                                    />
                                    <Text style={{ 
                                        flex: 1, 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontSize: '12px',
                                        marginRight: '4px'
                                    }}>
                                        {item.displayValue || '(Blank)'}
                                    </Text>
                                    <Text 
                                        variant="small" 
                                        style={{ 
                                            color: '#666', 
                                            backgroundColor: '#f3f2f1',
                                            padding: '1px 4px',
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            minWidth: '20px',
                                            maxWidth: '50px',
                                            textAlign: 'center',
                                            flexShrink: 0,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                    >
                                        {item.count.toString()}
                                    </Text>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <Separator />

                {/* Actions */}
                <Stack horizontal tokens={{ childrenGap: 8 }} className="excel-filter-actions">
                    <PrimaryButton
                        text="Apply"
                        onClick={handleApplyFilter}
                        style={{ flex: 1 }}
                    />
                    <DefaultButton
                        text="Clear"
                        onClick={handleClearFilter}
                        style={{ flex: 1 }}
                    />
                </Stack>
            </Stack>
        </Callout>
    );
};

// Helper Functions

function normalizeValue(value: any, dataType: string): any {
    if (value === null || value === undefined) return null;
    
    switch (dataType) {
        case 'number':
            return Number(value);
        case 'date':
            return new Date(value);
        case 'boolean':
            return Boolean(value);
        case 'text':
        case 'choice':
        default:
            return String(value);
    }
}

function formatDisplayValue(value: any, dataType: string): string {
    if (value === null || value === undefined) return '';
    
    switch (dataType) {
        case 'date':
            return value instanceof Date ? value.toLocaleDateString() : String(value);
        case 'number':
            return Number(value).toLocaleString();
        case 'boolean':
            return value ? 'Yes' : 'No';
        default:
            return String(value);
    }
}

function sortByDataType(a: any, b: any, dataType: string): number {
    // Handle nulls
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    
    switch (dataType) {
        case 'number':
            return Number(a) - Number(b);
        case 'date':
            return new Date(a).getTime() - new Date(b).getTime();
        case 'boolean':
            return Number(b) - Number(a); // True first
        case 'text':
        case 'choice':
        default:
            return String(a).localeCompare(String(b));
    }
}

function filterDataByOtherColumns(data: any[], filters: Record<string, any>): any[] {
    return data.filter(item => {
        return Object.entries(filters).every(([column, filterValues]) => {
            if (!filterValues || (Array.isArray(filterValues) && filterValues.length === 0)) {
                return true;
            }
            
            const value = getPCFValue(item, column);
            return Array.isArray(filterValues) 
                ? filterValues.includes(value)
                : filterValues === value;
        });
    });
}

export default ExcelLikeColumnFilter;
