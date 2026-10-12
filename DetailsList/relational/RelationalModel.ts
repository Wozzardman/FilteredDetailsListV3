/** Pure relational operations. No table names, PCF lifecycle, or display indexes. */
export type RecordScope = 'parent' | 'child';
export type Values = Record<string, any>;
export interface RelationalRow {
    recordId: string;
    key: string;
    scope: RecordScope;
    values: Values;
    isNewRow?: boolean;
    parentId?: string;
    getRecordId(): string;
    getValue(field: string): any;
    getFormattedValue(field: string): string;
}
export interface KeyPair { parentField: string; childField: string }
export interface Relationship { keys: KeyPair[] }
export interface RelationshipResolution {
    status: 'manual' | 'automatic' | 'unresolved' | 'invalid';
    relationship?: Relationship;
    message: string;
}
export interface ColumnMetadata { name: string; dataType?: string; alias?: string }
export type ValueFilters = Record<string, any[]>;
export interface ChangePayload { recordId: string; changes: Values }
export interface Draft { values: Values; template: Values; parentId?: string }
export interface SaveBatch { requestId: string; parent: ChangePayload[]; child: ChangePayload[] }
export interface ScopeResult { status: 'succeeded' | 'failed'; message?: string }
export interface SaveResult { requestId: string; parent?: ScopeResult; child?: ScopeResult }

export function row(scope: RecordScope, recordId: string, values: Values, draft?: Draft): RelationalRow {
    return {
        scope, recordId, key: recordId, values, isNewRow: !!draft, parentId: draft?.parentId,
        getRecordId: () => recordId,
        getValue: field => values[field],
        getFormattedValue: field => values[field] == null ? '' : values[field] instanceof Date
            ? values[field].toLocaleDateString() : String(values[field])
    };
}

function keyPart(value: any): string | null {
    if (value == null || value === '') return null;
    // Compare typed values without number coercion (SQL bigint IDs can exceed JS precision).
    if (typeof value === 'object' && !(value instanceof Date)) {
        const id = value.id?.guid ?? value.id ?? value.Id;
        return typeof id === 'string' ? `id:${id.replace(/[{}]/g, '').toLowerCase()}` : null;
    }
    if (typeof value === 'number' && !Number.isSafeInteger(value)) return null;
    if (typeof value === 'string' && /^[{]?[0-9a-f]{8}-[0-9a-f-]{27}[}]?$/i.test(value)) {
        return `id:${value.replace(/[{}]/g, '').toLowerCase()}`;
    }
    return `${typeof value}:${String(value)}`;
}

export function relationshipKey(record: RelationalRow, fields: string[]): string | null {
    const parts = fields.map(field => keyPart(field === '$recordId' ? record.recordId : record.getValue(field)));
    return parts.some(part => part === null) ? null : JSON.stringify(parts);
}

export function indexRelationship(parents: RelationalRow[], children: RelationalRow[], relationship: Relationship) {
    const parentsByKey = new Map<string, RelationalRow>();
    const childrenByParent = new Map<string, RelationalRow[]>();
    const duplicateKeys = new Set<string>();
    for (const parent of parents) {
        const key = relationshipKey(parent, relationship.keys.map(pair => pair.parentField));
        if (key !== null) {
            if (parentsByKey.has(key)) duplicateKeys.add(key);
            else parentsByKey.set(key, parent);
        }
    }
    const parentIds = new Set(parents.map(parent => parent.recordId));
    const unmatched: RelationalRow[] = [];
    for (const child of children) {
        const key = relationshipKey(child, relationship.keys.map(pair => pair.childField));
        const parent = key === null || duplicateKeys.has(key) ? undefined : parentsByKey.get(key);
        const parentId = child.isNewRow && child.parentId && parentIds.has(child.parentId)
            ? child.parentId : parent?.recordId;
        if (!parentId) { unmatched.push(child); continue; }
        const siblings = childrenByParent.get(parentId) || [];
        siblings.push(child);
        childrenByParent.set(parentId, siblings);
    }
    return { childrenByParent, duplicateKeys, unmatched };
}

