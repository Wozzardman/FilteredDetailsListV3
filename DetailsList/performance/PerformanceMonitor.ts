/**
 * Enterprise-grade performance monitoring for FilteredDetailsListV2
 * Implements performance patterns used by META, Google, Microsoft
 */

interface IPerformanceMetrics {
    renderTime: number;
    filterTime: number;
    scrollPerformance: number;
    memoryUsage: number;
    cpuUsage: number;
    frameRate: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
}

interface IPerformanceConfig {
    enableMetrics: boolean;
    sampleRate: number;
    alertThresholds: {
        renderTime: number;
        memoryUsage: number;
        frameRate: number;
    };
}

export class PerformanceMonitor {
    private metrics: IPerformanceMetrics[] = [];
    private config: IPerformanceConfig;
    private observer: PerformanceObserver | null = null;
    private frameRateMonitor: number | null = null;
    private memoryMonitor: number | null = null;

    constructor(config: IPerformanceConfig) {
        this.config = config;
        this.initializeMonitoring();
    }

    private initializeMonitoring() {
        if (!this.config.enableMetrics) return;

        // Web Vitals monitoring (Google's Core Web Vitals)
        this.initializeWebVitals();

        // Frame rate monitoring (60fps target like React DevTools)
        this.initializeFrameRateMonitor();

        // Memory usage monitoring (Chrome DevTools style)
        this.initializeMemoryMonitor();

        // Custom performance marks (similar to React Profiler)
        this.initializeCustomMarks();
    }

    private initializeWebVitals() {
        // iOS WebView safety: PerformanceObserver may not support all entry types
        // and can crash on iOS Power Apps mobile app if not handled properly
        if (typeof PerformanceObserver === 'undefined') {
            return;
        }

        try {
            this.observer = new PerformanceObserver((list) => {
                try {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        this.processPerformanceEntry(entry);
                    });
                } catch (e) {
                    // Silently ignore processing errors on mobile
                }
            });

            // Use only the most universally supported entry types
            // 'paint' and 'measure' are widely supported
            // Avoid 'largest-contentful-paint', 'first-input', 'layout-shift' which can crash iOS WebView
            const supportedEntryTypes = this.getSafeEntryTypes();
            
