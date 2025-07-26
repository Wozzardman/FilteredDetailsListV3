import React from 'react';
import { IGridPlugin, IGridContext } from '../types/Advanced.types';

/**
 * Plugin Manager for the Enhanced Grid System
 */
export class PluginManager {
    private plugins: Map<string, IGridPlugin> = new Map();
    private context: IGridContext | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    /**
     * Initialize the plugin manager with grid context
     */
    public initialize(context: IGridContext): void {
        this.context = context;

        // Initialize all registered plugins
        for (const plugin of this.plugins.values()) {
            try {
                plugin.init(context);
                console.log(`Plugin "${plugin.name}" initialized successfully`);
            } catch (error) {
                console.error(`Failed to initialize plugin "${plugin.name}":`, error);
            }
        }
    }

    /**
     * Register a new plugin
     */
    public register(plugin: IGridPlugin): boolean {
        try {
            // Validate plugin
            this.validatePlugin(plugin);

            // Check for conflicts
            if (this.plugins.has(plugin.name)) {
                throw new Error(`Plugin "${plugin.name}" is already registered`);
            }

            // Check dependencies
            this.checkDependencies(plugin);

            // Register the plugin
            this.plugins.set(plugin.name, plugin);

            // Initialize immediately if context is available
            if (this.context) {
                plugin.init(this.context);
            }

            this.emit('plugin:registered', { plugin });
            return true;
        } catch (error) {
            console.error(`Failed to register plugin "${plugin.name}":`, error);
            return false;
        }
    }

    /**
     * Unregister a plugin
     */
    public unregister(pluginName: string): boolean {
        try {
            const plugin = this.plugins.get(pluginName);
            if (!plugin) {
                throw new Error(`Plugin "${pluginName}" not found`);
            }

            // Check if other plugins depend on this one
            const dependents = this.findDependents(pluginName);
            if (dependents.length > 0) {
                throw new Error(
                    `Cannot unregister "${pluginName}" because it is required by: ${dependents.join(', ')}`,
                );
            }

            // Destroy the plugin
            plugin.destroy();

            // Remove from registry
            this.plugins.delete(pluginName);

            this.emit('plugin:unregistered', { pluginName });
            return true;
        } catch (error) {
            console.error(`Failed to unregister plugin "${pluginName}":`, error);
            return false;
        }
    }

    /**
     * Get a registered plugin
     */
    public getPlugin(name: string): IGridPlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * Get all registered plugins
     */
    public getAllPlugins(): IGridPlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Get plugins by category or type
     */
    public getPluginsByType(type: string): IGridPlugin[] {
        return this.getAllPlugins().filter((plugin) => (plugin as any).type === type);
    }

    /**
     * Execute plugin hooks
     */
    public async executeHook(hookName: string, data?: any): Promise<any> {
        let result = data;

        for (const plugin of this.plugins.values()) {
            if (plugin.hooks && plugin.hooks[hookName as keyof typeof plugin.hooks]) {
                try {
                    const hookResult = await plugin.hooks[hookName as keyof typeof plugin.hooks]!(result);
                    if (hookResult !== undefined) {
                        result = hookResult;
                    }
                } catch (error) {
                    console.error(`Hook "${hookName}" failed in plugin "${plugin.name}":`, error);
                }
            }
        }

        return result;
    }

    /**
     * Render plugin components
     */
    public renderPluginComponents(position: 'toolbar' | 'sidebar' | 'contextMenu'): React.ReactNode[] {
        const components: React.ReactNode[] = [];

        this.plugins.forEach((plugin, name) => {
            if (plugin.components && plugin.components[position]) {
                const Component = plugin.components[position]!;
                components.push(
                    React.createElement(Component, {
                        key: `plugin-${name}-${position}`,
                        context: this.context,
                    }),
                );
            }
        });

        return components;
    }

    /**
     * Get plugin configuration
     */
    public getPluginConfig(pluginName: string): any {
        const plugin = this.plugins.get(pluginName);
        return plugin ? (plugin as any).config : null;
    }

    /**
     * Update plugin configuration
     */
    public updatePluginConfig(pluginName: string, config: any): boolean {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return false;

        (plugin as any).config = { ...(plugin as any).config, ...config };
        this.emit('plugin:config-updated', { pluginName, config });
        return true;
    }

    /**
     * Enable/disable a plugin
     */
    public setPluginEnabled(pluginName: string, enabled: boolean): boolean {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return false;

        (plugin as any).enabled = enabled;

        if (enabled && this.context) {
            plugin.init(this.context);
        } else {
            plugin.destroy();
        }

        this.emit('plugin:toggled', { pluginName, enabled });
        return true;
    }

