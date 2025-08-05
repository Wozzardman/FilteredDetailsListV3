/**
 * Helper functions for creating conditional editor configurations
 * Provides easy-to-use builder patterns for complex conditional logic
 */

import { 
    ConditionalConfig, 
    ConditionalRule, 
    ConditionalAction, 
    LookupConfig,
    DropdownOption 
} from '../types/ColumnEditor.types';

export class ConditionalConfigBuilder {
    private config: ConditionalConfig = {};

    /**
     * Add a simple value dependency
     */
    dependsOn(sourceColumn: string, valueMap: Record<string, any>): ConditionalConfigBuilder {
        if (!this.config.dependsOn) {
            this.config.dependsOn = {};
        }
        
        this.config.dependsOn[sourceColumn] = {
            valueMap
        };
        
        return this;
    }

    /**
     * Add a calculated dependency
     */
    calculatedFrom(
        sourceColumn: string, 
        calculate: (sourceValue: any, item: any) => any
    ): ConditionalConfigBuilder {
        if (!this.config.dependsOn) {
            this.config.dependsOn = {};
        }
        
        this.config.dependsOn[sourceColumn] = {
            calculate
        };
        
        return this;
    }

    /**
     * Add a lookup dependency
     */
    lookupsFrom(sourceColumn: string, lookupConfig: LookupConfig): ConditionalConfigBuilder {
        if (!this.config.dependsOn) {
            this.config.dependsOn = {};
        }
        
        this.config.dependsOn[sourceColumn] = {
            lookup: lookupConfig
        };
        
        return this;
    }

    /**
     * Add a custom rule
     */
    addRule(rule: ConditionalRule): ConditionalConfigBuilder {
        if (!this.config.rules) {
            this.config.rules = [];
        }
        
        this.config.rules.push(rule);
        return this;
    }

    /**
     * Build the configuration
     */
    build(): ConditionalConfig {
        return this.config;
    }
}

export class ConditionalRuleBuilder {
    private rule: Partial<ConditionalRule> = {
        triggers: [],
        enabled: true,
        priority: 100
    };

    /**
     * Set rule identification
     */
    withId(id: string): ConditionalRuleBuilder {
        this.rule.id = id;
        return this;
    }

    /**
     * Set description
     */
    withDescription(description: string): ConditionalRuleBuilder {
        this.rule.description = description;
        return this;
    }

    /**
     * Set target column
     */
    forColumn(targetColumn: string): ConditionalRuleBuilder {
        this.rule.targetColumn = targetColumn;
        return this;
    }

    /**
     * Set priority
     */
    withPriority(priority: number): ConditionalRuleBuilder {
        this.rule.priority = priority;
        return this;
    }

    /**
     * Add a trigger
     */
    whenChanged(
        sourceColumn: string,
        action: ConditionalAction,
        condition?: (sourceValue: any, item: any, allColumns: any) => boolean
    ): ConditionalRuleBuilder {
        this.rule.triggers!.push({
            sourceColumn,
            triggerType: 'onChange',
            condition,
            action
        });
        return this;
    }

    /**
     * Add a focus trigger
     */
    whenFocused(
        sourceColumn: string,
        action: ConditionalAction,
        condition?: (sourceValue: any, item: any, allColumns: any) => boolean
    ): ConditionalRuleBuilder {
        this.rule.triggers!.push({
            sourceColumn,
            triggerType: 'onFocus',
            condition,
            action
        });
        return this;
    }

    /**
     * Build the rule
     */
    build(): ConditionalRule {
        if (!this.rule.id || !this.rule.targetColumn) {
            throw new Error('Rule must have an id and targetColumn');
        }
        return this.rule as ConditionalRule;
    }
}

export class ActionBuilder {
    /**
     * Create a setValue action
     */
    static setValue(value: any): ConditionalAction {
        return { type: 'setValue', value };
    }

    /**
     * Create a calculate action
     */
    static calculate(
        calculate: (sourceValue: any, item: any, allColumns: any) => any
    ): ConditionalAction {
        return { type: 'calculate', calculate };
    }

    /**
     * Create a lookup action
     */
    static lookup(lookupConfig: LookupConfig): ConditionalAction {
        return { type: 'lookup', lookup: lookupConfig };
    }

    /**
     * Create a setOptions action
     */
    static setOptions(
        options: DropdownOption[] | ((sourceValue: any, item: any) => DropdownOption[])
    ): ConditionalAction {
        return { type: 'setOptions', options };
    }

    /**
     * Create a validation action
     */
    static validate(
        validator: (value: any, sourceValue: any, item: any) => string | null
    ): ConditionalAction {
        return { type: 'validate', validator };
    }
}

export class LookupBuilder {
    private lookup: Partial<LookupConfig> = {};

    /**
     * Create static lookup
     */
    static fromStaticData(data: Record<string, any>): LookupConfig {
        return { source: 'static', data };
    }

