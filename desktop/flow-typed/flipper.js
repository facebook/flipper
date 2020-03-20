/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// This has been taken from the old plugin.js and manually stripped of
// implementation so only the types remain.
// It's not generated using flowgen because the typescript def is slightly weaker
// than the original flow one. (Persisted State generic param being used
// in reducers etc.

import type {KeyboardActions} from './MenuBar.js';
import type {App} from './App.js';
import type {Logger} from './fb-interfaces/Logger.js';
import type Client from './Client.js';
import type {Store, MiddlewareAPI} from './reducers/index.js';
import type {MetricType} from './utils/exportMetrics.tsx';
import type {Node} from 'react';
import type BaseDevice from './devices/BaseDevice.js';
import type AndroidDevice from './devices/AndroidDevice';
import type IOSDevice from './devices/IOSDevice';

declare module 'flipper' {
  // This function is intended to be called from outside of the plugin.
  // If you want to `call` from the plugin use, this.client.call
  declare function callClient(
    client: Client,
    id: string,
  ): (string, ?Object) => Promise<Object>;

  declare interface PluginClient {
    // eslint-disable-next-line
    send(method: string, params?: Object): void;
    // eslint-disable-next-line
    call(method: string, params?: Object): Promise<any>;
    // eslint-disable-next-line
    subscribe(method: string, callback: (params: any) => void): void;
    // eslint-disable-next-line
    supportsMethod(method: string): Promise<boolean>;
  }

  declare type Logger = Logger;

  declare type PluginTarget = BaseDevice | Client;

  declare type Notification = {|
    id: string,
    title: string,
    message: string | Node,
    severity: 'warning' | 'error',
    timestamp?: number,
    category?: string,
    action?: string,
  |};

  declare type Props<T> = {
    logger: Logger,
    persistedState: T,
    setPersistedState: (state: $Shape<T>) => void,
    target: PluginTarget,
    deepLinkPayload: ?string,
    selectPlugin: (pluginID: string, deepLinkPayload: ?string) => boolean,
    isArchivedDevice: boolean,
    selectedApp: ?string,
  };

  declare class FlipperBasePlugin<
    State = *,
    Actions = *,
    PersistedState = *,
  > extends React.Component<Props<PersistedState>, State> {
    static title: ?string;
    static id: string;
    static icon: ?string;
    static gatekeeper: ?string;
    static entry: ?string;
    static bugs: ?{
      email?: string,
      url?: string,
    };
    static keyboardActions: ?KeyboardActions;
    static screenshot: ?string;
    static defaultPersistedState: PersistedState;
    static persistedStateReducer: ?(
      persistedState: PersistedState,
      method: string,
      data: Object,
    ) => $Shape<PersistedState>;
    static metricsReducer: ?(
      persistedState: PersistedState,
    ) => Promise<MetricType>;
    static exportPersistedState: ?(
      callClient: (string, ?Object) => Promise<Object>,
      persistedState: ?PersistedState,
      store: ?MiddlewareAPI,
    ) => Promise<?PersistedState>;
    static serializePersistedState: (
      persistedState: PersistedState,
      statusUpdate?: (msg: string) => void,
      idler?: Idler,
    ) => Promise<string>;
    static deserializePersistedState: (
      serializedString: string,
    ) => PersistedState;
    static getActiveNotifications: ?(
      persistedState: PersistedState,
    ) => Array<Notification>;
    static onRegisterDevice: ?(
      store: Store,
      baseDevice: BaseDevice,
      setPersistedState: (
        pluginKey: string,
        newPluginState: ?PersistedState,
      ) => void,
    ) => void;
    // forbid instance properties that should be static
    title: empty;
    id: empty;
    persist: empty;
    icon: empty;
    keyboardActions: empty;
    screenshot: empty;

    reducers: {
      [actionName: string]: (state: State, actionData: Object) => $Shape<State>,
    };
    app: App;
    onKeyboardAction: ?(action: string) => void;

    toJSON(): string;

    init(): void;
    teardown(): void;
    computeNotifications(props: Props<*>, state: State): Array<Notification>;
    // methods to be overridden by subclasses
    _init(): void;
    _teardown(): void;

    dispatchAction(actionData: Actions): void;
  }

