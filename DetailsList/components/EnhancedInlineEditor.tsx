/**
 * Enhanced Column Editor System
 * Supports multiple editor types with column-specific configurations
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { TextField } from '@fluentui/react/lib/TextField';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { Slider } from '@fluentui/react/lib/Slider';
import { Rating } from '@fluentui/react/lib/Rating';
import { ColorPicker } from '@fluentui/react/lib/ColorPicker';
import { ComboBox, IComboBoxOption } from '@fluentui/react/lib/ComboBox';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { IconButton } from '@fluentui/react/lib/Button';
import { Stack } from '@fluentui/react/lib/Stack';
import { IColumn } from '@fluentui/react/lib/DetailsList';
import '../css/EnhancedDropdown.css';
import { 
    ColumnEditorType, 
    ColumnEditorConfig, 
    ColumnEditorMapping,
    DropdownOption,
    AutocompleteOption,
    CustomEditorProps 
} from '../types/ColumnEditor.types';
import { conditionalEngine, ConditionalEngineContext } from '../services/ConditionalLogicEngine';
import { PowerAppsConditionalProcessor, PowerAppsConditionalConfig } from '../services/PowerAppsConditionalProcessor';

/**
 * Helper function to detect if a string looks like a date input
 * @exported for testing and reuse
 */
export function isDateLikeString(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    
    // Common date patterns: MM/DD/YYYY, M/D/YYYY, MM-DD-YYYY, MM.DD.YYYY, etc.
    const datePatterns = [
        /^\d{1,2}\/\d{1,2}\/\d{4}$/,           // MM/DD/YYYY or M/D/YYYY
        /^\d{1,2}-\d{1,2}-\d{4}$/,            // MM-DD-YYYY or M-D-YYYY
        /^\d{1,2}\.\d{1,2}\.\d{4}$/,          // MM.DD.YYYY or M.D.YYYY
        /^\d{4}-\d{1,2}-\d{1,2}$/,            // YYYY-MM-DD or YYYY-M-D
        /^\d{4}\/\d{1,2}\/\d{1,2}$/,          // YYYY/MM/DD or YYYY/M/D
        /^\d{1,2}\/\d{1,2}\/\d{2}$/,          // MM/DD/YY or M/D/YY
        /^\d{1,2}-\d{1,2}-\d{2}$/,            // MM-DD-YY or M-D-YY
    ];
    
    return datePatterns.some(pattern => pattern.test(str.trim()));
}

/**
 * Helper function to parse user date input into a Date object
 * @exported for testing and reuse
 */
export function tryParseUserDateInput(input: string): Date | null {
    if (!input || typeof input !== 'string') return null;
    
    const trimmedInput = input.trim();
    if (!trimmedInput) return null;
    
    // Try direct Date parsing first (handles many formats automatically)
    let parsedDate = new Date(trimmedInput);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
    }
    
    // Handle common formats that Date constructor might not parse correctly
    const formats = [
        // MM/DD/YYYY, M/D/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // MM-DD-YYYY, M-D-YYYY  
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        // MM.DD.YYYY, M.D.YYYY
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
        // MM/DD/YY, M/D/YY (assume 20XX for years 00-30, 19XX for 31-99)
        /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
        // MM-DD-YY, M-D-YY
        /^(\d{1,2})-(\d{1,2})-(\d{2})$/,
    ];
    
    for (const format of formats) {
        const match = trimmedInput.match(format);
        if (match) {
            let month = parseInt(match[1], 10);
            let day = parseInt(match[2], 10);
            let year = parseInt(match[3], 10);
            
            // Handle 2-digit years
            if (year < 100) {
                year += year <= 30 ? 2000 : 1900;
            }
            
            // Validate ranges
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
                parsedDate = new Date(year, month - 1, day); // month is 0-indexed
                if (!isNaN(parsedDate.getTime()) && 
                    parsedDate.getFullYear() === year && 
                    parsedDate.getMonth() === month - 1 && 
                    parsedDate.getDate() === day) {
                    return parsedDate;
                }
            }
        }
    }
    
    // Try YYYY-MM-DD, YYYY/MM/DD formats
    const isoFormats = [
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    ];
    
    for (const format of isoFormats) {
        const match = trimmedInput.match(format);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
                parsedDate = new Date(year, month - 1, day);
                if (!isNaN(parsedDate.getTime()) && 
                    parsedDate.getFullYear() === year && 
                    parsedDate.getMonth() === month - 1 && 
                    parsedDate.getDate() === day) {
                    return parsedDate;
                }
            }
        }
    }
    
    return null;
}

export interface EnhancedInlineEditorProps {
    value: any;
    column: IColumn;
    item: any;
    editorConfig?: ColumnEditorConfig;
    onCommit: (value: any) => void;
    onCommitAndAdvance?: (value: any) => void; // New: Commit and move focus to next editable cell on the same row
    onCancel: () => void;
    onValueChange?: (value: any) => void;
    onItemChange?: (columnKey: string, value: any) => void; // New: For conditional updates
    onTriggerAutoFillConfirmation?: (itemId: string) => void; // New: For triggering auto-fill confirmation
    allColumns?: Record<string, any>; // New: All column values for conditional logic
    columnEditorMapping?: ColumnEditorMapping; // New: All editor configurations for conditional logic
    columnTextSize?: number; // Font size for inline editor text in px
    style?: React.CSSProperties;
    className?: string;
}

