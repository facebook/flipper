/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {IncomingMessage} from 'http';
import ServerWebSocketBase from './ServerWebSocketBase';
import WebSocket, {
  AddressInfo,
  Server as WSServer,
  VerifyClientCallbackSync,
} from 'ws';
import {createServer as createHttpsServer} from 'https';
import {createServer as createHttpServer} from 'http';
import querystring from 'querystring';
import {ClientQuery, UnableToExtractClientQueryError} from 'flipper-common';
import {
  assertNotNull,
  parseClientQuery,
  parseMessageToJson,
  verifyClientQueryComesFromCertExchangeSupportedOS,
} from './Utilities';
import {SecureServerConfig} from './certificate-exchange/certificate-utils';
import {Server} from 'net';
import {serializeError} from 'serialize-error';
import {WSCloseCode} from '../utils/WSCloseCode';
import {recorder} from '../recorder';
import {tracker} from '../tracker';

export interface ConnectionCtx {
  clientQuery?: ClientQuery;
  ws: WebSocket;
  request: IncomingMessage;
}

// This is the maximum size of a message that can be received in a single websocket message.
export const WEBSOCKET_MAX_MESSAGE_SIZE = Math.pow(2, 53) - 1;

/**
 * It serves as a base class for WebSocket based servers. It delegates the 'connection'
 * event to subclasses as a customisation point.
 */
class ServerWebSocket extends ServerWebSocketBase {
  protected wsServer?: WSServer;
  private httpServer?: Server;

  async start(port: number, sslConfig?: SecureServerConfig): Promise<number> {
    const assignedPort = await new Promise<number>((resolve, reject) => {
      try {
        const server = sslConfig
          ? createHttpsServer(sslConfig)
          : createHttpServer();

        const wsServer = new WSServer({
          server,
          verifyClient: this.verifyClient(),
          maxPayload: WEBSOCKET_MAX_MESSAGE_SIZE,
        });

        // We do not need to listen to http server's `error` because it is propagated to WS
        // https://github.com/websockets/ws/blob/a3a22e4ed39c1a3be8e727e9c630dd440edc61dd/lib/websocket-server.js#L109
        const onConnectionError = (error: Error) => {
          const message = JSON.stringify(serializeError(error));
          tracker.track('server-ws-server-error', {port, error: message});
          reject(
            new Error(
              `Unable to start server at port ${port} due to ${message}`,
            ),
          );
        };
        wsServer.once('error', onConnectionError);
        server.listen(port, () => {
          console.debug(
            `[ws] ${
              sslConfig ? 'Secure' : 'Insecure'
            } server started on port ${port}`,
            'server',
          );

          // Unsubscribe connection error listener.
          // We'll attach a permanent error listener later.
          wsServer.off('error', onConnectionError);

          this.listener.onListening(port);
          this.wsServer = wsServer;
          this.httpServer = server;

          resolve((server.address() as AddressInfo).port);
        });
      } catch (e) {
        reject(e);
      }
    });

    assertNotNull(this.wsServer);
    assertNotNull(this.httpServer);

    this.wsServer.on(
      'connection',
      (ws: WebSocket, request: IncomingMessage) => {
        ws.on('error', (error) => {
          console.error('[ws] Connection error:', error);
          this.listener.onError(error);
        });

        try {
          this.onConnection(ws, request);
        } catch (error) {
          // TODO: Investigate if we need to close the socket in the `error` listener
          // DRI: @aigoncharov
          ws.close(WSCloseCode.InternalError);

          if (error instanceof UnableToExtractClientQueryError) {
            // If we are unable to extract the client query, do not emit an error.
            // It cannot be determined if the client is legitimately trying to establish
            // a connection with Flipper or some other process is trying to connect to
            // the port currently used by Flipper.
            return;
          }
          // If an exception is thrown, an `error` event is not emitted automatically.
          // We need to explicitly handle the error and emit an error manually.
          // If we leave it unhanled, the process just dies
          // https://replit.com/@aigoncharov/WS-error-handling#index.js
          ws.emit('error', error);
        }
      },
    );
    this.wsServer.on('error', (error) => {
      console.error('[ws] Server error:', error);
      this.listener.onError(error);
    });

    return assignedPort;
  }

