/* istanbul ignore file */

export class MockContext<T> implements ComponentFramework.Context<T> {
    constructor(parameters: T) {
        this.parameters = parameters;
        this.mode = {
            allocatedHeight: -1,
            allocatedWidth: -1,
            isControlDisabled: false,
            isVisible: true,
            label: '',
            setControlState: jest.fn(),
            setFullScreen: jest.fn(),
            trackContainerResize: jest.fn(),
        };
        this.client = {
            disableScroll: false,
            getClient: jest.fn(),
            getFormFactor: jest.fn(),
            isOffline: jest.fn(),
            isNetworkAvailable: jest.fn(),
        };

        // Canvas apps currently assigns a positive tab-index
        // so we must use this property to assign a positive tab-index also
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).accessibility = { assignedTabIndex: 0 };
    }
    client: ComponentFramework.Client;
    device: ComponentFramework.Device;
    factory: ComponentFramework.Factory;
    formatting: ComponentFramework.Formatting;
    mode: ComponentFramework.Mode;
    navigation: ComponentFramework.Navigation;
    resources: ComponentFramework.Resources;
    userSettings: ComponentFramework.UserSettings;
    utils: ComponentFramework.Utility;
    webAPI: ComponentFramework.WebApi;
    parameters: T;
    updatedProperties: string[] = [];
    events: IEventBag;
}

export class MockState implements ComponentFramework.Dictionary {}

export class MockStringProperty implements ComponentFramework.PropertyTypes.StringProperty {
    constructor(raw?: string | null, formatted?: string | undefined) {
        this.raw = raw ?? null;
        this.formatted = formatted;
    }
    raw: string | null;
    attributes?: ComponentFramework.PropertyHelper.FieldPropertyMetadata.StringMetadata | undefined;
    error: boolean;
    errorMessage: string;
    formatted?: string | undefined;
    security?: ComponentFramework.PropertyHelper.SecurityValues | undefined;
    type: string;
}

export class MockWholeNumberProperty implements ComponentFramework.PropertyTypes.WholeNumberProperty {
    constructor(raw?: number | null, formatted?: string | undefined) {
        this.raw = raw ?? null;
        this.formatted = formatted;
    }
    attributes?: ComponentFramework.PropertyHelper.FieldPropertyMetadata.WholeNumberMetadata | undefined;
    raw: number | null;
    error: boolean;
    errorMessage: string;
    formatted?: string | undefined;
    security?: ComponentFramework.PropertyHelper.SecurityValues | undefined;
    type: string;
}

export class MockEnumProperty<T> implements ComponentFramework.PropertyTypes.EnumProperty<T> {
    constructor(raw?: T, type?: string) {
        if (raw) this.raw = raw;
        if (type) this.type = type;
    }
    type: string;
    raw: T;
    error: boolean = false;
    errorMessage: string = '';
    security?: ComponentFramework.PropertyHelper.SecurityValues | undefined;
    attributes?: ComponentFramework.PropertyHelper.FieldPropertyMetadata.OptionSetMetadata | undefined;
}

export class MockTwoOptionsProperty implements ComponentFramework.PropertyTypes.TwoOptionsProperty {
    constructor(raw?: boolean) {
        if (raw) this.raw = raw;
    }
    raw: boolean;
    attributes?: ComponentFramework.PropertyHelper.FieldPropertyMetadata.TwoOptionMetadata | undefined;
    error: boolean;
    errorMessage: string;
    formatted?: string | undefined;
    security?: ComponentFramework.PropertyHelper.SecurityValues | undefined;
    type: string;
}

export class MockDateTimeProperty implements ComponentFramework.PropertyTypes.DateTimeProperty {
    constructor(raw?: Date) {
        if (raw) this.raw = raw;
    }
    raw: Date;
    attributes?: ComponentFramework.PropertyHelper.FieldPropertyMetadata.DateTimeMetadata | undefined;
    error: boolean;
    errorMessage: string;
    formatted?: string | undefined;
    security?: ComponentFramework.PropertyHelper.SecurityValues | undefined;
    type: string;
}

export declare type IEventBag = Record<string, () => void>;
