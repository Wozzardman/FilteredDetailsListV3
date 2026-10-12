import * as React from 'react';
import { IInputs, IOutputs } from '../generated/ManifestTypes';
import { IGridColumn } from '../Component.types';
import { ColumnEditorMapping } from '../types/ColumnEditor.types';
import { buildColumns, buildEditors, buildTemplate, configRecords, read } from './RelationalConfig';
import { RecordScope, RelationalRow, RelationalChanges, RelationshipResolution, row, resolveRelationship, indexRelationship, ValueFilters } from './RelationalModel';
import { RelationalGrid } from './RelationalGrid';

type Dataset = ComponentFramework.PropertyTypes.DataSet;
export interface ScopeState {
    source: string;
    dataset?: Dataset;
    base: RelationalRow[];
    columns: IGridColumn[];
    editors: ColumnEditorMapping;
    selected: Set<string>;
    filters: ValueFilters;
}

/** Accumulates both incremental and cumulative Canvas page responses. */
export class DatasetAccumulator {
    private records = new Map<string, RelationalRow>();
    private previousRecords: any;
    private previousIds: any;
    private loading = false;
    private requestedPage = '';
    private configuredSize = 0;
    rows: RelationalRow[] = [];
    complete = false;

    reset(): void {
        this.records.clear(); this.rows = []; this.complete = false;
        this.previousRecords = undefined; this.previousIds = undefined; this.requestedPage = '';
        this.configuredSize = 0;
    }

    update(dataset: Dataset | undefined, scope: RecordScope, size: number): void {
        this.complete = false;
        if (!dataset || dataset.error) return;
        if (dataset.loading) { this.loading = true; return; }
        const paging = dataset.paging;
        if (paging && this.configuredSize !== size) {
            this.configuredSize = size;
            if (paging.pageSize !== size) {
                paging.setPageSize(size);
                this.requestedPage = '';
                dataset.refresh();
                return;
            }
        }
        const ids = dataset.sortedRecordIds || [];
        const responseKey = `${paging?.lastPageNumber}:${ids.length}:${ids[0]}:${ids[ids.length - 1]}`;
        const changed = this.previousRecords !== dataset.records || this.previousIds !== ids || this.loading;
        if (changed) {
            // A refresh starts again at page one; never retain deleted records from the old generation.
            if ((paging?.lastPageNumber || 1) === 1 && !this.requestedPage) this.records.clear();
            for (const id of ids) {
                const record = dataset.records[id];
                if (!record) continue;
                const values: Record<string, any> = {};
                (dataset.columns || []).forEach(column => { values[column.name] = read(record, column.name); });
                this.records.set(id, row(scope, id, values));
            }
            this.rows = Array.from(this.records.values());
            this.previousRecords = dataset.records;
            this.previousIds = ids;
        }
        this.loading = false;
        if (paging?.hasNextPage) {
            if (this.requestedPage !== responseKey) {
                this.requestedPage = responseKey;
                paging.loadNextPage();
            }
        } else {
            this.requestedPage = '';
            this.complete = true;
        }
    }
}

export class RelationalController {
    context!: ComponentFramework.Context<IInputs>;
    changes = new RelationalChanges();
    readonly scopes: Record<RecordScope, ScopeState> = {
        parent: { source: '', base: [], columns: [], editors: {}, selected: new Set(), filters: {} },
        child: { source: '', base: [], columns: [], editors: {}, selected: new Set(), filters: {} }
    };
    resolution: RelationshipResolution = { status: 'unresolved', message: '' };
    ready = false;
    errors: string[] = [];
    resetVersion = 0;
    contextKey = '';
    saveRequestId = '';
    eventDataset = '';
    eventName = '';
    buttonEventName = '';
    buttonSequence = 0;
    changedRecord = '';
    changedColumn = '';
    oldValue = '';
    newValue = '';
    jumpResult = '';
    jumpIndex = -1;
    activeEditors = { parent: false, child: false };
    private commitTrigger = '';
    private cancelTrigger = '';
    private lastResult = '';
    private notify: () => void = () => undefined;
    private subscribers = new Set<() => void>();
    private contexts = new Map<string, RelationalChanges>();
    private pages = { parent: new DatasetAccumulator(), child: new DatasetAccumulator() };
    private cachedRows?: { revision: number; parentBase: RelationalRow[]; childBase: RelationalRow[]; parent: RelationalRow[]; child: RelationalRow[] };