export function resolveRelationship(
    raw: string | null | undefined, parents: RelationalRow[], children: RelationalRow[],
    parentColumns: ColumnMetadata[], childColumns: ColumnMetadata[], parentSource = ''
): RelationshipResolution {
    if (raw?.trim()) {
        try {
            const parsed = JSON.parse(raw) as Relationship;
            if (!Array.isArray(parsed.keys) || !parsed.keys.length || parsed.keys.some(pair =>
                !pair || typeof pair.parentField !== 'string' || typeof pair.childField !== 'string' ||
                (pair.parentField !== '$recordId' && !parentColumns.some(col => col.name === pair.parentField)) ||
                !childColumns.some(col => col.name === pair.childField))) {
                throw new Error('Each key must reference an available parentField and childField.');
            }
            if (new Set(parsed.keys.map(pair => pair.childField)).size !== parsed.keys.length) {
                throw new Error('A child field cannot appear in more than one key pair.');
            }
            const index = indexRelationship(parents.filter(p => !p.isNewRow), children, parsed);
            if (index.duplicateKeys.size) throw new Error('Parent relationship keys are not unique. Configure all parts of the key.');
            return { status: 'manual', relationship: parsed, message: '' };
        } catch (error) {
            return { status: 'invalid', message: `RelationshipConfig: ${(error as Error).message}` };
        }
    }
    const persisted = children.filter(child => !child.isNewRow);
    if (!parents.length || !persisted.length) return { status: 'unresolved', message: 'Configure RelationshipConfig to link these tables. There is not enough data to detect a relationship.' };
    const normalize = (name: string) => name.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const source = normalize(parentSource.replace(/^.*[.]/, '').replace(/s$/i, ''));
    const candidates: Relationship[] = [];
    for (const p of parentColumns) {
        if (!/(id|key)$/i.test(p.name)) continue;
        for (const c of childColumns) {
            const pn = normalize(p.name), cn = normalize(c.name);
            const nameMatches = (pn === cn && pn !== 'id' && pn !== 'key') ||
                (!!source && (pn === 'id' || pn === 'key') && cn === source + pn);
            if (!nameMatches || p.dataType !== c.dataType) continue;
            const candidate = { keys: [{ parentField: p.name, childField: c.name }] };
            const index = indexRelationship(parents, persisted, candidate);
            if (!index.duplicateKeys.size && !index.unmatched.length &&
                parents.every(parent => relationshipKey(parent, [p.name]) !== null)) candidates.push(candidate);
        }
    }
    return candidates.length === 1
        ? { status: 'automatic', relationship: candidates[0], message: '' }
        : { status: 'unresolved', message: candidates.length
            ? 'Several relationships are possible. Set RelationshipConfig explicitly.'
            : 'No unambiguous relationship was found. Set RelationshipConfig explicitly.' };
}

export function filterValue(value: any, type?: string): any {
    if (value == null || (typeof value === 'string' && value.trim() === '')) return '(Blanks)';
    if (value instanceof Date) return value.toDateString();
    if (type === 'date') {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) return parsed.toDateString();
    }
    return value;
}

export function matches(record: RelationalRow, filters: ValueFilters, types: Record<string, string> = {}): boolean {
    return Object.entries(filters).every(([field, values]) => !values.length ||
        values.some(value => filterValue(record.getValue(field), types[field]) === filterValue(value, types[field])));
}

export interface FilteredRelation {
    parents: RelationalRow[];
    children: RelationalRow[];
    childrenByParent: Map<string, RelationalRow[]>;
}
export function filterRelation(
    parents: RelationalRow[], index: Map<string, RelationalRow[]>,
    parentFilters: ValueFilters, childFilters: ValueFilters, search = '',
    parentTypes: Record<string, string> = {}, childTypes: Record<string, string> = {},
    pinnedParents = new Set<string>(), pinnedChildren = new Set<string>(),
    parentSearchFields?: string[], childSearchFields?: string[]
): FilteredRelation {
    const result: FilteredRelation = { parents: [], children: [], childrenByParent: new Map() };
    const query = search.trim().toLocaleLowerCase();
    const searchMatches = (record: RelationalRow, fields?: string[]) => !query ||
        (fields || Object.keys(record.values)).some(field => String(record.getValue(field) ?? '').toLocaleLowerCase().includes(query));
    const hasChildFilters = Object.values(childFilters).some(values => values.length);
    for (const parent of parents) {
        const siblings = index.get(parent.recordId) || [];
        const pinned = pinnedParents.has(parent.recordId) || siblings.some(child => pinnedChildren.has(child.recordId));
        if (!pinned && !matches(parent, parentFilters, parentTypes)) continue;
        const parentSearch = searchMatches(parent, parentSearchFields);
        const matching = siblings.filter(child => matches(child, childFilters, childTypes) &&
            (parentSearch || searchMatches(child, childSearchFields)));
        if (!pinned && ((hasChildFilters && !matching.length) || (!parentSearch && !matching.length))) continue;
        const displayed = siblings.filter(child => matching.includes(child) || pinnedChildren.has(child.recordId));
        result.parents.push(parent);
        result.children.push(...displayed);
        result.childrenByParent.set(parent.recordId, displayed);
    }
    return result;
}

