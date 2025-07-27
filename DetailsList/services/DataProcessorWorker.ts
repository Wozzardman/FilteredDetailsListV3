import * as Comlink from 'comlink';
import { formatDistance } from 'date-fns';

// Web Worker for heavy data processing using Comlink
// Meta/Google-level background processing for enterprise performance

export interface IDataProcessorConfig {
    enableFuzzySearch?: boolean;
    enableStatisticalAnalysis?: boolean;
    enablePatternRecognition?: boolean;
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
    score: number;
    matches: Array<{
        key: string;
        value: string;
        indices: number[][];
    }>;
}

export interface IStatisticalAnalysis {
    columnKey: string;
    count: number;
    uniqueValues: number;
    mean?: number;
    median?: number;
    mode?: any;
    standardDeviation?: number;
    min?: any;
    max?: any;
    nullCount: number;
    dataType: 'string' | 'number' | 'date' | 'boolean' | 'mixed';
    distribution?: { [value: string]: number };
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

export interface IPatternRecognitionResult {
    patterns: Array<{
        type: 'trend' | 'cycle' | 'outlier' | 'correlation';
        confidence: number;
        description: string;
        affectedColumns: string[];
        affectedRows: number[];
        suggestion?: string;
    }>;
    insights: Array<{
        type: 'performance' | 'data_quality' | 'business';
        priority: 'high' | 'medium' | 'low';
        message: string;
        actionable: boolean;
    }>;
}

// Worker class that will run in Web Worker context
export class DataProcessorWorker {
    private config: IDataProcessorConfig = {
        enableFuzzySearch: true,
        enableStatisticalAnalysis: true,
        enablePatternRecognition: true,
        enableDataValidation: true,
        chunkSize: 10000,
        maxProcessingTime: 30000, // 30 seconds max
    };

    setConfig(config: Partial<IDataProcessorConfig>): void {
        this.config = { ...this.config, ...config };
    }

    // Advanced fuzzy search implementation (Meta/Instagram quality)
    async performFuzzySearch(items: any[], searchTerm: string, searchConfig: ISearchConfig): Promise<ISearchResult[]> {
        if (!searchTerm || searchTerm.trim() === '') return [];

        const results: ISearchResult[] = [];
        const term = searchTerm.toLowerCase();

        // Process in chunks to avoid blocking
        for (let i = 0; i < items.length; i += this.config.chunkSize!) {
            const chunk = items.slice(i, i + this.config.chunkSize!);

            for (let j = 0; j < chunk.length; j++) {
                const item = chunk[j];
                let bestScore = 0;
                const matches: any[] = [];

                // Search across configured keys
                for (const key of searchConfig.keys) {
                    const value = item[key];
                    if (!value) continue;

                    const valueStr = value.toString().toLowerCase();
                    const score = this.calculateFuzzyScore(valueStr, term, searchConfig.threshold);

                    if (score > searchConfig.threshold) {
                        bestScore = Math.max(bestScore, score);

                        if (searchConfig.includeMatches) {
                            const indices = this.findMatchIndices(valueStr, term);
                            matches.push({
                                key,
                                value: valueStr,
                                indices,
                            });
                        }
                    }
                }

                if (bestScore > searchConfig.threshold) {
                    results.push({
                        item,
                        score: bestScore,
                        matches: searchConfig.includeMatches ? matches : [],
                    });
                }
            }

            // Yield control to prevent blocking
            if (i % (this.config.chunkSize! * 5) === 0) {
                await this.yield();
            }
        }

        // Sort by score (best matches first)
        return results.sort((a, b) => b.score - a.score);
    }

