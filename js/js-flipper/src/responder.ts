/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperErrorMessage, FlipperMessageBus} from './message';
import {FlipperPluginReceiverRes} from './plugin';

export class FlipperResponder {
  constructor(
    public readonly responderId: number,
    private client: FlipperMessageBus,
  ) {}

  success(response?: FlipperPluginReceiverRes) {
    this.client.sendData({
      id: this.responderId,
      success: response == null ? null : response,
    });
  }

  error(response: FlipperErrorMessage) {
    this.client.sendData({id: this.responderId, error: response});
  }
}
