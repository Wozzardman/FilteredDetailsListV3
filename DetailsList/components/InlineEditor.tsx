import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { ComboBox, IComboBoxOption } from '@fluentui/react/lib/ComboBox';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { IColumn } from '@fluentui/react/lib/DetailsList';

export interface InlineEditorProps {
    value: any;
    column: IColumn;
    dataType?: 'string' | 'number' | 'date' | 'boolean' | 'choice';
    availableValues?: string[];
    isReadOnly?: boolean;
    onCommit: (value: any) => void;
    onCancel: () => void;
    onValueChange?: (value: any) => void;
    style?: React.CSSProperties;
    className?: string;
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
    value,
    column,
    dataType = 'string',
    availableValues = [],
    isReadOnly = false,
    onCommit,
    onCancel,
    onValueChange,
    style,
    className = ''
}) => {
    const [currentValue, setCurrentValue] = React.useState<any>(value);
    const [hasError, setHasError] = React.useState<boolean>(false);
    const [errorMessage, setErrorMessage] = React.useState<string>('');
    const [filterText, setFilterText] = React.useState<string>(typeof value === 'string' ? value : '');

    React.useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                event.stopPropagation();
                if (!hasError) {
                    onCommit(currentValue);
                }
                break;
            case 'Escape':
                event.preventDefault();
                event.stopPropagation();
                onCancel();
                break;
            case 'Tab':
                if (!hasError) {
                    onCommit(currentValue);
                }
                break;
        }
    }, [currentValue, hasError, onCommit, onCancel]);

    const handleBlur = React.useCallback(() => {
        if (!hasError) {
            onCommit(currentValue);
        }
    }, [currentValue, hasError, onCommit]);

    const validateValue = React.useCallback((val: any) => {
        setHasError(false);
        setErrorMessage('');

        if (dataType === 'number') {
            const numVal = parseFloat(val);
            if (val !== '' && (isNaN(numVal) || !isFinite(numVal))) {
                setHasError(true);
                setErrorMessage('Please enter a valid number');
                return false;
            }
        }

        if (dataType === 'date') {
            if (val !== '' && val !== null && !(val instanceof Date) && isNaN(Date.parse(val))) {
                setHasError(true);
                setErrorMessage('Please enter a valid date');
                return false;
            }
        }

        return true;
    }, [dataType]);

    const handleValueChange = React.useCallback((newValue: any) => {
        setCurrentValue(newValue);
        onValueChange?.(newValue);
        validateValue(newValue);
    }, [onValueChange, validateValue]);

    if (isReadOnly) {
        return (
            <div 
                className={`inline-editor read-only ${className}`}
                style={{ 
                    padding: '8px',
                    backgroundColor: '#f8f8f8',
                    cursor: 'not-allowed',
                    ...style 
                }}
            >
                {String(value || '')}
            </div>
        );
    }

    const commonProps = {
        style: { border: 'none', background: 'transparent', ...style },
        onKeyDown: handleKeyDown,
        onBlur: handleBlur,
        className: `inline-editor ${className} ${hasError ? 'has-error' : ''}`,
        autoFocus: true,
    };

    switch (dataType) {
        case 'number':
            return (
                <TextField
                    {...commonProps}
                    type="number"
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => handleValueChange(newValue)}
                    errorMessage={errorMessage}
                />
            );

        case 'date':
            return (
                <DatePicker
                    {...commonProps}
                    value={currentValue instanceof Date ? currentValue : new Date(currentValue)}
                    onSelectDate={(date) => handleValueChange(date)}
                    formatDate={(date) => date?.toLocaleDateString() || ''}
                    placeholder="Select a date..."
                />
            );

        case 'boolean':
            return (
                <Toggle
                    {...commonProps}
                    checked={Boolean(currentValue)}
                    onChange={(_, checked) => handleValueChange(checked)}
                    onText="Yes"
                    offText="No"
                />
            );

        case 'choice':
            // Use all available values as options - let ComboBox handle filtering
            const options: IComboBoxOption[] = availableValues.map(val => ({
                key: val,
                text: val
            }));
            
            // Calculate dynamic width based on all available values
            const longestText = availableValues.reduce((longest, current) => {
                return current.length > longest.length ? current : longest;
            }, '');
            
            const baseCharWidth = 7.5; // Average character width for 14px font
            const padding = 40; // ComboBox arrow + padding + borders
            let dynamicWidth = longestText.length * baseCharWidth + padding;
            
            // Apply reasonable bounds
            dynamicWidth = Math.max(90, Math.min(400, Math.round(dynamicWidth)));
            
            return (
                <ComboBox
                    options={options}
                    selectedKey={availableValues.includes(currentValue) ? currentValue : undefined}
                    text={filterText}
                    placeholder="Select or type an option..."
                    allowFreeform={true} // Enable typing custom text
                    autoComplete="on" // Enable built-in filtering
                    useComboBoxAsMenuWidth={true}
                    autoFocus={true}
                    openOnKeyboardFocus={true} // Open dropdown on single click/focus
                    calloutProps={{
                        directionalHint: 7, // Opens below the input
                        isBeakVisible: false,
                        doNotLayer: false
                    }}
                    className={`inline-editor ${className} ${hasError ? 'has-error' : ''}`}
                    style={{ 
                        border: 'none', 
                        background: 'transparent', 
                        minWidth: `${dynamicWidth}px`,
                        width: '100%',
                        ...style 
                    }}
                    onChange={(_, option, index, value) => {
                        if (option) {
                            // User selected an option from the dropdown
                            const selectedValue = option.key;
                            setCurrentValue(selectedValue);
                            setFilterText(option.text);
                            handleValueChange(selectedValue);
                            
                            // Auto-commit for basic inline editor
                            setTimeout(() => {
                                onCommit(selectedValue);
                            }, 100);
                        } else if (value !== undefined) {
                            // User typed text - update filter text for filtering
                            setFilterText(value);
                        }
                    }}
                    onPendingValueChanged={(_, pendingValue) => {
                        // Update filter text as user types to filter options
                        if (pendingValue !== undefined) {
                            setFilterText(String(pendingValue));
                        }
                    }}
                    onKeyDown={(e) => {
                        switch (e.key) {
                            case 'Enter':
                                e.preventDefault();
                                const valueToCommit = filterText;
                                setCurrentValue(valueToCommit);
                                onCommit(valueToCommit);
                                break;
                            case 'Escape':
                                e.preventDefault();
                                onCancel();
                                break;
                            case 'Tab':
                                const tabValueToCommit = filterText;
                                setCurrentValue(tabValueToCommit);
                                onCommit(tabValueToCommit);
                                break;
                        }
                    }}
                />
            );

        case 'string':
        default:
            return (
                <TextField
                    {...commonProps}
                    value={String(currentValue || '')}
                    onChange={(_, newValue) => handleValueChange(newValue)}
                    errorMessage={errorMessage}
                    multiline={column.data?.multiline || false}
                    rows={column.data?.multiline ? 3 : 1}
                />
            );
    }
};

export default InlineEditor;