export const EnhancedInlineEditor: React.FC<EnhancedInlineEditorProps> = ({
    value,
    column,
    item,
    editorConfig,
    onCommit,
    onCommitAndAdvance,
    onCancel,
    onValueChange,
    onItemChange,
    onTriggerAutoFillConfirmation,
    allColumns,
    columnEditorMapping,
    columnTextSize = 13, // Default font size to match column text
    style,
    className = ''
}) => {
    const [currentValue, setCurrentValue] = React.useState<any>(value);
    const [hasError, setHasError] = React.useState<boolean>(false);
    const [errorMessage, setErrorMessage] = React.useState<string>('');
    const [dropdownOptions, setDropdownOptions] = React.useState<DropdownOption[]>([]);
    const [autocompleteOptions, setAutocompleteOptions] = React.useState<AutocompleteOption[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = React.useState<boolean>(false);
    const [filterText, setFilterText] = React.useState<string>(typeof value === 'string' ? value : '');
    const [isDropdownOpen, setIsDropdownOpen] = React.useState<boolean>(false);
    const dropdownContainerRef = React.useRef<HTMLDivElement>(null);
    const dropdownListRef = React.useRef<HTMLDivElement>(null);
    const [dropdownTarget, setDropdownTarget] = React.useState<HTMLElement | null>(null);
    const [isDatePickerActive, setIsDatePickerActive] = React.useState<boolean>(false);
    // Ref-based tracking for date picker to avoid stale closures in blur handlers
    const datePickerActiveRef = React.useRef<boolean>(false);
    const datePickerBlurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup blur timeout on unmount
    React.useEffect(() => {
        return () => {
            if (datePickerBlurTimeoutRef.current) {
                clearTimeout(datePickerBlurTimeoutRef.current);
            }
        };
    }, []);

    // Default editor config if none provided
    const config: ColumnEditorConfig = editorConfig || {
        type: 'text',
        editLock: false,
        isRequired: false
    };

    // Register conditional logic for this editor
    React.useEffect(() => {
        if (config.conditional && column.key) {
            // Only register if this is an enterprise conditional config (not PowerApps)
            const conditional = config.conditional as any;
            if (typeof conditional.dependsOn !== 'string') {
                conditionalEngine.registerConditionalConfig(column.key, config.conditional as any);
            }
        }
    }, [config.conditional, column.key]);

    // Conditional logic context
    const createConditionalContext = React.useCallback((): ConditionalEngineContext => ({
        item,
        allColumns: allColumns || {},
        columnKey: column.key || '',
        currentValue,
        onValueChange: (columnKey: string, newValue: any) => {
            if (columnKey === column.key) {
                setCurrentValue(newValue);
                handleValueChange(newValue);
            } else if (onItemChange) {
                onItemChange(columnKey, newValue);
            }
        },
        onOptionsChange: (columnKey: string, options: DropdownOption[]) => {
            if (columnKey === column.key) {
                setDropdownOptions(options);
            }
        },
        onValidationChange: (columnKey: string, error: string | null) => {
            if (columnKey === column.key) {
                setErrorMessage(error || '');
                setHasError(!!error);
            }
        }
    }), [item, allColumns, column.key, currentValue, onItemChange]);

    // Handle conditional triggers when this editor's value changes
    const handleConditionalTrigger = React.useCallback(async (
        triggerType: 'onChange' | 'onFocus' | 'onBlur' | 'onInit',
        newValue?: any
    ) => {
        const valueToUse = newValue !== undefined ? newValue : currentValue;
        
        
        if (column.key && config.conditional) {
            // Handle enterprise conditional logic
            const context = createConditionalContext();
            await conditionalEngine.processTriggers(
                column.key,
                valueToUse,
                triggerType,
                context
            );
        }

        // Handle PowerApps-compatible conditional logic
        if (column.key && triggerType === 'onChange' && onItemChange && allColumns && columnEditorMapping) {
            
            const processor = PowerAppsConditionalProcessor.getInstance();
            
            // Build configurations from the column editor mapping
            const allEditorConfigs: Record<string, { conditional?: PowerAppsConditionalConfig }> = {};
            
            Object.keys(columnEditorMapping).forEach(key => {
                const config = columnEditorMapping[key];
                if (config.conditional) {
                    // Check if this is a PowerApps conditional config (has string dependsOn)
                    const conditional = config.conditional as any;
                    if (typeof conditional.dependsOn === 'string') {
                        allEditorConfigs[key] = { conditional: conditional as PowerAppsConditionalConfig };
                    }
                }
            });

            const dependencies = processor.getDependencies(allEditorConfigs);
            const dependentFields = dependencies[column.key];
            

            if (dependentFields && dependentFields.length > 0) {
                const context = {
                    currentValues: { ...allColumns, [column.key]: valueToUse },
                    isNewRecord: !item || Object.keys(item).every(key => !item[key]),
                    globalDataSources: (window as any).PowerAppsDataSources || {}
                };


                // First pass: Check if ANY dependent field requires auto-fill confirmation
                let hasPendingAutoFillConfirmations = false;
                const autoFillUpdates: Array<{ field: string, value: any }> = [];

                for (const dependentField of dependentFields) {
                    const dependentConfig = allEditorConfigs[dependentField]?.conditional;
                    if (dependentConfig) {
                        const newValue = processor.processConditional(
                            dependentField,
                            dependentConfig,
                            context
                        );

                        if (newValue !== undefined && newValue !== allColumns[dependentField]) {
                            // Store the potential update
                            autoFillUpdates.push({ field: dependentField, value: newValue });
                            
                            // Check if this dependent field requires auto-fill confirmation
                            const fieldConfig = columnEditorMapping[dependentField];
                            const requiresConfirmation = fieldConfig?.RequiresAutoFillConfirmation === true;
                            
                            if (requiresConfirmation) {
                                hasPendingAutoFillConfirmations = true;
                            }
                        }
                    }
                }

                // Second pass: Apply updates based on whether confirmation is needed
                if (hasPendingAutoFillConfirmations) {
                    // Don't apply any changes immediately - let the auto-fill confirmation system handle them all
                } else {
                    // Apply all changes immediately as no confirmation is required
                    for (const update of autoFillUpdates) {
                        onItemChange(update.field, update.value);
                    }
                }

                // If any dependent fields require confirmation, trigger the auto-fill confirmation system
                if (hasPendingAutoFillConfirmations && onTriggerAutoFillConfirmation) {
                    const itemId = item?.recordId || item?.key || item?.id || 'current-item';
                    onTriggerAutoFillConfirmation(itemId);
                } else if (autoFillUpdates.length > 0) {
                }
            }
        }
    }, [column.key, currentValue, config.conditional, createConditionalContext, onItemChange, allColumns, columnEditorMapping]);

    React.useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    // Initialize conditional logic on component mount
    React.useEffect(() => {
        handleConditionalTrigger('onInit');
    }, [handleConditionalTrigger]);

    // Calculate dynamic dropdown width based on content
    const calculateDropdownWidth = React.useCallback((options: DropdownOption[]): number => {
        if (!options || options.length === 0) return 120; // Minimum fallback
        
        // Find the longest text in the options
        const longestText = options.reduce((longest, option) => {
            const text = option.text || String(option.key || '');
            return text.length > longest.length ? text : longest;
        }, '');
        
        // More accurate width calculation:
        // - Account for different character widths
        // - Add padding for dropdown arrow and borders
        // - Set reasonable min/max bounds
        const baseCharWidth = 7.5; // Average character width in pixels for 14px font
        const padding = 30; // Account for dropdown arrow (32px) + padding + borders
        
        let estimatedWidth = longestText.length * baseCharWidth + padding;
        
        // Apply reasonable bounds
        estimatedWidth = Math.max(90, estimatedWidth); // Minimum 120px
        estimatedWidth = Math.min(400, estimatedWidth); // Maximum 400px to prevent overly wide dropdowns
        
        return Math.round(estimatedWidth);
    }, []);

    // Load dynamic dropdown options
    React.useEffect(() => {
        if (config.type === 'dropdown' && config.getDropdownOptions) {
            setIsLoadingOptions(true);
            const result = config.getDropdownOptions(item, column);
            
            if (result instanceof Promise) {
                result.then(options => {
                    setDropdownOptions(options);
                    setIsLoadingOptions(false);
                }).catch(() => {
                    setDropdownOptions([]);
                    setIsLoadingOptions(false);
                });
            } else {
                setDropdownOptions(result);
                setIsLoadingOptions(false);
            }
        } else if (config.type === 'dropdown' && config.dropdownOptions) {
            setDropdownOptions(config.dropdownOptions);
        }
    }, [config, item, column]);

    // Handle click outside to close dropdown
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const targetNode = event.target as Node;
            if (isDropdownOpen &&
                dropdownContainerRef.current && !dropdownContainerRef.current.contains(targetNode) &&
                (!dropdownListRef.current || !dropdownListRef.current.contains(targetNode))) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    const validateValue = React.useCallback((val: any): boolean => {
        setHasError(false);
        setErrorMessage('');

        // Required validation
        if (config.isRequired && (val === '' || val === null || val === undefined)) {
            setHasError(true);
            setErrorMessage('This field is required');
            return false;
        }

        // Custom validation
        if (config.validator) {
            const validationResult = config.validator(val, item, column);
            if (validationResult) {
                setHasError(true);
                setErrorMessage(validationResult);
                return false;
            }
        }

        // Type-specific validation
        switch (config.type) {
            case 'text':
                // Pattern validation
                if (val && config.textConfig?.pattern) {
                    const regex = new RegExp(config.textConfig.pattern);
                    if (!regex.test(val)) {
                        setHasError(true);
                        setErrorMessage(config.textConfig.patternErrorMessage || 'Invalid format');
                        return false;
                    }
                }
                // Length validation
                if (val && config.textConfig?.maxLength && val.length > config.textConfig.maxLength) {
                    setHasError(true);
                    setErrorMessage(`Maximum ${config.textConfig.maxLength} characters allowed`);
                    return false;
                }
                // Special validation for date-like values in text fields. Gate strictly on the
                // underlying value being an actual Date (a date-typed datasource column) - a
                // Date.parse-able string like a plain number must NOT be treated as a date.
                if (val && value instanceof Date) {
                    // If original value was a date, validate that text input can be parsed as a date
                    if (isDateLikeString(val) && !tryParseUserDateInput(val)) {
                        setHasError(true);
                        setErrorMessage('Please enter a valid date (e.g., MM/DD/YYYY)');
                        return false;
                    }
                }
                break;

            case 'number':
                if (val !== '' && val !== null && isNaN(Number(val))) {
                    setHasError(true);
                    setErrorMessage('Please enter a valid number');
                    return false;
                }
                if (config.numberConfig?.min !== undefined && Number(val) < config.numberConfig.min) {
                    setHasError(true);
                    setErrorMessage(`Value must be at least ${config.numberConfig.min}`);
                    return false;
                }
                if (config.numberConfig?.max !== undefined && Number(val) > config.numberConfig.max) {
                    setHasError(true);
                    setErrorMessage(`Value must be no more than ${config.numberConfig.max}`);
                    return false;
                }
                break;

            case 'email':
                if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                    setHasError(true);
                    setErrorMessage('Please enter a valid email address');
                    return false;
                }
                break;

            case 'url':
                if (val && !/^https?:\/\/.+\..+/.test(val)) {
                    setHasError(true);
                    setErrorMessage('Please enter a valid URL');
                    return false;
                }
                break;

            case 'phone':
                if (val && !/^[\+]?[1-9][\d]{0,15}$/.test(val.replace(/[\s\-\(\)\.]/g, ''))) {
                    setHasError(true);
                    setErrorMessage('Please enter a valid phone number');
                    return false;
                }
                break;

            case 'date':
            case 'datetime':
                if (val !== '' && val !== null && !(val instanceof Date) && isNaN(Date.parse(val))) {
                    setHasError(true);
                    setErrorMessage('Please enter a valid date');
                    return false;
                }
                break;
        }

        return true;
    }, [config, item, column]);

    const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                event.stopPropagation();
                if (!hasError) {
                    // For date fields (both date+allowDirectTextInput and text fields with date values),
                    // parse the raw string before committing.
                    let resolvedValue = currentValue;
                    if (typeof currentValue === 'string') {
                        const isDirectDateInput = config.type === 'date' && config.allowDirectTextInput;
                        // Only treat a text field as date-bearing when the underlying datasource
                        // value is an actual Date (i.e. a date-typed column). Do NOT infer "date"
                        // from a Date.parse-able string: Date.parse accepts plain numbers
                        // (e.g. "1" -> Jan 1 2001), which corrupted numeric/text values on commit.
                        const isTextFieldWithDateValue = config.type === 'text' && value instanceof Date;
                        if (isDirectDateInput || isTextFieldWithDateValue) {
                            const parsed = tryParseUserDateInput(currentValue);
                            if (parsed) resolvedValue = parsed;
                        }
                    }
                    const formattedValue = config.valueFormatter ? 
                        config.valueFormatter(resolvedValue, item, column) : 
                        resolvedValue;
                    if (onCommitAndAdvance) {
                        onCommitAndAdvance(formattedValue);
                    } else {
                        onCommit(formattedValue);
                    }
                }
                break;
            case 'Escape':
                event.preventDefault();
                event.stopPropagation();
                onCancel();
                break;
        }
    }, [hasError, currentValue, value, onCommit, onCommitAndAdvance, onCancel, config, item, column]);

    const handleValueChange = React.useCallback((newValue: any) => {
        setCurrentValue(newValue);
        onValueChange?.(newValue);
        validateValue(newValue);
        
        // Trigger conditional logic with the new value
        handleConditionalTrigger('onChange', newValue);
    }, [onValueChange, validateValue, handleConditionalTrigger]);

    const handleFocus = React.useCallback(() => {
        handleConditionalTrigger('onFocus');
    }, [handleConditionalTrigger]);

    const handleTextInputFocus = React.useCallback((event?: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        handleFocus();

        // Place caret at end of existing text so users can immediately backspace/delete.
        const target = event?.target;
        if (!target) return;

        requestAnimationFrame(() => {
            try {
                const input = target as HTMLInputElement | HTMLTextAreaElement;
                const valueLength = input.value?.length ?? 0;
                if (typeof input.setSelectionRange === 'function') {
                    input.setSelectionRange(valueLength, valueLength);
                }
            } catch {
                // Some input types do not support selection ranges.
            }
        });
    }, [handleFocus]);

    const handleBlur = React.useCallback(() => {
        handleConditionalTrigger('onBlur');
        
        // For date picker, don't commit on blur if the calendar is being used
        // Use ref to avoid stale closure issues with state-based tracking
        if (config.type === 'date' && datePickerActiveRef.current) {
            return;
        }
        
        if (!hasError) {
            // For date fields (both date+allowDirectTextInput and text fields with date values),
            // parse the raw string before committing.
            let resolvedValue = currentValue;
            if (typeof currentValue === 'string') {
                const isDirectDateInput = config.type === 'date' && config.allowDirectTextInput;
                // Only treat a text field as date-bearing when the underlying datasource value
                // is an actual Date (i.e. a date-typed column). Do NOT infer "date" from a
                // Date.parse-able string: Date.parse accepts plain numbers (e.g. "1" -> Jan 1
                // 2001), which corrupted numeric/text values on commit.
                const isTextFieldWithDateValue = config.type === 'text' && value instanceof Date;
                if (isDirectDateInput || isTextFieldWithDateValue) {
                    const parsed = tryParseUserDateInput(currentValue);
                    if (parsed) resolvedValue = parsed;
                }
            }
            const formattedValue = config.valueFormatter ? 
                config.valueFormatter(resolvedValue, item, column) : 
                resolvedValue;
            onCommit(formattedValue);
        }
    }, [hasError, currentValue, value, onCommit, config, item, column, handleConditionalTrigger]);

    if (config.editLock) {
        const displayValue = config.displayFormatter ? 
            config.displayFormatter(value, item, column) : 
            String(value || '');
        
        return (
            <div 
                className={`enhanced-editor read-only ${className}`}
                style={{ 
                    padding: '8px',
                    backgroundColor: '#f8f8f8',
                    cursor: 'not-allowed',
                    ...style 
                }}
            >
                {displayValue}
            </div>
        );
    }

    // Fluent UI styles prop to ensure the inner input/field element gets the correct font size
    // and proper wrapping for variable row height
    const fluentFieldStyles = {
        field: { 
            fontSize: `${columnTextSize}px`,
            whiteSpace: 'pre-wrap' as const,
            wordBreak: 'break-word' as const,
        },
        wrapper: { width: '100%' },
        root: { width: '100%' },
        fieldGroup: { minHeight: 0, border: 'none' },
    };

    const commonPropsBase = {
        style: { 
            border: 'none', 
            background: 'transparent', 
            fontSize: `${columnTextSize}px`,
            width: '100%',
            ...style 
        },
        onKeyDown: handleKeyDown,
        onFocus: handleFocus,
        onBlur: handleBlur,
        className: `enhanced-editor ${className} ${hasError ? 'has-error' : ''}`,
        autoFocus: true,
        placeholder: config.placeholder,
        autoComplete: 'off',
        spellCheck: false,
    };

    // commonProps includes Fluent UI field styles for components that support it (TextField, DatePicker, etc.)
    const commonProps = {
        ...commonPropsBase,
        onFocus: handleTextInputFocus,
        styles: fluentFieldStyles,
    };

    // Render appropriate editor based on type
    switch (config.type) {
        case 'text':
            // Special handling for date values in text editors
            const displayValue = (() => {
                if (currentValue instanceof Date) {
                    // Format date for editing (MM/DD/YYYY format)
                    return currentValue.toLocaleDateString();
                } else if (typeof currentValue === 'string' && currentValue.includes('GMT')) {
                    // Handle cases where date was converted to string representation
                    const parsedDate = new Date(currentValue);
                    if (!isNaN(parsedDate.getTime())) {
                        return parsedDate.toLocaleDateString();
                    }
                }
                return String(currentValue || '');
            })();

            return (
                <TextField
                    {...commonProps}
                    value={displayValue}
                    onChange={(_, newValue) => {
                        // Store raw text only — no eager Date parsing while typing.
                        // The final parse happens on blur/Enter in handleBlur/handleKeyDown.
                        handleValueChange(newValue);
                    }}
                    errorMessage={errorMessage}
                    multiline={true}
                    autoAdjustHeight={true}
                    rows={config.textConfig?.rows || 1}
                    resizable={false}
                    maxLength={config.textConfig?.maxLength}
                    onBlur={handleBlur}
                />
            );

        case 'number':
            const stepValue = config.numberConfig?.step || 1;
            return (
                <SpinButton
                    {...commonPropsBase}
                    value={String(currentValue || '')}
                    onValidate={(value) => {
                        const numValue = Number(value);
                        handleValueChange(numValue);
                        return String(numValue);
                    }}
                    onIncrement={(value) => {
                        const currentNum = Number(value) || 0;
                        const newValue = currentNum + stepValue;
                        const min = config.numberConfig?.min;
                        const max = config.numberConfig?.max;
                        
                        // Check max constraint
                        if (max !== undefined && newValue > max) {
                            return String(max);
                        }
                        
                        handleValueChange(newValue);
                        return String(newValue);
                    }}
                    onDecrement={(value) => {
                        const currentNum = Number(value) || 0;
                        const newValue = currentNum - stepValue;
                        const min = config.numberConfig?.min;
                        const max = config.numberConfig?.max;
                        
                        // Check min constraint
                        if (min !== undefined && newValue < min) {
                            return String(min);
                        }
                        
                        handleValueChange(newValue);
                        return String(newValue);
                    }}
                    onBlur={handleBlur}
                    min={config.numberConfig?.min}
                    max={config.numberConfig?.max}
                    step={stepValue}
                    incrementButtonAriaLabel={`Increase value by ${stepValue}`}
                    decrementButtonAriaLabel={`Decrease value by ${stepValue}`}
                />
            );

        case 'currency':
            const currencySymbol = config.currencyConfig?.currencySymbol || '$';
            return (
                <TextField
                    {...commonProps}
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => {
                        const cleanValue = newValue?.replace(/[^\d.-]/g, '') || '';
                        handleValueChange(cleanValue);
                    }}
                    onBlur={handleBlur}
                    prefix={currencySymbol}
                    errorMessage={errorMessage}
                />
            );

        case 'percentage':
            // Convert decimal to percentage for editing (0.85 → "85")
            const percentageDisplayValue = (() => {
                if (currentValue === null || currentValue === undefined || currentValue === '') {
                    return '';
                }
                const numValue = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue));
                if (isNaN(numValue)) return '';
                return String(numValue * 100);
            })();
            
            return (
                <TextField
                    {...commonProps}
                    value={percentageDisplayValue}
                    onChange={(_, newValue) => {
                        // Clean the input to only allow numbers and decimal points
                        const cleanValue = newValue?.replace(/[^\d.-]/g, '') || '';
                        
                        // Convert percentage back to decimal for storage (85 → 0.85)
                        if (cleanValue === '') {
                            handleValueChange('');
                        } else {
                            const percentageNum = parseFloat(cleanValue);
                            if (!isNaN(percentageNum)) {
                                const decimalValue = percentageNum / 100;
                                handleValueChange(String(decimalValue));
                            } else {
                                handleValueChange('');
                            }
                        }
                    }}
                    onBlur={handleBlur}
                    suffix="%"
                    errorMessage={errorMessage}
                />
            );

        case 'email':
            return (
                <TextField
                    {...commonProps}
                    type="email"
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => handleValueChange(newValue)}
                    onBlur={handleBlur}
                    errorMessage={errorMessage}
                />
            );

        case 'url':
            return (
                <TextField
                    {...commonProps}
                    type="url"
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => handleValueChange(newValue)}
                    onBlur={handleBlur}
                    errorMessage={errorMessage}
                />
            );

        case 'phone':
            return (
                <TextField
                    {...commonProps}
                    type="tel"
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => handleValueChange(newValue)}
                    onBlur={handleBlur}
                    errorMessage={errorMessage}
                />
            );

        case 'date':
            // If allowDirectTextInput is enabled, use a text field instead of date picker
            if (config.allowDirectTextInput) {
                // Show the raw string while typing. Only format Date objects (existing values).
                // Do NOT re-parse parseable strings back to a full date — that prevents backspacing.
                const dateDisplayValue = currentValue instanceof Date
                    ? currentValue.toLocaleDateString()
                    : String(currentValue || '');

                return (
                    <TextField
                        {...commonProps}
                        value={dateDisplayValue}
                        onChange={(_, newValue) => {
                            // Store raw text only — no eager Date parsing while typing.
                            // The final parse happens on blur/Enter in handleBlur/handleKeyDown.
                            handleValueChange(newValue ?? '');
                        }}
                        onBlur={handleBlur}
                        errorMessage={errorMessage}
                        placeholder={config.placeholder || 'MM/DD/YYYY'}
                    />
                );
            }

            // Create special props for DatePicker without the onBlur handler that interferes with date selection
            const datePickerProps = {
                style: { border: 'none', background: 'transparent', ...style },
                onKeyDown: handleKeyDown,
                onFocus: () => {
                    // Clear any pending blur timeout since we regained focus
                    if (datePickerBlurTimeoutRef.current) {
                        clearTimeout(datePickerBlurTimeoutRef.current);
                        datePickerBlurTimeoutRef.current = null;
                    }
                    datePickerActiveRef.current = true;
                    setIsDatePickerActive(true);
                    handleFocus();
                },
                // Custom onBlur that respects calendar interactions (month/year navigation)
                onBlur: () => {
                    // Clear any previous pending blur timeout
                    if (datePickerBlurTimeoutRef.current) {
                        clearTimeout(datePickerBlurTimeoutRef.current);
                    }
                    // Delay blur handling and check if the calendar callout is still in the DOM
                    // This prevents committing when the user is navigating months/years
                    datePickerBlurTimeoutRef.current = setTimeout(() => {
                        datePickerBlurTimeoutRef.current = null;
                        // Check if the Fluent UI Calendar is still rendered in the DOM (as a portal/callout)
                        const calendarStillOpen = document.querySelector('.ms-Calendar-root') ||
                                                   document.querySelector('.ms-Calendar') ||
                                                   document.querySelector('.ms-DatePicker-callout');
                        if (calendarStillOpen) {
                            // Calendar is still open (user is navigating months/years), don't dismiss
                            return;
                        }
                        datePickerActiveRef.current = false;
                        setIsDatePickerActive(false);
                        handleBlur();
                    }, 300);
                },
                className: `enhanced-editor ${className} ${hasError ? 'has-error' : ''}`,
                autoFocus: true,
                placeholder: config.placeholder
            };

            // Date picker with clear button positioned over the calendar icon space
            return (
                <div style={{ position: 'relative', width: '100%', ...style }}>
                    <DatePicker
                        {...datePickerProps}
                        value={currentValue instanceof Date ? currentValue : 
                               currentValue ? new Date(currentValue) : undefined}
                        onSelectDate={(date) => {
                            // Clear any pending blur timeout so it doesn't race with this commit
                            if (datePickerBlurTimeoutRef.current) {
                                clearTimeout(datePickerBlurTimeoutRef.current);
                                datePickerBlurTimeoutRef.current = null;
                            }
                            datePickerActiveRef.current = false;
                            setIsDatePickerActive(false);
                            const formattedValue = config.valueFormatter ? 
                                config.valueFormatter(date, item, column) : 
                                date;
                            handleValueChange(formattedValue);
                            onCommit(formattedValue);
                        }}
                        formatDate={(date: Date | undefined) => date?.toLocaleDateString() || ''}
                        minDate={config.dateTimeConfig?.minDate}
                        maxDate={config.dateTimeConfig?.maxDate}
                        styles={{
                            root: { width: '100%' },
                            textField: {
                                fieldGroup: {
                                    border: '1px solid #0078d4',
                                    background: 'transparent',
                                    borderRadius: '2px',
                                    selectors: {
                                        ':hover': {
                                            border: '1px solid #0078d4'
                                        },
                                        ':focus': {
                                            border: '1px solid #0078d4'
                                        },
                                        ':active': {
                                            border: '1px solid #0078d4'
                                        }
                                    }
                                }
                            },
                            callout: {
                                // Make the calendar callout align properly
                                zIndex: 9999
                            },
                            icon: {
                                // Hide the visual calendar icon but keep its functionality
                                opacity: 0,
                                // Expand the clickable area to cover most of the text field (leaving space for clear button)
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: '20px', // Leave space for clear button
                                bottom: 0,
                                width: 'calc(100% - 20px)',
                                height: '100%',
                                background: 'transparent',
                                cursor: 'pointer',
                                zIndex: 1
                            }
                        }}
                        textField={{
                            // Disable text input completely and make it non-selectable
                            readOnly: true,
                            styles: {
                                fieldGroup: {
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    minHeight: 0,
                                    border: '1px solid #0078d4',
                                    borderRadius: '2px',
                                },
                                field: {
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    caretColor: 'transparent',
                                    fontSize: `${columnTextSize}px`,
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word',
                                }
                            }
                        }}
                    />
                    {/* Clear button positioned over the calendar icon space */}
                    <IconButton
                        iconProps={{ iconName: 'Clear' }}
                        title="Clear Date"
                        ariaLabel="Clear Date"
                        onClick={() => {
                            handleValueChange(null);
                            onCommit(null);
                        }}
                        styles={{
                            root: {
                                position: 'absolute',
                                top: '50%',
                                right: '4px',
                                transform: 'translateY(-50%)',
                                minWidth: '16px',
                                width: '16px',
                                height: '16px',
                                padding: 0,
                                zIndex: 2 // Above the calendar clickable area
                            },
                            icon: {
                                fontSize: '10px',
                                lineHeight: '16px',
                            }
                        }}
                    />
                </div>
            );

        case 'boolean':
            return (
                <Toggle
                    {...commonPropsBase}
                    checked={Boolean(currentValue)}
                    onChange={(_, checked) => {
                        handleValueChange(checked);
                        // Auto-commit boolean changes
                        setTimeout(() => {
                            const formattedValue = config.valueFormatter ? 
                                config.valueFormatter(checked, item, column) : 
                                checked;
                            onCommit(formattedValue);
                        }, 100);
                    }}
                />
            );

        case 'dropdown':
            if (isLoadingOptions) {
                return <div style={style}>Loading options...</div>;
            }
            
            // Filter options based on the current filter text for real-time filtering
            const filteredOptions = filterText 
                ? dropdownOptions.filter(opt => 
                    opt.text.toLowerCase().includes(filterText.toLowerCase())
                  )
                : dropdownOptions;

            // Calculate dynamic width based on all dropdown options
            const dynamicWidth = calculateDropdownWidth(dropdownOptions);
            
            // Get actual column width - prioritize currentWidth which reflects user resizing
            const columnWidth = column.currentWidth || column.calculatedWidth || column.minWidth || column.maxWidth || 150;
            const isNarrowColumn = columnWidth < 120;
            const isExtraNarrow = columnWidth < 80;
            
            // Calculate optimal dropdown width based on actual column size
            let dropdownMinWidth, dropdownMaxWidth;
            
            if (isNarrowColumn) {
                // For narrow columns, prioritize fitting content but stay reasonable
                dropdownMinWidth = Math.max(columnWidth + 50, 200); // At least 50px wider than column
                dropdownMaxWidth = 300;
            } else {
                // For wider columns, scale dropdown size proportionally with column width
                // Make dropdown size responsive to column width while respecting content needs
                const baseWidth = Math.max(columnWidth * 0.75, dynamicWidth); // Use 75% of column width or content width
                dropdownMinWidth = Math.max(baseWidth, 250);
                dropdownMaxWidth = Math.max(columnWidth * 1.2, 400); // Allow dropdown to be 20% wider than column
            }

            // Restricted dropdown enforcement: when AllowDirectTextInput is explicitly false, only
            // values present in the option list (or blank) may be committed. Typed values that are not
            // in the list are rejected and cleared. When AllowDirectTextInput is true or omitted, free
            // text is allowed (default behavior, unchanged).
            const isRestrictedDropdown = config.allowDirectTextInput === false;
            const resolveRestrictedDropdownValue = (val: any): { allowed: boolean; value: any } => {
                const raw = (val ?? '').toString().trim();
                if (raw === '') return { allowed: true, value: '' }; // clearing is always allowed
                // Don't enforce until options are available (avoids clearing during async option load)
                if (!dropdownOptions || dropdownOptions.length === 0) return { allowed: true, value: raw };
                const match = dropdownOptions.find(o =>
                    String(o.text ?? '').trim().toLowerCase() === raw.toLowerCase() ||
                    String(o.value ?? o.key ?? '').trim().toLowerCase() === raw.toLowerCase()
                );
                return match ? { allowed: true, value: (match.value ?? match.key) } : { allowed: false, value: '' };
            };
            const restrictedRejectMessage = (typed: any): string =>
                config.restrictedValueMessage || `"${(typed ?? '').toString().trim()}" is not a valid option`;

            // Geometric placement, positioned manually via a portal. Fluent's Callout mis-positions inside
            // Power Apps (its offsetParent-based math breaks under the host's CSS transforms), so we place the
            // list ourselves using on-screen pixel coordinates from getBoundingClientRect. We compare the cell
            // against the VISIBLE grid viewport (.virtualized-grid-body): if the list would extend past the
            // viewport bottom, anchor it to the cell TOP and grow upward; otherwise anchor to the cell BOTTOM
            // and grow downward. Works at any scroll position, not just the last row.
            let shouldFlipUp = false;
            let dropdownMenuStyle: React.CSSProperties = { position: 'fixed', visibility: 'hidden' };
            if (dropdownTarget) {
                const cellRect = dropdownTarget.getBoundingClientRect();
                const viewportEl = dropdownTarget.closest('.virtualized-grid-body') as HTMLElement | null;
                const winH = window.innerHeight || document.documentElement.clientHeight || 0;
                const winW = window.innerWidth || document.documentElement.clientWidth || 0;
                const viewRect: { top: number; bottom: number } = viewportEl
                    ? { top: viewportEl.getBoundingClientRect().top, bottom: viewportEl.getBoundingClientRect().bottom }
                    : { top: 0, bottom: winH };
                const itemHeight = isNarrowColumn ? 28 : 32;
                const estimatedListHeight = Math.min(300, Math.max(1, filteredOptions.length) * itemHeight + 8);
                // Vertical room measured from where the list is anchored: downward it starts at the cell's
                // TOP; upward it ends at the cell's BOTTOM.
                const spaceBelow = Math.max(0, viewRect.bottom - cellRect.top);
                const spaceAbove = Math.max(0, cellRect.bottom - viewRect.top);
                shouldFlipUp = (cellRect.top + estimatedListHeight > viewRect.bottom) && spaceAbove > spaceBelow;

                // Size the list to its content (with a small readable floor and a sensible cap) so it is
                // not forced as wide as the column when the options are short.
                const menuWidth = Math.max(120, Math.min(dropdownMaxWidth, dynamicWidth));
                // Anchor the list's LEFT edge to the cell's RIGHT edge so it opens to the right, covering the
                // columns to the right and never its own column (keeps the input text and error message clear).
                // Clamp to the viewport so a far-right cell's list still stays on-screen.
                const menuLeft = Math.max(4, Math.min(cellRect.right, winW - menuWidth - 4));
                const availableForMenu = shouldFlipUp ? spaceAbove : spaceBelow;
                const menuMaxHeight = Math.min(300, Math.max(80, availableForMenu - 8));

                dropdownMenuStyle = {
                    position: 'fixed',
                    left: Math.round(menuLeft),
                    width: Math.round(menuWidth),
                    maxHeight: Math.round(menuMaxHeight),
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    zIndex: 9999999,
                    background: '#ffffff',
                    border: '1px solid #d1d1d1',
                    borderRadius: 4,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    fontSize: isNarrowColumn ? `${Math.max(columnTextSize - 1, 10)}px` : `${columnTextSize}px`,
                    // Open beside the cell: top-aligned growing down, or bottom-aligned growing up near the
                    // bottom of the viewport. Fixed viewport coordinates.
                    ...(shouldFlipUp
                        ? { bottom: Math.round(winH - cellRect.bottom) }
                        : { top: Math.round(cellRect.top) }),
                };
            }

            // Custom dropdown implementation for reliable filtering
            return (
                <div 
                    ref={dropdownContainerRef}
                    style={{ 
                        position: 'relative',
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                    }}
                    className={`enhanced-editor-dropdown ${className} ${hasError ? 'has-error' : ''} ${isNarrowColumn ? 'narrow-column' : ''} ${isExtraNarrow ? 'extra-narrow' : ''}`}
                >
                    <TextField
                        {...commonProps}
                        value={filterText}
                        placeholder={undefined}
                        autoFocus={true}
                        multiline={true}
                        autoAdjustHeight={true}
                        rows={1}
                        resizable={false}
                        errorMessage={hasError ? errorMessage : undefined}
                        onChange={(_, newValue) => {
                            const searchText = newValue || '';
                            setFilterText(searchText);
                            setCurrentValue(searchText);
                            setIsDropdownOpen(true); // Show dropdown when typing
                        }}
                        onFocus={(e) => {
                            handleTextInputFocus(e);
                            setIsDropdownOpen(true); // Show dropdown on focus
                            setDropdownTarget(e.target as HTMLElement); // Set target for Callout positioning
                        }}
                        onBlur={(e) => {
                            // Delay to allow option selection
                            setTimeout(() => {
                                setIsDropdownOpen(false);
                                // Commit the current filter text as the value
                                const valueToCommit = filterText;
                                if (isRestrictedDropdown) {
                                    const result = resolveRestrictedDropdownValue(valueToCommit);
                                    if (!result.allowed) {
                                        // Reject: clear the invalid value and surface the message
                                        setFilterText('');
                                        setCurrentValue('');
                                        setHasError(true);
                                        setErrorMessage(restrictedRejectMessage(valueToCommit));
                                        onCommit('');
                                        return;
                                    }
                                    setHasError(false);
                                    setErrorMessage('');
                                    const formattedValue = config.valueFormatter ?
                                        config.valueFormatter(result.value, item, column) :
                                        result.value;
                                    onCommit(formattedValue);
                                    return;
                                }
                                if (validateValue(valueToCommit)) {
                                    const formattedValue = config.valueFormatter ? 
                                        config.valueFormatter(valueToCommit, item, column) : 
                                        valueToCommit;
                                    onCommit(formattedValue);
                                }
                            }, 150);
                        }}
                        onKeyDown={(e) => {
                            switch (e.key) {
                                case 'Enter':
                                    e.preventDefault();
                                    const valueToCommit = filterText;
                                    if (isRestrictedDropdown) {
                                        const result = resolveRestrictedDropdownValue(valueToCommit);
                                        if (!result.allowed) {
                                            // Reject: clear the typed value, show the message, and keep the
                                            // editor open with the list so the user can pick a valid option.
                                            setFilterText('');
                                            setCurrentValue('');
                                            setHasError(true);
                                            setErrorMessage(restrictedRejectMessage(valueToCommit));
                                            setIsDropdownOpen(true);
                                            break;
                                        }
                                        setIsDropdownOpen(false);
                                        setHasError(false);
                                        setErrorMessage('');
                                        const restrictedFormatted = config.valueFormatter ?
                                            config.valueFormatter(result.value, item, column) :
                                            result.value;
                                        if (onCommitAndAdvance) {
                                            onCommitAndAdvance(restrictedFormatted);
                                        } else {
                                            onCommit(restrictedFormatted);
                                        }
                                        break;
                                    }
                                    setIsDropdownOpen(false);
                                    if (validateValue(valueToCommit)) {
                                        const formattedValue = config.valueFormatter ? 
                                            config.valueFormatter(valueToCommit, item, column) : 
                                            valueToCommit;
                                        if (onCommitAndAdvance) {
                                            onCommitAndAdvance(formattedValue);
                                        } else {
                                            onCommit(formattedValue);
                                        }
                                    }
                                    break;
                                case 'Escape':
                                    e.preventDefault();
                                    setIsDropdownOpen(false);
                                    onCancel();
                                    break;
                                case 'ArrowDown':
                                    e.preventDefault();
                                    setIsDropdownOpen(true);
                                    break;
                            }
                        }}
                    />
                    
                    {/* Dropdown arrow */}
                    <div 
                        className="enhanced-dropdown-arrow"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        ▼
                    </div>
                    
                    {/* Searchable dropdown list, portaled to <body> and positioned manually with fixed
                        on-screen coordinates so Power Apps' CSS transforms cannot clip or mis-place it. */}
                    {isDropdownOpen && filteredOptions.length > 0 && dropdownTarget && ReactDOM.createPortal(
                        <div
                            ref={dropdownListRef}
                            className={`enhanced-dropdown-list ${isNarrowColumn ? 'narrow-column-dropdown' : ''}`}
                            style={dropdownMenuStyle}
                        >
                            {filteredOptions.map((option, index) => (
                                <div
                                    key={option.key}
                                    className={`enhanced-dropdown-item ${isNarrowColumn ? 'narrow-column-item' : ''}`}
                                    style={{
                                        fontSize: isNarrowColumn ? `${Math.max(columnTextSize - 1, 10)}px` : `${columnTextSize}px`,
                                        whiteSpace: isNarrowColumn ? 'normal' : 'nowrap',
                                        wordWrap: isNarrowColumn ? 'break-word' : 'normal',
                                        lineHeight: isNarrowColumn ? '1.3' : '1.5'
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent blur
                                        const selectedValue = option.value || option.key;
                                        setFilterText(option.text);
                                        setCurrentValue(selectedValue);
                                        setIsDropdownOpen(false);

                                        // Commit and advance focus to the next editable cell to the
                                        // right (same behavior as pressing Enter).
                                        const formattedValue = config.valueFormatter ? 
                                            config.valueFormatter(selectedValue, item, column) : 
                                            selectedValue;
                                        if (onCommitAndAdvance) {
                                            onCommitAndAdvance(formattedValue);
                                        } else {
                                            onCommit(formattedValue);
                                        }

                                        // Trigger conditional logic AFTER commit with a delay to ensure state is updated
                                        setTimeout(() => {
                                            handleConditionalTrigger('onChange', selectedValue);
                                        }, 100);
                                    }}
                                >
                                    {option.text}
                                </div>
                            ))}
                        </div>,
                        document.body
                    )}
                </div>
            );

        case 'autocomplete':
            // For now, fallback to text input with suggestions
            // TODO: Implement proper autocomplete functionality
            return (
                <TextField
                    {...commonProps}
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => handleValueChange(newValue)}
                    onBlur={handleBlur}
                    errorMessage={errorMessage}
                />
            );

        case 'slider':
            const sliderConfig = config.sliderConfig || { min: 0, max: 100, step: 1 };
            return (
                <div style={style}>
                    <Slider
                        min={sliderConfig.min}
                        max={sliderConfig.max}
                        step={sliderConfig.step}
                        value={Number(currentValue) || sliderConfig.min}
                        onChange={(value) => handleValueChange(value)}
                        onChanged={(value) => {
                            const formattedValue = config.valueFormatter ? 
                                config.valueFormatter(value, item, column) : 
                                value;
                            onCommit(formattedValue);
                        }}
                        showValue={sliderConfig.showValue}
                        valueFormat={sliderConfig.valueFormat}
                        {...commonPropsBase}
                    />
                </div>
            );

        case 'rating':
            const ratingConfig = config.ratingConfig || { max: 5, allowZero: true };
            return (
                <Rating
                    {...commonPropsBase}
                    rating={Number(currentValue) || 0}
                    max={ratingConfig.max}
                    allowZeroStars={ratingConfig.allowZero}
                    onChange={(_, rating) => {
                        handleValueChange(rating);
                        // Auto-commit rating changes
                        setTimeout(() => {
                            const formattedValue = config.valueFormatter ? 
                                config.valueFormatter(rating, item, column) : 
                                rating;
                            onCommit(formattedValue);
                        }, 100);
                    }}
                    icon={ratingConfig.iconName}
                />
            );

        case 'color':
            return (
                <ColorPicker
                    {...commonPropsBase}
                    color={currentValue || '#000000'}
                    onChange={(_, color) => {
                        const colorValue = color.str;
                        handleValueChange(colorValue);
                        // Auto-commit color changes
                        setTimeout(() => {
                            const formattedValue = config.valueFormatter ? 
                                config.valueFormatter(colorValue, item, column) : 
                                colorValue;
                            onCommit(formattedValue);
                        }, 100);
                    }}
                />
            );

        case 'custom':
            if (config.customConfig?.component) {
                const CustomComponent = config.customConfig.component as React.ComponentType<any>;
                return React.createElement(CustomComponent, {
                    value: currentValue,
                    onChange: handleValueChange,
                    onCommit: (value: any) => {
                        const formattedValue = config.valueFormatter ? 
                            config.valueFormatter(value, item, column) : 
                            value;
                        onCommit(formattedValue);
                    },
                    onCancel: onCancel,
                    column: column,
                    item: item,
                    isReadOnly: config.editLock,
                    config: config.customConfig.props,
                    ...commonProps
                });
            }
            // Fallback to text editor
            return (
                <TextField
                    {...commonProps}
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => handleValueChange(newValue)}
                    onBlur={handleBlur}
                    errorMessage={errorMessage}
                />
            );

        default:
            // Default text editor
            return (
                <TextField
                    {...commonProps}
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => handleValueChange(newValue)}
                    onBlur={handleBlur}
                    errorMessage={errorMessage}
                />
            );
    }
};
