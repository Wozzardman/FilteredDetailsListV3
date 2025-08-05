/**
 * PowerApps-compatible conditional logic processor
 * Handles simple conditional configurations that work with Power Platform constraints
 */

export interface PowerAppsConditionalConfig {
    dependsOn?: string;
    lookupMapping?: {
        dataSource: string;
        filterColumn: string;
        returnColumn: string;
    };
    lookup?: {
        dataSource: string;
        filterColumn: string;
        returnColumn: string;
    };
    defaultValueFormula?: string;
    formula?: string;
}

export interface PowerAppsConditionalContext {
    currentValues: Record<string, any>;
    allRecords?: any[];
    isNewRecord?: boolean;
    globalDataSources?: Record<string, any>; // For accessing PowerApps collections/datasets
}

export class PowerAppsConditionalProcessor {
    private static instance: PowerAppsConditionalProcessor;
    private lookupDataSources: Record<string, any[]> = {};

    public static getInstance(): PowerAppsConditionalProcessor {
        if (!PowerAppsConditionalProcessor.instance) {
            PowerAppsConditionalProcessor.instance = new PowerAppsConditionalProcessor();
        }
        return PowerAppsConditionalProcessor.instance;
    }

    /**
     * Register lookup data sources from PowerApps
     */
    public setLookupDataSources(dataSources: Record<string, any[]>): void {
        this.lookupDataSources = dataSources;
        console.log('📊 Registered lookup data sources:', Object.keys(dataSources));
    }

    /**
     * Process conditional logic for a field when its dependency changes
     */
    public processConditional(
        fieldKey: string,
        config: PowerAppsConditionalConfig,
        context: PowerAppsConditionalContext,
        datasets?: Record<string, any>
    ): any {
        if (!config.dependsOn) {
            return undefined;
        }

        const dependencyValue = context.currentValues[config.dependsOn];
        
        // If dependency has no value, don't process
        if (dependencyValue === null || dependencyValue === undefined || dependencyValue === '') {
            return undefined;
        }

        // Handle lookup configuration with optional mapping
        if (config.lookup) {
            let lookupValue = dependencyValue;
            
            // First, map the value if lookup mapping is configured
            if (config.lookupMapping) {
                const mappedValue = this.processLookup(config.lookupMapping, dependencyValue, context, datasets);
                if (mappedValue !== undefined) {
                    lookupValue = mappedValue;
                    console.log(`🔄 Mapped ${dependencyValue} to ${lookupValue} using ${config.lookupMapping.dataSource}`);
                } else {
                    console.log(`⚠️ No mapping found for ${dependencyValue} in ${config.lookupMapping.dataSource}`);
                    return undefined;
                }
            }
            
            // Then perform the actual lookup
            return this.processLookup(config.lookup, lookupValue, context, datasets);
        }

        // Handle formula-based conditional logic
        if (config.formula) {
            return this.processFormula(config.formula, context);
        }

        // Handle default value formula
        if (config.defaultValueFormula) {
            return this.processDefaultValue(config.defaultValueFormula, context);
        }

        return undefined;
    }