  async stop(): Promise<void> {
    if (!this.wsServer) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      console.info('[ws] Stopping server');
      assertNotNull(this.wsServer);
      this.wsServer.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    await new Promise<void>((resolve, reject) => {
      console.info('[ws] Stopping HTTP server');
      assertNotNull(this.httpServer);
      this.httpServer.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * A connection has been established between the server and a client. Only ever used for
   * certificate exchange.
   *
   * @param ws An active WebSocket.
   * @param request Incoming request message.
   */
  onConnection(ws: WebSocket, request: IncomingMessage): void {
    const ctx: ConnectionCtx = {ws, request};

    this.extractClientQuery(ctx);
    this.handleConnectionAttempt(ctx);

    ws.on('message', async (message: WebSocket.RawData) => {
      const messageString = message.toString();
      try {
        const parsedMessage = this.handleMessageDeserialization(
          ctx,
          messageString,
        );
        // Successful deserialization is a proof that the message is a string
        this.handleMessage(ctx, parsedMessage, messageString);
      } catch (error) {
        // If handling an individual message failes, we don't necessarily kill the connection,
        // all other plugins might still be working correctly. So let's just report it.
        // This avoids ping-ponging connections if an individual plugin sends garbage (e.g. T129428800)
        // or throws an error when handling messages
        console.error('[ws] Failed to handle message', messageString, error);
      }
    });
  }

  /**
   * Extract and create a ClientQuery from the request URL. This method will throw if:
   * @param ctx The connection context.
   * @returns It doesn't return anything, if the client query
   * is extracted, this one is set into the connection context.
   */
  protected extractClientQuery(ctx: ConnectionCtx): void {
    const {request} = ctx;
    if (!request.url) {
      return;
    }

    const query = querystring.decode(request.url.split('?')[1]);
    const clientQuery = this.parseClientQuery(query);

    if (!clientQuery) {
      console.warn(
        '[ws] Unable to extract the client query from the request URL.',
        request.url,
      );
      throw new UnableToExtractClientQueryError(
        'Unable to extract the client query from the request URL.',
      );
    }

    ctx.clientQuery = clientQuery;
  }

  protected handleConnectionAttempt(ctx: ConnectionCtx): void {
    const {clientQuery} = ctx;
    assertNotNull(clientQuery);

    recorder.log(
      clientQuery,
      `Insecure websocket connection attempt: ${clientQuery.app} on ${clientQuery.device_id}.`,
    );
    this.listener.onConnectionAttempt(clientQuery);
  }

  protected handleMessageDeserialization(
    ctx: ConnectionCtx,
    message: unknown,
  ): object {
    const {clientQuery} = ctx;
    assertNotNull(clientQuery);

    const parsedMessage = parseMessageToJson(message);
    if (!parsedMessage) {
      recorder.logError(clientQuery, 'Failed to parse message', message);
      throw new Error(`Failed to parse message`);
    }
    return parsedMessage;
  }

  protected async handleMessage(
    ctx: ConnectionCtx,
    parsedMessage: object,
    // Not used in this method, but left as a reference for overriding classes.
    _rawMessage: string,
  ) {
    const {clientQuery, ws} = ctx;
    assertNotNull(clientQuery);

    const response = await this._onHandleUntrustedMessage(
      clientQuery,
      parsedMessage,
    );
    if (response) {
      ws.send(response);
    }
  }

  /**
   * Parse and extract a ClientQuery instance from a message. The ClientQuery
   * data will be contained in the message url query string.
   * @param message An incoming web socket message.
   */
  protected parseClientQuery(
    query: querystring.ParsedUrlQuery,
  ): ClientQuery | undefined {
    return verifyClientQueryComesFromCertExchangeSupportedOS(
      parseClientQuery(query),
    );
  }

  /**
   * WebSocket client verification. Usually used to validate the origin.
   *
   * Base implementation simply returns true, but this can be overriden by subclasses
   * that require verification.
   *
   * @returns Return true if the client was successfully verified, otherwise
   * returns false.
   */
  protected verifyClient(): VerifyClientCallbackSync {
    return (_info: {origin: string; req: IncomingMessage; secure: boolean}) => {
      if (!this.acceptingNewConections) {
        return false;
      }
      // Client verification is not necessary. The connected client has
      // already been verified using its certificate signed by the server.
      return true;
    };
  }

  protected stopAcceptingNewConectionsImpl(): void {
    this.wsServer?.clients.forEach((client) =>
      client.close(WSCloseCode.GoingAway),
    );
  }
}

export default ServerWebSocket;
