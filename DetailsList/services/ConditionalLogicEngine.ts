/**
 * Conditional Logic Engine for Enhanced Inline Editors
 * Provides dynamic value calculation, lookups, and conditional logic
 */

import { 
    ConditionalConfig, 
    ConditionalRule, 
    ConditionalTrigger, 
    ConditionalAction, 
    LookupConfig,
    DropdownOption 
} from '../types/ColumnEditor.types';

export interface ConditionalEngineContext {
    item: any;
    allColumns: Record<string, any>;
    columnKey: string;
    currentValue: any;
    onValueChange: (columnKey: string, value: any) => void;
    onOptionsChange: (columnKey: string, options: DropdownOption[]) => void;
    onValidationChange: (columnKey: string, error: string | null) => void;
}

export class ConditionalLogicEngine {
    private lookupCache = new Map<string, { value: any; timestamp: number }>();
    private activeRules = new Map<string, ConditionalRule[]>();
    private processingQueue = new Map<string, Promise<any>>();

    /**
     * Register conditional configuration for a column
     */
    registerConditionalConfig(columnKey: string, config: ConditionalConfig): void {
        const rules: ConditionalRule[] = [];

        // Convert rules from config
        if (config.rules) {
            rules.push(...config.rules);
        }

        // Convert dependsOn shorthand to rules
        if (config.dependsOn) {
            Object.entries(config.dependsOn).forEach(([sourceColumn, dependency]) => {
                const ruleId = `${columnKey}_depends_on_${sourceColumn}`;
                
                let action: ConditionalAction;
                
                if (dependency.valueMap) {
                    action = {
                        type: 'setValue',
                        calculate: (sourceValue) => dependency.valueMap![sourceValue] || null
                    };
                } else if (dependency.calculate) {
                    action = {
                        type: 'setValue',
                        calculate: dependency.calculate
                    };
                } else if (dependency.lookup) {
                    action = {
                        type: 'lookup',
                        lookup: dependency.lookup
                    };
                } else {
                    return; // Skip invalid dependency
                }

                const rule: ConditionalRule = {
                    id: ruleId,
                    description: `Auto-generated rule for ${columnKey} depends on ${sourceColumn}`,
                    targetColumn: columnKey,
                    triggers: [{
                        sourceColumn,
                        triggerType: dependency.trigger || 'onChange',
                        action
                    }],
                    enabled: true,
                    priority: 100
                };

                rules.push(rule);
            });
        }

        // Sort rules by priority (higher priority first)
        rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        
        this.activeRules.set(columnKey, rules);
    }

    /**
     * Process triggers when a column value changes
     */
    async processTriggers(
        sourceColumnKey: string, 
        sourceValue: any, 
        triggerType: 'onChange' | 'onFocus' | 'onBlur' | 'onInit',
        context: ConditionalEngineContext
    ): Promise<void> {
        const affectedRules = this.findAffectedRules(sourceColumnKey, triggerType);
        
        if (affectedRules.length === 0) return;

        // Process rules in parallel for performance, but group by target column to avoid conflicts
        const rulesByTarget = new Map<string, ConditionalRule[]>();
        affectedRules.forEach(rule => {
            if (!rulesByTarget.has(rule.targetColumn)) {
                rulesByTarget.set(rule.targetColumn, []);
            }
            rulesByTarget.get(rule.targetColumn)!.push(rule);
        });

        // Process each target column sequentially to avoid race conditions
        for (const [targetColumn, rules] of rulesByTarget) {
            await this.processRulesForTarget(targetColumn, rules, sourceColumnKey, sourceValue, context);
        }
    }

