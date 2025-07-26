# Legacy Compatibility Guide

## Overview

Version 5.2.0 of the FilteredDetailsListV2 component introduces comprehensive backward compatibility support for the original control configuration using `Items` and `Fields` datasets instead of the modern `Records` and `Columns` datasets.

## Problem Statement

When upgrading from the original control, users experienced "Error loading control" when adding the `Fields` property because the control only supported the new `Records` + `Columns` approach. Additionally, data exports were working but cells showed `[EMPTY:null]` because the component wasn't properly reading the actual business data fields.

## Solution

The component now automatically detects whether you're using:

- **Legacy Mode**: `Items` + `Fields` datasets (original control approach)
- **Modern Mode**: `Records` + `Columns` datasets (enhanced approach)

## Legacy Mode Detection

The component automatically switches to legacy mode when:

1. The `Items` or `Fields` datasets have data, AND
2. The `Records` and `Columns` datasets are empty or not configured

## Dataset Property Mapping

### Legacy vs Modern Dataset Names

| Legacy Property | Modern Property | Description |
|----------------|-----------------|-------------|
| `Items` | `Records` | Main data dataset |
| `Fields` | `Columns` | Column configuration dataset |

### Legacy vs Modern Record Properties

| Legacy Property | Modern Property | Description |
|----------------|-----------------|-------------|
| `ItemKey` | `RecordKey` | Unique record identifier |
| `ItemCanSelect` | `RecordCanSelect` | Whether record can be selected |
| `ItemSelected` | `RecordSelected` | Whether record is selected by default |

### Legacy vs Modern Column Properties

| Legacy Property | Modern Property | Description |
|----------------|-----------------|-------------|
| `DisplayName` | `ColDisplayName` | Column header text |
| `Name` | `ColName` | Field name in data |
| `Width` | `ColWidth` | Column width in pixels |
| `CellType` | `ColCellType` | Cell rendering type |
| `HorizontalAlign` | `ColHorizontalAlign` | Cell horizontal alignment |
| `VerticalAlign` | `ColVerticalAlign` | Cell vertical alignment |
| `MultiLine` | `ColMultiLine` | Whether text wraps |
| `Resizable` | `ColResizable` | Whether column is resizable |
| `Sortable` | `ColSortable` | Whether column is sortable |
| `SortBy` | `ColSortBy` | Field to sort by |
| `Filterable` | `ColFilterable` | Whether column is filterable |

## Usage Examples

### Legacy Configuration (Items + Fields)

```powerfl
// Configure Items dataset
Set(myItems, 
    Table(
        {ItemKey: "1", ItemCanSelect: true, ItemSelected: false, Name: "John", Status: "Active"},
        {ItemKey: "2", ItemCanSelect: true, ItemSelected: false, Name: "Jane", Status: "Inactive"}
    )
);

// Configure Fields dataset  
Set(myFields,
    Table(
        {DisplayName: "Name", Name: "Name", Width: 200, Filterable: true},
        {DisplayName: "Status", Name: "Status", Width: 120, Filterable: true}
    )
);

// Component configuration
FilteredDetailsList.Items = myItems
FilteredDetailsList.Fields = myFields
```

### Modern Configuration (Records + Columns)

```powerfl
// Configure Records dataset
Set(myRecords, 
    Table(
        {RecordKey: "1", RecordCanSelect: true, RecordSelected: false, Name: "John", Status: "Active"},
        {RecordKey: "2", RecordCanSelect: true, RecordSelected: false, Name: "Jane", Status: "Inactive"}
    )
);

// Configure Columns dataset
Set(myColumns,
    Table(
        {ColDisplayName: "Name", ColName: "Name", ColWidth: 200, ColFilterable: true},
        {ColDisplayName: "Status", ColName: "Status", ColWidth: 120, ColFilterable: true}
    )
);

// Component configuration
FilteredDetailsList.Records = myRecords
FilteredDetailsList.Columns = myColumns
```

## Migration Guide

### Option 1: Keep Legacy Configuration (Recommended for existing apps)

No changes needed! The component will automatically detect and handle your existing `Items` + `Fields` configuration.

### Option 2: Migrate to Modern Configuration

1. **Rename datasets**: Change `Items` to `Records`, `Fields` to `Columns`
2. **Update property names**: Add `Col` prefix to column properties, change `Item` to `Record` for record properties
3. **Test thoroughly**: Ensure all functionality works as expected

## Console Logging

The component provides detailed console logging to help debug configuration issues:

```
🔄 LEGACY MODE DETECTED - Using Items + Fields datasets
🔍 Legacy Mode Detection: {hasItemsData: true, hasFieldsData: true, ...}
🔄 Converting legacy fields to modern columns format
✅ Converted 5 legacy fields to modern columns
```

## Troubleshooting

### "Error loading control" when adding Fields

**Solution**: Upgrade to version 5.2.0 or later, which includes legacy compatibility support.

### Cells showing "[EMPTY:null]" but export works

**Solution**: This was a column mapping issue that's fixed in version 5.2.0. The component now properly maps legacy field names to data columns.

### No data showing in legacy mode

**Check**:
1. Ensure `Items` dataset has data with proper field names
2. Ensure `Fields` dataset has correct `Name` properties matching data fields
3. Check console logs for legacy mode detection messages

### Want to use modern features with legacy data

**Recommendation**: Gradually migrate to the modern `Records` + `Columns` approach to access advanced filtering, AI insights, and collaboration features.

## Version History

- **5.2.0**: Added full legacy compatibility support
- **5.1.4**: Fixed column propagation issues
- **5.1.3**: Enhanced enterprise features
- **5.0.0**: Major rewrite with modern datasets

## Support

The legacy compatibility layer is fully supported and will be maintained alongside the modern approach. You can choose the configuration style that works best for your application.
