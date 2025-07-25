import { IFilterState, IColumnFilter, IFilterCondition } from './Filter.types';
import { FilterOperators, FilterTypes } from './ManifestConstants';

export class FilterUtils {
    /**
     * Applies filters to a dataset
     */
    static applyFilters(
        records: Record<string, ComponentFramework.PropertyHelper.DataSetApi.EntityRecord>,
        recordIds: string[],
        filters: IFilterState,
    ): string[] {
        const activeFilters = Object.values(filters).filter((f) => f.isActive);

        if (activeFilters.length === 0) {
            return recordIds;
        }

        return recordIds.filter((recordId) => {
            const record = records[recordId];
            if (!record) return false;

            return activeFilters.every((filter) => this.evaluateFilter(record, filter));
        });
    }

    /**
     * Evaluates a single filter against a record
     */
    private static evaluateFilter(
        record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
        filter: IColumnFilter,
    ): boolean {
        const { conditions, logicalOperator = 'AND' } = filter;

        if (logicalOperator === 'OR') {
            return conditions.some((condition) => this.evaluateCondition(record, condition));
        } else {
            return conditions.every((condition) => this.evaluateCondition(record, condition));
        }
    }

    /**
     * Evaluates a single condition against a record
     */
    private static evaluateCondition(
        record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
        condition: IFilterCondition,
    ): boolean {
        const fieldValue = record.getValue(condition.field);
        const { operator, value } = condition;

        switch (operator) {
            case FilterOperators.Equals:
                return this.compareValues(fieldValue, value, '===');

            case FilterOperators.NotEquals:
                return this.compareValues(fieldValue, value, '!==');

            case FilterOperators.Contains:
                return this.stringContains(fieldValue, value as string);

            case FilterOperators.StartsWith:
                return this.stringStartsWith(fieldValue, value as string);

            case FilterOperators.EndsWith:
                return this.stringEndsWith(fieldValue, value as string);

            case FilterOperators.GreaterThan:
                return this.compareValues(fieldValue, value, '>');

            case FilterOperators.GreaterThanOrEqual:
                return this.compareValues(fieldValue, value, '>=');

            case FilterOperators.LessThan:
                return this.compareValues(fieldValue, value, '<');

            case FilterOperators.LessThanOrEqual:
                return this.compareValues(fieldValue, value, '<=');

            case FilterOperators.IsEmpty:
                return this.isEmpty(fieldValue);

            case FilterOperators.IsNotEmpty:
                return !this.isEmpty(fieldValue);

            case FilterOperators.In:
                return this.isInArray(fieldValue, value as (string | number)[]);

            case FilterOperators.NotIn:
                return !this.isInArray(fieldValue, value as (string | number)[]);

            default:
                return true;
        }
    }

    private static compareValues(fieldValue: unknown, filterValue: unknown, operator: string): boolean {
        const field = this.normalizeValue(fieldValue);
        const filter = this.normalizeValue(filterValue);

        switch (operator) {
            case '===':
                return field === filter;
            case '!==':
                return field !== filter;
            case '>':
                return (
                    field != null &&
                    filter != null &&
                    typeof field !== 'boolean' &&
                    typeof filter !== 'boolean' &&
                    field > filter
                );
            case '>=':
                return (
                    field != null &&
                    filter != null &&
                    typeof field !== 'boolean' &&
                    typeof filter !== 'boolean' &&
                    field >= filter
                );
            case '<':
                return (
                    field != null &&
                    filter != null &&
                    typeof field !== 'boolean' &&
                    typeof filter !== 'boolean' &&
                    field < filter
                );
            case '<=':
                return (
                    field != null &&
                    filter != null &&
                    typeof field !== 'boolean' &&
                    typeof filter !== 'boolean' &&
                    field <= filter
                );
            default:
                return false;
        }
    }

    private static stringContains(fieldValue: unknown, filterValue: string): boolean {
        if (this.isEmpty(fieldValue)) return false;
        const field = fieldValue?.toString().toLowerCase() || '';
        const filter = filterValue.toLowerCase();
        return field.includes(filter);
    }

