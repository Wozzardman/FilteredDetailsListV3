/**
 * Advanced TypeScript types for enterprise-level PCF control
 */

import { IColumn as FluentColumn } from '@fluentui/react';

// Enhanced Grid Props with Generic Support
export interface IFilteredDetailsListProps<T = any> {
    dataset?: any; // ComponentFramework.PropertyTypes.DataSet;
    columns?: any; // ComponentFramework.PropertyTypes.DataSet;
    enableFiltering?: boolean;
    enableSorting?: boolean;
    enableExport?: boolean;
    enableVirtualization?: boolean;
    theme?: 'light' | 'dark' | 'auto';
    density?: 'compact' | 'comfortable' | 'spacious';
    customTheme?: ICustomTheme;
}

// Generic Grid Interface
export interface IGenericGrid<T = any> {
    data: T[];
    columns: FluentColumn[];
    filters: ITypedFilter<T>;
    sorting: ISortState<T>;
    pagination: IPaginationState;
}

// Advanced Filter Interfaces
export interface IAdvancedFilter {
    id: string;
    conditions: IFilterCondition[];
    logicalOperator: 'AND' | 'OR';
    groups: IFilterGroup[];
    name?: string;
    description?: string;
}

export interface IFilterGroup {
    id: string;
    conditions: IFilterCondition[];
    logicalOperator: 'AND' | 'OR';
    parentGroup?: string;
    isExpanded?: boolean;
}

export interface IFilterCondition {
    id: string;
    column: string;
    operator: FilterOperator;
    value: any;
    secondValue?: any; // For between operations
    dataType: DataType;
}

export type FilterOperator =
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'notContains'
    | 'startsWith'
    | 'endsWith'
    | 'greaterThan'
    | 'greaterThanOrEqual'
    | 'lessThan'
    | 'lessThanOrEqual'
    | 'between'
    | 'notBetween'
    | 'in'
    | 'notIn'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'isNull'
    | 'isNotNull'
    | 'regex';

export type DataType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'choice' | 'lookup' | 'currency';

// Basic Column Filter Interface
export interface IColumnFilter {
    operator: FilterOperator;
    value: any;
    dataType?: DataType;
    caseSensitive?: boolean;
}

// Typed Filter State
export type ITypedFilter<T> = {
    [K in keyof T]?: IColumnFilter;
};

// Performance Monitoring
export interface IPerformanceMetrics {
    renderTime: number;
    filterTime: number;
    memoryUsage: number;
    dataSize: number;
    virtualizedRows: number;
    userInteractions: IInteractionEvent[];
    timestamp: Date;
}

export interface IInteractionEvent {
    type: 'filter' | 'sort' | 'scroll' | 'export' | 'resize';
    duration: number;
    metadata?: Record<string, any>;
    timestamp: Date;
}

// Export Configuration
export interface IExportOptions {
    format: 'CSV' | 'Excel' | 'PDF' | 'JSON';
    includeFilters: boolean;
    includeHeaders: boolean;
    customColumns?: string[];
    maxRows?: number;
    fileName?: string;
    metadata?: {
        title?: string;
        description?: string;
        author?: string;
        createdDate?: Date;
    };
}

// Aggregation Configuration
export interface IAggregationConfig {
    column: string;
    type: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'custom';
    groupBy?: string[];
    customFunction?: (values: any[]) => any;
    displayName?: string;
    format?: string;
}

// Data Quality Indicators
export interface IDataQuality {
    completeness: number; // % of non-null values
    uniqueness: number; // % of unique values
    validity: number; // % of valid format values
    consistency: number; // % of consistent format values
    warnings: IDataWarning[];
    suggestions: IDataSuggestion[];
}

export interface IDataWarning {
    type: 'missing_data' | 'invalid_format' | 'duplicate_values' | 'inconsistent_format';
    column: string;
    count: number;
    percentage: number;
    examples?: any[];
    severity: 'low' | 'medium' | 'high';
}

export interface IDataSuggestion {
    type: 'data_cleanup' | 'format_standardization' | 'missing_data_handling';
    description: string;
    action?: () => void;
    impact: 'low' | 'medium' | 'high';
}

// Theme Configuration
export interface ICustomTheme {
    palette: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        error: string;
        warning: string;
        success: string;
        info: string;
        text: {
            primary: string;
            secondary: string;
            disabled: string;
        };
    };
    typography: {
        fontFamily: string;
        fontSize: {
            small: string;
            medium: string;
            large: string;
        };
        fontWeight: {
            normal: number;
            medium: number;
            bold: number;
        };
    };
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    borderRadius: {
        small: string;
        medium: string;
        large: string;
    };
    shadows: {
        small: string;
        medium: string;
        large: string;
    };
}

// Plugin Architecture
export interface IGridPlugin {
    name: string;
    version: string;
    description?: string;
    dependencies?: string[];
    init: (context: IGridContext) => void;
    destroy: () => void;
    hooks?: {
        beforeRender?: (props: any) => any;
        afterRender?: (element: HTMLElement) => void;
        onDataChange?: (data: any[]) => void;
        onFilterChange?: (filters: any) => void;
        onSortChange?: (sorting: any) => void;
        onExport?: (options: IExportOptions) => void;
    };
    components?: {
        toolbar?: React.ComponentType<any>;
        sidebar?: React.ComponentType<any>;
        contextMenu?: React.ComponentType<any>;
    };
}

