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
    // iOS WebView Safety: Use ReturnType instead of NodeJS.Timeout which is not valid in browser
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingNotification = false;
    private performanceThreshold = 500; // Debounce threshold for large datasets
    
    // Performance optimization: batch updates for better UX
    private shouldDebounce(): boolean {
        return this.totalItems.length > this.performanceThreshold;
    }

    /**
     * Initialize with current dataset items
     */
    public initialize(items: string[]): void {
        this.totalItems = [...items];
        // Remove any selected items that no longer exist
        this.selectedItems = new Set([...this.selectedItems].filter(id => items.includes(id)));
        this.notifyStateChangeOptimized();
    }

    /**
     * Toggle selection for a specific item with performance optimization
     */
    public toggleItem(itemId: string): void {
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
        } else {
            this.selectedItems.add(itemId);
        }
        this.notifyStateChangeOptimized();
    }

    /**
     * Select or deselect a specific item with performance optimization
     */
    public setItemSelection(itemId: string, selected: boolean): void {
        if (selected) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }
        this.notifyStateChangeOptimized();
    }

    /**
     * Select all items with performance optimization
     */
    public selectAll(): void {
        // For large datasets, use batch processing to avoid UI blocking
        if (this.totalItems.length > 1000) {
            this.selectAllBatched();
        } else {
            this.selectedItems = new Set(this.totalItems);
            this.notifyStateChangeImmediate(); // Immediate for smaller datasets
        }
    }

    /**
     * Clear all selections with immediate notification
     */
    public clearAll(): void {
        this.selectedItems.clear();
        this.notifyStateChangeImmediate(); // Always immediate for clearing
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
                this.notifyStateChangeOptimized();
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
     * Notify all listeners of state change with performance optimization
     */
    private notifyStateChangeOptimized(): void {
        if (this.shouldDebounce()) {
            // Debounce for large datasets to improve performance
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }
            
            this.pendingNotification = true;
            this.debounceTimer = setTimeout(() => {
                this.notifyStateChangeImmediate();
                this.pendingNotification = false;
                this.debounceTimer = null;
            }, 50); // 50ms debounce for smooth UX
        } else {
            // Immediate notification for smaller datasets
            this.notifyStateChangeImmediate();
        }
    }

    /**
     * Immediate notification without debouncing
     */
    private notifyStateChangeImmediate(): void {
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
     * Batched select all for large datasets
     */
    private selectAllBatched(): void {
        const batchSize = 500;
        let currentIndex = 0;
        
        const processBatch = () => {
            const endIndex = Math.min(currentIndex + batchSize, this.totalItems.length);
            
            // Add items in current batch
            for (let i = currentIndex; i < endIndex; i++) {
                this.selectedItems.add(this.totalItems[i]);
            }
            
            currentIndex = endIndex;
            
            if (currentIndex < this.totalItems.length) {
                // Schedule next batch to avoid blocking UI
                setTimeout(processBatch, 10);
            } else {
                // All items processed, notify immediately
                this.notifyStateChangeImmediate();
            }
        };
        
        processBatch();
    }

    /**
     * Force immediate notification (useful for cleanup)
     */
    public flushPendingUpdates(): void {
        if (this.pendingNotification && this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.notifyStateChangeImmediate();
            this.pendingNotification = false;
            this.debounceTimer = null;
        }
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
     * Bulk operations with performance optimization
     */
    public selectRange(startIndex: number, endIndex: number): void {
        const start = Math.max(0, Math.min(startIndex, endIndex));
        const end = Math.min(this.totalItems.length - 1, Math.max(startIndex, endIndex));
        
        for (let i = start; i <= end; i++) {
            this.selectedItems.add(this.totalItems[i]);
        }
        this.notifyStateChangeOptimized();
    }

    public deselectRange(startIndex: number, endIndex: number): void {
        const start = Math.max(0, Math.min(startIndex, endIndex));
        const end = Math.min(this.totalItems.length - 1, Math.max(startIndex, endIndex));
        
        for (let i = start; i <= end; i++) {
            this.selectedItems.delete(this.totalItems[i]);
        }
        this.notifyStateChangeOptimized();
    }
}