    private static stringStartsWith(fieldValue: unknown, filterValue: string): boolean {
        if (this.isEmpty(fieldValue)) return false;
        const field = fieldValue?.toString().toLowerCase() || '';
        const filter = filterValue.toLowerCase();
        return field.startsWith(filter);
    }

    private static stringEndsWith(fieldValue: unknown, filterValue: string): boolean {
        if (this.isEmpty(fieldValue)) return false;
        const field = fieldValue?.toString().toLowerCase() || '';
        const filter = filterValue.toLowerCase();
        return field.endsWith(filter);
    }

    private static isEmpty(value: unknown): boolean {
        return value == null || value === '' || value === undefined;
    }

    private static isInArray(fieldValue: unknown, filterValues: (string | number)[]): boolean {
        if (this.isEmpty(fieldValue)) return false;
        const normalizedField = this.normalizeValue(fieldValue);
        return filterValues.some((v) => this.normalizeValue(v) === normalizedField);
    }

    private static normalizeValue(value: unknown): string | number | boolean | null {
        if (value == null || value === undefined) return null;

        // Return boolean values as-is
        if (typeof value === 'boolean') {
            return value;
        }

        // Try to parse as number if it looks like a number
        if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
            return Number(value);
        }

        // Try to parse as date if it looks like a date
        if (typeof value === 'string' && !isNaN(Date.parse(value))) {
            return new Date(value).getTime();
        }

        // Return string or number, or null if it's an object
        if (typeof value === 'string' || typeof value === 'number') {
            return value;
        }

        return null;
    }

    /**
     * Gets unique values for a column for choice filtering
     */
    static getUniqueValues(
        records: Record<string, ComponentFramework.PropertyHelper.DataSetApi.EntityRecord>,
        recordIds: string[],
        columnName: string,
    ): Array<{ value: string | number; count: number }> {
        const valueMap = new Map<string, number>();

        recordIds.forEach((recordId) => {
            const record = records[recordId];
            if (record) {
                const value = record.getFormattedValue(columnName) || record.getValue(columnName);
                if (value != null && value !== '') {
                    const key = value.toString();
                    valueMap.set(key, (valueMap.get(key) || 0) + 1);
                }
            }
        });

        return Array.from(valueMap.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => {
                // Sort by value, trying to maintain numeric order if possible
                const aNum = Number(a.value);
                const bNum = Number(b.value);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return aNum - bNum;
                }
                return a.value.toString().localeCompare(b.value.toString());
            });
    }

    /**
     * Determines the filter type for a column based on its data type
     */
    static determineFilterType(datasetColumn: ComponentFramework.PropertyHelper.DataSetApi.Column): FilterTypes {
        const { dataType } = datasetColumn;

        switch (dataType) {
            case 'DateAndTime.DateAndTime':
            case 'DateAndTime.DateOnly':
                return FilterTypes.Date;

            case 'Whole.None':
            case 'FP':
            case 'Decimal':
            case 'Currency':
                return FilterTypes.Number;

            case 'TwoOptions':
                return FilterTypes.Boolean;

            case 'Enum':
            case 'OptionSet':
                return FilterTypes.Choice;

            default:
                return FilterTypes.Text;
        }
    }

    /**
     * Serializes filter state for output
     */
    static serializeFilters(filters: IFilterState): string {
        const activeFilters = Object.values(filters).filter((f) => f.isActive);
        return JSON.stringify(activeFilters);
    }

    /**
     * Deserializes filter state from input
     */
    static deserializeFilters(filtersJson: string): IFilterState {
        try {
            const filterArray = JSON.parse(filtersJson) as IColumnFilter[];
            const filterState: IFilterState = {};

            filterArray.forEach((filter) => {
                filterState[filter.columnName] = filter;
            });

            return filterState;
        } catch {
            return {};
        }
    }
}
