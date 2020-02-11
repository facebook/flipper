/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice, {LogLevel} from './BaseDevice';
import ArchivedDevice from './ArchivedDevice';
import {v4} from 'uuid';

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
type ReportableEvent =
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

export default class MetroDevice extends BaseDevice {
  ws: WebSocket;

  constructor(serial: string, ws: WebSocket) {
    super(serial, 'emulator', 'React Native', 'Metro');
    this.ws = ws;
    this.devicePlugins = [];
    ws.onmessage = this._handleWSMessage;
  }

  _handleWSMessage = ({data}: any) => {
    const message: ReportableEvent = JSON.parse(data);
    if (message.type === 'client_log') {
      const type: LogLevel = metroLogLevelMapping[message.level] || 'unknown';
      this.addLogEntry({
        date: new Date(),
        pid: 0,
        tid: 0,
        type,
        tag: message.type,
        message: message.data
          .map(v => (v && typeof v === 'object' ? JSON.stringify(v) : v))
          .join(' '),
      });
    }
  };

  archive() {
    return new ArchivedDevice(
      this.serial + v4(),
      this.deviceType,
      this.title,
      this.os,
      [...this.logEntries],
    );
  }
}
