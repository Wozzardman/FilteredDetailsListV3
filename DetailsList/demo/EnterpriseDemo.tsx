/**
 * Enterprise Demo Component
 * Showcases all Meta/Google-competitive features
 */

import * as React from 'react';
import { useState, useCallback } from 'react';
import { EnterpriseGridIntegration, useEnterpriseGridPerformance } from '../integration/EnterpriseGridIntegration';
import { createTestDataset, createTestColumns } from '../testing/EnterpriseTestDataGenerator';
import { PrimaryButton, DefaultButton, Dropdown, IDropdownOption, Slider, Toggle, Panel } from '@fluentui/react';

interface DemoState {
    testDataSize: 'small' | 'medium' | 'large' | 'massive';
    customRecordCount: number;
    customColumnCount: number;
    enableVirtualization: boolean | 'auto';
    performanceMode: 'standard' | 'enterprise' | 'meta-scale';
    enableTestMode: boolean;
    showPerformancePanel: boolean;
}

export const EnterpriseDemo: React.FC = () => {
    const [state, setState] = useState<DemoState>({
        testDataSize: 'medium',
        customRecordCount: 25000,
        customColumnCount: 15,
        enableVirtualization: 'auto',
        performanceMode: 'enterprise',
        enableTestMode: true,
        showPerformancePanel: false
    });

    const { metrics, alerts } = useEnterpriseGridPerformance();

    // Demo configuration options
    const dataSizeOptions: IDropdownOption[] = [
        { key: 'small', text: 'Small (1K records)' },
        { key: 'medium', text: 'Medium (25K records)' },
        { key: 'large', text: 'Large (100K records)' },
        { key: 'massive', text: 'Massive (500K records)' }
    ];

    const performanceModeOptions: IDropdownOption[] = [
        { key: 'standard', text: 'Standard Mode' },
        { key: 'enterprise', text: 'Enterprise Mode' },
        { key: 'meta-scale', text: 'Meta-Scale Mode' }
    ];

    const virtualizationOptions: IDropdownOption[] = [
        { key: 'auto', text: 'Auto-detect' },
        { key: 'true', text: 'Always On' },
        { key: 'false', text: 'Always Off' }
    ];

    // Event handlers
    const handleStateChange = useCallback((key: keyof DemoState, value: any) => {
        setState(prev => ({ ...prev, [key]: value }));
    }, []);

    const handlePerformanceAlert = useCallback((alert: any) => {
        console.warn('Performance Alert:', alert);
    }, []);

    const handleDataLoadComplete = useCallback((metrics: any) => {
        console.log('Data Load Complete:', metrics);
    }, []);

    const handleVirtualizationToggle = useCallback((enabled: boolean) => {
        console.log('Virtualization:', enabled ? 'Enabled' : 'Disabled');
    }, []);

    // Generate demo data configurations
    const getDemoConfigurations = () => [
        {
            title: 'Excel-like Editing Demo',
            description: 'Inline editing with drag-to-fill functionality',
            config: {
                testDataSize: 'small' as const,
                enableVirtualization: false,
                performanceMode: 'standard' as const,
                enableInlineEditing: true,
                enableBulkOperations: true
            }
        },
        {
            title: 'Enterprise Scale Demo',
            description: '100K+ records with advanced virtualization',
            config: {
                testDataSize: 'large' as const,
                enableVirtualization: true,
                performanceMode: 'enterprise' as const,
                enableAdvancedFiltering: true,
                enableRealTimeUpdates: true
            }
        },
        {
            title: 'Meta-Scale Performance',
            description: '500K+ records, Meta/Google-competitive performance',
            config: {
                testDataSize: 'massive' as const,
                enableVirtualization: true,
                performanceMode: 'meta-scale' as const,
                enablePerformanceMonitoring: true
            }
        }
    ];

    const loadDemoConfiguration = (config: any) => {
        setState(prev => ({
            ...prev,
            ...config,
            enableTestMode: true
        }));
    };

    const renderPerformanceMetrics = () => {
        if (!metrics) return null;

        return (
            <div className="performance-metrics">
                <h4>Real-time Performance</h4>
                <div className="metrics-grid">
                    <div className="metric">
                        <span className="metric-label">Render Time:</span>
                        <span className="metric-value">{metrics.renderTime?.toFixed(2)}ms</span>
                    </div>
                    <div className="metric">
                        <span className="metric-label">Memory Usage:</span>
                        <span className="metric-value">{metrics.memoryUsage?.toFixed(1)}MB</span>
                    </div>
                    <div className="metric">
                        <span className="metric-label">Last Update:</span>
                        <span className="metric-value">{new Date(metrics.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        );
    };

    const parseVirtualizationValue = (value: string): boolean | 'auto' => {
        if (value === 'auto') return 'auto';
        return value === 'true';
    };

    return (
        <div className="enterprise-demo">
            <div className="demo-header">
                <h2>🚀 Enterprise Grid Demo</h2>
                <p>Meta/Google-competitive features with massive dataset handling</p>
            </div>

            <div className="demo-controls">
                <div className="control-section">
                    <h3>Quick Demo Configurations</h3>
                    <div className="demo-buttons">
                        {getDemoConfigurations().map((demo, index) => (
                            <div key={index} className="demo-card">
                                <h4>{demo.title}</h4>
                                <p>{demo.description}</p>
                                <PrimaryButton 
                                    text="Load Demo"
                                    onClick={() => loadDemoConfiguration(demo.config)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="control-section">
                    <h3>Custom Configuration</h3>
                    <div className="control-grid">
                        <Dropdown
                            label="Data Size"
                            options={dataSizeOptions}
                            selectedKey={state.testDataSize}
                            onChange={(_, option) => option && handleStateChange('testDataSize', option.key)}
                        />

                        <Dropdown
                            label="Performance Mode"
                            options={performanceModeOptions}
                            selectedKey={state.performanceMode}
                            onChange={(_, option) => option && handleStateChange('performanceMode', option.key)}
                        />

                        <Dropdown
                            label="Virtualization"
                            options={virtualizationOptions}
                            selectedKey={state.enableVirtualization.toString()}
                            onChange={(_, option) => option && handleStateChange('enableVirtualization', parseVirtualizationValue(option.key as string))}
                        />

                        <div className="slider-control">
                            <label>Custom Record Count: {state.customRecordCount.toLocaleString()}</label>
                            <Slider
                                min={1000}
                                max={1000000}
                                step={1000}
                                value={state.customRecordCount}
                                onChange={(value) => handleStateChange('customRecordCount', value)}
                            />
                        </div>

                        <div className="slider-control">
                            <label>Custom Column Count: {state.customColumnCount}</label>
                            <Slider
                                min={5}
                                max={50}
                                step={1}
                                value={state.customColumnCount}
                                onChange={(value) => handleStateChange('customColumnCount', value)}
                            />
                        </div>

                        <Toggle
                            label="Enable Test Mode"
                            checked={state.enableTestMode}
                            onChange={(_, checked) => handleStateChange('enableTestMode', checked)}
                        />
                    </div>
                </div>

                <div className="control-section">
                    <div className="action-buttons">
                        <DefaultButton
                            text="Show Performance Panel"
                            onClick={() => handleStateChange('showPerformancePanel', true)}
                        />
                    </div>
                </div>
            </div>

            <div className="demo-content">
                <EnterpriseGridIntegration
                    // Core configuration
                    enableTestMode={state.enableTestMode}
                    testDataSize={state.testDataSize}
                    customTestConfig={state.enableTestMode ? {
                        recordCount: state.customRecordCount,
                        columnCount: state.customColumnCount,
                        complexity: 'enterprise'
                    } : undefined}
                    
                    // Performance configuration
                    enableVirtualization={typeof state.enableVirtualization === 'boolean' ? state.enableVirtualization : undefined}
                    virtualizationThreshold={10000}
                    performanceMode={state.performanceMode}
                    
                    // Advanced features
                    enableInlineEditing={true}
                    enableAdvancedFiltering={true}
                    enableRealTimeUpdates={true}
                    enableBulkOperations={true}
                    
                    // Performance monitoring
                    enablePerformanceMonitoring={true}
                    performanceThresholds={{
                        frameRate: 55,
                        memoryUsage: 500,
                        renderTime: 16
                    }}
                    
                    // Event handlers
                    onPerformanceAlert={handlePerformanceAlert}
                    onDataLoadComplete={handleDataLoadComplete}
                    onVirtualizationToggle={handleVirtualizationToggle}
                />
            </div>

            {/* Performance Panel */}
            <Panel
                isOpen={state.showPerformancePanel}
                onDismiss={() => handleStateChange('showPerformancePanel', false)}
                headerText="Performance Monitoring"
                closeButtonAriaLabel="Close"
                isLightDismiss={true}
            >
                {renderPerformanceMetrics()}
                
                <div className="performance-alerts">
                    <h4>Recent Alerts</h4>
                    {alerts.length === 0 ? (
                        <p>No performance alerts</p>
                    ) : (
                        alerts.slice(-5).map((alert, index) => (
                            <div key={index} className={`alert alert-${alert.type}`}>
                                <strong>{alert.metric}:</strong> {alert.message}
                            </div>
                        ))
                    )}
                </div>

                <div className="performance-tips">
                    <h4>Performance Tips</h4>
                    <ul>
                        <li>Enable virtualization for datasets over 10K records</li>
                        <li>Use Meta-Scale mode for maximum performance</li>
                        <li>Monitor memory usage for large datasets</li>
                        <li>Consider server-side filtering for 100K+ records</li>
                    </ul>
                </div>
            </Panel>
        </div>
    );
};
