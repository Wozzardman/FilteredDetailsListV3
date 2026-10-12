/** @jest-environment node */

import { ParentChildDetailsList } from '../index';
import { IInputs } from '../generated/ManifestTypes';
import { AutoUpdateManager } from '../services/AutoUpdateManager';
import * as React from 'react';
import { act, create } from 'react-test-renderer';
import { IUltimateEnterpriseGridProps } from '../components/UltimateEnterpriseGrid';

jest.mock('@fluentui/react', () => ({ SelectionMode: { none: 0, single: 1, multiple: 2 } }));
jest.mock('../components/UltimateEnterpriseGrid', () => ({ UltimateEnterpriseGrid: () => null }));
jest.mock('../components/LoadingOverlay', () => ({ LoadingOverlay: () => null }));
jest.mock('../performance/PerformanceMonitor', () => ({ performanceMonitor: {} }));
jest.mock('@fluentui/react/lib/TextField', () => ({ TextField: 'input' }));
jest.mock('@fluentui/react/lib/Button', () => ({ DefaultButton: 'button', PrimaryButton: 'button', IconButton: 'button' }));
jest.mock('@fluentui/react/lib/Dialog', () => ({ Dialog: 'dialog', DialogFooter: 'footer', DialogType: {} }));
jest.mock('@fluentui/react/lib/Stack', () => ({ Stack: 'div' }));
jest.mock('@fluentui/react/lib/Text', () => ({ Text: 'span' }));
jest.mock('@fluentui/react/lib/ContextualMenu', () => ({ ContextualMenu: 'menu' }));
jest.mock('@fluentui/react/lib/DetailsList', () => ({ DetailsList: 'div' }));
jest.mock('../virtualization/UltraVirtualizationEngine', () => ({ useUltraVirtualization: () => ({}) }));
jest.mock('../services/DataExportService', () => ({ DataExportService: { getInstance: () => ({}) } }));
jest.mock('../components/VirtualizedEditableGrid', () => ({ VirtualizedEditableGrid: 'table' }));
jest.mock('../css/SelectionMode.css', () => ({}));

const { UltimateEnterpriseGrid } = jest.requireActual<{ UltimateEnterpriseGrid: React.FC<IUltimateEnterpriseGridProps> }>(
    '../components/UltimateEnterpriseGrid'
);

interface SaveHarness {
    createNewRow: (template: Record<string, unknown>) => void;
    handleSaveButtonClick: () => void;
    handleCommitTrigger: (context: ComponentFramework.Context<IInputs>) => void;
    pendingChanges: Map<string, Map<string, unknown>>;
    autoUpdateManager: AutoUpdateManager;
}

