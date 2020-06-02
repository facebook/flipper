/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {KeyboardActions} from './MenuBar';
import {App} from './App';
import {Logger} from './fb-interfaces/Logger';
import Client from './Client';
import {Store} from './reducers/index';
import {MetricType} from './utils/exportMetrics';
import {ReactNode, Component} from 'react';
import BaseDevice from './devices/BaseDevice';
import {serialize, deserialize} from './utils/serialization';
import {Idler} from './utils/Idler';
import {StaticView} from './reducers/connections';
import {State as ReduxState} from './reducers';
import {DEFAULT_MAX_QUEUE_SIZE} from './reducers/pluginMessageQueue';
type Parameters = {[key: string]: any};

// This function is intended to be called from outside of the plugin.
// If you want to `call` from the plugin use, this.client.call
export function callClient(
  client: Client,
  id: string,
): (method: string, params: Parameters) => Promise<any> {
  return (method, params) => client.call(id, method, false, params);
}

// This function is intended to be called from outside of the plugin.
// If you want to `supportsMethod` from the plugin use, this.client.supportsMethod
export function supportsMethod(
  client: Client,
  id: string,
): (method: string) => Promise<boolean> {
  return (method) => client.supportsMethod(id, method);
}

export interface PluginClient {
  // eslint-disable-next-line
  send(method: string, params?: Parameters): void;
  // eslint-disable-next-line
  call(method: string, params?: Parameters): Promise<any>;
  // eslint-disable-next-line
  subscribe(method: string, callback: (params: any) => void): void;
  // eslint-disable-next-line
  supportsMethod(method: string): Promise<boolean>;
}

type PluginTarget = BaseDevice | Client;

export type Notification = {
  id: string;
  title: string;
  message: string | ReactNode;
  severity: 'warning' | 'error';
  timestamp?: number;
  category?: string;
  action?: string;
};

export type Props<T> = {
  logger: Logger;
  persistedState: T;
  setPersistedState: (state: Partial<T>) => void;
  target: PluginTarget;
  deepLinkPayload: string | null;
  selectPlugin: (pluginID: string, deepLinkPayload: string | null) => boolean;
  isArchivedDevice: boolean;
  selectedApp: string | null;
  setStaticView: (payload: StaticView) => void;
};

export type BaseAction = {
  type: string;
};

export type PersistedStateReducer = (
  persistedState: StaticPersistedState,
  method: string,
  data: any,
) => StaticPersistedState;

type StaticPersistedState = any;

export abstract class FlipperBasePlugin<
  State,
  Actions extends BaseAction,
  PersistedState
