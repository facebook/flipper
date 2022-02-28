/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import assert from 'assert';
import {ClientResponseType, ExecuteMessage} from 'flipper-common';
import {ServerAddOnModuleToDesktopConnection} from './ServerAddOnModuleToDesktopConnection';

export class ServerAddOnDesktopToModuleConnection {
  constructor(
    private readonly moduleToDesktopConnection: ServerAddOnModuleToDesktopConnection,
  ) {}

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
}
