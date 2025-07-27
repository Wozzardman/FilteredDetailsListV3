export const enum RecordsColumns {
    RecordKey = 'RecordsKey',
    RecordCanSelect = 'RecordsCanSelect',
    RecordSelected = 'RecordsSelected',
}

// Legacy compatibility - Items dataset properties
export const enum ItemsColumns {
    ItemKey = 'ItemKey',
    ItemCanSelect = 'ItemCanSelect',
    ItemSelected = 'ItemSelected',
}

export const enum ColumnsColumns {
    ColDisplayName = 'ColDisplayName',
    ColName = 'ColName',
    ColWidth = 'ColWidth',
    ColSortable = 'ColSortable',
    ColSortBy = 'ColSortBy',
    ColHorizontalAlign = 'ColHorizontalAlign',
    ColVerticalAlign = 'ColVerticalAlign',
    ColMultiLine = 'ColMultiLine',
    ColIsBold = 'ColIsBold',
    ColTagColorColumn = 'ColTagColorColumn',
    ColTagBorderColorColumn = 'ColTagBorderColorColumn',
    ColResizable = 'ColResizable',
    ColHeaderPaddingLeft = 'ColHeaderPaddingLeft',
    ColCellType = 'ColCellType',
    ColShowAsSubTextOf = 'ColShowAsSubTextOf',
    ColPaddingTop = 'ColPaddingTop',
    ColPaddingLeft = 'ColPaddingLeft',
    ColLabelAbove = 'ColLabelAbove',
    ColMultiValueDelimiter = 'ColMultiValueDelimiter',
    ColFirstMultiValueBold = 'ColFirstMultiValueBold',
    ColInlineLabel = 'ColInlineLabel',
    ColHideWhenBlank = 'ColHideWhenBlank',
    ColSubTextRow = 'ColSubTextRow',
    ColAriaTextColumn = 'ColAriaTextColumn',
    ColCellActionDisabledColumn = 'ColCellActionDisabledColumn',
    ColImageWidth = 'ColImageWidth',
    ColImagePadding = 'ColImagePadding',
    ColRowHeader = 'ColRowHeader',
    ColFilterable = 'ColFilterable',
    ColFilterType = 'ColFilterType',
}

export const enum InputProperties {
    InputEvent = 'InputEvent',
    LargeDatasetPaging = 'LargeDatasetPaging',
    RaiseOnRowSelectionChangeEvent = 'RaiseOnRowSelectionChangeEvent',
    AlternateRowColor = 'AlternateRowColor',
    SelectionAlwaysVisible = 'SelectionAlwaysVisible',
}

export const enum OutputProperties {
    PageNumber = 'PageNumber',
    HasNextPage = 'HasNextPage',
    HasPreviousPage = 'HasPreviousPage',
    TotalRecords = 'TotalRecords',
    TotalPages = 'TotalPages',
}

export const enum InputEvents {
    SetFocus = 'SetFocus',
    SetFocusOnRow = 'SetFocusOnRow',
    SetFocusOnRowSetSelection = 'SetFocusOnRowSetSelection',
    ClearSelection = 'ClearSelection',
    SetSelection = 'SetSelection',
    SetFocusOnHeader = 'SetFocusOnHeader',
    LoadNextPage = 'LoadNextPage',
    LoadPreviousPage = 'LoadPreviousPage',
    LoadFirstPage = 'LoadFirstPage',
}

export const enum OutputEvents {
    Sort = 'Sort',
    CellAction = 'CellAction',
    OnRowSelectionChange = 'OnRowSelectionChange',
    Filter = 'Filter',
    FilterChanged = 'FilterChanged',
}

export const enum SortDirection {
    Ascending = '0',
    Descending = '1',
}

export const enum CellTypes {
    Expand = 'expand',
    Tag = 'tag',
    Image = 'image',
    ClickableImage = 'clickableimage',
    IndicatorTag = 'indicatortag',
    Link = 'link',
}

export const enum FilterTypes {
    Text = 'text',
    Number = 'number',
    Date = 'date',
    Choice = 'choice',
    Boolean = 'boolean',
}

export const enum FilterOperators {
    Equals = 'eq',
    NotEquals = 'ne',
    Contains = 'contains',
    StartsWith = 'startswith',
    EndsWith = 'endswith',
    GreaterThan = 'gt',
    GreaterThanOrEqual = 'gte',
    LessThan = 'lt',
    LessThanOrEqual = 'lte',
    IsEmpty = 'isempty',
    IsNotEmpty = 'isnotempty',
    In = 'in',
    NotIn = 'notin',
}
