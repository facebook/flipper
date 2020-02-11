/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {
  FlipperDevicePlugin,
  Device,
  View,
  Button,
  Toolbar,
  ButtonGroup,
  MetroDevice,
} from 'flipper';

type LogEntry = {};

export type PersistedState = {
  logs: LogEntry[];
};

type State = {};

/*
Flow types for events 

/
  A tagged union of all the actions that may happen and we may want to
  report to the tool user.
 /
export type ReportableEvent =
  | {
      port: number,
      projectRoots: $ReadOnlyArray<string>,
      type: 'initialize_started',
      ...
    }
  | {type: 'initialize_done', ...}
  | {
      type: 'initialize_failed',
      port: number,
      error: Error,
      ...
    }
  | {
      buildID: string,
      type: 'bundle_build_done',
      ...
    }
  | {
      buildID: string,
      type: 'bundle_build_failed',
      ...
    }
  | {
      buildID: string,
      bundleDetails: BundleDetails,
      type: 'bundle_build_started',
      ...
    }
  | {
      error: Error,
      type: 'bundling_error',
      ...
    }
  | {type: 'dep_graph_loading', ...}
  | {type: 'dep_graph_loaded', ...}
  | {
      buildID: string,
      type: 'bundle_transform_progressed',
      transformedFileCount: number,
      totalFileCount: number,
      ...
    }
  | {
      type: 'global_cache_error',
      error: Error,
      ...
    }
  | {
      type: 'global_cache_disabled',
      reason: GlobalCacheDisabledReason,
      ...
    }
  | {type: 'transform_cache_reset', ...}
  | {
      type: 'worker_stdout_chunk',
      chunk: string,
      ...
    }
  | {
      type: 'worker_stderr_chunk',
      chunk: string,
      ...
    }
  | {
      type: 'hmr_client_error',
      error: Error,
      ...
    }
  | {
      type: 'client_log',
      level:
        | 'trace'
        | 'info'
        | 'warn'
        | 'error'
        | 'log'
        | 'group'
        | 'groupCollapsed'
        | 'groupEnd'
        | 'debug',
      data: Array<mixed>,
      ...
    };
*/

export default class MetroPlugin extends FlipperDevicePlugin<
  State,
  any,
  PersistedState
> {
  static supportsDevice(device: Device) {
    return device.os === 'Metro';
  }

  get ws(): WebSocket {
    return (this.device as MetroDevice).ws;
  }

  sendCommand(command: string) {
    if (this.ws) {
      this.ws.send(
        JSON.stringify({
          version: 2,
          type: 'command',
          command,
        }),
      );
    }
  }

  render() {
    return (
      <View>
        <Toolbar>
          <ButtonGroup>
            Work-in-progress
            <Button
              onClick={() => {
                this.sendCommand('reload');
              }}>
              Reload RN
            </Button>
            <Button
              onClick={() => {
                this.sendCommand('devMenu');
              }}>
              Dev Menu
            </Button>
          </ButtonGroup>
        </Toolbar>
      </View>
    );
  }
}
