import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
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
            const options: IDropdownOption[] = availableValues.map(val => ({
                key: val,
                text: val
            }));
            
            return (
                <Dropdown
                    {...commonProps}
                    options={options}
                    selectedKey={currentValue}
                    onChange={(_, option) => handleValueChange(option?.key)}
                    placeholder="Select an option..."
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
