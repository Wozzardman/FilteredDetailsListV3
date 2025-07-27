/**
 * Enterprise Change Management System
 * Handles staged changes, batching, and external commit workflows
 * Meta/Google-competitive change tracking and staging
 */

export interface IChangeRecord {
    id: string;
    recordKey: string;
    columnKey: string;
    oldValue: any;
    newValue: any;
    timestamp: Date;
    changeType: 'edit' | 'add' | 'delete';
    isValid: boolean;
    validationErrors?: string[];
    metadata?: Record<string, any>;
}

export interface IBatchCommitResult {
    success: boolean;
    committedChanges: IChangeRecord[];
    failedChanges: IChangeRecord[];
    errors: string[];
    summary: {
        totalChanges: number;
        successCount: number;
        failureCount: number;
        affectedRecords: number;
        affectedColumns: string[];
    };
}

export interface IChangeManagerConfig {
    maxBatchSize?: number;
    autoCommitDelay?: number;
    enableConflictDetection?: boolean;
    enableChangeValidation?: boolean;
    enableOptimisticLocking?: boolean;
    enableAuditTrail?: boolean;
}

export interface IChangeManagerCallbacks {
    onPendingChangesUpdate?: (changes: IChangeRecord[], hasChanges: boolean, changeCount: number) => void;
    onChangeEvent?: (eventType: string, recordKey?: string, columnKey?: string, oldValue?: any, newValue?: any) => void;
    onBatchCommitStart?: (changes: IChangeRecord[]) => void;
    onBatchCommitComplete?: (result: IBatchCommitResult) => void;
    onValidationError?: (change: IChangeRecord, errors: string[]) => void;
    onConflictDetected?: (change: IChangeRecord, conflict: any) => void;
}

export class EnterpriseChangeManager {
    private pendingChanges: Map<string, IChangeRecord> = new Map();
    private committedChanges: IChangeRecord[] = [];
    private config: Required<IChangeManagerConfig>;
    private callbacks: IChangeManagerCallbacks;
    private autoCommitTimer?: NodeJS.Timeout;

    constructor(config: IChangeManagerConfig = {}, callbacks: IChangeManagerCallbacks = {}) {
        this.config = {
            maxBatchSize: config.maxBatchSize ?? 100,
            autoCommitDelay: config.autoCommitDelay ?? 0, // Disabled by default
            enableConflictDetection: config.enableConflictDetection ?? true,
            enableChangeValidation: config.enableChangeValidation ?? true,
            enableOptimisticLocking: config.enableOptimisticLocking ?? false,
            enableAuditTrail: config.enableAuditTrail ?? true,
        };
        this.callbacks = callbacks;
    }

    /**
     * Add a new change to the staging area
     */
    public addChange(
        recordKey: string,
        columnKey: string,
        oldValue: any,
        newValue: any,
        changeType: 'edit' | 'add' | 'delete' = 'edit',
        metadata?: Record<string, any>
    ): string {
        const changeId = this.generateChangeId(recordKey, columnKey);
        
        const change: IChangeRecord = {
            id: changeId,
            recordKey,
            columnKey,
            oldValue,
            newValue,
            timestamp: new Date(),
            changeType,
            isValid: true,
            metadata,
        };

        // Validate change if enabled
        if (this.config.enableChangeValidation) {
            this.validateChange(change);
        }

        // Check for conflicts if enabled
        if (this.config.enableConflictDetection) {
            this.detectConflicts(change);
        }

        // Store the change
        this.pendingChanges.set(changeId, change);

        // Notify callbacks
        this.notifyPendingChangesUpdate();
        this.callbacks.onChangeEvent?.(changeType, recordKey, columnKey, oldValue, newValue);

        // Setup auto-commit if configured
        if (this.config.autoCommitDelay > 0) {
            this.scheduleAutoCommit();
        }

        return changeId;
    }

    /**
     * Remove a change from staging
     */
    public removeChange(changeId: string): boolean {
        const removed = this.pendingChanges.delete(changeId);
        if (removed) {
            this.notifyPendingChangesUpdate();
        }
        return removed;
    }

    /**
     * Get all pending changes
     */
    public getPendingChanges(): IChangeRecord[] {
        return Array.from(this.pendingChanges.values());
    }

    /**
     * Get changes for a specific record
     */
    public getRecordChanges(recordKey: string): IChangeRecord[] {
        return this.getPendingChanges().filter(change => change.recordKey === recordKey);
    }

