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
  private flipperServer: FlipperServerImpl | undefined;

  private handler_ = {
    cmd: (payload: CommandEventPayload) => {
      if (this.flipperServer) {
        const clientQuery = payload.context as ClientQuery | undefined;

        const device = clientQuery?.device ?? 'NONE';
        const app = clientQuery?.app ?? 'NONE';
        const medium = clientQuery?.medium ?? 'NONE';

        const entry: CommandRecordEntry = {
          time: new Date(),
          type: payload.success ? 'info' : 'error',
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

        this.flipperServer.emit('connectivity-troubleshoot-cmd', entry);
      }
    },
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

  log(clientQuery: ClientQuery, ...args: any[]) {
    console.log('[conn]', ...args);
    if (this.flipperServer) {
      const entry: ConnectionRecordEntry = {
        time: new Date(),
        type: 'info',
        device: clientQuery.device,
        app: clientQuery.app,
        message: args.join(' '),
        medium: clientQuery.medium,
      };

      this.flipperServer.emit('connectivity-troubleshoot-log', entry);
    }
  }
  rawError(...args: any[]) {
    console.error('[conn]', ...args);
  }
  error(clientQuery: ClientQuery, ...args: any[]) {
    console.error('[conn]', ...args);
  }

  enable(flipperServer: FlipperServerImpl) {
    this.flipperServer = flipperServer;
  }
}

const recorder = new Recorder();
export {recorder};
