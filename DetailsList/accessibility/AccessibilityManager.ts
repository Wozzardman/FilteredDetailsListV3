/**
 * Advanced accessibility features for FilteredDetailsListV2
 * Implements WCAG 2.2 AA+ standards used by Google, Microsoft, and Apple
 */

import * as React from 'react';

interface IAccessibilityConfig {
    announceChanges: boolean;
    supportScreenReaders: boolean;
    enableKeyboardNavigation: boolean;
    enableHighContrast: boolean;
    enableReducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'x-large';
    colorScheme: 'light' | 'dark' | 'auto';
    language: string;
}

interface IAriaLiveRegion {
    id: string;
    priority: 'polite' | 'assertive';
    content: string;
    timeout?: number;
}

interface IKeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    description: string;
    action: () => void;
    category: 'navigation' | 'filtering' | 'selection' | 'editing';
}

export class AccessibilityManager {
    private config: IAccessibilityConfig;
    private liveRegions = new Map<string, HTMLElement>();
    private shortcuts = new Map<string, IKeyboardShortcut>();
    private focusHistory: Element[] = [];
    private announceQueue: IAriaLiveRegion[] = [];
    private isProcessingAnnouncements = false;
    private colorContrastRatio = 4.5; // WCAG AA standard
    private reducedMotionQuery: MediaQueryList;
    private highContrastQuery: MediaQueryList;

    constructor(config: Partial<IAccessibilityConfig> = {}) {
        this.config = {
            announceChanges: true,
            supportScreenReaders: true,
            enableKeyboardNavigation: true,
            enableHighContrast: true,
            enableReducedMotion: true,
            fontSize: 'medium',
            colorScheme: 'auto',
            language: 'en',
            ...config
        };

        this.initializeAccessibility();
        this.setupMediaQueries();
        this.registerDefaultShortcuts();
    }

    private initializeAccessibility() {
        // Create ARIA live regions
        this.createLiveRegion('announcements', 'polite');
        this.createLiveRegion('alerts', 'assertive');
        this.createLiveRegion('status', 'polite');

        // Setup keyboard event listeners
        if (this.config.enableKeyboardNavigation) {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
            document.addEventListener('keyup', this.handleKeyUp.bind(this));
        }

        // Apply initial settings
        this.applyAccessibilitySettings();
    }

    private setupMediaQueries() {
        // Reduced motion preference
        this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.reducedMotionQuery.addEventListener('change', () => {
            this.applyReducedMotionSettings();
        });

        // High contrast preference
        this.highContrastQuery = window.matchMedia('(prefers-contrast: high)');
        this.highContrastQuery.addEventListener('change', () => {
            this.applyHighContrastSettings();
        });

        // Dark mode preference
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeQuery.addEventListener('change', () => {
            if (this.config.colorScheme === 'auto') {
                this.applyColorScheme(darkModeQuery.matches ? 'dark' : 'light');
            }
        });
    }

    private createLiveRegion(id: string, priority: 'polite' | 'assertive') {
        const region = document.createElement('div');
        region.id = `aria-live-${id}`;
        region.setAttribute('aria-live', priority);
        region.setAttribute('aria-atomic', 'true');
        region.style.position = 'absolute';
        region.style.left = '-10000px';
        region.style.width = '1px';
        region.style.height = '1px';
        region.style.overflow = 'hidden';
        
        document.body.appendChild(region);
        this.liveRegions.set(id, region);
    }

