import React from 'react';
import { Stack, Text, DefaultButton } from '@fluentui/react';
import { IFilterBarProps, IColumnFilter } from './Filter.types';

export const FilterBar: React.FC<IFilterBarProps> = ({ filters, onRemoveFilter, onEditFilter, onClearAllFilters }) => {
    const activeFilters = Object.values(filters).filter((f) => f.isActive);

    if (activeFilters.length === 0) {
        return null;
    }

    const getFilterDisplayText = (filter: IColumnFilter): string => {
        const condition = filter.conditions[0];
        if (!condition) return '';

        let text = '';
        switch (condition.operator) {
            case 'contains':
                text = `contains "${condition.value}"`;
                break;
            case 'eq':
                text = `equals "${condition.value}"`;
                break;
            case 'ne':
                text = `not equals "${condition.value}"`;
                break;
            case 'gt':
                text = `> ${condition.value}`;
                break;
            case 'gte':
                text = `>= ${condition.value}`;
                break;
            case 'lt':
                text = `< ${condition.value}`;
                break;
            case 'lte':
                text = `<= ${condition.value}`;
                break;
            case 'in': {
                const values = condition.value as string[] | number[];
                text = `is one of (${values.length} items)`;
                break;
            }
            case 'notin': {
                const notInValues = condition.value as string[] | number[];
                text = `is not one of (${notInValues.length} items)`;
                break;
            }
            case 'isempty':
                text = 'is empty';
                break;
            case 'isnotempty':
                text = 'is not empty';
                break;
            default:
                text = condition.value?.toString() || '';
        }

        return text;
    };

    return (
        <div className="filter-bar">
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
                    Filters:
                </Text>
                {activeFilters.map((filter) => (
                    <div key={filter.columnName} className="filter-chip">
                        <Stack horizontal tokens={{ childrenGap: 4 }} verticalAlign="center">
                            <Text variant="small">
                                <strong>{filter.columnName}:</strong> {getFilterDisplayText(filter)}
                            </Text>
                            <DefaultButton
                                text="Edit"
                                onClick={() => onEditFilter(filter.columnName)}
                                title={`Edit filter for ${filter.columnName}`}
                                styles={{ root: { minWidth: '40px', height: '20px', fontSize: '10px' } }}
                            />
                            <DefaultButton
                                text="×"
                                onClick={() => onRemoveFilter(filter.columnName)}
                                title={`Remove filter for ${filter.columnName}`}
                                styles={{ root: { minWidth: '20px', height: '20px', fontSize: '12px' } }}
                            />
                        </Stack>
                    </div>
                ))}
                {activeFilters.length > 1 && (
                    <DefaultButton
                        text="Clear all"
                        onClick={onClearAllFilters}
                        styles={{ root: { minHeight: '24px' } }}
                    />
                )}
            </Stack>
        </div>
    );
};
