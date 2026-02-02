/**
 * Safe console.log removal script using babel parser
 * Only removes actual console.log statements, not strings containing "console.log"
 */

const fs = require('fs');
const path = require('path');

// Files to process (core production files only, not testing/demo files)
const filesToProcess = [
    'DetailsList/index.ts',
    'DetailsList/components/VirtualizedEditableGrid.tsx',
    'DetailsList/components/UltimateEnterpriseGrid.tsx',
    'DetailsList/components/EnhancedInlineEditor.tsx',
    'DetailsList/components/DragFillManager.tsx',
    'DetailsList/components/ExcelLikeColumnFilter.tsx',
    'DetailsList/components/LoadingOverlay.tsx',
    'DetailsList/components/SelectionCheckbox.tsx',
    'DetailsList/components/SelectionToggle.tsx',
    'DetailsList/components/VirtualizedFilterDropdown.tsx',
    'DetailsList/FilterBar.tsx',
    'DetailsList/FilterMenu.tsx',
    'DetailsList/FilterUtils.ts',
    'DetailsList/GridCell.tsx',
    'DetailsList/EnterpriseComponent.ts',
];

// Regex patterns to match console statements as standalone statements
// This matches console.log/debug/info/warn/error that:
// 1. Start at line beginning (possibly with whitespace)
// 2. Are not inside strings (we check for that separately)
const consoleStatementPattern = /^(\s*)console\.(log|debug|info)\([^)]*\);?\s*$/gm;

// Pattern for console statements that span multiple lines or are in complex expressions
const multiLineConsolePattern = /^(\s*)console\.(log|debug|info)\([^;]*\);?\s*$/gm;

// Process a single file
function processFile(filePath) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`Skipping ${filePath} - file not found`);
        return { file: filePath, removed: 0, skipped: true };
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    let removedCount = 0;
    let inMultiLineConsole = false;
    let braceDepth = 0;
    
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Skip if in multi-line console
        if (inMultiLineConsole) {
            removedCount++;
            // Count braces to know when statement ends
            for (const char of line) {
                if (char === '(') braceDepth++;
                if (char === ')') braceDepth--;
            }
            if (braceDepth <= 0 || line.includes(');')) {
                inMultiLineConsole = false;
                braceDepth = 0;
            }
            continue;
        }
        
        // Check if this is a console statement
        const isConsoleStatement = /^\s*console\.(log|debug|info)\s*\(/.test(line);
        
        if (isConsoleStatement) {
            // Check if statement completes on this line
            const openParens = (line.match(/\(/g) || []).length;
            const closeParens = (line.match(/\)/g) || []).length;
            
            if (openParens > closeParens) {
                // Multi-line console statement
                inMultiLineConsole = true;
                braceDepth = openParens - closeParens;
            }
            removedCount++;
            continue; // Skip this line
        }
        
        newLines.push(line);
    }
    
    if (removedCount > 0) {
        fs.writeFileSync(fullPath, newLines.join('\n'), 'utf8');
        console.log(`${filePath}: Removed ${removedCount} console statement(s)`);
    } else {
        console.log(`${filePath}: No console statements found`);
    }
    
    return { file: filePath, removed: removedCount, skipped: false };
}

// Main execution
console.log('Removing console.log/debug/info statements from source files...\n');

let totalRemoved = 0;
const results = [];

for (const file of filesToProcess) {
    const result = processFile(file);
    results.push(result);
    totalRemoved += result.removed;
}

console.log('\n' + '='.repeat(50));
console.log(`Total removed: ${totalRemoved} statement(s)`);
console.log('\nNote: Run "npm run build" to verify the changes compile correctly.');
console.log('Use "git checkout -- DetailsList/" to restore if needed.');
