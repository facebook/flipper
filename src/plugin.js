/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {KeyboardActions} from './MenuBar.js';
import type {App} from './App.js';
import type Logger from './fb-stubs/Logger.js';
import type Client from './Client.js';

import React from 'react';
import BaseDevice from './devices/BaseDevice.js';
import {AndroidDevice, IOSDevice} from 'sonar';

const invariant = require('invariant');

export type PluginClient = {|
  send: (method: string, params?: Object) => void,
  call: (method: string, params?: Object) => Promise<any>,
  subscribe: (method: string, callback: (params: any) => void) => void,
|};

type PluginTarget = BaseDevice | Client;

export type Props<T> = {
  logger: Logger,
  persistedState: T,
  setPersistedState: (state: $Shape<T>) => void,
};

export class SonarBasePlugin<
  State = *,
  Actions = *,
  PersistedState = *,
> extends React.Component<Props<PersistedState>, State> {
  static title: string = 'Unknown';
  static id: string = 'Unknown';
  static icon: string = 'apps';
  static keyboardActions: ?KeyboardActions;
  static screenshot: ?string;

  // forbid instance properties that should be static
  title: empty;
  id: empty;
  persist: empty;
  icon: empty;
  keyboardActions: empty;
  screenshot: empty;

  reducers: {
    [actionName: string]: (state: State, actionData: Object) => $Shape<State>,
  } = {};
  app: App;
  onKeyboardAction: ?(action: string) => void;

  toJSON() {
    return this.constructor.title;
  }

  // methods to be overriden by plugins
  init(): void {}
  teardown(): void {}
  // methods to be overridden by subclasses
  _init(): void {}
  _teardown(): void {}
  _setup(target: PluginTarget) {}

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
}

export class SonarDevicePlugin<S = *, A = *> extends SonarBasePlugin<S, A> {
  device: BaseDevice;

  _setup(target: PluginTarget) {
    invariant(target instanceof BaseDevice, 'expected instanceof Client');
    const device: BaseDevice = target;

    this.device = device;
    super._setup(device);
  }

  _init() {
    this.init();
  }
}

export class SonarPlugin<S = *, A = *> extends SonarBasePlugin<S, A> {
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

  _setup(target: any) {
    /* We have to type the above as `any` since if we import the actual Client we have an
       unresolvable dependency cycle */

    const realClient: Client = target;
    const id: string = this.constructor.id;

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

    super._setup(realClient);
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
