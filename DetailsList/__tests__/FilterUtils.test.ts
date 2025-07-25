import { FilterUtils } from '../FilterUtils';
import { IFilterState } from '../Filter.types';
import { FilterTypes, FilterOperators } from '../ManifestConstants';
import { MockEntityRecord } from '../__mocks__/mock-datasets';

const CHICAGO_CITY = 'Chicago';
const LOS_ANGELES_CITY = 'Los Angeles';

describe('FilterUtils', () => {
    const mockRecords = {
        '1': new MockEntityRecord('1', {
            name: 'John Doe',
            age: 25,
            city: 'New York',
            active: true,
            date: '2023-01-15',
        }),
        '2': new MockEntityRecord('2', {
            name: 'Jane Smith',
            age: 30,
            city: LOS_ANGELES_CITY,
            active: false,
            date: '2023-02-20',
        }),
        '3': new MockEntityRecord('3', {
            name: 'Bob Johnson',
            age: 35,
            city: CHICAGO_CITY,
            active: true,
            date: '2023-03-10',
        }),
    };

    const recordIds = ['1', '2', '3'];

    describe('applyFilters', () => {
        it('should return all records when no filters are applied', () => {
            const filters: IFilterState = {};
            const result = FilterUtils.applyFilters(mockRecords, recordIds, filters);
            expect(result).toEqual(recordIds);
        });

        it('should filter records by text contains', () => {
            const filters: IFilterState = {
                name: {
                    columnName: 'name',
                    filterType: FilterTypes.Text,
                    conditions: [
                        {
                            field: 'name',
                            operator: FilterOperators.Contains,
                            value: 'John',
                        },
                    ],
                    isActive: true,
                },
            };
            const result = FilterUtils.applyFilters(mockRecords, recordIds, filters);
            expect(result).toEqual(['1', '3']); // John Doe and Bob Johnson
        });

        it('should filter records by number equals', () => {
            const filters: IFilterState = {
                age: {
                    columnName: 'age',
                    filterType: FilterTypes.Number,
                    conditions: [
                        {
                            field: 'age',
                            operator: FilterOperators.Equals,
                            value: 30,
                        },
                    ],
                    isActive: true,
                },
            };
            const result = FilterUtils.applyFilters(mockRecords, recordIds, filters);
            expect(result).toEqual(['2']); // Jane Smith
        });

        it('should filter records by boolean equals', () => {
            const filters: IFilterState = {
                active: {
                    columnName: 'active',
                    filterType: FilterTypes.Boolean,
                    conditions: [
                        {
                            field: 'active',
                            operator: FilterOperators.Equals,
                            value: true,
                        },
                    ],
                    isActive: true,
                },
            };
            const result = FilterUtils.applyFilters(mockRecords, recordIds, filters);
            expect(result).toEqual(['1', '3']); // John Doe and Bob Johnson
        });

        it('should filter records by choice in array', () => {
            const filters: IFilterState = {
                city: {
                    columnName: 'city',
                    filterType: FilterTypes.Choice,
                    conditions: [
                        {
                            field: 'city',
                            operator: FilterOperators.In,
                            value: ['New York', CHICAGO_CITY],
                        },
                    ],
                    isActive: true,
                },
            };
            const result = FilterUtils.applyFilters(mockRecords, recordIds, filters);
            expect(result).toEqual(['1', '3']); // John Doe and Bob Johnson
        });

        it('should combine multiple filters with AND logic', () => {
            const filters: IFilterState = {
                active: {
                    columnName: 'active',
                    filterType: FilterTypes.Boolean,
                    conditions: [
                        {
                            field: 'active',
                            operator: FilterOperators.Equals,
                            value: true,
                        },
                    ],
                    isActive: true,
                },
                age: {
                    columnName: 'age',
                    filterType: FilterTypes.Number,
                    conditions: [
                        {
                            field: 'age',
                            operator: FilterOperators.GreaterThan,
                            value: 30,
                        },
                    ],
                    isActive: true,
                },
            };
            const result = FilterUtils.applyFilters(mockRecords, recordIds, filters);
            expect(result).toEqual(['3']); // Only Bob Johnson (active and age > 30)
        });
    });

    describe('getUniqueValues', () => {
        it('should return unique values with counts', () => {
            const result = FilterUtils.getUniqueValues(mockRecords, recordIds, 'city');
            expect(result).toEqual([
                { value: CHICAGO_CITY, count: 1 },
                { value: LOS_ANGELES_CITY, count: 1 },
                { value: 'New York', count: 1 },
            ]);
        });

        it('should handle duplicate values', () => {
            const recordsWithDuplicates = {
                ...mockRecords,
                '4': new MockEntityRecord('4', {
                    name: 'Alice Brown',
                    age: 28,
                    city: 'New York',
                    active: true,
                    date: '2023-04-05',
                }),
            };

            const result = FilterUtils.getUniqueValues(recordsWithDuplicates, ['1', '2', '3', '4'], 'city');
            expect(result).toEqual([
                { value: CHICAGO_CITY, count: 1 },
                { value: LOS_ANGELES_CITY, count: 1 },
                { value: 'New York', count: 2 },
            ]);
        });
    });

    describe('serialization', () => {
        it('should serialize and deserialize filters correctly', () => {
            const filters: IFilterState = {
                name: {
                    columnName: 'name',
                    filterType: FilterTypes.Text,
                    conditions: [
                        {
                            field: 'name',
                            operator: FilterOperators.Contains,
                            value: 'John',
                        },
                    ],
                    isActive: true,
                },
            };

            const serialized = FilterUtils.serializeFilters(filters);
            const deserialized = FilterUtils.deserializeFilters(serialized);

            expect(deserialized).toEqual(filters);
        });

        it('should handle empty filters during serialization', () => {
            const filters: IFilterState = {};
            const serialized = FilterUtils.serializeFilters(filters);
            const deserialized = FilterUtils.deserializeFilters(serialized);

            expect(deserialized).toEqual(filters);
        });

        it('should handle invalid JSON during deserialization', () => {
            const result = FilterUtils.deserializeFilters('invalid json');
            expect(result).toEqual({});
        });
    });
});
