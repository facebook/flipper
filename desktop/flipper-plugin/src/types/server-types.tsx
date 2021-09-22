/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DeviceType as PluginDeviceType,
  OS as PluginOS,
} from 'flipper-plugin-lib';

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
};

export type FlipperServerCommands = {
  // TODO
};
