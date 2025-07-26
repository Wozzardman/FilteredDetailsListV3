import { MockEntityRecord, MockColumn } from './mock-datasets';

// Mock data that mimics your PowerApps TestData collection
export function createTestData() {
    // Create mock records similar to your TestData collection
    const mockRecords: MockEntityRecord[] = [];
    
    for (let i = 1; i <= 10; i++) {
        const record = new MockEntityRecord(`record_${i}`, {
            // PCF required fields
            RecordKey: `${i}`,
            RecordCanSelect: true,
            RecordSelected: false,
            // Your actual data fields (matching TestData collection)
            TestID: i,
            Name: `Test Item ${i}`,
            Category: i % 3 === 0 ? "Alpha" : i % 3 === 1 ? "Beta" : "Gamma",
            CreatedDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // i days ago
            Status: i % 4 === 0 ? "Pending" : i % 4 === 1 ? "Completed" : i % 4 === 2 ? "In Progress" : "Cancelled"
        });
        mockRecords.push(record);
    }
    
    return mockRecords;
}

// Mock columns that match your TestDataColumns
export function createTestColumns() {
    return [
        new MockColumn('TestID', 'ID'),
        new MockColumn('Name', 'Name'),
        new MockColumn('Category', 'Category'),
        new MockColumn('CreatedDate', 'Created'),
        new MockColumn('Status', 'Status')
    ];
}

// Mock column records (for the columns dataset)
export function createTestColumnRecords() {
    const columnConfigs = [
        { ColName: 'TestID', ColDisplayName: 'ID', ColWidth: 50, ColHorizontalAlign: 'Center' },
        { ColName: 'Name', ColDisplayName: 'Name', ColWidth: 150, ColHorizontalAlign: 'Left' },
        { ColName: 'Category', ColDisplayName: 'Category', ColWidth: 100, ColHorizontalAlign: 'Center' },
        { ColName: 'CreatedDate', ColDisplayName: 'Created', ColWidth: 100, ColHorizontalAlign: 'Center' },
        { ColName: 'Status', ColDisplayName: 'Status', ColWidth: 100, ColHorizontalAlign: 'Center' }
    ];
    
    return columnConfigs.map((config, index) => 
        new MockEntityRecord(`col_${index}`, {
            RecordKey: `col_${index}`,
            RecordCanSelect: true,
            RecordSelected: false,
            ...config,
            ColMultiLine: false,
            ColResizable: true,
            ColSortable: true,
            ColVerticalAlign: 'Top'
        })
    );
}
