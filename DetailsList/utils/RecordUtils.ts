import { RecordsColumns } from '../ManifestConstants';

/**
 * Get the unique key for a record, using custom key if available, otherwise the record ID
 */
export function getRecordKey(record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord): string {
    const customKey = record.getValue(RecordsColumns.RecordKey);
    return customKey ? customKey.toString() : record.getRecordId();
}
