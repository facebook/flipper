/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperClient, FlipperConnection, FlipperPlugin} from './api';
import {newWebviewClient} from './webviewImpl';

export class SeaMammalPlugin implements FlipperPlugin {
  protected connection: FlipperConnection | null | undefined;

  onConnect(connection: FlipperConnection): void {
    this.connection = connection;
  }
  onDisconnect(): void {
    this.connection = null;
  }

  getId(): string {
    return 'sea-mammals';
  }

  runInBackground(): boolean {
    return true;
  }

  newRow(row: {id: string; url: string; title: string}) {
    this.connection?.send('newRow', row);
  }
}

class FlipperManager {
  flipperClient: FlipperClient;
  seaMammalPlugin: SeaMammalPlugin;

  constructor() {
    this.flipperClient = newWebviewClient();
    this.seaMammalPlugin = new SeaMammalPlugin();
    this.flipperClient.addPlugin(this.seaMammalPlugin);
    this.flipperClient.start('Example JS App');
  }
}

let flipperManager: FlipperManager | undefined;

export function init() {
  if (!flipperManager) {
    flipperManager = new FlipperManager();
  }
}

export function flipper(): FlipperManager | undefined {
  return flipperManager;
}