    /**
     * Process lookup logic - supports both traditional data sources and direct array passing
     */
    private processLookup(
        lookupConfig: { dataSource: string; filterColumn: string | any[]; returnColumn: string | any[] },
        filterValue: any,
        context: PowerAppsConditionalContext,
        datasets?: Record<string, any>
    ): any {
        try {
            // NEW: Handle direct array-based lookup (your preferred method)
            if (Array.isArray(lookupConfig.filterColumn) && Array.isArray(lookupConfig.returnColumn)) {
                console.log(`🎯 Using direct array lookup: searching for ${filterValue}`);
                
                // Find matching index in filterColumn array
                for (let i = 0; i < lookupConfig.filterColumn.length; i++) {
                    const filterRecord = lookupConfig.filterColumn[i];
                    const returnRecord = lookupConfig.returnColumn[i];
                    
                    // Handle both object format {DrawingNumCombined: 'value'} and direct values
                    let recordValue;
                    if (typeof filterRecord === 'object' && filterRecord !== null) {
                        // Get the first property value from the object
                        const keys = Object.keys(filterRecord);
                        if (keys.length > 0) {
                            recordValue = filterRecord[keys[0]];
                        }
                    } else {
                        recordValue = filterRecord;
                    }
                    
                    if (recordValue === filterValue) {
                        // Return the corresponding value from returnColumn array
                        let result;
                        if (typeof returnRecord === 'object' && returnRecord !== null) {
                            const returnKeys = Object.keys(returnRecord);
                            if (returnKeys.length > 0) {
                                result = returnRecord[returnKeys[0]];
                            }
                        } else {
                            result = returnRecord;
                        }
                        
                        console.log(`✅ Array lookup successful: ${filterValue} → ${result}`);
                        return result;
                    }
                }
                
                console.log(`🔍 No matching record found for ${filterValue} in filter array`);
                return undefined;
            }
            
            // EXISTING: Traditional data source lookup (fallback)
            let dataSource: any[] = [];
            
            // 1. Try PowerApps global context (collections, etc.)
            if (context.globalDataSources && context.globalDataSources[lookupConfig.dataSource]) {
                const globalData = context.globalDataSources[lookupConfig.dataSource];
                if (Array.isArray(globalData)) {
                    dataSource = globalData;
                    console.log(`📊 Using global data source: ${lookupConfig.dataSource}`);
                } else if (globalData.records) {
                    // Handle PCF dataset format
                    const recordIds = Object.keys(globalData.records);
                    dataSource = recordIds.map(id => {
                        const record = globalData.records[id];
                        const item: any = {};
                        
                        if (globalData.columns) {
                            Object.keys(globalData.columns).forEach(colKey => {
                                try {
                                    item[colKey] = record.getValue(colKey);
                                } catch (e) {
                                    // Fallback for non-PCF records
                                    item[colKey] = record[colKey];
                                }
                            });
                        }
                        
                        return item;
                    });
                    console.log(`📊 Using global PCF dataset: ${lookupConfig.dataSource}`);
                }
            }
            
            // 2. Try local datasets parameter
            else if (datasets && datasets[lookupConfig.dataSource]) {
                const dataset = datasets[lookupConfig.dataSource];
                if (dataset.records) {
                    const recordIds = Object.keys(dataset.records);
                    dataSource = recordIds.map(id => {
                        const record = dataset.records[id];
                        const item: any = {};
                        
                        if (dataset.columns) {
                            Object.keys(dataset.columns).forEach(colKey => {
                                try {
                                    item[colKey] = record.getValue(colKey);
                                } catch (e) {
                                    item[colKey] = record[colKey];
                                }
                            });
                        }
                        
                        return item;
                    });
                    console.log(`📊 Using local dataset: ${lookupConfig.dataSource}`);
                }
            }
            
            // 3. Try context.allRecords as fallback
            else if (context.allRecords) {
                dataSource = context.allRecords;
                console.log(`📊 Using context records as fallback`);
            }

            if (dataSource.length === 0) {
                console.warn(`⚠️ No data found for lookup source: ${lookupConfig.dataSource}`);
                return undefined;
            }

            // Perform traditional lookup (only if using string-based column names)
            if (typeof lookupConfig.filterColumn === 'string' && typeof lookupConfig.returnColumn === 'string') {
                const matchingRecord = dataSource.find(record => {
                    const recordValue = record[lookupConfig.filterColumn as string];
                    return recordValue === filterValue;
                });

                if (matchingRecord) {
                    const result = matchingRecord[lookupConfig.returnColumn as string];
                    console.log(`✅ Lookup successful: ${lookupConfig.filterColumn}=${filterValue} → ${lookupConfig.returnColumn}=${result}`);
                    return result;
                }

                console.log(`🔍 No matching record found for ${lookupConfig.filterColumn} = ${filterValue} in ${lookupConfig.dataSource}`);
            }
            
            return undefined;
        } catch (error) {
            console.warn(`⚠️ Error processing lookup in ${lookupConfig.dataSource}:`, error);
            return undefined;
        }
    }

    /**
     * Process formula-based conditional logic
     * Simple string replacement for now - can be enhanced later
     */
    private processFormula(formula: string, context: PowerAppsConditionalContext): any {
        try {
            // Simple variable replacement
            let processedFormula = formula;
            
            Object.keys(context.currentValues).forEach(key => {
                const value = context.currentValues[key];
                const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
                processedFormula = processedFormula.replace(new RegExp(`\\b${key}\\b`, 'g'), valueStr);
            });

            // For safety, only allow very simple expressions
            if (processedFormula.match(/^[a-zA-Z0-9\s"'.,+\-*/()]+$/)) {
                // This is a very basic evaluation - in real scenarios, 
                // you'd want a proper expression evaluator
                console.log(`📝 Processing formula: ${processedFormula}`);
                return processedFormula; // Return as string for now
            }

            return formula; // Return original if can't process safely
        } catch (error) {
            console.warn('⚠️ Error processing formula:', error);
            return formula;
        }
    }

    /**
     * Process default value formula
     */
    private processDefaultValue(formula: string, context: PowerAppsConditionalContext): any {
        // Only process for new records
        if (!context.isNewRecord) {
            return undefined;
        }

        return this.processFormula(formula, context);
    }

    /**
     * Check if a field has conditional dependencies
     */
    public hasConditionalDependencies(config: PowerAppsConditionalConfig): boolean {
        return !!(config.dependsOn && (config.lookup || config.formula || config.defaultValueFormula));
    }

    /**
     * Get all field dependencies for a configuration set
     */
    public getDependencies(configurations: Record<string, { conditional?: PowerAppsConditionalConfig }>): Record<string, string[]> {
        const dependencies: Record<string, string[]> = {};

        Object.keys(configurations).forEach(fieldKey => {
            const config = configurations[fieldKey].conditional;
            if (config && config.dependsOn) {
                if (!dependencies[config.dependsOn]) {
                    dependencies[config.dependsOn] = [];
                }
                dependencies[config.dependsOn].push(fieldKey);
            }
        });

        return dependencies;
    }
}
