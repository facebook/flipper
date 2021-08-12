/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {IncomingMessage} from 'http';
import {SecureServerConfig} from '../utils/CertificateProvider';
import ServerAdapter, {ServerEventsListener} from './ServerAdapter';
import ws from 'ws';
import WebSocket from 'ws';
import https from 'https';
import http from 'http';

/**
 * It serves as a base class for WebSocket based servers. It delegates the 'connection'
 * event to subclasses as a customisation point.
 */
abstract class ServerWebSocketBase extends ServerAdapter {
  rawServer_: ws.Server | null;
  constructor(listener: ServerEventsListener) {
    super(listener);
    this.rawServer_ = null;
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
  verifyClient(): ws.VerifyClientCallbackSync {
    return (_info: {origin: string; req: IncomingMessage; secure: boolean}) => {
      return false;
    };
  }

  start(port: number, sslConfig?: SecureServerConfig): Promise<boolean> {
    const self = this;
    return new Promise((resolve, reject) => {
      let server: http.Server | https.Server | undefined;
      if (sslConfig) {
        server = https.createServer({
          key: sslConfig.key,
          cert: sslConfig.cert,
          ca: sslConfig.ca,
          // Client to provide a certificate to authenticate.
          requestCert: sslConfig.requestCert,
          // As specified as "true", so no unauthenticated traffic
          // will make it to the specified route specified
          rejectUnauthorized: sslConfig.rejectUnauthorized,
        });
      } else {
        server = http.createServer();
      }

      const handleRequest = sslConfig
        ? self.onSecureConnection
        : self.onConnection;

      const rawServer = new WebSocket.Server({
        server,
        verifyClient: this.verifyClient(),
      });
      rawServer.on('connection', (ws: WebSocket, message: any) => {
        handleRequest.apply(self, [ws, message]);
      });
      rawServer.on('error', (_ws: WebSocket, error: any) => {
        console.warn('Server found connection error: ' + error);
        reject(error);
      });

      if (server) {
        server.listen(port, () => {
          console.debug(
            `${
              sslConfig ? 'Secure' : 'Certificate'
            } server started on port ${port}`,
            'server',
          );
          self.listener.onListening(port);
          self.rawServer_ = rawServer;
          resolve(true);
        });
      } else {
        reject(new Error(`Unable to start server at port ${port}`));
      }
    });
  }

  stop(): Promise<void> {
    if (this.rawServer_) {
      return Promise.resolve(this.rawServer_.close());
    }
    return Promise.resolve();
  }

  onConnection(_ws: WebSocket, _message: any): void {
    throw new Error('Method not implemented.');
  }

  onSecureConnection(_ws: WebSocket, _message: any): void {
    throw new Error('Method not implemented.');
  }
}

export default ServerWebSocketBase;
