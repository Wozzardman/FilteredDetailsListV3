/**
 * Column Editor Type Definitions
 * Defines the different types of editors and their configurations
 */

import { PowerAppsConditionalConfig } from '../services/PowerAppsConditionalProcessor';

export type ColumnEditorType = 
    | 'text'
    | 'number' 
    | 'date'
    | 'datetime'
    | 'boolean'
    | 'dropdown'
    | 'multiselect'
    | 'autocomplete'
    | 'richtext'
    | 'currency'
    | 'percentage'
    | 'phone'
    | 'email'
    | 'url'
    | 'color'
    | 'slider'
    | 'rating'
    | 'custom';

export interface DropdownOption {
    key: string | number;
    text: string;
    value: any;
    disabled?: boolean;
    selected?: boolean;
    data?: any;
}

export interface AutocompleteOption {
    id: string | number;
    text: string;
    value: any;
    disabled?: boolean;
    data?: any;
}

export interface SliderConfig {
    min: number;
    max: number;
    step?: number;
    showValue?: boolean;
    valueFormat?: (value: number) => string;
}

export interface RatingConfig {
    max: number;
    allowZero?: boolean;
    iconName?: string;
    unselectedIconName?: string;
}

export interface CurrencyConfig {
    currencySymbol?: string;
    decimalPlaces?: number;
    thousandsSeparator?: string;
    decimalSeparator?: string;
}

export interface DateTimeConfig {
    showTime?: boolean;
    format?: string;
    minDate?: Date;
    maxDate?: Date;
    timeStep?: number; // minutes
}

export interface TextConfig {
    multiline?: boolean;
    rows?: number;
    maxLength?: number;
    placeholder?: string;
    pattern?: string;
    patternErrorMessage?: string;
}

export interface NumberConfig {
    min?: number;
    max?: number;
    step?: number;
    decimalPlaces?: number;
    prefix?: string;
    suffix?: string;
}

export interface CustomEditorConfig {
    component: React.ComponentType<CustomEditorProps>;
    props?: Record<string, any>;
}

export interface CustomEditorProps {
    value: any;
    onChange: (value: any) => void;
    onCommit: (value: any) => void;
    onCancel: () => void;
    column: any;
    item: any;
    isReadOnly?: boolean;
    config?: Record<string, any>;
}

// Conditional Logic System
export type ConditionalTriggerType = 'onChange' | 'onFocus' | 'onBlur' | 'onInit';

export interface ConditionalTrigger {
    /** Column that triggers the condition */
    sourceColumn: string;
    /** Type of trigger event */
    triggerType: ConditionalTriggerType;
    /** Condition to evaluate (returns boolean) */
    condition?: (sourceValue: any, item: any, allColumns: any) => boolean;
    /** Action to perform when condition is met */
    action: ConditionalAction;
}

export interface ConditionalAction {
    /** Action type */
    type: 'setValue' | 'setOptions' | 'calculate' | 'lookup' | 'validate' | 'setVisibility' | 'setReadOnly';
    /** Static value to set */
    value?: any;
    /** Function to calculate dynamic value */
    calculate?: (sourceValue: any, item: any, allColumns: any) => any | Promise<any>;
    /** Lookup configuration for fetching values */
    lookup?: LookupConfig;
    /** Options to set for dropdown/autocomplete */
    options?: DropdownOption[] | ((sourceValue: any, item: any) => DropdownOption[] | Promise<DropdownOption[]>);
    /** Validation function */
    validator?: (value: any, sourceValue: any, item: any) => string | null;
    /** Debounce delay in ms for performance */
    debounceMs?: number;
}

export interface LookupConfig {
    /** Lookup source type */
    source: 'api' | 'dataset' | 'function' | 'static';
    /** API endpoint URL */
    url?: string;
    /** HTTP method */
    method?: 'GET' | 'POST';
    /** Request headers */
    headers?: Record<string, string>;
    /** Request body template */
    body?: any;
    /** Function to transform response */
    transform?: (response: any, sourceValue: any, item: any) => any;
    /** Static lookup table */
    data?: Record<string, any>;
    /** Custom lookup function */
    lookupFunction?: (sourceValue: any, item: any) => any | Promise<any>;
    /** Cache duration in ms */
    cacheDurationMs?: number;
    /** Error fallback value */
    fallbackValue?: any;
}

export interface ConditionalRule {
    /** Unique identifier for the rule */
    id: string;
    /** Description for debugging */
    description?: string;
    /** Target column this rule affects */
    targetColumn: string;
    /** Triggers that activate this rule */
    triggers: ConditionalTrigger[];
    /** Whether rule is active */
    enabled?: boolean;
    /** Priority for rule execution order (higher = first) */
    priority?: number;
}

export interface ConditionalConfig {
    /** Conditional rules for this editor */
    rules?: ConditionalRule[];
    /** Quick shorthand for simple value dependencies */
    dependsOn?: {
        [sourceColumn: string]: {
            /** Map source values to target values */
            valueMap?: Record<string, any>;
            /** Function to calculate target value */
            calculate?: (sourceValue: any, item: any) => any;
            /** Lookup configuration */
            lookup?: LookupConfig;
            /** Trigger type (default: onChange) */
            trigger?: ConditionalTriggerType;
        };
    };
}

export interface ColumnEditorConfig {
    type: ColumnEditorType;
    
    // Common properties
    isReadOnly?: boolean;
    isRequired?: boolean;
    placeholder?: string;
    allowDirectTextInput?: boolean; // Universal: Allow typing values directly instead of using specialized controls
    
    // Type-specific configurations
    dropdownOptions?: DropdownOption[];
    autocompleteOptions?: AutocompleteOption[];
    sliderConfig?: SliderConfig;
    ratingConfig?: RatingConfig;
    currencyConfig?: CurrencyConfig;
    dateTimeConfig?: DateTimeConfig;
    textConfig?: TextConfig;
    numberConfig?: NumberConfig;
    customConfig?: CustomEditorConfig;
    
    // Dynamic value providers
    getDropdownOptions?: (item: any, column: any) => DropdownOption[] | Promise<DropdownOption[]>;
    getAutocompleteOptions?: (searchText: string, item: any, column: any) => AutocompleteOption[] | Promise<AutocompleteOption[]>;
    
    // Conditional Logic System
    conditional?: ConditionalConfig | PowerAppsConditionalConfig;
    
    // Validation
    validator?: (value: any, item: any, column: any) => string | null;
    
    // Formatting
    displayFormatter?: (value: any, item: any, column: any) => string;
    valueFormatter?: (value: any, item: any, column: any) => any;
}

export interface ColumnEditorMapping {
    [columnKey: string]: ColumnEditorConfig;
}