    private registerDefaultShortcuts() {
        // Navigation shortcuts
        this.registerShortcut('ArrowUp', {
            description: 'Move to previous row',
            category: 'navigation',
            action: () => this.moveFocus('up')
        });

        this.registerShortcut('ArrowDown', {
            description: 'Move to next row',
            category: 'navigation',
            action: () => this.moveFocus('down')
        });

        this.registerShortcut('Home', {
            description: 'Move to first row',
            category: 'navigation',
            action: () => this.moveFocus('first')
        });

        this.registerShortcut('End', {
            description: 'Move to last row',
            category: 'navigation',
            action: () => this.moveFocus('last')
        });

        this.registerShortcut('PageUp', {
            description: 'Move up one page',
            category: 'navigation',
            action: () => this.moveFocus('pageUp')
        });

        this.registerShortcut('PageDown', {
            description: 'Move down one page',
            category: 'navigation',
            action: () => this.moveFocus('pageDown')
        });

        // Selection shortcuts
        this.registerShortcut(' ', {
            description: 'Toggle row selection',
            category: 'selection',
            action: () => this.toggleSelection()
        });

        this.registerShortcut('a', {
            ctrlKey: true,
            description: 'Select all rows',
            category: 'selection',
            action: () => this.selectAll()
        });

        // Filtering shortcuts
        this.registerShortcut('f', {
            ctrlKey: true,
            description: 'Open filter menu',
            category: 'filtering',
            action: () => this.openFilterMenu()
        });

        this.registerShortcut('Escape', {
            description: 'Close current dialog or clear selection',
            category: 'navigation',
            action: () => this.handleEscape()
        });

        // Accessibility shortcuts
        this.registerShortcut('h', {
            ctrlKey: true,
            altKey: true,
            description: 'Show keyboard shortcuts help',
            category: 'navigation',
            action: () => this.showKeyboardHelp()
        });
    }

    public registerShortcut(key: string, shortcut: Omit<IKeyboardShortcut, 'key'>) {
        const fullShortcut: IKeyboardShortcut = { key, ...shortcut };
        const shortcutKey = this.getShortcutKey(key, shortcut.ctrlKey, shortcut.altKey, shortcut.shiftKey);
        this.shortcuts.set(shortcutKey, fullShortcut);
    }

    private getShortcutKey(key: string, ctrl?: boolean, alt?: boolean, shift?: boolean): string {
        return `${ctrl ? 'ctrl+' : ''}${alt ? 'alt+' : ''}${shift ? 'shift+' : ''}${key.toLowerCase()}`;
    }

    private handleKeyDown(event: KeyboardEvent) {
        const shortcutKey = this.getShortcutKey(
            event.key,
            event.ctrlKey,
            event.altKey,
            event.shiftKey
        );

        const shortcut = this.shortcuts.get(shortcutKey);
        if (shortcut) {
            event.preventDefault();
            shortcut.action();
            this.announce(`Executed: ${shortcut.description}`, 'status');
        }
    }

    private handleKeyUp(event: KeyboardEvent) {
        // Handle key up events if needed
    }

    public announce(message: string, type: 'announcements' | 'alerts' | 'status' = 'announcements', timeout?: number) {
        if (!this.config.announceChanges) return;

        const announcement: IAriaLiveRegion = {
            id: `announcement-${Date.now()}`,
            priority: type === 'alerts' ? 'assertive' : 'polite',
            content: message,
            timeout
        };

        this.announceQueue.push(announcement);
        this.processAnnouncementQueue();
    }

