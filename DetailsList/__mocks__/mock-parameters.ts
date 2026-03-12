/* istanbul ignore file */

import { IInputs } from '../generated/ManifestTypes';
import { MockEnumProperty, MockStringProperty, MockTwoOptionsProperty, MockWholeNumberProperty } from './mock-context';
import { MockDataSet } from './mock-datasets';

export function getMockParameters(): IInputs {
    return {
        Theme: new MockStringProperty(),
        PageSize: new MockWholeNumberProperty(),
        SelectionType: new MockEnumProperty('0'),
        InputEvent: new MockStringProperty(),
        DataSourceName: new MockStringProperty(),
        CommitTrigger: new MockStringProperty(),
        CancelChangesTrigger: new MockStringProperty(),
        SaveTriggerReset: new MockStringProperty(),
        DefaultColumnWidth: new MockWholeNumberProperty(),
        EnableColumnResizing: new MockTwoOptionsProperty(true),
        HeaderTextSize: new MockWholeNumberProperty(14),
        ColumnTextSize: new MockWholeNumberProperty(13),
        EnableHeaderTextWrapping: new MockTwoOptionsProperty(false),
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
        
        // Jump To Properties
        EnableJumpTo: new MockTwoOptionsProperty(false),
        JumpToValue: new MockStringProperty(),
        
        // Width Configuration Properties
        FilterRecordsWidth: new MockWholeNumberProperty(200),
        JumpToWidth: new MockWholeNumberProperty(200),
        
        // Control Bar Visibility
        ShowControlBar: new MockTwoOptionsProperty(true),
        
        // Control Bar Text Customization
        AddNewRowText: new MockStringProperty('Add New Row'),
        TotalItemsText: new MockStringProperty('Total Items:'),
        FilterRecordsText: new MockStringProperty('Search records'),
        
        // Custom Formula Field Configuration
        ShowFormulaField: new MockTwoOptionsProperty(false),
        FormulaFieldText: new MockStringProperty('Formula Result:'),
        FormulaFieldExpression: new MockStringProperty(''),
        
        records: new MockDataSet([]),
        columns: new MockDataSet([]),
    };
}
