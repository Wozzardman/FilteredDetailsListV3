/** @jest-environment node */
jest.mock('../relational/RelationalGrid', () => ({ RelationalGrid: () => null }));
import { DatasetAccumulator, RelationalController } from '../relational/RelationalController';
import { getMockParameters } from '../__mocks__/mock-parameters';

function dataset(values: Record<string, any>[], fields = ['OrderID', 'Name']) {
    const data: any = {
        columns: fields.map(name => ({ name, dataType: name === 'OrderID' ? 'Whole.None' : 'SingleLine.Text' })),
        sortedRecordIds: values.map(v => String(v.id)), records: Object.fromEntries(values.map(v => [String(v.id), { getValue: (field: string) => v[field] }])),
        loading: false, error: false, refresh: jest.fn(), setSelectedRecordIds: jest.fn(),
        paging: { pageSize: 150, lastPageNumber: 1, hasNextPage: false, setPageSize: jest.fn(), loadNextPage: jest.fn() }
    };
    return data;
}

describe('Independent dataset paging', () => {
    it('accumulates non-cumulative pages, deduplicates cumulative pages, and does not request twice', () => {
        const page = new DatasetAccumulator();
        const data = dataset([{ id: 1, OrderID: 1 }]);
        data.paging.hasNextPage = true;
        page.update(data, 'parent', 150);
        page.update(data, 'parent', 150);
        expect(data.paging.loadNextPage).toHaveBeenCalledTimes(1);
        expect(page.complete).toBe(false);
        data.records = dataset([{ id: 2, OrderID: 2 }]).records; data.sortedRecordIds = ['2']; data.paging.lastPageNumber = 2;
        page.update(data, 'parent', 150);
        expect(data.paging.loadNextPage).toHaveBeenCalledTimes(2);
        data.records = dataset([{ id: 1 }, { id: 2 }, { id: 3 }]).records; data.sortedRecordIds = ['1', '2', '3'];
        data.paging.lastPageNumber = 3; data.paging.hasNextPage = false;
        page.update(data, 'parent', 150);
        expect(page.complete).toBe(true);
        expect(page.rows.map(r => r.recordId)).toEqual(['1', '2', '3']);
    });
    it('drops old records when a fresh result starts at page one', () => {
        const page = new DatasetAccumulator();
        const data = dataset([{ id: 1 }, { id: 2 }]);
        page.update(data, 'parent', 150);
        data.loading = true; page.update(data, 'parent', 150);
        data.loading = false; data.records = dataset([{ id: 3 }]).records; data.sortedRecordIds = ['3'];
        page.update(data, 'parent', 150);
        expect(page.rows.map(r => r.recordId)).toEqual(['3']);
    });
    it('applies a page size once and waits for the resulting dataset response', () => {
        const page = new DatasetAccumulator();
        const data = dataset([{ id: 1 }]);
        page.update(data, 'child', 2500);
        expect(data.paging.setPageSize).toHaveBeenCalledWith(2500);
        expect(data.refresh).toHaveBeenCalledTimes(1);
        expect(page.complete).toBe(false);
        page.update(data, 'child', 2500);
        expect(page.complete).toBe(false);
        expect(data.refresh).toHaveBeenCalledTimes(1);
        data.records = dataset([{ id: 1 }, { id: 2 }]).records;
        data.sortedRecordIds = ['1', '2'];
        page.update(data, 'child', 2500);
        expect(page.complete).toBe(true);
        expect(page.rows).toHaveLength(2);
    });
    it('waits for refreshed data after acknowledgement instead of restoring old placeholders', () => {
        const page = new DatasetAccumulator();
        const data = dataset([{ id: 1 }]);
        page.update(data, 'parent', 150);
        page.refresh(data);
        page.update(data, 'parent', 150);
        expect(page.complete).toBe(false);
        expect(page.rows).toHaveLength(0);
        data.loading = true; page.update(data, 'parent', 150);
        data.loading = false; page.update(data, 'parent', 150);
        expect(page.complete).toBe(true);
    });
});