    /**
     * Get changes for a specific column
     */
    public getColumnChanges(columnKey: string): IChangeRecord[] {
        return this.getPendingChanges().filter(change => change.columnKey === columnKey);
    }

    /**
     * Check if there are pending changes
     */
    public hasPendingChanges(): boolean {
        return this.pendingChanges.size > 0;
    }

    /**
     * Get count of pending changes
     */
    public getPendingChangeCount(): number {
        return this.pendingChanges.size;
    }

    /**
     * Commit all pending changes in batches
     */
    public async commitAllChanges(): Promise<IBatchCommitResult> {
        const allChanges = this.getPendingChanges();
        return this.commitChanges(allChanges);
    }

    /**
     * Commit specific changes
     */
    public async commitChanges(changes: IChangeRecord[]): Promise<IBatchCommitResult> {
        this.callbacks.onBatchCommitStart?.(changes);

        const result: IBatchCommitResult = {
            success: true,
            committedChanges: [],
            failedChanges: [],
            errors: [],
            summary: {
                totalChanges: changes.length,
                successCount: 0,
                failureCount: 0,
                affectedRecords: 0,
                affectedColumns: [],
            },
        };

        try {
            // Process changes in batches
            const batches = this.createBatches(changes);
            
            for (const batch of batches) {
                try {
                    await this.processBatch(batch, result);
                } catch (error) {
                    result.success = false;
                    result.errors.push(`Batch processing failed: ${error}`);
                    result.failedChanges.push(...batch);
                }
            }

            // Calculate final summary
            this.calculateSummary(result);

            // Remove committed changes from pending
            result.committedChanges.forEach(change => {
                this.pendingChanges.delete(change.id);
            });

            // Store in audit trail if enabled
            if (this.config.enableAuditTrail) {
                this.committedChanges.push(...result.committedChanges);
            }

            this.notifyPendingChangesUpdate();
            this.callbacks.onBatchCommitComplete?.(result);

        } catch (error) {
            result.success = false;
            result.errors.push(`Commit failed: ${error}`);
            result.failedChanges = changes;
        }

        return result;
    }

    /**
     * Cancel all pending changes
     */
    public cancelAllChanges(): void {
        const changeCount = this.pendingChanges.size;
        this.pendingChanges.clear();
        
        if (changeCount > 0) {
            this.notifyPendingChangesUpdate();
            this.callbacks.onChangeEvent?.('cancel');
        }
    }

    /**
     * Cancel specific changes
     */
    public cancelChanges(changeIds: string[]): number {
        let cancelledCount = 0;
        changeIds.forEach(id => {
            if (this.pendingChanges.delete(id)) {
                cancelledCount++;
            }
        });

        if (cancelledCount > 0) {
            this.notifyPendingChangesUpdate();
        }

        return cancelledCount;
    }

    /**
     * Get staged changes as serializable format for Power Apps
     */
    public getChangesSerialized(): string {
        const changes = this.getPendingChanges().map(change => ({
            recordKey: change.recordKey,
            columnKey: change.columnKey,
            oldValue: change.oldValue?.toString() || '',
            newValue: change.newValue?.toString() || '',
            changeType: change.changeType,
            timestamp: change.timestamp.toISOString(),
            isValid: change.isValid,
        }));

        return JSON.stringify(changes);
    }

