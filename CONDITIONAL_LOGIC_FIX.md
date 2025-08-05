# Conditional Logic Change Tracking Fix

## Problem Description

When using conditional logic in the PCF control:

1. **New Row Behavior**: When adding a new row and triggering conditional logic (e.g., selecting DrawingNum auto-populates Size), each field change is properly tracked with yellow highlights.

2. **Existing Row Issue**: When editing an existing row, conditional logic changes multiple fields but the system only shows it as one change instead of tracking each field individually.

3. **Cancel Issue**: When clicking "Cancel Changes", the system doesn't properly revert all auto-populated fields back to their original values because it was storing incorrect original values.

## Root Cause

The issue was in the `handleItemChange` function in `VirtualizedEditableGrid.tsx` (lines 632-635). The function was:

1. First updating the item with the new value: `setPCFValue(item, targetColumnKey, newValue)`
2. Then trying to get the "original" value: `const originalValue = getPCFValue(item, targetColumnKey)`

This meant that `originalValue` was actually the `newValue`, not the true original value before the conditional logic triggered.

## Solution

Fixed the `handleItemChange` function to:

1. **Capture original value BEFORE updating**: Get the original value before calling `setPCFValue`
2. **Preserve first original value**: If there's already a pending change for a field, keep the original `oldValue` from the first change, not subsequent conditional changes
3. **Proper change tracking**: Each conditional field change is now tracked as a separate pending change with the correct original value

## Code Changes

In `VirtualizedEditableGrid.tsx`, the `handleItemChange` function was updated to:

```typescript
// Get the original value BEFORE updating the item
const originalValue = getPCFValue(item, targetColumnKey);

// Update the item immediately for conditional logic
setPCFValue(item, targetColumnKey, newValue);

// Track as a change if different from original
if (newValue !== originalValue) {
    const changeKey = getCellKey(itemIndex, targetColumnKey);
    
    // Check if we already have a change for this cell - if so, keep the original oldValue
    const existingChange = pendingChanges.get(changeKey);
    const actualOldValue = existingChange ? existingChange.oldValue : originalValue;
    
    const change = {
        itemId,
        itemIndex,
        columnKey: targetColumnKey,
        newValue,
        oldValue: actualOldValue  // This now correctly stores the true original value
    };

    setPendingChanges(prev => new Map(prev.set(changeKey, change)));
```

## Expected Behavior After Fix

1. **Individual Field Tracking**: Each conditional field change (Size, TestPkgNum, etc.) will be tracked as separate pending changes with yellow highlights
2. **Proper Cancellation**: When clicking "Cancel Changes", all auto-populated fields will revert to their original values before any conditional logic was triggered
3. **Consistent UI**: Both new rows and existing rows will show the same change tracking behavior

## Technical Notes

- Version: 14.0.3
- The fix maintains backward compatibility
- No changes required to conditional logic configuration
- The cancellation logic (`cancelAllChanges`) was already correct and didn't need modification
