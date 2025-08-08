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

The component supports the following EditorTypes for the `editorConfig` dataset:

#### **Core Input Types**
- **`Text`** - Single line or multi-line text input with validation
- **`Number`** - Numeric input with min/max constraints and step values
- **`Email`** - Email input with built-in validation
- **`Phone`** - Phone number input with pattern validation
- **`Url`** - URL input with validation
- **`Password`** - Password input field

#### **Financial & Numeric Types**
- **`Currency`** - Monetary values with currency symbols and decimal places
- **`Percentage`** - Percentage values with % symbol and constraints

#### **Date & Time Types**
- **`Date`** - Date picker with optional time selection
- **`DateTime`** - Date and time picker combination

#### **Selection Types**
- **`Boolean`** - Toggle switch for true/false values
- **`Dropdown`** - Single selection dropdown with search capability
- **`Multiselect`** - Multiple selection dropdown (planned)
- **`Autocomplete`** - Text input with autocomplete suggestions (basic implementation)

#### **Interactive Types**
- **`Rating`** - Star rating component with configurable maximum
- **`Slider`** - Range slider with min/max values and steps
- **`Color`** - Color picker for hex color values

#### **Rich Content Types**
- **`RichText`** - Rich text editor (planned)
- **`Custom`** - Custom React component implementation

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

#### **Percentage Editor**
```powerapp
{ColumnKey: "completion", EditorType: "Percentage", MinValue: 0, MaxValue: 100, DecimalPlaces: 1}
```
- `MinValue/MaxValue`: Percentage range constraints
- `DecimalPlaces`: Number of decimal places to display
- Automatically adds % symbol

#### **Phone Editor**
```powerapp
{ColumnKey: "phone", EditorType: "Phone", ValidationPattern: "^\\+?[1-9]\\d{1,14}$", PatternErrorMessage: "Invalid phone format"}
```
- `ValidationPattern`: Regex pattern for phone validation
- `PatternErrorMessage`: Custom error message
- Built-in phone number formatting

#### **URL Editor**
```powerapp
{ColumnKey: "website", EditorType: "Url", IsRequired: true, Placeholder: "https://example.com"}
```
- Automatically validates URL format
- Supports http/https protocols

#### **Color Editor**
```powerapp
{ColumnKey: "brandColor", EditorType: "Color", DefaultValue: "#0078d4"}
```
- Visual color picker interface
- Returns hex color values
- Supports default color selection

#### **Boolean Editor**
```powerapp
{ColumnKey: "isActive", EditorType: "Boolean", DefaultValue: "true"}
```
- Renders as toggle switch
- Returns true/false values
- Auto-commits on change

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
    DefaultValue: "Initial value",   // Default value for new records
    ValueType` - Type for default value conversion (text, number, boolean, date)

## 👁️ Column Visibility Control

### Dynamic Show/Hide Columns ✅ IMPLEMENTED

The control now supports **lightning-fast column visibility** through the `ColVisible` property in the `Columns` dataset. This provides true dynamic show/hide functionality without rebuilding datasets.

### Usage

```powerapp
// Dynamic column visibility control
ClearCollect(ColumnConfig,
    {ColName: "id", ColDisplayName: "ID", ColWidth: 80, ColVisible: true},
    {ColName: "name", ColDisplayName: "Name", ColWidth: 200, ColVisible: true},
    {ColName: "email", ColDisplayName: "Email", ColWidth: 150, ColVisible: false}, // Hidden
    {ColName: "phone", ColDisplayName: "Phone", ColWidth: 120, ColVisible: true}
)
```

### Performance Features

- **⚡ Lightning-Fast**: Columns are filtered at the component level before any rendering
- **🚀 Zero Rebuild**: No need to recreate datasets - just toggle `ColVisible`
- **📊 Real-time**: Changes are applied instantly with optimal performance
- **🔄 Backward Compatible**: Columns without `ColVisible` default to visible

### Dynamic Visibility Example

```powerapp
// Toggle column visibility based on user preferences
UpdateIf(ColumnConfig, 
    ColName = "email", 
    {ColVisible: Toggle_ShowEmail.Value}
);

UpdateIf(ColumnConfig, 
    ColName = "phone", 
    {ColVisible: Toggle_ShowPhone.Value}
);
```

### Best Practices

- **Default Visible**: Columns without `ColVisible` property default to visible (backward compatibility)
- **Performance**: Use `ColVisible: false` instead of removing columns from dataset
- **User Control**: Bind visibility to toggles or user preferences for dynamic control
- **Conditional Logic**: Use formulas to show/hide columns based on context

### Migration from Workarounds

If you were using dataset filtering workarounds, you can now use the native `ColVisible` property:

```powerapp
// OLD: Complex dataset filtering
Set(VisibleData, ShowColumns(MyData, "name", "email"));