    subscribe = (listener: () => void): (() => void) => {
        this.subscribers.add(listener);
        return () => { this.subscribers.delete(listener); };
    };
    private emit(): void { this.cachedRows = undefined; this.subscribers.forEach(fn => fn()); this.notify(); }
    get parameters(): IInputs { return this.context.parameters; }
    get busy(): boolean { return !!this.changes.batch; }
    get pendingCount(): number { return this.changes.count(!!this.parameters.AddNewRowsSave?.raw, !!this.parameters.ChildAddNewRowsSave?.raw); }
    get editingAllowed(): boolean { return !this.busy && this.ready && !(this.parameters.SelectionMode?.raw === '2' && this.parameters.SelectionType?.raw !== '0'); }

    update(context: ComponentFramework.Context<IInputs>, notify: () => void): React.ReactElement {
        this.context = context; this.notify = notify;
        const p = context.parameters;
        const contextKey = p.RelationalContextKey?.raw || `${p.DataSourceName?.raw || 'parent'}|${p.ChildDataSourceName?.raw || 'child'}`;
        if (contextKey !== this.contextKey) {
            if (this.contextKey) this.contexts.set(this.contextKey, this.changes);
            this.contextKey = contextKey;
            this.changes = this.contexts.get(contextKey) || new RelationalChanges();
            this.cachedRows = undefined;
            this.pages.parent.reset(); this.pages.child.reset();
            this.scopes.parent.selected.clear(); this.scopes.child.selected.clear();
            this.scopes.parent.filters = {}; this.scopes.child.filters = {};
            this.resetVersion++;
        }
        this.errors = [];
        for (const scope of ['parent', 'child'] as RecordScope[]) {
            const isParent = scope === 'parent';
            const state = this.scopes[scope];
            state.dataset = isParent ? p.records : p.childRecords;
            state.source = (isParent ? p.DataSourceName?.raw : p.ChildDataSourceName?.raw) || scope;
            this.pages[scope].update(state.dataset, scope, Math.max(1, (isParent ? p.PageSize?.raw : p.ChildPageSize?.raw || p.PageSize?.raw) || 150));
            state.base = this.pages[scope].rows;
            const columnConfig = isParent ? p.columns : p.childColumns;
            // Configuration datasets can themselves be paged by Canvas.
            for (const config of [columnConfig, isParent ? p.editorConfig : p.childEditorConfig, isParent ? p.newRowTemplateConfig : p.childNewRowTemplateConfig]) {
                if (config?.paging && config.paging.pageSize < 125 && !config.loading) { config.paging.setPageSize(125); config.refresh(); }
            }
            state.columns = buildColumns(state.dataset?.columns || [], columnConfig, p.DefaultColumnWidth?.raw || 150, p.EnableColumnResizing?.raw !== false);
            state.editors = buildEditors(isParent ? p.editorConfig : p.childEditorConfig,
                isParent ? p.ColumnEditorFormulas?.raw : p.ChildColumnEditorFormulas?.raw, () => this.rows()[scope], !!p.UseEnhancedEditors?.raw);
            const available = new Set((state.dataset?.columns || []).map(column => column.name));
            configRecords(columnConfig).forEach(record => {
                const name = read(record, 'ColName');
                if (name && !available.has(name)) this.errors.push(`${scope}: configured column "${name}" is not supplied by the dataset. Check the Canvas field bindings.`);
            });
            if (state.dataset?.error) this.errors.push(`${scope}: ${state.dataset.errorMessage || 'Unable to load records.'}`);
        }
        this.resolution = resolveRelationship(p.RelationshipConfig?.raw, this.scopes.parent.base, this.scopes.child.base,
            p.records?.columns || [], p.childRecords?.columns || [], this.scopes.parent.source);
        this.ready = this.pages.parent.complete && this.pages.child.complete && !!this.resolution.relationship && !this.errors.length;
        if (p.SaveResult?.raw && p.SaveResult.raw !== this.lastResult) {
            this.lastResult = p.SaveResult.raw;
            const wasBusy = this.busy;
            const succeeded = this.changes.acknowledge(p.SaveResult.raw);
            if (wasBusy && !this.busy) {
                this.resetVersion++; this.cachedRows = undefined;
                succeeded.forEach(scope => { this.pages[scope].reset(); this.scopes[scope].dataset?.refresh(); });
                if (succeeded.length) this.ready = false;
                this.notify();
            }
        }
        if (p.CommitTrigger?.raw && p.CommitTrigger.raw !== this.commitTrigger) { this.commitTrigger = p.CommitTrigger.raw; this.save(); }
        if (p.CancelChangesTrigger?.raw && p.CancelChangesTrigger.raw !== this.cancelTrigger) { this.cancelTrigger = p.CancelChangesTrigger.raw; this.cancel(); }
        return React.createElement(RelationalGrid, { controller: this, key: contextKey });
    }

