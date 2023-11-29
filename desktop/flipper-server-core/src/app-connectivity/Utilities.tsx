/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  CertificateExchangeMedium,
  ClientQuery,
  SecureClientQuery,
  DeviceOS,
  ResponseMessage,
} from 'flipper-common';
import {ParsedUrlQuery} from 'querystring';

/**
 * Transforms the certificate exchange medium type as number to the
 * CertificateExchangeMedium type.
 * @param medium A number representing the certificate exchange medium type.
 */
export function transformCertificateExchangeMediumToType(
  medium: number | undefined,
): CertificateExchangeMedium {
  switch (medium) {
    case undefined:
    case 1:
      return 'FS_ACCESS';
    case 2:
      return 'WWW';
    case 3:
      return 'NONE';
    default:
      throw new Error('Unknown Certificate exchange medium: ' + medium);
  }
}

/**
 * Returns the app name from a ClientQuery instance. In most cases it should be
 * the app name as given in the query. On Android, and for old SDK versions (<3) it
 * will returned the app name suffixed by '(Outdated SDK)'.
 *
 * Reason is, in previous version (<3), app may not appear in correct device
 * section because it refers to the name given by client which is not fixed
 * for android emulators, so it is indicated as outdated so that developers
 * might want to update SDK to get rid of this connection swap problem
 * @param query A ClientQuery object.
 */
export function appNameWithUpdateHint(query: ClientQuery): string {
  if (query.os === 'Android' && (!query.sdk_version || query.sdk_version < 3)) {
    return query.app + ' (Outdated SDK)';
  }
  return query.app;
}

export function parseMessageToJson<T extends object = object>(
  message: any,
): T | undefined {
  try {
    return JSON.parse(message.toString());
  } catch (err) {
    console.warn(`Invalid JSON: ${message}`, 'clientMessage');
    return;
  }
}
export function isWsResponseMessage(
  message: object,
): message is ResponseMessage {
  return typeof (message as ResponseMessage).id === 'number';
}

const supportedOSForCertificateExchange = new Set<DeviceOS>([
  'Android',
  'iOS',
  'MacOS',
  'Metro',
  'Windows',
]);
/**
 * Validates a string as being one of those defined as valid OS.
 * @param str An input string.
 */
export function verifyClientQueryComesFromCertExchangeSupportedOS(
  query: ClientQuery | undefined,
): ClientQuery | undefined {
  if (!query || !supportedOSForCertificateExchange.has(query.os)) {
    return;
  }
  return query;
}

/**
 * Parse and extract a ClientQuery instance from a message. The ClientQuery
 * data will be contained in the message url query string.
 * @param message An incoming web socket message.
 */
export function parseClientQuery(
  query: ParsedUrlQuery,
): ClientQuery | undefined {
  /** Any required arguments to construct a ClientQuery come
   * embedded in the query string.
   */
  let device_id: string | undefined;
  if (typeof query.device_id === 'string') {
    device_id = query.device_id;
  } else {
    return;
  }

  let device: string | undefined;
  if (typeof query.device === 'string') {
    device = query.device;
  } else {
    return;
  }

  let app: string | undefined;
  if (typeof query.app === 'string') {
    app = query.app;
  } else {
    return;
  }

  let os: DeviceOS | undefined;
  if (typeof query.os === 'string') {
    os = query.os as DeviceOS;
  } else {
    return;
  }

  let medium: number | undefined;
  if (typeof query.medium === 'string') {
    medium = parseInt(query.medium, 10);
  } else if (typeof query.medium === 'number') {
    medium = query.medium;
  }

  if (medium !== undefined && (medium < 1 || medium > 3)) {
    throw new Error('Unsupported exchange medium: ' + medium);
  }

  let sdk_version: number | undefined;
  if (typeof query.sdk_version === 'string') {
    sdk_version = parseInt(query.sdk_version, 10);
  } else if (typeof query.sdk_version === 'number') {
    sdk_version = query.sdk_version;
  }

  const clientQuery: ClientQuery = {
    device_id,
    device,
    app,
    os,
    medium: transformCertificateExchangeMediumToType(medium),
    sdk_version,
  };

  return clientQuery;
}

/**
 * Parse and extract a SecureClientQuery instance from a message. The ClientQuery
 * data will be contained in the message url query string.
 * @param message An incoming web socket message.
 */
export function parseSecureClientQuery(
  query: ParsedUrlQuery,
): SecureClientQuery | undefined {
  /** Any required arguments to construct a SecureClientQuery come
   * embedded in the query string.
   */
  const clientQuery = verifyClientQueryComesFromCertExchangeSupportedOS(
    parseClientQuery(query),
  );
  if (!clientQuery) {
    return;
  }

  let csr: string | undefined;
  if (typeof query.csr === 'string') {
    const buffer = Buffer.from(query.csr, 'base64');
    if (buffer) {
      csr = buffer.toString('ascii');
    }
  }

  let csr_path: string | undefined;
  if (typeof query.csr_path === 'string') {
    csr_path = query.csr_path;
  }

  let medium: number | undefined;
  if (typeof query.medium === 'string') {
    medium = parseInt(query.medium, 10);
  } else if (typeof query.medium === 'number') {
    medium = query.medium;
  }

  if (medium !== undefined && (medium < 1 || medium > 3)) {
    throw new Error('Unsupported exchange medium: ' + medium);
  }
  return {
    ...clientQuery,
    csr,
    csr_path,
    medium: transformCertificateExchangeMediumToType(medium),
  };
}

export function cloneClientQuerySafeForLogging(clientQuery: SecureClientQuery) {
  return {...clientQuery, csr: !clientQuery.csr ? clientQuery.csr : '<hidden>'};
}

export function assertNotNull<T extends any>(
  value: T,
  message: string = 'Unexpected null/undefined value found',
): asserts value is Exclude<T, undefined | null> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}
