/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

// $FlowFixMe T47375728
export const stateSanitizer = state => {
  let sanitizedState = state;
  if (state.connections) {
    if (state.connections.devices) {
      const {devices} = state.connections;
      sanitizedState = {
        ...sanitizedState,
        connections: {
          ...state.connections,
          devices: devices.map(device => {
            return {
              ...device.toJSON(),
              logs: '<<DEVICE_LOGS>>',
            };
          }),
        },
      };
    }
    if (state.connections.selectedDevice) {
      const {selectedDevice} = state.connections;
      sanitizedState = {
        ...sanitizedState,
        connections: {
          ...sanitizedState.connections,
          selectedDevice: {
            ...selectedDevice.toJSON(),
            logs: '<<DEVICE_LOGS>>',
          },
        },
      };
    }
  }
  return sanitizedState;
};