    rows(): { parent: RelationalRow[]; child: RelationalRow[] } {
        if (this.cachedRows && this.cachedRows.revision === this.changes.revision && this.cachedRows.parentBase === this.scopes.parent.base && this.cachedRows.childBase === this.scopes.child.base) return this.cachedRows;
        this.cachedRows = {
            revision: this.changes.revision, parentBase: this.scopes.parent.base, childBase: this.scopes.child.base,
            parent: this.changes.overlay('parent', this.scopes.parent.base), child: this.changes.overlay('child', this.scopes.child.base)
        };
        return this.cachedRows;
    }

    edit = (scope: RecordScope, id: string, column: string, value: any): void => {
        if (!this.editingAllowed) return;
        const record = this.rows()[scope].find(r => r.recordId === id);
        if (!record || this.readOnly(scope, record).includes(column)) return;
        const draft = this.changes.drafts[scope].get(id);
        const original = draft ? draft.template[column] : this.scopes[scope].base.find(r => r.recordId === id)?.getValue(column);
        this.changes.edit(scope, record, column, value, original);
        this.eventName = 'OnChange'; this.eventDataset = scope;
        this.changedRecord = id; this.changedColumn = column;
        this.oldValue = original == null ? '' : String(original); this.newValue = value == null ? '' : String(value);
        this.emit();
    };

    readOnly(scope: RecordScope, record?: RelationalRow): string[] {
        if (scope === 'parent' && record?.isNewRow) return [];
        return this.resolution.relationship?.keys.map(pair => scope === 'parent' ? pair.parentField : pair.childField) || [];
    }

    add = (scope: RecordScope, count: number, parentId?: string): string[] => {
        if (!this.editingAllowed || !Number.isInteger(count) || count < 1 || count > 10000) return [];
        const p = this.parameters;
        if (!(scope === 'parent' ? p.EnableAddNewRow?.raw : p.EnableAddChildRow?.raw)) return [];
        const parent = this.scopes.parent.base.find(record => record.recordId === parentId);
        if (scope === 'child' && (!parent || !this.resolution.relationship)) return [];
        const ids: string[] = [];
        for (let i = 0; i < count; i++) {
            const values = buildTemplate(scope === 'parent' ? p.newRowTemplateConfig : p.childNewRowTemplateConfig, i);
            if (scope === 'child') this.resolution.relationship!.keys.forEach(pair => {
                values[pair.childField] = pair.parentField === '$recordId' ? parent!.recordId : parent!.getValue(pair.parentField);
            });
            ids.push(this.changes.add(scope, values, parentId));
        }
        this.eventName = 'NewRowCreated'; this.eventDataset = scope;
        this.emit(); return ids;
    };
    remove = (scope: RecordScope, id: string): void => { if (!this.busy) { this.changes.remove(scope, id); this.resetVersion++; this.emit(); } };

