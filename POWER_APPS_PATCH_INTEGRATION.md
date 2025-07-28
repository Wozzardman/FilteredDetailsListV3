# Power Apps Direct Patch Integration Guide

## Overview
This guide explains how to use the new direct Power Apps Patch integration that solves the executable formula issue. Instead of a single `PatchFormula` property that gets treated as text, we now provide separate components that Power Apps can use to construct executable `Patch()` functions.

## Problem Solved
Previously, the `PatchFormula` output property was treated as text in Power Apps button OnSelect events, making it non-executable. The new approach provides individual components that Power Apps can combine into working formulas.

## New Output Properties

### 1. PatchDataSource
- **Type**: Text
- **Purpose**: Provides the detected data source name
- **Usage**: First parameter of Patch() function
- **Example Value**: `'Accounts'`, `'MyTable'`, `'[@DataSource]'`

### 2. PatchRecord  
- **Type**: Text
- **Purpose**: Provides the record reference to update
- **Usage**: Second parameter of Patch() function
- **Value**: Always `'MyGrid.Selected'` (where MyGrid is your control name)

### 3. PatchChanges
- **Type**: Text
- **Purpose**: Provides the changes object in JSON format
- **Usage**: Third parameter of Patch() function (requires JSON parsing)
- **Example Value**: `'{"Name": "New Value", "Email": "new@email.com"}'`

### 4. PatchChangesColumn
- **Type**: Text
- **Purpose**: Provides the first changed column name
- **Usage**: For building individual change objects
- **Example Value**: `'Name'`, `'Email'`, `'Status'`

### 5. PatchChangesValue
- **Type**: Text
- **Purpose**: Provides the first changed column value
- **Usage**: For building individual change objects with PatchChangesColumn
- **Example Value**: `'John Doe'`, `'john@email.com'`, `'Active'`

### 6. SaveTrigger
- **Type**: Text
- **Purpose**: Increments when save operations occur
- **Usage**: Trigger for dependent formulas or refresh operations
- **Value**: Numeric string that increments on each save

## Implementation in Power Apps

### Basic Button OnSelect Formula (JSON Approach)
```powerappsfx
Patch(
    [@MyGrid.PatchDataSource],
    MyGrid.Selected,
    JSON(MyGrid.PatchChanges)
)
```

### Basic Button OnSelect Formula (Individual Properties Approach)
```powerappsfx
Patch(
    [@MyGrid.PatchDataSource],
    MyGrid.Selected,
    {[MyGrid.PatchChangesColumn]: MyGrid.PatchChangesValue}
)
```

### Enhanced Formula with Error Handling (JSON Approach)
```powerappsfx
If(
    !IsBlank(MyGrid.PatchChanges),
    Patch(
        [@MyGrid.PatchDataSource],
        MyGrid.Selected,
        JSON(MyGrid.PatchChanges)
    );
    Notify("Changes saved successfully", NotificationType.Success),
    Notify("No changes to save", NotificationType.Warning)
)
```

### Enhanced Formula with Error Handling (Individual Properties Approach)
```powerappsfx
If(
    !IsBlank(MyGrid.PatchChangesColumn) && !IsBlank(MyGrid.PatchChangesValue),
    Patch(
        [@MyGrid.PatchDataSource],
        MyGrid.Selected,
        {[MyGrid.PatchChangesColumn]: MyGrid.PatchChangesValue}
    );
    Notify("Changes saved successfully", NotificationType.Success),
    Notify("No changes to save", NotificationType.Warning)
)
```

### Auto-Refresh Pattern
```powerappsfx
// In a label's Text property to trigger refresh
Refresh(DataSource);
MyGrid.SaveTrigger
```

## Data Source Detection

The component automatically detects data sources using multiple methods:

1. **Manual Override**: Uses `DataSourceName` property if provided
2. **Dataset Source**: Extracts from dataset.getTargetEntityType()
3. **Context Analysis**: Analyzes the Power Apps context
4. **Parameter Detection**: Scans input parameters
5. **Property Analysis**: Examines component properties
6. **Default Fallback**: Uses "DataSource" as last resort

### Manual Data Source Override
If automatic detection fails, set the `DataSourceName` property:
```
MyGrid.DataSourceName = "Accounts"
```

## Integration Steps

### 1. Configure Column Editors (Simplified)
Use Power Apps FX formulas instead of complex JSON:

