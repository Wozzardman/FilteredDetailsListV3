/**
 * Date Parsing Utilities for Enhanced Inline Editor
 * 
 * This module provides utility functions for parsing and validating date inputs
 * in text editors that handle date values.
 */

export { isDateLikeString, tryParseUserDateInput } from '../components/EnhancedInlineEditor';

/**
 * Additional utility function to format dates consistently
 */
export function formatDateForDisplay(value: any): string {
    if (value instanceof Date) {
        return value.toLocaleDateString();
    } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        const parsedDate = new Date(value);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString();
        }
    }
    return String(value || '');
}

/**
 * Utility function to convert date strings to Date objects
 */
export function parseTextToDate(value: any): Date | any {
    if (typeof value === 'string' && value.trim()) {
        // Check if it looks like a date string
        const datePatterns = [
            /^\d{1,2}\/\d{1,2}\/\d{4}$/,
            /^\d{1,2}-\d{1,2}-\d{4}$/,
            /^\d{4}-\d{1,2}-\d{1,2}$/,
            /^\d{1,2}\.\d{1,2}\.\d{4}$/
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

/**
 * Complete date editor configuration helper
 */
export const DateTextEditorHelpers = {
    /**
     * Creates a display formatter for dates in text fields
     */
    createDateDisplayFormatter: () => (value: any) => formatDateForDisplay(value),
    
    /**
     * Creates a value formatter that parses text to dates
     */
    createDateValueFormatter: () => (value: any) => parseTextToDate(value),
    
    /**
     * Creates a combined configuration for text editors handling dates
     */
    createDateTextConfig: (options: {
        placeholder?: string;
        isRequired?: boolean;
        maxLength?: number;
    } = {}) => ({
        type: 'text' as const,
        isRequired: options.isRequired || false,
        placeholder: options.placeholder || 'MM/DD/YYYY',
        textConfig: {
            maxLength: options.maxLength || 10
        },
        displayFormatter: DateTextEditorHelpers.createDateDisplayFormatter(),
        valueFormatter: DateTextEditorHelpers.createDateValueFormatter()
    })
};
