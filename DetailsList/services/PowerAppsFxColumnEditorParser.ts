/**
 * Power Apps FX Formula Parser for Column Editor Configuration
 * Converts Power Apps FX formulas into ColumnEditorConfig objects
 */

import { ColumnEditorConfig, DropdownOption } from '../types/ColumnEditor.types';

export interface PowerAppsFxFormula {
    [columnKey: string]: string;
}

export class PowerAppsFxColumnEditorParser {
    
    /**
     * Parse Power Apps FX formulas into ColumnEditorConfig objects
     * 
     * Examples:
     * - "Text(placeholder: 'Enter name', required: true)"
     * - "Dropdown(['Option1', 'Option2', 'Option3'])"
     * - "Number(min: 0, max: 100, step: 1)"
     * - "Date(min: Today(), max: Today() + 365)"
     * - "Currency(prefix: '$', min: 0)"
     * - "Boolean()"
     * - "Email(required: true)"
     * - "Phone(format: 'US')"
     */
    static parseFormula(formula: string): ColumnEditorConfig | null {
        if (!formula || typeof formula !== 'string') {
            return null;
        }

        // Clean up the formula
        const cleanFormula = formula.trim();
        
        // Extract the function name and parameters
        const match = cleanFormula.match(/^(\w+)\s*\((.*)\)$/);
        if (!match) {
            // Simple type without parameters
            return this.parseSimpleType(cleanFormula);
        }

        const [, functionName, parametersStr] = match;
        const parameters = this.parseParameters(parametersStr);

        return this.createConfig(functionName.toLowerCase(), parameters);
    }

    /**
     * Parse simple types without parameters (e.g., "Text", "Number", "Boolean")
     */
    private static parseSimpleType(type: string): ColumnEditorConfig | null {
        const lowerType = type.toLowerCase();
        
        switch (lowerType) {
            case 'text':
                return { type: 'text' };
            case 'number':
                return { type: 'number' };
            case 'boolean':
                return { type: 'boolean' };
            case 'date':
                return { type: 'date' };
            case 'email':
                return { 
                    type: 'text',
                    textConfig: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', patternErrorMessage: 'Please enter a valid email address' }
                };
            case 'phone':
                return { type: 'phone' };
            case 'url':
                return { type: 'url' };
            case 'currency':
                return { type: 'currency' };
            case 'percentage':
                return { type: 'percentage' };
            case 'rating':
                return { type: 'rating' };
            case 'slider':
                return { type: 'slider' };
            default:
                console.warn(`🔧 Unknown simple editor type: ${type}`);
                return { type: 'text' }; // Fallback to text
        }
    }

    /**
     * Parse function parameters from string
     * Supports: placeholder: 'text', required: true, min: 0, options: ['a', 'b']
     * Special case: For dropdowns, also supports direct arrays: ['a', 'b', 'c']
     */
    private static parseParameters(parametersStr: string): Record<string, any> {
        const parameters: Record<string, any> = {};
        
        if (!parametersStr.trim()) {
            return parameters;
        }

        // Special case: If the entire parameter string is an array, treat it as options for dropdown
        const trimmed = parametersStr.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const arrayValue = this.parseValue(trimmed);
            parameters.options = arrayValue;
            return parameters;
        }

        // Simple parameter parsing - handles basic cases
        // More sophisticated parsing could be added for complex scenarios
        const paramRegex = /(\w+)\s*:\s*([^,]+)(?:,|$)/g;
        let match;

        while ((match = paramRegex.exec(parametersStr)) !== null) {
            const [, key, valueStr] = match;
            const value = this.parseValue(valueStr.trim());
            parameters[key] = value;
        }

