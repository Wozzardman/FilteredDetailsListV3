/**
 * Column Editor Configuration Helper
 * Provides easy configuration presets and utilities for column editors
 */

import { ColumnEditorConfig, ColumnEditorMapping, DropdownOption } from '../types/ColumnEditor.types';

export class ColumnEditorConfigHelper {
    
    /**
     * Create a text editor configuration
     */
    static text(options: {
        multiline?: boolean;
        maxLength?: number;
        placeholder?: string;
        isRequired?: boolean;
        isReadOnly?: boolean;
        pattern?: string;
        patternErrorMessage?: string;
    } = {}): ColumnEditorConfig {
        return {
            type: 'text',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            placeholder: options.placeholder,
            textConfig: {
                multiline: options.multiline,
                maxLength: options.maxLength,
                pattern: options.pattern,
                patternErrorMessage: options.patternErrorMessage
            }
        };
    }

    /**
     * Create a number editor configuration
     */
    static number(options: {
        min?: number;
        max?: number;
        step?: number;
        decimalPlaces?: number;
        prefix?: string;
        suffix?: string;
        isRequired?: boolean;
        isReadOnly?: boolean;
    } = {}): ColumnEditorConfig {
        return {
            type: 'number',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            numberConfig: {
                min: options.min,
                max: options.max,
                step: options.step,
                decimalPlaces: options.decimalPlaces,
                prefix: options.prefix,
                suffix: options.suffix
            }
        };
    }

    /**
     * Create a currency editor configuration
     */
    static currency(options: {
        currencySymbol?: string;
        decimalPlaces?: number;
        min?: number;
        max?: number;
        isRequired?: boolean;
        isReadOnly?: boolean;
    } = {}): ColumnEditorConfig {
        return {
            type: 'currency',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            currencyConfig: {
                currencySymbol: options.currencySymbol || '$',
                decimalPlaces: options.decimalPlaces || 2
            },
            numberConfig: {
                min: options.min,
                max: options.max
            }
        };
    }

    /**
     * Create a percentage editor configuration
     */
    static percentage(options: {
        min?: number;
        max?: number;
        decimalPlaces?: number;
        isRequired?: boolean;
        isReadOnly?: boolean;
    } = {}): ColumnEditorConfig {
        return {
            type: 'percentage',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            numberConfig: {
                min: options.min || 0,
                max: options.max || 100,
                decimalPlaces: options.decimalPlaces || 1
            }
        };
    }

