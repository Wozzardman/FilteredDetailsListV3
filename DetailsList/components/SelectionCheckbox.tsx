import * as React from 'react';
import { Checkbox, ICheckboxStyles } from '@fluentui/react/lib/Checkbox';
import { ITheme } from '@fluentui/react/lib/Styling';

export interface SelectionCheckboxProps {
    checked: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    onChange: (checked: boolean) => void;
    theme?: ITheme;
    size?: 'small' | 'medium' | 'large';
}

/**
 * SelectionCheckbox - Optimized checkbox for row selection
 * Provides consistent styling and behavior for both header and row checkboxes
 */
export const SelectionCheckbox: React.FC<SelectionCheckboxProps> = React.memo(({
    checked,
    indeterminate = false,
    disabled = false,
    ariaLabel,
    onChange,
    theme,
    size = 'medium'
}) => {
    const handleChange = React.useCallback((ev?: React.FormEvent<HTMLElement | HTMLInputElement>, isChecked?: boolean) => {
        onChange(!!isChecked);
    }, [onChange]);

    const checkboxStyles: Partial<ICheckboxStyles> = React.useMemo(() => ({
        root: {
            margin: 0,
            padding: size === 'small' ? '2px' : '4px',
            minHeight: size === 'small' ? '16px' : size === 'medium' ? '20px' : '24px',
            alignItems: 'center',
            justifyContent: 'center'
        },
        checkbox: {
            width: size === 'small' ? '14px' : size === 'medium' ? '16px' : '18px',
            height: size === 'small' ? '14px' : size === 'medium' ? '16px' : '18px',
            borderRadius: '2px',
            border: `1px solid ${theme?.palette.neutralSecondary || '#a19f9d'}`,
            backgroundColor: checked ? (theme?.palette.themePrimary || '#0078d4') : 'transparent',
            borderColor: checked ? (theme?.palette.themePrimary || '#0078d4') : (theme?.palette.neutralSecondary || '#a19f9d'),
            ':hover': {
                borderColor: theme?.palette.themePrimary || '#0078d4',
                backgroundColor: checked ? (theme?.palette.themeDarkAlt || '#106ebe') : (theme?.palette.neutralLighter || '#f3f2f1')
            },
            ':focus': {
                outline: `2px solid ${theme?.palette.themePrimary || '#0078d4'}`,
                outlineOffset: '2px'
            }
        },
        checkmark: {
            color: theme?.palette.white || '#ffffff',
            fontSize: size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px',
            fontWeight: 600
        },
        text: {
            display: 'none' // Hide text for selection checkboxes
        }
    }), [checked, theme, size]);

    return (
        <Checkbox
            checked={checked}
            indeterminate={indeterminate}
            disabled={disabled}
            onChange={handleChange}
            ariaLabel={ariaLabel}
            styles={checkboxStyles}
            title={ariaLabel}
        />
    );
});

SelectionCheckbox.displayName = 'SelectionCheckbox';

/**
 * HeaderSelectionCheckbox - Specialized checkbox for select all functionality
 */
export interface HeaderSelectionCheckboxProps {
    selectAllState: 'none' | 'some' | 'all';
    disabled?: boolean;
    onToggleSelectAll: () => void;
    theme?: ITheme;
    selectedCount: number;
    totalCount: number;
}

export const HeaderSelectionCheckbox: React.FC<HeaderSelectionCheckboxProps> = React.memo(({
    selectAllState,
    disabled = false,
    onToggleSelectAll,
    theme,
    selectedCount,
    totalCount
}) => {
    const checked = selectAllState === 'all';
    const indeterminate = selectAllState === 'some';
    
    const ariaLabel = React.useMemo(() => {
        if (selectAllState === 'all') {
            return `Deselect all ${totalCount} items`;
        } else if (selectAllState === 'some') {
            return `${selectedCount} of ${totalCount} items selected. Click to select all`;
        } else {
            return `Select all ${totalCount} items`;
        }
    }, [selectAllState, selectedCount, totalCount]);

    const handleChange = React.useCallback(() => {
        if (!disabled) {
            onToggleSelectAll();
        }
    }, [disabled, onToggleSelectAll]);

    return (
        <div className="selection-header-container">
            <SelectionCheckbox
                checked={checked}
                indeterminate={indeterminate}
                disabled={disabled}
                ariaLabel={ariaLabel}
                onChange={handleChange}
                theme={theme}
                size="medium"
            />
        </div>
    );
});

HeaderSelectionCheckbox.displayName = 'HeaderSelectionCheckbox';

/**
 * RowSelectionCheckbox - Specialized checkbox for individual row selection
 */
export interface RowSelectionCheckboxProps {
    itemId: string;
    selected: boolean;
    disabled?: boolean;
    onToggleSelection: (itemId: string) => void;
    theme?: ITheme;
    rowIndex?: number;
}

export const RowSelectionCheckbox: React.FC<RowSelectionCheckboxProps> = React.memo(({
    itemId,
    selected,
    disabled = false,
    onToggleSelection,
    theme,
    rowIndex
}) => {
    const ariaLabel = `Select row ${rowIndex !== undefined ? rowIndex + 1 : ''} (${itemId})`;

    const handleChange = React.useCallback(() => {
        if (!disabled) {
            onToggleSelection(itemId);
        }
    }, [disabled, itemId, onToggleSelection]);

    return (
        <div className={`selection-row-container ${selected ? 'selected' : ''}`}>
            <SelectionCheckbox
                checked={selected}
                disabled={disabled}
                ariaLabel={ariaLabel}
                onChange={handleChange}
                theme={theme}
                size="small"
            />
        </div>
    );
});

RowSelectionCheckbox.displayName = 'RowSelectionCheckbox';
