import * as React from 'react';
import { TextField, IconButton, Dropdown, IDropdownOption, DatePicker, Toggle, ITextField } from '@fluentui/react';
import { CellTypes, FilterTypes } from '../ManifestConstants';

export interface InlineEditorProps {
    value: any;
    cellType?: string;
    column: any;
    rowIndex: number;
    columnKey: string;
    availableValues?: string[];
    isEditing: boolean;
    onStartEdit: () => void;
    onCommitEdit: (newValue: any) => void;
    onCancelEdit: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    style?: React.CSSProperties;
    className?: string;
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
    value,
    cellType,
    column,
    rowIndex,
    columnKey,
    availableValues,
    isEditing,
    onStartEdit,
    onCommitEdit,
    onCancelEdit,
    onKeyDown,
    onFocus,
    onBlur,
    style,
    className,
}) => {
    const [editValue, setEditValue] = React.useState<any>(value);
    const [isInvalid, setIsInvalid] = React.useState(false);
    const inputRef = React.useRef<ITextField>(null);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionStart(0);
            inputRef.current.setSelectionEnd(inputRef.current.value?.length || 0);
        }
    }, [isEditing]);

    React.useEffect(() => {
        setEditValue(value);
        setIsInvalid(false);
    }, [value]);

    const handleCommit = React.useCallback(() => {
        if (validateValue(editValue, cellType)) {
            onCommitEdit(editValue);
        }
    }, [editValue, cellType, onCommitEdit]);

    const handleCancel = React.useCallback(() => {
        setEditValue(value);
        setIsInvalid(false);
        onCancelEdit();
    }, [value, onCancelEdit]);

    const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    e.stopPropagation();
                    handleCommit();
                    break;
                case 'Escape':
                    e.preventDefault();
                    e.stopPropagation();
                    handleCancel();
                    break;
                case 'Tab':
                    e.preventDefault();
                    e.stopPropagation();
                    handleCommit();
                    if (onKeyDown) onKeyDown(e);
                    break;
                default:
                    if (onKeyDown) onKeyDown(e);
                    break;
            }
        },
        [handleCommit, handleCancel, onKeyDown],
    );

    const handleChange = React.useCallback(
        (newValue: any) => {
            setEditValue(newValue);
            setIsInvalid(!validateValue(newValue, cellType));
        },
        [cellType],
    );

    const validateValue = (val: any, type?: string): boolean => {
        if (val === null || val === undefined || val === '') return true;

        switch (type?.toLowerCase()) {
            case FilterTypes.Number:
            case 'number':
                return !isNaN(Number(val));
            case FilterTypes.Date:
            case 'date':
                return !isNaN(Date.parse(val));
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
            case 'url':
                try {
                    new URL(val);
                    return true;
                } catch {
                    return false;
                }
            default:
                return true;
        }
    };

    const renderEditor = () => {
        const commonProps = {
            value: editValue || '',
            onKeyDown: handleKeyDown,
            onFocus,
            onBlur,
            componentRef: inputRef,
            styles: {
                field: {
                    fontSize: '14px',
                    border: isInvalid ? '2px solid #d13438' : '2px solid #0078d4',
                    borderRadius: '2px',
                },
            },
        };

        switch (cellType?.toLowerCase()) {
            case FilterTypes.Boolean:
            case 'boolean':
            case 'twooptions':
                return (
                    <Toggle
                        checked={editValue === true || editValue === 'true' || editValue === '1'}
                        onChange={(_, checked) => handleChange(checked)}
                        onKeyDown={handleKeyDown}
                        styles={{
                            root: { marginTop: '4px' },
                        }}
                    />
                );

            case FilterTypes.Date:
            case 'date':
                return (
                    <DatePicker
                        value={editValue ? new Date(editValue) : undefined}
                        onSelectDate={(date) => handleChange(date?.toISOString())}
                        formatDate={(date) => (date ? date.toLocaleDateString() : '')}
                        placeholder="Select date..."
                        styles={{
                            textField: commonProps.styles,
                        }}
                    />
                );

            case FilterTypes.Choice:
            case 'choice':
            case 'optionset':
                if (availableValues && availableValues.length > 0) {
                    const options: IDropdownOption[] = availableValues.map((val) => ({
                        key: val,
                        text: val,
                    }));

                    return (
                        <Dropdown
                            selectedKey={editValue}
                            options={options}
                            onChange={(_, option) => handleChange(option?.key)}
                            placeholder="Select option..."
                            styles={{
                                dropdown: commonProps.styles.field,
                            }}
                        />
                    );
                }
                break;

            case 'multichoice':
                if (availableValues && availableValues.length > 0) {
                    const options: IDropdownOption[] = availableValues.map((val) => ({
                        key: val,
                        text: val,
                    }));

                    const selectedKeys = Array.isArray(editValue)
                        ? editValue
                        : editValue
                          ? editValue
                                .toString()
                                .split(',')
                                .map((s: string) => s.trim())
                          : [];

                    return (
                        <Dropdown
                            multiSelect
                            selectedKeys={selectedKeys}
                            options={options}
                            onChange={(_, option) => {
                                if (option) {
                                    const newSelection = option.selected
                                        ? [...selectedKeys, option.key]
                                        : selectedKeys.filter((k: any) => k !== option.key);
                                    handleChange(newSelection);
                                }
                            }}
                            placeholder="Select options..."
                            styles={{
                                dropdown: commonProps.styles.field,
                            }}
                        />
                    );
                }
                break;

            case FilterTypes.Number:
            case 'number':
                return (
                    <TextField
                        {...commonProps}
                        type="number"
                        onChange={(_, newValue) => handleChange(newValue)}
                        placeholder="Enter number..."
                    />
                );

            default:
                return (
                    <TextField
                        {...commonProps}
                        multiline={column?.isMultiline || false}
                        rows={column?.isMultiline ? 3 : 1}
                        onChange={(_, newValue) => handleChange(newValue)}
                        placeholder="Enter text..."
                    />
                );
        }

        // Fallback to text input
        return (
            <TextField
                {...commonProps}
                onChange={(_, newValue) => handleChange(newValue)}
                placeholder="Enter value..."
            />
        );
    };

    if (!isEditing) {
        return (
            <div
                style={{
                    ...style,
                    cursor: 'pointer',
                    padding: '8px',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                }}
                className={className}
                onClick={onStartEdit}
                onDoubleClick={onStartEdit}
            >
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{formatDisplayValue(value, cellType)}</span>
            </div>
        );
    }

    return (
        <div
            style={{
                ...style,
                padding: '4px',
                position: 'relative',
                zIndex: 1000,
            }}
            className={className}
        >
            {renderEditor()}
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <IconButton
                    iconProps={{ iconName: 'Accept' }}
                    title="Commit changes"
                    onClick={handleCommit}
                    styles={{
                        root: { minWidth: '24px', height: '24px' },
                        icon: { fontSize: '12px', color: '#107c10' },
                    }}
                />
                <IconButton
                    iconProps={{ iconName: 'Cancel' }}
                    title="Cancel changes"
                    onClick={handleCancel}
                    styles={{
                        root: { minWidth: '24px', height: '24px' },
                        icon: { fontSize: '12px', color: '#d13438' },
                    }}
                />
            </div>
        </div>
    );
};

const formatDisplayValue = (value: any, cellType?: string): string => {
    if (value === null || value === undefined) return '';

    switch (cellType?.toLowerCase()) {
        case FilterTypes.Boolean:
        case 'boolean':
        case 'twooptions':
            return value === true || value === 'true' || value === '1' ? 'Yes' : 'No';
        case FilterTypes.Date:
        case 'date':
            try {
                return new Date(value).toLocaleDateString();
            } catch {
                return value.toString();
            }
        case 'multichoice':
            return Array.isArray(value) ? value.join(', ') : value.toString();
        default:
            return value.toString();
    }
};
