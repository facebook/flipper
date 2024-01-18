/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ParsedUrlQuery} from 'querystring';
import {BrowserClientConnection} from './BrowserClientConnection';
import {getFlipperServerConfig} from '../FlipperServerConfig';
import ws from 'ws';
import {IncomingMessage} from 'http';
import {assertNotNull, parseClientQuery} from './Utilities';
import SecureServerWebSocket, {
  SecureConnectionCtx,
} from './SecureServerWebSocket';
import {ClientDescription, DeviceOS, SecureClientQuery} from 'flipper-common';
import {URL} from 'url';
import {isFBBuild} from '../fb-stubs/constants';

interface BrowserConnectionCtx extends SecureConnectionCtx {
  clientConnection?: BrowserClientConnection;
}

type LegacyWsMessage =
  | {
      app: string;
      payload: object;
      type?: never;
      plugins?: never;
    }
  | {
      app: string;
      payload?: never;
      type: 'connect';
      plugins?: string[];
    };

function isLegacyMessage(message: object): message is LegacyWsMessage {
  return typeof (message as LegacyWsMessage).app === 'string';
}

/**
 * WebSocket-based server over an insecure channel that does not support the certificate exchange flow. E.g. web browser.
 */
class BrowserServerWebSocket extends SecureServerWebSocket {
  protected handleConnectionAttempt(ctx: BrowserConnectionCtx): void {
    const {clientQuery, ws} = ctx;
    assertNotNull(clientQuery);

    console.info(
      `[conn] Local websocket connection attempt: ${clientQuery.app} on ${clientQuery.device_id}.`,
    );
    this.listener.onConnectionAttempt(clientQuery);

    this.listener.onSecureConnectionAttempt(clientQuery);

    // Mock an initial empty list of plugins
    // Read more o the reasoning in `handleMessage`
    const clientConnection = new BrowserClientConnection(ws);

    const client: Promise<ClientDescription> =
      this.listener.onConnectionCreated(clientQuery, clientConnection);

    ctx.clientConnection = clientConnection;
    ctx.clientPromise = client;
  }

  protected async handleMessage(
    ctx: BrowserConnectionCtx,
    parsedMessage: object,
    rawMessage: string,
  ) {
    const {clientQuery, clientConnection} = ctx;
    assertNotNull(clientQuery);
    assertNotNull(clientConnection);

    // Remove this part once our current customers migrate to the new message structure
    if (isLegacyMessage(parsedMessage)) {
      if (parsedMessage.type === 'connect') {
        // TODO: Add a link to a blog post when it is ready.
        console.warn(
          '[conn] Legacy WebSocket connection. Please, upgrade. See https://github.com/facebook/flipper/tree/main/js/js-flipper for references.',
        );

        // Legacy protocol supported passing an optional list of plugins with a 'connect' message.
        // Clients that pass the list of plugins this way might not suport `getPlugins` call.
        // We create a special BrowserClientConnection that intercepts any `getPlugings` call if the list was passed and fakes a client reply using the list of plugins from the `connect` message.

        const plugins = parsedMessage.plugins;
        clientConnection.plugins = plugins;
        clientConnection.legacyFormat = true;

        if (plugins) {
          // Client connection was initialized without a list of plugins.
          // Upon initialization it sent a `getPlugins` request.
          // We find that request and resolve it with the list of plugins we received from the `connect` message
          const getPluginsCallbacks = clientConnection.matchPendingRequest(0);

          if (!getPluginsCallbacks) {
            return;
          }

          getPluginsCallbacks.resolve({
            success: {plugins},
            length: rawMessage.length,
          });
        }

        return;
      }

      // Legacy messages wrap the actual message content with { app: string, payload: object }.
      // This way we normalize them to the current message format which does not require that wrapper.
      parsedMessage = parsedMessage.payload;
      rawMessage = JSON.stringify(parsedMessage);
    }

    super.handleMessage(ctx, parsedMessage, rawMessage);
  }

  protected parseClientQuery(
    query: ParsedUrlQuery,
  ): SecureClientQuery | undefined {
    // Some legacy clients send only deviceId and device
    // Remove it once they fix it
    // P463066994
    const fallbackOS: DeviceOS = 'MacOS';
    const fallbackApp = query.device;
    const fallbackDeviceId = query.deviceId;
    const fallbackSdkVersion = '4';
    query = {
      app: fallbackApp,
      os: fallbackOS,
      device_id: fallbackDeviceId,
      sdk_version: fallbackSdkVersion,
      ...query,
    };

    const parsedBaseQuery = parseClientQuery(query);
    if (!parsedBaseQuery) {
      return;
    }
    return {...parsedBaseQuery, medium: 'NONE'};
  }

  protected verifyClient(): ws.VerifyClientCallbackSync {
    return (info: {origin: string; req: IncomingMessage; secure: boolean}) => {
      if (!this.acceptingNewConections) {
        return false;
      }

      if (isFBBuild) {
        try {
          const urlObj = new URL(info.origin);
          if (
            urlObj.hostname.endsWith('.facebook.com') ||
            urlObj.hostname.endsWith('.whatsapp.com')
          ) {
            return true;
          }
        } catch {}
      }

      const ok =
        typeof info.origin !== 'undefined' &&
        getFlipperServerConfig().validWebSocketOrigins.some((validPrefix) =>
          info.origin.startsWith(validPrefix),
        );
      if (!ok) {
        console.warn(
          `[conn] Refused webSocket connection from ${info.origin} (secure: ${info.secure})`,
        );
      }
      return ok;
    };
  }
}

export default BrowserServerWebSocket;
