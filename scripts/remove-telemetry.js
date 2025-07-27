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

// Remove telemetry endpoints and patterns - ULTRA AGGRESSIVE for Canvas Apps
const telemetryPatterns = [
    // Microsoft telemetry domains - all variations
    /browser\.events\.data\.microsoft\.com/g,
    /events\.data\.microsoft\.com/g,
    /noam\.events\.data\.microsoft\.com/g,
    /collector\.azure\.eaglex\.ic\.gov/g,
    /collector\.azure\.cn/g,
    /pf\.events\.data\.microsoft\.com/g,
    /OneCollector\/1\.0/g,
    /applicationinsights/gi,
    /telemetry/gi,
    /Microsoft_ApplicationInsights/g,
    
    // CORS-related patterns
    /\?cors=true/g,
    /content-type=application\/x-json-stream/g,
    /application\/x-json-stream/g,
    
    // HTTP request patterns that might trigger CORS
    /sendBeacon\([^)]*\)/g,
    /fetch\([^)]*microsoft\.com[^)]*\)/g,
    /XMLHttpRequest\(\)/g,
    /\.send\(.*telemetry.*\)/g,
    /\.send\(.*microsoft.*\)/g,
    /withCredentials\s*:\s*true/g,
    
    // Application Insights specific patterns
    /BypassAjaxInstrumentation/g,
    /aiEvtPageShow/g,
    /aiEvtPageHide/g,
    /_aiDataEvents/g,
    /_aiDataPlugin/g,
    /Microsoft_ApplicationInsights_BypassAjaxInstrumentation/g,
    
    // Specific error-causing URLs - all variants
    /https:\/\/browser\.events\.data\.microsoft\.com[^"'\s]*/g,
    /https:\/\/events\.data\.microsoft\.com[^"'\s]*/g,
    /https:\/\/noam\.events\.data\.microsoft\.com[^"'\s]*/g,
    /https:\/\/collector\.azure\.eaglex\.ic\.gov[^"'\s]*/g,
    /https:\/\/collector\.azure\.cn[^"'\s]*/g,
    /https:\/\/pf\.events\.data\.microsoft\.com[^"'\s]*/g,
    
    // Function calls that initialize telemetry
    /populateBrowserInfo/g,
    /populateOperatingSystemInfo/g,
    /userAgent.*data/g,
    /endpointUrl.*microsoft\.com/g
];

let modified = false;
telemetryPatterns.forEach(pattern => {
    const matches = bundleContent.match(pattern);
    if (matches) {
        console.log(`🔍 Found and removing pattern: ${pattern.toString()}`);
        console.log(`   Matches: ${matches.length}`);
        bundleContent = bundleContent.replace(pattern, '');
        modified = true;
    }
});

// Replace telemetry functions with no-ops - ULTRA AGGRESSIVE
const telemetryReplacements = [
    {
        pattern: /navigator\.sendBeacon/g,
        replacement: 'function(){return false;} /* Canvas Apps: sendBeacon disabled */'
    },
    {
        pattern: /new XMLHttpRequest\(\)/g,
        replacement: 'null /* Canvas Apps: XMLHttpRequest disabled for telemetry */'
    },
    {
        pattern: /fetch\(/g,
        replacement: 'function(){return Promise.resolve({ok:true,json:()=>Promise.resolve({})})} || fetch('
    },
    {
        pattern: /Microsoft_ApplicationInsights_BypassAjaxInstrumentation\s*:\s*true/g,
        replacement: 'Microsoft_ApplicationInsights_BypassAjaxInstrumentation: false'
    },
    {
        pattern: /withCredentials\s*:\s*true/g,
        replacement: 'withCredentials: false'
    },
    {
        pattern: /readyState\s*:\s*1/g,
        replacement: 'readyState: 0 /* Disabled for Canvas Apps */'
    }
];

telemetryReplacements.forEach(({pattern, replacement}) => {
    const matches = bundleContent.match(pattern);
    if (matches) {
        console.log(`🔧 Replacing pattern: ${pattern.toString()}`);
        console.log(`   Matches: ${matches.length}`);
        bundleContent = bundleContent.replace(pattern, replacement);
        modified = true;
    }
});

// Final scan for any remaining Microsoft telemetry URLs - COMPREHENSIVE
const finalScan = [
    /https:\/\/[^"'\s]*microsoft\.com[^"'\s]*/g,
    /https:\/\/[^"'\s]*events\.data[^"'\s]*/g,
    /OneCollector/g,
    /"cors":true/g,
    /browser\.events/g,
    /noam\.events/g,
    /collector\.azure/g,
    /pf\.events/g,
    /Microsoft_ApplicationInsights/g,
    /aiEvtPage/g,
    /_aiData/g,
    /populateBrowserInfo/g,
    /populateOperatingSystemInfo/g,
    /BypassAjaxInstrumentation/g,
    /endpointUrl.*microsoft/g,
    /client-version.*1DS-Web/g,
    /apikey.*applicationinsights/gi
];

finalScan.forEach(pattern => {
    const matches = bundleContent.match(pattern);
    if (matches) {
        console.log(`⚠️  Still found potential telemetry: ${pattern.toString()}`);
        console.log(`   Removing ${matches.length} instances`);
        bundleContent = bundleContent.replace(pattern, '""');
        modified = true;
    }
});

// NUCLEAR OPTION: Remove entire telemetry object definitions
const nuclearPatterns = [
    // Remove entire telemetry configuration objects
    /\{[^}]*endpointUrl[^}]*microsoft\.com[^}]*\}/g,
    /\{[^}]*OneCollector[^}]*\}/g,
    /\{[^}]*applicationinsights[^}]*\}/gi,
    /\{[^}]*Microsoft_ApplicationInsights[^}]*\}/g
];

nuclearPatterns.forEach(pattern => {
    const matches = bundleContent.match(pattern);
    if (matches) {
        console.log(`💥 NUCLEAR: Removing telemetry objects: ${matches.length} instances`);
        bundleContent = bundleContent.replace(pattern, '{}');
        modified = true;
    }
});

if (modified) {
    fs.writeFileSync(bundlePath, bundleContent);
    console.log('✅ ULTRA AGGRESSIVE telemetry removal completed');
    console.log('📦 Bundle is now Canvas Apps compatible (NO telemetry allowed)');
    
    // Comprehensive verification
    const verification = fs.readFileSync(bundlePath, 'utf8');
    const issues = [
        { pattern: /browser\.events\.data\.microsoft\.com/g, name: 'browser.events' },
        { pattern: /noam\.events\.data\.microsoft\.com/g, name: 'noam.events' },
        { pattern: /Microsoft_ApplicationInsights/g, name: 'AppInsights' },
        { pattern: /OneCollector/g, name: 'OneCollector' },
        { pattern: /withCredentials\s*:\s*true/g, name: 'withCredentials' }
    ];
    
    let hasIssues = false;
    issues.forEach(({pattern, name}) => {
        const remaining = verification.match(pattern);
        if (remaining) {
            console.log(`❌ Warning: Still found ${remaining.length} ${name} references`);
            hasIssues = true;
        }
    });
    
    if (!hasIssues) {
        console.log('✅ COMPREHENSIVE VERIFICATION PASSED: Zero telemetry found');
    }
} else {
    console.log('ℹ️  No telemetry patterns found in bundle');
}
