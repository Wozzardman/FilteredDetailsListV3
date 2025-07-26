import { FilterTypes, FilterOperators } from './ManifestConstants';

// Re-export for use in other components
export { FilterTypes, FilterOperators };

export interface IFilterCondition {
    field: string;
    operator: FilterOperators;
    value: string | number | boolean | (string | number)[];
    displayValue?: string;
}

export interface IColumnFilter {
    columnName: string;
    filterType: FilterTypes;
    conditions: IFilterCondition[];
    isActive: boolean;
    logicalOperator?: 'AND' | 'OR'; // For multiple conditions within a column
}

export interface IFilterState {
    [columnName: string]: IColumnFilter;
}

export interface IFilterMenuProps {
    column: string;
    columnDisplayName: string;
    filterType: FilterTypes;
    currentFilter?: IColumnFilter;
    availableValues?: Array<{ value: string | number; count: number }>;
    onApplyFilter: (filter: IColumnFilter | null) => void;
    onClose: () => void;
    target?: HTMLElement;
    resources: ComponentFramework.Resources;
}

export interface IFilterPanelProps {
    isOpen: boolean;
    column: string;
    columnDisplayName: string;
    filterType: FilterTypes;
    currentFilter?: IColumnFilter;
    availableValues?: Array<{ value: string | number; count: number }>;
    onApplyFilter: (filter: IColumnFilter | null) => void;
    onDismiss: () => void;
    resources: ComponentFramework.Resources;
}

export interface IFilterChipProps {
    filter: IColumnFilter;
    onRemove: (columnName: string) => void;
    onEdit: (columnName: string) => void;
}

export interface IFilterBarProps {
    filters: IFilterState;
    onRemoveFilter: (columnName: string) => void;
    onEditFilter: (columnName: string) => void;
    onClearAllFilters: () => void;
    resources: ComponentFramework.Resources;
}
