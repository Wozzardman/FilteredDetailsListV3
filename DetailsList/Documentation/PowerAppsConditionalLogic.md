# PowerApps Conditional Logic Configuration

This document explains how to configure conditional logic for the FilteredDetailsList control using PowerApps-compatible syntax.

## Overview

The control now supports conditional logic where one field can automatically populate or update based on changes in another field. This is particularly useful for scenarios like:

- Auto-populating Size based on DrawingNum selection
- Setting default values for new records
- Cascading dropdowns and lookups

## Configuration Methods

### 1. Table-Based Configuration (Recommended)

You can configure conditional logic using the `editorConfig` dataset with the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `ColumnKey` | Text | The column that should be updated |
| `EditorType` | Text | Type of editor (text, dropdown, etc.) |
| `DependsOn` | Text | The column that triggers the update |
| `LookupMappingSource` | Text | Optional: Dataset for mapping display values to lookup keys |
| `LookupMappingFilter` | Text | Optional: Column to filter on in mapping source |
| `LookupMappingReturn` | Text | Optional: Column to return from mapping source |
| `LookupDataSource` | Text | Dataset name for final lookup operations |
| `LookupFilterColumn` | Text | Column to filter on in the final lookup |
| `LookupReturnColumn` | Text | Column to return from the final lookup |
| `DefaultValueFormula` | Text | Formula for default values (new records only) |
| `ConditionalFormula` | Text | Custom formula for conditional logic |

### 2. Example: Size Auto-Population

Here's how to configure the Size field to auto-populate based on DrawingNum selection:

**Simple Table Configuration (when values match directly):**
```
ColumnKey: "Size"
EditorType: "text"
DependsOn: "DrawingNum"
LookupDataSource: "LineList"
LookupFilterColumn: "DrawingNum"
LookupReturnColumn: "Size"
```

**Advanced Configuration with Value Mapping:**
For scenarios where the dropdown shows `DrawingNumCombined` but you need to lookup by `DrawingNum`:
```
ColumnKey: "Size"
EditorType: "number"
MinValue: 0
MaxValue: 2000
StepValue: 1
DependsOn: "DrawingNum"
LookupMappingSource: "DrawingList"
LookupMappingFilter: "DrawingNumCombined"
LookupMappingReturn: "DrawingNum"
LookupDataSource: "LineList"
LookupFilterColumn: "DrawingNum"
LookupReturnColumn: "Size"
```

This configuration will:
1. Take the selected `DrawingNumCombined` value
2. Look it up in `DrawingList` to get the actual `DrawingNum`
3. Use that `DrawingNum` to lookup the `Size` in `LineList`

**Power Apps Setup:**
1. Create a table/collection called `EditorConfigTable` with the above structure
2. Add the configuration row for Size field
3. Bind the `editorConfig` property to this table
4. Make sure the `LineList` dataset is available to the control

### 3. Example: Default Values for New Records

To set default values for new records:

```
ColumnKey: "Status"
EditorType: "dropdown"
DefaultValueFormula: "Active"
```

```
ColumnKey: "CreatedDate"
EditorType: "datetime"
DefaultValueFormula: "Now()"
```

## Usage in Power Apps

### Step 1: Create Editor Configuration Table

```powerApps
// Create a table with conditional configurations
Set(EditorConfigTable, Table(
    {
        ColumnKey: "Size",
        EditorType: "number",
        MinValue: 0,
        MaxValue: 2000,
        StepValue: 1,
        DependsOn: "DrawingNum",
        LookupMappingSource: "DrawingList",
        LookupMappingFilter: "DrawingNumCombined",
        LookupMappingReturn: "DrawingNum",
        LookupDataSource: "LineList",
        LookupFilterColumn: "DrawingNum",
        LookupReturnColumn: "Size"
    },
    {
        ColumnKey: "Status",
        EditorType: "dropdown",
        DefaultValueFormula: "Active",
        DropdownOptions: "[{""key"":""Active"",""text"":""Active""},{""key"":""Inactive"",""text"":""Inactive""}]"
    }
))
```

### Step 2: Configure Control Properties

Set the FilteredDetailsList properties:
- `UseEnhancedEditors`: `true`
- `editorConfig`: `EditorConfigTable`
- Ensure `LineList` dataset is available

### Step 3: Handle Updates

The control will automatically:
1. Detect when `DrawingNum` changes (when user selects a `DrawingNumCombined` value)
2. Look up the actual `DrawingNum` from `DrawingList` using the selected `DrawingNumCombined`
3. Use that `DrawingNum` to lookup the corresponding `Size` from `LineList`
4. Update the `Size` field automatically
5. Track the change for saving

### Your Specific Example

For your exact configuration, you would use:

```powerApps
{
    ColumnKey: "Size",
    EditorType: "number",
    MinValue: 0,
    MaxValue: 2000,
    StepValue: 1,
    DependsOn: "DrawingNum",
    LookupMappingSource: "DrawingList",
    LookupMappingFilter: "DrawingNumCombined",
    LookupMappingReturn: "DrawingNum",
    LookupDataSource: "LineList",
    LookupFilterColumn: "DrawingNum",
    LookupReturnColumn: "Size"
}
```

This handles the fact that:
- Your `DrawingNum` dropdown shows `DrawingNumCombined` values
- But the `LineList` lookup needs the actual `DrawingNum` value
- The system automatically maps between them

## Advanced Features

### Custom Formulas

You can use custom formulas for more complex logic:

```
ColumnKey: "TotalPrice"
EditorType: "currency"
DependsOn: "Quantity"
ConditionalFormula: "Quantity * UnitPrice"
```

### Multiple Dependencies

For fields that depend on multiple columns, you can create multiple configuration rows or use custom formulas.

## Limitations and Considerations

1. **New Record Context**: When creating new records, `ThisItem` is not available. The system automatically detects new records and handles them appropriately.

2. **Circular Dependencies**: Avoid creating circular dependencies between fields.

3. **Performance**: Lookups are cached for performance, but avoid complex formulas in high-frequency scenarios.

4. **Data Types**: Ensure the returned values match the expected data types for the target field.

## Troubleshooting

### Common Issues

1. **Lookup Returns Empty**: 
   - Verify the `LookupDataSource` name matches exactly
   - Check that the filter column exists and has matching values
   - Ensure the return column exists

2. **Formula Not Working**:
   - Check formula syntax
   - Verify all referenced columns exist
   - Test with simple formulas first

3. **Changes Not Saving**:
   - The control tracks conditional changes automatically
   - Use standard save patterns with the control's change management

### Debug Information

The control logs conditional logic operations to the browser console. Look for messages like:
- `🔄 Auto-updating [field] from [old] to [new]`
- `🔍 No matching record found for [filter]`
- `📝 Processing formula: [formula]`

## Migration from Previous Versions

If you were using the enterprise conditional system (`ConditionalHelpers.lookup`), you'll need to migrate to the table-based approach:

**Old:**
```typescript
ConditionalHelpers.lookup("LineList", "DrawingNum", "Size")
```

**New:**
```
DependsOn: "DrawingNum"
LookupDataSource: "LineList"
LookupFilterColumn: "DrawingNum"
LookupReturnColumn: "Size"
```

This provides the same functionality with PowerApps-compatible configuration.
