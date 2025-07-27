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
        EnableFiltering: new MockTwoOptionsProperty(),
        FilterConfiguration: new MockStringProperty(),
        AppliedFilters: new MockStringProperty(),
        // Legacy properties that need to be included for compatibility
        CommitTrigger: new MockStringProperty(),
        CancelChangesTrigger: new MockStringProperty(),
        PerformanceMode: new MockEnumProperty("1"),
        EnableVirtualization: new MockTwoOptionsProperty(true),
        VirtualizationThreshold: new MockWholeNumberProperty(),
        records: new MockDataSet([]),
        columns: new MockDataSet([]),
    };
}
