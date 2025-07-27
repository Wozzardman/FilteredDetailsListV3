// Simple SimpleEnhancedGridWrapper component for backwards compatibility
import * as React from 'react';

export interface SimpleEnhancedGridWrapperProps {
    [key: string]: any; // Accept any props for compatibility
}

export const SimpleEnhancedGridWrapper: React.FC<SimpleEnhancedGridWrapperProps> = () => {
    return <div>Legacy SimpleEnhancedGridWrapper - Use UltimateEnterpriseGrid instead</div>;
};

export default SimpleEnhancedGridWrapper;
