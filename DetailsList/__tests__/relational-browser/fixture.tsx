import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { RelationalController } from '../../relational/RelationalController';

initializeIcons();
const raw = (value: any) => ({ raw: value });
function dataset(records: any[], columns: any[]) {
    return {
        columns, sortedRecordIds: records.map(r => String(r.id)),
        records: Object.fromEntries(records.map(r => [String(r.id), { getValue: (field: string) => r[field] }])),
        paging: { pageSize: 50000, lastPageNumber: 1, hasNextPage: false, setPageSize: () => undefined, loadNextPage: () => undefined },
        loading: false, error: false, setSelectedRecordIds: () => undefined, refresh: () => undefined
    };
}
const config = (rows: any[]) => dataset(rows.map((r, i) => ({ id: i, ...r })), []);
const metadata = (names: string[]) => names.map(name => ({ name, displayName: name, dataType: name === 'OrderID' || name === 'Amount' ? 'Whole.None' : 'SingleLine.Text' }));
const controller = new RelationalController();
const context: any = {
    mode: { allocatedWidth: 1120, allocatedHeight: 640 },
    parameters: {
        EnableParentChild: raw(true), RelationshipConfig: raw(JSON.stringify({ keys: [{ parentField: 'OrderID', childField: 'OrderID' }] })),
        DataSourceName: raw('Orders'), ChildDataSourceName: raw('OrderLines'), ChildLabel: raw('Order lines'),
        PageSize: raw(50000), ChildPageSize: raw(50000), UseEnhancedEditors: raw(true),
        SelectionType: raw('2'), SelectionMode: raw('1'), AddNewRowsSave: raw(true), ChildAddNewRowsSave: raw(true),
        EnableAddNewRow: raw(true), EnableAddChildRow: raw(true), EnableColumnResizing: raw(true), EnableHeaderTextWrapping: raw(true),
        HeaderTextSize: raw(14), ColumnTextSize: raw(13), ShowControlBar: raw(true), SaveResult: raw(''), EnableJumpTo: raw(true),
        ShowFormulaField: raw(true), FormulaFieldExpression: raw('COUNT()'),
        records: dataset(Array.from({ length: 60 }, (_, i) => ({ id: i, OrderID: i, Name: `Order ${i}`, Region: i % 2 ? 'West' : 'East' })), metadata(['OrderID', 'Name', 'Region'])),
        childRecords: dataset(Array.from({ length: 50 }, (_, i) => ({ id: i, OrderID: Math.floor(i / 2) + 1, Description: `Line ${i}`, Status: i % 2 ? 'Complete' : 'Pending', Amount: i })), metadata(['OrderID', 'Description', 'Status', 'Amount'])),
        columns: config([{ ColName: 'OrderID', ColWidth: 90, JumptoColumn: true }, { ColName: 'Name', ColWidth: 260, ColDisplayName: 'Order name' }]),
        childColumns: config([{ ColName: 'OrderID', ColVisible: false }, { ColName: 'Description', ColDisplayName: 'Line description', ColWidth: 280, ColFrozen: true, ColHeaderColor: '#e7f3ff', ColHeaderFontColor: '#004578' }, { ColName: 'Amount', ColWidth: 160, ColHorizontalAlign: 'end' }]),
        editorConfig: config([{ ColumnKey: 'Name', EditorType: 'text' }]),
        childEditorConfig: config([{ ColumnKey: 'Description', EditorType: 'text', IsRequired: true }, { ColumnKey: 'Amount', EditorType: 'number', MinValue: 0 }]),
        newRowTemplateConfig: config([{ ColumnName: 'OrderID', DefaultValue: '1000', ValueType: 'number', AutoIncrement: true }]),
        childNewRowTemplateConfig: config([{ ColumnName: 'Description', DefaultValue: 'New line' }])
    }
};
let scheduled = false;
function render() {
    ReactDOM.render(controller.update(context, () => {
        if (!scheduled) {
            scheduled = true;
            Promise.resolve().then(() => { scheduled = false; (window as any).lastOutputs = controller.outputs(); render(); });
        }
    }), document.getElementById('root'));
}
(window as any).relationalHarness = { controller, context, render, dataset, metadata };
render();
