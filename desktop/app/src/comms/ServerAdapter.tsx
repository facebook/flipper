/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  CertificateExchangeMedium,
  SecureServerConfig,
} from '../utils/CertificateProvider';
import Client, {ClientQuery} from '../Client';
import {ClientConnection} from './ClientConnection';
import {transformCertificateExchangeMediumToType} from './Utilities';

/**
 * ClientCsrQuery defines a client query with CSR
 * information.
 */
export type ClientCsrQuery = {
  csr?: string | undefined;
  csr_path?: string | undefined;
};

/**
 * SecureClientQuery combines a ClientQuery with
 * ClientCsrQuery. It also adds medium information.
 */
export type SecureClientQuery = ClientQuery &
  ClientCsrQuery & {medium: number | undefined};

/**
 * Defines an interface for events triggered by a running server interacting
 * with a client.
 */
export interface ServerEventsListener {
  /**
   * Server started and listening at the specified port.
   * @param port The port in which the server is listening to.
   */
  onListening(port: number): void;
  /**
   * An insecure connection attempt has been made by a client. At this
   * point, a connection should be already be available but needs to be
   * validated by the server.
   * @param clientQuery A ClientQuery instance containing metadata about
   * the client e.g. OS, device, app, etc.
   */
  onConnectionAttempt(clientQuery: ClientQuery): void;
  /**
   * A TLS connection attempt has been made by a client. At this
   * point, a connection should be already be available but needs to be
   * validated by the server.
   * @param clientQuery A SecureClientQuery instance containing metadata about
   * the client and CSR information as exchanged on the previously
   * established insecure connection.
   */
  onSecureConnectionAttempt(clientQuery: SecureClientQuery): void;
  /**
   * CSR received by the server and needs to be processed. If successfully
   * processed, it should return a generated device identifier.
   * @param unsanitizedCSR CSR as sent by the client, will need to be sanitized
   * before usage.
   * @param clientQuery A ClientQuery instance containing metadata about
   * the client e.g. OS, device, app, etc.
   * @param appDirectory App directory in which to deploy the CA and client
   * certificates.
   * @param medium Certificate exchange medium type e.g. FS_ACCESS, WWW.
   */
  onProcessCSR(
    unsanitizedCSR: string,
    clientQuery: ClientQuery,
    appDirectory: string,
    medium: CertificateExchangeMedium,
  ): Promise<{deviceId: string}>;
  /**
   * A secure connection has been established with a validated client.
   * A promise to a Client instance needs to be returned.
   * @param clientQuery A SecureClientQuery instance containing metadata about
   * the client and CSR information as exchanged on the previously
   * established insecure connection.
   * @param clientConnection A valid client connection.
   */
  onConnectionCreated(
    clientQuery: SecureClientQuery,
    clientConnection: ClientConnection,
  ): Promise<Client>;
  /**
   * A connection with a client has been closed.
   * @param id The client identifier.
   */
  onConnectionClosed(id: string): void;
  /**
   * An error has occurred.
   * @param error An Error instance.
   */
  onError(error: Error): void;
}

/**
 * Defines the base class to be used by any server implementation e.g.
 * RSocket, WebSocket, etc.
 */
abstract class ServerAdapter {
  listener: ServerEventsListener;

  constructor(listener: ServerEventsListener) {
    this.listener = listener;
  }

  /**
   * Start and bind server to the specified port.
   * @param port A port number.
   * @param sslConfig An optional SSL configuration to be used for
   * TLS servers.
   */
  abstract start(
    port: number,
    sslConfig?: SecureServerConfig,
  ): Promise<boolean>;
  /**
   * Stop the server.
   */
  abstract stop(): Promise<void>;

  /**
   * Handle a message received over an insecure connection. The only
   * supported message is to sign certificates.
   * @param clientQuery A ClientQuery instance containing metadata about
   * the client e.g. OS, device, app, etc.
   * @param rawData Raw data as sent by the client.
   * @returns The response to be sent back to the client. If the received
   * request is to sign a certificate and no errors were found, the response
   * should contain the device identifier to use by the client.
   */
  async _onHandleUntrustedMessage(
    clientQuery: ClientQuery,
    rawData: any,
  ): Promise<any> {
    // OSS's older Client SDK might not send medium information.
    // This is not an issue for internal FB users, as Flipper release
    // is insync with client SDK through launcher.
    const message: {
      method: 'signCertificate';
      csr: string;
      destination: string;
      medium: number | undefined;
    } = rawData;

    if (message.method === 'signCertificate') {
      console.debug('CSR received from device', 'server');

      const {csr, destination, medium} = message;

      const result = await this.listener.onProcessCSR(
        csr,
        clientQuery,
        destination,
        transformCertificateExchangeMediumToType(medium),
      );
      const response = JSON.stringify({
        deviceId: result.deviceId,
      });
      return response;
    }

    return Promise.resolve();
  }
}

export default ServerAdapter;
