/**
 * Column Editor Type Definitions
 * Defines the different types of editors and their configurations
 */

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
    
    // Validation
    validator?: (value: any, item: any, column: any) => string | null;
    
    // Formatting
    displayFormatter?: (value: any, item: any, column: any) => string;
    valueFormatter?: (value: any, item: any, column: any) => any;
}

export interface ColumnEditorMapping {
    [columnKey: string]: ColumnEditorConfig;
}
