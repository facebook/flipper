/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ClientQuery,
  ConnectionRecordEntry,
  CommandRecordEntry,
  getLogger,
} from 'flipper-common';
import {FlipperServerImpl} from './FlipperServerImpl';

type CommandEventPayload = {
  cmd: string;
  description: string;
  success: boolean;
  stdout?: string;
  stderr?: string;
  troubleshoot?: string;
  context?: any;
};

type ConnectionRecorderEvents = {
  cmd: CommandEventPayload;
};

class Recorder {
  private flipperServer_: FlipperServerImpl | undefined;
  private undefinedClientQuery_: ClientQuery = {
    app: 'NONE',
    device: 'NONE',
    medium: 'NONE',
    os: 'Browser',
    device_id: '',
  };

  private handler_ = {
    cmd: (payload: CommandEventPayload) => {
      if (this.flipperServer_) {
        const clientQuery = payload.context as ClientQuery | undefined;

        const device = clientQuery?.device ?? 'NONE';
        const app = clientQuery?.app ?? 'NONE';
        const medium = clientQuery?.medium ?? 'NONE';
        const os =
          clientQuery?.os ?? (payload.cmd.includes('idb') ? 'iOS' : 'Android');

        const entry: CommandRecordEntry = {
          time: new Date(),
          type: payload.success ? 'info' : 'error',
          os,
          device,
          app,
          message: payload.cmd,
          medium,
          cmd: payload.cmd,
          description: payload.description,
          success: payload.success,
          stdout: payload.stdout,
          stderr: payload.stderr,
          troubleshoot: payload.troubleshoot,
        };

        this.flipperServer_.emit('connectivity-troubleshoot-cmd', entry);
      }
    },
  };

  private log_ = (
    type: 'info' | 'warning' | 'error',
    clientQuery: ClientQuery,
    ...args: any[]
  ) => {
    console.log(`[conn][${type}]`, ...args);
    if (this.flipperServer_) {
      const entry: ConnectionRecordEntry = {
        time: new Date(),
        type,
        os: clientQuery.os,
        device: clientQuery.device,
        app: clientQuery.app,
        message: args.join(' '),
        medium: clientQuery.medium,
      };

      this.flipperServer_.emit('connectivity-troubleshoot-log', [entry]);
      getLogger().track('usage', 'connectivity-log', entry);
    }
  };

  event<Event extends keyof ConnectionRecorderEvents>(
    event: Event,
    payload: ConnectionRecorderEvents[Event],
  ): void {
    const handler: (...args: any[]) => void = this.handler_[event];
    if (!handler) {
      return;
    }
    handler(payload);
  }

  logConnectionRecordEntries(logs: ConnectionRecordEntry[]) {
    if (this.flipperServer_) {
      this.flipperServer_.emit('connectivity-troubleshoot-log', logs);
      logs.forEach((entry) =>
        getLogger().track('usage', 'connectivity-log', entry),
      );
    }
  }

  log(clientQuery: ClientQuery, ...args: any[]) {
    this.log_('info', clientQuery, args);
  }

  logErrorGeneric(...args: any[]) {
    this.log_('error', this.undefinedClientQuery_, args);
  }

  logError(clientQuery: ClientQuery, ...args: any[]) {
    this.log_('error', clientQuery, args);
  }

  enable(flipperServer: FlipperServerImpl) {
    this.flipperServer_ = flipperServer;
  }
}

const recorder = new Recorder();
export {recorder};