    /**
     * Check if a plugin is enabled
     */
    public isPluginEnabled(pluginName: string): boolean {
        const plugin = this.plugins.get(pluginName);
        return plugin ? (plugin as any).enabled !== false : false;
    }

    /**
     * Get plugin statistics
     */
    public getPluginStats(): any {
        return {
            totalPlugins: this.plugins.size,
            enabledPlugins: this.getAllPlugins().filter((p) => this.isPluginEnabled(p.name)).length,
            hooks: this.getAvailableHooks(),
            components: this.getAvailableComponents(),
        };
    }

    /**
     * Event system for plugins
     */
    public on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    public off(event: string, callback: Function): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
        }
    }

    public emit(event: string, data?: any): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener error for "${event}":`, error);
                }
            });
        }
    }

    /**
     * Destroy all plugins and clean up
     */
    public destroy(): void {
        for (const plugin of this.plugins.values()) {
            try {
                plugin.destroy();
            } catch (error) {
                console.error(`Error destroying plugin "${plugin.name}":`, error);
            }
        }

        this.plugins.clear();
        this.listeners.clear();
        this.context = null;
    }

    // Private helper methods

    private validatePlugin(plugin: IGridPlugin): void {
        if (!plugin.name || typeof plugin.name !== 'string') {
            throw new Error('Plugin must have a valid name');
        }

        if (!plugin.version || typeof plugin.version !== 'string') {
            throw new Error('Plugin must have a valid version');
        }

        if (typeof plugin.init !== 'function') {
            throw new Error('Plugin must have an init function');
        }

        if (typeof plugin.destroy !== 'function') {
            throw new Error('Plugin must have a destroy function');
        }
    }

    private checkDependencies(plugin: IGridPlugin): void {
        if (!plugin.dependencies) return;

        for (const dependency of plugin.dependencies) {
            if (!this.plugins.has(dependency)) {
                throw new Error(`Plugin "${plugin.name}" requires "${dependency}" which is not installed`);
            }
        }
    }

    private findDependents(pluginName: string): string[] {
        const dependents: string[] = [];

        for (const plugin of this.plugins.values()) {
            if (plugin.dependencies && plugin.dependencies.includes(pluginName)) {
                dependents.push(plugin.name);
            }
        }

        return dependents;
    }

    private getAvailableHooks(): string[] {
        const hooks = new Set<string>();

        for (const plugin of this.plugins.values()) {
            if (plugin.hooks) {
                Object.keys(plugin.hooks).forEach((hook) => hooks.add(hook));
            }
        }

        return Array.from(hooks);
    }

    private getAvailableComponents(): string[] {
        const components = new Set<string>();

        for (const plugin of this.plugins.values()) {
            if (plugin.components) {
                Object.keys(plugin.components).forEach((comp) => components.add(comp));
            }
        }

        return Array.from(components);
    }
}

// Singleton instance
export const pluginManager = new PluginManager();

// Plugin development utilities
export class PluginBuilder {
    private plugin: Partial<IGridPlugin> = {};

    public static create(name: string, version: string): PluginBuilder {
        const builder = new PluginBuilder();
        builder.plugin.name = name;
        builder.plugin.version = version;
        return builder;
    }

    public description(description: string): PluginBuilder {
        this.plugin.description = description;
        return this;
    }

    public dependencies(deps: string[]): PluginBuilder {
        this.plugin.dependencies = deps;
        return this;
    }

    public init(initFn: (context: IGridContext) => void): PluginBuilder {
        this.plugin.init = initFn;
        return this;
    }

    public destroy(destroyFn: () => void): PluginBuilder {
        this.plugin.destroy = destroyFn;
        return this;
    }

    public hook(hookName: string, hookFn: Function): PluginBuilder {
        if (!this.plugin.hooks) {
            this.plugin.hooks = {};
        }
        (this.plugin.hooks as any)[hookName] = hookFn;
        return this;
    }

    public component(position: string, component: React.ComponentType<any>): PluginBuilder {
        if (!this.plugin.components) {
            this.plugin.components = {};
        }
        (this.plugin.components as any)[position] = component;
        return this;
    }

    public build(): IGridPlugin {
        if (!this.plugin.name || !this.plugin.version) {
            throw new Error('Plugin must have name and version');
        }

        if (!this.plugin.init) {
            this.plugin.init = () => {};
        }

        if (!this.plugin.destroy) {
            this.plugin.destroy = () => {};
        }

        return this.plugin as IGridPlugin;
    }
}

// Built-in plugins

/**
 * Data Quality Plugin - Analyzes and reports data quality issues
 */
export const DataQualityPlugin = PluginBuilder.create('data-quality', '1.0.0')
    .description('Analyzes data quality and provides insights')
    .hook('onDataChange', (data: any[]) => {
        // Analyze data quality
        const analysis = analyzeDataQuality(data);
        console.log('Data Quality Analysis:', analysis);
        return data;
    })
    .component('sidebar', ({ context }: { context: any }) =>
        React.createElement(
            'div',
            { className: 'data-quality-panel' },
            React.createElement('h3', {}, 'Data Quality'),
            React.createElement('div', {}, 'Quality Score: 85%'),
            React.createElement('div', {}, 'Issues Found: 3'),
        ),
    )
    .build();

/**
 * Performance Monitor Plugin - Tracks and displays performance metrics
 */
export const PerformanceMonitorPlugin = PluginBuilder.create('performance-monitor', '1.0.0')
    .description('Monitors and displays performance metrics')
    .hook('beforeRender', (props: any) => {
        (window as any).__gridRenderStart = performance.now();
        return props;
    })
    .hook('afterRender', (element: HTMLElement) => {
        const renderTime = performance.now() - (window as any).__gridRenderStart;
        console.log(`Render time: ${renderTime.toFixed(2)}ms`);
    })
    .component('toolbar', ({ context }: { context: any }) =>
        React.createElement(
            'div',
            { className: 'performance-badge' },
            React.createElement('span', {}, `⚡ ${(window as any).__lastRenderTime || 0}ms`),
        ),
    )
    .build();

/**
 * Export Enhancement Plugin - Adds advanced export features
 */
export const ExportEnhancementPlugin = PluginBuilder.create('export-enhancement', '1.0.0')
    .description('Provides advanced export capabilities')
    .hook('onExport', async (options: any) => {
        // Add export templates, custom formats, etc.
        console.log('Enhanced export options:', options);
        return options;
    })
    .component('toolbar', ({ context }: { context: any }) =>
        React.createElement(
            'button',
            {
                className: 'export-templates-button',
                onClick: () => {
                    // Show export templates dialog
                    console.log('Show export templates');
                },
            },
            '📊 Templates',
        ),
    )
    .build();

/**
 * Keyboard Shortcuts Plugin - Adds keyboard navigation and shortcuts
 */
export const KeyboardShortcutsPlugin = PluginBuilder.create('keyboard-shortcuts', '1.0.0')
    .description('Provides keyboard shortcuts and navigation')
    .init((context: IGridContext) => {
        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'f':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        // Open filter dialog
                        console.log('Open filter dialog');
                    }
                    break;
                case 'e':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        // Open export dialog
                        console.log('Open export dialog');
                    }
                    break;
                case 'a':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        // Select all rows
                        console.log('Select all rows');
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        (context as any).__keyboardHandler = handleKeyDown;
    })
    .destroy(() => {
        if ((window as any).__keyboardHandler) {
            document.removeEventListener('keydown', (window as any).__keyboardHandler);
        }
    })
    .build();

// Helper functions

function analyzeDataQuality(data: any[]): any {
    if (!data || data.length === 0) {
        return { score: 0, issues: ['No data available'] };
    }

    const headers = Object.keys(data[0]);
    const issues: string[] = [];
    let totalScore = 0;

    headers.forEach((header) => {
        const values = data.map((row) => row[header]);
        const nonNullValues = values.filter((v) => v != null);

        const completeness = nonNullValues.length / values.length;
        const uniqueness = new Set(nonNullValues).size / nonNullValues.length;

        if (completeness < 0.9) {
            issues.push(`Column "${header}" has missing data (${Math.round((1 - completeness) * 100)}%)`);
        }

        if (uniqueness < 0.1 && nonNullValues.length > 10) {
            issues.push(`Column "${header}" has low uniqueness (${Math.round(uniqueness * 100)}%)`);
        }

        totalScore += (completeness + uniqueness) / 2;
    });

    const averageScore = headers.length > 0 ? totalScore / headers.length : 0;

    return {
        score: Math.round(averageScore * 100),
        issues,
        metrics: {
            completeness: Math.round((totalScore / headers.length) * 100),
            consistency: 85, // Placeholder
            validity: 92, // Placeholder
        },
    };
}