  declare class FlipperDevicePlugin<
    S = *,
    A = *,
    P = *,
  > extends FlipperBasePlugin<S, A, P> {
    device: BaseDevice;

    constructor(props: Props<P>): void;

    _init(): void;

    _teardown(): void;

    static supportsDevice(device: BaseDevice): boolean;
  }

  declare class FlipperPlugin<S = *, A = *, P = *> extends FlipperBasePlugin<
    S,
    A,
    P,
  > {
    constructor(props: Props<P>): void;

    subscriptions: Array<{
      method: string,
      callback: Function,
    }>;

    client: PluginClient;
    realClient: Client;

    getDevice(): Promise<BaseDevice>;

    getAndroidDevice(): AndroidDevice;

    getIOSDevice(): IOSDevice;

    _teardown(): void;

    _init(): void;
  }

  declare var AndroidDevice: any;
  declare var BaseDevice: any;
  declare var Block: any;
  declare var Box: any;
  declare var Button: any;
  declare var ButtonGroup: any;
  declare var Checkbox: any;
  declare var CodeBlock: any;
  declare var Component: any;
  declare var ContextMenu: any;
  declare var DataDescription: any;
  declare var DataInspector: any;
  declare var DetailSidebar: any;
  declare var Device: any;
  declare var DeviceLogEntry: any;
  declare var Element: any;
  declare var ElementID: any;
  declare var ElementSearchResultSet: any;
  declare var ElementsInspector: any;
  declare var ErrorBlock: any;
  declare var ErrorBlockContainer: any;
  declare var Filter: any;
  declare var FlexBox: any;
  declare var FlexCenter: any;
  declare var FlexColumn: any;
  declare var FlexRow: any;
  declare var FlipperBasePlugin: any;
  declare var FlipperPlugin: any;
  declare var GK: any;
  declare var Glyph: any;
  declare var Heading: any;
  declare var HorizontalRule: any;
  declare var Input: any;
  declare var Label: any;
  declare var Link: any;
  declare var LoadingIndicator: any;
  declare var LogLevel: any;
  declare var ManagedDataInspector: any;
  declare var ManagedTable: any;
  declare var ManagedTable_immutable: any;
  declare var MarkerTimeline: any;
  declare var MetricType: any;
  declare var MiddlewareAPI: any;
  declare var OS: any;
  declare var Panel: any;
  declare var PureComponent: any;
  declare var SearchBox: any;
  declare var SearchIcon: any;
  declare var SearchInput: any;
  declare var Searchable: any;
  declare var SearchableProps: any;
  declare var SearchableTable: any;
  declare var SearchableTable_immutable: any;
  declare var Select: any;
  declare var Sheet: any;
  declare var Sidebar: any;
  declare var SidebarExtensions: any;
  declare var Spacer: any;
  declare var StackTrace: any;
  declare var StatusIndicator: any;
  declare var Store: any;
  declare var Tab: any;
  declare var TableBodyRow: any;
  declare var TableColumnOrder: any;
  declare var TableColumnSizes: any;
  declare var TableColumns: any;
  declare var TableHighlightedRows: any;
  declare var TableRowSortOrder: any;
  declare var TableRows: any;
  declare var TableRows_immutable: any;
  declare var Tabs: any;
  declare var Text: any;
  declare var Textarea: any;
  declare var ToggleButton: any;
  declare var Toolbar: any;
  declare var Tooltip: any;
  declare var Value: any;
  declare var VerticalRule: any;
  declare var View: any;
  declare var bufferToBlob: any;
  declare var clipboard: any;
  declare var colors: any;
  declare var constants: any;
  declare var createPaste: any;
  declare var createTablePlugin: any;
  declare var getPersistedState: any;
  declare var getPluginKey: any;
  declare var getStringFromErrorLike: any;
  declare var graphQLQuery: any;
  declare var isProduction: any;
  declare var keyframes: any;
  declare var renderValue: any;
  declare var shouldParseAndroidLog: any;
  declare var styled: any;
  declare var textContent: any;
}
