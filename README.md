# PowerApps Filtered DetailsList PCF Control

An enterprise-grade PowerApps Component Framework (PCF) control that provides an enhanced version of the [Fluent UI DetailsList component](https://developer.microsoft.com/en-us/fluentui#/controls/web/detailslist) with advanced filtering, vir- `ColHorizontalAlign` - The alignment of the cell content if the `ColCellType` is of type `image`, or `clickableimage`.
- `ColVerticalAlign` -  The alignment of the cell content if the `ColCellType` is of type `image`, or `clickableimage`.
- `ColMultiLine` - True when the text in the cells should wrap to multiple lines if too long to fit the available width. This affects both display and editing modes.lization, and performance optimizations.

I'm currently away on my anniversary trip so the ReadMe and portions of the PCF still need updates, consider this the Beta release

## ✨ Key Features

- 🔍 **Excel-like filtering** with comprehensive filter types and operators
- ⚡ **Virtualization** for handling large datasets (1000+ records)
- 📊 **Flexible data binding** to Dataverse datasets or local collections
- 🎨 **Configurable columns** separate from source dataset metadata
- 🔗 **Rich cell types** for links, icons, expand/collapse, and sub text
- 📄 **Pagination support** for large datasets
- 🔄 **Sorting** with Dataverse integration or custom SortBy properties
- ♿ **Accessibility** compliant with WCAG standards
- 🎯 **Performance optimized** for enterprise applications

When configured against a Dataverse connection:  
![DetailsList Demo](media/README/DetailsList.gif)

## 🔍 Advanced Filtering Features

## 🎛️ Inline Editing with EditorConfig

The component supports powerful inline editing capabilities through the `editorConfig` dataset. This allows you to configure different editor types for each column.

### EditorConfig Setup

1. **Enable Enhanced Editors**
   ```powerapp
   FilteredDetailsList.UseEnhancedEditors = true
   ```

2. **Configure the EditorConfig Table**
   Create a table with editor configurations:
   ```powerapp
   Table(
       {ColumnKey: "name", EditorType: "Text", IsRequired: true, Placeholder: "Enter name..."},
       {ColumnKey: "email", EditorType: "Email", IsRequired: true, ValidationPattern: "^[^\s@]+@[^\s@]+\.[^\s@]+$"},
       {ColumnKey: "age", EditorType: "Number", MinValue: 0, MaxValue: 120},
       {ColumnKey: "salary", EditorType: "Currency", CurrencySymbol: "$", DecimalPlaces: 2},
       {ColumnKey: "department", EditorType: "Dropdown", DropdownOptions: "HR,IT,Finance,Marketing"},
       {ColumnKey: "startDate", EditorType: "Date", ShowTime: false},
       {ColumnKey: "rating", EditorType: "Rating", MaxRating: 5, AllowZeroRating: true}
   )
   ```

### Supported Editor Types

#### **Text Editor**
```powerapp
{ColumnKey: "description", EditorType: "Text", MaxLength: 255, IsMultiline: true, Placeholder: "Enter description..."}
```
- `MaxLength`: Maximum character limit
- `IsMultiline`: Enable multiline text area
- `ValidationPattern`: Regex pattern for validation
- `PatternErrorMessage`: Error message for invalid patterns

#### **Email Editor**
```powerapp
{ColumnKey: "email", EditorType: "Email", IsRequired: true}
```
- Automatically validates email format
- Built-in email validation

#### **Number Editor**
```powerapp
{ColumnKey: "quantity", EditorType: "Number", MinValue: 1, MaxValue: 1000, StepValue: 5}
```
- `MinValue`: Minimum allowed value
- `MaxValue`: Maximum allowed value  
- `StepValue`: Increment/decrement step

#### **Currency Editor**
```powerapp
{ColumnKey: "price", EditorType: "Currency", CurrencySymbol: "$", DecimalPlaces: 2, MinValue: 0}
```
- `CurrencySymbol`: Currency symbol to display
- `DecimalPlaces`: Number of decimal places
- `MinValue/MaxValue`: Value constraints

#### **Dropdown Editor**
```powerapp
{ColumnKey: "status", EditorType: "Dropdown", DropdownOptions: "Active,Inactive,Pending", AllowDirectTextInput: false}
```
- `DropdownOptions`: Comma-separated values or JSON array
- `AllowDirectTextInput`: Allow typing custom values

Advanced dropdown with JSON:
```powerapp
{ColumnKey: "priority", EditorType: "Dropdown", DropdownOptions: "[{\"key\":\"high\",\"text\":\"High Priority\"},{\"key\":\"low\",\"text\":\"Low Priority\"}]"}
```

#### **Date Editor**
```powerapp
{ColumnKey: "dueDate", EditorType: "Date", ShowTime: true, DateFormat: "MM/dd/yyyy"}
```
- `ShowTime`: Include time picker
- `DateFormat`: Date display format

#### **Rating Editor**
```powerapp
{ColumnKey: "satisfaction", EditorType: "Rating", MaxRating: 5, AllowZeroRating: true}
```
- `MaxRating`: Maximum rating stars
- `AllowZeroRating`: Allow 0-star ratings

#### **Slider Editor**
```powerapp
{ColumnKey: "progress", EditorType: "Slider", MinValue: 0, MaxValue: 100, StepValue: 10, ShowSliderValue: true}
```
- `MinValue/MaxValue`: Slider range
- `StepValue`: Step increment
- `ShowSliderValue`: Display current value

### Common Properties

All editor types support these common properties:

```powerapp
{
    ColumnKey: "fieldName",           // Required: Column to edit
    EditorType: "Text",              // Required: Type of editor
    IsRequired: true,                // Mark field as required
    IsReadOnly: false,               // Make field read-only
    Placeholder: "Enter value...",   // Placeholder text
    AllowDirectTextInput: true       // Allow direct text input (for dropdowns)
}
```

### Complete Example

```powerapp
Table(
    // Text fields
    {ColumnKey: "firstName", EditorType: "Text", IsRequired: true, MaxLength: 50, Placeholder: "First name"},
    {ColumnKey: "lastName", EditorType: "Text", IsRequired: true, MaxLength: 50, Placeholder: "Last name"},
    {ColumnKey: "bio", EditorType: "Text", IsMultiline: true, MaxLength: 500, Placeholder: "Tell us about yourself..."},
    
    // Contact fields
    {ColumnKey: "email", EditorType: "Email", IsRequired: true},
    {ColumnKey: "phone", EditorType: "Phone", ValidationPattern: "^\d{10}$", PatternErrorMessage: "Phone must be 10 digits"},
    
    // Numeric fields
    {ColumnKey: "age", EditorType: "Number", MinValue: 18, MaxValue: 65},
    {ColumnKey: "salary", EditorType: "Currency", CurrencySymbol: "$", DecimalPlaces: 2, MinValue: 30000},
    {ColumnKey: "experience", EditorType: "Slider", MinValue: 0, MaxValue: 40, StepValue: 1, ShowSliderValue: true},
    
    // Selection fields
    {ColumnKey: "department", EditorType: "Dropdown", DropdownOptions: "Engineering,Marketing,Sales,HR,Finance"},
    {ColumnKey: "skillLevel", EditorType: "Rating", MaxRating: 5, AllowZeroRating: false},
    
    // Date fields
    {ColumnKey: "startDate", EditorType: "Date", IsRequired: true},
    {ColumnKey: "meetingTime", EditorType: "Date", ShowTime: true}
)
```

## 🎯 Column Alignment Configuration

Configure both header and cell alignment for your columns using the `columns` dataset.

### Alignment Properties

#### **Cell Alignment**
- `ColHorizontalAlign`: Controls horizontal alignment of cell content
- `ColVerticalAlign`: Controls vertical alignment of cell content

#### **Header Alignment** 
- `ColHeaderHorizontalAlign`: Controls horizontal alignment of header text (defaults to cell alignment)
- `ColHeaderVerticalAlign`: Controls vertical alignment of header text (defaults to cell alignment)

### Supported Values

#### **Horizontal Alignment**
- `start` or `left`: Align to the left (default)
- `center`: Center alignment
- `end` or `right`: Align to the right

#### **vertical Alignment**
- `top` or `start`: Align to the top
- `center`: Center alignment (default)
- `bottom` or `end`: Align to the bottom

### Example Alignment Configuration

```powerapp
// Create a collection with alignment settings
ClearCollect(ColumnConfig,
    {ColName: "id", ColDisplayName: "ID", ColWidth: 80, ColHorizontalAlign: "center", ColHeaderHorizontalAlign: "center"},
    {ColName: "name", ColDisplayName: "Full Name", ColWidth: 200, ColHorizontalAlign: "start"},
    {ColName: "salary", ColDisplayName: "Salary", ColWidth: 120, ColHorizontalAlign: "end", ColHeaderHorizontalAlign: "end"},
    {ColName: "department", ColDisplayName: "Department", ColWidth: 150, ColHorizontalAlign: "center"}
)
```

### Best Practices

- **Numbers/Currency**: Use `end` alignment for better readability
- **Text Content**: Use `start` alignment (default)
- **Short Codes/IDs**: Use `center` alignment
- **Headers**: Match cell alignment or use `center` for visual consistency
- **Vertical**: Generally use `center` (default) unless specific layout needs require top/bottom alignment
- **Multiline Text**: Use `start` horizontal and `start` vertical alignment for best readability

### Multiline Text Support

The `ColMultiLine` property controls text wrapping behavior for both display and editing:

```powerapp
// Configure multiline columns
ClearCollect(ColumnConfig,
    {ColName: "description", ColDisplayName: "Description", ColWidth: 300, ColMultiLine: true, ColVerticalAlign: "start"},
    {ColName: "comments", ColDisplayName: "Comments", ColWidth: 250, ColMultiLine: true, ColHorizontalAlign: "start"}
)
```

**Note**: Multiline columns work best with adequate column width (250px+) and top vertical alignment for optimal text display.

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PowerApps CLI (`npm install -g @microsoft/powerapps-cli`)
- PowerApps environment

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Wozzardman/FilteredDetailsListV3.git
   cd FilteredDetailsListV3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the component**
   ```bash
   npm run build
   ```

4. **Deploy to PowerApps**
   ```bash
   pac pcf push --publisher-prefix dev
   ```

### Development

For development with hot reload:
```bash
npm start
```

Run tests:
```bash
npm test
```

Build for production:
```bash
npm run build
```

## 📖 Documentation

- [Filtering Guide](docs/Documentation/POWERAPP_CONFIGURATION_GUIDE.md) - Complete filtering setup
- [Configuration Guide](docs/Documentation/CANVAS_APPS_DEPLOYMENT.md) - Canvas app integration
- [Performance Guide](docs/Documentation/GRID_PERFORMANCE_OPTIMIZATIONS.md) - Optimization tips
- [API Reference](docs/Documentation/) - Full documentation

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

If you're upgrading from the original control or getting "Error loading control" when adding Fields, the component now automatically detects and supports both configuration approaches:

- **Legacy Mode**: `Items` + `Fields` datasets (original approach)
- **Modern Mode**: `Records` + `Columns` datasets (enhanced approach)

No changes needed for existing apps - the component automatically detects your configuration style!

📖 **[See LEGACY_COMPATIBILITY.md](LEGACY_COMPATIBILITY.md) for complete migration guide and troubleshooting.**

## Basic Usage

The DetailsList component has the following properties:

- `Records` - The dataset that contains the rows to render:
  - `RecordKey` (optional) - The unique key column name. Provide this if you want the selection to be preserved when the Records are updated, and when you want the `EventRowKey` to contain the id instead of the row index after the `OnChange` event is fired.
  - `RecordCanSelect` (optional) - The column name that contains a `boolean` value defining if a row can be selected.
  - `RecordSelected` (optional) - The column name that contains a `boolean` value defining if a row is selected by default and when setting the `InputEvent` to contain `SetSelection`.  See the section on `Set Selection` below.
- `Columns` (Optional) - The dataset that contains option metadata for the columns. If this dataset is provided, it will completely replace the columns provided in the Records dataset.
  - `ColDisplayName` (Required) - Provides the name of the column to show in the header.
  - `ColName` (Required) - Provides the actual field name of the column in the Items collection.
  - `ColWidth` (Required) - Provides the absolute fixed width of the column in pixels.
  - `ColCellType` - The type of cell to render. Possible values: `expand`, `tag`, `indicatortag`, `image`, `clickableimage`,  `link`. See below for more information.
  - `ColHorizontalAlign` - The alignment of the cell content if the `ColCellType` is of type `image`, or `clickableimage`.
  - `ColVerticalAlign` -  The alignment of the cell content if the `ColCellType` is of type `image`, or `clickableimage`.
  - `ColMultiLine` - True when the text in the cells text should wrap if too long to fit the available width.
  - `ColResizable` - True when the column header width should be resizable.
  - `ColSortable`  - True when the column should show be sortable. If the dataset supports automatic sorting via a direct Dataverse connection, the data will automatically be sorted. Otherwise, the `SortEventColumn` and `SortEventDirection` outputs will be set and must be used in the records Power FX binding expression.
  - `ColSortBy` - The name of the column to provide to the `OnChange` event when the column is sorted. For example, if you are sorting date columns, you want to sort on the actual date value rather than the formatted text shown in the column.
  - `ColIsBold` - True when the data cell data should be bold
  - `ColTagColorColumn` - If the cell type is tag, set to the hex background color of the text tag. Can be set to `transparent`. If the cell type is a not a tag, set to a hex color to use as an indicator circle tag cell. If the text value is empty, the tag is not shown.  
  - `ColTagBorderColorColumn` - Set to a hex color to use as the border color of a text tag. Can be set to `transparent`.
  - `ColHeaderPaddingLeft` - Adds padding to the column header text (pixels)
  - `ColShowAsSubTextOf` - Setting this to the name of another column will move the column to be a child of that column. See below under Sub Text columns.
  - `ColPaddingLeft` - Adds padding to the left of the child cell (pixels)
  - `ColPaddingTop` - Adds padding to the top of the child cell (pixels)
  - `ColLabelAbove` - Moves the label above the child cell value if it is shown as a Sub Text column.
  - `ColMultiValueDelimiter` -  Joins multi value array values together with this delimiter. See below under multi-valued columns.
  - `ColFirstMultiValueBold`  - When showing a multi-valued array value, the first item is shown as bold.
  - `ColInlineLabel` - If set to a string value, then this is used to show a label inside the cell value that could be different to the column name. E.g.  
    ![image-20220322144857658](media/README/image-20220322144857658.png)
  - `ColHideWhenBlank` - When true, any cell inline label & padding will be hidden if the cell value is blank.
  - `ColSubTextRow` - When showing multiple cells on a sub text cell, set to the row index. Zero indicates the main cell content row.
  - `ColAriaTextColumn` - The column that contains the aria description for cells (e.g. icon cells).
  - `ColCellActionDisabledColumn` - The column that contains a boolean flag to control if a cell action (e.g. icon cells) is disabled.
  - `ColImageWidth` - The icon/image size in pixels.
  - `ColImagePadding` - The padding around an icon/image cell.
  - `ColRowHeader` - Defines a column to render larger than the other cells (14px rather than 12px). There normally would only be a single Row Header per column set. 
- `SelectionType` - Selection Type (None, Single, Multiple)
- `PageSize` - Defines how many records to load per page.
- `PageNumber` - Outputs the current page shown.
- `HasNextPage` - Outputs true if there is a next page.
- `HasPreviousPage` - Outputs true if there is a previous page.
- `TotalRecords` - Outputs the total number of records available.
- `CurrentSortColumn` - The name of the column to show as currently used for sorting
- `CurrentSortDirection` - The direction of the current sort column being used
- `AccessibilityLabel` - The label to add to the table aria description
- `RaiseOnRowSelectionChangeEvent` - The `OnChange` event is raised when a row is selected/unselected. (see below)
- `InputEvent` - One or more input events (that can be combined together using string concatenation). Possible values `SetFocus`, `SetFocusOnRow`, `SetFocusOnHeader`, `ClearSelection`, `SetSelection`. Must be followed by random string element to ensure the event is triggered. Events can be combined e.g. `SetFocusClearSelection` will clear and set the focus at the same time. `SetFocusOnRowSetSelection` will set focus on a row and set the selection at the same time.
- `EventName` - Output Event when `OnChange` is triggered. Possible values -  `Sort`, `CellAction`, `OnRowSelectionChange`
- `EventColumn` - Output Event column field name used when `CellAction` is invoked
- `EventRowKey` - Output Event column that holds either the index of the row that the event was invoked on, or the Row Key if the `RecordKey` property is set.
- `SortEventColumn` - The name of the column that triggered the Sort `OnChange` event
- `SortEventDirection` - The direction of the sort that triggered the Sort `OnChange` event
- `Theme` - The Fluent UI Theme JSON to use that is generated and exported from [Fluent UI Theme Designer](https://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/theming-designer/).
- `Compact` - True when the compact style should be used
- `AlternateRowColor` - The hex value of the row color to use on alternate rows.
- `SelectionAlwaysVisible` - Should the selection radio buttons always be visible rather than only on row ```vbscript
   SortByColumns(colData,ctxSortCol,If(ctxSortAsc,SortOrder.Ascending,SortOrder.Descending))
   ```
## Paging

Paging is handled internally by the component, however the buttons to move back/forwards must be created by the hosting app, and events sent to the component.

The following properties are used to control paging:

- `PageSize` - Defines how many records to load per page.
- `PageNumber` - Outputs the current page shown.
- `HasNextPage` - Outputs true if there is a next page.
- `HasPreviousPage` - Outputs true if there is a previous page.
- `TotalRecords` - Outputs the total number of records available.

The paging buttons can then be defined as follows:

- **Load First Page**
  - `OnSelect`: `UpdateContext({ctxGridEvent:"LoadFirstPage" & Text(Rand())})`
  - `DisplayMode`: `If(grid.HasPreviousPage,DisplayMode.Edit,DisplayMode.Disabled)` 
- **Load Previous Page**
  - `OnSelect`: `UpdateContext({ctxGridEvent:"LoadPreviousPage" & Text(Rand())})`
  - `DisplayMode`: `If(grid.HasPreviousPage,DisplayMode.Edit,DisplayMode.Disabled)` 
- **Load Next Page**
  - `OnSelect`: `UpdateContext({ctxGridEvent:"LoadNextPage" & Text(Rand())})`
  - `DisplayMode`: `If(grid.HasNextPage,DisplayMode.Edit,DisplayMode.Disabled)` 

The number of records label can be set to an expression similar to:

```javascript
grid.TotalRecords & " record(s)  " & Text(CountRows(grid.SelectedItems)+0) & " selected" 
```

## Input Events

The `InputEvent` property can be set to one or more of the following:

- **`SetFocus`** - Sets focus on the first row of the grid
- **`ClearSelection`** - Clears any selection, and sets back to the default selection.
- **`SetSelection`** - Sets the selection as defined by the `RowSelected` column. 
- **`LoadNextPage`** - Loads the next page if there is one
- **`LoadPreviousPage`** - Loads the previous page if there one
- **`LoadFirstPage`** - Loads the first page

To ensure that the input event is picked up, it must be sufficed with a random value. e.g. `SetSelection" & Text(Rand())`

See below for more details.

## Selected Items and Row Actions

The component supports **Single**, **Multiple** or **None** selection modes.

When selecting items, the `SelectedItems` and `Selected` properties are updated.

- `SelectedItems` - If the table is in Multiple selection mode, this will contain one or more records from the Items collection.
- `Selected` - If the table is in Single selection mode, this will contain the selected records.

When a user invokes the row action, either by double clicking or pressing enter or a selected row, the `OnSelect` event is fired. The `Selected` property will contain a reference to the record that has been invoked. This event can be used to show a detailed record or navigate to another screen.

If the `RaiseOnRowSelectionChangeEvent` property is enabled, when the selected rows is changed, the `OnChange` event is raised with the `EventName` set to `OnRowSelectionChange`. If the app needs to respond to a single row select rather than a row double click, the `OnChange` can detect this using code similar to:

```javascript
If(
    Self.EventName = "OnRowSelectionChange",
        If(!IsBlank(Self.EventRowKey),
        	// Row Selected
        )
);
```

## Clearing the currently selected items

To clear the selected records, you must set the `InputEvent` property to a string that starts with

E.g.

```vbscript
UpdateContext({ctxTableEvent:"ClearSelection"&Text(Rand())})
```

The context variable `ctxTableEvent` can then be bound to the `InputEvent` property.

## Set Row Selection

If there is a scenario where a specific set of records should be programmatically selected, the `InputEvent` property can be set to `SetSelection` or `SetFocusOnRowSetSelection` in combination with setting the `RecordSelected` property on the record.

E.g. If you had a dataset as follows:

`{RecordKey:1, RecordSelected:true, name:"Row1"}`

To select and select the first row you can set the `InputEvent` to be `"SetFocusOnRowSetSelection"&Text(Rand())` or `"SetSelection"&Text(Rand())`

## Multi-valued columns

If a column value can has multiple values by setting it to a Table/Collection. This will then render the values as multiple cell values. E.g.:

```vb
 {
        id: "1",
        name: "Contoso",
        tags:["#PowerApps","#PowerPlatform"]
    },
```

The column metadata then could be:

```javascript
 {
        ColName: "tags",
        ColDisplayName: "Tags",
        ColWidth: 250,
        ColFirstMultiValueBold :true,
        ColMultiValueDelimiter:" "
    }
```

This would result in the table showing:  
![image-20220324160725874](media/README/image-20220324160725874.png)

## Set Focus

The table can be programmatically set focus on (e.g. after a search or using a keyboard shortcut). To set focus on the first row, set the Input Event to a variable that contains `"SetFocus" & Text(Rand())`.


## Design Challenges

### Accessibility

Canvas apps (not custom pages) allow the maker to assign a tab index for components to control the tab order. Even if the tab index is set to zero, the accessibility manager assigns a positive tab index to standard controls. The DetailsList component does not allow setting positive tab indexes on the `FocusZone` for headers and rows. A modified version of the `DetailsList` and `FocusZone` components is required to address this issue. This is not implemented at this time.

The result of this is if a user uses tab to move out of a details list, or tab into it from a control above, the tab order will be incorrect.

**Note:** this issue does not apply to custom pages since they force the tab index to zero.

### FocusZone sticky header scroll bug

When using the DetailsList for datasets that require a scrollbar, the headers are added to the Stick component to ensure they remain at the top of the grid. The Stick Header logic has a bug when it is interacting with the `FocusZone`.

1. Open [https://codepen.io/scottdurow/pen/ZEyLzYg](https://codepen.io/scottdurow/pen/ZEyLzYg)

2. Select a row and use cursor keys so that the top most row is partially scrolled out of view so that the sticky header is showing.

3. Use cursor up keys to move up to the first row - notice that the row is not scrolled into view and partially obscured by the sticky header. This is because the scroll zone thinks that it is showing since it doesn't take into consideration the sticky header

4. Move up using the cursor keys again, notice how the focus is lost from the grid and the cursor key start scrolling the scrollable area.

This is because when the `DetailsHeader` is inside a sticky header, the `componentref` is set to null on unmount when it is swapped out to the floating version. When using `keyup` to move focus to the header after scrolling down (inside `DetailsList.onContentKeyDown`), the call to `focus()` does not work because `componentref.current` is null. To work around this, a modified version of `initializeComponentRef` is used that does not null the ref on unmount.

### Shift-Tab does not work with sticky headers

When using Shift-Tab to move focus back to previous elements from the `DetailsList` grid rows, the sticky header is reset and the focus moves to the top most document.

1. Open [https://codepen.io/scottdurow/pen/ZEyLzYg](https://codepen.io/scottdurow/pen/ZEyLzYg)

2. Move down using cursor keys when focused on the grid rows so that the sticky header shows

3. Press Shift-Tab - notice how the focus moves to the window

4. If you move up so that the sticky header is reset, Shift-Tab now correctly moves to the header focus

### Keydown on header sets focus

When moving down from header using down arrow, the first item will be automatically selected even if `isSelectedOnFocus` is false.

1. Open [https://codepen.io/scottdurow/pen/ZEyLzYg](https://codepen.io/scottdurow/pen/ZEyLzYg)

2. Select the first column header

3. Press key down

4. Notice how the first item is selected, but `isSelectedOnFocus` is set to false on the `selectionZoneProps` props.

### Focus with zero rows

There is no way using `IDetailsList` to set focus on the grid when there are no rows. `focusIndex` can be used where there are rows - but there is no `focus` method. This means that the `SetFocus` Input event cannot be used for tables of zero rows.

### EventRowKey Property

When cell events are invoked (clicking on a link/image or expanding/collapsing rows), the `OnChange` event is fired. Currently there is no supported way to output a similar property to the Selected property that contains a reference to the row who's action is being invoked. If `openDatasetItem` is called, it is not guaranteed to set the Selected property before the `OnChange` event is fired with the `EventColumn` output property set.

