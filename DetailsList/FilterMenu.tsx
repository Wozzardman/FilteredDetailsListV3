import React from 'react';
import { Callout, Stack, Text, Checkbox, SearchBox, FocusTrapZone, DirectionalHint } from '@fluentui/react';
import { IFilterMenuProps, IColumnFilter } from './Filter.types';
import { FilterTypes, FilterOperators } from './ManifestConstants';

// Helper functions for filter type display
const getFilterTypeLabel = (filterType: FilterTypes): string => {
    switch (filterType) {
        case FilterTypes.Text:
            return 'TEXT';
        case FilterTypes.Number:
            return 'NUMBER';
        case FilterTypes.Date:
            return 'DATE';
        case FilterTypes.Boolean:
            return 'BOOLEAN';
        case FilterTypes.Choice:
            return 'CHOICE';
        default:
            return 'TEXT';
    }
};

export const FilterMenu: React.FC<IFilterMenuProps> = ({
    column,
    columnDisplayName,
    filterType,
    currentFilter,
    availableValues,
    onApplyFilter,
    onClose,
    target,
}) => {
    const [searchText, setSearchText] = React.useState('');
    const [selectedValues, setSelectedValues] = React.useState<Set<string | number>>(() => {
        // Initialize from current filter if it exists
        if (currentFilter?.conditions?.[0]?.operator === FilterOperators.In) {
            const values = currentFilter.conditions[0].value;
            if (Array.isArray(values)) {
                return new Set(values.map((v) => v.toString()));
            }
        }
        return new Set();
    });

    // Filter available values based on search text
    const filteredValues = React.useMemo(() => {
        if (!availableValues) return [];
        return availableValues.filter((item) => item.value.toString().toLowerCase().includes(searchText.toLowerCase()));
    }, [availableValues, searchText]);

    const handleApply = () => {
        if (selectedValues.size > 0) {
            // Create filter with selected values
            const filter: IColumnFilter = {
                columnName: column,
                filterType,
                conditions: [
                    {
                        field: column,
                        operator: FilterOperators.In,
                        value: Array.from(selectedValues),
                    },
                ],
                isActive: true,
            };
            onApplyFilter(filter);
        } else {
            // No values selected - clear filter
            onApplyFilter(null);
        }
        onClose();
    };

    const handleClear = () => {
        onApplyFilter(null);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    const handleSelectAll = (checked: boolean | undefined) => {
        const newSelected = new Set(selectedValues);
        if (checked) {
            filteredValues.forEach((v) => newSelected.add(v.value));
        } else {
            filteredValues.forEach((v) => newSelected.delete(v.value));
        }
        setSelectedValues(newSelected);
    };

    const handleValueChange = (value: string | number, checked: boolean | undefined) => {
        const newSelected = new Set(selectedValues);
        if (checked) {
            newSelected.add(value);
        } else {
            newSelected.delete(value);
        }
        setSelectedValues(newSelected);
    };

    const isSelectAllChecked = filteredValues.length > 0 && filteredValues.every((v) => selectedValues.has(v.value));
    const isSelectAllIndeterminate = filteredValues.some((v) => selectedValues.has(v.value)) && !isSelectAllChecked;

    return (
        <Callout
            target={target}
            onDismiss={onClose}
            directionalHint={DirectionalHint.bottomLeftEdge}
            isBeakVisible={false}
            setInitialFocus
            calloutMaxHeight={450}
            calloutMinWidth={400}
            calloutMaxWidth={450}
        >
            <FocusTrapZone>
                <div className="filter-menu-dialog">
                    {/* Enhanced Header with column name and filter type */}
                    <div className="filter-menu-header">
                        <h3>{columnDisplayName}</h3>
                        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                            <span className={`filter-type-badge ${filterType.toLowerCase()}`}>
                                {getFilterTypeLabel(filterType)}
                            </span>
                            {currentFilter && (
                                <Text variant="small" styles={{ root: { color: '#0078d4', fontWeight: 600 } }}>
                                    Filtered
                                </Text>
                            )}
                        </Stack>
                    </div>

                    {/* Content area with search and values */}
                    <div className="filter-menu-content">
                        {/* Search box */}
                        <div className="filter-menu-search-container">
                            <SearchBox
                                placeholder={`Search ${filteredValues.length} values...`}
                                value={searchText}
                                onChange={(_, newValue) => setSearchText(newValue || '')}
                                styles={{
                                    root: { width: '100%' },
                                    field: { fontSize: '14px' },
                                }}
                                iconProps={{ iconName: 'Filter' }}
                            />
                        </div>

                        {/* Values list with enhanced scrolling */}
                        <div className="filter-menu-values-list">
                            <div className="filter-menu-values-scroll">
                                <div className="filter-menu-values-inner">
                                    {/* Enhanced Select All checkbox */}
                                    <div className="filter-menu-sticky-header">
                                        <Checkbox
                                            label={`Select All (${filteredValues.length} items)`}
                                            checked={isSelectAllChecked}
                                            indeterminate={isSelectAllIndeterminate}
                                            onChange={(_, checked) => handleSelectAll(checked)}
                                            styles={{
                                                root: { fontWeight: 600 },
                                                label: { fontSize: '13px', color: '#323130' },
                                                text: { fontWeight: 600 },
                                            }}
                                        />
                                    </div>

                                    {/* Enhanced value checkboxes - Optimized layout to prevent horizontal scrolling */}
                                    {filteredValues.length > 0 ? (
                                        filteredValues.map((item, index) => (
                                            <div key={`${item.value}-${index}`} className="filter-menu-value-item">
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    width: '100%',
                                                    gap: '8px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <Checkbox
                                                        checked={selectedValues.has(item.value)}
                                                        onChange={(_, checked) =>
                                                            handleValueChange(item.value, checked)
                                                        }
                                                        styles={{
                                                            root: { 
                                                                flexShrink: 0,
                                                                marginRight: 0
                                                            },
                                                            checkbox: { 
                                                                width: '16px', 
                                                                height: '16px' 
                                                            }
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
                                                            marginRight: '8px'
                                                        }}
                                                    >
                                                        {item.value.toString()}
                                                    </Text>
                                                    <Text
                                                        variant="small"
                                                        style={{
                                                            color: '#605e5c',
                                                            backgroundColor: '#f3f2f1',
                                                            padding: '1px 4px',
                                                            borderRadius: '8px',
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                            minWidth: '20px',
                                                            maxWidth: '50px',
                                                            textAlign: 'center',
                                                            flexShrink: 0,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                    >
                                                        {item.count}
                                                    </Text>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="filter-menu-empty-state">
                                            <Text variant="small">
                                                {searchText ? 'No matching values found' : 'No values available'}
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Footer with action buttons */}
                    <div className="filter-menu-footer">
                        {/* Selection summary */}
                        <div className="filter-menu-footer-info">
                            {selectedValues.size > 0 ? (
                                <Text variant="small">
                                    {selectedValues.size} of {availableValues?.length || 0} values selected
                                </Text>
                            ) : (
                                <Text variant="small" styles={{ root: { color: '#d13438' } }}>
                                    No values selected - filter will be cleared
                                </Text>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="filter-menu-buttons">
                            <button className="filter-menu-button" onClick={handleClear} type="button">
                                Clear
                            </button>
                            <button className="filter-menu-button" onClick={handleCancel} type="button">
                                Cancel
                            </button>
                            <button className="filter-menu-button primary" onClick={handleApply} type="button">
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            </FocusTrapZone>
        </Callout>
    );
};
