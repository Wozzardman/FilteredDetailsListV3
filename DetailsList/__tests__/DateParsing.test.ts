import { tryParseUserDateInput, isDateLikeString } from '../components/EnhancedInlineEditor';

describe('Date Parsing Utilities', () => {
    describe('isDateLikeString', () => {
        it('should detect common date patterns', () => {
            expect(isDateLikeString('01/25/2025')).toBe(true);
            expect(isDateLikeString('1/25/2025')).toBe(true);
            expect(isDateLikeString('12-31-2025')).toBe(true);
            expect(isDateLikeString('2025-01-25')).toBe(true);
            expect(isDateLikeString('01.25.2025')).toBe(true);
            expect(isDateLikeString('1/1/25')).toBe(true);
        });

        it('should reject non-date patterns', () => {
            expect(isDateLikeString('hello world')).toBe(false);
            expect(isDateLikeString('123456')).toBe(false);
            expect(isDateLikeString('')).toBe(false);
            expect(isDateLikeString(null as any)).toBe(false);
        });
    });

    describe('tryParseUserDateInput', () => {
        it('should parse MM/DD/YYYY format', () => {
            const result = tryParseUserDateInput('01/25/2025');
            expect(result).toBeInstanceOf(Date);
            expect(result?.getFullYear()).toBe(2025);
            expect(result?.getMonth()).toBe(0); // January (0-indexed)
            expect(result?.getDate()).toBe(25);
        });

        it('should parse M/D/YYYY format', () => {
            const result = tryParseUserDateInput('1/5/2025');
            expect(result).toBeInstanceOf(Date);
            expect(result?.getFullYear()).toBe(2025);
            expect(result?.getMonth()).toBe(0); // January
            expect(result?.getDate()).toBe(5);
        });

        it('should parse YYYY-MM-DD format', () => {
            const result = tryParseUserDateInput('2025-01-25');
            expect(result).toBeInstanceOf(Date);
            expect(result?.getFullYear()).toBe(2025);
            expect(result?.getMonth()).toBe(0); // January
            expect(result?.getDate()).toBe(25);
        });

        it('should handle 2-digit years correctly', () => {
            // Years 00-30 should be 20XX
            const result1 = tryParseUserDateInput('01/25/25');
            expect(result1?.getFullYear()).toBe(2025);

            // Years 31-99 should be 19XX  
            const result2 = tryParseUserDateInput('01/25/85');
            expect(result2?.getFullYear()).toBe(1985);
        });

        it('should reject invalid dates', () => {
            expect(tryParseUserDateInput('13/25/2025')).toBe(null); // Invalid month
            expect(tryParseUserDateInput('01/32/2025')).toBe(null); // Invalid day
            expect(tryParseUserDateInput('hello')).toBe(null); // Not a date
            expect(tryParseUserDateInput('')).toBe(null); // Empty string
        });

        it('should validate date component ranges', () => {
            expect(tryParseUserDateInput('00/25/2025')).toBe(null); // Month 0
            expect(tryParseUserDateInput('13/25/2025')).toBe(null); // Month 13
            expect(tryParseUserDateInput('01/00/2025')).toBe(null); // Day 0
            expect(tryParseUserDateInput('01/32/2025')).toBe(null); // Day 32
        });
    });
});
