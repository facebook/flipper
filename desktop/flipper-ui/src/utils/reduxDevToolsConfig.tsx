/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceExport} from '../devices/BaseDevice';
import {State} from '../reducers/index';

export const stateSanitizer = (state: State) => {
  if (state.connections && state.connections.devices) {
    const {devices} = state.connections;
    const {selectedDevice} = state.connections;
    return {
      ...state,
      connections: {
        ...state.connections,
        devices: devices.map<DeviceExport>((device) => {
          return device.toJSON() as any;
        }),
        selectedDevice: selectedDevice
          ? (selectedDevice.toJSON() as any)
          : null,
      },
    };
  }

  return state;
};