    // Statistical analysis for enterprise insights
    async performStatisticalAnalysis(items: any[], columns: string[]): Promise<IStatisticalAnalysis[]> {
        const results: IStatisticalAnalysis[] = [];

        for (const columnKey of columns) {
            const analysis: IStatisticalAnalysis = {
                columnKey,
                count: 0,
                uniqueValues: 0,
                nullCount: 0,
                dataType: 'mixed',
                distribution: {},
            };

            const values: any[] = [];
            const uniqueSet = new Set();
            let nullCount = 0;
            let numberCount = 0;
            let stringCount = 0;
            let dateCount = 0;
            let booleanCount = 0;

            // Process in chunks
            for (let i = 0; i < items.length; i += this.config.chunkSize!) {
                const chunk = items.slice(i, i + this.config.chunkSize!);

                for (const item of chunk) {
                    const value = item[columnKey];

                    if (value == null || value === '') {
                        nullCount++;
                        continue;
                    }

                    values.push(value);
                    uniqueSet.add(value);

                    // Count distribution
                    const strValue = value.toString();
                    analysis.distribution![strValue] = (analysis.distribution![strValue] || 0) + 1;

                    // Determine data type
                    if (typeof value === 'number') numberCount++;
                    else if (typeof value === 'boolean') booleanCount++;
                    else if (value instanceof Date || !isNaN(Date.parse(value))) dateCount++;
                    else stringCount++;
                }

                // Yield control
                if (i % (this.config.chunkSize! * 10) === 0) {
                    await this.yield();
                }
            }

            analysis.count = values.length;
            analysis.uniqueValues = uniqueSet.size;
            analysis.nullCount = nullCount;

            // Determine primary data type
            const total = values.length;
            if (numberCount / total > 0.8) analysis.dataType = 'number';
            else if (dateCount / total > 0.8) analysis.dataType = 'date';
            else if (booleanCount / total > 0.8) analysis.dataType = 'boolean';
            else if (stringCount / total > 0.8) analysis.dataType = 'string';

            // Calculate statistics for numeric data
            if (analysis.dataType === 'number') {
                const numericValues = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
                if (numericValues.length > 0) {
                    numericValues.sort((a, b) => a - b);
                    analysis.min = numericValues[0];
                    analysis.max = numericValues[numericValues.length - 1];
                    analysis.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
                    analysis.median = numericValues[Math.floor(numericValues.length / 2)];

                    // Standard deviation
                    const variance =
                        numericValues.reduce((acc, val) => acc + Math.pow(val - analysis.mean!, 2), 0) /
                        numericValues.length;
                    analysis.standardDeviation = Math.sqrt(variance);
                }
            }

            // Find mode for all data types
            let maxCount = 0;
            for (const [value, count] of Object.entries(analysis.distribution!)) {
                if (count > maxCount) {
                    maxCount = count;
                    analysis.mode = value;
                }
            }

            results.push(analysis);
        }

        return results;
    }

    // Pattern recognition and anomaly detection
    async performPatternRecognition(items: any[], columns: string[]): Promise<IPatternRecognitionResult> {
        const patterns: any[] = [];
        const insights: any[] = [];

        // Detect trends in numeric columns
        for (const columnKey of columns) {
            const numericValues: number[] = [];
            const indices: number[] = [];

            for (let i = 0; i < items.length; i++) {
                const value = parseFloat(items[i][columnKey]);
                if (!isNaN(value)) {
                    numericValues.push(value);
                    indices.push(i);
                }
            }

            if (numericValues.length > 10) {
                // Trend detection using linear regression
                const trend = this.detectTrend(numericValues);
                if (trend.confidence > 0.7) {
                    patterns.push({
                        type: 'trend',
                        confidence: trend.confidence,
                        description: `${columnKey} shows a ${trend.direction} trend`,
                        affectedColumns: [columnKey],
                        affectedRows: indices,
                        suggestion:
                            trend.direction === 'increasing'
                                ? 'Consider if this growth is sustainable'
                                : 'Investigate potential causes of decline',
                    });
                }

                // Outlier detection using IQR method
                const outliers = this.detectOutliers(numericValues, indices);
                if (outliers.length > 0) {
                    patterns.push({
                        type: 'outlier',
                        confidence: 0.9,
                        description: `Found ${outliers.length} outliers in ${columnKey}`,
                        affectedColumns: [columnKey],
                        affectedRows: outliers,
                        suggestion: 'Review outlier values for data quality issues',
                    });
                }
            }

            // Yield control
            await this.yield();
        }

        // Generate business insights
        if (patterns.length === 0) {
            insights.push({
                type: 'data_quality',
                priority: 'medium',
                message: 'Data appears consistent with no significant patterns detected',
                actionable: false,
            });
        } else {
            insights.push({
                type: 'business',
                priority: 'high',
                message: `Found ${patterns.length} significant patterns requiring attention`,
                actionable: true,
            });
        }

        return { patterns, insights };
    }

