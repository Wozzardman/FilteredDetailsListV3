/**
 * SelectionManager - Handles row selection state and operations
 * Provides checkbox-based selection functionality for the grid
 */

export interface SelectionState {
    selectedItems: Set<string>;
    selectAllState: 'none' | 'some' | 'all';
    selectedCount: number;
}

export interface SelectionEvent {
    type: 'item' | 'selectAll' | 'clearAll';
    itemId?: string;
    selected?: boolean;
    allItems?: string[];
}

export class SelectionManager {
    private selectedItems: Set<string> = new Set();
    private totalItems: string[] = [];
    private listeners: ((state: SelectionState) => void)[] = [];

    /**
     * Initialize with current dataset items
     */
    public initialize(items: string[]): void {
        this.totalItems = [...items];
        // Remove any selected items that no longer exist
        this.selectedItems = new Set([...this.selectedItems].filter(id => items.includes(id)));
        this.notifyStateChange();
    }

    /**
     * Toggle selection for a specific item
     */
    public toggleItem(itemId: string): void {
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
        } else {
            this.selectedItems.add(itemId);
        }
        this.notifyStateChange();
    }

    /**
     * Select or deselect a specific item
     */
    public setItemSelection(itemId: string, selected: boolean): void {
        if (selected) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }
        this.notifyStateChange();
    }

    /**
     * Select all items
     */
    public selectAll(): void {
        this.selectedItems = new Set(this.totalItems);
        this.notifyStateChange();
    }

    /**
     * Clear all selections
     */
    public clearAll(): void {
        this.selectedItems.clear();
        this.notifyStateChange();
    }

    /**
     * Toggle select all (if some selected, select all; if all selected, clear all)
     */
    public toggleSelectAll(): void {
        const state = this.getSelectAllState();
        if (state === 'all') {
            this.clearAll();
        } else {
            this.selectAll();
        }
    }

    /**
     * Check if an item is selected
     */
    public isItemSelected(itemId: string): boolean {
        return this.selectedItems.has(itemId);
    }

    /**
     * Get current selection state
     */
    public getSelectionState(): SelectionState {
        return {
            selectedItems: new Set(this.selectedItems),
            selectAllState: this.getSelectAllState(),
            selectedCount: this.selectedItems.size
        };
    }

    /**
     * Get selected items as array
     */
    public getSelectedItems(): string[] {
        return Array.from(this.selectedItems);
    }

    /**
     * Get selected items as JSON string
     */
    public getSelectedItemsJson(): string {
        return JSON.stringify({
            selectedIds: this.getSelectedItems(),
            count: this.selectedItems.size,
            total: this.totalItems.length,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Set selection from external source (e.g., PowerApps)
     */
    public setSelectionFromJson(jsonString: string): void {
        try {
            const data = JSON.parse(jsonString);
            if (data.selectedIds && Array.isArray(data.selectedIds)) {
                this.selectedItems = new Set(data.selectedIds.filter((id: string) => this.totalItems.includes(id)));
                this.notifyStateChange();
            }
        } catch (error) {
            console.warn('Invalid selection JSON:', error);
        }
    }

    /**
     * Subscribe to selection state changes
     */
    public subscribe(listener: (state: SelectionState) => void): () => void {
        this.listeners.push(listener);
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Get select all state
     */
    private getSelectAllState(): 'none' | 'some' | 'all' {
        const selectedCount = this.selectedItems.size;
        const totalCount = this.totalItems.length;

        if (selectedCount === 0) {
            return 'none';
        } else if (selectedCount === totalCount && totalCount > 0) {
            return 'all';
        } else {
            return 'some';
        }
    }

    /**
     * Notify all listeners of state change
     */
    private notifyStateChange(): void {
        const state = this.getSelectionState();
        this.listeners.forEach(listener => {
            try {
                listener(state);
            } catch (error) {
                console.error('Error in selection listener:', error);
            }
        });
    }

    /**
     * Get selection statistics
     */
    public getSelectionStats(): {
        selected: number;
        total: number;
        percentage: number;
        state: 'none' | 'some' | 'all';
    } {
        const selected = this.selectedItems.size;
        const total = this.totalItems.length;
        return {
            selected,
            total,
            percentage: total > 0 ? Math.round((selected / total) * 100) : 0,
            state: this.getSelectAllState()
        };
    }

    /**
     * Bulk operations
     */
    public selectRange(startIndex: number, endIndex: number): void {
        const start = Math.max(0, Math.min(startIndex, endIndex));
        const end = Math.min(this.totalItems.length - 1, Math.max(startIndex, endIndex));
        
        for (let i = start; i <= end; i++) {
            this.selectedItems.add(this.totalItems[i]);
        }
        this.notifyStateChange();
    }

    public deselectRange(startIndex: number, endIndex: number): void {
        const start = Math.max(0, Math.min(startIndex, endIndex));
        const end = Math.min(this.totalItems.length - 1, Math.max(startIndex, endIndex));
        
        for (let i = start; i <= end; i++) {
            this.selectedItems.delete(this.totalItems[i]);
        }
        this.notifyStateChange();
    }
}
