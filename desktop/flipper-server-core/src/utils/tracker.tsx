/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getLogger} from 'flipper-common';

type AppConnectionPayload = {
  app: string;
  os: string;
  device: string;
  device_id: string;
  medium?: number | undefined;
};

type AppConnectionCertificateExchangePayload = AppConnectionPayload & {
  successful: boolean;
  error?: string;
};

type TrackerEvents = {
  'server-started': {port: number; tcp: boolean};
  'server-auth-token-verification': {
    successful: boolean;
    present: boolean;
    error?: string;
  };
  'server-socket-already-in-use': {};
  'server-proxy-error': {error: string};
  'app-connection-created': AppConnectionPayload;
  'app-connection-secure-attempt': AppConnectionPayload;
  'app-connection-insecure-attempt': AppConnectionPayload;
  'app-connection-certificate-exchange': AppConnectionCertificateExchangePayload;
};

class ServerCoreTracker {
  track<Event extends keyof TrackerEvents>(
    event: Event,
    payload: TrackerEvents[Event],
  ): void {
    getLogger().track('usage', event, payload);
  }
}

export const tracker = new ServerCoreTracker();