// NEW: Simple column visibility
UpdateIf(ColumnConfig, ColName in ["phone", "address"], {ColVisible: false});
```

Currently, the `ValueType: "text",              // Type for default value conversion (text, number, boolean, date)
    AllowDirectTextInput: true       // Allow direct text input (for dropdowns)
}
```

### Default Values & Conditional Logic

The editor system supports powerful conditional logic for dynamic value calculation, lookups, and field dependencies. This enables sophisticated form behavior that rivals enterprise applications.

#### Simple Value Dependencies

Map values from one field to automatically populate another:

```powerapp
Table(
    // Static default value
    {ColumnKey: "status", EditorType: "Dropdown", DropdownOptions: "Active,Inactive,Pending", DefaultValue: "Active"},
    
    // Simple conditional mapping
    {ColumnKey: "discount", EditorType: "Number", 
     ConditionalConfig: ConditionalHelpers.mapValues("customerType", {
         "VIP": 0.15,
         "Premium": 0.10, 
         "Standard": 0.05,
         "Basic": 0.0
     })},
    
    // Conditional dropdown based on department selection
    {ColumnKey: "role", EditorType: "Dropdown", 
     ConditionalConfig: ConditionalHelpers.conditionalOptions("department", {
         "IT": [{key: "dev", text: "Developer"}, {key: "analyst", text: "Analyst"}],
         "HR": [{key: "recruiter", text: "Recruiter"}, {key: "coordinator", text: "Coordinator"}],
         "Finance": [{key: "accountant", text: "Accountant"}, {key: "controller", text: "Controller"}]
     })}
)
```

#### Calculated Fields

Create fields that automatically calculate based on other field values:

```powerapp
Table(
    {ColumnKey: "quantity", EditorType: "Number", MinValue: 1},
    {ColumnKey: "unitPrice", EditorType: "Currency", CurrencySymbol: "$"},
    
    // Total automatically calculated from quantity × unitPrice
    {ColumnKey: "total", EditorType: "Currency", CurrencySymbol: "$", IsReadOnly: true,
     ConditionalConfig: ConditionalHelpers.multiFieldCalculation(
         ["quantity", "unitPrice"],
         (values) => (values.quantity || 0) * (values.unitPrice || 0)
     )},
     
    // Tax calculation (7.5% of total)
    {ColumnKey: "tax", EditorType: "Currency", CurrencySymbol: "$", IsReadOnly: true,
     ConditionalConfig: ConditionalHelpers.calculate("total", 
         (totalValue) => (totalValue || 0) * 0.075
     )},
     
    // Final amount with tax
    {ColumnKey: "finalAmount", EditorType: "Currency", CurrencySymbol: "$", IsReadOnly: true,
     ConditionalConfig: ConditionalHelpers.multiFieldCalculation(
         ["total", "tax"],
         (values) => (values.total || 0) + (values.tax || 0)
     )}
)
```

#### API Lookups

Fetch values from external APIs based on field changes:

```powerapp
Table(
    {ColumnKey: "productId", EditorType: "Text", Placeholder: "Enter product ID..."},
    
    // Product name looked up from API
    {ColumnKey: "productName", EditorType: "Text", IsReadOnly: true,
     ConditionalConfig: ConditionalHelpers.lookup("productId",
         LookupBuilder.fromApi("https://api.company.com/products/{sourceValue}")
             .withMethod("GET")
             .withHeaders({"Authorization": "Bearer " + varAuthToken})
             .withCache(300000) // 5 minute cache
             .withTransform((response) => response.name)
             .withFallback("Product not found")
             .build()
     )},
     
    // Category looked up and cached
    {ColumnKey: "category", EditorType: "Text", IsReadOnly: true,
     ConditionalConfig: ConditionalHelpers.lookup("productId",
         LookupBuilder.fromApi("https://api.company.com/products/{sourceValue}/category")
             .withCache(600000) // 10 minute cache
             .withTransform((response) => response.categoryName)
             .build()
     )}
)
```

#### Advanced Conditional Rules

For complex scenarios, use the full rule-based system:

```powerapp
Table(
    {ColumnKey: "orderType", EditorType: "Dropdown", DropdownOptions: "Standard,Express,Priority"},
    {ColumnKey: "weight", EditorType: "Number", MinValue: 0, Placeholder: "Weight in lbs"},
    
    // Shipping cost with complex calculation
    {ColumnKey: "shippingCost", EditorType: "Currency", CurrencySymbol: "$", IsReadOnly: true,
     ConditionalConfig: {
         rules: [
             // Rule 1: Base shipping calculation on order type and weight
             new ConditionalRuleBuilder()
                 .withId("shipping_calculation")
                 .forColumn("shippingCost")
                 .withPriority(100)
                 .whenChanged("orderType", ActionBuilder.calculate(
                     (orderType, item, allColumns) => {
                         const weight = allColumns.weight || 0;
                         const baseRates = {
                             "Standard": 5.99,
                             "Express": 12.99,
                             "Priority": 24.99
                         };
                         const baseRate = baseRates[orderType] || 0;
                         const weightSurcharge = Math.max(0, weight - 5) * 2.50;
                         return baseRate + weightSurcharge;
                     }
                 ))
                 .build(),
                 
             // Rule 2: Recalculate when weight changes
             new ConditionalRuleBuilder()
                 .withId("shipping_weight_update")
                 .forColumn("shippingCost")
                 .withPriority(90)
                 .whenChanged("weight", ActionBuilder.calculate(
                     (weight, item, allColumns) => {
                         const orderType = allColumns.orderType || "Standard";
                         const baseRates = {
                             "Standard": 5.99,
                             "Express": 12.99,
                             "Priority": 24.99
                         };
                         const baseRate = baseRates[orderType] || 0;
                         const weightSurcharge = Math.max(0, weight - 5) * 2.50;
                         return baseRate + weightSurcharge;
                     }
                 ))
                 .build()
         ]
     }}
)
```

#### Real-Time Validation

Create dynamic validation rules based on other field values:

```powerapp
Table(
    {ColumnKey: "startDate", EditorType: "Date", IsRequired: true},
    {ColumnKey: "endDate", EditorType: "Date", IsRequired: true,
     ConditionalConfig: {
         rules: [
             new ConditionalRuleBuilder()
                 .withId("end_date_validation")
                 .forColumn("endDate")
                 .whenChanged("startDate", ActionBuilder.validate(
                     (endDate, startDate) => {
                         if (endDate && startDate && new Date(endDate) <= new Date(startDate)) {
                             return "End date must be after start date";
                         }
                         return null;
                     }
                 ))
                 .build()
         ]
     }},
     
    {ColumnKey: "duration", EditorType: "Number", IsReadOnly: true,
     ConditionalConfig: ConditionalHelpers.multiFieldCalculation(
         ["startDate", "endDate"],
         (values) => {
             if (values.startDate && values.endDate) {
                 const start = new Date(values.startDate);
                 const end = new Date(values.endDate);
                 return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
             }
             return 0;
         }
     )}
)
```

#### Performance Features

The conditional system includes enterprise-grade performance optimizations:

- **Caching**: API lookups are automatically cached with configurable durations
- **Debouncing**: Rapid value changes are debounced to prevent excessive API calls
- **Parallel Processing**: Multiple rules are processed efficiently in parallel
- **Dependency Tracking**: Only affected fields are recalculated when values change
- **Error Handling**: Fallback values and graceful degradation for failed lookups

#### Common Patterns

Use pre-built patterns for typical scenarios:

```powerapp
Table(
    // Price calculation pattern
    {ColumnKey: "quantity", EditorType: "Number"},
    {ColumnKey: "unitPrice", EditorType: "Currency"},
    {ColumnKey: "total", EditorType: "Currency", IsReadOnly: true,
     ConditionalConfig: CommonConditionalPatterns.calculateTotal()},
     
    // Geographic dependency pattern
    {ColumnKey: "country", EditorType: "Dropdown", DropdownOptions: "US,CA,UK"},
    {ColumnKey: "state", EditorType: "Dropdown",
     ConditionalConfig: CommonConditionalPatterns.stateByCountry({
         "US": [{key: "CA", text: "California"}, {key: "NY", text: "New York"}],
         "CA": [{key: "ON", text: "Ontario"}, {key: "BC", text: "British Columbia"}],
         "UK": [{key: "EN", text: "England"}, {key: "SC", text: "Scotland"}]
     })},
     
    // Customer discount pattern
    {ColumnKey: "customerType", EditorType: "Dropdown", DropdownOptions: "VIP,Premium,Standard,Basic"},
    {ColumnKey: "discount", EditorType: "Percentage", IsReadOnly: true,
     ConditionalConfig: CommonConditionalPatterns.discountByCustomerType()}
)
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

