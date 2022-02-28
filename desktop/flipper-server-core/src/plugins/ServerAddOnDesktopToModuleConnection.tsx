/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import assert from 'assert';
import {
  ClientResponseType,
  ExecuteMessage,
  FlipperServer,
  FlipperServerEvents,
} from 'flipper-common';
import {ServerDevice} from '../devices/ServerDevice';
import {
  ServerAddOnModuleToDesktopConnection,
  ServerAddOnModuleToDesktopConnectionEvents,
} from './ServerAddOnModuleToDesktopConnection';

export interface FlipperServerForServerAddOn extends FlipperServer {
  emit(
    event: 'plugins-server-add-on-message',
    payload: FlipperServerEvents['plugins-server-add-on-message'],
  ): void;
  registerDevice(device: ServerDevice): void;
  unregisterDevice(serial: string): void;
  getDevice(serial: string): ServerDevice;
  getDeviceSerials(): string[];
  getDevices(): ServerDevice[];
}

export class ServerAddOnDesktopToModuleConnection {
  constructor(
    private readonly moduleToDesktopConnection: ServerAddOnModuleToDesktopConnection,
    private readonly flipperServer: FlipperServerForServerAddOn,
  ) {
    this.subscribeToMessagesFromServerAddOn();
  }

  async sendExpectResponse({
    method,
    params,
  }: ExecuteMessage): Promise<ClientResponseType> {
    assert(
      method === 'execute',
      'ServerAddOnDesktopToModuleConnection supports only "execute" messages',
    );
    const response = await this.moduleToDesktopConnection.call(
      params.method,
      params.params,
    );
    const length = JSON.stringify(response).length;
    return {
      ...response,
      length,
    };
  }

  private subscribeToMessagesFromServerAddOn() {
    const event = 'message';
    const onMessage = (
      message: ServerAddOnModuleToDesktopConnectionEvents[typeof event],
    ) => {
      this.flipperServer.emit('plugins-server-add-on-message', message);
    };

    this.moduleToDesktopConnection.on(event, onMessage);
  }
}
