/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type BaseDevice from '../devices/BaseDevice';
export type State = Array<BaseDevice>;

export type Action =
  | {
      type: 'UNREGISTER_DEVICES',
      payload: Set<string>,
    }
  | {
      type: 'REGISTER_DEVICE',
      payload: BaseDevice,
    };

const INITAL_STATE: State = [];

export default function reducer(
  state: State = INITAL_STATE,
  action: Action,
): State {
  switch (action.type) {
    case 'REGISTER_DEVICE': {
      const {payload} = action;
      return state.concat(payload);
    }
    case 'UNREGISTER_DEVICES': {
      const {payload} = action;
      return state.filter((device: BaseDevice) => !payload.has(device.serial));
    }
    default:
      return state;
  }
}
