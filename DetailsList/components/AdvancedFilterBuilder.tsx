import React, { useState, useCallback, useMemo } from 'react';
import {
    Panel,
    PanelType,
    PrimaryButton,
    DefaultButton,
    Dropdown,
    TextField,
    DatePicker,
    Checkbox,
    Stack,
    Text,
    IconButton,
    Separator,
    ComboBox,
    IComboBoxOption,
    MessageBar,
    MessageBarType,
    Toggle,
    SpinButton,
    DetailsList,
    IColumn,
    SelectionMode,
} from '@fluentui/react';
import { IAdvancedFilter, IFilterGroup, IFilterCondition, FilterOperator, DataType } from '../types/Advanced.types';
import { useFilterPresets } from '../hooks/AdvancedHooks';

interface IAdvancedFilterBuilderProps {
    isOpen: boolean;
    onDismiss: () => void;
    onApply: (filter: IAdvancedFilter) => void;
    columns: any[];
    existingFilter?: IAdvancedFilter;
}

export const AdvancedFilterBuilder: React.FC<IAdvancedFilterBuilderProps> = ({
    isOpen,
    onDismiss,
    onApply,
    columns,
    existingFilter,
}) => {
    const [filter, setFilter] = useState<IAdvancedFilter>(
        existingFilter || {
            id: '',
            conditions: [],
            logicalOperator: 'AND',
            groups: [],
            name: '',
            description: '',
        },
    );

    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const { presets, savePreset, loadPreset } = useFilterPresets();

    const operatorOptions = useMemo(() => {
        const baseOperators: { key: FilterOperator; text: string }[] = [
            { key: 'equals', text: 'Equals' },
            { key: 'notEquals', text: 'Not Equals' },
            { key: 'contains', text: 'Contains' },
            { key: 'notContains', text: 'Does Not Contain' },
            { key: 'startsWith', text: 'Starts With' },
            { key: 'endsWith', text: 'Ends With' },
            { key: 'greaterThan', text: 'Greater Than' },
            { key: 'greaterThanOrEqual', text: 'Greater Than or Equal' },
            { key: 'lessThan', text: 'Less Than' },
            { key: 'lessThanOrEqual', text: 'Less Than or Equal' },
            { key: 'between', text: 'Between' },
            { key: 'in', text: 'In List' },
            { key: 'isEmpty', text: 'Is Empty' },
            { key: 'isNotEmpty', text: 'Is Not Empty' },
            { key: 'isNull', text: 'Is Null' },
            { key: 'isNotNull', text: 'Is Not Null' },
        ];
        return baseOperators;
    }, []);

    const columnOptions = useMemo(() => columns.map((col) => ({ key: col.key, text: col.name, data: col })), [columns]);

    const addCondition = useCallback(() => {
        const newCondition: IFilterCondition = {
            id: generateId(),
            column: '',
            operator: 'equals',
            value: '',
            dataType: 'string',
        };

        setFilter((prev) => ({
            ...prev,
            conditions: [...prev.conditions, newCondition],
        }));
    }, []);

    const updateCondition = useCallback((conditionId: string, updates: Partial<IFilterCondition>) => {
        setFilter((prev) => ({
            ...prev,
            conditions: prev.conditions.map((condition) =>
                condition.id === conditionId ? { ...condition, ...updates } : condition,
            ),
        }));
    }, []);

    const removeCondition = useCallback((conditionId: string) => {
        setFilter((prev) => ({
            ...prev,
            conditions: prev.conditions.filter((condition) => condition.id !== conditionId),
        }));
    }, []);

    const addGroup = useCallback(() => {
        const newGroup: IFilterGroup = {
            id: generateId(),
            conditions: [],
            logicalOperator: 'AND',
            isExpanded: true,
        };

        setFilter((prev) => ({
            ...prev,
            groups: [...prev.groups, newGroup],
        }));
    }, []);

    const validateFilter = useCallback((): boolean => {
        const errors: string[] = [];

        if (filter.conditions.length === 0 && filter.groups.length === 0) {
            errors.push('At least one condition or group is required');
        }

        filter.conditions.forEach((condition, index) => {
            if (!condition.column) {
                errors.push(`Condition ${index + 1}: Column is required`);
            }
            if (!condition.value && !['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'].includes(condition.operator)) {
                errors.push(`Condition ${index + 1}: Value is required`);
            }
        });

        setValidationErrors(errors);
        return errors.length === 0;
    }, [filter]);

    const handleApply = useCallback(() => {
        if (validateFilter()) {
            onApply({ ...filter, id: filter.id || generateId() });
            onDismiss();
        }
    }, [filter, validateFilter, onApply, onDismiss]);

    const handleSavePreset = useCallback(() => {
        if (filter.name && validateFilter()) {
            savePreset(filter.name, filter.description || '', filter);
        }
    }, [filter, validateFilter, savePreset]);

    const handleLoadPreset = useCallback(
        (presetId: string) => {
            const presetFilter = loadPreset(presetId);
            if (presetFilter) {
                setFilter(presetFilter);
            }
        },
        [loadPreset],
    );

    const renderCondition = (condition: IFilterCondition, index: number) => {
        const selectedColumn = columns.find((col) => col.key === condition.column);
        const availableOperators = selectedColumn
            ? getOperatorsForDataType(selectedColumn.dataType || 'string')
            : operatorOptions;

        return (
            <Stack key={condition.id} horizontal tokens={{ childrenGap: 8 }} className="filter-condition">
                {index > 0 && (
                    <Dropdown
                        placeholder="AND/OR"
                        selectedKey={filter.logicalOperator}
                        options={[
                            { key: 'AND', text: 'AND' },
                            { key: 'OR', text: 'OR' },
                        ]}
                        onChange={(_, option) =>
                            setFilter((prev) => ({ ...prev, logicalOperator: option?.key as 'AND' | 'OR' }))
                        }
                        styles={{ root: { width: 80 } }}
                    />
                )}

                <Dropdown
                    placeholder="Select column"
                    selectedKey={condition.column}
                    options={columnOptions}
                    onChange={(_, option) => {
                        const column = option?.data;
                        updateCondition(condition.id, {
                            column: option?.key as string,
                            dataType: column?.dataType || 'string',
                        });
                    }}
                    styles={{ root: { width: 150 } }}
                />

                <Dropdown
                    placeholder="Operator"
                    selectedKey={condition.operator}
                    options={availableOperators}
                    onChange={(_, option) => updateCondition(condition.id, { operator: option?.key as FilterOperator })}
                    styles={{ root: { width: 150 } }}
                />

                {renderValueInput(condition)}

                <IconButton
                    iconProps={{ iconName: 'Delete' }}
                    onClick={() => removeCondition(condition.id)}
                    ariaLabel="Remove condition"
                />
            </Stack>
        );
    };

    const renderValueInput = (condition: IFilterCondition) => {
        if (['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'].includes(condition.operator)) {
            return null;
        }

        switch (condition.dataType) {
            case 'number':
                return condition.operator === 'between' ? (
                    <Stack horizontal tokens={{ childrenGap: 4 }}>
                        <SpinButton
                            value={condition.value?.toString() || ''}
                            onChange={(_, value) => updateCondition(condition.id, { value: Number(value) })}
                            styles={{ root: { width: 80 } }}
                        />
                        <Text>and</Text>
                        <SpinButton
                            value={condition.secondValue?.toString() || ''}
                            onChange={(_, value) => updateCondition(condition.id, { secondValue: Number(value) })}
                            styles={{ root: { width: 80 } }}
                        />
                    </Stack>
                ) : (
                    <SpinButton
                        value={condition.value?.toString() || ''}
                        onChange={(_, value) => updateCondition(condition.id, { value: Number(value) })}
                        styles={{ root: { width: 120 } }}
                    />
                );

            case 'date':
                return condition.operator === 'between' ? (
                    <Stack horizontal tokens={{ childrenGap: 4 }}>
                        <DatePicker
                            value={condition.value ? new Date(condition.value) : undefined}
                            onSelectDate={(date) => updateCondition(condition.id, { value: date?.toISOString() })}
                            styles={{ root: { width: 120 } }}
                        />
                        <Text>and</Text>
                        <DatePicker
                            value={condition.secondValue ? new Date(condition.secondValue) : undefined}
                            onSelectDate={(date) => updateCondition(condition.id, { secondValue: date?.toISOString() })}
                            styles={{ root: { width: 120 } }}
                        />
                    </Stack>
                ) : (
                    <DatePicker
                        value={condition.value ? new Date(condition.value) : undefined}
                        onSelectDate={(date) => updateCondition(condition.id, { value: date?.toISOString() })}
                        styles={{ root: { width: 120 } }}
                    />
                );

            case 'boolean':
                return (
                    <Dropdown
                        selectedKey={condition.value?.toString()}
                        options={[
                            { key: 'true', text: 'True' },
                            { key: 'false', text: 'False' },
                        ]}
                        onChange={(_, option) => updateCondition(condition.id, { value: option?.key === 'true' })}
                        styles={{ root: { width: 120 } }}
                    />
                );

            default:
                return (
                    <TextField
                        value={condition.value?.toString() || ''}
                        onChange={(_, value) => updateCondition(condition.id, { value })}
                        placeholder="Enter value"
                        styles={{ root: { width: 120 } }}
                    />
                );
        }
    };

    const getOperatorsForDataType = (dataType: DataType) => {
        const textOperators = ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith'];
        const numberOperators = [
            'equals',
            'notEquals',
            'greaterThan',
            'greaterThanOrEqual',
            'lessThan',
            'lessThanOrEqual',
            'between',
        ];
        const dateOperators = [
            'equals',
            'notEquals',
            'greaterThan',
            'greaterThanOrEqual',
            'lessThan',
            'lessThanOrEqual',
            'between',
        ];
        const commonOperators = ['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'];

        let availableOperators: string[] = [];

        switch (dataType) {
            case 'string':
                availableOperators = [...textOperators, ...commonOperators];
                break;
            case 'number':
            case 'currency':
                availableOperators = [...numberOperators, ...commonOperators];
                break;
            case 'date':
            case 'datetime':
                availableOperators = [...dateOperators, ...commonOperators];
                break;
            default:
                availableOperators = [...textOperators, ...commonOperators];
        }

        return operatorOptions.filter((op) => availableOperators.includes(op.key));
    };

    return (
        <Panel
            isOpen={isOpen}
            onDismiss={onDismiss}
            type={PanelType.large}
            headerText="Advanced Filter Builder"
            closeButtonAriaLabel="Close"
            className="advanced-filter-builder"
        >
            <Stack tokens={{ childrenGap: 16 }}>
                {/* Filter Name and Description */}
                <Stack tokens={{ childrenGap: 8 }}>
                    <TextField
                        label="Filter Name"
                        value={filter.name}
                        onChange={(_, value) => setFilter((prev) => ({ ...prev, name: value || '' }))}
                        placeholder="Enter filter name"
                    />
                    <TextField
                        label="Description"
                        value={filter.description}
                        onChange={(_, value) => setFilter((prev) => ({ ...prev, description: value || '' }))}
                        placeholder="Enter filter description"
                        multiline
                        rows={2}
                    />
                </Stack>

                <Separator />

                {/* Preset Management */}
                <Stack>
                    <Text variant="mediumPlus">Filter Presets</Text>
                    <Stack horizontal tokens={{ childrenGap: 8 }}>
                        <Dropdown
                            placeholder="Load preset"
                            options={presets.map((preset) => ({ key: preset.id, text: preset.name }))}
                            onChange={(_, option) => option && handleLoadPreset(option.key as string)}
                            styles={{ root: { width: 200 } }}
                        />
                        <PrimaryButton text="Save as Preset" onClick={handleSavePreset} disabled={!filter.name} />
                    </Stack>
                </Stack>

                <Separator />

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <MessageBar messageBarType={MessageBarType.error}>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {validationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </MessageBar>
                )}

                {/* Filter Conditions */}
                <Stack>
                    <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                        <Text variant="mediumPlus">Filter Conditions</Text>
                        <Stack horizontal tokens={{ childrenGap: 8 }}>
                            <DefaultButton
                                text="Add Condition"
                                iconProps={{ iconName: 'Add' }}
                                onClick={addCondition}
                            />
                            <DefaultButton text="Add Group" iconProps={{ iconName: 'AddGroup' }} onClick={addGroup} />
                        </Stack>
                    </Stack>

                    <Stack tokens={{ childrenGap: 12 }}>
                        {filter.conditions.map((condition, index) => renderCondition(condition, index))}
                    </Stack>
                </Stack>

                {/* Action Buttons */}
                <Stack horizontal horizontalAlign="end" tokens={{ childrenGap: 8 }}>
                    <DefaultButton text="Cancel" onClick={onDismiss} />
                    <DefaultButton
                        text="Clear All"
                        onClick={() =>
                            setFilter({
                                id: '',
                                conditions: [],
                                logicalOperator: 'AND',
                                groups: [],
                                name: '',
                                description: '',
                            })
                        }
                    />
                    <PrimaryButton
                        text="Apply Filter"
                        onClick={handleApply}
                        disabled={filter.conditions.length === 0 && filter.groups.length === 0}
                    />
                </Stack>
            </Stack>
        </Panel>
    );
};

