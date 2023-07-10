/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientQuery} from 'flipper-common';

type CommandEventPayload = {
  cmd: string;
  description: string;
  success: boolean;
  stdout?: string;
  stderr?: string;
  troubleshoot?: string;
};

type ConnectionRecorderEvents = {
  cmd: CommandEventPayload;
};

class Recorder {
  private handler_ = {
    cmd: (_payload: CommandEventPayload) => {
      // The output from logging the whole command can be quite
      // verbose. So, disable it as is.
      // this.rawLog(_payload);
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

  rawLog(...args: any[]) {
    console.log('[conn]', ...args);
  }
  log(clientQuery: ClientQuery, ...args: any[]) {
    console.log('[conn]', ...args);
  }
  rawError(...args: any[]) {
    console.error('[conn]', ...args);
  }
  error(clientQuery: ClientQuery, ...args: any[]) {
    console.error('[conn]', ...args);
  }
}

const recorder = new Recorder();
export {recorder};