```powerappsfx
// Simple text editor
"Name: Text"

// Choice editor with options
"Status: Choice(Active,Inactive,Pending)"

// Number editor with validation
"Price: Number(0,10000,0.01)"

// Date editor
"StartDate: Date"

// Multiple editors
"Name: Text; Status: Choice(Active,Inactive); Price: Number(0,1000)"
```

### 2. Add Save Button
Create a button with OnSelect (using individual properties - recommended):
```powerappsfx
Patch(
    [@MyGrid.PatchDataSource],
    MyGrid.Selected,
    {[MyGrid.PatchChangesColumn]: MyGrid.PatchChangesValue}
);
Notify("Record updated successfully", NotificationType.Success)
```

Or using JSON approach:
```powerappsfx
Patch(
    [@MyGrid.PatchDataSource],
    MyGrid.Selected,
    JSON(MyGrid.PatchChanges)
);
Notify("Record updated successfully", NotificationType.Success)
```

### 3. Add Auto-Refresh (Optional)
Add a label to trigger refresh when saves occur:
```powerappsfx
// Label Text property
Refresh(Accounts); MyGrid.SaveTrigger
```

## Advanced Scenarios

### Conditional Save Logic
```powerappsfx
If(
    MyGrid.Selected.Status = "Active",
    Patch(
        [@MyGrid.PatchDataSource],
        MyGrid.Selected,
        JSON(MyGrid.PatchChanges)
    ),
    Notify("Cannot save inactive records", NotificationType.Error)
)
```

### Batch Operations
```powerappsfx
// Save current changes and perform additional updates
Patch(
    [@MyGrid.PatchDataSource],
    MyGrid.Selected,
    JSON(MyGrid.PatchChanges)
);
Patch(
    Accounts,
    MyGrid.Selected,
    {LastModified: Now()}
)
```

### Validation Before Save
```powerappsfx
If(
    IsBlank(MyGrid.Selected.Name),
    Notify("Name is required", NotificationType.Error),
    Patch(
        [@MyGrid.PatchDataSource],
        MyGrid.Selected,
        JSON(MyGrid.PatchChanges)
    )
)
```

## Troubleshooting

### Common Issues

1. **"Invalid JSON" Error**
   - Check that `PatchChanges` contains valid JSON
   - Ensure all string values are properly quoted

2. **"Data source not found" Error**
   - Verify `DataSourceName` property is set correctly
   - Check that the data source exists in your app

3. **"No record selected" Error**
   - Ensure a row is selected before saving
   - Check that selection mode is enabled

### Debug Formulas

Check data source detection:
```powerappsfx
// In a label to see detected data source
MyGrid.PatchDataSource
```

Check pending changes:
```powerappsfx
// In a label to see what will be saved
MyGrid.PatchChanges
```

Monitor save trigger:
```powerappsfx
// In a label to see save events
"Save trigger: " & MyGrid.SaveTrigger
```

## Performance Considerations

- The `SaveTrigger` property updates on every save operation
- Use auto-refresh sparingly to avoid performance issues
- Consider debouncing frequent save operations
- Large JSON objects in `PatchChanges` may impact performance

## Migration from Old PatchFormula

### Before (Non-functional)
```powerappsfx
// This didn't work - treated as text
MyGrid.PatchFormula
```

### After (Functional)
```powerappsfx
// This works - executable formula with proper data source reference
Patch(
    [@MyGrid.PatchDataSource],
    MyGrid.Selected,
    JSON(MyGrid.PatchChanges)
)
```

## Complete Example

### Component Properties
- `ColumnEditorFormulas`: `"Name: Text; Email: Text; Status: Choice(Active,Inactive)"`
- `DataSourceName`: `"Contacts"`
- `EnableSelectionMode`: `true`

### Save Button OnSelect
```powerappsfx
If(
    !IsBlank(MyGrid.PatchChanges) && !IsBlank(MyGrid.Selected),
    Patch(
        Value(MyGrid.PatchDataSource),
        MyGrid.Selected,
        JSON(MyGrid.PatchChanges)
    );
    Notify("Contact updated successfully", NotificationType.Success);
    Refresh(Contacts),
    Notify("Please select a contact and make changes", NotificationType.Warning)
)
```

This implementation provides full executable formula support for Power Apps while maintaining the simplified configuration approach.
