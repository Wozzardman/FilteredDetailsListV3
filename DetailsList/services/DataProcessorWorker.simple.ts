import * as Comlink from 'comlink';
import { formatDistance } from 'date-fns';

// Simplified Web Worker for essential data processing only
// Removed analytics, AI, and collaboration features for Canvas Apps compatibility

export interface IDataProcessorConfig {
    enableFuzzySearch?: boolean;
    enableDataValidation?: boolean;
    chunkSize?: number;
    maxProcessingTime?: number;
}

export interface ISearchConfig {
    keys: string[];
    threshold: number;
    includeScore: boolean;
    includeMatches: boolean;
    minMatchCharLength: number;
    ignoreLocation: boolean;
    findAllMatches: boolean;
}

export interface ISearchResult {
    item: any;
    score?: number;
    matches?: Array<{
        key: string;
        value: string;
        indices: number[][];
    }>;
}

export interface IDataValidationResult {
    isValid: boolean;
    errors: Array<{
        recordIndex: number;
        columnKey: string;
        value: any;
        errorType: 'type' | 'range' | 'format' | 'required' | 'custom';
        message: string;
    }>;
    warnings: Array<{
        recordIndex: number;
        columnKey: string;
        value: any;
        warningType: 'unusual' | 'outlier' | 'inconsistent';
        message: string;
    }>;
}

// Simplified worker class focused on essential functionality
export class DataProcessorWorker {
    private config: IDataProcessorConfig = {
        enableFuzzySearch: true,
        enableDataValidation: true,
        chunkSize: 10000,
        maxProcessingTime: 30000, // 30 seconds max
    };

    setConfig(config: Partial<IDataProcessorConfig>): void {
        this.config = { ...this.config, ...config };
    }

    // Essential fuzzy search functionality
    async performFuzzySearch(items: any[], searchTerm: string, searchConfig: ISearchConfig): Promise<ISearchResult[]> {
        if (!this.config.enableFuzzySearch || !searchTerm.trim()) {
            return [];
        }

        const results: ISearchResult[] = [];
        const lowerSearchTerm = searchTerm.toLowerCase();

        for (const item of items) {
            let score = 0;
            let matches: any[] = [];

            for (const key of searchConfig.keys) {
                const value = String(item[key] || '').toLowerCase();
                
                if (value.includes(lowerSearchTerm)) {
                    const matchScore = this.calculateSimpleScore(value, lowerSearchTerm);
                    score = Math.max(score, matchScore);
                    
                    if (searchConfig.includeMatches) {
                        matches.push({
                            key,
                            value: item[key],
                            indices: [[value.indexOf(lowerSearchTerm), value.indexOf(lowerSearchTerm) + lowerSearchTerm.length]]
                        });
                    }
                }
            }

            if (score >= searchConfig.threshold) {
                const result: ISearchResult = { item };
                if (searchConfig.includeScore) result.score = score;
                if (searchConfig.includeMatches && matches.length > 0) result.matches = matches;
                results.push(result);
            }

            // Yield control periodically
            if (results.length % 1000 === 0) {
                await this.yield();
            }
        }

        return results.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    // Essential data validation
    async performDataValidation(items: any[], validationRules: any[]): Promise<IDataValidationResult> {
        const errors: any[] = [];
        const warnings: any[] = [];

        for (let recordIndex = 0; recordIndex < items.length; recordIndex++) {
            const item = items[recordIndex];

            for (const rule of validationRules) {
                const value = item[rule.columnKey];

                // Required field validation
                if (rule.required && (value === null || value === undefined || value === '')) {
                    errors.push({
                        recordIndex,
                        columnKey: rule.columnKey,
                        value,
                        errorType: 'required',
                        message: `${rule.columnKey} is required but is empty`,
                    });
                    continue;
                }

                // Type validation
                if (value !== null && value !== undefined && rule.dataType) {
                    const isValidType = this.validateDataType(value, rule.dataType);
                    if (!isValidType) {
                        errors.push({
                            recordIndex,
                            columnKey: rule.columnKey,
                            value,
                            errorType: 'type',
                            message: `${rule.columnKey} should be of type ${rule.dataType}`,
                        });
                    }
                }

                // Range validation for numbers
                if (rule.dataType === 'number' && typeof value === 'number') {
                    if (rule.min !== undefined && value < rule.min) {
                        errors.push({
                            recordIndex,
                            columnKey: rule.columnKey,
                            value,
                            errorType: 'range',
                            message: `${rule.columnKey} value ${value} is below minimum ${rule.min}`,
                        });
                    }
                    if (rule.max !== undefined && value > rule.max) {
                        errors.push({
                            recordIndex,
                            columnKey: rule.columnKey,
                            value,
                            errorType: 'range',
                            message: `${rule.columnKey} value ${value} is above maximum ${rule.max}`,
                        });
                    }
                }
            }

            // Yield control periodically
            if (recordIndex % 1000 === 0) {
                await this.yield();
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    private calculateSimpleScore(text: string, searchTerm: string): number {
        if (text === searchTerm) return 1.0;
        if (text.startsWith(searchTerm)) return 0.9;
        if (text.includes(searchTerm)) return 0.7;
        return 0.0;
    }

    private validateDataType(value: any, expectedType: string): boolean {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'date':
                return value instanceof Date || !isNaN(Date.parse(value));
            default:
                return true;
        }
    }

    private async yield(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, 0));
    }
}

// Export worker for Comlink
Comlink.expose(DataProcessorWorker);
