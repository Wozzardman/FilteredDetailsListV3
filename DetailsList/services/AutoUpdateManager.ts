/**
 * Record Identity and Auto-Update System
 * Makes each row self-aware of its origin and handles updates automatically
 */

export interface RecordIdentity {
    // Core Identity
    recordId: string;
    entityName: string;
    primaryKeyField: string;
    
    // Origin Information
    dataSourceName?: string;
    originalValues: Record<string, any>;
    currentValues: Record<string, any>;
    
    // Change Tracking
    isDirty: boolean;
    modifiedFields: string[];
    lastModified: Date;
    
    // Update Configuration
    updateMethod: 'patch' | 'post' | 'put' | 'custom';
    customUpdateHandler?: (record: RecordIdentity, changes: Record<string, any>) => Promise<boolean>;
    
    // Validation
    requiredFields: string[];
    fieldValidators: Record<string, (value: any) => string | null>;
    
    // Relationships
    parentRecordId?: string;
    childRecords?: string[];
    lookupFields: Record<string, {
        targetEntity: string;
        targetField: string;
        displayField: string;
    }>;
}

export interface GridRowContext {
    identity: RecordIdentity;
    rowIndex: number;
    isSelected: boolean;
    isEditing: boolean;
    hasChanges: boolean;
    validationErrors: Record<string, string>;
}

export class AutoUpdateManager {
    private recordIdentities = new Map<string, RecordIdentity>();
    private updateQueue: Array<{recordId: string, changes: Record<string, any>, priority: number}> = [];
    private isProcessing = false;

    /**
     * Register a record with its complete identity
     */
    registerRecord(recordId: string, identity: Partial<RecordIdentity>): void {
        const fullIdentity: RecordIdentity = {
            recordId,
            entityName: identity.entityName || 'DefaultEntity',
            primaryKeyField: identity.primaryKeyField || 'ID',
            originalValues: identity.originalValues ? { ...identity.originalValues } : {},
            currentValues: identity.currentValues ? { ...identity.currentValues } : {},
            isDirty: false,
            modifiedFields: [],
            lastModified: new Date(),
            updateMethod: identity.updateMethod || 'patch',
            requiredFields: identity.requiredFields || [],
            fieldValidators: identity.fieldValidators || {},
            lookupFields: identity.lookupFields || {},
            ...identity
        };

        this.recordIdentities.set(recordId, fullIdentity);
        console.log(`📝 Registered record identity for ${recordId}:`, fullIdentity);
    }

    /**
     * Track field changes with automatic dirty detection
     */
    updateField(recordId: string, fieldName: string, newValue: any): boolean {
        const identity = this.recordIdentities.get(recordId);
        if (!identity) {
            console.warn(`❌ No identity found for record ${recordId}`);
            return false;
        }

        const oldValue = identity.currentValues[fieldName];
        const originalValue = identity.originalValues[fieldName];

        // Update current value
        identity.currentValues[fieldName] = newValue;
        identity.lastModified = new Date();

        // Track if field is dirty (different from original)
        const isFieldDirty = this.valuesAreDifferent(newValue, originalValue);
        
        if (isFieldDirty && !identity.modifiedFields.includes(fieldName)) {
            identity.modifiedFields.push(fieldName);
        } else if (!isFieldDirty && identity.modifiedFields.includes(fieldName)) {
            identity.modifiedFields = identity.modifiedFields.filter(f => f !== fieldName);
        }

        // Update overall dirty state
        identity.isDirty = identity.modifiedFields.length > 0;

        console.log(`🔄 Field updated: ${recordId}.${fieldName}: ${oldValue} → ${newValue} (dirty: ${isFieldDirty})`);
        return true;
    }

    /**
     * Get the complete record context for a row
     */
    getRowContext(recordId: string): GridRowContext | null {
        const identity = this.recordIdentities.get(recordId);
        if (!identity) return null;

        const validationErrors = this.validateRecord(identity);

        return {
            identity,
            rowIndex: -1, // Will be set by grid
            isSelected: false, // Will be set by grid
            isEditing: false, // Will be set by grid
            hasChanges: identity.isDirty,
            validationErrors
        };
    }

    /**
     * Validate a record according to its rules
     */
    private validateRecord(identity: RecordIdentity): Record<string, string> {
        const errors: Record<string, string> = {};

        // Check required fields
        for (const field of identity.requiredFields) {
            const value = identity.currentValues[field];
            if (value === null || value === undefined || value === '') {
                errors[field] = `${field} is required`;
            }
        }

        // Run custom validators
        for (const [field, validator] of Object.entries(identity.fieldValidators)) {
            const value = identity.currentValues[field];
            const error = validator(value);
            if (error) {
                errors[field] = error;
            }
        }

        return errors;
    }

