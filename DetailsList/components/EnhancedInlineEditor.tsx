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
import { IColumn } from '@fluentui/react/lib/DetailsList';
import { 
    ColumnEditorType, 
    ColumnEditorConfig, 
    DropdownOption,
    AutocompleteOption,
    CustomEditorProps 
} from '../types/ColumnEditor.types';

export interface EnhancedInlineEditorProps {
    value: any;
    column: IColumn;
    item: any;
    editorConfig?: ColumnEditorConfig;
    onCommit: (value: any) => void;
    onCancel: () => void;
    onValueChange?: (value: any) => void;
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
    style,
    className = ''
}) => {
    const [currentValue, setCurrentValue] = React.useState<any>(value);
    const [hasError, setHasError] = React.useState<boolean>(false);
    const [errorMessage, setErrorMessage] = React.useState<string>('');
    const [dropdownOptions, setDropdownOptions] = React.useState<DropdownOption[]>([]);
    const [autocompleteOptions, setAutocompleteOptions] = React.useState<AutocompleteOption[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = React.useState<boolean>(false);
    const [isAddingNew, setIsAddingNew] = React.useState<boolean>(false);
    const [newItemText, setNewItemText] = React.useState<string>('');

    // Default editor config if none provided
    const config: ColumnEditorConfig = editorConfig || {
        type: 'text',
        isReadOnly: false,
        isRequired: false
    };

    React.useEffect(() => {
        setCurrentValue(value);
    }, [value]);

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

    const handleBlur = React.useCallback(() => {
        if (!hasError) {
            const formattedValue = config.valueFormatter ? 
                config.valueFormatter(currentValue, item, column) : 
                currentValue;
            onCommit(formattedValue);
        }
    }, [hasError, currentValue, onCommit, config, item, column]);

    const handleValueChange = React.useCallback((newValue: any) => {
        setCurrentValue(newValue);
        onValueChange?.(newValue);
        validateValue(newValue);
    }, [onValueChange, validateValue]);

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
            return (
                <SpinButton
                    {...commonProps}
                    value={String(currentValue || '')}
                    onValidate={(value) => {
                        const numValue = Number(value);
                        handleValueChange(numValue);
                        return String(numValue);
                    }}
                    onBlur={handleBlur}
                    min={config.numberConfig?.min}
                    max={config.numberConfig?.max}
                    step={config.numberConfig?.step || 1}
                    incrementButtonAriaLabel="Increase value by 1"
                    decrementButtonAriaLabel="Decrease value by 1"
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
            return (
                <TextField
                    {...commonProps}
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => {
                        const cleanValue = newValue?.replace(/[^\d.-]/g, '') || '';
                        handleValueChange(cleanValue);
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
            return (
                <DatePicker
                    {...commonProps}
                    value={currentValue instanceof Date ? currentValue : 
                           currentValue ? new Date(currentValue) : undefined}
                    onSelectDate={(date) => {
                        handleValueChange(date);
                        if (date) {
                            // Auto-commit on date selection
                            setTimeout(() => {
                                const formattedValue = config.valueFormatter ? 
                                    config.valueFormatter(date, item, column) : 
                                    date;
                                onCommit(formattedValue);
                            }, 100);
                        }
                    }}
                    formatDate={(date) => date?.toLocaleDateString() || ''}
                    minDate={config.dateTimeConfig?.minDate}
                    maxDate={config.dateTimeConfig?.maxDate}
                />
            );

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

            // If in "add new" mode, show text input instead of dropdown
            if (isAddingNew) {
                return (
                    <TextField
                        {...commonProps}
                        value={newItemText}
                        placeholder="Enter new value..."
                        onChange={(_, newValue) => setNewItemText(newValue || '')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (newItemText.trim()) {
                                    handleValueChange(newItemText.trim());
                                    setIsAddingNew(false);
                                    setNewItemText('');
                                }
                            } else if (e.key === 'Escape') {
                                setIsAddingNew(false);
                                setNewItemText('');
                                onCancel();
                            }
                        }}
                        autoFocus
                        style={{
                            ...commonProps.style,
                            minWidth: '120px',
                            width: '100%'
                        }}
                    />
                );
            }
            
            let dropdownOptionsFormatted: IDropdownOption[] = dropdownOptions.map(opt => ({
                key: opt.key,
                text: opt.text,
                disabled: opt.disabled,
                selected: opt.value === currentValue,
                data: opt
            }));

            // Add "Add New +" option if AllowDirectTextInput is enabled
            if (config.allowDirectTextInput) {
                dropdownOptionsFormatted.push({
                    key: '__ADD_NEW__',
                    text: '+ Add New...',
                    data: { isAddNew: true }
                });
            }

            return (
                <Dropdown
                    {...commonProps}
                    options={dropdownOptionsFormatted}
                    selectedKey={currentValue}
                    placeholder={config.placeholder || "Select an option..."}
                    style={{ 
                        ...commonProps.style,
                        minWidth: '120px', // Ensure minimum width for visibility
                        width: '100%'
                    }}
                    onChange={(_, option) => {
                        // Check if user selected "Add New +" option
                        if (option?.key === '__ADD_NEW__') {
                            setIsAddingNew(true);
                            setNewItemText(typeof currentValue === 'string' ? currentValue : '');
                            return;
                        }

                        const newValue = option?.data?.value || option?.key;
                        handleValueChange(newValue);
                        // Auto-commit dropdown selections
                        setTimeout(() => {
                            const formattedValue = config.valueFormatter ? 
                                config.valueFormatter(newValue, item, column) : 
                                newValue;
                            onCommit(formattedValue);
                        }, 100);
                    }}
                />
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
