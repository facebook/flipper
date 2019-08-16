/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

// This has been taken from the old plugin.js and manually stripped of
// implementation so only the types remain.
// It's not generated using flowgen because the typescript def is slightly weaker
// than the original flow one. (Persisted State generic param being used
// in reducers etc.

declare module plugin {
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
}
