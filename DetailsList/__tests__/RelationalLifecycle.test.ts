/** @jest-environment node */
jest.mock('@fluentui/react', () => ({ SelectionMode: { none: 0, single: 1, multiple: 2 }, Selection: jest.fn() }));
jest.mock('../components/UltimateEnterpriseGrid', () => ({ UltimateEnterpriseGrid: () => null }));
jest.mock('../components/LoadingOverlay', () => ({ LoadingOverlay: () => null }));
jest.mock('../relational/RelationalGrid', () => ({ RelationalGrid: () => null }));
jest.mock('../performance/PerformanceMonitor', () => ({ performanceMonitor: { startMeasure: () => () => undefined } }));

import { ParentChildDetailsList } from '../index';
import { MockContext } from '../__mocks__/mock-context';
import { getMockParameters } from '../__mocks__/mock-parameters';

describe('Relational control lifecycle', () => {
    it.each([false, true])('returns initial outputs before updateView with placeholder saving=%s', enabled => {
        const context = new MockContext(getMockParameters());
        context.parameters.EnableParentChild.raw = true;
        context.parameters.AddNewRowsSave.raw = enabled;
        context.parameters.ChildAddNewRowsSave.raw = enabled;
        const control = new ParentChildDetailsList();
        control.init(context, jest.fn());
        expect(control.getOutputs()).toMatchObject({ PendingChanges: '[]', ChildPendingChanges: '[]', ChangeCount: 0, RelationshipStatus: 'unresolved' });
        control.destroy();
    });

    it('returns outputs immediately when child mode is enabled before its first update', () => {
        const context = new MockContext(getMockParameters());
        const control = new ParentChildDetailsList();
        control.init(context, jest.fn());
        context.parameters.EnableParentChild.raw = true;
        expect(control.getOutputs().ChildPendingChanges).toBe('[]');
        expect(() => control.updateView(context)).not.toThrow();
        expect(control.getOutputs().HasPendingChanges).toBe(false);
        control.destroy();
    });
});
