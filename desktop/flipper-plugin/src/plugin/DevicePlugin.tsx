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
import {DeviceType as PluginDeviceType} from 'flipper-plugin-lib';

export type DeviceLogListener = (entry: DeviceLogEntry) => void;

export type DeviceLogEntry = {
  readonly date: Date;
  readonly type: LogLevel;
  readonly message: string;
  readonly pid: number;
  readonly tid: number;
  readonly app?: string;
  readonly tag: string;
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

export type DeviceType = PluginDeviceType;

export type DevicePluginPredicate = (device: Device) => boolean;

export type DevicePluginFactory = (client: DevicePluginClient) => object;

export interface DevicePluginClient extends BasePluginClient {
  /**
   * Checks if the provided plugin is available for the current device
   */
  isPluginAvailable(pluginId: string): boolean;

  /**
   * opens a different plugin by id, optionally providing a deeplink to bring the plugin to a certain state
   */
  selectPlugin(pluginId: string, deeplinkPayload?: unknown): void;
}

/**
 * Wrapper interface around BaseDevice in Flipper
 */
export interface RealFlipperDevice {
  os: string;
  serial: string;
  isArchived: boolean;
  deviceType: DeviceType;
  addLogListener(callback: DeviceLogListener): Symbol;
  removeLogListener(id: Symbol): void;
  addLogEntry(entry: DeviceLogEntry): void;
  devicePlugins: string[];
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
    super(flipperLib, definition, realDevice, initialStates);
    this.client = {
      ...this.createBasePluginClient(),
      isPluginAvailable(pluginId: string) {
        return flipperLib.isPluginAvailable(realDevice, null, pluginId);
      },
      selectPlugin(pluginId: string, deeplink?: unknown) {
        if (this.isPluginAvailable(pluginId)) {
          flipperLib.selectPlugin(realDevice, null, pluginId, deeplink);
        }
      },
    };
    this.initializePlugin(() =>
      definition.asDevicePluginModule().devicePlugin(this.client),
    );
  }

  toJSON() {
    return '[SandyDevicePluginInstance]';
  }
}
