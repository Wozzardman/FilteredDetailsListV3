/** @jest-environment node */
import { row, resolveRelationship, indexRelationship, filterRelation, RelationalChanges, RecordScope, relationshipKey } from '../relational/RelationalModel';
import { buildColumns, buildTemplate, buildEditors } from '../relational/RelationalConfig';

const relation = { keys: [{ parentField: 'OrderID', childField: 'OrderID' }] };
const metadata = [{ name: 'OrderID', dataType: 'Whole.None' }];
const parents = [row('parent', '1', { OrderID: 1, Region: 'West' }), row('parent', '2', { OrderID: 2, Region: 'East' }), row('parent', '3', { OrderID: 3, Region: 'West' })];
const children = [row('child', '1', { OrderID: 1, Status: 'Pending', Type: 'A' }), row('child', '2', { OrderID: 1, Status: 'Complete', Type: 'B' }), row('child', '3', { OrderID: 2, Status: 'Pending', Type: 'B' })];
const dataset = (records: any[]) => ({ sortedRecordIds: records.map((_, i) => String(i)), records: Object.fromEntries(records.map((r, i) => [String(i), { getValue: (key: string) => r[key] }])) } as any);

describe('Generic relationship resolution', () => {
    it('detects a unique typed relationship without relying on dataset record IDs', () => {
        expect(resolveRelationship('', parents, children, metadata, metadata).status).toBe('automatic');
        expect(indexRelationship(parents, children, relation).childrenByParent.get('1')?.map(child => child.recordId)).toEqual(['1', '2']);
    });
    it('works for a different domain', () => {
        const p = [row('parent', 'asset-row', { AssetKey: 'A-1' })];
        const c = [row('child', 'inspection-row', { AssetKey: 'A-1' })];
        const m = [{ name: 'AssetKey', dataType: 'SingleLine.Text' }];
        expect(resolveRelationship('', p, c, m, m).status).toBe('automatic');
    });
    it('accepts compatible Canvas numeric type groups without coercing text keys', () => {
        expect(resolveRelationship('', parents, children, metadata, [{ name: 'OrderID', dataType: 'Decimal' }]).status).toBe('automatic');
        expect(resolveRelationship('', parents, children, metadata, [{ name: 'OrderID', dataType: 'SingleLine.Text' }]).status).toBe('unresolved');
    });
    it('does not guess a relationship from coincidentally equal generic IDs', () => {
        expect(resolveRelationship('', [row('parent', '1', { ID: 1 })], [row('child', '1', { ID: 1 })], [{ name: 'ID' }], [{ name: 'ID' }]).status).toBe('unresolved');
    });
    it('requires explicit configuration for competing keys', () => {
        const p = [row('parent', 'p', { OwnerID: 1, CustomerID: 1 })];
        const c = [row('child', 'c', { OwnerID: 1, CustomerID: 1 })];
        const m = [{ name: 'OwnerID' }, { name: 'CustomerID' }];
        expect(resolveRelationship('', p, c, m, m).status).toBe('unresolved');
    });
    it('supports an empty child dataset with explicit fields', () => {
        expect(resolveRelationship(JSON.stringify(relation), parents, [], metadata, metadata).status).toBe('manual');
        expect(resolveRelationship('', parents, [], metadata, metadata).status).toBe('unresolved');
    });
    it('rejects missing fields and duplicate parent keys', () => {
        expect(resolveRelationship(JSON.stringify(relation), parents, children, [], metadata).status).toBe('invalid');
        const duplicate = [...parents, row('parent', 'different', { OrderID: 1 })];
        expect(resolveRelationship(JSON.stringify(relation), duplicate, children, metadata, metadata).status).toBe('invalid');
        expect(indexRelationship(duplicate, children, relation).unmatched).toHaveLength(2);
    });
    it('links composite keys without crossing project boundaries', () => {
        const p = [row('parent', 'a', { Tenant: 'A', Key: 1 }), row('parent', 'b', { Tenant: 'B', Key: 1 })];
        const c = [row('child', 'c', { Tenant: 'B', ParentKey: 1 })];
        const mapping = { keys: [{ parentField: 'Tenant', childField: 'Tenant' }, { parentField: 'Key', childField: 'ParentKey' }] };
        expect(indexRelationship(p, c, mapping).childrenByParent.get('b')).toEqual(c);
    });
    it('does not lose precision or conflate string keys with numeric keys', () => {
        const p = row('parent', 'p', { ID: '9007199254740993' });
        expect(relationshipKey(p, ['ID'])).not.toBe(relationshipKey(row('parent', 'q', { ID: '9007199254740992' }), ['ID']));
        expect(relationshipKey(row('parent', 'p', { ID: 1 }), ['ID'])).not.toBe(relationshipKey(row('parent', 'q', { ID: '1' }), ['ID']));
    });
    it('reports orphaned children instead of guessing', () => {
        expect(indexRelationship(parents, [row('child', 'orphan', { OrderID: 999 })], relation).unmatched).toHaveLength(1);
    });
});

