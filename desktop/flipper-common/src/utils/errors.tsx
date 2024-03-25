/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientErrorType} from '../server-types';

export function isAuthError(
  err: any,
): err is UserNotSignedInError | UserUnauthorizedError {
  return (
    err instanceof UserNotSignedInError || err instanceof UserUnauthorizedError
  );
}

export function isConnectivityOrAuthError(
  err: any,
): err is
  | ConnectivityError
  | UserNotSignedInError
  | UserUnauthorizedError
  | X2PAgentdError {
  return (
    err instanceof ConnectivityError ||
    err instanceof X2PAgentdError ||
    isAuthError(err) ||
    String(err).startsWith('Failed to fetch') ||
    // In cases where the error message is wrapped but the
    // underlying core issue is still a fetch failure.
    String(err).endsWith('Failed to fetch')
  );
}

export class SystemError extends Error {
  name = 'SystemError';
  readonly context?: unknown;
  constructor(msg: string, ...args: unknown[]) {
    super(msg);
    this.context = args;
  }
}

export class UserError extends Error {
  name = 'UserError';
  readonly context?: unknown;
  constructor(msg: string, ...args: unknown[]) {
    super(msg);
    this.context = args;
  }
}

export class UnableToExtractClientQueryError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'UnableToExtractClientQueryError';
  }
  name: 'UnableToExtractClientQueryError';
}

export class CancelledPromiseError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'CancelledPromiseError';
  }
  name: 'CancelledPromiseError';
}

export class ConnectivityError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ConnectivityError';
  }
  name: 'ConnectivityError';
}

export class UserUnauthorizedError extends Error {
  constructor(msg: string = 'User unauthorized.') {
    super(msg);
    this.name = 'UserUnauthorizedError';
  }
  name: 'UserUnauthorizedError';
}

export class X2PAgentdError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'X2PAgentdError';
  }
  name: 'X2PAgentdError';
}

export class UserNotSignedInError extends Error {
  constructor(msg: string = 'User not signed in.') {
    super(msg);
    this.name = 'UserNotSignedInError';
  }
  name: 'UserNotSignedInError';
}

export class NoLongerConnectedToClientError extends Error {
  constructor(msg: string = 'No longer connected to client.') {
    super(msg);
    this.name = 'NoLongerConnectedToClientError';
  }
  name: 'NoLongerConnectedToClientError';
}

export class FlipperServerDisconnectedError extends Error {
  constructor(public readonly reason: 'ws-close') {
    super(`Flipper Server disconnected. Reason: ${reason}`);
  }
}

export class FlipperServerTimeoutError extends Error {
  constructor(msg: string) {
    super(`Flipper Server timeout. Reason: ${msg}`);
  }
}

declare global {
  interface Error {
    interaction?: unknown;
  }
}

export function isError(obj: any): obj is Error {
  return (
    obj instanceof Error ||
    (obj &&
      obj.name &&
      typeof obj.name === 'string' &&
      obj.message &&
      typeof obj.message === 'string' &&
      obj.stack &&
      typeof obj.stack === 'string')
  );
}

export function getErrorFromErrorLike(e: any): Error | undefined {
  if (Array.isArray(e)) {
    return e.map(getErrorFromErrorLike).find((x) => x);
  } else if (isError(e)) {
    return e;
  } else {
    return undefined;
  }
}

export function getStringFromErrorLike(e: any): string {
  if (Array.isArray(e)) {
    return e.map(getStringFromErrorLike).join(' ');
  } else if (typeof e == 'string') {
    return e;
  } else if (isError(e)) {
    return e.message || e.toString();
  } else {
    try {
      return JSON.stringify(e);
    } catch (e) {
      // Stringify might fail on arbitrary structures
      // Last resort: toString it.
      return `${e}`;
    }
  }
}

export const deserializeRemoteError = (serializedError: ClientErrorType) => {
  const err = new Error(serializedError.message);
  err.name = serializedError.name;
  err.stack += `. Caused by: ${serializedError.stacktrace}`;
  return err;
};
