/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module 'firefox-client' {
  export default class FirefoxClient {
    constructor(options: any);

    connect(port: any, host: any, cb: any): void;

    disconnect(): void;

    getDevice(cb: any): any;

    getRoot(cb: any): any;

    getWebapps(cb: any): any;

    listTabs(cb: any): any;

    onEnd(): void;

    onError(error: any): void;

    onTimeout(): void;

    selectedTab(cb: any): any;
  }
}

declare module 'firefox-client/lib/client-methods' {
  import FirefoxClient from 'firefox-client';

  export default class ClientMethods {
    initialize(client: FirefoxClient, actor: any): void;
    request(type: any, message: any, transform: any, callback: Function): void;
  }
}

declare module 'firefox-client/lib/extend' {
  export default function extend(prototype: any, o: any): any;
}
