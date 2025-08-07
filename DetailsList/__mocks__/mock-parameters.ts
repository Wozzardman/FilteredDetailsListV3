/* istanbul ignore file */

import { IInputs } from '../generated/ManifestTypes';
import { MockEnumProperty, MockStringProperty, MockTwoOptionsProperty, MockWholeNumberProperty } from './mock-context';
import { MockDataSet } from './mock-datasets';

export function getMockParameters(): IInputs {
    return {
        AccessibilityLabel: new MockStringProperty(),
        Theme: new MockStringProperty(),
        Compact: new MockTwoOptionsProperty(),
        CurrentSortColumn: new MockStringProperty(),
        CurrentSortDirection: new MockEnumProperty('0'),
        PageSize: new MockWholeNumberProperty(),
        SelectRowsOnFocus: new MockTwoOptionsProperty(),
        SelectionType: new MockEnumProperty('0'),
        HeaderVisible: new MockTwoOptionsProperty(false),
        LargeDatasetPaging: new MockTwoOptionsProperty(false),
        RaiseOnRowSelectionChangeEvent: new MockTwoOptionsProperty(false),
        InputEvent: new MockStringProperty(),
        DataSourceName: new MockStringProperty(),
        // Legacy properties that need to be included for compatibility
        CommitTrigger: new MockStringProperty(),
        CancelChangesTrigger: new MockStringProperty(),
        SaveTriggerReset: new MockStringProperty(),
        PerformanceMode: new MockEnumProperty("1"),
        EnableVirtualization: new MockTwoOptionsProperty(true),
        VirtualizationThreshold: new MockWholeNumberProperty(),
        DefaultColumnWidth: new MockWholeNumberProperty(),
        EnableColumnResizing: new MockTwoOptionsProperty(true),
        HeaderTextSize: new MockWholeNumberProperty(14),
        ColumnTextSize: new MockWholeNumberProperty(13),
        EnableFiltering: new MockTwoOptionsProperty(),
        FilterConfiguration: new MockStringProperty(),
        AppliedFilters: new MockStringProperty(),
        
        // Row styling properties
        AlternateRowColor: new MockStringProperty(),
        
        // Enhanced Editor Properties
        UseEnhancedEditors: new MockTwoOptionsProperty(false),
        ColumnEditorFormulas: new MockStringProperty(),
        editorConfig: new MockDataSet([]),
        
        // New Row Template Configuration
        newRowTemplateConfig: new MockDataSet([]),
        
        // Selection Mode Properties
        EnableSelectionMode: new MockTwoOptionsProperty(false),
        
        // Add New Row Properties
        EnableAddNewRow: new MockTwoOptionsProperty(false),
        AddNewRowTrigger: new MockStringProperty(),
        NewRowTemplate: new MockStringProperty(),
        
        // Jump To Properties
        EnableJumpTo: new MockTwoOptionsProperty(false),
        // JumpToColumn: new MockStringProperty(), // Removed - now using JumptoColumn in columns dataset
        JumpToValue: new MockStringProperty(),
        
        records: new MockDataSet([]),
        columns: new MockDataSet([]),
    };
}
