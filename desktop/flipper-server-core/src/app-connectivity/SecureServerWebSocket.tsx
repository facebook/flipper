/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ServerWebSocket, {ConnectionCtx} from './ServerWebSocket';
import {ParsedUrlQuery} from 'querystring';
import {ClientDescription, SecureClientQuery} from 'flipper-common';
import {
  isWsResponseMessage,
  parseSecureClientQuery,
  assertNotNull,
} from './Utilities';
import WebSocketClientConnection from './WebSocketClientConnection';
import {serializeError} from 'serialize-error';
import {WSCloseCode} from '../utils/WSCloseCode';
import {recorder} from '../recorder';

export interface SecureConnectionCtx extends ConnectionCtx {
  clientQuery?: SecureClientQuery;
  clientConnection?: WebSocketClientConnection;
  clientPromise?: Promise<ClientDescription>;
  client?: ClientDescription;
}

/**
 * WebSocket-based server.
 * A secure connection has been established between the server and a client. Once a client
 * has a valid certificate, it can use a secure connection with Flipper and start exchanging
 * messages.
 * https://fbflipper.com/docs/extending/new-clients
 * https://fbflipper.com/docs/extending/establishing-a-connection
 */
class SecureServerWebSocket extends ServerWebSocket {
  protected handleConnectionAttempt(ctx: SecureConnectionCtx): void {
    const {clientQuery, ws} = ctx;
    assertNotNull(clientQuery);

    recorder.log(
      clientQuery,
      `Secure websocket connection attempt: ${clientQuery.app} on ${clientQuery.device}.`,
    );

    this.listener.onSecureConnectionAttempt(clientQuery);

    const clientConnection = new WebSocketClientConnection(ws);

    const clientPromise: Promise<ClientDescription> = this.listener
      .onConnectionCreated(clientQuery, clientConnection)
      .then((client) => {
        ctx.client = client;
        return client;
      })
      .catch((e) => {
        throw new Error(
          `Failed to resolve client ${clientQuery.app} on ${
            clientQuery.device_id
          } medium ${clientQuery.medium}. Reason: ${JSON.stringify(
            serializeError(e),
          )}`,
        );
      });

    ctx.clientConnection = clientConnection;
    ctx.clientPromise = clientPromise;
  }

  protected async handleMessage(
    ctx: SecureConnectionCtx,
    parsedMessage: object,
    rawMessage: string,
  ) {
    const {clientQuery, clientConnection, clientPromise, client, ws} = ctx;
    assertNotNull(clientQuery);
    assertNotNull(clientConnection);
    assertNotNull(clientPromise);

    // We can recieve either "execute" messages from the client or "responses" to our messages
    // https://fbflipper.com/docs/extending/new-clients#responding-to-messages

    // Received a response message
    if (isWsResponseMessage(parsedMessage)) {
      const callbacks = clientConnection.matchPendingRequest(parsedMessage.id);

      if (!callbacks) {
        return;
      }
      callbacks.resolve({
        ...parsedMessage,
        length: rawMessage.length,
      });
      return;
    }

    // Received an "execute" message
    if (client) {
      this.listener.onClientMessage(client.id, rawMessage);
    } else {
      // Client promise is not resolved yet
      // So we schedule the execution for when it is resolved
      clientPromise
        .then((client) => {
          this.listener.onClientMessage(client.id, rawMessage);
        })
        .catch((error) => {
          // It is an async action, which might run after the socket is closed
          if (ws.readyState === ws.OPEN) {
            // See the reasoning in the error handler for a `connection` event in ServerWebSocket
            ws.emit('error', error);
            ws.close(WSCloseCode.InternalError);
          }
        });
    }
  }

  /**
   * Parse and extract a SecureClientQuery instance from a message. The ClientQuery
   * data will be contained in the message url query string.
   * @param message An incoming web socket message.
   */
  protected parseClientQuery(
    query: ParsedUrlQuery,
  ): SecureClientQuery | undefined {
    return parseSecureClientQuery(query);
  }
}

export default SecureServerWebSocket;
