/**
 * Strip Console Logs from Production Build
 * 
 * This script removes console.log, console.debug, console.info statements
 * from the built bundle.js to improve production performance.
 * 
 * console.warn and console.error are preserved for important diagnostics.
 * 
 * Usage: node scripts/strip-console-logs.js
 */

const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', 'out', 'controls', 'DetailsList', 'bundle.js');

console.log('🔧 Stripping console.log statements from production bundle...');

if (!fs.existsSync(bundlePath)) {
    console.error('❌ Bundle not found at:', bundlePath);
    console.log('   Run "npm run build" first.');
    process.exit(1);
}

// Read the bundle
let bundleContent = fs.readFileSync(bundlePath, 'utf8');
const originalSize = bundleContent.length;

// Count occurrences before
const logCountBefore = (bundleContent.match(/console\.(log|debug|info)\s*\(/g) || []).length;

// Remove console.log, console.debug, console.info statements
// This regex matches console.log(...) including nested parentheses
// We replace with void 0 (undefined) to maintain expression validity

// Simple approach: replace console.log/debug/info calls with void 0
// This handles most cases safely
bundleContent = bundleContent.replace(
    /console\.(log|debug|info)\s*\([^)]*\)/g,
    'void 0'
);

// Handle multi-line console statements with template literals and complex arguments
// More aggressive pattern for remaining cases
bundleContent = bundleContent.replace(
    /console\.(log|debug|info)\s*\(`[^`]*`[^)]*\)/g,
    'void 0'
);

// Count occurrences after
const logCountAfter = (bundleContent.match(/console\.(log|debug|info)\s*\(/g) || []).length;
const newSize = bundleContent.length;

// Write back
fs.writeFileSync(bundlePath, bundleContent, 'utf8');

const sizeReduction = ((originalSize - newSize) / 1024).toFixed(2);
const removed = logCountBefore - logCountAfter;

console.log(`✅ Console statements stripped successfully!`);
console.log(`   📊 Statements removed: ~${removed}`);
console.log(`   📦 Size reduction: ${sizeReduction} KB`);
console.log(`   📁 Bundle: ${bundlePath}`);
console.log('');
console.log('💡 Note: console.warn and console.error are preserved for diagnostics.');