    /**
     * Create a text editor configuration that can handle date values
     */
    static textWithDateSupport(options: {
        placeholder?: string;
        isRequired?: boolean;
        isReadOnly?: boolean;
        maxLength?: number;
    } = {}): ColumnEditorConfig {
        return {
            type: 'text',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            placeholder: options.placeholder || 'MM/DD/YYYY',
            textConfig: {
                maxLength: options.maxLength
            },
            // Custom display formatter to show dates nicely
            displayFormatter: (value: any) => {
                if (value instanceof Date) {
                    return value.toLocaleDateString();
                } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
                    const parsedDate = new Date(value);
                    if (!isNaN(parsedDate.getTime())) {
                        return parsedDate.toLocaleDateString();
                    }
                }
                return String(value || '');
            },
            // Custom value formatter to parse date strings
            valueFormatter: (value: any) => {
                if (typeof value === 'string') {
                    // Check if it looks like a date string
                    const datePatterns = [
                        /^\d{1,2}\/\d{1,2}\/\d{4}$/,
                        /^\d{1,2}-\d{1,2}-\d{4}$/,
                        /^\d{4}-\d{1,2}-\d{1,2}$/
                    ];
                    
                    if (datePatterns.some(pattern => pattern.test(value.trim()))) {
                        const parsedDate = new Date(value);
                        if (!isNaN(parsedDate.getTime())) {
                            return parsedDate;
                        }
                    }
                }
                return value;
            }
        };
    }

    /**
     * Create a date editor configuration
     */
    static date(options: {
        showTime?: boolean;
        format?: string;
        minDate?: Date;
        maxDate?: Date;
        isRequired?: boolean;
        isReadOnly?: boolean;
    } = {}): ColumnEditorConfig {
        return {
            type: options.showTime ? 'datetime' : 'date',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            dateTimeConfig: {
                showTime: options.showTime,
                format: options.format,
                minDate: options.minDate,
                maxDate: options.maxDate
            }
        };
    }

    /**
     * Create a boolean toggle editor configuration
     */
    static boolean(options: {
        isRequired?: boolean;
        isReadOnly?: boolean;
    } = {}): ColumnEditorConfig {
        return {
            type: 'boolean',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false
        };
    }

    /**
     * Create a dropdown editor configuration
     */
    static dropdown(options: {
        options?: DropdownOption[];
        getDynamicOptions?: (item: any, column: any) => DropdownOption[] | Promise<DropdownOption[]>;
        isRequired?: boolean;
        isReadOnly?: boolean;
        placeholder?: string;
    }): ColumnEditorConfig {
        return {
            type: 'dropdown',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            placeholder: options.placeholder,
            dropdownOptions: options.options,
            getDropdownOptions: options.getDynamicOptions
        };
    }

    /**
     * Create a rating editor configuration
     */
    static rating(options: {
        max?: number;
        allowZero?: boolean;
        iconName?: string;
        isRequired?: boolean;
        isReadOnly?: boolean;
    } = {}): ColumnEditorConfig {
        return {
            type: 'rating',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            ratingConfig: {
                max: options.max || 5,
                allowZero: options.allowZero !== false,
                iconName: options.iconName
            }
        };
    }

    /**
     * Create a slider editor configuration
     */
    static slider(options: {
        min: number;
        max: number;
        step?: number;
        showValue?: boolean;
        valueFormat?: (value: number) => string;
        isRequired?: boolean;
        isReadOnly?: boolean;
    }): ColumnEditorConfig {
        return {
            type: 'slider',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            sliderConfig: {
                min: options.min,
                max: options.max,
                step: options.step || 1,
                showValue: options.showValue !== false,
                valueFormat: options.valueFormat
            }
        };
    }

    /**
     * Create an email editor configuration
     */
    static email(options: {
        isRequired?: boolean;
        isReadOnly?: boolean;
        placeholder?: string;
    } = {}): ColumnEditorConfig {
        return {
            type: 'email',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            placeholder: options.placeholder || 'Enter email address...'
        };
    }

    /**
     * Create a phone editor configuration
     */
    static phone(options: {
        isRequired?: boolean;
        isReadOnly?: boolean;
        placeholder?: string;
    } = {}): ColumnEditorConfig {
        return {
            type: 'phone',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            placeholder: options.placeholder || 'Enter phone number...'
        };
    }

    /**
     * Create a URL editor configuration
     */
    static url(options: {
        isRequired?: boolean;
        isReadOnly?: boolean;
        placeholder?: string;
    } = {}): ColumnEditorConfig {
        return {
            type: 'url',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false,
            placeholder: options.placeholder || 'Enter URL...'
        };
    }

    /**
     * Create a color picker editor configuration
     */
    static color(options: {
        isRequired?: boolean;
        isReadOnly?: boolean;
    } = {}): ColumnEditorConfig {
        return {
            type: 'color',
            isRequired: options.isRequired || false,
            isReadOnly: options.isReadOnly || false
        };
    }

    /**
     * Helper to create dropdown options from simple arrays
     */
    static createDropdownOptions(
        values: string[] | { value: any; text: string; disabled?: boolean }[]
    ): DropdownOption[] {
        if (typeof values[0] === 'string') {
            return (values as string[]).map((value, index) => ({
                key: index,
                text: value,
                value: value
            }));
        } else {
            return (values as any[]).map((option, index) => ({
                key: option.key || index,
                text: option.text,
                value: option.value,
                disabled: option.disabled
            }));
        }
    }

    /**
     * Create a complete column editor mapping
     */
    static createMapping(configs: { [columnKey: string]: ColumnEditorConfig }): ColumnEditorMapping {
        return configs;
    }
}

/**
 * Common editor configurations for typical business scenarios
 */
export const CommonEditorConfigs = {
    // Contact information
    firstName: ColumnEditorConfigHelper.text({ placeholder: 'First name', isRequired: true }),
    lastName: ColumnEditorConfigHelper.text({ placeholder: 'Last name', isRequired: true }),
    email: ColumnEditorConfigHelper.email({ isRequired: true }),
    phone: ColumnEditorConfigHelper.phone(),
    website: ColumnEditorConfigHelper.url(),
    
    // Financial
    price: ColumnEditorConfigHelper.currency({ min: 0 }),
    discount: ColumnEditorConfigHelper.percentage({ min: 0, max: 100 }),
    quantity: ColumnEditorConfigHelper.number({ min: 0, step: 1 }),
    
    // Dates
    birthDate: ColumnEditorConfigHelper.date({ maxDate: new Date() }),
    startDate: ColumnEditorConfigHelper.date(),
    endDate: ColumnEditorConfigHelper.date(),
    
    // Status and ratings
    isActive: ColumnEditorConfigHelper.boolean(),
    rating: ColumnEditorConfigHelper.rating({ max: 5 }),
    priority: ColumnEditorConfigHelper.slider({ min: 1, max: 10, showValue: true }),
    
    // Common dropdowns
    status: ColumnEditorConfigHelper.dropdown({
        options: ColumnEditorConfigHelper.createDropdownOptions([
            'Active', 'Inactive', 'Pending', 'Completed'
        ])
    }),
    
    category: ColumnEditorConfigHelper.dropdown({
        options: ColumnEditorConfigHelper.createDropdownOptions([
            'Technology', 'Finance', 'Healthcare', 'Education', 'Retail'
        ])
    }),
    
    country: ColumnEditorConfigHelper.dropdown({
        options: ColumnEditorConfigHelper.createDropdownOptions([
            'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany'
        ])
    })
};
