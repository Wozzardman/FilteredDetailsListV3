# Enhanced Column Editors Guide

The Enhanced Column Editor system allows you to configure different editing experiences for each column in your grid. Instead of just basic text input, you can now use dropdowns, date pickers, rating stars, sliders, and much more!

## 🚀 **Quick Start**

### 1. Basic Setup

```typescript
import { VirtualizedEditableGrid } from './components/VirtualizedEditableGrid';
import { ColumnEditorConfigHelper } from './services/ColumnEditorConfigHelper';
import { ColumnEditorMapping } from './types/ColumnEditor.types';

// Define your column editor mapping
const columnEditorMapping: ColumnEditorMapping = {
    name: ColumnEditorConfigHelper.text({ 
        placeholder: 'Enter name...', 
        isRequired: true 
    }),
    email: ColumnEditorConfigHelper.email({ 
        isRequired: true 
    }),
    status: ColumnEditorConfigHelper.dropdown({
        options: ColumnEditorConfigHelper.createDropdownOptions([
            'Active', 'Inactive', 'Pending'
        ])
    }),
    rating: ColumnEditorConfigHelper.rating({ max: 5 }),
    isActive: ColumnEditorConfigHelper.boolean()
};

// Use in your grid
<VirtualizedEditableGrid
    items={data}
    columns={columns}
    height={600}
    useEnhancedEditors={true}
    columnEditorMapping={columnEditorMapping}
    onCellEdit={handleCellEdit}
/>
```

## 📝 **Available Editor Types**

### Text Editors
- **`text`** - Basic text input with optional multiline, length limits, and pattern validation
- **`email`** - Email input with validation
- **`phone`** - Phone number input with formatting
- **`url`** - URL input with validation

### Numeric Editors
- **`number`** - Number input with min/max validation and step control
- **`currency`** - Currency input with symbol and decimal formatting
- **`percentage`** - Percentage input (0-100%) with % suffix

### Date & Time
- **`date`** - Date picker with min/max date validation
- **`datetime`** - Date and time picker

### Selection Editors
- **`dropdown`** - Single-select dropdown with static or dynamic options
- **`autocomplete`** - Searchable dropdown with filtering
- **`boolean`** - Toggle switch for true/false values

### Visual Editors
- **`rating`** - Star rating component (1-5 stars by default)
- **`slider`** - Numeric slider with visual feedback
- **`color`** - Color picker for hex color values

### Advanced
- **`custom`** - Use your own React component as an editor

## 🛠 **Configuration Examples**

### Text with Validation
```typescript
projectCode: ColumnEditorConfigHelper.text({
    placeholder: 'PROJ-XXXX',
    isRequired: true,
    maxLength: 20,
    pattern: '^PROJ-[0-9]{4}$',
    patternErrorMessage: 'Must be format PROJ-1234'
})
```

### Currency with Limits
```typescript
salary: ColumnEditorConfigHelper.currency({
    currencySymbol: '$',
    min: 30000,
    max: 200000,
    decimalPlaces: 0
})
```

### Dynamic Dropdown
```typescript
department: ColumnEditorConfigHelper.dropdown({
    getDynamicOptions: (item, column) => {
        // Return different options based on the current item
        if (item.level === 'Senior') {
            return [
                { key: 'engineering', text: 'Engineering', value: 'engineering' },
                { key: 'management', text: 'Management', value: 'management' }
            ];
        }
        return [
            { key: 'support', text: 'Support', value: 'support' },
            { key: 'sales', text: 'Sales', value: 'sales' }
        ];
    }
})
```

### Rating with Custom Icon
```typescript
satisfaction: ColumnEditorConfigHelper.rating({
    max: 10,
    allowZero: true,
    iconName: 'Heart'
})
```

### Slider with Custom Formatting
```typescript
priority: ColumnEditorConfigHelper.slider({
    min: 1,
    max: 10,
    step: 1,
    showValue: true,
    valueFormat: (value) => `Priority Level ${value}`
})
```

### Date with Restrictions
```typescript
startDate: ColumnEditorConfigHelper.date({
    minDate: new Date('2020-01-01'),
    maxDate: new Date(), // Can't be in the future
    isRequired: true
})
```

## 🎨 **Custom Editors**

You can create completely custom editors by implementing your own React component:

```typescript
const MyCustomEditor: React.FC<CustomEditorProps> = ({
    value,
    onChange,
    onCommit,
    onCancel,
    column,
    item,
    config
}) => {
    const [localValue, setLocalValue] = React.useState(value);
    
    return (
        <div>
            {/* Your custom editor UI */}
            <input
                value={localValue}
                onChange={(e) => {
                    setLocalValue(e.target.value);
                    onChange(e.target.value);
                }}
                onBlur={() => onCommit(localValue)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onCommit(localValue);
                    if (e.key === 'Escape') onCancel();
                }}
            />
        </div>
    );
};

// Use it in your mapping
const mapping: ColumnEditorMapping = {
    customField: {
        type: 'custom',
        customConfig: {
            component: MyCustomEditor,
            props: {
                // Any custom props for your editor
                specialOption: true
            }
        }
    }
};
```

## 📋 **Common Configurations**

The `CommonEditorConfigs` object provides pre-built configurations for typical business scenarios:

```typescript
import { CommonEditorConfigs } from './services/ColumnEditorConfigHelper';

const quickMapping: ColumnEditorMapping = {
    firstName: CommonEditorConfigs.firstName,
    lastName: CommonEditorConfigs.lastName,
    email: CommonEditorConfigs.email,
    phone: CommonEditorConfigs.phone,
    price: CommonEditorConfigs.price,
    rating: CommonEditorConfigs.rating,
    isActive: CommonEditorConfigs.isActive,
    status: CommonEditorConfigs.status
};
```

## 🔧 **Advanced Features**

### Conditional Read-Only
```typescript
field: {
    type: 'text',
    isReadOnly: item => item.status === 'Locked', // Dynamic read-only
    placeholder: 'Enter value...'
}
```

### Custom Validation
```typescript
amount: {
    type: 'currency',
    validator: (value, item, column) => {
        if (value > item.budget) {
            return 'Amount cannot exceed budget';
        }
        return null; // No error
    }
}
```

### Custom Display Formatting
```typescript
percentage: {
    type: 'number',
    displayFormatter: (value) => `${value}%`,
    valueFormatter: (value) => value / 100 // Store as decimal
}
```

## 🎯 **Best Practices**

1. **Use the helper methods** - `ColumnEditorConfigHelper` provides type-safe configuration
2. **Leverage common configs** - Start with `CommonEditorConfigs` for standard fields
3. **Validate early** - Use built-in validation for better UX
4. **Auto-commit for selections** - Dropdowns, toggles, and ratings auto-commit for better flow
5. **Provide placeholders** - Help users understand expected input format
6. **Use dynamic options** - Make dropdowns contextual based on row data

## 🚀 **Migration from Basic Editors**

If you're currently using the basic `InlineEditor`, you can gradually migrate:

1. Set `useEnhancedEditors={true}` on your grid
2. Add `columnEditorMapping` with configurations only for columns you want to enhance
3. Columns without configurations will fall back to the basic editor
4. Gradually add more column configurations as needed

The enhanced editor system is backward compatible and won't break existing functionality! 🎉