describe('Saving placeholder rows', () => {
    let control: ParentChildDetailsList;
    let save: SaveHarness;

    beforeEach(() => {
        jest.useFakeTimers('legacy');
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        control = new ParentChildDetailsList();
        control.context = {
            parameters: {
                records: { paging: { totalResultCount: 0, pageSize: 100 } },
                DataSourceName: { raw: 'MasterWeldData' },
                AddNewRowsSave: { raw: true },
                CommitTrigger: { raw: '' },
            },
        } as unknown as ComponentFramework.Context<IInputs>;
        control.notifyOutputChanged = jest.fn();
        save = control as unknown as SaveHarness;
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test.each([true, false])('clears submitted placeholders with AddNewRowsSave=%s', addNewRowsSave => {
        control.context.parameters.AddNewRowsSave.raw = addNewRowsSave;
        [834, 835, 836].forEach(WeldNum => save.createNewRow({ WeldNum }));
        const cachedPayload = JSON.parse(control.getOutputs().PendingChanges || '[]');
        expect(cachedPayload.map((row: { changes: { WeldNum: number } }) => row.changes.WeldNum))
            .toEqual([834, 835, 836]);
        expect(save.autoUpdateManager.getPendingChangesSummary().totalChanges).toBe(0);

        save.handleSaveButtonClick();

        const outputs = control.getOutputs();
        expect(outputs.EventName).toBe('ButtonEvent');
        expect(outputs.ButtonEventName).toBe('Save Changes');
        expect(outputs.PendingChanges).toBe('[]');
        expect(outputs.HasPendingChanges).toBe(false);
        expect(save.pendingChanges.size).toBe(0);
        expect(control.notifyOutputChanged).toHaveBeenCalled();
    });

    test('clears placeholders and edited records together', () => {
        save.createNewRow({ WeldNum: 834 });
        save.autoUpdateManager.registerRecord('existing', { originalValues: { Comments: '' } });
        save.autoUpdateManager.updateField('existing', 'Comments', 'Updated');
        save.pendingChanges.set('existing', new Map([['Comments', 'Updated']]));

        save.handleSaveButtonClick();

        expect(control.getOutputs().PendingChanges).toBe('[]');
        expect(save.autoUpdateManager.getPendingChangesSummary().totalChanges).toBe(0);
    });

    test('keeps rows added after the save handoff pending', () => {
        save.createNewRow({ WeldNum: 834 });
        save.handleSaveButtonClick();
        save.createNewRow({ WeldNum: 835 });

        const rows = JSON.parse(control.getOutputs().PendingChanges || '[]');
        expect(rows).toHaveLength(1);
        expect(rows[0].changes.WeldNum).toBe(835);
        expect(rows[0].changes.isNewRow).toBe(true);
    });

    test('also clears untouched placeholders through CommitTrigger', () => {
        save.createNewRow({ WeldNum: 834 });
        control.context.parameters.CommitTrigger.raw = 'commit-1';

        save.handleCommitTrigger(control.context);

        expect(control.getOutputs().HasPendingChanges).toBe(false);
        expect(save.pendingChanges.size).toBe(0);
    });

    test.each([true, false, undefined])('preserves save-button behavior with AddNewRowsSave=%s', async addNewRowsSave => {
        [834, 835, 836].forEach(WeldNum => save.createNewRow({ WeldNum }));
        const items = Array.from(save.pendingChanges, ([key, changes]) => ({ key, ...Object.fromEntries(changes) }));
        const props: IUltimateEnterpriseGridProps = {
            items,
            columns: [{ key: 'Comments', fieldName: 'Comments', name: 'Comments', minWidth: 100 }],
            addNewRowsSave,
            onCommitChanges: save.handleSaveButtonClick,
            onCellEdit: (item, column, value) => save.pendingChanges.get(item.key)?.set(column.key, value),
        };
        let renderer!: ReturnType<typeof create>;
        act(() => { renderer = create(React.createElement(UltimateEnterpriseGrid, props)); });
        const saveButtons = () => renderer.root.findAll(node =>
            node.type === 'button' && String(node.props.text).startsWith('Save Changes')
        );
        const grid = renderer.root.find(node => node.type === 'table');

        expect(saveButtons()).toHaveLength(addNewRowsSave ? 1 : 0);
        if (!addNewRowsSave) {
            act(() => { grid.props.onCellEdit(items[0].key, 'Comments', 'Updated'); });
            expect(saveButtons()).toHaveLength(1);
        }
        // Isolate the existing simulated commit service; exercise the real button and PCF cleanup.
        jest.spyOn(grid.props.changeManager, 'commitAllChanges').mockResolvedValue(undefined);
        const cachedPayload = JSON.parse(control.getOutputs().PendingChanges || '[]');
        expect(cachedPayload).toHaveLength(3);
        if (!addNewRowsSave) expect(cachedPayload[0].changes.Comments).toBe('Updated');

        await saveButtons()[0].props.onClick();
        act(() => { /* Flush effects after the asynchronous save callback. */ });

        expect(save.pendingChanges.size).toBe(0);
        expect(saveButtons()).toHaveLength(0);
        // Model the host refreshing saved records after the stored procedure finishes.
        const refreshedItems = items.map((item, index) => ({ ...item, key: `saved-${index}`, isNewRow: false }));
        act(() => { renderer.update(React.createElement(UltimateEnterpriseGrid, { ...props, items: refreshedItems })); });
        const refreshedGrid = renderer.root.find(node => node.type === 'table');
        expect(refreshedGrid.props.items).toHaveLength(3);
        expect(refreshedGrid.props.items.some((item: { isNewRow: boolean }) => item.isNewRow)).toBe(false);
        act(() => { renderer.unmount(); });
    });
});
