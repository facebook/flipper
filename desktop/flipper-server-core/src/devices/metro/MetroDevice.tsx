/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceLogLevel, MetroReportableEvent} from 'flipper-common';
import util from 'util';
import {FlipperServerImpl} from '../../FlipperServerImpl';
import {ServerDevice} from '../ServerDevice';
import WebSocket from 'ws';

const metroLogLevelMapping: {[key: string]: DeviceLogLevel} = {
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
): DeviceLogLevel | null {
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

export default class MetroDevice extends ServerDevice {
  ws?: WebSocket;

  constructor(
    flipperServer: FlipperServerImpl,
    serial: string,
    ws: WebSocket | undefined,
  ) {
    super(flipperServer, {
      serial,
      deviceType: 'emulator',
      title: 'React Native',
      os: 'Metro',
      icon: 'mobile',
      features: {
        screenCaptureAvailable: false,
        screenshotAvailable: false,
      },
    });
    if (ws) {
      this.ws = ws;
      ws.onmessage = this._handleWSMessage;
    }
  }

  private _handleWSMessage = ({data}: any) => {
    const message: MetroReportableEvent = JSON.parse(data);
    if (message.type === 'client_log') {
      const type: DeviceLogLevel =
        metroLogLevelMapping[message.level] || 'unknown';
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