describe('Cross-table filtering', () => {
    const index = indexRelationship(parents, children, relation).childrenByParent;
    it('keeps childless parents until a child filter is applied', () => {
        expect(filterRelation(parents, index, {}, {}).parents).toHaveLength(3);
        expect(filterRelation(parents, index, {}, { Status: ['Pending'] }).parents).toHaveLength(2);
    });
    it('requires child conditions to match the same child', () => {
        const result = filterRelation(parents, index, {}, { Status: ['Pending'], Type: ['B'] });
        expect(result.parents.map(p => p.recordId)).toEqual(['2']);
        expect(result.children.map(p => p.recordId)).toEqual(['3']);
    });
    it('combines parent and child filters and searches both schemas', () => {
        expect(filterRelation(parents, index, { Region: ['West'] }, { Status: ['Pending'] }).children.map(r => r.recordId)).toEqual(['1']);
        expect(filterRelation(parents, index, {}, {}, 'Complete').parents.map(r => r.recordId)).toEqual(['1']);
        expect(filterRelation(parents, index, {}, {}, 'West').parents).toHaveLength(2);
    });
    it('retains pending children and their parent even when filters do not match', () => {
        const result = filterRelation(parents, index, { Region: ['Nowhere'] }, { Status: ['Other'] }, '', {}, {}, new Set(), new Set(['1']));
        expect(result.parents.map(r => r.recordId)).toEqual(['1']);
        expect(result.children.map(r => r.recordId)).toEqual(['1']);
    });
    it('normalizes dates only for date columns', () => {
        const r = row('parent', 'd', { Date: new Date(2026, 9, 12), Code: '10/12/2026', Empty: null, Flag: false, Count: 0 });
        const result = filterRelation([r], new Map(), { Date: ['10/12/2026'], Code: ['10/12/2026'], Empty: ['(Blanks)'], Flag: [false], Count: [0] }, {}, '', { Date: 'date' });
        expect(result.parents).toHaveLength(1);
    });
    it('handles 50,000 parents, 100,000 children and 200 drafts without truncation', () => {
        const p = Array.from({ length: 50000 }, (_, i) => row('parent', String(i), { OrderID: i }));
        const c = Array.from({ length: 100000 }, (_, i) => row('child', String(i), { OrderID: Math.floor(i / 2), Flag: i === 99999 }));
        const store = new RelationalChanges();
        for (let i = 0; i < 200; i++) store.add('parent', { OrderID: 50000 + i });
        const overlaid = store.overlay('parent', p);
        expect(overlaid).toHaveLength(50200);
        const result = filterRelation(overlaid, indexRelationship(overlaid, c, relation).childrenByParent, {}, { Flag: [true] });
        expect(result.parents[0].recordId).toBe('49999');
        expect(result.children).toHaveLength(1);
    });
});

