# Power Apps FX Column Editor Formulas

## Overview
The PCF control now supports **simplified Power Apps FX formulas** for configuring column editors, making it much easier to set up enhanced editing without complex JSON configurations.

## Key Benefits

### ✅ **Before (Complex JSON)**
```json
{
  "Name": {
    "type": "text",
    "isRequired": true,
    "placeholder": "Enter full name",
    "textConfig": {
      "maxLength": 100
    }
  },
  "Price": {
    "type": "currency",
    "currencyConfig": {
      "currencySymbol": "$",
      "decimalPlaces": 2
    }
  }
}
```

### ✅ **After (Simple Power Apps FX)**
```
Name: Text(placeholder: 'Enter full name', required: true, maxlength: 100); Price: Currency(symbol: '$', decimals: 2)
```

## How to Use

### 1. **Enable Enhanced Editors**
Set the control property:
- `UseEnhancedEditors` = `true`

### 2. **Configure with Power Apps FX Formulas**
Set the control property:
- `ColumnEditorFormulas` = Your formula string (see examples below)

### 3. **Formula Format**
```
ColumnName1: EditorType(parameter: value); ColumnName2: EditorType(parameter: value)
```

## Supported Editor Types

### **Text Editors**
```
Name: Text(placeholder: 'Enter name', required: true)
Description: Text(multiline: true, maxlength: 500)
ProductCode: Text(pattern: '^[A-Z]{3}-\\d{4}$', patternerror: 'Format: ABC-1234')
Email: Email(required: true)
Phone: Phone(format: 'US')
Website: URL()
```

### **Number Editors**
```
Age: Number(min: 0, max: 150)
Price: Currency(symbol: '$', min: 0, decimals: 2)
Discount: Percentage(min: 0, max: 100)
Quantity: Number(min: 1, step: 1)
```

### **Date Editors**
```
BirthDate: Date(max: Today())
StartDate: Date()
AppointmentTime: Date(includetime: true)
```

### **Choice Editors**
```
Status: Dropdown(['Active', 'Inactive', 'Pending', 'Completed'])
Category: Dropdown(['Technology', 'Finance', 'Healthcare', 'Education'])
WeldNum: Dropdown([1, 2, 3])
Priority: Dropdown(['High', 'Medium', 'Low'])
```

### **Interactive Editors**
```
IsActive: Boolean()
Rating: Rating(max: 5, allowzero: true)
Priority: Slider(min: 1, max: 10, showvalue: true)
```

## Complete Examples

### **Basic Contact Form**
```
FirstName: Text(placeholder: 'First name', required: true); LastName: Text(placeholder: 'Last name', required: true); Email: Email(required: true); Phone: Phone(format: 'US'); IsActive: Boolean()
```

### **Product Catalog**
```
ProductName: Text(required: true, maxlength: 100); Price: Currency(symbol: '$', min: 0); Category: Dropdown(['Electronics', 'Clothing', 'Books', 'Home']); Rating: Rating(max: 5); InStock: Boolean()
```

### **Project Management**
```
TaskName: Text(required: true); Priority: Slider(min: 1, max: 5, showvalue: true); Status: Dropdown(['Not Started', 'In Progress', 'Completed']); DueDate: Date(min: Today()); EstimatedHours: Number(min: 0, step: 0.5)
```

### **Employee Records**
```
FullName: Text(required: true); Department: Dropdown(['HR', 'Engineering', 'Sales', 'Marketing']); Salary: Currency(symbol: '$', min: 30000); StartDate: Date(max: Today()); Performance: Rating(max: 5)
```

## Parameter Reference

### **Common Parameters (All Types)**
- `required: true/false` - Makes field mandatory
- `readonly: true/false` - Makes field read-only
- `placeholder: 'text'` - Placeholder text

### **Text Parameters**
- `multiline: true/false` - Multi-line text area
- `maxlength: number` - Maximum character length
- `pattern: 'regex'` - Validation pattern
- `patternerror: 'message'` - Error message for pattern

### **Number Parameters**
- `min: number` - Minimum value
- `max: number` - Maximum value
- `step: number` - Step increment
- `decimals: number` - Decimal places
- `prefix: 'text'` - Text before number
- `suffix: 'text'` - Text after number

### **Currency Parameters**
- `symbol: '$'` - Currency symbol
- `decimals: number` - Decimal places (default: 2)

### **Date Parameters**
- `min: Today()` - Minimum date
- `max: Today()` - Maximum date
- `includetime: true/false` - Include time picker
- `format: 'MM/dd/yyyy'` - Date format

### **Dropdown Parameters**
- `options: ['Option1', 'Option2', 'Option3']` - Available choices

### **Rating Parameters**
- `max: number` - Maximum rating (default: 5)
- `allowzero: true/false` - Allow zero rating

### **Slider Parameters**
- `min: number` - Minimum value
- `max: number` - Maximum value
- `step: number` - Step increment
- `showvalue: true/false` - Show current value

## Migration from JSON

### **Step 1: Identify Current JSON**
If you have existing `ColumnEditorConfig` JSON:
```json
{
  "firstName": {
    "type": "text",
    "isRequired": true,
    "placeholder": "First name"
  }
}
```

### **Step 2: Convert to Formula**
```
firstName: Text(placeholder: 'First name', required: true)
```

### **Step 3: Update Properties**
- Keep `UseEnhancedEditors` = `true`
- Clear `ColumnEditorConfig`
- Set `ColumnEditorFormulas` = Your new formula string

## Backward Compatibility

✅ **Fully Backward Compatible**
- Existing JSON configurations continue to work
- Power Apps FX formulas take priority when both are present
- Gradual migration supported

## Troubleshooting

### **Formulas Not Working?**
1. Check `UseEnhancedEditors` is `true`
2. Verify formula syntax (colon after column name, semicolon between formulas)
3. Check browser console for parsing errors

### **Syntax Errors?**
- Use single quotes for text values: `'text'`
- Use square brackets for arrays: `['a', 'b', 'c']`
- Separate parameters with commas: `min: 0, max: 100`

### **Getting Help**
Open browser developer console (F12) to see detailed parsing logs:
```
🚀 Column editor configuration loaded from Power Apps FX formulas: {...}
```

## Advanced Features

### **Dynamic Values**
```
DueDate: Date(min: Today(), max: Today() + 365)
```

### **Validation Patterns**
```
PostalCode: Text(pattern: '^\\d{5}(-\\d{4})?$', patternerror: 'Format: 12345 or 12345-6789')
```

### **Conditional Logic**
Future enhancement: Support for conditional editor types based on other field values.

## Version History
- **v9.0.3**: Initial Power Apps FX formula support
- Simplified configuration with automatic JSON conversion
- Full backward compatibility with existing JSON configurations
