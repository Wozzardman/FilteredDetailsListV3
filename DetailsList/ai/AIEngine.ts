/**
 * AI-powered features for FilteredDetailsListV2
 * Includes smart suggestions, anomaly detection, and predictive analytics
 * Inspired by Google Workspace Intelligence and Microsoft Viva Insights
 */

import * as React from 'react';

interface IAIInsight {
    id: string;
    type: 'anomaly' | 'pattern' | 'suggestion' | 'prediction';
    title: string;
    description: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    data: any;
    actions?: Array<{
        label: string;
        action: () => void;
    }>;
    timestamp: number;
}

interface ISmartFilter {
    column: string;
    operator: string;
    value: any;
    confidence: number;
    reasoning: string;
}

interface IPredictiveAnalytics {
    trends: Array<{
        column: string;
        direction: 'increasing' | 'decreasing' | 'stable';
        confidence: number;
        prediction: number;
    }>;
    outliers: Array<{
        rowId: string;
        column: string;
        value: any;
        expectedValue: any;
        deviation: number;
    }>;
    correlations: Array<{
        column1: string;
        column2: string;
        correlation: number;
        significance: number;
    }>;
}

export class AIEngine {
    private insights: IAIInsight[] = [];
    private modelCache = new Map<string, any>();
    private isProcessing = false;
    private insightCallbacks = new Set<(insights: IAIInsight[]) => void>();

    // Anomaly Detection using Z-Score and Isolation Forest-like algorithms
    public detectAnomalies(data: any[], columns: string[]): IAIInsight[] {
        const anomalies: IAIInsight[] = [];

        columns.forEach(column => {
            const values = data
                .map(item => parseFloat(item[column]))
                .filter(val => !isNaN(val));

            if (values.length < 10) return; // Need minimum data for analysis

            const { mean, stdDev } = this.calculateStatistics(values);
            const threshold = 2.5; // Z-score threshold

            data.forEach((item, index) => {
                const value = parseFloat(item[column]);
                if (isNaN(value)) return;

                const zScore = Math.abs((value - mean) / stdDev);
                if (zScore > threshold) {
                    anomalies.push({
                        id: `anomaly-${column}-${index}`,
                        type: 'anomaly',
                        title: `Unusual value detected in ${column}`,
                        description: `Value ${value} is ${zScore.toFixed(2)} standard deviations from the mean (${mean.toFixed(2)})`,
                        confidence: Math.min(0.9, zScore / 5),
                        severity: zScore > 4 ? 'high' : zScore > 3 ? 'medium' : 'low',
                        data: {
                            rowIndex: index,
                            column,
                            value,
                            zScore,
                            mean,
                            stdDev
                        },
                        actions: [
                            {
                                label: 'Highlight Row',
                                action: () => this.highlightAnomalousRow(index)
                            },
                            {
                                label: 'Filter Similar Values',
                                action: () => this.filterSimilarValues(column, value, stdDev)
                            }
                        ],
                        timestamp: Date.now()
                    });
                }
            });
        });

        return anomalies;
    }

    // Pattern Recognition for data trends
    public analyzePatterns(data: any[], columns: string[]): IAIInsight[] {
        const patterns: IAIInsight[] = [];

        columns.forEach(column => {
            const timeSeries = this.extractTimeSeries(data, column);
            if (timeSeries.length < 5) return;

            const trend = this.detectTrend(timeSeries);
            const seasonality = this.detectSeasonality(timeSeries);
            const cycles = this.detectCycles(timeSeries);

            if (trend.strength > 0.6) {
                patterns.push({
                    id: `trend-${column}`,
                    type: 'pattern',
                    title: `${trend.direction} trend detected in ${column}`,
                    description: `Strong ${trend.direction} trend with ${(trend.strength * 100).toFixed(1)}% confidence`,
                    confidence: trend.strength,
                    severity: trend.strength > 0.8 ? 'high' : 'medium',
                    data: {
                        column,
                        trend: trend.direction,
                        strength: trend.strength,
                        slope: trend.slope
                    },
                    actions: [
                        {
                            label: 'Show Trend Line',
                            action: () => this.showTrendVisualization(column, trend)
                        },
                        {
                            label: 'Predict Future Values',
                            action: () => this.predictFutureValues(column, trend)
                        }
                    ],
                    timestamp: Date.now()
                });
            }

            if (seasonality.strength > 0.5) {
                patterns.push({
                    id: `seasonality-${column}`,
                    type: 'pattern',
                    title: `Seasonal pattern in ${column}`,
                    description: `Repeating pattern every ${seasonality.period} periods`,
                    confidence: seasonality.strength,
                    severity: 'medium',
                    data: {
                        column,
                        period: seasonality.period,
                        strength: seasonality.strength
                    },
                    timestamp: Date.now()
                });
            }
        });

        return patterns;
    }