            if (supportedEntryTypes.length > 0) {
                this.observer.observe({
                    entryTypes: supportedEntryTypes,
                });
            }
        } catch (error) {
            // PerformanceObserver may fail on iOS Power Apps WebView - fail silently
            console.warn('PerformanceObserver initialization failed (likely iOS WebView):', error);
            this.observer = null;
        }
    }

    /**
     * Get safe entry types that work on iOS WebView/Power Apps mobile
     * iOS Safari/WebView has limited PerformanceObserver support
     */
    private getSafeEntryTypes(): string[] {
        const safeTypes: string[] = [];
        
        // Only use entry types that are definitely supported
        // 'measure' is widely supported across all platforms
        try {
            if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes) {
                const supported = PerformanceObserver.supportedEntryTypes;
                // Only include universally safe types
                if (supported.includes('measure')) safeTypes.push('measure');
                if (supported.includes('mark')) safeTypes.push('mark');
                // 'paint' is generally safe but check anyway
                if (supported.includes('paint')) safeTypes.push('paint');
            } else {
                // Fallback: only use 'measure' which is universally supported
                safeTypes.push('measure');
            }
        } catch (e) {
            // If checking supported types fails, use minimal safe set
            safeTypes.push('measure');
        }
        
        return safeTypes;
    }

    private initializeFrameRateMonitor() {
        // Mobile-safe: Check if performance.now is available
        if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
            console.warn('Performance API not available, skipping frame rate monitoring');
            return;
        }
        
        let lastTime = performance.now();
        let frameCount = 0;

        const measureFrameRate = () => {
            const currentTime = performance.now();
            frameCount++;

            if (currentTime - lastTime >= 1000) {
                // Every second
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.recordMetric('frameRate', fps);
                frameCount = 0;
                lastTime = currentTime;
            }

            this.frameRateMonitor = requestAnimationFrame(measureFrameRate);
        };

        measureFrameRate();
    }

    private initializeMemoryMonitor() {
        // Mobile-safe: performance.memory is NOT available on iOS Safari/WebView
        // Only available in Chrome/Edge desktop
        if (typeof performance === 'undefined') {
            return;
        }
        
        this.memoryMonitor = window.setInterval(() => {
            try {
                if ('memory' in performance && (performance as any).memory) {
                    const memory = (performance as any).memory;
                    if (memory.usedJSHeapSize && memory.totalJSHeapSize) {
                        const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
                        this.recordMetric('memoryUsage', memoryUsage);
                    }
                }
            } catch (error) {
                // Silently fail on unsupported platforms (iOS)
                console.warn('Memory monitoring not supported on this platform');
                if (this.memoryMonitor) {
                    clearInterval(this.memoryMonitor);
                    this.memoryMonitor = null;
                }
            }
        }, 5000) as any; // Every 5 seconds
    }

    private initializeCustomMarks() {
        // Custom performance marks for component lifecycle
        // Use 'pagehide' instead of 'beforeunload' - beforeunload is blocked by Permissions Policy
        // in modern browsers and iOS WebView (causes crash)
        try {
            if (typeof window !== 'undefined' && window.addEventListener) {
                window.addEventListener('pagehide', () => {
                    this.generatePerformanceReport();
                });
            }
        } catch (e) {
            // Silently fail if event listener cannot be added
        }
    }

    public startMeasure(name: string): () => void {
        const startMark = `${name}-start`;
        performance.mark(startMark);

        return () => {
            const endMark = `${name}-end`;
            performance.mark(endMark);
            performance.measure(name, startMark, endMark);

            const measure = performance.getEntriesByName(name, 'measure')[0];
            if (measure) {
                this.recordMetric(name, measure.duration);
            }
        };
    }

    public measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const endMeasure = this.startMeasure(name);
        return fn().finally(() => {
            endMeasure();
        });
    }

    public measureSync<T>(name: string, fn: () => T): T {
        const endMeasure = this.startMeasure(name);
        try {
            return fn();
        } finally {
            endMeasure();
        }
    }

    private processPerformanceEntry(entry: PerformanceEntry) {
        switch (entry.entryType) {
            case 'largest-contentful-paint':
                this.recordMetric('largestContentfulPaint', entry.startTime);
                break;
            case 'first-input':
                const fidEntry = entry as PerformanceEventTiming;
                this.recordMetric('firstInputDelay', fidEntry.processingStart - fidEntry.startTime);
                break;
            case 'layout-shift':
                const clsEntry = entry as any; // LayoutShift interface
                this.recordMetric('cumulativeLayoutShift', clsEntry.value);
                break;
        }
    }

    public recordMetric(name: string, value: number) {
        const currentMetrics = this.getCurrentMetrics();
        (currentMetrics as any)[name] = value;

        // Alert if threshold exceeded
        this.checkThresholds(name, value);

        // Sample rate limiting
        if (Math.random() < this.config.sampleRate) {
            this.metrics.push({ ...currentMetrics });
        }
    }

    private getCurrentMetrics(): IPerformanceMetrics {
        return {
            renderTime: 0,
            filterTime: 0,
            scrollPerformance: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            frameRate: 60,
            largestContentfulPaint: 0,
            firstInputDelay: 0,
            cumulativeLayoutShift: 0,
        };
    }

    private checkThresholds(metricName: string, value: number) {
        const thresholds = this.config.alertThresholds;

        if (metricName === 'renderTime' && value > thresholds.renderTime) {
            console.warn(`Performance Alert: Render time ${value}ms exceeds threshold ${thresholds.renderTime}ms`);
        }

        if (metricName === 'memoryUsage' && value > thresholds.memoryUsage) {
            console.warn(`Performance Alert: Memory usage ${value}% exceeds threshold ${thresholds.memoryUsage}%`);
        }

        if (metricName === 'frameRate' && value < thresholds.frameRate) {
            console.warn(`Performance Alert: Frame rate ${value}fps below threshold ${thresholds.frameRate}fps`);
        }
    }

    public getMetrics(): IPerformanceMetrics[] {
        return [...this.metrics];
    }

    public getAverageMetrics(): IPerformanceMetrics {
        if (this.metrics.length === 0) return this.getCurrentMetrics();

        const totals = this.metrics.reduce((acc, metric) => {
            Object.keys(metric).forEach((key) => {
                acc[key] = (acc[key] || 0) + (metric as any)[key];
            });
            return acc;
        }, {} as any);

        Object.keys(totals).forEach((key) => {
            totals[key] = totals[key] / this.metrics.length;
        });

        return totals;
    }

    public generatePerformanceReport(): string {
        const averages = this.getAverageMetrics();
        const report = {
            timestamp: new Date().toISOString(),
            componentName: 'FilteredDetailsListV2',
            averageMetrics: averages,
            totalSamples: this.metrics.length,
            webVitalsGrade: this.calculateWebVitalsGrade(averages),
            recommendations: this.generateRecommendations(averages),
        };

        console.log('Performance Report:', report);
        return JSON.stringify(report, null, 2);
    }

    private calculateWebVitalsGrade(metrics: IPerformanceMetrics): 'A' | 'B' | 'C' | 'D' | 'F' {
        // Google's Core Web Vitals thresholds
        const lcp = metrics.largestContentfulPaint;
        const fid = metrics.firstInputDelay;
        const cls = metrics.cumulativeLayoutShift;

        let score = 0;

        // LCP scoring
        if (lcp <= 2500) score += 40;
        else if (lcp <= 4000) score += 20;

        // FID scoring
        if (fid <= 100) score += 30;
        else if (fid <= 300) score += 15;

        // CLS scoring
        if (cls <= 0.1) score += 30;
        else if (cls <= 0.25) score += 15;

        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    private generateRecommendations(metrics: IPerformanceMetrics): string[] {
        const recommendations: string[] = [];

        if (metrics.largestContentfulPaint > 2500) {
            recommendations.push('Consider optimizing image loading and reducing render-blocking resources');
        }

        if (metrics.firstInputDelay > 100) {
            recommendations.push('Reduce JavaScript execution time and consider code splitting');
        }

        if (metrics.frameRate < 55) {
            recommendations.push('Optimize rendering performance and reduce layout thrashing');
        }

        if (metrics.memoryUsage > 0.8) {
            recommendations.push('Investigate memory leaks and optimize data structures');
        }

        return recommendations;
    }

    public destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }

        if (this.frameRateMonitor) {
            cancelAnimationFrame(this.frameRateMonitor);
        }

        if (this.memoryMonitor) {
            clearInterval(this.memoryMonitor);
        }
    }
}

// Singleton instance for global performance monitoring
export const performanceMonitor = new PerformanceMonitor({
    enableMetrics: true,
    sampleRate: 0.1, // 10% sampling
    alertThresholds: {
        renderTime: 16.67, // 60fps target
        memoryUsage: 0.8, // 80% memory usage
        frameRate: 55, // Minimum acceptable frame rate
    },
});
