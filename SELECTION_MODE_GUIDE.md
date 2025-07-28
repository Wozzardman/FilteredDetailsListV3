# Selection Mode vs Grid Edit Mode Guide

## Overview

The FilteredDetailsList control now supports two distinct operational modes that can be toggled to serve different data interaction patterns:

### 🔧 Grid Edit Mode (Default)
- **Purpose**: Direct inline editing of data within the grid
- **Features**: 
  - Click cells to edit data directly
  - Enhanced editors for different data types
  - Real-time change tracking
  - Auto-update formulas
  - Virtualized performance for large datasets

### ✅ Selection Mode 
- **Purpose**: Select records for form editing or bulk operations
- **Features**:
  - Checkbox-based row selection
  - Header "Select All" functionality
  - Selected record data for PowerApps integration
  - Support for both single and multiple selection

## Configuration

### Primary Toggle
- **Property**: `EnableSelectionMode`
- **Type**: Yes/No (TwoOptions)
- **Default**: No (Grid Edit Mode)

### Selection Behavior (when Selection Mode is enabled)
- **Property**: `SelectionType`
- **Options**:
  - `None` (0): No selection allowed
  - `Single` (1): Single row selection
  - `Multiple` (2): Multiple row selection with checkboxes

## PowerApps Integration

### Grid Edit Mode Outputs
- `PendingChanges`: JSON of modified data
- `AutoUpdateFormula`: Generated Patch statements
- `ChangeCount`: Number of pending changes

### Selection Mode Outputs
- `SelectedItems`: JSON array of selected record data
- `SelectedCount`: Number of selected items
- `SelectAllState`: None(0)/Some(1)/All(2)
- `SelectionChangedTrigger`: Timestamp for change detection

## Usage Patterns

### Pattern 1: Inline Data Editing
```
EnableSelectionMode = false
// Users edit data directly in grid
// Use PendingChanges and AutoUpdateFormula for saving
```

### Pattern 2: Form-Based Editing  
```
EnableSelectionMode = true
SelectionType = Single
// User selects one record
// Pass FilteredDetailsList.SelectedItems to form
// Edit in separate form interface
```

### Pattern 3: Bulk Operations
```
EnableSelectionMode = true  
SelectionType = Multiple
// User selects multiple records
// Use FilteredDetailsList.SelectedItems for bulk operations
// Perform Patch operations on selected data
```

## Key Benefits

1. **Clear Separation of Concerns**: Edit vs Select modes serve distinct purposes
2. **Performance Optimization**: Disable unnecessary features in each mode
3. **PowerApps Integration**: Dedicated outputs for each usage pattern
4. **Maintained Virtualization**: Both modes preserve grid performance
5. **Accessibility Compliance**: Full keyboard and screen reader support

## Technical Implementation

- **Mode Switching**: Automatically disables conflicting features
- **Selection Manager**: Dedicated service for selection state management
- **Change Tracking**: Disabled in selection mode to prevent conflicts
- **Inline Editing**: Disabled in selection mode
- **Enhanced Editors**: Only available in grid edit mode

## Future Enhancements

- Visual mode indicator in the grid header
- Keyboard shortcuts for mode switching
- Custom selection criteria and filtering
- Bulk operation toolbars in selection mode