    /**
     * Create function lookup
     */
    static fromFunction(
        lookupFunction: (sourceValue: any, item: any) => any | Promise<any>
    ): LookupConfig {
        return { source: 'function', lookupFunction };
    }

    /**
     * Create API lookup
     */
    static fromApi(url: string): LookupBuilder {
        const builder = new LookupBuilder();
        builder.lookup = { source: 'api', url };
        return builder;
    }

    /**
     * Set HTTP method
     */
    withMethod(method: 'GET' | 'POST'): LookupBuilder {
        this.lookup.method = method;
        return this;
    }

    /**
     * Set headers
     */
    withHeaders(headers: Record<string, string>): LookupBuilder {
        this.lookup.headers = headers;
        return this;
    }

    /**
     * Set request body
     */
    withBody(body: any): LookupBuilder {
        this.lookup.body = body;
        return this;
    }

    /**
     * Set response transformer
     */
    withTransform(
        transform: (response: any, sourceValue: any, item: any) => any
    ): LookupBuilder {
        this.lookup.transform = transform;
        return this;
    }

    /**
     * Set cache duration
     */
    withCache(durationMs: number): LookupBuilder {
        this.lookup.cacheDurationMs = durationMs;
        return this;
    }

    /**
     * Set fallback value
     */
    withFallback(fallbackValue: any): LookupBuilder {
        this.lookup.fallbackValue = fallbackValue;
        return this;
    }

    /**
     * Build the lookup config
     */
    build(): LookupConfig {
        if (!this.lookup.source) {
            throw new Error('Lookup must have a source');
        }
        return this.lookup as LookupConfig;
    }
}

// Quick-start helper functions
export const ConditionalHelpers = {
    /**
     * Create a simple value mapping
     */
    mapValues: (sourceColumn: string, valueMap: Record<string, any>) => 
        new ConditionalConfigBuilder().dependsOn(sourceColumn, valueMap).build(),

    /**
     * Create a calculated dependency
     */
    calculate: (sourceColumn: string, calculate: (sourceValue: any, item: any) => any) =>
        new ConditionalConfigBuilder().calculatedFrom(sourceColumn, calculate).build(),

    /**
     * Create a lookup dependency
     */
    lookup: (sourceColumn: string, lookupConfig: LookupConfig) =>
        new ConditionalConfigBuilder().lookupsFrom(sourceColumn, lookupConfig).build(),

    /**
     * Create conditional dropdown options
     */
    conditionalOptions: (
        sourceColumn: string, 
        optionsMap: Record<string, DropdownOption[]>
    ) => ({
        rules: [
            new ConditionalRuleBuilder()
                .withId(`conditional_options_${sourceColumn}`)
                .forColumn('') // Will be set by the caller
                .whenChanged(sourceColumn, ActionBuilder.setOptions(
                    (sourceValue: any) => optionsMap[sourceValue] || []
                ))
                .build()
        ]
    } as ConditionalConfig),

    /**
     * Create multi-field calculation
     */
    multiFieldCalculation: (
        sourceColumns: string[],
        calculate: (values: Record<string, any>, item: any) => any
    ) => ({
        rules: sourceColumns.map(sourceColumn => 
            new ConditionalRuleBuilder()
                .withId(`multi_calc_${sourceColumn}`)
                .forColumn('') // Will be set by the caller
                .whenChanged(sourceColumn, ActionBuilder.calculate(
                    (sourceValue: any, item: any, allColumns: any) => {
                        const values: Record<string, any> = {};
                        sourceColumns.forEach(col => {
                            values[col] = allColumns[col];
                        });
                        return calculate(values, item);
                    }
                ))
                .build()
        )
    } as ConditionalConfig)
};

// Example configurations for common scenarios
export const CommonConditionalPatterns = {
    /**
     * Price calculation based on quantity and unit price
     */
    calculateTotal: () => ConditionalHelpers.multiFieldCalculation(
        ['quantity', 'unitPrice'],
        (values) => (values.quantity || 0) * (values.unitPrice || 0)
    ),

    /**
     * State/Province dropdown based on country selection
     */
    stateByCountry: (stateOptionsMap: Record<string, DropdownOption[]>) =>
        ConditionalHelpers.conditionalOptions('country', stateOptionsMap),

    /**
     * Discount calculation based on customer type
     */
    discountByCustomerType: () => ConditionalHelpers.mapValues('customerType', {
        'VIP': 0.15,
        'Premium': 0.10,
        'Standard': 0.05,
        'Basic': 0.0
    }),

    /**
     * Required fields based on document type
     */
    requiredFieldsByType: (requiredFieldsMap: Record<string, boolean>) =>
        ConditionalHelpers.mapValues('documentType', requiredFieldsMap),

    /**
     * Category lookup from external API
     */
    categoryLookup: (apiUrl: string) => ConditionalHelpers.lookup(
        'productId',
        LookupBuilder.fromApi(apiUrl)
            .withMethod('GET')
            .withCache(300000) // 5 minute cache
            .withTransform((response: any) => response.category)
            .build()
    )
};