const equal = (a: any, b: any) => a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b;

/** Owns pending edits independently of React rendering and dataset refreshes. */
export class RelationalChanges {
    readonly changes = { parent: new Map<string, Values>(), child: new Map<string, Values>() };
    readonly drafts = { parent: new Map<string, Draft>(), child: new Map<string, Draft>() };
    batch?: SaveBatch;
    errors: string[] = [];
    revision = 0;
    private sequence = 0;

    edit(scope: RecordScope, record: RelationalRow, field: string, value: any, original: any): void {
        if (this.batch) return;
        const changed = { ...this.changes[scope].get(record.recordId) };
        if (equal(value, original)) delete changed[field]; else changed[field] = value;
        if (Object.keys(changed).length) this.changes[scope].set(record.recordId, changed);
        else this.changes[scope].delete(record.recordId);
        const draft = this.drafts[scope].get(record.recordId);
        if (draft) draft.values = { ...draft.values, [field]: value };
        this.revision++;
    }

    add(scope: RecordScope, values: Values, parentId?: string): string {
        if (this.batch) throw new Error('Wait for the current save to finish.');
        const id = `NEW_ROW_${scope}_${Date.now()}_${++this.sequence}`;
        this.drafts[scope].set(id, { values: { ...values }, template: { ...values }, parentId });
        this.revision++;
        return id;
    }

    remove(scope: RecordScope, id: string): void {
        if (this.batch) return;
        this.drafts[scope].delete(id);
        this.changes[scope].delete(id);
        this.revision++;
    }

    pinned(scope: RecordScope): Set<string> {
        return new Set([...this.drafts[scope].keys(), ...this.changes[scope].keys()]);
    }

    count(parentAdds: boolean, childAdds: boolean): number {
        return (['parent', 'child'] as RecordScope[]).reduce((sum, scope) => sum + new Set([
            ...this.changes[scope].keys(),
            ...((scope === 'parent' ? parentAdds : childAdds) ? this.drafts[scope].keys() : [])
        ]).size, 0);
    }

    payload(scope: RecordScope): ChangePayload[] {
        const payload = new Map(this.changes[scope]);
        this.drafts[scope].forEach((draft, id) => payload.set(id, { ...draft.values, isNewRow: true }));
        return Array.from(payload, ([recordId, changes]) => ({ recordId, changes: { ...changes } }));
    }

    begin(): SaveBatch | undefined {
        if (this.batch) return undefined;
        const parent = this.payload('parent'), child = this.payload('child');
        if (!parent.length && !child.length) return undefined;
        this.errors = [];
        this.batch = { requestId: `save-${Date.now()}-${++this.sequence}`, parent, child };
        return this.batch;
    }

    acknowledge(raw: string): RecordScope[] {
        if (!raw || !this.batch) return [];
        let result: SaveResult;
        try { result = JSON.parse(raw); } catch { this.errors = ['SaveResult must be valid JSON.']; return []; }
        if (!result || result.requestId !== this.batch.requestId) return [];
        const submitted = (['parent', 'child'] as RecordScope[]).filter(scope => this.batch![scope].length);
        if (submitted.some(scope => !result[scope] || !['succeeded', 'failed'].includes(result[scope]!.status))) {
            this.errors = ['SaveResult must report succeeded or failed for every submitted table.'];
            return [];
        }
        this.errors = [];
        const succeeded: RecordScope[] = [];
        submitted.forEach(scope => {
            if (result[scope]!.status === 'succeeded') {
                this.batch![scope].forEach(change => {
                    this.changes[scope].delete(change.recordId);
                    this.drafts[scope].delete(change.recordId);
                });
                succeeded.push(scope);
            } else this.errors.push(`${scope}: ${result[scope]!.message || 'Save failed. Changes have been retained.'}`);
        });
        this.batch = undefined;
        this.revision++;
        return succeeded;
    }

    cancel(): void {
        if (this.batch) return;
        (['parent', 'child'] as RecordScope[]).forEach(scope => {
            this.changes[scope].clear();
            this.drafts[scope].forEach(draft => { draft.values = { ...draft.template }; });
        });
        this.errors = [];
        this.revision++;
    }

    overlay(scope: RecordScope, records: RelationalRow[]): RelationalRow[] {
        const result = records.map(record => row(scope, record.recordId, {
            ...record.values, ...this.changes[scope].get(record.recordId)
        }));
        this.drafts[scope].forEach((draft, id) => result.push(row(scope, id, { ...draft.values }, draft)));
        return result;
    }
}
