# Enhanced Data Source Detection & Auto-Recovery Implementation

## Overview
This document outlines the comprehensive implementation of enhanced data source detection for PatchFormula generation and auto-recovery mechanisms for configuration errors in the PCF control.

## Problem Statement
1. **Data Source Detection Issue**: PatchFormula was showing "DataSource" instead of the actual table name (e.g., "MasterWeldData")
2. **Error Recovery**: Control needed automatic recovery when configuration issues resolve

## Solution Implementation

### Enhanced Data Source Detection

#### Method 0: Manual Override (Highest Priority)
Added a new `DataSourceName` property in ControlManifest.Input.xml:
```xml
<property name="DataSourceName" display-name-key="DataSourceName" of-type="SingleLine.Text" usage="input" required="false" />
```

Users can now manually specify the data source name if auto-detection fails.

#### Enhanced Auto-Detection with 6 Fallback Methods

```typescript
// Method 0: Manual override (highest priority)
const manualDataSourceName = this.undefinedIfEmpty(this.context.parameters.DataSourceName);
if (manualDataSourceName) {
    dataSourceName = manualDataSourceName;
}

// Method 1: Direct dataset.getTitle()
if (dataset.getTitle && typeof dataset.getTitle === 'function') {
    const title = dataset.getTitle();
    if (title && title !== '' && title !== 'val') {
        dataSourceName = title;
    }
}

// Method 2: dataset.getTargetEntityType() - For Dataverse
if (dataset.getTargetEntityType && typeof dataset.getTargetEntityType === 'function') {
    const entityType = dataset.getTargetEntityType();
    if (entityType && entityType !== '') {
        dataSourceName = entityType;
    }
}

// Method 3: dataset.entityType property
const entityType = (dataset as any).entityType;
if (entityType && entityType !== '') {
    dataSourceName = entityType;
}

// Method 4: Extract from getNamedReference()
if ((dataset as any).getNamedReference && typeof (dataset as any).getNamedReference === 'function') {
    const namedRef = (dataset as any).getNamedReference();
    if (namedRef && namedRef.entityType) {
        dataSourceName = namedRef.entityType;
    }
}

// Method 5: Check context for app-level information
// Examines app and page contexts for additional clues

// Method 6: Look at first record for more clues
if (dataset.records && Object.keys(dataset.records).length > 0) {
    const firstRecord = dataset.records[firstRecordId];
    if (firstRecord && (firstRecord as any).getNamedReference) {
        const ref = (firstRecord as any).getNamedReference();
        if (ref && ref.entityType) {
            dataSourceName = ref.entityType;
        }
    }
}
```

### Comprehensive Debugging & Logging
Added extensive console logging to help diagnose data source detection issues:
- Dataset object properties and prototype methods analysis
- Step-by-step method execution with results
- Context examination for app/page information
- Record-level analysis for additional clues

### Auto-Recovery Mechanism
Maintained the robust error recovery system:

#### Properties Added
- `isInErrorState: boolean` - Tracks if control is in error state
- `errorRecoveryTimer: number | null` - Timer for recovery attempts
- `errorRecoveryAttempts: number` - Count of recovery attempts

#### Methods Added
- `startErrorRecovery()` - Initiates recovery process with 2-second intervals
- `attemptRecovery()` - Checks conditions and attempts recovery
- `clearErrorRecoveryTimer()` - Cleans up recovery timer

#### Recovery Logic
- Maximum 5 recovery attempts
- 2-second intervals between attempts
- Checks for dataset availability and validity
- Dynamic error messages showing progress
- Automatic success state clearing when datasets become available

## Key Features

### 1. Manual Override Capability
- **New Property**: `DataSourceName` - Allows manual specification of data source name
- **Usage**: Set this property to "MasterWeldData" or any actual table name to override auto-detection
- **Priority**: Manual override takes highest priority over all auto-detection methods

### 2. Comprehensive Auto-Detection
- **6 different detection methods** with fallback logic
- **Extensive logging** for debugging and diagnostics
- **Smart filtering** to avoid test harness placeholder values ('val')
- **Context analysis** for app-level information

### 3. Enhanced User Experience
- **Clear debug information** in console for troubleshooting
- **Helpful hints** when detection fails
- **Production-ready** with graceful fallbacks

### 4. Automatic Error Recovery
- **No manual intervention** required in published apps
- **Timer-based recovery** with configurable attempts
- **User-friendly progress messaging**
- **Automatic cleanup** when recovery succeeds

## Testing Scenarios

### Data Source Detection Testing
1. **Automatic Detection**: Load data from various sources (Dataverse, SharePoint, Excel, etc.)
2. **Manual Override**: Set DataSourceName property and verify it takes priority
3. **Fallback Behavior**: Test when all auto-detection methods fail
4. **Test Harness**: Verify proper handling of placeholder data

### Debug Information
Open browser developer console to see detailed logs:
```
🔍 Starting enhanced data source detection...
📊 Dataset object: [DataSet object]
📋 Dataset properties: [array of properties]
🎯 Method 1 - getTitle(): undefined
🎯 Method 2 - getTargetEntityType(): undefined
💡 Hint: You can manually set the DataSourceName property to override auto-detection
📊 Final data source determined: DataSource
```

### Manual Override Usage
1. In Power Apps, set the control's `DataSourceName` property to your actual table name:
   - For example: `"MasterWeldData"`
2. The PatchFormula will now show: `Patch(MasterWeldData, MyGrid.Selected, {WeldNum: "20"})`

## Implementation Files
- `DetailsList/index.ts` - Main implementation with enhanced detection and recovery
- `DetailsList/ControlManifest.Input.xml` - Added DataSourceName property
- `DetailsList/__mocks__/mock-parameters.ts` - Added mock parameter for testing
- Enhanced in both `generatePatchFormula()` and `generateForAllFormula()` methods

## Usage Instructions

### For Users Experiencing "DataSource" Issue:
1. **Option 1: Manual Override** (Recommended for immediate fix)
   - Set the control's `DataSourceName` property to your actual table name
   - Example: Set to "MasterWeldData" if that's your table name

2. **Option 2: Enable Debug Logging**
   - Open browser developer console (F12)
   - Make a cell edit to trigger PatchFormula generation
   - Review the detailed logging to understand why auto-detection is failing

3. **Option 3: Report Detection Method**
   - Share the console logs with developers to improve auto-detection for your data source type

## Benefits
- **Immediate Solution**: Manual override provides instant fix for data source naming
- **Enhanced Debugging**: Comprehensive logging helps identify root causes
- **Future-Proof**: Multiple detection methods handle various Power Apps scenarios
- **Production Ready**: Graceful fallbacks ensure formulas always generate
- **User-Friendly**: Clear guidance and hints for troubleshooting

## Version History
- **v9.0.2**: Implemented enhanced data source detection with manual override capability
- Enhanced auto-detection with 6 fallback methods and comprehensive debugging
- Maintained backward compatibility with all previous features
- Added extensive console logging for troubleshooting

## Next Steps
Based on the debug information from real-world usage, additional detection methods can be added to handle specific Power Apps configurations and data source types.
