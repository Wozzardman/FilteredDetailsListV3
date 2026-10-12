import * as React from 'react';
import { IInputs, IOutputs } from '../generated/ManifestTypes';
import { IGridColumn } from '../Component.types';
import { ColumnEditorMapping } from '../types/ColumnEditor.types';
import { buildColumns, buildEditors, buildTemplate, configRecords, read } from './RelationalConfig';
import { RecordScope, RelationalRow, RelationalChanges, RelationshipResolution, row, resolveRelationship, ValueFilters } from './RelationalModel';
import { RelationalGrid } from './RelationalGrid';
import { FilterUtils } from '../FilterUtils';
import { IFilterState } from '../Filter.types';
import { FilterOperators, FilterTypes } from '../ManifestConstants';

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
    private awaitingRefresh?: { records: any; ids: any; sawLoading: boolean };
    rows: RelationalRow[] = [];
    complete = false;

    reset(): void {
        this.records.clear(); this.rows = []; this.complete = false;
        this.previousRecords = undefined; this.previousIds = undefined; this.requestedPage = '';
        this.configuredSize = 0;
        this.awaitingRefresh = undefined;
    }

    refresh(dataset: Dataset): void {
        this.reset();
        this.awaitingRefresh = { records: dataset.records, ids: dataset.sortedRecordIds, sawLoading: false };
        dataset.refresh();
    }

    update(dataset: Dataset | undefined, scope: RecordScope, size: number): void {
        this.complete = false;
        if (!dataset || dataset.error) return;
        if (dataset.loading) {
            this.loading = true;
            if (this.awaitingRefresh) this.awaitingRefresh.sawLoading = true;
            return;
        }
        if (this.awaitingRefresh) {
            if (!this.awaitingRefresh.sawLoading && this.awaitingRefresh.records === dataset.records && this.awaitingRefresh.ids === dataset.sortedRecordIds) return;
            this.awaitingRefresh = undefined;
        }
        const paging = dataset.paging;
        if (paging && this.configuredSize !== size) {
            this.configuredSize = size;
            if (paging.pageSize !== size) {
                paging.setPageSize(size);
                this.requestedPage = '';
                this.awaitingRefresh = { records: dataset.records, ids: dataset.sortedRecordIds, sawLoading: false };
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
    appliedFilters: IFilterState = {};
    sortColumn = '';
    sortDescending = false;
    private appliedFiltersRaw?: string;
    private inputEvent = '';
    private commitTrigger = '';
    private cancelTrigger = '';
    private newRows: { id: string; template: Record<string, any>; timestamp: string }[] = [];
    private publications = new Map<string, { rows: RelationalRow[]; entry: any; plain: any[] }>();
    private notify: () => void = () => undefined;
    private subscribers = new Set<() => void>();
    private contexts = new Map<string, RelationalChanges>();
    private pages = { parent: new DatasetAccumulator(), child: new DatasetAccumulator() };
    private cachedRows?: { revision: number; parentBase: RelationalRow[]; childBase: RelationalRow[]; parent: RelationalRow[]; child: RelationalRow[] };

    subscribe = (listener: () => void): (() => void) => {
        this.subscribers.add(listener);
        return () => { this.subscribers.delete(listener); };
    };
    private emit(): void { this.subscribers.forEach(fn => fn()); this.notify(); }
    reportJump(index: number, message: string): void { this.jumpIndex = index; this.jumpResult = message; this.emit(); }
    reportSort(scope: RecordScope, field: string, descending: boolean): void {
        this.eventName = 'Sort'; this.eventDataset = scope; this.sortColumn = field; this.sortDescending = descending; this.emit();
    }
    get parameters(): IInputs { return this.context.parameters; }
    get busy(): boolean { return !!this.changes.batch; }
    get pendingCount(): number { return this.changes.count(!!this.parameters.AddNewRowsSave?.raw, !!this.parameters.ChildAddNewRowsSave?.raw); }
    get editingAllowed(): boolean { return !this.busy && this.ready && !(this.parameters.SelectionMode?.raw === '2' && this.parameters.SelectionType?.raw !== '0'); }

    update(context: ComponentFramework.Context<IInputs>, notify: () => void): React.ReactElement {
        this.context = context; this.notify = notify;
        const p = context.parameters;
        const contextKey = p.RelationalContextKey?.raw || `${p.DataSourceName?.raw || 'parent'}|${p.ChildDataSourceName?.raw || 'child'}`;
        if (contextKey !== this.contextKey) {
            this.clearPublications();
            if (this.contextKey) this.contexts.set(this.contextKey, this.changes);
            this.contextKey = contextKey;
            this.changes = this.contexts.get(contextKey) || new RelationalChanges();
            this.cachedRows = undefined;
            this.pages.parent.reset(); this.pages.child.reset();
            this.scopes.parent.selected.clear(); this.scopes.child.selected.clear();
            this.scopes.parent.filters = {}; this.scopes.child.filters = {};
            this.appliedFilters = {}; this.appliedFiltersRaw = undefined;
            this.resetVersion++;
        }
        this.errors = [];
        if ((p.AppliedFilters?.raw || '') !== this.appliedFiltersRaw) {
            this.appliedFiltersRaw = p.AppliedFilters?.raw || '';
            this.appliedFilters = FilterUtils.deserializeFilters(this.appliedFiltersRaw);
            this.scopes.parent.filters = {};
        }
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
            state.columns = buildColumns(state.dataset?.columns || [], columnConfig, p.DefaultColumnWidth?.raw || 150, p.EnableColumnResizing?.raw !== false, scope);
            state.editors = buildEditors(isParent ? p.editorConfig : p.childEditorConfig,
                isParent ? p.ColumnEditorFormulas?.raw : p.ChildColumnEditorFormulas?.raw, () => this.rows()[scope], !!p.UseEnhancedEditors?.raw, scope);
            const available = new Set((state.dataset?.columns || []).map(column => column.name));
            configRecords(columnConfig, scope).forEach(record => {
                const name = read(record, 'ColName');
                if (name && !available.has(name)) this.errors.push(`${scope}: configured column "${name}" is not supplied by the dataset. Check the Canvas field bindings.`);
            });
            if (state.dataset?.error) this.errors.push(`${scope}: ${state.dataset.errorMessage || 'Unable to load records.'}`);
        }
        const loaded = this.pages.parent.complete && this.pages.child.complete;
        this.resolution = loaded ? resolveRelationship(p.RelationshipConfig?.raw, this.scopes.parent.base, this.scopes.child.base,
            p.records?.columns || [], p.childRecords?.columns || [], this.scopes.parent.source) : { status: 'unresolved', message: '' };
        this.ready = this.pages.parent.complete && this.pages.child.complete && !!this.resolution.relationship && !this.errors.length;
        if (loaded) this.publishSources();
        if (p.SaveResult?.raw) {
            // The user may have switched projects while a connector call was in flight.
            // Route a late acknowledgement to its original change store, never the active table.
            let resultRequest = '';
            try { resultRequest = JSON.parse(p.SaveResult.raw)?.requestId || ''; } catch { /* acknowledge reports malformed active results */ }
            const resultStore = resultRequest && this.changes.batch?.requestId !== resultRequest
                ? Array.from(this.contexts.values()).find(changes => changes.batch?.requestId === resultRequest) : this.changes;
            const wasBusy = this.busy;
            const succeeded = resultStore?.acknowledge(p.SaveResult.raw) || [];
            if (wasBusy && !this.busy) {
                this.resetVersion++; this.cachedRows = undefined;
                // A table-specific procedure can update related tables as a side effect.
                if (succeeded.length) {
                    (['parent', 'child'] as RecordScope[]).forEach(scope => {
                        const dataset = this.scopes[scope].dataset;
                        if (dataset) this.pages[scope].refresh(dataset);
                    });
                    this.ready = false;
                }
                this.notify();
            }
        }
        if (p.CommitTrigger?.raw && p.CommitTrigger.raw !== this.commitTrigger) { this.commitTrigger = p.CommitTrigger.raw; this.save(); }
        if (p.CancelChangesTrigger?.raw && p.CancelChangesTrigger.raw !== this.cancelTrigger) { this.cancelTrigger = p.CancelChangesTrigger.raw; this.cancel(); }
        if (this.ready && p.InputEvent?.raw && this.inputEvent !== p.InputEvent.raw) {
            this.inputEvent = p.InputEvent.raw;
            const event = this.inputEvent;
            if (event.includes('ClearSelection')) { this.select('parent', []); this.select('child', []); }
            else if (event.startsWith('SelectRowById:')) {
                const [, id, additive] = event.split(':');
                this.select('parent', additive === 'true' ? [...this.scopes.parent.selected, id] : [id]);
            } else if (event.startsWith('SelectRows:')) this.select('parent', event.split(':')[1].split(',').map(id => id.trim()).filter(Boolean));
            else if (event.includes('SetSelection')) this.select('parent', this.scopes.parent.base.filter(record => record.getValue('RecordsSelected') || record.getValue('ItemSelected')).map(record => record.recordId));
        }
        return React.createElement(RelationalGrid, { controller: this, key: contextKey });
    }

    matchingParentIds(excludeField?: string): Set<string> | undefined {
        const filters = { ...this.appliedFilters };
        if (excludeField) delete filters[excludeField];
        if (!Object.values(filters).some(filter => filter.isActive)) return undefined;
        const records = this.rows().parent;
        return new Set(FilterUtils.applyFilters(Object.fromEntries(records.map(record => [record.recordId, record])) as any, records.map(record => record.recordId), filters));
    }

    private serializedFilters(scope: RecordScope): string {
        const filters = scope === 'parent' ? { ...this.appliedFilters } : {} as IFilterState;
        Object.entries(this.scopes[scope].filters).forEach(([field, values]) => {
            filters[field] = { columnName: field, filterType: FilterTypes.Text, isActive: !!values.length,
                conditions: [{ field, operator: FilterOperators.In, value: values }] };
        });
        return FilterUtils.serializeFilters(filters);
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
            const values = buildTemplate(scope === 'parent' ? p.newRowTemplateConfig : p.childNewRowTemplateConfig, i, scope);
            if (scope === 'child') this.resolution.relationship!.keys.forEach(pair => {
                values[pair.childField] = pair.parentField === '$recordId' ? parent!.recordId : parent!.getValue(pair.parentField);
            });
            ids.push(this.changes.add(scope, values, parentId));
        }
        this.eventName = 'NewRowCreated'; this.eventDataset = scope;
        this.newRows = ids.map(id => ({ id, template: { ...this.changes.drafts[scope].get(id)!.template }, timestamp: new Date().toISOString() }));
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
                    const prefix = `${scope} ${record.recordId}: ${field}`;
                    const blank = value == null || value === '';
                    if (config.isRequired && blank) errors.push(`${prefix} is required.`);
                    if (blank) return;
                    if (config.type === 'number') {
                        const number = Number(value);
                        if (!Number.isFinite(number)) errors.push(`${prefix} must be a valid number.`);
                        else if (config.numberConfig?.min !== undefined && number < config.numberConfig.min) errors.push(`${prefix} must be at least ${config.numberConfig.min}.`);
                        else if (config.numberConfig?.max !== undefined && number > config.numberConfig.max) errors.push(`${prefix} must be no more than ${config.numberConfig.max}.`);
                    }
                    if (config.textConfig?.maxLength && String(value).length > config.textConfig.maxLength) errors.push(`${prefix} exceeds ${config.textConfig.maxLength} characters.`);
                    if (config.textConfig?.pattern) {
                        try {
                            if (!new RegExp(config.textConfig.pattern).test(String(value))) errors.push(`${prefix}: ${config.textConfig.patternErrorMessage || 'Invalid format.'}`);
                        } catch { errors.push(`${prefix}: the configured validation pattern is invalid.`); }
                    }
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
        if (scope === 'parent' && this.appliedFilters[field]) {
            this.appliedFilters = { ...this.appliedFilters }; delete this.appliedFilters[field];
        }
        if (values.length) filters[field] = values; else delete filters[field];
        this.scopes[scope].filters = filters;
        this.eventName = 'FilterChanged'; this.eventDataset = scope; this.changedColumn = field;
        this.emit();
    };
    select = (scope: RecordScope, ids: string[]): void => {
        const selectable = new Set(this.rows()[scope].filter(record => record.getValue('RecordsCanSelect') !== false && record.getValue('ItemCanSelect') !== false).map(record => record.recordId));
        ids = ids.filter(id => selectable.has(id));
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
            SortEventColumn: this.sortColumn, SortEventDirection: this.sortDescending ? '1' : '0',
            ButtonEventName: this.buttonEventName, ButtonEventType: this.buttonEventName === 'Save Changes' ? 'save' : this.buttonEventName === 'Cancel Changes' ? 'cancel' : '',
            ClickedButtonName: this.buttonEventName, ClickedButtonText: this.buttonEventName, ButtonEventSequence: this.buttonSequence,
            PendingChanges: JSON.stringify(batch?.parent || this.changes.payload('parent')),
            ChildPendingChanges: JSON.stringify(batch?.child || this.changes.payload('child')),
            SaveRequestId: this.saveRequestId, SaveTrigger: this.saveRequestId,
            HasPendingChanges: this.changes.payload('parent').length + this.changes.payload('child').length > 0, ChangeCount: this.pendingCount,
            NewRowCreated: this.newRows.length ? JSON.stringify(this.newRows[this.newRows.length - 1]) : '',
            NewRowKey: this.newRows.length ? this.newRows[this.newRows.length - 1].id : '', NewRowEventType: this.newRows.length ? 'created' : '',
            ChangedRecordKey: this.changedRecord, ChangedColumn: this.changedColumn, EventColumn: this.changedColumn,
            EventRowKey: this.changedRecord, OldValue: this.oldValue, NewValue: this.newValue,
            RelationshipStatus: this.resolution.status, ResolvedRelationship: this.resolution.relationship ? JSON.stringify(this.resolution.relationship) : '',
            SelectedCount: selected, ChildSelectedCount: this.scopes.child.selected.size,
            SelectAllState: !selected ? '0' : selected === this.rows().parent.length ? '2' : '1',
            ChildSelectedRecordIds: JSON.stringify(Array.from(this.scopes.child.selected)),
            AllFilters: this.serializedFilters('parent'), ChildAllFilters: this.serializedFilters('child'),
            FilterEventName: this.eventName === 'FilterChanged' ? 'FilterChanged' : '', FilterEventColumn: this.changedColumn,
            TotalRecords: this.scopes.parent.base.length, TotalPages: 1, PageNumber: 1, HasNextPage: false, HasPreviousPage: false,
            JumpToResult: this.jumpResult, JumpToRowIndex: this.jumpIndex
        } as IOutputs;
        this.eventName = ''; this.buttonEventName = ''; this.newRows = [];
        return output;
    }
    private publishSources(): void {
        if (typeof window === 'undefined') return;
        const w = window as any;
        w.__FDLSharedData = w.__FDLSharedData || {};
        w.PowerAppsDataSources = w.PowerAppsDataSources || {};
        for (const scope of ['parent', 'child'] as RecordScope[]) {
            const { source, base } = this.scopes[scope];
            if (this.publications.get(source)?.rows === base) continue;
            const records = Object.fromEntries(base.map(record => [record.recordId, record]));
            const recordIds = base.map(record => record.recordId);
            const cache = new Map<string, any>();
            const entry = { records, recordIds, getDistinct: (field: string) => {
                if (!cache.has(field)) cache.set(field, FilterUtils.getUniqueValues(records as any, recordIds, field));
                return cache.get(field);
            } };
            const plain = base.map(record => ({ ...record.values }));
            w.__FDLSharedData[source] = entry;
            w.PowerAppsDataSources[source] = plain;
            this.publications.set(source, { rows: base, entry, plain });
        }
    }
    private clearPublications(): void {
        if (typeof window !== 'undefined') {
            const w = window as any;
            this.publications.forEach(({ entry, plain }, source) => {
                if (w.__FDLSharedData?.[source] === entry) delete w.__FDLSharedData[source];
                if (w.PowerAppsDataSources?.[source] === plain) delete w.PowerAppsDataSources[source];
            });
        }
        this.publications.clear();
    }
    destroy(): void { this.clearPublications(); this.subscribers.clear(); this.contexts.clear(); }
}
