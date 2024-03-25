/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getLogger, CertificateExchangeMedium} from 'flipper-common';

type AppConnectionPayload = {
  app: string;
  os: string;
  device: string;
  device_id: string;
  medium?: CertificateExchangeMedium;
};

type AppConnectionCertificateExchangePayload = AppConnectionPayload & {
  successful: boolean;
  error?: string;
};

type ServerBootstrapPerformancePayload = {
  loggerInitializedMS: number;
  keytarLoadedMS: number;
  runningInstanceShutdownMS: number;
  httpServerStartedMS: number;
  serverCreatedMS: number;
  appServerStartedMS: number;
  developmentServerAttachedMS: number;
  serverStartedMS: number;
  launchedMS: number;
  startupMS: number;
};

type TrackerEvents = {
  'server-bootstrap-performance': ServerBootstrapPerformancePayload;
  'server-started': {port: number};
  'server-error': {code: string | undefined; message: string};
  'server-endpoint-hit': {name: string};
  'server-auth-token-verification': {
    successful: boolean;
    present: boolean;
    error?: string;
  };
  'server-socket-already-in-use': {};
  'server-open-ui': {browser: boolean; hasToken: boolean};
  'server-client-close': {code?: number; error?: string; sessionLength: number};
  'server-ws-server-error': {port: number; error: string};
  'server-ready-timeout': {timeout: number};
  'browser-connection-created': {
    successful: boolean;
    timeMS: number;
    timedOut: boolean;
  };
  'app-connection-created': AppConnectionPayload;
  'app-connection-secure-attempt': AppConnectionPayload;
  'app-connection-insecure-attempt': AppConnectionPayload;
  'app-connection-insecure-attempt-fallback': AppConnectionPayload;
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
