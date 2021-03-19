/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {LogLevel} from 'flipper-plugin';
import BaseDevice from './BaseDevice';
import {EventEmitter} from 'events';
import util from 'util';

// From xplat/js/metro/packages/metro/src/lib/reporting.js
export type BundleDetails = {
  entryFile: string;
  platform?: string;
  dev: boolean;
  minify: boolean;
  bundleType: string;
};

// From xplat/js/metro/packages/metro/src/lib/reporting.js
export type GlobalCacheDisabledReason = 'too_many_errors' | 'too_many_misses';

/**
 * A tagged union of all the actions that may happen and we may want to
 * report to the tool user.
 *
 * Based on xplat/js/metro/packages/metro/src/lib/TerminalReporter.js
 */
export type MetroReportableEvent =
  | {
      port: number;
      projectRoots: ReadonlyArray<string>;
      type: 'initialize_started';
    }
  | {type: 'initialize_done'}
  | {
      type: 'initialize_failed';
      port: number;
      error: Error;
    }
  | {
      buildID: string;
      type: 'bundle_build_done';
    }
  | {
      buildID: string;
      type: 'bundle_build_failed';
    }
  | {
      buildID: string;
      bundleDetails: BundleDetails;
      type: 'bundle_build_started';
    }
  | {
      error: Error;
      type: 'bundling_error';
    }
  | {type: 'dep_graph_loading'}
  | {type: 'dep_graph_loaded'}
  | {
      buildID: string;
      type: 'bundle_transform_progressed';
      transformedFileCount: number;
      totalFileCount: number;
    }
  | {
      type: 'global_cache_error';
      error: Error;
    }
  | {
      type: 'global_cache_disabled';
      reason: GlobalCacheDisabledReason;
    }
  | {type: 'transform_cache_reset'}
  | {
      type: 'worker_stdout_chunk';
      chunk: string;
    }
  | {
      type: 'worker_stderr_chunk';
      chunk: string;
    }
  | {
      type: 'hmr_client_error';
      error: Error;
    }
  | {
      type: 'client_log';
      level:
        | 'trace'
        | 'info'
        | 'warn'
        | 'log'
        | 'group'
        | 'groupCollapsed'
        | 'groupEnd'
        | 'debug';
      data: Array<any>;
    };

const metroLogLevelMapping: {[key: string]: LogLevel} = {
  trace: 'verbose',
  info: 'info',
  warn: 'warn',
  error: 'error',
  log: 'info',
  group: 'info',
  groupCollapsed: 'info',
  groupEnd: 'info',
  debug: 'debug',
};

function getLoglevelFromMessageType(
  type: MetroReportableEvent['type'],
): LogLevel | null {
  switch (type) {
    case 'bundle_build_done':
    case 'bundle_build_started':
    case 'initialize_done':
      return 'debug';
    case 'bundle_build_failed':
    case 'bundling_error':
    case 'global_cache_error':
    case 'hmr_client_error':
      return 'error';
    case 'bundle_transform_progressed':
      return null; // Don't show at all
    case 'client_log':
      return null; // Handled separately
    case 'dep_graph_loaded':
    case 'dep_graph_loading':
    case 'global_cache_disabled':
    default:
      return 'verbose';
  }
}

export default class MetroDevice extends BaseDevice {
  ws?: WebSocket;
  metroEventEmitter = new EventEmitter();

  constructor(serial: string, ws: WebSocket | undefined) {
    super(serial, 'emulator', 'React Native', 'Metro');
    this.devicePlugins = [];
    if (ws) {
      this.ws = ws;
      ws.onmessage = this._handleWSMessage;
    }
  }

  private _handleWSMessage = ({data}: any) => {
    const message: MetroReportableEvent = JSON.parse(data);
    if (message.type === 'client_log') {
      const type: LogLevel = metroLogLevelMapping[message.level] || 'unknown';
      this.addLogEntry({
        date: new Date(),
        pid: 0,
        tid: 0,
        type,
        tag: message.type,
        message: util.format(
          ...message.data.map((v) =>
            v && typeof v === 'object' ? JSON.stringify(v, null, 2) : v,
          ),
        ),
      });
    } else {
      const level = getLoglevelFromMessageType(message.type);
      if (level !== null) {
        this.addLogEntry({
          date: new Date(),
          pid: 0,
          tid: 0,
          type: level,
          tag: message.type,
          message: JSON.stringify(message, null, 2),
        });
      }
    }
    this.metroEventEmitter.emit('event', message);
  };

  sendCommand(command: string, params?: any) {
    if (this.ws) {
      this.ws.send(
        JSON.stringify({
          version: 2,
          type: 'command',
          command,
          params,
        }),
      );
    } else {
      console.warn('Cannot send command, no connection', command);
    }
  }
}