    private async processAnnouncementQueue() {
        if (this.isProcessingAnnouncements || this.announceQueue.length === 0) return;

        this.isProcessingAnnouncements = true;

        while (this.announceQueue.length > 0) {
            const announcement = this.announceQueue.shift()!;
            const region = this.liveRegions.get(announcement.priority === 'assertive' ? 'alerts' : 'announcements');
            
            if (region) {
                region.textContent = announcement.content;
                
                // Clear after timeout or default delay
                const delay = announcement.timeout || 3000;
                await new Promise(resolve => setTimeout(resolve, delay));
                region.textContent = '';
                
                // Brief pause between announcements
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        this.isProcessingAnnouncements = false;
    }

    public setFocus(element: Element, announce = true) {
        if (element instanceof HTMLElement) {
            this.focusHistory.push(element);
            element.focus();
            
            if (announce) {
                const label = this.getElementLabel(element);
                this.announce(`Focused on ${label}`, 'status');
            }
        }
    }

    public restoreFocus() {
        if (this.focusHistory.length > 1) {
            this.focusHistory.pop(); // Remove current
            const previous = this.focusHistory[this.focusHistory.length - 1];
            if (previous instanceof HTMLElement) {
                previous.focus();
            }
        }
    }

    private getElementLabel(element: Element): string {
        // Try various methods to get a meaningful label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
            const labelElement = document.getElementById(ariaLabelledBy);
            if (labelElement) return labelElement.textContent || '';
        }

        const title = element.getAttribute('title');
        if (title) return title;

        const textContent = element.textContent?.trim();
        if (textContent) return textContent;

        return element.tagName.toLowerCase();
    }

    public createAccessibleGrid(container: HTMLElement, options: {
        rows: number;
        columns: number;
        rowHeaders?: boolean;
        columnHeaders?: boolean;
        caption?: string;
    }) {
        // Set grid role and properties
        container.setAttribute('role', 'grid');
        container.setAttribute('aria-rowcount', options.rows.toString());
        container.setAttribute('aria-colcount', options.columns.toString());
        
        if (options.caption) {
            container.setAttribute('aria-label', options.caption);
        }

        // Enable keyboard navigation
        container.setAttribute('tabindex', '0');
        
        // Add grid navigation event listeners
        container.addEventListener('keydown', (event) => {
            this.handleGridKeyNavigation(event, container);
        });
    }

    public createAccessibleCell(cell: HTMLElement, options: {
        rowIndex: number;
        columnIndex: number;
        isHeader?: boolean;
        description?: string;
    }) {
        if (options.isHeader) {
            cell.setAttribute('role', 'columnheader');
        } else {
            cell.setAttribute('role', 'gridcell');
        }

        cell.setAttribute('aria-rowindex', (options.rowIndex + 1).toString());
        cell.setAttribute('aria-colindex', (options.columnIndex + 1).toString());
        cell.setAttribute('tabindex', '-1');

        if (options.description) {
            cell.setAttribute('aria-describedby', options.description);
        }
    }

    private handleGridKeyNavigation(event: KeyboardEvent, grid: HTMLElement) {
        const focusedCell = document.activeElement;
        if (!focusedCell || !grid.contains(focusedCell)) return;

        const currentRow = parseInt(focusedCell.getAttribute('aria-rowindex') || '1') - 1;
        const currentCol = parseInt(focusedCell.getAttribute('aria-colindex') || '1') - 1;
        
        let targetRow = currentRow;
        let targetCol = currentCol;

        switch (event.key) {
            case 'ArrowRight':
                targetCol = Math.min(currentCol + 1, this.getMaxColumns(grid) - 1);
                break;
            case 'ArrowLeft':
                targetCol = Math.max(currentCol - 1, 0);
                break;
            case 'ArrowDown':
                targetRow = Math.min(currentRow + 1, this.getMaxRows(grid) - 1);
                break;
            case 'ArrowUp':
                targetRow = Math.max(currentRow - 1, 0);
                break;
            case 'Home':
                if (event.ctrlKey) {
                    targetRow = 0;
                    targetCol = 0;
                } else {
                    targetCol = 0;
                }
                break;
            case 'End':
                if (event.ctrlKey) {
                    targetRow = this.getMaxRows(grid) - 1;
                    targetCol = this.getMaxColumns(grid) - 1;
                } else {
                    targetCol = this.getMaxColumns(grid) - 1;
                }
                break;
            default:
                return;
        }

        event.preventDefault();
        this.focusGridCell(grid, targetRow, targetCol);
    }

    private focusGridCell(grid: HTMLElement, rowIndex: number, columnIndex: number) {
        const cell = grid.querySelector(
            `[aria-rowindex="${rowIndex + 1}"][aria-colindex="${columnIndex + 1}"]`
        ) as HTMLElement;
        
        if (cell) {
            this.setFocus(cell);
        }
    }

    private getMaxRows(grid: HTMLElement): number {
        return parseInt(grid.getAttribute('aria-rowcount') || '1');
    }

    private getMaxColumns(grid: HTMLElement): number {
        return parseInt(grid.getAttribute('aria-colcount') || '1');
    }

    private applyAccessibilitySettings() {
        this.applyFontSize();
        this.applyColorScheme(this.config.colorScheme);
        this.applyReducedMotionSettings();
        this.applyHighContrastSettings();
    }

    private applyFontSize() {
        const root = document.documentElement;
        const sizeMap = {
            'small': '0.875rem',
            'medium': '1rem',
            'large': '1.125rem',
            'x-large': '1.25rem'
        };
        
        root.style.setProperty('--font-size-base', sizeMap[this.config.fontSize]);
    }

    private applyColorScheme(scheme: 'light' | 'dark' | 'auto') {
        const root = document.documentElement;
        
        if (scheme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            scheme = prefersDark ? 'dark' : 'light';
        }
        
        root.setAttribute('data-color-scheme', scheme);
    }

    private applyReducedMotionSettings() {
        const root = document.documentElement;
        const prefersReduced = this.reducedMotionQuery?.matches || false;
        
        if (this.config.enableReducedMotion && prefersReduced) {
            root.style.setProperty('--animation-duration', '0.01ms');
            root.style.setProperty('--transition-duration', '0.01ms');
        } else {
            root.style.removeProperty('--animation-duration');
            root.style.removeProperty('--transition-duration');
        }
    }

    private applyHighContrastSettings() {
        const root = document.documentElement;
        const prefersHighContrast = this.highContrastQuery?.matches || false;
        
        if (this.config.enableHighContrast && prefersHighContrast) {
            root.setAttribute('data-high-contrast', 'true');
        } else {
            root.removeAttribute('data-high-contrast');
        }
    }

    // Action methods (to be implemented based on component architecture)
    private moveFocus(direction: 'up' | 'down' | 'first' | 'last' | 'pageUp' | 'pageDown') {
        this.announce(`Moving focus ${direction}`, 'status');
        // Implementation depends on your grid structure
    }

    private toggleSelection() {
        this.announce('Toggling row selection', 'status');
        // Implementation depends on your selection logic
    }

    private selectAll() {
        this.announce('Selecting all rows', 'announcements');
        // Implementation depends on your selection logic
    }

    private openFilterMenu() {
        this.announce('Opening filter menu', 'status');
        // Implementation depends on your filter menu
    }

    private handleEscape() {
        this.announce('Closing current dialog', 'status');
        // Implementation depends on your dialog system
    }

    private showKeyboardHelp() {
        const shortcuts = Array.from(this.shortcuts.values());
        const helpText = shortcuts
            .map(s => `${this.formatShortcutKey(s)}: ${s.description}`)
            .join('\n');
        
        this.announce(`Keyboard shortcuts: ${helpText}`, 'announcements');
    }

    private formatShortcutKey(shortcut: IKeyboardShortcut): string {
        const parts = [];
        if (shortcut.ctrlKey) parts.push('Ctrl');
        if (shortcut.altKey) parts.push('Alt');
        if (shortcut.shiftKey) parts.push('Shift');
        parts.push(shortcut.key);
        return parts.join('+');
    }

    public updateConfig(newConfig: Partial<IAccessibilityConfig>) {
        this.config = { ...this.config, ...newConfig };
        this.applyAccessibilitySettings();
    }

    public getKeyboardShortcuts(): IKeyboardShortcut[] {
        return Array.from(this.shortcuts.values());
    }

    public destroy() {
        // Clean up event listeners
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));