describe('Scoped changes and acknowledgements', () => {
    it.each([[false, false, 0], [true, false, 1], [false, true, 1], [true, true, 2]])('honors independent placeholder flags %s / %s', (p, c, count) => {
        const store = new RelationalChanges();
        store.add('parent', { Label: '' }); store.add('child', { OrderID: 1 }, '1');
        expect(store.count(p as boolean, c as boolean)).toBe(count);
    });
    it('keeps identical IDs in different tables independent', () => {
        const store = new RelationalChanges();
        store.edit('parent', parents[0], 'Region', 'North', 'West');
        store.edit('child', children[0], 'Status', 'Complete', 'Pending');
        expect(store.payload('parent')[0].changes).toEqual({ Region: 'North' });
        expect(store.payload('child')[0].changes).toEqual({ Status: 'Complete' });
    });
    it('includes all drafts when another edit enables saving and preserves values exactly', () => {
        const store = new RelationalChanges();
        store.add('parent', { Count: 0, Flag: false, Value: null });
        store.edit('child', children[0], 'Status', 'Complete', 'Pending');
        expect(store.count(false, false)).toBe(1);
        const batch = store.begin()!;
        expect(batch.parent[0].changes).toEqual({ Count: 0, Flag: false, Value: null, isNewRow: true });
        expect(store.changes.child.size).toBe(1);
    });
    it('clears only acknowledged successes and retains failed table edits for retry', () => {
        const store = new RelationalChanges();
        store.add('parent', { Title: 'Draft' });
        store.add('child', { OrderID: 1 }, '1');
        const batch = store.begin()!;
        expect(store.acknowledge(JSON.stringify({ requestId: batch.requestId, parent: { status: 'succeeded' }, child: { status: 'failed', message: 'Rejected' } }))).toEqual(['parent']);
        expect(store.drafts.parent.size).toBe(0);
        expect(store.drafts.child.size).toBe(1);
        expect(store.begin()!.parent).toEqual([]);
    });
    it('ignores stale acknowledgements, rejects incomplete results, and blocks changes during save', () => {
        const store = new RelationalChanges();
        store.add('parent', {});
        const batch = store.begin()!;
        store.acknowledge(JSON.stringify({ requestId: 'old', parent: { status: 'succeeded' } }));
        expect(store.batch).toBe(batch);
        store.acknowledge(JSON.stringify({ requestId: batch.requestId }));
        expect(store.batch).toBe(batch);
        expect(store.errors.length).toBe(1);
        expect(() => store.add('parent', {})).toThrow();
        store.cancel(); expect(store.drafts.parent.size).toBe(1);
    });
    it('cancel restores templates while preserving each child association', () => {
        const store = new RelationalChanges();
        const id = store.add('child', { OrderID: 1, Notes: '' }, '1');
        store.edit('child', row('child', id, {}), 'Notes', 'edited', '');
        store.cancel();
        expect(store.drafts.child.get(id)).toEqual({ values: { OrderID: 1, Notes: '' }, template: { OrderID: 1, Notes: '' }, parentId: '1' });
    });
    it('reverting an edit clears the correct record independently of sort order', () => {
        const store = new RelationalChanges();
        store.edit('parent', parents[1], 'Region', 'North', 'East');
        store.edit('parent', parents[1], 'Region', 'East', 'East');
        expect(store.payload('parent')).toEqual([]);
    });
});

describe('Independent column, editor, and template configuration', () => {
    it('applies every child column override without affecting the parent schema', () => {
        const config = dataset([{ ColName: 'Status', ColDisplayName: 'Inspection result', ColWidth: 245, ColCellType: 'link', ColHorizontalAlign: 'end', ColVerticalAlign: 'start', ColHeaderHorizontalAlign: 'center', ColHeaderVerticalAlign: 'end', ColMultiLine: true, ColVisible: false, ColFrozen: true, ColAccessibilityText: 'Result help', ColHeaderColor: 'navy', ColHeaderFontColor: 'white' }]);
        const child = buildColumns([{ name: 'Status', dataType: 'SingleLine.Text' }], config)[0];
        expect(child).toMatchObject({ name: 'Inspection result', defaultWidth: 245, cellType: 'link', horizontalAligned: 'end', verticalAligned: 'start', headerHorizontalAligned: 'center', headerVerticalAligned: 'end', isMultiline: true, isVisible: false, isFrozen: true, accessibilityText: 'Result help', headerColor: 'navy', headerFontColor: 'white' });
        expect(buildColumns([{ name: 'Status' }], undefined)[0]).toMatchObject({ name: 'Status', isVisible: true, isFrozen: false, defaultWidth: 150 });
    });
    it('builds child editor and template settings independently, including false and zero', () => {
        const editors = buildEditors(dataset([{ ColumnKey: 'Amount', EditorType: 'number', MinValue: 0, IsRequired: true }]), '', () => [], true);
        expect(editors.Amount).toMatchObject({ type: 'number', isRequired: true, numberConfig: { min: 0 } });
        expect(buildTemplate(dataset([{ ColumnName: 'Flag', DefaultValue: 'false', ValueType: 'boolean' }, { ColumnName: 'Number', DefaultValue: '0', ValueType: 'number', AutoIncrement: true }]), 2)).toEqual({ Flag: false, Number: 2 });
    });
});
