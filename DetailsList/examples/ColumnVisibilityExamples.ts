/**
 * 🧪 Column Visibility Test Example
 * Demonstrates lightning-fast column show/hide functionality
 */

// Example Power Apps collection for testing column visibility
const TestColumnConfig = `
ClearCollect(TestColumns,
    {ColName: "id", ColDisplayName: "Employee ID", ColWidth: 80, ColVisible: true},
    {ColName: "firstName", ColDisplayName: "First Name", ColWidth: 150, ColVisible: true},
    {ColName: "lastName", ColDisplayName: "Last Name", ColWidth: 150, ColVisible: true},
    {ColName: "email", ColDisplayName: "Email", ColWidth: 200, ColVisible: false}, // Hidden by default
    {ColName: "phone", ColDisplayName: "Phone", ColWidth: 120, ColVisible: false}, // Hidden by default
    {ColName: "department", ColDisplayName: "Department", ColWidth: 120, ColVisible: true},
    {ColName: "salary", ColDisplayName: "Salary", ColWidth: 100, ColVisible: false}, // Sensitive data hidden
    {ColName: "startDate", ColDisplayName: "Start Date", ColWidth: 110, ColVisible: true},
    {ColName: "manager", ColDisplayName: "Manager", ColWidth: 130, ColVisible: true}
);
`;

// Example test data
const TestData = `
ClearCollect(TestEmployees,
    {id: 1, firstName: "John", lastName: "Smith", email: "john@company.com", phone: "555-0001", department: "Engineering", salary: 85000, startDate: Date(2020,1,15), manager: "Sarah Johnson"},
    {id: 2, firstName: "Jane", lastName: "Doe", email: "jane@company.com", phone: "555-0002", department: "Marketing", salary: 72000, startDate: Date(2019,8,22), manager: "Mike Wilson"},
    {id: 3, firstName: "Bob", lastName: "Johnson", email: "bob@company.com", phone: "555-0003", department: "Sales", salary: 78000, startDate: Date(2021,3,10), manager: "Lisa Chen"},
    {id: 4, firstName: "Alice", lastName: "Brown", email: "alice@company.com", phone: "555-0004", department: "HR", salary: 68000, startDate: Date(2018,11,5), manager: "Tom Davis"},
    {id: 5, firstName: "Charlie", lastName: "Wilson", email: "charlie@company.com", phone: "555-0005", department: "Finance", salary: 82000, startDate: Date(2020,7,1), manager: "Sarah Johnson"}
);
`;

// Toggle controls for dynamic visibility
const ToggleControls = `
// Add toggle controls to your screen
Toggle_ShowContact.Text = "Show Contact Info"
Toggle_ShowSalary.Text = "Show Salary" 
Toggle_ShowPersonal.Text = "Show Personal Info"

// Bind toggle events to column visibility updates
Toggle_ShowContact.OnChange = 
    UpdateIf(TestColumns, ColName in ["email", "phone"], {ColVisible: Toggle_ShowContact.Value})

Toggle_ShowSalary.OnChange = 
    UpdateIf(TestColumns, ColName = "salary", {ColVisible: Toggle_ShowSalary.Value})

Toggle_ShowPersonal.OnChange = 
    UpdateIf(TestColumns, ColName in ["firstName", "lastName"], {ColVisible: Toggle_ShowPersonal.Value})
`;

// Role-based visibility example
const RoleBasedVisibility = `
// Show different columns based on user role
Switch(User().Role,
    "HR Manager", 
        UpdateIf(TestColumns, ColName in ["salary", "phone", "email"], {ColVisible: true}),
    "Department Manager",
        UpdateIf(TestColumns, ColName in ["email", "phone"], {ColVisible: true});
        UpdateIf(TestColumns, ColName = "salary", {ColVisible: false}),
    "Employee",
        UpdateIf(TestColumns, ColName in ["salary", "phone"], {ColVisible: false});
        UpdateIf(TestColumns, ColName = "email", {ColVisible: true})
);
`;

// Performance test with many columns
const PerformanceTest = `
// Generate 100 test columns for performance testing
ClearCollect(ManyColumns,
    ForAll(Sequence(100), 
        {
            ColName: "col" & Value,
            ColDisplayName: "Column " & Value,
            ColWidth: 100,
            ColVisible: If(Mod(Value, 3) = 0, false, true) // Hide every 3rd column
        }
    )
);

// Performance should remain < 1ms for filtering 100 columns
`;

// Conditional visibility based on data
const ConditionalVisibility = `
// Show/hide columns based on current data state
If(CountRows(Filter(TestEmployees, department = "Engineering")) > 0,
    UpdateIf(TestColumns, ColName = "manager", {ColVisible: true}),
    UpdateIf(TestColumns, ColName = "manager", {ColVisible: false})
);

// Show salary column only if user has permission
If(User().Email in ["hr@company.com", "ceo@company.com"],
    UpdateIf(TestColumns, ColName = "salary", {ColVisible: true}),
    UpdateIf(TestColumns, ColName = "salary", {ColVisible: false})
);
`;

// Bulk operations example
const BulkOperations = `
// Hide all personal information columns
UpdateIf(TestColumns, 
    ColName in ["firstName", "lastName", "email", "phone", "salary"], 
    {ColVisible: false}
);

// Show only essential columns
UpdateIf(TestColumns, 
    ColName in ["id", "department", "startDate"], 
    {ColVisible: true}
);

// Toggle visibility of all optional columns
UpdateIf(TestColumns, 
    ColName in ["email", "phone", "manager"], 
    {ColVisible: Not(LookUp(TestColumns, ColName = "email").ColVisible)}
);
`;

// Grid component configuration
const GridConfiguration = `
// Configure the FilteredDetailsList with test data
FilteredDetailsList.Records = TestEmployees
FilteredDetailsList.Columns = TestColumns

// Enable other features as needed
FilteredDetailsList.EnableInlineEditing = true
FilteredDetailsList.EnableColumnFiltering = true
FilteredDetailsList.EnableSelectionMode = true
FilteredDetailsList.Height = 600
FilteredDetailsList.Width = 1200
`;

export {
    TestColumnConfig,
    TestData,
    ToggleControls,
    RoleBasedVisibility,
    PerformanceTest,
    ConditionalVisibility,
    BulkOperations,
    GridConfiguration
};
