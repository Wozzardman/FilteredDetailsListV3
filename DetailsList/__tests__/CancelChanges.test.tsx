import { FilteredDetailsListV2 } from '../index';
import { IInputs } from '../generated/ManifestTypes';

describe('Cancel Changes Functionality', () => {
    let component: FilteredDetailsListV2;
    let mockContext: any;
    let mockNotifyOutputChanged: jest.Mock;

    beforeEach(() => {
        component = new FilteredDetailsListV2();
        mockNotifyOutputChanged = jest.fn();

        mockContext = {
            parameters: {
                records: {
                    loading: false,
                    sortedRecordIds: ['1', '2'],
                    records: {
                        '1': {
                            getNamedReference: () => ({ id: '1' }),
                            getValue: (column: string) => 'original value'
                        }
                    },
                    paging: { totalResultCount: 2 }
                },
                columns: {
                    sortedRecordIds: ['col1'],
                    records: {},
                    paging: { pageSize: 150, setPageSize: jest.fn(), totalResultCount: 1 }
                },
                CancelChangesTrigger: { raw: '' },
                CommitTrigger: { raw: '' }
            },
            mode: { allocatedWidth: 800, allocatedHeight: 600 }
        };

        component.init(mockContext, mockNotifyOutputChanged);
    });

    test('should clear pending changes when CancelChangesTrigger is fired', () => {
        // Simulate a cell edit to create pending changes
        (component as any).handleCellEdit('1', 'col1', 'new value');
        
        // Verify changes are pending
        const outputsBeforeCancel = component.getOutputs();
        expect(outputsBeforeCancel.HasPendingChanges).toBe(true);
        expect(outputsBeforeCancel.ChangeCount).toBe(1);

        // Trigger cancel changes
        mockContext.parameters.CancelChangesTrigger.raw = 'cancel-' + Date.now();
        (component as any).handleCommitTrigger(mockContext);

        // Verify changes are cleared
        const outputsAfterCancel = component.getOutputs();
        expect(outputsAfterCancel.HasPendingChanges).toBe(false);
        expect(outputsAfterCancel.ChangeCount).toBe(0);
        expect(outputsAfterCancel.ChangedRecordKey).toBe('');
        expect(outputsAfterCancel.ChangedColumn).toBe('');
        expect(mockNotifyOutputChanged).toHaveBeenCalled();
    });

    test('should handle both commit and cancel triggers differently', () => {
        // Add pending changes
        (component as any).handleCellEdit('1', 'col1', 'new value');
        
        // Test commit trigger
        mockContext.parameters.CommitTrigger.raw = 'commit-' + Date.now();
        (component as any).handleCommitTrigger(mockContext);
        
        const outputsAfterCommit = component.getOutputs();
        expect(outputsAfterCommit.HasPendingChanges).toBe(false);
        
        // Add new pending changes
        (component as any).handleCellEdit('1', 'col1', 'newer value');
        
        // Test cancel trigger  
        mockContext.parameters.CancelChangesTrigger.raw = 'cancel-' + Date.now();
        (component as any).handleCommitTrigger(mockContext);
        
        const outputsAfterCancel = component.getOutputs();
        expect(outputsAfterCancel.HasPendingChanges).toBe(false);
        expect(outputsAfterCancel.ChangedRecordKey).toBe('');
    });
});
