/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DeviceSpec,
  DeviceType as PluginDeviceType,
  OS as PluginOS,
} from 'flipper-plugin-lib';
import {DeviceLogEntry} from '../plugin/DevicePlugin';

// In the future, this file would deserve it's own package, as it doesn't really relate to plugins.
// Since flipper-plugin however is currently shared among server, client and defines a lot of base types, leaving it here for now.

export type FlipperServerState =
  | 'pending'
  | 'starting'
  | 'started'
  | 'error'
  | 'closed';

export type DeviceType = PluginDeviceType;

export type DeviceOS = PluginOS | 'Windows' | 'MacOS';

export type DeviceDescription = {
  readonly os: DeviceOS;
  readonly title: string;
  readonly deviceType: DeviceType;
  readonly serial: string;
  readonly icon?: string;
  // Android specific information
  readonly specs?: DeviceSpec[];
  readonly abiList?: string[];
  readonly sdkVersion?: string;
};

export type ClientQuery = {
  readonly app: string;
  readonly os: DeviceOS;
  readonly device: string;
  readonly device_id: string;
  readonly sdk_version?: number;
};

export type ClientDescription = {
  readonly id: string;
  readonly query: ClientQuery;
  readonly sdkVersion: number;
};

export type FlipperServerEvents = {
  'server-state': {state: FlipperServerState; error?: Error};
  'server-error': any;
  notification: {
    type: 'error';
    title: string;
    description: string;
  };
  'device-connected': DeviceDescription;
  'device-disconnected': DeviceDescription;
  'client-connected': ClientDescription;
  'device-log': {
    serial: string;
    entry: DeviceLogEntry;
  };
};

export type FlipperServerCommands = {
  'device-start-logging': (serial: string) => Promise<void>;
  'device-stop-logging': (serial: string) => Promise<void>;
  'device-supports-screenshot': (serial: string) => Promise<boolean>;
  'device-supports-screencapture': (serial: string) => Promise<boolean>;
  'device-take-screenshot': (serial: string) => Promise<string>; // base64 encoded buffer
  'device-start-screencapture': (
    serial: string,
    destination: string,
  ) => Promise<void>;
  'device-stop-screencapture': (serial: string) => Promise<string>; // file path
  'device-shell-exec': (serial: string, command: string) => Promise<string>;
  'device-forward-port': (
    serial: string,
    local: string,
    remote: string,
  ) => Promise<void>;
  'metro-command': (serial: string, command: string) => Promise<void>;
};

export interface FlipperServer {
  on<Event extends keyof FlipperServerEvents>(
    event: Event,
    callback: (payload: FlipperServerEvents[Event]) => void,
  ): void;
  off<Event extends keyof FlipperServerEvents>(
    event: Event,
    callback: (payload: FlipperServerEvents[Event]) => void,
  ): void;
  exec<Event extends keyof FlipperServerCommands>(
    event: Event,
    ...args: Parameters<FlipperServerCommands[Event]>
  ): ReturnType<FlipperServerCommands[Event]>;
  close(): void;
}
