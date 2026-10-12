import { IGridColumn } from '../Component.types';
export function evaluateFormula(expression: string, items: any[], columns: IGridColumn[]): string {
    const getFieldValue = (item: any, fieldName: string) => {
        // Find the column definition for this field (case-insensitive)
        const fieldNameLower = fieldName.toLowerCase();
        const column = columns.find(col => 
            col.key?.toLowerCase() === fieldNameLower || 
            col.fieldName?.toLowerCase() === fieldNameLower ||
            col.name?.toLowerCase() === fieldNameLower ||
            (col.fieldName || col.key)?.toLowerCase() === fieldNameLower
        );
        
        const columnKey = column ? (column.fieldName || column.key) : fieldName;
        
        // Use the same data access pattern that works throughout the grid
        if (item && typeof item.getValue === 'function') {
            try {
                return item.getValue(columnKey);
            } catch (e) {
                return null;
            }
        } else {
            return item[columnKey];
        }
    };
        if (!expression || items.length === 0) return '0';
        
        try {
            // Parse common formula patterns
            const upperExpression = expression.toUpperCase().trim();
            
            // Handle SUM(fieldName) - e.g., "SUM(amount)"
            const sumMatch = upperExpression.match(/^SUM\(([^)]+)\)$/);
            if (sumMatch) {
                const fieldName = sumMatch[1].trim();
                const sum = items.reduce((acc, item) => {
                    const fieldValue = getFieldValue(item, fieldName);
                    const value = parseFloat(fieldValue) || 0;
                    return acc + value;
                }, 0);
                return sum.toLocaleString();
            }
            
            // Handle COUNT() or COUNT(condition) - e.g., "COUNT()", "COUNT(status='Active')"
            const countMatch = upperExpression.match(/^COUNT\(([^)]*)\)$/);
            if (countMatch) {
                // Use original expression to preserve case for condition parsing
                const originalCountMatch = expression.match(/^COUNT\(([^)]*)\)$/i);
                const condition = originalCountMatch ? originalCountMatch[1].trim() : '';
                if (!condition) {
                    return items.length.toString();
                } else {
                    // Simple condition parsing like "status='Active'" - preserve original case
                    const condMatch = condition.match(/^([^=<>!]+)(=|!=|<|>|<=|>=)(.+)$/);
                    if (condMatch) {
                        let field = condMatch[1].trim();
                        const operator = condMatch[2];
                        const value = condMatch[3].replace(/['"]/g, '').trim();
                        
                        // Find the actual column name (case-insensitive match)
                        const fieldLower = field.toLowerCase();
                        const matchingColumn = columns.find(col => 
                            col.key?.toLowerCase() === fieldLower || 
                            col.fieldName?.toLowerCase() === fieldLower ||
                            col.name?.toLowerCase() === fieldLower
                        );
                        
                        // Use the actual column field name if found
                        if (matchingColumn) {
                            field = matchingColumn.fieldName || matchingColumn.key;
                        }
                        
                        const count = items.filter(item => {
                            const itemValue = getFieldValue(item, field);
                            const itemValueStr = itemValue?.toString() || '';
                            
                            switch (operator) {
                                case '=': return itemValueStr === value;
                                case '!=': return itemValueStr !== value;
                                case '<': return parseFloat(itemValueStr) < parseFloat(value);
                                case '>': return parseFloat(itemValueStr) > parseFloat(value);
                                case '<=': return parseFloat(itemValueStr) <= parseFloat(value);
                                case '>=': return parseFloat(itemValueStr) >= parseFloat(value);
                                default: return false;
                            }
                        }).length;
                        return count.toString();
                    }
                }
            }
            
            // Handle AVG(fieldName) - e.g., "AVG(score)"
            const avgMatch = upperExpression.match(/^AVG\(([^)]+)\)$/);
            if (avgMatch) {
                const fieldName = avgMatch[1].trim();
                const values = items.map(item => {
                    const fieldValue = getFieldValue(item, fieldName);
                    return parseFloat(fieldValue) || 0;
                }).filter(v => !isNaN(v));
                if (values.length === 0) return '0';
                const average = values.reduce((acc, val) => acc + val, 0) / values.length;
                return average.toFixed(2);
            }
            
            // Handle MIN(fieldName) and MAX(fieldName)
            const minMatch = upperExpression.match(/^MIN\(([^)]+)\)$/);
            if (minMatch) {
                const fieldName = minMatch[1].trim();
                const values = items.map(item => {
                    const fieldValue = getFieldValue(item, fieldName);
                    return parseFloat(fieldValue) || 0;
                }).filter(v => !isNaN(v));
                return values.length > 0 ? Math.min(...values).toString() : '0';
            }
            
            const maxMatch = upperExpression.match(/^MAX\(([^)]+)\)$/);
            if (maxMatch) {
                const fieldName = maxMatch[1].trim();
                const values = items.map(item => {
                    const fieldValue = getFieldValue(item, fieldName);
                    return parseFloat(fieldValue) || 0;
                }).filter(v => !isNaN(v));
                return values.length > 0 ? Math.max(...values).toString() : '0';
            }
            
            return '0';
        } catch (error) {
            return 'Error';
        }
}
