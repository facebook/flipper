/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

type SerializableFnArg =
  | null
  | boolean
  | number
  | string
  | {[prop: string]: SerializableFnArg | SerializableFnArg[]};

export interface FlipperCompanionAvailablePlugin {
  pluginId: string;
  /**
   * `active` if a plugin is connected and running (accepting messages)
   * `ready` if a plugin can be started: bundled or found on a file system.
   * `unavailable` if plugin is supported by a device, but it cannot be loaded by Flipper (not bundled, not found on a file system, does not support a headless mode)
   */
  state: 'unavailable' | 'ready' | 'active';
}

export type FlipperCompanionCommands = {
  'companion-plugin-list': (
    clientId: string,
  ) => Promise<FlipperCompanionAvailablePlugin[]>;
  /**
   * Start a plugin for a client. It triggers 'onConnect' and 'onActivate' listeners for the plugin.
   */
  'companion-plugin-start': (
    clientId: string,
    pluginId: string,
  ) => Promise<void>;
  /**
   * Stops and destroys a plugin for a client. It triggers 'onDeactivate', 'onDisconnect', and 'onDestroy' listeners for the plugin.
   */
  'companion-plugin-stop': (
    clientId: string,
    pluginId: string,
  ) => Promise<void>;
  /**
   * Execute a command exposed via `export const API = () => ...` in a plugin.
   */
  'companion-plugin-exec': (
    clientId: string,
    pluginId: string,
    api: string,
    params?: SerializableFnArg[],
  ) => Promise<any>;
  /**
   * Subscribe to state updates via `export const API = () => ...` in a plugin. Returns the current state.
   */
  'companion-plugin-subscribe': (
    clientId: string,
    pluginId: string,
    api: string,
  ) => Promise<any>;
  'companion-device-plugin-list': (
    deviceSerial: string,
  ) => Promise<FlipperCompanionAvailablePlugin[]>;
  /**
   * Start a device plugin for a device. It triggers 'onActivate' listener for the plugin.
   */
  'companion-device-plugin-start': (
    deviceSerial: string,
    pluginId: string,
  ) => Promise<void>;
  /**
   * Stops and destroys a device plugin for a device. It triggers 'onDeactivate' and 'onDestroy' listeners for the plugin.
   */
  'companion-device-plugin-stop': (
    deviceSerial: string,
    pluginId: string,
  ) => Promise<void>;
  /**
   * Execute a command exposed via `export const api = () => ...` in a plugin.
   */
  'companion-device-plugin-exec': (
    deviceSerial: string,
    pluginId: string,
    api: string,
    params?: SerializableFnArg[],
  ) => Promise<any>;
  /**
   * Subscribe to state updates via `export const API = () => ...` in a plugin. Returns the current state.
   */
  'companion-device-plugin-subscribe': (
    clientId: string,
    pluginId: string,
    api: string,
  ) => Promise<any>;
};

export type FlipperCompanionEvents = {
  'companion-plugin-state-update': {
    clientId: string;
    pluginId: string;
    api: string;
    data: unknown;
  };
  'companion-device-plugin-state-update': {
    deviceSerial: string;
    pluginId: string;
    api: string;
    data: unknown;
  };
};