    // Data validation with enterprise rules
    async performDataValidation(items: any[], validationRules: any[]): Promise<IDataValidationResult> {
        const errors: any[] = [];
        const warnings: any[] = [];

        for (let i = 0; i < items.length; i += this.config.chunkSize!) {
            const chunk = items.slice(i, i + this.config.chunkSize!);

            for (let j = 0; j < chunk.length; j++) {
                const item = chunk[j];
                const recordIndex = i + j;

                for (const rule of validationRules) {
                    const value = item[rule.columnKey];

                    // Required field validation
                    if (rule.required && (value == null || value === '')) {
                        errors.push({
                            recordIndex,
                            columnKey: rule.columnKey,
                            value,
                            errorType: 'required',
                            message: `${rule.columnKey} is required`,
                        });
                        continue;
                    }

                    if (value == null || value === '') continue;

                    // Type validation
                    if (rule.dataType && !this.validateDataType(value, rule.dataType)) {
                        errors.push({
                            recordIndex,
                            columnKey: rule.columnKey,
                            value,
                            errorType: 'type',
                            message: `Expected ${rule.dataType}, got ${typeof value}`,
                        });
                    }

                    // Range validation for numbers
                    if (rule.dataType === 'number' && typeof value === 'number') {
                        if (rule.min != null && value < rule.min) {
                            errors.push({
                                recordIndex,
                                columnKey: rule.columnKey,
                                value,
                                errorType: 'range',
                                message: `Value ${value} is below minimum ${rule.min}`,
                            });
                        }
                        if (rule.max != null && value > rule.max) {
                            errors.push({
                                recordIndex,
                                columnKey: rule.columnKey,
                                value,
                                errorType: 'range',
                                message: `Value ${value} is above maximum ${rule.max}`,
                            });
                        }
                    }

                    // Custom validation
                    if (rule.customValidator) {
                        try {
                            const isValid = rule.customValidator(value);
                            if (!isValid) {
                                errors.push({
                                    recordIndex,
                                    columnKey: rule.columnKey,
                                    value,
                                    errorType: 'custom',
                                    message: rule.customMessage || 'Custom validation failed',
                                });
                            }
                        } catch (error) {
                            warnings.push({
                                recordIndex,
                                columnKey: rule.columnKey,
                                value,
                                warningType: 'inconsistent',
                                message: 'Custom validator threw an error',
                            });
                        }
                    }
                }
            }

            // Yield control
            if (i % (this.config.chunkSize! * 5) === 0) {
                await this.yield();
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    // Helper methods
    private calculateFuzzyScore(text: string, pattern: string, threshold: number): number {
        if (text.includes(pattern)) return 1.0; // Exact match

        // Levenshtein distance-based scoring
        const distance = this.levenshteinDistance(text, pattern);
        const maxLength = Math.max(text.length, pattern.length);
        const score = 1 - distance / maxLength;

        return score > threshold ? score : 0;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    private findMatchIndices(text: string, pattern: string): number[][] {
        const indices: number[][] = [];
        let index = text.indexOf(pattern);

        while (index !== -1) {
            indices.push([index, index + pattern.length - 1]);
            index = text.indexOf(pattern, index + 1);
        }

        return indices;
    }

    private detectTrend(values: number[]): { direction: string; confidence: number; slope: number } {
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((acc, y, x) => acc + x * y, 0);
        const sumXX = values.reduce((acc, _, x) => acc + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const correlation = this.calculateCorrelation(values);

        return {
            direction: slope > 0 ? 'increasing' : 'decreasing',
            confidence: Math.abs(correlation),
            slope,
        };
    }

    private calculateCorrelation(values: number[]): number {
        const n = values.length;
        const indices = Array.from({ length: n }, (_, i) => i);

        const meanX = indices.reduce((a, b) => a + b, 0) / n;
        const meanY = values.reduce((a, b) => a + b, 0) / n;

        const numerator = indices.reduce((acc, x, i) => acc + (x - meanX) * (values[i] - meanY), 0);

        const denomX = Math.sqrt(indices.reduce((acc, x) => acc + Math.pow(x - meanX, 2), 0));

        const denomY = Math.sqrt(values.reduce((acc, y) => acc + Math.pow(y - meanY, 2), 0));

        return numerator / (denomX * denomY);
    }

    private detectOutliers(values: number[], indices: number[]): number[] {
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        const outliers: number[] = [];
        values.forEach((value, i) => {
            if (value < lowerBound || value > upperBound) {
                outliers.push(indices[i]);
            }
        });

        return outliers;
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

// Expose the worker class via Comlink
Comlink.expose(DataProcessorWorker);