    // Smart Filter Suggestions based on data analysis
    public suggestSmartFilters(data: any[], userContext?: any): ISmartFilter[] {
        const suggestions: ISmartFilter[] = [];

        // Analyze user behavior patterns
        if (userContext?.recentFilters) {
            const commonPatterns = this.findCommonFilterPatterns(userContext.recentFilters);
            suggestions.push(...this.generatePatternBasedFilters(commonPatterns));
        }

        // Suggest filters based on data distribution
        Object.keys(data[0] || {}).forEach(column => {
            const values = data.map(item => item[column]);
            const distribution = this.analyzeValueDistribution(values);

            // Suggest filtering outliers
            if (distribution.outliers.length > 0) {
                suggestions.push({
                    column,
                    operator: 'not_in',
                    value: distribution.outliers,
                    confidence: 0.7,
                    reasoning: `Remove ${distribution.outliers.length} outlier values to focus on main data`
                });
            }

            // Suggest common value filters
            if (distribution.topValues.length > 0) {
                suggestions.push({
                    column,
                    operator: 'in',
                    value: distribution.topValues.slice(0, 3).map(v => v.value),
                    confidence: 0.8,
                    reasoning: `Focus on top ${Math.min(3, distribution.topValues.length)} most common values`
                });
            }
        });

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    // Predictive Analytics
    public generatePredictions(data: any[], columns: string[]): IPredictiveAnalytics {
        const trends: any[] = [];
        const outliers: any[] = [];
        const correlations: any[] = [];

        // Trend analysis
        columns.forEach(column => {
            const values = data
                .map(item => parseFloat(item[column]))
                .filter(val => !isNaN(val));

            if (values.length >= 5) {
                const trend = this.detectTrend(values.map((val, idx) => ({ x: idx, y: val })));
                const prediction = this.predictNextValue(values, trend);

                trends.push({
                    column,
                    direction: trend.direction,
                    confidence: trend.strength,
                    prediction
                });
            }
        });

        // Outlier detection
        columns.forEach(column => {
            const anomalies = this.detectAnomalies(data, [column]);
            anomalies.forEach(anomaly => {
                if (anomaly.type === 'anomaly') {
                    outliers.push({
                        rowId: anomaly.data.rowIndex.toString(),
                        column,
                        value: anomaly.data.value,
                        expectedValue: anomaly.data.mean,
                        deviation: anomaly.data.zScore
                    });
                }
            });
        });

        // Correlation analysis
        for (let i = 0; i < columns.length; i++) {
            for (let j = i + 1; j < columns.length; j++) {
                const col1Values = data.map(item => parseFloat(item[columns[i]])).filter(val => !isNaN(val));
                const col2Values = data.map(item => parseFloat(item[columns[j]])).filter(val => !isNaN(val));

                if (col1Values.length === col2Values.length && col1Values.length >= 10) {
                    const correlation = this.calculateCorrelation(col1Values, col2Values);
                    const significance = this.calculateSignificance(correlation, col1Values.length);

                    if (Math.abs(correlation) > 0.3 && significance < 0.05) {
                        correlations.push({
                            column1: columns[i],
                            column2: columns[j],
                            correlation,
                            significance
                        });
                    }
                }
            }
        }

        return { trends, outliers, correlations };
    }

    // Natural Language Query Processing
    public processNaturalLanguageQuery(query: string, data: any[]): {
        filters: ISmartFilter[];
        confidence: number;
        interpretation: string;
    } {
        const lowercaseQuery = query.toLowerCase();
        const filters: ISmartFilter[] = [];
        
        // Simple NLP patterns (in a real implementation, use a proper NLP library)
        const patterns = [
            {
                pattern: /show me (\w+) where (\w+) is (greater than|more than|>) (\d+)/,
                handler: (matches: RegExpMatchArray) => {
                    filters.push({
                        column: matches[2],
                        operator: 'greater_than',
                        value: parseFloat(matches[4]),
                        confidence: 0.9,
                        reasoning: `Filter ${matches[2]} for values greater than ${matches[4]}`
                    });
                }
            },
            {
                pattern: /find (\w+) containing "([^"]+)"/,
                handler: (matches: RegExpMatchArray) => {
                    filters.push({
                        column: matches[1],
                        operator: 'contains',
                        value: matches[2],
                        confidence: 0.85,
                        reasoning: `Search for ${matches[1]} containing "${matches[2]}"`
                    });
                }
            },
            {
                pattern: /top (\d+) (\w+)/,
                handler: (matches: RegExpMatchArray) => {
                    const count = parseInt(matches[1]);
                    const column = matches[2];
                    const values = data.map(item => item[column]).sort((a, b) => b - a).slice(0, count);
                    filters.push({
                        column,
                        operator: 'in',
                        value: values,
                        confidence: 0.8,
                        reasoning: `Show top ${count} values in ${column}`
                    });
                }
            }
        ];