    save = (): void => {
        if (!this.editingAllowed || !this.pendingCount) return;
        if (this.activeEditors.parent || this.activeEditors.child) {
            this.changes.errors = ['Finish or correct the active cell before saving.']; this.emit(); return;
        }
        const errors: string[] = [];
        for (const scope of ['parent', 'child'] as RecordScope[]) {
            const rows = this.rows()[scope];
            const pendingIds = this.changes.pinned(scope);
            rows.filter(record => pendingIds.has(record.recordId)).forEach(record => {
                Object.entries(this.scopes[scope].editors).forEach(([field, config]) => {
                    const value = record.getValue(field);
                    if (config.isRequired && (value == null || value === '')) errors.push(`${scope} ${record.recordId}: ${field} is required.`);
                });
            });
        }
        if (errors.length) { this.changes.errors = errors; this.emit(); return; }
        const batch = this.changes.begin();
        if (!batch) return;
        this.saveRequestId = batch.requestId;
        this.eventDataset = batch.parent.length && batch.child.length ? 'both' : batch.parent.length ? 'parent' : 'child';
        this.eventName = 'ButtonEvent'; this.buttonEventName = 'Save Changes'; this.buttonSequence++;
        this.emit();
    };
    cancel = (): void => {
        if (this.busy) return;
        this.changes.cancel(); this.resetVersion++;
        this.eventName = 'ButtonEvent'; this.buttonEventName = 'Cancel Changes'; this.eventDataset = 'both'; this.buttonSequence++;
        this.emit();
    };
    filter = (scope: RecordScope, field: string, values: any[]): void => {
        if (!this.ready) return;
        const filters = { ...this.scopes[scope].filters };
        if (values.length) filters[field] = values; else delete filters[field];
        this.scopes[scope].filters = filters;
        this.eventName = 'FilterChanged'; this.eventDataset = scope; this.changedColumn = field;
        this.emit();
    };
    select = (scope: RecordScope, ids: string[]): void => {
        this.scopes[scope].selected = new Set(ids);
        const persisted = new Set(this.scopes[scope].base.map(record => record.recordId));
        this.scopes[scope].dataset?.setSelectedRecordIds(ids.filter(id => persisted.has(id)));
        this.eventName = 'OnRowSelectionChange'; this.eventDataset = scope; this.emit();
    };
    outputs(): IOutputs {
        const batch = this.changes.batch;
        const selected = this.scopes.parent.selected.size;
        const output = {
            EventName: this.eventName, EventDataset: this.eventDataset,
            ButtonEventName: this.buttonEventName, ButtonEventType: this.buttonEventName === 'Save Changes' ? 'save' : 'cancel',
            ClickedButtonName: this.buttonEventName, ClickedButtonText: this.buttonEventName, ButtonEventSequence: this.buttonSequence,
            PendingChanges: JSON.stringify(batch?.parent || this.changes.payload('parent')),
            ChildPendingChanges: JSON.stringify(batch?.child || this.changes.payload('child')),
            SaveRequestId: this.saveRequestId, SaveTrigger: this.saveRequestId,
            HasPendingChanges: this.pendingCount > 0, ChangeCount: this.pendingCount,
            ChangedRecordKey: this.changedRecord, ChangedColumn: this.changedColumn, EventColumn: this.changedColumn,
            EventRowKey: this.changedRecord, OldValue: this.oldValue, NewValue: this.newValue,
            RelationshipStatus: this.resolution.status, ResolvedRelationship: this.resolution.relationship ? JSON.stringify(this.resolution.relationship) : '',
            SelectedCount: selected, ChildSelectedCount: this.scopes.child.selected.size,
            ChildSelectedRecordIds: JSON.stringify(Array.from(this.scopes.child.selected)),
            AllFilters: JSON.stringify(this.scopes.parent.filters), ChildAllFilters: JSON.stringify(this.scopes.child.filters),
            FilterEventName: this.eventName === 'FilterChanged' ? 'FilterChanged' : '', FilterEventColumn: this.changedColumn,
            TotalRecords: this.scopes.parent.base.length, TotalPages: 1, PageNumber: 1, HasNextPage: false, HasPreviousPage: false,
            JumpToResult: this.jumpResult, JumpToRowIndex: this.jumpIndex
        } as IOutputs;
        this.eventName = ''; this.buttonEventName = '';
        return output;
    }
    destroy(): void { this.subscribers.clear(); this.contexts.clear(); }
}