> extends Component<Props<PersistedState>, State> {
  abstract ['constructor']: any;
  static title: string | null = null;
  static category: string | null = null;
  static id: string = '';
  static version: string = '';
  static icon: string | null = null;
  static gatekeeper: string | null = null;
  static entry: string | null = null;
  static bugs: {
    email?: string;
    url?: string;
  } | null = null;
  static keyboardActions: KeyboardActions | null;
  static screenshot: string | null;
  static defaultPersistedState: any;
  static persistedStateReducer: PersistedStateReducer | null;
  static maxQueueSize: number = DEFAULT_MAX_QUEUE_SIZE;
  static metricsReducer:
    | ((persistedState: StaticPersistedState) => Promise<MetricType>)
    | null;
  static exportPersistedState:
    | ((
        callClient: (method: string, params?: any) => Promise<any>,
        persistedState: StaticPersistedState | undefined,
        store: ReduxState | undefined,
        idler?: Idler,
        statusUpdate?: (msg: string) => void,
        supportsMethod?: (method: string) => Promise<boolean>,
      ) => Promise<StaticPersistedState | undefined>)
    | null;
  static getActiveNotifications:
    | ((persistedState: StaticPersistedState) => Array<Notification>)
    | null;
  static onRegisterDevice:
    | ((
        store: Store,
        baseDevice: BaseDevice,
        setPersistedState: (
          pluginKey: string,
          newPluginState: StaticPersistedState | null,
        ) => void,
      ) => void)
    | null;

  reducers: {
    [actionName: string]: (state: State, actionData: any) => Partial<State>;
  } = {};
  app: App | null = null;
  onKeyboardAction: ((action: string) => void) | undefined;

  toJSON() {
    return `<${this.constructor.name}#${this.constructor.id}>`;
  }

  // methods to be overriden by plugins
  init(): void {}

  static serializePersistedState: (
    persistedState: StaticPersistedState,
    statusUpdate?: (msg: string) => void,
    idler?: Idler,
    pluginName?: string,
  ) => Promise<string> = (
    persistedState: StaticPersistedState,
    statusUpdate?: (msg: string) => void,
    idler?: Idler,
    pluginName?: string,
  ) => {
    return serialize(
      persistedState,
      idler,
      statusUpdate,
      pluginName != null ? `Serializing ${pluginName}` : undefined,
    );
  };

  static deserializePersistedState: (
    serializedString: string,
  ) => StaticPersistedState = (serializedString: string) => {
    return deserialize(serializedString);
  };

  teardown(): void {}

  computeNotifications(
    _props: Props<PersistedState>,
    _state: State,
  ): Array<Notification> {
    return [];
  }

  // methods to be overridden by subclasses
  _init(): void {}

  _teardown(): void {}

  dispatchAction(actionData: Actions) {
    const action = this.reducers[actionData.type];
    if (!action) {
      throw new ReferenceError(`Unknown action ${actionData.type}`);
    }

    if (typeof action === 'function') {
      this.setState(action.call(this, this.state, actionData) as State);
    } else {
      throw new TypeError(`Reducer ${actionData.type} isn't a function`);
    }
  }
}

export class FlipperDevicePlugin<
  S,
  A extends BaseAction,
  P
> extends FlipperBasePlugin<S, A, P> {
  ['constructor']: typeof FlipperPlugin;
  device: BaseDevice;

  constructor(props: Props<P>) {
    super(props);
    this.device = props.target as BaseDevice;
  }

  _init() {
    this.init();
  }

  _teardown() {
    this.teardown();
  }

  static supportsDevice(_device: BaseDevice) {
    throw new Error(
      'supportsDevice is unimplemented in FlipperDevicePlugin class',
    );
  }
}

export class FlipperPlugin<
  S,
  A extends BaseAction,
  P
> extends FlipperBasePlugin<S, A, P> {
  ['constructor']: typeof FlipperPlugin;
  constructor(props: Props<P>) {
    super(props);
    // @ts-ignore constructor should be assigned already
    const {id} = this.constructor;
    this.subscriptions = [];
    this.realClient = props.target as Client;
    this.client = {
      call: (method, params) => this.realClient.call(id, method, true, params),
      send: (method, params) => this.realClient.send(id, method, params),
      subscribe: (method, callback) => {
        this.subscriptions.push({
          method,
          callback,
        });
        this.realClient.subscribe(id, method, callback);
      },
      supportsMethod: (method) => this.realClient.supportsMethod(id, method),
    };
  }

  subscriptions: Array<{
    method: string;
    callback: Function;
  }>;

  client: PluginClient;
  realClient: Client;

  getDevice(): Promise<BaseDevice> {
    return this.realClient.device;
  }

  _teardown() {
    // automatically unsubscribe subscriptions
    const pluginId = this.constructor.id;
    for (const {method, callback} of this.subscriptions) {
      this.realClient.unsubscribe(pluginId, method, callback);
    }
    // run plugin teardown
    this.teardown();
    if (
      this.realClient.connected &&
      !this.realClient.isBackgroundPlugin(pluginId)
    ) {
      this.realClient.deinitPlugin(pluginId);
    }
  }

  _init() {
    const pluginId = this.constructor.id;
    if (!this.realClient.isBackgroundPlugin(pluginId)) {
      this.realClient.initPlugin(pluginId);
    }
    this.init();
  }
}
