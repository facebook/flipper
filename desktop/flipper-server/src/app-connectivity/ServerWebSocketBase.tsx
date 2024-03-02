/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientConnection} from './ClientConnection';
import {
  ClientDescription,
  ClientQuery,
  ConnectionRecordEntry,
  SecureClientQuery,
  SignCertificateMessage,
} from 'flipper-common';
import {SecureServerConfig} from './certificate-exchange/certificate-utils';
import GK from '../fb-stubs/GK';

export type CertificateExchangeRequestResponse = {
  deviceId?: string;
  certificates?: string;
};

/**
 * Defines an interface for events triggered by a running server interacting
 * with a client.
 */
export interface ServerEventsListener {
  onDeviceLogs(logs: ConnectionRecordEntry[]): void;
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
  ): Promise<CertificateExchangeRequestResponse>;
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
    downgrade?: boolean,
  ): Promise<ClientDescription>;
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
  /**
   * A message was received for a specif client
   * // TODO: payload should become JSON
   */
  onClientMessage(clientId: string, payload: string): void;

  onClientSetupError(clientQuery: ClientQuery, error: Error): void;

  onDeprecationNotice: (message: string) => void;
}

/**
 * Defines the base class to be used by any server implementation e.g.
 * RSocket, WebSocket, etc.
 */
abstract class ServerWebSocketBase {
  protected acceptingNewConections = true;
  protected deviceLogRegex = /(\d+):(info|warning|error):(.*)/;

  constructor(protected listener: ServerEventsListener) {}

  /**
   * Start and bind server to the specified port.
   * @param port A port number. Pass 0 to get a random free port.
   * https://stackoverflow.com/a/28050404
   * @param sslConfig An optional SSL configuration to be used for
   * TLS servers.
   *
   * @returns An assigned port number
   */
  abstract start(port: number, sslConfig?: SecureServerConfig): Promise<number>;
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
  protected async _onHandleUntrustedMessage(
    clientQuery: ClientQuery,
    rawData: any,
  ): Promise<string | undefined> {
    // OSS's older Client SDK might not send medium information.
    // This is not an issue for internal FB users, as Flipper release
    // is insync with client SDK through launcher.

    const message: SignCertificateMessage = rawData;

    if (message.method === 'signCertificate') {
      console.info(
        `[conn] Connection attempt: ${clientQuery.app} on ${clientQuery.device}, medium: ${message.medium}, cert: ${message.destination}`,
        clientQuery,
      );

      const {csr, destination, timestamp, logs} = message;

      console.info(
        `[conn] Starting certificate exchange: ${clientQuery.app} on ${clientQuery.device}`,
      );

      this.processDeviceLogs(clientQuery, logs);

      try {
        if (timestamp) {
          const requestDate = new Date(timestamp);

          function isSameDay(date: Date): boolean {
            const currentDate = new Date();
            return date.toDateString() === currentDate.toDateString();
          }

          console.info(`[conn] CSR created at`, requestDate.toISOString());
          if (!isSameDay(requestDate)) {
            throw new Error(
              `The certificate request being processed was generated on a different date than the current system date. 
               This discrepancy can lead to certificate verification errors. 
               To resolve this issue, please ensure that the device's date and time settings match the system's current date and time.`,
            );
          }
        }

        const result = await this.listener.onProcessCSR(
          csr,
          clientQuery,
          destination,
        );

        console.info(
          `[conn] Exchanged certificate: ${clientQuery.app} on ${result.deviceId}`,
        );
        const response = JSON.stringify(result);
        return response;
      } catch (error) {
        this.listener.onClientSetupError(clientQuery, error);
        return JSON.stringify({});
      }
    } else if (message.method === 'signCertificateAck') {
      const {logs, ...remainder} = message;
      console.info(
        `[conn] Connection attempt, sign certificate ACK received: ${clientQuery.app} on ${clientQuery.device}`,
        remainder,
      );

      this.processDeviceLogs(clientQuery, logs);
    }

    return undefined;
  }

  startAcceptingNewConections() {
    if (!GK.get('flipper_disconnect_device_when_ui_offline')) {
      return;
    }
    this.acceptingNewConections = true;
  }

  stopAcceptingNewConections() {
    if (!GK.get('flipper_disconnect_device_when_ui_offline')) {
      return;
    }
    this.acceptingNewConections = false;
    this.stopAcceptingNewConectionsImpl();
  }

  processDeviceLogs(clientQuery: ClientQuery, logs: string[] | undefined) {
    if (logs) {
      console.info(`[conn] Device logs until now are found below`);
      const entries: ConnectionRecordEntry[] = [];
      for (const log of logs) {
        const match = log.match(this.deviceLogRegex);
        if (match) {
          const timestamp = match[1];
          const level = match[2] as 'info' | 'warning' | 'error';
          const message = match[3];

          const timestampMS: number = parseInt(timestamp, 10);

          if (!isNaN(timestampMS)) {
            const time: Date = new Date(timestampMS);
            entries.push({
              time,
              type: level,
              os: clientQuery.os,
              device: clientQuery.device,
              app: clientQuery.app,
              message,
              medium: clientQuery.medium,
            });

            console.log(
              `[conn][device][log][${time.toISOString()}][${level}] ${message}`,
            );
          }
        }
      }

      this.listener.onDeviceLogs(entries);
    }
  }

  protected abstract stopAcceptingNewConectionsImpl(): void;
}

export default ServerWebSocketBase;