        let confidence = 0;
        let interpretation = 'No clear pattern found';

        for (const pattern of patterns) {
            const match = lowercaseQuery.match(pattern.pattern);
            if (match) {
                pattern.handler(match);
                confidence = 0.8;
                interpretation = `Interpreted as filter request: ${match[0]}`;
                break;
            }
        }

        return { filters, confidence, interpretation };
    }

    // Utility methods
    private calculateStatistics(values: number[]) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        return { mean, variance, stdDev };
    }

    private extractTimeSeries(data: any[], column: string) {
        return data
            .map((item, index) => ({
                x: index,
                y: parseFloat(item[column])
            }))
            .filter(point => !isNaN(point.y));
    }

    private detectTrend(timeSeries: Array<{ x: number; y: number }>) {
        const n = timeSeries.length;
        if (n < 2) return { direction: 'stable', strength: 0, slope: 0 };

        // Linear regression
        const sumX = timeSeries.reduce((sum, point) => sum + point.x, 0);
        const sumY = timeSeries.reduce((sum, point) => sum + point.y, 0);
        const sumXY = timeSeries.reduce((sum, point) => sum + point.x * point.y, 0);
        const sumXX = timeSeries.reduce((sum, point) => sum + point.x * point.x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared
        const yMean = sumY / n;
        const ssTotal = timeSeries.reduce((sum, point) => sum + Math.pow(point.y - yMean, 2), 0);
        const ssResidual = timeSeries.reduce((sum, point) => {
            const predicted = slope * point.x + intercept;
            return sum + Math.pow(point.y - predicted, 2);
        }, 0);
        const rSquared = 1 - (ssResidual / ssTotal);

        const direction = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';
        
        return {
            direction,
            strength: Math.abs(rSquared),
            slope
        };
    }

    private detectSeasonality(timeSeries: Array<{ x: number; y: number }>) {
        // Simple autocorrelation-based seasonality detection
        const maxLag = Math.min(Math.floor(timeSeries.length / 3), 12);
        let bestPeriod = 1;
        let bestCorrelation = 0;

        for (let lag = 2; lag <= maxLag; lag++) {
            const correlation = this.calculateAutocorrelation(timeSeries, lag);
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestPeriod = lag;
            }
        }

        return {
            period: bestPeriod,
            strength: bestCorrelation
        };
    }

    private detectCycles(timeSeries: Array<{ x: number; y: number }>) {
        // Placeholder for cycle detection (would use FFT in real implementation)
        return [];
    }

    private calculateAutocorrelation(timeSeries: Array<{ x: number; y: number }>, lag: number): number {
        if (lag >= timeSeries.length) return 0;

        const values = timeSeries.map(point => point.y);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < values.length - lag; i++) {
            numerator += (values[i] - mean) * (values[i + lag] - mean);
        }
        
        for (let i = 0; i < values.length; i++) {
            denominator += Math.pow(values[i] - mean, 2);
        }
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    private calculateCorrelation(x: number[], y: number[]): number {
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        const sumYY = y.reduce((sum, val) => sum + val * val, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    private calculateSignificance(correlation: number, n: number): number {
        // Simple t-test for correlation significance
        const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
        // This is a simplified p-value calculation
        return Math.abs(t) > 2 ? 0.01 : 0.1;
    }

    private predictNextValue(values: number[], trend: any): number {
        if (values.length === 0) return 0;
        const lastValue = values[values.length - 1];
        return lastValue + trend.slope;
    }

    private analyzeValueDistribution(values: any[]) {
        const frequency = new Map<any, number>();
        values.forEach(val => {
            frequency.set(val, (frequency.get(val) || 0) + 1);
        });

        const sortedByFrequency = Array.from(frequency.entries())
            .sort((a, b) => b[1] - a[1]);

        const numericValues = values
            .map(val => parseFloat(val))
            .filter(val => !isNaN(val));

        let outliers: any[] = [];
        if (numericValues.length > 0) {
            const { mean, stdDev } = this.calculateStatistics(numericValues);
            outliers = values.filter(val => {
                const num = parseFloat(val);
                return !isNaN(num) && Math.abs(num - mean) > 2 * stdDev;
            });
        }

        return {
            topValues: sortedByFrequency.slice(0, 5).map(([value, count]) => ({ value, count })),
            outliers,
            uniqueCount: frequency.size,
            totalCount: values.length
        };
    }

    private findCommonFilterPatterns(recentFilters: any[]): any[] {
        // Analyze recent filter patterns to suggest similar filters
        return [];
    }

    private generatePatternBasedFilters(patterns: any[]): ISmartFilter[] {
        // Generate filter suggestions based on user patterns
        return [];
    }

    // Action methods (to be implemented based on your component architecture)
    private highlightAnomalousRow(index: number) {
        console.log('Highlighting anomalous row:', index);
    }

    private filterSimilarValues(column: string, value: number, stdDev: number) {
        console.log('Filtering similar values:', column, value, stdDev);
    }

    private showTrendVisualization(column: string, trend: any) {
        console.log('Showing trend visualization:', column, trend);
    }

    private predictFutureValues(column: string, trend: any) {
        console.log('Predicting future values:', column, trend);
    }

    public addInsightCallback(callback: (insights: IAIInsight[]) => void) {
        this.insightCallbacks.add(callback);
    }

    public removeInsightCallback(callback: (insights: IAIInsight[]) => void) {
        this.insightCallbacks.delete(callback);
    }

    private notifyInsightCallbacks() {
        this.insightCallbacks.forEach(callback => callback(this.insights));
    }

    public getInsights(): IAIInsight[] {
        return [...this.insights];
    }

    public clearInsights() {
        this.insights = [];
        this.notifyInsightCallbacks();
    }
}

// React hook for AI features
export const useAIInsights = (data: any[], columns: string[]) => {
    const [aiEngine] = React.useState(() => new AIEngine());
    const [insights, setInsights] = React.useState<IAIInsight[]>([]);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);

    React.useEffect(() => {
        const callback = (newInsights: IAIInsight[]) => {
            setInsights(newInsights);
        };

        aiEngine.addInsightCallback(callback);
        return () => aiEngine.removeInsightCallback(callback);
    }, [aiEngine]);

    const runAnalysis = React.useCallback(async () => {
        if (data.length === 0 || columns.length === 0) return;

        setIsAnalyzing(true);
        
        try {
            // Run analysis in chunks to avoid blocking the UI
            const anomalies = await new Promise<IAIInsight[]>(resolve => {
                setTimeout(() => {
                    resolve(aiEngine.detectAnomalies(data, columns));
                }, 0);
            });

            const patterns = await new Promise<IAIInsight[]>(resolve => {
                setTimeout(() => {
                    resolve(aiEngine.analyzePatterns(data, columns));
                }, 0);
            });

            const allInsights = [...anomalies, ...patterns];
            setInsights(allInsights);
        } finally {
            setIsAnalyzing(false);
        }
    }, [data, columns, aiEngine]);

    return {
        insights,
        isAnalyzing,
        runAnalysis,
        suggestFilters: (userContext?: any) => aiEngine.suggestSmartFilters(data, userContext),
        processNaturalLanguage: (query: string) => aiEngine.processNaturalLanguageQuery(query, data),
        generatePredictions: () => aiEngine.generatePredictions(data, columns),
        clearInsights: () => aiEngine.clearInsights()
    };
};