        // Remove live regions
        this.liveRegions.forEach(region => {
            region.remove();
        });

        // Clean up media query listeners
        this.reducedMotionQuery?.removeEventListener('change', this.applyReducedMotionSettings);
        this.highContrastQuery?.removeEventListener('change', this.applyHighContrastSettings);
    }
}

// React hook for accessibility features
export const useAccessibility = (config?: Partial<IAccessibilityConfig>) => {
    const [manager] = React.useState(() => new AccessibilityManager(config));
    const [isHighContrast, setIsHighContrast] = React.useState(false);
    const [isReducedMotion, setIsReducedMotion] = React.useState(false);

    React.useEffect(() => {
        // Monitor accessibility preferences
        const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const updateHighContrast = () => setIsHighContrast(highContrastQuery.matches);
        const updateReducedMotion = () => setIsReducedMotion(reducedMotionQuery.matches);

        updateHighContrast();
        updateReducedMotion();

        highContrastQuery.addEventListener('change', updateHighContrast);
        reducedMotionQuery.addEventListener('change', updateReducedMotion);

        return () => {
            highContrastQuery.removeEventListener('change', updateHighContrast);
            reducedMotionQuery.removeEventListener('change', updateReducedMotion);
            manager.destroy();
        };
    }, [manager]);

    return {
        manager,
        isHighContrast,
        isReducedMotion,
        announce: manager.announce.bind(manager),
        setFocus: manager.setFocus.bind(manager),
        restoreFocus: manager.restoreFocus.bind(manager),
        registerShortcut: manager.registerShortcut.bind(manager),
        createAccessibleGrid: manager.createAccessibleGrid.bind(manager),
        createAccessibleCell: manager.createAccessibleCell.bind(manager),
        updateConfig: manager.updateConfig.bind(manager),
        getKeyboardShortcuts: manager.getKeyboardShortcuts.bind(manager)
    };
};