describe('Relational PCF integration', () => {
    let c: RelationalController;
    let context: any;
    let notify: jest.Mock;
    beforeEach(() => {
        c = new RelationalController(); notify = jest.fn();
        context = { parameters: getMockParameters(), mode: { allocatedWidth: 1000, allocatedHeight: 600 } };
        const p = context.parameters;
        p.EnableParentChild.raw = true; p.EnableAddNewRow.raw = true; p.EnableAddChildRow.raw = true;
        p.RelationshipConfig.raw = JSON.stringify({ keys: [{ parentField: 'OrderID', childField: 'OrderID' }] });
        p.records = dataset([{ id: 1, OrderID: 101, Name: 'Parent' }]);
        p.childRecords = dataset([{ id: 1, OrderID: 101, Name: 'Child' }]);
        c.update(context, notify);
    });
    it('routes colliding record IDs into separate payloads in one save event', () => {
        c.edit('parent', '1', 'Name', 'Changed parent');
        c.edit('child', '1', 'Name', 'Changed child');
        c.save();
        const output = c.outputs();
        expect(output.EventDataset).toBe('both');
        expect(output.EventName).toBe('ButtonEvent');
        expect(output.ButtonEventName).toBe('Save Changes');
        expect(JSON.parse(output.PendingChanges!)).toEqual([{ recordId: '1', changes: { Name: 'Changed parent' } }]);
        expect(JSON.parse(output.ChildPendingChanges!)).toEqual([{ recordId: '1', changes: { Name: 'Changed child' } }]);
        expect(c.busy).toBe(true);
    });
    it('auto-populates the child foreign key, blocks unsaved parents, and leaves save hidden with false', () => {
        const draft = c.add('parent', 1)[0];
        expect(c.add('child', 1, draft)).toEqual([]);
        const childId = c.add('child', 1, '1')[0];
        expect(c.rows().child.find(r => r.recordId === childId)?.getValue('OrderID')).toBe(101);
        expect(c.pendingCount).toBe(0);
        c.edit('child', childId, 'Name', 'Added');
        expect(c.pendingCount).toBe(1);
        expect(c.outputs().ChildPendingChanges).toContain('Added');
    });
    it('removes saved placeholders while retaining failed child drafts', () => {
        context.parameters.AddNewRowsSave.raw = true; context.parameters.ChildAddNewRowsSave.raw = true;
        const parent = c.add('parent', 1)[0], child = c.add('child', 1, '1')[0];
        c.save();
        context.parameters.SaveResult.raw = JSON.stringify({ requestId: c.saveRequestId, parent: { status: 'succeeded' }, child: { status: 'failed', message: 'Try again' } });
        c.update(context, notify);
        expect(c.changes.drafts.parent.has(parent)).toBe(false);
        expect(c.changes.drafts.child.has(child)).toBe(true);
        expect(context.parameters.records.refresh).toHaveBeenCalled();
    });
    it('preserves pending changes across ordinary refreshes and isolates them by app context', () => {
        c.edit('child', '1', 'Name', 'Pending');
        c.update(context, notify);
        expect(c.rows().child[0].getValue('Name')).toBe('Pending');
        context.parameters.RelationalContextKey.raw = 'other-project'; c.update(context, notify);
        expect(c.changes.payload('child')).toEqual([]);
        context.parameters.RelationalContextKey.raw = ''; c.update(context, notify);
        expect(c.rows().child[0].getValue('Name')).toBe('Pending');
    });
    it('keeps native parent and child selections separate', () => {
        c.select('child', ['1']);
        expect(context.parameters.childRecords.setSelectedRecordIds).toHaveBeenCalledWith(['1']);
        expect(context.parameters.records.setSelectedRecordIds).not.toHaveBeenCalled();
        expect(c.outputs().ChildSelectedCount).toBe(1);
    });
    it('applies the child column config and reports unavailable child fields', () => {
        context.parameters.childColumns = dataset([{ id: 1, ColName: 'Name', ColDisplayName: 'Test name', ColWidth: 220 }]);
        c.update(context, notify);
        expect(c.scopes.child.columns.find(col => col.key === 'Name')?.name).toBe('Test name');
        expect(c.scopes.parent.columns.find(col => col.key === 'Name')?.name).toBe('Name');
        context.parameters.childColumns = dataset([{ id: 1, ColName: 'Missing' }]);
        c.update(context, notify);
        expect(c.ready).toBe(false);
        expect(c.errors[0]).toContain('Missing');
    });
    it.each([false, true])('cleans up successful child placeholders with ChildAddNewRowsSave=%s', flag => {
        context.parameters.ChildAddNewRowsSave.raw = flag;
        const id = c.add('child', 1, '1')[0];
        expect(c.pendingCount).toBe(flag ? 1 : 0);
        if (!flag) c.edit('child', id, 'Name', 'Ready');
        c.save();
        context.parameters.SaveResult.raw = JSON.stringify({ requestId: c.saveRequestId, child: { status: 'succeeded' } });
        c.update(context, notify);
        expect(c.changes.drafts.child.size).toBe(0);
        expect(c.changes.payload('child')).toEqual([]);
        expect(c.ready).toBe(false);
        c.update(context, notify);
        expect(c.ready).toBe(false);
        context.parameters.records.records = { ...context.parameters.records.records };
        context.parameters.childRecords = dataset([{ id: 1, OrderID: 101, Name: 'Child' }, { id: 2, OrderID: 101, Name: 'Saved' }]);
        c.update(context, notify);
        expect(c.ready).toBe(true);
        expect(c.rows().child.map(r => r.recordId)).toEqual(['1', '2']);
        expect(c.rows().child.every(r => !r.isNewRow)).toBe(true);
    });
    it('validates template defaults and drag-filled values before sending either payload', () => {
        context.parameters.UseEnhancedEditors.raw = true;
        context.parameters.childEditorConfig = dataset([{ id: 1, ColumnKey: 'Amount', EditorType: 'number', MinValue: 0 }]);
        c.update(context, notify);
        c.edit('child', '1', 'Amount', -5);
        c.save();
        expect(c.busy).toBe(false);
        expect(c.changes.errors[0]).toContain('must be at least 0');
        expect(c.changes.payload('child')).toHaveLength(1);
    });
    it('restores legacy parent filter operators and lets a column menu replace them', () => {
        context.parameters.AppliedFilters.raw = JSON.stringify([{ columnName: 'Name', filterType: 'text', isActive: true,
            conditions: [{ field: 'Name', operator: 'contains', value: 'missing' }] }]);
        c.update(context, notify);
        expect([...c.matchingParentIds()!]).toEqual([]);
        expect(c.matchingParentIds('Name')).toBeUndefined();
        c.filter('parent', 'Name', ['Parent']);
        expect(c.matchingParentIds()).toBeUndefined();
        expect(JSON.parse(c.outputs().AllFilters!)[0].conditions[0]).toEqual({ field: 'Name', operator: 'in', value: ['Parent'] });
    });
    it('handles selection input events without mixing the two tables', () => {
        context.parameters.InputEvent.raw = 'SelectRows:1'; c.update(context, notify);
        expect(c.outputs().SelectedCount).toBe(1);
        expect(c.outputs().ChildSelectedCount).toBe(0);
        c.select('child', ['1']);
        context.parameters.InputEvent.raw = 'ClearSelection'; c.update(context, notify);
        expect(c.outputs().SelectedCount).toBe(0);
        expect(c.outputs().ChildSelectedCount).toBe(0);
    });
    it('routes a late save acknowledgement to the original project after switching contexts', () => {
        c.edit('child', '1', 'Name', 'Submitted'); c.save();
        const requestId = c.saveRequestId;
        context.parameters.RelationalContextKey.raw = 'another-project'; c.update(context, notify);
        c.edit('child', '1', 'Name', 'Other project edit');
        context.parameters.SaveResult.raw = JSON.stringify({ requestId, child: { status: 'succeeded' } });
        c.update(context, notify);
        expect(c.changes.payload('child')[0].changes.Name).toBe('Other project edit');
        context.parameters.RelationalContextKey.raw = ''; c.update(context, notify);
        expect(c.busy).toBe(false);
        expect(c.changes.payload('child')).toEqual([]);
    });
});
