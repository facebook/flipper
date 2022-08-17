/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module 'adbkit' {
  export interface Device {
    id: string;
    type: 'emulator' | 'device' | 'offline';
  }

  interface Util {
    readAll: (stream: NodeJS.ReadStream) => Promise<Buffer>;
  }

  // https://github.com/openstf/adbkit#pulltransfer
  export interface PullTransfer extends NodeJS.WriteStream {
    cancel: () => this;
    on(
      event: 'progress',
      listener: (stats: {bytesTransferred: number}) => void,
    ): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'resize', listener: () => void): this;
  }

  interface DeviceTracker extends NodeJS.EventEmitter {
    on(event: 'add', listener: (device: Device) => void): this;
    on(event: 'remove', listener: (device: Device) => void): this;
    on(event: 'change', listener: (device: Device) => void): this;
    on(
      event: 'changeSet',
      listener: (changes: {
        added: Device[];
        removed: Device[];
        changed: Device[];
      }) => void,
    ): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'end', listener: () => void): this;
  }
  const util: Util;
  const adbkit: any;
  export interface Client {
    listDevices: () => Promise<Device[]>;
    reverse: (
      serial: string,
      remote: string,
      local: string,
    ) => Promise<boolean>;
    shell: (
      serial: string,
      command: string | string[],
    ) => Promise<NodeJS.ReadStream>;
    root: (serial: string) => Promise<true>;
    screencap: (serial: string) => Promise<NodeJS.WriteStream>;
    pull: (serial: string, path: string) => Promise<PullTransfer>;
    openLogcat: (
      serial: string,
      options?: {
        clear?: boolean;
      },
      callback?: any,
    ) => Promise<import('adbkit-logcat').Reader>;
    getProperties: (serial: string) => Promise<{[key: string]: string}>;
    trackDevices: () => Promise<DeviceTracker>;
    kill: () => Promise<boolean>;
    forward: (
      serial: string,
      local: string,
      remote: string,
    ) => Promise<boolean>; // TODO: verify correctness of signature

    install: (serial: string, apkPath: string) => Promise<boolean>;
  }
  export function createClient(config: {port: number; host: string}): Client;
}