        return parameters;
    }

    /**
     * Parse individual parameter values
     */
    private static parseValue(valueStr: string): any {
        // Remove quotes for strings
        if ((valueStr.startsWith("'") && valueStr.endsWith("'")) || 
            (valueStr.startsWith('"') && valueStr.endsWith('"'))) {
            return valueStr.slice(1, -1);
        }

        // Parse arrays [item1, item2, item3]
        if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
            const arrayContent = valueStr.slice(1, -1);
            if (!arrayContent.trim()) return [];
            
            return arrayContent.split(',').map(item => {
                const trimmed = item.trim();
                // Remove quotes from array items
                if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || 
                    (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
                    return trimmed.slice(1, -1);
                }
                return trimmed;
            });
        }

        // Parse booleans
        if (valueStr.toLowerCase() === 'true') return true;
        if (valueStr.toLowerCase() === 'false') return false;

        // Parse numbers
        const numValue = Number(valueStr);
        if (!isNaN(numValue)) return numValue;

        // Parse Power Apps functions
        if (valueStr.includes('Today()')) {
            return new Date();
        }

        // Return as string fallback
        return valueStr;
    }

    /**
     * Create ColumnEditorConfig based on function name and parameters
     */
    private static createConfig(functionName: string, parameters: Record<string, any>): ColumnEditorConfig {
        const baseConfig: ColumnEditorConfig = {
            type: functionName as any,
            isRequired: parameters.required || false,
            isReadOnly: parameters.readonly || false,
            placeholder: parameters.placeholder,
        };

        switch (functionName) {
            case 'text':
                return {
                    ...baseConfig,
                    textConfig: {
                        multiline: parameters.multiline || false,
                        maxLength: parameters.maxlength || parameters.max,
                        pattern: parameters.pattern,
                        patternErrorMessage: parameters.patternerror
                    }
                };

            case 'number':
                return {
                    ...baseConfig,
                    numberConfig: {
                        min: parameters.min,
                        max: parameters.max,
                        step: parameters.step || 1,
                        decimalPlaces: parameters.decimals,
                        prefix: parameters.prefix,
                        suffix: parameters.suffix
                    }
                };

            case 'dropdown':
                const options = parameters.options || [];
                return {
                    ...baseConfig,
                    dropdownOptions: Array.isArray(options) 
                        ? options.map((opt, index) => ({ key: index.toString(), text: opt, value: opt }))
                        : []
                };

            case 'date':
                return {
                    ...baseConfig,
                    dateTimeConfig: {
                        showTime: parameters.includetime || false,
                        minDate: parameters.min,
                        maxDate: parameters.max,
                        format: parameters.format
                    }
                };

            case 'currency':
                return {
                    ...baseConfig,
                    currencyConfig: {
                        currencySymbol: parameters.symbol || parameters.prefix || '$',
                        decimalPlaces: parameters.decimals || 2
                    }
                };

            case 'percentage':
                return {
                    ...baseConfig,
                    type: 'number',
                    numberConfig: {
                        min: parameters.min || 0,
                        max: parameters.max || 100,
                        step: parameters.step || 1,
                        suffix: '%'
                    }
                };

            case 'rating':
                return {
                    ...baseConfig,
                    ratingConfig: {
                        max: parameters.max || 5,
                        allowZero: parameters.allowzero !== false
                    }
                };

            case 'slider':
                return {
                    ...baseConfig,
                    sliderConfig: {
                        min: parameters.min || 0,
                        max: parameters.max || 100,
                        step: parameters.step || 1,
                        showValue: parameters.showvalue !== false
                    }
                };

            case 'boolean':
                return {
                    ...baseConfig,
                    type: 'boolean'
                };

            case 'email':
                return {
                    ...baseConfig,
                    type: 'text',
                    textConfig: {
                        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
                        patternErrorMessage: 'Please enter a valid email address'
                    }
                };

            case 'phone':
                return {
                    ...baseConfig,
                    type: 'text',
                    textConfig: {
                        pattern: parameters.format === 'US' 
                            ? '^\\+?1?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$'
                            : undefined,
                        patternErrorMessage: 'Please enter a valid phone number'
                    }
                };

            case 'url':
                return {
                    ...baseConfig,
                    type: 'text',
                    textConfig: {
                        pattern: '^https?:\\/\\/.+',
                        patternErrorMessage: 'Please enter a valid URL'
                    }
                };

            default:
                console.warn(`🔧 Unknown editor function: ${functionName}, falling back to text`);
                return {
                    ...baseConfig,
                    type: 'text'
                };
        }
    }

    /**
     * Parse a Power Apps FX formula mapping object
     */
    static parseFormulaMapping(formulaMapping: PowerAppsFxFormula): Record<string, ColumnEditorConfig> {
        const result: Record<string, ColumnEditorConfig> = {};

        for (const [columnKey, formula] of Object.entries(formulaMapping)) {
            const config = this.parseFormula(formula);
            if (config) {
                result[columnKey] = config;
            }
        }

        return result;
    }

    /**
     * Parse a simple string-based formula configuration
     * Format: "ColumnName1: Formula1; ColumnName2: Formula2"
     */
    static parseSimpleFormulaString(formulaString: string): Record<string, ColumnEditorConfig> {
        const result: Record<string, ColumnEditorConfig> = {};
        
        if (!formulaString || typeof formulaString !== 'string') {
            return result;
        }

        // Split by semicolon to get individual column configurations
        const columnConfigs = formulaString.split(';');
        
        for (const columnConfig of columnConfigs) {
            const trimmed = columnConfig.trim();
            if (!trimmed) continue;

            // Split by colon to separate column name from formula
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) continue;

            const columnName = trimmed.substring(0, colonIndex).trim();
            const formula = trimmed.substring(colonIndex + 1).trim();

            const config = this.parseFormula(formula);
            if (config && columnName) {
                result[columnName] = config;
            }
        }

        return result;
    }
}

// Example usage and common formulas
export const PowerAppsEditorExamples = {
    /**
     * Common Power Apps FX formulas for column editors
     */
    examples: {
        // Basic types
        "Name": "Text(placeholder: 'Enter full name', required: true)",
        "Age": "Number(min: 0, max: 150)",
        "IsActive": "Boolean()",
        "BirthDate": "Date(max: Today())",
        
        // Advanced configurations
        "Email": "Email(required: true)",
        "Phone": "Phone(format: 'US')",
        "Website": "URL()",
        "Price": "Currency(symbol: '$', min: 0, decimals: 2)",
        "Discount": "Percentage(min: 0, max: 100)",
        "Rating": "Rating(max: 5, allowhalf: true)",
        "Priority": "Slider(min: 1, max: 10, showvalue: true)",
        
        // Dropdowns
        "Status": "Dropdown(['Active', 'Inactive', 'Pending', 'Completed'])",
        "Category": "Dropdown(['Technology', 'Finance', 'Healthcare', 'Education'])",
        
        // Text with validation
        "Description": "Text(multiline: true, maxlength: 500)",
        "ProductCode": "Text(pattern: '^[A-Z]{3}-\\d{4}$', patternerror: 'Format: ABC-1234')"
    },

    /**
     * Simple string format examples
     */
    simpleStringExamples: [
        "Name: Text(required: true); Age: Number(min: 0); Email: Email(required: true)",
        "Status: Dropdown(['Active', 'Inactive']); Priority: Slider(min: 1, max: 5)",
        "Price: Currency(min: 0); Description: Text(multiline: true)"
    ]
};
