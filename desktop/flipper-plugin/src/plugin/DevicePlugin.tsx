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
import {FlipperLib} from './FlipperLib';

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
  readonly realDevice: any; // TODO: temporarily, clean up T70688226
  readonly isArchived: boolean;
  readonly os: string;
  readonly deviceType: DeviceType;
  onLogEntry(cb: DeviceLogListener): () => void;
}

export type DeviceType = 'emulator' | 'physical';

export type DevicePluginPredicate = (device: Device) => boolean;

export type DevicePluginFactory = (client: DevicePluginClient) => object;

export interface DevicePluginClient extends BasePluginClient {
  readonly device: Device;
}

/**
 * Wrapper interface around BaseDevice in Flipper
 */
export interface RealFlipperDevice {
  os: string;
  isArchived: boolean;
  deviceType: DeviceType;
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
    flipperLib: FlipperLib,
    definition: SandyPluginDefinition,
    realDevice: RealFlipperDevice,
    initialStates?: Record<string, any>,
  ) {
    super(flipperLib, definition, initialStates);
    const device: Device = {
      realDevice, // TODO: temporarily, clean up T70688226
      // N.B. we model OS as string, not as enum, to make custom device types possible in the future
      os: realDevice.os,
      isArchived: realDevice.isArchived,
      deviceType: realDevice.deviceType,

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
