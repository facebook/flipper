/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceOS} from 'flipper-plugin';
import {StreamInterceptorEventEmitter} from '../DesktopTypes';

/**
 * Stream inteceptors have the change to modify the frame or metata early in the pipeline
 */
export function addInterceptors(
  _deviceOS: DeviceOS,
  eventEmitter: StreamInterceptorEventEmitter,
) {
  //no-op impmentation for open source
  eventEmitter.on('frameReceived', async (frame) => {
    eventEmitter.emit('frameUpdated', frame);
  });

  eventEmitter.on('metadataReceived', async (metadata) => {
    eventEmitter.emit('metadataUpdated', metadata);
  });
}
