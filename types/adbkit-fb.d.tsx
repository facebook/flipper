/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

interface Device {
  id: string;
  type: 'emulator' | 'device' | 'offline';
}

interface Util {
  readAll: (stream: NodeJS.ReadStream) => Promise<Buffer>;
}

declare module 'adbkit-fb' {
  const util: Util;
  const adbkit: any;
  export interface Client {
    listDevices: () => Promise<Device[]>;
  }
  export function createClient(config: {port: number; host: string}): Client;
}
