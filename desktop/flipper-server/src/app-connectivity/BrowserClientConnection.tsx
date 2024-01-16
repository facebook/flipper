/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ClientResponseType,
  GetBackgroundPluginsMessage,
  GetPluginsMessage,
} from 'flipper-common';
import WebSocket from 'ws';
import WebSocketClientConnection from './WebSocketClientConnection';

/**
 * @deprecated
 * Default `WebSocketClientConnection` should be used instead.
 * See BrowserServerWebSocket.handleMessage.
 */
export class BrowserClientConnection extends WebSocketClientConnection {
  public legacyFormat = false;

  private static isGetPluginsCall(data: object): data is GetPluginsMessage {
    return (data as GetPluginsMessage).method === 'getPlugins';
  }
  private static isGetBackgroundPluginsCall(
    data: object,
  ): data is GetBackgroundPluginsMessage {
    return (
      (data as GetBackgroundPluginsMessage).method === 'getBackgroundPlugins'
    );
  }

  constructor(
    ws: WebSocket,
    public plugins?: string[],
  ) {
    super(ws);
  }

  async sendExpectResponse(data: object): Promise<ClientResponseType> {
    if (BrowserClientConnection.isGetPluginsCall(data) && this.plugins) {
      return {
        success: {plugins: this.plugins},
        length: 0,
      };
    }

    if (
      BrowserClientConnection.isGetBackgroundPluginsCall(data) &&
      this.plugins
    ) {
      return {
        success: {plugins: []},
        length: 0,
      };
    }

    return super.sendExpectResponse(data);
  }

  protected serializeData(data: object): string {
    return super.serializeData(this.legacyFormat ? {payload: data} : data);
  }
}