    /**
     * Auto-generate update formula for PowerApps
     */
    generateUpdateFormula(recordId: string): string {
        const identity = this.recordIdentities.get(recordId);
        if (!identity || !identity.isDirty) {
            return '';
        }

        const changes = this.getModifiedFields(recordId);
        if (Object.keys(changes).length === 0) {
            return '';
        }

        // Build type-safe patch statement
        const patchFields = Object.entries(changes)
            .map(([field, value]) => {
                const fieldType = this.getFieldType(identity, field);
                const formattedValue = this.formatValueForPowerApps(value, fieldType);
                return `${field}: ${formattedValue}`;
            })
            .join(',\n        ');

        return `Patch(
    ${identity.dataSourceName || identity.entityName},
    LookUp(${identity.dataSourceName || identity.entityName}, ${identity.primaryKeyField} = "${identity.recordId}"),
    {
        ${patchFields}
    }
)`;
    }

    /**
     * Get only the modified fields for update
     */
    getModifiedFields(recordId: string): Record<string, any> {
        const identity = this.recordIdentities.get(recordId);
        if (!identity) return {};

        const changes: Record<string, any> = {};
        for (const field of identity.modifiedFields) {
            changes[field] = identity.currentValues[field];
        }

        return changes;
    }

    /**
     * Format value appropriately for PowerApps formulas
     */
    private formatValueForPowerApps(value: any, fieldType: string): string {
        if (value === null || value === undefined) {
            return 'Blank()';
        }

        switch (fieldType) {
            case 'text':
            case 'choice':
                return `"${String(value).replace(/"/g, '""')}"`;
            case 'number':
                return String(Number(value));
            case 'date':
                if (value instanceof Date) {
                    return `DateValue("${value.toISOString()}")`;
                }
                return `DateValue("${String(value)}")`;
            case 'boolean':
                return String(Boolean(value));
            default:
                return `"${String(value).replace(/"/g, '""')}"`;
        }
    }

    /**
     * Get field type for proper formatting
     */
    private getFieldType(identity: RecordIdentity, fieldName: string): string {
        // You can extend this based on your column definitions
        const typeMapping: Record<string, string> = {
            'VTDate': 'date',
            'Size': 'number',
            'WaitThickness': 'number',
            'WeldType': 'choice',
            'Process': 'choice'
        };

        return typeMapping[fieldName] || 'text';
    }

    /**
     * Check if two values are different (handles various data types)
     */
    private valuesAreDifferent(value1: any, value2: any): boolean {
        // Handle nulls and undefined
        if (value1 === value2) return false;
        if ((value1 === null || value1 === undefined) && (value2 === null || value2 === undefined)) return false;
        if ((value1 === null || value1 === undefined) !== (value2 === null || value2 === undefined)) return true;

        // Handle dates
        if (value1 instanceof Date && value2 instanceof Date) {
            return value1.getTime() !== value2.getTime();
        }

        // Handle numbers (account for string numbers)
        if (!isNaN(Number(value1)) && !isNaN(Number(value2))) {
            return Number(value1) !== Number(value2);
        }

        // Default string comparison
        return String(value1) !== String(value2);
    }

    /**
     * Get summary of all pending changes
     */
    getPendingChangesSummary(): {
        totalRecords: number;
        totalChanges: number;
        recordSummaries: Array<{
            recordId: string;
            entityName: string;
            modifiedFields: string[];
            hasErrors: boolean;
        }>;
    } {
        const recordSummaries: Array<{
            recordId: string;
            entityName: string;
            modifiedFields: string[];
            hasErrors: boolean;
        }> = [];

        let totalChanges = 0;
        let totalRecords = 0;

        for (const [recordId, identity] of this.recordIdentities) {
            if (identity.isDirty) {
                const errors = this.validateRecord(identity);
                recordSummaries.push({
                    recordId,
                    entityName: identity.entityName,
                    modifiedFields: [...identity.modifiedFields],
                    hasErrors: Object.keys(errors).length > 0
                });
                totalChanges += identity.modifiedFields.length;
                totalRecords++;
            }
        }

        return {
            totalRecords,
            totalChanges,
            recordSummaries
        };
    }

    /**
     * Clear changes for a specific record (like after successful save)
     */
    clearRecordChanges(recordId: string): void {
        const identity = this.recordIdentities.get(recordId);
        if (!identity) return;

        // Move current values to original values
        identity.originalValues = { ...identity.currentValues };
        identity.modifiedFields = [];
        identity.isDirty = false;
        identity.lastModified = new Date();

        console.log(`✅ Cleared changes for record ${recordId}`);
    }

    /**
     * Clear all pending changes
     */
    clearAllChanges(): void {
        for (const recordId of this.recordIdentities.keys()) {
            this.clearRecordChanges(recordId);
        }
        console.log(`🧹 Cleared all pending changes`);
    }
}

export default AutoUpdateManager;
