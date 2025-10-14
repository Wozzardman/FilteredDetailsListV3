import React from 'react';
import { render, screen } from '@testing-library/react';
import { VirtualizedEditableGrid } from '../components/VirtualizedEditableGrid';
import { IGridColumn } from '../Component.types';

// Mock data for testing
const mockItems = [
    { id: '1', name: 'Test Item 1', longDescription: 'This is a very long description that should wrap when the column is narrow' },
    { id: '2', name: 'Test Item 2', longDescription: 'Another long description for testing text wrapping functionality' },
];

const mockColumns: IGridColumn[] = [
    {
        key: 'name',
        name: 'Name',
        fieldName: 'name',
        minWidth: 100,
        maxWidth: 150,
        isResizable: true,
    },
    {
        key: 'longDescription',
        name: 'This is a Very Long Column Header That Should Wrap When Enabled',
        fieldName: 'longDescription',
        minWidth: 150,
        maxWidth: 200,
        isResizable: true,
    },
];

describe('Header Text Wrapping', () => {
    test('should not wrap header text when enableHeaderTextWrapping is false', () => {
        render(
            <VirtualizedEditableGrid
                items={mockItems}
                columns={mockColumns}
                height="400px"
                width="100%"
                enableHeaderTextWrapping={false}
                enableInlineEditing={false}
            />
        );

        // Check that header text has nowrap style
        const headerText = screen.getByText('This is a Very Long Column Header That Should Wrap When Enabled');
        const computedStyle = window.getComputedStyle(headerText);
        expect(computedStyle.whiteSpace).toBe('nowrap');
        expect(computedStyle.textOverflow).toBe('ellipsis');
    });

    test('should wrap header text when enableHeaderTextWrapping is true', () => {
        render(
            <VirtualizedEditableGrid
                items={mockItems}
                columns={mockColumns}
                height="400px"
                width="100%"
                enableHeaderTextWrapping={true}
                enableInlineEditing={false}
            />
        );

        // Check that header text allows wrapping
        const headerText = screen.getByText('This is a Very Long Column Header That Should Wrap When Enabled');
        const computedStyle = window.getComputedStyle(headerText);
        expect(computedStyle.whiteSpace).toBe('normal');
        expect(computedStyle.wordWrap).toBe('break-word');
    });

    test('should have increased header height when wrapping is enabled', () => {
        const { container } = render(
            <VirtualizedEditableGrid
                items={mockItems}
                columns={mockColumns}
                height="400px"
                width="100%"
                enableHeaderTextWrapping={true}
                enableInlineEditing={false}
            />
        );

        const header = container.querySelector('.virtualized-header');
        expect(header).toBeInTheDocument();
        
        const computedStyle = window.getComputedStyle(header!);
        expect(computedStyle.minHeight).toBe('64px'); // Taller than default 48px
        expect(computedStyle.height).toBe('auto'); // Auto height for wrapping
    });

    test('should have standard header height when wrapping is disabled', () => {
        const { container } = render(
            <VirtualizedEditableGrid
                items={mockItems}
                columns={mockColumns}
                height="400px"
                width="100%"
                enableHeaderTextWrapping={false}
                enableInlineEditing={false}
            />
        );

        const header = container.querySelector('.virtualized-header');
        expect(header).toBeInTheDocument();
        
        const computedStyle = window.getComputedStyle(header!);
        expect(computedStyle.minHeight).toBe('48px'); // Standard height
        expect(computedStyle.height).toBe('48px'); // Fixed height
    });

    test('should adjust header cell padding when wrapping is enabled', () => {
        const { container } = render(
            <VirtualizedEditableGrid
                items={mockItems}
                columns={mockColumns}
                height="400px"
                width="100%"
                enableHeaderTextWrapping={true}
                enableInlineEditing={false}
            />
        );

        const headerCell = container.querySelector('.virtualized-header-cell');
        expect(headerCell).toBeInTheDocument();
        
        const computedStyle = window.getComputedStyle(headerCell!);
        expect(computedStyle.alignItems).toBe('flex-start'); // Top align when wrapping
        expect(computedStyle.padding).toBe('8px 12px 8px 8px'); // More vertical padding
    });

    test('should use center alignment when wrapping is disabled', () => {
        const { container } = render(
            <VirtualizedEditableGrid
                items={mockItems}
                columns={mockColumns}
                height="400px"
                width="100%"
                enableHeaderTextWrapping={false}
                enableInlineEditing={false}
            />
        );

        const headerCell = container.querySelector('.virtualized-header-cell');
        expect(headerCell).toBeInTheDocument();
        
        const computedStyle = window.getComputedStyle(headerCell!);
        expect(computedStyle.alignItems).toBe('center'); // Center align when not wrapping
        expect(computedStyle.padding).toBe('0px 12px 0px 8px'); // Standard padding
    });
});