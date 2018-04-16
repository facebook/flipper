/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {KeyboardActions} from './MenuBar.js';
import type Application from './init.js';
import type {Client} from './server.js';

import BaseDevice from './devices/BaseDevice.js';
import {AndroidDevice, IOSDevice} from 'sonar';

const invariant = require('invariant');

export type PluginClient = {|
  send: (method: string, params?: Object) => void,
  call: (method: string, params?: Object) => Promise<any>,
  subscribe: (method: string, callback: (params: any) => void) => void,
|};

type PluginTarget = BaseDevice | Client;

/**
 * This is a wrapper for a plugin instance and state. We have a special toJSON method that removes the plugin
 * instance and any state if it's not set to be persisted.
 */
export class PluginStateContainer {
  constructor(plugin: SonarBasePlugin<>, state: Object) {
    this.plugin = plugin;
    this.state = state;
  }

  plugin: ?SonarBasePlugin<>;
  state: Object;

  toJSON() {
    return {
      plugin: null,
      state: this.plugin != null ? this.state : null,
    };
  }
}

export class SonarBasePlugin<State: Object = any, Actions = any> {
  constructor() {
    // $FlowFixMe: this is fine
    this.state = {};
  }

  static title: string = 'Unknown';
  static id: string = 'Unknown';
  static icon: string = 'apps';
  static persist: boolean = true;
  static keyboardActions: ?KeyboardActions;
  static screenshot: ?string;

  // forbid instance properties that should be static
  title: empty;
  id: empty;
  persist: empty;

  namespaceKey: string;
  reducers: {
    [actionName: string]: (state: State, actionData: Object) => $Shape<State>,
  } = {};
  app: Application;
  state: State;
  renderSidebar: ?() => ?React.Element<*>;
  renderIntro: ?() => ?React.Element<*>;
  onKeyboardAction: ?(action: string) => void;

  toJSON() {
    return null;
  }

  // methods to be overriden by plugins
  init(): void {}
  teardown(): void {}
  // methods to be overridden by subclasses
  _init(): void {}
  _teardown(): void {}
  _setup(target: PluginTarget, app: Application) {
    this.app = app;
  }

  setState(
    state: $Shape<State> | ((state: State) => $Shape<State>),
    callback?: () => void,
  ) {
    if (typeof state === 'function') {
      state = state(this.state);
    }
    this.state = Object.assign({}, this.state, state);

    const pluginKey = this.constructor.id;
    const namespaceKey = this.namespaceKey;
    const appState = this.app.state;

    // update app state
    this.app.setState(
      {
        plugins: {
          ...appState.plugins,
          [namespaceKey]: {
            ...(appState.plugins[namespaceKey] || {}),
            [pluginKey]: new PluginStateContainer(this, this.state),
          },
        },
      },
      callback,
    );
  }

  dispatchAction(actionData: Actions) {
    // $FlowFixMe
    const action = this.reducers[actionData.type];
    if (!action) {
      // $FlowFixMe
      throw new ReferenceError(`Unknown action ${actionData.type}`);
    }

    if (typeof action === 'function') {
      this.setState(action.call(this, this.state, actionData));
    } else {
      // $FlowFixMe
      throw new TypeError(`Reducer ${actionData.type} isn't a function`);
    }
  }

  render(): any {
    return null;
  }
}

export class SonarDevicePlugin<
  State: Object = any,
  Actions = any,
> extends SonarBasePlugin<State, Actions> {
  device: BaseDevice;

  _setup(target: PluginTarget, app: Application) {
    invariant(target instanceof BaseDevice, 'expected instanceof Client');
    const device: BaseDevice = target;

    this.namespaceKey = device.serial;
    this.device = device;
    super._setup(device, app);
  }

  _teardown() {
    this.teardown();
  }

  _init() {
    this.init();
  }
}

export class SonarPlugin<
  State: Object = any,
  Actions = any,
> extends SonarBasePlugin<State, Actions> {
  constructor() {
    super();
    this.subscriptions = [];
  }

  subscriptions: Array<{
    method: string,
    callback: Function,
  }>;

  client: PluginClient;
  realClient: Client;

  getDevice(): ?BaseDevice {
    return this.realClient.getDevice();
  }

  getAndroidDevice(): AndroidDevice {
    const device = this.getDevice();
    invariant(
      device != null && device instanceof AndroidDevice,
      'expected android device',
    );
    return device;
  }

  getIOSDevice() {
    const device = this.getDevice();
    invariant(
      device != null && device instanceof IOSDevice,
      'expected ios device',
    );
    return device;
  }

  _setup(target: any, app: Application) {
    /* We have to type the above as `any` since if we import the actual Client we have an
       unresolvable dependency cycle */

    const realClient: Client = target;
    const id: string = this.constructor.id;

    this.namespaceKey = realClient.id;
    this.realClient = realClient;
    this.client = {
      call: (method, params) => realClient.call(id, method, params),
      send: (method, params) => realClient.send(id, method, params),
      subscribe: (method, callback) => {
        this.subscriptions.push({
          method,
          callback,
        });
        realClient.subscribe(id, method, callback);
      },
    };

    super._setup(realClient, app);
  }

  _teardown() {
    // automatically unsubscribe subscriptions
    for (const {method, callback} of this.subscriptions) {
      this.realClient.unsubscribe(this.constructor.id, method, callback);
    }

    // run plugin teardown
    this.teardown();
    if (this.realClient.connected) {
      this.realClient.rawSend('deinit', {plugin: this.constructor.id});
    }
  }

  _init() {
    this.realClient.rawSend('init', {plugin: this.constructor.id});
    this.init();
  }
}
