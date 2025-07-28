/**
 * Enhanced Column Editor Usage Example
 * Demonstrates how to configure different editor types for specific columns
 */

import * as React from 'react';
import { VirtualizedEditableGrid } from '../components/VirtualizedEditableGrid';
import { ColumnEditorConfigHelper, CommonEditorConfigs } from '../services/ColumnEditorConfigHelper';
import { ColumnEditorMapping } from '../types/ColumnEditor.types';
import { IColumn } from '@fluentui/react/lib/DetailsList';

// Sample data interface
interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    department: string;
    salary: number;
    startDate: Date;
    rating: number;
    isActive: boolean;
    website: string;
    notes: string;
    priority: number;
    status: string;
    completionPercentage: number;
    favoriteColor: string;
}

// Sample data
const sampleEmployees: Employee[] = [
    {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        phone: '+1-555-0101',
        department: 'Technology',
        salary: 85000,
        startDate: new Date('2022-01-15'),
        rating: 4,
        isActive: true,
        website: 'https://johndoe.dev',
        notes: 'Excellent developer with strong React skills',
        priority: 8,
        status: 'Active',
        completionPercentage: 85,
        favoriteColor: '#3366cc'
    },
    {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.com',
        phone: '+1-555-0102',
        department: 'Finance',
        salary: 92000,
        startDate: new Date('2021-06-20'),
        rating: 5,
        isActive: true,
        website: 'https://janesmith.biz',
        notes: 'Senior financial analyst with excellent analytical skills',
        priority: 9,
        status: 'Active',
        completionPercentage: 95,
        favoriteColor: '#cc3366'
    }
];

// Column definitions
const columns: IColumn[] = [
    { key: 'firstName', name: 'First Name', fieldName: 'firstName', minWidth: 120, isResizable: true },
    { key: 'lastName', name: 'Last Name', fieldName: 'lastName', minWidth: 120, isResizable: true },
    { key: 'email', name: 'Email', fieldName: 'email', minWidth: 200, isResizable: true },
    { key: 'phone', name: 'Phone', fieldName: 'phone', minWidth: 140, isResizable: true },
    { key: 'department', name: 'Department', fieldName: 'department', minWidth: 120, isResizable: true },
    { key: 'salary', name: 'Salary', fieldName: 'salary', minWidth: 100, isResizable: true },
    { key: 'startDate', name: 'Start Date', fieldName: 'startDate', minWidth: 120, isResizable: true },
    { key: 'rating', name: 'Rating', fieldName: 'rating', minWidth: 100, isResizable: true },
    { key: 'isActive', name: 'Active', fieldName: 'isActive', minWidth: 80, isResizable: true },
    { key: 'website', name: 'Website', fieldName: 'website', minWidth: 150, isResizable: true },
    { key: 'notes', name: 'Notes', fieldName: 'notes', minWidth: 200, isResizable: true },
    { key: 'priority', name: 'Priority', fieldName: 'priority', minWidth: 100, isResizable: true },
    { key: 'status', name: 'Status', fieldName: 'status', minWidth: 100, isResizable: true },
    { key: 'completionPercentage', name: 'Completion %', fieldName: 'completionPercentage', minWidth: 120, isResizable: true },
    { key: 'favoriteColor', name: 'Color', fieldName: 'favoriteColor', minWidth: 100, isResizable: true }
];

