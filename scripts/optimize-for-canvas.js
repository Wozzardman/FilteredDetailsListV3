#!/usr/bin/env node

/**
 * Canvas Apps optimization script
 * Reduces bundle size and removes problematic code patterns
 */

const fs = require('fs');
const path = require('path');

// Find the bundle file
const outDir = './out/controls/DetailsList';
const bundlePath = path.join(outDir, 'bundle.js');

if (!fs.existsSync(bundlePath)) {
    console.log('Bundle file not found, skipping Canvas Apps optimization');
    process.exit(0);
}

console.log('🎯 Optimizing bundle for Canvas Apps compatibility...');

let bundleContent = fs.readFileSync(bundlePath, 'utf8');
const originalSize = bundleContent.length;

// Remove development-only code
const devPatterns = [
    // React development warnings
    /console\.warn\([^)]*\)/g,
    /console\.log\([^)]*\)/g,
    /console\.error\([^)]*\)/g,
    /react-dom\.development/gi,
    
    // Development checks
    /if\s*\([^)]*NODE_ENV[^)]*\)/g,
    /process\.env\.NODE_ENV/g,
    
    // Large debug objects
    /debugInfo\s*:\s*\{[^}]*\}/g,
    /stackTrace\s*:\s*\{[^}]*\}/g,
    
    // Unused performance monitoring
    /performanceMarks/g,
    /performanceMeasures/g,
    
    // React DevTools
    /React DevTools/g,
    /__REACT_DEVTOOLS_GLOBAL_HOOK__/g
];

console.log('🧹 Removing development code...');
devPatterns.forEach(pattern => {
    const matches = bundleContent.match(pattern);
    if (matches) {
        console.log(`   Removed ${matches.length} instances of ${pattern.toString().slice(0, 30)}...`);
        bundleContent = bundleContent.replace(pattern, '');
    }
});

// Simplify complex virtualization for Canvas Apps
const virtualizationOptimizations = [
    // Reduce virtual item calculations
    {
        pattern: /estimateSize:\s*\(\)\s*=>\s*\d+/g,
        replacement: 'estimateSize: () => 32'
    },
    {
        pattern: /overscan:\s*\d+/g,
        replacement: 'overscan: 2'
    },
    // Simplify memoization for Canvas Apps
    {
        pattern: /React\.useMemo\(\(\)\s*=>\s*\{[^}]*\},\s*\[[^\]]*\]\)/g,
        replacement: 'React.useMemo(() => ({}), [])'
    }
];

console.log('⚡ Optimizing virtualization for Canvas Apps...');
virtualizationOptimizations.forEach(({pattern, replacement}) => {
    const matches = bundleContent.match(pattern);
    if (matches) {
        console.log(`   Optimized ${matches.length} virtualization patterns`);
        bundleContent = bundleContent.replace(pattern, replacement);
    }
});

// Remove unused imports that Canvas Apps might reject
const unusedImports = [
    // D3 charts (not commonly used in Canvas Apps)
    /import.*d3.*/g,
    // PDF generation (can cause issues)
    /import.*jspdf.*/g,
    // Complex analytics
    /import.*analytics.*/g,
    // Storybook
    /import.*storybook.*/g
];

console.log('📦 Removing unused heavy imports...');
unusedImports.forEach(pattern => {
    const matches = bundleContent.match(pattern);
    if (matches) {
        console.log(`   Removed ${matches.length} heavy import statements`);
        bundleContent = bundleContent.replace(pattern, '// Removed for Canvas Apps');
    }
});

// Minify large string patterns
console.log('🗜️ Compressing large patterns...');
bundleContent = bundleContent
    .replace(/\s{3,}/g, ' ')  // Multiple spaces to single
    .replace(/\n\s*\n/g, '\n')  // Multiple newlines to single
    .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, ''); // Remove comments

const finalSize = bundleContent.length;
const reduction = ((originalSize - finalSize) / originalSize * 100).toFixed(1);

fs.writeFileSync(bundlePath, bundleContent);

console.log('✅ Canvas Apps optimization completed!');
console.log(`📊 Bundle size: ${(originalSize/1024/1024).toFixed(2)}MB → ${(finalSize/1024/1024).toFixed(2)}MB`);
console.log(`📉 Size reduction: ${reduction}%`);
console.log('🎯 Bundle optimized for Canvas Apps import');