    /**
     * Find all rules affected by a source column change
     */
    private findAffectedRules(sourceColumnKey: string, triggerType: string): ConditionalRule[] {
        const affectedRules: ConditionalRule[] = [];

        for (const [targetColumn, rules] of this.activeRules) {
            for (const rule of rules) {
                if (!rule.enabled) continue;

                const isAffected = rule.triggers.some(trigger => 
                    trigger.sourceColumn === sourceColumnKey && 
                    trigger.triggerType === triggerType
                );

                if (isAffected) {
                    affectedRules.push(rule);
                }
            }
        }

        return affectedRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * Process all rules for a specific target column
     */
    private async processRulesForTarget(
        targetColumn: string,
        rules: ConditionalRule[],
        sourceColumnKey: string,
        sourceValue: any,
        context: ConditionalEngineContext
    ): Promise<void> {
        for (const rule of rules) {
            const trigger = rule.triggers.find(t => 
                t.sourceColumn === sourceColumnKey
            );
            
            if (!trigger) continue;

            // Check condition if specified
            if (trigger.condition) {
                const conditionMet = trigger.condition(sourceValue, context.item, context.allColumns);
                if (!conditionMet) continue;
            }

            // Execute action with debouncing if specified
            if (trigger.action.debounceMs) {
                await this.debouncedAction(rule.id, trigger.action, sourceValue, context);
            } else {
                await this.executeAction(trigger.action, sourceValue, context);
            }
        }
    }

    /**
     * Execute a conditional action
     */
    private async executeAction(
        action: ConditionalAction,
        sourceValue: any,
        context: ConditionalEngineContext
    ): Promise<void> {
        try {
            switch (action.type) {
                case 'setValue':
                    await this.executeSetValue(action, sourceValue, context);
                    break;
                case 'setOptions':
                    await this.executeSetOptions(action, sourceValue, context);
                    break;
                case 'calculate':
                    await this.executeCalculate(action, sourceValue, context);
                    break;
                case 'lookup':
                    await this.executeLookup(action, sourceValue, context);
                    break;
                case 'validate':
                    await this.executeValidate(action, sourceValue, context);
                    break;
                case 'setVisibility':
                case 'setReadOnly':
                    // These would be handled by the parent component
                    console.log(`Action ${action.type} not yet implemented`);
                    break;
            }
        } catch (error) {
            console.error('Error executing conditional action:', error);
        }
    }

    /**
     * Execute setValue action
     */
    private async executeSetValue(
        action: ConditionalAction,
        sourceValue: any,
        context: ConditionalEngineContext
    ): Promise<void> {
        let newValue = action.value;

        if (action.calculate) {
            newValue = await action.calculate(sourceValue, context.item, context.allColumns);
        }

        if (newValue !== undefined && newValue !== context.currentValue) {
            context.onValueChange(context.columnKey, newValue);
        }
    }

    /**
     * Execute setOptions action
     */
    private async executeSetOptions(
        action: ConditionalAction,
        sourceValue: any,
        context: ConditionalEngineContext
    ): Promise<void> {
        let options: DropdownOption[] = [];

        if (action.options) {
            if (typeof action.options === 'function') {
                options = await action.options(sourceValue, context.item);
            } else {
                options = action.options;
            }
        }

        context.onOptionsChange(context.columnKey, options);
    }

    /**
     * Execute calculate action
     */
    private async executeCalculate(
        action: ConditionalAction,
        sourceValue: any,
        context: ConditionalEngineContext
    ): Promise<void> {
        if (action.calculate) {
            const calculatedValue = await action.calculate(sourceValue, context.item, context.allColumns);
            context.onValueChange(context.columnKey, calculatedValue);
        }
    }

    /**
     * Execute lookup action
     */
    private async executeLookup(
        action: ConditionalAction,
        sourceValue: any,
        context: ConditionalEngineContext
    ): Promise<void> {
        if (!action.lookup) return;

        try {
            const lookupValue = await this.performLookup(action.lookup, sourceValue, context);
            if (lookupValue !== undefined) {
                context.onValueChange(context.columnKey, lookupValue);
            }
        } catch (error) {
            console.error('Lookup failed:', error);
            if (action.lookup.fallbackValue !== undefined) {
                context.onValueChange(context.columnKey, action.lookup.fallbackValue);
            }
        }
    }

    /**
     * Execute validate action
     */
    private async executeValidate(
        action: ConditionalAction,
        sourceValue: any,
        context: ConditionalEngineContext
    ): Promise<void> {
        if (action.validator) {
            const error = action.validator(context.currentValue, sourceValue, context.item);
            context.onValidationChange(context.columnKey, error);
        }
    }

    /**
     * Perform lookup with caching
     */
    private async performLookup(
        config: LookupConfig,
        sourceValue: any,
        context: ConditionalEngineContext
    ): Promise<any> {
        const cacheKey = `${config.source}_${JSON.stringify(sourceValue)}_${context.columnKey}`;
        
        // Check cache if duration is specified
        if (config.cacheDurationMs) {
            const cached = this.lookupCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < config.cacheDurationMs) {
                return cached.value;
            }
        }

        let result: any;

        switch (config.source) {
            case 'static':
                result = config.data?.[sourceValue];
                break;
            case 'function':
                if (config.lookupFunction) {
                    result = await config.lookupFunction(sourceValue, context.item);
                }
                break;
            case 'api':
                result = await this.performApiLookup(config, sourceValue, context);
                break;
            case 'dataset':
                // This would integrate with PowerApps datasets
                console.log('Dataset lookup not yet implemented');
                result = config.fallbackValue;
                break;
        }

        // Transform result if transformer provided
        if (result !== undefined && config.transform) {
            result = config.transform(result, sourceValue, context.item);
        }

        // Cache result if duration specified
        if (config.cacheDurationMs && result !== undefined) {
            this.lookupCache.set(cacheKey, {
                value: result,
                timestamp: Date.now()
            });
        }

        return result;
    }

    /**
     * Perform API lookup
     */
    private async performApiLookup(
        config: LookupConfig,
        sourceValue: any,
        context: ConditionalEngineContext
    ): Promise<any> {
        if (!config.url) {
            throw new Error('API URL is required for API lookup');
        }

        const method = config.method || 'GET';
        const headers = {
            'Content-Type': 'application/json',
            ...config.headers
        };

        let url = config.url;
        let body: string | undefined;

        if (method === 'GET') {
            // Replace placeholders in URL
            url = url.replace('{sourceValue}', encodeURIComponent(sourceValue));
        } else {
            // Use body for POST
            body = JSON.stringify({
                sourceValue,
                item: context.item,
                ...config.body
            });
        }

        const response = await fetch(url, {
            method,
            headers,
            body
        });

        if (!response.ok) {
            throw new Error(`API lookup failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Debounced action execution
     */
    private async debouncedAction(
        ruleId: string,
        action: ConditionalAction,
        sourceValue: any,
        context: ConditionalEngineContext
    ): Promise<void> {
        // Cancel any existing pending action for this rule
        const existingPromise = this.processingQueue.get(ruleId);
        if (existingPromise) {
            // In a real implementation, we'd want to cancel the promise
            // For now, we'll just overwrite it
        }

        const debounceMs = action.debounceMs || 300;
        
        const promise = new Promise<void>((resolve) => {
            setTimeout(async () => {
                await this.executeAction(action, sourceValue, context);
                this.processingQueue.delete(ruleId);
                resolve();
            }, debounceMs);
        });

        this.processingQueue.set(ruleId, promise);
        return promise;
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.lookupCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.lookupCache.size,
            keys: Array.from(this.lookupCache.keys())
        };
    }
}

// Singleton instance
export const conditionalEngine = new ConditionalLogicEngine();
