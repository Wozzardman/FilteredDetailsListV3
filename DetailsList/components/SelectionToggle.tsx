import * as React from 'react';
import { Toggle, IToggleStyles } from '@fluentui/react/lib/Toggle';
import { Icon } from '@fluentui/react/lib/Icon';
import { ITheme } from '@fluentui/react/lib/Styling';

export interface SelectionToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    theme?: ITheme;
    disabled?: boolean;
    selectedCount?: number;
}

/**
 * SelectionToggle - Toggle button to switch between grid mode and selection mode
 */
export const SelectionToggle: React.FC<SelectionToggleProps> = React.memo(({
    enabled,
    onChange,
    theme,
    disabled = false,
    selectedCount = 0
}) => {
    const handleChange = React.useCallback((ev: React.MouseEvent<HTMLElement>, checked?: boolean) => {
        onChange(!!checked);
    }, [onChange]);

    const toggleStyles: Partial<IToggleStyles> = React.useMemo(() => ({
        root: {
            marginBottom: 0,
            display: 'flex',
            alignItems: 'center'
        },
        label: {
            fontSize: '14px',
            fontWeight: 500,
            color: theme?.palette.neutralPrimary || '#323130',
            marginLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
        },
        container: {
            display: 'flex',
            alignItems: 'center'
        },
        pill: {
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: `2px solid ${enabled ? (theme?.palette.themePrimary || '#0078d4') : (theme?.palette.neutralSecondary || '#a19f9d')}`,
            backgroundColor: enabled ? (theme?.palette.themePrimary || '#0078d4') : (theme?.palette.neutralLighter || '#f3f2f1'),
            transition: 'all 0.15s ease-in-out',
            ':hover': {
                borderColor: theme?.palette.themePrimary || '#0078d4'
            },
            ':focus': {
                outline: `2px solid ${theme?.palette.themePrimary || '#0078d4'}`,
                outlineOffset: '2px'
            }
        },
        thumb: {
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: theme?.palette.white || '#ffffff',
            transform: enabled ? 'translateX(20px)' : 'translateX(2px)',
            transition: 'transform 0.15s ease-in-out',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
        }
    }), [enabled, theme]);

    const labelContent = React.useMemo(() => {
        return (
            <>
                <Icon 
                    iconName={enabled ? "CheckboxComposite" : "ViewAll"} 
                    style={{ 
                        fontSize: '16px',
                        color: enabled ? (theme?.palette.themePrimary || '#0078d4') : (theme?.palette.neutralSecondary || '#a19f9d')
                    }} 
                />
                {enabled ? 'Selection Mode' : 'Grid Mode'}
                {enabled && selectedCount > 0 && (
                    <span className="selection-count-badge">
                        {selectedCount}
                    </span>
                )}
            </>
        );
    }, [enabled, theme, selectedCount]);

    return (
        <div className="selection-toggle-container">
            <Toggle
                checked={enabled}
                onChange={handleChange}
                disabled={disabled}
                styles={toggleStyles}
                label={labelContent}
                inlineLabel={true}
                ariaLabel={`${enabled ? 'Disable' : 'Enable'} selection mode`}
            />
        </div>
    );
});

SelectionToggle.displayName = 'SelectionToggle';

/**
 * SelectionModeToolbar - Toolbar that appears when selection mode is active
 */
export interface SelectionModeToolbarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onClearAll: () => void;
    onDisableSelectionMode: () => void;
    theme?: ITheme;
    customActions?: React.ReactNode;
}

export const SelectionModeToolbar: React.FC<SelectionModeToolbarProps> = React.memo(({
    selectedCount,
    totalCount,
    onSelectAll,
    onClearAll,
    onDisableSelectionMode,
    theme,
    customActions
}) => {
    const selectionPercentage = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;

    return (
        <div className="selection-actions">
            <button 
                className="selection-toggle-button"
                onClick={onDisableSelectionMode}
                title="Exit selection mode"
            >
                <Icon iconName="Cancel" />
                Exit Selection
            </button>
            
            <div className="selection-summary">
                <strong>{selectedCount}</strong> of <strong>{totalCount}</strong> selected 
                ({selectionPercentage}%)
            </div>

            {selectedCount < totalCount && (
                <button 
                    className="selection-toggle-button"
                    onClick={onSelectAll}
                    title="Select all items"
                >
                    <Icon iconName="SelectAll" />
                    Select All
                </button>
            )}

            {selectedCount > 0 && (
                <button 
                    className="selection-toggle-button"
                    onClick={onClearAll}
                    title="Clear all selections"
                >
                    <Icon iconName="Clear" />
                    Clear All
                </button>
            )}

            {customActions && (
                <div className="selection-custom-actions">
                    {customActions}
                </div>
            )}
        </div>
    );
});

SelectionModeToolbar.displayName = 'SelectionModeToolbar';
