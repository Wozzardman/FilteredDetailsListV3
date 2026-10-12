/** @jest-environment node */
import { buildColumns, buildEditors, buildTemplate, configRecords } from '../relational/RelationalConfig';

function config(values: Record<string, unknown>, bindings: Record<string, string> = {}) {
    return {
        columns: Object.entries(bindings).map(([alias, name]) => ({ alias, name })),
        sortedRecordIds: ['config'],
        records: { config: { getValue: (field: string) => values[field] } }
    } as any;
}

describe('Independent parent and child configuration bindings', () => {
    it('reads child property-set names while retaining parent configuration names', () => {
        const metadata = [{ name: 'Status' }];
        const settings = config({ ColName: 'Status', ColDisplayName: 'Parent status', ChildColName: 'Status', ChildColDisplayName: 'Child status', ChildColWidth: 245 });
        expect(buildColumns(metadata, settings)[0].name).toBe('Parent status');
        expect(buildColumns(metadata, settings, 150, true, 'child')[0]).toMatchObject({ name: 'Child status', defaultWidth: 245 });
    });

    it('resolves child aliases to arbitrary source columns and preserves false, zero and null', () => {
        const settings = config({ key: 'Status', label: 'Result', visible: false, width: 0, color: null, ColHeaderColor: 'red' }, {
            ChildColName: 'key', ChildColDisplayName: 'label', ChildColVisible: 'visible', ChildColWidth: 'width', ChildColHeaderColor: 'color'
        });
        const record = configRecords(settings, 'child')[0];
        expect(record.getValue('ColVisible')).toBe(false);
        expect(record.getValue('ColWidth')).toBe(0);
        expect(record.getValue('ColHeaderColor')).toBeNull();
        expect(buildColumns([{ name: 'Status' }], settings, 150, true, 'child')[0]).toMatchObject({ name: 'Result', isVisible: false, defaultWidth: 150, headerColor: '' });
    });

    it('also supports hosts exposing values only through the property-set alias', () => {
        const settings = config({ ChildColName: 'Status', ChildColDisplayName: 'Result' }, { ChildColName: 'key', ChildColDisplayName: 'label' });
        expect(buildColumns([{ name: 'Status' }], settings, 150, true, 'child')[0].name).toBe('Result');
    });

    it('keeps conventional unprefixed configuration fields working', () => {
        const settings = config({ ColName: 'Status', ColDisplayName: 'Result' });
        expect(buildColumns([{ name: 'Status' }], settings, 150, true, 'child')[0].name).toBe('Result');
    });

    it('reads child editors and validation from mapped source columns', () => {
        const settings = config({ target: 'Amount', type: 'number', minimum: 0, required: true, direct: false }, {
            ChildColumnKey: 'target', ChildEditorType: 'type', ChildMinValue: 'minimum', ChildIsRequired: 'required', ChildAllowDirectTextInput: 'direct'
        });
        expect(buildEditors(settings, '', () => [], true, 'child').Amount).toMatchObject({
            type: 'number', numberConfig: { min: 0 }, isRequired: true, allowDirectTextInput: false
        });
    });

    it('reads child templates and auto-increment through their own bindings', () => {
        const settings = config({ target: 'Sequence', initial: '0', type: 'number', increment: true }, {
            ChildColumnName: 'target', ChildDefaultValue: 'initial', ChildValueType: 'type', ChildAutoIncrement: 'increment'
        });
        expect(buildTemplate(settings, 2, 'child')).toEqual({ Sequence: 2 });
        expect(buildTemplate(config({ ChildColumnName: 'Flag', ChildDefaultValue: false, ChildValueType: 'boolean' }), 0, 'child')).toEqual({ Flag: false });
    });
});
