import { IColumn } from '@fluentui/react';
import { FilterTypes } from './ManifestConstants';

export interface IGridColumn extends IColumn {
    isBold?: boolean;
    tagColor?: string;
    tagBorderColor?: string;
    headerPaddingLeft?: number;
    cellType?: string;
    showAsSubTextOf?: string;
    subTextRow?: number;
    childColumns?: IGridColumn[];
    isLabelAbove?: boolean;
    paddingLeft?: number;
    paddingTop?: number;
    multiValuesDelimiter?: string;
    firstMultiValueBold?: boolean;
    inlineLabel?: string;
    hideWhenBlank?: boolean;
    ariaTextColumn?: string;
    cellActionDisabledColumn?: string;
    imageWidth?: string;
    imagePadding?: number;
    verticalAligned?: string;
    horizontalAligned?: string;
    // Header alignment properties
    headerHorizontalAligned?: string;
    headerVerticalAligned?: string;
    // Multiline display property
    isMultiline?: boolean;
    // Filter properties
    isFilterable?: boolean;
    filterType?: FilterTypes;
    hasActiveFilter?: boolean;
    
    // Drag & Drop properties
    isDragDisabled?: boolean;
    dragData?: any;
    
    // Data type for formatting
    dataType?: string;
    
    // Custom width property for proper column sizing
    defaultWidth?: number;
}

export interface ComponentProps {
    width?: number;
    height?: number;
    itemHeight?: number;
    columns: ComponentFramework.PropertyHelper.DataSetApi.Column[];
    records: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord[];
    hasMore?: boolean;
    loadMore?: () => void;
    setSelection?: (ids: string[]) => void;
    openRecord?: (id: string) => void;
    totalRecords?: number;
    
    // Performance & Loading
    enableVirtualization?: boolean;
    isLoading?: boolean;
    
    // Styling
    enableAlternatingColors?: boolean;
    evenRowColor?: string;
    oddRowColor?: string;
    
    // Excel Clipboard
    enableExcelClipboard?: boolean;
    onClipboardOperation?: (operation: 'copy' | 'paste', data?: any) => void;
}

export interface GridState {
    isLoading: boolean;
    error?: string;
    selectedIds: Set<string>;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    
    // Clipboard state
    clipboardData?: {
        operation: 'copy' | 'cut';
        data: any[];
        timestamp: number;
    };
}

export interface LoadingState {
    isLoading: boolean;
    operation?: 'loading' | 'saving' | 'selecting' | 'reordering' | 'pasting';
    progress?: number;
    message?: string;
}

export interface ClipboardConfig {
    enableExcelClipboard: boolean;
    preserveFormatting: boolean;
    showPreview: boolean;
    maxRows: number;
    supportedFormats: string[];
}
