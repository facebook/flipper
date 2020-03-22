/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {State} from '../reducers/index';
import {DeviceExport} from '../devices/BaseDevice';

export const stateSanitizer = (state: State) => {
  if (state.connections && state.connections.devices) {
    const {devices} = state.connections;
    const {selectedDevice} = state.connections;
    return {
      ...state,
      connections: {
        ...state.connections,
        devices: devices.map<DeviceExport>(device => {
          return {
            ...device.toJSON(),
            logs: [],
          };
        }),
        selectedDevice: selectedDevice
          ? {
              ...selectedDevice.toJSON(),
              logs: [],
            }
          : null,
      },
    };
  }

  return state;
};
