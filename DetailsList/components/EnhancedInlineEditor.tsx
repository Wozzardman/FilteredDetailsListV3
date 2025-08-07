/**
 * Enhanced Column Editor System
 * Supports multiple editor types with column-specific configurations
 */

import * as React from 'react';
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
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
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

export interface EnhancedInlineEditorProps {
    value: any;
    column: IColumn;
    item: any;
    editorConfig?: ColumnEditorConfig;
    onCommit: (value: any) => void;
    onCancel: () => void;
    onValueChange?: (value: any) => void;
    onItemChange?: (columnKey: string, value: any) => void; // New: For conditional updates
    onTriggerAutoFillConfirmation?: (itemId: string) => void; // New: For triggering auto-fill confirmation
    allColumns?: Record<string, any>; // New: All column values for conditional logic
    columnEditorMapping?: ColumnEditorMapping; // New: All editor configurations for conditional logic
    style?: React.CSSProperties;
    className?: string;
}

export const EnhancedInlineEditor: React.FC<EnhancedInlineEditorProps> = ({
    value,
    column,
    item,
    editorConfig,
    onCommit,
    onCancel,
    onValueChange,
    onItemChange,
    onTriggerAutoFillConfirmation,
    allColumns,
    columnEditorMapping,
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
    const [dropdownTarget, setDropdownTarget] = React.useState<HTMLElement | null>(null);
    const [isDatePickerActive, setIsDatePickerActive] = React.useState<boolean>(false);

    // Default editor config if none provided
    const config: ColumnEditorConfig = editorConfig || {
        type: 'text',
        isReadOnly: false,
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

                console.log(`🔍 Processing conditional logic for ${column.key} = ${valueToUse}`);
                console.log(`📋 Dependent fields:`, dependentFields);
                console.log(`🔄 Current context:`, context.currentValues);

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
                                console.log(`⏸️ Auto-fill for ${dependentField} requires confirmation - will defer ALL auto-fill`);
                                hasPendingAutoFillConfirmations = true;
                            }
                        }
                    }
                }

                // Second pass: Apply updates based on whether confirmation is needed
                if (hasPendingAutoFillConfirmations) {
                    console.log(`🚫 Deferring ALL auto-fill updates due to confirmation requirement`);
                    // Don't apply any changes immediately - let the auto-fill confirmation system handle them all
                } else {
                    // Apply all changes immediately as no confirmation is required
                    for (const update of autoFillUpdates) {
                        console.log(`🔄 Auto-updating ${update.field} from ${allColumns[update.field]} to ${update.value}`);
                        onItemChange(update.field, update.value);
                    }
                }

                // If any dependent fields require confirmation, trigger the auto-fill confirmation system
                if (hasPendingAutoFillConfirmations && onTriggerAutoFillConfirmation) {
                    const itemId = item?.recordId || item?.key || item?.id || 'current-item';
                    console.log(`🎯 Triggering auto-fill confirmation for item ${itemId}, trigger field: ${column.key}, new value: ${valueToUse}`);
                    onTriggerAutoFillConfirmation(itemId);
                } else if (autoFillUpdates.length > 0) {
                    console.log(`ℹ️ No confirmation required for ${autoFillUpdates.length} auto-fill updates`);
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
            if (isDropdownOpen && dropdownContainerRef.current && 
                !dropdownContainerRef.current.contains(event.target as Node)) {
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
                    const formattedValue = config.valueFormatter ? 
                        config.valueFormatter(currentValue, item, column) : 
                        currentValue;
                    onCommit(formattedValue);
                }
                break;
            case 'Escape':
                event.preventDefault();
                event.stopPropagation();
                onCancel();
                break;
        }
    }, [hasError, currentValue, onCommit, onCancel, config, item, column]);

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

    const handleBlur = React.useCallback(() => {
        handleConditionalTrigger('onBlur');
        
        // For date picker, don't commit on blur if the calendar is being used
        if (config.type === 'date' && isDatePickerActive) {
            return;
        }
        
        if (!hasError) {
            const formattedValue = config.valueFormatter ? 
                config.valueFormatter(currentValue, item, column) : 
                currentValue;
            onCommit(formattedValue);
        }
    }, [hasError, currentValue, onCommit, config, item, column, handleConditionalTrigger, isDatePickerActive]);

    if (config.isReadOnly) {
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

    const commonProps = {
        style: { border: 'none', background: 'transparent', ...style },
        onKeyDown: handleKeyDown,
        onFocus: handleFocus,
        onBlur: handleBlur,
        className: `enhanced-editor ${className} ${hasError ? 'has-error' : ''}`,
        autoFocus: true,
        placeholder: config.placeholder
    };

    // Render appropriate editor based on type
    switch (config.type) {
        case 'text':
            return (
                <TextField
                    {...commonProps}
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => handleValueChange(newValue)}
                    errorMessage={errorMessage}
                    multiline={config.textConfig?.multiline}
                    rows={config.textConfig?.rows}
                    maxLength={config.textConfig?.maxLength}
                    onBlur={handleBlur}
                />
            );

        case 'number':
            const stepValue = config.numberConfig?.step || 1;
            return (
                <SpinButton
                    {...commonProps}
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
            // Create special props for DatePicker without the onBlur handler that interferes with date selection
            const datePickerProps = {
                style: { border: 'none', background: 'transparent', ...style },
                onKeyDown: handleKeyDown,
                onFocus: () => {
                    setIsDatePickerActive(true);
                    handleFocus();
                },
                // Custom onBlur that respects calendar interactions
                onBlur: () => {
                    // Delay the blur handling to allow calendar selection to complete
                    setTimeout(() => {
                        setIsDatePickerActive(false);
                        handleBlur();
                    }, 200);
                },
                className: `enhanced-editor ${className} ${hasError ? 'has-error' : ''}`,
                autoFocus: true,
                placeholder: config.placeholder
            };

            if (config.allowDirectTextInput) {
                // Date picker with clear button when direct text input is enabled
                return (
                    <Stack horizontal verticalAlign="center" style={style}>
                        <div 
                            style={{ flexGrow: 1 }}
                            onMouseDown={(e) => {
                                // Prevent parent cell from losing focus when clicking on date picker components
                                e.stopPropagation();
                                setIsDatePickerActive(true);
                            }}
                        >
                            <DatePicker
                                {...datePickerProps}
                                value={currentValue instanceof Date ? currentValue : 
                                       currentValue ? new Date(currentValue) : undefined}
                                onSelectDate={(date) => {
                                    setCurrentValue(date);
                                    setIsDatePickerActive(false);
                                    
                                    // Commit immediately
                                    const formattedValue = config.valueFormatter ? 
                                        config.valueFormatter(date, item, column) : 
                                        date;
                                    onCommit(formattedValue);
                                    
                                    // Trigger conditional logic AFTER commit with a delay to ensure state is updated
                                    setTimeout(() => {
                                        handleConditionalTrigger('onChange', date);
                                    }, 100);
                                }}
                                formatDate={(date) => date?.toLocaleDateString() || ''}
                                minDate={config.dateTimeConfig?.minDate}
                                maxDate={config.dateTimeConfig?.maxDate}
                                styles={{
                                    root: { width: '100%' },
                                    textField: {
                                        fieldGroup: {
                                            border: 'none',
                                            background: 'transparent',
                                            selectors: {
                                                ':hover': {
                                                    border: 'none'
                                                },
                                                ':focus': {
                                                    border: 'none'
                                                },
                                                ':active': {
                                                    border: 'none'
                                                }
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <IconButton
                            iconProps={{ iconName: 'Clear' }}
                            title="Clear Date"
                            ariaLabel="Clear Date"
                            onClick={() => {
                                handleValueChange(null);
                                setTimeout(() => {
                                    onCommit(null);
                                }, 10);
                            }}
                            styles={{
                                root: {
                                    marginLeft: '4px',
                                    minWidth: '32px',
                                    height: '32px'
                                }
                            }}
                        />
                    </Stack>
                );
            } else {
                // Standard date picker without clear button
                return (
                    <div 
                        onMouseDown={(e) => {
                            // Prevent parent cell from losing focus when clicking on date picker components
                            e.stopPropagation();
                            setIsDatePickerActive(true);
                        }}
                        style={{ width: '100%' }}
                    >
                        <DatePicker
                            {...datePickerProps}
                            value={currentValue instanceof Date ? currentValue : 
                                   currentValue ? new Date(currentValue) : undefined}
                            onSelectDate={(date) => {
                                handleValueChange(date);
                                setIsDatePickerActive(false);
                                // Auto-commit on date selection
                                setTimeout(() => {
                                    const formattedValue = config.valueFormatter ? 
                                        config.valueFormatter(date, item, column) : 
                                        date;
                                    onCommit(formattedValue);
                                }, 10);
                            }}
                            formatDate={(date) => date?.toLocaleDateString() || ''}
                            minDate={config.dateTimeConfig?.minDate}
                            maxDate={config.dateTimeConfig?.maxDate}
                            styles={{
                                root: { width: '100%' },
                                textField: {
                                    fieldGroup: {
                                        border: 'none',
                                        background: 'transparent',
                                        selectors: {
                                            ':hover': {
                                                border: 'none'
                                            },
                                            ':focus': {
                                                border: 'none'
                                            },
                                            ':active': {
                                                border: 'none'
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                );
            }

        case 'boolean':
            return (
                <Toggle
                    {...commonProps}
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

            // Custom dropdown implementation for reliable filtering
            return (
                <div 
                    ref={dropdownContainerRef}
                    style={{ 
                        position: 'relative',
                        width: '100%', // Let it fill the available space like text inputs
                        ...commonProps.style 
                    }}
                    className={`enhanced-editor-dropdown ${className} ${hasError ? 'has-error' : ''} ${isNarrowColumn ? 'narrow-column' : ''} ${isExtraNarrow ? 'extra-narrow' : ''}`}
                >
                    <TextField
                        value={filterText}
                        placeholder={config.placeholder || "Type to search or select..."}
                        autoFocus={true}
                        onChange={(_, newValue) => {
                            const searchText = newValue || '';
                            setFilterText(searchText);
                            setCurrentValue(searchText);
                            setIsDropdownOpen(true); // Show dropdown when typing
                        }}
                        onFocus={(e) => {
                            setIsDropdownOpen(true); // Show dropdown on focus
                            setDropdownTarget(e.target as HTMLElement); // Set target for Callout positioning
                        }}
                        onBlur={(e) => {
                            // Delay to allow option selection
                            setTimeout(() => {
                                setIsDropdownOpen(false);
                                // Commit the current filter text as the value
                                const valueToCommit = filterText;
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
                                    setIsDropdownOpen(false);
                                    const valueToCommit = filterText;
                                    if (validateValue(valueToCommit)) {
                                        const formattedValue = config.valueFormatter ? 
                                            config.valueFormatter(valueToCommit, item, column) : 
                                            valueToCommit;
                                        onCommit(formattedValue);
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
                        styles={{
                            root: { width: '100%' },
                            field: { 
                                border: 'none', 
                                background: 'transparent',
                                fontSize: '13px'
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
                    
                    {/* Searchable Dropdown using Callout for proper positioning */}
                    {isDropdownOpen && filteredOptions.length > 0 && dropdownTarget && (
                        <Callout
                            target={dropdownTarget}
                            onDismiss={() => setIsDropdownOpen(false)}
                            directionalHint={DirectionalHint.rightTopEdge}
                            isBeakVisible={false}
                            styles={{
                                root: { zIndex: 999999 },
                                calloutMain: { 
                                    minWidth: dropdownMinWidth,
                                    maxWidth: dropdownMaxWidth,
                                    maxHeight: 300,
                                    border: '1px solid #d1d1d1',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                                    fontSize: isNarrowColumn ? '12px' : '14px'
                                }
                            }}
                        >
                            <div className={`enhanced-dropdown-list ${isNarrowColumn ? 'narrow-column-dropdown' : ''}`} style={{ border: 'none', boxShadow: 'none' }}>
                                {filteredOptions.map((option, index) => (
                                    <div
                                        key={option.key}
                                        className={`enhanced-dropdown-item ${isNarrowColumn ? 'narrow-column-item' : ''}`}
                                        style={{
                                            fontSize: isNarrowColumn ? '12px' : '14px',
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
                                            
                                            // Commit immediately
                                            const formattedValue = config.valueFormatter ? 
                                                config.valueFormatter(selectedValue, item, column) : 
                                                selectedValue;
                                            onCommit(formattedValue);
                                            
                                            // Trigger conditional logic AFTER commit with a delay to ensure state is updated
                                            setTimeout(() => {
                                                handleConditionalTrigger('onChange', selectedValue);
                                            }, 100);
                                        }}
                                    >
                                        {option.text}
                                    </div>
                                ))}
                            </div>
                        </Callout>
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
                        {...commonProps}
                    />
                </div>
            );

        case 'rating':
            const ratingConfig = config.ratingConfig || { max: 5, allowZero: true };
            return (
                <Rating
                    {...commonProps}
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
                    {...commonProps}
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
                    isReadOnly: config.isReadOnly,
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
