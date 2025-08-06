# Multiple Edit, Conditional Logic, and Enhanced Features Fix

## Problem Description

When using the PCF control, there were three related issues that have been resolved:

### Issue 1: Conditional Logic Changes
1. **New Row Behavior**: When adding a new row and triggering conditional logic (e.g., selecting DrawingNum auto-populates Size), each field change is properly tracked with yellow highlights.

2. **Existing Row Issue**: When editing an existing row, conditional logic changes multiple fields but the system only shows it as one change instead of tracking each field individually.

3. **Cancel Issue**: When clicking "Cancel Changes", the system doesn't properly revert all auto-populated fields back to their original values because it was storing incorrect original values.

### Issue 2: Multiple Manual Edits to Same Cell
1. **Change Count Issue**: When manually inputting a value and then selecting from dropdown on the same cell, the system incorrectly counts multiple changes instead of updating the existing change.

2. **Cancel Issue**: When canceling, it reverts to the manually input value instead of the original value from before any edits.

### Issue 3: Create New Row Limitation
1. **Row Limit**: The "Add New Row" function was limited to creating only up to 100 rows at a time.
2. **User Request**: Need to increase the limit to 1000 rows for bulk data entry scenarios.

## Root Causes

### Conditional Logic Issue
The issue was in the `handleItemChange` function in `VirtualizedEditableGrid.tsx` (lines 632-635). The function was:

1. First updating the item with the new value: `setPCFValue(item, targetColumnKey, newValue)`
2. Then trying to get the "original" value: `const originalValue = getPCFValue(item, targetColumnKey)`

This meant that `originalValue` was actually the `newValue`, not the true original value before the conditional logic triggered.

### Multiple Edit Issue
The issue was in the `commitEdit` function in `VirtualizedEditableGrid.tsx`. When editing the same cell multiple times:

1. Each edit would create a new pending change with `oldValue = originalValue` from the current editing session
2. It didn't preserve the true original value from the first change
3. The system would always check `newValue !== originalValue` instead of checking against the actual original value

### Row Limit Issue
The issue was a hardcoded limit of 100 rows in the `UltimateEnterpriseGrid.tsx` component in three places:
1. Validation logic in `handleAddNewRows` function
2. Input field `max` attribute
3. Button disabled validation and placeholder text

## Solutions

### Fix 1: Conditional Logic Change Tracking
Fixed the `handleItemChange` function to:

1. **Capture original value BEFORE updating**: Get the original value before calling `setPCFValue`
2. **Preserve first original value**: If there's already a pending change for a field, keep the original `oldValue` from the first change, not subsequent conditional changes
3. **Proper change tracking**: Each conditional field change is now tracked as a separate pending change with the correct original value

### Fix 2: Multiple Edit Change Tracking
Fixed the `commitEdit` function to:

1. **Preserve original value across edits**: When editing the same cell multiple times, keep the `oldValue` from the first change
2. **Check against true original**: Compare `newValue` against the actual original value, not the editing session's starting value
3. **Smart change removal**: If user edits back to the original value, remove the pending change entirely
4. **Prevent duplicate changes**: Only one pending change per cell, updated as needed

### Fix 3: Increased Row Creation Limit
Updated the `UltimateEnterpriseGrid.tsx` component to:

1. **Increased validation limit**: Changed from 100 to 1000 in `handleAddNewRows` function
2. **Updated input constraints**: Changed `max` attribute from 100 to 1000
3. **Updated UI text**: Changed placeholder from "Enter number (1-100)" to "Enter number (1-1000)"
4. **Updated button validation**: Changed disabled condition from `> 100` to `> 1000`

## Code Changes

### In `VirtualizedEditableGrid.tsx`

#### handleItemChange function:
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

#### commitEdit function:
```typescript
const changeKey = getCellKey(itemIndex, columnKey);

// Check if we already have a change for this cell - if so, keep the original oldValue
const existingChange = pendingChanges.get(changeKey);
const actualOldValue = existingChange ? existingChange.oldValue : originalValue;

// Only create/update a change if the new value is different from the actual original value
if (newValue !== actualOldValue) {
    // Create or update the change
    const change = {
        itemId,
        itemIndex,
        columnKey,
        newValue,
        oldValue: actualOldValue
    };
    setPendingChanges(prev => new Map(prev.set(changeKey, change)));
} else {
    // If the new value equals the actual original value, remove any existing change
    if (existingChange) {
        setPendingChanges(prev => {
            const newMap = new Map(prev);
            newMap.delete(changeKey);
            return newMap;
        });
        // Revert the item to original value
        setPCFValue(item, columnKey, actualOldValue);
    }
}
```

### In `UltimateEnterpriseGrid.tsx`

#### handleAddNewRows function:
```typescript
const handleAddNewRows = useCallback(() => {
    const count = parseInt(newRowCount, 10);
    if (count > 0 && count <= 1000 && onAddNewRow) { // Limit to 1000 rows max
        onAddNewRow(count);
        handleCloseAddRowDialog();
    }
}, [newRowCount, onAddNewRow, handleCloseAddRowDialog]);
```

#### Input field and validation:
```typescript
<TextField
    type="number"
    value={newRowCount}
    onChange={handleRowCountChange}
    min={1}
    max={1000}
    placeholder="Enter number (1-1000)"
    // ...
/>
<PrimaryButton 
    onClick={handleAddNewRows} 
    text="Add Rows"
    disabled={!newRowCount || parseInt(newRowCount, 10) < 1 || parseInt(newRowCount, 10) > 1000}
/>
```

## Expected Behavior After Fix

1. **Individual Field Tracking**: Each conditional field change (Size, TestPkgNum, etc.) will be tracked as separate pending changes with yellow highlights
2. **Proper Cancellation**: When clicking "Cancel Changes", all auto-populated fields will revert to their original values before any conditional logic was triggered
3. **Consistent UI**: Both new rows and existing rows will show the same change tracking behavior
4. **Accurate Change Count**: Multiple edits to the same cell will show as one change, not multiple
5. **Smart Reversion**: If you edit a cell back to its original value, the change will be removed automatically
6. **Correct Cancel Behavior**: Cancel will always revert to the value before any editing started, not intermediate values
7. **Enhanced Bulk Creation**: Users can now create up to 1000 new rows at once instead of being limited to 100

## Technical Notes

- Version: 14.0.5
- The fix maintains backward compatibility
- No changes required to conditional logic configuration
- The cancellation logic (`cancelAllChanges`) was already correct and didn't need modification
- All three fixes work together to provide consistent change tracking and enhanced functionality across all scenarios
- Performance considerations: Creating 1000 rows at once may take longer, but virtualization ensures UI responsiveness
