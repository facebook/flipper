/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {SandyPluginDefinition} from './SandyPluginDefinition';
import {EventEmitter} from 'events';
import {Atom} from '../state/atom';
import {setCurrentPluginInstance} from './Plugin';

export type DeviceLogListener = (entry: DeviceLogEntry) => void;

export type DeviceLogEntry = {
  readonly date: Date;
  readonly pid: number;
  readonly tid: number;
  readonly app?: string;
  readonly type: LogLevel;
  readonly tag: string;
  readonly message: string;
};

export type LogLevel =
  | 'unknown'
  | 'verbose'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

export interface Device {
  isArchived: boolean;
  onLogEntry(cb: DeviceLogListener): () => void;
}

export type DevicePluginPredicate = (device: Device) => boolean;

export type DevicePluginFactory = (client: DevicePluginClient) => object;

// TODO: better name?
export interface DevicePluginClient {
  readonly device: Device;

  /**
   * the onDestroy event is fired whenever a device is unloaded from Flipper, or a plugin is disabled.
   */
  onDestroy(cb: () => void): void;

  /**
   * the onActivate event is fired whenever the plugin is actived in the UI
   */
  onActivate(cb: () => void): void;

  /**
   * The counterpart of the `onActivate` handler.
   */
  onDeactivate(cb: () => void): void;

  /**
   * Triggered when this plugin is opened through a deeplink
   */
  onDeepLink(cb: (deepLink: unknown) => void): void;
}

export interface RealFlipperDevice {
  isArchived: boolean;
  addLogListener(callback: DeviceLogListener): Symbol;
  removeLogListener(id: Symbol): void;
  addLogEntry(entry: DeviceLogEntry): void;
}

export class SandyDevicePluginInstance {
  static is(thing: any): thing is SandyDevicePluginInstance {
    return thing instanceof SandyDevicePluginInstance;
  }

  /** client that is bound to this instance */
  client: DevicePluginClient;
  /** the original plugin definition */
  definition: SandyPluginDefinition;
  /** the plugin instance api as used inside components and such  */
  instanceApi: any;

  activated = false;
  destroyed = false;
  events = new EventEmitter();

  // temporarily field that is used during deserialization
  initialStates?: Record<string, any>;
  // all the atoms that should be serialized when making an export / import
  rootStates: Record<string, Atom<any>> = {};
  // last seen deeplink
  lastDeeplink?: any;

  constructor(
    realDevice: RealFlipperDevice,
    definition: SandyPluginDefinition,
    initialStates?: Record<string, any>,
  ) {
    this.definition = definition;
    const device: Device = {
      get isArchived() {
        return realDevice.isArchived;
      },
      onLogEntry(cb) {
        const handle = realDevice.addLogListener(cb);
        return () => {
          realDevice.removeLogListener(handle);
        };
      },
    };
    this.client = {
      device,
      onDestroy: (cb) => {
        this.events.on('destroy', cb);
      },
      onActivate: (cb) => {
        this.events.on('activate', cb);
      },
      onDeactivate: (cb) => {
        this.events.on('deactivate', cb);
      },
      onDeepLink: (callback) => {
        this.events.on('deeplink', callback);
      },
    };
    setCurrentPluginInstance(this);
    this.initialStates = initialStates;
    try {
      this.instanceApi = definition
        .asDevicePluginModule()
        .devicePlugin(this.client);
    } finally {
      this.initialStates = undefined;
      setCurrentPluginInstance(undefined);
    }
  }

  // the plugin is selected in the UI
  activate() {
    this.assertNotDestroyed();
    if (!this.activated) {
      this.activated = true;
      this.events.emit('activate');
    }
  }

  deactivate() {
    if (this.destroyed) {
      return;
    }
    if (this.activated) {
      this.lastDeeplink = undefined;
      this.activated = false;
      this.events.emit('deactivate');
    }
  }

  destroy() {
    this.assertNotDestroyed();
    this.deactivate();
    this.events.emit('destroy');
    this.destroyed = true;
  }

  toJSON() {
    return '[SandyDevicePluginInstance]';
  }

  triggerDeepLink(deepLink: unknown) {
    this.assertNotDestroyed();
    if (deepLink !== this.lastDeeplink) {
      this.lastDeeplink = deepLink;
      this.events.emit('deeplink', deepLink);
    }
  }

  exportState() {
    return Object.fromEntries(
      Object.entries(this.rootStates).map(([key, atom]) => [key, atom.get()]),
    );
  }

  isPersistable(): boolean {
    return Object.keys(this.rootStates).length > 0;
  }

  private assertNotDestroyed() {
    if (this.destroyed) {
      throw new Error('Plugin has been destroyed already');
    }
  }
}
