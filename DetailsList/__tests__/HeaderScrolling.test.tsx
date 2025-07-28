import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { VirtualizedEditableGrid } from '../components/VirtualizedEditableGrid';

describe('Header Scrolling and Height Flexing', () => {
    const mockColumns = [
        { key: 'col1', name: 'Column 1', fieldName: 'col1', minWidth: 100 },
        { key: 'col2', name: 'Column 2', fieldName: 'col2', minWidth: 100 },
        { key: 'col3', name: 'Column 3', fieldName: 'col3', minWidth: 100 },
    ];

    const mockItems = [
        { id: '1', col1: 'value1', col2: 'value2', col3: 'value3' },
        { id: '2', col1: 'value4', col2: 'value5', col3: 'value6' },
    ];

    test('should render with proper height and container structure', () => {
        render(
            <VirtualizedEditableGrid
                items={mockItems}
                columns={mockColumns}
                height="100%"
                width="100%"
                enableInlineEditing={true}
            />
        );

        const container = document.querySelector('.virtualized-editable-grid-container');
        expect(container).toBeInTheDocument();
        
        // Check that container has proper flex layout
        const computedStyle = window.getComputedStyle(container!);
        expect(computedStyle.display).toBe('flex');
        expect(computedStyle.flexDirection).toBe('column');
    });

    test('should have header with proper overflow settings', () => {
        render(
            <VirtualizedEditableGrid
                items={mockItems}
                columns={mockColumns}
                height="100%"
                width="100%"
                enableInlineEditing={true}
            />
        );

        const header = document.querySelector('.virtualized-header');
        expect(header).toBeInTheDocument();
        
        // Check that header has proper overflow settings for scroll sync
        const computedStyle = window.getComputedStyle(header!);
        expect(computedStyle.overflowX).toBe('hidden');
        expect(computedStyle.flexShrink).toBe('0');
    });

    test('should have grid body with proper flex settings', () => {
        render(
            <VirtualizedEditableGrid
                items={mockItems}
                columns={mockColumns}
                height="100%"
                width="100%"
                enableInlineEditing={true}
            />
        );

        const gridBody = document.querySelector('.virtualized-grid-body');
        expect(gridBody).toBeInTheDocument();
        
        // Check that grid body has proper flex settings
        const computedStyle = window.getComputedStyle(gridBody!);
        expect(computedStyle.flex).toBe('1');
        expect(computedStyle.overflow).toBe('auto');
        expect(computedStyle.minHeight).toBe('0px');
    });
});
