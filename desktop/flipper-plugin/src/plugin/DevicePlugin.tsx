/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {SandyPluginDefinition} from './SandyPluginDefinition';
import {BasePluginInstance, BasePluginClient} from './PluginBase';

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

export interface DevicePluginClient extends BasePluginClient {
  readonly device: Device;
}

/**
 * Wrapper interface around BaseDevice in Flipper
 */
export interface RealFlipperDevice {
  isArchived: boolean;
  addLogListener(callback: DeviceLogListener): Symbol;
  removeLogListener(id: Symbol): void;
  addLogEntry(entry: DeviceLogEntry): void;
}

export class SandyDevicePluginInstance extends BasePluginInstance {
  static is(thing: any): thing is SandyDevicePluginInstance {
    return thing instanceof SandyDevicePluginInstance;
  }

  /** client that is bound to this instance */
  client: DevicePluginClient;

  constructor(
    realDevice: RealFlipperDevice,
    definition: SandyPluginDefinition,
    initialStates?: Record<string, any>,
  ) {
    super(definition, initialStates);
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
      ...this.createBasePluginClient(),
      device,
    };
    this.initializePlugin(() =>
      definition.asDevicePluginModule().devicePlugin(this.client),
    );
  }

  toJSON() {
    return '[SandyDevicePluginInstance]';
  }
}