// Filter Summary Component
interface IFilterSummaryProps {
    filters: IAdvancedFilter[];
    onEditFilter: (filter: IAdvancedFilter) => void;
    onRemoveFilter: (filterId: string) => void;
    onClearAll: () => void;
}

export const FilterSummary: React.FC<IFilterSummaryProps> = ({ filters, onEditFilter, onRemoveFilter, onClearAll }) => {
    const columns: IColumn[] = [
        {
            key: 'name',
            name: 'Name',
            fieldName: 'name',
            minWidth: 150,
            isResizable: true,
            onRender: (item: IAdvancedFilter) => <Text>{item.name || 'Unnamed Filter'}</Text>,
        },
        {
            key: 'conditions',
            name: 'Conditions',
            fieldName: 'conditions',
            minWidth: 200,
            isResizable: true,
            onRender: (item: IAdvancedFilter) => <Text>{item.conditions.length} condition(s)</Text>,
        },
        {
            key: 'description',
            name: 'Description',
            fieldName: 'description',
            minWidth: 200,
            isResizable: true,
            onRender: (item: IAdvancedFilter) => <Text>{item.description || 'No description'}</Text>,
        },
        {
            key: 'actions',
            name: 'Actions',
            fieldName: 'actions',
            minWidth: 100,
            onRender: (item: IAdvancedFilter) => (
                <Stack horizontal tokens={{ childrenGap: 4 }}>
                    <IconButton
                        iconProps={{ iconName: 'Edit' }}
                        onClick={() => onEditFilter(item)}
                        ariaLabel="Edit filter"
                    />
                    <IconButton
                        iconProps={{ iconName: 'Delete' }}
                        onClick={() => onRemoveFilter(item.id)}
                        ariaLabel="Remove filter"
                    />
                </Stack>
            ),
        },
    ];

    if (filters.length === 0) {
        return (
            <MessageBar messageBarType={MessageBarType.info}>
                No filters applied. Use the Advanced Filter Builder to create filters.
            </MessageBar>
        );
    }

    return (
        <Stack tokens={{ childrenGap: 8 }}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text variant="mediumPlus">Active Filters ({filters.length})</Text>
                <DefaultButton text="Clear All" iconProps={{ iconName: 'ClearFilter' }} onClick={onClearAll} />
            </Stack>
            <DetailsList
                items={filters}
                columns={columns}
                selectionMode={SelectionMode.none}
                isHeaderVisible={true}
                compact={true}
            />
        </Stack>
    );
};

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
