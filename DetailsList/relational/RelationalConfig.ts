import { IGridColumn } from '../Component.types';
import { ColumnEditorMapping } from '../types/ColumnEditor.types';
import { PowerAppsFxColumnEditorParser } from '../services/PowerAppsFxColumnEditorParser';
import { ColumnMetadata, RelationalRow, Values } from './RelationalModel';

type Dataset = ComponentFramework.PropertyTypes.DataSet;
export function read(record: any, field: string): any {
    try { return record?.getValue ? record.getValue(field) : record?.[field]; } catch { return undefined; }
}
export function configRecords(dataset?: Dataset): any[] {
    return (dataset?.sortedRecordIds || Object.keys(dataset?.records || {})).map(id => dataset?.records[id]).filter(Boolean);
}
export function buildColumns(metadata: ColumnMetadata[], dataset: Dataset | undefined, defaultWidth = 150, resizable = true): IGridColumn[] {
    const overrides = new Map(configRecords(dataset).map(record => [read(record, 'ColName'), record]));
    const columns = metadata.filter(col => !['RecordsKey','RecordsCanSelect','RecordsSelected','RecordKey','RecordCanSelect','RecordSelected','ItemKey','ItemCanSelect','ItemSelected'].includes(col.name));
    return columns.map(meta => {
        const record = overrides.get(meta.name);
        const value = (field: string) => read(record, field);
        const type = meta.dataType || '';
        return {
            key: meta.name, fieldName: meta.name, name: value('ColDisplayName') || (meta as any).displayName || meta.name,
            minWidth: 50, maxWidth: 3000, defaultWidth: Number(value('ColWidth')) > 0 ? Number(value('ColWidth')) : defaultWidth,
            isResizable: resizable, cellType: value('ColCellType'),
            horizontalAligned: value('ColHorizontalAlign') || 'start', verticalAligned: value('ColVerticalAlign') || 'center',
            headerHorizontalAligned: value('ColHeaderHorizontalAlign') || value('ColHorizontalAlign') || 'start',
            headerVerticalAligned: value('ColHeaderVerticalAlign') || value('ColVerticalAlign') || 'center',
            isMultiline: value('ColMultiLine') === true, isVisible: value('ColVisible') !== false,
            isFrozen: value('ColFrozen') === true, accessibilityText: value('ColAccessibilityText') || '',
            headerColor: value('ColHeaderColor') || '', headerFontColor: value('ColHeaderFontColor') || '',
            dataType: /DateAndTime/i.test(type) ? 'date' : /Whole|Decimal|Currency|FP/i.test(type) ? 'number' : type === 'TwoOptions' ? 'boolean' : 'string'
        } as IGridColumn;
    });
}
export function buildTemplate(dataset: Dataset | undefined, increment: number): Values {
    const values: Values = {};
    configRecords(dataset).forEach(record => {
        const name = read(record, 'ColumnName');
        if (!name) return;
        const raw = read(record, 'DefaultValue');
        const type = String(read(record, 'ValueType') || 'text').toLowerCase();
        let value: any = raw == null ? null : raw;
        if (['number','integer','decimal'].includes(type) && raw !== '' && raw != null) value = Number(raw);
        if (['boolean','bool'].includes(type)) value = raw === true || String(raw).toLowerCase() === 'true' || raw === '1';
        if (type === 'null') value = null;
        if (read(record, 'AutoIncrement') === true && value !== null && Number.isFinite(Number(value))) value = Number(value) + increment;
        values[name] = value;
    });
    return values;
}
export function buildEditors(dataset: Dataset | undefined, formulas: string | null | undefined, rows: () => RelationalRow[], enabled: boolean): ColumnEditorMapping {
    const context: any = { parameters: { editorConfig: dataset, ColumnEditorFormulas: { raw: formulas } } };
    const useEnhancedEditors = enabled;
    let columnEditorMapping: ColumnEditorMapping = {};
    const dataOptions = (column: string) => () => Array.from(new Set(rows().map(r => r.getValue(column)).filter(v => v != null && v !== ''))).map(v => ({ key: String(v), text: String(v), value: v }));
    const sharedOptions = (source: string, column: string) => () => {
        const sourceRows = typeof window !== 'undefined' ? (window as any).__FDLSharedData?.[source]?.records || [] : [];
        return Array.from(new Set((Array.isArray(sourceRows) ? sourceRows : Object.values(sourceRows)).map((r: any) => read(r, column)).filter((v: any) => v != null && v !== ''))).map(v => ({ key: String(v), text: String(v), value: v }));
    };
        if (useEnhancedEditors) {
            // Priority 1: Table-based configuration (new Power Apps native approach)
            const editorConfigDataset = (context.parameters as any).editorConfig;
            if (editorConfigDataset && Object.keys(editorConfigDataset.records || {}).length) {
                try {
                    const records = editorConfigDataset.records;
                    const recordIds = Object.keys(records);
                    
                    for (const recordId of recordIds) {
                        const record = records[recordId];
                        const columnKey = record.getValue('ColumnKey') as string;
                        const editorType = record.getValue('EditorType') as string;
                        
                        if (columnKey && editorType) {
                            const config: any = {
                                type: editorType.toLowerCase()
                            };
                            
                            // Map table columns to configuration properties
                            const isRequired = record.getValue('IsRequired');
                            const editLock = record.getValue('EditLock');
                            const placeholder = record.getValue('Placeholder');
                            const minValue = record.getValue('MinValue');
                            const maxValue = record.getValue('MaxValue');
                            const maxLength = record.getValue('MaxLength');
                            const isMultiline = record.getValue('IsMultiline');
                            const validationPattern = record.getValue('ValidationPattern');
                            const patternErrorMessage = record.getValue('PatternErrorMessage');
                            const restrictedValueMessage = record.getValue('RestrictedValueMessage');
                            const dropdownOptions = record.getValue('DropdownOptions');
                            const allowDirectTextInput = record.getValue('AllowDirectTextInput');
                            const currencySymbol = record.getValue('CurrencySymbol');
                            const decimalPlaces = record.getValue('DecimalPlaces');
                            const stepValue = record.getValue('StepValue');
                            const showTime = record.getValue('ShowTime');
                            const dateFormat = record.getValue('DateFormat');
                            const maxRating = record.getValue('MaxRating');
                            const allowZeroRating = record.getValue('AllowZeroRating');
                            const showSliderValue = record.getValue('ShowSliderValue');
                            
                            // Get conditional logic fields
                            const dependsOn = record.getValue('DependsOn');
                            const lookupMappingSource = record.getValue('LookupMappingSource');
                            const lookupMappingFilter = record.getValue('LookupMappingFilter');
                            const lookupMappingReturn = record.getValue('LookupMappingReturn');
                            const lookupDataSource = record.getValue('LookupDataSource');
                            const lookupFilterColumn = record.getValue('LookupFilterColumn');
                            const lookupReturnColumn = record.getValue('LookupReturnColumn');
                            const defaultValueFormula = record.getValue('DefaultValueFormula');
                            const conditionalFormula = record.getValue('ConditionalFormula');
                            
                            // Get auto-fill confirmation setting
                            const requiresAutoFillConfirmation = record.getValue('RequiresAutoFillConfirmation');
                            
                            // Apply common properties
                            if (isRequired !== null && isRequired !== undefined) config.isRequired = isRequired;
                            if (editLock !== null && editLock !== undefined) config.editLock = editLock;
                            if (placeholder) config.placeholder = placeholder;
                            if (allowDirectTextInput !== null && allowDirectTextInput !== undefined) config.allowDirectTextInput = allowDirectTextInput;
                            if (restrictedValueMessage) config.restrictedValueMessage = restrictedValueMessage;
                            if (requiresAutoFillConfirmation !== null && requiresAutoFillConfirmation !== undefined) config.RequiresAutoFillConfirmation = requiresAutoFillConfirmation;
                            
                            // Apply type-specific configurations
                            if (editorType.toLowerCase() === 'text' || editorType.toLowerCase() === 'email' || editorType.toLowerCase() === 'url' || editorType.toLowerCase() === 'phone') {
                                if (maxLength) config.textConfig = { ...config.textConfig, maxLength };
                                if (isMultiline) config.textConfig = { ...config.textConfig, multiline: isMultiline };
                                if (validationPattern) config.textConfig = { ...config.textConfig, pattern: validationPattern };
                                if (patternErrorMessage) config.textConfig = { ...config.textConfig, patternError: patternErrorMessage };
                            }
                            else if (editorType.toLowerCase() === 'number') {
                                if (minValue !== null && minValue !== undefined) config.numberConfig = { ...config.numberConfig, min: minValue };
                                if (maxValue !== null && maxValue !== undefined) config.numberConfig = { ...config.numberConfig, max: maxValue };
                                if (stepValue !== null && stepValue !== undefined) config.numberConfig = { ...config.numberConfig, step: stepValue };
                            }
                            else if (editorType.toLowerCase() === 'currency') {
                                if (currencySymbol) config.currencyConfig = { ...config.currencyConfig, currencySymbol };
                                if (decimalPlaces !== null && decimalPlaces !== undefined) config.currencyConfig = { ...config.currencyConfig, decimalPlaces };
                                if (minValue !== null && minValue !== undefined) config.currencyConfig = { ...config.currencyConfig, min: minValue };
                                if (maxValue !== null && maxValue !== undefined) config.currencyConfig = { ...config.currencyConfig, max: maxValue };
                            }
                            else if (editorType.toLowerCase() === 'dropdown') {
                                // Data-driven options. The DropdownOptions value can be:
                                //   blank / "@data" / "@odata" / "@grid" / "@auto"
                                //        -> derive distinct values from THIS grid's matching column
                                //   "@data:SourceName"        -> derive from another control instance
                                //        (identified by its DataSourceName), using the same column key
                                //   "@data:SourceName.Column" -> derive from another instance, explicit column
                                // Cross-grid reads a sibling control's in-memory cache from the shared
                                // registry, so no extra server query is made (helpful in low-connectivity
                                // scenarios). It falls back to an empty list - typing is still allowed when
                                // AllowDirectTextInput is on - if the sibling has not loaded yet. Any other
                                // value is parsed as a static option list exactly as before.
                                const optionsRaw = (dropdownOptions ?? '').toString().trim();
                                const lower = optionsRaw.toLowerCase();
                                const dataPrefixes = ['@data', '@odata', '@grid', '@auto'];
                                const isDataToken =
                                    optionsRaw === '' ||
                                    dataPrefixes.some((p) => lower === p || lower.startsWith(p + ':'));

                                if (isDataToken) {
                                    config.optionsFromData = true;
                                    const colonIdx = optionsRaw.indexOf(':');
                                    if (colonIdx >= 0) {
                                        // Cross-grid reference: "@data:Source" or "@data:Source.Column"
                                        const ref = optionsRaw.substring(colonIdx + 1).trim();
                                        const dotIdx = ref.indexOf('.');
                                        const sourceName = (dotIdx >= 0 ? ref.substring(0, dotIdx) : ref).trim();
                                        const sourceColumn = dotIdx >= 0 ? ref.substring(dotIdx + 1).trim() : columnKey;
                                        if (sourceName) {
                                            config.dataColumnKey = sourceColumn;
                                            config.getDropdownOptions = sharedOptions(sourceName, sourceColumn);
                                        }
                                    } else {
                                        // This grid's own column
                                        config.dataColumnKey = columnKey;
                                        config.getDropdownOptions = dataOptions(columnKey);
                                    }
                                } else {
                                    try {
                                        // Support both JSON array and comma-separated values
                                        let options: any[];
                                        if (optionsRaw.startsWith('[') && optionsRaw.endsWith(']')) {
                                            options = JSON.parse(optionsRaw);
                                        } else {
                                            options = optionsRaw.split(',').map((opt: string) => opt.trim());
                                        }
                                        
                                        // Convert to the expected format
                                        config.dropdownOptions = options.map((opt: any) => {
                                            if (typeof opt === 'string' || typeof opt === 'number') {
                                                return { key: String(opt), text: String(opt) };
                                            }
                                            return opt; // Already in correct format
                                        });
                                    } catch (error) {
                                        console.warn(`⚠️ Error parsing dropdown options for ${columnKey}:`, error);
                                    }
                                }
                            }
                            else if (editorType.toLowerCase() === 'date') {
                                if (showTime !== null && showTime !== undefined) config.dateTimeConfig = { ...config.dateTimeConfig, showTime };
                                if (dateFormat) config.dateTimeConfig = { ...config.dateTimeConfig, format: dateFormat };
                            }
                            else if (editorType.toLowerCase() === 'rating') {
                                if (maxRating) config.ratingConfig = { ...config.ratingConfig, max: maxRating };
                                if (allowZeroRating !== null && allowZeroRating !== undefined) config.ratingConfig = { ...config.ratingConfig, allowZero: allowZeroRating };
                            }
                            else if (editorType.toLowerCase() === 'slider') {
                                if (minValue !== null && minValue !== undefined) config.sliderConfig = { ...config.sliderConfig, min: minValue };
                                if (maxValue !== null && maxValue !== undefined) config.sliderConfig = { ...config.sliderConfig, max: maxValue };
                                if (stepValue !== null && stepValue !== undefined) config.sliderConfig = { ...config.sliderConfig, step: stepValue };
                                if (showSliderValue !== null && showSliderValue !== undefined) config.sliderConfig = { ...config.sliderConfig, showValue: showSliderValue };
                            }
                            
                            // Process conditional logic configuration
                            if (dependsOn || lookupDataSource || defaultValueFormula || conditionalFormula || lookupMappingSource) {
                                config.conditional = {};
                                
                                if (dependsOn) {
                                    config.conditional.dependsOn = dependsOn;
                                }
                                
                                // Add lookup mapping if configured
                                if (lookupMappingSource && lookupMappingFilter && lookupMappingReturn) {
                                    config.conditional.lookupMapping = {
                                        dataSource: lookupMappingSource,
                                        filterColumn: lookupMappingFilter,
                                        returnColumn: lookupMappingReturn
                                    };
                                }
                                
                                // Add main lookup if configured
                                if (lookupDataSource && lookupFilterColumn && lookupReturnColumn) {
                                    config.conditional.lookup = {
                                        dataSource: lookupDataSource,
                                        filterColumn: lookupFilterColumn,
                                        returnColumn: lookupReturnColumn
                                    };
                                }
                                
                                if (defaultValueFormula) {
                                    config.conditional.defaultValueFormula = defaultValueFormula;
                                }
                                
                                if (conditionalFormula) {
                                    config.conditional.formula = conditionalFormula;
                                }
                            }
                            
                            columnEditorMapping[columnKey] = config;
                        }
                    }
                    
                } catch (error) {
                    console.warn('⚠️ Error processing table-based editor configuration:', error);
                }
            }
            
            // Priority 2: Power Apps FX formulas (existing implementation)
            else if ((context.parameters as any).ColumnEditorFormulas?.raw) {
                const formulasProperty = (context.parameters as any).ColumnEditorFormulas;
                try {
                    columnEditorMapping = PowerAppsFxColumnEditorParser.parseSimpleFormulaString(
                        formulasProperty.raw
                    );
                } catch (error) {
                    console.warn('⚠️ Error parsing Power Apps FX formulas:', error);
                }
            }
            // Priority 3: Legacy JSON configuration (backward compatibility)
            else if ((context.parameters as any).ColumnEditorConfig?.raw) {
                try {
                    columnEditorMapping = JSON.parse((context.parameters as any).ColumnEditorConfig.raw);
                } catch (error) {
                    console.warn('⚠️ Invalid column editor configuration JSON:', error);
                }
            }
        }
            
    return columnEditorMapping;
}
