import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { VirtualizedEditableGrid, ExternalGridLayout } from '../components/VirtualizedEditableGrid';
import { ExcelLikeColumnFilter } from '../components/ExcelLikeColumnFilter';
import { DataExportService } from '../services/DataExportService';
import { IExportOptions } from '../types/Advanced.types';
import { RelationalController } from './RelationalController';
import { RecordScope, RelationalRow, filterRelation, filterValue, indexRelationship } from './RelationalModel';
import { configRecords, read } from './RelationalConfig';
import '../css/RelationalGrid.css';

interface Entry { kind: 'parentHeader' | 'parent' | 'childHeader' | 'child'; key: string; index: number; parentId?: string }
type Sort = { field: string; descending: boolean } | undefined;
function sorted(records: RelationalRow[], sort: Sort): RelationalRow[] {
    if (!sort) return records;
    return [...records].sort((a, b) => {
        const x = a.getValue(sort.field), y = b.getValue(sort.field);
        const order = typeof x === 'number' && typeof y === 'number' ? x - y
            : x instanceof Date && y instanceof Date ? x.getTime() - y.getTime()
            : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true });
        return (sort.descending ? -1 : 1) * order;
    });
}

export const RelationalGrid: React.FC<{ controller: RelationalController }> = ({ controller: c }) => {
    const [, render] = React.useReducer(value => value + 1, 0);
    React.useEffect(() => c.subscribe(render), [c]);
    const p = c.parameters;
    const label = p.ChildLabel?.raw || 'Related records';
    const all = c.rows();
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [search, setSearch] = React.useState('');
    const [jump, setJump] = React.useState('');
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
    const [filterCollapsed, setFilterCollapsed] = React.useState<Set<string>>(new Set());
    const [sorts, setSorts] = React.useState<{ parent: Sort; child: Sort }>({ parent: undefined, child: undefined });
    const [sizes, setSizes] = React.useState({ parent: { width: 600, header: 48 }, child: { width: 600, header: 48 } });
    const [addDialog, setAddDialog] = React.useState<{ scope: RecordScope; parentId?: string } | null>(null);
    const [addCount, setAddCount] = React.useState('1');
    const [childFilterField, setChildFilterField] = React.useState('');
    const filterButton = React.useRef<HTMLButtonElement>(null);
    const [filterOpen, setFilterOpen] = React.useState(false);
    const [exportScope, setExportScope] = React.useState<RecordScope>('parent');
    const [exportFormat, setExportFormat] = React.useState<IExportOptions['format']>('Excel');
    const [uiError, setUiError] = React.useState('');
    const [scrollTarget, setScrollTarget] = React.useState<string | null>(null);
    const parentTypes = React.useMemo(() => Object.fromEntries(c.scopes.parent.columns.map(col => [col.key, col.dataType || 'text'])), [c.scopes.parent.columns]);
    const childTypes = React.useMemo(() => Object.fromEntries(c.scopes.child.columns.map(col => [col.key, col.dataType || 'text'])), [c.scopes.child.columns]);
    const relation = c.resolution.relationship;
    const relationKey = JSON.stringify(relation);
    const index = React.useMemo(() => relation ? indexRelationship(all.parent, all.child, relation) : { childrenByParent: new Map<string, RelationalRow[]>(), duplicateKeys: new Set<string>(), unmatched: [] }, [all.parent, all.child, relationKey]);
    const filtered = React.useMemo(() => filterRelation(all.parent, index.childrenByParent,
        c.scopes.parent.filters, c.scopes.child.filters, search, parentTypes, childTypes,
        c.changes.pinned('parent'), c.changes.pinned('child'), c.scopes.parent.columns.map(col => col.key), c.scopes.child.columns.map(col => col.key)),
    [all.parent, all.child, index, c.scopes.parent.filters, c.scopes.child.filters, search, parentTypes, childTypes]);
    const parentRows = React.useMemo(() => sorted(filtered.parents, sorts.parent), [filtered, sorts.parent]);
    const childRows = React.useMemo(() => parentRows.flatMap(parent => sorted(filtered.childrenByParent.get(parent.recordId) || [], sorts.child)), [parentRows, filtered, sorts.child]);
    const childFilterKey = JSON.stringify(c.scopes.child.filters);
    const filteringChildren = Object.keys(c.scopes.child.filters).length > 0;
    React.useEffect(() => { setFilterCollapsed(new Set()); }, [childFilterKey]);
    const childToParent = React.useMemo(() => {
        const map = new Map<string, string>();
        index.childrenByParent.forEach((children, parentId) => children.forEach(child => map.set(child.recordId, parentId)));
        return map;
    }, [index]);
    const entries = React.useMemo(() => {
        const result: Entry[] = [{ kind: 'parentHeader', key: 'header:parent', index: -1 }];
        const childIndices = new Map(childRows.map((record, i) => [record.recordId, i]));
        parentRows.forEach((parent, i) => {
            result.push({ kind: 'parent', key: `parent:${parent.recordId}`, index: i });
            const children = filtered.childrenByParent.get(parent.recordId) || [];
            const hasPinnedChild = children.some(child => c.changes.pinned('child').has(child.recordId));
            const open = filteringChildren ? !filterCollapsed.has(parent.recordId) : expanded.has(parent.recordId) || hasPinnedChild;
            if (children.length && open) {
                result.push({ kind: 'childHeader', key: `header:child:${parent.recordId}`, index: -1, parentId: parent.recordId });
                sorted(children, sorts.child).forEach(child => result.push({ kind: 'child', key: `child:${child.recordId}`, index: childIndices.get(child.recordId)!, parentId: parent.recordId }));
            }
        });
        return result;
    }, [parentRows, childRows, filtered, expanded, filterCollapsed, filteringChildren, sorts.child]);
    const virtualizer = useVirtualizer({
        count: entries.length, getScrollElement: () => scrollRef.current,
        getItemKey: i => entries[i].key,
        estimateSize: i => entries[i].kind === 'parentHeader' ? sizes.parent.header : entries[i].kind === 'childHeader' ? sizes.child.header : 42,
        overscan: 8
    });
    React.useEffect(() => {
        if (!scrollTarget) return;
        const i = entries.findIndex(entry => entry.key === scrollTarget);
        if (i >= 0) { virtualizer.scrollToIndex(i, { align: 'center' }); setScrollTarget(null); }
    }, [entries, scrollTarget, virtualizer]);
    const measureParent = React.useCallback((width: number, header: number) => setSizes(old => old.parent.width === width && old.parent.header === header ? old : { ...old, parent: { width, header } }), []);
    const measureChild = React.useCallback((width: number, header: number) => setSizes(old => old.child.width === width && old.child.header === header ? old : { ...old, child: { width, header } }), []);
    const activeParent = React.useCallback((active: boolean) => { c.activeEditors.parent = active; }, [c]);
    const activeChild = React.useCallback((active: boolean) => { c.activeEditors.child = active; }, [c]);

    const afterEditor = (action: () => void) => {
        (document.activeElement as HTMLElement | null)?.blur?.();
        requestAnimationFrame(() => {
            if (c.activeEditors.parent || c.activeEditors.child) { setUiError('Finish or correct the active cell first.'); return; }
            setUiError(''); action();
        });
    };
    const toggle = (id: string) => afterEditor(() => {
        const update = (old: Set<string>) => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; };
        if (filteringChildren) setFilterCollapsed(update); else setExpanded(update);
    });
    const facetCache = React.useMemo(() => new Map<string, Array<{ value: any; displayValue: string; count: number }>>(),
        [all.parent, all.child, c.scopes.parent.filters, c.scopes.child.filters, search, parentTypes, childTypes]);
    const available = (scope: RecordScope, field: string) => {
        const cacheKey = `${scope}:${field}`;
        if (facetCache.has(cacheKey)) return facetCache.get(cacheKey)!;
        const parentFilters = { ...c.scopes.parent.filters }, childFilters = { ...c.scopes.child.filters };
        delete (scope === 'parent' ? parentFilters : childFilters)[field];
        const results = filterRelation(all.parent, index.childrenByParent, parentFilters, childFilters, search, parentTypes, childTypes);
        const counts = new Map<any, number>();
        (scope === 'parent' ? results.parents : results.children).filter(record => !record.isNewRow).forEach(record => {
            const value = filterValue(record.getValue(field), (scope === 'parent' ? parentTypes : childTypes)[field]);
            counts.set(value, (counts.get(value) || 0) + 1);
        });
        const result = Array.from(counts, ([value, count]) => ({ value, displayValue: String(value), count })).sort((a, b) => a.displayValue.localeCompare(b.displayValue, undefined, { numeric: true }));
        facetCache.set(cacheKey, result); return result;
    };
    const exportData = async () => {
        try {
            const columns = c.scopes[exportScope].columns.filter(col => col.isVisible !== false);
            await DataExportService.getInstance().exportData(exportScope === 'parent' ? parentRows : childRows, {
                format: exportFormat, fileName: `${c.scopes[exportScope].source}-${new Date().toISOString().slice(0, 10)}`,
                customColumns: columns.map(col => col.key), customHeaders: columns.map(col => col.name), includeHeaders: true
            });
        } catch (error) { setUiError((error as Error).message); }
    };
    const jumpField = configRecords(p.columns).find(record => read(record, 'JumptoColumn') === true);
    const jumpTo = (value: string) => {
        const field = read(jumpField, 'ColName');
        const i = parentRows.findIndex(record => String(record.getValue(field) ?? '').toLowerCase().startsWith(value.trim().toLowerCase()));
        c.jumpIndex = i; c.jumpResult = i < 0 ? 'No matching parent record.' : '';
        if (i >= 0) setScrollTarget(`parent:${parentRows[i].recordId}`);
        render();
    };
    React.useEffect(() => { if (p.JumpToValue?.raw) jumpTo(p.JumpToValue.raw); }, [p.JumpToValue?.raw]);

    const renderScope = (scope: RecordScope) => {
        const state = c.scopes[scope], parent = scope === 'parent';
        const records = parent ? parentRows : childRows;
        const selectedCount = records.filter(record => state.selected.has(record.recordId)).length;
        const externalLayout: ExternalGridLayout = {
            scope, scrollRef, virtualizer, resetVersion: c.resetVersion, leadingWidth: parent ? 84 : 108,
            renderLeading: parent ? record => {
                const count = index.childrenByParent.get(record.recordId)?.length || 0;
                const open = entries.some(entry => entry.kind === 'childHeader' && entry.parentId === record.recordId);
                return <>
                    {count > 0 && <button type="button" className="relation-chevron" aria-label={`${open ? 'Collapse' : 'Expand'} ${label} (${count})`} aria-expanded={open} onClick={() => toggle(record.recordId)}>{open ? '⌄' : '›'} <small>{count}</small></button>}
                    {!record.isNewRow && p.EnableAddChildRow?.raw && <button type="button" className="relation-add" title={`Add ${label}`} aria-label={`Add ${label} to this record`} disabled={!c.editingAllowed} onClick={() => afterEditor(() => { setAddCount('1'); setAddDialog({ scope: 'child', parentId: record.recordId }); })}>+</button>}
                    {record.isNewRow && <span title="Unsaved parent">New</span>}
                </>;
            } : record => <span className="relation-indent" title={record.isNewRow ? 'Unsaved related record' : label}>{record.isNewRow ? 'New ↳' : '↳'}</span>,
            groupKey: parent ? () => 'parent' : record => childToParent.get(record?.recordId),
            isDirty: (id, column) => Object.prototype.hasOwnProperty.call(c.changes.changes[scope].get(id) || {}, column),
            onMeasure: parent ? measureParent : measureChild,
            onActiveEditorChange: parent ? activeParent : activeChild,
            render: parts => <>
                {parent && <div className="relation-parent-header" data-index={0} ref={virtualizer.measureElement}>{parts.header()}</div>}
                {virtualizer.getVirtualItems().map(virtual => {
                    const entry = entries[virtual.index];
                    if (entry.kind === scope) return parts.row({ ...virtual, index: entry.index, flatIndex: virtual.index });
                    if (!parent && entry.kind === 'childHeader') return <div key={entry.key} data-index={virtual.index} ref={virtualizer.measureElement} className="relation-child-header" style={{ transform: `translateY(${virtual.start}px)` }}>{parts.header()}</div>;
                    return null;
                })}
                {parts.overlays}
            </>
        };
        return <VirtualizedEditableGrid key={scope} items={records} allItems={all[scope]} columns={state.columns} externalLayout={externalLayout}
            height="100%" enableInlineEditing={c.editingAllowed} useEnhancedEditors={!!p.UseEnhancedEditors?.raw} columnEditorMapping={state.editors}
            enableDragFill={c.editingAllowed} enableColumnFilters={c.ready} enableCascadingFilters={true}
            onCellEdit={(id, column, value) => c.edit(scope, id, column, value)} onDeleteNewRow={id => c.remove(scope, id)}
            readOnlyColumns={c.readOnly(scope)}
            getAvailableValues={field => available(scope, field)} getColumnDataType={field => {
                const type = (parent ? parentTypes : childTypes)[field]; return type === 'number' || type === 'date' || type === 'boolean' ? type : 'text';
            }} onColumnFilter={(field, values) => c.filter(scope, field, values)}
            onSortColumn={field => afterEditor(() => setSorts(old => ({ ...old, [scope]: { field, descending: old[scope]?.field === field ? !old[scope]?.descending : false } })))}
            headerTextSize={p.HeaderTextSize?.raw || 14} columnTextSize={p.ColumnTextSize?.raw || 13}
            enableHeaderTextWrapping={!!p.EnableHeaderTextWrapping?.raw} alternateRowColor={p.AlternateRowColor?.raw || undefined}
            selectionType={p.SelectionType?.raw || '1'} enableSelectionMode={p.SelectionMode?.raw !== '0' && p.SelectionType?.raw !== '0'}
            selectionLockEditingMode={p.SelectionMode?.raw === '2'} selectedItems={state.selected}
            selectAllState={!selectedCount ? 'none' : selectedCount === records.length ? 'all' : 'some'}
            onItemSelection={id => {
                const selected = p.SelectionType?.raw === '1' ? new Set<string>() : new Set(state.selected);
                if (state.selected.has(id)) selected.delete(id); else selected.add(id);
                c.select(scope, Array.from(selected));
            }} onSelectAll={ids => c.select(scope, selectedCount === records.length ? [] : ids || [])}
            onClearAllSelections={() => c.select(scope, [])} />;
    };

    const messages = [...c.errors, ...c.changes.errors, ...(c.resolution.message ? [c.resolution.message] : []), ...(uiError ? [uiError] : [])];
    const width = c.context.mode.allocatedWidth > 0 ? c.context.mode.allocatedWidth : '100%';
    const height = c.context.mode.allocatedHeight > 0 ? c.context.mode.allocatedHeight : 500;
    return <div className="relational-grid" style={{ width, height }}>
        {messages.map((message, i) => <MessageBar key={`${i}:${message}`} messageBarType={MessageBarType.error}>{message}</MessageBar>)}
        {c.ready && index.unmatched.length > 0 && <MessageBar messageBarType={MessageBarType.warning}>{index.unmatched.length} related records have no matching parent in the loaded data.</MessageBar>}
        {(!c.ready || c.busy) && !messages.length && <div role="status" className="relation-status"><Spinner label={c.busy ? 'Saving changes…' : 'Loading both tables…'} /></div>}
        {p.ShowControlBar?.raw !== false && <div className="relation-toolbar">
            <TextField ariaLabel="Search both tables" placeholder={p.FilterRecordsText?.raw || 'Search records'} value={search} disabled={!c.ready} onChange={(_, value) => setSearch(value || '')} styles={{ root: { width: p.FilterRecordsWidth?.raw || 200 } }} />
            {p.EnableJumpTo?.raw && <TextField ariaLabel="Jump to parent record" placeholder="Jump to record" value={jump} onChange={(_, value) => setJump(value || '')} onKeyDown={e => { if (e.key === 'Enter') jumpTo(jump); }} />}
            {p.EnableAddNewRow?.raw && <PrimaryButton disabled={!c.editingAllowed} text={p.AddNewRowText?.raw || 'Add New Row'} onClick={() => afterEditor(() => { setAddCount('1'); setAddDialog({ scope: 'parent' }); })} />}
            <span>{p.TotalItemsText?.raw || 'Total Items:'} {parentRows.length} · {label}: {childRows.length}</span>
            {!!c.pendingCount && <><PrimaryButton text={c.busy ? 'Saving…' : `Save Changes (${c.pendingCount})`} disabled={!c.ready || c.busy} onClick={() => afterEditor(c.save)} /><DefaultButton text="Cancel Changes" disabled={c.busy} onClick={c.cancel} /></>}
            <label>{label} filters <select aria-label={`${label} filter column`} value={childFilterField} onChange={e => setChildFilterField(e.target.value)}>
                <option value="">Choose column</option>{c.scopes.child.columns.filter(col => col.isVisible !== false).map(col => <option key={col.key} value={col.key}>{col.name}</option>)}
            </select></label>
            <button ref={filterButton} type="button" disabled={!c.ready || !childFilterField} onClick={() => afterEditor(() => setFilterOpen(true))}>Filter</button>
            <select aria-label="Export table" value={exportScope} onChange={e => setExportScope(e.target.value as RecordScope)}><option value="parent">Parent records</option><option value="child">{label}</option></select>
            <select aria-label="Export format" value={exportFormat} onChange={e => setExportFormat(e.target.value as IExportOptions['format'])}>{['CSV','Excel','PDF','JSON'].map(format => <option key={format}>{format}</option>)}</select>
            <DefaultButton text="Export" disabled={!c.ready} onClick={exportData} />
        </div>}
        <div className="relation-scroll" ref={scrollRef} aria-label="Parent and related records">
            <div className="relation-surface" style={{ height: virtualizer.getTotalSize(), minWidth: Math.max(sizes.parent.width, sizes.child.width) }}>
                {renderScope('parent')}{renderScope('child')}
            </div>
        </div>
        {filterOpen && <ExcelLikeColumnFilter columnKey={childFilterField} columnName={c.scopes.child.columns.find(col => col.key === childFilterField)?.name || childFilterField}
            dataType={childTypes[childFilterField] === 'string' ? 'text' : childTypes[childFilterField] as any || 'text'}
            allData={all.child} filteredData={childRows} currentFilters={c.scopes.child.filters} getAvailableValues={field => available('child', field)}
            onFilterChange={(field, values) => c.filter('child', field, values)} target={filterButton.current} isOpen onDismiss={() => setFilterOpen(false)} />}
        <Dialog hidden={!addDialog} onDismiss={() => setAddDialog(null)} dialogContentProps={{ type: DialogType.normal, title: addDialog?.scope === 'child' ? `Add ${label}` : p.AddNewRowText?.raw || 'Add rows' }}>
            <TextField label="Number of rows" type="number" min={1} max={10000} value={addCount} onChange={(_, value) => setAddCount(value || '')} />
            <DialogFooter><PrimaryButton text="Add" disabled={!/^\d+$/.test(addCount) || Number(addCount) < 1 || Number(addCount) > 10000} onClick={() => {
                if (!addDialog) return;
                const ids = c.add(addDialog.scope, Number(addCount), addDialog.parentId);
                if (addDialog.parentId) setExpanded(old => new Set([...old, addDialog.parentId!]));
                if (ids.length) setScrollTarget(`${addDialog.scope}:${ids[0]}`);
                setAddDialog(null);
            }} /><DefaultButton text="Cancel" onClick={() => setAddDialog(null)} /></DialogFooter>
        </Dialog>
    </div>;
};
