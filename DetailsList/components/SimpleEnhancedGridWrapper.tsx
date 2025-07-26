import * as React from 'react';
import { GridStoreProvider } from '../store/GridStore';
import { GridProps } from '../Grid';
import { GridEnhanced } from '../GridEnhanced';

// Simple wrapper that enables or disables enhanced features
interface ISimpleEnhancedGridProps extends GridProps {
    useEnhancedFeatures?: boolean;
    enablePerformanceMonitoring?: boolean;
    enableDataExport?: boolean;
    enableAIInsights?: boolean;
}

export const SimpleEnhancedGridWrapper: React.FC<ISimpleEnhancedGridProps> = ({
    useEnhancedFeatures = false,
    enablePerformanceMonitoring = false,
    enableDataExport = false,
    enableAIInsights = false,
    ...gridProps
}) => {
    console.log('🔄 SIMPLE WRAPPER: Enhanced features requested:', useEnhancedFeatures);

    if (useEnhancedFeatures) {
        // Use our new GridEnhanced component with enhanced features
        return (
            <GridEnhanced
                {...gridProps}
                enablePerformanceMonitoring={enablePerformanceMonitoring}
                enableDataExport={enableDataExport}
                enableAIInsights={enableAIInsights}
            />
        );
    }

    // Use original Grid implementation for compatibility
    const { Grid } = require('../Grid');
    return React.createElement(Grid, gridProps);
};
