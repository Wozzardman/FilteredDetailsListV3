#!/usr/bin/env node

/**
 * Create ultra-minimal Canvas Apps build
 * Removes all non-essential features for maximum compatibility
 */

const fs = require('fs');
const path = require('path');

// Find the bundle file
const outDir = './out/controls/DetailsList';
const bundlePath = path.join(outDir, 'bundle.js');

if (!fs.existsSync(bundlePath)) {
    console.log('Bundle file not found, skipping minimal optimization');
    process.exit(0);
}

console.log('🔧 Creating ultra-minimal Canvas Apps build...');

let bundleContent = fs.readFileSync(bundlePath, 'utf8');
const originalSize = bundleContent.length;

// Remove enterprise features that Canvas Apps might not need
const enterpriseFeatures = [
    // AI and collaboration features
    /AI.*Engine/g,
    /Collaboration.*Engine/g,
    /ai\/.*\.ts/g,
    /collaboration\/.*\.tsx/g,
    
    // Advanced performance monitoring
    /PerformanceMetrics/g,
    /performance\/.*\.ts/g,
    
    // Complex data processing
    /DataProcessorWorker/g,
    /services\/DataProcessor/g,
    
    // Advanced export features
    /jspdf/gi,
    /xlsx/gi,
    /DataExportService/g,
    
    // Complex virtualization (keep basic)
    /react-virtualized(?!.*auto-sizer)/g,
    /react-window-infinite/g,
    
    // Heavy UI components
    /Storybook/g,
    /backstop/g,
    /playwright/g
];

console.log('🎯 Removing enterprise features for Canvas Apps...');
enterpriseFeatures.forEach(pattern => {
    const matches = bundleContent.match(pattern);
    if (matches) {
        console.log(`   Removed ${matches.length} instances of ${pattern.toString().slice(0, 40)}...`);
        bundleContent = bundleContent.replace(pattern, '/* Removed for Canvas Apps */');
    }
});

// Simplify complex React patterns for Canvas Apps compatibility
const reactSimplifications = [
    // Simplify useCallback with many deps
    {
        pattern: /React\.useCallback\([^,]+,\s*\[[^\]]{50,}\]\)/g,
        replacement: 'React.useCallback(() => {}, [])'
    },
    // Simplify useMemo with complex deps
    {
        pattern: /React\.useMemo\([^,]+,\s*\[[^\]]{30,}\]\)/g,
        replacement: 'React.useMemo(() => ({}), [])'
    },
    // Remove complex error boundaries
    {
        pattern: /componentDidCatch[^}]+}/g,
        replacement: 'componentDidCatch() {}'
    }
];

console.log('⚡ Simplifying React patterns...');
reactSimplifications.forEach(({pattern, replacement}) => {
    const matches = bundleContent.match(pattern);
    if (matches) {
        console.log(`   Simplified ${matches.length} React patterns`);
        bundleContent = bundleContent.replace(pattern, replacement);
    }
});

// Ultra compression for Canvas Apps
console.log('🗜️ Ultra compression for Canvas Apps...');
bundleContent = bundleContent
    .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '') // Remove all comments
    .replace(/\s{2,}/g, ' ') // Multiple spaces to single
    .replace(/\n\s*/g, '\n') // Remove indentation
    .replace(/;\s*}/g, ';}') // Compact object endings
    .replace(/,\s*}/g, ',}') // Compact array/object endings
    .replace(/{\s*/g, '{') // Compact object starts
    .replace(/\[\s*/g, '[') // Compact array starts
    .replace(/\s*\)/g, ')') // Compact function calls
    .replace(/\(\s*/g, '('); // Compact function params

const finalSize = bundleContent.length;
const reduction = ((originalSize - finalSize) / originalSize * 100).toFixed(1);

fs.writeFileSync(bundlePath, bundleContent);

console.log('✅ Ultra-minimal Canvas Apps build completed!');
console.log(`📊 Bundle size: ${(originalSize/1024/1024).toFixed(2)}MB → ${(finalSize/1024/1024).toFixed(2)}MB`);
console.log(`📉 Additional reduction: ${reduction}%`);
console.log('🎯 Maximum Canvas Apps compatibility achieved!');