export interface IGridContext {
    data: any[];
    columns: FluentColumn[];
    filters: any;
    sorting: any;
    pagination: any;
    theme: ICustomTheme;
    performance: IPerformanceMetrics;
    updateData: (data: any[]) => void;
    updateFilters: (filters: any) => void;
    updateSorting: (sorting: any) => void;
    exportData: (options: IExportOptions) => Promise<void>;
}

// Configuration Schema
export interface IGridConfiguration {
    appearance: {
        theme: 'light' | 'dark' | 'auto' | 'custom';
        density: 'compact' | 'comfortable' | 'spacious';
        animations: boolean;
        customTheme?: ICustomTheme;
    };
    performance: {
        virtualScrolling: boolean;
        debounceMs: number;
        maxCacheSize: number;
        enableMemoization: boolean;
        lazyLoading: boolean;
    };
    features: {
        filtering: {
            enabled: boolean;
            advanced: boolean;
            presets: boolean;
            suggestions: boolean;
        };
        sorting: {
            enabled: boolean;
            multiColumn: boolean;
        };
        export: {
            enabled: boolean;
            formats: IExportOptions['format'][];
            maxRows: number;
        };
        aggregation: {
            enabled: boolean;
            functions: IAggregationConfig['type'][];
        };
        dataQuality: {
            enabled: boolean;
            realTime: boolean;
            showWarnings: boolean;
        };
    };
    accessibility: {
        screenReader: boolean;
        keyboardNavigation: boolean;
        highContrast: boolean;
        fontSize: 'small' | 'medium' | 'large';
    };
    plugins: {
        enabled: string[];
        configuration: Record<string, any>;
    };
}

// Enhanced Column Interface
export interface IEnhancedColumn<T = any> {
    key: string;
    name: string;
    fieldName: keyof T;
    minWidth?: number;
    maxWidth?: number;
    isResizable?: boolean;
    isSorted?: boolean;
    isSortedDescending?: boolean;
    sortAscendingAriaLabel?: string;
    sortDescendingAriaLabel?: string;
    isGrouped?: boolean;
    isFiltered?: boolean;
    filterAriaLabel?: string;
    isMultiline?: boolean;
    data?: any;
    calculatedWidth?: number;
    currentWidth?: number;
    headerClassName?: string;
    className?: string;
    ariaLabel?: string;
    isRowHeader?: boolean;
    isPadded?: boolean;
    onRender?: (item?: T, index?: number, column?: IEnhancedColumn<T>) => React.ReactNode;
    onRenderHeader?: (props?: any, defaultRender?: any) => React.ReactNode;
    onColumnClick?: (ev: React.MouseEvent<HTMLElement>, column: IEnhancedColumn<T>) => void;
    onContextualMenu?: (column?: IEnhancedColumn<T>, ev?: React.MouseEvent<HTMLElement>) => void;
    iconName?: string;
    iconClassName?: string;
    styles?: any;
    theme?: any;

    // Enhanced properties
    dataType?: DataType;
    aggregation?: IAggregationConfig;
    validation?: IColumnValidation;
    formatting?: IColumnFormatting;
    metadata?: IColumnMetadata;
}

export interface IColumnValidation {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    customValidator?: (value: any) => boolean | string;
}

export interface IColumnFormatting {
    type?: 'currency' | 'percentage' | 'number' | 'date' | 'datetime' | 'custom';
    decimals?: number;
    prefix?: string;
    suffix?: string;
    customFormatter?: (value: any) => string;
}

export interface IColumnMetadata {
    description?: string;
    category?: string;
    tags?: string[];
    source?: string;
    lastUpdated?: Date;
    quality?: IDataQuality;
}

// Enhanced Sort State
export interface ISortState<T = any> {
    column?: keyof T;
    direction?: 'asc' | 'desc';
    multiSort?: Array<{
        column: keyof T;
        direction: 'asc' | 'desc';
        priority: number;
    }>;
}

// Enhanced Pagination State
export interface IPaginationState {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    showPageSizeOptions: boolean;
    pageSizeOptions: number[];
    showQuickJumper: boolean;
    showTotal: boolean;
}

// Filter Preset Management
export interface IFilterPreset {
    id: string;
    name: string;
    description?: string;
    filters: IAdvancedFilter;
    isPublic: boolean;
    createdBy: string;
    createdDate: Date;
    lastModified: Date;
    tags?: string[];
    category?: string;
    usage?: {
        count: number;
        lastUsed: Date;
    };
}

// Virtualization Configuration
export interface IVirtualizationConfig {
    enabled: boolean;
    itemHeight: number | ((index: number) => number);
    overscanCount: number;
    scrollToAlignment: 'auto' | 'end' | 'start' | 'center';
    estimatedItemHeight?: number;
    getItemHeight?: (index: number) => number;
}

// Accessibility Configuration
export interface IAccessibilityConfig {
    ariaLabel?: string;
    ariaLabelledBy?: string;
    ariaDescribedBy?: string;
    role?: string;
    tabIndex?: number;
    keyboardNavigation: {
        enabled: boolean;
        shortcuts: Record<string, () => void>;
    };
    screenReader: {
        announcements: boolean;
        liveRegion: boolean;
    };
    highContrast: {
        enabled: boolean;
        customColors?: Record<string, string>;
    };
}

// Error Handling
export interface IErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
    errorId?: string;
    timestamp?: Date;
}

export interface IErrorReportingConfig {
    enabled: boolean;
    endpoint?: string;
    includeStackTrace: boolean;
    includeUserAgent: boolean;
    includeTimestamp: boolean;
    customData?: Record<string, any>;
}
