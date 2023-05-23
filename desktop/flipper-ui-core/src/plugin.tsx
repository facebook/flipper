/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger, Settings, ActivatablePluginDetails} from 'flipper-common';
import Client from './Client';
import {Component} from 'react';
import {BaseDevice} from 'flipper-frontend-core';
import {StaticView} from './reducers/connections';
import {State as ReduxState} from './reducers';
import {DEFAULT_MAX_QUEUE_SIZE} from './reducers/pluginMessageQueue';
import {
  Notification,
  Idler,
  _SandyPluginDefinition,
  _makeShallowSerializable,
  _deserializeShallowObject,
  _buildInMenuEntries,
} from 'flipper-plugin';

export type DefaultKeyboardAction = keyof typeof _buildInMenuEntries;

export type KeyboardAction = {
  action: string;
  label: string;
  accelerator?: string;
};

export type KeyboardActions = Array<DefaultKeyboardAction | KeyboardAction>;

type Parameters = {[key: string]: any};

export type PluginDefinition = _SandyPluginDefinition;

export type ClientPluginMap = Map<string, PluginDefinition>;
export type DevicePluginMap = Map<string, PluginDefinition>;

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
  isConnected: boolean;
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

export type Props<T> = {
  logger: Logger;
  persistedState: T;
  setPersistedState: (state: Partial<T>) => void;
  target: PluginTarget;
  deepLinkPayload: unknown;
  selectPlugin: (pluginID: string, deepLinkPayload: unknown) => void;
  isArchivedDevice: boolean;
  selectedApp: string | null; // name
  setStaticView: (payload: StaticView) => void;
  settingsState: Settings;
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
  PersistedState,
> extends Component<Props<PersistedState>, State> {
  ['constructor']: any;
  static title: string | null = null;
  static category: string | null = null;
  static id: string = '';
  static packageName: string = '';
  static version: string = '';
  static icon: string | null = null;
  static gatekeeper: string | null = null;
  static details: ActivatablePluginDetails;
  static keyboardActions: KeyboardActions | null;
  static screenshot: string | null;
  static defaultPersistedState: any;
  static persistedStateReducer: PersistedStateReducer | null;
  static maxQueueSize: number = DEFAULT_MAX_QUEUE_SIZE;
  static exportPersistedState:
    | ((
        callClient:
          | undefined
          | ((method: string, params?: any) => Promise<any>),
        persistedState: StaticPersistedState | undefined,
        store: ReduxState | undefined,
        idler?: Idler,
        statusUpdate?: (msg: string) => void,
        supportsMethod?: (method: string) => Promise<boolean>,
      ) => Promise<StaticPersistedState | undefined>)
    | undefined;
  static getActiveNotifications:
    | ((persistedState: StaticPersistedState) => Array<Notification>)
    | undefined;

  reducers: {
    [actionName: string]: (state: State, actionData: any) => Partial<State>;
  } = {};
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
  ) => Promise<string> = async (
    persistedState: StaticPersistedState,
    _statusUpdate?: (msg: string) => void,
    _idler?: Idler,
    _pluginName?: string,
  ) => {
    if (
      persistedState &&
      typeof persistedState === 'object' &&
      !Array.isArray(persistedState)
    ) {
      return JSON.stringify(
        Object.fromEntries(
          Object.entries(persistedState).map(([key, value]) => [
            key,
            _makeShallowSerializable(value), // make first level of persisted state serializable
          ]),
        ),
      );
    } else {
      return JSON.stringify(persistedState);
    }
  };

  static deserializePersistedState: (
    serializedString: string,
  ) => StaticPersistedState = (serializedString: string) => {
    const raw = JSON.parse(serializedString);
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [
          key,
          _deserializeShallowObject(value),
        ]),
      );
    } else {
      return raw;
    }
  };

  teardown(): void {}

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

/**
 * @deprecated Please use the newer "Sandy" plugin APIs!
 * https://fbflipper.com/docs/extending/sandy-migration
 */
export class FlipperDevicePlugin<
  S,
  A extends BaseAction,
  P,
> extends FlipperBasePlugin<S, A, P> {
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

  // TODO T84453692: remove this function after some transition period in favor of BaseDevice.supportsPlugin.
  static supportsDevice(_device: BaseDevice): boolean {
    throw new Error(
      'supportsDevice is unimplemented in FlipperDevicePlugin class',
    );
  }
}

/**
 * @deprecated Please use the newer "Sandy" plugin APIs!
 * https://fbflipper.com/docs/extending/sandy-migration
 */
export class FlipperPlugin<
  S,
  A extends BaseAction,
  P,
> extends FlipperBasePlugin<S, A, P> {
  constructor(props: Props<P>) {
    super(props);
    const {id} = this.constructor;
    this.subscriptions = [];
    const realClient = (this.realClient = props.target as Client);
    this.client = {
      get isConnected() {
        return realClient.connected.get();
      },
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

  get device() {
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
    if (!this.realClient.isBackgroundPlugin(pluginId)) {
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
