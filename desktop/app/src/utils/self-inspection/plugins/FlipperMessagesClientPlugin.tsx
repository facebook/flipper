/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperConnection, FlipperPlugin} from 'flipper-client-sdk';

export type MessageInfo = {
  device?: string;
  app: string;
  flipperInternalMethod?: string;
  plugin?: string;
  pluginMethod?: string;
  payload?: any;
  direction:
    | 'toClient:call'
    | 'toClient:send'
    | 'toFlipper:message'
    | 'toFlipper:response';
};

export class FlipperMessagesClientPlugin implements FlipperPlugin {
  protected connection: FlipperConnection | null = null;

  onConnect(connection: FlipperConnection): void {
    this.connection = connection;
  }

  onDisconnect(): void {
    this.connection = null;
  }

  getId(): string {
    return 'flipper-messages';
  }

  runInBackground(): boolean {
    return true;
  }

  newMessage(message: MessageInfo) {
    this.connection?.send('newMessage', message);
  }

  isConnected() {
    return this.connection != null;
  }
}

export const flipperMessagesClientPlugin = new FlipperMessagesClientPlugin();