// Enhanced column editor configuration
const columnEditorMapping: ColumnEditorMapping = {
    // Text fields with validation
    firstName: ColumnEditorConfigHelper.text({
        placeholder: 'Enter first name...',
        isRequired: true,
        maxLength: 50
    }),
    
    lastName: ColumnEditorConfigHelper.text({
        placeholder: 'Enter last name...',
        isRequired: true,
        maxLength: 50
    }),
    
    // Email with validation
    email: ColumnEditorConfigHelper.email({
        isRequired: true,
        placeholder: 'Enter email address...'
    }),
    
    // Phone number
    phone: ColumnEditorConfigHelper.phone({
        placeholder: 'Enter phone number...'
    }),
    
    // Dropdown for departments
    department: ColumnEditorConfigHelper.dropdown({
        options: ColumnEditorConfigHelper.createDropdownOptions([
            'Technology',
            'Finance', 
            'Human Resources',
            'Marketing',
            'Sales',
            'Operations'
        ]),
        isRequired: true,
        placeholder: 'Select department...'
    }),
    
    // Currency for salary
    salary: ColumnEditorConfigHelper.currency({
        currencySymbol: '$',
        min: 30000,
        max: 200000,
        isRequired: true
    }),
    
    // Date picker
    startDate: ColumnEditorConfigHelper.date({
        maxDate: new Date(), // Can't start in the future
        isRequired: true
    }),
    
    // Rating stars
    rating: ColumnEditorConfigHelper.rating({
        max: 5,
        allowZero: false
    }),
    
    // Boolean toggle
    isActive: ColumnEditorConfigHelper.boolean(),
    
    // URL field
    website: ColumnEditorConfigHelper.url({
        placeholder: 'https://example.com'
    }),
    
    // Multiline text for notes
    notes: ColumnEditorConfigHelper.text({
        multiline: true,
        maxLength: 500,
        placeholder: 'Enter notes...'
    }),
    
    // Slider for priority
    priority: ColumnEditorConfigHelper.slider({
        min: 1,
        max: 10,
        step: 1,
        showValue: true,
        valueFormat: (value) => `Priority ${value}`
    }),
    
    // Dynamic dropdown for status with conditional options
    status: ColumnEditorConfigHelper.dropdown({
        getDynamicOptions: (item: Employee) => {
            // Different status options based on whether employee is active
            const baseOptions = ['Active', 'Inactive', 'Pending'];
            if (item.isActive) {
                return ColumnEditorConfigHelper.createDropdownOptions([
                    ...baseOptions,
                    'On Leave',
                    'Remote'
                ]);
            }
            return ColumnEditorConfigHelper.createDropdownOptions(baseOptions);
        },
        placeholder: 'Select status...'
    }),
    
    // Percentage field
    completionPercentage: ColumnEditorConfigHelper.percentage({
        min: 0,
        max: 100,
        decimalPlaces: 0
    }),
    
    // Color picker
    favoriteColor: ColumnEditorConfigHelper.color()
};

// Usage example component
export const EnhancedGridExample: React.FC = () => {
    const [items, setItems] = React.useState<Employee[]>(sampleEmployees);

    const handleCellEdit = React.useCallback((itemId: string, columnKey: string, newValue: any) => {
        setItems(currentItems => 
            currentItems.map(item => 
                item.id === itemId 
                    ? { ...item, [columnKey]: newValue }
                    : item
            )
        );
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Enhanced Column Editor Example</h2>
            <p>This grid demonstrates different editor types for each column:</p>
            <ul>
                <li><strong>Names:</strong> Required text fields with length limits</li>
                <li><strong>Email:</strong> Email validation</li>
                <li><strong>Phone:</strong> Phone number formatting</li>
                <li><strong>Department:</strong> Dropdown with predefined options</li>
                <li><strong>Salary:</strong> Currency editor with min/max validation</li>
                <li><strong>Start Date:</strong> Date picker with max date validation</li>
                <li><strong>Rating:</strong> Star rating (1-5 stars)</li>
                <li><strong>Active:</strong> Boolean toggle</li>
                <li><strong>Website:</strong> URL validation</li>
                <li><strong>Notes:</strong> Multiline text area</li>
                <li><strong>Priority:</strong> Slider (1-10)</li>
                <li><strong>Status:</strong> Dynamic dropdown (options change based on active status)</li>
                <li><strong>Completion %:</strong> Percentage field (0-100%)</li>
                <li><strong>Color:</strong> Color picker</li>
            </ul>
            
            <VirtualizedEditableGrid
                items={items}
                columns={columns}
                height={600}
                enableInlineEditing={true}
                enableDragFill={true}
                useEnhancedEditors={true}
                columnEditorMapping={columnEditorMapping}
                onCellEdit={handleCellEdit}
                rowHeight={50}
            />
        </div>
    );
};

// Advanced example with custom editor
export const AdvancedEditorExample: React.FC = () => {
    // Custom editor component
    const SkillLevelEditor: React.FC<any> = ({ value, onChange, onCommit, onCancel }) => {
        const [localValue, setLocalValue] = React.useState(value || 'Beginner');
        
        const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
        
        return (
            <select
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
                style={{ width: '100%', border: 'none', background: 'transparent' }}
                autoFocus
            >
                {skillLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                ))}
            </select>
        );
    };

    const advancedMapping: ColumnEditorMapping = {
        // Using common configurations
        ...CommonEditorConfigs,
        
        // Custom editor example
        skillLevel: {
            type: 'custom',
            customConfig: {
                component: SkillLevelEditor,
                props: {
                    allowedLevels: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
                }
            }
        },
        
        // Complex validation example
        projectCode: ColumnEditorConfigHelper.text({
            placeholder: 'PROJ-XXXX',
            isRequired: true,
            pattern: '^PROJ-[0-9]{4}$',
            patternErrorMessage: 'Project code must be in format PROJ-XXXX (e.g., PROJ-1234)'
        })
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Advanced Editor Configuration</h2>
            <p>This example shows:</p>
            <ul>
                <li>Using common editor configurations</li>
                <li>Custom editor components</li>
                <li>Advanced validation with regex patterns</li>
            </ul>
        </div>
    );
};

export default EnhancedGridExample;
