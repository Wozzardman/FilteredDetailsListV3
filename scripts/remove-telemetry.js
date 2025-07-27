#!/usr/bin/env node

/**
 * Post-build script to remove Microsoft Application Insights telemetry
 * This prevents HTTP requests that cause Canvas Apps import failures
 */

const fs = require('fs');
const path = require('path');

// Find the bundle file
const outDir = './out/controls/DetailsList';
const bundlePath = path.join(outDir, 'bundle.js');

if (!fs.existsSync(bundlePath)) {
    console.log('Bundle file not found, skipping telemetry removal');
    process.exit(0);
}

console.log('Removing Application Insights telemetry from bundle...');

let bundleContent = fs.readFileSync(bundlePath, 'utf8');

// Remove telemetry endpoints
const telemetryPatterns = [
    /browser\.events\.data\.microsoft\.com/g,
    /OneCollector\/1\.0/g,
    /applicationinsights/gi,
    /sendBeacon\([^)]*\)/g,
    /XMLHttpRequest\(\)/g,
    /\.send\(.*telemetry.*\)/g,
    /content-type.*application\/x-json-stream/g
];

let modified = false;
telemetryPatterns.forEach(pattern => {
    if (pattern.test(bundleContent)) {
        bundleContent = bundleContent.replace(pattern, '');
        modified = true;
    }
});

// Replace telemetry functions with no-ops
const telemetryReplacements = [
    {
        pattern: /navigator\.sendBeacon/g,
        replacement: 'function(){return false;} || navigator.sendBeacon'
    },
    {
        pattern: /new XMLHttpRequest\(\)/g,
        replacement: 'null /* XMLHttpRequest disabled for Canvas Apps */'
    }
];

telemetryReplacements.forEach(({pattern, replacement}) => {
    if (pattern.test(bundleContent)) {
        bundleContent = bundleContent.replace(pattern, replacement);
        modified = true;
    }
});

if (modified) {
    fs.writeFileSync(bundlePath, bundleContent);
    console.log('✅ Telemetry removed from bundle successfully');
    console.log('📦 Bundle is now Canvas Apps compatible');
} else {
    console.log('ℹ️  No telemetry patterns found in bundle');
}