    /**
     * Get change statistics
     */
    public getChangeStatistics() {
        const changes = this.getPendingChanges();
        const recordsAffected = new Set(changes.map(c => c.recordKey)).size;
        const columnsAffected = new Set(changes.map(c => c.columnKey));
        const changeTypes = changes.reduce((acc, change) => {
            acc[change.changeType] = (acc[change.changeType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalChanges: changes.length,
            recordsAffected,
            columnsAffected: Array.from(columnsAffected),
            changeTypes,
            validChanges: changes.filter(c => c.isValid).length,
            invalidChanges: changes.filter(c => !c.isValid).length,
            oldestChange: changes.length > 0 ? Math.min(...changes.map(c => c.timestamp.getTime())) : null,
            newestChange: changes.length > 0 ? Math.max(...changes.map(c => c.timestamp.getTime())) : null,
        };
    }

    /**
     * Dispose of the change manager and cleanup resources
     */
    public dispose(): void {
        if (this.autoCommitTimer) {
            clearTimeout(this.autoCommitTimer);
        }
        this.pendingChanges.clear();
        this.committedChanges.length = 0;
    }

    // Private helper methods

    private generateChangeId(recordKey: string, columnKey: string): string {
        return `${recordKey}:${columnKey}:${Date.now()}`;
    }

    private validateChange(change: IChangeRecord): void {
        const errors: string[] = [];

        // Basic validation
        if (!change.recordKey) {
            errors.push('Record key is required');
        }
        if (!change.columnKey) {
            errors.push('Column key is required');
        }

        // Type validation (can be extended)
        if (change.oldValue === change.newValue) {
            errors.push('No actual change detected');
        }

        change.isValid = errors.length === 0;
        change.validationErrors = errors.length > 0 ? errors : undefined;

        if (!change.isValid) {
            this.callbacks.onValidationError?.(change, errors);
        }
    }

    private detectConflicts(change: IChangeRecord): void {
        // Check for existing changes to the same cell
        const existingChange = Array.from(this.pendingChanges.values())
            .find(existing => 
                existing.recordKey === change.recordKey && 
                existing.columnKey === change.columnKey
            );

        if (existingChange) {
            this.callbacks.onConflictDetected?.(change, existingChange);
        }
    }

    private notifyPendingChangesUpdate(): void {
        const changes = this.getPendingChanges();
        this.callbacks.onPendingChangesUpdate?.(
            changes,
            changes.length > 0,
            changes.length
        );
    }

    private scheduleAutoCommit(): void {
        if (this.autoCommitTimer) {
            clearTimeout(this.autoCommitTimer);
        }

        this.autoCommitTimer = setTimeout(() => {
            if (this.hasPendingChanges()) {
                this.commitAllChanges();
            }
        }, this.config.autoCommitDelay);
    }

    private createBatches(changes: IChangeRecord[]): IChangeRecord[][] {
        const batches: IChangeRecord[][] = [];
        const batchSize = this.config.maxBatchSize;

        for (let i = 0; i < changes.length; i += batchSize) {
            batches.push(changes.slice(i, i + batchSize));
        }

        return batches;
    }

    private async processBatch(batch: IChangeRecord[], result: IBatchCommitResult): Promise<void> {
        // This is where you would integrate with your actual data source
        // For now, we'll simulate the commit process
        
        for (const change of batch) {
            try {
                // Simulate async commit operation
                await this.simulateCommitOperation(change);
                result.committedChanges.push(change);
                result.summary.successCount++;
            } catch (error) {
                result.failedChanges.push(change);
                result.summary.failureCount++;
                result.errors.push(`Failed to commit change ${change.id}: ${error}`);
            }
        }
    }

    private async simulateCommitOperation(change: IChangeRecord): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        // Simulate occasional failures for testing
        if (Math.random() < 0.02) { // 2% failure rate
            throw new Error('Simulated commit failure');
        }
    }

    private calculateSummary(result: IBatchCommitResult): void {
        const affectedRecords = new Set([
            ...result.committedChanges.map(c => c.recordKey),
            ...result.failedChanges.map(c => c.recordKey)
        ]);

        const affectedColumns = new Set([
            ...result.committedChanges.map(c => c.columnKey),
            ...result.failedChanges.map(c => c.columnKey)
        ]);

        result.summary.affectedRecords = affectedRecords.size;
        result.summary.affectedColumns = Array.from(affectedColumns);
    }
}

/**
 * React hook for using the Enterprise Change Manager
 */
export function useEnterpriseChangeManager(
    config?: IChangeManagerConfig,
    callbacks?: IChangeManagerCallbacks
) {
    const [changeManager] = React.useState(() => new EnterpriseChangeManager(config, callbacks));
    const [pendingChanges, setPendingChanges] = React.useState<IChangeRecord[]>([]);
    const [hasChanges, setHasChanges] = React.useState(false);

    React.useEffect(() => {
        const updatedCallbacks = {
            ...callbacks,
            onPendingChangesUpdate: (changes: IChangeRecord[], hasChanges: boolean) => {
                setPendingChanges(changes);
                setHasChanges(hasChanges);
                callbacks?.onPendingChangesUpdate?.(changes, hasChanges, changes.length);
            },
        };

        // Update callbacks
        changeManager['callbacks'] = updatedCallbacks;

        return () => {
            changeManager.dispose();
        };
    }, [changeManager, callbacks]);

    return {
        changeManager,
        pendingChanges,
        hasChanges,
        pendingCount: pendingChanges.length,
        statistics: changeManager.getChangeStatistics(),
    };
}

import * as React from 'react';
